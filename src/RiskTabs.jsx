// src/RiskTabs.jsx — ASCVD (secondary prevention) and Diabetes tabs
// 2026 ACC/AHA Dyslipidemia Guideline: §2.1 (very-high-risk definition), §4.2.6
// (secondary prevention), §4.2.8.8 (CKD), §4.2.4.3 (LDL ≥190 with ASCVD),
// §4.2.5 + Table 17 + Figures 1 and 9 (diabetes).
import { Card, Num, SINum, CheckRow, AutoRow, GoalTier, Eyebrow, CHOL_F, chol } from "./ui.jsx";
import { VHR_MAJOR, VHR_FEATURES, DM_ENHANCERS } from "./recommend.js";

// ── ASCVD tab ────────────────────────────────────────────────────────────────
export function AscvdTab({ si, ldl, setLdl, major, toggleMajor, feat, toggleFeat, status, other, toggleOther, ckdAuto, rec }) {
  const goal55 = rec.g.ldl === 55;
  const why = status.vhr
    ? (status.majors >= 2 ? `${status.majors} major events` : `1 major event + ${status.features} high-risk features`)
    : status.majors === 0
      ? "No major event checked"
      : `1 major event + ${status.features} high-risk feature${status.features === 1 ? "" : "s"} (needs 2)`;
  const why55 = status.vhr ? why : (other.ckd || ckdAuto) ? "ASCVD with CKD stage ≥3" : "ASCVD with LDL-C ≥190 or HeFH";
  return (
    <Card title="Clinical ASCVD risk level">
      <p className="text-[12px] text-muted mb-3">All clinical ASCVD: high-intensity statin. The risk level sets the LDL-C goal.</p>
      <SINum si={si} factor={CHOL_F} phSI="Current" label="Current LDL-C" unit="mg/dL" value={ldl} on={setLdl} min={0} max={400} ph="Current" />

      <div className="mt-3 space-y-2">
        <GoalTier active={goal55} ldl={chol(55, si)} nh={chol(85, si)}>
          <div className={`text-[14px] font-bold leading-tight ${goal55 ? "text-red-800 dark:text-red-300" : "text-ink"}`}>Very high risk</div>
          <div className="text-[12px] text-muted mt-0.5">Two or more major events, or one major event plus two or more high-risk features. Also ASCVD with CKD stage ≥3, LDL-C ≥190, or HeFH.</div>
          {goal55 && <div className="text-[12px] font-semibold text-ink mt-1">{why55}</div>}
        </GoalTier>
        <GoalTier active={!goal55} ldl={chol(70, si)} nh={chol(100, si)}>
          <div className="text-[14px] font-bold text-ink leading-tight">Not very high risk</div>
          <div className="text-[12px] text-muted mt-0.5">Lowering further to &lt;{chol(55, si)} (non-HDL-C &lt;{chol(85, si)}) is reasonable.</div>
          {!goal55 && <div className="text-[12px] font-semibold text-ink mt-1">{why}</div>}
        </GoalTier>
      </div>

      <div className="mt-4 space-y-1.5">
        <Eyebrow right={status.majors}>Major ASCVD events</Eyebrow>
        {VHR_MAJOR.map(e => <CheckRow key={e.id} checked={!!major[e.id]} on={() => toggleMajor(e.id)} label={e.l} sub={e.d} />)}
      </div>

      <div className="mt-4 space-y-1.5">
        <Eyebrow right={status.features}>High-risk features</Eyebrow>
        {VHR_FEATURES.map(e => <CheckRow key={e.id} checked={!!feat[e.id]} on={() => toggleFeat(e.id)} label={e.l} sub={e.d} />)}
      </div>

      <div className="mt-4 space-y-1.5">
        <Eyebrow>Other conditions with a &lt;{chol(55, si)} goal</Eyebrow>
        <CheckRow checked={!!other.ckd || !!ckdAuto} on={() => toggleOther("ckd")}
          label="CKD stage ≥3" sub={ckdAuto ? `From the Primary tab: ${ckdAuto}` : "eGFR <60 mL/min/1.73 m²"} />
        <CheckRow checked={!!other.severe} on={() => toggleOther("severe")}
          label="LDL-C ≥190 or HeFH" sub="Severe hypercholesterolemia with clinical ASCVD" />
      </div>
    </Card>
  );
}

