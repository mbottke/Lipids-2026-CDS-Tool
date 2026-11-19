// src/bp.js
// ══════════════════════════════════════════════════════════════════════════════
//  Blood pressure logic — 2025 AHA/ACC/Multisociety High Blood Pressure Guideline
//  Jones DW et al. Circulation 2025;152:e114-e218 / JACC 2025;86:1567-1678
//  Table 4 (categories), §5.2.2 (drug-therapy thresholds), §5.2.4 (initial
//  therapy), §5.2.7 (goals), Figures 6–7 (follow-up).
// ══════════════════════════════════════════════════════════════════════════════

import { CVD_BP_TX_THRESHOLD } from "./prevent.js";

const blank = (v) => v === "" || v === null || v === undefined;

// SBP and DBP in different categories → the higher category applies.
// DBP may be blank; the category then rests on SBP alone.
export function bpCategory(sbp, dbp) {
  if (blank(sbp)) return null;
  const s = Number(sbp), d = blank(dbp) ? null : Number(dbp);
  if (!Number.isFinite(s)) return null;
  if (s > 180 || (d !== null && d > 120)) return { id: "severe",   label: "Severe (>180/120)",  clr: "red" };
  if (s >= 140 || (d !== null && d >= 90)) return { id: "stage2",   label: "Stage 2",            clr: "red" };
  if (s >= 130 || (d !== null && d >= 80)) return { id: "stage1",   label: "Stage 1",            clr: "amber" };
  if (s >= 120)                            return { id: "elevated", label: "Elevated",           clr: "blue" };
  return                                          { id: "normal",   label: "Normal",             clr: "emerald" };
}

// High-risk conditions that move the drug-therapy threshold to ≥130/80 without
// a lifestyle-first trial. Returns the list of reasons (empty → not high risk).
export function bpRiskReasons({ clinicalCvd, dm, ckd, cvd10 }) {
  const out = [];
  if (clinicalCvd) out.push("clinical CVD");
  if (dm) out.push("diabetes");
  if (ckd) out.push("CKD");
  if (cvd10 !== null && cvd10 !== undefined && cvd10 >= CVD_BP_TX_THRESHOLD) out.push(`total CVD risk ${cvd10}%`);
  return out;
}

// → { cat, reasons, riskKnown, action: { id, tone, title, detail } } or null
export function bpPlan({ sbp, dbp, onTx, cvd10 = null, clinicalCvd = false, dm = false, ckd = false }) {
  const cat = bpCategory(sbp, dbp);
  if (!cat) return null;
  const reasons = bpRiskReasons({ clinicalCvd, dm, ckd, cvd10 });
  const highRisk = reasons.length > 0;
  const riskKnown = highRisk || (cvd10 !== null && cvd10 !== undefined);
  let action;

  if (cat.id === "severe") {
    action = { id: "severe", tone: "red",
      title: "Check for acute target-organ damage",
      detail: "If none, start, restart, or intensify oral therapy promptly as an outpatient. If present, this is a hypertensive emergency (ICU)." };
  } else if (onTx) {
    action = (cat.id === "normal" || cat.id === "elevated")
      ? { id: "at_goal", tone: "emerald",
          title: "At goal on therapy",
          detail: cat.id === "elevated" ? "Systolic <120 is encouraged if tolerated. Reassess in 3–6 months." : "Reassess in 3–6 months." }
      : { id: "intensify", tone: "amber",
          title: "Above goal on therapy: intensify",
          detail: "Confirm adherence and home BP, then titrate or add the next class. Reassess monthly until controlled." };
  } else if (cat.id === "stage2") {
    action = { id: "start_two", tone: "red",
      title: "Start drug therapy now with 2 agents",
      detail: "Two first-line agents from different classes, ideally one single-pill combination, plus lifestyle. Reassess in 1 month." };
  } else if (cat.id === "stage1") {
    if (highRisk) {
      action = { id: "start_one", tone: "amber",
        title: "Start drug therapy now",
        detail: `The ≥130/80 threshold applies (${reasons.join(", ")}). One first-line agent is reasonable: titrate, then add. Reassess in 1 month.` };
    } else if (riskKnown) {
      action = { id: "lifestyle_first", tone: "blue",
        title: "Lifestyle for 3–6 months first",
        detail: `10-year total CVD risk ${cvd10}% (<${CVD_BP_TX_THRESHOLD}%), with no CVD, diabetes, or CKD. Start drug therapy if still ≥130/80 afterward.` };
    } else {
      action = { id: "need_risk", tone: "blue",
        title: "Risk decides timing",
        detail: `With clinical CVD, diabetes, CKD, or 10-year total CVD risk ≥${CVD_BP_TX_THRESHOLD}%, start drug therapy now. Otherwise lifestyle for 3–6 months first. Complete the PREVENT inputs on the Primary tab.` };
    }
  } else if (cat.id === "elevated") {
    action = { id: "lifestyle", tone: "blue", title: "Lifestyle only", detail: "No drug therapy. Reassess in 3–6 months." };
  } else {
    action = { id: "none", tone: "emerald", title: "No treatment needed", detail: "Reassess in 1 year." };
  }
  return { cat, reasons, highRisk, riskKnown, action };
}
