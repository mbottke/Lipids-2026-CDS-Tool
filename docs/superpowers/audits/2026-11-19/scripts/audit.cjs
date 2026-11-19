// usage: node audit.cjs <outDir> [tag]   — matrix audit: overflow, axe, touch targets, type sizes, focus, console errors, screenshots
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
// axe-core is not a dependency of this repo. Point AXE_PATH at axe.min.js (npm i axe-core@4.10.2 anywhere).
const AXE = fs.readFileSync(process.env.AXE_PATH || require.resolve('axe-core/axe.min.js'), 'utf8');
const out = process.argv[2]; const only = process.argv[3] || '';
const TABS = ['Primary', 'ASCVD', 'Diabetes', 'LDL ≥190'];
const WIDTHS = [320, 390, 768, 1024, 1440];
(async () => {
  const b = await chromium.launch();
  const res = [];
  for (const dark of [false, true]) for (const w of WIDTHS) for (const tab of TABS) {
    const name = `${tab.replace(/[^A-Za-z0-9]+/g, '').toLowerCase()}-${w}-${dark ? 'night' : 'day'}`;
    if (only && !name.includes(only)) continue;
    const ctx = await b.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, deviceScaleFactor: 1, colorScheme: dark ? 'dark' : 'light', hasTouch: w < 700 });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
    await p.goto('http://localhost:4180/', { waitUntil: 'networkidle' });
    const fill = async (label, v) => p.locator('label').filter({ hasText: new RegExp('^' + label + '$', 'i') }).first().locator('xpath=following-sibling::div//input').fill(String(v));
    for (const [k, v] of Object.entries({ 'Age': 52, 'Total cholesterol': 228, 'HDL-C': 42, 'LDL-C': 152, 'Systolic BP': 136, 'eGFR': 82, 'BMI': 29.5 })) await fill(k, v);
    if (tab !== 'Primary') { await p.getByRole('button', { name: tab, exact: true }).first().click(); await p.waitForTimeout(250); }
    if (tab === 'LDL ≥190') await fill('Current LDL-C', 212).catch(() => {});
    if (tab === 'ASCVD') await p.locator('.col-main').getByRole('button', { name: /^(✓\s*)?Prior MI/ }).first().click().catch(() => {});
    // open every disclosure (3 rounds; newly revealed ones included)
    for (let r = 0; r < 3; r++) {
      const n = await p.evaluate(() => { let c = 0; document.querySelectorAll('button[aria-expanded="false"]').forEach(x => { x.click(); c++; }); return c; });
      await p.waitForTimeout(200); if (!n) break;
    }
    const st = p.getByRole('button', { name: /Statin not tolerated/ }).first();
    if (await st.count()) { await st.click().catch(() => {}); await p.waitForTimeout(150); }
    await p.evaluate(() => { const r = document.querySelector('.h-screen'); if (r) { r.style.height = 'auto'; r.style.overflow = 'visible'; } const s = document.querySelector('[data-scroll]'); if (s) { s.style.overflow = 'visible'; s.parentElement.style.overflow = 'visible'; } document.getAnimations().forEach(a => { try { a.finish(); } catch (e) {} }); });
    await p.waitForTimeout(250);
    const m = await p.evaluate((w) => {
      const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const label = el => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 48);
      const over = []; document.querySelectorAll('body *').forEach(el => { if (!vis(el)) return; const r = el.getBoundingClientRect(); if (r.right > w + 1 && r.width < w * 1.5) over.push(`${el.tagName}.${(el.className || '').toString().slice(0, 40)} right=${Math.round(r.right)} "${label(el)}"`); });
      const small = []; document.querySelectorAll('button, a[href], input, select, [role=button]').forEach(el => { if (!vis(el)) return; const r = el.getBoundingClientRect(); if (r.height < 43.5 || r.width < 43.5) small.push(`${Math.round(r.width)}x${Math.round(r.height)} ${el.tagName} "${label(el)}"`); });
      const sizes = {}; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (tw.nextNode()) { const t = tw.currentNode; if (!t.nodeValue.trim()) continue; const el = t.parentElement; if (!vis(el)) continue; const fs = parseFloat(getComputedStyle(el).fontSize).toFixed(1); sizes[fs] = (sizes[fs] || 0) + t.nodeValue.trim().length; }
      return { scrollW: document.documentElement.scrollWidth, over: over.slice(0, 12), overN: over.length, small, sizes, textLen: document.body.innerText.length, height: document.documentElement.scrollHeight };
    }, w);
    let axe = null;
    if (w === 390 || w === 1440) {
      await p.addScriptTag({ content: AXE });
      const r = await p.evaluate(async () => await window.axe.run(document, { resultTypes: ['violations'] }));
      axe = r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, sample: v.nodes.slice(0, 4).map(n => ({ t: n.target.join(' ').slice(0, 110), html: n.html.slice(0, 140), msg: (n.any[0]?.message || n.all[0]?.message || '').slice(0, 170) })) }));
    }
    await p.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    res.push({ name, w, tab, dark, errs, ...m, axe });
    const ax = axe ? ` axe=${axe.map(v => `${v.id}(${v.n})`).join(',') || '0'}` : '';
    console.log(`${name}: scrollW=${m.scrollW}${m.scrollW > w ? ' OVERFLOW' : ''} over=${m.overN} small=${m.small.length} h=${m.height}${ax}${errs.length ? ' ERR=' + errs.length : ''}`);
    await ctx.close();
  }
  fs.writeFileSync(`${out}/audit.json`, JSON.stringify(res, null, 1));
  await b.close();
})();
