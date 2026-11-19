import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  calcPREVENT10, calcPREVENT30,
  riskCat10, riskCat30,
  discordance, optimizedInputs, driverDeltas,
  VALID_30YR_AGE_MAX,
} from "./prevent.js";

const VHR_CRITERIA = [
  { id:"acs", l:"Recent ACS", d:"MI or unstable angina within past 12 months" },
  { id:"multi", l:"Multiple ASCVD events", d:"≥2 major events (MI, stroke, symptomatic PAD)" },
  { id:"pad", l:"Symptomatic PAD", d:"ABI ≤0.85 or prior revascularization/amputation" },
  { id:"dm_ascvd", l:"ASCVD + Diabetes", d:"DM with microvascular complications or ≥2 additional CVD risk factors" },
  { id:"ckd_ascvd", l:"ASCVD + CKD", d:"eGFR 15–59" },
  { id:"heFH", l:"ASCVD + heterozygous FH", d:"Familial hypercholesterolemia" },
  { id:"persist", l:"Persistently elevated LDL", d:"LDL ≥100 despite max dose statin + ezetimibe" },
];

const DM_ENHANCERS = [
  { id:"dur_t2", l:"Type 2 DM ≥10 years", d:"Longer duration increases CVD risk" },
  { id:"dur_t1", l:"Type 1 DM ≥20 years", d:"Longer duration increases CVD risk" },
  { id:"a1c", l:"A1c ≥8%", d:"Average glucose ≥183 mg/dL" },
  { id:"alb", l:"Albuminuria ≥30 mg/g", d:"Urine albumin-to-creatinine ratio (uACR)" },
  { id:"egfr_dm", l:"eGFR <60", d:"Stage 3+ CKD" },
  { id:"retino", l:"Retinopathy", d:"Diabetic retinopathy" },
  { id:"neuro", l:"Neuropathy", d:"Diabetic neuropathy" },
  { id:"abi_dm", l:"ABI ≤0.9", d:"Peripheral arterial disease" },
];

const METSYN_CRITERIA = [
  { id:"ms_waist", l:"Elevated waist circumference", d:"Male ≥40 in (102 cm) · Female ≥35 in (88 cm)" },
  { id:"ms_tg", l:"Elevated triglycerides", d:"≥150 mg/dL (or on Rx)" },
  { id:"ms_hdl", l:"Low HDL-C", d:"Male <40 mg/dL · Female <50 mg/dL (or on Rx)" },
  { id:"ms_bp", l:"Elevated blood pressure", d:"≥130/85 mmHg (or on antihypertensive)" },
  { id:"ms_gluc", l:"Elevated fasting glucose", d:"≥100 mg/dL (or on Rx)" },
];

