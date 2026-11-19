// src/Lifestyle.jsx — lifestyle rung of the treatment ladder: expected LDL-C change
// Sources:
//  · % estimates: NLA 2023 Clinical Perspective, Kirkpatrick CF et al.
//    J Clin Lipidol 2023;17:428-51 (LDL-C lowering table)
//  · Portfolio pattern: Jenkins DJA et al. JAMA 2011;306:831-9 (−13.8% at 6 mo);
//    Chiavaroli L et al. Prog Cardiovasc Dis 2018;61:43-53 (≈17%)
//  · Exercise: Smart NA et al. Sports Med 2025;55:67-78 (−7.2 mg/dL, 148 RCTs),
//    cited in the 2026 ACC/AHA Dyslipidemia Guideline §4.1.4
//  · Recommendations, supplements (COR 3: No Benefit), ketogenic diet: 2026 guideline §4.1
//  · LDL-neutral: smoking cessation (Maeda K, Prev Med 2003;37:283-90),
//    alcohol (Brien SE, BMJ 2011;342:d636)

const ROWS = [
  { k: "Saturated → unsaturated fat", d: "Swap 5% of daily energy: butter and fatty meat for olive or canola oil, nuts, fish", v: "5–10%" },
  { k: "Viscous fiber 7.5 g/day", d: "Psyllium ≈10 g/day, oats, barley, legumes", v: "6–9%" },
  { k: "Plant sterols or stanols 2 g/day", d: "Fortified foods. Supplement capsules were no better than placebo (SPORT)", v: "5–8%" },
  { k: "Plant protein 30 g/day", d: "Soy, legumes, replacing animal protein", v: "3–5%" },
  { k: "Weight loss 5%", d: "If excess adiposity", v: "3–5%" },
  { k: "Exercise ≥150 min/week", d: "Aerobic plus resistance 2 days/week", v: "≈7 mg/dL" },
];

function Row({ k, d, v, strong }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className={`text-[12px] text-ink shrink-0 ${strong ? "font-bold" : "font-medium"}`}>{k}</span>
        <div className="flex-1 border-b border-dotted mb-[3px] min-w-[12px]" style={{ borderColor: "var(--ruler)" }} />
        <span className="font-mono text-[12px] font-semibold text-ink tabular-nums shrink-0">{v}</span>
      </div>
      <div className="text-[10.5px] text-faint leading-snug">{d}</div>
    </div>
  );
}

export function LifestyleLDL() {
  return (
    <div className="mt-1">
      <div className="flex justify-between text-[10px] text-faint mb-1">
        <span>Intervention</span><span>Expected LDL-C reduction</span>
      </div>
      <div className="space-y-1.5 pl-2 border-l-2 border-line">
        {ROWS.map(r => <Row key={r.k} {...r} />)}
        <div className="border-t border-line pt-1.5">
          <Row strong k="All four diet changes together" d="Portfolio pattern, free-living" v="12–15%" />
        </div>
      </div>
      <div className="mt-1.5 text-[10.5px] text-muted leading-snug">
        <b className="text-red-700 dark:text-red-400">Raises LDL-C:</b> ketogenic or high-saturated-fat low-carb diets (can reach ≥190), trans fat, unfiltered coffee.{" "}
        <b>No LDL-C effect:</b> smoking cessation, alcohol reduction. Still do both.{" "}
        <b>Skip:</b> supplements, including red yeast rice, fish oil, garlic (COR 3: No Benefit).
      </div>
    </div>
  );
}
