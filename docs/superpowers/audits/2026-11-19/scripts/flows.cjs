const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  let pass = 0, fail = 0;
  const ok = (c, name) => { if (c) { pass++; console.log('  ✅', name); } else { fail++; console.log('  ❌', name); } };
  await p.goto('http://localhost:4180/', { waitUntil: 'networkidle' });
  const fill = async (label, v) => p.locator('label').filter({ hasText: new RegExp('^' + label.replace(/[()]/g, '\\$&') + '$', 'i') }).first().locator('xpath=following-sibling::div//input').fill(String(v));
  const body = async () => { await p.waitForTimeout(200); return (await p.locator('body').innerText()).replace(/\s+/g, ' '); };
  const main = p.locator('.col-main');
  const tabTo = async (n) => { await p.getByRole('button', { name: n, exact: true }).first().click(); await p.waitForTimeout(300); };
  const row = (re) => main.getByRole('button', { name: re }).first();
  const tog = (label) => main.getByRole('button', { name: new RegExp('^' + label) }).first();
  let t;

  // 1. PREVENT reference patient (preventr 50F), BMI optional
  await p.getByRole('button', { name: 'Female', exact: true }).click();
  for (const [k,v] of Object.entries({ 'Age':50, 'Total cholesterol':200, 'HDL-C':45, 'Systolic BP':160, 'eGFR':90 })) await fill(k, v);
  await tog('On BP medication').click(); await tog('Diabetes').click();
  t = await body();
  ok(/10-YEAR ASCVD RISK 9\.2 ?%/i.test(t) && /30-YEAR ASCVD RISK ages 30–59 35\.4 ?%/i.test(t), 'BMI blank: ASCVD 9.2% and 35.4%');
  ok(/Total CVD 14\.7% 53%/.test(t), 'total CVD 14.7% / 53% in the risk readout');
  ok(/Heart failure enter BMI – –/.test(t), 'heart failure row asks for BMI');
  await fill('BMI', 35); t = await body();
  ok(/Heart failure 8\.1% 39%/.test(t), 'BMI 35: heart failure 8.1% / 39%');
  ok(/Elevated \(≥10%\)/.test(t), '30-year readout uses the ≥10% threshold');
  ok(/Blood pressure .* 160\/– Stage 2 on therapy Above goal on therapy\. Intensify/i.test(t), 'BP summary: 160 on therapy → intensify');

  // 2. low 10-yr + 30-yr ≥10%; diabetes floor; CAC rule
  await tog('Diabetes').click(); await tog('On BP medication').click();
  await p.getByRole('button', { name: 'Male', exact: true }).click();
  for (const [k,v] of Object.entries({ 'Age':44, 'Total cholesterol':232, 'HDL-C':42, 'LDL-C':150, 'Systolic BP':118, 'eGFR':82 })) await fill(k, v);
  t = await body();
  ok(/Low 10-year risk \(<3%\) with 30-year risk ≥10%\. A moderate-intensity statin is reasonable/.test(t), 'low 10-yr + 30-yr ≥10% → moderate statin reasonable');
  ok(/The 10-year estimate is low while the 30-year estimate is at or above 10%/.test(t), 'risk readout explains the 30-year threshold');
  await tog('Diabetes').click(); t = await body();
  ok(/Diabetes, age 40 to 75\. Moderate-intensity statin to LDL below 100 mg\/dL, whatever the risk estimate/.test(t), 'primary tab + diabetes at 44 → statin indicated');
  await tog('Diabetes').click();
  for (const [k,v] of Object.entries({ 'Age':58, 'Total cholesterol':240, 'Systolic BP':138 })) await fill(k, v);
  await fill('CAC score', 0); t = await body();
  ok(/CAC of zero\. Reasonable to defer a statin .* Repeat CAC in 3 to 7 years/.test(t), 'CAC 0 at intermediate risk → defer, repeat in 3 to 7 years');
  await tog('Current smoking').click(); t = await body();
  ok(/CAC of zero does not defer therapy with current smoking/.test(t), 'CAC 0 + smoking → not deferred');
  ok(/Enlicitide \(Lipfendra\) 20 mg daily/.test(t) === false, 'intermediate risk: no escalation rungs');
  await tog('Current smoking').click(); await fill('CAC score', '');

  // 3. ASCVD tab
  await tabTo('ASCVD'); t = await body();
  ok(/Clinical ASCVD, not very high risk\. High-intensity statin to LDL below 70/.test(t), 'ASCVD default: not very high risk');
  await row(/^(✓\s*)?Prior MI/).click(); await row(/^(✓\s*)?Current smoker$/).click(); t = await body();
  ok(/1 major event \+ 1 high-risk feature \(needs 2\)/.test(t), '1 major + 1 feature → not very high risk');
  await row(/^(✓\s*)?Hypertension$/).click(); t = await body();
  ok(/Very high-risk ASCVD\. High-intensity statin, then ezetimibe and\/or a PCSK9 mAb to LDL below 55/.test(t), '1 major + 2 features → very high risk');
  ok(/Enlicitide or inclisiran/.test(t) && /Lipfendra/.test(t) && /ezetimibe is no longer required before a PCSK9 mAb/i.test(t), 'ASCVD ladder: enlicitide, inclisiran, order note');

  // 4. Diabetes tab + apoB pairing
  await tabTo('Diabetes'); await fill('Age', 55); t = await body();
  ok(/Diabetes, age 40 to 75\. Moderate-intensity statin to LDL below 100/.test(t), 'diabetes alone → moderate, <100');
  await fill('ApoB', 85); t = await body();
  ok(/ApoB At goal Below 90 mg\/dL/.test(t), 'apoB 85 at LDL goal <100 → at goal');
  await row(/^(✓\s*)?Retinopathy/).click(); t = await body();
  ok(/High-intensity statin to LDL below 70/.test(t) && /ApoB Above goal At or above 70 mg\/dL/.test(t), 'diabetes + enhancer → <70; apoB 85 above goal');

  // 5. LDL ≥190 tab, units
  await tabTo('LDL ≥190'); await fill('Current LDL-C', 212); t = await body();
  ok(/adding nonstatin therapy to LDL below 100/.test(t) && /3 points Possible FH/i.test(t), 'LDL 212: goal <100, DLCN 3 possible');
  await row(/^(✓\s*)?Tendon xanthoma/).click(); t = await body();
  ok(/9 points Definite FH/i.test(t) && /nonstatin therapy to LDL below 70/.test(t), 'tendon xanthoma → definite FH, goal <70');
  await fill('Current LDL-C', 118); await row(/^Atorva$/).click(); await row(/^80 mg$/).click(); t = await body();
  ok(/118 × 2\.2 = 260 mg\/dL \(estimate\)/.test(t), '118 on atorvastatin 80 → est. 260 untreated');
  await p.getByRole('button', { name: /^Units: mg/ }).click(); t = await body();
  ok(/3\.1 × 2\.2 = 6\.7 mmol\/L \(estimate\)/.test(t) && /<2\.6/.test(t) && /<1\.8/.test(t) && /<1\.4/.test(t), 'mmol/L: estimate and goal tiers convert (2.6 / 1.8 / 1.4)');
  await p.getByRole('button', { name: /^Units: mmol/ }).click();

  // 5b. blood pressure section uses the diabetes status in force; repeat events count
  await p.getByRole('button', { name: /Reset/ }).click(); await tabTo('Primary');
  await p.getByRole('button', { name: 'Male', exact: true }).click();
  for (const [k,v] of Object.entries({ 'Age':50, 'Total cholesterol':200, 'HDL-C':45, 'Systolic BP':160, 'eGFR':90 })) await fill(k, v);
  await tog('On BP medication').click(); t = await body();
  ok(/Total CVD 7\.5%/.test(t), '50M reference, no diabetes: total CVD 7.5%');
  await tabTo('Diabetes');
  await p.locator('button[aria-expanded]').filter({ hasText: /Stage 2/ }).first().click(); t = await body();
  ok(/16\.3% 10-year total CVD, with diabetes/i.test(t) && /Calculated with diabetes: 16\.3%/.test(t), 'Diabetes tab: blood pressure section shows total CVD 16.3% with diabetes');
  await tabTo('ASCVD'); await row(/^(✓\s*)?Prior MI/).click(); t = await body();
  ok(/Clinical ASCVD, not very high risk/.test(t), 'one MI → not very high risk');
  await row(/^(✓\s*)?Repeat event of the same type/).click(); t = await body();
  ok(/Very high-risk ASCVD/.test(t) && /2 major events/.test(t), 'MI + repeat event → very high risk');

  // 6. reset
  await p.getByRole('button', { name: /Reset/ }).click(); await tabTo('ASCVD'); t = await body();
  ok(/No major event checked/.test(t), 'reset clears the ASCVD checklists');
  await tabTo('LDL ≥190'); t = await body();
  ok(/0 points Unlikely FH/i.test(t), 'reset clears the DLCN score');
  ok(errs.length === 0, 'no runtime errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(`\n${pass} pass, ${fail} fail`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
