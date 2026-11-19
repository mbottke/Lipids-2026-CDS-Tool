# Presentation audit, 2026-11-19

`audit.md` holds the measurements taken before and after the presentation passes.

The scripts need Playwright with Chromium and a dev server on port 4180:

```bash
npx vite --port 4180 --strictPort
```

```bash
node docs/superpowers/audits/2026-11-19/scripts/layout.cjs
```

```bash
node docs/superpowers/audits/2026-11-19/scripts/flows.cjs
```

```bash
node docs/superpowers/audits/2026-11-19/scripts/clip.cjs 320
```

```bash
AXE_PATH=/path/to/axe.min.js node docs/superpowers/audits/2026-11-19/scripts/audit.cjs /tmp/shots
```

- `layout.cjs`: plan position, rail, plan bar, collapses, touch targets, header at 320 px, type floor, unit handling, keyboard.
- `flows.cjs`: clinical flows through the UI (PREVENT reference cases, CAC rule, ASCVD risk level, diabetes tiers, FH score, units, reset).
- `clip.cjs <width>`: content that spills out of or is clipped by its container.
- `audit.cjs <outDir>`: axe-core, overflow and screenshots for 4 tabs x 5 widths x 2 themes.
- `heights.cjs`: plan position and page height in the default state.
