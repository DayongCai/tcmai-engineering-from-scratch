#!/usr/bin/env node
/**
 * 第 5 章 缺氧 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：小节数、节分布、字数、四类的环节落点、链条四段与边界句的覆盖、数值是否为 0。
 * 不锁死正文措辞，底本改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');

const {
  ROOT,
  TYPES,
  LINKS,
  BOUNDARY,
  load,
  loadBase,
  chapterSubs,
  chapterUnits,
  shape,
  lens,
  rank,
  valueAudit,
  typeBreakdown,
  linkCoverage,
  boundaryCoverage,
  bySection,
} = require('./main');

const M = require(require('node:path').join(ROOT, 'scripts', 'lib_binglishengli_map.js'));
const units = load();
const list = chapterUnits(units);

test('本章 6 个小节，分属 2 节，正文合计 10922 字', () => {
  const s = shape(list);
  assert.strictEqual(s.units, 6);
  assert.strictEqual(s.secs, 2);
  assert.strictEqual(s.chars, 10922);
  assert.deepStrictEqual(list.map((u) => u.sub), [
    '6.1.1', '6.1.2', '6.1.3', '6.2.1', '6.2.2', '6.2.3',
  ]);
});

test('小节号与标题都从映射现取，标题不带重复编号', () => {
  const truth = M.subsOf(loadBase(), 5);
  assert.deepStrictEqual(chapterSubs(), truth.map((u) => u.sub));
  assert.deepStrictEqual(list.map((u) => u.title), truth.map((u) => u.title));
  for (const u of list) assert.ok(!/^\d+\.\d+\.\d+\s/.test(u.title), `${u.sub} 标题仍带编号：${u.title}`);
});

test('三视角以机制为主轴，病因视角为 0（底本按环节归类，不按病因归类）', () => {
  const { views } = lens(list);
  assert.strictEqual(views.机制, 112);
  assert.strictEqual(views.机能, 45);
  assert.strictEqual(views.病因, 0);
  assert.strictEqual(rank(views)[0][0], '机制');
});

test('四层级：细胞与系统并列居首，器官最少（讲环节，不讲器官形态）', () => {
  const { levels } = lens(list);
  assert.strictEqual(levels.细胞, 40);
  assert.strictEqual(levels.系统, 40);
  assert.strictEqual(levels.组织, 31);
  assert.strictEqual(levels.器官, 9);
  assert.ok(levels.器官 < levels.细胞, '器官层不应超过细胞层');
});

test('数值核验：6 个小节的 valueLike 全为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.units, 6);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
  for (const u of list) assert.strictEqual(u.measure.valueLike, 0, `${u.sub} 出现数值`);
});

test('四类缺氧 = 链条四段，四类都在正文有落点，且主讲小节各就各位', () => {
  assert.deepStrictEqual(TYPES.map((t) => t.name), ['乏氧性', '血液性', '循环性', '组织性']);
  assert.deepStrictEqual(TYPES.map((t) => t.at), ['摄取与交换', '携带与释放', '输送（推送与灌注）', '利用（细胞氧化）']);
  const found = typeBreakdown(list);
  for (const t of found) assert.ok(t.units.length > 0, `${t.name} 在正文里没有落点`);
  assert.ok(found[0].units.includes('6.1.1'));
  assert.ok(found[1].units.includes('6.1.2'));
  assert.ok(found[2].units.includes('6.1.3') && found[3].units.includes('6.1.3'));
  // 四段各占一处，位置不重复
  assert.strictEqual(new Set(TYPES.map((t) => t.at)).size, 4);
});

test('链条四段（摄取/携带/输送/利用）都被正文写到', () => {
  assert.deepStrictEqual(LINKS, ['摄取', '携带', '输送', '利用']);
  for (const l of linkCoverage(list)) assert.ok(l.units.length > 0, `${l.name} 未被任何小节提到`);
});

test('边界句覆盖：不作疾病诊断、不写数值、具备资质、留痕、中性表述都在正文出现', () => {
  assert.deepStrictEqual(BOUNDARY, ['不作疾病诊断', '不写数值', '具备资质', '留痕', '中性表述']);
  const cov = Object.fromEntries(boundaryCoverage(list).map((b) => [b.name, b.units.length]));
  for (const k of BOUNDARY) assert.ok(cov[k] > 0, `${k} 未被任何小节写到`);
  // 6.2.3 是边界专节：五类痕迹齐全
  const b = list.find((u) => u.sub === '6.2.3');
  for (const k of BOUNDARY) assert.ok(b.rawBody.includes(k), `6.2.3 缺「${k}」`);
});

test('两节各 3 个小节，每节字数都在 5000 字以上（底本按节均分，没有薄节）', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 2);
  for (const [sec, g] of secs) {
    assert.strictEqual(g.units, 3, `${sec} 小节数`);
    assert.ok(g.chars > 5000, `${sec} 只有 ${g.chars} 字`);
  }
});

test('学习目标只在 6.1.1，共 7 条（章级目标，其余小节没有独立目标）', () => {
  const withGoals = list.filter((u) => (u.goals || []).length > 0);
  assert.deepStrictEqual(withGoals.map((u) => u.sub), ['6.1.1']);
  assert.strictEqual(withGoals[0].goals.length, 7);
});