// ── Diabetes tab ─────────────────────────────────────────────────────────────
export function DiabetesTab({ si, age, setAge, ldl, setLdl, enhs, toggleEnh, enhCount, f, toggleF, risk10, rec }) {
  const tier = rec.tier; // "base" | "high" | "young" | "older"
  const a = age === "" ? null : Number(age);
  const riskKnown = risk10 !== null;
  const riskHigh = riskKnown ? risk10 >= 10 : !!f.prevent;
  return (
    <Card title="Diabetes pathway">
      <p className="text-[12px] text-muted mb-3">Statin at age 40–75, whatever the risk estimate. Moderate intensity for everyone, high intensity when a factor below applies. The same floor applies to CKD stage ≥3 and to HIV on stable antiretroviral therapy.</p>
      <div className="grid grid-cols-2 gap-3">
        <Num label="Age" unit="yr" value={age} on={setAge} min={20} max={100} ph="40–75" />
        <SINum si={si} factor={CHOL_F} phSI="Current" label="Current LDL-C" unit="mg/dL" value={ldl} on={setLdl} min={0} max={400} ph="Current" />
      </div>

      {(tier === "young" || tier === "older") && (
        <div className="panel-in mt-3 rounded-lg border border-line bg-surface p-3 text-[12px] text-body leading-snug">
          {tier === "young"
            ? <>Age {a}: the 40–75 tiers below do not apply. A moderate-intensity statin may be reasonable with a diabetes-specific risk enhancer. From age 30, use PREVENT-ASCVD on the Primary tab.</>
            : <>Age {a}: the 40–75 tiers below do not apply. Starting a moderate-intensity statin may be reasonable after a benefit-risk discussion when life expectancy is at least 2.5 years. Continue a statin that is already tolerated.</>}
        </div>
      )}

      <div className="mt-4">
        <Eyebrow>LDL-C goal, age 40–75</Eyebrow>
        <div className="space-y-2">
          <GoalTier active={tier === "base"} ldl={chol(100, si)} nh={chol(130, si)}>
            <div className="text-[14px] font-bold text-ink leading-tight">Diabetes alone</div>
            <div className="text-[12px] text-muted mt-0.5">Moderate-intensity statin, 30–49% LDL-C reduction.</div>
          </GoalTier>
          <GoalTier active={tier === "high"} ldl={chol(70, si)} nh={chol(100, si)}>
            <div className="text-[14px] font-bold text-ink leading-tight">With added risk</div>
            <div className="text-[12px] text-muted mt-0.5 mb-1.5">High-intensity statin, ≥50% reduction, with any one of:</div>
            <div className="space-y-1">
              <CheckRow compact checked={!!f.rf} on={() => toggleF("rf")}
                label="Multiple ASCVD risk factors"
                sub="Not enumerated by the guideline. Examples: hypertension, smoking, low HDL-C, older age" />
              <AutoRow compact checked={enhCount > 0} label="Diabetes-specific risk enhancer"
                sub={enhCount > 0 ? `${enhCount} checked below` : "Check any that apply below"} />
              {riskKnown ? (
                <AutoRow compact checked={riskHigh} label="PREVENT-ASCVD ≥10%"
                  sub={`Calculated with diabetes from the Primary tab inputs: ${risk10}%`} />
              ) : (
                <CheckRow compact checked={!!f.prevent} on={() => toggleF("prevent")}
                  label="PREVENT-ASCVD ≥10%" sub="Check here, or complete the Primary tab inputs to calculate it" />
              )}
            </div>
            <div className="text-[12px] text-faint mt-1.5 leading-snug">At PREVENT-ASCVD ≥10%, adding ezetimibe or a PCSK9 mAb to reach the goal may be reasonable.</div>
          </GoalTier>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        <Eyebrow right={enhCount}>Diabetes-specific risk enhancers</Eyebrow>
        {DM_ENHANCERS.map(e => <CheckRow key={e.id} checked={!!enhs[e.id]} on={() => toggleEnh(e.id)} label={e.l} sub={e.d} />)}
      </div>
    </Card>
  );
}
