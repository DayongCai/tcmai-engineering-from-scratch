#!/usr/bin/env node
/**
 * tests/test_evidence_quality.js —— 外部证据的「特指 / 异名 / 仅证名 / 通用」分级
 *
 * 为什么要测这个：分级器一旦**过严**，就会把有证据的条目报成"通用"（把好数据说成没数据）；
 * 一旦**过松**，就会把泛论报成"特指"（把没数据说成有数据）。两种都是**静默**的错，
 * 所以每个层级都要有一个**真实踩过的案例**钉住。
 *
 * 案例来源：第 3、4 批实跑（括注被削 → 颈部证据缺失；证名尾部「证」字在正文里可省）。
 */

const EQ = require('../scripts/evidence_quality.js');
const B = require('../scripts/external_batch.js');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, msg: e.message }); console.log(`  ✗ ${name}\n    ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const src = (title, snippet) => ({ title, snippet, url: 'https://example.org/x' });

// ── 证名写法的容忍度 ────────────────────────────────────────

test('labelTerms：尾部「证/病」可省（`气虚便秘证` 在正文里写作「气虚便秘」）', () => {
  const t = EQ.labelTerms('气虚便秘证');
  assert(t.includes('气虚便秘证') && t.includes('气虚便秘'), `实得 ${JSON.stringify(t)}`);
  // 不该无限放宽：只省尾部一个字
  assert(!t.includes('气虚'), `放宽过头了：${JSON.stringify(t)}`);
});

test('未登记的写法只能给线索（`气不摄血证` 进表**之前**就是这种状态）', () => {
  // 这条同时说明：进表前后行为不同，而"进表"要过 tests/test_aliases.js 那道溯源门。
  const r = EQ.assess({
    label: '痰湿内阻证',   // 表里没有它
    sources: [src('某资料', '痰湿内蕴证常见于肥胖之人，舌苔白腻。')],
  });
  assert(r.tier === 'variant-unconfirmed', `应判待确认异名，实得 ${r.tier}`);
  assert(r.variantHints.includes('痰湿内蕴证'), `没给出线索：${JSON.stringify(r.variantHints)}`);
});

test('进了表的 synonym 才升为特指（`气虚不摄证` ← 气不摄血证）', () => {
  const r = EQ.assess({
    label: '气虚不摄证',
    sources: [src('气不摄血证_百度百科', '气不摄血证是中医病证名，指因脾气虚弱导致统摄血液功能失常。')],
  });
  assert(r.tier === 'specific', `同义异名应升为特指，实得 ${r.tier}`);
  assert(r.viaAlias.some((v) => v.relation === 'synonym'), '应标出来自同义异名');
});

// ── 四个层级 ────────────────────────────────────────────────

test('特指：括注语境命中（要用**实测取回**的颈部来源）', () => {
  // 这条来源是修好 queryFor 之后真取回来的（黑龙江省中医医院《颈痹病诊疗方案》）
  const r = EQ.assess({
    label: '气滞血瘀证(颈部)',
    sources: [src('颈痹病（神经根型颈椎病）诊疗方案 — 黑龙江省中医药科学院',
      '颈椎病相当于中医“项痹、痿证、项强、眩晕”等范畴。1、气滞血瘀型（相当于神经根型）：颈肩臂发散性疼痛，呈刺痛或麻木，痛处固定，脉弦涩。')],
  });
  assert(r.tier === 'specific', `应判特指，实得 ${r.tier}`);
  assert(r.qualifiersMissed.length === 0, `不该有漏掉的限定词：${r.qualifiersMissed}`);
});

test('仅证名：**扩注语境没命中**就是"沉没证据"的信号 → 应 --requery（就是修之前那条颈部）', () => {
  const r = EQ.assess({
    label: '气滞血瘀证(颈部)',
    sources: [src('气滞血瘀证_百度百科', '气滞血瘀证是中医病证名，指气机郁滞日久而致血行瘀阻。'),
      src('血瘀是百病之源', '瘀血为病，在临床上的表现相当广泛，血瘀证几乎可以涉及到临床各科的大部分疾病。')],
  });
  assert(r.tier === 'label-only', `应判仅证名，实得 ${r.tier}`);
  assert(r.qualifiersMissed.includes('颈部'), `应点出漏掉「颈部」：${r.qualifiersMissed}`);
  assert(r.labelHitSources > 0, '证名本身是命中了的');
});

test('通用：证名与近名都没出现 → 泛论', () => {
  const r = EQ.assess({
    label: '大肠湿热蕴毒证',
    sources: [src('溃疡性结肠炎·医案及制剂', '本病病位在大肠，与脾胃关系密切，湿热蕴结，气血不调。')],
  });
  assert(r.tier === 'generic', `应判通用，实得 ${r.tier}`);
  assert(r.variantHints.length === 0, `不该有线索：${JSON.stringify(r.variantHints)}`);
});

test('无括注的证名：字面命中即特指（「证」字省略也算）', () => {
  const a = EQ.assess({ label: '气虚便秘证', sources: [src('从气机论治功能性便秘', '益气通便法主要用于气虚便秘。舌淡胖，苔薄白，脉弱。')] });
  assert(a.tier === 'specific', `尾字省略后应算命中，实得 ${a.tier}`);
  const b = EQ.assess({ label: '风寒束表证', sources: [src('麻黄汤', '风寒束表证治宜辛温解表。')] });
  assert(b.tier === 'specific', `字面命中应算特指，实得 ${b.tier}`);
});

// ── 括注语境取词 ────────────────────────────────────────────

test('contextTerms：部位类走展开表，病名类就是它自己（按 / 切开）', () => {
  const unmapped = [];
  assert(EQ.contextTerms('颈部', unmapped).includes('项痹'), '颈部应展开出同义语境词');
  assert(EQ.contextTerms('消渴', unmapped).join() === '消渴', '病名类应就是它自己');
  assert(EQ.contextTerms('热淋/白浊', unmapped).join() === '热淋,白浊', '/ 分隔的病名应拆开');
  assert(unmapped.length === 0, `不该有未映射项：${unmapped}`);
});

test('部位展开表**只有 3 个**且被显式记录（不许悄悄猜）', () => {
  assert(Object.keys(EQ.PLACE_CONTEXT).length === 3, `实得 ${Object.keys(EQ.PLACE_CONTEXT)}`);
  for (const k of Object.keys(EQ.PLACE_CONTEXT)) {
    assert(EQ.PLACE_CONTEXT[k].length >= 2, `${k} 的展开词太少`);
  }
});

// ── 与真实数据的接口 ────────────────────────────────────────

test('对真实 external.json 全量评估不报错，且每条都有 tier', () => {
  const fs = require('fs');
  const path = require('path');
  const ext = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'standards/semtensor/descriptions/external.json'), 'utf8'));
  const tiers = new Set(['specific', 'partial', 'variant-unconfirmed', 'label-only', 'generic']);
  for (const e of ext.entries) {
    const r = EQ.assess(e);
    assert(tiers.has(r.tier), `${e.label} 的 tier 非法：${r.tier}`);
    assert(Array.isArray(r.labelTerms) && r.labelTerms.length >= 1, `${e.label} 缺 labelTerms`);
  }
  assert(ext.entries.length >= 22, `条目数异常：${ext.entries.length}`);
});

test('括注是病性（bracketKind=pattern）时不当语境硬条件 —— 否则好证据被判通用', () => {
  const snippet = '……若心肾阳虚，水邪泛滥，水饮凌心射肺……或亡阳厥脱、亡阴厥脱(心源性休克)……';
  // 标了 pattern：不要求来源逐字出现「阳衰血瘀」，证名字面命中即特指
  const pat = EQ.assess({ label: '真心痛（阳衰血瘀）证', bracketKind: 'pattern', sources: [src('真心痛_百度百科', snippet)] });
  assert(pat.qualifiers.length === 0, `不应把（阳衰血瘀）当语境，实得 ${pat.qualifiers.length} 个`);
  assert(pat.tier === 'specific', `应判特指，实得 ${pat.tier}`);
  // 没标 pattern 的同形条目仍按语境硬条件处理（不许静默放宽）
  const plain = EQ.assess({ label: '真心痛（阳衰血瘀）证', sources: [src('真心痛_百度百科', snippet)] });
  assert(plain.tier === 'label-only', `未标的应仍判仅证名，实得 ${plain.tier}`);
});

test('带括注的条目里不许有「仅证名」残留（第 3 批的两条已用 --requery 补救过）', () => {
  const fs = require('fs');
  const path = require('path');
  const ext = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'standards/semtensor/descriptions/external.json'), 'utf8'));
  const bad = ext.entries
    .map((e) => EQ.assess(e))
    .filter((r) => r.qualifiers.length && r.tier === 'label-only');
  assert(bad.length === 0, `这些带括注的条目仍是通用证据，应 --requery：${bad.map((r) => r.label).join('、')}`);
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  for (const f of failures) console.log(`  ✗ ${f.name}\n    ${f.msg}`);
  process.exit(1);
}
console.log('\n✅ 证据质量分级通过');
