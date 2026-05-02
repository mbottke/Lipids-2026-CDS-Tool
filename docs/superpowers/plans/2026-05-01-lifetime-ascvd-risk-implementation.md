# Lifetime ASCVD Risk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add PREVENT 30-year ASCVD ("lifetime") risk to the PRIMARY tab, displayed alongside the existing 10-year risk, with a discordance callout, an "if optimized" projection, and a per-factor driver breakdown. Display-only (does not modify the recommendation engine).

**Architecture:** Extract PREVENT math from `src/App.jsx` into a new pure-JS module `src/prevent.js` containing both 10-year (existing) and 30-year (new) coefficients, calculator functions, risk-band helpers, and three new helpers (`discordance`, `optimizedInputs`, `driverDeltas`). The PRIMARY tab UI is refactored from a single risk box into a two-up layout that displays 10-year and 30-year side-by-side. The 30-year half shows a "Not validated for ages ≥60" message when out of range. Two collapsible expandable rows render the if-optimized projection and the driver breakdown. All new UI uses existing dark/light tokens for seamless integration.

**Tech Stack:** React 19, Vite 6, Tailwind CSS 3, ES modules, plain Node assertions for tests.

**Spec:** [docs/superpowers/specs/2026-05-01-lifetime-ascvd-risk-design.md](docs/superpowers/specs/2026-05-01-lifetime-ascvd-risk-design.md)

---

## File Structure

| File | Action | Purpose |
|---|---|---|
| `src/prevent.js` | Create | Pure-JS module: coefficients, calculators, risk bands, insight helpers. No React. |
| `src/App.jsx` | Modify | Import from `./prevent.js`. Refactor result box to two-up. Add discordance callout and two expandables. |
| `test-prevent-30yr.mjs` | Create | Plain Node test for 30-year math, helpers, and edge cases. |
| `test-clinical.mjs` | Untouched | Existing CDS test continues to embed its own math copy. |
| `test-crossvalidate.mjs` | Untouched | Existing 10-year cross-validation continues to embed its own math copy. |
| `docs/superpowers/specs/2026-05-01-lifetime-ascvd-risk-design.md` | Untouched | Spec, already committed. |

---

## Task 1: Refactor — extract PREVENT 10-year math into `src/prevent.js`

**Goal:** Move the existing PREVENT 10-yr math out of `src/App.jsx` into a new module. No behavior change. Existing tests still pass.

**Files:**
- Create: `src/prevent.js`
- Modify: `src/App.jsx` (remove math, add import)

- [ ] **Step 1.1: Create `src/prevent.js` with the 10-year coefficients and functions**

```javascript
// src/prevent.js
// ══════════════════════════════════════════════════════════════════════════════
//  PREVENT-ASCVD calculator and helpers
//  Source: Khan SS et al. Circulation 2024;149:430-449
//  Coefficients extracted from `preventr` R package v0.11.0 (sysdata.rda)
// ══════════════════════════════════════════════════════════════════════════════

// 10-year ASCVD base model (ages 30-79)
export const PREVENT_10YR = {
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

function _xbeta(c, { age, sbp, bpTx, totalC, hdlC, statin, dm, smoking, egfr, bmi }) {
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
  return c.age*a + c.nonHdlC*nh + c.hdlC*hd + c.sbpLt110*sl + c.sbpGte110*sh +
    c.dm*d + c.smoking*sm + c.bmiLt30*bl + c.bmiGte30*bh +
    c.egfrLt60*el + c.egfrGte60*eh + c.bpTx*bp + c.statin*st +
    c.bpTxSbpGte110*(bp*sh) + c.statinNonHdlC*(st*nh) +
    c.ageNonHdlC*(a*nh) + c.ageHdlC*(a*hd) + c.ageSbpGte110*(a*sh) +
    c.ageDm*(a*d) + c.ageSmoking*(a*sm) + c.ageBmiGte30*(a*bh) +
    c.ageEgfrLt60*(a*el) + c.constant;
}

function _hasAllInputs({ age, sbp, totalC, hdlC, egfr, bmi }) {
  return Boolean(age && sbp && totalC && hdlC && egfr && bmi);
}

export function calcPREVENT10(inputs) {
  if (!_hasAllInputs(inputs)) return null;
  const c = PREVENT_10YR[inputs.sex];
  const x = _xbeta(c, inputs);
  return Math.round((Math.exp(x) / (1 + Math.exp(x))) * 1000) / 10;
}

export function riskCat10(r) {
  if (r === null) return null;
  if (r < 3)  return { label: "Low",          color: "#16a34a", bg: "#f0fdf4", darkBg: "rgba(16, 185, 129, 0.08)", range: "<3%" };
  if (r < 5)  return { label: "Borderline",   color: "#ca8a04", bg: "#fefce8", darkBg: "rgba(202, 138, 4, 0.10)",  range: "3–<5%" };
  if (r < 10) return { label: "Intermediate", color: "#ea580c", bg: "#fff7ed", darkBg: "rgba(234, 88, 12, 0.10)",  range: "5–<10%" };
  return         { label: "High",          color: "#dc2626", bg: "#fef2f2", darkBg: "rgba(220, 38, 38, 0.10)",  range: "≥10%" };
}
```

