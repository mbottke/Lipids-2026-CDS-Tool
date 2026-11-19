// layout.cjs — browser checks for the presentation passes. Run against the dev server on :4180.
// usage: node layout.cjs [filter]     exit 1 on any failure
const { chromium } = require('playwright');
const only = process.argv[2] || '';
const URL = process.env.APP_URL || 'http://localhost:4180/';
const TABS = ['Primary', 'ASCVD', 'Diabetes', 'LDL ≥190'];
const PATIENT = { 'Age': 52, 'Total cholesterol': 228, 'HDL-C': 42, 'LDL-C': 152, 'Systolic BP': 136, 'eGFR': 82, 'BMI': 29.5 };
let pass = 0, fail = 0;
const ok = (c, name, dbg) => { if (c) { pass++; console.log('  ✅', name); } else { fail++; console.log('  ❌', name, dbg !== undefined ? '\n       ' + String(typeof dbg === 'string' ? dbg : JSON.stringify(dbg)).slice(0, 420) : ''); } };

(async () => {
  const b = await chromium.launch();
  const open = async (w, h, opts = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: w < 700, ...opts });
    const p = await ctx.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); });
    await p.goto(URL, { waitUntil: 'networkidle' });
    p.fill2 = async (label, v) => p.locator('label').filter({ hasText: new RegExp('^' + label.replace(/[()]/g, '\\$&') + '$', 'i') }).first().locator('xpath=following-sibling::div//input').fill(String(v));
    p.patient = async (o = PATIENT) => { for (const [k, v] of Object.entries(o)) await p.fill2(k, v); await p.waitForTimeout(150); };
    p.tab = async n => { await p.getByRole('button', { name: n, exact: true }).first().click(); await p.waitForTimeout(250); };
    p.txt = async (sel = 'body') => { await p.waitForTimeout(150); return (await p.locator(sel).first().innerText()).replace(/\s+/g, ' '); };
    p.sc = () => p.locator('[data-scroll]');
    p.expandAll = async () => { for (let r = 0; r < 3; r++) { const n = await p.evaluate(() => { let c = 0; document.querySelectorAll('button[aria-expanded="false"]').forEach(x => { x.click(); c++; }); return c; }); await p.waitForTimeout(200); if (!n) break; } };
    p.done = () => ctx.close();
    return p;
  };
  const section = async (name, fn) => { if (only && !name.includes(only)) return; console.log(`\n═══ ${name} ═══`); try { await fn(); } catch (e) { ok(false, `${name}: threw`, e.message.split('\n')[0]); } };
  const row = (p, re) => p.locator('main').getByRole('button', { name: re }).first();

  await section('targets: every control ≥ 44 px at 390', async () => {
    for (const tab of TABS) {
      const p = await open(390, 844); await p.patient(); if (tab !== 'Primary') await p.tab(tab);
      if (tab === 'LDL ≥190') await p.fill2('Current LDL-C', 212);
      await p.expandAll();
      const st = p.getByRole('button', { name: /Statin not tolerated/ }).first(); if (await st.count()) await st.click();
      const small = await p.evaluate(() => { const out = []; document.querySelectorAll('button, a[href], input, select').forEach(el => { const r = el.getBoundingClientRect(); if (!r.width || !r.height) return; const a = getComputedStyle(el, '::after'); let w = r.width, h = r.height; if (a.content !== 'none' && a.position === 'absolute') { w += -parseFloat(a.left) - parseFloat(a.right); h += -parseFloat(a.top) - parseFloat(a.bottom); } if (w < 43.5 || h < 43.5) out.push(`${Math.round(w)}x${Math.round(h)} "${(el.getAttribute('aria-label') || el.innerText || el.placeholder || el.tagName).replace(/\s+/g, ' ').trim().slice(0, 30)}"`); }); return out; });
      ok(small.length === 0, `${tab}: ${small.length} controls under 44 px`, small.join(' | '));
      ok(p.errs.length === 0, `${tab}: no console errors`, p.errs.join(' | ')); await p.done();
    }
  });

  await section('sentences: nothing longer than 40 characters is set below 12 px', async () => {
    for (const tab of TABS) {
      const p = await open(390, 844); await p.patient(); if (tab !== 'Primary') await p.tab(tab);
      if (tab === 'LDL ≥190') await p.fill2('Current LDL-C', 212);
      await p.expandAll();
      for (const name of [/Statin not tolerated/, /^Statin reference$/, /^About /]) { const bs = p.getByRole('button', { name }); for (let i = 0; i < await bs.count(); i++) await bs.nth(i).click().catch(() => {}); }
      await p.waitForTimeout(200);
      const small = await p.evaluate(() => { const out = []; const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); while (tw.nextNode()) { const t = tw.currentNode.nodeValue.trim(); if (t.length < 40) continue; const el = tw.currentNode.parentElement; const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12) out.push(fs + 'px "' + t.slice(0, 50) + '"'); } return out; });
      ok(small.length === 0, `${tab}: ${small.length} sentences under 12 px`, small.slice(0, 6).join(' | '));
      await p.done();
    }
  });

  await section('header-320: title is whole and clear of the controls', async () => {
    const p = await open(320, 700);
    const m = await p.evaluate(() => { const h = document.querySelector('h1'); const r = h.getBoundingClientRect(); const c = document.querySelector('header [data-controls]')?.getBoundingClientRect(); return { clip: h.scrollWidth - h.clientWidth, right: Math.round(r.right), controlsLeft: c ? Math.round(c.left) : null, docW: document.documentElement.scrollWidth }; });
    ok(m.controlsLeft !== null && m.clip <= 1 && m.right <= m.controlsLeft, 'title not clipped and ends before the controls', m);
    ok(m.docW === 320, 'no horizontal scroll at 320', m);
    await p.done();
  });

  await section('plan-position: the plan follows the deciding inputs (390, default state)', async () => {
    // Base build: 3004, 1534, 1399, 3169. On ASCVD and Diabetes the checklists that decide the plan are 1290 to 1370 px tall.
    const lim = { 'Primary': 1500, 'ASCVD': 1400, 'Diabetes': 1300, 'LDL ≥190': 1000 };
    for (const tab of TABS) {
      const p = await open(390, 844); await p.patient(); if (tab !== 'Primary') await p.tab(tab);
      if (tab === 'LDL ≥190') await p.fill2('Current LDL-C', 212);
      const y = await p.evaluate(() => { const sc = document.querySelector('[data-scroll]'), el = document.querySelector('[data-plan="inline"]'); return el && sc ? Math.round(el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop) : null; });
      ok(y !== null && y <= lim[tab], `${tab}: plan at y=${y} (limit ${lim[tab]})`);
      const order = await p.evaluate(() => { const heads = [...document.querySelectorAll('main h2')].map(h => h.textContent.trim()); return { plan: heads.indexOf('Plan'), bio: heads.indexOf('Advanced biomarkers'), ladder: heads.indexOf('Treatment ladder') }; });
      ok(order.plan >= 0 && order.plan < order.ladder && order.ladder < order.bio, `${tab}: plan, then ladder, then biomarkers`, order);
      await p.done();
    }
  });

  await section('plan-content: one block, strict goal boundary, no status without LDL-C', async () => {
    const p = await open(390, 844); await p.tab('ASCVD');
    let t = await p.txt('[data-plan="inline"]');
    ok(/Clinical ASCVD, not very high risk/.test(t) && /<70/.test(t) && /<100/.test(t) && /≥50%/.test(t), 'plan shows the sentence and the three goals', t);
    ok(!/at goal/i.test(t), 'no status line before LDL-C is entered', t);
    ok(!/Atorvastatin/.test(t), 'statin list is not repeated in the plan', t);
    await p.fill2('Current LDL-C', 70); t = await p.txt('[data-plan="inline"]');
    ok(/Not at goal/.test(t), 'LDL-C 70 with goal <70 reads not at goal', t);
    await p.fill2('Current LDL-C', 69); t = await p.txt('[data-plan="inline"]');
    ok(/At goal/.test(t) && !/Not at goal/.test(t), 'LDL-C 69 with goal <70 reads at goal', t);
    await p.fill2('Current LDL-C', 152); t = await p.txt('[data-plan="inline"]');
    ok(/Not at goal\. LDL-C 152 mg\/dL, 82 above goal\. 54% reduction needed/.test(t), 'status states the value, the gap and the reduction needed', t);
    const color = await p.evaluate(() => getComputedStyle(document.querySelector('[data-plan="inline"] [data-plan-text]')).color);
    const ink = await p.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--ink)'; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; });
    ok(color === ink, 'recommendation sentence is ink', { color, ink });
    await p.getByRole('button', { name: /Units: mg\/dL/ }).click(); t = await p.txt('[data-plan="inline"]');
    ok(/<1\.8/.test(t) && /mmol\/L/.test(t) && !/<70\b/.test(t), 'mmol/L: goals and status convert', t);
    ok(/to LDL below 1\.8 mmol\/L\. Lowering further to below 1\.4 is reasonable/.test(t) && !/mg\/dL/.test(t), 'mmol/L: the plan sentence converts and no mg/dL is left', t);
    await p.done();
  });

  await section('rail: desktop keeps the plan in view on every tab (1440 x 800)', async () => {
    for (const tab of TABS) {
      const p = await open(1440, 800); await p.patient(); if (tab !== 'Primary') await p.tab(tab);
      if (tab === 'LDL ≥190') await p.fill2('Current LDL-C', 212);
      const m = await p.evaluate(() => { const a = document.querySelector('aside'); const pl = a?.querySelector('[data-plan="rail"]'); const inl = document.querySelector('[data-plan="inline"]'); const r = pl?.getBoundingClientRect(); return { rail: !!pl, railVisible: !!r && r.height > 0 && r.top < innerHeight, inlineHidden: !inl || inl.getBoundingClientRect().height === 0 }; });
      ok(m.rail && m.railVisible && m.inlineHidden, `${tab}: plan is in the rail and visible, inline copy hidden`, m);
      await p.sc().evaluate(el => el.scrollTo(0, 1200)); await p.waitForTimeout(150);
      const still = await p.evaluate(() => { const r = document.querySelector('aside [data-plan="rail"]')?.getBoundingClientRect(); return !!r && r.top >= 0 && r.top < innerHeight; });
      ok(still, `${tab}: plan still in view after scrolling 1200 px`);
      if (tab === 'Primary') {
        const reach = await p.evaluate(() => { const a = document.querySelector('aside'); const sc = [a, ...a.querySelectorAll('*')].find(e => /auto|scroll/.test(getComputedStyle(e).overflowY)); if (sc) sc.scrollTop = sc.scrollHeight; const btn = [...a.querySelectorAll('button')].find(x => /Copy summary/.test(x.innerText)); const r = btn.getBoundingClientRect(); return { bottom: Math.round(r.bottom), vh: innerHeight }; });
        ok(reach.bottom <= reach.vh, 'Primary: the copy button can be reached', reach);
      }
      await p.done();
    }
    const p = await open(1440, 800);
    const t = await p.txt('aside');
    ok(/appear here once/i.test(t), "Primary with incomplete inputs: the rail explains itself", t);
    ok(await p.locator('[data-plan]').count() === 0 && await p.locator('[data-planbar]').count() === 0, 'no plan and no bar before the inputs are complete');
    await p.done();
  });

  await section('scroll-reset: a new tab opens at the top', async () => {
    const p = await open(390, 844); await p.patient();
    await p.sc().evaluate(el => el.scrollTo(0, 900)); await p.waitForTimeout(100);
    await p.tab('Diabetes');
    const y = await p.sc().evaluate(el => el.scrollTop);
    ok(y === 0, `scrollTop is ${y}`); await p.done();
  });

  await section('plan-bar: appears when the plan scrolls away', async () => {
    const p = await open(390, 844); await p.tab('ASCVD'); await p.fill2('Current LDL-C', 152);
    const bar = p.locator('[data-planbar]');
    await p.locator('[data-plan="inline"]').scrollIntoViewIfNeeded(); await p.waitForTimeout(350);
    ok(!(await bar.isVisible().catch(() => false)), 'hidden while the plan is on screen');
    await p.sc().evaluate(el => el.scrollTo(0, el.scrollHeight)); await p.waitForTimeout(350);
    ok(await bar.isVisible().catch(() => false), 'visible at the bottom of the page');
    const t = await p.txt('[data-planbar]');
    ok(/LDL-C goal <70/.test(t) && /Now 152/.test(t) && /High-intensity statin/i.test(t), 'shows goal, current value and intensity', t);
    const name = await bar.getAttribute('aria-label'); const h = (await bar.boundingBox()).height;
    ok(/^Go to plan/.test(name) && h >= 43.5, 'is a named control at least 44 px high', { name, h });
    await bar.click(); await p.waitForTimeout(1200);
    const inView = await p.evaluate(() => { const r = document.querySelector('[data-plan="inline"]').getBoundingClientRect(); const s = document.querySelector('[data-scroll]').getBoundingClientRect(); return r.top >= s.top - 1 && r.top < innerHeight; });
    ok(inView, 'pressing it brings the plan into view');
    ok(!(await bar.isVisible().catch(() => false)), 'and the bar goes away');
    await p.fill2('Current LDL-C', ''); await p.sc().evaluate(el => el.scrollTo(0, el.scrollHeight)); await p.waitForTimeout(350);
    ok(!/Now/.test(await p.txt('[data-planbar]')), 'no "Now" without LDL-C');
    await p.done();
  });

  await section('collapses: lifestyle table and risk enhancers', async () => {
    let p = await open(390, 844); await p.tab('ASCVD');
    let d = p.getByRole('button', { name: /Expected LDL-C change/ });
    ok(await d.getAttribute('aria-expanded') === 'false' && !(await p.getByText('Viscous fiber 7.5 g/day').isVisible().catch(() => false)), 'statin plan: lifestyle table starts closed');
    await d.click(); ok(await p.getByText('Viscous fiber 7.5 g/day').isVisible(), 'it opens on press'); await p.done();
    p = await open(390, 844); await p.patient({ ...PATIENT, 'Age': 40, 'Total cholesterol': 170, 'LDL-C': 95, 'Systolic BP': 112 });
    ok(/Low/.test(await p.txt('main')), 'low-risk patient set up');
    d = p.getByRole('button', { name: /Expected LDL-C change/ });
    ok(await d.getAttribute('aria-expanded') === 'true', 'lifestyle-only plan: lifestyle table starts open');
    let e = p.getByRole('button', { name: /^Risk enhancers/ });
    ok(await e.getAttribute('aria-expanded') === 'false' && /0 checked/.test(await e.innerText()), 'low risk: enhancers closed with "0 checked"');
    await p.patient(PATIENT);
    ok(await e.getAttribute('aria-expanded') === 'true', 'borderline risk: enhancers open');
    await e.click(); await p.fill2('Age', 53);
    ok(await e.getAttribute('aria-expanded') === 'false', 'a manual close survives a change of age');
    await p.done();
  });

  await section('codex: automatic blood pressure conditions are read-only', async () => {
    const p = await open(390, 844); await p.patient(); await p.tab('Diabetes');
    await p.locator('button[aria-expanded]').filter({ hasText: /Stage 1|Stage 2|Elevated|Normal/ }).first().click(); await p.waitForTimeout(200);
    const bp = p.locator('[data-bp]');
    const m = await bp.evaluate(el => { const node = [...el.querySelectorAll('*')].find(n => n.childElementCount === 0 && n.textContent.trim() === 'Diabetes'); const btn = node?.closest('button'); const rowEl = node?.parentElement?.parentElement; return { found: !!node, isButton: !!btn, text: (rowEl?.innerText || '').replace(/\s+/g, ' ') }; });
    ok(m.found && !m.isButton && /Set by: Diabetes tab/.test(m.text), 'Diabetes tab: the Diabetes row is not pressable and names its source', m);
    await p.tab('Primary');
    const bp2 = p.locator('button[aria-expanded]').filter({ hasText: /Stage 1|Stage 2|Elevated|Normal/ }).first(); if (await bp2.getAttribute('aria-expanded') !== 'true') await bp2.click();
    const dmRow = p.locator('[data-bp]').getByRole('button', { name: /^(✓\s*)?Diabetes/ });
    ok(await dmRow.count() === 1, 'Primary tab: the Diabetes row is pressable');
    await dmRow.click(); ok(await dmRow.getAttribute('aria-pressed') === 'true', 'a manual check holds');
    await p.tab('Diabetes'); await p.tab('Primary');
    const bp3 = p.locator('button[aria-expanded]').filter({ hasText: /Stage 1|Stage 2|Elevated|Normal/ }).first(); if (await bp3.getAttribute('aria-expanded') !== 'true') await bp3.click();
    ok(await p.locator('[data-bp]').getByRole('button', { name: /^(✓\s*)?Diabetes/ }).getAttribute('aria-pressed') === 'true', 'the manual check is still there after the automatic source comes and goes');
    await p.done();
  });

  await section('codex: statin-intolerance thresholds follow the unit', async () => {
    const p = await open(390, 844); await p.tab('ASCVD');
    await p.getByRole('button', { name: /Statin not tolerated/ }).click();
    let t = await p.txt('[data-si-panel]');
    ok(/LDL-C below 70/.test(t) && /LDL-C below 100/.test(t), 'mg/dL: 70 and 100', t.slice(0, 200));
    await p.getByRole('button', { name: /Units: mg\/dL/ }).click(); t = await p.txt('[data-si-panel]');
    ok(/LDL-C below 1\.8 mmol\/L/.test(t) && /LDL-C below 2\.6 mmol\/L/.test(t) && !/below 70\b/.test(t), 'mmol/L: 1.8 and 2.6', t.match(/.{0,40}below.{0,30}/g));
    await p.done();
  });

  await section('keyboard: new controls are reachable, named and show focus', async () => {
    const p = await open(390, 844, { hasTouch: false });
    const seen = [];
    for (let i = 0; i < 6; i++) { await p.keyboard.press('Tab'); seen.push(await p.evaluate(() => { const e = document.activeElement; const cs = getComputedStyle(e); return { name: e.getAttribute('aria-label') || e.innerText.trim(), outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2 }; })); }
    const unit = seen.find(s => /^Units:/.test(s.name));
    ok(unit && unit.outline, 'the unit button is reached by Tab, named, with a 2 px outline', seen);
    ok(seen.every(s => s.name), 'every stop has a name', seen);
    await p.done();
  });

  // ── Review findings (independent reviewer and Codex, on 7d989cd) ──────────────
  await section('review: the plan is fully in view in the rail at laptop heights', async () => {
    for (const [w, h, full] of [[1280, 720, true], [1366, 768, true], [1024, 600, false]]) {
      const p = await open(w, h); await p.patient();
      const m = await p.evaluate(() => { const pl = document.querySelector('aside [data-plan="rail"]'); const r = pl.getBoundingClientRect(); const cells = pl.querySelector('.grid').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), cellsBottom: Math.round(cells.bottom), vh: innerHeight }; });
      ok(full ? m.bottom <= m.vh : m.cellsBottom <= m.vh, `${w} x ${h}: ${full ? 'whole plan' : 'sentence and goals'} visible without scrolling the rail`, m);
      await p.done();
    }
  });

  await section('review: the plan bar hands focus to the plan', async () => {
    const p = await open(390, 844, { hasTouch: false }); await p.tab('ASCVD'); await p.fill2('Current LDL-C', 152);
    await p.sc().evaluate(el => el.scrollTo(0, el.scrollHeight)); await p.waitForTimeout(350);
    await p.locator('[data-planbar]').focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
    const where = await p.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, inPlan: !!a.closest('[data-plan="inline"]') }; });
    ok(where.inPlan, 'after Enter on the bar, focus is on the plan', where);
    await p.done();
  });

  await section('review: a focused control is never under the plan bar and its focus ring is never clipped', async () => {
    for (const [tab, w] of [['Primary', 390], ['ASCVD', 390], ['LDL ≥190', 390], ['ASCVD', 1024]]) {
      const p = await open(w, w < 700 ? 844 : 700, { hasTouch: false }); if (tab === 'Primary') await p.patient(); else await p.tab(tab);
      if (tab === 'LDL ≥190') await p.fill2('Current LDL-C', 212);
      const bad = [];
      for (let i = 0; i < 70; i++) {
        await p.keyboard.press('Tab'); await p.waitForTimeout(40);
        const r = await p.evaluate(() => {
          const e = document.activeElement; if (!e || e === document.body) return null;
          const name = (e.getAttribute('aria-label') || e.innerText || e.tagName).replace(/\s+/g, ' ').trim().slice(0, 28);
          const box = e.getBoundingClientRect(); const out = [];
          const bar = document.querySelector('[data-planbar]');
          if (bar && e !== bar && getComputedStyle(bar).display !== 'none') { const bt = bar.getBoundingClientRect().top; if (box.bottom > bt + 1) out.push(`under bar by ${Math.round(box.bottom - bt)}px`); }
          const cs = getComputedStyle(e); const ring = cs.outlineStyle === 'none' ? null : parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth);
          if (ring !== null) for (let a = e.parentElement; a && a.tagName !== 'BODY'; a = a.parentElement) { const s = getComputedStyle(a); if (s.overflowX === 'visible' && s.overflowY === 'visible') continue; if (a.hasAttribute('data-scroll') || a.tagName === 'ASIDE' || a.tagName === 'NAV' || a.classList.contains('overflow-x-auto')) continue; const c = a.getBoundingClientRect(); if (box.left - ring < c.left - 0.5 || box.right + ring > c.right + 0.5 || box.top - ring < c.top - 0.5 || box.bottom + ring > c.bottom + 0.5) { out.push('ring clipped'); break; } }
          return out.length ? `"${name}": ${out.join(', ')}` : null;
        });
        if (r) bad.push(r);
      }
      ok(bad.length === 0, `${tab} at ${w}: ${bad.length} focus stops hidden or clipped`, [...new Set(bad)].slice(0, 6).join(' | '));
      await p.done();
    }
  });

  await section('review: mmol/L does not scroll sideways and its status is self-consistent', async () => {
    for (const w of [320, 390]) {
      const p = await open(w, 844); await p.patient(); await p.getByRole('button', { name: /^Units: mg/ }).click(); await p.waitForTimeout(200);
      const m = await p.sc().evaluate(el => ({ sw: el.scrollWidth, cw: el.clientWidth }));
      ok(m.sw <= m.cw, `${w}: content is no wider than the scroll area`, m); await p.done();
    }
    const p = await open(390, 844); await p.tab('ASCVD');
    await row(p, /^(✓\s*)?Prior MI/).click(); await row(p, /^(✓\s*)?Repeat event/).click();
    await p.getByRole('button', { name: /^Units: mg/ }).click();
    await p.fill2('Current LDL-C', 1.4); let t = await p.txt('[data-plan="inline"]');
    ok(/Not at goal\. LDL-C 1\.4 mmol\/L, goal <1\.4\./.test(t) && !/0\.0 above/.test(t), '1.4 with goal <1.4 reads not at goal, with no "0.0 above"', t.slice(-120));
    await p.fill2('Current LDL-C', 1.3); t = await p.txt('[data-plan="inline"]');
    ok(/At goal\. LDL-C 1\.3 mmol\/L, goal <1\.4\./.test(t), '1.3 with goal <1.4 reads at goal', t.slice(-90));
    await p.done();
  });

  await section('review: mmol/L leaves no mg/dL LDL-C threshold on the LDL ≥190 tab', async () => {
    const p = await open(390, 844); await p.tab('LDL ≥190'); await p.fill2('Current LDL-C', 212);
    await p.getByRole('button', { name: /^Units: mg/ }).click(); await p.expandAll();
    const t = await p.txt('main');
    const left = (t.match(/LDL-C[^.]{0,24}(≥190|≥ ?160\b|160–189|≥100\b)|≤130 mg\/dL/g) || []);
    ok(left.length === 0, `${left.length} LDL-C thresholds still in mg/dL`, left.slice(0, 6).join(' | '));
    ok(/LDL-C ≥4\.9/.test(t) && /4\.1–4\.8/.test(t), 'thresholds read ≥4.9 and 4.1–4.8');
    await p.done();
  });

  await section('review: sections and rows do not change under the user', async () => {
    let p = await open(390, 844, { hasTouch: false }); await p.patient();
    const e = p.getByRole('button', { name: /^Risk enhancers/ });
    await row(p, /^(✓\s*)?Elevated Lp\(a\)/).click(); await p.fill2('Age', 70); await p.waitForTimeout(200);
    await row(p, /^(✓\s*)?Elevated Lp\(a\)/).click(); await p.waitForTimeout(200);
    ok(await e.getAttribute('aria-expanded') === 'true', 'risk enhancers stay open after the last one is unchecked at high risk');
    await p.done();
    p = await open(390, 844); await p.patient({ ...PATIENT, 'eGFR': 45 }); await p.tab('ASCVD');
    const ckd = await p.locator('main').evaluate(el => { const n = [...el.querySelectorAll('*')].find(x => x.childElementCount === 0 && x.textContent.trim() === 'CKD stage ≥3'); return { found: !!n, isButton: !!n?.closest('button') }; });
    ok(ckd.found && !ckd.isButton, 'ASCVD tab: CKD set by eGFR is a read-only row', ckd);
    ok(/ASCVD with CKD stage ≥3/.test(await p.txt('[data-plan="inline"]')), 'and the plan uses it');
    await p.tab('Primary'); await p.fill2('eGFR', 82); await p.tab('ASCVD');
    ok(!/CKD stage ≥3\./.test(await p.txt('[data-plan="inline"]')), 'correcting eGFR to 82 removes CKD from the plan');
    await p.tab('LDL ≥190'); await p.fill2('Current LDL-C', 212); await row(p, /^(✓\s*)?Tendon xanthoma/).click(); await row(p, /^(✓\s*)?Arcus cornealis/).click().catch(() => {});
    const he = await p.locator('main').evaluate(el => { const n = [...el.querySelectorAll('*')].find(x => x.childElementCount === 0 && x.textContent.trim() === 'HeFH, clinical or genetic'); return { found: !!n, isButton: !!n?.closest('button') }; });
    ok(he.found && !he.isButton, 'LDL ≥190 tab: HeFH set by the score is a read-only row', he);
    await p.done();
  });

  await section('review: small panels meet the same floor', async () => {
    let p = await open(390, 844); await p.getByRole('button', { name: 'BMI calc' }).click(); await p.waitForTimeout(200);
    const small = await p.evaluate(() => { const out = []; const panel = [...document.querySelectorAll('div')].find(d => d.childElementCount && /^BMI calculator/.test(d.innerText || '') && d.innerText.length < 400); (panel || document).querySelectorAll('button, input').forEach(el => { const r = el.getBoundingClientRect(); if (!r.width) return; const a = getComputedStyle(el, '::after'); let w = r.width, h = r.height; if (a.content !== 'none' && a.position === 'absolute') { w += -parseFloat(a.left) - parseFloat(a.right); h += -parseFloat(a.top) - parseFloat(a.bottom); } if (w < 43.5 || h < 43.5) out.push(`${Math.round(w)}x${Math.round(h)} "${(el.getAttribute('aria-label') || el.innerText || el.placeholder || '').trim().slice(0, 16)}"`); }); return { found: !!panel, out }; });
    ok(small.found && small.out.length === 0, `BMI calculator: ${small.out.length} controls under 44 px`, small.out.join(' | '));
    const hit = await p.evaluate(() => { const x = [...document.querySelectorAll('button[aria-label="Close"]')].find(b => b.getBoundingClientRect().width); const r = x.getBoundingClientRect(); const below = document.elementFromPoint(r.left + r.width / 2, r.bottom + 14); return { below: (below?.innerText || below?.tagName || '').slice(0, 12), isClose: below === x }; });
    ok(!hit.isClose, 'the close button does not take taps meant for the control below it', hit);
    for (const name of ['BMI calc', 'About the PREVENT calculator', 'About CAC scoring', 'About Lp(a) and apoB']) { const bt = p.getByRole('button', { name, exact: true }).first(); ok((await bt.getAttribute('aria-expanded')) !== null, `"${name}" states whether it is open`); }
    await p.done();
    p = await open(320, 700); await p.tab('LDL ≥190'); await p.fill2('Current LDL-C', 212); await row(p, /^Atorva$/).click(); await p.waitForTimeout(150);
    const chips = await p.evaluate(() => [...document.querySelectorAll('main button')].filter(b => /^\d+ mg$/.test(b.innerText.trim())).map(b => Math.round(b.getBoundingClientRect().width)));
    ok(chips.length === 4 && chips.every(x => x >= 44), '320 px: dose chips are at least 44 px wide', chips);
    ok((await p.getByRole('button', { name: /Point bands/ }).getAttribute('aria-expanded')) !== null, '"Point bands" states whether it is open');
    await p.sc().evaluate(el => el.scrollTo(0, el.scrollHeight)); await p.waitForTimeout(350);
    const tr = await p.evaluate(() => [...document.querySelectorAll('[data-planbar] span')].filter(sp => sp.getBoundingClientRect().width && sp.scrollWidth > sp.clientWidth + 1).map(sp => sp.innerText));
    ok(tr.length === 0, '320 px: nothing in the plan bar is truncated', tr);
    await p.done();
  });

  console.log(`\n${pass} pass, ${fail} fail`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
