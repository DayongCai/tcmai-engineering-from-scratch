'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const {
  FORMULAS, formOf, formDistribution, formDrift, specialDecoctions, specialCoverage,
  servingDistribution, externalUse, usageVolume, libraryCoverage, selfCheck,
} = require('./main.js');

const dist = Object.fromEntries(formDistribution().items.map((x) => [x.form, x.n]));
const sp = Object.fromEntries(specialDecoctions().map((x) => [x.kw, x]));

test('剂型分布：汤 63 · 散 26 · 丸 16 · 饮 5 · 煎 1 · 丹 1 · 其他 2，合计 114', () => {
  assert.strictEqual(FORMULAS.length, 114);
  assert.strictEqual(dist['汤'], 63, '汤剂 63 首，占 55.3%');
  assert.strictEqual(dist['散'], 26);
  assert.strictEqual(dist['丸'], 16);
  assert.strictEqual(dist['饮'], 5);
  assert.strictEqual(dist['煎'], 1);
  assert.strictEqual(dist['丹'], 1);
  assert.strictEqual(dist['其他'], 2);
  assert.strictEqual(dist['膏'], 0, '114 首里没有一首以膏名方');
  assert.strictEqual(Object.values(dist).reduce((a, b) => a + b, 0), 114);
});

test('方名后缀不等于剂型实测：竹叶石膏汤算汤不算膏，一贯煎／天王补心丹／小蓟饮子各归其类', () => {
  assert.strictEqual(formOf('竹叶石膏汤'), '汤');
  assert.strictEqual(formOf('大黄牡丹汤'), '汤', '含「丹」字但不是丹剂');
  assert.strictEqual(formOf('一贯煎'), '煎');
  assert.strictEqual(formOf('天王补心丹'), '丹');
  assert.strictEqual(formOf('小蓟饮子'), '其他');
  assert.strictEqual(formOf('痛泻要方'), '其他');
});

test('剂型漂移：非汤名 51 首，其中 31 首用法提到「作汤剂」，9 首明写现代多作／今多改作汤剂', () => {
  const d = formDrift();
  assert.strictEqual(d.nonTang, 51);
  assert.strictEqual(d.mentionsTang.length, 31);
  assert.strictEqual(Number((31 / 51 * 100).toFixed(1)), 60.8);
  assert.strictEqual(d.explicit.length, 9);
  for (const n of ['麻子仁丸', '普济消毒饮', '导赤散', '泻白散', '清胃散', '防风通圣散', '天台乌药散', '川芎茶调散', '消风散']) {
    assert.ok(d.explicit.includes(n), `${n} 应在明写漂移的 9 首内`);
  }
});

test('特殊煎法词频：先煎 39→35、后下 33→29、包煎 8、另煎 5、烊化 8、冲服 15、煎汤代水 2、泡服 0', () => {
  const rows = {
    先煎: [39, 4, 35, 64],
    后下: [33, 4, 29, 35],
    包煎: [8, 0, 8, 9],
    另煎: [5, 0, 5, 5],
    烊化: [8, 0, 8, 15],
    冲服: [15, 0, 15, 17],
    煎汤代水: [2, 0, 2, 2],
    泡服: [0, 0, 0, 0],
  };
  for (const [kw, [m, neg, net, occ]] of Object.entries(rows)) {
    assert.strictEqual(sp[kw].mentions, m, `${kw} 提及方数`);
    assert.strictEqual(sp[kw].negated, neg, `${kw} 否定方数`);
    assert.strictEqual(sp[kw].net, net, `${kw} 需用方数`);
    assert.strictEqual(sp[kw].occurrences, occ, `${kw} 字面出现次数`);
  }
  assert.strictEqual(specialDecoctions().reduce((n, x) => n + x.mentions, 0), 110);
  assert.strictEqual(specialDecoctions().reduce((n, x) => n + x.negated, 0), 8);
  assert.strictEqual(specialDecoctions().reduce((n, x) => n + x.net, 0), 102);
});

test('否定句裁决：黄连解毒汤等四首「无须先煎」不算，血府逐瘀汤有肯定句仍算需用', () => {
  assert.deepStrictEqual(sp['先煎'].negNames.slice().sort(), ['生化汤', '补阳还五汤', '泻白散', '黄连解毒汤'].sort());
  assert.deepStrictEqual(sp['后下'].negNames.slice().sort(), ['血府逐瘀汤', '补阳还五汤', '泻白散', '黄连解毒汤'].sort());
  // 同一句里既有否定又有肯定：按需用计
  assert.ok(sp['先煎'].netNames.includes('血府逐瘀汤'));
  assert.ok(!sp['后下'].netNames.includes('血府逐瘀汤'));
  // 硬证据：原文里确实是「无须特殊先煎、后下」与「然牛膝宜先煎」
  const xf = FORMULAS.find((f) => f.name === '血府逐瘀汤').parts['用法用量'];
  assert.ok(xf.includes('无须特殊先煎、后下之法'));
  assert.ok(xf.includes('牛膝宜先煎'));
});

