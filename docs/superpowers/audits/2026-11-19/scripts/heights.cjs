const { chromium } = require('playwright');
(async () => { const b = await chromium.launch();
  for (const tab of ['Primary', 'ASCVD', 'Diabetes', 'LDL ≥190']) {
    const q = await b.newPage({ viewport: { width: 390, height: 844 } }); await q.goto('http://localhost:4180/', { waitUntil: 'networkidle' });
    const f2 = async (label, v) => q.locator('label').filter({ hasText: new RegExp('^' + label + '$', 'i') }).first().locator('xpath=following-sibling::div//input').fill(String(v));
    for (const [k, v] of Object.entries({ 'Age': 52, 'Total cholesterol': 228, 'HDL-C': 42, 'LDL-C': 152, 'Systolic BP': 136, 'eGFR': 82, 'BMI': 29.5 })) await f2(k, v);
    if (tab !== 'Primary') { await q.getByRole('button', { name: tab, exact: true }).first().click(); await q.waitForTimeout(250); }
    if (tab === 'LDL ≥190') await f2('Current LDL-C', 212);
    const y = await q.evaluate(() => { const sc = document.querySelector('[data-scroll]'); const el = document.querySelector('[data-plan="inline"]'); return { planY: Math.round(el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop), total: sc.scrollHeight }; });
    console.log(`${tab}: plan y=${y.planY}, page ${y.total}`); await q.close(); }
  await b.close(); })();
