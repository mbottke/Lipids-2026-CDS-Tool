#!/usr/bin/env node
// test-fh.mjs — Dutch Lipid Clinic Network score + untreated-LDL estimate

import { dlcnScore, dlcnLdlPoints, dlcnCategory, estimateUntreatedLdl, ldlCorrectionFactor, DLCN_GROUPS } from "./src/fh.js";

let pass = 0, fail = 0;
function eq(actual, expected, name) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`); }
}

console.log("\n═══ LDL-C bands (untreated, mg/dL) ═══");
eq(dlcnLdlPoints(154), 0, "154 → 0");
eq(dlcnLdlPoints(155), 1, "155 → 1");
eq(dlcnLdlPoints(189), 1, "189 → 1");
eq(dlcnLdlPoints(190), 3, "190 → 3");
eq(dlcnLdlPoints(249), 3, "249 → 3");
eq(dlcnLdlPoints(250), 5, "250 → 5");
eq(dlcnLdlPoints(329), 5, "329 → 5");
eq(dlcnLdlPoints(330), 8, "330 → 8");
eq(dlcnLdlPoints(""), 0, "blank → 0");

console.log("\n═══ Categories ═══");
eq(dlcnCategory(2).id, "unlikely", "2 → unlikely");
eq(dlcnCategory(3).id, "possible", "3 → possible");
eq(dlcnCategory(5).id, "possible", "5 → possible");
eq(dlcnCategory(6).id, "probable", "6 → probable");
eq(dlcnCategory(8).id, "probable", "8 → probable");
eq(dlcnCategory(9).id, "definite", "9 → definite");

console.log("\n═══ Scoring: highest item per group only ═══");
eq(dlcnScore({}, "").score, 0, "nothing → 0");
eq(dlcnScore({}, 200).score, 3, "LDL 200 alone → 3 (possible)");
eq(dlcnScore({}, 200).cat.id, "possible", "LDL 200 alone → possible");
eq(dlcnScore({ fam_cad: true, fam_xanth: true }, "").score, 2, "both family items → 2, not 3");
eq(dlcnScore({ pt_cad: true, pt_vasc: true }, "").score, 2, "both clinical items → 2, not 3");
eq(dlcnScore({ ex_xanth: true, ex_arcus: true }, "").score, 6, "both exam items → 6, not 10");
eq(dlcnScore({ fam_cad: true, pt_cad: true }, 260).score, 8, "FHx 1 + CAD 2 + LDL 260 (5) → 8 probable");
eq(dlcnScore({ fam_cad: true, pt_cad: true }, 260).cat.id, "probable", "8 → probable");
eq(dlcnScore({ ex_xanth: true }, 195).score, 9, "xanthoma 6 + LDL 195 (3) → 9 definite");
eq(dlcnScore({ dna_pos: true }, 160).cat.id, "definite", "variant 8 + LDL 160 (1) → definite");
eq(dlcnScore({ dna_pos: true }, "").cat.id, "probable", "variant alone (8) → probable");
const all = Object.fromEntries(DLCN_GROUPS.flatMap(g => g.items.map(i => [i.id, true])));
eq(dlcnScore(all, 400).score, 2 + 2 + 6 + 8 + 8, "maximum score = 26");

console.log("\n═══ Correction factors (Haralambos 2015, Table 2) ═══");
eq(ldlCorrectionFactor({}), 1.0, "no therapy → 1.0");
eq(ldlCorrectionFactor({ eze: true }), 1.2, "ezetimibe alone → 1.2");
eq(ldlCorrectionFactor({ statin: "prava", dose: 40 }), 1.5, "pravastatin 40 → 1.5");
eq(ldlCorrectionFactor({ statin: "simva", dose: 20 }), 1.6, "simvastatin 20 → 1.6");
eq(ldlCorrectionFactor({ statin: "simva", dose: 80, eze: true }), 2.4, "simvastatin 80 + EZE → 2.4");
eq(ldlCorrectionFactor({ statin: "atorva", dose: 10 }), 1.6, "atorvastatin 10 → 1.6");
eq(ldlCorrectionFactor({ statin: "atorva", dose: 40 }), 2.0, "atorvastatin 40 → 2.0");
eq(ldlCorrectionFactor({ statin: "atorva", dose: 80 }), 2.2, "atorvastatin 80 → 2.2");
eq(ldlCorrectionFactor({ statin: "atorva", dose: 80, eze: true }), 2.5, "atorvastatin 80 + EZE → 2.5");
eq(ldlCorrectionFactor({ statin: "rosuva", dose: 5 }), 1.8, "rosuvastatin 5 → 1.8");
eq(ldlCorrectionFactor({ statin: "rosuva", dose: 20 }), 2.1, "rosuvastatin 20 → 2.1");
eq(ldlCorrectionFactor({ statin: "rosuva", dose: 40, eze: true }), 3.3, "rosuvastatin 40 + EZE → 3.3");
eq(ldlCorrectionFactor({ statin: "rosuva", dose: 5, eze: true }), null, "rosuvastatin 5 + EZE → not published");
eq(ldlCorrectionFactor({ statin: "atorva", dose: 30 }), null, "unlisted dose → null");

console.log("\n═══ Untreated LDL-C estimate ═══");
eq(estimateUntreatedLdl(120, 2.0), 240, "120 × 2.0 → 240");
eq(estimateUntreatedLdl(118, 2.1), 248, "118 × 2.1 → 248");
eq(estimateUntreatedLdl(212, 1.0), 212, "untreated: × 1.0 → unchanged");
eq(estimateUntreatedLdl("", 2.0), null, "blank LDL → null");
eq(estimateUntreatedLdl(120, null), null, "no factor → null");
eq(dlcnLdlPoints(estimateUntreatedLdl(118, 2.1)), 3, "118 on rosuvastatin 20 → est. 248 → 3 pts");
eq(dlcnLdlPoints(estimateUntreatedLdl(120, 2.2)), 5, "120 on atorvastatin 80 → est. 264 → 5 pts");

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
