# Clarity Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make total CVD findable, stop "more info" from moving the page, state each tab's purpose and route, and draw boxes only where they mean something.

**Architecture:** Presentation only. A risk grid replaces three risk blocks in `src/App.jsx`. A native `<dialog>` sheet in `src/ui.jsx` hosts reference content. `Disclosure`, `CheckRow`, `AutoRow` and `GoalTier` in `src/ui.jsx` are restyled once and every caller inherits it.

**Tech Stack:** React 19, Vite 6, Tailwind 3, plain CSS. Checks are node scripts and Playwright scripts against `npx vite --port 4180 --strictPort`.

**Spec:** `docs/superpowers/specs/2026-11-19-clarity-pass-design.md`

## Global Constraints

- No change to clinical logic, thresholds, doses, grades, percentages or recommendation sentences. No content removed.
- Copy: sentence case, short declarative sentences, no em dashes, no semicolons, no exclamation marks. En dashes only inside closed numeric ranges in labels.
- Floors: 4.5:1 text, 3:1 control borders, no sentence under 12 px, controls at least 44 x 44 px, nothing spilling at 320 px, focus ring never clipped, reduced motion respected.
- Commands: `for t in test-*.mjs; do node $t; done`, `npx vite build`, and in `docs/superpowers/audits/`: `2026-11-19-clarity/clarity.cjs`, `2026-11-19/scripts/{layout,flows,scrollbars}.cjs`, `clip.cjs 320`, `clip.cjs 390`.

## Review Focus

1. A sheet opened from inside the scrolling rail, or while the plan bar is showing: the page and the rail keep their scroll positions after it closes.
2. Keyboard only: a sheet traps focus, Escape closes it, focus lands on the trigger, and the trigger is still on screen.
3. Risk grid with missing pieces: no BMI, age 60 and above, risk not yet computed, mmol/L selected.
4. A long list without boxes at 390 px: each sub-line reads as belonging to the row above it, and a pressed row is found again at a glance.
5. Reset with a sheet open, and switching tabs with a sheet open.

Each is pinned in `clarity.cjs` by tasks 2, 2, 1, 5, 2.

---

### Task 1: PREVENT risk grid

**Files:** Modify `src/App.jsx` (`RiskBlock`, `OutcomeRow`, `RiskRail`). Test `clarity.cjs` "risk grid".

**Interfaces:** `RiskRail` keeps its props. `pct(v)` formats a percentage with one decimal.

- [ ] RED: at 1243 x 700 the "Total CVD" 10-year value is inside the rail's visible area (base y=841 of 700). At 390 it is within 900 px of the top (base 1410). The grid text reads `Total CVD … 5.0% … 27.7%` and `Heart failure … 1.6% … 12.7%`. One head "PREVENT risk". Without BMI the row reads "Enter BMI". At age 62 the 30-year cells read "–".
- [ ] Build the grid per spec section A. "30-year outlook" holds the horizon sentence, "If optimized" and drivers.
- [ ] GREEN. `layout.cjs` rail checks still pass at 1280 x 720, 1366 x 768 and 1024 x 600.

### Task 2: Info sheet

**Files:** Modify `src/ui.jsx` (add `InfoSheet({ open, title, onClose, children })`), `src/index.css` (dialog), `src/App.jsx` (one `info` state replaces six booleans, three inline panels become components), `src/StatinIntolerance.jsx` (no own header, AACE section always shown).

- [ ] RED: for each of the five triggers, pressing it opens `dialog[open]` with the right title, `main` scrollHeight and scrollTop are unchanged (base: +423 to +1782 px), Escape closes it, focus is on the trigger. Backdrop press closes. At 390 the sheet's bottom edge is the window's bottom and its top is at least 56 px down. At 1243 it is 480 px wide at the right edge. Reset and a tab switch both close it. Review Focus 1, 2, 5.
- [ ] Build. `showModal()` on open, `close()` on close, `onCancel` and `onClose` both call `onClose`.
- [ ] GREEN.

### Task 3: One disclosure family

**Files:** Modify `src/ui.jsx` (`Disclosure`, `Card` end-close), `src/BloodPressure.jsx` (independent sub-sections, flat summary), `src/SevereTab.jsx` (point bands always shown).

- [ ] RED: with "Drug therapy" open, pressing "Follow-up and labs" moves the pressed row 0 px (base -920) and both stay open. Scrolling to the end of the open risk enhancers and pressing "Close" leaves the section head in view. No disclosure is a bordered box.
- [ ] Build: `Disclosure` flat row. On close, if the trigger's top is above the scroll area's top, `scrollIntoView({ block: "start" })` at once. `Card` with `onToggle` and `endClose` renders the closing row.
- [ ] GREEN.

### Task 4: Purpose and route

**Files:** Modify `src/ui.jsx` (`SectionHead` gains `stage`, `Card` gains `id` and `stage`), `src/App.jsx` (`TabIntro`, renames), `src/RiskTabs.jsx`, `src/SevereTab.jsx`, `src/BloodPressure.jsx`.

- [ ] RED: each tab's first text is its intro sentence from spec section D at 14 px or more. `nav[aria-label="On this tab"]` lists the stage words for the tab. Pressing "Treat" brings "Treatment ladder" into view. Section heads match the renamed list. At 1243 the route has no "Plan" link.
- [ ] Build.
- [ ] GREEN. Update head names in `layout.cjs` and `flows.cjs`.

### Task 5: Boxes

**Files:** Modify `src/ui.jsx` (`CheckRow`, `AutoRow`, `GoalTier`), `src/App.jsx` (enhancer rows use `CheckRow`, note boxes, non-HDL-C row), `src/RiskTabs.jsx`, `src/SevereTab.jsx`, `src/BloodPressure.jsx`.

- [ ] RED: boxes at 390 px, default state: Primary ≤ 20, ASCVD ≤ 10, Diabetes ≤ 10, LDL ≥190 ≤ 14 (base 35, 23, 20, 27), none nested. An unchecked checkbox border is at least 3:1 against its background (base about 1.4:1). Review Focus 4: a checked row's checkbox is filled ink and its label is bold.
- [ ] Build per spec section E.
- [ ] GREEN. Then the whole suite, `clip.cjs` at 320 and 390, axe, and screenshots read at 100%.
