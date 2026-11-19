# Presentation Passes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the plan first on every tab, make every piece of text legible and every control reachable, and hold the wording to one style sheet.

**Architecture:** Three passes over one React app. Pass 1 changes tokens and primitives in `src/index.css` and `src/ui.jsx`. Pass 2 adds `src/Plan.jsx` and reorders `src/App.jsx`. Pass 3 edits strings. No clinical logic changes.

**Tech Stack:** React 19, Vite 6, Tailwind 3. Tests are plain node scripts plus Playwright scripts run against `npx vite --port 4180 --strictPort`.

**Spec:** `docs/superpowers/specs/2026-11-19-presentation-passes-design.md`

## Series

| Pass | Area | Tasks |
|---|---|---|
| 1 | Legibility: contrast, type, semantics, targets, 320 px | 1 to 5 |
| 2 | Organization: Plan block, order, rail, bar, collapses, Codex fixes | 6 to 8 |
| 3 | Wording and formatting | 9 |

## Global Constraints

- Never-list, verbatim: "No semicolons, em dashes, en dashes, middle-dot strings or exclamation marks. "To" for ranges, commas for asides." Ruled for this project: en dashes stay inside closed numeric ranges in labels (house usage, 54 in the shipped design), and middle dots stay only as separators between short label items.
- "Sentence case. Name things by what the person sees, not how they're built. An action keeps its name throughout."
- "works from 320 px with no horizontal scroll / visible keyboard focus / reduced motion respected / 4.5:1 text in both lights / real touch targets of 44 px"
- No change to thresholds, doses, percentages, grades or citations.
- Test commands: `for t in test-*.mjs; do node $t; done`, `npx vite build`, `node docs/superpowers/audits/2026-11-19/scripts/{audit,clip,layout}.cjs`.

## Review Focus

1. A patient with no LDL-C entered: the Plan shows goals and no status line, and the Plan bar shows no "Now".
2. Primary tab with incomplete inputs: no Plan, no bar, no empty rail, and the desktop grid does not leave a blank column.
3. mmol/L selected: every threshold in the Plan, bar, tiers and statin-intolerance panel is in mmol/L, and the at-goal boundary is judged on the mg/dL value.
4. A condition set automatically and also checked by hand in the blood pressure section, then the automatic source removed: the manual choice still shows.
5. Keyboard only: the Plan bar, disclosures and the single unit button are reachable, named, and show focus.

Each is pinned in `layout.cjs` by the task that owns the code (6, 6, 8, 8, 4).

---

### Task 1: Tokens and contrast

**Files:** Modify `src/index.css:13-14,38-39`. Create `test-copy.mjs`.

- [ ] RED: `test-copy.mjs` section "contrast" parses `--paper`, `--surface`, `--accent-soft`, `--muted`, `--faint` from both blocks of `src/index.css`, composites the soft fill over paper and surface, and asserts every ratio ≥ 4.5. Fails on base (2.35 to 4.32).
- [ ] Set light `--faint: #676c72`, `--muted: #555a61`. Dark `--faint: #9aa1a9`, `--muted: #b4bbc3`.
- [ ] GREEN: `node test-copy.mjs`. `audit.cjs` reports no `color-contrast`.

### Task 2: Type floor and capitals

**Files:** Modify every `src/*.jsx`. Test `test-copy.mjs` section "type".

- [ ] RED: assert no `text-[9px]`, `text-[9.5px]`, `text-[10px]`, `text-[10.5px]` in `src/`, and that `uppercase` appears only in `src/ui.jsx` (`Card`) and the `RailHead` in `src/App.jsx`.
- [ ] Apply the mapping in one pass, largest first so nothing maps twice: 12 → 13, then 10.5 and 11 → 12, then 9, 9.5, 10 → 11. Then restore 11 px on chips and tags only (`Badge`, `Route`, `Cor`, ruler ticks, section heads).
- [ ] Remove `uppercase` and tracking from `Num`, `SIField`, `Eyebrow`, `GoalTier` "Goal", the DLCN "Points" label and the goals cells. Add `RailHead` for the rail block heads.
- [ ] GREEN, then screenshot 390 and 320 and read them.

### Task 3: Semantics

