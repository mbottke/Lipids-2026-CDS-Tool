// src/fh.js
// ══════════════════════════════════════════════════════════════════════════════
//  Familial hypercholesterolemia helpers
//  Dutch Lipid Clinic Network (DLCN) diagnostic score — WHO 1998 /
//  Nordestgaard BG et al. Eur Heart J 2013;34:3478-90 (EAS consensus, Table 2).
//  Only the highest-scoring item within each group counts.
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

// Back-calculate untreated LDL-C from an on-treatment value.
// pctReduction = expected % LDL-C lowering of the current regimen (0–95).
export function estimateUntreatedLdl(onTxLdl, pctReduction) {
  if (onTxLdl === "" || onTxLdl === null || onTxLdl === undefined) return null;
  const v = Number(onTxLdl), p = Number(pctReduction);
  if (!Number.isFinite(v) || !Number.isFinite(p) || v <= 0 || p <= 0 || p >= 95) return null;
  return Math.round(v / (1 - p / 100));
}
