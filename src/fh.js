// src/fh.js
// ══════════════════════════════════════════════════════════════════════════════
//  Familial hypercholesterolemia helpers
//  Dutch Lipid Clinic Network (DLCN) diagnostic score — WHO 1998
//  (WHO/HGN/FH/CONS/99.2, Table 8) and Nordestgaard BG et al. Eur Heart J
//  2013;34:3478-90 (EAS consensus, Table 1): "per group only one score, the
//  highest applicable, can be chosen." Adults only — not valid in children.
//  LDL-C bands: mmol/L cut-offs are identical in both sources (8.5 / 6.5 /
//  5.0 / 4.0); mg/dL here follow WHO 1998 (≥330 / 250–329 / 190–249 /
//  155–189). EAS 2013 prints >325 / 251–325 / 191–250 / 155–190.
// ══════════════════════════════════════════════════════════════════════════════

export const DLCN_GROUPS = [
  { id: "family", l: "Family History", items: [
    { id: "fam_xanth", pts: 2, l: "1st-degree relative with tendon xanthoma / arcus cornealis", d: "or child <18 y with LDL-C >95th percentile" },
    { id: "fam_cad",   pts: 1, l: "1st-degree relative with premature CAD / vascular disease", d: "Male <55 y, female <60 y — or relative with LDL-C >95th percentile" },
  ]},
  { id: "clinical", l: "Patient History", items: [
    { id: "pt_cad", pts: 2, l: "Premature coronary artery disease", d: "Male <55 y, female <60 y" },
    { id: "pt_vasc", pts: 1, l: "Premature cerebral or peripheral vascular disease", d: "Male <55 y, female <60 y" },
  ]},
  { id: "exam", l: "Physical Exam", items: [
    { id: "ex_xanth", pts: 6, l: "Tendon xanthoma", d: "Achilles, extensor tendons of hands" },
    { id: "ex_arcus", pts: 4, l: "Arcus cornealis before age 45", d: null },
  ]},
  { id: "dna", l: "Genetic Test", items: [
    { id: "dna_pos", pts: 8, l: "Pathogenic variant: LDLR, APOB, or PCSK9", d: null },
  ]},
];

// Untreated LDL-C bands (mg/dL)
export const DLCN_LDL_BANDS = [
  { min: 330, pts: 8, range: "≥330" },
  { min: 250, pts: 5, range: "250–329" },
  { min: 190, pts: 3, range: "190–249" },
  { min: 155, pts: 1, range: "155–189" },
];

export function dlcnLdlPoints(ldl) {
  if (ldl === "" || ldl === null || ldl === undefined) return 0;
  const v = Number(ldl);
  if (!Number.isFinite(v)) return 0;
  for (const b of DLCN_LDL_BANDS) if (v >= b.min) return b.pts;
  return 0;
}

export function dlcnCategory(score) {
  if (score > 8)  return { id: "definite", label: "Definite FH", range: ">8",  clr: "red" };
  if (score >= 6) return { id: "probable", label: "Probable FH", range: "6–8", clr: "orange" };
  if (score >= 3) return { id: "possible", label: "Possible FH", range: "3–5", clr: "amber" };
  return            { id: "unlikely", label: "Unlikely FH", range: "<3",  clr: "slate" };
}

// checked: { [itemId]: true }, ldl: untreated LDL-C in mg/dL
export function dlcnScore(checked = {}, ldl = "") {
  const byGroup = {};
  for (const g of DLCN_GROUPS) {
    byGroup[g.id] = g.items.reduce((m, it) => (checked[it.id] ? Math.max(m, it.pts) : m), 0);
  }
  byGroup.ldl = dlcnLdlPoints(ldl);
  const score = Object.values(byGroup).reduce((a, b) => a + b, 0);
  return { score, byGroup, cat: dlcnCategory(score) };
}

// ── Untreated LDL-C estimate for patients already on therapy ─────────────────
// Haralambos K et al. Atherosclerosis 2015;240:190-196, Table 2:
// untreated LDL-C ≈ measured LDL-C × correction factor.
// doses: { mg: [factor alone, factor with ezetimibe 10 mg] }; null = not published.
export const LDL_CORRECTION = {
  none:   { l: "None",   name: "No statin",    doses: { 0: [1.0, 1.2] } },
  prava:  { l: "Prava",  name: "Pravastatin",  doses: { 10: [1.2, 1.5], 20: [1.3, 1.6], 40: [1.5, 1.7] } },
  simva:  { l: "Simva",  name: "Simvastatin",  doses: { 10: [1.4, 1.9], 20: [1.6, 2.0], 40: [1.7, 2.3], 80: [1.9, 2.4] } },
  atorva: { l: "Atorva", name: "Atorvastatin", doses: { 10: [1.6, 2.0], 20: [1.8, 2.2], 40: [2.0, 2.2], 80: [2.2, 2.5] } },
  rosuva: { l: "Rosuva", name: "Rosuvastatin", doses: { 5: [1.8, null], 10: [1.9, 2.5], 20: [2.1, 2.7], 40: [2.4, 3.3] } },
};

// → factor, or null when the table has no entry for the combination
export function ldlCorrectionFactor({ statin = "none", dose = 0, eze = false } = {}) {
  const row = LDL_CORRECTION[statin]?.doses?.[statin === "none" ? 0 : dose];
  if (!row) return null;
  return row[eze ? 1 : 0];
}

export function estimateUntreatedLdl(onTxLdl, factor) {
  if (onTxLdl === "" || onTxLdl === null || onTxLdl === undefined) return null;
  const v = Number(onTxLdl), f = Number(factor);
  if (!Number.isFinite(v) || !Number.isFinite(f) || v <= 0 || f < 1) return null;
  return Math.round(v * f);
}

// Untreated LDL-C above this (mg/dL; >10 mmol/L) is suggestive of homozygous FH
// — Cuchel M et al. Eur Heart J 2023;44:2277-91 (EAS consensus).
export const HOFH_UNTREATED_LDL = 400;

// ── LDL-C goal in severe hypercholesterolemia (LDL-C ≥190 mg/dL) ─────────────
// 2026 ACC/AHA Dyslipidemia Guideline §4.2.4.3, recs 3–5:
//   no HeFH / additional ASCVD risk factors / subclinical atherosclerosis → <100 (non-HDL <130)
//   clinical or genetic HeFH, additional ASCVD risk factors, or documented
//   coronary calcification                                               → <70  (non-HDL <100)
//   clinical ASCVD                                                       → <55  (non-HDL <85)
export function severeGoal({ ascvd, hefh, rf, cac } = {}) {
  if (ascvd) return { ldl: 55, nh: 85, tier: "ascvd" };
  if (hefh || rf || cac) return { ldl: 70, nh: 100, tier: "enhanced" };
  return { ldl: 100, nh: 130, tier: "base" };
}

// DLCN ≥6 (probable/definite) is treated as clinical confirmation of HeFH.
export const DLCN_CLINICAL_FH_MIN = 6;