const ENHANCERS = [
  { id:"fhx", l:"Family history of premature ASCVD", d:"1st-degree male <55y or female <65y" },
  { id:"lpa", l:"Elevated Lp(a)", d:"≥125 nmol/L (≥50 mg/dL)" },
  { id:"tg", l:"Persistently elevated triglycerides", d:"≥175 mg/dL on repeat measurement" },
  { id:"hscrp", l:"Elevated hs-CRP", d:"≥2.0 mg/L" },
  { id:"ckd", l:"Chronic kidney disease", d:"eGFR 15–59 or ACR ≥30" },
  { id:"inflam", l:"Chronic inflammatory disease", d:"RA, Pso/PsA, SLE, HIV" },
  { id:"metabolic", l:"Metabolic syndrome", d:"≥3 of 5 criteria" },
  { id:"women", l:"Preeclampsia or premature menopause", d:"Menopause before age 40" },
  { id:"sa", l:"South Asian ancestry", d:"Indian, Pakistani, Bangladeshi, Nepali, Sri Lankan heritage" },
  { id:"apob", l:"Elevated ApoB", d:"≥130 mg/dL" },
  { id:"abi", l:"Abnormal ABI", d:"≤0.9" },
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
      { name:"Pitavastatin", dose:"1 mg", myo:1, notes:null },
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
    <div className="panel-in p-3 bg-paper border border-edge rounded-lg text-[11px] text-ink space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-bold text-ink text-[12px]">Statin reference</div>
        <button onClick={onClose} className="text-[12px] text-faint hover:text-ink cursor-pointer font-bold">✕</button>
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
                {d.notes && <div className="text-[10px] text-muted mt-0.5">{d.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="border-t border-line pt-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 mb-1.5">
          <div className="font-bold text-ink">Intrinsic myotoxicity</div>
          <div className="text-[9px] text-faint">PRIMO high-dose symptom rate, unblinded</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-flow-col sm:grid-rows-4 gap-x-8 gap-y-1">
          {spectrum.map(d => (
            <div key={d.name} className="flex items-center gap-2.5">
              <span className="flex-1 min-w-0 text-[10.5px] font-medium text-ink truncate">{d.name}</span>
              <MyoDots level={d.myo} />
              <span className="w-11 text-right font-mono text-[10.5px] tabular-nums text-muted shrink-0">{d.primo ? d.primo + "%" : "–"}</span>
            </div>
          ))}
        </div>
        <div className="text-[9.5px] text-faint mt-1.5">1 dot lowest, 4 dots highest intrinsic myotoxicity (dose, lipophilicity, CYP3A4, OATP1B1).</div>
        <div className="text-[10px] text-muted mt-1.5 leading-snug border-t border-line pt-1.5">
          In blinded trials muscle complaints are nearly identical on statin and placebo (CTT 2022: RR 1.03 overall, 1.07 in year one), so over 90% of reported symptoms are not pharmacologic. The gradient above matters for true myopathy, rhabdomyolysis, and interactions, not everyday aches. PRIMO rates are observational. SLCO1B1 variants raise simvastatin myopathy risk about 4× per risk allele (SEARCH GWAS, NEJM 2008).
        </div>
      </div>

      <div className="border-t border-line pt-2.5">
        <div className="font-bold text-ink mb-1">Contraindications and cautions</div>
        <div className="space-y-0.5 text-body text-[10.5px] leading-snug">
          <div><b>All statins:</b> active liver disease or unexplained persistent transaminase elevation. Stop before conception: avoided in pregnancy and lactation (FDA removed the blanket contraindication in 2021, individualized in high-risk patients).</div>
          <div><b>Simvastatin, lovastatin:</b> contraindicated with strong CYP3A4 inhibitors, cyclosporine, gemfibrozil, danazol.</div>
          <div><b>Rosuvastatin:</b> max 5 mg with cyclosporine, 10 mg with gemfibrozil.</div>
        </div>
      </div>

      <div className="text-[10px] text-muted space-y-0.5 border-t border-line pt-2">
        <div><b>Evening dosing:</b> simvastatin and lovastatin (short half-life). Atorvastatin and rosuvastatin any time.</div>
        <div><b>Interactions:</b> CYP3A4 statins (atorva, simva, lova) with azoles, macrolides, protease inhibitors, grapefruit. Pravastatin and pitavastatin have the fewest.</div>
        <div><b>New-onset DM:</b> all statins carry a modest signal (~9–12% relative), higher at high intensity. CV benefit far outweighs it. Pitavastatin possibly lowest.</div>
        <div><b>Sources:</b> CTT IPD meta-analysis, Lancet 2022;400:832-45 · PRIMO, Cardiovasc Drugs Ther 2005;19:403-14 · SEARCH, Lancet 2010;376:1658-69 · SLCO1B1, N Engl J Med 2008;359:789-99.</div>
      </div>
    </div>
  );
}

// ── UI Components (touch-optimized) ─────────────────────────────────────────

function Toggle({ value, on, label, sub }) {
  return (
    <button onClick={() => on(!value)} type="button"
      className="flex items-center gap-2.5 py-2 active:opacity-70 cursor-pointer min-h-[44px]">
      <div className={`w-9 h-5 rounded-full relative transition-colors duration-150 shrink-0 ${value ? "bg-accent" : "bg-track-off"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-knob shadow-sm ring-1 ring-black/10 dark:ring-white/10 transition-transform duration-150 ${value ? "translate-x-[18px]" : "translate-x-0.5"}`}/>
      </div>
      <div className="leading-tight text-left">
        <span className={`text-[13px] font-medium ${value ? "text-ink" : "text-muted"}`}>{label}</span>
        {sub && <div className="text-[10px] text-faint">{sub}</div>}
      </div>
    </button>
  );
}

function Num({ label, unit, value, on, min, max, step=1, ph, preserveCase }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={`text-[11px] font-medium text-faint tracking-wider ${preserveCase ? "" : "uppercase"}`}>{label}</label>
      <div className="flex items-center border border-edge rounded-lg overflow-hidden input-glow transition-shadow duration-150 bg-surface">
        <input type="number" inputMode="decimal" value={value}
          onChange={e => on(e.target.value==="" ? "" : Number(e.target.value))}
          min={min} max={max} step={step} placeholder={ph}
          className="flex-1 px-3 py-3 text-[16px] font-mono text-ink outline-none bg-transparent min-w-0 placeholder:text-faint" />
        {unit && <span className="pr-3 text-[12px] text-faint whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  );
}

const CHOL_F = 38.67;  // mg/dL per mmol/L, cholesterol
const TG_F = 88.57;    // mg/dL per mmol/L, triglycerides

function SIField({ label, unit, factor, value, on, ph }) {
  const [txt, setTxt] = useState(value === "" ? "" : String(Math.round((Number(value) / factor) * 10) / 10));
  useEffect(() => { if (value === "") setTxt(""); }, [value]);
  const handle = t => {
    setTxt(t);
    if (t === "") { on(""); return; }
    const n = Number(t);
    if (!Number.isNaN(n)) on(Math.round(n * factor));
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[11px] font-medium text-faint tracking-wider uppercase">{label}</label>
      <div className="flex items-center border border-edge rounded-lg overflow-hidden input-glow transition-shadow duration-150 bg-surface">
        <input type="number" inputMode="decimal" value={txt} step={0.1} placeholder={ph}
          onChange={e => handle(e.target.value)}
          className="flex-1 px-3 py-3 text-[16px] font-mono text-ink outline-none bg-transparent min-w-0 placeholder:text-faint" />
        <span className="pr-3 text-[12px] text-faint whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );
}

function SINum({ si, factor, phSI, ...rest }) {
  if (!si) return <Num {...rest} />;
  return <SIField label={rest.label} unit="mmol/L" factor={factor} value={rest.value} on={rest.on} ph={phSI} />;
}

function Card({ title, accent="blue", children }) {
  return (
    <section className="border-t border-line pt-5">
      {title && <h3 className="text-[10.5px] font-semibold text-faint uppercase tracking-[0.12em] mb-3">{title}</h3>}
      <div>{children}</div>
    </section>
  );
}

function Badge({ children, color="blue" }) {
  const s = { blue:"text-accent", red:"text-red-700 dark:text-red-400", amber:"text-amber-700 dark:text-amber-400",
    emerald:"text-emerald-700 dark:text-emerald-400", violet:"text-accent", slate:"text-muted" };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border border-edge bg-surface ${s[color]}`}>{children}</span>;
}

function Goals({ ldl, nonHdl, pct, currentLdl, si }) {
  const needed = currentLdl ? Math.round(((currentLdl-ldl)/currentLdl)*100) : null;
  const g = v => si ? (v / CHOL_F).toFixed(1) : v;
  return (
    <div className="grid grid-cols-3 divide-x divide-line border border-line rounded-lg bg-surface overflow-hidden">
      <div className="p-3 text-center">
        <div className="text-xl font-semibold text-ink font-mono tabular-nums">&lt;{g(ldl)}</div>
        <div className="text-[10.5px] text-faint font-medium uppercase tracking-wider mt-0.5">LDL-C</div>
      </div>
      <div className="p-3 text-center">
        <div className="text-xl font-semibold text-ink font-mono tabular-nums">&lt;{g(nonHdl)}</div>
        <div className="text-[10.5px] text-faint font-medium uppercase tracking-wider mt-0.5">Non-HDL</div>
      </div>
      <div className="p-3 text-center">
        <div className="text-xl font-semibold text-ink font-mono tabular-nums">&ge;{pct}%</div>
        <div className="text-[10.5px] text-faint font-medium uppercase tracking-wider mt-0.5">Reduction</div>
        {needed > 0 && <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">{needed}% needed</div>}
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
      <div className="absolute top-[17px] left-0 font-mono text-[9.5px] text-faint">0</div>
      {cuts.map(c => <div key={c} className="absolute top-[17px] -translate-x-1/2 font-mono text-[9.5px] text-muted" style={{ left: pos(c) }}>{c}</div>)}
      <div className="absolute top-[17px] right-0 font-mono text-[9.5px] text-faint">{max}+</div>
    </div>
  );
}

// ── Risk readout (desktop rail + mobile inline) ──────────────────────────────
function RiskBlock({ eyebrow, note, value, rc, dark, cuts, max }) {
  const color = dark ? rc.darkColor : rc.color;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] font-semibold text-muted uppercase tracking-[0.12em]">{eyebrow}</div>
        {note && <div className="text-[10px] text-faint">{note}</div>}
      </div>
      <div className="flex items-baseline gap-3.5 flex-wrap">
        <div className="font-mono font-medium leading-none tabular-nums text-[44px] lg:text-[54px] tracking-[-0.035em]" style={{ color }}>
          {value}<span className="text-[0.44em]">%</span>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[16px] font-bold" style={{ color }}>{rc.label}</span>
          <span className="text-[12px] text-faint">({rc.range})</span>
        </div>
      </div>
      <Scale cuts={cuts} max={max} value={value} color={color} />
    </div>
  );
}

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
      className={`w-full flex items-center justify-center gap-2 h-9 rounded-lg border text-[12px] font-semibold cursor-pointer transition-colors active:scale-[0.99] ${
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

function RiskRail({ risk10, rc10, risk30, rc30, discord, optRisk30, drivers, dark, variant, note }) {
  const delta = (risk30 !== null && optRisk30 !== null) ? Math.round((risk30 - optRisk30) * 10) / 10 : null;
  const horizonNote = (rc10 && rc30 && (discord || (rc30.rank > rc10.rank && rc30.rank >= 3)))
    ? `The 10-year estimate is ${rc10.label.toLowerCase()} while the 30-year estimate is already ${rc30.label.toLowerCase()}. That pattern argues for addressing risk factors now rather than waiting.`
    : null;
  return (
    <div className={variant === "rail" ? "lg:border-l lg:border-line lg:pl-10 flex flex-col gap-5" : "border-t border-line pt-5 flex flex-col gap-5"}>
      <RiskBlock eyebrow="10-year ASCVD risk" value={risk10} rc={rc10} dark={dark} cuts={[3, 5, 10]} max={15} />
      <div className="h-px bg-line" />
      {risk30 !== null && rc30 ? (
        <div className="flex flex-col gap-2.5">
          <RiskBlock eyebrow="30-year ASCVD risk" note="ages 30–59" value={risk30} rc={rc30} dark={dark} cuts={[10, 20, 30]} max={40} />
          {horizonNote && <div className="text-[13px] text-body leading-relaxed">{horizonNote}</div>}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="text-[11px] font-semibold text-muted uppercase tracking-[0.12em]">30-year ASCVD risk</div>
          <div className="text-[12px] text-muted">Not validated for ages 60 and above.</div>
        </div>
      )}
      {delta !== null && (
        <>
          <div className="h-px bg-line" />
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] font-semibold text-muted uppercase tracking-[0.12em]">If optimized</div>
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
                <div className="text-[10.5px] text-faint">Optimized profile: BP 110 · no smoking · BMI ≤24 · non-HDL ≤120 · HDL ≥50</div>
              </>
            )}
          </div>
        </>
      )}
      {drivers.length > 0 && (
        <>
          <div className="h-px bg-line" />
          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold text-muted uppercase tracking-[0.12em]">30-year risk drivers</div>
            <div className="flex flex-col gap-1.5">
              {drivers.map(d => (
                <div key={d.factor} className="flex items-baseline gap-2">
                  <span className="text-[13px] font-medium text-ink shrink-0">{d.label}</span>
                  <div className="flex-1 border-b border-dotted mb-[3px]" style={{ borderColor: "var(--ruler)" }} />
                  <span className="font-mono text-[13px] font-semibold text-ink tabular-nums shrink-0">−{d.delta}</span>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-faint leading-snug">Single-factor projections. Values may not sum due to interactions in the PREVENT model.</div>
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
  const [ascvdLevel, setAscvdLevel] = useState("not_very_high");
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
  const [vhr, setVhr] = useState({});
  const [dmEnhs, setDmEnhs] = useState({});

  const resetPatient = useCallback(() => {
    setAge(""); setSex("male"); setSbp(""); setBpTx(false);
    setTotalC(""); setHdlC(""); setLdlC(""); setOnStatin(false);
    setDm(false); setSmoking(false); setEgfr(""); setBmi("");
    setTg(""); setEnhs({}); setCac(""); setCacPct("");
    setLpa(""); setApoB(""); setAscvdLevel("not_very_high");
    setCacInfo(false); setBioInfo(false); setRiskInfo(false); setBmiCalc(false);
    setStatinInfo(false); setStatinInfoMon(false);
    setBmiWt(""); setBmiHt(""); setBmiHtIn("");
    setVhr({}); setDmEnhs({}); setMetSyn({});
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
  const toggleVhr = useCallback(id => setVhr(p => ({...p,[id]:!p[id]})), []);
  const vhrCount = useMemo(() => Object.values(vhr).filter(Boolean).length, [vhr]);
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

  // ── Recommendation engine ──
  const rec = useMemo(() => {
    if (tab === "secondary") {
      return vhrCount > 0
        ? { g:{ldl:55,nh:85,p:50}, int:"high", esc:true, txt:"Very high-risk ASCVD. High-intensity statin plus add-on therapy to LDL below 55 mg/dL.", clr:"red" }
        : { g:{ldl:70,nh:100,p:50}, int:"high", esc:true, txt:"Clinical ASCVD, not very high risk. High-intensity statin to LDL below 70 mg/dL.", clr:"orange" };
    }
    if (tab === "diabetes") {
      return { g:{ldl:70,nh:100,p:50}, int:"high", esc:true, txt:"Diabetes, age 40 to 75. Lipid-lowering therapy is recommended regardless of LDL. High-intensity statin with additional risk factors.", clr:"violet" };
    }
    if (tab === "severe") {
      return { g:{ldl:100,nh:130,p:50}, int:"high", esc:true, txt:"LDL ≥190. High-intensity statin. Evaluate for familial hypercholesterolemia.", clr:"red" };
    }
    if (risk10 === null) return null;
    // CAC override
    if (cac !== "") {
      const c = Number(cac), p = cacPct !== "" ? Number(cacPct) : null;
      if (c === 0) return { g:null, int:"none", esc:false, txt:"CAC of zero. Statin may be deferred. Reassess in 5 to 10 years with continued lifestyle optimization.", clr:"emerald" };
      if (c >= 1000) return { g:{ldl:55,nh:85,p:50}, int:"high", esc:true, txt:"CAC ≥1000. Treat as very high risk with an LDL goal below 55.", clr:"red" };
      if (c >= 100 || (p !== null && p >= 75)) return { g:{ldl:70,nh:100,p:50}, int:"high", esc:true, txt:"CAC ≥100 or ≥75th percentile. High-intensity statin to LDL below 70.", clr:"amber" };
      if (c >= 1) return { g:{ldl:100,nh:130,p:30}, int:"moderate", esc:false, txt:"CAC 1–99, below the 75th percentile. Moderate-intensity statin to LDL below 100.", clr:"blue" };
    }
    if (risk10 >= 10) return { g:{ldl:70,nh:100,p:50}, int:"high", esc:true, txt:"High 10-year risk (≥10%). High-intensity statin to LDL below 70.", clr:"red" };
    if (risk10 >= 5) return { g:{ldl:100,nh:130,p:30}, int:"moderate", esc:false, txt:"Intermediate risk (5–<10%). Moderate-intensity statin to LDL below 100 after shared decision-making.", clr:"amber" };
    if (risk10 >= 3 && enhCount > 0) return { g:{ldl:100,nh:130,p:30}, int:"moderate", esc:false, txt:`Borderline risk with ${enhCount} risk enhancer${enhCount>1?"s":""}. Consider a moderate-intensity statin.`, clr:"amber" };
    if (risk10 >= 3) return { g:{ldl:100,nh:130,p:30}, int:"lifestyle", esc:false, txt:"Borderline risk (3–<5%). Lifestyle optimization. Consider a statin if risk enhancers are present.", clr:"blue" };
    return { g:null, int:"none", esc:false, txt:"Low risk (<3%). Lifestyle optimization with periodic reassessment.", clr:"emerald" };
  }, [tab, risk10, enhCount, cac, cacPct, vhrCount]);

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
    demo.push(`BMI ${bmi}.`);
    demo.push(`eGFR ${egfr}.`);
    if (smoking) demo.push("Current smoker.");
    if (dm) demo.push("Diabetes.");
    if (onStatin) demo.push("On statin.");
    const demoLine = demo.join(" ");

    const rows = [];
    rows.push(["10-yr ASCVD Risk", `${risk10}% (${rc10.label.toLowerCase()})`]);
    if (risk30 !== null && rc30) rows.push(["30-yr ASCVD Risk", `${risk30}% (${rc30.label.toLowerCase()})`]);
    if (risk30 !== null && optRisk30 !== null) {
      const d = Math.round((risk30 - optRisk30) * 10) / 10;
      if (d > 0) rows.push(["If optimized", `30-yr ${optRisk30}% (-${d} points)`]);
    }
    if (enhCount > 0) rows.push(["Risk enhancers", String(enhCount)]);
    if (rec) {
      rows.push(["Plan", rec.txt]);
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
  }, [risk10, rc10, risk30, rc30, optRisk30, age, sex, totalC, hdlC, ldlC, nonHdlC, tg, sbp, bpTx, bmi, egfr, smoking, dm, onStatin, enhCount, rec]);

  // Biomarker interpretation
  const lpaNote = useMemo(() => {
    if (lpa === "") return null;
    const v = Number(lpa);
    if (v >= 250) return { lv:"Very High", c:"red", n:"~2× ASCVD risk. Intensify LDL-C lowering aggressively." };
    if (v >= 125) return { lv:"Elevated", c:"amber", n:"~1.4× ASCVD risk. Counts as a risk enhancer." };
    return { lv:"Normal", c:"emerald", n:"Not a risk enhancer." };
  }, [lpa]);

  const apoBNote = useMemo(() => {
    if (apoB === "") return null;
    const v = Number(apoB);
    if (v >= 130) return { lv:"Very High", c:"red", n:"Markedly elevated atherogenic particle burden. Intensify therapy." };
    if (v >= 100) return { lv:"Elevated", c:"amber", n:"Above goal for most. Consider intensification if TG elevated or DM." };
    if (v >= 85) return { lv:"Borderline", c:"blue", n:"At goal for intermediate risk. Above goal for very high risk (<85)." };
    return { lv:"Optimal", c:"emerald", n:"At goal for all risk categories." };
  }, [apoB]);

  const tabs = [
    { id:"primary", l:"Primary" },
    { id:"secondary", l:"ASCVD" },
    { id:"diabetes", l:"Diabetes" },
    { id:"severe", l:"LDL ≥190" },
  ];

  const recTxt = { red:"text-red-800 dark:text-red-300", amber:"text-amber-800 dark:text-amber-300", orange:"text-orange-800 dark:text-orange-300",
    emerald:"text-emerald-800 dark:text-emerald-300",
    violet:"text-accent", blue:"text-accent" };

  return (
    <div className="h-screen h-[100dvh] flex flex-col overflow-hidden bg-paper text-ink">

      {/* ── Header ── */}
      <div className="shrink-0 bg-paper border-b border-line">
        <div className="pwa-header-pad">
          <div className="max-w-[1200px] mx-auto px-5 lg:px-8 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-5 min-w-0">
              <h1 className="text-[17px] font-bold tracking-[-0.015em] whitespace-nowrap">Lipid 2026</h1>
              <div className="hidden sm:block w-px h-4 bg-edge" />
              <p className="hidden sm:block text-[11px] text-muted truncate">2026 ACC/AHA guideline · PREVENT risk model</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex h-8 rounded-lg border border-line bg-surface overflow-hidden">
                <button onClick={() => setUnits('us')}
                  className={`px-2.5 text-[11px] font-semibold cursor-pointer transition-colors ${!si ? "bg-accent-soft text-accent" : "text-faint hover:text-muted"}`}>mg/dL</button>
                <div className="w-px bg-line" />
                <button onClick={() => setUnits('si')}
                  className={`px-2.5 text-[11px] font-semibold cursor-pointer transition-colors ${si ? "bg-accent-soft text-accent" : "text-faint hover:text-muted"}`}>mmol/L</button>
              </div>
              <button onClick={() => setDarkMode(d => !d)} aria-label="Toggle theme"
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-line bg-surface text-muted hover:text-ink active:scale-95 transition-colors cursor-pointer">
                {darkMode ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>
                )}
              </button>
              <button onClick={resetPatient}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-line bg-surface text-[12px] font-semibold text-muted hover:text-ink active:scale-95 transition-colors cursor-pointer whitespace-nowrap">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="shrink-0 bg-paper border-b border-line">
        <div className="max-w-[1200px] mx-auto px-5 lg:px-8 flex justify-between sm:justify-start sm:gap-8 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`min-h-[44px] flex items-end pb-2 pt-3 text-[13px] whitespace-nowrap cursor-pointer transition-colors border-b-2 -mb-px ${
                tab===t.id ? "font-semibold text-ink border-accent" : "font-medium text-muted border-transparent hover:text-ink"
              }`}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-none">
      <div key={tab} className="tab-content max-w-[1200px] mx-auto px-5 lg:px-8 py-6 pb-16">
      <div className={tab === "primary" ? "lg:grid lg:grid-cols-[minmax(0,42rem)_400px] lg:gap-12 lg:items-start lg:justify-center" : ""}>
      <div className={`col-main space-y-5 min-w-0 ${tab === "primary" ? "" : "max-w-2xl mx-auto"}`}>

        {/* PRIMARY */}
        {tab === "primary" && (<>
          <Card title="PREVENT-ASCVD risk calculator" accent="blue">
            <div className="flex items-start justify-between mb-3">
              <p className="text-[11px] text-muted">Ages 30–79, no known ASCVD. Replaces the Pooled Cohort Equations.</p>
              <button onClick={() => setRiskInfo(p => !p)}
                className="w-6 h-6 rounded-full border border-edge text-faint text-[12px] font-bold flex items-center justify-center shrink-0 ml-2 cursor-pointer hover:border-accent hover:text-accent active:scale-95 transition-colors">?</button>
            </div>
            {riskInfo && (
              <div className="panel-in mb-3 p-3 bg-surface border border-line rounded-lg text-[11px] text-ink space-y-2">
                <div className="font-bold text-ink">About the PREVENT estimates</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                  <span className="font-bold text-accent whitespace-nowrap">10-Yr ASCVD</span>
                  <span>Probability of MI, stroke, or CHD death within 10 years.</span>
                  <span className="font-bold text-accent whitespace-nowrap">30-Yr ASCVD</span>
                  <span>Same endpoint over 30 years. Validated for ages 30–59 only.</span>
                </div>
                <div className="text-muted border-t border-edge pt-2">
                  PREVENT (2023) replaces the Pooled Cohort Equations: adds eGFR, BMI, and statin use, drops race as an input. Heart failure has a separate model.
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Num label="Age" unit="yr" value={age} on={setAge} min={30} max={79} ph="30–79" />
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-faint uppercase tracking-wider">Sex</label>
                <div className="flex gap-1">
                  {["male","female"].map(s => (
                    <button key={s} onClick={() => setSex(s)}
                      className={`flex-1 py-3 rounded-lg text-[14px] font-bold transition-all duration-200 cursor-pointer active:scale-[0.97] min-h-[48px] text-center ${
                        sex===s ? "bg-accent-soft text-accent border border-edge" : "bg-surface text-muted border border-edge hover:text-ink"
                      }`}>{s==="male"?"Male":"Female"}</button>
                  ))}
                </div>
              </div>
              <SINum si={si} factor={CHOL_F} phSI="3.4–8.3" label="Total Cholesterol" unit="mg/dL" value={totalC} on={setTotalC} min={130} max={320} ph="130–320" />
              <SINum si={si} factor={CHOL_F} phSI="0.5–2.6" label="HDL-C" unit="mg/dL" value={hdlC} on={setHdlC} min={20} max={100} ph="20–100" />
              <SINum si={si} factor={CHOL_F} phSI="Baseline" label="LDL-C" unit="mg/dL" value={ldlC} on={setLdlC} min={0} max={400} ph="Baseline" />
              <Num label="Systolic BP" unit="mmHg" value={sbp} on={setSbp} min={90} max={200} ph="90–200" />
              <Num label="eGFR" unit="mL/min" value={egfr} on={setEgfr} min={15} max={140} ph="15–140" />
              <Num label="BMI" unit="kg/m²" value={bmi} on={setBmi} min={18.5} max={60} step={0.1} ph="18.5–60" />
            </div>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <SINum si={si} factor={TG_F} phSI="Optional" label="Triglycerides" unit="mg/dL" value={tg} on={setTg} min={0} max={2000} ph="Optional" />
              </div>
              <button onClick={() => setBmiCalc(p => !p)}
                className="px-3 py-3 rounded-lg text-[11px] font-bold text-accent bg-accent-soft border border-edge hover:opacity-80 active:scale-95 transition-all cursor-pointer whitespace-nowrap h-[50px]">
                BMI calc
              </button>
            </div>
            {bmiCalc && (
              <div className="panel-in mt-2 p-3 bg-accent-soft border border-edge rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[12px] font-bold text-accent">BMI calculator</div>
                  <button onClick={() => setBmiCalc(false)}
                    className="text-[12px] text-faint hover:text-ink cursor-pointer font-bold">✕</button>
                </div>
                <div className="flex gap-1 mb-2">
                  {["imperial","metric"].map(u => (
                    <button key={u} onClick={() => { setBmiUnit(u); setBmiWt(""); setBmiHt(""); setBmiHtIn(""); }}
                      className={`flex-1 py-1.5 rounded text-[11px] font-bold text-center cursor-pointer transition-colors ${
                        bmiUnit===u ? "bg-accent-soft text-accent border border-edge" : "bg-surface text-muted border border-edge"
                      }`}>{u==="imperial"?"lb / ft-in":"kg / cm"}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-bold text-faint uppercase">Weight</label>
                    <input type="number" inputMode="decimal" value={bmiWt}
                      onChange={e => setBmiWt(e.target.value==="" ? "" : e.target.value)}
                      placeholder={bmiUnit==="imperial"?"lbs":"kg"}
                      className="px-2 py-2 text-[16px] border border-edge rounded bg-surface dark:text-ink outline-none input-glow" />
                  </div>
                  {bmiUnit==="imperial" ? (
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] font-bold text-faint uppercase">Height</label>
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
                      <label className="text-[10px] font-bold text-faint uppercase">Height</label>
                      <input type="number" inputMode="decimal" value={bmiHt}
                        onChange={e => setBmiHt(e.target.value==="" ? "" : e.target.value)}
                        placeholder="cm" className="px-2 py-2 text-[16px] border border-edge rounded bg-surface dark:text-ink outline-none input-glow" />
                    </div>
                  )}
                </div>
                {calcBmiValue !== null && (
                  <div className="mt-2 flex items-center justify-between bg-surface rounded-lg p-2 border border-edge">
                    <div>
                      <span className="text-[11px] text-muted">Calculated BMI: </span>
                      <span className="text-[14px] font-bold text-accent font-mono">{calcBmiValue}</span>
                      <span className="text-[11px] text-faint"> kg/m²</span>
                    </div>
                    <button onClick={acceptBmi}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-paper bg-accent hover:opacity-90 active:scale-95 transition-all cursor-pointer">
                      Accept
                    </button>
                  </div>
                )}
              </div>
            )}
            {nonHdlC !== null && (
              <div className="flex items-center justify-between mt-2 px-3 py-2 rounded-lg border border-dashed border-edge bg-paper">
                <span className="text-[11px] font-bold text-faint uppercase tracking-wider">Non-HDL-C <span className="normal-case font-medium">(calculated)</span></span>
                <span className="text-[14px] font-bold text-ink font-mono">{si ? siChol(nonHdlC) : nonHdlC} <span className="text-[11px] font-normal text-faint font-sans">{si ? "mmol/L" : "mg/dL"}</span></span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:flex sm:flex-wrap sm:gap-x-8 mt-3">
              <Toggle value={onStatin} on={setOnStatin} label="Statin" />
              <Toggle value={smoking} on={setSmoking} label="Current smoking" sub="Within 30 days" />
              <Toggle value={bpTx} on={setBpTx} label="BP med(s)" />
              <Toggle value={dm} on={setDm} label="Diabetes" sub="Clinical dx" />
            </div>

          </Card>

          {risk10 !== null && rc10 && (
            <div className="lg:hidden">
              <RiskRail risk10={risk10} rc10={rc10} risk30={risk30} rc30={rc30} discord={discord}
                optRisk30={optRisk30} drivers={drivers} dark={darkMode} variant="inline" note={summaryNote} />
            </div>
          )}

          {/* Risk enhancers */}
          <Card title="Risk enhancers" accent="amber">
            <p className="text-[11px] text-muted mb-2">Apply at borderline or intermediate risk. Each favors statin initiation.</p>
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
                      <div className="text-[11px] text-muted">{e.d}{e.id === "metabolic" && metSynCount > 0 ? ` (${metSynCount}/5 met)` : ""}</div>
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
                          }`}>{metSyn[m.id] && <span className="text-paper text-[10px] font-bold">✓</span>}</div>
                          <div><div className="text-[12px] font-bold text-ink leading-tight">{m.l}</div>
                          <div className="text-[10px] text-faint">{m.d}</div></div>
                        </button>
                      ))}
                      {metSynCount >= 3 && (
                        <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-paper rounded-lg px-2.5 py-1.5 border border-line">
                          {metSynCount}/5 criteria met: metabolic syndrome
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {enhCount > 0 && (
              <div className="mt-2 text-[14px] font-bold text-amber-700 dark:text-amber-400 bg-paper rounded-lg px-3 py-2 border border-line">
                {enhCount} enhancer{enhCount>1?"s":""}: favors statin at borderline or intermediate risk
              </div>
            )}
          </Card>

          {/* CAC */}
          <Card title="CAC reclassification (optional)" accent="emerald">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[11px] text-muted">Men ≥40, women ≥45, when the statin decision is uncertain</p>
              <button onClick={() => setCacInfo(p => !p)}
                className="w-6 h-6 rounded-full border border-edge text-faint text-[12px] font-bold flex items-center justify-center shrink-0 ml-2 cursor-pointer hover:border-accent hover:text-accent active:scale-95 transition-colors">?</button>
            </div>
            {cacInfo && (
              <div className="panel-in mb-3 p-3 bg-surface border border-line rounded-lg text-[11px] text-ink space-y-2">
                <div className="font-bold text-ink">How CAC reclassifies risk</div>
                <div>CAC (Agatston units) overrides the PREVENT estimate when obtained:</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">CAC = 0</span><span>Statin may be deferred even at intermediate risk. Reassess in 5–10 years.</span>
                  <span className="font-bold text-accent">CAC 1–99</span><span>Moderate-intensity statin. If ≥75th percentile for age and sex, upgrade to high intensity.</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">CAC ≥100</span><span>High-intensity statin, LDL-C goal &lt;70.</span>
                  <span className="font-bold text-red-700 dark:text-red-400">CAC ≥1000</span><span>Treat as very high risk: LDL-C goal &lt;55, full escalation.</span>
                </div>
                <div className="text-muted border-t border-line pt-2">Percentile matters only for scores 1–99. It indexes plaque burden to age and sex: CAC 50 at age 45 carries different weight than CAC 50 at 75.</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Num label="CAC Score" unit="AU" value={cac} on={setCac} min={0} max={10000} ph="Agatston" />
              <Num label="CAC %ile" unit="%" value={cacPct} on={setCacPct} min={0} max={100} ph="Percentile" />
            </div>
          </Card>
        </>)}

        {/* SECONDARY */}
        {tab === "secondary" && (
          <Card title="Clinical ASCVD risk level" accent={vhrCount > 0 ? "red" : "orange"}>
            <p className="text-[11px] text-muted mb-3">All ASCVD: high-intensity statin. Classification sets the LDL-C target.</p>
            <Num label="Current LDL-C" unit="mg/dL" value={ldlC} on={setLdlC} min={0} max={400} ph="Current" />
            <div className="mt-3 space-y-2">
              {[
                { id:"very_high", l:"Very high risk", d:vhrCount > 0 ? `${vhrCount} criteria met` : "Select criteria below to classify", light:"#b91c1c", dark:"#e2635e" },
                { id:"not_very_high", l:"Not very high risk", d:"Stable ASCVD without features below", light:"#15181c", dark:"#edeef0" },
              ].map(o => {
                const sel = o.id === "very_high" ? vhrCount > 0 : vhrCount === 0;
                const c = darkMode ? o.dark : o.light;
                return (
                <button key={o.id} onClick={() => setAscvdLevel(o.id)}
                  className="w-full text-left p-3 rounded-lg border transition-colors cursor-pointer active:opacity-70 min-h-[56px]"
                  style={sel ? { borderColor: c, backgroundColor: c + "12" } : { borderColor: "var(--line)" }}>
                  <div className="text-[14px] font-bold" style={{ color: sel ? c : "var(--ink)" }}>{o.l}</div>
                  <div className="text-[11px] text-muted mt-0.5">{o.d}</div>
                </button>
                );
              })}
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">Very High-Risk Criteria</div>
              {VHR_CRITERIA.map(e => (
                <button key={e.id} onClick={() => {
                  toggleVhr(e.id);
                }}
                  className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer active:opacity-70 min-h-[44px] ${
                    vhr[e.id] ? "bg-accent-soft border-edge" : "bg-surface border-line"
                  }`}>
                  <div className={`mt-0.5 w-5 h-5 rounded border shrink-0 flex items-center justify-center ${
                    vhr[e.id] ? "bg-accent border-accent" : "border-edge"
                  }`}>{vhr[e.id] && <span className="text-paper text-[13px] font-bold">✓</span>}</div>
                  <div><div className="text-[14px] font-bold text-ink leading-tight">{e.l}</div>
                  <div className="text-[11px] text-muted">{e.d}</div></div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* DIABETES */}
        {tab === "diabetes" && (
          <Card title="Diabetes pathway" accent="violet">
            <div className="bg-accent-soft border border-edge rounded-lg p-3 mb-3">
              <div className="text-[14px] font-bold text-accent">Universal LLT, age 40–75</div>
              <div className="text-[11px] text-accent mt-1">DM (type 1 or 2), CKD 3–4, or HIV → lipid-lowering therapy regardless of LDL-C level.</div>
            </div>
            <Num label="Current LDL-C" unit="mg/dL" value={ldlC} on={setLdlC} min={0} max={400} ph="Current" />
            <div className="mt-3 space-y-1.5">
              <div className="text-[11px] font-bold text-muted uppercase tracking-wider mb-1">DM-Specific Risk Enhancers</div>
              {DM_ENHANCERS.map(e => (
                <button key={e.id} onClick={() => toggleDmEnh(e.id)}
                  className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer active:opacity-70 min-h-[44px] ${
                    dmEnhs[e.id] ? "bg-accent-soft border-edge" : "bg-surface border-line"
                  }`}>
                  <div className={`mt-0.5 w-5 h-5 rounded border shrink-0 flex items-center justify-center ${
                    dmEnhs[e.id] ? "bg-accent border-accent" : "border-edge"
                  }`}>{dmEnhs[e.id] && <span className="text-paper text-[13px] font-bold">✓</span>}</div>
                  <div><div className="text-[14px] font-bold text-ink leading-tight">{e.l}</div>
                  <div className="text-[11px] text-muted">{e.d}</div></div>
                </button>
              ))}
            </div>
            {dmEnhCount > 0 && (
              <div className="mt-2 text-[14px] font-bold text-accent bg-accent-soft rounded-lg px-3 py-2 border border-edge">
                {dmEnhCount} DM enhancer{dmEnhCount>1?"s":""}: supports high-intensity statin
              </div>
            )}
          </Card>
        )}

        {/* SEVERE */}
        {tab === "severe" && (
          <Card title="Severe hypercholesterolemia" accent="red">
            <div className="bg-surface border border-line rounded-lg p-3 mb-3">
              <div className="text-[14px] font-bold text-red-800 dark:text-red-300">LDL-C ≥190: high-intensity statin</div>
              <div className="text-[11px] text-red-600 dark:text-red-400 mt-1">No risk calculation needed. Evaluate for FH (Dutch Lipid Clinic criteria). Cascade screening. Lipid specialist referral.</div>
            </div>
            <Num label="Current LDL-C" unit="mg/dL" value={ldlC} on={setLdlC} min={0} max={600} ph="Current" />
          </Card>
        )}

        {/* BIOMARKERS */}
        <Card title="Advanced biomarkers" accent="violet">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] text-muted">Lp(a): once in adulthood. ApoB: once LDL-C or non-HDL-C is near goal.</p>
            <button onClick={() => setBioInfo(p => !p)}
              className="w-6 h-6 rounded-full border border-edge text-faint text-[12px] font-bold flex items-center justify-center shrink-0 ml-2 cursor-pointer hover:border-accent hover:text-accent active:scale-95 transition-colors">?</button>
          </div>
          {bioInfo && (
            <div className="panel-in mb-3 p-3 bg-surface border border-line rounded-lg text-[11px] text-ink space-y-3">
              <div>
                <div className="font-bold text-ink mb-1">Lp(a)</div>
                <div>Genetically determined, largely fixed from birth, not statin-responsive. Causal and continuous for ASCVD and aortic stenosis: risk rises with level and has no true threshold (EAS consensus, Eur Heart J 2022). Elevated Lp(a) carries risk even at low LDL-C.</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 mt-1.5">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">&lt;125 nmol/L</span><span>Not a risk enhancer</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">≥125 nmol/L</span><span>~1.4× ASCVD risk. Counts as a risk enhancer</span>
                  <span className="font-bold text-red-700 dark:text-red-400">≥250 nmol/L</span><span>~2× ASCVD risk. Intensify LDL-C lowering</span>
                </div>
                <div className="text-muted mt-1.5">Screen at least once in adulthood, with cascade testing in FH or premature-ASCVD families. mg/dL ≈ nmol/L ÷ 2.5 (elevated ≥50 mg/dL). No approved Lp(a)-specific therapy: intensify LDL-C lowering and global risk factor control. Apheresis is an option for very high Lp(a) with progressive ASCVD.</div>
              </div>
              <div className="border-t border-edge pt-2">
                <div className="font-bold text-ink mb-1">ApoB</div>
                <div>One molecule per atherogenic particle (LDL, VLDL, IDL, Lp(a)), so it counts particle number directly. Most useful when TG is elevated or LDL-C and non-HDL-C are discordant.</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 mt-1.5">
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">&lt;85 mg/dL</span><span>At goal for all risk categories</span>
                  <span className="font-bold text-accent">85–99</span><span>At goal for intermediate risk, above goal for very high risk</span>
                  <span className="font-bold text-amber-700 dark:text-amber-400">100–129</span><span>Above goal for most. Consider intensification</span>
                  <span className="font-bold text-red-700 dark:text-red-400">≥130 mg/dL</span><span>Markedly elevated atherogenic burden</span>
                </div>
                <div className="text-muted mt-1.5">Check once LDL-C or non-HDL-C is near goal to confirm particle burden is controlled, particularly with TG ≥150 or DM. The ≥130 risk-enhancer threshold corresponds to LDL-C ≥160 (2018 ACC/AHA, carried forward). Standardized immunoassays make ApoB more reliable than calculated LDL-C at low levels.</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <Num label="Lp(a)" unit="nmol/L" value={lpa} on={setLpa} min={0} max={500} preserveCase />
            <Num label="ApoB" unit="mg/dL" value={apoB} on={setApoB} min={0} max={300} preserveCase />
          </div>
          {lpaNote && (
            <div className="flex items-start gap-2 p-2 rounded-lg border border-line bg-paper mb-1.5"><Badge color={lpaNote.c}>Lp(a) {lpaNote.lv}</Badge><span className="text-[11px] text-ink">{lpaNote.n}</span></div>
          )}
          {apoBNote && (
            <div className="flex items-start gap-2 p-2 rounded-lg border border-line bg-paper"><Badge color={apoBNote.c}>ApoB {apoBNote.lv}</Badge><span className="text-[11px] text-ink">{apoBNote.n}</span></div>
          )}
        </Card>

        {/* ── RECOMMENDATION ── */}
        {rec && ((tab==="primary" && risk10!==null) || tab!=="primary") && (<>
          <div className="rounded-xl border border-line bg-surface p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-faint mb-1">Recommendation</div>
            <div className={`text-[14px] font-bold leading-snug ${recTxt[rec.clr]}`}>{rec.txt}</div>
            {(rec.int === "high" || rec.int === "moderate") && (
              <div className="mt-2 pt-2 border-t border-line text-[11px] text-body">
                {rec.int === "high" && (
                  <div className="space-y-0.5">
                    <div className="font-semibold text-muted">High-intensity statins</div>
                    <div className="pl-2 border-l-2 border-edge space-y-0.5">
                      <div>Atorvastatin 40–80 mg</div>
                      <div>Rosuvastatin 20–40 mg</div>
                    </div>
                  </div>
                )}
                {rec.int === "moderate" && (
                  <div className="space-y-0.5">
                    <div className="font-semibold text-muted">Moderate-intensity statins</div>
                    <div className="pl-2 border-l-2 border-edge space-y-0.5">
                      <div>Atorvastatin 10–20 mg</div>
                      <div>Rosuvastatin 5–10 mg</div>
                      <div>Simvastatin 20–40 mg</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {rec.g && ldlC !== "" && ldlC !== null && (
            <div className="rounded-xl p-3 flex items-center gap-3 border border-line bg-surface">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[15px] font-bold shrink-0 ${
                Number(ldlC) <= rec.g.ldl
                  ? "bg-emerald-500 text-white"
                  : "bg-red-500 text-white"
              }`}>
                {Number(ldlC) <= rec.g.ldl ? "✓" : "✗"}
              </div>
              <div>
                <div className={`text-[14px] font-bold ${
                  Number(ldlC) <= rec.g.ldl ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"
                }`}>
                  {Number(ldlC) <= rec.g.ldl
                    ? "At goal"
                    : `Not at goal. LDL-C is ${si ? siChol(Number(ldlC) - rec.g.ldl) + " mmol/L" : (Number(ldlC) - rec.g.ldl) + " mg/dL"} above target.`}
                </div>
                <div className="text-[11px] text-muted mt-0.5">
                  Current LDL-C {si ? siChol(ldlC) : ldlC} · goal &lt;{si ? siChol(rec.g.ldl) : rec.g.ldl} {si ? "mmol/L" : "mg/dL"}
                </div>
              </div>
            </div>
          )}

          {rec.g && <Card title="Treatment goals" accent={rec.clr==="red"?"red":rec.clr==="orange"?"orange":rec.clr==="amber"?"amber":"blue"}>
            <Goals ldl={rec.g.ldl} nonHdl={rec.g.nh} pct={rec.g.p} currentLdl={ldlC||null} si={si} />
          </Card>}

          <Card title="Treatment ladder" accent="blue">
            <div className="space-y-0">
              {[
                { s:5, l:"Consider inclisiran", show:rec.esc&&rec.g?.ldl<=55 },
                { s:4, l:"Bempedoic acid or PCSK9i", show:rec.esc },
                { s:3, l:"Add ezetimibe", show:rec.esc },
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
                          className="w-5 h-5 rounded-full border border-edge text-faint text-[10px] font-bold flex items-center justify-center shrink-0 cursor-pointer hover:border-accent hover:text-accent active:scale-95 transition-colors">?</button>
                      )}
                    </div>
                    <div className="text-[11px] text-muted mt-0.5">
                      {s.s === 1 && (
                        <div>Diet, exercise, weight, smoking cessation, sleep</div>
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
                      </>)}
                      {s.s === 3 && (
                        <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-line">
                          <div>Ezetimibe 10 mg daily <span className="text-faint">(additional 15–20% LDL-C reduction)</span></div>
                          <div className="text-faint">Avoid with active liver disease when combined with a statin. Not recommended in moderate to severe hepatic impairment.</div>
                        </div>
                      )}
                      {s.s === 4 && (
                        <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-line">
                          <div>Bempedoic acid 180 mg daily <span className="text-faint">(~18% LDL-C reduction)</span></div>
                          <div>Evolocumab 140 mg q2wk or 420 mg monthly <span className="text-faint">(~60% LDL-C reduction)</span></div>
                          <div>Alirocumab 75–150 mg q2wk <span className="text-faint">(~50–60% LDL-C reduction)</span></div>
                          <div className="text-faint">Bempedoic acid: tendon-rupture and gout warnings. Cap simvastatin at 20 mg, pravastatin at 40 mg. PCSK9i: prior serious hypersensitivity.</div>
                        </div>
                      )}
                      {s.s === 5 && (
                        <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-line">
                          <div>Inclisiran 284 mg SC <span className="text-faint">(~50% LDL-C reduction)</span></div>
                          <div className="text-faint">Day 0, Day 90, then q6 months · siRNA for residual LDL elevation</div>
                          <div className="text-faint">Avoid with prior serious hypersensitivity. Limited data in severe hepatic or renal impairment.</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {tg!==""&&Number(tg)>=150 && (
              <div className="mt-2 p-3 bg-surface border border-line rounded-lg">
                <div className="text-[14px] font-bold text-amber-800 dark:text-amber-300">Hypertriglyceridemia</div>
                <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                  TG {tg}: {Number(tg)>=500?"Severe: prioritize TG lowering (pancreatitis risk). Fibrate ± icosapent ethyl. If ≥1000, consider apoC-III inhibitor. Fenofibrate CI: eGFR <30, active liver or gallbladder disease. Never gemfibrozil with a statin.":"Statins first-line for ASCVD risk. If TG persistent, add icosapent ethyl (REDUCE-IT: AF and bleeding signals) or fenofibrate (CI: eGFR <30, active liver or gallbladder disease)."}
                </div>
              </div>
            )}
          </Card>
        </>)}

        {/* MONITORING */}
        <Card title="Monitoring" accent="emerald">
          <div className="space-y-2.5 text-[11px]">

            <div className="border-t border-line pt-3 first:border-t-0 first:pt-0">
              <div className="font-bold text-ink mb-1.5">After starting LLT</div>
              <div className="space-y-1 text-body">
                <div className="flex gap-2"><span className="text-ink font-semibold shrink-0">4–12 wk</span><span>Fasting <b>lipid panel</b></span></div>
                <div className="flex gap-2"><span className="text-ink font-semibold shrink-0">q3–12 mo</span><span>Repeat until at goal</span></div>
                <div className="flex gap-2"><span className="text-ink font-semibold shrink-0">Annually</span><span>Once at goal</span></div>
              </div>
            </div>

            <div className="border-t border-line pt-3 first:border-t-0 first:pt-0">
              <div className="font-bold text-ink mb-1.5">Safety</div>
              <div className="space-y-0.5 text-body">
                <div>• <b>Hepatic panel</b> at baseline</div>
                <div>• <b>CK</b> only if symptomatic</div>
                <div className="flex items-center gap-1.5">
                  <span>• Monitor for new-onset DM with high-intensity <b>statin</b></span>
                  <button onClick={() => setStatinInfoMon(p => !p)}
                    className="w-5 h-5 rounded-full border border-edge text-faint text-[10px] font-bold flex items-center justify-center shrink-0 cursor-pointer hover:border-accent hover:text-accent active:scale-95 transition-colors">?</button>
                </div>
              </div>
              {statinInfoMon && <div className="mt-2"><StatinInfo onClose={() => setStatinInfoMon(false)} /></div>}
            </div>

            <div className="border-t border-line pt-3 first:border-t-0 first:pt-0">
              <div className="font-bold text-ink mb-1.5">Screening</div>
              <div className="space-y-1 text-body">
                <div className="flex gap-2"><span className="text-ink font-semibold shrink-0">Ages 9–11</span><span>Initial <b>lipid panel</b></span></div>
                <div className="flex gap-2"><span className="text-ink font-semibold shrink-0">Ages 19–21</span><span>Repeat <b>lipid panel</b></span></div>
                <div className="flex gap-2"><span className="text-ink font-semibold shrink-0">Then ≥q5y</span><span>Periodic rescreening</span></div>
                <div className="flex gap-2"><span className="text-ink font-semibold shrink-0">Lp(a)</span><span>At least once as adult</span></div>
              </div>
            </div>

            <div className="border-t border-line pt-3 first:border-t-0 first:pt-0">
              <div className="font-bold text-ink mb-1.5">Referral to lipid specialist</div>
              <div className="space-y-0.5 text-body">
                <div>• Suspected familial hypercholesterolemia</div>
                <div>• Refractory LDL despite max therapy</div>
                <div>• TG ≥500 despite lifestyle modification</div>
                <div>• Complex drug interactions</div>
                <div>• Pregnancy planning on LLT</div>
              </div>
            </div>

          </div>
        </Card>

        {/* Footer */}
        <div className="border-t border-line mt-6" />
        <div className="text-center pt-3 space-y-1">
          <div className="text-[11px] text-faint">PREVENT: Khan SS et al. Circ 2024;149:430-449 · Guideline: Blumenthal RS et al. JACC/Circ 2026</div>
          <div className="text-[11px] text-faint">Clinical decision support only. Does not replace clinical judgment.</div>
          <a href="https://professional.heart.org/en/guidelines-and-statements/prevent-calculator"
            target="_blank" rel="noopener"
            className="inline-block text-[11px] text-accent underline mt-1">
            Cross-check with the AHA PREVENT calculator
          </a>
        </div>

      </div>

      {tab === "primary" && (
        <aside className="hidden lg:block lg:sticky lg:top-6">
          {risk10 !== null && rc10 ? (
            <RiskRail risk10={risk10} rc10={rc10} risk30={risk30} rc30={rc30} discord={discord}
              optRisk30={optRisk30} drivers={drivers} dark={darkMode} variant="rail" note={summaryNote} />
          ) : (
            <div className="lg:border-l lg:border-line lg:pl-10 pt-1">
              <div className="text-[11px] font-semibold text-muted uppercase tracking-[0.12em]">Risk estimates</div>
              <div className="mt-2 text-[13px] text-faint leading-relaxed">Computed here once age, sex, total cholesterol, HDL-C, systolic BP, eGFR, and BMI are entered.</div>
            </div>
          )}
        </aside>
      )}
      </div>
      </div>
      </div>
    </div>
  );
}
