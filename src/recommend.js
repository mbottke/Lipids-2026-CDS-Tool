// src/recommend.js
// ══════════════════════════════════════════════════════════════════════════════
//  Recommendation logic — 2026 ACC/AHA/Multisociety Dyslipidemia Guideline
//  (Blumenthal RS et al. JACC 2026;87:2624-2757 / Circulation 2026;153:e1154-e1276)
//  Section and recommendation numbers are cited beside each rule.
//  Pure functions only; App.jsx supplies state.
// ══════════════════════════════════════════════════════════════════════════════

import { severeGoal } from "./fh.js";

const blank = (v) => v === "" || v === null || v === undefined;
const count = (o = {}) => Object.values(o).filter(Boolean).length;
const G100 = (p = 30) => ({ ldl: 100, nh: 130, p });
const G70 = { ldl: 70, nh: 100, p: 50 };
const G55 = { ldl: 55, nh: 85, p: 50 };

// ── Clinical ASCVD: very high risk (§2.1 definition; Figure 10) ───────────────
// ≥2 major ASCVD events, or 1 major event + ≥2 high-risk features.
export const VHR_MAJOR = [
  { id: "acs",    l: "ACS within the past 12 months", d: "MI or unstable angina" },
  { id: "mi",     l: "Prior MI", d: "Other than the recent ACS above" },
  { id: "stroke", l: "Ischemic stroke", d: "Any history" },
  { id: "pad",    l: "Symptomatic PAD", d: "Peripheral artery disease with symptoms" },
  { id: "recurrent", l: "Repeat event of the same type", d: "A second MI or a second ischemic stroke counts as another major event" },
];
const VHR_EVENT_TYPES = ["acs", "mi", "stroke", "pad"];
export const VHR_FEATURES = [
  { id: "age65",  l: "Age ≥65 years", d: null },
  { id: "revasc", l: "Prior CABG or PCI", d: null },
  { id: "smoker", l: "Current smoker", d: null },
  { id: "dm",     l: "Diabetes", d: null },
  { id: "hf",     l: "History of heart failure", d: null },
  { id: "htn",    l: "Hypertension", d: null },
  { id: "ldl100", l: "LDL-C ≥100 on statin + ezetimibe", d: "Despite maximally tolerated statin plus ezetimibe" },
];

// Events are counted, not event types: two MIs are two major events. "recurrent"
// adds one event to the types checked (and stands for two when checked alone).
export function vhrStatus(major = {}, feat = {}) {
  const types = VHR_EVENT_TYPES.filter(k => major[k]).length;
  const majors = types + (major.recurrent ? (types === 0 ? 2 : 1) : 0);
  const features = count(feat);
  return { majors, features, vhr: majors >= 2 || (majors >= 1 && features >= 2) };
}

// ── Secondary prevention (§4.2.6; CKD §4.2.8.8 rec 2; LDL ≥190 §4.2.4.3 rec 5) ─
export function recSecondary({ major = {}, feat = {}, ckd = false, severe = false } = {}) {
  const s = vhrStatus(major, feat);
  if (s.vhr) return { g: G55, int: "high", esc: true, clr: "red", vhr: true,
    txt: "Very high-risk ASCVD. High-intensity statin, then ezetimibe and/or a PCSK9 mAb to LDL below 55 mg/dL." };
  if (ckd) return { g: G55, int: "high", esc: true, clr: "red", vhr: false,
    txt: "ASCVD with CKD stage ≥3. High-intensity statin, with ezetimibe and/or a PCSK9 mAb as needed, to LDL below 55 mg/dL." };
  if (severe) return { g: G55, int: "high", esc: true, clr: "red", vhr: false,
    txt: "ASCVD with LDL-C ≥190 or HeFH. High-intensity statin plus nonstatin therapy to LDL below 55 mg/dL." };
  return { g: G70, int: "high", esc: true, clr: "orange", vhr: false,
    txt: "Clinical ASCVD, not very high risk. High-intensity statin to LDL below 70 mg/dL. Lowering further to below 55 is reasonable." };
}

// ── Diabetes without ASCVD (§4.2.5; Table 17; Figures 1 and 9) ────────────────
export const DM_ENHANCERS = [
  { id: "dur_t2",  l: "Type 2 DM ≥10 years", d: "Long duration" },
  { id: "dur_t1",  l: "Type 1 DM ≥20 years", d: "Long duration" },
  { id: "alb",     l: "Albuminuria ≥30 mg/g", d: "Urine albumin-to-creatinine ratio (uACR)" },
  { id: "egfr_dm", l: "eGFR <60", d: "mL/min/1.73 m²" },
  { id: "retino",  l: "Retinopathy", d: null },
  { id: "neuro",   l: "Neuropathy", d: null },
  { id: "abi_dm",  l: "ABI <0.9", d: "Ankle-brachial index" },
];