test('需用特殊煎法覆盖 63/114 首（55.3%）：连续五首无特殊煎法的方不在这批里', () => {
  const cov = specialCoverage();
  assert.strictEqual(cov.n, 63);
  assert.strictEqual(cov.total, 114);
  assert.strictEqual(Number((cov.ratio * 100).toFixed(1)), 55.3);
  assert.ok(cov.names.includes('麻黄汤'), '先煮麻黄去上沫');
  assert.ok(cov.names.includes('白虎汤'), '石膏打碎先煎');
  assert.ok(cov.names.includes('温经汤'), '阿胶烊化');
  assert.ok(!cov.names.includes('桂枝汤'), '桂枝汤无特殊煎法');
});

test('服法：温服 99 · 热服 11 · 冷服 1 · 频服 12 · 顿服 5；空腹 10 · 饭前 9 · 饭后 12 · 睡前 2', () => {
  const sv = servingDistribution();
  const m = Object.fromEntries(sv.temp.concat(sv.time).map((x) => [x.kw, x.n]));
  assert.deepStrictEqual(m, { 温服: 99, 热服: 11, 冷服: 1, 频服: 12, 顿服: 5, 空腹: 10, 饭前: 9, 饭后: 12, 睡前: 2 });
  assert.strictEqual(Number((m['温服'] / 114 * 100).toFixed(1)), 86.8);
  assert.ok(sv.temp.find((x) => x.kw === '冷服').names.includes('清胃散'), '唯一的冷服是清胃散');
  assert.deepStrictEqual(sv.time.find((x) => x.kw === '睡前').names, ['朱砂安神丸', '酸枣仁汤']);
});

test('内服／外用：粗扫 5 首 → 只供外用 0 首 · 兼用外治 3 首 · 否定或假阳性 2 首', () => {
  const e = externalUse();
  assert.strictEqual(e.coarseN, 5);
  assert.deepStrictEqual(e.coarse.sort(), ['仙方活命饮', '川芎茶调散', '犀角地黄汤', '消风散', '五味消毒饮'].sort());
  assert.deepStrictEqual(e.onlyExternal, []);
  assert.deepStrictEqual(e.adjunct.sort(), ['仙方活命饮', '川芎茶调散', '犀角地黄汤'].sort());
  assert.deepStrictEqual(e.negated.sort(), ['五味消毒饮', '消风散'].sort());
  assert.deepStrictEqual(e.unclear, []);
  assert.strictEqual(e.internal, 109);
  for (const r of e.rows) {
    assert.ok(r.present && r.triggerOk, `${r.name} 的裁定依据须在原文里`);
  }
});

test('篇幅：用法用量 39,375 字，占六段 323,306 字的 12.18%，平均 345.4 字／方', () => {
  const v = usageVolume();
  assert.strictEqual(v.use, 39375);
  assert.strictEqual(v.all, 323306);
  assert.strictEqual(Number((v.share * 100).toFixed(2)), 12.18);
  assert.strictEqual(Number(v.avg.toFixed(1)), 345.4);
  assert.deepStrictEqual([v.max.name, v.max.len], ['痛泻要方', 497]);
  assert.deepStrictEqual([v.min.name, v.min.len], ['九味羌活汤', 242]);
});

test('剂型谱边界：教材举的 20 个剂型示例方，库内 10、库外 10，膏丹糊丸示范方全在库外', () => {
  const c = libraryCoverage();
  assert.strictEqual(c.total, 20);
  assert.strictEqual(c.inside.length, 10);
  assert.deepStrictEqual(c.outside, ['鳖甲煎丸', '舟车丸', '控涎丹', '琼玉膏', '狗皮膏', '红升丹', '白降丹', '至宝丹', '紫雪散', '活络丹']);
  for (const n of ['琼玉膏', '红升丹', '舟车丸']) {
    assert.ok(c.outside.includes(n));
    assert.ok(!FORMULAS.some((f) => f.name === n), `${n} 确实不在 114 首内`);
  }
});

test('规模自检 21 项全部通过（任一项不符即抛错）', () => {
  const checks = selfCheck();
  assert.strictEqual(checks.length, 21);
  assert.deepStrictEqual(checks.filter((c) => !c.ok), []);
});

test('运行时最后一行是教学边界声明，且带「不构成」', () => {
  const out = execFileSync('node', ['code/main.js'], { encoding: 'utf8' });
  const last = out.trim().split('\n').filter(Boolean).pop();
  assert.match(last, /教学边界/);
  assert.match(last, /不构成/);
  assert.ok(out.includes('7,742'), '输出须报教材第4章 7,742 字');
  assert.ok(out.includes('需用 35'));
});
