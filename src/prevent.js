// src/prevent.js
// ══════════════════════════════════════════════════════════════════════════════
//  PREVENT-ASCVD calculator and helpers
//  Source: Khan SS et al. Circulation 2024;149:430-449
//  Coefficients extracted from `preventr` R package v0.11.0 (sysdata.rda)
// ══════════════════════════════════════════════════════════════════════════════

// 10-year ASCVD base model (ages 30-79)
// `ageSquared` is included for structural compatibility with the 30-yr model
// (which has a real age² term). The 10-yr model has no age² term so its
// coefficient is 0, making the term mathematically inert.
export const PREVENT_10YR = {
  female: {
    age: 0.7198830, ageSquared: 0.0, nonHdlC: 0.1176967, hdlC: -0.1511850,
    sbpLt110: -0.0835358, sbpGte110: 0.3592852, dm: 0.8348585,
    smoking: 0.4831078, bmiLt30: 0.0, bmiGte30: 0.0,
    egfrLt60: 0.4864619, egfrGte60: 0.0397779, bpTx: 0.2265309,
    statin: -0.0592374, bpTxSbpGte110: -0.0395762, statinNonHdlC: 0.0844423,
    ageNonHdlC: -0.0567839, ageHdlC: 0.0325692, ageSbpGte110: -0.1035985,
    ageDm: -0.2417542, ageSmoking: -0.0791142, ageBmiGte30: 0.0,
    ageEgfrLt60: -0.1671492, constant: -3.8199750,
  },
  male: {
    age: 0.7099847, ageSquared: 0.0, nonHdlC: 0.1658663, hdlC: -0.1144285,
    sbpLt110: -0.2837212, sbpGte110: 0.3239977, dm: 0.7189597,
    smoking: 0.3956973, bmiLt30: 0.0, bmiGte30: 0.0,
    egfrLt60: 0.3690075, egfrGte60: 0.0203619, bpTx: 0.2036522,
    statin: -0.0865581, bpTxSbpGte110: -0.0322916, statinNonHdlC: 0.1145630,
    ageNonHdlC: -0.0300005, ageHdlC: 0.0232747, ageSbpGte110: -0.0927024,
    ageDm: -0.2018525, ageSmoking: -0.0970527, ageBmiGte30: 0.0,
    ageEgfrLt60: -0.1217081, constant: -3.5006550,
  },
};

// 30-year ASCVD base model (ages 30-59)
// Khan SS et al. Circulation 2024 — extracted from preventr v0.11.0 sysdata.rda
// (`base_30yr$female_ascvd` and `base_30yr$male_ascvd`).
// Note: includes age² term not present in the 10-yr model.
// Verified against preventr official tests: 50F=35.4%, 50M=34.9%
// (test-prevent_equations.R "Base model 30-year risks give expected results").
export const PREVENT_30YR = {
  female: {
    age: 0.466920, ageSquared: -0.089312, nonHdlC: 0.125690, hdlC: -0.154225,
    sbpLt110: -0.001809, sbpGte110: 0.322949, dm: 0.629671,
    smoking: 0.268292, bmiLt30: 0.0, bmiGte30: 0.0,
    egfrLt60: 0.100106, egfrGte60: 0.049966, bpTx: 0.187529,
    statin: 0.015248, bpTxSbpGte110: -0.027612, statinNonHdlC: 0.073615,
    ageNonHdlC: -0.052196, ageHdlC: 0.031692, ageSbpGte110: -0.104610,
    ageDm: -0.272779, ageSmoking: -0.153091, ageBmiGte30: 0.0,
    ageEgfrLt60: -0.129915, constant: -1.974074,
  },
  male: {
    age: 0.399410, ageSquared: -0.093748, nonHdlC: 0.174464, hdlC: -0.120203,
    sbpLt110: -0.066512, sbpGte110: 0.275304, dm: 0.479026,
    smoking: 0.178263, bmiLt30: 0.0, bmiGte30: 0.0,
    egfrLt60: -0.021879, egfrGte60: 0.060255, bpTx: 0.142118,
    statin: 0.013600, bpTxSbpGte110: -0.021826, statinNonHdlC: 0.101315,
    ageNonHdlC: -0.031262, ageHdlC: 0.020673, ageSbpGte110: -0.092093,
    ageDm: -0.215995, ageSmoking: -0.154881, ageBmiGte30: 0.0,
    ageEgfrLt60: -0.071255, constant: -1.736444,
  },
};

