import { useState, useMemo, useCallback } from "react";

// ══════════════════════════════════════════════════════════════════════════════
//  PREVENT-ASCVD 10-Year Base Model Coefficients
//  Source: Khan SS et al. Circulation 2024;149:430-449
//  Extracted from validated `preventr` R package v0.11.0 (sysdata.rda)
//  These are the logistic regression coefficients for the base model,
//  sex-specific, ASCVD outcome, 10-year horizon.
// ══════════════════════════════════════════════════════════════════════════════
const PREVENT = {
  female: {
    age: 0.7198830, nonHdlC: 0.1176967, hdlC: -0.1511850,
    sbpLt110: -0.0835358, sbpGte110: 0.3592852, dm: 0.8348585,
    smoking: 0.4831078, bmiLt30: 0.0, bmiGte30: 0.0,
    egfrLt60: 0.4864619, egfrGte60: 0.0397779, bpTx: 0.2265309,
    statin: -0.0592374, bpTxSbpGte110: -0.0395762, statinNonHdlC: 0.0844423,
    ageNonHdlC: -0.0567839, ageHdlC: 0.0325692, ageSbpGte110: -0.1035985,
    ageDm: -0.2417542, ageSmoking: -0.0791142, ageBmiGte30: 0.0,
    ageEgfrLt60: -0.1671492, constant: -3.8199750,
  },
  male: {
    age: 0.7099847, nonHdlC: 0.1658663, hdlC: -0.1144285,
    sbpLt110: -0.2837212, sbpGte110: 0.3239977, dm: 0.7189597,
    smoking: 0.3956973, bmiLt30: 0.0, bmiGte30: 0.0,
    egfrLt60: 0.3690075, egfrGte60: 0.0203619, bpTx: 0.2036522,
    statin: -0.0865581, bpTxSbpGte110: -0.0322916, statinNonHdlC: 0.1145630,
    ageNonHdlC: -0.0300005, ageHdlC: 0.0232747, ageSbpGte110: -0.0927024,
    ageDm: -0.2018525, ageSmoking: -0.0970527, ageBmiGte30: 0.0,
    ageEgfrLt60: -0.1217081, constant: -3.5006550,
  },
};

function calcPREVENT({ age, sex, sbp, bpTx, totalC, hdlC, statin, dm, smoking, egfr, bmi }) {
  if (!age || !sbp || !totalC || !hdlC || !egfr || !bmi) return null;
  const c = PREVENT[sex];
  const toMmol = (mg) => mg / 38.67;
  const a = (age - 55) / 10;
  const nh = toMmol(totalC - hdlC) - 3.5;
  const hd = (toMmol(hdlC) - 1.3) / 0.3;
  const sl = (Math.min(sbp, 110) - 110) / 20;
  const sh = (Math.max(sbp, 110) - 130) / 20;
  const d = dm ? 1 : 0, sm = smoking ? 1 : 0, bp = bpTx ? 1 : 0, st = statin ? 1 : 0;
  const bl = (Math.min(bmi, 30) - 25) / 5;
  const bh = (Math.max(bmi, 30) - 30) / 5;
  const el = (Math.min(egfr, 60) - 60) / -15;
  const eh = (Math.max(egfr, 60) - 90) / -15;
  const x =
    c.age*a + c.nonHdlC*nh + c.hdlC*hd + c.sbpLt110*sl + c.sbpGte110*sh +
    c.dm*d + c.smoking*sm + c.bmiLt30*bl + c.bmiGte30*bh +
    c.egfrLt60*el + c.egfrGte60*eh + c.bpTx*bp + c.statin*st +
    c.bpTxSbpGte110*(bp*sh) + c.statinNonHdlC*(st*nh) +
    c.ageNonHdlC*(a*nh) + c.ageHdlC*(a*hd) + c.ageSbpGte110*(a*sh) +
    c.ageDm*(a*d) + c.ageSmoking*(a*sm) + c.ageBmiGte30*(a*bh) +
    c.ageEgfrLt60*(a*el) + c.constant;
  return Math.round((Math.exp(x)/(1+Math.exp(x)))*1000)/10;
}

function riskCat(r) {
  if (r === null) return null;
  if (r < 3) return { label: "Low", color: "#16a34a", bg: "#f0fdf4", range: "<3%" };
  if (r < 5) return { label: "Borderline", color: "#ca8a04", bg: "#fefce8", range: "3–<5%" };
  if (r < 10) return { label: "Intermediate", color: "#ea580c", bg: "#fff7ed", range: "5–<10%" };
  return { label: "High", color: "#dc2626", bg: "#fef2f2", range: "≥10%" };
}

const VHR_CRITERIA = [
  { id:"acs", l:"Recent ACS", d:"MI or unstable angina within past 12 months" },
  { id:"multi", l:"Multiple ASCVD Events", d:"≥2 major events (MI, stroke, symptomatic PAD)" },
  { id:"pad", l:"Symptomatic PAD", d:"ABI (ankle-brachial index) ≤0.85 or prior revascularization/amputation" },
  { id:"dm_ascvd", l:"ASCVD + Diabetes", d:"DM with microvascular complications or ≥2 additional CVD risk factors" },
  { id:"ckd_ascvd", l:"ASCVD + CKD", d:"eGFR 15–59" },
  { id:"heFH", l:"ASCVD + Heterozygous FH", d:"Familial hypercholesterolemia" },
  { id:"persist", l:"Persistently Elevated LDL", d:"LDL ≥100 despite max dose statin + ezetimibe" },
];

const DM_ENHANCERS = [
  { id:"dur_t2", l:"Type 2 DM ≥10 Years", d:"Longer duration increases CVD risk" },
  { id:"dur_t1", l:"Type 1 DM ≥20 Years", d:"Longer duration increases CVD risk" },
  { id:"a1c", l:"A1c ≥8%", d:"Average glucose ≥183 mg/dL" },
  { id:"alb", l:"Albuminuria ≥30 mg/g", d:"Urine albumin-to-creatinine ratio (uACR)" },
  { id:"egfr_dm", l:"eGFR <60", d:"Stage 3+ CKD" },
  { id:"retino", l:"Retinopathy", d:"Diabetic retinopathy" },
  { id:"neuro", l:"Neuropathy", d:"Diabetic neuropathy" },
  { id:"abi_dm", l:"ABI (Ankle-Brachial Index) ≤0.9", d:"Peripheral arterial disease" },
];

