import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  calcPREVENT10, calcPREVENT30,
  calcPREVENT10CVD, calcPREVENT30CVD,
  calcPREVENT10HF, calcPREVENT30HF,
  riskCat10, riskCat30,
  discordance, optimizedInputs, driverDeltas,
  CVD_BP_TX_THRESHOLD,
} from "./prevent.js";
import { Toggle, Num, SINum, Card, Badge, Route, SectionHead, Disclosure, LeaderRow, LABEL, CHOL_F, TG_F } from "./ui.jsx";
import { dlcnScore, estimateUntreatedLdl, ldlCorrectionFactor, severeGoal, DLCN_CLINICAL_FH_MIN } from "./fh.js";
import {
  vhrStatus, recPrimary, recSecondary, recDiabetes, recSevere,
  lpaInterpret, apoBInterpret, tgAdvice,
} from "./recommend.js";
import { AscvdTab, DiabetesTab } from "./RiskTabs.jsx";
import { SevereGoalTiers, FHWorkup } from "./SevereTab.jsx";
import { StatinIntolerance } from "./StatinIntolerance.jsx";
import { LifestyleLDL } from "./Lifestyle.jsx";
import { BloodPressure } from "./BloodPressure.jsx";
import { Plan, PlanBar } from "./Plan.jsx";

// Characteristics of cardiovascular-kidney-metabolic (CKM) syndrome (guideline §2.1).
// Three or more of five = metabolic syndrome.
const METSYN_CRITERIA = [
  { id:"ms_waist", l:"Elevated waist circumference", d:"Men ≥40 in (102 cm), women ≥35 in (88 cm)" },
  { id:"ms_tg", l:"Elevated triglycerides", d:"≥150 mg/dL or on treatment" },
  { id:"ms_hdl", l:"Low HDL-C", d:"Men <40 mg/dL, women <50 mg/dL, or on treatment" },
  { id:"ms_bp", l:"Elevated blood pressure", d:"≥130/85 mmHg or on treatment" },
  { id:"ms_gluc", l:"Elevated fasting glucose", d:"≥100 mg/dL or on treatment" },
];

// Risk enhancers: 2026 guideline Table 13
const ENHANCERS = [
  { id:"fhx", l:"Family history of premature ASCVD", d:"Parent or sibling: onset <55 y (men) or <65 y (women)" },
  { id:"ancestry", l:"Higher-risk ancestry", d:"e.g., South Asian, Filipino" },
  { id:"inflam", l:"Chronic inflammatory disease", d:"e.g., lupus, rheumatoid arthritis, advanced psoriasis, inflammatory arthritis" },
  { id:"lpa", l:"Elevated Lp(a)", d:"≥125 nmol/L or ≥50 mg/dL" },
  { id:"hscrp", l:"Elevated hs-CRP", d:"≥2 mg/L on more than one occasion" },
  { id:"tg", l:"Persistently elevated triglycerides", d:"≥175 mg/dL nonfasting or ≥150 mg/dL fasting" },
  { id:"metabolic", l:"CKM syndrome", d:"Cardiovascular-kidney-metabolic syndrome. Metabolic syndrome = ≥3 of 5 below" },
  { id:"ldl", l:"Persistently elevated LDL-C, non-HDL-C, or apoB", d:"LDL-C 160–189, non-HDL-C 190–219, or apoB ≥120 mg/dL" },
  { id:"women", l:"Reproductive risk markers", d:"Premature menopause, preeclampsia, gestational diabetes or hypertension, preterm delivery" },
  { id:"prs", l:"High polygenic risk score", d:"If measured" },
];

// ── Statin Reference Panel (reusable) ────────────────────────────────────────

function MyoDots({ level }) {
  return (
    <div className="flex gap-[3px] shrink-0" title={`Intrinsic myotoxicity ${level}/4`}>
      {[1,2,3,4].map(i => (
        <div key={i} className="w-1.5 h-1.5 rounded-full"
          style={{ background: i <= level ? `var(--myo-${level})` : "var(--track-off)" }} />
      ))}
    </div>
  );
}

