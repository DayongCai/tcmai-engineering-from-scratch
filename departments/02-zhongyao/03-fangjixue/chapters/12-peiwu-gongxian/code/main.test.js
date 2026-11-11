'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const {
  FORMULAS, ROLES, REPAIRED, slotCount, herbCount, avgSlots, buildNetwork, topByFormulas,
  topByWeight, topPairs, roleDistribution, roleDepth, roleOfHerb, bafaDistribution,
  tailStats, compositionAudit, repairLedger, notInLexiconStats, selfCheck,
} = require('./main.js');

const fmt = (e) => `${e.a}+${e.b}=${e.w}`;
const net = buildNetwork();

test('底座三数：114 首方 · 836 个药位 · 246 味药（平均 7.33）', () => {
  assert.strictEqual(FORMULAS.length, 114);
  assert.strictEqual(slotCount(), 836);
  assert.strictEqual(herbCount(), 246);
  assert.strictEqual(Number(avgSlots().toFixed(2)), 7.33);
  assert.ok(slotCount() > herbCount(), '药位数应大于去重药味数');
});

test('修复回执：五处缺陷全修好，114/114 首有组成，最短 2 味、最长 24 味', () => {
  const ledger = repairLedger();
  assert.strictEqual(ledger.length, 5);
  assert.deepStrictEqual(ledger.filter((r) => !r.ok).map((r) => r.name), [], '仍有未修好的方');
  assert.deepStrictEqual(ledger.map((r) => r.name), ['六一散', '生脉散', '当归补血汤', '四神丸', '消风散']);
  // 三首「曾只抽到 1 味」的方：现在是 2 / 3 / 2 味
  const byName = Object.fromEntries(ledger.map((r) => [r.name, r.got]));
  assert.deepStrictEqual(byName['六一散'], ['滑石', '甘草']);
  assert.deepStrictEqual(byName['生脉散'], ['人参', '麦冬', '五味子']);
  assert.deepStrictEqual(byName['当归补血汤'], ['黄芪', '当归']);
  assert.strictEqual(byName['四神丸'].length, 4, '四神丸曾是 0 味');
  assert.strictEqual(byName['消风散'].length, 13, '消风散曾抓到《局方》同名方的 19 token');

  const a = compositionAudit();
  assert.strictEqual(a.total, 114);
  assert.strictEqual(a.withHerbs, 114);
  assert.deepStrictEqual(a.empty, []);
  assert.strictEqual(a.min, 2);
  assert.deepStrictEqual(a.minNames, ['六一散', '当归补血汤', '瓜蒂散']);
  assert.strictEqual(a.max, 24);
  assert.deepStrictEqual(a.maxNames, ['清暑益气汤']);
  assert.strictEqual(a.hist[2], 3, '只有 3 首 2 味方，且都不是单味方');
  // 组成分布的「从 2 到 15 每个整数都有方，再往上是 17 与 24」
  for (let k = 2; k <= 15; k += 1) assert.ok(a.hist[k] >= 1, `${k} 味方缺失`);
  assert.deepStrictEqual(Object.keys(a.hist).map(Number).sort((x, y) => x - y), [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 24]);
});

test('共现网络：2,364 对不同药、3,341 次共现、可能边 30,135、密度 7.84%', () => {
  assert.strictEqual(net.nodes.length, 246);
  assert.strictEqual(net.edgeCount, 2364);
  assert.strictEqual(net.weightSum, 3341);
  assert.strictEqual(net.possible, 30135);
  assert.strictEqual(Number((net.density * 100).toFixed(2)), 7.84);
  assert.strictEqual(Number((net.weightSum / 114).toFixed(2)), 29.31, '平均每方共现 29.31 次');
  assert.strictEqual(net.edges.reduce((n, e) => n + e.w, 0), net.weightSum);
});

test('完全图投影：单方边数 = C(n,2)，边权最小为 1', () => {
  assert.ok(net.edges.every((e) => e.w >= 1));
  const one = buildNetwork(FORMULAS.filter((f) => f.name === '麻黄汤'));
  assert.strictEqual(one.edgeCount, 6, '麻黄汤 4 味 → 6 对');
  assert.ok(one.edges.every((e) => e.w === 1));
  const big = buildNetwork(FORMULAS.filter((f) => f.name === '独活寄生汤'));
  assert.strictEqual(big.edgeCount, 105, '独活寄生汤 15 味 → 105 对');
  const biggest = buildNetwork(FORMULAS.filter((f) => f.name === '清暑益气汤'));
  assert.strictEqual(biggest.edgeCount, 276, '清暑益气汤 24 味 → 276 对');
  assert.strictEqual(biggest.edgeCount, (24 * 23) / 2);
});

test('度前五：甘草 61 / 当归 30 / 茯苓 27 / 人参 24 / 半夏 21', () => {
  const top = topByFormulas(net, 5);
  assert.deepStrictEqual(top.map((x) => x.name), ['甘草', '当归', '茯苓', '人参', '半夏']);
  assert.deepStrictEqual(top.map((x) => x.formulas.length), [61, 30, 27, 24, 21]);
  assert.strictEqual(Number((61 / 114 * 100).toFixed(1)), 53.5);
});

