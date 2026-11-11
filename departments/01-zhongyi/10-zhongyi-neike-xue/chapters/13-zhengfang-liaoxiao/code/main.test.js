'use strict';
/**
 * 第 13 章单测：锁住 docs/zh.md 里出现的每一个实数。
 * 口径改动必须先红一次，再去改正文 —— 顺序反了，正文就成了估读。
 */
const assert = require('node:assert');
const test = require('node:test');
const {
  BASE, FANGJI, chain, outline, collision, terms, outcome, fangCross, splitFang, bafa,
} = require('./main.js');

test('底本规模：12 章 / 83 节 / 384 小节 / 384 条目 / 329,826 汉字', () => {
  assert.strictEqual(BASE.counts.chapters, 12);
  assert.strictEqual(BASE.counts.secs, 83);
  assert.strictEqual(BASE.counts.subs, 384);
  assert.strictEqual(BASE.counts.items, 384);
  assert.strictEqual(BASE.counts.hanzi, 329826);
  assert.strictEqual(BASE.chapters.length, 12);
});

test('链条：312 条完整三元组，证名 287 / 治法 304 / 代表方 251', () => {
  const c = chain();
  assert.strictEqual(c.total, 312);
  assert.strictEqual(c.zheng, 287);
  assert.strictEqual(c.zhi, 304);
  assert.strictEqual(c.fang, 251);
  // 每条都必须三件齐全，且非空
  for (const r of c.rows) {
    assert.ok(r.zheng && r.zheng.length >= 2, `证名为空：第${r.ch}章 ${r.sec}`);
    assert.ok(r.zhi && r.zhi.length >= 2, `治法为空：第${r.ch}章 ${r.zheng}`);
    assert.ok(r.fang && r.fang.length >= 2, `代表方为空：第${r.ch}章 ${r.zheng}`);
    assert.ok(r.ch >= 4 && r.ch <= 11);
  }
});

test('分章条数：第 4–11 章合计 312；第 6 章最多（54），第 10 章最少（25）', () => {
  const c = chain();
  const sum = Object.values(c.byChapter).reduce((a, v) => a + v.rows, 0);
  assert.strictEqual(sum, 312);
  assert.strictEqual(c.byChapter[4].rows, 42);
  assert.strictEqual(c.byChapter[6].rows, 54);
  assert.strictEqual(c.byChapter[10].rows, 25);
  assert.strictEqual(c.byChapter[11].rows, 32);
});

test('段内出现疗效/转归/预后/随访/复查的只有 12 条 —— 三百多条链条末端基本不写结果', () => {
  assert.strictEqual(chain().withOutcome, 12);
});

test('纲要 49 条用冒号式，与各论句号式不同一种写法，两处不混算', () => {
  const o = outline();
  assert.strictEqual(o.total, 49);
  assert.ok(o.rows.every((r) => r.ch === 3));
  assert.ok(o.rows.some((r) => r.zheng === '风寒束肺证'));
  assert.ok(o.rows.some((r) => r.zheng === '痰热壅肺证'), '同段里的第二个证也要取到');
  assert.ok(o.rows.some((r) => r.zheng === '血瘀证'));
});

test('同法同方而异名 6 组：暑湿三名同法同方；四组跨纲要与各论，一组章内换名，一组跨病类', () => {
  const c = collision();
  assert.strictEqual(c.total, 361);
  assert.strictEqual(c.groups.length, 6);
  const shu = c.groups.find((g) => g.zhi === '清暑祛湿解表');
  assert.deepStrictEqual(shu.names.sort(), ['暑湿伤表证', '暑湿犯表证', '暑湿困表证'].sort());
  assert.ok(shu.where.includes('第4章·感冒') && shu.where.includes('第11章·高热'));
  const crossOutline = c.groups.filter((g) => g.where.some((w) => w.startsWith('第3章')));
  assert.strictEqual(crossOutline.length, 4, '四组的两个名字分别落在纲要与各论');
  const names = new Set(c.groups.flatMap((g) => g.names));
  assert.strictEqual(names.size, 13);
});

