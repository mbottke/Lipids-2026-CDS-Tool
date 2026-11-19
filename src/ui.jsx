// src/ui.jsx — shared UI primitives (Clinical Instrument tokens: see index.css)
import { useState, useEffect, useId } from "react";

export const CHOL_F = 38.67;  // mg/dL per mmol/L, cholesterol
export const TG_F = 88.57;    // mg/dL per mmol/L, triglycerides

// Cholesterol value for display in the active unit system.
export const chol = (v, si) => (si ? (Number(v) / CHOL_F).toFixed(1) : v);
export const cholUnit = (si) => (si ? "mmol/L" : "mg/dL");

export function Toggle({ value, on, label, sub }) {
  return (
    <button onClick={() => on(!value)} type="button"
      className="flex items-center gap-2.5 py-2 active:opacity-70 cursor-pointer min-h-[44px]">
      <div className={`w-9 h-5 rounded-full relative transition-colors duration-150 shrink-0 ${value ? "bg-accent" : "bg-track-off"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-knob shadow-sm ring-1 ring-black/10 dark:ring-white/10 transition-transform duration-150 ${value ? "translate-x-[18px]" : "translate-x-0.5"}`}/>
      </div>
      <div className="leading-tight text-left">
        <span className={`text-[13px] font-medium ${value ? "text-ink" : "text-muted"}`}>{label}</span>
        {sub && <div className="text-[12px] text-muted">{sub}</div>}
      </div>
    </button>
  );
}

export function Num({ label, unit, value, on, min, max, step=1, ph }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>{label}</label>
      <div className="flex items-center border border-edge rounded-lg overflow-hidden input-glow transition-shadow duration-150 bg-surface">
        <input id={id} type="number" inputMode="decimal" value={value}
          onChange={e => on(e.target.value==="" ? "" : Number(e.target.value))}
          min={min} max={max} step={step} placeholder={ph}
          className="flex-1 w-full px-3 py-3 text-[16px] font-mono text-ink outline-none bg-transparent min-w-0 placeholder:text-faint" />
        {unit && <span className="pr-3 text-[13px] text-faint whitespace-nowrap">{unit}</span>}
      </div>
    </div>
  );
}

function SIField({ label, unit, factor, value, on, ph }) {
  const [txt, setTxt] = useState(value === "" ? "" : String(Math.round((Number(value) / factor) * 10) / 10));
  useEffect(() => { if (value === "") setTxt(""); }, [value]);
  const id = useId();
  const handle = t => {
    setTxt(t);
    if (t === "") { on(""); return; }
    const n = Number(t);
    if (!Number.isNaN(n)) on(Math.round(n * factor));
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={LABEL}>{label}</label>
      <div className="flex items-center border border-edge rounded-lg overflow-hidden input-glow transition-shadow duration-150 bg-surface">
        <input id={id} type="number" inputMode="decimal" value={txt} step={0.1} placeholder={ph}
          onChange={e => handle(e.target.value)}
          className="flex-1 w-full px-3 py-3 text-[16px] font-mono text-ink outline-none bg-transparent min-w-0 placeholder:text-faint" />
        <span className="pr-3 text-[13px] text-faint whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );
}

// Number field that switches to mmol/L entry when `si` is on (value stays mg/dL).
export function SINum({ si, factor, phSI, ...rest }) {
  if (!si) return <Num {...rest} />;
  return <SIField label={rest.label} unit="mmol/L" factor={factor} value={rest.value} on={rest.on} ph={phSI} />;
}

// Section head: the one level that uses tracked capitals.
export const HEAD = "text-[11px] font-semibold text-muted uppercase tracking-[0.12em]";
export function SectionHead({ children, className = "" }) {
  return <h2 className={`${HEAD} ${className}`}>{children}</h2>;
}
// Field label, sentence case.
export const LABEL = "text-[12px] font-medium text-muted";

const Chevron = ({ open }) => (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
);

// A page section. With onToggle the head is a button that opens and closes it.
export function Card({ title, children, open, onToggle, hint }) {
  if (typeof onToggle !== "function") {
    return (
      <section className="border-t border-line pt-5">
        {title && <SectionHead className="mb-3">{title}</SectionHead>}
        <div>{children}</div>
      </section>
    );
  }
  return (
    <section className="border-t border-line pt-5">
      <h2 className="-mt-3.5">
        <button type="button" onClick={onToggle} aria-expanded={!!open}
          className="w-full min-h-[44px] flex items-center justify-between gap-3 text-left cursor-pointer active:opacity-70">
          <span className={HEAD}>{title}</span>
          <span className="flex items-center gap-2 shrink-0 text-[12px] text-muted">{hint}<Chevron open={open} /></span>
        </button>
      </h2>
      {open && <div className="panel-in pt-1">{children}</div>}
    </section>
  );
}

// Label, dotted leader, value. The label wraps. The value never shrinks.
export function LeaderRow({ label, value, sub, strong, tone, lead }) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className={`min-w-0 text-[13px] text-ink ${strong ? "font-bold" : "font-medium"}`}>{lead}{label}</span>
        <div className="flex-1 border-b border-dotted mb-[3px] min-w-[12px]" style={{ borderColor: "var(--ruler)" }} />
        <span className={`font-mono text-[13px] font-semibold tabular-nums shrink-0 ${tone || "text-ink"}`}>{value}</span>
      </div>
      {sub && <div className="text-[12px] text-muted leading-snug">{sub}</div>}
    </div>
  );
}

