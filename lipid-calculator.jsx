import { useState, useMemo, useCallback } from "react";

// ── PREVENT-ASCVD 10-Year Base Model Coefficients (Khan et al., Circulation 2024) ──
// Extracted from validated preventr R package (sysdata.rda)
const PREVENT_COEFFICIENTS = {
  female_ascvd: {
    age: 0.7198830, nonHdlC: 0.1176967, hdlC: -0.1511850,
    sbpLt110: -0.0835358, sbpGte110: 0.3592852, dm: 0.8348585,
    smoking: 0.4831078, bmiLt30: 0.0, bmiGte30: 0.0,
    egfrLt60: 0.4864619, egfrGte60: 0.0397779, bpTx: 0.2265309,
    statin: -0.0592374, bpTxSbpGte110: -0.0395762, statinNonHdlC: 0.0844423,
    ageNonHdlC: -0.0567839, ageHdlC: 0.0325692, ageSbpGte110: -0.1035985,
    ageDm: -0.2417542, ageSmoking: -0.0791142, ageBmiGte30: 0.0,
    ageEgfrLt60: -0.1671492, constant: -3.8199750
  },
  male_ascvd: {
    age: 0.7099847, nonHdlC: 0.1658663, hdlC: -0.1144285,
    sbpLt110: -0.2837212, sbpGte110: 0.3239977, dm: 0.7189597,
    smoking: 0.3956973, bmiLt30: 0.0, bmiGte30: 0.0,
    egfrLt60: 0.3690075, egfrGte60: 0.0203619, bpTx: 0.2036522,
    statin: -0.0865581, bpTxSbpGte110: -0.0322916, statinNonHdlC: 0.1145630,
    ageNonHdlC: -0.0300005, ageHdlC: 0.0232747, ageSbpGte110: -0.0927024,
    ageDm: -0.2018525, ageSmoking: -0.0970527, ageBmiGte30: 0.0,
    ageEgfrLt60: -0.1217081, constant: -3.5006550
  }
};

function calculatePREVENT(inputs) {
  const { age, sex, sbp, bpTx, totalC, hdlC, statin, dm, smoking, egfr, bmi } = inputs;
  if (!age || !sbp || !totalC || !hdlC || !egfr || !bmi) return null;
  const coefs = sex === "female" ? PREVENT_COEFFICIENTS.female_ascvd : PREVENT_COEFFICIENTS.male_ascvd;
  const cholToMmol = (mg) => mg / 38.67;
  const ageT = (age - 55) / 10;
  const nonHdlCT = cholToMmol(totalC - hdlC) - 3.5;
  const hdlCT = (cholToMmol(hdlC) - 1.3) / 0.3;
  const sbpLt110T = (Math.min(sbp, 110) - 110) / 20;
  const sbpGte110T = (Math.max(sbp, 110) - 130) / 20;
  const dmT = dm ? 1 : 0;
  const smokingT = smoking ? 1 : 0;
  const bmiLt30T = (Math.min(bmi, 30) - 25) / 5;
  const bmiGte30T = (Math.max(bmi, 30) - 30) / 5;
  const egfrLt60T = (Math.min(egfr, 60) - 60) / -15;
  const egfrGte60T = (Math.max(egfr, 60) - 90) / -15;
  const bpTxT = bpTx ? 1 : 0;
  const statinT = statin ? 1 : 0;
  const logOdds =
    coefs.age * ageT + coefs.nonHdlC * nonHdlCT + coefs.hdlC * hdlCT +
    coefs.sbpLt110 * sbpLt110T + coefs.sbpGte110 * sbpGte110T +
    coefs.dm * dmT + coefs.smoking * smokingT +
    coefs.bmiLt30 * bmiLt30T + coefs.bmiGte30 * bmiGte30T +
    coefs.egfrLt60 * egfrLt60T + coefs.egfrGte60 * egfrGte60T +
    coefs.bpTx * bpTxT + coefs.statin * statinT +
    coefs.bpTxSbpGte110 * (bpTxT * sbpGte110T) +
    coefs.statinNonHdlC * (statinT * nonHdlCT) +
    coefs.ageNonHdlC * (ageT * nonHdlCT) + coefs.ageHdlC * (ageT * hdlCT) +
    coefs.ageSbpGte110 * (ageT * sbpGte110T) + coefs.ageDm * (ageT * dmT) +
    coefs.ageSmoking * (ageT * smokingT) + coefs.ageBmiGte30 * (ageT * bmiGte30T) +
    coefs.ageEgfrLt60 * (ageT * egfrLt60T) + coefs.constant * 1;
  const risk = Math.exp(logOdds) / (1 + Math.exp(logOdds));
  return Math.round(risk * 1000) / 10;
}

