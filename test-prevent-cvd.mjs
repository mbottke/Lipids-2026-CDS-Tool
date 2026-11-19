#!/usr/bin/env node
// test-prevent-cvd.mjs — PREVENT total CVD (ASCVD + HF) base models
// Reference values: preventr v0.12.2 tests/testthat/test-estimate_risk.R
// ("Base model works, female" / "Base model works, male").

import {
  calcPREVENT10, calcPREVENT30, calcPREVENT10CVD, calcPREVENT30CVD,
  calcPREVENT10HF, calcPREVENT30HF,
  CVD_BP_TX_THRESHOLD,
} from "./src/prevent.js";

let pass = 0, fail = 0;
function eq(actual, expected, name) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`); }
}

const ref = { age: 50, sbp: 160, bpTx: true, totalC: 200, hdlC: 45, statin: false, dm: true, smoking: false, egfr: 90, bmi: 35 };
const F = { ...ref, sex: "female" }, M = { ...ref, sex: "male" };

console.log("\n═══ preventr reference cases (total CVD) ═══");
eq(calcPREVENT10CVD(F), 14.7, "50F 10-yr total CVD = 14.7%");
eq(calcPREVENT30CVD(F), 53.0, "50F 30-yr total CVD = 53.0%");
eq(calcPREVENT10CVD(M), 16.3, "50M 10-yr total CVD = 16.3%");
eq(calcPREVENT30CVD(M), 51.4, "50M 30-yr total CVD = 51.4%");

console.log("\n═══ preventr reference cases (heart failure) ═══");
eq(calcPREVENT10HF(F), 8.1,  "50F 10-yr HF = 8.1%");
eq(calcPREVENT30HF(F), 39.0, "50F 30-yr HF = 39.0%");
eq(calcPREVENT10HF(M), 10.6, "50M 10-yr HF = 10.6%");
eq(calcPREVENT30HF(M), 42.4, "50M 30-yr HF = 42.4%");
eq(calcPREVENT10HF({ ...F, bmi: "" }), null, "HF needs BMI: blank → null");
eq(calcPREVENT10HF({ ...F, bmi: 24 }) < calcPREVENT10HF(F), true, "HF risk falls with lower BMI");
eq(calcPREVENT10HF({ ...F, totalC: 280 }), calcPREVENT10HF(F), "cholesterol has no effect on the HF model");

console.log("\n═══ BMI optional for ASCVD and total CVD ═══");
eq(calcPREVENT10({ ...F, bmi: "" }), 9.2,  "ASCVD without BMI = 9.2%");
eq(calcPREVENT30({ ...F, bmi: "" }), 35.4, "30-yr ASCVD without BMI = 35.4%");
eq(calcPREVENT10CVD({ ...F, bmi: "" }), 14.7, "total CVD without BMI = 14.7%");

console.log("\n═══ Diabetes status changes total CVD (BP section uses the status in force) ═══");
eq(calcPREVENT10CVD({ ...M, dm: false }), 7.5, "50M reference without diabetes = 7.5%");
eq(calcPREVENT10CVD({ ...M, dm: true }), 16.3, "50M reference with diabetes = 16.3%");

console.log("\n═══ ASCVD models unchanged ═══");
eq(calcPREVENT10(F), 9.2,  "50F 10-yr ASCVD = 9.2%");
eq(calcPREVENT10(M), 10.2, "50M 10-yr ASCVD = 10.2%");
eq(calcPREVENT30(F), 35.4, "50F 30-yr ASCVD = 35.4%");
eq(calcPREVENT30(M), 34.9, "50M 30-yr ASCVD = 34.9%");

console.log("\n═══ Structural properties ═══");
const grid = [];
for (const sex of ["female", "male"]) for (const age of [30, 45, 59, 60, 79])
  for (const sbp of [100, 128, 150]) for (const dm of [false, true])
    grid.push({ age, sex, sbp, bpTx: sbp > 140, totalC: 210, hdlC: 48, statin: false, dm, smoking: false, egfr: 85, bmi: 27 });
eq(grid.every(p => calcPREVENT10CVD(p) >= calcPREVENT10(p)), true, "10-yr total CVD ≥ 10-yr ASCVD across grid");
eq(grid.filter(p => p.age <= 59).every(p => calcPREVENT30CVD(p) >= calcPREVENT30(p)), true, "30-yr total CVD ≥ 30-yr ASCVD across grid");
eq(grid.filter(p => p.age <= 59).every(p => calcPREVENT30CVD(p) >= calcPREVENT10CVD(p)), true, "30-yr total CVD ≥ 10-yr total CVD");
eq(calcPREVENT10CVD({ ...F, bmi: 22 }), calcPREVENT10CVD(F), "BMI has no effect on total CVD base model");

console.log("\n═══ Boundaries ═══");
eq(calcPREVENT30CVD({ ...F, age: 60 }), null, "30-yr total CVD null at age 60");
eq(calcPREVENT30CVD({ ...F, age: 29 }), null, "30-yr total CVD null at age 29");
eq(calcPREVENT10CVD({ ...F, age: 79 }) !== null, true, "10-yr total CVD computed at age 79");
eq(calcPREVENT10CVD({ ...F, egfr: "" }), null, "missing eGFR → null");
eq(CVD_BP_TX_THRESHOLD, 7.5, "BP drug-therapy threshold constant = 7.5%");

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
