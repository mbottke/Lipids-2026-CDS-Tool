// src/SevereTab.jsx — LDL ≥190 tab: goal tiers + FH workup flow
// Sources:
//  · 2026 ACC/AHA Dyslipidemia Guideline §3.1, §3.4, §4.2.2 (Table 9), §4.2.4.1–4.2.4.4
//    (Table 15), §4.2.8.1: goals, secondary causes, genetic testing, cascade, referral
//  · DLCN: WHO 1998; Nordestgaard BG et al. Eur Heart J 2013;34:3478-90
//  · Untreated LDL-C estimate: Haralambos K et al. Atherosclerosis 2015;240:190-6
//  · Genetic testing / cascade: Sturm AC et al. JACC 2018;72:662-80;
//    Khera AV et al. JACC 2016;67:2578-89
//  · Homozygous FH: Cuchel M et al. Eur Heart J 2023;44:2277-91
import { useState } from "react";
import { Card, SINum, CheckRow, AutoRow, Badge, GoalTier, Step, Cor, Eyebrow, CHOL_F, chol, cholUnit } from "./ui.jsx";
import { DLCN_GROUPS, DLCN_LDL_BANDS, DLCN_CLINICAL_FH_MIN, LDL_CORRECTION, HOFH_UNTREATED_LDL } from "./fh.js";

// ── Goal tiers ───────────────────────────────────────────────────────────────

export function SevereGoalTiers({ si, f, toggle, hefhAuto, goal }) {
  return (
    <div className="mt-4">
      <Eyebrow>LDL-C goal: what lowers it</Eyebrow>
      <div className="space-y-2">
        <GoalTier active={goal.tier === "base"} ldl={chol(100, si)} nh={chol(130, si)}>
          <div className="text-[14px] font-bold text-ink leading-tight">LDL-C ≥{chol(190, si)} alone</div>
          <div className="text-[12px] text-muted mt-0.5">No HeFH, no additional ASCVD risk factor, no coronary calcification.</div>
        </GoalTier>

        <GoalTier active={goal.tier === "enhanced"} ldl={chol(70, si)} nh={chol(100, si)}>
          <div className="text-[14px] font-bold text-ink leading-tight">With any one of these</div>
          <div className="space-y-1 mt-1.5">
            {hefhAuto
              ? <AutoRow compact checked label="HeFH, clinical or genetic" sub={`Set by the score below: DLCN ≥${DLCN_CLINICAL_FH_MIN} or a pathogenic variant`} />
              : <CheckRow compact checked={!!f.hefh} on={() => toggle("hefh")} label="HeFH, clinical or genetic"
                  sub={`DLCN ≥${DLCN_CLINICAL_FH_MIN} (probable or definite) or a pathogenic variant`} />}
            <CheckRow compact checked={f.rf} on={() => toggle("rf")}
              label="Additional ASCVD risk factors"
              sub="Not enumerated by the guideline. Its cited source (SAFEHEART): hypertension, smoking, higher BMI, elevated Lp(a), male sex, older age" />
            <CheckRow compact checked={f.cac} on={() => toggle("cac")}
              label="Coronary calcification"
              sub="Any documented CAC or subclinical atherosclerosis. No score cutoff is given" />
          </div>
        </GoalTier>

        <GoalTier active={goal.tier === "ascvd"} ldl={chol(55, si)} nh={chol(85, si)}>
          <CheckRow compact checked={f.ascvd} on={() => toggle("ascvd")}
            label="Clinical ASCVD"
            sub="Optional apoB <55 mg/dL once LDL-C and non-HDL-C are at goal" />
        </GoalTier>
      </div>
      <div className="text-[12px] text-faint mt-2 leading-snug">
        All tiers: at least 50% LDL-C reduction on a maximally tolerated statin. PREVENT and a CAC of zero do not apply in HeFH. Do not use either to defer treatment.
      </div>
    </div>
  );
}

// ── FH workup flow ───────────────────────────────────────────────────────────