- [ ] **Step 1.2: Update `src/App.jsx` to import from `prevent.js`**

Find lines roughly 1–63 in `src/App.jsx` (the comment header, `PREVENT` constant, `calcPREVENT` function, and `riskCat` function). Replace the entire block with a single import line at the top of the file (just after the existing `useState` import line):

```javascript
import { calcPREVENT10, riskCat10 } from "./prevent.js";
```

Then update the two call sites in App.jsx:

- Find `calcPREVENT({` (around line 418) and replace with `calcPREVENT10({`
- Find `riskCat(risk)` (around line 421) and replace with `riskCat10(risk)`

(Variable names `risk` and `rc` stay the same in this task; they will be renamed to `risk10` / `rc10` in Task 8.)

- [ ] **Step 1.3: Run the existing tests to verify zero behavior change**

Run: `node test-crossvalidate.mjs && node test-clinical.mjs`
Expected: both tests pass with the same output as before the refactor (test files embed their own math copy, so they are unaffected by this refactor).

- [ ] **Step 1.4: Smoke test in dev**

Run: `npm run dev` (background), open the app, enter a known patient (e.g., 50F, SBP 160, BPtx, TC 200, HDL 45, DM, eGFR 90, BMI 35), confirm the 10-yr risk displays as before (~9.2%). Stop the dev server.

- [ ] **Step 1.5: Commit**

```bash
git add src/prevent.js src/App.jsx
git commit -m "refactor: extract PREVENT 10-yr math into src/prevent.js"
```

---

## Task 2: Add PREVENT 30-year coefficients

**Goal:** Get the sex-specific PREVENT 30-year base model coefficients into `src/prevent.js`. Verified against at least one published reference value.

**Files:**
- Modify: `src/prevent.js`

**Extraction sources** (try in order):

1. **Primary**: `preventr` R package v0.11.0, `sysdata.rda`, objects `b_30yr_ascvd_base_f` and `b_30yr_ascvd_base_m`.
2. **Fallback A**: AHA PREVENT calculator JS source at https://professional.heart.org/en/guidelines-and-statements/prevent-calculator (inspect the page's calculator JS, look for the 30-year coefficient block).
3. **Fallback B**: Khan SS et al. *Circulation* 2024;149:430-449 supplementary materials, Tables S29 and S30 (or whichever supplement contains the 30-year base model coefficients).

- [ ] **Step 2.1: Extract the coefficients**

If R is available locally:

```bash
# In a scratch directory (NOT inside the project)
R -e 'install.packages("preventr", repos="https://cloud.r-project.org")'
R -e 'library(preventr); load(system.file("R/sysdata.rda", package="preventr")); print(b_30yr_ascvd_base_f); print(b_30yr_ascvd_base_m)'
```

Otherwise, transcribe from the Khan paper supplement or AHA calculator source.

- [ ] **Step 2.2: Verify the extracted coefficients reproduce a published reference value**

Find at least one published 30-year reference value (from the Khan paper supplement, AHA calculator output, or `preventr` documentation). Manually compute the 30-year risk using the extracted coefficients and the same `_xbeta` formula structure as the 10-year model. Confirm the result matches the reference within ±0.5 percentage points. **Do not proceed if this check fails.**

- [ ] **Step 2.3: Add `PREVENT_30YR` constant to `src/prevent.js`**

Add immediately below the existing `PREVENT_10YR` constant. Note: BMI coefficients in the base model may be 0.0 (mirroring the 10-year base model). Whatever the actual values are, transcribe verbatim:

```javascript
// 30-year ASCVD base model (ages 30-59)
// Khan SS et al. Circulation 2024 — extracted from preventr v0.11.0 sysdata.rda
export const PREVENT_30YR = {
  female: {
    age: <value>, nonHdlC: <value>, hdlC: <value>,
    sbpLt110: <value>, sbpGte110: <value>, dm: <value>,
    smoking: <value>, bmiLt30: <value>, bmiGte30: <value>,
    egfrLt60: <value>, egfrGte60: <value>, bpTx: <value>,
    statin: <value>, bpTxSbpGte110: <value>, statinNonHdlC: <value>,
    ageNonHdlC: <value>, ageHdlC: <value>, ageSbpGte110: <value>,
    ageDm: <value>, ageSmoking: <value>, ageBmiGte30: <value>,
    ageEgfrLt60: <value>, constant: <value>,
  },
  male: {
    // ... same structure with male-specific values ...
  },
};

export const VALID_30YR_AGE_MAX = 59;
```

(The `<value>` placeholders are the only acceptable placeholders in the entire plan because the engineer must read the actual numbers off the source. Every other code block in this plan is final.)

- [ ] **Step 2.4: Commit**

```bash
git add src/prevent.js
git commit -m "feat: add PREVENT 30-year base model coefficients"
```

---

## Task 3: TDD — `calcPREVENT30`

**Goal:** Implement and test `calcPREVENT30(inputs)`. Returns null when inputs incomplete or age out of [30, 59]. Otherwise returns a percentage rounded to 1 decimal.

