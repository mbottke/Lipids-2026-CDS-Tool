// src/StatinIntolerance.jsx — statin intolerance pathway (opens from the statin rung)
// Primary source: 2026 ACC/AHA Dyslipidemia Guideline §4.2.11 (recs 1–8), §5.1, Table 24.
// Supplemented by: NLA 2022 Scientific Statement (Cheeley MK, J Clin Lipidol 2022;16:361-75),
// NLA 2023 Clinical Perspective (Warden BA, J Clin Lipidol 2023;17:19-39),
// AACE 2025 Guideline + Algorithm (Patel SB, Endocr Pract 2025;31:236-62 and 31:1207-38),
// ESC/EAS 2025 Focused Update (Mach F, Eur Heart J 2025;46:4359-78), EAS 2015 (Stroes ES).
// Evidence: CTT Lancet 2022;400:832-45 · SAMSON JACC 2021;78:1210-22 ·
// CLEAR Outcomes NEJM 2023;388:1353-64 · GAUSS-3 JAMA 2016;315:1580-90 ·
// ODYSSEY ALTERNATIVE J Clin Lipidol 2015;9:758-69 · VITAL JAMA Cardiol 2023;8:74-80.
import { Route, Cor, Step, LeaderRow, chol, cholUnit } from "./ui.jsx";

