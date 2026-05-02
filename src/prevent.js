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

export const VALID_30YR_AGE_MAX = 59;
export const DISCORDANCE_RISK10_MAX = 5;
export const DISCORDANCE_RISK30_MIN = 20;

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
  return c.age*a + c.ageSquared*(a*a) +
    c.nonHdlC*nh + c.hdlC*hd + c.sbpLt110*sl + c.sbpGte110*sh +
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

export function calcPREVENT30(inputs) {
  if (!_hasAllInputs(inputs)) return null;
  const a = Number(inputs.age);
  if (a < 30 || a > VALID_30YR_AGE_MAX) return null;
  const c = PREVENT_30YR[inputs.sex];
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

export function riskCat30(r) {
  if (r === null) return null;
  if (r < 10) return { label: "Low",          color: "#16a34a", bg: "#f0fdf4", darkBg: "rgba(16, 185, 129, 0.08)", range: "<10%" };
  if (r < 20) return { label: "Borderline",   color: "#ca8a04", bg: "#fefce8", darkBg: "rgba(202, 138, 4, 0.10)",  range: "10–<20%" };
  if (r < 30) return { label: "Intermediate", color: "#ea580c", bg: "#fff7ed", darkBg: "rgba(234, 88, 12, 0.10)",  range: "20–<30%" };
  return         { label: "High",          color: "#dc2626", bg: "#fef2f2", darkBg: "rgba(220, 38, 38, 0.10)",  range: "≥30%" };
}

export function discordance(risk10, risk30, age) {
  if (risk10 === null || risk30 === null) return false;
  const a = Number(age);
  if (a < 30 || a > VALID_30YR_AGE_MAX) return false;
  return risk10 < DISCORDANCE_RISK10_MAX && risk30 >= DISCORDANCE_RISK30_MIN;
}

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
