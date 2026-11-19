// src/Plan.jsx — the plan: one block, in the same place on every tab.
// Recommendation sentence, the three goals, and whether the patient is at goal.
// State color appears only on the status line.
import { SectionHead, chol, cholUnit } from "./ui.jsx";
import { goalStatus, inUnit } from "./recommend.js";

const INTENSITY = { high: "High-intensity statin", moderate: "Moderate-intensity statin", lifestyle: "Lifestyle first", none: "No statin now" };
const TONE = { ok: "text-emerald-700 dark:text-emerald-400", alert: "text-red-700 dark:text-red-400" };

// Difference between two mg/dL values, in the active unit.
const gap = (mgdl, si) => (si ? (mgdl / 38.67).toFixed(1) : Math.round(mgdl));

function statusText(st, ldl, goal, si) {
  const now = `LDL-C ${chol(ldl, si)} ${cholUnit(si)}`;
  if (st.atGoal) return `At goal. ${now}, goal <${chol(goal, si)}.`;
  if (st.above <= 0) return `Not at goal. ${now}, goal <${chol(goal, si)}.`;
  return `Not at goal. ${now}, ${gap(st.above, si)} above goal. ${st.needed}% reduction needed.`;
}

function Cell({ v, k }) {
  return (
    <div className="px-2 py-2.5 text-center min-w-0">
      <div className="font-mono text-[20px] font-semibold text-ink tabular-nums leading-none">{v}</div>
      <div className="text-[12px] text-muted mt-1">{k}</div>
    </div>
  );
}

// where: "inline" (main column) | "rail" (desktop right rail)
export function Plan({ rec, ldl, si, where }) {
  const st = rec.g ? goalStatus(ldl, rec.g.ldl) : null;
  return (
    <section data-plan={where} aria-label="Plan" className="rounded-lg border border-edge bg-surface p-4">
      <SectionHead className="mb-1.5">Plan</SectionHead>
      <p data-plan-text className="text-[15px] font-bold leading-snug text-ink">{inUnit(rec.txt, si)}</p>
      {rec.note && <p className="text-[12px] text-muted mt-1">{inUnit(rec.note, si)}</p>}
      {rec.g && (
        <div className="grid grid-cols-3 divide-x divide-line border-y border-line mt-3">
          <Cell v={<>&lt;{chol(rec.g.ldl, si)}</>} k="LDL-C" />
          <Cell v={<>&lt;{chol(rec.g.nh, si)}</>} k="non-HDL-C" />
          <Cell v={<>&ge;{rec.g.p}%</>} k="reduction" />
        </div>
      )}
      {st && (
        <p className={`flex items-start gap-2 text-[13px] font-semibold leading-snug mt-3 ${st.atGoal ? TONE.ok : TONE.alert}`}>
          <span aria-hidden="true" className="mt-[6px] w-1.5 h-1.5 rounded-full bg-current shrink-0" />
          <span>{statusText(st, ldl, rec.g.ldl, si)}</span>
        </p>
      )}
    </section>
  );
}

// Pinned bar shown on small screens while the plan is out of view. Pressing it goes to the plan.
export function PlanBar({ rec, ldl, si, onGo }) {
  const st = rec.g ? goalStatus(ldl, rec.g.ldl) : null;
  const goal = rec.g ? `LDL-C goal <${chol(rec.g.ldl, si)}` : null;
  const now = st ? `Now ${chol(ldl, si)}` : null;
  const how = INTENSITY[rec.int] || "";
  return (
    <button type="button" data-planbar onClick={onGo}
      aria-label={["Go to plan", goal, now, how].filter(Boolean).join(". ")}
      className="lg:hidden absolute bottom-0 inset-x-0 z-10 min-h-[44px] px-4 sm:px-5 flex items-center gap-3 bg-surface border-t border-edge text-left cursor-pointer active:opacity-80"
      style={{ paddingBottom: "var(--sab)" }}>
      {goal && <span className="font-mono text-[13px] font-semibold text-ink tabular-nums whitespace-nowrap">{goal}</span>}
      {now && <span className={`font-mono text-[13px] font-semibold tabular-nums whitespace-nowrap ${st.atGoal ? TONE.ok : TONE.alert}`}>{now}</span>}
      <span className="flex-1 min-w-0 truncate text-[12px] text-muted">{how}</span>
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted"><path d="m6 15 6-6 6 6"/></svg>
    </button>
  );
}