function StatinInfo({ onClose }) {
  const intensities = [
    { level:"High intensity", ldl:"≥50%", drugs:[
      { name:"Rosuvastatin", dose:"20–40 mg", myo:2, notes:"Most potent per mg. Renally cleared: dose-adjust if eGFR <30. Start 5 mg in East Asian patients (higher exposure)." },
      { name:"Atorvastatin", dose:"40–80 mg", myo:2, notes:"Long half-life, any time of day. Most trial data." },
    ]},
    { level:"Moderate intensity", ldl:"30–49%", drugs:[
      { name:"Rosuvastatin", dose:"5–10 mg", myo:1, notes:null },
      { name:"Atorvastatin", dose:"10–20 mg", myo:2, notes:null },
      { name:"Simvastatin", dose:"20–40 mg", myo:4, notes:"Evening dose. FDA restricts 80 mg: no new starts (SEARCH, myopathy 0.9% at 80 mg vs 0.02% at 20 mg)." },
      { name:"Pravastatin", dose:"40–80 mg", myo:1, notes:"Hydrophilic, not CYP3A4: fewest interactions." },
      { name:"Lovastatin", dose:"40–80 mg", myo:3, notes:"With evening meal. CYP3A4 substrate." },
      { name:"Fluvastatin XL", dose:"80 mg", myo:1, notes:"CYP2C9: fewer 3A4 interactions. Lowest symptom rate in PRIMO (5.1%)." },
      { name:"Pitavastatin", dose:"1–4 mg", myo:1, notes:"Minimal CYP metabolism. Possibly lowest new-onset DM risk." },
    ]},
    { level:"Low intensity", ldl:"<30%", drugs:[
      { name:"Simvastatin", dose:"10 mg", myo:2, notes:null },
      { name:"Pravastatin", dose:"10–20 mg", myo:1, notes:null },
      { name:"Lovastatin", dose:"20 mg", myo:2, notes:null },
      { name:"Fluvastatin", dose:"20–40 mg", myo:1, notes:null },
    ]},
  ];

  const spectrum = [
    { name:"Pitavastatin", myo:1, primo:null },
    { name:"Fluvastatin XL", myo:1, primo:"5.1" },
    { name:"Pravastatin", myo:1, primo:"10.9" },
    { name:"Rosuvastatin", myo:2, primo:null },
    { name:"Atorvastatin", myo:2, primo:"14.9" },
    { name:"Lovastatin", myo:3, primo:null },
    { name:"Simvastatin", myo:4, primo:"18.2" },
  ];

  return (
    <div className="panel-in p-3 bg-paper border border-edge rounded-lg text-[12px] text-ink space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-bold text-ink text-[13px]">Statin reference</div>
        <button onClick={onClose} aria-label="Close" className="hit w-6 h-6 flex items-center justify-center text-[13px] text-muted hover:text-ink cursor-pointer font-bold">✕</button>
      </div>

      {intensities.map(tier => (
        <div key={tier.level} className="border-t border-line pt-2.5">
          <div className="font-bold text-ink mb-1">{tier.level} <span className="font-normal text-faint">({tier.ldl} LDL-C reduction)</span></div>
          <div>
            {tier.drugs.map(d => (
              <div key={d.name+d.dose} className="py-1.5 border-t border-line first:border-t-0 first:pt-0.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-bold text-ink">{d.name} <span className="font-normal text-muted">{d.dose}</span></span>
                  <MyoDots level={d.myo} />
                </div>
                {d.notes && <div className="text-[12px] text-muted mt-0.5">{d.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="border-t border-line pt-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 mb-1.5">
          <div className="font-bold text-ink">Intrinsic myotoxicity</div>
          <div className="text-[12px] text-muted">PRIMO high-dose symptom rate, unblinded</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-flow-col sm:grid-rows-4 gap-x-8 gap-y-1">
          {spectrum.map(d => (
            <div key={d.name} className="flex items-center gap-2.5">
              <span className="flex-1 min-w-0 text-[12px] font-medium text-ink truncate">{d.name}</span>
              <MyoDots level={d.myo} />
              <span className="w-11 text-right font-mono text-[12px] tabular-nums text-muted shrink-0">{d.primo ? d.primo + "%" : "–"}</span>
            </div>
          ))}
        </div>
        <div className="text-[12px] text-muted mt-1.5">1 dot lowest, 4 dots highest intrinsic myotoxicity (dose, lipophilicity, CYP3A4, OATP1B1).</div>
        <div className="text-[12px] text-muted mt-1.5 leading-snug border-t border-line pt-1.5">
          In blinded trials muscle complaints are nearly identical on statin and placebo (CTT 2022: RR 1.03 overall, 1.07 in year one), so over 90% of reported symptoms are not pharmacologic. The gradient above matters for true myopathy, rhabdomyolysis, and interactions, not everyday aches. PRIMO rates are observational. SLCO1B1 variants raise simvastatin myopathy risk about 4× per risk allele (SEARCH GWAS, NEJM 2008).
        </div>
      </div>

      <div className="border-t border-line pt-2.5">
        <div className="font-bold text-ink mb-1">Contraindications and cautions</div>
        <div className="space-y-0.5 text-body text-[12px] leading-snug">
          <div><b>All statins:</b> active liver disease or unexplained persistent transaminase elevation. Stop before conception: avoided in pregnancy and lactation (FDA removed the blanket contraindication in 2021, individualized in high-risk patients).</div>
          <div><b>Simvastatin, lovastatin:</b> contraindicated with strong CYP3A4 inhibitors, cyclosporine, gemfibrozil, danazol.</div>
          <div><b>Rosuvastatin:</b> max 5 mg with cyclosporine, 10 mg with gemfibrozil.</div>
        </div>
      </div>

      <div className="text-[12px] text-muted space-y-0.5 border-t border-line pt-2">
        <div><b>Evening dosing:</b> simvastatin and lovastatin (short half-life). Atorvastatin and rosuvastatin any time.</div>
        <div><b>Interactions:</b> CYP3A4 statins (atorva, simva, lova) with azoles, macrolides, protease inhibitors, grapefruit. Pravastatin and pitavastatin have the fewest.</div>
        <div><b>New-onset DM:</b> all statins carry a modest signal (≈9–12% relative), higher at high intensity. CV benefit far outweighs it. Pitavastatin possibly lowest.</div>
        <div><b>Sources:</b> CTT IPD meta-analysis, Lancet 2022;400:832-45 · PRIMO, Cardiovasc Drugs Ther 2005;19:403-14 · SEARCH, Lancet 2010;376:1658-69 · SLCO1B1, N Engl J Med 2008;359:789-99.</div>
      </div>
    </div>
  );
}

// ── Threshold ruler scale ────────────────────────────────────────────────────
function Scale({ cuts, max, value, color }) {
  const pos = v => `${Math.min(v / max, 1) * 100}%`;
  return (
    <div className="relative h-[30px] mt-1" aria-hidden="true">
      <div className="absolute left-0 right-0 top-[8px] h-px" style={{ background: "var(--ruler)" }} />
      <div className="absolute top-[4px] w-px h-[9px] left-0" style={{ background: "var(--ruler)" }} />
      <div className="absolute top-[4px] w-px h-[9px] right-0" style={{ background: "var(--ruler)" }} />
      {cuts.map(c => <div key={c} className="absolute top-[1px] w-px h-[15px] bg-muted" style={{ left: pos(c) }} />)}
      {value !== null && (
        <div className="absolute -top-px -translate-x-1/2" style={{
          left: pos(value), width: 0, height: 0,
          borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
          borderTop: `7px solid ${color}`,
        }} />
      )}
      <div className="absolute top-[17px] left-0 font-mono text-[11px] text-faint">0</div>
      {cuts.map(c => <div key={c} className="absolute top-[17px] -translate-x-1/2 font-mono text-[11px] text-muted" style={{ left: pos(c) }}>{c}</div>)}
      <div className="absolute top-[17px] right-0 font-mono text-[11px] text-faint">{max}+</div>
    </div>
  );
}

// ── Risk readout (desktop rail + mobile inline) ──────────────────────────────
function RiskBlock({ eyebrow, note, value, rc, dark, cuts, max }) {
  const color = dark ? rc.darkColor : rc.color;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <SectionHead>{eyebrow}</SectionHead>
        {note && <div className="text-[11px] text-faint">{note}</div>}
      </div>
      <div className="flex items-baseline gap-3.5 flex-wrap">
        <div className="font-mono font-medium leading-none tabular-nums text-[44px] lg:text-[54px] tracking-[-0.035em]" style={{ color }}>
          {value}<span className="text-[0.44em]">%</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[16px] font-bold" style={{ color }}>{rc.label}</span>
          <span className="text-[13px] text-faint">({rc.range})</span>
        </div>
      </div>
      <Scale cuts={cuts} max={max} value={value} color={color} />
    </div>
  );
}

// Monitoring and screening rows: fixed label column so the text lines up.
const MonRow = ({ k, children }) => (
  <div className="grid grid-cols-[84px_1fr] gap-x-2"><span className="text-ink font-semibold">{k}</span><span>{children}</span></div>
);
const BULLETS = "list-disc pl-4 space-y-0.5 text-body marker:text-faint";

function CopyButton({ note }) {
  const [copied, setCopied] = useState(false);
  if (!note) return null;
  const copy = async () => {
    try {
      if (window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([note.html], { type: "text/html" }),
          "text/plain": new Blob([note.text], { type: "text/plain" }),
        })]);
      } else {
        await navigator.clipboard.writeText(note.text);
      }
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch {
      try { await navigator.clipboard.writeText(note.text); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard unavailable */ }
    }
  };
  return (
    <button
      onClick={copy}
      className={`w-full flex items-center justify-center gap-2 h-11 rounded-lg border text-[13px] font-semibold cursor-pointer transition-colors active:scale-[0.99] ${
        copied ? "border-emerald-600/40 text-emerald-700 dark:text-emerald-400 bg-surface" : "border-line bg-surface text-muted hover:text-ink"
      }`}>
      {copied ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      )}
      {copied ? "Copied to clipboard" : "Copy summary for note"}
    </button>
  );
}

function OutcomeRow({ label, sub, v10, v30, flag }) {
  const cell = "w-12 text-right font-mono text-[13px] font-semibold tabular-nums shrink-0";
  return (
    <div className="flex items-baseline gap-2">
      <span className="min-w-0 text-[13px] font-medium text-ink">{label}{sub && <span className="font-normal text-muted text-[12px]"> {sub}</span>}</span>
      <div className="flex-1 border-b border-dotted mb-[3px]" style={{ borderColor: "var(--ruler)" }} />
      <span className={`${cell} ${flag ? "text-amber-700 dark:text-amber-400" : "text-ink"}`}>{v10 !== null ? `${v10}%` : "–"}</span>
      <span className={`${cell} text-ink`}>{v30 !== null ? `${v30}%` : "–"}</span>
    </div>
  );
}

function RiskRail({ risk10, rc10, risk30, rc30, discord, optRisk30, drivers, dark, variant, note, cvd10, cvd30, hf10, hf30, children }) {
  const delta = (risk30 !== null && optRisk30 !== null) ? Math.round((risk30 - optRisk30) * 10) / 10 : null;
  // Guideline threshold: 30-yr risk ≥10% at low (<3%) 10-yr risk, ages 30–59.
  const horizonNote = (rc10 && rc30 && rc30.rank > rc10.rank)
    ? (discord
        ? "The 10-year estimate is low while the 30-year estimate is at or above 10%. At ages 30 to 59 a moderate-intensity statin is then reasonable, after a trial of lifestyle change and a benefit-risk discussion."
        : `The 30-year estimate is elevated while the 10-year estimate is ${rc10.label.toLowerCase()}. This favors addressing risk factors now.`)
    : null;
  return (
    <div className={variant === "rail" ? "lg:border-l lg:border-line lg:pl-10 flex flex-col gap-5" : "border-t border-line pt-5 flex flex-col gap-5"}>
      <RiskBlock eyebrow="10-year ASCVD risk" value={risk10} rc={rc10} dark={dark} cuts={[3, 5, 10]} max={15} />
      <div className="h-px bg-line" />
      {risk30 !== null && rc30 ? (
        <div className="flex flex-col gap-2.5">
          <RiskBlock eyebrow="30-year ASCVD risk" note="ages 30–59" value={risk30} rc={rc30} dark={dark} cuts={[10]} max={40} />
          {horizonNote && <div className="text-[13px] text-body leading-relaxed">{horizonNote}</div>}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <SectionHead>30-year ASCVD risk</SectionHead>
          <div className="text-[13px] text-muted">Not validated for ages 60 and above.</div>
        </div>
      )}
      {children}
      {cvd10 !== null && (
        <>
          <div className="h-px bg-line" />
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <SectionHead>Other PREVENT outcomes</SectionHead>
              <div className="flex gap-2 text-[11px] text-faint shrink-0"><span className="w-12 text-right">10-yr</span><span className="w-12 text-right">30-yr</span></div>
            </div>
            <div className="flex flex-col gap-1.5">
              <OutcomeRow label="Total CVD" v10={cvd10} v30={cvd30} flag={cvd10 >= CVD_BP_TX_THRESHOLD} />
              <OutcomeRow label="Heart failure" sub={hf10 === null ? "enter BMI" : null} v10={hf10} v30={hf30} />
            </div>
            <div className="text-[12px] text-muted leading-snug">Total CVD is ASCVD plus heart failure. It sets the blood pressure drug-therapy threshold (≥{CVD_BP_TX_THRESHOLD}% at 10 years). Statin decisions use ASCVD risk.</div>
          </div>
        </>
      )}
      {delta !== null && (
        <>
          <div className="h-px bg-line" />
          <div className="flex flex-col gap-1.5">
            <SectionHead>If optimized</SectionHead>
            {delta <= 0 ? (
              <div className="text-[13px] text-body leading-relaxed">Modifiable risk factors are already near optimal.</div>
            ) : (
              <>
                <div className="text-[13px] text-body leading-relaxed">
                  With optimized risk factors the 30-year estimate falls to{" "}
                  <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400">{optRisk30}%</span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400"> (−{delta} points)</span>.
                  {drivers.length > 0 && ` The largest single contributor is ${/^[A-Z]{2,}$/.test(drivers[0].label) ? drivers[0].label : drivers[0].label.toLowerCase()}.`}
                </div>
                <div className="text-[12px] text-faint">Optimized profile: BP 110, no smoking, non-HDL-C ≤120, HDL-C ≥50</div>
              </>
            )}
          </div>
        </>
      )}
      {drivers.length > 0 && (
        <>
          <div className="h-px bg-line" />
          <div className="flex flex-col gap-2">
            <SectionHead>30-year risk drivers</SectionHead>
            <div className="flex flex-col gap-1.5">
              {drivers.map(d => (
                <LeaderRow key={d.factor} label={d.label} value={`−${d.delta}`} />
              ))}
            </div>
            <div className="text-[12px] text-muted leading-snug">Single-factor projections. Values may not sum.</div>
          </div>
        </>
      )}
      <CopyButton note={note} />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════════════════════

export default function App() {
  // ── Theme ──
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('lipid2026-theme');
      if (stored !== null) return stored === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('lipid2026-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => {
      if (localStorage.getItem('lipid2026-theme') === null) {
        setDarkMode(e.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const scrollRef = useRef(null);
  const [planEl, setPlanEl] = useState(null);     // the inline plan, watched by the plan bar
  const [planSeen, setPlanSeen] = useState(true);
  const [enhOpen, setEnhOpen] = useState(null);   // null = automatic
  const [lifeOpen, setLifeOpen] = useState(null); // null = automatic

  // ── Units ──
  const [units, setUnits] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('lipid2026-units') || 'us';
    return 'us';
  });
  useEffect(() => { localStorage.setItem('lipid2026-units', units); }, [units]);
  const si = units === 'si';
  const siChol = v => (Number(v) / CHOL_F).toFixed(1);

  // ── State ──
  const [tab, setTab] = useState("primary");
  // A new tab opens at the top.
  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [tab]);
  // The plan bar shows while the inline plan is out of view.
  useEffect(() => {
    if (!planEl || !scrollRef.current || typeof IntersectionObserver === "undefined") { setPlanSeen(true); return; }
    const io = new IntersectionObserver(([e]) => setPlanSeen(e.isIntersecting), { root: scrollRef.current });
    io.observe(planEl);
    return () => io.disconnect();
  }, [planEl]);
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("male");
  const [sbp, setSbp] = useState("");
  const [bpTx, setBpTx] = useState(false);
  const [totalC, setTotalC] = useState("");
  const [hdlC, setHdlC] = useState("");
  const [ldlC, setLdlC] = useState("");
  const [onStatin, setOnStatin] = useState(false);
  const [dm, setDm] = useState(false);
  const [smoking, setSmoking] = useState(false);
  const [egfr, setEgfr] = useState("");
  const [bmi, setBmi] = useState("");
  const [tg, setTg] = useState("");
  const [enhs, setEnhs] = useState({});
  const [cac, setCac] = useState("");
  const [cacPct, setCacPct] = useState("");
  const [lpa, setLpa] = useState("");
  const [apoB, setApoB] = useState("");
  const [cacInfo, setCacInfo] = useState(false);
  const [bioInfo, setBioInfo] = useState(false);
  const [riskInfo, setRiskInfo] = useState(false);
  const [bmiCalc, setBmiCalc] = useState(false);
  const [statinInfo, setStatinInfo] = useState(false);
  const [statinInfoMon, setStatinInfoMon] = useState(false);
  const [bmiUnit, setBmiUnit] = useState("imperial");
  const [bmiWt, setBmiWt] = useState("");
  const [bmiHt, setBmiHt] = useState("");
  const [bmiHtIn, setBmiHtIn] = useState("");
  const [metSyn, setMetSyn] = useState({});
  // ASCVD tab: very-high-risk classification
  const [vhrMajor, setVhrMajor] = useState({});    // major ASCVD events
  const [vhrFeat, setVhrFeat] = useState({});      // high-risk features
  const [secF, setSecF] = useState({});            // other <55 conditions: ckd, severe
  // Diabetes tab
  const [dmEnhs, setDmEnhs] = useState({});
  const [dmF, setDmF] = useState({});              // rf: multiple ASCVD risk factors; prevent: PREVENT ≥10%
  // LDL ≥190 tab
  const [sevF, setSevF] = useState({});            // goal-lowering factors
  const [dlcnChecked, setDlcnChecked] = useState({});
  const [sevRx, setSevRx] = useState({ statin: "none", dose: 0, eze: false });  // current therapy (untreated-LDL estimate)
  const [knownLdl, setKnownLdl] = useState("");    // documented untreated LDL-C
  const [siOpen, setSiOpen] = useState(false);     // statin intolerance pathway
  // Blood pressure section
  const [dbp, setDbp] = useState("");
  const [bpF, setBpF] = useState({});              // manual: clinical CVD / diabetes / CKD

  const resetPatient = useCallback(() => {
    setAge(""); setSex("male"); setSbp(""); setBpTx(false);
    setTotalC(""); setHdlC(""); setLdlC(""); setOnStatin(false);
    setDm(false); setSmoking(false); setEgfr(""); setBmi("");
    setTg(""); setEnhs({}); setCac(""); setCacPct("");
    setLpa(""); setApoB("");
    setCacInfo(false); setBioInfo(false); setRiskInfo(false); setBmiCalc(false);
    setStatinInfo(false); setStatinInfoMon(false);
    setBmiWt(""); setBmiHt(""); setBmiHtIn("");
    setVhrMajor({}); setVhrFeat({}); setSecF({}); setDmEnhs({}); setDmF({}); setMetSyn({});
    setSevF({}); setDlcnChecked({}); setSevRx({ statin: "none", dose: 0, eze: false }); setKnownLdl("");
    setSiOpen(false); setDbp(""); setBpF({});
    setEnhOpen(null); setLifeOpen(null);
  }, []);

  const calcBmiValue = useMemo(() => {
    if (bmiWt === "" || bmiHt === "") return null;
    const w = Number(bmiWt), h = Number(bmiHt);
    if (bmiUnit === "imperial") {
      const totalIn = h * 12 + (bmiHtIn === "" ? 0 : Number(bmiHtIn));
      if (totalIn <= 0 || w <= 0) return null;
      return Math.round((w / (totalIn * totalIn)) * 703 * 10) / 10;
    } else {
      const cm = h;
      if (cm <= 0 || w <= 0) return null;
      return Math.round((w / ((cm / 100) * (cm / 100))) * 10) / 10;
    }
  }, [bmiWt, bmiHt, bmiHtIn, bmiUnit]);

  const acceptBmi = useCallback(() => {
    if (calcBmiValue !== null) {
      setBmi(calcBmiValue);
      setBmiCalc(false);
      setBmiWt(""); setBmiHt(""); setBmiHtIn("");
    }
  }, [calcBmiValue]);

  const toggleEnh = useCallback(id => setEnhs(p => ({...p,[id]:!p[id]})), []);
  const toggleVhrMajor = useCallback(id => setVhrMajor(p => ({...p,[id]:!p[id]})), []);
  const toggleVhrFeat = useCallback(id => setVhrFeat(p => ({...p,[id]:!p[id]})), []);
  const toggleSecF = useCallback(id => setSecF(p => ({...p,[id]:!p[id]})), []);
  const toggleDmF = useCallback(id => setDmF(p => ({...p,[id]:!p[id]})), []);
  const toggleSevF = useCallback(id => setSevF(p => ({...p,[id]:!p[id]})), []);
  const toggleBpF = useCallback(id => setBpF(p => ({...p,[id]:!p[id]})), []);
  const toggleDlcn = useCallback(id => setDlcnChecked(p => ({...p,[id]:!p[id]})), []);
  const vhrS = useMemo(() => vhrStatus(vhrMajor, vhrFeat), [vhrMajor, vhrFeat]);
  const toggleDmEnh = useCallback(id => setDmEnhs(p => ({...p,[id]:!p[id]})), []);
  const dmEnhCount = useMemo(() => Object.values(dmEnhs).filter(Boolean).length, [dmEnhs]);
  const toggleMetSyn = useCallback(id => setMetSyn(p => ({...p,[id]:!p[id]})), []);
  const metSynCount = useMemo(() => Object.values(metSyn).filter(Boolean).length, [metSyn]);
  const enhCount = useMemo(() => {
    let count = Object.entries(enhs).filter(([k,v]) => k !== "metabolic" && v).length;
    if (enhs.metabolic || metSynCount >= 3) count++;
    return count;
  }, [enhs, metSynCount]);

  const inputsObj = useMemo(() => ({
    age, sex, sbp, bpTx, totalC, hdlC, statin: onStatin, dm, smoking, egfr, bmi,
  }), [age, sex, sbp, bpTx, totalC, hdlC, onStatin, dm, smoking, egfr, bmi]);

  const risk10 = useMemo(() => {
    if (tab !== "primary") return null;
    return calcPREVENT10(inputsObj);
  }, [tab, inputsObj]);

  const risk30 = useMemo(() => {
    if (tab !== "primary") return null;
    return calcPREVENT30(inputsObj);
  }, [tab, inputsObj]);

  // Total CVD (ASCVD + HF): computed on any tab once inputs are complete. It feeds
  // the blood pressure section; lipid recommendations stay on ASCVD risk.
  const cvd10 = useMemo(() => calcPREVENT10CVD(inputsObj), [inputsObj]);
  const cvd30 = useMemo(() => calcPREVENT30CVD(inputsObj), [inputsObj]);
  // Heart failure: the only PREVENT outcome that uses BMI (null until BMI is entered)
  const hf10 = useMemo(() => calcPREVENT10HF(inputsObj), [inputsObj]);
  const hf30 = useMemo(() => calcPREVENT30HF(inputsObj), [inputsObj]);
  // Diabetes tab: PREVENT-ASCVD with diabetes set (uses the Primary tab inputs, if complete)
  const dmRisk10 = useMemo(() => calcPREVENT10({ ...inputsObj, dm: true }), [inputsObj]);
  const egfrCkd = egfr !== "" && Number(egfr) < 60;
  // Blood pressure section: total CVD with the diabetes status in force there
  // (Diabetes tab, or diabetes checked in the section, even if the PREVENT toggle is off).
  const bpDm = dm || tab === "diabetes" || !!bpF.dm;
  const cvd10Bp = useMemo(() => (tab === "secondary" ? null : calcPREVENT10CVD({ ...inputsObj, dm: bpDm })), [tab, inputsObj, bpDm]);

  const rc10 = useMemo(() => riskCat10(risk10), [risk10]);
  const rc30 = useMemo(() => riskCat30(risk30), [risk30]);

  const discord = useMemo(() => discordance(risk10, risk30, age), [risk10, risk30, age]);

  const optInputs = useMemo(() => {
    if (risk30 === null) return null;
    return optimizedInputs(inputsObj);
  }, [risk30, inputsObj]);

  const optRisk30 = useMemo(() => {
    if (optInputs === null) return null;
    return calcPREVENT30(optInputs);
  }, [optInputs]);

  const drivers = useMemo(() => {
    if (risk30 === null) return [];
    return driverDeltas(inputsObj);
  }, [risk30, inputsObj]);

  const nonHdlC = useMemo(() => {
    if (totalC === "" || hdlC === "") return null;
    return Number(totalC) - Number(hdlC);
  }, [totalC, hdlC]);

  // ── LDL ≥190: DLCN score + goal tier ──
  const sevFactor = useMemo(() => ldlCorrectionFactor(sevRx), [sevRx]);
  const untreatedLdl = useMemo(() => {
    if (knownLdl !== "" && knownLdl !== null) return Number(knownLdl);
    return estimateUntreatedLdl(ldlC, sevFactor) ?? "";
  }, [ldlC, knownLdl, sevFactor]);
  const dlcn = useMemo(() => dlcnScore(dlcnChecked, untreatedLdl), [dlcnChecked, untreatedLdl]);
  const hefhAuto = dlcn.score >= DLCN_CLINICAL_FH_MIN || !!dlcnChecked.dna_pos;
  const sevGoal = useMemo(() => severeGoal({ ...sevF, hefh: sevF.hefh || hefhAuto }), [sevF, hefhAuto]);

  // ── Recommendation engine (src/recommend.js) ──
  const dmRiskEff = dmRisk10 !== null ? dmRisk10 : (dmF.prevent ? 10 : null);
  const rec = useMemo(() => {
    if (tab === "secondary") return recSecondary({ major: vhrMajor, feat: vhrFeat, ckd: !!secF.ckd || egfrCkd, severe: !!secF.severe });
    if (tab === "diabetes") return recDiabetes({ age, enhCount: dmEnhCount, rf: !!dmF.rf, risk10: dmRiskEff });
    if (tab === "severe") return recSevere({ ...sevF, hefh: sevF.hefh || hefhAuto });
    return recPrimary({ risk10, risk30, age, ldl: ldlC, enhCount, cac, cacPct, smoking, dm, fhx: !!enhs.fhx, egfr });
  }, [tab, risk10, risk30, age, ldlC, enhCount, cac, cacPct, smoking, dm, enhs, egfr,
      vhrMajor, vhrFeat, secF, egfrCkd, dmEnhCount, dmF, dmRiskEff, sevF, hefhAuto]);

  // Which nonstatin row of the statin-intolerance pathway applies here
  const siGroup = useMemo(() => {
    if (tab === "secondary") return "ascvd";
    if (tab === "severe") return sevGoal.tier === "ascvd" ? "ascvd" : "severe";
    if (tab === "diabetes") return "high";
    if (risk10 === null) return null;
    if (dm) return "high";
    if (risk10 >= 10 || (cac !== "" && Number(cac) >= 300)) return "high";
    return risk10 >= 3 ? "mid" : null;
  }, [tab, sevGoal, risk10, cac, dm]);

  // Conditions already entered elsewhere that set the BP drug-therapy threshold
  const bpAuto = useMemo(() => ({
    clinicalCvd: tab === "secondary" ? "ASCVD tab" : (tab === "severe" && sevF.ascvd) ? "clinical ASCVD checked above" : null,
    dm: tab === "diabetes" ? "Diabetes tab" : dm ? "diabetes entered in PREVENT" : null,
    ckd: egfrCkd ? `eGFR ${egfr}`
      : (dmEnhs.egfr_dm || dmEnhs.alb || secF.ckd) ? "CKD or albuminuria checked above" : null,
  }), [tab, sevF, dm, egfr, egfrCkd, dmEnhs, secF]);

  // ── Copyable note summary (always mg/dL; rich text + plain fallback) ──
  const summaryNote = useMemo(() => {
    if (risk10 === null || !rc10) return null;
    const demo = [];
    demo.push(`${age}${sex === "male" ? "M" : "F"}.`);
    const labs = [`TC ${totalC}`, `HDL-C ${hdlC}`];
    if (ldlC !== "") labs.push(`LDL-C ${ldlC}`);
    if (nonHdlC !== null) labs.push(`non-HDL-C ${nonHdlC}`);
    if (tg !== "") labs.push(`TG ${tg}`);
    demo.push(labs.join(", ") + " mg/dL.");
    demo.push(`SBP ${sbp}${bpTx ? " (on treatment)" : ""}.`);
    if (bmi !== "") demo.push(`BMI ${bmi}.`);
    demo.push(`eGFR ${egfr}.`);
    if (smoking) demo.push("Current smoker.");
    if (dm) demo.push("Diabetes.");
    if (onStatin) demo.push("On statin.");
    const demoLine = demo.join(" ");

    const rows = [];
    rows.push(["10-yr ASCVD Risk", `${risk10}% (${rc10.label.toLowerCase()})`]);
    if (risk30 !== null && rc30) rows.push(["30-yr ASCVD Risk", `${risk30}% (${rc30.label.toLowerCase()})`]);
    if (cvd10 !== null) rows.push(["10-yr Total CVD Risk", `${cvd10}%${hf10 !== null ? ` (heart failure ${hf10}%)` : ""}`]);
    if (risk30 !== null && optRisk30 !== null) {
      const d = Math.round((risk30 - optRisk30) * 10) / 10;
      if (d > 0) rows.push(["If optimized", `30-yr ${optRisk30}% (-${d} points)`]);
    }
    if (enhCount > 0) rows.push(["Risk enhancers", String(enhCount)]);
    if (rec) {
      rows.push(["Plan", rec.note ? `${rec.txt} ${rec.note}` : rec.txt]);
      if (rec.g) rows.push(["Goals", `LDL-C <${rec.g.ldl}, non-HDL-C <${rec.g.nh} mg/dL, >=${rec.g.p}% reduction`]);
    }

    const title = "CV RISK ASSESSMENT (PREVENT, 2026 ACC/AHA)";
    const ref = "Khan SS et al. Circulation. 2024;149:430-449.";
    const text = [title, demoLine, ...rows.map(([k, v]) => `${k}: ${v}`), `Ref: ${ref}`].join("\n");

    const esc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const html = [
      `<div><u><b>${esc(title)}</b></u></div>`,
      `<div>${esc(demoLine)}</div>`,
      ...rows.map(([k, v]) => `<div><b>${esc(k)}:</b> ${esc(v)}</div>`),
      `<div>Ref: Khan SS et al. <i>Circulation</i>. 2024;149:430-449.</div>`,
    ].join("");
    return { text, html };
  }, [risk10, rc10, risk30, rc30, optRisk30, cvd10, hf10, age, sex, totalC, hdlC, ldlC, nonHdlC, tg, sbp, bpTx, bmi, egfr, smoking, dm, onStatin, enhCount, rec]);

  // Biomarker interpretation (src/recommend.js)
  const lpaNote = useMemo(() => lpaInterpret(lpa), [lpa]);
  const apoBNote = useMemo(() => apoBInterpret(apoB, rec?.g?.ldl ?? null), [apoB, rec]);
  const tgNote = useMemo(() => tgAdvice(tg), [tg]);

  const tabs = [
    { id:"primary", l:"Primary" },
    { id:"secondary", l:"ASCVD" },
    { id:"diabetes", l:"Diabetes" },
    { id:"severe", l:"LDL ≥190" },
  ];

  const showPlan = !!rec && (tab !== "primary" || risk10 !== null);
  const goToPlan = () => planEl?.scrollIntoView({
    block: "start",
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
  });
  const lifeShown = lifeOpen ?? (rec?.int === "lifestyle" || rec?.int === "none");
  const enhShown = enhOpen ?? (enhCount > 0 || rc10?.rank === 2 || rc10?.rank === 3);

  return (
    <div className="h-screen h-[100dvh] flex flex-col overflow-hidden bg-paper text-ink">

      {/* ── Header ── */}
      <header className="shrink-0 bg-paper border-b border-line">
        <div className="pwa-header-pad">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-5 lg:px-8 py-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-5 min-w-0">
              <h1 className="text-[17px] font-bold tracking-[-0.015em] whitespace-nowrap">Lipid 2026</h1>
              <div className="hidden sm:block w-px h-4 bg-edge" />
              <p className="hidden sm:block text-[12px] text-muted truncate">2026 ACC/AHA guideline, PREVENT risk model</p>
            </div>
            <div data-controls className="flex items-center gap-2 shrink-0">
              <button onClick={() => setUnits(si ? 'us' : 'si')}
                aria-label={`Units: ${si ? "mmol/L" : "mg/dL"}. Switch to ${si ? "mg/dL" : "mmol/L"}`}
                className="sm:hidden h-11 px-3 rounded-lg border border-line bg-surface text-[12px] font-semibold text-ink active:scale-95 transition-colors cursor-pointer whitespace-nowrap">
                {si ? "mmol/L" : "mg/dL"}
              </button>
              <div role="group" aria-label="Units" className="hidden sm:flex h-11 rounded-lg border border-line bg-surface overflow-hidden">
                <button onClick={() => setUnits('us')} aria-pressed={!si}
                  className={`px-3 text-[12px] font-semibold cursor-pointer transition-colors ${!si ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"}`}>mg/dL</button>
                <div className="w-px bg-line" />
                <button onClick={() => setUnits('si')} aria-pressed={si}
                  className={`px-3 text-[12px] font-semibold cursor-pointer transition-colors ${si ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"}`}>mmol/L</button>
              </div>
              <button onClick={() => setDarkMode(d => !d)} aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}
                className="w-11 h-11 flex items-center justify-center rounded-lg border border-line bg-surface text-muted hover:text-ink active:scale-95 transition-colors cursor-pointer">
                {darkMode ? (
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
                ) : (
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
                )}
              </button>
              <button onClick={resetPatient} aria-label="Reset patient"
                className="h-11 min-w-[44px] px-3 flex items-center justify-center gap-1.5 rounded-lg border border-line bg-surface text-[13px] font-semibold text-muted hover:text-ink active:scale-95 transition-colors cursor-pointer whitespace-nowrap">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
                <span className="hidden sm:inline">Reset</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Tabs ── */}
      <nav aria-label="Patient group" className="shrink-0 bg-paper border-b border-line">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-5 lg:px-8 flex justify-between sm:justify-start sm:gap-8 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab===t.id ? "page" : undefined}
              className={`min-h-[44px] flex items-end pb-2 pt-3 text-[13px] whitespace-nowrap cursor-pointer transition-colors border-b-2 -mb-px ${
                tab===t.id ? "font-semibold text-ink border-accent" : "font-medium text-muted border-transparent hover:text-ink"
              }`}>
              {t.l}
            </button>
          ))}
        </div>
      </nav>

      {/* ── Content ── */}
      <div className="relative flex-1 min-h-0 flex flex-col">
      <main ref={scrollRef} data-scroll className="flex-1 overflow-y-auto overscroll-none">
      <div key={tab} className="tab-content max-w-[1200px] mx-auto px-4 sm:px-5 lg:px-8 py-6 pb-16">
      <div className="lg:grid lg:grid-cols-[minmax(0,42rem)_400px] lg:gap-12 lg:items-start lg:justify-center">
      <div className={`col-main space-y-5 min-w-0 ${tab === "primary" ? "" : "max-w-2xl mx-auto lg:max-w-none lg:mx-0"}`}>

        {/* PRIMARY */}
        {tab === "primary" && (<>
          <Card title="PREVENT-ASCVD risk calculator">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[12px] text-muted">Ages 30–79, no known ASCVD.</p>
              <button onClick={() => setRiskInfo(p => !p)}
                aria-label="About the PREVENT calculator"
                className="hit w-6 h-6 rounded-full border border-edge text-muted text-[13px] font-bold flex items-center justify-center shrink-0 ml-2 cursor-pointer hover:border-accent hover:text-accent active:scale-95 transition-colors">?</button>
            </div>
            {riskInfo && (
              <div className="panel-in mb-3 p-3 bg-surface border border-line rounded-lg text-[12px] text-ink space-y-2">
                <div className="font-bold text-ink">About the PREVENT estimates</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                  <span className="font-bold text-accent whitespace-nowrap">10-Yr ASCVD</span>
                  <span>Probability of MI, stroke, or CHD death within 10 years.</span>
                  <span className="font-bold text-accent whitespace-nowrap">30-Yr ASCVD</span>
                  <span>Same endpoint over 30 years. Validated for ages 30–59 only. Guideline threshold: ≥10%.</span>
                  <span className="font-bold text-accent whitespace-nowrap">Total CVD</span>
                  <span>ASCVD or heart failure. The 2025 AHA/ACC hypertension guideline uses 10-year total CVD ≥{CVD_BP_TX_THRESHOLD}% as the drug-therapy threshold in stage 1 hypertension.</span>
                  <span className="font-bold text-accent whitespace-nowrap">Heart failure</span>
                  <span>The only PREVENT outcome that uses BMI. BMI is optional: it does not change the ASCVD or total CVD estimates.</span>
                </div>
                <div className="text-muted border-t border-edge pt-2">
                  PREVENT (2023) replaces the Pooled Cohort Equations: adds eGFR and statin use, drops race as an input. Lipid-lowering thresholds in the 2026 guideline are defined on PREVENT-ASCVD, so statin recommendations here never use the total CVD estimate.
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Num label="Age" unit="yr" value={age} on={setAge} min={30} max={79} ph="30–79" />
              <div className="flex flex-col gap-1">
                <span className={LABEL}>Sex</span>
                <div className="flex gap-1">
                  {["male","female"].map(s => (
                    <button key={s} onClick={() => setSex(s)}
                      className={`flex-1 py-3 rounded-lg text-[14px] font-bold transition-all duration-200 cursor-pointer active:scale-[0.97] min-h-[48px] text-center ${
                        sex===s ? "bg-accent-soft text-accent border border-edge" : "bg-surface text-muted border border-edge hover:text-ink"
                      }`}>{s==="male"?"Male":"Female"}</button>
                  ))}
                </div>
              </div>
              <SINum si={si} factor={CHOL_F} phSI="3.4–8.3" label="Total cholesterol" unit="mg/dL" value={totalC} on={setTotalC} min={130} max={320} ph="130–320" />
              <SINum si={si} factor={CHOL_F} phSI="0.5–2.6" label="HDL-C" unit="mg/dL" value={hdlC} on={setHdlC} min={20} max={100} ph="20–100" />
              <SINum si={si} factor={CHOL_F} phSI="Baseline" label="LDL-C" unit="mg/dL" value={ldlC} on={setLdlC} min={0} max={400} ph="Baseline" />
              <Num label="Systolic BP" unit="mmHg" value={sbp} on={setSbp} min={90} max={200} ph="90–200" />
              <Num label="eGFR" unit="mL/min" value={egfr} on={setEgfr} min={15} max={140} ph="15–140" />
              <Num label="BMI" unit="kg/m²" value={bmi} on={setBmi} min={18.5} max={60} step={0.1} ph="Optional" />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <SINum si={si} factor={TG_F} phSI="Optional" label="Triglycerides" unit="mg/dL" value={tg} on={setTg} min={0} max={2000} ph="Optional" />
              </div>
              <button onClick={() => setBmiCalc(p => !p)}
                className="px-3 py-3 rounded-lg text-[12px] font-bold text-accent bg-accent-soft border border-edge hover:opacity-80 active:scale-95 transition-all cursor-pointer whitespace-nowrap h-[50px]">
                BMI calc
              </button>
            </div>
            {bmiCalc && (
              <div className="panel-in mt-2 p-3 bg-accent-soft border border-edge rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[13px] font-bold text-accent">BMI calculator</div>
                  <button onClick={() => setBmiCalc(false)}
                    aria-label="Close" className="hit w-6 h-6 flex items-center justify-center text-[13px] text-muted hover:text-ink cursor-pointer font-bold">✕</button>
                </div>
                <div className="flex gap-1 mb-2">
                  {["imperial","metric"].map(u => (
                    <button key={u} onClick={() => { setBmiUnit(u); setBmiWt(""); setBmiHt(""); setBmiHtIn(""); }}
                      className={`flex-1 py-1.5 rounded text-[12px] font-bold text-center cursor-pointer transition-colors ${
                        bmiUnit===u ? "bg-accent-soft text-accent border border-edge" : "bg-surface text-muted border border-edge"
                      }`}>{u==="imperial"?"lb / ft-in":"kg / cm"}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className={LABEL}>Weight</span>
                    <input type="number" inputMode="decimal" value={bmiWt}
                      onChange={e => setBmiWt(e.target.value==="" ? "" : e.target.value)}
                      placeholder={bmiUnit==="imperial"?"lbs":"kg"}
                      className="px-2 py-2 text-[16px] border border-edge rounded bg-surface dark:text-ink outline-none input-glow" />
                  </div>
                  {bmiUnit==="imperial" ? (
                    <div className="flex flex-col gap-0.5">
                      <span className={LABEL}>Height</span>
                      <div className="flex gap-1">
                        <input type="number" inputMode="numeric" value={bmiHt}
                          onChange={e => setBmiHt(e.target.value==="" ? "" : e.target.value)}
                          placeholder="ft" className="flex-1 px-2 py-2 text-[16px] border border-edge rounded bg-surface dark:text-ink outline-none input-glow min-w-0" />
                        <input type="number" inputMode="numeric" value={bmiHtIn}
                          onChange={e => setBmiHtIn(e.target.value==="" ? "" : e.target.value)}
                          placeholder="in" className="flex-1 px-2 py-2 text-[16px] border border-edge rounded bg-surface dark:text-ink outline-none input-glow min-w-0" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <span className={LABEL}>Height</span>
                      <input type="number" inputMode="decimal" value={bmiHt}
                        onChange={e => setBmiHt(e.target.value==="" ? "" : e.target.value)}
                        placeholder="cm" className="px-2 py-2 text-[16px] border border-edge rounded bg-surface dark:text-ink outline-none input-glow" />
                    </div>
                  )}
                </div>
                {calcBmiValue !== null && (
                  <div className="mt-2 flex items-center justify-between bg-surface rounded-lg p-2 border border-edge">
                    <div>
                      <span className="text-[12px] text-muted">Calculated BMI: </span>
                      <span className="text-[14px] font-bold text-accent font-mono">{calcBmiValue}</span>
                      <span className="text-[12px] text-faint"> kg/m²</span>
                    </div>
                    <button onClick={acceptBmi}
                      className="px-3 py-1.5 rounded-lg text-[12px] font-bold text-paper bg-accent hover:opacity-90 active:scale-95 transition-all cursor-pointer">
                      Accept
                    </button>
                  </div>
                )}
              </div>
            )}
            {nonHdlC !== null && (
              <div className="flex items-center justify-between mt-2 px-3 py-2 rounded-lg border border-dashed border-edge bg-paper">
                <span className={LABEL}>Non-HDL-C (calculated)</span>
                <span className="text-[14px] font-bold text-ink font-mono">{si ? siChol(nonHdlC) : nonHdlC} <span className="text-[12px] font-normal text-faint font-sans">{si ? "mmol/L" : "mg/dL"}</span></span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-8 mt-3">
              <Toggle value={onStatin} on={setOnStatin} label="On statin" />
              <Toggle value={smoking} on={setSmoking} label="Current smoking" sub="Within 30 days" />
              <Toggle value={bpTx} on={setBpTx} label="On BP medication" />
              <Toggle value={dm} on={setDm} label="Diabetes" sub="Clinical dx" />
            </div>

          </Card>

          {risk10 !== null && rc10 && (
            <div className="lg:hidden">
              <RiskRail risk10={risk10} rc10={rc10} risk30={risk30} rc30={rc30} discord={discord}
                optRisk30={optRisk30} drivers={drivers} dark={darkMode} variant="inline" note={summaryNote}
                cvd10={cvd10} cvd30={cvd30} hf10={hf10} hf30={hf30}>
                {showPlan && <div ref={setPlanEl}><Plan rec={rec} ldl={ldlC} si={si} where="inline" /></div>}
              </RiskRail>
            </div>
          )}

          {/* Risk enhancers */}
          <Card title="Risk enhancers" open={enhShown} onToggle={() => setEnhOpen(!enhShown)} hint={`${enhCount} checked`}>
            <p className="text-[12px] text-muted mb-2">Personalize the decision at borderline (3 to &lt;5%) risk. Each favors starting a statin.</p>
            <div className="space-y-1.5">
              {ENHANCERS.map(e => (
                <div key={e.id}>
                  <button onClick={() => {
                    if (e.id === "metabolic") {
                      // Auto-managed by metSynCount — toggle manually only to override
                      toggleEnh(e.id);
                    } else {
                      toggleEnh(e.id);
                    }
                  }}
                    className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer active:opacity-70 min-h-[48px] ${
                      (e.id === "metabolic" ? (enhs[e.id] || metSynCount >= 3) : enhs[e.id]) ? "bg-accent-soft border-edge" : "bg-surface border-line"
                    }`}>
                    <div className={`mt-0.5 w-5 h-5 rounded border shrink-0 flex items-center justify-center ${
                      (e.id === "metabolic" ? (enhs[e.id] || metSynCount >= 3) : enhs[e.id]) ? "bg-accent border-accent" : "border-edge"
                    }`}>{(e.id === "metabolic" ? (enhs[e.id] || metSynCount >= 3) : enhs[e.id]) && <span className="text-paper text-[13px] font-bold">✓</span>}</div>
                    <div className="flex-1">
                      <div className="text-[14px] font-bold text-ink leading-tight">{e.l}</div>
                      <div className="text-[12px] text-muted">{e.d}{e.id === "metabolic" && metSynCount > 0 ? ` (${metSynCount}/5 met)` : ""}</div>
                    </div>
                  </button>
                  {e.id === "metabolic" && (
                    <div className="ml-7 mt-1 mb-1 space-y-1">
                      {METSYN_CRITERIA.map(m => (
                        <button key={m.id} onClick={() => toggleMetSyn(m.id)}
                          className={`w-full flex items-start gap-2 p-2 rounded-lg border text-left transition-colors cursor-pointer active:opacity-70 ${
                            metSyn[m.id] ? "bg-accent-soft border-edge" : "bg-paper border-line"
                          }`}>
                          <div className={`mt-0.5 w-4 h-4 rounded border shrink-0 flex items-center justify-center ${
                            metSyn[m.id] ? "bg-accent border-accent" : "border-edge"
                          }`}>{metSyn[m.id] && <span className="text-paper text-[11px] font-bold">✓</span>}</div>
                          <div><div className="text-[13px] font-bold text-ink leading-tight">{m.l}</div>
                          <div className="text-[12px] text-muted">{m.d}</div></div>
                        </button>
                      ))}
                      {metSynCount >= 3 && (
                        <div className="text-[12px] font-bold text-amber-700 dark:text-amber-400 bg-paper rounded-lg px-2.5 py-1.5 border border-line">
                          {metSynCount}/5 criteria met: metabolic syndrome (CKM syndrome)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {enhCount > 0 && (
              <div className="mt-2 text-[14px] font-bold text-amber-700 dark:text-amber-400 bg-paper rounded-lg px-3 py-2 border border-line">
                {enhCount} enhancer{enhCount>1?"s":""}: favors statin at borderline risk
              </div>
            )}
          </Card>

          {/* CAC */}
          <Card title="CAC reclassification (optional)">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[12px] text-muted">Men ≥40, women ≥45, at intermediate or select borderline risk when the statin decision is uncertain</p>
              <button onClick={() => setCacInfo(p => !p)}
                aria-label="About CAC scoring"
                className="hit w-6 h-6 rounded-full border border-edge text-muted text-[13px] font-bold flex items-center justify-center shrink-0 ml-2 cursor-pointer hover:border-accent hover:text-accent active:scale-95 transition-colors">?</button>
            </div>
            {cacInfo && (
              <div className="panel-in mb-3 p-3 bg-surface border border-line rounded-lg text-[12px] text-ink space-y-2">
                <div className="font-bold text-ink">How CAC reclassifies risk</div>
                <div>CAC (Agatston units) overrides the PREVENT estimate when obtained:</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">CAC = 0</span><span>Reasonable to defer a statin at borderline or intermediate risk and repeat CAC in 3–7 years. Not with current smoking, diabetes (age &gt;40), strong family history of premature ASCVD, LDL-C ≥190, or FH.</span>
                  <span className="font-bold text-accent">CAC 1–99</span><span>Moderate-intensity statin. If ≥75th percentile for age and sex, upgrade to high intensity.</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400 whitespace-nowrap">CAC 100–999</span><span>High-intensity statin, LDL-C goal &lt;70. At 300–999, intensifying to &lt;55 is reasonable.</span>
                  <span className="font-bold text-red-700 dark:text-red-400 whitespace-nowrap">CAC ≥1000</span><span>LDL-C goal &lt;55 with at least 50% reduction.</span>
                </div>
                <div className="text-muted border-t border-line pt-2">Percentile matters only for scores 1–99. It indexes plaque burden to age and sex: CAC 50 at age 45 carries different weight than CAC 50 at 75.</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Num label="CAC score" unit="AU" value={cac} on={setCac} min={0} max={10000} ph="Agatston" />
              <Num label="CAC percentile" unit="%" value={cacPct} on={setCacPct} min={0} max={100} ph="Percentile" />
            </div>
          </Card>
        </>)}

        {/* SECONDARY */}
        {tab === "secondary" && (
          <AscvdTab si={si} ldl={ldlC} setLdl={setLdlC} major={vhrMajor} toggleMajor={toggleVhrMajor}
            feat={vhrFeat} toggleFeat={toggleVhrFeat} status={vhrS}
            other={secF} toggleOther={toggleSecF} ckdAuto={egfrCkd ? `eGFR ${egfr}` : null} rec={rec} />
        )}

        {/* DIABETES */}
        {tab === "diabetes" && (
          <DiabetesTab si={si} age={age} setAge={setAge} ldl={ldlC} setLdl={setLdlC}
            enhs={dmEnhs} toggleEnh={toggleDmEnh} enhCount={dmEnhCount}
            f={dmF} toggleF={toggleDmF} risk10={dmRisk10} rec={rec} />
        )}
        {(tab === "secondary" || tab === "diabetes") && showPlan && (
          <div ref={setPlanEl} className="lg:hidden"><Plan rec={rec} ldl={ldlC} si={si} where="inline" /></div>
        )}

        {/* SEVERE */}
        {tab === "severe" && (<>
          <Card title="Severe hypercholesterolemia">
            <p className="text-[12px] text-muted mb-3">LDL-C ≥190: high-intensity statin, no risk calculation needed. Set the goal, then work through the FH steps.</p>
            <SINum si={si} factor={CHOL_F} phSI="Current" label="Current LDL-C" unit="mg/dL" value={ldlC} on={setLdlC} min={0} max={600} ph="Current" />
            <SevereGoalTiers si={si} f={sevF} toggle={toggleSevF} hefhAuto={hefhAuto} goal={sevGoal} />
          </Card>
          {showPlan && <div ref={setPlanEl} className="lg:hidden"><Plan rec={rec} ldl={ldlC} si={si} where="inline" /></div>}
          <FHWorkup si={si} ldl={ldlC} rx={sevRx} setRx={setSevRx} factor={sevFactor}
            knownLdl={knownLdl} setKnownLdl={setKnownLdl} untreated={untreatedLdl}
            checked={dlcnChecked} toggle={toggleDlcn} dlcn={dlcn} />
        </>)}

        {/* TREATMENT LADDER */}
        {showPlan && (<>
          <Card title="Treatment ladder">
            {tab === "secondary" && (
              <p className="mb-3 text-[12px] text-body leading-snug">
                The order is not fixed. Ezetimibe is no longer required before a PCSK9 mAb. Choose by the LDL-C lowering still needed.
              </p>
            )}
            <div className="space-y-0">
              {[
                { s:5, l:(rec.g?.ldl<=55 || tab==="severe") ? "Enlicitide or inclisiran" : "Enlicitide", show:rec.esc },
                { s:4, l:"Bempedoic acid or PCSK9 mAb", show:rec.esc },
                { s:3, l:"Ezetimibe", show:rec.esc },
                { s:2, l:"Maximally tolerated statin", show:rec.int!=="none"&&rec.int!=="lifestyle", isStatin:true },
                { s:1, l:"Lifestyle optimization", show:true },
              ].filter(s=>s.show).map((s,i,arr) => (
                <div key={s.s} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-paper shrink-0 bg-ink`}>{s.s}</div>
                    {i<arr.length-1 && <div className="flex-1 my-0.5 w-px bg-edge"/>}
                  </div>
                  <div className="pb-3 flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-ink flex items-center gap-1.5">
                      {s.l}
                      {s.isStatin && (
                        <button onClick={() => setStatinInfo(p => !p)}
                          aria-label="Statin reference"
                          className="hit w-5 h-5 rounded-full border border-edge text-muted text-[11px] font-bold flex items-center justify-center shrink-0 cursor-pointer hover:border-accent hover:text-accent active:scale-95 transition-colors">?</button>
                      )}
                    </div>
                    <div className="text-[12px] text-muted mt-0.5">
                      {s.s === 1 && (
                        <div className="mt-1.5">
                          <Disclosure open={lifeShown} on={() => setLifeOpen(!lifeShown)} label="Expected LDL-C change">
                            <LifestyleLDL />
                          </Disclosure>
                        </div>
                      )}
                      {s.isStatin && (<>
                        <div className="font-bold text-body">{rec.int==="high" ? "High intensity" : "Moderate intensity"} <span className="font-normal text-faint">({rec.int==="high" ? "≥50%" : "30–49%"} LDL-C reduction)</span></div>
                        <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-line">
                          {rec.int==="high" ? (<>
                            <div>Atorvastatin 40–80 mg</div>
                            <div>Rosuvastatin 20–40 mg</div>
                          </>) : (<>
                            <div>Atorvastatin 10–20 mg</div>
                            <div>Rosuvastatin 5–10 mg</div>
                            <div>Simvastatin 20–40 mg</div>
                          </>)}
                        </div>
                        {statinInfo && <div className="mt-2"><StatinInfo onClose={() => setStatinInfo(false)} /></div>}
                        <button type="button" onClick={() => setSiOpen(p => !p)} aria-expanded={siOpen}
                          className={`mt-2 h-11 px-3 rounded-lg border text-[12px] font-semibold cursor-pointer transition-colors active:scale-[0.99] ${siOpen ? "border-edge bg-accent-soft text-accent" : "border-line bg-surface text-muted hover:text-ink"}`}>
                          Statin not tolerated?
                        </button>
                        {siOpen && <div className="mt-2"><StatinIntolerance onClose={() => setSiOpen(false)} group={siGroup} si={si} /></div>}
                      </>)}
                      {s.s === 3 && (
                        <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-line">
                          <div><Route r="PO" /> Ezetimibe 10 mg daily <span className="text-muted whitespace-nowrap">(≈15–20% added to a statin)</span></div>
                          <div className="text-faint">Avoid with active liver disease when combined with a statin. Not recommended in moderate to severe hepatic impairment.</div>
                        </div>
                      )}
                      {s.s === 4 && (
                        <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-line">
                          <div><Route r="PO" /> Bempedoic acid 180 mg daily <span className="text-muted whitespace-nowrap">(≈18% added to a statin)</span></div>
                          <div><Route r="SC" /> Evolocumab 140 mg q2wk or 420 mg monthly <span className="text-muted whitespace-nowrap">(≈60% added to a statin)</span></div>
                          <div><Route r="SC" /> Alirocumab 75–150 mg q2wk <span className="text-muted whitespace-nowrap">(≈50–60% added to a statin)</span></div>
                          <div className="text-faint">Bempedoic acid: tendon-rupture and gout warnings. Cap simvastatin at 20 mg, pravastatin at 40 mg. PCSK9 mAb: avoid with prior serious hypersensitivity.</div>
                        </div>
                      )}
                      {s.s === 5 && (
                        <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-line">
                          <div className="text-faint">Alternatives to a PCSK9 mAb. LDL-C lowering only: outcomes trials are pending.</div>
                          <div><Route r="PO" /> Enlicitide (Lipfendra) 20 mg daily <span className="text-muted whitespace-nowrap">(≈56% LDL-C reduction)</span></div>
                          <div className="text-faint">Morning, empty stomach, no food for 30 minutes. The only oral PCSK9 inhibitor. FDA-approved July 2026, so not in the 2026 guideline. Stop when pregnancy is recognized.</div>
                          {(rec.g?.ldl<=55 || tab==="severe") && (<>
                            <div><Route r="SC" /> Inclisiran 284 mg <span className="text-muted whitespace-nowrap">(≈50% added to a statin)</span></div>
                            <div className="text-faint">Day 0, month 3, then every 6 months, given by a clinician. Guideline: second-line PCSK9 inhibitor (COR 2a).</div>
                            <div className="text-faint">Avoid with prior serious hypersensitivity. Limited data in severe hepatic or renal impairment.</div>
                          </>)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {rec.esc && (
              <div className="mt-1 text-[12px] text-faint leading-snug">
                <Route r="PO" /> oral, <Route r="SC" /> subcutaneous, <Route r="IV" /> infusion. <span className="font-semibold text-muted">No oral form:</span> evolocumab, alirocumab, lerodalcibep (self-injected), inclisiran (clinic injection), evinacumab (IV, HoFH only).
              </div>
            )}
            {tgNote && (
              <div className="mt-2 p-3 bg-surface border border-line rounded-lg">
                <div className="text-[14px] font-bold text-amber-800 dark:text-amber-300">Hypertriglyceridemia</div>
                <div className="text-[12px] text-amber-700 dark:text-amber-400 mt-0.5">TG {tg}: {tgNote.txt}</div>
              </div>
            )}
          </Card>
        </>)}

        {/* BIOMARKERS */}
        <Card title="Advanced biomarkers">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[12px] text-muted">Lp(a): once in every adult. ApoB: once LDL-C and non-HDL-C are at goal.</p>
            <button onClick={() => setBioInfo(p => !p)}
              aria-label="About Lp(a) and apoB"
              className="hit w-6 h-6 rounded-full border border-edge text-muted text-[13px] font-bold flex items-center justify-center shrink-0 ml-2 cursor-pointer hover:border-accent hover:text-accent active:scale-95 transition-colors">?</button>
          </div>
          {bioInfo && (
            <div className="panel-in mb-3 p-3 bg-surface border border-line rounded-lg text-[12px] text-ink space-y-3">
              <div>
                <div className="font-bold text-ink mb-1">Lp(a)</div>
                <div>Genetically determined, largely fixed from birth, not statin-responsive. Causal and continuous for ASCVD and aortic stenosis: risk rises with level and has no true threshold (EAS consensus, Eur Heart J 2022). Elevated Lp(a) carries risk even at low LDL-C.</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 mt-1.5">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">&lt;125 nmol/L</span><span>Not a risk enhancer</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">≥125 nmol/L</span><span>≈1.4× ASCVD risk. Counts as a risk enhancer</span>
                  <span className="font-bold text-red-700 dark:text-red-400">≥250 nmol/L</span><span>≈2× ASCVD risk. With ASCVD above goal, add a PCSK9 mAb</span>
                </div>
                <div className="text-muted mt-1.5">Measure once in every adult, with cascade testing of first-degree relatives when Lp(a) is high or in FH or premature-ASCVD families. mg/dL ≈ nmol/L ÷ 2.5 (elevated ≥50 mg/dL). Refer at ≥200 nmol/L. No approved Lp(a)-specific therapy: intensify LDL-C lowering and global risk factor control. Apheresis is an option for very high Lp(a) with progressive ASCVD.</div>
              </div>
              <div className="border-t border-edge pt-2">
                <div className="font-bold text-ink mb-1">ApoB</div>
                <div>One molecule per atherogenic particle (LDL, VLDL, IDL, Lp(a)), so it counts particle number directly. Most useful when TG is elevated or LDL-C and non-HDL-C are discordant.</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 mt-1.5">
                  <span className="font-bold text-accent">&lt;90 mg/dL</span><span>ApoB goal when the LDL-C goal is &lt;100</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">&lt;70 mg/dL</span><span>ApoB goal when the LDL-C goal is &lt;70</span>
                  <span className="font-bold text-red-700 dark:text-red-400">&lt;55 mg/dL</span><span>ApoB goal when the LDL-C goal is &lt;55</span>
                  <span className="font-bold text-ink">≥120 mg/dL</span><span>Risk enhancer in an untreated adult</span>
                </div>
                <div className="text-muted mt-1.5">Measure once LDL-C and non-HDL-C are at goal, particularly with ASCVD, CKM syndrome, type 2 diabetes, or elevated TG. An apoB still above goal supports further intensification. With TG ≥150, non-HDL-C or apoB is preferred over LDL-C. Standardized immunoassays make apoB more reliable than calculated LDL-C at low levels.</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <Num label="Lp(a)" unit="nmol/L" value={lpa} on={setLpa} min={0} max={500} />
            <Num label="ApoB" unit="mg/dL" value={apoB} on={setApoB} min={0} max={300} />
          </div>
          {lpaNote && (
            <div className="flex items-start gap-2 p-2 rounded-lg border border-line bg-paper mb-1.5"><Badge color={lpaNote.c}>Lp(a) {lpaNote.lv}</Badge><span className="text-[12px] text-ink">{lpaNote.n}</span></div>
          )}
          {apoBNote && (
            <div className="flex items-start gap-2 p-2 rounded-lg border border-line bg-paper"><Badge color={apoBNote.c}>ApoB {apoBNote.lv}</Badge><span className="text-[12px] text-ink">{apoBNote.n}</span></div>
          )}
        </Card>

        {/* BLOOD PRESSURE */}
        <BloodPressure sbp={sbp} setSbp={setSbp} dbp={dbp} setDbp={setDbp} bpTx={bpTx} setBpTx={setBpTx}
          cvd10={cvd10Bp} cvdWithDm={bpDm && !dm} auto={bpAuto} flags={bpF} toggleFlag={toggleBpF} />

        {/* MONITORING */}
        <Card title="Monitoring">
          <div className="space-y-2.5 text-[12px]">

            <div className="border-t border-line pt-3 first:border-t-0 first:pt-0">
              <div className="font-bold text-ink mb-1.5">Lipid-lowering therapy</div>
              <div className="space-y-1 text-body">
                <MonRow k="4–12 wk"><b>Lipid profile</b> after starting or changing a dose. Nonfasting is acceptable, fasting if TG ≥400.</MonRow>
                <MonRow k="q6–12 mo">Thereafter, for efficacy and adherence</MonRow>
              </div>
            </div>

            <div className="border-t border-line pt-3 first:border-t-0 first:pt-0">
              <div className="font-bold text-ink mb-1.5">Safety</div>
              <ul className={BULLETS}>
                <li><b>ALT</b> before starting. No routine liver tests without symptoms</li>
                <li><b>CK</b> only with severe muscle symptoms</li>
                <li>
                  <span className="inline-flex items-center gap-2">
                    <span>New-onset diabetes: continue the <b>statin</b></span>
                    <button onClick={() => setStatinInfoMon(p => !p)} aria-label="Statin reference" aria-expanded={statinInfoMon}
                      className="hit w-5 h-5 rounded-full border border-edge text-muted text-[11px] font-bold flex items-center justify-center shrink-0 cursor-pointer hover:border-accent hover:text-accent active:scale-95 transition-colors">?</button>
                  </span>
                </li>
              </ul>
              {statinInfoMon && <div className="mt-2"><StatinInfo onClose={() => setStatinInfoMon(false)} /></div>}
            </div>

            <div className="border-t border-line pt-3 first:border-t-0 first:pt-0">
              <div className="font-bold text-ink mb-1.5">Screening</div>
              <div className="space-y-1 text-body">
                <MonRow k="From age 2">If a 1st- or 2nd-degree relative has premature ASCVD, LDL-C ≥190, or FH</MonRow>
                <MonRow k="Ages 9–11">First <b>lipid profile</b></MonRow>
                <MonRow k="From age 19"><b>Lipid profile</b> at least every 5 years, more often with risk factors</MonRow>
                <MonRow k="Lp(a)">Once in every adult</MonRow>
              </div>
            </div>

            <div className="border-t border-line pt-3 first:border-t-0 first:pt-0">
              <div className="font-bold text-ink mb-1.5">Refer to a lipid specialist</div>
              <ul className={BULLETS}>
                <li>Diagnosed or suspected familial hypercholesterolemia</li>
                <li>Not at ≥50% LDL-C reduction and goal on maximal statin plus nonstatin</li>
                <li>Side effects on ≥2 statins, including lowest or alternate dosing</li>
                <li>Lp(a) ≥200 nmol/L (≥75 mg/dL)</li>
                <li>TG ≥400 mg/dL</li>
                <li>Premature ASCVD (onset &lt;40 y)</li>
                <li>Diabetes with dyslipidemia before age 40</li>
                <li>Complex regimens: HIV, cancer, or transplant therapy</li>
                <li>Pregnant, planning pregnancy, or breastfeeding</li>
              </ul>
            </div>

          </div>
        </Card>

        {/* Footer */}
        <div className="border-t border-line mt-6" />
        <div className="text-center pt-3 space-y-1">
          <div className="text-[12px] text-faint">PREVENT: Khan SS et al. Circ 2024;149:430-449 · Lipids: Blumenthal RS et al. JACC/Circ 2026 · BP: Jones DW et al. JACC/Circ 2025</div>
          <div className="text-[12px] text-faint">Clinical decision support only. Does not replace clinical judgment.</div>
          <a href="https://professional.heart.org/en/guidelines-and-statements/prevent-calculator"
            target="_blank" rel="noopener"
            className="inline-flex items-center min-h-[44px] text-[12px] text-accent underline">
            Cross-check with the AHA PREVENT calculator
          </a>
        </div>

      </div>

      <aside aria-label={tab === "primary" ? "Risk and plan" : "Plan"} className="rail hidden lg:block lg:sticky lg:top-6">
        {tab !== "primary" ? (
          <div className="lg:border-l lg:border-line lg:pl-10">
            {showPlan && <Plan rec={rec} ldl={ldlC} si={si} where="rail" />}
          </div>
        ) : (<>
          {risk10 !== null && rc10 ? (
            <RiskRail risk10={risk10} rc10={rc10} risk30={risk30} rc30={rc30} discord={discord}
              optRisk30={optRisk30} drivers={drivers} dark={darkMode} variant="rail" note={summaryNote}
              cvd10={cvd10} cvd30={cvd30} hf10={hf10} hf30={hf30}>
              {showPlan && <Plan rec={rec} ldl={ldlC} si={si} where="rail" />}
            </RiskRail>
          ) : (
            <div className="lg:border-l lg:border-line lg:pl-10 pt-1">
              <SectionHead>Risk estimates</SectionHead>
              <div className="mt-2 text-[13px] text-muted leading-relaxed">Risk and the plan appear here once age, sex, total cholesterol, HDL-C, systolic BP, and eGFR are entered. BMI adds the heart-failure estimate.</div>
            </div>
          )}
        </>)}
      </aside>
      </div>
      </div>
      </main>
      {showPlan && planEl && !planSeen && <PlanBar rec={rec} ldl={ldlC} si={si} onGo={goToPlan} />}
      </div>
    </div>
  );
}
