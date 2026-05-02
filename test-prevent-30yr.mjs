#!/usr/bin/env node
// test-prevent-30yr.mjs — tests for PREVENT 30-year and insight helpers

import { calcPREVENT30 } from "./src/prevent.js";

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

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
