# SDD ledger — plan: docs/superpowers/plans/2026-11-19-presentation-passes-overview.md

Request (verbatim): "Do additional passes using the pass skill and utilizing the help of codex in order to consider additional design, organizational, visual, aesthetic, formatting, and phrasing/wording improvements."

## Setup
- Setup: base is git commit 9474118 (tag pass-base-2026-11-19) on branch claude/cvd-fh-bp-additions. Ruling: git is the base snapshot and the rollback, no scratchpad copy — the repo has full history — cost if wrong: none, `git diff pass-base-2026-11-19` reproduces the package.
- Setup: Ruling: three passes by area (copy and formatting, organization, visual), measured and diverged once across the whole app, one whole-series review — the areas share every component, so per-area audits would repeat the same 40 screenshots — cost if wrong: less per-area divergence.
- Setup: Ruling: the production "Clinical Instrument" design (tokens in src/index.css, IBM Plex Mono readouts, hairline section rules) is the house style and is refined, not replaced — it is the user's own shipped design — cost if wrong: a bolder redesign was wanted.
- Setup: Ruling: no change to clinical logic, thresholds, doses or citations in these passes — scope is presentation — cost if wrong: none, logic changes go in their own change.
- Setup: Ruling: Codex is reached through `@codex review` comments on mbottke/Lipids-2026-CDS-Tool#1 (comment 7000076333) — no Codex CLI or OpenAI credentials exist in this container — cost if wrong: Codex input is limited to what a PR review returns.
- Setup: Ruling: ship means push to the PR branch and verify the Vercel preview. Merge to main (production) stays with the user — standing rule from earlier in the session.
- Setup: unavailable here: frontend-design skill, prompts-chat library, WebKit build, memory directory, assign_task. Substitutes: design:design-critique and design:ux-copy guidance, Chromium only. Named in the report.

## Never-list (verbatim, from the full-pass taste reference)
- "No semicolons, em dashes, en dashes, middle-dot strings or exclamation marks. "To" for ranges, commas for asides."
- "Sentence case. Name things by what the person sees, not how they're built. An action keeps its name throughout."
- "Dislikes: orange, browns, most greens, dark purple, dark reds, and tinted washes that read as haze."
- "works from 320 px with no horizontal scroll / visible keyboard focus / reduced motion respected / 4.5:1 text in both lights / real touch targets of 44 px"

## Phase 1 — Measure
- Audit: scratchpad/pass/audit.md (A1 to A19), 40 variants, 104 contact sheets.