// ── Total CVD (ASCVD + heart failure) base models ────────────────────────────
// Same predictors/transforms as the ASCVD models; only the coefficients differ.
// Extracted from preventr v0.12.2 sysdata.rda (`base_10yr`/`base_30yr`,
// columns `female_total_cvd` / `male_total_cvd`).
// Verified against preventr tests ("Base model works"): 50F 14.7% / 53.0%,
// 50M 16.3% / 51.4% (10-yr / 30-yr).
// Used by the 2025 AHA/ACC hypertension guideline (BP drug-therapy threshold);
// lipid decisions in this app remain on the ASCVD models above.
export const PREVENT_10YR_CVD = {
  female: {
    age: 0.7939329, ageSquared: 0.0, nonHdlC: 0.0305239, hdlC: -0.1606857,
    sbpLt110: -0.2394003, sbpGte110: 0.3600781, dm: 0.8667604,
    smoking: 0.5360739, bmiLt30: 0.0, bmiGte30: 0.0,
    egfrLt60: 0.6045917, egfrGte60: 0.0433769, bpTx: 0.3151672,
    statin: -0.1477655, bpTxSbpGte110: -0.0663612, statinNonHdlC: 0.1197879,
    ageNonHdlC: -0.0819715, ageHdlC: 0.0306769, ageSbpGte110: -0.0946348,
    ageDm: -0.2705700, ageSmoking: -0.0787150, ageBmiGte30: 0.0,
    ageEgfrLt60: -0.1637806, constant: -3.3077280,
  },
  male: {
    age: 0.7688528, ageSquared: 0.0, nonHdlC: 0.0736174, hdlC: -0.0954431,
    sbpLt110: -0.4347345, sbpGte110: 0.3362658, dm: 0.7692857,
    smoking: 0.4386871, bmiLt30: 0.0, bmiGte30: 0.0,
    egfrLt60: 0.5378979, egfrGte60: 0.0164827, bpTx: 0.2888790,
    statin: -0.1337349, bpTxSbpGte110: -0.0475924, statinNonHdlC: 0.1502730,
    ageNonHdlC: -0.0517874, ageHdlC: 0.0191169, ageSbpGte110: -0.1049477,
    ageDm: -0.2251948, ageSmoking: -0.0895067, ageBmiGte30: 0.0,
    ageEgfrLt60: -0.1543702, constant: -3.0311680,
  },
};

export const PREVENT_30YR_CVD = {
  female: {
    age: 0.5503079, ageSquared: -0.0928369, nonHdlC: 0.0409794, hdlC: -0.1663306,
    sbpLt110: -0.1628654, sbpGte110: 0.3299505, dm: 0.6793894,
    smoking: 0.3196112, bmiLt30: 0.0, bmiGte30: 0.0,
    egfrLt60: 0.1857101, egfrGte60: 0.0553528, bpTx: 0.2894000,
    statin: -0.0756880, bpTxSbpGte110: -0.0563670, statinNonHdlC: 0.1071019,
    ageNonHdlC: -0.0751438, ageHdlC: 0.0301786, ageSbpGte110: -0.0998776,
    ageDm: -0.3206166, ageSmoking: -0.1607862, ageBmiGte30: 0.0,
    ageEgfrLt60: -0.1450788, constant: -1.3188270,
  },
  male: {
    age: 0.4627309, ageSquared: -0.0984281, nonHdlC: 0.0836088, hdlC: -0.1029824,
    sbpLt110: -0.2140352, sbpGte110: 0.2904325, dm: 0.5331276,
    smoking: 0.2141914, bmiLt30: 0.0, bmiGte30: 0.0,
    egfrLt60: 0.1155556, egfrGte60: 0.0603775, bpTx: 0.2327140,
    statin: -0.0272112, bpTxSbpGte110: -0.0384488, statinNonHdlC: 0.1341920,
    ageNonHdlC: -0.0511759, ageHdlC: 0.0165865, ageSbpGte110: -0.1101437,
    ageDm: -0.2585943, ageSmoking: -0.1566406, ageBmiGte30: 0.0,
    ageEgfrLt60: -0.1166776, constant: -1.1482040,
  },
};

