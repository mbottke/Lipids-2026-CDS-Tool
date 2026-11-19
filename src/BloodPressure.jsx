// src/BloodPressure.jsx — blood pressure section
// 2025 AHA/ACC/Multisociety High Blood Pressure Guideline (Jones DW et al.
// Circulation 2025;152:e114-e218 / JACC 2025;86:1567-1678): Table 4, Table 12,
// Table 13, §3.1.2, §3.1.4, §3.2.3, §5.2.2–5.2.9, §5.3, §5.5, §5.6, Figures 6–8.
// Baxdrostat: FDA label (2026); positioning from the 2026 ACC resistant-hypertension pathway.
import { useState, useRef } from "react";
import { Card, Num, Toggle, Badge, CheckRow, AutoRow, Disclosure, Step, Cor, Eyebrow, LeaderRow, ROWS, backIntoView } from "./ui.jsx";
import { bpPlan } from "./bp.js";
import { CVD_BP_TX_THRESHOLD } from "./prevent.js";

const toneTxt = {
  red: "text-red-800 dark:text-red-300", amber: "text-amber-800 dark:text-amber-300",
  blue: "text-accent", emerald: "text-emerald-800 dark:text-emerald-300",
};

const Row = ({ k, children }) => (
  <div className="grid grid-cols-[92px_1fr] gap-x-2">
    <span className="font-semibold text-ink">{k}</span><span>{children}</span>
  </div>
);
const Fx = ({ k, v, children }) => <LeaderRow label={k} value={v} sub={children} />;
const Line = ({ k, children }) => (
  <div className="flex gap-2"><span className="text-ink font-semibold shrink-0 w-[68px]">{k}</span><span>{children}</span></div>
);

