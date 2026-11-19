// usage: node clip.cjs [width] — finds content clipped or spilling out of its container on every tab
const { chromium } = require('playwright');
const W = Number(process.argv[2] || 320);
(async () => {
  const b = await chromium.launch(); let total = 0;
  for (const tab of ['Primary', 'ASCVD', 'Diabetes', 'LDL ≥190']) {
    const p = await b.newPage({ viewport: { width: W, height: 844 } });
    await p.goto('http://localhost:4180/', { waitUntil: 'networkidle' });
    const fill = async (label, v) => p.locator('label').filter({ hasText: new RegExp('^' + label + '$', 'i') }).first().locator('xpath=following-sibling::div//input').fill(String(v));
    for (const [k, v] of Object.entries({ 'Age': 52, 'Total cholesterol': 228, 'HDL-C': 42, 'LDL-C': 152, 'Systolic BP': 136, 'eGFR': 82, 'BMI': 29.5 })) await fill(k, v);
    if (tab !== 'Primary') { await p.getByRole('button', { name: tab, exact: true }).first().click(); await p.waitForTimeout(250); }
    if (tab === 'LDL ≥190') await fill('Current LDL-C', 212).catch(() => {});
    for (let r = 0; r < 3; r++) { const n = await p.evaluate(() => { let c = 0; document.querySelectorAll('button[aria-expanded="false"]').forEach(x => { x.click(); c++; }); return c; }); await p.waitForTimeout(200); if (!n) break; }
    const st = p.getByRole('button', { name: /Statin not tolerated/ }).first(); if (await st.count()) { await st.click().catch(() => {}); await p.waitForTimeout(150); }
    const out = await p.evaluate(() => {
      const res = []; const txt = el => (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      document.querySelectorAll('main *').forEach(el => {
        const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
        const par = el.parentElement; if (!par) return; const pr = par.getBoundingClientRect();
        if (r.right > pr.right + 1.5 && getComputedStyle(par).overflowX === 'visible' && getComputedStyle(el).position !== 'absolute') res.push(`SPILL +${Math.round(r.right - pr.right)}px <${el.tagName.toLowerCase()}> "${txt(el)}"`);
        if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible' && el.tagName !== 'INPUT') res.push(`CLIP ${el.scrollWidth}>${el.clientWidth} <${el.tagName.toLowerCase()}> "${txt(el)}"`);
      });
      return [...new Set(res)];
    });
    total += out.length; console.log(`${tab} @${W}: ${out.length}`); out.slice(0, 14).forEach(o => console.log('   ' + o));
    await p.close();
  }
  console.log(`TOTAL ${total}`); await b.close(); process.exit(total ? 1 : 0);
})();
