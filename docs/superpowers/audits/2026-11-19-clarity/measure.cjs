// clarity-measure.cjs — baseline for the clarity pass: where total CVD sits, how much the page moves when
// a disclosure or info panel opens or closes, and how many boxes each tab draws.
const { chromium } = require('playwright');
const URL = process.env.APP_URL || 'http://localhost:4180/';
const TABS = ['Primary', 'ASCVD', 'Diabetes', 'LDL ≥190'];
const PATIENT = { 'Age': 52, 'Total cholesterol': 228, 'HDL-C': 42, 'LDL-C': 152, 'Systolic BP': 136, 'eGFR': 82, 'BMI': 29.5 };

(async () => {
  const b = await chromium.launch();
  const open = async (w, h, tab) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(URL, { waitUntil: 'networkidle' });
    for (const [k, v] of Object.entries(PATIENT)) await p.locator('label').filter({ hasText: new RegExp('^' + k + '$', 'i') }).first().locator('xpath=following-sibling::div//input').fill(String(v));
    if (tab && tab !== 'Primary') { await p.getByRole('button', { name: tab, exact: true }).first().click(); await p.waitForTimeout(250); }
    if (tab === 'LDL ≥190') await p.locator('label').filter({ hasText: /^Current LDL-C$/i }).first().locator('xpath=following-sibling::div//input').fill('212');
    await p.waitForTimeout(200);
    return p;
  };

  console.log('== 1. Where total CVD risk sits (Primary, inputs complete)');
  for (const [w, h] of [[1243, 700], [1440, 900], [390, 844]]) {
    const p = await open(w, h, 'Primary');
    const m = await p.evaluate(() => {
      const els = [...document.querySelectorAll('main *')].filter(e => e.childElementCount === 0 && e.textContent.trim() === 'Total CVD' && e.getBoundingClientRect().width);
      const sc = document.querySelector('[data-scroll]'), aside = document.querySelector('aside');
      return els.map(e => { const r = e.getBoundingClientRect(); const inRail = !!e.closest('aside'); const railBottom = inRail ? aside.getBoundingClientRect().bottom : null;
        return { inRail, y: Math.round(r.top), viewport: innerHeight, visibleNow: inRail ? r.bottom <= railBottom : r.bottom <= innerHeight, pageY: Math.round(r.top - sc.getBoundingClientRect().top + sc.scrollTop) }; });
    });
    console.log(`  ${w}x${h}:`, JSON.stringify(m));
    await p.close();
  }

  console.log('== 2. Disclosures: how far the trigger moves on open and close (390 px)');
  for (const tab of TABS) {
    const p = await open(390, 844, tab);
    const n = await p.locator('main button[aria-expanded]').count();
    const rows = [];
    for (let i = 0; i < n; i++) {
      const bt = p.locator('main button[aria-expanded]').nth(i);
      if (!(await bt.isVisible().catch(() => false))) continue;
      const name = ((await bt.getAttribute('aria-label')) || (await bt.innerText())).replace(/\s+/g, ' ').trim().slice(0, 34);
      await bt.scrollIntoViewIfNeeded(); await p.waitForTimeout(80);
      const sc = p.locator('[data-scroll]');
      const y0 = (await bt.boundingBox()).y; const h0 = await sc.evaluate(e => e.scrollHeight);
      const was = await bt.getAttribute('aria-expanded');
      await bt.click(); await p.waitForTimeout(260);
      const bb1 = await bt.boundingBox().catch(() => null); const h1 = await sc.evaluate(e => e.scrollHeight);
      await bt.click().catch(() => {}); await p.waitForTimeout(260);
      const bb2 = await bt.boundingBox().catch(() => null);
      rows.push(`${name} [${was}→]: page ${h1 - h0 >= 0 ? '+' : ''}${h1 - h0}px, trigger moved ${bb1 ? Math.round(bb1.y - y0) : 'gone'} on toggle, ${bb2 ? Math.round(bb2.y - y0) : 'gone'} after toggling back`);
    }
    console.log(`  ${tab}: ${rows.length} toggles`); rows.forEach(r => console.log('    ' + r));
    await p.close();
  }

  console.log('== 3. Blood pressure accordion: opening one section while another above it is open (390 px)');
  { const p = await open(390, 844, 'Primary');
    await p.locator('button[aria-expanded]').filter({ hasText: /Stage 1|Stage 2|Elevated|Normal/ }).first().click(); await p.waitForTimeout(250);
    const first = p.getByRole('button', { name: /^Drug therapy/ }); const last = p.getByRole('button', { name: /^Follow-up and labs/ });
    await first.click(); await p.waitForTimeout(250); await last.scrollIntoViewIfNeeded(); await p.waitForTimeout(100);
    const y0 = (await last.boundingBox()).y; await last.click(); await p.waitForTimeout(300); const y1 = (await last.boundingBox()).y;
    console.log(`  "Follow-up and labs" pressed while "Drug therapy" is open above it: the pressed row moved ${Math.round(y1 - y0)} px`);
    await p.close(); }

  console.log('== 4. Closing a long panel after reading to its end (390 px)');
  { const p = await open(390, 844, 'ASCVD');
    const bt = p.getByRole('button', { name: /Statin not tolerated/ }); await bt.scrollIntoViewIfNeeded(); await bt.click(); await p.waitForTimeout(250);
    const close = p.locator('[data-si-panel] button[aria-label="Close"]');
    const sc = p.locator('[data-scroll]'); const panelH = await p.locator('[data-si-panel]').evaluate(e => Math.round(e.getBoundingClientRect().height));
    await p.locator('[data-si-panel]').evaluate(e => e.lastElementChild.scrollIntoView({ block: 'end' })); await p.waitForTimeout(150);
    const top0 = await sc.evaluate(e => e.scrollTop);
    await close.evaluate(e => e.click()); await p.waitForTimeout(300);
    const vis = await bt.evaluate(e => { const r = e.getBoundingClientRect(); return { y: Math.round(r.top), inView: r.top >= 105 && r.bottom <= innerHeight }; });
    console.log(`  statin-intolerance panel is ${panelH} px tall. After closing it from its end, its trigger is at y=${vis.y} (in view: ${vis.inView}); scrollTop was ${Math.round(top0)}`);
    await p.close(); }

  console.log('== 5. Boxes drawn (elements with a border on all four sides and a corner radius), default state');
  for (const [w, h] of [[390, 844], [1440, 900]]) for (const tab of TABS) {
    const p = await open(w, h, tab);
    const m = await p.evaluate(() => { let boxes = 0, nested = 0; const radii = {}; document.querySelectorAll('main *').forEach(el => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); if (!r.width || !r.height) return; const bw = ['Top', 'Right', 'Bottom', 'Left'].map(s => parseFloat(cs['border' + s + 'Width'])); const rad = parseFloat(cs.borderTopLeftRadius); if (bw.every(x => x > 0) && rad > 0 && r.width > 60) { boxes++; radii[rad] = (radii[rad] || 0) + 1; let a = el.parentElement; while (a && a.tagName !== 'MAIN') { const c = getComputedStyle(a); if (parseFloat(c.borderTopWidth) > 0 && parseFloat(c.borderLeftWidth) > 0 && parseFloat(c.borderTopLeftRadius) > 0) { nested++; break; } a = a.parentElement; } } }); return { boxes, nested, radii }; });
    console.log(`  ${tab} @${w}: ${m.boxes} boxes, ${m.nested} inside another box, radii ${JSON.stringify(m.radii)}`);
    await p.close();
  }

  console.log('== 6. What tells the user what each tab is for (first text under the tab bar, 390 px)');
  for (const tab of TABS) {
    const p = await open(390, 844, tab);
    const m = await p.evaluate(() => { const main = document.querySelector('.col-main'); const h = main.querySelector('h2'); const para = main.querySelector('p'); const cs = para ? getComputedStyle(para) : null; return { head: h?.textContent.trim(), intro: para?.textContent.trim().slice(0, 110), size: cs?.fontSize, heads: [...document.querySelectorAll('main h2')].filter(x => x.getBoundingClientRect().width).map(x => x.textContent.trim()) }; });
    console.log(`  ${tab}: head "${m.head}", intro ${m.size} "${m.intro}"`); console.log(`     section order: ${m.heads.join(' → ')}`);
    await p.close();
  }
  await b.close();
})();
