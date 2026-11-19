#!/usr/bin/env node
// test-recommend.mjs — text and edge behavior of src/recommend.js that the
// broader test-clinical.mjs suite does not cover.

import { recPrimary, recSecondary, recDiabetes, vhrStatus, cacZeroBlockers, dmTier, tgAdvice, lpaInterpret, VHR_MAJOR, VHR_FEATURES, DM_ENHANCERS } from "./src/recommend.js";

let pass = 0, fail = 0;
function eq(actual, expected, name) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} — got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`); }
}

console.log("\n═══ Guideline lists ═══");
eq(VHR_MAJOR.map(x => x.id), ["acs", "mi", "stroke", "pad", "recurrent"], "4 major ASCVD event types (§2.1) + repeat-event row");
eq(VHR_FEATURES.map(x => x.id), ["age65", "revasc", "smoker", "dm", "hf", "htn", "ldl100"], "7 high-risk features (§2.1)");
eq(DM_ENHANCERS.length, 7, "Table 17: 6 enhancers (duration split by diabetes type)");
eq(DM_ENHANCERS.some(x => /A1c/i.test(x.l)), false, "A1c is not a Table 17 enhancer");

console.log("\n═══ Very high risk counts events, not event types ═══");
eq(vhrStatus({ mi: true }).vhr, false, "one MI alone → 1 event, not very high risk");
eq(vhrStatus({ mi: true, recurrent: true }), { majors: 2, features: 0, vhr: true }, "two prior MIs → 2 events → very high risk");
eq(vhrStatus({ stroke: true, recurrent: true }).vhr, true, "two ischemic strokes → very high risk");
eq(vhrStatus({ recurrent: true }).majors, 2, "repeat-event row alone stands for 2 events");
eq(vhrStatus({ mi: true, stroke: true, recurrent: true }).majors, 3, "MI + stroke + a repeat → 3 events");
eq(vhrStatus({ mi: true }, { dm: true, htn: true }).vhr, true, "1 event + 2 high-risk features → very high risk");
eq(recSecondary({ major: { mi: true, recurrent: true } }).g.ldl, 55, "two prior MIs → LDL goal <55");

console.log("\n═══ Secondary prevention text ═══");
eq(/ezetimibe and\/or a PCSK9 mAb/.test(recSecondary({ major: { acs: true, stroke: true } }).txt), true, "VHR: ezetimibe and/or PCSK9 mAb");
eq(/below 55 is reasonable/.test(recSecondary({}).txt), true, "Not VHR: optional <55 stated");
eq(recSecondary({ major: { acs: true }, feat: { dm: true, htn: true }, ckd: true }).vhr, true, "VHR takes precedence over CKD label");
eq(recSecondary({ ckd: true }).vhr, false, "CKD alone: goal <55 without VHR label");

console.log("\n═══ CAC = 0 rule ═══");
eq(cacZeroBlockers({}), [], "no blockers");
eq(cacZeroBlockers({ dm: true, age: 40 }), [], "diabetes at age 40: not a blocker (rule is age >40)");
eq(cacZeroBlockers({ dm: true, age: 41 }), ["diabetes"], "diabetes at age 41: blocker");
eq(recPrimary({ risk10: 4, cac: 0 }).src, "cac0", "borderline + CAC 0 → defer");
eq(recPrimary({ risk10: 2, cac: 0 }).src, "cac0", "low + CAC 0 → defer");
eq(recPrimary({ risk10: 7, cac: 0, age: 50, egfr: 50 }).src, "ckd", "CAC 0 but CKD stage ≥3, age 50 → statin indicated");
eq(recPrimary({ risk10: 7, cac: 0, age: 40, dm: true }).src, "dm", "CAC 0, diabetes at exactly age 40 → statin still indicated (diabetes rule)");

console.log("\n═══ Primary prevention ═══");
eq(recPrimary({}), null, "no risk → null");
eq(recPrimary({ risk10: 4, enhCount: 2 }).int, "moderate", "borderline + enhancers → moderate");
eq(recPrimary({ risk10: 2, risk30: 15, age: 59 }).src, "lifetime", "age 59: 30-yr rule applies");
eq(recPrimary({ risk10: 2, risk30: 15, age: 29 }).src, "risk", "age 29: 30-yr rule does not apply");
eq(recPrimary({ risk10: 2, age: 45, ldl: 190 }).src, "risk", "LDL 190 is outside 160–189 (use LDL ≥190 tab)");
eq(recPrimary({ risk10: 2, age: 76, dm: true }).int, "none", "diabetes age 76: age 40–75 floor does not apply");
eq(recPrimary({ risk10: 2, age: 75, dm: true }).src, "dm", "diabetes age 75: floor applies");
eq(recPrimary({ risk10: 2, age: 50, dm: true, egfr: 40 }).txt.startsWith("Diabetes and CKD"), true, "both conditions named");

console.log("\n═══ Diabetes tiers ═══");
eq(dmTier({}), "base", "no factors → base");
eq(dmTier({ rf: true }), "high", "multiple risk factors → high");
eq(dmTier({ enhCount: 2 }), "high", "enhancers → high");
eq(dmTier({ risk10: 10 }), "high", "PREVENT 10% → high");
eq(recDiabetes({ age: 39, enhCount: 1 }).tier, "young", "age 39 → young tier");
eq(recDiabetes({ age: 40 }).tier, "base", "age 40 → 40–75 tier");
eq(recDiabetes({ age: 75, rf: true }).tier, "high", "age 75 → 40–75 tier");
eq(recDiabetes({ age: 76, rf: true }).tier, "older", "age 76 → older tier (no <70 goal)");

console.log("\n═══ Triglycerides / Lp(a) ═══");
eq(tgAdvice(149), null, "TG 149 → none");
eq(/Lifestyle first/.test(tgAdvice(150).txt), true, "TG 150 → lifestyle first");
eq(/fenofibrate/i.test(tgAdvice(300).txt), false, "TG 300: fenofibrate not suggested for ASCVD risk");
eq(/fibrate or prescription omega-3/.test(tgAdvice(600).txt), true, "TG 600 → fibrate or prescription omega-3");
eq(/olezarsen/i.test(tgAdvice(1200).txt), true, "TG 1200 → olezarsen for FCS mentioned");
eq(lpaInterpret(125).lv, "Elevated", "Lp(a) 125 → elevated");

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
