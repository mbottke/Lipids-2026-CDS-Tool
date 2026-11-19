// src/ui.jsx — shared touch-optimized UI primitives

// ── UI Components (touch-optimized) ─────────────────────────────────────────

export function Toggle({ value, on, label, sub }) {
  return (
    <button onClick={() => on(!value)} type="button"
      className="flex items-center gap-2.5 py-2 active:opacity-70 cursor-pointer min-h-[44px]">
      <div className={`w-11 h-6 rounded-full relative transition-colors duration-200 shrink-0 ${value ? "bg-blue-600 dark:bg-sky-500" : "bg-slate-300 dark:bg-[#1a2835]"}`}>
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white toggle-knob transition-transform duration-200 ${value ? "translate-x-[22px]" : "translate-x-0.5"}`}/>
      </div>
      <div className="leading-tight">
        <span className="text-[14px] text-slate-700 dark:text-[#d0e4f0]">{label}</span>
        {sub && <div className="text-[10px] text-slate-400 dark:text-[#3d6580]">{sub}</div>}
      </div>
    </button>
  );
}

export function Num({ label, unit, value, on, min, max, step=1, ph, preserveCase }) {
  return (
    <div className="flex flex-col gap-1">
      <label className={`text-[11px] font-bold text-slate-400 dark:text-white/90 tracking-wider ${preserveCase ? "" : "uppercase"}`}>{label}</label>
      <div className="flex items-center border border-slate-200 dark:border-[#1e3040] rounded-lg overflow-hidden input-glow transition-shadow duration-200 bg-white dark:bg-[#0a1018]">
        <input type="number" inputMode="decimal" value={value}
          onChange={e => on(e.target.value==="" ? "" : Number(e.target.value))}
          min={min} max={max} step={step} placeholder={ph}
          className="flex-1 px-3 py-3 text-[16px] text-slate-800 dark:text-[#d0e4f0] outline-none bg-transparent min-w-0 placeholder:text-slate-400 dark:placeholder:text-[#3d6580]" />
        {unit && <span className="pr-3 text-[13px] text-slate-400 dark:text-[#3d6580] whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  );
}

export function Card({ title, accent="blue", children }) {
  const bdr = { blue:"border-l-blue-600 dark:border-l-sky-400", amber:"border-l-amber-500 dark:border-l-amber-400", red:"border-l-red-500 dark:border-l-red-400",
    emerald:"border-l-emerald-600 dark:border-l-emerald-400", violet:"border-l-violet-600 dark:border-l-sky-400", orange:"border-l-orange-500 dark:border-l-orange-400" };
  const glowColors = {
    blue:   { light:"59, 130, 246",  dark:"56, 189, 248" },
    amber:  { light:"245, 158, 11", dark:"245, 158, 11" },
    red:    { light:"239, 68, 68",  dark:"248, 113, 113" },
    emerald:{ light:"16, 185, 129", dark:"52, 211, 153" },
    violet: { light:"139, 92, 246", dark:"56, 189, 248" },
    orange: { light:"249, 115, 22", dark:"251, 146, 60" },
  };
  const accentSub = {
    blue:"#7dd3fc", amber:"#fcd34d", red:"#fca5a5", emerald:"#6ee7b7",
    violet:"#7dd3fc", orange:"#fdba74",
  };
  const gc = glowColors[accent] || glowColors.blue;
  return (
    <div className={`bg-white dark:bg-[#111a24] rounded-xl border border-slate-200/80 dark:border-[#1a2835] border-l-4 ${bdr[accent]} card-shadow`}
      style={{"--glow-rgb": gc.light, "--glow-rgb-dark": gc.dark}}>
      {title && <div className="px-4 pt-4 pb-1"><h3 className="text-[13px] font-black text-slate-800 dark:text-white uppercase tracking-wide">{title}</h3></div>}
      <div className="px-4 pb-4" style={{"--accent-sub": accentSub[accent]}}>{children}</div>
    </div>
  );
}

export function Badge({ children, color="blue" }) {
  const s = { blue:"bg-blue-50 text-blue-700 border-blue-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/30", red:"bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
    amber:"bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30", emerald:"bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
    violet:"bg-violet-50 text-violet-700 border-violet-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30", slate:"bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#1a2835] dark:text-[#5a8aaa] dark:border-[#1e3040]" };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold border ${s[color]}`}>{children}</span>;
}

// Checkbox row (same look as the risk-enhancer rows). `pts` shows a points chip.
export function CheckRow({ checked, on, label, sub, tone="amber", pts, compact }) {
  const tones = {
    amber:  { on:"bg-amber-50 dark:bg-amber-500/10 border-amber-300 dark:border-amber-500/30", box:"bg-amber-500 border-amber-500" },
    red:    { on:"bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30", box:"bg-red-500 border-red-500" },
    violet: { on:"bg-violet-50 dark:bg-sky-500/15 border-violet-300 dark:border-sky-500/30", box:"bg-violet-500 border-violet-500" },
    blue:   { on:"bg-blue-50 dark:bg-sky-500/15 border-blue-300 dark:border-sky-500/30", box:"bg-blue-600 border-blue-600 dark:bg-sky-500 dark:border-sky-500" },
  };
  const t = tones[tone] || tones.amber;
  return (
    <button type="button" onClick={on} aria-pressed={!!checked}
      className={`w-full flex items-start gap-2.5 rounded-lg border text-left transition-colors cursor-pointer active:opacity-70 ${compact ? "p-2 min-h-[40px]" : "p-2.5 min-h-[44px]"} ${
        checked ? t.on : "bg-white dark:bg-[#111a24] border-slate-200 dark:border-[#1a2835]"
      }`}>
      <div className={`mt-0.5 rounded border-2 shrink-0 flex items-center justify-center ${compact ? "w-4 h-4" : "w-5 h-5"} ${
        checked ? t.box : "border-slate-300 dark:border-[#1e3040]"
      }`}>{checked && <span className={`text-white font-bold ${compact ? "text-[10px]" : "text-[13px]"}`}>✓</span>}</div>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-slate-800 dark:text-[#d0e4f0] leading-tight ${compact ? "text-[12px]" : "text-[14px]"}`}>{label}</div>
        {sub && <div className={`text-slate-500 dark:text-[#5a8aaa] ${compact ? "text-[10px]" : "text-[11px]"}`}>{sub}</div>}
      </div>
      {pts !== undefined && (
        <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-black font-mono tabular-nums bg-slate-100 text-slate-500 dark:bg-[#1a2835] dark:text-[#7a9ab5]">+{pts}</span>
      )}
    </button>
  );
}

