// clarity.cjs — browser checks for the clarity pass.
// Spec: docs/superpowers/specs/2026-11-19-clarity-pass-design.md
// usage: node clarity.cjs [filter]     (dev server on :4180, or APP_URL)     exit 1 on any failure
const { chromium } = require('playwright');
const only = process.argv[2] || '';
const URL = process.env.APP_URL || 'http://localhost:4180/';
const TABS = ['Primary', 'ASCVD', 'Diabetes', 'LDL ≥190'];
const PATIENT = { 'Age': 52, 'Total cholesterol': 228, 'HDL-C': 42, 'LDL-C': 152, 'Systolic BP': 136, 'eGFR': 82, 'BMI': 29.5 };
let pass = 0, fail = 0;
const ok = (c, name, dbg) => {
  if (c) { pass++; console.log('  ✅', name); }
  else { fail++; console.log('  ❌', name, dbg !== undefined ? '\n       ' + String(typeof dbg === 'string' ? dbg : JSON.stringify(dbg)).slice(0, 380) : ''); }
};

(async () => {
  const b = await chromium.launch();
  const open = async (w, h, tab, patient = PATIENT) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: false });
    const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(URL, { waitUntil: 'networkidle' });
    p.fill2 = (label, v) => p.locator('label').filter({ hasText: new RegExp('^' + label.replace(/[()]/g, '\\$&') + '$', 'i') }).first().locator('xpath=following-sibling::div//input').fill(String(v));
    if (patient) for (const [k, v] of Object.entries(patient)) await p.fill2(k, v);
    if (tab && tab !== 'Primary') { await p.locator('header + nav').getByRole('button', { name: tab, exact: true }).click(); await p.waitForTimeout(250); }
    if (tab === 'LDL ≥190') await p.fill2('Current LDL-C', 212);
    await p.waitForTimeout(200);
    p.txt = async (sel = 'main') => (await p.locator(sel).first().innerText()).replace(/\s+/g, ' ');
    p.main = () => p.locator('[data-scroll]');
    p.done = () => ctx.close();
    return p;
  };
  const section = async (name, fn) => {
    if (only && !name.includes(only)) return;
    console.log(`\n═══ ${name} ═══`);
    try { await fn(); } catch (e) { ok(false, `${name}: threw`, e.message.split('\n')[0]); }
  };

  // ── Task 1 ─────────────────────────────────────────────────────────────────
  await section('risk grid: all six PREVENT numbers in one place, above the plan', async () => {
    let p = await open(1243, 700, 'Primary');
    let m = await p.evaluate(() => {
      const a = document.querySelector('aside'), c = a.querySelector('[data-risk="cvd10"]'), plan = a.querySelector('[data-plan="rail"]');
      if (!c) return { found: false };
      const r = c.getBoundingClientRect(), ar = a.getBoundingClientRect();
      return { found: true, y: Math.round(r.bottom), limit: Math.round(Math.min(innerHeight, ar.bottom)), beforePlan: r.top < plan.getBoundingClientRect().top,
        heads: [...a.querySelectorAll('h2, h3')].map(h => h.textContent.trim()), grid: a.querySelector('[data-risk-grid]')?.innerText.replace(/\s+/g, ' ') };
    });
    ok(m.found && m.y <= m.limit, '1243 x 700: 10-year total CVD is visible without scrolling the rail', m);
    ok(m.found && m.beforePlan, 'the grid sits above the plan', m.heads);
    ok(/ASCVD.*3\.6%.*19\.6%/.test(m.grid || '') && /Total CVD.*5\.0%.*27\.7%/.test(m.grid || '') && /Heart failure.*1\.6%.*12\.7%/.test(m.grid || ''), 'six numbers, each with one decimal', m.grid);
    ok(/Borderline/.test(m.grid || '') && /Elevated/.test(m.grid || '') && /For statins/.test(m.grid || '') && /For BP drugs/.test(m.grid || ''), 'category words and what each row decides', m.grid);
    ok((m.heads || []).filter(h => /PREVENT risk/i.test(h)).length === 1 && !(m.heads || []).some(h => /Other PREVENT outcomes|10-year ASCVD risk/i.test(h)), 'one head, "PREVENT risk"', m.heads);
    const rulers = await p.locator('aside [data-risk-grid] [data-scale]').count();
    ok(rulers === 2, 'both rulers are kept', rulers);
    ok(/30-year outlook/i.test(await p.txt('aside')) && /If optimized/i.test(await p.txt('aside')), '"30-year outlook" keeps the optimized estimate and the drivers');
    await p.done();

    p = await open(390, 844, 'Primary');
    m = await p.evaluate(() => { const sc = document.querySelector('[data-scroll]'), c = document.querySelector('.col-main [data-risk="cvd10"]'); return c ? Math.round(c.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop) : null; });
    // The inputs above the grid take about 880 px on a phone. Total CVD now sits in the same block as ASCVD.
    ok(m !== null && m <= 1100, `390: 10-year total CVD is ${m} px down the page (limit 1100, was 1410)`);
    await p.fill2('BMI', ''); await p.waitForTimeout(150);
    ok(/Heart failure\s+Enter BMI/i.test(await p.txt('.col-main [data-risk-grid]')), 'without BMI the heart failure row says "Enter BMI"', await p.txt('.col-main [data-risk-grid]'));
    await p.fill2('Age', 62); await p.waitForTimeout(150);
    const t = await p.txt('.col-main [data-risk-grid]');
    ok(/Not validated for ages 60 and above/.test(t) && !/Elevated/.test(t), 'at age 62 the 30-year column says it is not validated', t);
    await p.done();

    p = await open(390, 844, 'Primary', { 'Age': 50, 'Total cholesterol': 200, 'HDL-C': 45, 'Systolic BP': 160, 'eGFR': 90 });
    for (const name of [/^On BP medication/, /^Diabetes/]) await p.locator('.col-main').getByRole('button', { name }).first().click();
    await p.waitForTimeout(200);
    const flag = await p.locator('.col-main [data-risk="cvd10"]').evaluate(el => ({ text: el.innerText.trim(), flagged: el.getAttribute('data-flag') }));
    ok(/16\.3%/.test(flag.text) && flag.flagged === 'true', 'total CVD at or above 7.5% is flagged', flag);
    await p.done();
  });

  // ── Task 2 ─────────────────────────────────────────────────────────────────
  await section('sheet: reference content opens without moving the page', async () => {
    const cases = [['Primary', 'About the PREVENT calculator', /PREVENT/], ['Primary', 'About CAC scoring', /CAC/], ['ASCVD', 'About Lp(a) and apoB', /Lp\(a\)/],
      ['ASCVD', 'Statin reference', /Statin reference/], ['ASCVD', /^Statin not tolerated/, /Statin intolerance/]];
    for (const [tab, name, title] of cases) {
      const p = await open(390, 844, tab);
      const trig = p.locator('main').getByRole('button', { name }).first();
      await trig.scrollIntoViewIfNeeded(); await p.waitForTimeout(120);
      const before = await p.main().evaluate(el => ({ h: el.scrollHeight, top: el.scrollTop }));
      await trig.click(); await p.waitForTimeout(350);
      const dlg = p.locator('dialog[open]');
      const shown = await dlg.count() === 1;
      const head = shown ? (await dlg.locator('h2').first().innerText()) : '';
      const during = await p.main().evaluate(el => ({ h: el.scrollHeight, top: el.scrollTop }));
      const geo = shown ? await dlg.evaluate(el => { const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), vh: innerHeight, w: Math.round(r.width) }; }) : null;
      const label = typeof name === 'string' ? name : 'Statin not tolerated?';
      ok(shown && title.test(head), `${label}: opens a sheet titled "${head}"`);
      ok(shown && during.h === before.h && during.top === before.top, `${label}: the page did not grow or scroll`, { before, during });
      ok(shown && geo.bottom === geo.vh && geo.top >= 56 && geo.w === 390, `${label}: bottom sheet, at least 56 px of the page left above`, geo);
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      const after = await p.evaluate(() => ({ open: !!document.querySelector('dialog[open]'), focus: (document.activeElement.getAttribute('aria-label') || document.activeElement.innerText || '').trim().slice(0, 30), top: document.querySelector('[data-scroll]').scrollTop }));
      ok(!after.open && after.top === before.top && (typeof name === 'string' ? after.focus === name : name.test(after.focus)), `${label}: Escape closes it, focus returns to the trigger, the page is where it was`, after);
      ok(p.errs.length === 0, `${label}: no runtime errors`, p.errs);
      await p.done();
    }
    let p = await open(390, 844, 'ASCVD');
    await p.locator('main').getByRole('button', { name: /^Statin not tolerated/ }).click(); await p.waitForTimeout(300);
    const t = await p.txt('dialog[open]');
    ok(/Where AACE 2025 differs/.test(t) && /AACE stops the statin at CK/.test(t), 'the AACE comparison is shown without a second press');
    const small = await p.locator('dialog[open]').evaluate(el => [...el.querySelectorAll('button, a[href]')].map(x => x.getBoundingClientRect()).filter(r => r.width && (r.width < 43.5 || r.height < 43.5)).length);
    ok(small === 0, 'every control in the sheet is at least 44 px', small);
    await p.keyboard.press('Tab'); await p.keyboard.press('PageDown'); await p.waitForTimeout(250);
    const kb = await p.evaluate(() => { const b = document.querySelector('dialog[open] [data-sheet-body]'); return { focusOnBody: document.activeElement === b, scrolled: b.scrollTop > 0, canScroll: b.scrollHeight > b.clientHeight }; });
    ok(kb.canScroll && kb.focusOnBody && kb.scrolled, 'a long sheet can be scrolled from the keyboard', kb);
    await p.mouse.click(195, 20); await p.waitForTimeout(300);
    ok(await p.locator('dialog[open]').count() === 0, 'a press on the backdrop closes it');
    ok(await p.locator('header + nav [aria-current="page"]').innerText() === 'ASCVD', 'and does not press what was behind it');
    await p.done();

    p = await open(1243, 700, 'Primary');
    await p.locator('aside').evaluate(el => { el.scrollTop = 150; });
    const railTop = await p.locator('aside').evaluate(el => el.scrollTop);
    await p.locator('main').getByRole('button', { name: 'About CAC scoring' }).scrollIntoViewIfNeeded();
    const mainTop = await p.main().evaluate(el => el.scrollTop);
    await p.locator('main').getByRole('button', { name: 'About CAC scoring' }).click(); await p.waitForTimeout(350);
    const geo = await p.locator('dialog[open]').evaluate(el => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight }; });
    ok(geo.w === 480 && geo.right === geo.vw && geo.h === geo.vh, '1243: a 480 px panel on the right edge, full height', geo);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    const back = await p.evaluate(() => ({ rail: document.querySelector('aside').scrollTop, main: document.querySelector('[data-scroll]').scrollTop }));
    ok(back.rail === railTop && back.main === mainTop, 'the rail and the page keep their scroll positions', { railTop, mainTop, back });
    await p.done();
  });

  // ── Task 3 ─────────────────────────────────────────────────────────────────
  await section('disclosures: one flat family that never moves the pressed row', async () => {
    let p = await open(390, 844, 'Primary');
    await p.locator('[data-bp] button[aria-expanded]').first().click(); await p.waitForTimeout(250);
    const first = p.getByRole('button', { name: /^Drug therapy/ }), last = p.getByRole('button', { name: /^Follow-up and labs/ });
    await first.click(); await p.waitForTimeout(250); await last.scrollIntoViewIfNeeded(); await p.waitForTimeout(120);
    const y0 = (await last.boundingBox()).y; await last.click(); await p.waitForTimeout(300); const y1 = (await last.boundingBox()).y;
    ok(Math.abs(y1 - y0) <= 1, `pressing "Follow-up and labs" under an open section moves it ${Math.round(y1 - y0)} px (was -920)`);
    ok(await first.getAttribute('aria-expanded') === 'true' && await last.getAttribute('aria-expanded') === 'true', 'opening one section does not close another');
    const boxed = await p.evaluate(() => [...document.querySelectorAll('main button[aria-expanded]')].filter(bt => { const w = bt.parentElement, cs = getComputedStyle(w); return parseFloat(cs.borderLeftWidth) > 0 && parseFloat(cs.borderTopLeftRadius) > 0; }).map(bt => bt.innerText.trim().slice(0, 24)));
    ok(boxed.length === 0, 'no disclosure is drawn as a box', boxed);
    await p.done();

    p = await open(390, 844, 'Primary');
    const head = p.getByRole('button', { name: /Risk enhancers/ }).first();
    ok(await head.getAttribute('aria-expanded') === 'true', 'risk enhancers are open at borderline risk');
    const end = p.getByRole('button', { name: 'Close risk enhancers' });
    await end.scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
    const gone = await head.evaluate(el => el.getBoundingClientRect().bottom < 105);
    await end.click(); await p.waitForTimeout(350);
    const at = await head.evaluate(el => { const r = el.getBoundingClientRect(); return { y: Math.round(r.top), vh: innerHeight, expanded: el.getAttribute('aria-expanded') }; });
    ok(gone && at.expanded === 'false' && at.y >= 100 && at.y <= at.vh - 44, 'closing a long section from its end leaves its head in view', { gone, at });
    await p.done();

    p = await open(390, 844, 'LDL ≥190');
    const t = await p.txt('main');
    ok(/≥330/.test(t) && /250–329/.test(t) && await p.getByRole('button', { name: /Point bands/ }).count() === 0, 'the DLCN point bands are always shown');
    await p.done();
  });

  // ── Task 4 ─────────────────────────────────────────────────────────────────
  await section('wayfinding: what each tab is for and what comes next', async () => {
    const INTRO = {
      'Primary': 'Ages 30 to 79, no known ASCVD, LDL-C below 190. Risk guides the statin.',
      'ASCVD': 'Any clinical ASCVD: ACS, prior MI, ischemic stroke, symptomatic PAD, CABG or PCI.',
      'Diabetes': 'Adults with diabetes and no ASCVD. Age and added risk set the statin.',
      'LDL ≥190': 'Adults with LDL-C ≥190 or suspected FH. Set the goal, then work up FH.',
    };
    const ROUTE = { 'Primary': 'Assess Plan Refine Treat Also check', 'ASCVD': 'Assess Plan Treat Also check', 'Diabetes': 'Assess Plan Treat Also check', 'LDL ≥190': 'Assess Plan Work up Treat Also check' };
    const HEADS = {
      'Primary': ['Assess / PREVENT inputs', 'PREVENT risk', 'Plan', '30-year outlook', 'Refine / Risk enhancers', 'CAC score (optional)', 'Treatment ladder', 'Also check / Lp(a) and apoB', 'Blood pressure', 'Monitoring and referral'],
      'ASCVD': ['Assess / Clinical ASCVD risk level', 'Plan', 'Treatment ladder', 'Also check / Lp(a) and apoB', 'Blood pressure', 'Monitoring and referral'],
      'Diabetes': ['Assess / Diabetes risk tier', 'Plan', 'Treatment ladder', 'Also check / Lp(a) and apoB', 'Blood pressure', 'Monitoring and referral'],
      'LDL ≥190': ['Assess / LDL-C goal tier', 'Plan', 'FH workup', 'Treatment ladder', 'Also check / Lp(a) and apoB', 'Blood pressure', 'Monitoring and referral'],
    };
    for (const tab of TABS) {
      const p = await open(390, 844, tab);
      const m = await p.evaluate(() => {
        const intro = document.querySelector('[data-tab-intro]'), nav = document.querySelector('nav[aria-label="On this tab"]');
        const vis = el => el.getBoundingClientRect().width > 0;
        return { intro: intro?.textContent.trim(), size: intro ? parseFloat(getComputedStyle(intro).fontSize) : 0, first: document.querySelector('.col-main')?.firstElementChild?.contains(intro),
          route: nav ? [...nav.querySelectorAll('a')].filter(vis).map(a => a.textContent.trim()).join(' ') : null,
          heads: [...document.querySelectorAll('.col-main h2')].filter(vis).map(h => h.textContent.replace(/\s+/g, ' ').replace(/\d+ checked/, '').trim()) };
      });
      ok(m.intro === INTRO[tab] && m.size >= 14 && m.first, `${tab}: opens with its purpose, at ${m.size} px`, m.intro);
      ok(m.route === ROUTE[tab], `${tab}: route reads ${ROUTE[tab].replace(/ (?=[A-Z])/g, ' → ')}`, m.route);
      ok(JSON.stringify(m.heads) === JSON.stringify(HEADS[tab]), `${tab}: section heads in order`, m.heads);
      await p.locator('nav[aria-label="On this tab"]').getByRole('link', { name: 'Treat', exact: true }).click(); await p.waitForTimeout(700);
      const y = await p.evaluate(() => { const h = [...document.querySelectorAll('.col-main h2')].find(x => /Treatment ladder/.test(x.textContent)); return Math.round(h.getBoundingClientRect().top); });
      ok(y >= 100 && y < 400, `${tab}: pressing "Treat" brings the treatment ladder to the top (y=${y})`);
      await p.done();
    }
    const p = await open(1243, 700, 'Primary');
    const route = await p.evaluate(() => [...document.querySelectorAll('nav[aria-label="On this tab"] a')].filter(a => a.getBoundingClientRect().width > 0).map(a => a.textContent.trim()).join(' '));
    ok(route === 'Assess Refine Treat Also check', '1243: the plan is in the rail, so the route skips it', route);
    await p.done();
  });

  // ── Task 5 ─────────────────────────────────────────────────────────────────
  await section('boxes: only inputs, buttons and computed results are boxed', async () => {
    const LIMIT = { 'Primary': 20, 'ASCVD': 10, 'Diabetes': 10, 'LDL ≥190': 14 };
    for (const tab of TABS) {
      const p = await open(390, 844, tab);
      const m = await p.evaluate(() => { let boxes = 0, nested = 0; document.querySelectorAll('main *').forEach(el => { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); if (!r.width || !r.height || r.width <= 60) return; const all = ['Top', 'Right', 'Bottom', 'Left'].every(s => parseFloat(cs['border' + s + 'Width']) > 0 && cs['border' + s + 'Color'] !== 'rgba(0, 0, 0, 0)'); if (!all || parseFloat(cs.borderTopLeftRadius) === 0) return; boxes++; for (let a = el.parentElement; a && a.tagName !== 'MAIN'; a = a.parentElement) { const c = getComputedStyle(a); if (parseFloat(c.borderTopWidth) > 0 && parseFloat(c.borderLeftWidth) > 0 && c.borderLeftColor !== 'rgba(0, 0, 0, 0)' && parseFloat(c.borderTopLeftRadius) > 0) { nested++; break; } } }); return { boxes, nested }; });
      ok(m.boxes <= LIMIT[tab], `${tab}: ${m.boxes} boxes (limit ${LIMIT[tab]})`, m);
      await p.done();
    }
    const p = await open(390, 844, 'ASCVD');
    const lum = c => { const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
    const rowSel = 'main button[aria-pressed]';
    const c = await p.locator(rowSel).first().evaluate(el => { const box = el.firstElementChild; let bg = 'rgba(0, 0, 0, 0)'; for (let a = el; a && bg === 'rgba(0, 0, 0, 0)'; a = a.parentElement) bg = getComputedStyle(a).backgroundColor; return { border: getComputedStyle(box).borderTopColor, bg, rowBorder: parseFloat(getComputedStyle(el).borderLeftWidth) }; });
    const ratio = (() => { const [x, y] = [lum(c.border), lum(c.bg)].sort((p1, p2) => p2 - p1); return (x + 0.05) / (y + 0.05); })();
    ok(ratio >= 3, `an unchecked checkbox border is ${ratio.toFixed(2)}:1 against the page (floor 3:1)`, c);
    ok(c.rowBorder === 0, 'a check row has no box of its own', c);
    const row = p.locator('main').getByRole('button', { name: /^(✓\s*)?Prior MI/ }).first();
    await row.click(); await p.waitForTimeout(150);
    const sel = await row.evaluate(el => { const box = el.firstElementChild; const lab = el.querySelector('div > div'); return { fill: getComputedStyle(box).backgroundColor, weight: getComputedStyle(lab).fontWeight, pressed: el.getAttribute('aria-pressed'), h: Math.round(el.getBoundingClientRect().height) }; });
    ok(sel.pressed === 'true' && sel.fill !== 'rgba(0, 0, 0, 0)' && Number(sel.weight) >= 600 && sel.h >= 44, 'a checked row: filled checkbox, bold label, at least 44 px high', sel);
    const en = await open(390, 844, 'Primary');
    const n = await en.locator('.col-main').getByRole('button', { name: /^(✓\s*)?Elevated Lp\(a\)/ }).first().getAttribute('aria-pressed');
    ok(n === 'false', 'risk-enhancer rows are the shared check row and state whether they are pressed', n);
    await en.done(); await p.done();
  });

  console.log(`\n${pass} pass, ${fail} fail`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
