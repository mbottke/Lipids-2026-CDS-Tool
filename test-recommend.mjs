#!/usr/bin/env node
// test-recommend.mjs — text and edge behavior of src/recommend.js that the
// broader test-clinical.mjs suite does not cover.

import { recPrimary, recSecondary, recDiabetes, recSevere, vhrStatus, goalStatus, inUnit, cacZeroBlockers, dmTier, tgAdvice, lpaInterpret, VHR_MAJOR, VHR_FEATURES, DM_ENHANCERS } from "./src/recommend.js";

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

console.log("\n═══ Goal status: goals are written <N, so at goal means strictly below ═══");
eq(goalStatus("", 100), null, "no LDL-C entered → no status");
eq(goalStatus(null, 100), null, "null LDL-C → no status");
eq(goalStatus(152, null), null, "no goal → no status");
eq(goalStatus(99, 100), { atGoal: true, above: -1, needed: 0 }, "99 with goal <100 → at goal");
eq(goalStatus(100, 100), { atGoal: false, above: 0, needed: 0 }, "100 with goal <100 → not at goal");
eq(goalStatus(152, 100), { atGoal: false, above: 52, needed: 34 }, "152 with goal <100 → 52 above, 34% reduction needed");
eq(goalStatus(152, 70), { atGoal: false, above: 82, needed: 54 }, "152 with goal <70 → 82 above, 54% reduction needed");

console.log("\n═══ Plan sentence in mmol/L ═══");
eq(inUnit("Very high-risk ASCVD. High-intensity statin, then ezetimibe and/or a PCSK9 mAb to LDL below 55 mg/dL.", true),
   "Very high-risk ASCVD. High-intensity statin, then ezetimibe and/or a PCSK9 mAb to LDL below 1.4 mmol/L.", "goal phrase converts: 55 mg/dL → 1.4 mmol/L");
eq(inUnit("High-intensity statin to LDL below 70 mg/dL. Lowering further to below 55 is reasonable.", true),
   "High-intensity statin to LDL below 1.8 mmol/L. Lowering further to below 1.4 is reasonable.", "the second, unit-less goal converts too");
eq(inUnit("LDL-C ≥190 with clinical ASCVD.", true), "LDL-C ≥4.9 with clinical ASCVD.", "LDL-C threshold converts: 190 → 4.9");
eq(inUnit("Low 10-year risk (<3%) with LDL-C 160–189.", true), "Low 10-year risk (<3%) with LDL-C 4.1–4.9.", "LDL-C range converts");
eq(inUnit("CAC 300–999. High-intensity statin to LDL below 70 mg/dL.", true), "CAC 300–999. High-intensity statin to LDL below 1.8 mmol/L.", "CAC scores are left alone");
eq(inUnit("Diabetes with PREVENT-ASCVD ≥10%.", true), "Diabetes with PREVENT-ASCVD ≥10%.", "percentages are left alone");
eq(inUnit("to LDL below 55 mg/dL.", false), "to LDL below 55 mg/dL.", "mg/dL mode leaves the sentence as written");
{ const all = [
    recSecondary({ major: { mi: true, recurrent: true } }), recSecondary({ major: { mi: true } }), recSecondary({ major: {}, ckd: true }), recSecondary({ major: {}, severe: true }),
    recDiabetes({ age: 55, enhCount: 0, rf: false, risk10: 5 }), recDiabetes({ age: 55, enhCount: 1, rf: false, risk10: 5 }),
    recSevere({}), recSevere({ hefh: true }), recSevere({ ascvd: true }),
    ...[1, 4, 7, 12].map(r => recPrimary({ risk10: r, risk30: 20, age: 50, ldl: 150, enhCount: 0, cac: "", cacPct: "", smoking: false, dm: false, fhx: false, egfr: 90 })),
    recPrimary({ risk10: 4, risk30: 20, age: 50, ldl: 150, enhCount: 2, cac: "", cacPct: "", smoking: false, dm: false, fhx: false, egfr: 90 }),
    recPrimary({ risk10: 2, risk30: 8, age: 50, ldl: 170, enhCount: 0, cac: "", cacPct: "", smoking: false, dm: false, fhx: false, egfr: 90 }),
    ...[150, 500, 1200].map(c => recPrimary({ risk10: 7, risk30: 20, age: 55, ldl: 150, enhCount: 0, cac: c, cacPct: "", smoking: false, dm: false, fhx: false, egfr: 90 })),
  ].filter(Boolean);
  const left = all.map(r => inUnit(r.txt, true)).filter(t => /mg\/dL|below \d{2,3}\b|LDL-C (≥|\d)\d{2}/.test(t));
  eq(left, [], `no mg/dL LDL-C value is left in any of ${all.length} plan sentences`); }

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
