#!/usr/bin/env node
// test-bp.mjs — 2025 AHA/ACC BP categories and drug-therapy thresholds

import { bpCategory, bpPlan, bpRiskReasons } from "./src/bp.js";
import { severeGoal } from "./src/fh.js";

let pass = 0, fail = 0;
function eq(actual, expected, name) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`); }
}
const cat = (s, d) => bpCategory(s, d)?.id ?? null;
const act = (o) => bpPlan(o)?.action.id ?? null;

console.log("\n═══ Categories (Table 4) ═══");
eq(cat(119, 79), "normal",   "119/79 → normal");
eq(cat(120, 79), "elevated", "120/79 → elevated");
eq(cat(129, 79), "elevated", "129/79 → elevated");
eq(cat(118, 80), "stage1",   "118/80 → stage 1 (DBP sets the higher category)");
eq(cat(130, 70), "stage1",   "130/70 → stage 1");
eq(cat(139, 89), "stage1",   "139/89 → stage 1");
eq(cat(140, 70), "stage2",   "140/70 → stage 2");
eq(cat(125, 90), "stage2",   "125/90 → stage 2");
eq(cat(180, 120), "stage2",  "180/120 → stage 2 (severe is >180/120)");
eq(cat(181, 90), "severe",   "181/90 → severe");
eq(cat(150, 121), "severe",  "150/121 → severe");
eq(cat(136, ""), "stage1",   "136 with DBP blank → stage 1 on SBP alone");
eq(cat("", 85), null,        "SBP blank → null");

console.log("\n═══ Risk reasons ═══");
eq(bpRiskReasons({ cvd10: 7.4 }), [], "PREVENT-CVD 7.4% → not high risk");
eq(bpRiskReasons({ cvd10: 7.5 }), ["total CVD risk 7.5%"], "total CVD 7.5% → high risk");
eq(bpRiskReasons({ dm: true, ckd: true, cvd10: 3 }), ["diabetes", "CKD"], "DM + CKD listed");

console.log("\n═══ Untreated: drug-therapy thresholds (§5.2.2) ═══");
eq(act({ sbp: 115, dbp: 70 }), "none", "normal → none");
eq(act({ sbp: 124, dbp: 76 }), "lifestyle", "elevated → lifestyle only");
eq(act({ sbp: 134, dbp: 82, cvd10: 4.0 }), "lifestyle_first", "stage 1, PREVENT-CVD 4% → lifestyle 3–6 mo first");
eq(act({ sbp: 134, dbp: 82, cvd10: 7.5 }), "start_one", "stage 1, PREVENT-CVD 7.5% → start now");
eq(act({ sbp: 134, dbp: 82, cvd10: 2.0, dm: true }), "start_one", "stage 1 + diabetes → start now despite low risk");
eq(act({ sbp: 134, dbp: 82, cvd10: 2.0, ckd: true }), "start_one", "stage 1 + CKD → start now");
eq(act({ sbp: 134, dbp: 82, clinicalCvd: true }), "start_one", "stage 1 + clinical CVD → start now");
eq(act({ sbp: 134, dbp: 82 }), "need_risk", "stage 1, risk unknown → needs risk");
eq(act({ sbp: 146, dbp: 84, cvd10: 1.0 }), "start_two", "stage 2 → 2 agents regardless of risk");
eq(act({ sbp: 128, dbp: 92 }), "start_two", "DBP ≥90 alone → stage 2 → 2 agents");
eq(act({ sbp: 190, dbp: 100 }), "severe", ">180 → severe pathway");

console.log("\n═══ On treatment: goal <130/80 (§5.2.7) ═══");
eq(act({ sbp: 118, dbp: 74, onTx: true }), "at_goal", "118/74 on tx → at goal");
eq(act({ sbp: 126, dbp: 78, onTx: true }), "at_goal", "126/78 on tx → at goal");
eq(act({ sbp: 132, dbp: 78, onTx: true }), "intensify", "132/78 on tx → intensify");
eq(act({ sbp: 124, dbp: 84, onTx: true }), "intensify", "124/84 on tx → intensify (DBP ≥80)");
eq(act({ sbp: 150, dbp: 95, onTx: true }), "intensify", "150/95 on tx → intensify");
eq(bpPlan({ sbp: "" }), null, "no SBP → null");

console.log("\n═══ LDL ≥190 goal tiers (2026 lipid guideline §4.2.4.3) ═══");
eq(severeGoal({}), { ldl: 100, nh: 130, tier: "base" }, "no factors → <100 / <130");
eq(severeGoal({ hefh: true }).ldl, 70, "HeFH → <70");
eq(severeGoal({ rf: true }).ldl, 70, "additional ASCVD risk factor → <70");
eq(severeGoal({ cac: true }), { ldl: 70, nh: 100, tier: "enhanced" }, "coronary calcification → <70 / <100");
eq(severeGoal({ ascvd: true }), { ldl: 55, nh: 85, tier: "ascvd" }, "clinical ASCVD → <55 / <85");
eq(severeGoal({ ascvd: true, hefh: true, cac: true }).ldl, 55, "ASCVD overrides other factors → <55");

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
