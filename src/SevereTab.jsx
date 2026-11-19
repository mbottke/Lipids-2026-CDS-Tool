// src/SevereTab.jsx — LDL ≥190 tab: goal tiers + FH workup flow
// Sources:
//  · 2026 ACC/AHA Dyslipidemia Guideline §3.1, §3.4, §4.2.2 (Table 9), §4.2.4.1–4.2.4.4
//    (Table 15), §4.2.8.1 — goals, secondary causes, genetic testing, cascade, referral
//  · DLCN: WHO 1998; Nordestgaard BG et al. Eur Heart J 2013;34:3478-90
//  · Untreated LDL-C estimate: Haralambos K et al. Atherosclerosis 2015;240:190-6
//  · Genetic testing / cascade: Sturm AC et al. JACC 2018;72:662-80;
//    Khera AV et al. JACC 2016;67:2578-89
//  · Homozygous FH: Cuchel M et al. Eur Heart J 2023;44:2277-91
import { useState } from "react";
import { Card, Num, CheckRow, Badge, GoalTier } from "./ui.jsx";
import { DLCN_GROUPS, DLCN_LDL_BANDS, DLCN_CLINICAL_FH_MIN, LDL_CORRECTION, HOFH_UNTREATED_LDL } from "./fh.js";

const sub = "text-slate-500 dark:text-[#5a8aaa]";
const body = "text-slate-600 dark:text-[#d0e4f0]";

// ── Goal tiers ───────────────────────────────────────────────────────────────

export function SevereGoalTiers({ f, toggle, hefhAuto, goal }) {
  const Tier = ({ id, ldl, nh, tone, children }) => (
    <GoalTier active={goal.tier === id} ldl={ldl} nh={nh} tone={tone}>{children}</GoalTier>
  );

  return (
    <div className="mt-3">
      <div className="text-[11px] font-bold text-slate-500 dark:text-[#5a8aaa] uppercase tracking-wider mb-1.5">LDL-C Goal — what lowers it</div>
      <div className="space-y-1.5">
        <Tier id="base" ldl={100} nh={130} tone="blue">
          <div className="text-[12px] font-bold text-slate-800 dark:text-[#d0e4f0] leading-tight">LDL ≥190 alone</div>
          <div className={`text-[11px] ${sub}`}>No HeFH, no additional ASCVD risk factor, no coronary calcification.</div>
        </Tier>

        <Tier id="enhanced" ldl={70} nh={100} tone="amber">
          <div className={`text-[11px] font-bold mb-1 ${sub}`}>Any ONE of these:</div>
          <div className="space-y-1">
            <CheckRow compact tone="amber" checked={f.hefh || hefhAuto} on={() => toggle("hefh")}
              label="HeFH — clinical or genetic confirmation"
              sub={hefhAuto ? `Auto-checked: DLCN ≥${DLCN_CLINICAL_FH_MIN} or pathogenic variant (below)` : `DLCN ≥${DLCN_CLINICAL_FH_MIN} (probable/definite) or pathogenic variant`} />
            <CheckRow compact tone="amber" checked={f.rf} on={() => toggle("rf")}
              label="Additional ASCVD risk factor(s)"
              sub="Not enumerated by the guideline. Its cited source (SAFEHEART): hypertension, smoking, ↑BMI, ↑Lp(a), male sex, older age" />
            <CheckRow compact tone="amber" checked={f.cac} on={() => toggle("cac")}
              label="Coronary calcification"
              sub="Any documented CAC / subclinical atherosclerosis — no score cutoff given" />
          </div>
        </Tier>

        <Tier id="ascvd" ldl={55} nh={85} tone="red">
          <CheckRow compact tone="red" checked={f.ascvd} on={() => toggle("ascvd")}
            label="Clinical ASCVD"
            sub="Optional apoB <55 once LDL-C and non-HDL-C are at goal" />
        </Tier>
      </div>
      <div className={`text-[10px] mt-1.5 leading-snug ${sub}`}>
        All tiers: ≥50% LDL-C reduction on maximally tolerated statin. PREVENT and CAC = 0 do not apply in HeFH — do not use either to defer treatment.
      </div>
    </div>
  );
}

// ── FH workup flow ───────────────────────────────────────────────────────────

