// src/ui.jsx — shared UI primitives (Clinical Instrument tokens: see index.css)
import { useState, useEffect, useId, useRef } from "react";

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
// `stage` is the route word this section starts ("Assess", "Refine", "Also check"), shown in ink before the name.
export const HEAD = "text-[11px] font-semibold text-muted uppercase tracking-[0.12em]";
const Stage = ({ name }) => (<><span className="text-ink">{name}</span>{" "}<span aria-hidden="true" className="text-faint">/</span>{" "}</>);
export function SectionHead({ children, className = "", stage }) {
  return <h2 className={`${HEAD} ${className}`}>{stage && <Stage name={stage} />}{children}</h2>;
}
// Field label, sentence case.
export const LABEL = "text-[12px] font-medium text-muted";
// A list of check rows: hairlines between rows, no box per row.
export const ROWS = "divide-y divide-line border-y border-line";

const Chevron = ({ open }) => (
  <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
    className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6"/></svg>
);

// A page section. With onToggle the head is a button that opens and closes it.
// `id` is the anchor the route line scrolls to. `endClose` adds a closing row after a long panel.
export function Card({ title, children, open, onToggle, hint, id, stage, endClose }) {
  const headRef = useRef(null);
  if (typeof onToggle !== "function") {
    return (
      <section id={id} className="border-t border-line pt-5">
        {title && <SectionHead className="mb-3" stage={stage}>{title}</SectionHead>}
        <div>{children}</div>
      </section>
    );
  }
  // Closing from the end of a long panel: the head comes back into view and takes focus.
  const closeFromEnd = () => {
    onToggle();
    headRef.current?.focus({ preventScroll: true });
    requestAnimationFrame(() => headRef.current?.scrollIntoView({ block: "start" }));
  };
  return (
    <section id={id} className="border-t border-line pt-5">
      <h2 className="-mt-3.5">
        <button ref={headRef} type="button" onClick={onToggle} aria-expanded={!!open}
          className="w-full min-h-[44px] flex items-center justify-between gap-3 text-left cursor-pointer active:opacity-70 rounded-lg">
          <span className={HEAD}>{stage && <Stage name={stage} />}{title}</span>
          <span className="flex items-center gap-2 shrink-0 text-[12px] text-muted">{hint}<Chevron open={open} /></span>
        </button>
      </h2>
      {open && (
        <div className="panel-in pt-1">
          {children}
          {endClose && (
            <button type="button" onClick={closeFromEnd} aria-label={`Close ${String(title).toLowerCase()}`}
              className="mt-1 w-full min-h-[44px] flex items-center justify-center gap-2 text-[12px] font-semibold text-muted hover:text-ink cursor-pointer rounded-lg">
              Close<Chevron open />
            </button>
          )}
        </div>
      )}
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

// Small heading used inside a section.
export function Eyebrow({ children, right }) {
  return (
    <div className="flex items-baseline justify-between gap-2 mb-1.5">
      <div className="text-[12px] font-bold text-ink">{children}</div>
      {right !== undefined && <div className="text-[12px] text-muted font-mono tabular-nums">{right}</div>}
    </div>
  );
}

// Checkbox row. No box of its own: the checkbox carries the state. `pts` shows a points value.
export function CheckRow({ checked, on, label, sub, pts, compact }) {
  return (
    <button type="button" onClick={on} aria-pressed={!!checked}
      className={`group w-full flex items-start gap-3 text-left cursor-pointer active:opacity-70 rounded-lg ${compact ? "py-2.5 min-h-[44px]" : "py-3 min-h-[48px]"}`}>
      <div className={`mt-0.5 w-5 h-5 rounded-[4px] border-[1.5px] shrink-0 flex items-center justify-center ${
        checked ? "bg-accent border-accent" : "border-faint group-hover:border-ink"
      }`}>{checked && <span className="text-paper font-bold text-[13px] leading-none">✓</span>}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-ink leading-tight ${checked ? "font-bold" : "font-semibold"} ${compact ? "text-[13px]" : "text-[14px]"}`}>{label}</div>
        {sub && <div className="text-[12px] text-muted mt-0.5">{sub}</div>}
      </div>
      {pts !== undefined && <span className="shrink-0 mt-0.5 font-mono text-[12px] font-semibold text-muted tabular-nums">+{pts}</span>}
    </button>
  );
}

// Read-only row with the same shape as CheckRow, for conditions computed elsewhere.
export function AutoRow({ checked, label, sub, compact }) {
  return (
    <div className={`w-full flex items-start gap-3 ${compact ? "py-2.5 min-h-[44px]" : "py-3 min-h-[48px]"}`}>
      <div className={`mt-0.5 w-5 h-5 rounded-[4px] shrink-0 flex items-center justify-center ${
        checked ? "bg-muted" : "border-[1.5px] border-dashed border-faint"
      }`}>{checked && <span className="text-paper font-bold text-[13px] leading-none">✓</span>}</div>
      <div className="flex-1 min-w-0">
        <div className={`text-ink leading-tight ${checked ? "font-bold" : "font-semibold"} ${compact ? "text-[13px]" : "text-[14px]"}`}>{label}</div>
        {sub && <div className="text-[12px] text-muted mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// Collapsible row. Flat: a hairline above and no box. Opening one never closes another.
export function Disclosure({ open, on, label, hint, children }) {
  const ref = useRef(null);
  const toggle = () => {
    const wasOpen = open;
    on();
    // Closing a panel whose row has scrolled above the view brings the row back at once.
    if (wasOpen) requestAnimationFrame(() => {
      const el = ref.current; if (!el) return;
      const sc = el.closest("[data-scroll], dialog");
      if (el.getBoundingClientRect().top < (sc ? sc.getBoundingClientRect().top : 0)) el.scrollIntoView({ block: "start" });
    });
  };
  return (
    <div className="border-t border-line">
      <button ref={ref} type="button" onClick={toggle} aria-expanded={!!open}
        className="w-full min-h-[44px] flex items-center justify-between gap-3 py-2 text-left active:opacity-70 cursor-pointer rounded-lg">
        <span className="text-[13px] font-semibold text-ink">{label}</span>
        <span className="flex items-center gap-2 shrink-0 text-[12px] text-muted">{hint}<Chevron open={open} /></span>
      </button>
      {open && <div className="panel-in pb-4 pt-1">{children}</div>}
    </div>
  );
}

// Reference content in a sheet: the bottom of the screen on phones, the right edge on desktop.
// A native modal dialog: the page behind does not move, Escape closes it, focus returns to the trigger.
export function InfoSheet({ open, title, onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) { d.showModal(); d.querySelector("[data-sheet-body]")?.scrollTo(0, 0); }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} data-sheet className="sheet" aria-labelledby="sheet-title" onClose={onClose} onCancel={onClose}
      onClick={e => { if (e.target === ref.current) onClose(); }}>
      <div className="flex flex-col min-h-0 w-full">
        <div className="shrink-0 min-h-[52px] flex items-center justify-between gap-3 pl-4 sm:pl-5 pr-1 border-b border-line">
          <h2 id="sheet-title" className="text-[14px] font-bold text-ink">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close"
            className="focus-inset w-11 h-11 flex items-center justify-center text-[14px] font-bold text-muted hover:text-ink cursor-pointer rounded-lg">✕</button>
        </div>
        {/* Focusable so it can be scrolled from the keyboard in browsers that do not do this on their own. */}
        <div data-sheet-body tabIndex={0} className="focus-inset flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 sm:px-5 pt-4 text-[13px] text-ink leading-snug focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          style={{ paddingBottom: "calc(1.25rem + var(--sab))" }}>
          {open ? children : null}
        </div>
      </div>
    </dialog>
  );
}

// Opens a sheet. The "?" mark is the shared trigger for reference content.
export function InfoButton({ label, on, small }) {
  return (
    <button type="button" onClick={on} aria-label={label} aria-haspopup="dialog"
      className={`hit rounded-full border border-faint text-muted font-bold flex items-center justify-center shrink-0 cursor-pointer hover:border-ink hover:text-ink active:scale-95 transition-colors ${small ? "w-5 h-5 text-[11px]" : "w-6 h-6 text-[13px]"}`}>?</button>
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
// Only the active tier is drawn as a box. The others keep the same geometry with a clear border.
export function GoalTier({ active, ldl, nh, children }) {
  return (
    <div className={`rounded-lg border p-3 transition-colors ${active ? "border-accent bg-accent-soft" : "border-transparent"}`}>
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
