// src/BloodPressure.jsx — blood pressure card
// 2025 AHA/ACC/Multisociety High Blood Pressure Guideline (Jones DW et al.
// Circulation 2025;152:e114-e218 / JACC 2025;86:1567-1678): Table 4, Table 12,
// Table 13, §3.1.2, §3.1.4, §3.2.3, §5.2.2–5.2.9, §5.3, §5.5, §5.6, Figures 6–8.
import { useState } from "react";
import { Card, Num, Toggle, Badge, CheckRow, Disclosure } from "./ui.jsx";
import { bpPlan } from "./bp.js";
import { CVD_BP_TX_THRESHOLD } from "./prevent.js";

const sub = "text-slate-500 dark:text-[#5a8aaa]";
const body = "text-slate-600 dark:text-[#d0e4f0]";
const strong = "font-bold text-slate-700 dark:text-white/90";

const toneBox = {
  red:     "bg-red-50 border-red-300 dark:bg-red-500/10 dark:border-red-500/30",
  amber:   "bg-amber-50 border-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30",
  blue:    "bg-blue-50 border-blue-300 dark:bg-sky-500/15 dark:border-sky-500/30",
  emerald: "bg-emerald-50 border-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30",
};
const toneTxt = {
  red: "text-red-800 dark:text-red-300", amber: "text-amber-800 dark:text-amber-300",
  blue: "text-blue-800 dark:text-sky-300", emerald: "text-emerald-800 dark:text-emerald-300",
};

function Rung({ n, title, last, children }) {
  return (
    <div className="flex gap-2.5">
      <div className="flex flex-col items-center">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 bg-orange-500 dark:bg-orange-500/80">{n}</div>
        {!last && <div className="flex-1 w-px my-0.5 bg-slate-200 dark:bg-[#1e3040]" />}
      </div>
      <div className={`flex-1 min-w-0 ${last ? "" : "pb-3"}`}>
        <div className="text-[12px] font-bold text-slate-800 dark:text-[#d0e4f0] leading-tight pt-1">{title}</div>
        <div className={`text-[11px] mt-1 space-y-1 ${body}`}>{children}</div>
      </div>
    </div>
  );
}

const Row = ({ k, children }) => (
  <div className="grid grid-cols-[84px_1fr] gap-x-2">
    <span className={strong}>{k}</span><span>{children}</span>
  </div>
);
const Fx = ({ k, v, children }) => (
  <div className="flex gap-2 items-baseline">
    <span className="w-[70px] shrink-0 font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">{v}</span>
    <span><span className={strong}>{k}</span>{children ? <span className={sub}> — {children}</span> : null}</span>
  </div>
);