test('词频：证候 155 / 治法 509 / 方剂 24 / 疗效 117；实例名 证型 29 / 代表方 426', () => {
  const t = terms();
  assert.strictEqual(t.total['证候'], 155);
  assert.strictEqual(t.total['治法'], 509);
  assert.strictEqual(t.total['方剂'], 24);
  assert.strictEqual(t.total['疗效'], 117);
  assert.strictEqual(t.total['证型'], 29);
  assert.strictEqual(t.total['代表方'], 426);
});

test('分层：类名住理论层（1/2/12）与纲要（3），例名住各论（4–11）', () => {
  const t = terms();
  assert.strictEqual(t.theory['证候'], 103);
  assert.strictEqual(t.theory['方剂'], 23);
  assert.strictEqual(t.clinical['证候'], 27);
  assert.strictEqual(t.clinical['方剂'], 1);
  assert.strictEqual(t.clinical['治法'], 401);
  // 三层相加才等于总数：第 3 章（纲要，25 次）既不在理论层也不在各论层
  assert.strictEqual(t.per[3].words['证候'], 25);
  assert.strictEqual(t.theory['证候'] + t.clinical['证候'] + t.per[3].words['证候'], 155);
  assert.strictEqual(t.theory['方剂'] + t.clinical['方剂'], 24);
});

test('第四段没有试验口径效应量：有效率/治愈率/显效率/总有效率 各 0，而疗效 117', () => {
  const o = outcome();
  assert.strictEqual(o.hasTrialRate, false);
  for (const r of o.trialRates) assert.strictEqual(r.n, 0, `${r.term} 应为 0`);
  const get = (k) => o.instruments.find((x) => x.term === k).n;
  assert.strictEqual(get('疗效'), 117);
  assert.strictEqual(get('量表'), 13);
  assert.strictEqual(get('随访'), 55);
  assert.strictEqual(get('睡眠日记'), 1);
  assert.strictEqual(get('尼莫地平'), 1);
  // 疾病层面的率存在，但不能当效应量：本章正文已把这层分开写
  assert.ok(o.epiRates.find((x) => x.term === '生存率').n >= 1);
});

test('方剂层交叉：412 实例 / 249 不同方名 / 命中 69 个不同方名、160 个实例 / 45 首未用', () => {
  const x = fangCross();
  assert.strictEqual(FANGJI.counts.formulas, 114);
  assert.strictEqual(x.layerSize, 114);
  assert.strictEqual(x.instances, 412);
  assert.strictEqual(x.unique, 249);
  assert.strictEqual(x.hitUnique, 69);
  assert.strictEqual(x.hitInstances, 160);
  assert.strictEqual(x.unusedCount, 45);
  assert.ok(x.unused.includes('小柴胡汤'), '小柴胡汤在方剂层但不在内科代表方位');
  assert.ok(x.missesSample.includes('荆防败毒散'), '荆防败毒散不在 114 首里');
});

test('拆方规则：合方拆成两首，加减与书名号剥离', () => {
  assert.deepStrictEqual(splitFang('三拗汤合止嗽散加减'), ['三拗汤', '止嗽散']);
  assert.deepStrictEqual(splitFang('《千金》苇茎汤合如金解毒散加减'), ['苇茎汤', '如金解毒散']);
  assert.deepStrictEqual(splitFang('消渴方加减（《丹溪心法》）'), ['消渴方']);
  assert.deepStrictEqual(splitFang('六味地黄丸，或左归丸'), ['六味地黄丸', '左归丸']);
});

test('治法层宽度：八法 52 首，不属八法 62 首，合计 114', () => {
  const b = bafa();
  assert.strictEqual(b.inBafa, 52);
  assert.strictEqual(b.outside, 62);
  assert.strictEqual(b.inBafa + b.outside, 114);
  const sum = b.items.reduce((a, i) => a + i.n, 0);
  assert.strictEqual(sum, 52);
  assert.strictEqual(b.items.length, 8, '八法 = 汗吐下和温清消补，正好八条');
  assert.deepStrictEqual(b.items.map((i) => i.fa), ['汗', '吐', '下', '和', '温', '清', '消', '补']);
  assert.ok(b.outsideNames.includes('四神丸'), '固涩剂落在八法之外');
});
