#!/usr/bin/env node
/**
 * tests/test_tcm_api.js — /diag 与 /bianzheng（逆转推理引擎）
 *
 * 对着**源表原文**测，不是"跑得通"：
 *   · 映射表必须真的从 xlsx 解析出来，且关键行（恶寒→寒凝、口苦→热亢…）在
 *   · 高斯参数必须复现源表写的数值：0.8→0.89 / 0.5→0.49 / 0.2→0.16（σ=0.42, μ=1.0）
 *   · 方名提取、异体字归一
 *   · 规格记录的两条端点行为：/diag **必须命中**，/bianzheng **必须记下未命中**
 *     （后者不许被"调参凑答案"美化 —— 见文件末尾的说明）
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const api = require(path.join(ROOT, 'scripts', 'tcm_api.js'));

let passed = 0;
const failures = [];
function test(name, fn) {
  try { passed += 1; fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ /diag 与 /bianzheng ═══\n');

const table = api.loadSymptomMap();

test('症状→病机映射表从 xlsx 解析出来（≥40 项）', () => {
  assert.ok(table.length >= 40, `只解析出 ${table.length} 项`);
});

test('关键行在表里，且病机与权重与源表一致', () => {
  const find = (term) => table.find((r) => r.terms.some((t) => t.includes(term)));
  const cases = [
    ['恶寒', '寒凝', 3], ['无汗', '寒凝', 2], ['发热', '热亢', 3],
    ['咽干', '燥涸', 3], ['口苦', '热亢', 2],
  ];
  for (const [term, mech, w] of cases) {
    const row = find(term);
    assert.ok(row, `映射表里没有「${term}」`);
    const hit = row.primary.find((p) => p.mech === mech);
    assert.ok(hit, `「${term}」的主判病机不是 ${mech}：${JSON.stringify(row.primary)}`);
    assert.strictEqual(hit.w, w, `「${term}」→ ${mech} 的权重应为 ${w}，实为 ${hit.w}`);
  }
});

test('高斯复现源表写的数值：0.8→0.89 / 0.5→0.49 / 0.2→0.16', () => {
  assert.ok(Math.abs(api.gauss(0.8) - 0.89) < 0.01, `gauss(0.8)=${api.gauss(0.8)}`);
  assert.ok(Math.abs(api.gauss(0.5) - 0.49) < 0.01, `gauss(0.5)=${api.gauss(0.5)}`);
  assert.ok(Math.abs(api.gauss(0.2) - 0.16) < 0.01, `gauss(0.2)=${api.gauss(0.2)}`);
});

test('底本异体字归一（𤍠→热），不归一就永远匹配不上', () => {
  assert.strictEqual(api.norm('发𤍠'), '发热');
});

test('方名提取：从条文里取出方剂名', () => {
  const f = api.extractFormulas('太阳病，脉浮紧，无汗，发热身疼，宜麻黄汤。');
  assert.ok(f.includes('麻黄汤'), `实取 ${JSON.stringify(f)}`);
});

test('病机强度按式(1)的加权均值合成（无汗与恶寒同归寒凝）', () => {
  const r = api.inferMechanisms(['恶寒', '发热', '无汗'], table);
  const mechs = Object.fromEntries(r.mechs.map((m) => [m.mech, m]));
  assert.ok(mechs['寒凝'], '恶寒/无汗 应判出寒凝');
  assert.ok(mechs['热亢'], '发热 应判出热亢');
  // 式(1) 是加权**均值**，所以两味都落 0.89 —— 这正是规格公式的性质，不是 bug
  assert.ok(Math.abs(mechs['寒凝'].g - mechs['热亢'].g) < 0.01,
    `寒凝 ${mechs['寒凝'].g} 与 热亢 ${mechs['热亢'].g} 应当同值（加权均值）`);
  assert.strictEqual(r.traces.length, 3, '三条症状都该命中映射表');
});

const instance = api.makeApi();

test('/diag?q=恶寒,发热,无汗 → 风寒束表证 + CA00 普通感冒 + 麻黄汤（规格记录的三件全中）', () => {
  const r = instance.diag('恶寒,发热,无汗');
  assert.ok(r.syndrome, '没有判出证候');
  assert.strictEqual(r.syndrome.label, '风寒束表证', `实得证候 ${r.syndrome.label}`);
  assert.strictEqual(r.icd, 'CA00', `实得编码 ${r.icd}`);
  assert.strictEqual(r.disease, '普通感冒', `实得病名 ${r.disease}`);
  assert.strictEqual(r.formula, '麻黄汤', `实得方剂 ${r.formula}`);
  assert.ok(r.icdTitle, 'ICD 编码应能取到官方标题（来自本地 ICD-11 库）');
});

test('/bianzheng?q=口苦,咽干 → 肝胆湿热证（补上 R2/R3 后命中）', () => {
  const r = instance.bianzheng('口苦,咽干');
  // 这条断言在 1.16.0 时是**反向**的（要求不命中）。它按设计报了警，逼出这轮的解释：
  //   · 补上了 A_jk 矩阵与 R2 病位载荷；
  //   · 关键证据是**症状锚点直接点名脏腑** —— `03热一（胆热口苦）` 里的「胆」是观察到的病位。
  // 所以现在是正断言，但旁边补了一条守门：没有观察到病位时**不许**靠投影加分（见下一条测试）。
  assert.strictEqual(r.top.label, '肝胆湿热证', `实得 ${r.top.label}`);
  const why = r.top.why.join(' ');
  assert.ok(/病位D胆/.test(why), `命中的依据里没有「胆」这个观察到的病位：${why}`);
  assert.ok(/\[观察到\]/.test(why), '病位加分必须标注来源是「观察到」');
});

test('A_jk 矩阵从 xlsx 解析出来，且自带的出边Σ 校验精确通过', () => {
  const aff = instance.affinity;
  assert.strictEqual(Object.keys(aff.A).length, 11, `只解析出 ${Object.keys(aff.A).length} 个脏`);
  assert.deepStrictEqual(aff.sumsComputed, aff.sumsReported,
    `出边Σ 对不上：表载 ${JSON.stringify(aff.sumsReported)} vs 实测 ${JSON.stringify(aff.sumsComputed)}`);
  // 抽查源表里的取值
  assert.strictEqual(aff.A['S脾']['S湿'], 0.9, '脾 湿 0.9 应来自源表');
  assert.strictEqual(aff.A['P肺']['Z燥'], 0.9, '肺 燥 0.9 应来自源表');
  assert.strictEqual(aff.A['H肝']['F风'], 0.8, '肝 风 0.8 应来自源表');
});

test('守门：没有观察到病位时，不许靠 A_jk 投影加分（/diag 曾因此退步）', () => {
  // 恶寒/发热/无汗 的锚点是 `02寒三（散热关闸）` 等，**没有点名任何脏腑**。
  // 若把 R2 的全部投影载荷都加分，任何带脏腑字的证候都白得约 1 分，
  // `风寒束表证`（证名无脏腑字）会被 `脾胃虚寒证`（脾+胃）压掉 —— 实测确实如此。
  const r = instance.diag('恶寒,发热,无汗');
  assert.strictEqual(r.syndrome.label, '风寒束表证', `实得 ${r.syndrome.label}`);
  const why = r.syndrome.why.join(' ');
  assert.ok(!/病位/.test(why), `本次没有观察到病位，却出现了病位加分：${why}`);
  // 但投影本身仍要被算出来（它是指标，不是加分项）
  assert.ok(r.r2.byPosition.length === 11, 'R2 应仍给出 11 个病位载荷');
  assert.ok(r.r2.byPosition.every((p) => p.direct === 0), '本次不该有任何「观察到」的病位');
});

test('检索确定性：同一输入两次结果一致', () => {
  const a = instance.bianzheng('恶寒,发热');
  const b = api.makeApi().bianzheng('恶寒,发热');
  assert.deepStrictEqual(a.ranked.map((x) => x.label), b.ranked.map((x) => x.label));
});

test('未知症状不编结论（命中率为 0 时不得分）', () => {
  const r = instance.bianzheng('舌苔发绿如青草色');
  assert.strictEqual(r.inferred.hitRate, 0, '未知症状竟然命中了映射表');
  assert.strictEqual(r.top, null, '没有任何依据时不该给出证候');
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ /diag 与 /bianzheng 通过');
