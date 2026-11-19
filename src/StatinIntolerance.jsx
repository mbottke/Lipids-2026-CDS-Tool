// src/StatinIntolerance.jsx — statin intolerance pathway (opens from the statin rung)
// Primary source: 2026 ACC/AHA Dyslipidemia Guideline §4.2.11 (recs 1–8), §5.1, Table 24.
// Supplemented by: NLA 2022 Scientific Statement (Cheeley MK, J Clin Lipidol 2022;16:361-75),
// NLA 2023 Clinical Perspective (Warden BA, J Clin Lipidol 2023;17:19-39),
// AACE 2025 Guideline + Algorithm (Patel SB, Endocr Pract 2025;31:236-62 and 31:1207-38),
// ESC/EAS 2025 Focused Update (Mach F, Eur Heart J 2025;46:4359-78), EAS 2015 (Stroes ES).
// Evidence: CTT Lancet 2022;400:832-45 · SAMSON JACC 2021;78:1210-22 ·
// CLEAR Outcomes NEJM 2023;388:1353-64 · GAUSS-3 JAMA 2016;315:1580-90 ·
// ODYSSEY ALTERNATIVE J Clin Lipidol 2015;9:758-69 · VITAL JAMA Cardiol 2023;8:74-80.
import { useState } from "react";
import { Route } from "./ui.jsx";

const sub = "text-slate-500 dark:text-[#5a8aaa]";
const strong = "font-bold text-slate-800 dark:text-white";
const Cor = ({ children }) => <span className="ml-1 px-1 rounded text-[9px] font-black bg-slate-200 text-slate-600 dark:bg-[#1a2835] dark:text-[#7a9ab5] whitespace-nowrap">{children}</span>;

function S({ n, title, last, children }) {
  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col items-center">
        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-sky-500">{n}</div>
        {!last && <div className="flex-1 w-px my-0.5 bg-slate-200 dark:bg-[#1e3040]" />}
      </div>
      <div className={`flex-1 min-w-0 ${last ? "" : "pb-2.5"}`}>
        <div className={`text-[12px] leading-tight pt-0.5 ${strong}`}>{title}</div>
        <div className="mt-0.5 space-y-0.5">{children}</div>
      </div>
    </div>
  );
}

