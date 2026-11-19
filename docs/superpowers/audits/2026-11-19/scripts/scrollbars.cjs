// scrollbars.cjs — only the page and the desktop rail scroll, and neither draws a loud scrollbar.
// Reported 2026-11-19 on macOS with scroll bars always shown: a thick scrollbar in the tab band
// and a persistent bar beside the rail.
// usage: node scrollbars.cjs      (dev server on :4180, or APP_URL)     exit 1 on any failure
const { chromium } = require('playwright');
const URL = process.env.APP_URL || 'http://localhost:4180/';
const PATIENT = { 'Age': 45, 'Total cholesterol': 200, 'HDL-C': 40, 'LDL-C': 130, 'Systolic BP': 128, 'eGFR': 55 };
let pass = 0, fail = 0;
const ok = (c, name, dbg) => {
  if (c) { pass++; console.log('  ✅', name); }
  else { fail++; console.log('  ❌', name, dbg !== undefined ? '\n       ' + JSON.stringify(dbg).slice(0, 300) : ''); }
};

(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1243, 700], [1024, 600], [390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(URL, { waitUntil: 'networkidle' });
    for (const [k, v] of Object.entries(PATIENT)) {
      await p.locator('label').filter({ hasText: new RegExp('^' + k + '$', 'i') }).first()
        .locator('xpath=following-sibling::div//input').fill(String(v));
    }
    await p.waitForTimeout(300);

    const m = await p.evaluate(() => {
      const can = [];
      document.querySelectorAll('html, body, body *').forEach(el => {
        const cs = getComputedStyle(el), r = el.getBoundingClientRect();
        if (!r.width || !r.height) return;
        if (/auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight) can.push(el.tagName.toLowerCase());
      });
      const nav = document.querySelector('nav');
      const strip = nav.firstElementChild;
      const active = nav.querySelector('[aria-current="page"]');
      return {
        can,
        strip: { scrollH: strip.scrollHeight, clientH: strip.clientHeight, bar: getComputedStyle(strip).scrollbarWidth },
        underline: Math.round(active.getBoundingClientRect().bottom - nav.getBoundingClientRect().bottom),
        navH: Math.round(nav.getBoundingClientRect().height),
      };
    });
    const expected = w >= 1024 ? ['main', 'aside'] : ['main'];
    ok(JSON.stringify(m.can) === JSON.stringify(expected), `${w} x ${h}: vertical scrolling only in ${expected.join(' and ')}`, m.can);
    ok(m.strip.scrollH <= m.strip.clientH, `${w}: the tab strip has nothing to scroll vertically`, m.strip);
    ok(m.strip.bar === 'none', `${w}: the tab strip never draws a scrollbar`, m.strip);
    ok(m.underline === 0 && m.navH === 44, `${w}: the active tab underline still sits on the tab bar hairline and the bar keeps its 44 px height`, m);

    if (w >= 1024) {
      const aside = p.locator('aside');
      const box = await aside.boundingBox();
      await p.mouse.move(200, 400); await p.waitForTimeout(120);
      const idle = await aside.evaluate(el => getComputedStyle(el).scrollbarColor);
      await p.mouse.move(box.x + box.width / 2, box.y + 100); await p.waitForTimeout(150);
      const over = await aside.evaluate(el => getComputedStyle(el).scrollbarColor);
      ok(/^rgba\(0, 0, 0, 0\)/.test(idle), `${w}: the rail scrollbar is invisible while the pointer is elsewhere`, { idle });
      ok(!/^rgba\(0, 0, 0, 0\)/.test(over), `${w}: it appears while the pointer is over the rail`, { over });
      const reach = await aside.evaluate(el => { el.scrollTop = el.scrollHeight; const btn = [...el.querySelectorAll('button')].find(x => /Copy summary/.test(x.innerText)); return Math.round(btn.getBoundingClientRect().bottom) <= innerHeight; });
      ok(reach, `${w}: the rail still scrolls to the copy button`);
    }
    await p.close();
  }
  console.log(`\n${pass} pass, ${fail} fail`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
