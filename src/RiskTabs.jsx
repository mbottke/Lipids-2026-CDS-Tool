// src/RiskTabs.jsx — ASCVD (secondary prevention) and Diabetes tabs
// 2026 ACC/AHA Dyslipidemia Guideline: §2.1 (very-high-risk definition), §4.2.6
// (secondary prevention), §4.2.8.8 (CKD), §4.2.4.3 (LDL ≥190 with ASCVD),
// §4.2.5 + Table 17 + Figures 1 and 9 (diabetes).
import { Card, Num, CheckRow, GoalTier } from "./ui.jsx";
import { VHR_MAJOR, VHR_FEATURES, DM_ENHANCERS } from "./recommend.js";

const sub = "text-slate-500 dark:text-[#5a8aaa]";
const head = "text-[11px] font-bold text-slate-500 dark:text-[#5a8aaa] uppercase tracking-wider";

// ── ASCVD tab ────────────────────────────────────────────────────────────────
export function AscvdTab({ ldl, setLdl, major, toggleMajor, feat, toggleFeat, status, other, toggleOther, ckdAuto, rec }) {
  const goal55 = rec.g.ldl === 55;
  const why = status.vhr
    ? (status.majors >= 2 ? `${status.majors} major events` : `1 major event + ${status.features} high-risk features`)
    : status.majors === 0
      ? "No major event checked"
      : `1 major event + ${status.features} high-risk feature${status.features === 1 ? "" : "s"} (needs ≥2)`;
  return (
    <Card title="Clinical ASCVD — Risk Level" accent={goal55 ? "red" : "orange"}>
      <p className="text-[11px] text-slate-400 dark:text-[color:var(--accent-sub)] mb-3">All ASCVD → high-intensity statin. Classify to set the LDL-C goal.</p>
      <Num label="Current LDL-C" unit="mg/dL" value={ldl} on={setLdl} min={0} max={400} ph="Current" />

      <div className="mt-3 space-y-1.5">
        <GoalTier active={goal55} ldl={55} nh={85} tone="red">
          <div className="text-[13px] font-bold text-slate-800 dark:text-[#d0e4f0] leading-tight">Very high risk</div>
          <div className={`text-[11px] ${sub}`}>≥2 major events, or 1 major event + ≥2 high-risk features. Also: ASCVD with CKD stage ≥3, or with LDL ≥190 / HeFH.</div>
          {goal55 && <div className="text-[11px] font-bold text-red-700 dark:text-red-400 mt-0.5">{status.vhr ? why : rec.txt.split(" — ")[0]}</div>}
        </GoalTier>
        <GoalTier active={!goal55} ldl={70} nh={100} tone="amber">
          <div className="text-[13px] font-bold text-slate-800 dark:text-[#d0e4f0] leading-tight">Not very high risk</div>
          <div className={`text-[11px] ${sub}`}>Lowering further to &lt;55 (non-HDL &lt;85) is reasonable.</div>
          {!goal55 && <div className="text-[11px] font-bold text-amber-700 dark:text-amber-400 mt-0.5">{why}</div>}
        </GoalTier>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className={head}>Major ASCVD events</div>
          <div className={`text-[11px] font-black font-mono ${sub}`}>{status.majors}</div>
        </div>
        {VHR_MAJOR.map(e => <CheckRow key={e.id} tone="red" checked={!!major[e.id]} on={() => toggleMajor(e.id)} label={e.l} sub={e.d} />)}
      </div>

      <div className="mt-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <div className={head}>High-risk features</div>
          <div className={`text-[11px] font-black font-mono ${sub}`}>{status.features}</div>
        </div>
        {VHR_FEATURES.map(e => <CheckRow key={e.id} tone="amber" checked={!!feat[e.id]} on={() => toggleFeat(e.id)} label={e.l} sub={e.d} />)}
      </div>

      <div className="mt-3 space-y-1.5">
        <div className={head}>Other conditions with a &lt;55 goal</div>
        <CheckRow tone="red" checked={!!other.ckd || !!ckdAuto} on={() => toggleOther("ckd")}
          label="CKD stage ≥3" sub={ckdAuto ? `Auto: ${ckdAuto}` : "eGFR <60 mL/min/1.73 m²"} />
        <CheckRow tone="red" checked={!!other.severe} on={() => toggleOther("severe")}
          label="LDL-C ≥190 or HeFH" sub="Severe hypercholesterolemia with clinical ASCVD" />
      </div>
    </Card>
  );
}

