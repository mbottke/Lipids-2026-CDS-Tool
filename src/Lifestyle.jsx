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
  { k: "Swap saturated → unsaturated fat", d: "5% of daily energy (e.g. butter, fatty meat → olive/canola oil, nuts, fish)", v: "5–10%" },
  { k: "Viscous fiber 7.5 g/day", d: "Psyllium ≈10 g/day, oats, barley, legumes", v: "6–9%" },
  { k: "Plant sterols / stanols 2 g/day", d: "Fortified foods; supplement capsules no better than placebo (SPORT)", v: "5–8%" },
  { k: "Plant protein 30 g/day", d: "Soy, legumes — replacing animal protein", v: "3–5%" },
  { k: "Weight loss 5%", d: "If excess adiposity", v: "3–5%" },
  { k: "Exercise ≥150 min/week", d: "Aerobic + resistance 2 days/week", v: "≈7 mg/dL" },
];

export function LifestyleLDL() {
  const sub = "text-slate-400 dark:text-[#5a8aaa]";
  return (
    <div className="mt-1">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#5a8aaa] mb-1">
        <span>Intervention</span><span>LDL-C ↓</span>
      </div>
      <div className="space-y-1 pl-2 border-l-2 border-slate-200 dark:border-[#1a2835]">
        {ROWS.map(r => (
          <div key={r.k} className="flex items-baseline justify-between gap-2">
            <div className="min-w-0">
              <span className="text-slate-700 dark:text-[#d0e4f0]">{r.k}</span>
              <span className={sub}> · {r.d}</span>
            </div>
            <span className="shrink-0 font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">{r.v}</span>
          </div>
        ))}
        <div className="flex items-baseline justify-between gap-2 pt-1 border-t border-slate-200 dark:border-[#1a2835]">
          <div className="min-w-0">
            <span className="font-bold text-slate-700 dark:text-[#d0e4f0]">All four diet changes together</span>
            <span className={sub}> · Portfolio pattern, free-living</span>
          </div>
          <span className="shrink-0 font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">12–15%</span>
        </div>
      </div>
      <div className={`mt-1.5 leading-snug ${sub}`}>
        <span className="font-bold text-red-600 dark:text-red-400">Raises LDL-C:</span> ketogenic / high-saturated-fat low-carb diets (can reach ≥190), trans fat, unfiltered coffee.{" "}
        <span className="font-bold">No LDL-C effect:</span> smoking cessation, alcohol reduction — still do both.{" "}
        <span className="font-bold">Skip:</span> supplements, including red yeast rice, fish oil, garlic (COR 3: No Benefit).
      </div>
    </div>
  );
}