// 2025 AHA/ACC hypertension guideline: PREVENT 10-yr total CVD risk at/above
// this value → drug therapy at stage 1 hypertension.
export const CVD_BP_TX_THRESHOLD = 7.5;

// ── Heart failure base models ────────────────────────────────────────────────
// preventr v0.12.2 sysdata.rda, columns `female_heart_failure` / `male_heart_failure`.
// The only PREVENT base model that uses BMI (and it has no lipid or statin terms).
// Verified against preventr tests: 50F 8.1% / 39.0%, 50M 10.6% / 42.4%.
export const PREVENT_10YR_HF = {
  female: {
    age: 0.8998235, ageSquared: 0.0, nonHdlC: 0.0, hdlC: 0.0,
    sbpLt110: -0.4559771, sbpGte110: 0.3576505, dm: 1.0383460,
    smoking: 0.5839160, bmiLt30: -0.0072294, bmiGte30: 0.2997706,
    egfrLt60: 0.7451638, egfrGte60: 0.0557087, bpTx: 0.3534442,
    statin: 0.0, bpTxSbpGte110: -0.0981511, statinNonHdlC: 0.0,
    ageNonHdlC: 0.0, ageHdlC: 0.0, ageSbpGte110: -0.0946663,
    ageDm: -0.3581041, ageSmoking: -0.1159453, ageBmiGte30: -0.0038780,
    ageEgfrLt60: -0.1884289, constant: -4.3104090,
  },
  male: {
    age: 0.8972642, ageSquared: 0.0, nonHdlC: 0.0, hdlC: 0.0,
    sbpLt110: -0.6811466, sbpGte110: 0.3634461, dm: 0.9237760,
    smoking: 0.5023736, bmiLt30: -0.0485841, bmiGte30: 0.3726929,
    egfrLt60: 0.6926917, egfrGte60: 0.0251827, bpTx: 0.2980922,
    statin: 0.0, bpTxSbpGte110: -0.0497731, statinNonHdlC: 0.0,
    ageNonHdlC: 0.0, ageHdlC: 0.0, ageSbpGte110: -0.1289201,
    ageDm: -0.3040924, ageSmoking: -0.1401688, ageBmiGte30: 0.0068126,
    ageEgfrLt60: -0.1797778, constant: -3.9463910,
  },
};

export const PREVENT_30YR_HF = {
  female: {
    age: 0.6254374, ageSquared: -0.0983038, nonHdlC: 0.0, hdlC: 0.0,
    sbpLt110: -0.3919241, sbpGte110: 0.3142295, dm: 0.8330787,
    smoking: 0.3438651, bmiLt30: 0.0594874, bmiGte30: 0.2525536,
    egfrLt60: 0.2981642, egfrGte60: 0.0667159, bpTx: 0.3339210,
    statin: 0.0, bpTxSbpGte110: -0.0893177, statinNonHdlC: 0.0,
    ageNonHdlC: 0.0, ageHdlC: 0.0, ageSbpGte110: -0.0974299,
    ageDm: -0.4048550, ageSmoking: -0.1982991, ageBmiGte30: -0.0035619,
    ageEgfrLt60: -0.1564215, constant: -2.2053790,
  },
  male: {
    age: 0.5681541, ageSquared: -0.1048388, nonHdlC: 0.0, hdlC: 0.0,
    sbpLt110: -0.4761564, sbpGte110: 0.3032400, dm: 0.6840338,
    smoking: 0.2656273, bmiLt30: 0.0833107, bmiGte30: 0.2699900,
    egfrLt60: 0.2541805, egfrGte60: 0.0638923, bpTx: 0.2583631,
    statin: 0.0, bpTxSbpGte110: -0.0391938, statinNonHdlC: 0.0,
    ageNonHdlC: 0.0, ageHdlC: 0.0, ageSbpGte110: -0.1269124,
    ageDm: -0.3273572, ageSmoking: -0.2043019, ageBmiGte30: -0.0182831,
    ageEgfrLt60: -0.1342618, constant: -1.9575100,
  },
};