**Files:**
- Create: `test-prevent-30yr.mjs`
- Modify: `src/prevent.js`

- [ ] **Step 3.1: Write the failing test file**

Create `test-prevent-30yr.mjs` at the project root:

```javascript
#!/usr/bin/env node
// test-prevent-30yr.mjs — tests for PREVENT 30-year and insight helpers

import {
  calcPREVENT10, calcPREVENT30, riskCat30,
  discordance, optimizedInputs, driverDeltas,
  DISCORDANCE_RISK10_MAX, DISCORDANCE_RISK30_MIN, VALID_30YR_AGE_MAX,
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

// Reference cases — replace expected values with verified outputs from
// AHA PREVENT calculator (https://professional.heart.org/.../prevent-calculator)
// Each reference case must have all inputs populated, age in [30, 59].
const REF_30YR = [
  {
    name: "35F low-risk baseline",
    inputs: { age: 35, sex: "female", sbp: 115, bpTx: false, totalC: 180, hdlC: 55, statin: false, dm: false, smoking: false, egfr: 95, bmi: 23 },
    expected: <ref%>,  // record from AHA calculator at extraction time
    tolerance: 1.0,
  },
  {
    name: "35M high-LDL discordance candidate",
    inputs: { age: 35, sex: "male", sbp: 118, bpTx: false, totalC: 250, hdlC: 40, statin: false, dm: false, smoking: false, egfr: 95, bmi: 27 },
    expected: <ref%>,
    tolerance: 1.0,
  },
  {
    name: "45M average",
    inputs: { age: 45, sex: "male", sbp: 130, bpTx: false, totalC: 200, hdlC: 45, statin: false, dm: false, smoking: false, egfr: 90, bmi: 26 },
    expected: <ref%>,
    tolerance: 1.0,
  },
  {
    name: "55F high-burden",
    inputs: { age: 55, sex: "female", sbp: 145, bpTx: true, totalC: 220, hdlC: 40, statin: false, dm: true, smoking: true, egfr: 75, bmi: 32 },
    expected: <ref%>,
    tolerance: 1.0,
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
```