const METSYN_CRITERIA = [
  { id:"ms_waist", l:"Elevated Waist Circumference", d:"Male ≥40 in (102 cm) · Female ≥35 in (88 cm)" },
  { id:"ms_tg", l:"Elevated Triglycerides", d:"≥150 mg/dL (or on Rx)" },
  { id:"ms_hdl", l:"Reduced HDL-C", d:"Male <40 mg/dL · Female <50 mg/dL (or on Rx)" },
  { id:"ms_bp", l:"Elevated Blood Pressure", d:"≥130/85 mmHg (or on antihypertensive)" },
  { id:"ms_gluc", l:"Elevated Fasting Glucose", d:"≥100 mg/dL (or on Rx)" },
];

const ENHANCERS = [
  { id:"fhx", l:"Family History of Premature ASCVD", d:"1st-degree male <55y or female <65y" },
  { id:"lpa", l:"Elevated Lp(a)", d:"≥125 nmol/L (≥50 mg/dL)" },
  { id:"tg", l:"Persistently Elevated Triglycerides", d:"≥175 mg/dL on repeat measurement" },
  { id:"hscrp", l:"Elevated hs-CRP", d:"≥2.0 mg/L" },
  { id:"ckd", l:"Chronic Kidney Disease", d:"eGFR 15–59 or ACR ≥30" },
  { id:"inflam", l:"Chronic Inflammatory Condition", d:"RA, Pso/PsA, SLE, HIV" },
  { id:"metabolic", l:"Metabolic Syndrome", d:"≥3 of 5 criteria" },
  { id:"women", l:"Preeclampsia / Premature Menopause", d:"Menopause before age 40" },
  { id:"sa", l:"South Asian Ancestry", d:"Indian, Pakistani, Bangladeshi, Nepali, Sri Lankan heritage" },
  { id:"apob", l:"Elevated ApoB", d:"≥130 mg/dL" },
  { id:"abi", l:"Abnormal ABI (Ankle-Brachial Index)", d:"≤0.9" },
];

// ── Statin Reference Panel (reusable) ────────────────────────────────────────