// → "base" (<100) or "high" (<70)
export function dmTier({ enhCount = 0, rf = false, risk10 = null } = {}) {
  return (rf || enhCount > 0 || (risk10 !== null && risk10 >= 10)) ? "high" : "base";
}

export function recDiabetes({ age = "", enhCount = 0, rf = false, risk10 = null } = {}) {
  const a = blank(age) ? null : Number(age);
  if (a !== null && a < 40) {
    return enhCount > 0
      ? { g: G100(30), int: "moderate", esc: false, clr: "violet", tier: "young",
          txt: "Diabetes, age 20 to 39, with a diabetes-specific risk enhancer. A moderate-intensity statin may be reasonable." }
      : { g: null, int: "lifestyle", esc: false, clr: "blue", tier: "young",
          txt: "Diabetes, age 20 to 39, without risk enhancers. Lifestyle optimization. From age 30, use PREVENT-ASCVD on the Primary tab to guide statin therapy." };
  }
  if (a !== null && a > 75) {
    return { g: G100(30), int: "moderate", esc: false, clr: "violet", tier: "older",
      txt: "Diabetes, age over 75. A moderate-intensity statin may be reasonable after a benefit-risk discussion when life expectancy is at least 2.5 years." };
  }
  if (dmTier({ enhCount, rf, risk10 }) === "high") {
    return { g: G70, int: "high", esc: true, clr: "violet", tier: "high",
      txt: "Diabetes with multiple ASCVD risk factors, a diabetes-specific risk enhancer, or PREVENT-ASCVD ≥10%. High-intensity statin to LDL below 70 mg/dL." };
  }
  return { g: G100(30), int: "moderate", esc: false, clr: "violet", tier: "base",
    txt: "Diabetes, age 40 to 75. Moderate-intensity statin to LDL below 100 mg/dL, whatever the risk estimate." };
}

// ── LDL-C ≥190 (§4.2.4.3 recs 2–5) ────────────────────────────────────────────
export function recSevere(factors = {}) {
  const sg = severeGoal(factors);
  const g = { ldl: sg.ldl, nh: sg.nh, p: 50 };
  if (sg.tier === "ascvd") return { g, int: "high", esc: true, clr: "red", tier: sg.tier,
    txt: "LDL-C ≥190 with clinical ASCVD. High-intensity statin plus nonstatin therapy to LDL below 55 mg/dL." };
  if (sg.tier === "enhanced") return { g, int: "high", esc: true, clr: "red", tier: sg.tier,
    txt: "LDL-C ≥190 with HeFH, additional ASCVD risk factors, or coronary calcification. High-intensity statin plus nonstatin therapy to LDL below 70 mg/dL." };
  return { g, int: "high", esc: true, clr: "red", tier: sg.tier,
    txt: "LDL-C ≥190. High-intensity statin, adding nonstatin therapy to LDL below 100 mg/dL. Evaluate for familial hypercholesterolemia." };
}

// ── Primary prevention, LDL-C 70–189 (§4.2.3.6, §4.2.3.7, §4.2.7) ─────────────
// CAC = 0 defers therapy only at borderline/intermediate risk and without a
// higher-risk condition (§4.2.3.6 rec 2).
export function cacZeroBlockers({ smoking = false, dm = false, age = "", fhx = false } = {}) {
  const out = [];
  if (smoking) out.push("current smoking");
  if (dm && Number(age) > 40) out.push("diabetes");
  if (fhx) out.push("family history of premature ASCVD");
  return out;
}