test('加权度前五：甘草 454 / 当归 254 / 人参 198 / 茯苓 187 / 白术 162', () => {
  const top = topByWeight(net, 5);
  assert.deepStrictEqual(top.map((x) => x.name), ['甘草', '当归', '人参', '茯苓', '白术']);
  assert.deepStrictEqual(top.map((x) => x.weight), [454, 254, 198, 187, 162]);
  // 度序与加权度序不同：人参与茯苓在这两列上互换（人参入方少而每方更大）
  assert.deepStrictEqual(topByFormulas(net, 4).map((x) => x.name), ['甘草', '当归', '茯苓', '人参']);
  // 加权度÷入方数几乎是一条平线：6.67–8.53，而两条入方数相差 3.2 倍（61 vs 19）
  const ratio = (x) => x.weight / x.formulas.length;
  const head = topByFormulas(net, 6);
  assert.ok(Math.min(...head.map(ratio)) > 6.6 && Math.max(...head.map(ratio)) < 8.6);
  assert.strictEqual(Number(ratio(head[0]).toFixed(2)), 7.44);
  assert.strictEqual(Number((head[0].formulas.length / head[5].formulas.length).toFixed(2)), 3.21);
  assert.strictEqual(Number((Math.max(...head.map(ratio)) / Math.min(...head.map(ratio))).toFixed(2)), 1.28);
});

test('药对前五：人参+甘草 20、当归+甘草 20，其后三对并列 14；前 10 有 8 对含甘草', () => {
  const p5 = topPairs(net, 5).map(fmt);
  assert.deepStrictEqual(p5, [
    '人参+甘草=20', '当归+甘草=20', '半夏+甘草=14', '甘草+白术=14', '甘草+茯苓=14',
  ]);
  assert.deepStrictEqual(REPAIRED.map((r) => r.name), ['六一散', '生脉散', '当归补血汤', '四神丸', '消风散']);
  const p10 = topPairs(net, 10);
  assert.strictEqual(p10.filter((e) => e.a === '甘草' || e.b === '甘草').length, 8);
  assert.ok(p10.every((e) => e.w >= 11), '前 10 名的边权都 ≥11');
});

test('君臣佐使：君 105 / 臣 79 / 佐 96 / 使 40，四角色齐 18、三角色以上 80', () => {
  const r = Object.fromEntries(roleDistribution().map((x) => [x.role, x.n]));
  assert.deepStrictEqual(ROLES, ['君', '臣', '佐', '使']);
  assert.deepStrictEqual(r, { 君: 105, 臣: 79, 佐: 96, 使: 40 });
  assert.strictEqual(Number((40 / 114 * 100).toFixed(1)), 35.1);
  const d = roleDepth();
  assert.strictEqual(d.four, 18);
  assert.strictEqual(d.atLeast3, 80);
  assert.ok(r['使'] < r['君'], '使的覆盖最低（横向通用角色）');
});

test('甘草的角色足迹：61 首里使 28、佐 6、君 1、未标 27——度数第一，君位只有 1 次', () => {
  const g = roleOfHerb('甘草');
  assert.strictEqual(g.formulas, 61);
  assert.strictEqual(g.使, 28);
  assert.strictEqual(g.佐, 6);
  assert.strictEqual(g.君, 1);
  assert.strictEqual(g.臣, 0);
  assert.strictEqual(g.unlabelled, 27);
  assert.strictEqual(g.multi, 1);
  // 使药位共有 40 首方，其中 28 首的使药是甘草
  assert.strictEqual(g.使 / 40, 0.7);
});

test('八法：52 首归八法（清 13 最多），62 首不属八法', () => {
  const b = bafaDistribution();
  assert.strictEqual(b.total, 52);
  assert.strictEqual(b.outside, 62);
  const m = Object.fromEntries(b.items.map((i) => [i.fa, i.n]));
  assert.deepStrictEqual(m, { 汗: 8, 吐: 1, 下: 6, 和: 5, 温: 5, 清: 13, 消: 3, 补: 11 });
  assert.strictEqual(b.items.length, 8);
  assert.strictEqual(b.outside + b.total, 114);
});

test('长尾：138/246 味只在一首方里（56.1%）', () => {
  const t = tailStats(net);
  assert.strictEqual(t.once, 138);
  assert.strictEqual(t.total, 246);
  assert.strictEqual(Number((t.ratio * 100).toFixed(1)), 56.1);
  assert.ok(t.once > t.total / 2, '长尾过半');
});

test('词表边界：86 味不在《中药学》287 味词表，其中 16 条是散文残串', () => {
  const lex = notInLexiconStats();
  assert.strictEqual(lex.count, 86);
  assert.strictEqual(lex.stated, 86);
  assert.strictEqual(lex.prose.length, 16);
  assert.ok(lex.prose.includes('于清暑益气之外'));
  assert.deepStrictEqual(lex.top.map((x) => x.name), ['芍药', '杏仁', '竹叶', '粳米', '贝母']);
  assert.strictEqual(lex.top[0].n, 13);
});

test('规模自检十二项全过', () => {
  const c = selfCheck();
  assert.strictEqual(c.length, 12);
  assert.ok(c.every((x) => x.ok), JSON.stringify(c.filter((x) => !x.ok)));
});

test('运行时最后一行是教学边界声明', () => {
  const out = execFileSync('node', ['code/main.js'], { cwd: __dirname + '/..', encoding: 'utf8' });
  const last = out.trim().split('\n').filter(Boolean).pop();
  assert.match(last, /教学边界/);
  assert.match(last, /不构成/);
});