export function BloodPressure({ sbp, setSbp, dbp, setDbp, bpTx, setBpTx, cvd10, auto, flags, toggleFlag }) {
  const [open, setOpen] = useState(false);
  const [sec, setSec] = useState(null);
  const tog = (id) => setSec(p => (p === id ? null : id));

  const eff = {
    clinicalCvd: !!(flags.cvd || auto.clinicalCvd),
    dm: !!(flags.dm || auto.dm),
    ckd: !!(flags.ckd || auto.ckd),
  };
  const plan = bpPlan({ sbp, dbp, onTx: bpTx, cvd10, ...eff });
  const cvdHigh = cvd10 !== null && cvd10 >= CVD_BP_TX_THRESHOLD;
  const bpStr = sbp === "" ? null : `${sbp}/${dbp === "" ? "–" : dbp}`;

  return (
    <Card title="Blood Pressure" accent="orange">
      <p className="text-[11px] text-slate-400 dark:text-[color:var(--accent-sub)] mb-2">2025 AHA/ACC hypertension guideline · goal &lt;130/80 for all adults</p>

      {/* Summary row — always visible */}
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
        className={`w-full text-left rounded-lg border-2 p-2.5 cursor-pointer active:opacity-70 transition-colors min-h-[48px] ${plan ? toneBox[plan.action.tone] : "bg-slate-50 border-slate-200 dark:bg-[#0a1018] dark:border-[#1a2835]"}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            {plan ? (<>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[14px] font-black font-mono tabular-nums text-slate-800 dark:text-white">{bpStr}</span>
                <Badge color={plan.cat.clr}>{plan.cat.label}</Badge>
                {bpTx && <Badge color="slate">on therapy</Badge>}
              </div>
              <div className={`text-[13px] font-bold leading-snug mt-1 ${toneTxt[plan.action.tone]}`}>{plan.action.title}</div>
            </>) : (
              <div className={`text-[12px] font-bold ${sub}`}>Enter systolic BP to get the BP plan</div>
            )}
          </div>
          <span className={`text-[10px] font-semibold shrink-0 ${sub}`}>{open ? "▾ hide" : "▸ open"}</span>
        </div>
        {plan && open && <div className="text-[11px] mt-1 leading-snug text-slate-700 dark:text-[#d0e4f0]">{plan.action.detail}</div>}
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Num label="Systolic BP" unit="mmHg" value={sbp} on={setSbp} min={70} max={260} ph="SBP" />
            <Num label="Diastolic BP" unit="mmHg" value={dbp} on={setDbp} min={30} max={160} ph="DBP" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <Toggle value={bpTx} on={setBpTx} label="On BP med(s)" />
            <div className="text-right">
              <div className={`text-[14px] font-black font-mono tabular-nums leading-none ${cvdHigh ? "text-orange-600 dark:text-orange-400" : "text-slate-700 dark:text-[#d0e4f0]"}`}>{cvd10 !== null ? `${cvd10}%` : "—"}</div>
              <div className={`text-[9px] font-bold uppercase tracking-wider mt-1 ${sub}`}>PREVENT-CVD 10-yr</div>
            </div>
          </div>
          <div className={`text-[10px] -mt-1 leading-snug ${sub}`}>
            Average of ≥2 readings on ≥2 occasions; confirm out of office (home 130/80 = office 130/80). SBP and "On BP meds" are shared with the PREVENT calculator.
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-500 dark:text-[#5a8aaa] uppercase tracking-wider mb-1">Treat at ≥130/80 without a lifestyle trial if any</div>
            <div className="space-y-1">
              <CheckRow compact tone="amber" checked={eff.clinicalCvd} on={() => toggleFlag("cvd")}
                label="Clinical CVD" sub={auto.clinicalCvd ? `Auto: ${auto.clinicalCvd}` : "Coronary heart disease, stroke, or heart failure"} />
              <CheckRow compact tone="amber" checked={eff.dm} on={() => toggleFlag("dm")}
                label="Diabetes" sub={auto.dm ? `Auto: ${auto.dm}` : null} />
              <CheckRow compact tone="amber" checked={eff.ckd} on={() => toggleFlag("ckd")}
                label="CKD" sub={auto.ckd ? `Auto: ${auto.ckd}` : "eGFR <60 or albuminuria ≥30 mg/g"} />
              <div className={`flex items-start gap-2.5 rounded-lg border p-2 ${cvdHigh ? "bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30" : "bg-white dark:bg-[#111a24] border-slate-200 dark:border-[#1a2835]"}`}>
                <div className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${cvdHigh ? "bg-amber-500 border-amber-500" : "border-slate-300 dark:border-[#1e3040]"}`}>{cvdHigh && <span className="text-white text-[10px] font-bold">✓</span>}</div>
                <div>
                  <div className="text-[12px] font-bold text-slate-800 dark:text-[#d0e4f0] leading-tight">PREVENT 10-yr total CVD ≥{CVD_BP_TX_THRESHOLD}%</div>
                  <div className={`text-[10px] ${sub}`}>{eff.clinicalCvd ? "Not needed — clinical CVD already sets the threshold" : cvd10 !== null ? `Calculated: ${cvd10}%` : "Not calculated — complete the PREVENT inputs on the PRIMARY tab (ages 30–79)"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-[#1a2835] bg-slate-50 dark:bg-[#0a1018] p-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-[20px] font-black font-mono tabular-nums text-slate-800 dark:text-white leading-none" style={{fontFeatureSettings:'"zero" 0'}}>&lt;130/80</span>
              <span className={`text-[11px] font-bold ${sub}`}>goal · SBP &lt;120 encouraged</span>
            </div>
            <div className={`text-[10px] mt-1 leading-snug ${sub}`}>
              COR 1 at PREVENT-CVD ≥{CVD_BP_TX_THRESHOLD}%, 2b below it. Exceptions: pregnancy (chronic hypertension &lt;140/90); frailty, limited life expectancy, or institutional care → individualize.
            </div>
          </div>

          <Disclosure open={sec === "rx"} on={() => tog("rx")} label="Drug therapy: initial → subsequent" hint="5 steps">
            <Rung n={1} title="Initial therapy">
              <Row k="Stage 1">One first-line agent; titrate, then add (COR 2a).</Row>
              <Row k="Stage 2">Two first-line agents from different classes, ideally one single-pill combination (COR 1): ACEi or ARB + CCB or thiazide-type. Best suited to nonfrail adults ≥20/10 mm Hg above goal.</Row>
              <div className="mt-1 rounded-lg border border-slate-200 dark:border-[#1a2835] p-2 space-y-1 bg-slate-50 dark:bg-[#0a1018]">
                <div className={`text-[10px] font-bold uppercase tracking-wider ${sub}`}>First-line classes · usual mg/day</div>
                <Row k="Thiazide-type">chlorthalidone 12.5–25 · HCTZ 25–50 · indapamide 1.25–2.5</Row>
                <Row k="ACE inhibitor">lisinopril 10–40 · benazepril 10–40 · ramipril 2.5–20</Row>
                <Row k="ARB">losartan 50–100 · olmesartan 20–40 · telmisartan 20–80 · valsartan 80–320</Row>
                <Row k="DHP CCB">amlodipine 2.5–10 · nifedipine LA 30–90</Row>
              </div>
              <div className={sub}>No preferred thiazide-type agent for initial therapy. β-blockers only with a compelling indication (CHD, HF). No race-based first-line rule in the 2025 guideline.</div>
            </Rung>
            <Rung n={2} title="Not at goal at 1 month">
              <div>Titrate the dose or add a second first-line class; combine into a single pill. Recheck monthly.</div>
            </Rung>
            <Rung n={3} title="Three drugs">
              <div>ACEi or ARB + dihydropyridine CCB + thiazide-type diuretic, each at maximally tolerated dose.</div>
            </Rung>
            <Rung n={4} title="Resistant hypertension">
              <div className={sub}>Above goal on 3 drugs including a diuretic, or at goal on ≥4.</div>
              <div>• Exclude pseudoresistance: adherence, technique, home/ambulatory BP, interfering drugs.</div>
              <div>• Screen for primary aldosteronism (aldosterone, renin, ratio) — hypokalemia not required (COR 1).</div>
              <div>• Switch the diuretic to chlorthalidone 12.5–25 or indapamide 1.25–2.5 mg.</div>
              <div>• Add <b>spironolactone 25–50 mg/day</b> if eGFR ≥45 (COR 1). Recheck K⁺ and creatinine in 2–4 wk.</div>
            </Rung>
            <Rung n={5} title="Beyond four drugs" last>
              <div>MRA not tolerated (COR 2a): amiloride, β-blocker, α-blocker, central sympatholytic, aprocitentan 12.5 mg, or hydralazine / minoxidil (with a β-blocker + loop diuretic).</div>
              <div>Baxdrostat 2 mg daily (FDA 2026; not in the guideline) — ACC 2026 pathway: only after a 4-drug regimen that includes an MRA, with a hypertension specialist.</div>
              <div>Renal denervation may be reasonable in selected patients (COR 2b). Refer if uncontrolled &gt;6 months.</div>
            </Rung>
            <div className="mt-2 text-[11px] font-bold text-red-700 dark:text-red-400">Never combine ACEi + ARB (or either with a renin inhibitor) — COR 3: Harm.</div>
          </Disclosure>

          <Disclosure open={sec === "ci"} on={() => tog("ci")} label="Choose by comorbidity">
            <div className={`text-[11px] space-y-1.5 ${body}`}>
              <Row k="CKD">ACEi or ARB when eGFR &lt;60 with albuminuria ≥30 mg/g (COR 1). eGFR &lt;30: loop diuretic over thiazide-type.</Row>
              <Row k="Diabetes">Any first-line class; ACEi or ARB if CKD or albuminuria ≥30 mg/g (COR 1).</Row>
              <Row k="HFrEF">Titrate HF therapy: ARNi/ACEi/ARB, β-blocker (bisoprolol, carvedilol, metoprolol succinate), MRA, SGLT2i. Avoid non-dihydropyridine CCB.</Row>
              <Row k="CHD / post-MI">ACEi or ARB + β-blocker; add CCB, thiazide-type, or MRA as needed.</Row>
              <Row k="Stroke / TIA">Thiazide-type, ACEi, or ARB (COR 1). Applies to stable outpatients.</Row>
              <Row k="Pregnancy">Labetalol or nifedipine ER (COR 1). Avoid ACEi, ARB, renin inhibitors, MRA, atenolol (COR 3: Harm).</Row>
            </div>
          </Disclosure>

          <Disclosure open={sec === "ls"} on={() => tog("ls")} label="Lifestyle: expected SBP change" hint="mm Hg">
            <div className={`text-[11px] space-y-1 ${body}`}>
              <Fx v="−6 to −8" k="Sodium <2,300 mg/day">ideal &lt;1,500</Fx>
              <Fx v="−6 to −8" k="Weight loss ≥5%">≈1 mm Hg per kg</Fx>
              <Fx v="−5 to −8" k="DASH pattern" />
              <Fx v="−5 to −7" k="Potassium salt substitute">not with CKD or K⁺-retaining drugs unless K⁺ is monitored</Fx>
              <Fx v="−4 to −8" k="Aerobic exercise">90–150 min/week</Fx>
              <Fx v="−5 to −10" k="Isometric handgrip">4 × 2 min, 3 sessions/week</Fx>
              <Fx v="−4 to −6" k="Alcohol">abstain, or ≤1 drink/day women, ≤2 men</Fx>
              <div className={`pt-1 ${sub}`}>Mean change in adults with hypertension (guideline Table 12); effects are not additive.</div>
            </div>
          </Disclosure>

          <Disclosure open={sec === "mon"} on={() => tog("mon")} label="Follow-up and labs">
            <div className={`text-[11px] space-y-1 ${body}`}>
              <div className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0 w-[70px]">Monthly</span><span>Visits until at goal, then every 3–6 months.</span></div>
              <div className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0 w-[70px]">Home BP</span><span>Use it to confirm the diagnosis and to titrate (COR 1).</span></div>
              <div className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0 w-[70px]">2–4 wk</span><span>Basic metabolic panel after starting or titrating a diuretic, ACEi, ARB, or MRA. An eGFR fall up to 30% on ACEi/ARB is acceptable.</span></div>
              <div className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0 w-[70px]">Baseline</span><span>CBC, electrolytes, creatinine, lipid profile, glucose or A1c, TSH, urinalysis, urine albumin-creatinine ratio, ECG.</span></div>
              <div className="flex gap-2"><span className="text-amber-500 font-bold shrink-0 w-[70px]">Statins</span><span>Amlodipine, diltiazem, and verapamil raise simvastatin and atorvastatin levels. Simvastatin label maximum: 20 mg with amlodipine, 10 mg with diltiazem or verapamil.</span></div>
            </div>
          </Disclosure>
        </div>
      )}
    </Card>
  );
}