export function recPrimary({ risk10 = null, risk30 = null, age = "", ldl = "", enhCount = 0,
  cac = "", cacPct = "", smoking = false, dm = false, fhx = false, egfr = "" } = {}) {
  if (risk10 === null) return null;
  const a = blank(age) ? null : Number(age);
  const mid = a !== null && a >= 40 && a <= 75;
  const ckd3 = !blank(egfr) && Number(egfr) < 60;
  let note = null;

  const base = () => {
    if (!blank(cac)) {
      const c = Number(cac), p = blank(cacPct) ? null : Number(cacPct);
      if (c === 0) {
        const blockers = cacZeroBlockers({ smoking, dm, age, fhx });
        if (risk10 >= 10) note = "CAC of zero does not defer therapy at high (≥10%) risk.";
        else if (blockers.length) note = `CAC of zero does not defer therapy with ${blockers.join(", ")}.`;
        else return { g: null, int: "none", esc: false, clr: "emerald", src: "cac0",
          txt: "CAC of zero. Reasonable to defer a statin and focus on lifestyle. Repeat CAC in 3 to 7 years." };
      } else {
        if (c >= 1000) return { g: G55, int: "high", esc: true, clr: "red", src: "cac",
          txt: "CAC ≥1000. Lipid-lowering therapy to LDL below 55 mg/dL with at least 50% reduction." };
        if (c >= 300) return { g: G70, int: "high", esc: true, clr: "amber", src: "cac",
          txt: "CAC 300–999. High-intensity statin to LDL below 70 mg/dL. Intensifying to below 55 is reasonable." };
        if (c >= 100 || (p !== null && p >= 75)) return { g: G70, int: "high", esc: true, clr: "amber", src: "cac",
          txt: "CAC 100–299 or ≥75th percentile. High-intensity statin to LDL below 70 mg/dL." };
        return { g: G100(30), int: "moderate", esc: false, clr: "blue", src: "cac",
          txt: "CAC 1–99, below the 75th percentile. Moderate-intensity statin to LDL below 100 mg/dL." };
      }
    }
    if (risk10 >= 10) return { g: G70, int: "high", esc: true, clr: "red", src: "risk",
      txt: "High 10-year risk (≥10%). High-intensity statin to LDL below 70 mg/dL." };
    if (risk10 >= 5) return { g: G100(30), int: "moderate", esc: false, clr: "amber", src: "risk",
      txt: "Intermediate risk (5 to <10%). At least a moderate-intensity statin to LDL below 100 mg/dL, high-intensity at the upper end of the range." };
    if (risk10 >= 3 && enhCount > 0) return { g: G100(30), int: "moderate", esc: false, clr: "amber", src: "risk",
      txt: `Borderline risk (3 to <5%) with ${enhCount} risk enhancer${enhCount > 1 ? "s" : ""}. A moderate-intensity statin to LDL below 100 mg/dL is reasonable.` };
    if (risk10 >= 3) return { g: G100(30), int: "lifestyle", esc: false, clr: "blue", src: "risk",
      txt: "Borderline risk (3 to <5%). Lifestyle optimization. A moderate-intensity statin is reasonable if risk enhancers are present or after shared decision-making." };
    // Low 10-yr risk: 30-yr risk and LDL-C decide (§4.2.3.7 recs 2–3), ages 30–59
    const young = a !== null && a >= 30 && a <= 59;
    const ldlHigh = !blank(ldl) && Number(ldl) >= 160 && Number(ldl) < 190;
    const lifetime = risk30 !== null && risk30 >= 10;
    if (young && (lifetime || ldlHigh)) return { g: G100(30), int: "moderate", esc: false, clr: "amber", src: "lifetime",
      txt: `Low 10-year risk (<3%) with ${lifetime ? "30-year risk ≥10%" : ""}${lifetime && ldlHigh ? " and " : ""}${ldlHigh ? "LDL-C 160–189" : ""}. A moderate-intensity statin is reasonable to reduce lifetime LDL exposure.` };
    return { g: null, int: "none", esc: false, clr: "emerald", src: "risk",
      txt: "Low risk (<3%). Lifestyle optimization with periodic reassessment." };
  };

  let r = base();
  // Statin is indicated at age 40–75 whatever the risk estimate:
  // diabetes (§4.2.5 rec 1) and CKD stage ≥3 (§4.2.8.8 rec 1).
  if (mid && (dm || ckd3) && (r.int === "none" || r.int === "lifestyle")) {
    const why = dm && ckd3 ? "Diabetes and CKD stage ≥3" : dm ? "Diabetes" : "CKD stage ≥3";
    r = { g: G100(30), int: "moderate", esc: false, clr: "amber", src: dm ? "dm" : "ckd",
      txt: `${why}, age 40 to 75. Moderate-intensity statin${!dm ? " (with or without ezetimibe)" : ""} to LDL below 100 mg/dL, whatever the risk estimate.` };
  }
  return note ? { ...r, note } : r;
}

// ── Biomarkers ────────────────────────────────────────────────────────────────
// Lp(a), nmol/L — Table 4: 125 → 1.4-fold, 250 → 2-fold ASCVD risk; ≥125 is a
// risk enhancer (Table 13).
export function lpaInterpret(val) {
  if (blank(val)) return null;
  const v = Number(val);
  if (v >= 250) return { lv: "Very high", c: "red", n: "≈2× ASCVD risk. Control every modifiable risk factor early. With ASCVD above goal, add a PCSK9 mAb." };
  if (v >= 125) return { lv: "Elevated", c: "amber", n: "≈1.4× ASCVD risk. Counts as a risk enhancer. Control modifiable risk factors early." };
  return { lv: "Normal", c: "emerald", n: "Not a risk enhancer." };
}

