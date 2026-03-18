# Clinical UX & Presentation Improvements

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 8 workflow, presentation, aesthetic, and functional improvements to the lipid management CDS tool.

**Architecture:** All changes are in the single-file React app (`src/App.jsx`) and its stylesheet (`src/index.css`). No new files, no new dependencies. Each task modifies one logical area of the existing codebase.

**Tech Stack:** React 19, Tailwind CSS 3, Vite 6, vanilla CSS

---

## File Map

- Modify: `src/App.jsx` — all component logic, state, and JSX
- Modify: `src/index.css` — new CSS classes for gradient connector, computed field styling
- Validate: `test-clinical.mjs` — re-run after all changes to confirm no calculation regressions

---

## Task 1: Reset Patient Button

**Files:**
- Modify: `src/App.jsx:152-175` (state declarations area)
- Modify: `src/App.jsx:248-256` (header JSX)

**What:** Add a "Reset" button in the header that clears all patient-specific state back to defaults. Must NOT reset the current tab selection — clinicians often clear between patients but stay on the same pathway.

- [ ] **Step 1: Add `resetPatient` callback after state declarations (~line 175)**

```jsx
const resetPatient = useCallback(() => {
  setAge(""); setSex("male"); setSbp(""); setBpTx(false);
  setTotalC(""); setHdlC(""); setLdlC(""); setOnStatin(false);
  setDm(false); setSmoking(false); setEgfr(""); setBmi("");
  setTg(""); setEnhs({}); setCac(""); setCacPct("");
  setLpa(""); setApoB(""); setAscvdLevel("very_high");
}, []);
```

- [ ] **Step 2: Add Reset button in header, after the subtitle**

Inside the `<div className="max-w-lg mx-auto px-4 py-4">` block, wrap the existing h1+p in a flex container and add the button:

```jsx
<div className="flex items-start justify-between">
  <div>
    <h1 className="text-lg font-black tracking-tight leading-tight">2026 ACC/AHA Lipid Management</h1>
    <p className="text-slate-400 text-[11px] mt-0.5 font-medium">Dyslipidemia Guideline CDS · PREVENT-ASCVD Embedded</p>
  </div>
  <button onClick={resetPatient}
    className="mt-0.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-slate-400 hover:text-white hover:bg-slate-700 active:scale-95 transition-all duration-150 cursor-pointer whitespace-nowrap border border-slate-700">
    Reset
  </button>
</div>
```