export function Badge({ children, color="blue" }) {
  const s = { blue:"text-accent", red:"text-red-700 dark:text-red-400", amber:"text-amber-700 dark:text-amber-400",
    emerald:"text-emerald-700 dark:text-emerald-400", violet:"text-accent", slate:"text-muted" };
  return <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border border-edge bg-surface whitespace-nowrap ${s[color]}`}>{children}</span>;
}

// Small eyebrow heading used inside a section.
export function Eyebrow({ children, right }) {
  return (
    <div className="flex items-baseline justify-between gap-2 mb-1.5">
      <div className="text-[12px] font-bold text-ink">{children}</div>
      {right !== undefined && <div className="text-[12px] text-faint font-mono tabular-nums">{right}</div>}
    </div>
  );
}

// Checkbox row (same look as the risk-enhancer rows). `pts` shows a points value.
export function CheckRow({ checked, on, label, sub, pts, compact }) {
  return (
    <button type="button" onClick={on} aria-pressed={!!checked}
      className={`w-full flex items-start gap-2.5 rounded-lg border text-left transition-colors cursor-pointer active:opacity-70 ${compact ? "p-2 min-h-[44px]" : "p-2.5 min-h-[44px]"} ${
        checked ? "bg-accent-soft border-edge" : "bg-surface border-line"
      }`}>
      <div className={`mt-0.5 rounded border shrink-0 flex items-center justify-center ${compact ? "w-4 h-4" : "w-5 h-5"} ${
        checked ? "bg-accent border-accent" : "border-edge"
      }`}>{checked && <span className={`text-paper font-bold ${compact ? "text-[11px]" : "text-[13px]"}`}>✓</span>}</div>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-ink leading-tight ${compact ? "text-[13px]" : "text-[14px]"}`}>{label}</div>
        {sub && <div className="text-[12px] text-muted">{sub}</div>}
      </div>
      {pts !== undefined && <span className="shrink-0 mt-0.5 font-mono text-[12px] font-semibold text-muted tabular-nums">+{pts}</span>}
    </button>
  );
}

// Read-only row with the same shape as CheckRow, for conditions computed elsewhere.
export function AutoRow({ checked, label, sub, compact }) {
  return (
    <div className={`w-full flex items-start gap-2.5 rounded-lg border ${compact ? "p-2" : "p-2.5"} ${checked ? "bg-accent-soft border-edge" : "bg-surface border-line"}`}>
      <div className={`mt-0.5 rounded border shrink-0 flex items-center justify-center ${compact ? "w-4 h-4" : "w-5 h-5"} ${
        checked ? "bg-accent border-accent" : "border-edge border-dashed"
      }`}>{checked && <span className={`text-paper font-bold ${compact ? "text-[11px]" : "text-[13px]"}`}>✓</span>}</div>
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-ink leading-tight ${compact ? "text-[13px]" : "text-[14px]"}`}>{label}</div>
        {sub && <div className="text-[12px] text-muted">{sub}</div>}
      </div>
    </div>
  );
}

// Collapsible panel.
export function Disclosure({ open, on, label, hint, children }) {
  return (
    <div className="rounded-lg border border-line bg-surface overflow-hidden">
      <button type="button" onClick={on} aria-expanded={!!open}
        className="focus-inset w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left active:opacity-70 cursor-pointer min-h-[44px]">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        <span className="flex items-center gap-2 shrink-0 text-[12px] text-muted">
          {hint}
          <Chevron open={open} />
        </span>
      </button>
      {open && <div className="panel-in px-3 pb-3 pt-2.5 border-t border-line">{children}</div>}
    </div>
  );
}

// Route of administration: PO / SC / IV
export function Route({ r }) {
  const s = { PO: "text-muted", SC: "text-amber-700 dark:text-amber-400", IV: "text-red-700 dark:text-red-400" };
  return <span className={`inline-block align-middle px-1 rounded border border-edge bg-surface font-mono text-[11px] font-semibold leading-[14px] ${s[r] || s.PO}`}>{r}</span>;
}

// Class-of-recommendation tag.
export function Cor({ children }) {
  return <span className="ml-1 px-1 rounded border border-line font-mono text-[11px] font-medium text-faint whitespace-nowrap align-middle">{children}</span>;
}

// One LDL-C goal tier. `ldl` and `nh` are display strings in the active unit.
export function GoalTier({ active, ldl, nh, children }) {
  return (
    <div className={`rounded-lg border p-3 transition-colors ${active ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}>
      <div className="flex items-start gap-3">
        <div className="w-[92px] shrink-0">
          <div className={`font-mono font-semibold tabular-nums leading-none text-[20px] tracking-[-0.02em] ${active ? "text-ink" : "text-faint"}`}>&lt;{ldl}</div>
          <div className="text-[11px] text-muted mt-1 whitespace-nowrap">non-HDL-C &lt;{nh}</div>
          {active && <div className="mt-1.5 text-[11px] font-semibold text-ink">Goal</div>}
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

// Numbered step in a vertical flow (same marker as the treatment ladder).
export function Step({ n, title, tag, last, small, children }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`rounded-full flex items-center justify-center font-bold text-paper shrink-0 bg-ink ${small ? "w-5 h-5 text-[11px]" : "w-7 h-7 text-[13px]"}`}>{n}</div>
        {!last && <div className="flex-1 my-0.5 w-px bg-edge" />}
      </div>
      <div className={`flex-1 min-w-0 ${last ? "" : small ? "pb-3" : "pb-4"}`}>
        <div className={`flex items-center gap-x-1.5 gap-y-1 flex-wrap ${small ? "min-h-[20px]" : "min-h-[28px]"}`}>
          <span className={`font-bold text-ink leading-tight ${small ? "text-[13px]" : "text-[14px]"}`}>{title}</span>
          {tag}
        </div>
        <div className="text-[12px] text-body mt-1 space-y-1">{children}</div>
      </div>
    </div>
  );
}