export const VALID_30YR_AGE_MAX = 59;
// 2026 ACC/AHA Dyslipidemia Guideline §4.2.3.7 rec 3: at low (<3%) 10-yr risk,
// a 30-yr ASCVD risk ≥10% (ages 30–59) makes a moderate-intensity statin reasonable.
export const DISCORDANCE_RISK10_MAX = 3;
export const DISCORDANCE_RISK30_MIN = 10;

function _xbeta(c, { age, sbp, bpTx, totalC, hdlC, statin, dm, smoking, egfr, bmi }) {
  const toMmol = (mg) => mg / 38.67;
  const a = (age - 55) / 10;
  const nh = toMmol(totalC - hdlC) - 3.5;
  const hd = (toMmol(hdlC) - 1.3) / 0.3;
  const sl = (Math.min(sbp, 110) - 110) / 20;
  const sh = (Math.max(sbp, 110) - 130) / 20;
  const d = dm ? 1 : 0, sm = smoking ? 1 : 0, bp = bpTx ? 1 : 0, st = statin ? 1 : 0;
  // BMI enters only the heart-failure model; when blank, a neutral value keeps
  // the (zero-coefficient) BMI terms of the ASCVD / total CVD models finite.
  const bmiV = (bmi === "" || bmi === null || bmi === undefined) ? 25 : Number(bmi);
  const bl = (Math.min(bmiV, 30) - 25) / 5;
  const bh = (Math.max(bmiV, 30) - 30) / 5;
  const el = (Math.min(egfr, 60) - 60) / -15;
  const eh = (Math.max(egfr, 60) - 90) / -15;
  return c.age*a + c.ageSquared*(a*a) +
    c.nonHdlC*nh + c.hdlC*hd + c.sbpLt110*sl + c.sbpGte110*sh +
    c.dm*d + c.smoking*sm + c.bmiLt30*bl + c.bmiGte30*bh +
    c.egfrLt60*el + c.egfrGte60*eh + c.bpTx*bp + c.statin*st +
    c.bpTxSbpGte110*(bp*sh) + c.statinNonHdlC*(st*nh) +
    c.ageNonHdlC*(a*nh) + c.ageHdlC*(a*hd) + c.ageSbpGte110*(a*sh) +
    c.ageDm*(a*d) + c.ageSmoking*(a*sm) + c.ageBmiGte30*(a*bh) +
    c.ageEgfrLt60*(a*el) + c.constant;
}

// BMI is not required: it has a zero coefficient in the ASCVD and total CVD models.
function _hasAllInputs({ age, sbp, totalC, hdlC, egfr }) {
  return Boolean(age && sbp && totalC && hdlC && egfr);
}

export function calcPREVENT10(inputs) {
  if (!_hasAllInputs(inputs)) return null;
  const c = PREVENT_10YR[inputs.sex];
  const x = _xbeta(c, inputs);
  return Math.round((Math.exp(x) / (1 + Math.exp(x))) * 1000) / 10;
}

export function calcPREVENT30(inputs) {
  if (!_hasAllInputs(inputs)) return null;
  const a = Number(inputs.age);
  if (a < 30 || a > VALID_30YR_AGE_MAX) return null;
  const c = PREVENT_30YR[inputs.sex];
  const x = _xbeta(c, inputs);
  return Math.round((Math.exp(x) / (1 + Math.exp(x))) * 1000) / 10;
}