**Files:** Modify `index.html:5`, `src/ui.jsx` (`Card`, `Num`, `SIField`), `src/App.jsx` shell.

- [ ] RED: `audit.cjs` lists `label`, `meta-viewport`, `landmark-one-main`, `region`, `heading-order`.
- [ ] `<header>`, `<nav aria-label="Patient group">` with `aria-current="page"` on the active tab, `<main>`. `Card` renders `<h2>`. `Num` and `SIField` use `useId` for `htmlFor` and `id`. Viewport: `width=device-width, initial-scale=1.0, viewport-fit=cover`.
- [ ] GREEN: zero axe violations at 390 and 1440, both themes, all tabs.

### Task 4: Targets and the header

**Files:** Modify `src/index.css` (`.hit`), `src/App.jsx` header and "?" buttons, `src/ui.jsx` (`CheckRow` compact), `src/SevereTab.jsx` chips, `src/BloodPressure.jsx`.

- [ ] RED: `layout.cjs` "targets" (zero controls under 44 px at 390, all tabs, disclosures open) and "header-320" (title box does not intersect the controls, title not clipped).
- [ ] Apply the header rules in spec section A. All fixed-height controls become `h-11` or `min-h-[44px]`. Glyph buttons get `.hit`.
- [ ] GREEN. Pin Review Focus 5: tab to the unit button and the Plan bar, assert an accessible name and a visible outline.

### Task 5: LeaderRow and 320 px

**Files:** Modify `src/ui.jsx` (add `LeaderRow({ label, sub, value, tone })`), `src/Lifestyle.jsx`, `src/StatinIntolerance.jsx`, `src/BloodPressure.jsx`, `src/App.jsx` (`OutcomeRow`, drivers), `src/ui.jsx` (`Step` tag wraps).

- [ ] RED: `clip.cjs 320` reports 17.
- [ ] Replace the five hand-built rows with `LeaderRow`. Label `min-w-0`, value `shrink-0`, leader `min-w-[12px]` and hidden below 360 px.
- [ ] GREEN: `clip.cjs 320` and `clip.cjs 390` report 0.

### Task 6: Plan block, order, rail, bar

**Files:** Create `src/Plan.jsx`. Modify `src/App.jsx`.

**Interfaces:**
- `Plan({ rec, ldl, si })` renders the block in spec section B. `ldl` is mg/dL or `""`.
- `PlanBar({ rec, ldl, si, onGo })` renders the 44 px bar.
- `goalStatus(ldl, goal)` in `src/recommend.js` returns `null` when `ldl` is blank, else `{ atGoal: ldl < goal, above: ldl - goal, needed: percent }`.

- [ ] RED: `test-recommend.mjs` "goal status": `goalStatus(100, 100).atGoal === false`, `goalStatus(99, 100).atGoal === true`, `goalStatus("", 100) === null`, `goalStatus(152, 100)` → `{ atGoal:false, above:52, needed:34 }`.
- [ ] RED: `layout.cjs` "plan-position": Plan top ≤ 1500 px on Primary and ≤ 1000 px on the other tabs at 390 (base 3004, 1534, 1399, 3169). "rail": at 1440 × 800 every tab has the Plan inside `aside`, and the copy button can be scrolled into view. "scroll-reset". "plan-bar". Review Focus 1 and 2.
- [ ] Build `Plan`, `PlanBar`, `goalStatus`. `RiskRail` takes `children` rendered after the 30-year block. Reorder per the spec table. Grid on every tab. `IntersectionObserver` on the inline Plan with the scroll container as root drives the bar. `useEffect` on `tab` scrolls to top.
- [ ] GREEN, then screenshots at 390, 1024 and 1440.

### Task 7: Collapses

**Files:** Modify `src/App.jsx`.

- [ ] RED: `layout.cjs` "lifestyle-closed" (statin plan: lifestyle rows not visible, button `aria-expanded="false"`. lifestyle-only plan: visible). "enhancers" (low risk: closed with hint "0 checked". borderline: open. manual close survives a change of age).
- [ ] Wrap `<LifestyleLDL />` and the enhancers in `Disclosure`. State `null | boolean` with `null` meaning automatic.
- [ ] GREEN.

### Task 8: Codex findings