// group: "ascvd" | "high" | "mid" | "severe" | null — highlights the matching nonstatin row
export function StatinIntolerance({ onClose, group }) {
  const [aace, setAace] = useState(false);
  const row = (id) => `rounded-lg border p-2 ${group === id
    ? "border-sky-400 bg-sky-50 dark:border-sky-400/60 dark:bg-sky-500/10"
    : "border-slate-200 dark:border-[#1a2835] bg-white dark:bg-[#111a24]"}`;

  return (
    <div className="p-3 bg-slate-50 dark:bg-[#0a1018] border border-slate-200 dark:border-[#1e3040] rounded-lg text-[11px] text-slate-700 dark:text-[#d0e4f0] space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="font-bold text-slate-800 dark:text-[#d0e4f0] text-[12px]">Statin Intolerance Pathway</div>
        <button onClick={onClose} aria-label="Close" className="text-[12px] text-slate-400 dark:text-[#3d6580] hover:text-slate-600 dark:hover:text-sky-400 cursor-pointer font-bold px-1">✕</button>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-[#1a2835] bg-white dark:bg-[#111a24] p-2">
        <div><span className={strong}>Definition:</span> side effects on ≥2 statins, one at the lowest approved daily dose.</div>
        <div className={`mt-0.5 ${sub}`}>Complete intolerance is uncommon (&lt;5%). In blinded trials &gt;90% of muscle symptoms on a statin were not caused by it (excess 11 per 1,000 in year 1, none after).</div>
      </div>

      <div>
        <S n={1} title="Acknowledge, and state the cost of stopping">
          <div>Take the symptoms seriously; explain the higher ASCVD risk off statin and that alternatives exist.<Cor>COR 1</Cor></div>
        </S>
        <S n={2} title="Look for a contributor">
          <div>Hypothyroidism (TSH) · interacting drugs (macrolides, azoles, protease inhibitors, cyclosporine, gemfibrozil, amiodarone, diltiazem/verapamil, colchicine) · alcohol · vigorous exercise · CKD or liver disease · other muscle disease.<Cor>COR 1</Cor></div>
        </S>
        <S n={3} title="CK only for severe pain or weakness">
          <div>Routine CK adds nothing<Cor>COR 3</Cor>. CK ≥10× ULN with severe symptoms → hold the statin; neurology if it persists.</div>
        </S>
        <S n={4} title="Stop, wait for resolution, rechallenge">
          <div>Usually 2–4 weeks off (about 6 weeks, until CK normalizes, if CK was ≥4× ULN). Recurrence on rechallenge confirms it.</div>
        </S>
        <S n={5} title="Change the statin before abandoning statins">
          <div>① Lower dose of the same statin.</div>
          <div>② Different statin: rosuvastatin, pravastatin, pitavastatin, or fluvastatin XL.</div>
          <div>③ Non-daily long half-life statin: rosuvastatin 5 mg on 3 fixed days/week (or atorvastatin 1–3×/week). <span className={sub}>LDL-C ↓ ≈20–40%; observational data.</span></div>
          <div className={sub}>60–80% of patients end up tolerating some statin regimen.</div>
        </S>
        <S n={6} title="Add a nonstatin — do not wait in high-risk patients" last>
          <div className="space-y-1 mt-1">
            <div className={row("ascvd")}>
              <div className={strong}>Clinical ASCVD</div>
              <div>Lowest tolerated statin dose + bempedoic acid, ezetimibe, or a PCSK9 mAb, alone or combined<Cor>COR 1</Cor>. Still above goal and a mAb is not an option → inclisiran<Cor>2a</Cor>.</div>
            </div>
            <div className={row("high")}>
              <div className={strong}>No ASCVD, high risk <span className={`font-normal ${sub}`}>PREVENT-ASCVD ≥10%, CAC ≥300, or diabetes</span></div>
              <div>Bempedoic acid and/or ezetimibe to LDL &lt;70<Cor>COR 1</Cor> → add a PCSK9 mAb if not at goal<Cor>COR 1</Cor>.</div>
            </div>
            <div className={row("mid")}>
              <div className={strong}>No ASCVD, PREVENT-ASCVD 3–&lt;10%</div>
              <div>Ezetimibe and/or bempedoic acid to LDL &lt;100 may be reasonable<Cor>2b</Cor>. CAC if the decision is uncertain<Cor>2b</Cor>.</div>
            </div>
            {group === "severe" && (
              <div className={row("severe")}>
                <div className={strong}>LDL ≥190</div>
                <div>Same agents — ezetimibe, PCSK9 mAb, and/or bempedoic acid — to the goal set on this tab<Cor>COR 1</Cor>.</div>
              </div>
            )}
          </div>
        </S>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-[#1a2835] bg-white dark:bg-[#111a24] p-2">
        <div className={`mb-1 ${strong}`}>Expected LDL-C lowering without a statin</div>
        <div className="space-y-0.5">
          <div className="flex justify-between gap-2"><span><Route r="PO" /> Ezetimibe 10 mg</span><span className="font-mono tabular-nums font-bold">≈15–17%</span></div>
          <div className="flex justify-between gap-2"><span><Route r="PO" /> Bempedoic acid 180 mg</span><span className="font-mono tabular-nums font-bold">≈21%</span></div>
          <div className="flex justify-between gap-2"><span><Route r="PO" /> Bempedoic acid + ezetimibe</span><span className="font-mono tabular-nums font-bold">≈38%</span></div>
          <div className="flex justify-between gap-2"><span><Route r="SC" /> Evolocumab / alirocumab</span><span className="font-mono tabular-nums font-bold">≈45–55%</span></div>
        </div>
        <div className={`mt-1 ${sub}`}>
          Bempedoic acid is the only agent with an outcomes trial in statin-intolerant patients (CLEAR Outcomes, n = 13,970): MACE HR 0.87 (95% CI 0.79–0.96); gout 3.1% vs 2.1%, cholelithiasis 2.2% vs 1.2%. Enlicitide has no statin-intolerant or outcomes data yet.
        </div>
      </div>

      <div className={sub}>
        <span className="font-bold text-red-700 dark:text-red-400">Skip:</span> coenzyme Q10 (COR 3: No Benefit). Vitamin D did not prevent muscle symptoms in the one RCT; replace it only if deficient. <span className="font-bold">Refer</span> to a lipid specialist if no regimen is tolerated or the goal is not reached.
      </div>

      <div>
        <button type="button" onClick={() => setAace(p => !p)} aria-expanded={aace}
          className="text-[11px] font-bold text-blue-600 dark:text-sky-400 cursor-pointer py-1">{aace ? "▾" : "▸"} Where AACE 2025 differs</button>
        {aace && (
          <div className="mt-1 rounded-lg border border-slate-200 dark:border-[#1a2835] bg-white dark:bg-[#111a24] p-2 space-y-1">
            <div><span className={strong}>CK cut-off:</span> AACE stops the statin at CK &gt;5× ULN (manage as mild if &lt;3×). ACC/AHA: ≥10× with severe symptoms. ESC/EAS: 4× and 10×.</div>
            <div><span className={strong}>Bempedoic acid:</span> AACE suggests it for statin-intolerant patients with ASCVD or at increased risk (conditional, moderate certainty). ACC/AHA: COR 1. ESC/EAS: Class I.</div>
            <div><span className={strong}>PCSK9 mAb without ASCVD:</span> AACE suggests against when other agents are tolerated. ACC/AHA: COR 1 for high-risk primary prevention not at goal.</div>
            <div><span className={strong}>Inclisiran:</span> AACE makes no recommendation (insufficient evidence). ACC/AHA: 2a.</div>
            <div><span className={strong}>Vitamin D / CoQ10:</span> AACE 2025 advises correcting vitamin D deficiency; its 2020 algorithm allowed a CoQ10 trial, the 2025 update is silent. ACC/AHA: CoQ10 COR 3.</div>
            <div className={sub}>Shared across AACE, NLA, ACC/AHA, ESC/EAS: rechallenge, lower dose, hydrophilic or alternate statin, 1–3×/week dosing, then nonstatin.</div>
          </div>
        )}
      </div>
    </div>
  );
}