function getRiskCategory(risk) {
  if (risk === null) return null;
  if (risk < 3) return { label: "Low", color: "#16a34a", bg: "#f0fdf4", threshold: "<3%" };
  if (risk < 5) return { label: "Borderline", color: "#ca8a04", bg: "#fefce8", threshold: "3–<5%" };
  if (risk < 10) return { label: "Intermediate", color: "#ea580c", bg: "#fff7ed", threshold: "5–<10%" };
  return { label: "High", color: "#dc2626", bg: "#fef2f2", threshold: "≥10%" };
}

const RISK_ENHANCERS = [
  { id: "fhx", label: "Family hx premature ASCVD", detail: "1st-degree ♂ <55y or ♀ <65y" },
  { id: "lpa", label: "Elevated Lp(a)", detail: "≥125 nmol/L (≥50 mg/dL)" },
  { id: "tg", label: "Persistently elevated TG", detail: "≥175 mg/dL" },
  { id: "hscrp", label: "Elevated hs-CRP", detail: "≥2.0 mg/L" },
  { id: "ckd", label: "Chronic kidney disease", detail: "eGFR 15–59 or albumin/Cr ≥30" },
  { id: "inflam", label: "Chronic inflammatory condition", detail: "RA, psoriasis, lupus, HIV" },
  { id: "metabolic", label: "Metabolic syndrome", detail: "≥3 of 5 criteria" },
  { id: "preeclampsia", label: "Hx preeclampsia / premature menopause", detail: "Women-specific" },
  { id: "southasian", label: "South Asian ancestry", detail: "Independent risk enhancer" },
  { id: "apob_high", label: "Elevated ApoB", detail: "≥130 mg/dL" },
  { id: "abi", label: "Abnormal ABI", detail: "≤0.9" },
];

const STATIN_INTENSITY = {
  high: [
    { name: "Atorvastatin 40–80 mg", reduction: "≥50%" },
    { name: "Rosuvastatin 20–40 mg", reduction: "≥50%" },
  ],
  moderate: [
    { name: "Atorvastatin 10–20 mg", reduction: "30–49%" },
    { name: "Rosuvastatin 5–10 mg", reduction: "30–49%" },
    { name: "Simvastatin 20–40 mg", reduction: "30–49%" },
    { name: "Pravastatin 40–80 mg", reduction: "30–49%" },
  ],
};

// ── Components ──
function Toggle({ value, onChange, label }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="flex items-center gap-2 group cursor-pointer"
      type="button"
    >
      <div className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${value ? "bg-blue-600" : "bg-slate-300"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </div>
      <span className="text-sm text-slate-700">{label}</span>
    </button>
  );
}