// cvdWithDm: cvd10 was calculated with diabetes although the PREVENT diabetes toggle is off
export function BloodPressure({ sbp, setSbp, dbp, setDbp, bpTx, setBpTx, cvd10, cvdWithDm, auto, flags, toggleFlag }) {
  const [open, setOpen] = useState(false);
  const [sec, setSec] = useState({});   // open sub-sections. Each opens on its own: opening one never closes another.
  const tog = (id) => setSec(p => ({ ...p, [id]: !p[id] }));
  const sumRef = useRef(null);
  // Closing from the end of the open section: the summary comes back into view and takes focus.
  const closeFromEnd = () => {
    setOpen(false);
    sumRef.current?.focus({ preventScroll: true });
    requestAnimationFrame(() => backIntoView(sumRef.current));
  };

  const eff = {
    clinicalCvd: !!(flags.cvd || auto.clinicalCvd),
    dm: !!(flags.dm || auto.dm),
    ckd: !!(flags.ckd || auto.ckd),
  };
  const plan = bpPlan({ sbp, dbp, onTx: bpTx, cvd10, ...eff });
  const cvdHigh = cvd10 !== null && cvd10 >= CVD_BP_TX_THRESHOLD;
  const bpStr = sbp === "" ? null : `${sbp}/${dbp === "" ? "–" : dbp}`;

  return (
    <div data-bp><Card title="Blood pressure">
      <p className="text-[12px] text-muted mb-2">2025 AHA/ACC hypertension guideline. Goal &lt;130/80 for all adults.</p>

      {/* Summary: always visible */}
      <div className="border-y border-line">
      <button ref={sumRef} type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className="w-full text-left py-3 cursor-pointer active:opacity-70 min-h-[48px] rounded-lg">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            {plan ? (<>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[15px] font-semibold font-mono tabular-nums text-ink">{bpStr}</span>
                <Badge color={plan.cat.clr}>{plan.cat.label}</Badge>
                {bpTx && <Badge color="slate">on therapy</Badge>}
              </div>
              <div className={`text-[14px] font-bold leading-snug mt-1 ${toneTxt[plan.action.tone]}`}>{plan.action.title}</div>
            </>) : (
              <div className="text-[13px] font-medium text-muted">Enter systolic BP for the blood pressure plan</div>
            )}
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
            className={`shrink-0 text-muted transition-transform duration-150 ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
        </div>
        {plan && open && <div className="text-[12px] mt-1.5 leading-snug text-body">{plan.action.detail}</div>}
      </button>
      </div>

      {open && (
        <div className="panel-in mt-3 space-y-4">
          <div>
            <div className="grid grid-cols-2 gap-3">
              <Num label="Systolic BP" unit="mmHg" value={sbp} on={setSbp} min={70} max={260} ph="SBP" />
              <Num label="Diastolic BP" unit="mmHg" value={dbp} on={setDbp} min={30} max={160} ph="DBP" />
            </div>
            <div className="flex items-center justify-between gap-2 mt-1">
              <Toggle value={bpTx} on={setBpTx} label="On BP medication" />
              <div className="text-right">
                <div className={`text-[15px] font-semibold font-mono tabular-nums leading-none ${cvdHigh ? "text-amber-700 dark:text-amber-400" : "text-ink"}`}>{cvd10 !== null ? `${cvd10}%` : "–"}</div>
                <div className="text-[11px] font-medium text-muted mt-1">10-year total CVD{cvdWithDm ? ", with diabetes" : ""}</div>
              </div>
            </div>
            <div className="text-[12px] text-faint leading-snug">
              Average of at least 2 readings on at least 2 occasions, confirmed out of office (home 130/80 = office 130/80). Systolic BP and the BP medication switch are shared with the PREVENT calculator.
            </div>
          </div>

          <div>
            <Eyebrow>Start drug therapy at ≥130/80 without a lifestyle trial if any apply</Eyebrow>
            <div className={ROWS}>
              {/* A condition set elsewhere in the app is shown read-only. Otherwise it can be checked here. */}
              {auto.clinicalCvd
                ? <AutoRow compact checked label="Clinical CVD" sub={`Set by: ${auto.clinicalCvd}`} />
                : <CheckRow compact checked={!!flags.cvd} on={() => toggleFlag("cvd")} label="Clinical CVD" sub="Coronary heart disease, stroke, or heart failure" />}
              {auto.dm
                ? <AutoRow compact checked label="Diabetes" sub={`Set by: ${auto.dm}`} />
                : <CheckRow compact checked={!!flags.dm} on={() => toggleFlag("dm")} label="Diabetes" />}
              {auto.ckd
                ? <AutoRow compact checked label="CKD" sub={`Set by: ${auto.ckd}`} />
                : <CheckRow compact checked={!!flags.ckd} on={() => toggleFlag("ckd")} label="CKD" sub="eGFR <60 or albuminuria ≥30 mg/g" />}
              <AutoRow compact checked={cvdHigh} label={`PREVENT 10-year total CVD ≥${CVD_BP_TX_THRESHOLD}%`}
                sub={eff.clinicalCvd ? "Not needed: clinical CVD already sets the threshold"
                  : cvd10 !== null ? `Calculated${cvdWithDm ? " with diabetes" : ""}: ${cvd10}%`
                  : "Not calculated. Complete the PREVENT inputs on the Primary tab (ages 30–79)"} />
            </div>
          </div>

          <div>
            <div className="flex items-baseline gap-2.5 flex-wrap">
              <span className="text-[22px] font-medium font-mono tabular-nums text-ink leading-none tracking-[-0.03em]">&lt;130/80</span>
              <span className="text-[12px] font-semibold text-muted">Goal. Systolic &lt;120 is encouraged.</span>
            </div>
            <div className="text-[12px] text-faint mt-1.5 leading-snug">
              COR 1 at total CVD ≥{CVD_BP_TX_THRESHOLD}%, 2b below it. Exceptions: pregnancy (chronic hypertension &lt;140/90). Individualize with frailty, limited life expectancy, or institutional care.
            </div>
          </div>

          <div className="border-b border-line">
            <Disclosure open={!!sec.rx} on={() => tog("rx")} label="Drug therapy: initial to subsequent">
              <Step small n={1} title="Initial therapy">
                <Row k="Stage 1">One first-line agent. Titrate, then add<Cor>COR 2a</Cor>.</Row>
                <Row k="Stage 2">Two first-line agents from different classes, ideally one single-pill combination<Cor>COR 1</Cor>: ACEi or ARB with a CCB or thiazide-type diuretic. Best suited to nonfrail adults ≥20/10 mmHg above goal.</Row>
                <div className="pl-3 border-l-2 border-line space-y-1 mt-1">
                  <div className="text-[12px] font-bold text-ink">First-line classes, usual mg/day</div>
                  <Row k="Thiazide-type">chlorthalidone 12.5–25, HCTZ 25–50, indapamide 1.25–2.5</Row>
                  <Row k="ACE inhibitor">lisinopril 10–40, benazepril 10–40, ramipril 2.5–20</Row>
                  <Row k="ARB">losartan 50–100, olmesartan 20–40, telmisartan 20–80, valsartan 80–320</Row>
                  <Row k="DHP CCB">amlodipine 2.5–10, nifedipine LA 30–90</Row>
                </div>
                <div className="text-muted">No preferred thiazide-type agent for initial therapy. Beta-blockers only with a compelling indication (CHD, HF). The 2025 guideline has no race-based first-line rule.</div>
              </Step>
              <Step small n={2} title="Not at goal at 1 month">
                <div>Titrate the dose or add a second first-line class, combined into a single pill. Recheck monthly.</div>
              </Step>
              <Step small n={3} title="Three drugs">
                <div>ACEi or ARB plus a dihydropyridine CCB plus a thiazide-type diuretic, each at the maximally tolerated dose.</div>
              </Step>
              <Step small n={4} title="Resistant hypertension">
                <div className="text-muted">Above goal on 3 drugs including a diuretic, or at goal on 4 or more.</div>
                <div>• Exclude pseudoresistance: adherence, technique, home or ambulatory BP, interfering drugs.</div>
                <div>• Screen for primary aldosteronism (aldosterone, renin, ratio). Hypokalemia is not required<Cor>COR 1</Cor>.</div>
                <div>• Switch the diuretic to chlorthalidone 12.5–25 mg or indapamide 1.25–2.5 mg.</div>
                <div>• Add <b>spironolactone 25–50 mg/day</b> if eGFR ≥45<Cor>COR 1</Cor>. Recheck K⁺ and creatinine in 2–4 weeks.</div>
              </Step>
              <Step small n={5} title="Beyond four drugs" last>
                <div>MRA not tolerated<Cor>COR 2a</Cor>: amiloride, a beta-blocker, an alpha-blocker, a central sympatholytic, aprocitentan 12.5 mg, or hydralazine or minoxidil (with a beta-blocker and loop diuretic).</div>
                <div>Baxdrostat 2 mg daily (FDA 2026, not in the guideline). ACC 2026 pathway: only after a 4-drug regimen that includes an MRA, with a hypertension specialist.</div>
                <div>Renal denervation may be reasonable in selected patients<Cor>COR 2b</Cor>. Refer if uncontrolled beyond 6 months.</div>
              </Step>
              <div className="mt-2 text-[12px] font-semibold text-red-800 dark:text-red-300">Never combine an ACEi with an ARB, or either with a renin inhibitor (COR 3: Harm).</div>
            </Disclosure>

            <Disclosure open={!!sec.ci} on={() => tog("ci")} label="Choose by comorbidity">
              <div className="text-[12px] text-body space-y-1.5">
                <Row k="CKD">ACEi or ARB when eGFR &lt;60 with albuminuria ≥30 mg/g<Cor>COR 1</Cor>. With eGFR &lt;30, a loop diuretic over a thiazide-type.</Row>
                <Row k="Diabetes">Any first-line class. ACEi or ARB with CKD or albuminuria ≥30 mg/g<Cor>COR 1</Cor>.</Row>
                <Row k="HFrEF">Titrate HF therapy: ARNi, ACEi, or ARB, plus a beta-blocker (bisoprolol, carvedilol, or metoprolol succinate), an MRA, and an SGLT2i. Avoid non-dihydropyridine CCBs.</Row>
                <Row k="CHD, post-MI">ACEi or ARB plus a beta-blocker. Add a CCB, thiazide-type, or MRA as needed.</Row>
                <Row k="Stroke, TIA">Thiazide-type, ACEi, or ARB<Cor>COR 1</Cor>. Applies to stable outpatients.</Row>
                <Row k="Pregnancy">Labetalol or nifedipine ER<Cor>COR 1</Cor>. Avoid ACEi, ARB, renin inhibitors, MRA, and atenolol (COR 3: Harm).</Row>
              </div>
            </Disclosure>

            <Disclosure open={!!sec.ls} on={() => tog("ls")} label="Lifestyle: expected systolic change" hint="mmHg">
              <div className="space-y-1.5">
                <Fx k="Sodium <2,300 mg/day" v="−6 to −8">Ideal is below 1,500</Fx>
                <Fx k="Weight loss ≥5%" v="−6 to −8">About 1 mmHg per kg</Fx>
                <Fx k="DASH pattern" v="−5 to −8" />
                <Fx k="Potassium salt substitute" v="−5 to −7">Not with CKD or potassium-retaining drugs unless K⁺ is monitored</Fx>
                <Fx k="Aerobic exercise" v="−4 to −8">90–150 minutes a week</Fx>
                <Fx k="Isometric handgrip" v="−5 to −10">4 × 2 minutes, 3 sessions a week</Fx>
                <Fx k="Alcohol" v="−4 to −6">Abstain, or at most 1 drink a day for women and 2 for men</Fx>
                <div className="text-[12px] text-faint leading-snug pt-0.5">Mean change in adults with hypertension (guideline Table 12). Effects are not additive.</div>
              </div>
            </Disclosure>

            <Disclosure open={!!sec.mon} on={() => tog("mon")} label="Follow-up and labs">
              <div className="text-[12px] text-body space-y-1">
                <Line k="Monthly">Visits until at goal, then every 3–6 months.</Line>
                <Line k="Home BP">Use it to confirm the diagnosis and to titrate<Cor>COR 1</Cor>.</Line>
                <Line k="2–4 wk">Basic metabolic panel after starting or titrating a diuretic, ACEi, ARB, or MRA. An eGFR fall of up to 30% on an ACEi or ARB is acceptable.</Line>
                <Line k="Baseline">CBC, electrolytes, creatinine, lipid profile, glucose or A1c, TSH, urinalysis, urine albumin-creatinine ratio, ECG.</Line>
                <Line k="Statins">Amlodipine, diltiazem, and verapamil raise simvastatin and atorvastatin levels. Simvastatin label maximum: 20 mg with amlodipine, 10 mg with diltiazem or verapamil.</Line>
              </div>
            </Disclosure>
          </div>
          <button type="button" onClick={closeFromEnd} aria-label="Close blood pressure"
            className="w-full min-h-[44px] flex items-center justify-center gap-2 text-[12px] font-semibold text-muted hover:text-ink cursor-pointer rounded-lg">
            Close
            <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 15 6-6 6 6"/></svg>
          </button>
        </div>
      )}
    </Card></div>
  );
}