// Collapsible section (same look as the "Risk if optimized" rows).
export function Disclosure({ open, on, label, hint, children }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-[#1a2835] bg-white dark:bg-[#111a24] overflow-hidden">
      <button type="button" onClick={on} aria-expanded={!!open}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left active:opacity-70 cursor-pointer min-h-[44px]">
        <span className="text-[12px] font-bold text-slate-700 dark:text-[#d0e4f0]">{open ? "▾" : "▸"} {label}</span>
        {hint && <span className="text-[10px] font-semibold text-slate-400 dark:text-[#5a8aaa] text-right shrink-0">{hint}</span>}
      </button>
      {open && <div className="px-3 pb-3 pt-2 border-t border-slate-200 dark:border-[#1a2835]">{children}</div>}
    </div>
  );
}

// Route-of-administration chip: PO / SC / IV
export function Route({ r }) {
  const s = {
    PO: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/30",
    SC: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30",
    IV: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30",
  };
  return <span className={`inline-block align-middle px-1 rounded border text-[9px] font-black tracking-wide leading-[14px] ${s[r] || s.PO}`}>{r}</span>;
}

// One LDL-C goal tier (used on the LDL ≥190, ASCVD and Diabetes tabs).
export function GoalTier({ active, ldl, nh, tone="blue", children }) {
  const tones = {
    blue:   "border-blue-400 bg-blue-50 dark:border-sky-400/60 dark:bg-sky-500/10",
    amber:  "border-amber-400 bg-amber-50 dark:border-amber-400/60 dark:bg-amber-500/10",
    red:    "border-red-400 bg-red-50 dark:border-red-400/60 dark:bg-red-500/10",
    violet: "border-violet-400 bg-violet-50 dark:border-sky-400/60 dark:bg-sky-500/15",
  };
  const num = { blue:"text-blue-700 dark:text-sky-400", amber:"text-amber-700 dark:text-amber-400",
    red:"text-red-700 dark:text-red-400", violet:"text-violet-700 dark:text-sky-300" };
  return (
    <div className={`rounded-lg border-2 p-2.5 transition-colors ${active ? tones[tone] : "border-slate-200 dark:border-[#1a2835] bg-white dark:bg-[#111a24]"}`}>
      <div className="flex items-start gap-3">
        <div className="w-[58px] shrink-0 text-center">
          <div className={`text-[20px] font-black font-mono tabular-nums leading-none ${active ? num[tone] : "text-slate-400 dark:text-[#3d6580]"}`} style={{fontFeatureSettings:'"zero" 0'}}>&lt;{ldl}</div>
          <div className="text-[9px] font-bold mt-1 text-slate-500 dark:text-[#5a8aaa]">non-HDL &lt;{nh}</div>
          {active && <div className={`mt-1 text-[8px] font-black uppercase tracking-widest ${num[tone]}`}>Goal</div>}
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
