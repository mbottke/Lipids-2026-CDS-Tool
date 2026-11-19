#!/usr/bin/env node
// test-copy.mjs — presentation rules that can be checked from source.
// Spec: docs/superpowers/specs/2026-11-19-presentation-passes-design.md
//   contrast   every text token ≥ 4.5:1 on every background, both themes
//   type       no text class under 11 px; capitals at one level only
//   viewport   pinch zoom is not disabled
//   style      the 12-rule wording style sheet
import { readFileSync, readdirSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (cond, name, detail = "") => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name}${detail ? "\n       " + detail : ""}`); }
};

const FILES = readdirSync("src").filter(f => /\.(jsx?|css)$/.test(f)).map(f => `src/${f}`);
const raw = Object.fromEntries(FILES.map(f => [f, readFileSync(f, "utf8")]));
// Source with comments removed, so a rule is judged on what ships.
// Line numbers are kept: a removed comment leaves its newlines behind.
const blank = m => m.replace(/[^\n]/g, "");
const stripComments = s => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
  .replace(/\/\*[\s\S]*?\*\//g, blank)
  .replace(/^\s*\/\/.*$/gm, "")
  .replace(/([^:"'`\\])\/\/[^\n"'`]*$/gm, "$1");
const code = Object.fromEntries(Object.entries(raw).map(([f, s]) => [f, stripComments(s)]));
const JS = FILES.filter(f => !f.endsWith(".css"));

// Every place a pattern appears, as "file:line text".
function hits(re, files = JS) {
  const out = [];
  for (const f of files) code[f].split("\n").forEach((line, i) => {
    if (re.test(line)) out.push(`${f}:${i + 1} ${line.trim().slice(0, 90)}`);
  });
  return out;
}
const none = (re, name, files) => { const h = hits(re, files); ok(h.length === 0, name, h.slice(0, 4).join("\n       ") + (h.length > 4 ? `\n       … ${h.length} in all` : "")); };

// ── contrast ────────────────────────────────────────────────────────────────
console.log("\n═══ Contrast: text tokens on every background (≥ 4.5:1) ═══");
const css = raw["src/index.css"];
const block = sel => css.slice(css.indexOf(sel + " {"), css.indexOf("}", css.indexOf(sel + " {")));
const tok = (b, name) => (b.match(new RegExp(`--${name}:\\s*([^;]+);`)) || [])[1]?.trim();
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (rgba, bg) => { const m = rgba.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/); const a = Number(m[4]); const b = rgb(bg);
  return "#" + [1, 2, 3].map((k, i) => Math.round(Number(m[k]) * a + b[i] * (1 - a)).toString(16).padStart(2, "0")).join(""); };
for (const [theme, sel] of [["light", ":root"], ["dark", ".dark"]]) {
  const b = block(sel);
  const paper = tok(b, "paper"), surface = tok(b, "surface"), soft = tok(b, "accent-soft");
  const bgs = { paper, surface, "selected row on paper": over(soft, paper), "selected row on surface": over(soft, surface) };
  for (const t of ["muted", "faint"]) {
    const worst = Object.entries(bgs).map(([k, bg]) => [k, ratio(tok(b, t), bg)]).sort((p, q) => p[1] - q[1])[0];
    ok(worst[1] >= 4.5, `${theme} --${t} ${tok(b, t)}: lowest ${worst[1].toFixed(2)}:1 (${worst[0]})`);
  }
}
{ const l = block(":root"), d = block(".dark");
  ok(ratio(tok(l, "muted"), tok(l, "paper")) > ratio(tok(l, "faint"), tok(l, "paper")), "light: muted is stronger than faint");
  ok(ratio(tok(d, "muted"), tok(d, "paper")) > ratio(tok(d, "faint"), tok(d, "paper")), "dark: muted is stronger than faint"); }

// ── type ────────────────────────────────────────────────────────────────────
console.log("\n═══ Type: 11 px floor, capitals at one level ═══");
none(/text-\[(9|9\.5|10|10\.5)px\]/, "no text class under 11 px");
{ const n = JS.reduce((a, f) => a + (code[f].match(/\buppercase\b/g) || []).length, 0);
  ok(n === 1, `"uppercase" appears once, in the shared section head (found ${n})`, hits(/\buppercase\b/).slice(0, 5).join("\n       ")); }

// ── viewport ────────────────────────────────────────────────────────────────
console.log("\n═══ Viewport: zoom allowed ═══");
{ const html = readFileSync("index.html", "utf8");
  ok(!/user-scalable\s*=\s*no|maximum-scale/.test(html), "index.html does not disable pinch zoom"); }

// ── style sheet ─────────────────────────────────────────────────────────────
console.log("\n═══ Wording style sheet ═══");
none(/non-HDL(?!-C)/, "rule 2: non-HDL-C, never non-HDL alone");
none(/[a-z,] ApoB\b/, "rule 3: apoB in running text");
none(/PCSK9i\b/, "rule 4: never PCSK9i");
none(/\d–\s*(<|&lt;)\d/, "rule 6: half-open ranges are written \"3 to <5%\"");
none(/mm Hg/, "rule 7: mmHg");
none(/~\d/, "rule 7: ≈ for approximately, never ~");
{ const bad = [];
  for (const f of JS) for (const m of code[f].matchAll(/<Cor>([\s\S]*?)<\/Cor>/g)) if (!/^COR (1|2a|2b|3)$/.test(m[1].trim())) bad.push(`${f}: <Cor>${m[1].trim()}</Cor>`);
  ok(bad.length === 0, "rule 8: a COR chip holds only COR and a grade", bad.slice(0, 4).join("\n       ")); }
none(/"(Very High|At Goal|Above Goal|Not At Goal|Not Elevated)"/, "rule 9: sentence case in badges");
none(/\b\d+-Yr\b/, "rule 9: 10-yr, not 10-Yr");
none(/\bLDL (?!below \d|≥190")(?!≥190<)[a-z]/, "rule 1: bare LDL only in the goal phrase and the tab label");
ok(/without a lifestyle trial/.test(code["src/BloodPressure.jsx"]), "blood pressure conditions still say what they change: no lifestyle trial first");
none(/(?<![.\w])targets?\b(?!=|-organ)/i, "rule 10: goal, never target");
none(/lipid panel/i, "rule 10: lipid profile, never lipid panel");
none(/Referral to lipid specialist/, "rule 10: Refer to a lipid specialist");
none(/\b(Male|Female) (<|>|≥|≤|&lt;|&gt;)/, "rule 11: men and women in thresholds");
none(/\bon Rx\b|\bLLT\b|med\(s\)| CI:/, "rule 12: no Rx, LLT, med(s) or CI");
{ const bad = [];
  for (const f of JS) code[f].split("\n").forEach((line, i) => {
    const texts = [...line.matchAll(/"([^"\n]*)"|`([^`\n]*)`|>([^<>{}\n]+)</g)].map(m => (m[1] ?? m[2] ?? m[3]).replace(/&[a-z]+;/g, ""));
    if (texts.some(t => /[a-z0-9)%]; [a-z]/i.test(t))) bad.push(`${f}:${i + 1} ${line.trim().slice(0, 90)}`);
  });
  ok(bad.length === 0, "rule 12: no semicolons in displayed text", bad.slice(0, 4).join("\n       ")); }

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail ? 1 : 0);
