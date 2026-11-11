#!/usr/bin/env node
/**
 * tests/test_equivalence.js — 语义张量 · 等价映射（scripts/build_equivalence.js + lib_equivalence.js）
 *
 * 这一层的定义只有一句：**等价 = 同一个语义点**（同一个 (θ,φ,r)）。
 * 测试就照这句话钉：
 *   · 结构：一个类一个张量点；成员必带语种与出处；张量值域合法
 *   · 全等而非相似：类内任意两个成员互相 resolve 到同一个类（往返闭合）
 *   · 同名多义必须返回**全部**候选，且候选的张量点真的不同（不许静默取第一个）
 *   · A/B/C 是翻译；D 是检索探针，`translate()` 不许把它当翻译返回
 *   · 异体字只解决写法：胁痛(脇痛) 能译，而表里没有的「咽干」仍然是未覆盖
 *   · 与已核的 26 条 who-tcm 对读：每条都能在类里找到它的 WHO 英文名
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const B = require(path.join(ROOT, 'scripts', 'build_equivalence.js'));
const E = require(path.join(ROOT, 'scripts', 'lib_equivalence.js'));
const Z = require(path.join(ROOT, 'scripts', 'lib_zh_en.js'));

let passed = 0;
const failures = [];
function test(name, fn) {
  try { passed += 1; fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 语义张量 · 等价映射 ═══\n');

// ── 产物必须存在且有 --check 门 ──
const run = spawnSync(process.execPath, ['scripts/build_equivalence.js', '--check'], { cwd: ROOT, encoding: 'utf8' });
test('产物存在且 node scripts/build_equivalence.js --check 通过', () => {
  assert.strictEqual(run.status, 0, `--check 退出码 ${run.status}\n${run.stdout}\n${run.stderr}`);
  assert.ok(fs.existsSync(E.CLASSES), '缺 classes.json');
});

const D = JSON.parse(fs.readFileSync(E.CLASSES, 'utf8'));
const byId = new Map(D.classes.map((c) => [c.id, c]));

// ── 结构 ──
test('每个等价类绑定恰好一个合法的张量点（θ/φ/r/hex）', () => {
  for (const c of D.classes) {
    const t = c.tensor;
    assert.ok(t.theta >= -90 && t.theta <= 90, `${c.id}: θ=${t.theta}`);
    assert.ok(t.phi >= 0 && t.phi < 360, `${c.id}: φ=${t.phi}`);
    assert.ok(t.r > 0 && t.r <= 1, `${c.id}: r=${t.r}`);
    assert.match(String(t.hex), /^#[0-9A-Fa-f]{6}$/, `${c.id}: hex=${t.hex}`);
  }
  assert.strictEqual(D.counts.classes, D.classes.length);
});

test('每个成员都有语种与出处（A/B/C 三级之外不许出现）', () => {
  for (const c of D.classes) {
    for (const m of c.members) {
      assert.ok(m.lang, `${c.id}: 成员缺语种`);
      assert.ok(m.source && m.source.length > 3, `${c.id}: 成员「${m.form}」缺出处`);
      assert.ok(['A', 'B', 'C'].includes(m.strength), `${c.id}: 成员「${m.form}」证据级别 ${m.strength}`);
    }
  }
});

test('等价类覆盖全部有坐标的单元（一条不落）', () => {
  const units = B.loadUnits();
  assert.strictEqual(D.classes.length, units.length, `类 ${D.classes.length} ≠ 单元 ${units.length}`);
  const uids = new Set(D.classes.map((c) => c.uid));
  for (const u of units) assert.ok(uids.has(u.uid), `单元 ${u.uid} 没有等价类`);
});

// ── 全等，不是相似 ──
test('类内任意两个成员互相 resolve 到同一个类（往返闭合）', () => {
  let checked = 0;
  for (const c of D.classes) {
    for (const m of c.members) {
      const r = E.resolve(m.form);
      assert.ok(r.candidates.length >= 1, `「${m.form}」resolve 不到任何类`);
      assert.ok(r.candidates.some((x) => x.id === c.id), `「${m.form}」resolve 不到它所属的 ${c.id}`);
      checked += 1;
    }
  }
  assert.ok(checked > 200, `只检查了 ${checked} 个成员`);
});

test('张量相似：同一类 S_T=1，跨类 <1（方向/尺度/色差三个分量都在用）', () => {
  const a = byId.get('EQ-DSU-00035');   // 心脾两虚证
  const b = byId.get('EQ-DSU-00001');   // 风寒束表证
  const same = E.tensorSimilarity(a.tensor, a.tensor);
  assert.ok(Math.abs(same.S_T - 1) < 1e-12, `同类 S_T=${same.S_T}`);
  const cross = E.tensorSimilarity(a.tensor, b.tensor);
  assert.ok(cross.S_T < 0.999, `跨类 S_T=${cross.S_T}`);
  assert.ok(cross.S_T > 0, '跨类相似度应为正（都在同一张量空间内）');
});

test('sameSemanticPoint：中文与英文两种写法指的是同一个点', () => {
  assert.strictEqual(E.sameSemanticPoint('肝胆湿热证', 'liver-gallbladder dampness-heat pattern/syndrome'), true);
  assert.strictEqual(E.sameSemanticPoint('肝胆湿热证', '风寒束表证'), false);
});

// ── 翻译 ──
test('translate(中文, en) 给出 WHO 英文名，并带 WHO 代码与书页出处', () => {
  const r = E.translate('肝胆湿热证', 'en');
  assert.ok(r.hits.length > 0, '没有英文等价形式');
  const hit = r.hits.find((h) => /^liver-gallbladder dampness-heat/.test(h.form));
  assert.ok(hit, `英文形式不对：${r.hits.map((h) => h.form).join(' | ')}`);
  assert.match(hit.source, /WHO ISTT 2\.9\.91/, `出处没有 WHO 代码：${hit.source}`);
});

test('translate(英文, zh-Hans) 反向回到中文（等价是双向的）', () => {
  const r = E.translate('liver-gallbladder dampness-heat pattern/syndrome', 'zh-Hans');
  assert.ok(r.hits.some((h) => h.form === '肝胆湿热证'), `回译失败：${r.hits.map((h) => h.form).join(' | ')}`);
});

test('繁体形式也能解析（WHO 表是繁體，查询可能是简体）', () => {
  const r = E.resolve('肝膽濕熱證');
  assert.ok(r.candidates.length >= 1, '繁體形式解析不到');
  assert.ok(r.candidates.some((c) => c.label === '肝胆湿热证'));
});

test('同名多义返回**全部**候选，且各候选的张量点真的不同（不许静默取第一个）', () => {
  const r = E.resolve('气滞血瘀证');
  assert.ok(r.candidates.length >= 2, `候选只有 ${r.candidates.length} 个 —— 但数据里同名不同点是事实`);
  assert.strictEqual(r.ambiguous, true);
  const thetas = new Set(r.candidates.map((c) => `${c.tensor.theta}:${c.tensor.phi}`));
  assert.strictEqual(thetas.size, r.candidates.length, '同名候选的张量点居然相同 —— 那应该并成一个类');
  // 多义形式必须在产物里登记
  const amb = D.ambiguousForms.find((a) => a.form === '气滞血瘀证');
  assert.ok(amb, 'ambiguousForms 里没有登记');
  assert.ok(amb.classes.length >= 2);
});

test('查不到就说查不到：不在等价类里的形式返回空 + 原因', () => {
  const r = E.resolve('完全不存在的东西');
  assert.strictEqual(r.candidates.length, 0);
  assert.ok(r.why && r.why.length > 4, '没有给出原因');
});

// ── D 级探针不是翻译 ──
test('D 级组合探针只在 probes() 里，translate() 不许把它当翻译返回', () => {
  const p = E.probes('阴虚肺燥证');
  const derived = p.probes.filter((x) => x.derived);
  assert.ok(derived.length >= 1, '没有组合探针');
  assert.strictEqual(derived[0].strength, 'D');
  assert.ok(derived[0].coverage >= 0.6, `覆盖率 ${derived[0].coverage} 低于门槛`);
  const tr = E.translate('阴虚肺燥证', 'en');
  assert.strictEqual(tr.hits.length, 0, `translate 返回了 D 级探针：${tr.hits.map((h) => h.form).join(' | ')}`);
});

test('组合探针的每一段都带 WHO 代码（可回查，不是凭空拼的）', () => {
  const c = D.classes.find((x) => x.probe && /phlegm/.test(x.probe.en));
  assert.ok(c, '没有找到 phlegm 相关探针');
  for (const part of c.probe.parts) {
    assert.ok(part.code, `分段「${part.zh}」没有 WHO 代码`);
    assert.ok(part.en, `分段「${part.zh}」没有英文`);
  }
});

// ── 规范化 ──
test('英文规范化：词序无关但词集必须相同（多一词少一词都不算）', () => {
  const a = B.normalizeEn('pattern/syndrome of dampness-heat in the spleen and stomach');
  const b = B.normalizeEn('Spleen and stomach dampness-heat pattern');
  assert.strictEqual(a, b, '词序不同的同一术语没归一');
  assert.notStrictEqual(B.normalizeEn('dampness-heat in the spleen'), b, '少一个词的串被当成相同');
  assert.notStrictEqual(B.normalizeEn('cold phlegm obstructing the lung'), B.normalizeEn('phlegm heat obstructing the lung'),
    '不同病性的证候被归一成同一个串');
});

test('中文规范化：去括注，但括注里的病名不进术语本体', () => {
  assert.strictEqual(B.normalizeZh('气滞血瘀证(颈部)'), '气滞血瘀证');
  assert.strictEqual(B.normalizeZh(' 心脾两虚证 '), '心脾两虚证');
});

test('异体字只解决写法：胁痛(脇痛) 能译，而表里没有的「咽干」仍是未覆盖', () => {
  const t1 = Z.translate('胁痛');
  assert.strictEqual(t1.coverage, 1, '异体字没归一（WHO 表写「脇痛」）');
  assert.match(t1.en, /hypochondriac pain/);
  const t2 = Z.translate('咽干');
  assert.strictEqual(t2.coverage, 0, '咽干在 WHO 表里没有，不该被字形相近的词顶替');
  assert.ok(t2.unmatched.length > 0);
});

test('词表直译：未覆盖的片段必须如实列出，不许静默丢掉', () => {
  const t = Z.translate('痰热壅肺证');
  assert.ok(t.unmatched.includes('壅'), `未覆盖片段没记：${JSON.stringify(t.unmatched)}`);
  assert.ok(t.coverage > 0.6 && t.coverage < 1, `覆盖率 ${t.coverage}`);
  assert.match(t.en, /phlegm/);
  assert.match(t.en, /lung/);
});

// ── 与已核数据对读 ──
test('26 条已核 who-tcm 证候：每条都能在等价类里找到它的 WHO 英文名', () => {
  const who = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/descriptions/who-tcm.json'), 'utf8'));
  assert.ok(who.entries.length >= 26);
  for (const e of who.entries) {
    const r = E.resolve(e.label);
    assert.ok(r.candidates.length >= 1, `「${e.label}」解析不到类`);
    const want = B.normalizeEn(e.whoEnglish);
    const got = r.candidates.some((c) => c.members.some((m) => m.lang === 'en' && B.normalizeEn(m.form) === want));
    assert.ok(got, `「${e.label}」的英文等价里没有 who-tcm 的「${e.whoEnglish}」`);
  }
});

// ── 中文直查：这一层存在的理由 ──
test('中文直查可用：痰热壅肺证 → SF89（TM1 Phlegm heat obstructing the lung）', () => {
  const T = require(path.join(ROOT, 'scripts', 'icd11_terms.js'));
  const r = T.runSearch('痰热壅肺证', { k: 4 });
  assert.ok(r.hits.length > 0, `无命中（探针：${JSON.stringify(r.probes)}，原因：${r.why || '—'}）`);
  assert.strictEqual(r.hits[0].code, 'SF89', `top1 = ${r.hits[0].code} ${r.hits[0].title}`);
  assert.ok(r.probes.some((p) => p.strength === 'D'), '没有走组合探针');
});

test('中文直查：自由文本「失眠」也能命中（走 E 级词表直译）', () => {
  const T = require(path.join(ROOT, 'scripts', 'icd11_terms.js'));
  const r = T.runSearch('失眠', { k: 4 });
  assert.ok(r.hits.length > 0, `无命中（原因：${r.why || '—'}）`);
  assert.ok(r.probes.some((p) => p.strength === 'E'), '没有走词表直译通道');
  assert.ok(r.hits.some((h) => /sleep/i.test(h.title)), `命中里没有睡眠相关条目：${r.hits.map((h) => h.title).join(' | ')}`);
});

test('英文查询不受影响（字面通道照旧）', () => {
  const T = require(path.join(ROOT, 'scripts', 'icd11_terms.js'));
  const r = T.runSearch('insomnia', { k: 4 });
  assert.ok(r.hits.length > 0);
  assert.ok(r.hits.some((h) => h.viaLiteral), '英文字面通道没命中');
});

// ── 发布门：D 级探针分两档，下游只吃 axisClean 的那一档 ──────────────
//
// 「42 条 axes / 24 条 glossary」不是拍脑袋分的：axes 探针的每一片都落在官方命名法的轴上
// （locus/cause/property/severity），glossary 探针含 WHO 的 TM1 英文里根本没有的词
// （toxin、failure to constrain、non interaction）。后者不是没用，是**不能当检索依据**。
test('发布门：四轴探针放行，词表切词探针降级为「仅供参考」', () => {
  const E = require(path.join(ROOT, 'scripts', 'lib_equivalence.js'));
  const ok = E.probes('痰热壅肺证');
  assert.ok(ok.probes.some((p) => p.strength === 'D'), '四轴探针没放行');
  assert.strictEqual(ok.referenceOnly.length, 0, '不该有被挡的探针');

  const blocked = E.probes('脾胃虚弱、瘀毒内结证');
  assert.strictEqual(blocked.probes.filter((p) => p.strength === 'D').length, 0, '低质量探针漏过了发布门');
  assert.strictEqual(blocked.referenceOnly.length, 1, '被挡的探针必须记下来，不许凭空消失');
  assert.ok(/toxin|weakness/.test(blocked.referenceOnly[0].reason),
    `原因里应指出不在官方词汇里的词：${blocked.referenceOnly[0].reason}`);
});

test('发布门：gate=all 能复现旧行为（对照实验用，不是默认）', () => {
  const E = require(path.join(ROOT, 'scripts', 'lib_equivalence.js'));
  const r = E.probes('脾胃虚弱、瘀毒内结证', { gate: 'all' });
  assert.ok(r.probes.some((p) => p.strength === 'D'), 'gate=all 下应放行旧探针');
  assert.strictEqual(r.referenceOnly.length, 0, 'gate=all 下不该有被挡的探针');
});

test('发布门的分档与产物一致：42 条 axes 放行 / 24 条 glossary 挡住', () => {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/equivalence/classes.json'), 'utf8'));
  const withProbe = d.classes.filter((c) => c.probe);
  const axes = withProbe.filter((c) => c.probe.axisClean === true);
  const glossary = withProbe.filter((c) => c.probe.axisClean !== true);
  assert.strictEqual(axes.length, 42, `axes 探针应为 42 条，实际 ${axes.length}`);
  assert.strictEqual(glossary.length, 24, `glossary 探针应为 24 条，实际 ${glossary.length}`);
  for (const c of axes) assert.strictEqual(c.probe.method, 'axes', `${c.id} 标了 axisClean 却不是 axes 方法`);
});

test('发布门不影响检索结果（本批 104 证候 top-1 零变化）', () => {
  const T = require(path.join(ROOT, 'scripts', 'icd11_terms.js'));
  const ref = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/semtensor/datasets/reference-units.json'), 'utf8'));
  const units = (Array.isArray(ref) ? ref : ref.units).filter((u) => u.kind === 'dsu');
  let changed = 0, blocked = 0;
  for (const u of units) {
    const l = String(u.label).replace(/[（(][^（）()]*[）)]/g, '');
    const a = T.runSearch(l, { k: 4, modules: ['TM1'] });
    const b = T.runSearch(l, { k: 4, modules: ['TM1'], gate: 'all' });
    blocked += a.referenceOnly.length;
    if ((a.hits[0] || {}).code !== (b.hits[0] || {}).code) changed += 1;
  }
  assert.strictEqual(blocked, 24, `被挡住的参考探针应为 24 条，实际 ${blocked}`);
  assert.strictEqual(changed, 0, `发布门改变了 ${changed} 条证候的 top-1 —— 那就不叫「只降级不加价」了`);
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 等价映射通过');