- [ ] **Step 3: Verify — run dev server, fill in some fields, tap Reset, confirm all fields clear but tab stays**

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add Reset Patient button in header"
```

---

## Task 2: Auto-Calculated Non-HDL-C Readout

**Files:**
- Modify: `src/App.jsx` — add computed value + display in Primary tab card
- Modify: `src/index.css` — add `.computed-field` style

**What:** Show `non-HDL-C = TC − HDL` as a read-only computed field below the input grid when both TC and HDL are entered. Style it differently from user inputs to distinguish computed values.

- [ ] **Step 1: Add computed non-HDL-C memo after existing computed values (~line 183)**

```jsx
const nonHdlC = useMemo(() => {
  if (totalC === "" || hdlC === "") return null;
  return Number(totalC) - Number(hdlC);
}, [totalC, hdlC]);
```

- [ ] **Step 2: Add CSS class for computed fields in `src/index.css`**

After the `.input-glow` rule:

```css
/* Computed/derived value field */
.computed-field {
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border: 1px dashed #cbd5e1;
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 3: Display computed non-HDL-C after the Triglycerides input (line ~302)**

Insert after the `<Num label="Triglycerides" .../>` line:

```jsx
{nonHdlC !== null && (
  <div className="computed-field flex items-center justify-between mt-2">
    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Non-HDL-C <span className="normal-case font-medium">(calculated)</span></span>
    <span className="text-sm font-black text-slate-700">{nonHdlC} <span className="text-[11px] font-normal text-slate-400">mg/dL</span></span>
  </div>
)}
```

- [ ] **Step 4: Verify — enter TC=200 and HDL=50, confirm "Non-HDL-C (calculated) 150 mg/dL" appears with dashed border styling**

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/index.css
git commit -m "feat: show auto-calculated non-HDL-C readout"
```

---

## Task 3: "At Goal" / "Not at Goal" Indicator

**Files:**
- Modify: `src/App.jsx` — modify the recommendation display area (~line 425-434)

**What:** When a recommendation with LDL goals exists AND the user has entered a current LDL-C, show a prominent badge: green ✓ "At Goal" if LDL ≤ goal, or red with the gap if LDL > goal. Show this between the Recommendation box and the Goals grid.

- [ ] **Step 1: Add goal status indicator after the recommendation box (line ~430)**

Insert between the recommendation `<div>` closing tag and the `{rec.g && <Card ...>` line:

```jsx
{rec.g && ldlC !== "" && ldlC !== null && (
  <div className={`rounded-xl p-3 flex items-center gap-3 border-2 ${
    Number(ldlC) <= rec.g.ldl
      ? "bg-emerald-50 border-emerald-300"
      : "bg-red-50 border-red-300"
  }`}>
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-black shrink-0 ${
      Number(ldlC) <= rec.g.ldl
        ? "bg-emerald-500 text-white"
        : "bg-red-500 text-white"
    }`}>
      {Number(ldlC) <= rec.g.ldl ? "✓" : "✗"}
    </div>
    <div>
      <div className={`text-sm font-black ${
        Number(ldlC) <= rec.g.ldl ? "text-emerald-800" : "text-red-800"
      }`}>
        {Number(ldlC) <= rec.g.ldl
          ? "At Goal"
          : `Not at Goal — LDL ${Number(ldlC) - rec.g.ldl} mg/dL above target`}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">
        Current LDL {ldlC} mg/dL · Goal &lt;{rec.g.ldl} mg/dL
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 2: Verify — on Primary tab with risk ≥10% (goal <70), enter LDL-C=60 → green ✓. Enter LDL-C=120 → red ✗ "50 mg/dL above target"**

- [ ] **Step 3: Verify on secondary tab — select Very High Risk, enter LDL=40 → green. Enter LDL=80 → red "25 mg/dL above"**

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add At Goal / Not at Goal indicator with LDL gap"
```

---

## Task 4: Very-High-Risk Criteria Checklist (ASCVD Tab)

**Files:**
- Modify: `src/App.jsx` — replace the static "Very High Risk" description with expandable criteria

**What:** Replace the one-line description for "Very High Risk" on the secondary tab with a tappable checklist of the actual ACC/AHA very-high-risk criteria. This helps clinicians verify the classification rather than guessing.

- [ ] **Step 1: Add VHR criteria constant near ENHANCERS (line ~78)**

```jsx
const VHR_CRITERIA = [
  { id:"acs", l:"Recent ACS", d:"MI or unstable angina within past 12 months" },
  { id:"multi", l:"Multiple ASCVD events", d:"≥2 major events (MI, stroke, symptomatic PAD)" },
  { id:"pad", l:"Symptomatic PAD", d:"ABI ≤0.85 or prior revascularization/amputation" },
  { id:"dm_ascvd", l:"ASCVD + Diabetes", d:"High-risk condition" },
  { id:"ckd_ascvd", l:"ASCVD + CKD", d:"eGFR 15–59" },
  { id:"heFH", l:"ASCVD + Heterozygous FH", d:"Familial hypercholesterolemia" },
  { id:"persist", l:"Persistently elevated LDL", d:"LDL ≥100 despite max statin + ezetimibe" },
];
```

- [ ] **Step 2: Add state for VHR checklist (near other state declarations)**

```jsx
const [vhr, setVhr] = useState({});
const toggleVhr = useCallback(id => setVhr(p => ({...p,[id]:!p[id]})), []);
const vhrCount = useMemo(() => Object.values(vhr).filter(Boolean).length, [vhr]);
```

- [ ] **Step 3: Add `vhr` and `setVhr` to the `resetPatient` callback**

Add `setVhr({});` to the resetPatient function.

- [ ] **Step 4: Replace the secondary tab content**

Replace lines ~362-380 (the existing secondary card) with:

```jsx
{tab === "secondary" && (
  <Card title="Clinical ASCVD — Risk Level" accent="red">
    <p className="text-[11px] text-slate-400 mb-3">All ASCVD patients → high-intensity statin. Classify to set LDL target.</p>
    <Num label="Current LDL-C" unit="mg/dL" value={ldlC} on={setLdlC} min={0} max={400} ph="Current" />
    <div className="mt-3 space-y-2">
      {[
        { id:"very_high", l:"Very High Risk", d:`${vhrCount > 0 ? vhrCount + " criteria selected" : "Tap to verify criteria below"}`, clr:"#dc2626", bg:"#fef2f2" },
        { id:"not_very_high", l:"Not Very High Risk", d:"Stable ASCVD without the above features", clr:"#ea580c", bg:"#fff7ed" },
      ].map(o => (
        <button key={o.id} onClick={() => setAscvdLevel(o.id)}
          className="w-full text-left p-3 rounded-lg border-2 transition-colors cursor-pointer active:opacity-70 min-h-[56px]"
          style={ascvdLevel===o.id ? { borderColor:o.clr, backgroundColor:o.bg } : { borderColor:"#e2e8f0" }}>
          <div className="text-sm font-bold text-slate-800">{o.l}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">{o.d}</div>
        </button>
      ))}
    </div>
    {ascvdLevel === "very_high" && (
      <div className="mt-3 space-y-1.5">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Very High-Risk Criteria</div>
        {VHR_CRITERIA.map(e => (
          <button key={e.id} onClick={() => toggleVhr(e.id)}
            className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer active:opacity-70 min-h-[44px] ${
              vhr[e.id] ? "bg-red-50 border-red-300" : "bg-white border-slate-200"
            }`}>
            <div className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${
              vhr[e.id] ? "bg-red-500 border-red-500" : "border-slate-300"
            }`}>{vhr[e.id] && <span className="text-white text-xs font-bold">✓</span>}</div>
            <div><div className="text-sm font-bold text-slate-800 leading-tight">{e.l}</div>
            <div className="text-[11px] text-slate-500">{e.d}</div></div>
          </button>
        ))}
      </div>
    )}
  </Card>
)}
```

- [ ] **Step 5: Verify — secondary tab shows checklist when "Very High Risk" selected. Tapping criteria toggles them. Switching to "Not Very High" hides checklist.**

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add very-high-risk criteria checklist on ASCVD tab"
```

---

## Task 5: DM-Specific Enhancers as Checkable Items

**Files:**
- Modify: `src/App.jsx` — replace static DM enhancer text with interactive checklist

**What:** Convert the static DM-specific enhancers text at the bottom of the Diabetes tab into tappable checkboxes, consistent with the primary risk enhancers. These don't change the recommendation logic (DM is always LLT), but help the clinician document and consider risk stratification within the DM pathway.

- [ ] **Step 1: Add DM enhancers constant near VHR_CRITERIA**

```jsx
const DM_ENHANCERS = [
  { id:"dur_t2", l:"DM duration ≥10y (T2)", d:"Type 2 diabetes ≥10 years" },
  { id:"dur_t1", l:"DM duration ≥20y (T1)", d:"Type 1 diabetes ≥20 years" },
  { id:"a1c", l:"A1c ≥8%", d:"Suboptimal glycemic control" },
  { id:"alb", l:"Albuminuria ≥30 mg/g", d:"Urine albumin-to-creatinine ratio" },
  { id:"egfr_dm", l:"eGFR <60", d:"Stage 3+ chronic kidney disease" },
  { id:"retino", l:"Retinopathy", d:"Diabetic retinopathy" },
  { id:"neuro", l:"Neuropathy", d:"Diabetic neuropathy" },
  { id:"abi_dm", l:"ABI ≤0.9", d:"Peripheral arterial disease" },
];
```

- [ ] **Step 2: Add state for DM enhancers**

```jsx
const [dmEnhs, setDmEnhs] = useState({});
const toggleDmEnh = useCallback(id => setDmEnhs(p => ({...p,[id]:!p[id]})), []);
const dmEnhCount = useMemo(() => Object.values(dmEnhs).filter(Boolean).length, [dmEnhs]);
```

- [ ] **Step 3: Add `setDmEnhs({});` to `resetPatient` callback**

- [ ] **Step 4: Replace the diabetes tab content**

Replace lines ~382-392 with:

```jsx
{tab === "diabetes" && (
  <Card title="Diabetes Pathway" accent="violet">
    <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 mb-3">
      <div className="text-sm font-bold text-violet-800">Universal LLT (Age 40–75)</div>
      <div className="text-[11px] text-violet-600 mt-1">DM (type 1 or 2), CKD 3–4, or HIV → lipid-lowering therapy regardless of LDL-C level.</div>
    </div>
    <Num label="Current LDL-C" unit="mg/dL" value={ldlC} on={setLdlC} min={0} max={400} ph="Current" />
    <div className="mt-3 space-y-1.5">
      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">DM-Specific Risk Enhancers</div>
      {DM_ENHANCERS.map(e => (
        <button key={e.id} onClick={() => toggleDmEnh(e.id)}
          className={`w-full flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-colors cursor-pointer active:opacity-70 min-h-[44px] ${
            dmEnhs[e.id] ? "bg-violet-50 border-violet-300" : "bg-white border-slate-200"
          }`}>
          <div className={`mt-0.5 w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${
            dmEnhs[e.id] ? "bg-violet-500 border-violet-500" : "border-slate-300"
          }`}>{dmEnhs[e.id] && <span className="text-white text-xs font-bold">✓</span>}</div>
          <div><div className="text-sm font-bold text-slate-800 leading-tight">{e.l}</div>
          <div className="text-[11px] text-slate-500">{e.d}</div></div>
        </button>
      ))}
    </div>
    {dmEnhCount > 0 && (
      <div className="mt-2 text-sm font-bold text-violet-700 bg-violet-50 rounded-lg px-3 py-2 border border-violet-200">
        {dmEnhCount} DM enhancer{dmEnhCount>1?"s":""} — supports high-intensity statin
      </div>
    )}
  </Card>
)}
```

- [ ] **Step 5: Verify — diabetes tab shows 8 tappable enhancers. Tapping toggles color. Counter appears when ≥1 selected.**

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: interactive DM-specific risk enhancer checklist"
```

---

## Task 6: Treatment Ladder Gradient Connector

**Files:**
- Modify: `src/index.css` — add gradient connector class
- Modify: `src/App.jsx` — apply gradient class to connector line

**What:** Replace the flat `bg-slate-200` vertical connector between treatment ladder steps with a subtle gradient that reinforces escalation intensity (emerald → blue → violet).

- [ ] **Step 1: Add CSS gradient class in `src/index.css`**

After the `.computed-field` rule:

```css
/* Treatment ladder gradient connector */
.ladder-connector {
  background: linear-gradient(180deg, #10b981, #3b82f6, #7c3aed);
  width: 2px;
}
```

- [ ] **Step 2: Replace the connector line in App.jsx**

In the treatment ladder section (~line 448), change:
```jsx
{i<arr.length-1 && <div className="w-0.5 flex-1 bg-slate-200 my-0.5"/>}
```
to:
```jsx
{i<arr.length-1 && <div className="flex-1 my-0.5 ladder-connector"/>}
```

- [ ] **Step 3: Verify — treatment ladder shows a green-to-blue-to-violet gradient connector between steps**

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/index.css
git commit -m "style: gradient connector on treatment escalation ladder"
```

---

## Task 7: Computed Field Styling for Non-HDL-C

This was already implemented as part of Task 2. The `.computed-field` CSS class and the dashed-border / gradient-background / monospace styling are both created in Task 2 Steps 2-3. No additional work needed.

Mark as complete after Task 2 is done.

---

## Task 8: Copy Summary to Clipboard

**Files:**
- Modify: `src/App.jsx` — add copy function + button below recommendation

**What:** Add a "Copy to Note" button below the recommendation box that generates a one-line clinical summary and copies it to the clipboard. Uses the Clipboard API with a brief "Copied ✓" feedback state.

- [ ] **Step 1: Add `copied` state variable**

```jsx
const [copied, setCopied] = useState(false);
```

- [ ] **Step 2: Add `copySummary` callback (after `resetPatient`)**

```jsx
const copySummary = useCallback(() => {
  if (!rec) return;
  const parts = [];
  if (tab === "primary" && age) parts.push(`${age}${sex === "male" ? "M" : "F"}`);
  if (tab === "primary" && risk !== null) parts.push(`10yr ASCVD ${risk}% (${rc?.label})`);
  if (tab === "secondary") parts.push(`ASCVD ${ascvdLevel === "very_high" ? "Very High Risk" : "Not Very High Risk"}`);
  if (tab === "diabetes") parts.push("Diabetes pathway");
  if (tab === "severe") parts.push("Severe hypercholesterolemia (LDL ≥190)");
  if (ldlC) parts.push(`LDL ${ldlC}`);
  if (nonHdlC !== null) parts.push(`non-HDL ${nonHdlC}`);
  if (rec.g) parts.push(`Goal LDL <${rec.g.ldl}`);
  parts.push(`Rec: ${rec.int === "high" ? "high" : rec.int === "moderate" ? "moderate" : rec.int}-intensity statin`);
  if (rec.esc) parts.push("escalation pathway");
  if (enhCount > 0 && tab === "primary") parts.push(`${enhCount} risk enhancer${enhCount > 1 ? "s" : ""}`);
  if (cac !== "" && tab === "primary") parts.push(`CAC ${cac}`);
  if (lpa !== "") parts.push(`Lp(a) ${lpa} nmol/L`);
  if (apoB !== "") parts.push(`ApoB ${apoB} mg/dL`);

  const text = parts.join(" · ");
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  });
}, [rec, tab, age, sex, risk, rc, ascvdLevel, ldlC, nonHdlC, enhCount, cac, lpa, apoB]);
```

- [ ] **Step 3: Add Copy button below the recommendation box**

Insert right after the recommendation `<div>` (after `{rec.txt}</div></div>`):

```jsx
<button onClick={copySummary}
  className={`w-full mt-2 py-2.5 rounded-lg text-[12px] font-bold transition-all duration-200 cursor-pointer active:scale-[0.98] min-h-[44px] border ${
    copied
      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
      : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
  }`}>
  {copied ? "✓ Copied to Clipboard" : "📋 Copy Summary to Note"}
</button>
```

- [ ] **Step 4: Add `copied` to the `resetPatient` callback**

Add `setCopied(false);` to resetPatient.

- [ ] **Step 5: Verify — after a recommendation shows, tap "Copy Summary to Note". Button flashes green "✓ Copied". Paste into a text editor and confirm the summary is complete and formatted.**

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: copy clinical summary to clipboard"
```

---

## Task 9: Final Validation

**Files:**
- Run: `test-clinical.mjs`

**What:** Re-run the full 231-test clinical validation suite to confirm no calculation logic was broken by the UI changes.

- [ ] **Step 1: Run clinical tests**

```bash
node test-clinical.mjs
```

Expected: `231 passed, 0 failed`

- [ ] **Step 2: Run production build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Final commit with all changes**

If any files were missed in prior commits:

```bash
git add -A
git status
```

- [ ] **Step 4: Push**

```bash
git push
```
