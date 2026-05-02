#!/usr/bin/env node
// test-prevent-30yr.mjs — tests for PREVENT 30-year and insight helpers

import {
  calcPREVENT30, riskCat30, discordance, optimizedInputs,
  DISCORDANCE_RISK10_MAX, DISCORDANCE_RISK30_MIN,
} from "./src/prevent.js";

let pass = 0, fail = 0;

function eq(actual, expected, name) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`); }
}

function close(actual, expected, tolerance, name) {
  if (actual === null || expected === null) return eq(actual, expected, name);
  const diff = Math.abs(actual - expected);
  if (diff <= tolerance) { pass++; console.log(`  ✅ ${name} (got ${actual}, expected ${expected}, Δ=${diff.toFixed(2)})`); }
  else { fail++; console.log(`  ❌ ${name} — got ${actual}, expected ${expected}, Δ=${diff.toFixed(2)} > ${tolerance}`); }
}

console.log("\n═══ calcPREVENT30 ═══");

// Reference cases. Two are from preventr v0.11.0 official test snapshots
// (test-prevent_equations.R, "Base model 30-year risks give expected results").
// Others computed by hand from the published coefficients (see plan Task 2.2).
// Each reference case has age in [30, 59].
const REF_30YR = [
  {
    name: "preventr 50F (sbp160, BPtx, TC200, HDL45, DM, eGFR90, BMI35)",
    inputs: { age: 50, sex: "female", sbp: 160, bpTx: true, totalC: 200, hdlC: 45, statin: false, dm: true, smoking: false, egfr: 90, bmi: 35 },
    expected: 35.4,
    tolerance: 0.1,
  },
  {
    name: "preventr 50M (sbp160, BPtx, TC200, HDL45, DM, eGFR90, BMI35)",
    inputs: { age: 50, sex: "male", sbp: 160, bpTx: true, totalC: 200, hdlC: 45, statin: false, dm: true, smoking: false, egfr: 90, bmi: 35 },
    expected: 34.9,
    tolerance: 0.1,
  },
  {
    name: "35F low-risk baseline",
    inputs: { age: 35, sex: "female", sbp: 115, bpTx: false, totalC: 180, hdlC: 55, statin: false, dm: false, smoking: false, egfr: 95, bmi: 23 },
    expected: 2.1,
    tolerance: 0.5,
  },
  {
    name: "45M average",
    inputs: { age: 45, sex: "male", sbp: 130, bpTx: false, totalC: 200, hdlC: 45, statin: false, dm: false, smoking: false, egfr: 90, bmi: 26 },
    expected: 11.3,
    tolerance: 0.5,
  },
  {
    name: "55F high-burden",
    inputs: { age: 55, sex: "female", sbp: 145, bpTx: true, totalC: 220, hdlC: 40, statin: false, dm: true, smoking: true, egfr: 75, bmi: 32 },
    expected: 41.7,
    tolerance: 0.5,
  },
  {
    name: "30M lower boundary",
    inputs: { age: 30, sex: "male", sbp: 120, bpTx: false, totalC: 180, hdlC: 50, statin: false, dm: false, smoking: false, egfr: 90, bmi: 24 },
    expected: 2.6,
    tolerance: 0.5,
  },
  {
    name: "59F upper boundary",
    inputs: { age: 59, sex: "female", sbp: 125, bpTx: false, totalC: 190, hdlC: 55, statin: false, dm: false, smoking: false, egfr: 90, bmi: 24 },
    expected: 12.7,
    tolerance: 0.5,
  },
];

for (const t of REF_30YR) close(calcPREVENT30(t.inputs), t.expected, t.tolerance, t.name);

console.log("\n═══ Boundary cases ═══");
const validInputs = { age: 45, sex: "male", sbp: 130, bpTx: false, totalC: 200, hdlC: 45, statin: false, dm: false, smoking: false, egfr: 90, bmi: 25 };
eq(calcPREVENT30({ ...validInputs, age: 30 }) !== null, true, "age 30 returns non-null");
eq(calcPREVENT30({ ...validInputs, age: 59 }) !== null, true, "age 59 returns non-null");
eq(calcPREVENT30({ ...validInputs, age: 60 }), null, "age 60 returns null (out of validated range)");
eq(calcPREVENT30({ ...validInputs, age: 79 }), null, "age 79 returns null");
eq(calcPREVENT30({ ...validInputs, age: 29 }), null, "age 29 returns null");
eq(calcPREVENT30({ ...validInputs, age: "" }), null, "missing age returns null");
eq(calcPREVENT30({ ...validInputs, sbp: "" }), null, "missing sbp returns null");
eq(calcPREVENT30({ ...validInputs, totalC: "" }), null, "missing totalC returns null");
eq(calcPREVENT30({ ...validInputs, hdlC: "" }), null, "missing hdlC returns null");
eq(calcPREVENT30({ ...validInputs, egfr: "" }), null, "missing egfr returns null");
eq(calcPREVENT30({ ...validInputs, bmi: "" }), null, "missing bmi returns null");

console.log("\n═══ riskCat30 ═══");
eq(riskCat30(null), null, "null input returns null");
eq(riskCat30(5).label,  "Low",          "5%  → Low");
eq(riskCat30(9.9).label, "Low",         "9.9% → Low");
eq(riskCat30(10).label, "Borderline",   "10% → Borderline");
eq(riskCat30(19.9).label, "Borderline", "19.9% → Borderline");
eq(riskCat30(20).label, "Intermediate", "20% → Intermediate");
eq(riskCat30(29.9).label, "Intermediate", "29.9% → Intermediate");
eq(riskCat30(30).label, "High",         "30% → High");
eq(riskCat30(50).label, "High",         "50% → High");

console.log("\n═══ discordance ═══");
eq(DISCORDANCE_RISK10_MAX, 5,  "DISCORDANCE_RISK10_MAX = 5");
eq(DISCORDANCE_RISK30_MIN, 20, "DISCORDANCE_RISK30_MIN = 20");
eq(discordance(2,  25, 35), true,  "low 10y, high 30y, age 35 → true");
eq(discordance(4.9, 20, 40), true,  "boundary: just below 5/at 20 → true");
eq(discordance(5,  25, 35), false, "10y at threshold not below → false");
eq(discordance(2,  19, 35), false, "30y below threshold → false");
eq(discordance(2,  25, 60), false, "age 60 → false (out of range)");
eq(discordance(2,  25, 29), false, "age 29 → false (out of range)");
eq(discordance(null, 25, 35), false, "null 10y → false");
eq(discordance(2, null, 35),  false, "null 30y → false");

console.log("\n═══ optimizedInputs ═══");
const patient = {
  age: 40, sex: "male", sbp: 145, bpTx: true, totalC: 240, hdlC: 38,
  statin: true, dm: false, smoking: true, egfr: 88, bmi: 30,
};
const opt = optimizedInputs(patient);
eq(opt.age, 40, "age preserved");
eq(opt.sex, "male", "sex preserved");
eq(opt.dm, false, "dm preserved");
eq(opt.egfr, 88, "egfr preserved");
eq(opt.sbp, 110, "high sbp pulled down to 110");
eq(opt.bpTx, false, "bpTx forced false");
eq(opt.smoking, false, "smoking forced false");
eq(opt.bmi, 24, "high bmi pulled down to 24");
eq(opt.statin, false, "statin forced false");
eq(opt.hdlC, 50, "low HDL raised to 50");
// non-HDL = totalC - hdlC = 240 - 38 = 202 (high) → cap at 120
// optimal totalC = 120 + 50 = 170
eq(opt.totalC, 170, "high non-HDL produces totalC = 170");

// already-good patient
const goodPatient = {
  age: 40, sex: "male", sbp: 105, bpTx: false, totalC: 165, hdlC: 70,
  statin: false, dm: false, smoking: false, egfr: 95, bmi: 22,
};
const optGood = optimizedInputs(goodPatient);
eq(optGood.sbp, 105, "low sbp preserved (not pulled up to 110)");
eq(optGood.bmi, 22, "low bmi preserved (not pulled up to 24)");
eq(optGood.hdlC, 70, "good HDL preserved (not pulled down to 50)");
// non-HDL = 165 - 70 = 95 (already < 120) → preserved at 95
// totalC = 95 + 70 = 165
eq(optGood.totalC, 165, "already-good non-HDL preserved");

console.log("\n═══ optimized-risk sanity ═══");
const sanityPatient = {
  age: 45, sex: "male", sbp: 145, bpTx: true, totalC: 230, hdlC: 38,
  statin: false, dm: false, smoking: true, egfr: 85, bmi: 31,
};
const currentRisk = calcPREVENT30(sanityPatient);
const optimizedRisk = calcPREVENT30(optimizedInputs(sanityPatient));
eq(optimizedRisk <= currentRisk, true,
   `optimized 30y (${optimizedRisk}%) ≤ current (${currentRisk}%)`);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
