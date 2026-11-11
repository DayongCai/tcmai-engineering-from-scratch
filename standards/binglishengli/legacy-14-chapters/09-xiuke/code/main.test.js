#!/usr/bin/env node
/**
 * 第 9 章 休克 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：规模、节分布、四类起点、三段分期及其本体单元、微循环三部位、
 * 接缝与边界句式、数值是否为 0。不锁死正文措辞——底本改写段落时，测试不该变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  STARTS,
  STAGES,
  SITES,
  SEAMS,
  BOUNDARY,
  loadBase,
  loadUnits,
  chapterUnits,
  shape,
  unitMeta,
  lens,
  rank,
  total,
  valueAudit,
  startCoverage,
  stageCoverage,
  siteCoverage,
  seamCoverage,
  boundaryCount,
  bySection,
} = require('./main');

const base = loadBase();
const list = chapterUnits(base);
const meta = unitMeta(loadUnits())(list);
const rawOf = (sub) => list.find((u) => u.sub === sub).raw;

test('本章 6 个知识单元，分属 2 节，正文合计 10768 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 6);
  assert.strictEqual(s.secs, 2);
  assert.strictEqual(s.chars, 10768);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '7.1.1', '7.1.2', '7.1.3',
    '7.2.1', '7.2.2', '7.2.3',
  ]);
});

test('课程第 9 章取自底本第 7 章的 7.1、7.2 两节，章号取小节号本身', () => {
  assert.deepStrictEqual([...new Set(list.map((u) => u.sub.split('.')[0]))], ['7']);
  assert.deepStrictEqual([...new Set(list.map((u) => u.sec))].sort(), ['7.1', '7.2']);
  assert.deepStrictEqual(list.map((u) => u.title), [
    '休克的概念类别',
    '休克分期类别的环节',
    '分期表述的边界要求',
    '代偿期改变的环节',
    '进展期改变的环节',
    '难治期改变的环节',
  ]);
});

test('数值核验：6 个单元的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(meta);
  assert.strictEqual(audit.units, 6);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of meta) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('三视角以「机制」居首、四层级落在系统层：写的是环节链，不是形态', () => {
  const { views, levels } = lens(meta);
  assert.strictEqual(total(views), 266);
  assert.strictEqual(views.机制, 134);
  assert.strictEqual(views.机能, 128);
  assert.strictEqual(views.病因, 4);
  assert.strictEqual(rank(views)[0][0], '机制');
  assert.strictEqual(total(levels), 134);
  assert.strictEqual(levels.系统, 55);
  assert.strictEqual(levels.器官, 46);
  assert.strictEqual(levels.细胞, 23);
  assert.strictEqual(levels.组织, 10);
  assert.strictEqual(rank(levels)[0][0], '系统');
});

test('四类起点齐全，且全部写在 7.1.1（前两类量与泵、后两类分布与通路）', () => {
  assert.deepStrictEqual(STARTS.map((s) => s.key), ['血容量', '心脏泵血', '血管舒缩', '循环通路']);
  assert.deepStrictEqual(STARTS.map((s) => s.group), ['量与泵', '量与泵', '分布与通路', '分布与通路']);
  const cov = startCoverage(list);
  assert.strictEqual(cov.length, 4);
  for (const s of cov) assert.deepStrictEqual(s.units, ['7.1.1'], `${s.label} 落点`);
});

test('三段分期的本体单元各就各位：7.2.1 代偿、7.2.2 进展、7.2.3 难治', () => {
  assert.deepStrictEqual(STAGES.map((s) => s.name), ['代偿期', '进展期', '难治期']);
  assert.deepStrictEqual(STAGES.map((s) => s.home), ['7.2.1', '7.2.2', '7.2.3']);
  for (const st of STAGES) assert.ok(rawOf(st.home).includes(st.name), `${st.home} 正文未出现「${st.name}」`);
  // 三段一起命名的地方是 7.1.2（分期本体），三个 home 都在 7.2 的下半
  for (const st of STAGES) assert.ok(rawOf('7.1.2').includes(st.name), `7.1.2 未出现「${st.name}」`);
  // 判据互不相同：三段不是同一句话换名字
  assert.strictEqual(new Set(STAGES.map((s) => s.judge)).size, 3);
});

test('分期是环节表不是时间表：7.1.2 明写连续过渡，且全章不给时限', () => {
  assert.ok(rawOf('7.1.2').includes('连续过渡'), '7.1.2 缺「连续过渡」');
  assert.ok(rawOf('7.1.2').includes('重叠'), '7.1.2 缺重叠区域的说明');
  assert.match(STAGES[1].judge, /并存/);
  assert.match(STAGES[2].judge, /不判定结局/);
});

test('微循环三个部位 + 交换这条目标函数，全部落在 7.2 下半', () => {
  assert.deepStrictEqual(SITES.map((s) => s.key), ['微动脉', '毛细血管', '微静脉', '物质交换']);
  for (const s of siteCoverage(list)) {
    assert.ok(s.units.length > 0, `${s.key} 未被任何单元提到`);
    for (const u of s.units) assert.ok(['7.2.1', '7.2.2'].includes(u), `${s.key} 出现在 ${u}（应在 7.2 的环节节）`);
  }
});

test('两处接缝如实标出：应激（第 7 章）与凝血（第 10 章缺稿，不展开）', () => {
  assert.deepStrictEqual(SEAMS.map((s) => s.key), ['应激', '凝血']);
  const cov = Object.fromEntries(seamCoverage(list).map((s) => [s.key, s.units]));
  assert.ok(cov['应激'].includes('7.1.1'), '与应激的接缝应在 7.1.1');
  assert.deepStrictEqual(cov['凝血'], ['7.2.3'], '凝血/纤溶只应出现在难治期一节');
});

test('边界句式贯穿全章，且三处「不判定」落在 7.1.3 与 7.2.3', () => {
  assert.deepStrictEqual(BOUNDARY, ['不作疾病诊断', '具备资质的人员', '不得混称', '敏感个人信息', '并不承担这一功能']);
  assert.ok(boundaryCount(list) >= 10, `边界句式只命中 ${boundaryCount(list)} 处`);
  assert.ok(rawOf('7.1.3').includes('不得混称'));
  assert.ok(rawOf('7.2.3').includes('而不是对个体结局的判定'));
});

test('两节收支均衡：各 3 单元，每节都在 5000 字以上（没有薄节）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 2);
  assert.deepStrictEqual([...secs.keys()].sort(), ['7.1', '7.2']);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 单元数`);
    assert.ok(g.chars > 5000, `${sec} 只有 ${g.chars} 字`);
  }
});

test('每单元 brief 都带「不作诊断与判定」的口径句（底本自己的声明）', () => {
  const bySub = new Map(loadUnits().units.map((u) => [u.sub, u]));
  for (const u of list) assert.match(bySub.get(u.sub).brief, /不作诊断与判定/, `${u.sub} brief 缺口径`);
});
