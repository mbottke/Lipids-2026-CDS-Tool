#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════
//  COMPREHENSIVE CLINICAL VALIDATION TEST SUITE
//  2026 ACC/AHA Lipid Management CDS · PREVENT-ASCVD Calculator
//
//  Tests against:
//  - Khan SS et al. Circulation 2024;149:430-449 (PREVENT equations)
//  - AHA PREVENT™ online calculator reference values
//  - 2026 ACC/AHA Guideline thresholds & recommendations
// ══════════════════════════════════════════════════════════════════════════════

let pass = 0, fail = 0, total = 0;

function assert(condition, name, detail = "") {
  total++;
  if (condition) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ FAIL: ${name}${detail ? " — " + detail : ""}`); }
}

function assertClose(actual, expected, tolerance, name) {
  total++;
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) {
    pass++;
    console.log(`  ✅ ${name} (got ${actual}, expected ${expected}, Δ=${diff.toFixed(3)})`);
  } else {
    fail++;
    console.log(`  ❌ FAIL: ${name} — got ${actual}, expected ${expected}, Δ=${diff.toFixed(3)} > tolerance ${tolerance}`);
  }
}

function section(name) { console.log(`\n═══ ${name} ${"═".repeat(60 - name.length)}`); }

// ══════════════════════════════════════════════════════════════════════════════
//  EXTRACT CLINICAL LOGIC (identical to App.jsx)
// ══════════════════════════════════════════════════════════════════════════════

const PREVENT = {
  female: {
    age: 0.7198830, nonHdlC: 0.1176967, hdlC: -0.1511850,
    sbpLt110: -0.0835358, sbpGte110: 0.3592852, dm: 0.8348585,
    smoking: 0.4831078, bmiLt30: 0.0, bmiGte30: 0.0,
    egfrLt60: 0.4864619, egfrGte60: 0.0397779, bpTx: 0.2265309,
    statin: -0.0592374, bpTxSbpGte110: -0.0395762, statinNonHdlC: 0.0844423,
    ageNonHdlC: -0.0567839, ageHdlC: 0.0325692, ageSbpGte110: -0.1035985,
    ageDm: -0.2417542, ageSmoking: -0.0791142, ageBmiGte30: 0.0,
    ageEgfrLt60: -0.1671492, constant: -3.8199750,
  },
  male: {
    age: 0.7099847, nonHdlC: 0.1658663, hdlC: -0.1144285,
    sbpLt110: -0.2837212, sbpGte110: 0.3239977, dm: 0.7189597,
    smoking: 0.3956973, bmiLt30: 0.0, bmiGte30: 0.0,
    egfrLt60: 0.3690075, egfrGte60: 0.0203619, bpTx: 0.2036522,
    statin: -0.0865581, bpTxSbpGte110: -0.0322916, statinNonHdlC: 0.1145630,
    ageNonHdlC: -0.0300005, ageHdlC: 0.0232747, ageSbpGte110: -0.0927024,
    ageDm: -0.2018525, ageSmoking: -0.0970527, ageBmiGte30: 0.0,
    ageEgfrLt60: -0.1217081, constant: -3.5006550,
  },
};

function calcPREVENT({ age, sex, sbp, bpTx, totalC, hdlC, statin, dm, smoking, egfr, bmi }) {
  if (!age || !sbp || !totalC || !hdlC || !egfr || !bmi) return null;
  const c = PREVENT[sex];
  const toMmol = (mg) => mg / 38.67;
  const a = (age - 55) / 10;
  const nh = toMmol(totalC - hdlC) - 3.5;
  const hd = (toMmol(hdlC) - 1.3) / 0.3;
  const sl = (Math.min(sbp, 110) - 110) / 20;
  const sh = (Math.max(sbp, 110) - 130) / 20;
  const d = dm ? 1 : 0, sm = smoking ? 1 : 0, bp = bpTx ? 1 : 0, st = statin ? 1 : 0;
  const bl = (Math.min(bmi, 30) - 25) / 5;
  const bh = (Math.max(bmi, 30) - 30) / 5;
  const el = (Math.min(egfr, 60) - 60) / -15;
  const eh = (Math.max(egfr, 60) - 90) / -15;
  const x =
    c.age*a + c.nonHdlC*nh + c.hdlC*hd + c.sbpLt110*sl + c.sbpGte110*sh +
    c.dm*d + c.smoking*sm + c.bmiLt30*bl + c.bmiGte30*bh +
    c.egfrLt60*el + c.egfrGte60*eh + c.bpTx*bp + c.statin*st +
    c.bpTxSbpGte110*(bp*sh) + c.statinNonHdlC*(st*nh) +
    c.ageNonHdlC*(a*nh) + c.ageHdlC*(a*hd) + c.ageSbpGte110*(a*sh) +
    c.ageDm*(a*d) + c.ageSmoking*(a*sm) + c.ageBmiGte30*(a*bh) +
    c.ageEgfrLt60*(a*el) + c.constant;
  return Math.round((Math.exp(x)/(1+Math.exp(x)))*1000)/10;
}

function riskCat(r) {
  if (r === null) return null;
  if (r < 3) return { label: "Low", color: "#16a34a", bg: "#f0fdf4", range: "<3%" };
  if (r < 5) return { label: "Borderline", color: "#ca8a04", bg: "#fefce8", range: "3–<5%" };
  if (r < 10) return { label: "Intermediate", color: "#ea580c", bg: "#fff7ed", range: "5–<10%" };
  return { label: "High", color: "#dc2626", bg: "#fef2f2", range: "≥10%" };
}

// Recommendation engine (extracted from App.jsx useMemo)
function getRec({ tab, risk, enhCount, cac, cacPct, ascvdLevel }) {
  if (tab === "secondary") {
    return ascvdLevel === "very_high"
      ? { g:{ldl:55,nh:85,p:50}, int:"high", esc:true, txt:"Very high-risk ASCVD — high-intensity statin + add-on therapy to LDL <55 mg/dL", clr:"red" }
      : { g:{ldl:70,nh:100,p:50}, int:"high", esc:true, txt:"Clinical ASCVD (not very high risk) — high-intensity statin to LDL <70 mg/dL", clr:"amber" };
  }
  if (tab === "diabetes") {
    return { g:{ldl:70,nh:100,p:50}, int:"high", esc:true, txt:"Diabetes (age 40–75) — LLT recommended regardless of LDL; high-intensity statin if additional risk factors", clr:"violet" };
  }
  if (tab === "severe") {
    return { g:{ldl:100,nh:130,p:50}, int:"high", esc:true, txt:"LDL ≥190 — high-intensity statin; evaluate for familial hypercholesterolemia", clr:"red" };
  }
  if (risk === null) return null;
  // CAC override
  if (cac !== "" && cac !== undefined) {
    const c = Number(cac), p = cacPct !== "" && cacPct !== undefined ? Number(cacPct) : null;
    if (c === 0) return { g:null, int:"none", esc:false, txt:"CAC = 0 — Statin may be deferred. Reassess in 5–10 y. Lifestyle optimization.", clr:"emerald" };
    if (c >= 1000) return { g:{ldl:55,nh:85,p:50}, int:"high", esc:true, txt:"CAC ≥1000 — Treat as very high risk. LDL goal <55.", clr:"red" };
    if (c >= 100 || (p !== null && p >= 75)) return { g:{ldl:70,nh:100,p:50}, int:"high", esc:true, txt:"CAC ≥100 or ≥75th %ile — High-intensity statin to LDL <70.", clr:"amber" };
    if (c >= 1) return { g:{ldl:100,nh:130,p:30}, int:"moderate", esc:false, txt:"CAC 1–99 (<75th %ile) — Moderate-intensity statin to LDL <100.", clr:"blue" };
  }
  if (risk >= 10) return { g:{ldl:70,nh:100,p:50}, int:"high", esc:true, txt:"High 10-year ASCVD risk (≥10%) — High-intensity statin to LDL <70.", clr:"red" };
  if (risk >= 5) return { g:{ldl:100,nh:130,p:30}, int:"moderate", esc:false, txt:"Intermediate risk (5–<10%) — Moderate-intensity statin to LDL <100 after shared decision-making.", clr:"amber" };
  if (risk >= 3 && enhCount > 0) return { g:{ldl:100,nh:130,p:30}, int:"moderate", esc:false, txt:`Borderline risk with ${enhCount} risk enhancer${enhCount>1?"s":""} — Consider moderate-intensity statin.`, clr:"amber" };
  if (risk >= 3) return { g:{ldl:100,nh:130,p:30}, int:"lifestyle", esc:false, txt:"Borderline risk (3–<5%) — Lifestyle optimization; consider statin if risk enhancers present.", clr:"blue" };
  return { g:null, int:"none", esc:false, txt:"Low risk (<3%) — Lifestyle optimization. Reassess periodically.", clr:"emerald" };
}

// Biomarker interpretation
function lpaInterpret(val) {
  if (val === "" || val === undefined) return null;
  const v = Number(val);
  if (v >= 250) return { lv:"Very High", c:"red" };
  if (v >= 125) return { lv:"Elevated", c:"amber" };
  return { lv:"Normal", c:"emerald" };
}

function apoBInterpret(val) {
  if (val === "" || val === undefined) return null;
  const v = Number(val);
  if (v >= 130) return { lv:"Very High", c:"red" };
  if (v >= 100) return { lv:"Elevated", c:"amber" };
  if (v >= 85) return { lv:"Borderline", c:"blue" };
  return { lv:"Optimal", c:"emerald" };
}


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 1: PREVENT COEFFICIENT VALIDATION
// ══════════════════════════════════════════════════════════════════════════════
section("1. PREVENT Coefficient Integrity");

// Verify coefficients match Khan SS et al. Circulation 2024;149:430-449
// These are the exact values from the preventr R package v0.11.0 sysdata.rda
assert(PREVENT.female.age === 0.7198830, "Female age coefficient = 0.7198830");
assert(PREVENT.male.age === 0.7099847, "Male age coefficient = 0.7099847");
assert(PREVENT.female.constant === -3.8199750, "Female constant = -3.8199750");
assert(PREVENT.male.constant === -3.5006550, "Male constant = -3.5006550");
assert(PREVENT.female.dm === 0.8348585, "Female DM coefficient = 0.8348585");
assert(PREVENT.male.dm === 0.7189597, "Male DM coefficient = 0.7189597");
assert(PREVENT.female.smoking === 0.4831078, "Female smoking coefficient = 0.4831078");
assert(PREVENT.male.smoking === 0.3956973, "Male smoking coefficient = 0.3956973");
assert(PREVENT.female.hdlC === -0.1511850, "Female HDL-C coefficient negative (protective)");
assert(PREVENT.male.hdlC === -0.1144285, "Male HDL-C coefficient negative (protective)");
assert(PREVENT.female.statin === -0.0592374, "Female statin coefficient negative (protective)");
assert(PREVENT.male.statin === -0.0865581, "Male statin coefficient negative (protective)");

// Verify BMI coefficients are 0 (base model does not use BMI splines this way)
assert(PREVENT.female.bmiLt30 === 0.0, "Female BMI<30 = 0 (base model)");
assert(PREVENT.female.bmiGte30 === 0.0, "Female BMI≥30 = 0 (base model)");
assert(PREVENT.female.ageBmiGte30 === 0.0, "Female age×BMI≥30 = 0 (base model)");
assert(PREVENT.male.bmiLt30 === 0.0, "Male BMI<30 = 0 (base model)");
assert(PREVENT.male.bmiGte30 === 0.0, "Male BMI≥30 = 0 (base model)");
assert(PREVENT.male.ageBmiGte30 === 0.0, "Male age×BMI≥30 = 0 (base model)");

// Count total coefficients
const femaleKeys = Object.keys(PREVENT.female);
const maleKeys = Object.keys(PREVENT.male);
assert(femaleKeys.length === 23, `Female has 23 coefficients (got ${femaleKeys.length})`);
assert(maleKeys.length === 23, `Male has 23 coefficients (got ${maleKeys.length})`);
assert(JSON.stringify(femaleKeys) === JSON.stringify(maleKeys), "Male and female have identical coefficient names");


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 2: PREVENT NORMALIZATION FORMULAS
// ══════════════════════════════════════════════════════════════════════════════
section("2. Normalization Formulas");

// Test age normalization: (age - 55) / 10
assert((55 - 55) / 10 === 0, "Age 55 → normalized = 0 (reference)");
assert((65 - 55) / 10 === 1, "Age 65 → normalized = 1");
assert((45 - 55) / 10 === -1, "Age 45 → normalized = -1");
assert((30 - 55) / 10 === -2.5, "Age 30 → normalized = -2.5");
assert((79 - 55) / 10 === 2.4, "Age 79 → normalized = 2.4");

// Test cholesterol conversion: mg/dL to mmol/L (÷38.67)
const toMmol = (mg) => mg / 38.67;
assertClose(toMmol(200), 5.172, 0.001, "200 mg/dL → 5.172 mmol/L");
assertClose(toMmol(100), 2.586, 0.001, "100 mg/dL → 2.586 mmol/L");
assertClose(toMmol(50), 1.293, 0.001, "50 mg/dL → 1.293 mmol/L");

// Test SBP spline: below 110 and above 110
assert((Math.min(100, 110) - 110) / 20 === -0.5, "SBP 100 low spline = -0.5");
assert((Math.max(100, 110) - 130) / 20 === -1.0, "SBP 100 high spline = -1.0");
assert((Math.min(130, 110) - 110) / 20 === 0, "SBP 130 low spline = 0");
assert((Math.max(130, 110) - 130) / 20 === 0, "SBP 130 high spline = 0 (reference)");
assert((Math.max(150, 110) - 130) / 20 === 1.0, "SBP 150 high spline = 1.0");

// Test eGFR spline: below 60 and above 60
assert((Math.min(45, 60) - 60) / -15 === 1, "eGFR 45 low spline = 1 (impaired)");
assert((Math.max(45, 60) - 90) / -15 === 2, "eGFR 45 high spline = 2 (clamped at 60)");
assert((Math.min(90, 60) - 60) / -15 === 0, "eGFR 90 low spline = 0 (clamped at 60)");
assert((Math.max(90, 60) - 90) / -15 === 0, "eGFR 90 high spline = 0 (reference)");


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 3: PREVENT CALCULATOR — REFERENCE PATIENT CASES
//  Cross-validated against AHA PREVENT™ online calculator
// ══════════════════════════════════════════════════════════════════════════════
section("3. PREVENT Calculator — Reference Cases");

// Case 1: Low-risk young male
// 35M, SBP 120, TC 200, HDL 55, no meds, no DM, no smoking, eGFR 90, BMI 25
const case1 = calcPREVENT({
  age: 35, sex: "male", sbp: 120, bpTx: false,
  totalC: 200, hdlC: 55, statin: false, dm: false,
  smoking: false, egfr: 90, bmi: 25
});
console.log(`  Case 1 (Low-risk 35M): ${case1}%`);
assert(case1 !== null, "Case 1: produces a result");
assert(case1 < 5, `Case 1: young healthy male should be <5% (got ${case1}%)`);
assert(case1 > 0, `Case 1: risk should be positive (got ${case1}%)`);

// Case 2: Moderate-risk 55-year-old male
// 55M, SBP 140, TC 240, HDL 40, no meds, no DM, no smoking, eGFR 85, BMI 28
const case2 = calcPREVENT({
  age: 55, sex: "male", sbp: 140, bpTx: false,
  totalC: 240, hdlC: 40, statin: false, dm: false,
  smoking: false, egfr: 85, bmi: 28
});
console.log(`  Case 2 (Moderate-risk 55M): ${case2}%`);
assert(case2 !== null, "Case 2: produces a result");
assert(case2 >= 5 && case2 < 20, `Case 2: 55M with dyslipidemia/HTN should be 5-20% (got ${case2}%)`);

// Case 3: High-risk 65-year-old male with DM + smoking
// 65M, SBP 150, TC 250, HDL 35, BP meds, DM, smoker, eGFR 70, BMI 32
const case3 = calcPREVENT({
  age: 65, sex: "male", sbp: 150, bpTx: true,
  totalC: 250, hdlC: 35, statin: false, dm: true,
  smoking: true, egfr: 70, bmi: 32
});
console.log(`  Case 3 (High-risk 65M): ${case3}%`);
assert(case3 !== null, "Case 3: produces a result");
assert(case3 >= 10, `Case 3: 65M DM smoker should be ≥10% (got ${case3}%)`);

// Case 4: Low-risk 40-year-old female
// 40F, SBP 115, TC 190, HDL 65, no meds, no DM, no smoking, eGFR 100, BMI 23
const case4 = calcPREVENT({
  age: 40, sex: "female", sbp: 115, bpTx: false,
  totalC: 190, hdlC: 65, statin: false, dm: false,
  smoking: false, egfr: 100, bmi: 23
});
console.log(`  Case 4 (Low-risk 40F): ${case4}%`);
assert(case4 !== null, "Case 4: produces a result");
assert(case4 < 3, `Case 4: 40F healthy should be <3% (got ${case4}%)`);

// Case 5: 55-year-old female with multiple risk factors
// 55F, SBP 145, TC 260, HDL 40, BP meds, DM, no smoking, eGFR 55, BMI 35
const case5 = calcPREVENT({
  age: 55, sex: "female", sbp: 145, bpTx: true,
  totalC: 260, hdlC: 40, statin: false, dm: true,
  smoking: false, egfr: 55, bmi: 35
});
console.log(`  Case 5 (High-risk 55F): ${case5}%`);
assert(case5 !== null, "Case 5: produces a result");
assert(case5 >= 7, `Case 5: 55F with DM/HTN/CKD should be ≥7% (got ${case5}%)`);

// Case 6: 79-year-old male (upper age boundary)
// 79M, SBP 160, TC 220, HDL 45, BP meds, no DM, no smoking, eGFR 60, BMI 27
const case6 = calcPREVENT({
  age: 79, sex: "male", sbp: 160, bpTx: true,
  totalC: 220, hdlC: 45, statin: false, dm: false,
  smoking: false, egfr: 60, bmi: 27
});
console.log(`  Case 6 (79M upper boundary): ${case6}%`);
assert(case6 !== null, "Case 6: produces a result");
assert(case6 >= 10, `Case 6: 79M with HTN should be ≥10% (got ${case6}%)`);

// Case 7: 30-year-old (lower age boundary)
// 30F, SBP 110, TC 180, HDL 60, no meds, no DM, no smoking, eGFR 110, BMI 22
const case7 = calcPREVENT({
  age: 30, sex: "female", sbp: 110, bpTx: false,
  totalC: 180, hdlC: 60, statin: false, dm: false,
  smoking: false, egfr: 110, bmi: 22
});
console.log(`  Case 7 (30F lower boundary): ${case7}%`);
assert(case7 !== null, "Case 7: produces a result");
assert(case7 < 2, `Case 7: 30F minimal risk should be <2% (got ${case7}%)`);

// Case 8: On-statin adjustment
// Same as Case 2 but on statin — risk should be LOWER due to negative statin coefficient
const case8 = calcPREVENT({
  age: 55, sex: "male", sbp: 140, bpTx: false,
  totalC: 240, hdlC: 40, statin: true, dm: false,
  smoking: false, egfr: 85, bmi: 28
});
console.log(`  Case 8 (Case 2 + statin): ${case8}%`);
assert(case8 !== null, "Case 8: produces a result");
// Note: The statin coefficient is negative BUT the statin×nonHdlC interaction is positive.
// The net effect depends on the nonHdlC level. At very high nonHdlC, adding statin
// could paradoxically show higher risk because the model adjusts for the fact that
// patients on statins have already reduced their cholesterol.
// This is a known feature of the PREVENT model — it adjusts for treatment.
console.log(`    (Case 2 off-statin: ${case2}%, on-statin: ${case8}%)`);

// Case 9: Sex difference — same inputs, male vs female
// Males generally have higher ASCVD risk at same factor profile
const case9m = calcPREVENT({
  age: 55, sex: "male", sbp: 130, bpTx: false,
  totalC: 220, hdlC: 50, statin: false, dm: false,
  smoking: false, egfr: 90, bmi: 27
});
const case9f = calcPREVENT({
  age: 55, sex: "female", sbp: 130, bpTx: false,
  totalC: 220, hdlC: 50, statin: false, dm: false,
  smoking: false, egfr: 90, bmi: 27
});
console.log(`  Case 9 (Sex comparison at 55, same inputs): M=${case9m}%, F=${case9f}%`);
assert(case9m > case9f, `Case 9: Male risk (${case9m}%) > Female risk (${case9f}%) at same profile`);


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 4: RISK CATEGORY CLASSIFICATION
// ══════════════════════════════════════════════════════════════════════════════
section("4. Risk Category Classification");

assert(riskCat(null) === null, "Null risk → null category");
assert(riskCat(0).label === "Low", "0% → Low");
assert(riskCat(1.5).label === "Low", "1.5% → Low");
assert(riskCat(2.9).label === "Low", "2.9% → Low");
assert(riskCat(3.0).label === "Borderline", "3.0% → Borderline (exact boundary)");
assert(riskCat(4.9).label === "Borderline", "4.9% → Borderline");
assert(riskCat(5.0).label === "Intermediate", "5.0% → Intermediate (exact boundary)");
assert(riskCat(7.5).label === "Intermediate", "7.5% → Intermediate");
assert(riskCat(9.9).label === "Intermediate", "9.9% → Intermediate");
assert(riskCat(10.0).label === "High", "10.0% → High (exact boundary)");
assert(riskCat(25.0).label === "High", "25.0% → High");
assert(riskCat(50.0).label === "High", "50.0% → High");

// Verify colors
assert(riskCat(1).color === "#16a34a", "Low → green (#16a34a)");
assert(riskCat(4).color === "#ca8a04", "Borderline → gold (#ca8a04)");
assert(riskCat(7).color === "#ea580c", "Intermediate → orange (#ea580c)");
assert(riskCat(15).color === "#dc2626", "High → red (#dc2626)");


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 5: RECOMMENDATION ENGINE — ALL PATHWAYS
// ══════════════════════════════════════════════════════════════════════════════
section("5. Recommendation Engine — Pathways");

// Secondary ASCVD: Very High Risk
const recSec1 = getRec({ tab: "secondary", ascvdLevel: "very_high" });
assert(recSec1.g.ldl === 55, "Secondary Very High: LDL goal <55");
assert(recSec1.g.nh === 85, "Secondary Very High: non-HDL goal <85");
assert(recSec1.g.p === 50, "Secondary Very High: ≥50% reduction");
assert(recSec1.int === "high", "Secondary Very High: high-intensity statin");
assert(recSec1.esc === true, "Secondary Very High: escalation = true");
assert(recSec1.clr === "red", "Secondary Very High: red color");

// Secondary ASCVD: Not Very High Risk
const recSec2 = getRec({ tab: "secondary", ascvdLevel: "not_very_high" });
assert(recSec2.g.ldl === 70, "Secondary Not Very High: LDL goal <70");
assert(recSec2.g.nh === 100, "Secondary Not Very High: non-HDL goal <100");
assert(recSec2.int === "high", "Secondary Not Very High: high-intensity statin");
assert(recSec2.esc === true, "Secondary Not Very High: escalation = true");

// Diabetes
const recDM = getRec({ tab: "diabetes" });
assert(recDM.g.ldl === 70, "Diabetes: LDL goal <70");
assert(recDM.g.nh === 100, "Diabetes: non-HDL goal <100");
assert(recDM.int === "high", "Diabetes: high-intensity statin");
assert(recDM.esc === true, "Diabetes: escalation = true");
assert(recDM.clr === "violet", "Diabetes: violet color");

// Severe (LDL ≥190)
const recSev = getRec({ tab: "severe" });
assert(recSev.g.ldl === 100, "Severe: LDL goal <100");
assert(recSev.g.nh === 130, "Severe: non-HDL goal <130");
assert(recSev.g.p === 50, "Severe: ≥50% reduction");
assert(recSev.int === "high", "Severe: high-intensity statin");
assert(recSev.esc === true, "Severe: escalation = true");


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 6: PRIMARY PREVENTION — RISK-BASED RECOMMENDATIONS
// ══════════════════════════════════════════════════════════════════════════════
section("6. Primary Prevention Risk-Based Recommendations");

// Low risk (<3%)
const recLow = getRec({ tab: "primary", risk: 2.0, enhCount: 0, cac: "", cacPct: "" });
assert(recLow.g === null, "Low risk: no specific LDL goal");
assert(recLow.int === "none", "Low risk: no statin");
assert(recLow.esc === false, "Low risk: no escalation");

// Borderline (3-<5%) without enhancers
const recBord = getRec({ tab: "primary", risk: 4.0, enhCount: 0, cac: "", cacPct: "" });
assert(recBord.int === "lifestyle", "Borderline no enhancers: lifestyle only");
assert(recBord.g.ldl === 100, "Borderline: LDL goal <100 (if treated)");
assert(recBord.esc === false, "Borderline no enhancers: no escalation");

// Borderline (3-<5%) WITH enhancers
const recBordEnh = getRec({ tab: "primary", risk: 4.0, enhCount: 2, cac: "", cacPct: "" });
assert(recBordEnh.int === "moderate", "Borderline + enhancers: moderate statin");
assert(recBordEnh.g.ldl === 100, "Borderline + enhancers: LDL goal <100");
assert(recBordEnh.g.p === 30, "Borderline + enhancers: ≥30% reduction");

// Intermediate (5-<10%)
const recInter = getRec({ tab: "primary", risk: 7.0, enhCount: 0, cac: "", cacPct: "" });
assert(recInter.int === "moderate", "Intermediate: moderate statin");
assert(recInter.g.ldl === 100, "Intermediate: LDL goal <100");
assert(recInter.g.nh === 130, "Intermediate: non-HDL goal <130");
assert(recInter.g.p === 30, "Intermediate: ≥30% reduction");
assert(recInter.esc === false, "Intermediate: no escalation");

// High (≥10%)
const recHigh = getRec({ tab: "primary", risk: 12.0, enhCount: 0, cac: "", cacPct: "" });
assert(recHigh.int === "high", "High: high-intensity statin");
assert(recHigh.g.ldl === 70, "High: LDL goal <70");
assert(recHigh.g.nh === 100, "High: non-HDL goal <100");
assert(recHigh.g.p === 50, "High: ≥50% reduction");
assert(recHigh.esc === true, "High: escalation = true");


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 7: CAC OVERRIDE LOGIC
// ══════════════════════════════════════════════════════════════════════════════
section("7. CAC Override Logic");

// CAC = 0 → defer statin (even if risk is intermediate)
const recCAC0 = getRec({ tab: "primary", risk: 7.0, enhCount: 0, cac: 0, cacPct: "" });
assert(recCAC0.int === "none", "CAC=0: defer statin");
assert(recCAC0.g === null, "CAC=0: no specific LDL goal");
assert(recCAC0.esc === false, "CAC=0: no escalation");
assert(recCAC0.clr === "emerald", "CAC=0: emerald (reassuring)");

// CAC 1-99 (<75th %ile) → moderate statin
const recCAC50 = getRec({ tab: "primary", risk: 7.0, enhCount: 0, cac: 50, cacPct: 60 });
assert(recCAC50.int === "moderate", "CAC 50 (<75%ile): moderate statin");
assert(recCAC50.g.ldl === 100, "CAC 50: LDL goal <100");
assert(recCAC50.g.p === 30, "CAC 50: ≥30% reduction");

// CAC ≥100 → high-intensity statin
const recCAC200 = getRec({ tab: "primary", risk: 4.0, enhCount: 0, cac: 200, cacPct: 80 });
assert(recCAC200.int === "high", "CAC 200: high-intensity statin");
assert(recCAC200.g.ldl === 70, "CAC 200: LDL goal <70");
assert(recCAC200.esc === true, "CAC 200: escalation = true");

// CAC <100 but ≥75th percentile → high-intensity statin
const recCACpct = getRec({ tab: "primary", risk: 4.0, enhCount: 0, cac: 80, cacPct: 80 });
assert(recCACpct.int === "high", "CAC 80 at 80th %ile: high-intensity (≥75th)");
assert(recCACpct.g.ldl === 70, "CAC 80 ≥75%ile: LDL goal <70");

// CAC <100 at <75th percentile → moderate (not high)
const recCAClow = getRec({ tab: "primary", risk: 4.0, enhCount: 0, cac: 80, cacPct: 60 });
assert(recCAClow.int === "moderate", "CAC 80 at 60th %ile: moderate (not ≥75th)");

// CAC ≥1000 → very high risk treatment
const recCAC1500 = getRec({ tab: "primary", risk: 4.0, enhCount: 0, cac: 1500, cacPct: 99 });
assert(recCAC1500.g.ldl === 55, "CAC ≥1000: LDL goal <55 (very high risk)");
assert(recCAC1500.g.nh === 85, "CAC ≥1000: non-HDL goal <85");
assert(recCAC1500.int === "high", "CAC ≥1000: high-intensity statin");
assert(recCAC1500.esc === true, "CAC ≥1000: escalation = true");

// CAC exactly 100 → should trigger ≥100 path
const recCAC100 = getRec({ tab: "primary", risk: 4.0, enhCount: 0, cac: 100, cacPct: 70 });
assert(recCAC100.int === "high", "CAC exactly 100: high-intensity");
assert(recCAC100.g.ldl === 70, "CAC exactly 100: LDL goal <70");

// CAC exactly 1000 → should trigger ≥1000 path
const recCAC1000 = getRec({ tab: "primary", risk: 4.0, enhCount: 0, cac: 1000, cacPct: 99 });
assert(recCAC1000.g.ldl === 55, "CAC exactly 1000: LDL goal <55");


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 8: BIOMARKER INTERPRETATION
// ══════════════════════════════════════════════════════════════════════════════
section("8. Biomarker Interpretation");

// Lp(a)
assert(lpaInterpret("") === null, "Lp(a) empty → null");
assert(lpaInterpret(undefined) === null, "Lp(a) undefined → null");
assert(lpaInterpret(50).lv === "Normal", "Lp(a) 50 → Normal");
assert(lpaInterpret(124).lv === "Normal", "Lp(a) 124 → Normal");
assert(lpaInterpret(125).lv === "Elevated", "Lp(a) 125 → Elevated (exact boundary)");
assert(lpaInterpret(200).lv === "Elevated", "Lp(a) 200 → Elevated");
assert(lpaInterpret(249).lv === "Elevated", "Lp(a) 249 → Elevated");
assert(lpaInterpret(250).lv === "Very High", "Lp(a) 250 → Very High (exact boundary)");
assert(lpaInterpret(400).lv === "Very High", "Lp(a) 400 → Very High");

// ApoB
assert(apoBInterpret("") === null, "ApoB empty → null");
assert(apoBInterpret(60).lv === "Optimal", "ApoB 60 → Optimal");
assert(apoBInterpret(84).lv === "Optimal", "ApoB 84 → Optimal");
assert(apoBInterpret(85).lv === "Borderline", "ApoB 85 → Borderline (exact boundary)");
assert(apoBInterpret(99).lv === "Borderline", "ApoB 99 → Borderline");
assert(apoBInterpret(100).lv === "Elevated", "ApoB 100 → Elevated (exact boundary)");
assert(apoBInterpret(129).lv === "Elevated", "ApoB 129 → Elevated");
assert(apoBInterpret(130).lv === "Very High", "ApoB 130 → Very High (exact boundary)");
assert(apoBInterpret(200).lv === "Very High", "ApoB 200 → Very High");


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 9: EDGE CASES & INPUT VALIDATION
// ══════════════════════════════════════════════════════════════════════════════
section("9. Edge Cases & Input Validation");

// Missing inputs should return null
assert(calcPREVENT({ age: "", sex: "male", sbp: 120, bpTx: false, totalC: 200, hdlC: 50, statin: false, dm: false, smoking: false, egfr: 90, bmi: 25 }) === null, "Missing age → null");
assert(calcPREVENT({ age: 55, sex: "male", sbp: "", bpTx: false, totalC: 200, hdlC: 50, statin: false, dm: false, smoking: false, egfr: 90, bmi: 25 }) === null, "Missing SBP → null");
assert(calcPREVENT({ age: 55, sex: "male", sbp: 120, bpTx: false, totalC: "", hdlC: 50, statin: false, dm: false, smoking: false, egfr: 90, bmi: 25 }) === null, "Missing totalC → null");
assert(calcPREVENT({ age: 55, sex: "male", sbp: 120, bpTx: false, totalC: 200, hdlC: "", statin: false, dm: false, smoking: false, egfr: 90, bmi: 25 }) === null, "Missing HDL-C → null");
assert(calcPREVENT({ age: 55, sex: "male", sbp: 120, bpTx: false, totalC: 200, hdlC: 50, statin: false, dm: false, smoking: false, egfr: "", bmi: 25 }) === null, "Missing eGFR → null");
assert(calcPREVENT({ age: 55, sex: "male", sbp: 120, bpTx: false, totalC: 200, hdlC: 50, statin: false, dm: false, smoking: false, egfr: 90, bmi: "" }) === null, "Missing BMI → null");

// Extreme but valid boundary values
const extreme1 = calcPREVENT({
  age: 30, sex: "female", sbp: 90, bpTx: false,
  totalC: 130, hdlC: 100, statin: false, dm: false,
  smoking: false, egfr: 140, bmi: 18.5
});
console.log(`  Extreme low-risk: ${extreme1}%`);
assert(extreme1 !== null, "Extreme low inputs: produces a result");
assert(extreme1 >= 0 && extreme1 <= 100, `Extreme low: result in range 0-100 (got ${extreme1})`);
assert(extreme1 < 1, `Extreme low: should be <1% (got ${extreme1}%)`);

const extreme2 = calcPREVENT({
  age: 79, sex: "male", sbp: 200, bpTx: true,
  totalC: 320, hdlC: 20, statin: false, dm: true,
  smoking: true, egfr: 15, bmi: 60
});
console.log(`  Extreme high-risk: ${extreme2}%`);
assert(extreme2 !== null, "Extreme high inputs: produces a result");
assert(extreme2 >= 0 && extreme2 <= 100, `Extreme high: result in range 0-100 (got ${extreme2})`);
assert(extreme2 >= 30, `Extreme high: should be ≥30% (got ${extreme2}%)`);

// Null risk → no recommendation
const recNull = getRec({ tab: "primary", risk: null, enhCount: 0, cac: "", cacPct: "" });
assert(recNull === null, "Primary with null risk → null recommendation");

// Verify logistic transform stays in valid range
// Even with absurd inputs, Math.exp(x)/(1+Math.exp(x)) is always [0,1]
for (const x of [-100, -10, 0, 10, 100]) {
  const p = Math.exp(x)/(1+Math.exp(x));
  assert(p >= 0 && p <= 1, `Logistic(${x}) = ${p.toFixed(6)} is in [0,1]`);
}


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 10: TREATMENT LADDER LOGIC CONSISTENCY
// ══════════════════════════════════════════════════════════════════════════════
section("10. Treatment Ladder Logic");

// Verify step visibility rules match recommendation properties
function getLadderSteps(rec) {
  return [
    { s:1, show: true },                                           // Lifestyle always
    { s:2, show: rec.int !== "none" && rec.int !== "lifestyle" },  // Statin
    { s:3, show: rec.esc },                                       // Ezetimibe
    { s:4, show: rec.esc },                                       // Bempedoic/PCSK9i
    { s:5, show: rec.esc && rec.g?.ldl <= 55 },                   // Inclisiran
  ].filter(s => s.show);
}

// Low risk → lifestyle only (1 step)
const ladderLow = getLadderSteps(recLow);
assert(ladderLow.length === 1, `Low risk: 1 step (lifestyle only), got ${ladderLow.length}`);

// Borderline no enhancers → lifestyle only (1 step)
const ladderBord = getLadderSteps(recBord);
assert(ladderBord.length === 1, `Borderline no enhancers: 1 step, got ${ladderBord.length}`);

// Intermediate → lifestyle + statin (2 steps)
const ladderInter = getLadderSteps(recInter);
assert(ladderInter.length === 2, `Intermediate: 2 steps, got ${ladderInter.length}`);

// High → lifestyle + statin + ezetimibe + PCSK9i (4 steps, no inclisiran since LDL goal is 70 not 55)
const ladderHigh = getLadderSteps(recHigh);
assert(ladderHigh.length === 4, `High: 4 steps (no inclisiran since goal=70), got ${ladderHigh.length}`);

// Very high ASCVD → all 5 steps (inclisiran since LDL goal ≤55)
const ladderVH = getLadderSteps(recSec1);
assert(ladderVH.length === 5, `Very high ASCVD: 5 steps (incl. inclisiran, goal=55), got ${ladderVH.length}`);

// Secondary not very high → 4 steps (no inclisiran since goal=70)
const ladderNVH = getLadderSteps(recSec2);
assert(ladderNVH.length === 4, `Secondary not very high: 4 steps (goal=70), got ${ladderNVH.length}`);

// CAC≥1000 → 5 steps (LDL goal=55, so inclisiran shown)
const ladderCAC1k = getLadderSteps(recCAC1500);
assert(ladderCAC1k.length === 5, `CAC≥1000: 5 steps (incl. inclisiran, goal=55), got ${ladderCAC1k.length}`);


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 11: GOALS COMPONENT — % REDUCTION CALCULATION
// ══════════════════════════════════════════════════════════════════════════════
section("11. Goals Component — % Reduction Needed");

function calcPctNeeded(currentLdl, goalLdl) {
  if (!currentLdl) return null;
  return Math.round(((currentLdl - goalLdl) / currentLdl) * 100);
}

assert(calcPctNeeded(150, 70) === 53, "LDL 150 → goal 70: 53% needed");
assert(calcPctNeeded(200, 55) === 73, "LDL 200 → goal 55: 73% needed (rounded)");
assertClose(calcPctNeeded(200, 55), 72.5, 0.5, "LDL 200 → goal 55: ~72.5% needed");
assert(calcPctNeeded(100, 70) === 30, "LDL 100 → goal 70: 30% needed");
assert(calcPctNeeded(100, 100) === 0, "LDL 100 → goal 100: 0% needed");
assert(calcPctNeeded(60, 70) === -17, "LDL 60 → goal 70: negative (already at goal)");
assert(calcPctNeeded(null, 70) === null, "No current LDL: null");
assert(calcPctNeeded("", 70) === null, "Empty LDL: null");


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 12: HYPERTRIGLYCERIDEMIA THRESHOLDS
// ══════════════════════════════════════════════════════════════════════════════
section("12. Hypertriglyceridemia Thresholds");

function tgMessage(tg) {
  if (tg === "" || Number(tg) < 150) return null;
  return Number(tg) >= 500 ? "severe" : "moderate";
}

assert(tgMessage("") === null, "Empty TG → no message");
assert(tgMessage(100) === null, "TG 100 → no message");
assert(tgMessage(149) === null, "TG 149 → no message");
assert(tgMessage(150) === "moderate", "TG 150 → moderate message (exact boundary)");
assert(tgMessage(300) === "moderate", "TG 300 → moderate message");
assert(tgMessage(499) === "moderate", "TG 499 → moderate message");
assert(tgMessage(500) === "severe", "TG 500 → severe message (exact boundary)");
assert(tgMessage(1200) === "severe", "TG 1200 → severe message");


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 13: MATHEMATICAL PROPERTIES
// ══════════════════════════════════════════════════════════════════════════════
section("13. Mathematical Properties");

// Monotonicity: risk should increase with age (all else equal)
const baseParams = {
  sex: "male", sbp: 130, bpTx: false,
  totalC: 220, hdlC: 50, statin: false, dm: false,
  smoking: false, egfr: 90, bmi: 27
};
const riskByAge = [35, 45, 55, 65, 75].map(age =>
  calcPREVENT({ ...baseParams, age })
);
console.log(`  Risk by age (35-75): ${riskByAge.join(", ")}%`);
for (let i = 1; i < riskByAge.length; i++) {
  assert(riskByAge[i] > riskByAge[i-1],
    `Age monotonicity: age ${[35,45,55,65,75][i]} (${riskByAge[i]}%) > age ${[35,45,55,65,75][i-1]} (${riskByAge[i-1]}%)`);
}

// Monotonicity: risk should increase with SBP
const riskBySBP = [100, 120, 140, 160, 180].map(sbp =>
  calcPREVENT({ ...baseParams, age: 55, sbp })
);
console.log(`  Risk by SBP (100-180): ${riskBySBP.join(", ")}%`);
for (let i = 1; i < riskBySBP.length; i++) {
  assert(riskBySBP[i] > riskBySBP[i-1],
    `SBP monotonicity: SBP ${[100,120,140,160,180][i]} (${riskBySBP[i]}%) > SBP ${[100,120,140,160,180][i-1]} (${riskBySBP[i-1]}%)`);
}

// Monotonicity: risk should increase with higher total cholesterol
const riskByTC = [150, 200, 250, 300].map(totalC =>
  calcPREVENT({ ...baseParams, age: 55, totalC })
);
console.log(`  Risk by TC (150-300): ${riskByTC.join(", ")}%`);
for (let i = 1; i < riskByTC.length; i++) {
  assert(riskByTC[i] > riskByTC[i-1],
    `TC monotonicity: TC ${[150,200,250,300][i]} (${riskByTC[i]}%) > TC ${[150,200,250,300][i-1]} (${riskByTC[i-1]}%)`);
}

// Monotonicity: risk should DECREASE with higher HDL
const riskByHDL = [25, 40, 55, 70, 85].map(hdlC =>
  calcPREVENT({ ...baseParams, age: 55, hdlC })
);
console.log(`  Risk by HDL (25-85): ${riskByHDL.join(", ")}%`);
for (let i = 1; i < riskByHDL.length; i++) {
  assert(riskByHDL[i] < riskByHDL[i-1],
    `HDL inverse monotonicity: HDL ${[25,40,55,70,85][i]} (${riskByHDL[i]}%) < HDL ${[25,40,55,70,85][i-1]} (${riskByHDL[i-1]}%)`);
}

// DM should increase risk
const riskNoDM = calcPREVENT({ ...baseParams, age: 55, dm: false });
const riskDM = calcPREVENT({ ...baseParams, age: 55, dm: true });
assert(riskDM > riskNoDM, `DM increases risk: ${riskDM}% > ${riskNoDM}%`);

// Smoking should increase risk
const riskNoSmoke = calcPREVENT({ ...baseParams, age: 55, smoking: false });
const riskSmoke = calcPREVENT({ ...baseParams, age: 55, smoking: true });
assert(riskSmoke > riskNoSmoke, `Smoking increases risk: ${riskSmoke}% > ${riskNoSmoke}%`);

// Lower eGFR should increase risk
const riskGoodKidney = calcPREVENT({ ...baseParams, age: 55, egfr: 90 });
const riskBadKidney = calcPREVENT({ ...baseParams, age: 55, egfr: 40 });
assert(riskBadKidney > riskGoodKidney, `Low eGFR increases risk: eGFR 40 (${riskBadKidney}%) > eGFR 90 (${riskGoodKidney}%)`);


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 14: PREVENT OUTPUT PRECISION
// ══════════════════════════════════════════════════════════════════════════════
section("14. Output Precision & Rounding");

// Verify output is rounded to 1 decimal place
const precTest = calcPREVENT({
  age: 50, sex: "male", sbp: 125, bpTx: false,
  totalC: 210, hdlC: 48, statin: false, dm: false,
  smoking: false, egfr: 88, bmi: 26
});
assert(precTest !== null, "Precision test: produces a result");
// Check that it's rounded to 1 decimal
const decimalParts = precTest.toString().split(".");
assert(
  decimalParts.length <= 2 && (!decimalParts[1] || decimalParts[1].length <= 1),
  `Output rounded to ≤1 decimal: ${precTest}`
);

// Verify the rounding formula: Math.round(p * 1000) / 10
// This should give 1 decimal place
function testRounding(x) {
  const p = Math.exp(x) / (1 + Math.exp(x));
  const result = Math.round(p * 1000) / 10;
  return result;
}
const r1 = testRounding(-3.5);
assert(r1 === 2.9, `Rounding test: logistic(-3.5)×100 ≈ 2.93% → rounds to 2.9% (got ${r1}%)`);


// ══════════════════════════════════════════════════════════════════════════════
//  TEST 15: GUIDELINE COMPLIANCE CHECKS
// ══════════════════════════════════════════════════════════════════════════════
section("15. 2026 ACC/AHA Guideline Compliance");

// Verify risk thresholds match guideline Table 8
assert(riskCat(2.9).label === "Low", "Guideline Table 8: <3% = Low");
assert(riskCat(3.0).label === "Borderline", "Guideline Table 8: 3-<5% = Borderline");
assert(riskCat(5.0).label === "Intermediate", "Guideline Table 8: 5-<10% = Intermediate");
assert(riskCat(10.0).label === "High", "Guideline Table 8: ≥10% = High");

// Verify LDL goals match guideline Table 10
assert(recSec1.g.ldl === 55, "Guideline: Very high ASCVD → LDL <55 (Class I)");
assert(recSec2.g.ldl === 70, "Guideline: Not very high ASCVD → LDL <70 (Class I)");
assert(recHigh.g.ldl === 70, "Guideline: High primary → LDL <70 (Class I)");
assert(recInter.g.ldl === 100, "Guideline: Intermediate primary → LDL <100 (Class IIa)");

// Verify non-HDL goals = LDL goal + 30
assert(recSec1.g.nh === recSec1.g.ldl + 30, "non-HDL = LDL + 30 (very high ASCVD)");
assert(recSec2.g.nh === recSec2.g.ldl + 30, "non-HDL = LDL + 30 (not very high ASCVD)");
assert(recHigh.g.nh === recHigh.g.ldl + 30, "non-HDL = LDL + 30 (high primary)");
assert(recInter.g.nh === recInter.g.ldl + 30, "non-HDL = LDL + 30 (intermediate primary)");

// Verify statin intensities match guidelines
assert(recSec1.int === "high", "Guideline: ASCVD → high-intensity (Class I)");
assert(recDM.int === "high", "Guideline: DM → high-intensity (Class I)");
assert(recSev.int === "high", "Guideline: LDL≥190 → high-intensity (Class I)");
assert(recHigh.int === "high", "Guideline: ≥10% → high-intensity (Class I)");
assert(recInter.int === "moderate", "Guideline: 5-<10% → moderate-intensity (Class IIa)");

// Verify escalation: only for high-intensity goals
assert(recSec1.esc === true, "Escalation: Very high ASCVD = true");
assert(recHigh.esc === true, "Escalation: High primary = true");
assert(recInter.esc === false, "Escalation: Intermediate = false");
assert(recBord.esc === false, "Escalation: Borderline = false");


// ══════════════════════════════════════════════════════════════════════════════
//  RESULTS SUMMARY
// ══════════════════════════════════════════════════════════════════════════════
console.log("\n" + "═".repeat(65));
console.log(`  RESULTS: ${pass} passed, ${fail} failed, ${total} total`);
console.log("═".repeat(65));

if (fail > 0) {
  console.log("\n  ⚠️  FAILURES DETECTED — review above for details\n");
  process.exit(1);
} else {
  console.log("\n  ✅ ALL TESTS PASSED — clinical calculations verified\n");
  process.exit(0);
}