function Step({ n, title, tag, last, children }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0 bg-red-500 dark:bg-red-500/80">{n}</div>
        {!last && <div className="flex-1 w-px my-0.5 bg-slate-200 dark:bg-[#1e3040]" />}
      </div>
      <div className={`flex-1 min-w-0 ${last ? "" : "pb-4"}`}>
        <div className="flex items-center gap-1.5 flex-wrap min-h-[28px]">
          <span className="text-[14px] font-bold text-slate-800 dark:text-[#d0e4f0] leading-tight">{title}</span>
          {tag}
        </div>
        <div className={`text-[11px] mt-1 space-y-1 ${body}`}>{children}</div>
      </div>
    </div>
  );
}

const Do = ({ children }) => <div className="flex gap-1.5"><span className="text-red-500 dark:text-red-400 font-black shrink-0">→</span><span>{children}</span></div>;
const Expect = ({ children }) => (
  <div className={`mt-1 pl-2 border-l-2 border-slate-200 dark:border-[#1a2835] ${sub}`}>
    <span className="font-bold">Expect: </span>{children}
  </div>
);

export function FHWorkup({ ldl, rx, setRx, factor, knownLdl, setKnownLdl, untreated, checked, toggle, dlcn }) {
  const [showBands, setShowBands] = useState(false);
  const cat = dlcn.cat;
  const hasLdl = ldl !== "" && ldl !== null;
  const known = knownLdl !== "" && knownLdl !== null;
  const onRx = rx.statin !== "none" || rx.eze;
  const doses = Object.keys(LDL_CORRECTION[rx.statin].doses).map(Number);
  const pick = "bg-blue-600 dark:bg-sky-500/30 text-white dark:text-sky-300 dark:border dark:border-sky-400/40";
  const unpick = "bg-white dark:bg-[#111a24] text-slate-500 dark:text-[#5a8aaa] border border-slate-200 dark:border-[#1e3040]";
  const hofh = untreated !== "" && Number(untreated) > HOFH_UNTREATED_LDL;
  const variant = !!checked.dna_pos;
  const clinicalFH = dlcn.score >= DLCN_CLINICAL_FH_MIN;
  const catClr = { red:"red", orange:"amber", amber:"amber", slate:"slate" }[cat.clr];
  const catBox = {
    red:"bg-red-50 border-red-300 dark:bg-red-500/10 dark:border-red-500/30",
    orange:"bg-orange-50 border-orange-300 dark:bg-orange-500/10 dark:border-orange-500/30",
    amber:"bg-amber-50 border-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30",
    slate:"bg-slate-50 border-slate-200 dark:bg-[#0a1018] dark:border-[#1a2835]",
  }[cat.clr];

  return (
    <Card title="FH Workup — Step by Step" accent="red">
      <p className={`text-[11px] mb-3 ${sub}`}>Start the statin now; run the workup in parallel. Each step states what to order and what usually follows.</p>

      <Step n={1} title="Exclude secondary causes" tag={<Badge color="slate">COR 1</Badge>}>
        <Do><b>TSH</b> (hypothyroidism) · <b>hepatic panel</b> (obstructive liver disease) · <b>creatinine/eGFR + urine albumin</b> (CKD, nephrotic syndrome) · <b>A1c</b> (uncontrolled hyperglycemia)</Do>
        <Do><b>Diet history</b>: ketogenic / high saturated fat, rapid weight change</Do>
        <Do><b>Drugs</b>: glucocorticoids, cyclosporine, atypical antipsychotics, estrogens, androgens, high-dose thiazides. Also pregnancy, menopausal transition, Cushing, anorexia nervosa</Do>
        <Expect>Treat any cause found and repeat the lipid panel. LDL still ≥190 → continue below.</Expect>
      </Step>

      <Step n={2} title="Score the phenotype" tag={<Badge color="slate">Dutch Lipid Clinic Network · adults</Badge>}>
        <div className="rounded-lg border border-slate-200 dark:border-[#1a2835] bg-slate-50 dark:bg-[#0a1018] p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[11px] font-bold text-slate-700 dark:text-[#d0e4f0]">Untreated LDL-C</div>
            <button type="button" onClick={() => setShowBands(p => !p)}
              className="text-[10px] font-bold text-blue-600 dark:text-sky-400 cursor-pointer underline decoration-dotted">{showBands ? "hide bands" : "point bands"}</button>
          </div>
          <div className={`text-[10px] mt-0.5 ${sub}`}>The score uses the untreated value. On therapy with no baseline on record: pick the regimen to estimate it. A documented baseline (below) overrides the estimate.</div>

          {!known && (<>
            <div className="flex gap-1 mt-1.5">
              {Object.entries(LDL_CORRECTION).map(([id, r]) => (
                <button key={id} type="button" aria-pressed={rx.statin === id}
                  onClick={() => setRx({ statin: id, dose: id === "none" ? 0 : Number(Object.keys(r.doses)[0]), eze: rx.eze })}
                  className={`flex-1 py-1.5 px-0.5 rounded text-[10px] font-bold text-center cursor-pointer transition-colors min-h-[32px] ${rx.statin === id ? pick : unpick}`}>{r.l}</button>
              ))}
            </div>
            <div className="flex gap-1 mt-1 items-stretch">
              {rx.statin !== "none" && doses.map(d => (
                <button key={d} type="button" aria-pressed={rx.dose === d} onClick={() => setRx({ ...rx, dose: d })}
                  className={`flex-1 py-1.5 rounded text-[10px] font-bold font-mono text-center cursor-pointer transition-colors min-h-[32px] ${rx.dose === d ? pick : unpick}`}>{d} mg</button>
              ))}
              <button type="button" aria-pressed={rx.eze} onClick={() => setRx({ ...rx, eze: !rx.eze })}
                title="Ezetimibe 10 mg" className={`flex-1 py-1.5 px-1 rounded text-[10px] font-bold text-center whitespace-nowrap cursor-pointer transition-colors min-h-[32px] ${rx.eze ? pick : unpick}`}>+ EZE 10</button>
            </div>
          </>)}

          <div className="mt-2 flex items-baseline justify-between gap-2">
            {known ? (
              <span className="text-[11px] text-slate-600 dark:text-[#d0e4f0]">Documented baseline: <span className="text-[14px] font-black font-mono tabular-nums text-slate-800 dark:text-white">{untreated}</span> mg/dL</span>
            ) : !hasLdl ? (
              <span className={`text-[11px] ${sub}`}>Enter LDL-C above to score this item.</span>
            ) : factor === null ? (
              <span className="text-[11px] text-amber-700 dark:text-amber-400">No published factor for this combination — enter the baseline below.</span>
            ) : (
              <span className="text-[11px] text-slate-600 dark:text-[#d0e4f0]">
                {onRx ? `${ldl} × ${factor.toFixed(1)} = ` : "Current LDL-C: "}
                <span className="text-[14px] font-black font-mono tabular-nums text-slate-800 dark:text-white">{untreated}</span> mg/dL{onRx ? " (estimate)" : ""}
              </span>
            )}
            <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-black font-mono tabular-nums bg-slate-200 text-slate-600 dark:bg-[#1a2835] dark:text-[#7a9ab5]">+{dlcn.byGroup.ldl}</span>
          </div>
          {showBands && (
            <div className={`mt-2 grid grid-cols-4 gap-1 text-center text-[10px] ${sub}`}>
              {[...DLCN_LDL_BANDS].reverse().map(b => (
                <div key={b.min} className={`rounded border px-1 py-1 ${dlcn.byGroup.ldl === b.pts ? "border-blue-400 dark:border-sky-400/60 text-slate-800 dark:text-white font-bold" : "border-slate-200 dark:border-[#1a2835]"}`}>
                  <div className="font-mono tabular-nums">{b.range}</div><div>+{b.pts}</div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2">
            <Num label="Documented untreated LDL-C" unit="mg/dL" value={knownLdl} on={setKnownLdl} min={0} max={1000} ph="Optional" />
          </div>
          {hofh && (
            <div className="mt-2 rounded-lg border border-red-300 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-2 text-[11px] text-red-800 dark:text-red-300">
              <b>Untreated LDL-C &gt;{HOFH_UNTREATED_LDL} mg/dL suggests homozygous FH.</b> Also look for xanthomas before age 10 and HeFH-range LDL-C in both parents. Refer to a lipid specialist now.
            </div>
          )}
        </div>

        {DLCN_GROUPS.map(g => (
          <div key={g.id} className="pt-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-bold text-slate-500 dark:text-[#5a8aaa] uppercase tracking-wider">{g.l}</span>
              {g.items.length > 1 && <span className={`text-[9px] ${sub}`}>highest item counts</span>}
            </div>
            <div className="space-y-1">
              {g.items.map(it => (
                <CheckRow key={it.id} compact tone="red" checked={!!checked[it.id]} on={() => toggle(it.id)} label={it.l} sub={it.d} pts={it.pts} />
              ))}
            </div>
          </div>
        ))}

        <div className={`mt-2 rounded-lg border-2 p-2.5 flex items-center gap-3 ${catBox}`}>
          <div className="text-center shrink-0 w-12">
            <div className="text-[24px] font-black font-mono tabular-nums leading-none text-slate-800 dark:text-white">{dlcn.score}</div>
            <div className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${sub}`}>points</div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge color={catClr}>{cat.label}</Badge>
              <span className={`text-[10px] ${sub}`}>Definite &gt;8 · Probable 6–8 · Possible 3–5 · Unlikely &lt;3</span>
            </div>
            <div className="text-[11px] mt-1 text-slate-700 dark:text-[#d0e4f0] leading-snug">
              {clinicalFH
                ? "Clinical HeFH — goal drops to <70. Proceed to genetic testing and cascade screening now."
                : cat.id === "possible"
                  ? "Not yet a clinical diagnosis. Genetic testing decides — most variant-positive patients score below 6."
                  : "Phenotype does not suggest FH. Polygenic or secondary hypercholesterolemia is more likely; genetic testing remains reasonable."}
            </div>
          </div>
        </div>
      </Step>

      <Step n={3} title="Genetic testing"
        tag={<Badge color={cat.id === "unlikely" ? "slate" : "red"}>{cat.id === "unlikely" ? "Reasonable · COR 2a" : "Recommended · COR 1"}</Badge>}>
        <Do>Order a <b>panel</b> for pathogenic / likely pathogenic variants: <b>LDLR, APOB, PCSK9</b> (<b>LDLRAP1</b> if recessive pattern or HoFH phenotype).</Do>
        <div className={sub}>COR 1 for possible / probable / definite FH · COR 2a for any LDL ≥190 without a secondary cause · COR 2b for LDL 160–189.</div>
        <Expect>
          A variant is found in ≈2.5% of all adults with LDL ≥190, 21–44% with possible FH, 60–80% with definite FH. <b>Positive</b> → HeFH confirmed (goal &lt;70); CAD odds ≈22× vs ≈6× for the same LDL-C without a variant; relatives can be tested for the exact variant. <b>Negative</b> → does not exclude FH; treat the phenotype the same.
        </Expect>
        {variant && <div className="font-bold text-red-700 dark:text-red-400">Variant recorded → genetically confirmed FH.</div>}
      </Step>

      <Step n={4} title="Cascade screening" tag={<Badge color={clinicalFH || variant ? "red" : "slate"}>{clinicalFH || variant ? "Start now" : "If FH confirmed or LDL ≥190 persists"}</Badge>}>
        <Do><b>Who</b>: every 1st-degree relative (parents, siblings, children — 50% chance each). Then 2nd-degree relatives, and outward from each new case.</Do>
        <Do><b>How</b>: family variant known → test for that variant + lipid profile. No variant or no access → lipid profile alone (misses relatives with milder LDL-C).</Do>
        <Do><b>When</b>: children from age <b>≥2 y</b>. Add <b>Lp(a)</b> for 1st-degree relatives (COR 1).</Do>
        <Expect>Variant-based cascades find more affected relatives than LDL-C alone (1.77 vs 1.18 per family). Affected children: statin from age ≥8 y if LDL-C stays ≥160 after 3–6 mo of lifestyle; goal ≥50% ↓ and ≤130 mg/dL.</Expect>
      </Step>

      <Step n={5} title="Treat to goal · refer" last>
        <Do>Maximally tolerated statin → add <b>ezetimibe, PCSK9 mAb, and/or bempedoic acid</b> to the goal above. Inclisiran if LDL ≥100 despite statin ± ezetimibe (COR 2a).</Do>
        <Do>Recheck lipids 4–12 wk after each change.</Do>
        <Do><b>Refer to a lipid specialist</b>: suspected or diagnosed FH, genetic testing needed, HeFH not at goal on maximal statin + nonstatin, side effects on ≥2 statins, any suspicion of homozygous FH (evinacumab, lomitapide, apheresis).</Do>
      </Step>
    </Card>
  );
}