(The `<ref%>` placeholders must be filled in from AHA PREVENT calculator output during this step. Each reference value gets recorded after running the inputs through https://professional.heart.org/en/guidelines-and-statements/prevent-calculator with the 30-year display selected.)

- [ ] **Step 3.2: Run the test to verify it fails**

Run: `node test-prevent-30yr.mjs`
Expected: fails because `calcPREVENT30` is not yet exported.

- [ ] **Step 3.3: Implement `calcPREVENT30` in `src/prevent.js`**

Add below `calcPREVENT10`:

```javascript
export function calcPREVENT30(inputs) {
  if (!_hasAllInputs(inputs)) return null;
  if (Number(inputs.age) > VALID_30YR_AGE_MAX) return null;
  if (Number(inputs.age) < 30) return null;
  const c = PREVENT_30YR[inputs.sex];
  const x = _xbeta(c, inputs);
  return Math.round((Math.exp(x) / (1 + Math.exp(x))) * 1000) / 10;
}
```

- [ ] **Step 3.4: Run the test to verify it passes**

Run: `node test-prevent-30yr.mjs`
Expected: all `calcPREVENT30` and Boundary tests pass. (Helper tests for `discordance`, `optimizedInputs`, `driverDeltas`, `riskCat30` will fail at this point because they are not yet implemented and not yet asserted in the file. They will be added in subsequent tasks.)

- [ ] **Step 3.5: Commit**

```bash
git add src/prevent.js test-prevent-30yr.mjs
git commit -m "feat: add calcPREVENT30 with cross-validated reference cases"
```

---

## Task 4: TDD — `riskCat30`

**Goal:** Risk-band categorizer for 30-year results. Returns the same shape as `riskCat10` but with different cutoffs and color tokens drawn from the existing palette.

**Files:**
- Modify: `src/prevent.js`
- Modify: `test-prevent-30yr.mjs`

- [ ] **Step 4.1: Append failing tests to `test-prevent-30yr.mjs`**

Add before the final `console.log`/`process.exit`:

```javascript
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
```

- [ ] **Step 4.2: Run the test to verify it fails**

Run: `node test-prevent-30yr.mjs`
Expected: `riskCat30` block fails (function not exported).

- [ ] **Step 4.3: Implement `riskCat30` in `src/prevent.js`**

Add below `riskCat10`:

```javascript
export function riskCat30(r) {
  if (r === null) return null;
  if (r < 10) return { label: "Low",          color: "#16a34a", bg: "#f0fdf4", darkBg: "rgba(16, 185, 129, 0.08)", range: "<10%" };
  if (r < 20) return { label: "Borderline",   color: "#ca8a04", bg: "#fefce8", darkBg: "rgba(202, 138, 4, 0.10)",  range: "10–<20%" };
  if (r < 30) return { label: "Intermediate", color: "#ea580c", bg: "#fff7ed", darkBg: "rgba(234, 88, 12, 0.10)",  range: "20–<30%" };
  return         { label: "High",          color: "#dc2626", bg: "#fef2f2", darkBg: "rgba(220, 38, 38, 0.10)",  range: "≥30%" };
}
```

(Color tokens are identical to `riskCat10`. Only labels and ranges differ. This satisfies the "no new color tokens" hard constraint from the spec.)

- [ ] **Step 4.4: Run the test to verify it passes**

Run: `node test-prevent-30yr.mjs`
Expected: `riskCat30` block passes.

- [ ] **Step 4.5: Commit**

```bash
git add src/prevent.js test-prevent-30yr.mjs
git commit -m "feat: add riskCat30 band categorizer"
```

---

## Task 5: TDD — `discordance` helper

**Goal:** Returns true when 10-yr is low but 30-yr is high (low 10-yr / high 30-yr divergence). Also exports the threshold constants.

**Files:**
- Modify: `src/prevent.js`
- Modify: `test-prevent-30yr.mjs`

- [ ] **Step 5.1: Append failing tests**

```javascript
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
```

- [ ] **Step 5.2: Run the test to verify it fails**

Run: `node test-prevent-30yr.mjs`
Expected: `discordance` block fails.

- [ ] **Step 5.3: Implement in `src/prevent.js`**

Add the constants near the top of the file (just below `VALID_30YR_AGE_MAX`):

```javascript
export const DISCORDANCE_RISK10_MAX = 5;
export const DISCORDANCE_RISK30_MIN = 20;
```

Add the function below `riskCat30`:

```javascript
export function discordance(risk10, risk30, age) {
  if (risk10 === null || risk30 === null) return false;
  const a = Number(age);
  if (a < 30 || a > VALID_30YR_AGE_MAX) return false;
  return risk10 < DISCORDANCE_RISK10_MAX && risk30 >= DISCORDANCE_RISK30_MIN;
}
```

- [ ] **Step 5.4: Run the test to verify it passes**

Run: `node test-prevent-30yr.mjs`
Expected: `discordance` block passes.

- [ ] **Step 5.5: Commit**

```bash
git add src/prevent.js test-prevent-30yr.mjs
git commit -m "feat: add discordance helper for low-10yr/high-30yr detection"
```

---

## Task 6: TDD — `optimizedInputs` helper

**Goal:** Returns a new inputs object with modifiable factors substituted to optimal values using min/max rules so already-good biomarkers are preserved.

**Files:**
- Modify: `src/prevent.js`
- Modify: `test-prevent-30yr.mjs`

- [ ] **Step 6.1: Append failing tests**

```javascript
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
```

- [ ] **Step 6.2: Run the test to verify it fails**

Run: `node test-prevent-30yr.mjs`
Expected: `optimizedInputs` block fails.

- [ ] **Step 6.3: Implement in `src/prevent.js`**

Add below `discordance`:

```javascript
export function optimizedInputs(inputs) {
  const sbp = Math.min(Number(inputs.sbp), 110);
  const bmi = Math.min(Number(inputs.bmi), 24);
  const hdlC = Math.max(Number(inputs.hdlC), 50);
  const currentNonHdl = Number(inputs.totalC) - Number(inputs.hdlC);
  const targetNonHdl = Math.min(currentNonHdl, 120);
  const totalC = targetNonHdl + hdlC;
  return {
    ...inputs,
    sbp,
    bpTx: false,
    smoking: false,
    bmi,
    hdlC,
    totalC,
    statin: false,
  };
}
```

- [ ] **Step 6.4: Run the test to verify it passes**

Run: `node test-prevent-30yr.mjs`
Expected: `optimizedInputs` block passes.

- [ ] **Step 6.5: Sanity assertion — optimized risk should be ≤ current risk**

Append:

```javascript
console.log("\n═══ optimized-risk sanity ═══");
const sanityPatient = {
  age: 45, sex: "male", sbp: 145, bpTx: true, totalC: 230, hdlC: 38,
  statin: false, dm: false, smoking: true, egfr: 85, bmi: 31,
};
const currentRisk = calcPREVENT30(sanityPatient);
const optimizedRisk = calcPREVENT30(optimizedInputs(sanityPatient));
eq(optimizedRisk <= currentRisk, true,
   `optimized 30y (${optimizedRisk}%) ≤ current (${currentRisk}%)`);
```

Run: `node test-prevent-30yr.mjs`
Expected: passes.

- [ ] **Step 6.6: Commit**

```bash
git add src/prevent.js test-prevent-30yr.mjs
git commit -m "feat: add optimizedInputs helper with min/max preservation rules"
```

---

## Task 7: TDD — `driverDeltas` helper

**Goal:** Returns an array of `{ factor, label, delta }` for each modifiable factor, sorted descending by delta. Filters out deltas below 0.5%. Skips BMI if its substitution produces no change (which happens when 30-yr coefficients are zero, mirroring the 10-yr base model).

**Files:**
- Modify: `src/prevent.js`
- Modify: `test-prevent-30yr.mjs`

- [ ] **Step 7.1: Append failing tests**

```javascript
console.log("\n═══ driverDeltas ═══");
const driverPatient = {
  age: 50, sex: "male", sbp: 150, bpTx: true, totalC: 240, hdlC: 38,
  statin: false, dm: false, smoking: true, egfr: 85, bmi: 31,
};
const drivers = driverDeltas(driverPatient);

// each entry has factor, label, delta
eq(Array.isArray(drivers), true, "returns an array");
eq(drivers.every(d => typeof d.factor === "string" && typeof d.label === "string" && typeof d.delta === "number"), true, "entries have factor/label/delta");

// expected factors (subject to BMI inclusion)
const factorIds = drivers.map(d => d.factor);
eq(factorIds.includes("bp"),      true, "includes bp");
eq(factorIds.includes("lipids"),  true, "includes lipids");
eq(factorIds.includes("smoking"), true, "includes smoking");
// bmi included only when its substitution actually changes risk

// sorted descending
for (let i = 1; i < drivers.length; i++) {
  eq(drivers[i-1].delta >= drivers[i].delta, true, `entry ${i-1} delta ≥ entry ${i} delta`);
}

// noise floor
eq(drivers.every(d => d.delta >= 0.5), true, "all deltas ≥ 0.5% (noise floor)");

// already-optimal patient produces empty array
const optimalPatient = {
  age: 40, sex: "male", sbp: 110, bpTx: false, totalC: 170, hdlC: 50,
  statin: false, dm: false, smoking: false, egfr: 95, bmi: 24,
};
eq(driverDeltas(optimalPatient).length, 0, "already-optimal patient produces empty array");
```

- [ ] **Step 7.2: Run the test to verify it fails**

Run: `node test-prevent-30yr.mjs`
Expected: `driverDeltas` block fails.

- [ ] **Step 7.3: Implement in `src/prevent.js`**

Add below `optimizedInputs`:

```javascript
const NOISE_FLOOR = 0.5;

const FACTOR_OVERRIDES = {
  bp:      { sbp: 110, bpTx: false },
  lipids:  null, // computed dynamically using min/max rules
  smoking: { smoking: false },
  bmi:     { bmi: 24 },
};

function _lipidsOverride(inputs) {
  const hdlC = Math.max(Number(inputs.hdlC), 50);
  const currentNonHdl = Number(inputs.totalC) - Number(inputs.hdlC);
  const targetNonHdl = Math.min(currentNonHdl, 120);
  return { hdlC, totalC: targetNonHdl + hdlC };
}

export function driverDeltas(inputs) {
  const current = calcPREVENT30(inputs);
  if (current === null) return [];

  const candidates = [
    { factor: "bp",      label: "Blood Pressure", override: FACTOR_OVERRIDES.bp },
    { factor: "lipids",  label: "Lipids",         override: _lipidsOverride(inputs) },
    { factor: "smoking", label: "Smoking",        override: FACTOR_OVERRIDES.smoking },
    { factor: "bmi",     label: "BMI",            override: FACTOR_OVERRIDES.bmi },
  ];

  const out = [];
  for (const c of candidates) {
    const swapped = { ...inputs, ...c.override };
    const r = calcPREVENT30(swapped);
    if (r === null) continue;
    const delta = Math.round((current - r) * 10) / 10;
    if (delta >= NOISE_FLOOR) out.push({ factor: c.factor, label: c.label, delta });
  }
  out.sort((a, b) => b.delta - a.delta);
  return out;
}
```

(BMI is included as a candidate. If the 30-year base model has BMI coefficients of 0, its delta will be 0 and the noise floor will silently filter it out. This matches the spec's "candidate factors subject to coefficient verification" behavior.)

- [ ] **Step 7.4: Run the test to verify it passes**

Run: `node test-prevent-30yr.mjs`
Expected: `driverDeltas` block passes. Full test suite: all green.

- [ ] **Step 7.5: Commit**

```bash
git add src/prevent.js test-prevent-30yr.mjs
git commit -m "feat: add driverDeltas single-factor counterfactual helper"
```

---

## Task 8: UI — wire up `risk30` and `rc30` state in App.jsx

**Goal:** Compute the new state values without rendering them yet. Verify the existing UI is unchanged.

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 8.1: Update the import in `App.jsx`**

Change the existing import line to:

```javascript
import {
  calcPREVENT10, calcPREVENT30,
  riskCat10, riskCat30,
  discordance, optimizedInputs, driverDeltas,
  VALID_30YR_AGE_MAX,
} from "./prevent.js";
```

- [ ] **Step 8.2: Rename `risk` → `risk10` and `rc` → `rc10` (for clarity)**

In `src/App.jsx`, find the existing useMemo blocks (around lines 416–421):

```javascript
const risk = useMemo(() => {
  if (tab !== "primary") return null;
  return calcPREVENT({ age, sex, sbp, bpTx, totalC, hdlC, statin:onStatin, dm, smoking, egfr, bmi });
}, [tab, age, sex, sbp, bpTx, totalC, hdlC, onStatin, dm, smoking, egfr, bmi]);

const rc = useMemo(() => riskCat(risk), [risk]);
```

Replace with:

```javascript
const inputsObj = useMemo(() => ({
  age, sex, sbp, bpTx, totalC, hdlC, statin: onStatin, dm, smoking, egfr, bmi,
}), [age, sex, sbp, bpTx, totalC, hdlC, onStatin, dm, smoking, egfr, bmi]);

const risk10 = useMemo(() => {
  if (tab !== "primary") return null;
  return calcPREVENT10(inputsObj);
}, [tab, inputsObj]);

const risk30 = useMemo(() => {
  if (tab !== "primary") return null;
  return calcPREVENT30(inputsObj);
}, [tab, inputsObj]);

const rc10 = useMemo(() => riskCat10(risk10), [risk10]);
const rc30 = useMemo(() => riskCat30(risk30), [risk30]);

const discord = useMemo(() => discordance(risk10, risk30, age), [risk10, risk30, age]);

const optInputs = useMemo(() => {
  if (risk30 === null) return null;
  return optimizedInputs(inputsObj);
}, [risk30, inputsObj]);

const optRisk30 = useMemo(() => {
  if (optInputs === null) return null;
  return calcPREVENT30(optInputs);
}, [optInputs]);

const drivers = useMemo(() => {
  if (risk30 === null) return [];
  return driverDeltas(inputsObj);
}, [risk30, inputsObj]);
```

- [ ] **Step 8.3: Update the existing render references**

Find every reference to `risk` and `rc` in the JSX (search for `risk !==`, `risk >=`, `risk ===`, `rc.color`, `rc.bg`, `rc.darkBg`, `rc.label`, `rc.range`, etc.) and rename to `risk10` / `rc10`. The recommendation engine and CDS logic continue to use `risk10`. Do not rename inside `prevent.js` (already done) or inside the `rec` useMemo (the variable inside that block is `risk` from destructuring; check whether it's a separate local). After the edits, search the file for `\brisk\b` and `\brc\b` to confirm zero stragglers.

- [ ] **Step 8.4: Smoke test**

Run: `npm run dev`. Open the app. Enter the reference patient (50F, SBP 160, BPtx, TC 200, HDL 45, DM, eGFR 90, BMI 35). Confirm the 10-yr risk still displays correctly. The 30-yr value is computed but not yet rendered (verify with React DevTools if desired, otherwise just confirm no console errors and no visible regression).

- [ ] **Step 8.5: Commit**

```bash
git add src/App.jsx
git commit -m "refactor: wire up risk30, rc30, discordance, optimized, drivers state"
```

---

## Task 9: UI — refactor result box to two-up layout

**Goal:** Replace the single risk box with a two-up that shows 10-yr on the left and 30-yr on the right. Both halves use existing dark/light tokens.

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 9.1: Locate the existing risk render block**

In `src/App.jsx`, find the block (around lines 642–656):

```javascript
{/* Risk result */}
{risk10 !== null && rc10 && (
  <div className="risk-appear rounded-xl p-4 mt-4 border-2" style={{ backgroundColor: darkMode ? rc10.darkBg : rc10.bg, borderColor:rc10.color+"40" }}>
    <div className="flex items-center justify-between">
      <div>
        <div className="text-[11px] font-black uppercase tracking-widest" style={{color:rc10.color}}>10-Yr ASCVD Risk</div>
        <div className="text-4xl font-black mt-0.5 font-mono tabular-nums" style={{color:rc10.color}}>{risk10}%</div>
      </div>
      <div className="text-right">
        <div className="px-4 py-2 rounded-full text-[14px] font-black text-white shadow-sm" style={{backgroundColor:rc10.color}}>{rc10.label}</div>
        <div className="text-[11px] mt-1 font-semibold" style={{color:rc10.color}}>{rc10.range}</div>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 9.2: Replace with the two-up layout**

```javascript
{/* Risk result — 10-yr / 30-yr two-up */}
{risk10 !== null && rc10 && (
  <div className="risk-appear mt-4 grid grid-cols-2 gap-2">
    {/* 10-year */}
    <div className="rounded-xl p-3 border-2" style={{ backgroundColor: darkMode ? rc10.darkBg : rc10.bg, borderColor: rc10.color + "40" }}>
      <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: rc10.color }}>10-Yr ASCVD</div>
      <div className="text-3xl font-black mt-0.5 font-mono tabular-nums" style={{ color: rc10.color }}>{risk10}%</div>
      <div className="mt-1 inline-block px-2.5 py-1 rounded-full text-[11px] font-black text-white shadow-sm" style={{ backgroundColor: rc10.color }}>{rc10.label}</div>
      <div className="text-[10px] mt-1 font-semibold" style={{ color: rc10.color }}>{rc10.range}</div>
    </div>

    {/* 30-year */}
    {risk30 !== null && rc30 ? (
      <div className="rounded-xl p-3 border-2" style={{ backgroundColor: darkMode ? rc30.darkBg : rc30.bg, borderColor: rc30.color + "40" }}>
        <div className="text-[10px] font-black uppercase tracking-widest" style={{ color: rc30.color }}>30-Yr ASCVD</div>
        <div className="text-3xl font-black mt-0.5 font-mono tabular-nums" style={{ color: rc30.color }}>{risk30}%</div>
        <div className="mt-1 inline-block px-2.5 py-1 rounded-full text-[11px] font-black text-white shadow-sm" style={{ backgroundColor: rc30.color }}>{rc30.label}</div>
        <div className="text-[10px] mt-1 font-semibold" style={{ color: rc30.color }}>{rc30.range}</div>
      </div>
    ) : (
      <div className="rounded-xl p-3 border-2 bg-slate-50 dark:bg-[#111a24] border-slate-200 dark:border-[#1a2835]">
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-[#5a8aaa]">30-Yr ASCVD</div>
        <div className="text-[12px] mt-2 font-semibold text-slate-500 dark:text-[#7a9ab5] leading-snug">
          Not validated for ages ≥{VALID_30YR_AGE_MAX + 1}
        </div>
      </div>
    )}
  </div>
)}
```

(The 10-yr half is intentionally slightly smaller per side than the original single-card version because we now have two cards in the same horizontal space. Font sizes and padding are tuned to fit on phone widths.)

- [ ] **Step 9.3: Visual verification**

Run: `npm run dev`. Open the app.

- Test 1 (age 30–59 with all inputs): both halves render with appropriate band colors. Light and dark mode both look right.
- Test 2 (age 60–79 with all inputs): left half shows 10-yr, right half shows neutral "Not validated for ages ≥60" message.
- Test 3 (incomplete inputs): nothing renders (existing behavior).

Use the preview MCP if available to snapshot both light and dark mode.

- [ ] **Step 9.4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: split PRIMARY risk box into 10-yr / 30-yr two-up layout"
```

---

## Task 10: UI — discordance callout

**Goal:** When `discord === true`, render an amber callout below the two-up.

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 10.1: Add the callout block immediately after the two-up grid**

```javascript
{/* Discordance callout */}
{discord && (
  <div className="mt-3 p-3 rounded-xl border bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30">
    <div className="flex items-start gap-2">
      <div className="text-amber-700 dark:text-amber-400 text-[14px] font-black mt-0.5">⚠</div>
      <div>
        <div className="text-[12px] font-black text-amber-800 dark:text-amber-300 leading-tight">Discordance: low 10-yr, elevated lifetime risk</div>
        <div className="text-[11px] text-amber-700 dark:text-amber-300/80 mt-0.5 leading-snug">
          Consider shared decision-making, CAC scoring, Lp(a) measurement, and earlier statin/lifestyle intervention.
        </div>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 10.2: Visual verification**

Run: `npm run dev`. Use a discordance-triggering profile such as 35M, SBP 118, no BPtx, totalC 250, HDL 40, no statin/DM/smoking, eGFR 95, BMI 27. Confirm the callout appears when 10-yr is below 5% and 30-yr ≥ 20%. Adjust inputs to confirm the callout disappears when conditions are not met. Verify look in both light and dark mode.

- [ ] **Step 10.3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: discordance callout for low-10yr/high-lifetime divergence"
```

---

## Task 11: UI — expandable rows (if-optimized + drivers)

**Goal:** Two collapsible rows below the discordance callout. Pattern matches existing `cacInfo` / `bioInfo` toggles.

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 11.1: Add state for the two expandables**

In the state declarations block (around lines 336–367 in `App.jsx`), add:

```javascript
const [lifetimeOptimizedOpen, setLifetimeOptimizedOpen] = useState(false);
const [lifetimeDriversOpen, setLifetimeDriversOpen] = useState(false);
```

Also add their resets to `resetPatient`:

```javascript
setLifetimeOptimizedOpen(false); setLifetimeDriversOpen(false);
```

- [ ] **Step 11.2: Add the expandable JSX after the discordance callout**

```javascript
{/* Lifetime insights (only when 30-yr is available) */}
{risk30 !== null && (
  <div className="mt-3 space-y-2">
    {/* If optimized */}
    <div className="rounded-xl border border-slate-200 dark:border-[#1a2835] bg-white dark:bg-[#111a24] overflow-hidden">
      <button
        onClick={() => setLifetimeOptimizedOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left active:opacity-70 cursor-pointer"
      >
        <span className="text-[12px] font-bold text-slate-700 dark:text-[#d0e4f0]">
          {lifetimeOptimizedOpen ? "▾" : "▸"} Risk if optimized
        </span>
        <span className="text-[10px] font-semibold text-slate-400 dark:text-[#5a8aaa]">tap</span>
      </button>
      {lifetimeOptimizedOpen && (
        <div className="px-3 pb-3 pt-0 border-t border-slate-200 dark:border-[#1a2835]">
          {(() => {
            if (optRisk30 === null) return <div className="text-[11px] text-slate-500 dark:text-[#5a8aaa]">Unable to compute optimized projection.</div>;
            const delta = Math.round((risk30 - optRisk30) * 10) / 10;
            if (delta <= 0) return (
              <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-2">
                Risk factors already near optimal.
              </div>
            );
            return (
              <div className="mt-2">
                <div className="text-[11px] text-slate-500 dark:text-[#5a8aaa] leading-snug">
                  If risk factors optimized (BP 110, no smoking, BMI ≤24, non-HDL ≤120, HDL ≥50):
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-400">{optRisk30}%</span>
                  <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400">↓ −{delta}%</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>

    {/* Drivers */}
    <div className="rounded-xl border border-slate-200 dark:border-[#1a2835] bg-white dark:bg-[#111a24] overflow-hidden">
      <button
        onClick={() => setLifetimeDriversOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left active:opacity-70 cursor-pointer"
      >
        <span className="text-[12px] font-bold text-slate-700 dark:text-[#d0e4f0]">
          {lifetimeDriversOpen ? "▾" : "▸"} What's driving the 30-yr risk?
        </span>
        <span className="text-[10px] font-semibold text-slate-400 dark:text-[#5a8aaa]">tap</span>
      </button>
      {lifetimeDriversOpen && (
        <div className="px-3 pb-3 pt-0 border-t border-slate-200 dark:border-[#1a2835]">
          {drivers.length === 0 ? (
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-2">
              All modifiable factors near optimal.
            </div>
          ) : (
            <>
              <div className="mt-2 space-y-1.5">
                {drivers.map(d => {
                  const maxDelta = drivers[0].delta || 1;
                  const widthPct = Math.round((d.delta / maxDelta) * 100);
                  return (
                    <div key={d.factor} className="flex items-center gap-2">
                      <div className="text-[11px] font-bold text-slate-700 dark:text-[#d0e4f0] w-24 shrink-0">{d.label}</div>
                      <div className="flex-1 h-3 rounded bg-slate-100 dark:bg-[#0a1018] relative overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 bg-amber-500 dark:bg-amber-400/70" style={{ width: widthPct + "%" }} />
                      </div>
                      <div className="text-[11px] font-mono tabular-nums font-bold text-amber-700 dark:text-amber-400 w-12 text-right shrink-0">−{d.delta}%</div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2 text-[10px] text-slate-400 dark:text-[#5a8aaa] leading-snug">
                Single-factor projection. Values may not sum due to interactions in the PREVENT model.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  </div>
)}
```

- [ ] **Step 11.3: Visual verification**

Run: `npm run dev`. Use a high-burden patient (e.g., 50M, SBP 150, BPtx, TC 240, HDL 38, smoker, eGFR 85, BMI 31). Confirm:

- "Risk if optimized" expands to show a lower projected risk plus delta arrow.
- "What's driving the 30-yr risk?" expands to show bars in descending order with deltas like BP, Lipids, Smoking. (BMI may or may not appear depending on extracted 30-yr coefficients.)
- Use an already-optimal patient and confirm both expandables show their "near optimal" copy.
- Use a 60+ patient and confirm the entire expandable block is suppressed (not rendered).
- Verify both light and dark modes.

- [ ] **Step 11.4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: expandable if-optimized projection and risk-driver breakdown"
```

---

## Task 12: Final verification

**Goal:** Confirm nothing regressed, light and dark modes are seamless, and the new feature works end-to-end.

**Files:** None modified (verification only)

- [ ] **Step 12.1: Run all tests**

```bash
node test-prevent-30yr.mjs
node test-crossvalidate.mjs
node test-clinical.mjs
```

Expected: all three pass.

- [ ] **Step 12.2: Production build sanity check**

```bash
npm run build
```

Expected: exits 0 with no errors. (Vite-PWA build.)

- [ ] **Step 12.3: Cross-tab smoke test**

Run: `npm run dev`. For each of the 4 tabs (PRIMARY, ASCVD, DIABETES, LDL ≥190), confirm existing behavior is unchanged. The new lifetime UI should appear ONLY on the PRIMARY tab.

- [ ] **Step 12.4: Light/dark mode visual sweep**

Toggle between light and dark mode and confirm:

- Two-up cards in both modes use the existing band-color tokens.
- The neutral "Not validated" slot uses the slate dark-mode tokens that match the rest of the app.
- The discordance callout matches existing amber treatment.
- Expandable rows match existing `cacInfo`-style toggles.
- Parallax shimmer, glow effects, and other existing animations are not disrupted.

- [ ] **Step 12.5: Commit any final fixups (if needed)**

If verification turns up nothing, no commit. Otherwise:

```bash
git add src/App.jsx
git commit -m "fix: <specific issue found in verification>"
```

---

## Self-Review Notes

- **Spec coverage**: every spec section is mapped to a task. Section 1 (math/coefficients) → Tasks 1, 2, 3, 4. Section 2 (UI layout) → Tasks 9, 10, 11. Section 3 (insight calculations) → Tasks 5, 6, 7. Section 4 (code organization) → Tasks 1, 8. Section 5 (edge cases) → covered by tests in Tasks 3, 5, 6, 7 and visual checks in Tasks 9, 11. Section 6 (testing) → Tasks 3 through 7. Section 7 (backwards compatibility) → Task 1 + Task 12 verification.
- **Placeholder scan**: only `<value>` (Task 2.3, 30-yr coefficient values to transcribe from preventr) and `<ref%>` (Task 3.1, AHA calculator reference values to record) are present. Both are flagged explicitly as the only acceptable placeholders.
- **Type/name consistency**: `calcPREVENT10` / `calcPREVENT30`, `riskCat10` / `riskCat30`, `risk10` / `risk30`, `rc10` / `rc30`, `discord` / `discordance`, `optInputs` / `optimizedInputs`, `optRisk30`, `drivers` / `driverDeltas` are used consistently across all tasks.
