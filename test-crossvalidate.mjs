#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════
//  CROSS-VALIDATION against preventr R package reference case
//  Source: preventr v0.11.0 documentation, Table S25 from PREVENT paper
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

  // Return both raw and rounded for comparison
  const raw = (Math.exp(x)/(1+Math.exp(x)))*100;
  const rounded = Math.round(raw * 10) / 10;
  return { raw, rounded, logit: x };
}

console.log("══════════════════════════════════════════════════════════════════");
console.log("  CROSS-VALIDATION: preventr R package reference case");
console.log("  Source: Table S25, Khan SS et al. Circulation 2024");
console.log("══════════════════════════════════════════════════════════════════\n");

// ─── Reference Case from preventr documentation ───
// age=50, sex="female", sbp=160, bp_tx=TRUE, total_c=200, hdl_c=45,
// statin=FALSE, dm=TRUE, smoking=FALSE, egfr=90, bmi=35
// Expected 10-year ASCVD: 0.092 (9.2%)
const ref = calcPREVENT({
  age: 50, sex: "female", sbp: 160, bpTx: true,
  totalC: 200, hdlC: 45, statin: false, dm: true,
  smoking: false, egfr: 90, bmi: 35
});

console.log("Reference case: 50F, SBP 160, BPtx, TC 200, HDL 45, DM, eGFR 90, BMI 35");
console.log(`  Expected (preventr Table S25): 9.2% (0.092)`);
console.log(`  Our calculator:                ${ref.rounded}% (${(ref.raw/100).toFixed(4)})`);
console.log(`  Raw probability:               ${ref.raw.toFixed(4)}%`);
console.log(`  Log-odds (x):                  ${ref.logit.toFixed(6)}`);
console.log();

const diff = Math.abs(ref.rounded - 9.2);
if (diff <= 0.5) {
  console.log(`  ✅ MATCH within ±0.5% (Δ = ${diff.toFixed(1)}%)`);
} else if (diff <= 1.0) {
  console.log(`  ⚠️  CLOSE but Δ = ${diff.toFixed(1)}% — may be rounding or model variant difference`);
} else {
  console.log(`  ❌ MISMATCH: Δ = ${diff.toFixed(1)}% — investigate`);
}

// ─── Step-by-step calculation trace for the reference case ───
console.log("\n── Calculation Trace ──────────────────────────────────────────");
const c = PREVENT.female;
const toMmol = (mg) => mg / 38.67;

const a = (50 - 55) / 10;
const nh = toMmol(200 - 45) - 3.5;
const hd = (toMmol(45) - 1.3) / 0.3;
const sl = (Math.min(160, 110) - 110) / 20;
const sh = (Math.max(160, 110) - 130) / 20;
const d = 1, sm = 0, bp = 1, st = 0;
const bl = (Math.min(35, 30) - 25) / 5;
const bh = (Math.max(35, 30) - 30) / 5;
const el = (Math.min(90, 60) - 60) / -15;
const eh = (Math.max(90, 60) - 90) / -15;

console.log(`  Age norm:       a  = (50-55)/10    = ${a}`);
console.log(`  Non-HDL mmol:   nh = ${toMmol(155).toFixed(6)} - 3.5 = ${nh.toFixed(6)}`);
console.log(`  HDL norm:       hd = (${toMmol(45).toFixed(6)} - 1.3) / 0.3 = ${hd.toFixed(6)}`);
console.log(`  SBP <110:       sl = (110-110)/20  = ${sl}`);
console.log(`  SBP ≥110:       sh = (160-130)/20  = ${sh}`);
console.log(`  DM:             d  = ${d}`);
console.log(`  Smoking:        sm = ${sm}`);
console.log(`  BP meds:        bp = ${bp}`);
console.log(`  Statin:         st = ${st}`);
console.log(`  BMI <30:        bl = (30-25)/5     = ${bl}`);
console.log(`  BMI ≥30:        bh = (35-30)/5     = ${bh}`);
console.log(`  eGFR <60:       el = (60-60)/-15   = ${el}`);
console.log(`  eGFR ≥60:       eh = (90-90)/-15   = ${eh}`);