// ── Diabetes tab ─────────────────────────────────────────────────────────────
export function DiabetesTab({ age, setAge, ldl, setLdl, enhs, toggleEnh, enhCount, f, toggleF, risk10, rec }) {
  const tier = rec.tier; // "base" | "high" | "young" | "older"
  const a = age === "" ? null : Number(age);
  const riskKnown = risk10 !== null;
  const riskHigh = riskKnown ? risk10 >= 10 : !!f.prevent;
  return (
    <Card title="Diabetes Pathway" accent="violet">
      <div className="bg-violet-50 dark:bg-sky-500/15 border border-violet-200 dark:border-sky-500/30 rounded-lg p-3 mb-3">
        <div className="text-[14px] font-bold text-violet-800 dark:text-sky-300">Age 40–75 → Statin, Whatever the Risk Estimate</div>
        <div className="text-[11px] text-violet-600 dark:text-sky-400 mt-1">Moderate-intensity for everyone; high-intensity when a factor below applies. The same floor applies to CKD stage ≥3 and to HIV on stable antiretroviral therapy.</div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Num label="Age" unit="yr" value={age} on={setAge} min={20} max={100} ph="40–75" />
        <Num label="Current LDL-C" unit="mg/dL" value={ldl} on={setLdl} min={0} max={400} ph="Current" />
      </div>

      {(tier === "young" || tier === "older") && (
        <div className="mt-3 rounded-lg border border-blue-200 dark:border-sky-500/30 bg-blue-50 dark:bg-sky-500/15 p-2.5 text-[11px] text-slate-700 dark:text-[#d0e4f0]">
          {tier === "young"
            ? <>Age {a}: the 40–75 tiers below do not apply. A moderate-intensity statin may be reasonable with a diabetes-specific risk enhancer; from age 30, use PREVENT-ASCVD on the PRIMARY tab.</>
            : <>Age {a}: the 40–75 tiers below do not apply. Starting a moderate-intensity statin may be reasonable after a benefit–risk discussion when life expectancy is ≥2.5 years; continue a statin already tolerated.</>}
        </div>
      )}

      <div className="mt-3">
        <div className={`${head} mb-1.5`}>LDL-C Goal (age 40–75) — what lowers it</div>
        <div className="space-y-1.5">
          <GoalTier active={tier === "base"} ldl={100} nh={130} tone="violet">
            <div className="text-[12px] font-bold text-slate-800 dark:text-[#d0e4f0] leading-tight">Diabetes alone</div>
            <div className={`text-[11px] ${sub}`}>Moderate-intensity statin, ≥30–49% LDL-C reduction.</div>
          </GoalTier>
          <GoalTier active={tier === "high"} ldl={70} nh={100} tone="red">
            <div className={`text-[11px] font-bold mb-1 ${sub}`}>High-intensity statin (≥50% reduction) with any ONE:</div>
            <div className="space-y-1">
              <CheckRow compact tone="red" checked={!!f.rf} on={() => toggleF("rf")}
                label="Multiple ASCVD risk factors"
                sub="Not enumerated by the guideline — e.g., hypertension, smoking, low HDL-C, older age" />
              <div className={`flex items-start gap-2.5 rounded-lg border p-2 ${enhCount > 0 ? "bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30" : "bg-white dark:bg-[#111a24] border-slate-200 dark:border-[#1a2835]"}`}>
                <div className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${enhCount > 0 ? "bg-red-500 border-red-500" : "border-slate-300 dark:border-[#1e3040]"}`}>{enhCount > 0 && <span className="text-white text-[10px] font-bold">✓</span>}</div>
                <div>
                  <div className="text-[12px] font-bold text-slate-800 dark:text-[#d0e4f0] leading-tight">Diabetes-specific risk enhancer</div>
                  <div className={`text-[10px] ${sub}`}>{enhCount > 0 ? `${enhCount} checked below` : "Check any that apply below"}</div>
                </div>
              </div>
              {riskKnown ? (
                <div className={`flex items-start gap-2.5 rounded-lg border p-2 ${riskHigh ? "bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30" : "bg-white dark:bg-[#111a24] border-slate-200 dark:border-[#1a2835]"}`}>
                  <div className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center ${riskHigh ? "bg-red-500 border-red-500" : "border-slate-300 dark:border-[#1e3040]"}`}>{riskHigh && <span className="text-white text-[10px] font-bold">✓</span>}</div>
                  <div>
                    <div className="text-[12px] font-bold text-slate-800 dark:text-[#d0e4f0] leading-tight">PREVENT-ASCVD ≥10%</div>
                    <div className={`text-[10px] ${sub}`}>Calculated with diabetes from the PRIMARY tab inputs: {risk10}%</div>
                  </div>
                </div>
              ) : (
                <CheckRow compact tone="red" checked={!!f.prevent} on={() => toggleF("prevent")}
                  label="PREVENT-ASCVD ≥10%" sub="Check here, or complete the PRIMARY tab inputs to calculate it" />
              )}
            </div>
            <div className={`text-[10px] mt-1.5 leading-snug ${sub}`}>At PREVENT-ASCVD ≥10%, adding ezetimibe or a PCSK9 mAb to reach &lt;70 may be reasonable.</div>
          </GoalTier>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        <div className={`${head} mb-1`}>Diabetes-Specific Risk Enhancers</div>
        {DM_ENHANCERS.map(e => <CheckRow key={e.id} tone="violet" checked={!!enhs[e.id]} on={() => toggleEnh(e.id)} label={e.l} sub={e.d} />)}
      </div>
    </Card>
  );
}