function StatinInfo({ onClose }) {
  const intensities = [
    { level:"High-Intensity", ldl:"≥50%", color:"red", drugs:[
      { name:"Rosuvastatin", dose:"20–40 mg", myopathy:1, notes:"Most potent per mg. Renally cleared — dose-adjust if eGFR <30." },
      { name:"Atorvastatin", dose:"40–80 mg", myopathy:2, notes:"Long half-life — can take any time of day. Most clinical trial data." },
    ]},
    { level:"Moderate-Intensity", ldl:"30–49%", color:"amber", drugs:[
      { name:"Rosuvastatin", dose:"5–10 mg", myopathy:1, notes:null },
      { name:"Atorvastatin", dose:"10–20 mg", myopathy:2, notes:null },
      { name:"Simvastatin", dose:"20–40 mg", myopathy:4, notes:"Take in evening. 80 mg: FDA limits — avoid new starts (↑ myopathy)." },
      { name:"Pravastatin", dose:"40–80 mg", myopathy:1, notes:"Hydrophilic. Not CYP3A4 — fewest drug interactions." },
      { name:"Lovastatin", dose:"40–80 mg", myopathy:3, notes:"Take with evening meal. CYP3A4 substrate." },
      { name:"Fluvastatin XL", dose:"80 mg", myopathy:1, notes:"CYP2C9 — fewer CYP3A4 interactions." },
      { name:"Pitavastatin", dose:"1–4 mg", myopathy:1, notes:"Minimal CYP metabolism. May have lower new-onset DM risk." },
    ]},
    { level:"Low-Intensity", ldl:"<30%", color:"blue", drugs:[
      { name:"Simvastatin", dose:"10 mg", myopathy:2, notes:null },
      { name:"Pravastatin", dose:"10–20 mg", myopathy:1, notes:null },
      { name:"Lovastatin", dose:"20 mg", myopathy:2, notes:null },
      { name:"Fluvastatin", dose:"20–40 mg", myopathy:1, notes:null },
      { name:"Pitavastatin", dose:"1 mg", myopathy:1, notes:null },
    ]},
  ];

  const myopathyScale = [
    { name:"Pitavastatin", risk:1 }, { name:"Pravastatin", risk:1 }, { name:"Fluvastatin", risk:1 },
    { name:"Rosuvastatin", risk:2 }, { name:"Atorvastatin", risk:2 },
    { name:"Lovastatin", risk:3 }, { name:"Simvastatin", risk:4 },
  ];

  const iClr = { red:"text-red-700", amber:"text-amber-700", blue:"text-blue-700" };
  const iBg = { red:"bg-red-50 border-red-200", amber:"bg-amber-50 border-amber-200", blue:"bg-blue-50 border-blue-200" };
  const dots = { 1:"bg-emerald-400", 2:"bg-yellow-400", 3:"bg-orange-400", 4:"bg-red-400" };

  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-700 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-bold text-slate-800 text-[12px]">Statin Reference</div>
        <button onClick={onClose} className="text-[12px] text-slate-400 hover:text-slate-600 cursor-pointer font-bold">✕</button>
      </div>

      {intensities.map(tier => (
        <div key={tier.level} className={`rounded-lg border p-2.5 ${iBg[tier.color]}`}>
          <div className={`font-bold ${iClr[tier.color]} mb-1`}>{tier.level} <span className="font-normal text-slate-400">({tier.ldl} LDL-C reduction)</span></div>
          <div className="space-y-1">
            {tier.drugs.map(d => (
              <div key={d.name+d.dose} className="bg-white/70 rounded p-1.5 border border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">{d.name} <span className="font-normal text-slate-500">{d.dose}</span></span>
                  <div className="flex gap-0.5" title="Myopathy risk">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i <= d.myopathy ? dots[d.myopathy] : "bg-slate-200"}`} />
                    ))}
                  </div>
                </div>
                {d.notes && <div className="text-[10px] text-slate-500 mt-0.5">{d.notes}</div>}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="rounded-lg border border-slate-200 p-2.5 bg-white">
        <div className="font-bold text-slate-700 mb-1.5">Myopathy Risk Spectrum</div>
        <div className="flex items-end gap-1">
          {myopathyScale.map(s => (
            <div key={s.name} className="flex-1 text-center">
              <div className={`mx-auto rounded-sm ${dots[s.risk]}`} style={{height: s.risk * 8 + 4, width:"100%", maxWidth:28}} />
              <div className="text-[9px] text-slate-500 mt-1 leading-tight">{s.name.slice(0,4)}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1 text-[9px] text-slate-400">
          <span>← Lower risk</span><span>Higher risk →</span>
        </div>
      </div>

      <div className="text-[10px] text-slate-500 space-y-0.5 border-t border-slate-200 pt-2">
        <div><b>Evening dosing:</b> Simvastatin, Lovastatin (short half-life). Atorvastatin and Rosuvastatin can be taken any time.</div>
        <div><b>Drug interactions:</b> CYP3A4 statins (Atorva, Simva, Lova) interact with azole antifungals, macrolides, protease inhibitors, grapefruit. Pravastatin and Pitavastatin have the fewest interactions.</div>
        <div><b>New-onset DM:</b> Class effect, higher with high-intensity. Pitavastatin may carry lower risk. CV benefit outweighs DM risk.</div>
        <div className="flex gap-1 mt-1">
          <span>Myopathy risk dots:</span>
          <span className="inline-flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Lowest</span>
          <span className="inline-flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400 inline-block" /> Low</span>
          <span className="inline-flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" /> Mod</span>
          <span className="inline-flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" /> Higher</span>
        </div>
      </div>
    </div>
  );
}

// ── UI Components (touch-optimized) ─────────────────────────────────────────

function Toggle({ value, on, label, sub }) {
  return (
    <button onClick={() => on(!value)} type="button"
      className="flex items-center gap-2.5 py-2 active:opacity-70 cursor-pointer min-h-[44px]">
      <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${value ? "bg-blue-600" : "bg-slate-300"}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white toggle-knob transition-transform duration-200 ${value ? "translate-x-[22px]" : "translate-x-0.5"}`}/>
      </div>
      <div className="leading-tight">
        <span className="text-[14px] text-slate-700">{label}</span>
        {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
      </div>
    </button>
  );
}

function Num({ label, unit, value, on, min, max, step=1, ph, preserveCase }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={`text-[11px] font-bold text-slate-400 tracking-wider ${preserveCase ? "" : "uppercase"}`}>{label}</label>
      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden input-glow transition-shadow duration-200 bg-white">
        <input type="number" inputMode="decimal" value={value}
          onChange={e => on(e.target.value==="" ? "" : Number(e.target.value))}
          min={min} max={max} step={step} placeholder={ph}
          className="flex-1 px-3 py-3 text-[16px] text-slate-800 outline-none bg-transparent min-w-0" />
        {unit && <span className="pr-3 text-[13px] text-slate-400 whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  );
}

function Card({ title, accent="blue", children }) {
  const bdr = { blue:"border-l-blue-600", amber:"border-l-amber-500", red:"border-l-red-500",
    emerald:"border-l-emerald-600", violet:"border-l-violet-600" };
  return (
    <div className={`bg-white rounded-xl border border-slate-200/80 border-l-4 ${bdr[accent]} card-shadow`}>
      {title && <div className="px-4 pt-4 pb-1"><h3 className="text-[13px] font-black text-slate-800 uppercase tracking-wide">{title}</h3></div>}
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}

function Badge({ children, color="blue" }) {
  const s = { blue:"bg-blue-50 text-blue-700 border-blue-200", red:"bg-red-50 text-red-700 border-red-200",
    amber:"bg-amber-50 text-amber-700 border-amber-200", emerald:"bg-emerald-50 text-emerald-700 border-emerald-200",
    violet:"bg-violet-50 text-violet-700 border-violet-200", slate:"bg-slate-100 text-slate-600 border-slate-200" };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${s[color]}`}>{children}</span>;
}

function Goals({ ldl, nonHdl, pct, currentLdl }) {
  const needed = currentLdl ? Math.round(((currentLdl-ldl)/currentLdl)*100) : null;
  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
        <div className="text-2xl font-black text-blue-700 font-mono tabular-nums" style={{fontFeatureSettings:'"zero" 0'}}>&lt;{ldl}</div>
        <div className="text-[11px] text-blue-500 font-bold mt-0.5">LDL-C</div>
      </div>
      <div className="bg-violet-50 rounded-lg p-3 text-center border border-violet-100">
        <div className="text-2xl font-black text-violet-700 font-mono tabular-nums" style={{fontFeatureSettings:'"zero" 0'}}>&lt;{nonHdl}</div>
        <div className="text-[11px] text-violet-500 font-bold mt-0.5">Non-HDL</div>
      </div>
      <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
        <div className="text-2xl font-black text-slate-700 font-mono tabular-nums" style={{fontFeatureSettings:'"zero" 0'}}>≥{pct}%</div>
        <div className="text-[11px] text-slate-500 font-bold mt-0.5">% Reduction</div>
        {needed > 0 && <div className="text-[11px] text-amber-600 mt-0.5">{needed}% needed</div>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════════════════════

export default function App() {
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
    setCacInfo(false); setBioInfo(false); setBmiCalc(false);
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

  const risk = useMemo(() => {
    if (tab !== "primary") return null;
    return calcPREVENT({ age, sex, sbp, bpTx, totalC, hdlC, statin:onStatin, dm, smoking, egfr, bmi });
  }, [tab, age, sex, sbp, bpTx, totalC, hdlC, onStatin, dm, smoking, egfr, bmi]);

  const rc = useMemo(() => riskCat(risk), [risk]);

  const nonHdlC = useMemo(() => {
    if (totalC === "" || hdlC === "") return null;
    return Number(totalC) - Number(hdlC);
  }, [totalC, hdlC]);

  // ── Recommendation engine ──
  const rec = useMemo(() => {
    if (tab === "secondary") {
      return vhrCount > 0
        ? { g:{ldl:55,nh:85,p:50}, int:"high", esc:true, txt:"Very high-risk ASCVD — high-intensity statin + add-on therapy to LDL <55 mg/dL", clr:"red" }
        : { g:{ldl:70,nh:100,p:50}, int:"high", esc:true, txt:"Clinical ASCVD (not very high risk) — high-intensity statin to LDL <70 mg/dL", clr:"amber" };
    }
    if (tab === "diabetes") {
      return { g:{ldl:70,nh:100,p:50}, int:"high", esc:true, txt:"Diabetes (age 40–75) — LLT recommended regardless of LDL; high-intensity statin if additional risk factors", clr:"violet" };
    }
    if (tab === "severe") {
      return { g:{ldl:100,nh:130,p:50}, int:"high", esc:true, txt:"LDL ≥190 — high-intensity statin; evaluate for familial hypercholesterolemia", clr:"red" };
    }
    if (risk === null) return null;
    // CAC override
    if (cac !== "") {
      const c = Number(cac), p = cacPct !== "" ? Number(cacPct) : null;
      if (c === 0) return { g:null, int:"none", esc:false, txt:"CAC = 0 — Statin may be deferred. Reassess in 5–10 y. Lifestyle optimization.", clr:"emerald" };
      if (c >= 1000) return { g:{ldl:55,nh:85,p:50}, int:"high", esc:true, txt:"CAC ≥1000 — Treat as very high risk. LDL goal <55.", clr:"red" };
      if (c >= 100 || (p !== null && p >= 75)) return { g:{ldl:70,nh:100,p:50}, int:"high", esc:true, txt:"CAC ≥100 or ≥75th %ile — High-intensity statin to LDL <70.", clr:"amber" };
      if (c >= 1) return { g:{ldl:100,nh:130,p:30}, int:"moderate", esc:false, txt:"CAC 1–99 (<75th %ile) — Moderate-intensity statin to LDL <100.", clr:"blue" };
    }
    if (risk >= 10) return { g:{ldl:70,nh:100,p:50}, int:"high", esc:true, txt:"High 10-year ASCVD risk (≥10%) — High-intensity statin to LDL <70.", clr:"red" };
    if (risk >= 5) return { g:{ldl:100,nh:130,p:30}, int:"moderate", esc:false, txt:"Intermediate risk (5–<10%) — Moderate-intensity statin to LDL <100 after shared decision-making.", clr:"amber" };
    if (risk >= 3 && enhCount > 0) return { g:{ldl:100,nh:130,p:30}, int:"moderate", esc:false, txt:`Borderline risk with ${enhCount} risk enhancer${enhCount>1?"s":""} — Consider moderate-intensity statin.`, clr:"amber" };
    if (risk >= 3) return { g:{ldl:100,nh:130,p:30}, int:"lifestyle", esc:false, txt:"Borderline risk (3–<5%) — Lifestyle optimization; consider statin if risk enhancers present.", clr:"blue" };
    return { g:null, int:"none", esc:false, txt:"Low risk (<3%) — Lifestyle optimization. Reassess periodically.", clr:"emerald" };
  }, [tab, risk, enhCount, cac, cacPct, vhrCount]);

  // Biomarker interpretation
  const lpaNote = useMemo(() => {
    if (lpa === "") return null;
    const v = Number(lpa);
    if (v >= 250) return { lv:"Very High", c:"red", n:"≥250 nmol/L — ~2× ASCVD risk. Intensify LDL-C lowering aggressively." };
    if (v >= 125) return { lv:"Elevated", c:"amber", n:"≥125 nmol/L — ~1.4× risk. Risk enhancer — intensify LDL-C lowering." };
    return { lv:"Normal", c:"emerald", n:"<125 nmol/L — Not a risk enhancer." };
  }, [lpa]);

  const apoBNote = useMemo(() => {
    if (apoB === "") return null;
    const v = Number(apoB);
    if (v >= 130) return { lv:"Very High", c:"red", n:"≥130 — Significantly elevated atherogenic particles. Intensify therapy." };
    if (v >= 100) return { lv:"Elevated", c:"amber", n:"100–129 — Above goal for most. Consider intensification with elevated TG or DM." };
    if (v >= 85) return { lv:"Borderline", c:"blue", n:"85–99 — At goal for intermediate risk; above for very high (goal <85)." };
    return { lv:"Optimal", c:"emerald", n:"<85 — At or below goal for all risk categories." };
  }, [apoB]);

  const tabs = [
    { id:"primary", l:"Primary", em:"🛡" },
    { id:"secondary", l:"ASCVD", em:"🫀" },
    { id:"diabetes", l:"Diabetes", em:"🩸" },
    { id:"severe", l:"LDL ≥190", em:"⚠️" },
  ];

  const recBg = { red:"bg-red-50 border-red-300", amber:"bg-amber-50 border-amber-300",
    emerald:"bg-emerald-50 border-emerald-300", violet:"bg-violet-50 border-violet-300", blue:"bg-blue-50 border-blue-300" };
  const recTxt = { red:"text-red-800", amber:"text-amber-800", emerald:"text-emerald-800",
    violet:"text-violet-800", blue:"text-blue-800" };

  return (
    <div className="h-screen h-[100dvh] flex flex-col overflow-hidden bg-gradient-to-b from-slate-50 to-slate-100">

      {/* ── Header ── */}
      <div className="shrink-0">
        <div className="bg-slate-900 text-white pwa-header-pad">
          <div className="max-w-lg mx-auto px-4 py-4">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-lg font-black tracking-tight leading-tight">2026 ACC/AHA Lipid Management</h1>
                <p className="text-slate-400 text-[11px] mt-0.5 font-medium">Dyslipidemia Guideline CDS · PREVENT-ASCVD Embedded</p>
              </div>
              <button onClick={resetPatient}
                className="mt-0.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all duration-150 cursor-pointer whitespace-nowrap border border-slate-700">
                Reset
              </button>
            </div>
          </div>
        </div>
        <div className="header-accent" />
      </div>

      {/* ── Tabs ── */}
      <div className="glass-tabs border-b border-slate-200/60 shadow-sm shrink-0">
        <div className="max-w-lg mx-auto px-2 py-1.5">
          <div className="flex gap-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 px-1 py-2.5 text-[13px] font-bold text-center whitespace-nowrap rounded-lg transition-all duration-200 cursor-pointer min-h-[44px] active:scale-[0.97] ${
                  tab===t.id ? "bg-blue-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100/60"
                }`}>
                <span className="mr-0.5">{t.em}</span>{t.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto overscroll-none">
      <div key={tab} className="tab-content max-w-lg mx-auto px-4 py-5 space-y-4 pb-20">

        {/* PRIMARY */}
        {tab === "primary" && (<>
          <Card title="PREVENT-ASCVD Risk Calculator" accent="blue">
            <p className="text-[11px] text-slate-400 mb-3">Ages 30–79 · No known ASCVD · Replaces Pooled Cohort Equations</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Num label="Age" unit="yr" value={age} on={setAge} min={30} max={79} ph="30–79" />
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sex</label>
                <div className="flex gap-1">
                  {["male","female"].map(s => (
                    <button key={s} onClick={() => setSex(s)}
                      className={`flex-1 py-3 rounded-lg text-[14px] font-bold transition-all duration-200 cursor-pointer active:scale-[0.97] min-h-[48px] text-center ${
                        sex===s ? "bg-blue-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                      }`}>{s==="male"?"Male":"Female"}</button>
                  ))}
                </div>
              </div>
              <Num label="Total Cholesterol" unit="mg/dL" value={totalC} on={setTotalC} min={130} max={320} ph="130–320" />
              <Num label="HDL-C" unit="mg/dL" value={hdlC} on={setHdlC} min={20} max={100} ph="20–100" />
              <Num label="LDL-C" unit="mg/dL" value={ldlC} on={setLdlC} min={0} max={400} ph="Baseline" />
              <Num label="Systolic BP" unit="mmHg" value={sbp} on={setSbp} min={90} max={200} ph="90–200" />
              <Num label="eGFR" unit="mL/min" value={egfr} on={setEgfr} min={15} max={140} ph="15–140" />
              <Num label="BMI" unit="kg/m²" value={bmi} on={setBmi} min={18.5} max={60} step={0.1} ph="18.5–60" />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              {/* items-end aligns button to bottom of Num (which has label above input) */}
              <Num label="Triglycerides" unit="mg/dL" value={tg} on={setTg} min={0} max={2000} ph="Optional" />
              <button onClick={() => setBmiCalc(true)}
                className="px-3 py-3 rounded-lg text-[11px] font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 active:scale-95 transition-all cursor-pointer whitespace-nowrap min-h-[48px]">
                BMI Calc
              </button>
            </div>
            {bmiCalc && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[12px] font-bold text-blue-800">BMI Calculator</div>
                  <button onClick={() => setBmiCalc(false)}
                    className="text-[12px] text-slate-400 hover:text-slate-600 cursor-pointer font-bold">✕</button>
                </div>
                <div className="flex gap-1 mb-2">
                  {["imperial","metric"].map(u => (
                    <button key={u} onClick={() => { setBmiUnit(u); setBmiWt(""); setBmiHt(""); setBmiHtIn(""); }}
                      className={`flex-1 py-1.5 rounded text-[11px] font-bold text-center cursor-pointer transition-colors ${
                        bmiUnit===u ? "bg-blue-600 text-white" : "bg-white text-slate-500 border border-slate-200"
                      }`}>{u==="imperial"?"lb / ft-in":"kg / cm"}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Weight</label>
                    <input type="number" inputMode="decimal" value={bmiWt}
                      onChange={e => setBmiWt(e.target.value==="" ? "" : e.target.value)}
                      placeholder={bmiUnit==="imperial"?"lbs":"kg"}
                      className="px-2 py-2 text-[16px] border border-slate-200 rounded bg-white outline-none input-glow" />
                  </div>
                  {bmiUnit==="imperial" ? (
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Height</label>
                      <div className="flex gap-1">
                        <input type="number" inputMode="numeric" value={bmiHt}
                          onChange={e => setBmiHt(e.target.value==="" ? "" : e.target.value)}
                          placeholder="ft" className="flex-1 px-2 py-2 text-[16px] border border-slate-200 rounded bg-white outline-none input-glow min-w-0" />
                        <input type="number" inputMode="numeric" value={bmiHtIn}
                          onChange={e => setBmiHtIn(e.target.value==="" ? "" : e.target.value)}
                          placeholder="in" className="flex-1 px-2 py-2 text-[16px] border border-slate-200 rounded bg-white outline-none input-glow min-w-0" />
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Height</label>
                      <input type="number" inputMode="decimal" value={bmiHt}
                        onChange={e => setBmiHt(e.target.value==="" ? "" : e.target.value)}
                        placeholder="cm" className="px-2 py-2 text-[16px] border border-slate-200 rounded bg-white outline-none input-glow" />
                    </div>
                  )}
                </div>
                {calcBmiValue !== null && (
                  <div className="mt-2 flex items-center justify-between bg-white rounded-lg p-2 border border-blue-200">
                    <div>
                      <span className="text-[11px] text-slate-500">Calculated BMI: </span>
                      <span className="text-[14px] font-black text-blue-700 font-mono">{calcBmiValue}</span>
                      <span className="text-[11px] text-slate-400"> kg/m²</span>
                    </div>
                    <button onClick={acceptBmi}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer">
                      Accept
                    </button>
                  </div>
                )}
              </div>
            )}
            {nonHdlC !== null && (
              <div className="computed-field flex items-center justify-between mt-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Non-HDL-C <span className="normal-case font-medium">(calculated)</span></span>
                <span className="text-[14px] font-black text-slate-700">{nonHdlC} <span className="text-[11px] font-normal text-slate-400">mg/dL</span></span>
              </div>
            )}
            <div className="grid grid-cols-2 mt-3">
              <div className="flex justify-center"><Toggle value={onStatin} on={setOnStatin} label="Statin" /></div>
              <div className="flex justify-center"><Toggle value={smoking} on={setSmoking} label="Current Smoking" sub="Within 30 days" /></div>
              <div className="flex justify-center"><Toggle value={bpTx} on={setBpTx} label="BP Med(s)" /></div>
              <div className="flex justify-center"><Toggle value={dm} on={setDm} label="Diabetes" sub="Clinical dx" /></div>
            </div>

            {/* Risk result */}
            {risk !== null && rc && (
              <div className="risk-appear rounded-xl p-4 mt-4 border-2" style={{ backgroundColor:rc.bg, borderColor:rc.color+"40" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-widest" style={{color:rc.color}}>10-Yr ASCVD Risk</div>
                    <div className="text-4xl font-black mt-0.5 font-mono tabular-nums" style={{color:rc.color}}>{risk}%</div>
                  </div>
                  <div className="text-right">
                    <div className="px-4 py-2 rounded-full text-[14px] font-black text-white shadow-sm" style={{backgroundColor:rc.color}}>{rc.label}</div>
                    <div className="text-[11px] mt-1 font-semibold" style={{color:rc.color}}>{rc.range}</div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Risk enhancers */}
          <Card title="Risk Enhancers — Personalize" accent="amber">
            <p className="text-[11px] text-slate-400 mb-2">For borderline / intermediate risk. Favors statin initiation.</p>
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
                      (e.id === "metabolic" ? (enhs[e.id] || metSynCount >= 3) : enhs[e.id]) ? "bg-amber-50 border-amber-300" : "bg-white border-slate-200"
                    }`}>
                    <div className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${
                      (e.id === "metabolic" ? (enhs[e.id] || metSynCount >= 3) : enhs[e.id]) ? "bg-amber-500 border-amber-500" : "border-slate-300"
                    }`}>{(e.id === "metabolic" ? (enhs[e.id] || metSynCount >= 3) : enhs[e.id]) && <span className="text-white text-[13px] font-bold">✓</span>}</div>
                    <div className="flex-1">
                      <div className="text-[14px] font-bold text-slate-800 leading-tight">{e.l}</div>
                      <div className="text-[11px] text-slate-500">{e.d}{e.id === "metabolic" && metSynCount > 0 ? ` — ${metSynCount}/5 met` : ""}</div>
                    </div>
                  </button>
                  {e.id === "metabolic" && (
                    <div className="ml-7 mt-1 mb-1 space-y-1">
                      {METSYN_CRITERIA.map(m => (
                        <button key={m.id} onClick={() => toggleMetSyn(m.id)}
                          className={`w-full flex items-start gap-2 p-2 rounded-lg border text-left transition-colors cursor-pointer active:opacity-70 ${
                            metSyn[m.id] ? "bg-amber-50/60 border-amber-200" : "bg-slate-50 border-slate-200"
                          }`}>
                          <div className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${
                            metSyn[m.id] ? "bg-amber-400 border-amber-400" : "border-slate-300"
                          }`}>{metSyn[m.id] && <span className="text-white text-[10px] font-bold">✓</span>}</div>
                          <div><div className="text-[12px] font-bold text-slate-700 leading-tight">{m.l}</div>
                          <div className="text-[10px] text-slate-400">{m.d}</div></div>
                        </button>
                      ))}
                      {metSynCount >= 3 && (
                        <div className="text-[11px] font-bold text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-200">
                          {metSynCount}/5 criteria met — Metabolic Syndrome
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {enhCount > 0 && (
              <div className="mt-2 text-[14px] font-bold text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                {enhCount} enhancer{enhCount>1?"s":""} — favors statin in borderline/intermediate
              </div>
            )}
          </Card>

          {/* CAC */}
          <Card title="CAC — Reclassify (Optional)" accent="emerald">
            <div className="flex items-start justify-between mb-2">
              <p className="text-[11px] text-slate-400">Male ≥40y or Female ≥45y when decision uncertain</p>
              <button onClick={() => setCacInfo(p => !p)}
                className="w-6 h-6 rounded-full border-2 border-slate-300 text-slate-400 text-[12px] font-bold flex items-center justify-center shrink-0 ml-2 cursor-pointer hover:border-emerald-400 hover:text-emerald-500 active:scale-95 transition-colors">?</button>
            </div>
            {cacInfo && (
              <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-slate-700 space-y-2">
                <div className="font-bold text-emerald-800">How CAC Reclassifies Risk</div>
                <div>The <span className="font-bold">CAC Score</span> (Agatston units) measures calcified plaque in coronary arteries via CT. It directly overrides the PREVENT risk estimate:</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <span className="font-bold text-emerald-700">CAC = 0</span><span>No plaque detected — statin may be <span className="font-bold">deferred</span> even at intermediate risk. Reassess in 5–10 years.</span>
                  <span className="font-bold text-blue-700">CAC 1–99</span><span>Mild plaque — moderate-intensity statin. <span className="font-bold">This is where the percentile matters most:</span> if ≥75th percentile for age/sex, upgrades to high-intensity.</span>
                  <span className="font-bold text-amber-700">CAC ≥100</span><span>Significant plaque — high-intensity statin, LDL goal &lt;70.</span>
                  <span className="font-bold text-red-700">CAC ≥1000</span><span>Extensive plaque — treat as very high risk, LDL goal &lt;55, full escalation.</span>
                </div>
                <div className="text-slate-500 border-t border-emerald-200 pt-2">The <span className="font-bold">percentile</span> is only needed when the score is 1–99. It compares plaque burden to others of the same age and sex — a CAC of 50 at age 45 is more concerning than a CAC of 50 at age 75.</div>
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
          <Card title="Clinical ASCVD — Risk Level" accent="red">
            <p className="text-[11px] text-slate-400 mb-3">All ASCVD patients → high-intensity statin. Classify to set LDL target.</p>
            <Num label="Current LDL-C" unit="mg/dL" value={ldlC} on={setLdlC} min={0} max={400} ph="Current" />
            <div className="mt-3 space-y-2">
              {[
                { id:"very_high", l:"Very High Risk", d:vhrCount > 0 ? `${vhrCount} criteria met` : "Select criteria below to classify", clr:"#dc2626", bg:"#fef2f2" },
                { id:"not_very_high", l:"Not Very High Risk", d:"Stable ASCVD without features below", clr:"#ea580c", bg:"#fff7ed" },
              ].map(o => (
                <button key={o.id} onClick={() => setAscvdLevel(o.id)}
                  className="w-full text-left p-3 rounded-lg border-2 transition-colors cursor-pointer active:opacity-70 min-h-[56px]"
                  style={(o.id === "very_high" ? vhrCount > 0 : vhrCount === 0) ? { borderColor:o.clr, backgroundColor:o.bg } : { borderColor:"#e2e8f0" }}>
                  <div className="text-[14px] font-bold text-slate-800">{o.l}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{o.d}</div>
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Very High-Risk Criteria</div>
              {VHR_CRITERIA.map(e => (
                <button key={e.id} onClick={() => {
                  toggleVhr(e.id);
                }}
                  className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer active:opacity-70 min-h-[44px] ${
                    vhr[e.id] ? "bg-red-50 border-red-300" : "bg-white border-slate-200"
                  }`}>
                  <div className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${
                    vhr[e.id] ? "bg-red-500 border-red-500" : "border-slate-300"
                  }`}>{vhr[e.id] && <span className="text-white text-[13px] font-bold">✓</span>}</div>
                  <div><div className="text-[14px] font-bold text-slate-800 leading-tight">{e.l}</div>
                  <div className="text-[11px] text-slate-500">{e.d}</div></div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* DIABETES */}
        {tab === "diabetes" && (
          <Card title="Diabetes Pathway" accent="violet">
            <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mb-3">
              <div className="text-[14px] font-bold text-violet-800">Universal LLT (Age 40–75)</div>
              <div className="text-[11px] text-violet-600 mt-1">DM (type 1 or 2), CKD 3–4, or HIV → lipid-lowering therapy regardless of LDL-C level.</div>
            </div>
            <Num label="Current LDL-C" unit="mg/dL" value={ldlC} on={setLdlC} min={0} max={400} ph="Current" />
            <div className="mt-3 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">DM-Specific Risk Enhancers</div>
              {DM_ENHANCERS.map(e => (
                <button key={e.id} onClick={() => toggleDmEnh(e.id)}
                  className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer active:opacity-70 min-h-[44px] ${
                    dmEnhs[e.id] ? "bg-violet-50 border-violet-300" : "bg-white border-slate-200"
                  }`}>
                  <div className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${
                    dmEnhs[e.id] ? "bg-violet-500 border-violet-500" : "border-slate-300"
                  }`}>{dmEnhs[e.id] && <span className="text-white text-[13px] font-bold">✓</span>}</div>
                  <div><div className="text-[14px] font-bold text-slate-800 leading-tight">{e.l}</div>
                  <div className="text-[11px] text-slate-500">{e.d}</div></div>
                </button>
              ))}
            </div>
            {dmEnhCount > 0 && (
              <div className="mt-2 text-[14px] font-bold text-violet-700 bg-violet-50 rounded-lg px-3 py-2 border border-violet-200">
                {dmEnhCount} DM enhancer{dmEnhCount>1?"s":""} — supports high-intensity statin
              </div>
            )}
          </Card>
        )}

        {/* SEVERE */}
        {tab === "severe" && (
          <Card title="Severe Hypercholesterolemia" accent="red">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <div className="text-[14px] font-bold text-red-800">LDL ≥190 mg/dL → High-Intensity Statin</div>
              <div className="text-[11px] text-red-600 mt-1">No risk calculation needed. Evaluate for FH (Dutch Lipid Clinic criteria). Cascade screening. Lipid specialist referral.</div>
            </div>
            <Num label="Current LDL-C" unit="mg/dL" value={ldlC} on={setLdlC} min={0} max={600} ph="Current" />
          </Card>
        )}

        {/* BIOMARKERS */}
        <Card title="Advanced Biomarkers" accent="violet">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[11px] text-slate-400">Lp(a): screen at least once as adult. ApoB: check once LDL/Non-HDL near goal.</p>
            <button onClick={() => setBioInfo(p => !p)}
              className="w-6 h-6 rounded-full border-2 border-slate-300 text-slate-400 text-[12px] font-bold flex items-center justify-center shrink-0 ml-2 cursor-pointer hover:border-violet-400 hover:text-violet-500 active:scale-95 transition-colors">?</button>
          </div>
          {bioInfo && (
            <div className="mb-3 p-3 bg-violet-50 border border-violet-200 rounded-lg text-[11px] text-slate-700 space-y-3">
              <div>
                <div className="font-bold text-violet-800 mb-1">Lp(a) — Lipoprotein(a)</div>
                <div>A genetically determined, LDL-like particle that independently increases ASCVD risk. Levels are largely fixed from birth and not significantly lowered by statins.</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 mt-1.5">
                  <span className="font-bold text-emerald-700">&lt;125 nmol/L</span><span>Normal — not a risk enhancer</span>
                  <span className="font-bold text-amber-700">≥125 nmol/L</span><span>Elevated — ~1.4× ASCVD risk; qualifies as risk enhancer for statin decision</span>
                  <span className="font-bold text-red-700">≥250 nmol/L</span><span>Very high — ~2× ASCVD risk; intensify LDL-C lowering aggressively</span>
                </div>
                <div className="text-slate-500 mt-1.5">Screen at least once as adult. Earlier if family history of premature ASCVD or FH. Values in mg/dL: divide nmol/L by ~2.5 (≥50 mg/dL ≈ elevated).</div>
              </div>
              <div className="border-t border-violet-200 pt-2">
                <div className="font-bold text-violet-800 mb-1">ApoB — Apolipoprotein B</div>
                <div>One ApoB molecule per atherogenic particle (LDL, VLDL, IDL, Lp(a)). ApoB counts total atherogenic particle number — more precise than LDL-C alone, especially when TG elevated or LDL-C is discordant with non-HDL-C.</div>
                <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 mt-1.5">
                  <span className="font-bold text-emerald-700">&lt;85 mg/dL</span><span>Optimal — at or below goal for all risk categories</span>
                  <span className="font-bold text-blue-700">85–99</span><span>Borderline — at goal for intermediate risk; above for very high risk</span>
                  <span className="font-bold text-amber-700">100–129</span><span>Elevated — above goal for most; consider intensification</span>
                  <span className="font-bold text-red-700">≥130 mg/dL</span><span>Very high — significantly elevated atherogenic burden</span>
                </div>
                <div className="text-slate-500 mt-1.5">Check once LDL/Non-HDL-C is near goal to confirm atherogenic particle burden is also controlled. Particularly useful when TG ≥150 or diabetes present.</div>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-2">
            <Num label="Lp(a)" unit="nmol/L" value={lpa} on={setLpa} min={0} max={500} preserveCase />
            <Num label="ApoB" unit="mg/dL" value={apoB} on={setApoB} min={0} max={300} preserveCase />
          </div>
          {lpaNote && (
            <div className={`flex items-start gap-2 p-2 rounded-lg border mb-1.5 ${
              lpaNote.c==="red"?"bg-red-50 border-red-200":lpaNote.c==="amber"?"bg-amber-50 border-amber-200":"bg-emerald-50 border-emerald-200"
            }`}><Badge color={lpaNote.c}>Lp(a) {lpaNote.lv}</Badge><span className="text-[11px] text-slate-700">{lpaNote.n}</span></div>
          )}
          {apoBNote && (
            <div className={`flex items-start gap-2 p-2 rounded-lg border ${
              apoBNote.c==="red"?"bg-red-50 border-red-200":apoBNote.c==="amber"?"bg-amber-50 border-amber-200":
              apoBNote.c==="blue"?"bg-blue-50 border-blue-200":"bg-emerald-50 border-emerald-200"
            }`}><Badge color={apoBNote.c}>ApoB {apoBNote.lv}</Badge><span className="text-[11px] text-slate-700">{apoBNote.n}</span></div>
          )}
        </Card>

        {/* ── RECOMMENDATION ── */}
        {rec && ((tab==="primary" && risk!==null) || tab!=="primary") && (<>
          <div className={`rounded-xl border-2 p-4 ${recBg[rec.clr]}`}>
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1">Recommendation</div>
            <div className={`text-[14px] font-bold leading-snug ${recTxt[rec.clr]}`}>{rec.txt}</div>
          </div>

          {rec.g && ldlC !== "" && ldlC !== null && (
            <div className={`rounded-xl p-3 flex items-center gap-3 border-2 ${
              Number(ldlC) <= rec.g.ldl
                ? "bg-emerald-50 border-emerald-300"
                : "bg-red-50 border-red-300"
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black shrink-0 ${
                Number(ldlC) <= rec.g.ldl
                  ? "bg-emerald-500 text-white"
                  : "bg-red-500 text-white"
              }`}>
                {Number(ldlC) <= rec.g.ldl ? "✓" : "✗"}
              </div>
              <div>
                <div className={`text-[14px] font-black ${
                  Number(ldlC) <= rec.g.ldl ? "text-emerald-800" : "text-red-800"
                }`}>
                  {Number(ldlC) <= rec.g.ldl
                    ? "At Goal"
                    : `Not at Goal — LDL ${Number(ldlC) - rec.g.ldl} mg/dL above target`}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Current LDL {ldlC} mg/dL · Goal &lt;{rec.g.ldl} mg/dL
                </div>
              </div>
            </div>
          )}

          {rec.g && <Card title="Treatment Goals" accent={rec.clr==="red"?"red":rec.clr==="amber"?"amber":"blue"}>
            <Goals ldl={rec.g.ldl} nonHdl={rec.g.nh} pct={rec.g.p} currentLdl={ldlC||null} />
          </Card>}

          <Card title="Treatment Ladder" accent="blue">
            <div className="space-y-0">
              {[
                { s:1, l:"Lifestyle Optimization", show:true },
                { s:2, l:"Maximally Tolerated Statin", show:rec.int!=="none"&&rec.int!=="lifestyle", isStatin:true },
                { s:3, l:"Add Ezetimibe", show:rec.esc },
                { s:4, l:"Bempedoic Acid / PCSK9i", show:rec.esc },
                { s:5, l:"Consider Inclisiran", show:rec.esc&&rec.g?.ldl<=55 },
              ].filter(s=>s.show).map((s,i,arr) => (
                <div key={s.s} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0 ${i===0?"bg-emerald-500":"bg-blue-600"}`}>{s.s}</div>
                    {i<arr.length-1 && <div className="flex-1 my-0.5 ladder-connector"/>}
                  </div>
                  <div className="pb-3 flex-1 min-w-0">
                    <div className="text-[14px] font-bold text-slate-800 flex items-center gap-1.5">
                      {s.l}
                      {s.isStatin && (
                        <button onClick={() => setStatinInfo(p => !p)}
                          className="w-5 h-5 rounded-full border-2 border-slate-300 text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0 cursor-pointer hover:border-blue-400 hover:text-blue-500 active:scale-95 transition-colors">?</button>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {s.s === 1 && (
                        <div>Diet, exercise, weight management, smoking cessation, sleep optimization</div>
                      )}
                      {s.isStatin && (<>
                        <div className="font-bold text-slate-600">{rec.int==="high" ? "High-Intensity" : "Moderate-Intensity"} <span className="font-normal text-slate-400">({rec.int==="high" ? "≥50%" : "30–49%"} LDL-C reduction)</span></div>
                        <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-slate-200">
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
                        <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-slate-200">
                          <div>Ezetimibe 10 mg daily <span className="text-slate-400">(additional 15–20% LDL-C reduction)</span></div>
                        </div>
                      )}
                      {s.s === 4 && (
                        <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-slate-200">
                          <div>Bempedoic acid 180 mg daily <span className="text-slate-400">(~18% LDL-C reduction)</span></div>
                          <div>Evolocumab 140 mg q2wk or 420 mg monthly <span className="text-slate-400">(~60% LDL-C reduction)</span></div>
                          <div>Alirocumab 75–150 mg q2wk <span className="text-slate-400">(~50–60% LDL-C reduction)</span></div>
                        </div>
                      )}
                      {s.s === 5 && (
                        <div className="mt-1 space-y-0.5 pl-2 border-l-2 border-slate-200">
                          <div>Inclisiran 284 mg SC <span className="text-slate-400">(~50% LDL-C reduction)</span></div>
                          <div className="text-slate-400">Day 0, Day 90, then q6 months · siRNA for residual LDL elevation</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {tg!==""&&Number(tg)>=150 && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-[14px] font-bold text-amber-800">Hypertriglyceridemia</div>
                <div className="text-[11px] text-amber-700 mt-0.5">
                  TG {tg} — {Number(tg)>=500?"Severe: prioritize TG lowering (pancreatitis risk). Fibrate ± icosapent ethyl. If ≥1000, consider apoC-III inhibitor.":"Statins first-line for ASCVD risk. If TG persistent, add fenofibrate or icosapent ethyl (REDUCE-IT)."}
                </div>
              </div>
            )}
          </Card>
        </>)}

        {/* MONITORING */}
        <Card title="Monitoring" accent="emerald">
          <div className="space-y-2.5 text-[11px]">

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-700 mb-1.5">After LLT Start</div>
              <div className="space-y-1 text-slate-600">
                <div className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">4–12 wk</span><span>Fasting <b>lipid panel</b></span></div>
                <div className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">q3–12 mo</span><span>Repeat until at goal</span></div>
                <div className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">Annually</span><span>Once at goal</span></div>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-700 mb-1.5">Safety</div>
              <div className="space-y-0.5 text-slate-600">
                <div>• <b>Hepatic panel</b> at baseline</div>
                <div>• <b>CK</b> only if symptomatic</div>
                <div className="flex items-center gap-1.5">
                  <span>• Monitor for new-onset DM with high-intensity <b>statin</b></span>
                  <button onClick={() => setStatinInfoMon(p => !p)}
                    className="w-5 h-5 rounded-full border-2 border-slate-300 text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0 cursor-pointer hover:border-emerald-400 hover:text-emerald-500 active:scale-95 transition-colors">?</button>
                </div>
              </div>
              {statinInfoMon && <div className="mt-2"><StatinInfo onClose={() => setStatinInfoMon(false)} /></div>}
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-700 mb-1.5">Screening</div>
              <div className="space-y-1 text-slate-600">
                <div className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">Ages 9–11</span><span>Initial <b>lipid panel</b></span></div>
                <div className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">Ages 19–21</span><span>Repeat <b>lipid panel</b></span></div>
                <div className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">Then ≥q5y</span><span>Periodic rescreening</span></div>
                <div className="flex gap-2"><span className="text-emerald-500 font-bold shrink-0">Lp(a)</span><span>At least once as adult</span></div>
              </div>
            </div>

            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-700 mb-1.5">Refer to Lipid Specialist</div>
              <div className="space-y-0.5 text-slate-600">
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
        <div className="footer-sep mx-8 mt-4" />
        <div className="text-center pt-3 pb-8 space-y-1">
          <div className="text-[11px] text-slate-400">PREVENT: Khan SS et al. Circ 2024;149:430-449 · Guideline: Blumenthal RS et al. JACC/Circ 2026</div>
          <div className="text-[11px] text-slate-400">Clinical decision support only. Does not replace clinical judgment.</div>
          <a href="https://professional.heart.org/en/guidelines-and-statements/prevent-calculator"
            target="_blank" rel="noopener"
            className="inline-block text-[11px] text-blue-500 underline mt-1">
            Validate with AHA PREVENT™ Calculator
          </a>
        </div>
      </div>
      </div>
    </div>
  );
}