const terms = [
  { name: "age",             val: c.age * a },
  { name: "nonHdlC",         val: c.nonHdlC * nh },
  { name: "hdlC",            val: c.hdlC * hd },
  { name: "sbpLt110",        val: c.sbpLt110 * sl },
  { name: "sbpGte110",       val: c.sbpGte110 * sh },
  { name: "dm",              val: c.dm * d },
  { name: "smoking",         val: c.smoking * sm },
  { name: "bmiLt30",         val: c.bmiLt30 * bl },
  { name: "bmiGte30",        val: c.bmiGte30 * bh },
  { name: "egfrLt60",        val: c.egfrLt60 * el },
  { name: "egfrGte60",       val: c.egfrGte60 * eh },
  { name: "bpTx",            val: c.bpTx * bp },
  { name: "statin",          val: c.statin * st },
  { name: "bpTx×sbpGte110",  val: c.bpTxSbpGte110 * (bp * sh) },
  { name: "statin×nonHdlC",  val: c.statinNonHdlC * (st * nh) },
  { name: "age×nonHdlC",     val: c.ageNonHdlC * (a * nh) },
  { name: "age×hdlC",        val: c.ageHdlC * (a * hd) },
  { name: "age×sbpGte110",   val: c.ageSbpGte110 * (a * sh) },
  { name: "age×dm",          val: c.ageDm * (a * d) },
  { name: "age×smoking",     val: c.ageSmoking * (a * sm) },
  { name: "age×bmiGte30",    val: c.ageBmiGte30 * (a * bh) },
  { name: "age×egfrLt60",    val: c.ageEgfrLt60 * (a * el) },
  { name: "constant",        val: c.constant },
];

let sum = 0;
for (const t of terms) {
  sum += t.val;
  if (t.val !== 0) console.log(`  ${t.name.padEnd(18)} = ${t.val.toFixed(8)}`);
}
console.log(`  ${"─".repeat(38)}`);
console.log(`  Sum (log-odds):    x = ${sum.toFixed(8)}`);
console.log(`  P = exp(x)/(1+exp(x)) = ${(Math.exp(sum)/(1+Math.exp(sum))).toFixed(8)}`);
console.log(`  Risk = ${((Math.exp(sum)/(1+Math.exp(sum)))*100).toFixed(4)}%`);

// ─── Additional cross-validation cases ───
console.log("\n── Additional Cross-Validation Cases ──────────────────────────");

// These are designed to test at the normalization reference points
// where most normalized values = 0, making the result depend mainly on the constant
const refPoint = calcPREVENT({
  age: 55, sex: "male", sbp: 130, bpTx: false,
  totalC: 185.35, hdlC: 50.27, statin: false, dm: false,
  smoking: false, egfr: 90, bmi: 25
});
console.log(`\nReference point male (age=55, SBP=130, nonHdlC=3.5mmol, HDL=1.3mmol):`);
console.log(`  Expected ≈ logistic(constant) = logistic(-3.5007) ≈ 2.9%`);
console.log(`  Got: ${refPoint.rounded}% (raw: ${refPoint.raw.toFixed(4)}%)`);
const expectedRefMale = (Math.exp(-3.5006550)/(1+Math.exp(-3.5006550)))*100;
console.log(`  Pure constant: ${expectedRefMale.toFixed(4)}%`);

const refPointF = calcPREVENT({
  age: 55, sex: "female", sbp: 130, bpTx: false,
  totalC: 185.35, hdlC: 50.27, statin: false, dm: false,
  smoking: false, egfr: 90, bmi: 25
});
console.log(`\nReference point female (age=55, SBP=130, nonHdlC=3.5mmol, HDL=1.3mmol):`);
console.log(`  Expected ≈ logistic(constant) = logistic(-3.8200) ≈ 2.1%`);
console.log(`  Got: ${refPointF.rounded}% (raw: ${refPointF.raw.toFixed(4)}%)`);
const expectedRefFemale = (Math.exp(-3.8199750)/(1+Math.exp(-3.8199750)))*100;
console.log(`  Pure constant: ${expectedRefFemale.toFixed(4)}%`);

console.log("\n══════════════════════════════════════════════════════════════════");
console.log("  Cross-validation complete.");
console.log("══════════════════════════════════════════════════════════════════\n");