export function calcPREVENT10CVD(inputs) {
  if (!_hasAllInputs(inputs)) return null;
  const x = _xbeta(PREVENT_10YR_CVD[inputs.sex], inputs);
  return Math.round((Math.exp(x) / (1 + Math.exp(x))) * 1000) / 10;
}

export function calcPREVENT30CVD(inputs) {
  if (!_hasAllInputs(inputs)) return null;
  const a = Number(inputs.age);
  if (a < 30 || a > VALID_30YR_AGE_MAX) return null;
  const x = _xbeta(PREVENT_30YR_CVD[inputs.sex], inputs);
  return Math.round((Math.exp(x) / (1 + Math.exp(x))) * 1000) / 10;
}

// Heart failure risk needs BMI in addition to the other inputs.
export function calcPREVENT10HF(inputs) {
  if (!_hasAllInputs(inputs) || !inputs.bmi) return null;
  const x = _xbeta(PREVENT_10YR_HF[inputs.sex], inputs);
  return Math.round((Math.exp(x) / (1 + Math.exp(x))) * 1000) / 10;
}

export function calcPREVENT30HF(inputs) {
  if (!_hasAllInputs(inputs) || !inputs.bmi) return null;
  const a = Number(inputs.age);
  if (a < 30 || a > VALID_30YR_AGE_MAX) return null;
  const x = _xbeta(PREVENT_30YR_HF[inputs.sex], inputs);
  return Math.round((Math.exp(x) / (1 + Math.exp(x))) * 1000) / 10;
}

export function riskCat10(r) {
  if (r === null) return null;
  if (r < 3)  return { label: "Low",          color: "#15803d", darkColor: "#55b385", rank: 1, range: "<3%" };
  if (r < 5)  return { label: "Borderline",   color: "#a16207", darkColor: "#d9a94e", rank: 2, range: "3–<5%" };
  if (r < 10) return { label: "Intermediate", color: "#c2410c", darkColor: "#e8875e", rank: 3, range: "5–<10%" };
  return         { label: "High",          color: "#b91c1c", darkColor: "#e2635e", rank: 4, range: "≥10%" };
}

// The guideline defines one 30-yr threshold (≥10%, §4.2.3.7 recs 2–3); it does
// not define borderline / intermediate / high bands for 30-yr risk.
export const RISK30_THRESHOLD = 10;
export function riskCat30(r) {
  if (r === null) return null;
  if (r < RISK30_THRESHOLD) return { label: "Low", color: "#15803d", darkColor: "#55b385", rank: 1, range: "<10%" };
  return { label: "Elevated", color: "#c2410c", darkColor: "#e8875e", rank: 3, range: "≥10%" };
}

export function discordance(risk10, risk30, age) {
  if (risk10 === null || risk30 === null) return false;
  const a = Number(age);
  if (a < 30 || a > VALID_30YR_AGE_MAX) return false;
  return risk10 < DISCORDANCE_RISK10_MAX && risk30 >= DISCORDANCE_RISK30_MIN;
}

// BMI is not optimized: it has no effect on the ASCVD models.
export function optimizedInputs(inputs) {
  const sbp = Math.min(Number(inputs.sbp), 110);
  const hdlC = Math.max(Number(inputs.hdlC), 50);
  const currentNonHdl = Number(inputs.totalC) - Number(inputs.hdlC);
  const targetNonHdl = Math.min(currentNonHdl, 120);
  const totalC = targetNonHdl + hdlC;
  return {
    ...inputs,
    sbp,
    bpTx: false,
    smoking: false,
    hdlC,
    totalC,
    statin: false,
  };
}

const NOISE_FLOOR = 0.5;

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
    { factor: "bp",      label: "Blood Pressure", override: { sbp: Math.min(Number(inputs.sbp), 110), bpTx: false } },
    { factor: "lipids",  label: "Lipids",         override: _lipidsOverride(inputs) },
    { factor: "smoking", label: "Smoking",        override: { smoking: false } },
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