// ApoB goal that pairs with each LDL-C goal (Figure 1): <100 ↔ <90, <70 ↔ <70, <55 ↔ <55.
export const apoBGoalFor = (ldlGoal) => ({ 100: 90, 70: 70, 55: 55 })[ldlGoal] ?? null;
export const APOB_ENHANCER = 120; // Table 13

export function apoBInterpret(val, ldlGoal = null) {
  if (blank(val)) return null;
  const v = Number(val), goal = apoBGoalFor(ldlGoal);
  if (goal !== null) {
    return v < goal
      ? { lv: "At goal", c: "emerald", goal, n: `Below ${goal} mg/dL, the apoB goal paired with LDL-C below ${ldlGoal}.` }
      : { lv: "Above goal", c: v >= APOB_ENHANCER ? "red" : "amber", goal, n: `At or above ${goal} mg/dL, the apoB goal paired with LDL-C below ${ldlGoal}. Intensify if LDL-C and non-HDL-C are already at goal.` };
  }
  return v >= APOB_ENHANCER
    ? { lv: "Elevated", c: "amber", goal: null, n: `At or above ${APOB_ENHANCER} mg/dL: counts as a risk enhancer and favors starting therapy.` }
    : { lv: "Not Elevated", c: "emerald", goal: null, n: `Below the ${APOB_ENHANCER} mg/dL risk-enhancer threshold.` };
}

// ── Hypertriglyceridemia (§4.2.9) ─────────────────────────────────────────────
export function tgAdvice(tg) {
  if (blank(tg)) return null;
  const v = Number(tg);
  if (v < 150) return null;
  if (v >= 1000) return { sev: "severe",
    txt: "Severe (≥1000): pancreatitis risk. Fibrate or prescription omega-3 after dietary intervention. Olezarsen if familial chylomicronemia syndrome. Look for secondary causes. Fenofibrate is contraindicated with eGFR <30 or active liver or gallbladder disease. Never gemfibrozil with a statin." };
  if (v >= 500) return { sev: "severe",
    txt: "Severe (500–999): a fibrate or prescription omega-3 is reasonable to lower pancreatitis risk after dietary intervention. Look for secondary causes. Fenofibrate is contraindicated with eGFR <30 or active liver or gallbladder disease. Never gemfibrozil with a statin." };
  return { sev: "moderate",
    txt: "Lifestyle first: less added sugar, alcohol and saturated fat, regular exercise, 5–10% weight loss. The statin decision follows ASCVD risk. Track non-HDL-C or apoB rather than LDL-C. Icosapent ethyl may be reasonable at age ≥50 with ASCVD, or diabetes plus at least one risk factor, once LDL is below 100 on a statin (REDUCE-IT: AF and bleeding signals)." };
}

// ── Goal status for the plan ─────────────────────────────────────────────────
// Every goal is written "<N", so "at goal" means strictly below it.
// ldl and goal are mg/dL. → null when either is missing.
export function goalStatus(ldl, goal) {
  if (ldl === "" || ldl === null || ldl === undefined || goal === null || goal === undefined) return null;
  const v = Number(ldl);
  if (!Number.isFinite(v) || v <= 0) return null;
  const above = v - goal;
  return { atGoal: v < goal, above, needed: above > 0 ? Math.round((above / v) * 100) : 0 };
}

// ── Plan sentence in the active unit ─────────────────────────────────────────
// The sentences above are written in mg/dL. In mmol/L mode the LDL-C values in
// them are converted for display. CAC scores and percentages are left alone.
const MGDL_PER_MMOL = 38.67;
export function inUnit(txt, si) {
  if (!si || !txt) return txt;
  const c = (n) => (Number(n) / MGDL_PER_MMOL).toFixed(1);
  return txt
    .replace(/below (\d+) mg\/dL/g, (_, n) => `below ${c(n)} mmol/L`)
    .replace(/below (\d+) is reasonable/g, (_, n) => `below ${c(n)} is reasonable`)
    .replace(/LDL-C ≥(\d+)/g, (_, n) => `LDL-C ≥${c(n)}`)
    .replace(/LDL-C (\d+)–(\d+)/g, (_, a, b) => `LDL-C ${c(a)}–${c(b)}`);
}