**Files:** Modify `src/BloodPressure.jsx:98-103`, `src/StatinIntolerance.jsx`, `src/App.jsx` (pass `si`).

- [ ] RED: `layout.cjs` "bp-auto" (Diabetes tab: the Diabetes row is not a button and reads "Set by: Diabetes tab". Primary tab: it is a button). Review Focus 4. "si-panel" (mmol/L: panel text contains "LDL-C below 1.8" and no "<70"). Review Focus 3.
- [ ] `AutoRow` when `auto.x` is set, else `CheckRow`. `StatinIntolerance({ onClose, group, si })` formats thresholds with `chol` and `cholUnit`.
- [ ] GREEN.

### Task 9: Wording

**Files:** Modify strings in `src/*.js`, `src/*.jsx`. Test `test-copy.mjs` section "style sheet". Update expectations in `test-recommend.mjs` and `test-clinical.mjs` where a sentence changes.

- [ ] RED: banned patterns in non-comment source: `PCSK9i`, `LLT`, `med(s)`, `mm Hg`, `–<`, `above target`, `target`, `lipid panel`, `(or on Rx)`, ` CI:`, `~` before a digit, a semicolon inside a string or JSX text, `non-HDL` not followed by `-C`, `Male `/`Female ` in threshold strings, a `<Cor>` whose text does not match `^COR (1|2a|2b|3)`.
- [ ] Apply the 12 rules and these rewrites:

| Where | Now | Becomes |
|---|---|---|
| `recommend.js` diabetes in Primary | "… is indicated whatever the risk estimate, with an LDL goal below 100 mg/dL." | "… to LDL below 100 mg/dL, whatever the risk estimate." |
| `recommend.js` borderline with enhancers | "… A moderate-intensity statin is reasonable, with an LDL goal below 100 mg/dL." | "… A moderate-intensity statin to LDL below 100 mg/dL is reasonable." |
| ladder rung 3 | "Add ezetimibe" | "Ezetimibe" |
| toggles | "Statin", "BP med(s)" | "On statin", "On BP medication" |
| `bp.js` | "Above goal on therapy: intensify" | "Above goal on therapy. Intensify" |
| blood pressure | "Treat at ≥130/80 without a lifestyle trial if any" | "Start drug therapy at ≥130/80 if any apply" |
| ASCVD lead | "All ASCVD: high-intensity statin. Classification sets the LDL-C target." | "All clinical ASCVD: high-intensity statin. The risk level sets the LDL-C goal." |
| FH step 4 tag | `<Cor>` "If FH is confirmed or LDL-C ≥190 persists" | `<Badge color="slate">` "Once FH is confirmed or LDL-C stays ≥190" |
| FH step 3 tag | "Recommended · COR 1", "Reasonable · COR 2a" | "COR 1", "COR 2a" |
| triglycerides | "Fenofibrate CI: eGFR <30 …" | "Fenofibrate is contraindicated with eGFR <30 …" |
| monitoring | "After starting LLT", "… acceptable; fasting if TG ≥400." | "Lipid-lowering therapy", "… acceptable, fasting if TG ≥400." |
| referral head | "Referral to lipid specialist" | "Refer to a lipid specialist" |
| horizon note | "The 10-year estimate is X while the 30-year estimate is already elevated. That pattern argues for addressing risk factors now rather than waiting." | "The 30-year estimate is elevated while the 10-year estimate is X. This favors addressing risk factors now." |
| severe lead | "No risk calculation needed. Set the goal here, then work through the FH steps below." | "No risk calculation needed. Set the goal, then work through the FH steps." |
| cuts | "Replaces the Pooled Cohort Equations." (first of two), "Each step states what to order and what usually follows.", `hint="5 steps"`, "due to interactions in the PREVENT model" | removed |

- [ ] Monitoring and screening rows: `grid grid-cols-[76px_1fr] gap-x-2`. Bullets: `<ul className="list-disc pl-4 marker:text-faint space-y-0.5">`. Screening order: From age 2, Ages 9–11, From age 19, Lp(a). The two referral bullets joined by a middle dot become four. The ASCVD order note moves above the rungs. Ladder parentheticals read "≈18% added to a statin" and take `whitespace-nowrap`.
- [ ] GREEN: `node test-copy.mjs`, all suites, `layout.cjs`.