function NumInput({ label, unit, value, onChange, min, max, step = 1, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          min={min} max={max} step={step}
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 text-sm text-slate-800 outline-none bg-transparent min-w-0"
        />
        {unit && <span className="pr-3 text-xs text-slate-400 whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  );
}

function SectionCard({ title, children, accent = "blue" }) {
  const colors = {
    blue: "border-l-blue-600",
    amber: "border-l-amber-500",
    red: "border-l-red-500",
    emerald: "border-l-emerald-600",
    violet: "border-l-violet-600",
  };
  return (
    <div className={`bg-white rounded-xl border border-slate-200 border-l-4 ${colors[accent]} shadow-sm`}>
      {title && (
        <div className="px-5 pt-4 pb-2">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{title}</h3>
        </div>
      )}
      <div className="px-5 pb-5">{children}</div>
    </div>
  );
}

function Badge({ children, color = "blue" }) {
  const styles = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
    violet: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[color]}`}>
      {children}
    </span>
  );
}

function GoalDisplay({ ldl, nonHdl, pctReduction, currentLdl }) {
  const needed = currentLdl ? Math.round(((currentLdl - ldl) / currentLdl) * 100) : null;
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
        <div className="text-2xl font-black text-blue-700">&lt;{ldl}</div>
        <div className="text-xs text-blue-500 font-semibold mt-0.5">LDL-C mg/dL</div>
      </div>
      <div className="bg-violet-50 rounded-lg p-3 text-center border border-violet-100">
        <div className="text-2xl font-black text-violet-700">&lt;{nonHdl}</div>
        <div className="text-xs text-violet-500 font-semibold mt-0.5">Non-HDL mg/dL</div>
      </div>
      <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
        <div className="text-2xl font-black text-slate-700">≥{pctReduction}%</div>
        <div className="text-xs text-slate-500 font-semibold mt-0.5">% LDL Reduction</div>
        {needed !== null && needed > 0 && (
          <div className="text-xs text-amber-600 mt-1">{needed}% needed from baseline</div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──
export default function LipidCalculator() {
  const [tab, setTab] = useState("primary");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("male");
  const [sbp, setSbp] = useState("");
  const [bpTx, setBpTx] = useState(false);
  const [totalC, setTotalC] = useState("");
  const [hdlC, setHdlC] = useState("");
  const [ldlC, setLdlC] = useState("");
  const [statinUse, setStatinUse] = useState(false);
  const [dm, setDm] = useState(false);
  const [smoking, setSmoking] = useState(false);
  const [egfr, setEgfr] = useState("");
  const [bmi, setBmi] = useState("");
  const [enhancers, setEnhancers] = useState({});
  const [cacScore, setCacScore] = useState("");
  const [cacPercentile, setCacPercentile] = useState("");
  const [lpa, setLpa] = useState("");
  const [apoB, setApoB] = useState("");
  const [tg, setTg] = useState("");
  const [ascvdType, setAscvdType] = useState("very_high");
  const [showResults, setShowResults] = useState(false);

  const toggleEnhancer = useCallback((id) => {
    setEnhancers((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const enhancerCount = useMemo(() => Object.values(enhancers).filter(Boolean).length, [enhancers]);

  const preventRisk = useMemo(() => {
    if (tab !== "primary") return null;
    return calculatePREVENT({ age, sex, sbp, bpTx, totalC, hdlC, statin: statinUse, dm, smoking, egfr, bmi });
  }, [tab, age, sex, sbp, bpTx, totalC, hdlC, statinUse, dm, smoking, egfr, bmi]);

  const riskCat = useMemo(() => getRiskCategory(preventRisk), [preventRisk]);

  const getRecommendation = useCallback(() => {
    if (tab === "secondary") {
      if (ascvdType === "very_high") {
        return {
          goals: { ldl: 55, nonHdl: 85, pct: 50 },
          intensity: "high",
          escalation: true,
          summary: "Very high-risk ASCVD — aggressive LDL lowering with high-intensity statin + add-on therapy to goal <55 mg/dL",
          color: "red",
        };
      }
      return {
        goals: { ldl: 70, nonHdl: 100, pct: 50 },
        intensity: "high",
        escalation: true,
        summary: "Clinical ASCVD (not very high risk) — high-intensity statin to LDL <70 mg/dL",
        color: "amber",
      };
    }
    if (tab === "diabetes") {
      return {
        goals: { ldl: 70, nonHdl: 100, pct: 50 },
        intensity: "moderate_to_high",
        escalation: true,
        summary: "Diabetes (age 40–75) — LLT recommended regardless of LDL level; high-intensity statin if additional risk factors",
        color: "violet",
      };
    }
    if (tab === "severe") {
      return {
        goals: { ldl: 100, nonHdl: 130, pct: 50 },
        intensity: "high",
        escalation: true,
        summary: "Severe hypercholesterolemia (LDL ≥190) — high-intensity statin; evaluate for familial hypercholesterolemia",
        color: "red",
      };
    }
    // primary
    if (preventRisk === null) return null;

    // CAC-based goals override if available
    if (cacScore !== "" && Number(cacScore) >= 0) {
      const cac = Number(cacScore);
      const pct = cacPercentile !== "" ? Number(cacPercentile) : null;
      if (cac === 0) {
        return {
          goals: null,
          intensity: "none",
          escalation: false,
          summary: "CAC = 0 — Statin therapy may be deferred. Reassess in 5-10 years. Continue lifestyle optimization.",
          color: "emerald",
        };
      }
      if (cac >= 1000) {
        return { goals: { ldl: 55, nonHdl: 85, pct: 50 }, intensity: "high", escalation: true, summary: "CAC ≥1000 — Treat as very high risk. High-intensity statin + add-on therapy to LDL <55.", color: "red" };
      }
      if (cac >= 100 || (pct !== null && pct >= 75)) {
        return { goals: { ldl: 70, nonHdl: 100, pct: 50 }, intensity: "high", escalation: true, summary: "CAC ≥100 (or ≥75th %ile) — High-intensity statin to LDL <70 mg/dL.", color: "amber" };
      }
      if (cac >= 1) {
        return { goals: { ldl: 100, nonHdl: 130, pct: 30 }, intensity: "moderate", escalation: false, summary: "CAC 1–99 (<75th %ile) — Moderate-intensity statin to LDL <100 mg/dL favored.", color: "blue" };
      }
    }

    if (preventRisk >= 10) {
      return { goals: { ldl: 70, nonHdl: 100, pct: 50 }, intensity: "high", escalation: true, summary: "High 10-year ASCVD risk (≥10%) — High-intensity statin to LDL <70 mg/dL.", color: "red" };
    }
    if (preventRisk >= 5) {
      return { goals: { ldl: 100, nonHdl: 130, pct: 30 }, intensity: "moderate", escalation: false, summary: "Intermediate risk (5–<10%) — Moderate-intensity statin to LDL <100 mg/dL after clinician-patient discussion.", color: "amber" };
    }
    if (preventRisk >= 3) {
      if (enhancerCount > 0) {
        return { goals: { ldl: 100, nonHdl: 130, pct: 30 }, intensity: "moderate", escalation: false, summary: `Borderline risk (3–<5%) with ${enhancerCount} risk enhancer(s) — Consider moderate-intensity statin.`, color: "amber" };
      }
      return { goals: { ldl: 100, nonHdl: 130, pct: 30 }, intensity: "none_to_moderate", escalation: false, summary: "Borderline risk (3–<5%) — Lifestyle optimization; consider statin if risk enhancers present.", color: "blue" };
    }
    return { goals: null, intensity: "none", escalation: false, summary: "Low risk (<3%) — Focus on lifestyle optimization. Reassess periodically.", color: "emerald" };
  }, [tab, preventRisk, enhancerCount, cacScore, cacPercentile, ascvdType]);

  const rec = getRecommendation();

  // Lp(a) interpretation
  const lpaInterpretation = useMemo(() => {
    if (lpa === "") return null;
    const v = Number(lpa);
    if (v >= 250) return { level: "Very High", color: "red", note: "≥250 nmol/L — ~2× ASCVD risk. Intensify LDL-C lowering and manage all modifiable risk factors aggressively." };
    if (v >= 125) return { level: "Elevated", color: "amber", note: "≥125 nmol/L — ~1.4× ASCVD risk. Consider as risk enhancer; intensify LDL-C lowering." };
    return { level: "Normal", color: "emerald", note: "<125 nmol/L — Not considered a risk enhancer at this level." };
  }, [lpa]);

  const apoBInterpretation = useMemo(() => {
    if (apoB === "") return null;
    const v = Number(apoB);
    if (v >= 130) return { level: "Very High", color: "red", note: "≥130 mg/dL — Significantly elevated atherogenic particle burden. Intensify therapy." };
    if (v >= 100) return { level: "Elevated", color: "amber", note: "100–129 mg/dL — Above goal for most patients. Consider therapy intensification, especially with elevated TG or DM." };
    if (v >= 85) return { level: "Borderline", color: "blue", note: "85–99 mg/dL — At goal for intermediate risk; above goal for very high risk (goal <85)." };
    return { level: "Optimal", color: "emerald", note: "<85 mg/dL — At or below goal for all risk categories." };
  }, [apoB]);

  const tabs = [
    { id: "primary", label: "Primary Prevention", icon: "🛡" },
    { id: "secondary", label: "Secondary (ASCVD)", icon: "🫀" },
    { id: "diabetes", label: "Diabetes", icon: "🩸" },
    { id: "severe", label: "LDL ≥190", icon: "⚠" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100" style={{ fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />

      {/* Header */}
      <div className="bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl font-black tracking-tight">2026 ACC/AHA Lipid Management</h1>
              <p className="text-slate-400 text-xs mt-1 font-medium">Dyslipidemia Guideline Clinical Decision Support &nbsp;·&nbsp; PREVENT-ASCVD Embedded</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Based on</div>
              <div className="text-xs text-blue-400 font-semibold">Blumenthal et al. JACC/Circ 2026</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setShowResults(false); }}
                className={`px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer ${
                  tab === t.id ? "border-blue-600 text-blue-700 bg-blue-50/50" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="mr-1.5">{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        {/* PRIMARY PREVENTION */}
        {tab === "primary" && (
          <>
            <SectionCard title="PREVENT-ASCVD Risk Calculator" accent="blue">
              <p className="text-xs text-slate-500 mb-4">Ages 30–79 · Without known ASCVD · LDL 70–189 mg/dL · Replaces Pooled Cohort Equations</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                <NumInput label="Age" unit="years" value={age} onChange={setAge} min={30} max={79} placeholder="30–79" />
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sex</label>
                  <div className="flex gap-1">
                    {["male", "female"].map((s) => (
                      <button key={s} onClick={() => setSex(s)}
                        className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${sex === s ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                        {s === "male" ? "♂ Male" : "♀ Female"}
                      </button>
                    ))}
                  </div>
                </div>
                <NumInput label="Total Cholesterol" unit="mg/dL" value={totalC} onChange={setTotalC} min={130} max={320} placeholder="130–320" />
                <NumInput label="HDL-C" unit="mg/dL" value={hdlC} onChange={setHdlC} min={20} max={100} placeholder="20–100" />
                <NumInput label="LDL-C (for goals)" unit="mg/dL" value={ldlC} onChange={setLdlC} min={0} max={400} placeholder="Baseline" />
                <NumInput label="Systolic BP" unit="mmHg" value={sbp} onChange={setSbp} min={90} max={200} placeholder="90–200" />
                <NumInput label="eGFR" unit="mL/min" value={egfr} onChange={setEgfr} min={15} max={140} placeholder="15–140" />
                <NumInput label="BMI" unit="kg/m²" value={bmi} onChange={setBmi} min={18.5} max={60} step={0.1} placeholder="18.5–60" />
                <NumInput label="Triglycerides" unit="mg/dL" value={tg} onChange={setTg} min={0} max={2000} placeholder="Optional" />
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 mb-4">
                <Toggle value={bpTx} onChange={setBpTx} label="On BP meds" />
                <Toggle value={statinUse} onChange={setStatinUse} label="On statin" />
                <Toggle value={dm} onChange={setDm} label="Diabetes" />
                <Toggle value={smoking} onChange={setSmoking} label="Current smoker" />
              </div>

              {/* PREVENT Result */}
              {preventRisk !== null && riskCat && (
                <div className="rounded-xl p-4 mt-3 border-2" style={{ backgroundColor: riskCat.bg, borderColor: riskCat.color + "40" }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider" style={{ color: riskCat.color }}>10-Year ASCVD Risk (PREVENT)</div>
                      <div className="text-4xl font-black mt-1" style={{ color: riskCat.color, fontFamily: "'JetBrains Mono', monospace" }}>{preventRisk}%</div>
                    </div>
                    <div className="text-right">
                      <div className="inline-block px-4 py-2 rounded-full text-sm font-black text-white" style={{ backgroundColor: riskCat.color }}>
                        {riskCat.label} Risk
                      </div>
                      <div className="text-xs mt-1" style={{ color: riskCat.color }}>{riskCat.threshold}</div>
                    </div>
                  </div>
                </div>
              )}
            </SectionCard>

            {/* Risk Enhancers */}
            <SectionCard title="Risk Enhancers (CPR Model — Personalize)" accent="amber">
              <p className="text-xs text-slate-500 mb-3">Check applicable risk-enhancing factors to personalize the PREVENT estimate. Particularly relevant for borderline/intermediate risk.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {RISK_ENHANCERS.map((re) => (
                  <button key={re.id} onClick={() => toggleEnhancer(re.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                      enhancers[re.id] ? "bg-amber-50 border-amber-300" : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}>
                    <div className={`mt-0.5 w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                      enhancers[re.id] ? "bg-amber-500 border-amber-500" : "border-slate-300"
                    }`}>
                      {enhancers[re.id] && <span className="text-white text-xs">✓</span>}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800 leading-tight">{re.label}</div>
                      <div className="text-xs text-slate-500">{re.detail}</div>
                    </div>
                  </button>
                ))}
              </div>
              {enhancerCount > 0 && (
                <div className="mt-3 text-sm font-semibold text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200">
                  {enhancerCount} risk enhancer{enhancerCount > 1 ? "s" : ""} selected — favors statin initiation in borderline/intermediate risk
                </div>
              )}
            </SectionCard>

            {/* CAC Scoring */}
            <SectionCard title="CAC Scoring — Reclassify (Optional)" accent="emerald">
              <p className="text-xs text-slate-500 mb-3">For ♂ ≥40y or ♀ ≥45y when lipid-lowering decision is uncertain. Both absolute CAC and percentile have prognostic value.</p>
              <div className="grid grid-cols-2 gap-3">
                <NumInput label="CAC Score" unit="AU" value={cacScore} onChange={setCacScore} min={0} max={10000} placeholder="Agatston" />
                <NumInput label="CAC Percentile" unit="%" value={cacPercentile} onChange={setCacPercentile} min={0} max={100} placeholder="For age/sex" />
              </div>
            </SectionCard>
          </>
        )}

        {/* SECONDARY PREVENTION */}
        {tab === "secondary" && (
          <SectionCard title="Clinical ASCVD — Risk Stratification" accent="red">
            <p className="text-xs text-slate-500 mb-4">All patients with clinical ASCVD receive high-intensity statin. Classify risk level to determine LDL-C target.</p>
            <NumInput label="Current LDL-C" unit="mg/dL" value={ldlC} onChange={setLdlC} min={0} max={400} placeholder="Current value" />
            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">ASCVD Risk Level</label>
              {[
                { id: "very_high", label: "Very High Risk", detail: "Recent ACS (<12 mo), multiple ASCVD events, ASCVD + ≥2 high-risk conditions (DM, CKD 3–4, HeFH, current smoking, persistently elevated LDL ≥70 despite max statin, hx CHF)", color: "red" },
                { id: "not_very_high", label: "Not Very High Risk", detail: "Stable ASCVD without the above very-high-risk features", color: "amber" },
              ].map((o) => (
                <button key={o.id} onClick={() => setAscvdType(o.id)}
                  className={`w-full text-left p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                    ascvdType === o.id ? `border-${o.color}-400 bg-${o.color}-50` : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                  style={ascvdType === o.id ? { borderColor: o.color === "red" ? "#f87171" : "#fbbf24", backgroundColor: o.color === "red" ? "#fef2f2" : "#fffbeb" } : {}}
                >
                  <div className="text-sm font-bold text-slate-800">{o.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{o.detail}</div>
                </button>
              ))}
            </div>
          </SectionCard>
        )}

        {/* DIABETES */}
        {tab === "diabetes" && (
          <SectionCard title="Diabetes Pathway" accent="violet">
            <div className="space-y-3">
              <div className="bg-violet-50 border border-violet-200 rounded-lg p-3">
                <div className="text-sm font-bold text-violet-800">Universal LLT Indication (Age 40–75)</div>
                <div className="text-xs text-violet-600 mt-1">Adults aged 40–75 with diabetes (type 1 or 2), CKD stage 3–4, or HIV should be treated with lipid-lowering therapy regardless of LDL-C level.</div>
              </div>
              <NumInput label="Current LDL-C" unit="mg/dL" value={ldlC} onChange={setLdlC} min={0} max={400} placeholder="Current value" />
              <div className="text-xs text-slate-500 mt-2">
                <span className="font-semibold">Diabetes-specific risk enhancers:</span> Duration ≥10y (type 2) or ≥20y (type 1), A1c ≥8%, albuminuria ≥30 mg/g, eGFR &lt;60, retinopathy, neuropathy, ABI ≤0.9
              </div>
            </div>
          </SectionCard>
        )}

        {/* SEVERE HYPERCHOLESTEROLEMIA */}
        {tab === "severe" && (
          <SectionCard title="Severe Hypercholesterolemia (LDL ≥190 mg/dL)" accent="red">
            <div className="space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="text-sm font-bold text-red-800">High-Intensity Statin Without Risk Calculation</div>
                <div className="text-xs text-red-600 mt-1">PREVENT risk assessment not required. Initiate high-intensity statin immediately. Evaluate for familial hypercholesterolemia (FH) — Dutch Lipid Clinic Network criteria, cascade screening. Refer to lipid specialist if FH suspected.</div>
              </div>
              <NumInput label="Current LDL-C" unit="mg/dL" value={ldlC} onChange={setLdlC} min={0} max={600} placeholder="Current value" />
            </div>
          </SectionCard>
        )}

        {/* BIOMARKERS PANEL */}
        <SectionCard title="Advanced Biomarkers" accent="violet">
          <p className="text-xs text-slate-500 mb-3">Lp(a): measure at least once in adulthood. ApoB: useful once LDL-C and non-HDL-C are near goal, especially with elevated TG or DM.</p>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <NumInput label="Lp(a)" unit="nmol/L" value={lpa} onChange={setLpa} min={0} max={500} placeholder="One-time screen" />
            <NumInput label="ApoB" unit="mg/dL" value={apoB} onChange={setApoB} min={0} max={300} placeholder="If near LDL goal" />
          </div>
          <div className="space-y-2">
            {lpaInterpretation && (
              <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                lpaInterpretation.color === "red" ? "bg-red-50 border-red-200" :
                lpaInterpretation.color === "amber" ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
              }`}>
                <Badge color={lpaInterpretation.color}>Lp(a) {lpaInterpretation.level}</Badge>
                <span className="text-xs text-slate-700">{lpaInterpretation.note}</span>
              </div>
            )}
            {apoBInterpretation && (
              <div className={`flex items-start gap-2 p-2.5 rounded-lg border ${
                apoBInterpretation.color === "red" ? "bg-red-50 border-red-200" :
                apoBInterpretation.color === "amber" ? "bg-amber-50 border-amber-200" :
                apoBInterpretation.color === "blue" ? "bg-blue-50 border-blue-200" : "bg-emerald-50 border-emerald-200"
              }`}>
                <Badge color={apoBInterpretation.color}>ApoB {apoBInterpretation.level}</Badge>
                <span className="text-xs text-slate-700">{apoBInterpretation.note}</span>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── RECOMMENDATION ENGINE ── */}
        {((tab === "primary" && preventRisk !== null) || tab !== "primary") && rec && (
          <div className="space-y-4">
            <div className={`rounded-xl border-2 p-5 ${
              rec.color === "red" ? "bg-red-50 border-red-300" :
              rec.color === "amber" ? "bg-amber-50 border-amber-300" :
              rec.color === "emerald" ? "bg-emerald-50 border-emerald-300" :
              rec.color === "violet" ? "bg-violet-50 border-violet-300" :
              "bg-blue-50 border-blue-300"
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Clinical Recommendation</div>
              </div>
              <div className={`text-sm font-bold ${
                rec.color === "red" ? "text-red-800" :
                rec.color === "amber" ? "text-amber-800" :
                rec.color === "emerald" ? "text-emerald-800" :
                rec.color === "violet" ? "text-violet-800" :
                "text-blue-800"
              }`}>{rec.summary}</div>
            </div>

            {rec.goals && (
              <SectionCard title="Treatment Goals" accent={rec.color === "red" ? "red" : rec.color === "amber" ? "amber" : "blue"}>
                <GoalDisplay ldl={rec.goals.ldl} nonHdl={rec.goals.nonHdl} pctReduction={rec.goals.pct} currentLdl={ldlC || null} />
              </SectionCard>
            )}

            {/* Treatment Escalation */}
            <SectionCard title="Treatment Escalation Ladder" accent="blue">
              <div className="space-y-0">
                {[
                  { step: 1, label: "Lifestyle Optimization", detail: "Heart-healthy diet, regular physical activity, weight management, smoking cessation, healthy sleep", always: true },
                  { step: 2, label: "Maximally Tolerated Statin", detail: rec.intensity === "high" || rec.intensity === "moderate_to_high" ? "High-intensity: Atorvastatin 40–80 mg or Rosuvastatin 20–40 mg (≥50% LDL reduction)" : "Moderate-intensity: Atorvastatin 10–20, Rosuvastatin 5–10, Simvastatin 20–40, Pravastatin 40–80 (30–49% reduction)", always: rec.intensity !== "none" },
                  { step: 3, label: "Add Ezetimibe", detail: "10 mg daily — additional 15–20% LDL reduction", always: rec.escalation },
                  { step: 4, label: "Add Bempedoic Acid and/or PCSK9 Inhibitor", detail: "Bempedoic acid (Nexletol) ~18% LDL reduction; PCSK9i (evolocumab/alirocumab) ~60% further LDL reduction", always: rec.escalation },
                  { step: 5, label: "Consider Inclisiran", detail: "siRNA targeting PCSK9 — twice-yearly injection after initial doses; for further LDL lowering", always: rec.escalation && rec.goals?.ldl <= 55 },
                ].filter(s => s.always).map((s, i) => (
                  <div key={s.step} className="flex gap-3 group">
                    <div className="flex flex-col items-center">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                        i === 0 ? "bg-emerald-500" : "bg-blue-600"
                      }`}>{s.step}</div>
                      {i < [1,2,3,4,5].filter((_, j) => [
                        true, rec.intensity !== "none", rec.escalation, rec.escalation, rec.escalation && rec.goals?.ldl <= 55
                      ][j]).length - 1 && (
                        <div className="w-0.5 h-full bg-slate-200 my-0.5" />
                      )}
                    </div>
                    <div className="pb-4 flex-1">
                      <div className="text-sm font-bold text-slate-800">{s.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
              {tg !== "" && Number(tg) >= 150 && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="text-sm font-bold text-amber-800">Hypertriglyceridemia Management</div>
                  <div className="text-xs text-amber-700 mt-1">
                    TG {tg} mg/dL — {Number(tg) >= 500 ? "Severe: prioritize TG reduction to prevent pancreatitis. Fibrate and/or icosapent ethyl. If ≥1000 mg/dL, consider apoC-III inhibitor." : "Statins remain first-line for ASCVD risk. If TG remains elevated, consider fenofibrate or icosapent ethyl (REDUCE-IT) for further ASCVD risk reduction."}
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        )}

        {/* MONITORING */}
        <SectionCard title="Monitoring Schedule" accent="emerald">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-700 mb-1">After LLT Initiation</div>
              <div className="text-slate-600">Fasting lipid panel at 4–12 weeks, then every 3–12 months until stable at goal. Then annually.</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-700 mb-1">Safety Labs</div>
              <div className="text-slate-600">Hepatic panel at baseline. CK only if symptomatic. Monitor for new-onset DM with high-intensity statin.</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-700 mb-1">Screening Intervals</div>
              <div className="text-slate-600">Lipid panel at ages 9–11, 19–21, then ≥ every 5 years. Lp(a) at least once in adulthood.</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="font-bold text-slate-700 mb-1">When to Refer</div>
              <div className="text-slate-600">Suspected FH, refractory LDL despite combo therapy, TG ≥500 despite lifestyle, complex drug interactions, pregnancy planning.</div>
            </div>
          </div>
        </SectionCard>

        {/* Footer */}
        <div className="text-center py-4 space-y-1">
          <div className="text-xs text-slate-400">PREVENT-ASCVD coefficients: Khan SS et al. Circulation 2024;149:430-449 · Guideline: Blumenthal RS et al. JACC/Circulation 2026</div>
          <div className="text-xs text-slate-400">For clinical decision support only. Does not replace clinical judgment. Validate with the <a href="https://professional.heart.org/en/guidelines-and-statements/prevent-calculator" target="_blank" rel="noopener" className="text-blue-500 underline">AHA PREVENT™ Calculator</a>.</div>
        </div>
      </div>
    </div>
  );
}