const Do = ({ children }) => <div className="flex gap-1.5"><span className="text-faint shrink-0">→</span><span>{children}</span></div>;
const Expect = ({ children }) => (
  <div className="pl-2 border-l-2 border-line text-muted">
    <span className="font-semibold text-ink">Expect: </span>{children}
  </div>
);

export function FHWorkup({ si, ldl, rx, setRx, factor, knownLdl, setKnownLdl, untreated, checked, toggle, dlcn }) {
  const [showBands, setShowBands] = useState(false);
  const cat = dlcn.cat;
  const hasLdl = ldl !== "" && ldl !== null;
  const known = knownLdl !== "" && knownLdl !== null;
  const onRx = rx.statin !== "none" || rx.eze;
  const doses = Object.keys(LDL_CORRECTION[rx.statin].doses).map(Number);
  const pick = "bg-accent-soft text-accent border border-edge";
  const unpick = "bg-surface text-muted border border-line hover:text-ink";
  const hofh = untreated !== "" && Number(untreated) > HOFH_UNTREATED_LDL;
  const variant = !!checked.dna_pos;
  const clinicalFH = dlcn.score >= DLCN_CLINICAL_FH_MIN;
  const catClr = { red: "red", orange: "amber", amber: "amber", slate: "slate" }[cat.clr];
  const u = cholUnit(si);

  return (
    <Card title="FH workup, step by step">
      <p className="text-[12px] text-muted mb-4">Start the statin now and run the workup in parallel.</p>

      <Step n={1} title="Exclude secondary causes" tag={<Cor>COR 1</Cor>}>
        <Do><b>TSH</b> for hypothyroidism</Do>
        <Do><b>Hepatic panel</b> for obstructive liver disease</Do>
        <Do><b>Creatinine, eGFR, urine albumin</b> for CKD and nephrotic syndrome</Do>
        <Do><b>A1c</b> for uncontrolled hyperglycemia</Do>
        <Do><b>Diet history:</b> ketogenic or high saturated fat, rapid weight change</Do>
        <Do><b>Drugs:</b> glucocorticoids, cyclosporine, atypical antipsychotics, estrogens, androgens, high-dose thiazides. Also pregnancy, menopausal transition, Cushing syndrome, anorexia nervosa</Do>
        <Expect>Treat any cause found and repeat the lipid profile. If LDL-C is still ≥{chol(190, si)}, continue below.</Expect>
      </Step>

      <Step n={2} title="Score the phenotype" tag={<Badge color="slate">Dutch Lipid Clinic Network, adults</Badge>}>
        <div className="rounded-lg border border-line bg-surface p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[13px] font-bold text-ink">Untreated LDL-C</div>
            <button type="button" onClick={() => setShowBands(p => !p)} aria-expanded={showBands}
              className="hit py-1 text-[12px] font-semibold text-muted hover:text-ink cursor-pointer underline decoration-dotted underline-offset-2">{showBands ? "Hide point bands" : "Point bands"}</button>
          </div>
          <div className="text-[12px] text-faint mt-0.5 leading-snug">The score uses the untreated value. On therapy with no baseline on record: pick the regimen to estimate it. A documented baseline overrides the estimate.</div>

          {!known && (<>
            <div className="grid grid-cols-3 min-[380px]:grid-cols-5 gap-1 mt-2">
              {Object.entries(LDL_CORRECTION).map(([id, r]) => (
                <button key={id} type="button" aria-pressed={rx.statin === id}
                  onClick={() => setRx({ statin: id, dose: id === "none" ? 0 : Number(Object.keys(r.doses)[0]), eze: rx.eze })}
                  className={`flex-1 py-1.5 px-0.5 rounded text-[12px] font-semibold text-center cursor-pointer transition-colors min-h-[44px] ${rx.statin === id ? pick : unpick}`}>{r.l}</button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1 mt-1 items-stretch [&>button]:min-w-[44px]">
              {rx.statin !== "none" && doses.map(d => (
                <button key={d} type="button" aria-pressed={rx.dose === d} onClick={() => setRx({ ...rx, dose: d })}
                  className={`flex-1 py-1.5 rounded text-[12px] font-semibold font-mono text-center cursor-pointer transition-colors min-h-[44px] ${rx.dose === d ? pick : unpick}`}>{d} mg</button>
              ))}
              <button type="button" aria-pressed={rx.eze} onClick={() => setRx({ ...rx, eze: !rx.eze })} title="Ezetimibe 10 mg"
                className={`flex-1 py-1.5 px-1 rounded text-[12px] font-semibold text-center whitespace-nowrap cursor-pointer transition-colors min-h-[44px] ${rx.eze ? pick : unpick}`}>+ EZE 10</button>
            </div>
          </>)}

          <div className="mt-2.5 flex items-baseline justify-between gap-2">
            {known ? (
              <span className="text-[12px] text-body">Documented baseline: <span className="text-[14px] font-semibold font-mono tabular-nums text-ink">{chol(untreated, si)}</span> {u}</span>
            ) : !hasLdl ? (
              <span className="text-[12px] text-faint">Enter LDL-C above to score this item.</span>
            ) : factor === null ? (
              <span className="text-[12px] text-amber-700 dark:text-amber-400">No published factor for this combination. Enter the baseline below.</span>
            ) : (
              <span className="text-[12px] text-body">
                {onRx ? <span className="font-mono">{chol(ldl, si)} × {factor.toFixed(1)} = </span> : "Current LDL-C: "}
                <span className="text-[14px] font-semibold font-mono tabular-nums text-ink">{chol(untreated, si)}</span> {u}{onRx ? " (estimate)" : ""}
              </span>
            )}
            <span className="shrink-0 font-mono text-[12px] font-semibold text-muted tabular-nums">+{dlcn.byGroup.ldl}</span>
          </div>
          {showBands && (
            <div className="panel-in mt-2 grid grid-cols-4 gap-1 text-center text-[11px] text-muted">
              {[...DLCN_LDL_BANDS].reverse().map(b => (
                <div key={b.min} className={`rounded border px-1 py-1 ${dlcn.byGroup.ldl === b.pts ? "border-accent bg-accent-soft text-ink font-semibold" : "border-line"}`}>
                  <div className="font-mono tabular-nums">{si ? b.rangeSI : b.range}</div><div>+{b.pts}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3">
            <SINum si={si} factor={CHOL_F} phSI="Optional" label="Documented untreated LDL-C" unit="mg/dL" value={knownLdl} on={setKnownLdl} min={0} max={1000} ph="Optional" />
          </div>
          {hofh && (
            <div className="panel-in mt-2 rounded-lg border border-line bg-paper p-2.5 text-[12px] leading-snug">
              <span className="font-bold text-red-800 dark:text-red-300">Untreated LDL-C &gt;{chol(HOFH_UNTREATED_LDL, si)} {u} suggests homozygous FH.</span>{" "}
              <span className="text-body">Also look for xanthomas before age 10 and HeFH-range LDL-C in both parents. Refer to a lipid specialist now.</span>
            </div>
          )}
        </div>

        {DLCN_GROUPS.map(g => (
          <div key={g.id} className="pt-1.5">
            <div className="flex items-baseline justify-between mb-1">
              <span className="text-[12px] font-bold text-ink">{g.l}</span>
              {g.items.length > 1 && <span className="text-[11px] text-faint">highest item counts</span>}
            </div>
            <div className="space-y-1">
              {g.items.map(it => (
                <CheckRow key={it.id} compact checked={!!checked[it.id]} on={() => toggle(it.id)} label={it.l} sub={it.d} pts={it.pts} />
              ))}
            </div>
          </div>
        ))}

        <div className="mt-2 rounded-lg border border-edge bg-accent-soft p-3 flex items-center gap-3.5">
          <div className="shrink-0 text-center w-12">
            <div className="text-[28px] font-medium font-mono tabular-nums leading-none tracking-[-0.03em] text-ink">{dlcn.score}</div>
            <div className="text-[11px] font-medium text-muted mt-1">points</div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge color={catClr}>{cat.label}</Badge>
              <span className="text-[12px] text-muted">Definite &gt;8, probable 6–8, possible 3–5, unlikely &lt;3</span>
            </div>
            <div className="text-[12px] mt-1 text-body leading-snug">
              {clinicalFH
                ? `Clinical HeFH: the goal drops to <${chol(70, si)}. Proceed to genetic testing and cascade screening now.`
                : cat.id === "possible"
                  ? "Not yet a clinical diagnosis. Genetic testing decides: most variant-positive patients score below 6."
                  : "The phenotype does not suggest FH. Polygenic or secondary hypercholesterolemia is more likely. Genetic testing remains reasonable."}
            </div>
          </div>
        </div>
      </Step>

      <Step n={3} title="Genetic testing"
        tag={cat.id === "unlikely" ? <Cor>COR 2a</Cor> : <Cor>COR 1</Cor>}>
        <Do>Order a <b>panel</b> for pathogenic or likely pathogenic variants: <b>LDLR, APOB, PCSK9</b> (<b>LDLRAP1</b> with a recessive pattern or HoFH phenotype).</Do>
        <div className="text-muted">COR 1 for possible, probable, or definite FH. COR 2a for any LDL-C ≥{chol(190, si)} without a secondary cause. COR 2b for LDL-C {si ? "4.1–4.8" : "160–189"}.</div>
        <Expect>
          A variant is found in ≈2.5% of all adults with LDL-C ≥{chol(190, si)}, 21–44% with possible FH, 60–80% with definite FH. <b>Positive:</b> HeFH confirmed (goal &lt;{chol(70, si)}), CAD odds ≈22× versus ≈6× for the same LDL-C without a variant, and relatives can be tested for the exact variant. <b>Negative:</b> does not exclude FH. Treat the phenotype the same.
        </Expect>
        {variant && <div className="font-semibold text-ink">Variant recorded: genetically confirmed FH.</div>}
      </Step>

      <Step n={4} title="Cascade screening" tag={<span className="text-[12px] text-muted">{clinicalFH || variant ? "Start now" : `Once FH is confirmed or LDL-C stays ≥${chol(190, si)}`}</span>}>
        <Do><b>Who:</b> every 1st-degree relative (parents, siblings, children; 50% chance each). Then 2nd-degree relatives, and outward from each new case.</Do>
        <Do><b>How:</b> if the family variant is known, test for that variant plus a lipid profile. Without a variant or access to testing, a lipid profile alone (misses relatives with milder LDL-C).</Do>
        <Do><b>When:</b> children from age <b>2</b>. Add <b>Lp(a)</b> for 1st-degree relatives (COR 1).</Do>
        <Expect>Variant-based cascades find more affected relatives than LDL-C alone (1.77 vs 1.18 per family). Affected children: statin from age 8 if LDL-C stays ≥{chol(160, si)} after 3–6 months of lifestyle, with a goal of ≥50% reduction and ≤{chol(130, si)} {cholUnit(si)}.</Expect>
      </Step>

      <Step n={5} title="Treat to goal and refer" last>
        <Do>Maximally tolerated statin, then add <b>ezetimibe, a PCSK9 mAb, and/or bempedoic acid</b> to the goal above. Inclisiran if LDL-C stays ≥{chol(100, si)} despite statin with or without ezetimibe (COR 2a).</Do>
        <Do>Recheck lipids 4–12 weeks after each change.</Do>
        <Do><b>Refer to a lipid specialist:</b> suspected or diagnosed FH, genetic testing needed, HeFH not at goal on maximal statin plus nonstatin, side effects on ≥2 statins, any suspicion of homozygous FH (evinacumab, lomitapide, apheresis).</Do>
      </Step>
    </Card>
  );
}