// group: "ascvd" | "high" | "mid" | "severe" | null — marks the matching nonstatin row
export function StatinIntolerance({ group, si }) {
  // LDL-C threshold in the active unit, e.g. "70" or "1.8 mmol/L"
  const L = (v) => (si ? `${chol(v, si)} ${cholUnit(si)}` : v);
  const row = (id) => `rounded-lg border p-2 ${group === id ? "border-accent bg-accent-soft" : "border-transparent"}`;
  const Fx = ({ r, k, v }) => <LeaderRow lead={<><Route r={r} />{" "}</>} label={k} value={v} />;

  return (
    <div data-si-panel className="text-[12px] text-ink space-y-3 [&>div:first-child]:border-t-0 [&>div:first-child]:pt-0">
      <div className="border-t border-line pt-2.5">
        <div><b>Definition:</b> side effects on at least 2 statins, one at the lowest approved daily dose.</div>
        <div className="text-muted mt-0.5">Complete intolerance is uncommon (&lt;5%). In blinded trials over 90% of muscle symptoms on a statin were not caused by it: an excess of 11 per 1,000 in year one and none after.</div>
      </div>

      <div className="border-t border-line pt-3">
        <Step small n={1} title="Acknowledge, and state the cost of stopping">
          <div>Take the symptoms seriously. Explain the higher ASCVD risk off a statin and that alternatives exist.<Cor>COR 1</Cor></div>
        </Step>
        <Step small n={2} title="Look for a contributor">
          <div>Hypothyroidism (TSH), alcohol, vigorous exercise, CKD or liver disease, other muscle disease.<Cor>COR 1</Cor></div>
          <div><b>Interacting drugs:</b> macrolides, azoles, protease inhibitors, cyclosporine, gemfibrozil, amiodarone, diltiazem, verapamil, colchicine.</div>
        </Step>
        <Step small n={3} title="CK only for severe pain or weakness">
          <div>Routine CK adds nothing<Cor>COR 3</Cor>. With CK ≥10× ULN and severe symptoms, hold the statin. Neurology referral if it persists.</div>
        </Step>
        <Step small n={4} title="Stop, wait for resolution, rechallenge">
          <div>Usually 2–4 weeks off (about 6 weeks, until CK normalizes, if CK was ≥4× ULN). Recurrence on rechallenge confirms it.</div>
        </Step>
        <Step small n={5} title="Change the statin before abandoning statins">
          <div>1. Lower dose of the same statin.</div>
          <div>2. A different statin: rosuvastatin, pravastatin, pitavastatin, or fluvastatin XL.</div>
          <div>3. Non-daily dosing of a long half-life statin: rosuvastatin 5 mg on 3 fixed days a week, or atorvastatin 1–3 times a week. <span className="text-faint">LDL-C falls ≈20–40%. Observational data.</span></div>
          <div className="text-muted">60–80% of patients end up tolerating some statin regimen.</div>
        </Step>
        <Step small n={6} title="Add a nonstatin. Do not wait in high-risk patients" last>
          <div className="space-y-1 pt-0.5">
            <div className={row("ascvd")}>
              <div className="font-bold text-ink">Clinical ASCVD</div>
              <div>Lowest tolerated statin dose plus bempedoic acid, ezetimibe, or a PCSK9 mAb, alone or combined<Cor>COR 1</Cor>. If still above goal and a mAb is not an option, inclisiran<Cor>COR 2a</Cor>.</div>
            </div>
            <div className={row("high")}>
              <div className="font-bold text-ink">No ASCVD, high risk <span className="font-normal text-faint">PREVENT-ASCVD ≥10%, CAC ≥300, or diabetes</span></div>
              <div>Bempedoic acid and/or ezetimibe to LDL-C below {L(70)}<Cor>COR 1</Cor>, then a PCSK9 mAb if not at goal<Cor>COR 1</Cor>.</div>
            </div>
            <div className={row("mid")}>
              <div className="font-bold text-ink">No ASCVD, PREVENT-ASCVD 3 to &lt;10%</div>
              <div>Ezetimibe and/or bempedoic acid to LDL-C below {L(100)} may be reasonable<Cor>COR 2b</Cor>. CAC if the decision is uncertain<Cor>COR 2b</Cor>.</div>
            </div>
            {group === "severe" && (
              <div className={row("severe")}>
                <div className="font-bold text-ink">LDL-C ≥{L(190)}</div>
                <div>The same agents (ezetimibe, a PCSK9 mAb, and/or bempedoic acid) to the goal set on this tab<Cor>COR 1</Cor>.</div>
              </div>
            )}
          </div>
        </Step>
      </div>

      <div className="border-t border-line pt-2.5">
        <div className="font-bold text-ink mb-1.5">Expected LDL-C reduction without a statin</div>
        <div className="space-y-1">
          <Fx r="PO" k="Ezetimibe 10 mg" v="≈15–17%" />
          <Fx r="PO" k="Bempedoic acid 180 mg" v="≈21%" />
          <Fx r="PO" k="Bempedoic acid + ezetimibe" v="≈38%" />
          <Fx r="SC" k="Evolocumab or alirocumab" v="≈45–55%" />
        </div>
        <div className="text-[12px] text-muted mt-1.5 leading-snug">
          Bempedoic acid is the only agent with an outcomes trial in statin-intolerant patients (CLEAR Outcomes, n = 13,970): MACE HR 0.87 (95% CI 0.79–0.96), gout 3.1% vs 2.1%, cholelithiasis 2.2% vs 1.2%. Enlicitide has no statin-intolerant or outcomes data yet.
        </div>
      </div>

      <div className="text-[12px] text-muted leading-snug border-t border-line pt-2">
        <b className="text-red-700 dark:text-red-400">Skip:</b> coenzyme Q10 (COR 3: No Benefit). Vitamin D did not prevent muscle symptoms in the one RCT. Replace it only if deficient. <b>Refer</b> to a lipid specialist if no regimen is tolerated or the goal is not reached.
      </div>

      <div className="border-t border-line pt-2">
        <div className="font-bold text-ink mb-1.5">Where AACE 2025 differs</div>
        <div className="space-y-1 text-[12px] text-body leading-snug">
            <div><b>CK cut-off:</b> AACE stops the statin at CK &gt;5× ULN (managed as mild if &lt;3×). ACC/AHA: ≥10× with severe symptoms. ESC/EAS: 4× and 10×.</div>
            <div><b>Bempedoic acid:</b> AACE suggests it for statin-intolerant patients with ASCVD or at increased risk (conditional, moderate certainty). ACC/AHA: COR 1. ESC/EAS: Class I.</div>
            <div><b>PCSK9 mAb without ASCVD:</b> AACE suggests against when other agents are tolerated. ACC/AHA: COR 1 for high-risk primary prevention not at goal.</div>
            <div><b>Inclisiran:</b> AACE makes no recommendation (insufficient evidence). ACC/AHA: 2a.</div>
            <div><b>Vitamin D and CoQ10:</b> AACE 2025 advises correcting vitamin D deficiency. Its 2020 algorithm allowed a CoQ10 trial and the 2025 update is silent. ACC/AHA: CoQ10 COR 3.</div>
            <div className="text-faint">Shared across AACE, NLA, ACC/AHA, and ESC/EAS: rechallenge, lower dose, hydrophilic or alternate statin, 1–3 times weekly dosing, then a nonstatin.</div>
          </div>
      </div>
    </div>
  );
}
