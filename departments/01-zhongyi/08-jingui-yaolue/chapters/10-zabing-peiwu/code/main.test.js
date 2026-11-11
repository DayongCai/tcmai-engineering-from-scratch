'use strict';
/**
 * 第 10 章 单测：所有断言值都是 node code/main.js 实测输出，改口径必须同步改这里与 docs。
 *   node --test code/main.test.js
 *
 * 底本 v2（174 方 / 165 有方文 / 165 味 / 728 药名次 / 自校验 148 全对）下重算；
 * v1 的旧值只作为「曾经如此」的历史写在注释里，不再是断言目标。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const {
  BOOK, cleanHerb, parseDose, formulas, population,
  cleanupReport, frequencies, topHerbs, herbPairs,
  sizeDist, junProxy, crossSection, selfCountCheck,
} = require('./main.js');

test('总体：174 方 = 165 有方文 + 9 互见（互见方药文为空，不得进配伍统计）', () => {
  const p = population();
  assert.strictEqual(p.formulas, 174);
  assert.strictEqual(p.withText, 165);
  assert.strictEqual(p.refOnly, 9);
  assert.strictEqual(p.declared.formulasWithText, 165, '底本 counts 自带 165，代码要与它对齐');
  assert.strictEqual(p.declared.formulasRefOnly, 9);
  assert.strictEqual(p.declared.formulas, 174);
  const ref = formulas().filter((f) => f.refOnly);
  assert.strictEqual(ref.length, 9);
  for (const f of ref) assert.strictEqual(f.ingredients.length, 0, `${f.name} 是互见方，药味必须为空`);
  assert.deepStrictEqual(
    ref.map((f) => `第${f.pianNo}篇`),
    ['第10篇', '第14篇', '第14篇', '第17篇', '第19篇', '第21篇', '第22篇', '第22篇', '第22篇']
  );
  assert.deepStrictEqual(
    ref.map((f) => f.name).sort(),
    ['大承气汤', '小建中汤', '当归芍药散', '杏子汤', '四逆汤', '膏发煎', '藜芦甘草汤', '越婢加术汤', '当归生姜羊肉汤'].sort()
  );
});

test('药名清洗：165 味 → 154 味，728 次出现不变（清洗只改写法，不增删药味行）', () => {
  const c = cleanupReport();
  assert.strictEqual(c.rawDistinct, 165, '未清洗口径 = 第 1 章报的 165');
  assert.strictEqual(c.cleanDistinct, 154);
  assert.strictEqual(c.tokens, 728);
  assert.strictEqual(c.okTokens, 728);
  assert.strictEqual(c.noteRows, 0, 'v2 把整格夹注拆列后不再有校勘残行（v1 是 2）');
  assert.strictEqual(c.misplacedRows, 0, 'v2 拆列后无方判为药名格错位（v1 是 3）');
  assert.strictEqual(c.okTokens + c.noteRows + c.misplacedRows, 728);
  // 13 种写法归并成 11 味净减：13 行 merged，其中「大附子」「用大附子」同归附子
  assert.strictEqual(c.merged.length, 13);
  assert.strictEqual(c.rawDistinct - c.cleanDistinct, 11);
});

test('清洗规则逐条：炮制尾 / 夹注 / 剂量 / 各 / 规格词 / 量词不误伤', () => {
  const eq = (raw, name, kind = 'ok') => {
    const got = cleanHerb(raw);
    assert.strictEqual(got.name, name, `${raw} → ${got.name}`);
    assert.strictEqual(got.kind, kind, `${raw} kind=${got.kind}`);
  };
  // v2 底本里真实存在的 13 种写法
  eq('甘草如指大', '甘草');                        // 如指大
  eq('半夏大者洗', '半夏');                        // 大者 + 洗
  eq('枳实大者', '枳实');
  eq('甘遂大者', '甘遂');
  eq('白术各等分', '白术');                        // 各等分
  eq('茵陈蒿末', '茵陈蒿');                        // 末
  eq('用大附子', '附子');                          // 头部「用」+ 规格词
  eq('大附子', '附子');
  eq('水蛭百枚', '水蛭');                           // 剂量串进药名列
  eq('生姜汁', '生姜');                            // 剂型后缀
  eq('生地黄汁.', '生地黄');                       // 剂型后缀 + 尾部句读
  eq('鸡子黄.', '鸡子黄');                          // 尾部句读
  eq('滑石.', '滑石');
  // 规则本身照旧有效（v1 留档里的写法，v2 数据已不出现，函数仍须兼容）
  eq('茯苓⟨三两⟩⟨一法四两。⟩', '茯苓');
  eq('半夏大者洗⟨八枚⟩⟨一法半升⟩', '半夏');
  eq('甘草如指大⟨一枚，炙⟩⟨一本作无。⟩', '甘草');
  eq('蜀椒⟨一两⟩⟨一法二分⟩', '蜀椒');
  eq('百合', '百合');                              // 「百」+「合」不得被当成剂量
  eq('五味', '五味');                              // 不得被「味」类尾巴误伤
  eq('干姜', '干姜');                              // 首字不剥：「干姜」≠「姜」
  eq('干地黄', '干地黄');
  eq('⟨深师有生姜二两⟩', '', 'note');
  eq('一法', '', 'note');
  eq('甘草麻黄汤方：', '甘草麻黄汤方', 'misplaced');
  eq('橘皮二升，竹茹二升，大枣三十枚，人参一两，生姜半斤，甘草五两', '橘皮二升，竹茹二升，大枣三十枚，人参一两，生姜半斤，甘草', 'misplaced');
});

test('剂量解析：族内归一，族间不折算', () => {
  assert.deepStrictEqual(parseDose('三两'), { fam: 'w', val: 3 });
  assert.deepStrictEqual(parseDose('半斤'), { fam: 'w', val: 8 });      // 1 斤 = 16 两
  assert.deepStrictEqual(parseDose('一两'), { fam: 'w', val: 1 });
  assert.deepStrictEqual(parseDose('三分'), { fam: 'w', val: 0.75 });   // 1 两 = 4 分
  assert.deepStrictEqual(parseDose('二两，炙'), { fam: 'w', val: 2 });  // 炮制法混在剂量列
  assert.deepStrictEqual(parseDose('半升'), { fam: 'v', val: 5 });      // 1 升 = 10 合
  assert.deepStrictEqual(parseDose('十二枚'), { fam: 'c', val: 12 });
  assert.deepStrictEqual(parseDose('等分'), { fam: 'equal' });
  assert.strictEqual(parseDose(''), null);
  assert.strictEqual(parseDose('熬'), null);
});

test('Top 20 频次：甘草 68 方居首（41.2%），桂枝 41、生姜 37、大枣 32、半夏 30', () => {
  const t = topHerbs(20);
  assert.strictEqual(t.length, 20);
  assert.deepStrictEqual(
    t.slice(0, 5).map((r) => [r.herb, r.formulas]),
    [['甘草', 68], ['桂枝', 41], ['生姜', 37], ['大枣', 32], ['半夏', 30]]
  );
  assert.strictEqual(t[0].rate.toFixed(1), '41.2');
  assert.strictEqual(t[1].rate.toFixed(1), '24.8');
  assert.strictEqual(t[4].rate.toFixed(1), '18.2');
  // 出现率恒以 165 为分母
  for (const r of t) assert.strictEqual(r.rate.toFixed(4), ((r.formulas / 165) * 100).toFixed(4));
  // 前 20 味合计 461 次 = 728 的 63.3%
  assert.strictEqual(t.reduce((n, r) => n + r.tokens, 0), 461);
  assert.strictEqual(((461 / 728) * 100).toFixed(1), '63.3');
  // 频次之和不得超过可用药味行数
  const freq = frequencies();
  assert.strictEqual(freq.reduce((n, r) => n + r.tokens, 0), 728);
  assert.strictEqual(freq.length, 154);
});

test('清洗确实改了排名：附子 16→18（第 13→12）、枳实 12→13、甘草 67→68、半夏 29→30', () => {
  // naive 口径 = 按底本原样药名逐字计数（同一方内去重），即「不清洗直接 count」
  const naive = new Map();
  for (const f of formulas().filter((x) => !x.refOnly)) {
    for (const raw of new Set(f.ingredients.map((i) => i.raw))) naive.set(raw, (naive.get(raw) || 0) + 1);
  }
  const clean = new Map(frequencies().map((r) => [r.herb, r.formulas]));
  assert.strictEqual(naive.get('甘草'), 67);
  assert.strictEqual(clean.get('甘草'), 68);
  assert.strictEqual(naive.get('生姜'), 36);
  assert.strictEqual(clean.get('生姜'), 37);
  assert.strictEqual(naive.get('半夏'), 29);
  assert.strictEqual(clean.get('半夏'), 30);
  assert.strictEqual(naive.get('附子'), 16);
  assert.strictEqual(clean.get('附子'), 18);
  assert.strictEqual(naive.get('白术'), 18);
  assert.strictEqual(clean.get('白术'), 19);
  assert.strictEqual(naive.get('枳实'), 12);
  assert.strictEqual(clean.get('枳实'), 13);
  assert.strictEqual(naive.get('滑石'), 4);
  assert.strictEqual(clean.get('滑石'), 5);
  assert.strictEqual(naive.get('甘遂'), 2);
  assert.strictEqual(clean.get('甘遂'), 3);
  // 名次随之变：附子越过麻黄；白术与 人参 同为 19 方而排前
  const order = frequencies().map((r) => r.herb);
  assert.ok(order.indexOf('附子') < order.indexOf('麻黄'), '清洗后附子 18 方，排在麻黄 17 方之前');
  assert.strictEqual(order.indexOf('附子') + 1, 12);
  assert.strictEqual(order.indexOf('麻黄') + 1, 13);
  assert.strictEqual(clean.get('人参'), 19);
  assert.ok(order.indexOf('白术') < order.indexOf('人参'), '同为 19 方，按同分排序规则白术在前');
  // 带尾巴的写法不得留下
  for (const ghost of ['甘草如指大', '半夏大者洗', '用大附子', '大附子', '白术各等分', '水蛭百枚']) {
    assert.ok(!clean.has(ghost), `未清洗的写法不得留下：${ghost}`);
  }
});

test('药对：同方共现 ≥8 方共 35 对，首位桂枝+甘草 28 方（17.0%）', () => {
  const p = herbPairs(8);
  assert.strictEqual(p.length, 35);
  assert.deepStrictEqual(p.slice(0, 4).map((r) => [r.pair, r.n]), [
    ['桂枝 + 甘草', 28],
    ['大枣 + 甘草', 27],
    ['甘草 + 生姜', 25],
    ['大枣 + 生姜', 24],
  ]);
  assert.strictEqual(p[0].rate.toFixed(1), '17.0');
  for (const r of p) assert.ok(r.n >= 8);
  const map = new Map(p.map((r) => [r.pair, r.n]));
  assert.strictEqual(map.get('甘草 + 芍药'), 18);
  assert.strictEqual(map.get('桂枝 + 芍药'), 17);
  assert.strictEqual(map.get('半夏 + 甘草'), 16);
  assert.strictEqual(map.get('干姜 + 甘草'), 15);
  assert.strictEqual(map.get('人参 + 甘草'), 11);
  // 35 对里 14 对含甘草
  assert.strictEqual(p.filter((r) => r.pair.includes('甘草')).length, 14);
  // 门槛有效：≥9 方要少
  assert.ok(herbPairs(9).length < p.length);
  // 大黄 21 方、甘草 68 方，却只共现 4 方 —— 低于门槛，正是 docs 第四条读法
  const all = new Map(herbPairs(1).map((r) => [r.pair, r.n]));
  assert.strictEqual(all.get('大黄 + 甘草'), 4);
});

test('方剂规模：165 方全量可判，1–23 味，峰值 3 味 34 方，最大 鳖甲煎丸 23 味', () => {
  const sd = sizeDist();
  assert.strictEqual(sd.n, 165, 'v1 是 154（157 − 3 个错位方）；v2 无错位，回到 165 全量');
  assert.deepStrictEqual(sd.rows, [
    { size: 1, n: 13 }, { size: 2, n: 30 }, { size: 3, n: 34 }, { size: 4, n: 21 },
    { size: 5, n: 26 }, { size: 6, n: 12 }, { size: 7, n: 12 }, { size: 8, n: 4 },
    { size: 9, n: 7 }, { size: 10, n: 2 }, { size: 12, n: 2 }, { size: 21, n: 1 }, { size: 23, n: 1 },
  ]);
  assert.strictEqual(sd.rows.reduce((n, r) => n + r.n, 0), 165);
  assert.deepStrictEqual(sd.peak, { size: 3, n: 34 });
  assert.strictEqual(sd.mean.toFixed(2), '4.41');
  assert.strictEqual(sd.median, 4);
  assert.strictEqual(sd.within2to10, 148);
  assert.strictEqual(((sd.within2to10 / sd.n) * 100).toFixed(1), '89.7');
  assert.strictEqual(sd.min.length, 13);
  assert.ok(sd.min.every((x) => x.size === 1));
  assert.strictEqual(sd.max.length, 1);
  assert.strictEqual(sd.max[0].name, '鳖甲煎丸');
  assert.strictEqual(sd.max[0].pianNo, 4);
  assert.strictEqual(sd.max[0].size, 23);
  const sizes = sd.rows.map((r) => r.size);
  assert.deepStrictEqual(sizes, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 21, 23], '实测没有 11、13–20 味');
});

test('君臣佐使只是代理：165 方里只有 45 方可判（27.3%），且 8 方并列', () => {
  const j = junProxy();
  assert.strictEqual(j.total, 165);
  assert.strictEqual(j.judged, 45);
  assert.strictEqual(j.unique, 37);
  assert.strictEqual(j.tie, 8);
  assert.strictEqual(j.equal, 8);
  assert.strictEqual(j.mixed, 76);
  assert.strictEqual(j.noDose, 36);
  assert.strictEqual(j.unique + j.tie + j.equal + j.mixed + j.noDose, 165);
  assert.strictEqual(((j.judged / j.total) * 100).toFixed(1), '27.3');
  assert.strictEqual(j.top[0].herb, '甘草');
  assert.strictEqual(j.top[0].n, 4);
  assert.strictEqual(j.top.filter((t) => t.n === 4).length, 1, '甘草是唯一一个 >2 次的最大剂量药');
  assert.strictEqual(j.top.filter((t) => t.n === 2).length, 5, '最大剂量出现 2 次的药');
  assert.strictEqual(j.top.filter((t) => t.n === 1).length, 23, '其余 23 味各 1 次');
  assert.strictEqual(j.top.reduce((n, t) => n + t.n, 0), 37);
  // 代理覆盖率不到三成 —— docs 必须照此说，不得宣称复原了君臣
  assert.ok(j.judged / j.total < 0.28);
});

test('自校验：原文「右N味」148 方有自述，148 全对、0 不一致', () => {
  const s = selfCountCheck();
  assert.strictEqual(s.stated, 148);
  assert.strictEqual(s.agree, 148);
  assert.strictEqual(s.mismatch.length, 0);
  assert.deepStrictEqual(s.mismatch, []);
  assert.strictEqual(s.noStatement, 17);
  assert.strictEqual(s.stated + s.noStatement, 165);
  assert.strictEqual(s.stated - s.agree, 0, 'v1 曾有 10 方不一致');
});

test('v1 三个药名格错位方在 v2 的去向（反向断言）', () => {
  const byName = new Map(formulas().map((f) => [f.name, f]));
  // 橘皮竹茹汤：v1 整行药文挤在一格（解析 0 味）；v2 六味，与原文「右六味」一致
  const jp = byName.get('橘皮竹茹汤');
  assert.strictEqual(jp.refOnly, false);
  assert.strictEqual(jp.ingredients.filter((i) => i.kind === 'ok').length, 6);
  assert.ok(/右六味/.test(jp.method), '原文自述六味');
  // 越婢加术汤：v1 把下一条方名挤进药名格；v2 归为互见方（方见上，于内加白术），药味为空，不进统计
  const yb = byName.get('越婢加术汤');
  assert.strictEqual(yb.refOnly, true);
  assert.strictEqual(yb.ingredients.length, 0);
  // 百合洗方：v2 把整句洗法拆成 7 个短格、贡献 7 个伪药名（右以／以水／渍之…）。
  // 2026-11-11 在底本解析层修正：「段落以『右』起头视为服法」，并从中提出单味药 → 只有百合 1 味，
  // 洗法整句进 method。这是本章最后一次引用这条缺陷，此后它只是历史。
  const bh = byName.get('百合洗');   // formulas() 已剥尾「方」字
  assert.strictEqual(bh.refOnly, false);
  assert.strictEqual(bh.ingredients.length, 1, '洗方只剩百合一味');
  assert.strictEqual(bh.ingredients[0].name, '百合');
  assert.ok(/以洗身/.test(bh.method), '洗法整句进 method');
  const names = selfCountCheck().mismatch.map((x) => x.name);
  for (const n of ['橘皮竹茹汤', '越婢加术汤', '百合洗方']) {
    assert.ok(!names.includes(n), `${n} 不得再出现在不一致清单里`);
  }
});

test('跨篇：内伤 112 方重甘草/生姜/桂枝，妇人 22 方重芍药/芎䓖/当归', () => {
  const cs = crossSection(6);
  assert.strictEqual(cs.inside.fang, 112);
  assert.strictEqual(cs.women.fang, 22);
  assert.strictEqual(cs.inside.top[0].herb, '甘草');
  assert.strictEqual(cs.inside.top[0].insideRate.toFixed(1), '42.9');
  assert.strictEqual(cs.women.top[0].herb, '芍药');
  assert.strictEqual(cs.women.top[0].womenRate.toFixed(1), '27.3');
  const row = (h) => cs.merged.find((r) => r.herb === h);
  assert.strictEqual(row('甘草').inside, 48);
  assert.strictEqual(row('甘草').women, 5);
  assert.strictEqual(row('甘草').diff.toFixed(1), '20.1');
  assert.strictEqual(row('芍药').inside, 16);
  assert.strictEqual(row('芍药').women, 6);
  assert.strictEqual(row('芍药').diff.toFixed(1), '-13.0');
  assert.strictEqual(row('芎䓖').inside, 3);
  assert.strictEqual(row('芎䓖').women, 4);
  assert.strictEqual(row('当归').inside, 4);
  assert.strictEqual(row('当归').women, 4);
  assert.strictEqual(row('桃仁').women, 3);
  assert.strictEqual(row('阿胶').women, 3);
  assert.ok(row('当归').womenRate > row('当归').insideRate, '当归在妇人篇更集中');
  assert.ok(row('芎䓖').womenRate > row('芎䓖').insideRate);
  assert.ok(row('生姜').insideRate > row('生姜').womenRate, '生姜在内伤篇更集中');
});

test('引文与 docs 数字一致（防 docs 写成旧数）', () => {
  const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  for (const s of ['174', '165', '154', '728', '35 对', '4.41 味', '45 方', '27.3%', '148 全对']) {
    assert.ok(doc.includes(s), `docs/zh.md 缺实测数字「${s}」—— 文档与代码走散了`);
  }
  // 旧口径的主语句不得再出现（v1 的历史只能以「v1」标明，且不许再出现这些数）
  for (const stale of ['分母一律是 **157**', '157 个有方文的方', '151 味', '28 对', '4.45', '44 方', '26.7%', '149 方', '161 味', '734 ', '172 味']) {
    assert.ok(!doc.includes(stale), `docs/zh.md 仍有旧口径表述「${stale}」`);
  }
  assert.ok(doc.includes('病痰饮者，当以温药和之'), 'docs 必含《金匮要略·痰饮咳嗽病脉证并治第十二》引文');
  assert.ok(doc.includes('代理指标'), 'docs 必写明君臣佐使只是代理指标');
  assert.ok(doc.includes('代价与边界'));
});

test('底本结构未动：26 项 · 402 条 · 174 方', () => {
  assert.strictEqual(BOOK.counts.pian, 26);
  assert.strictEqual(BOOK.counts.articles, 402);
  assert.strictEqual(BOOK.counts.formulas, 174);
  assert.strictEqual(BOOK.counts.formulasWithText + BOOK.counts.formulasRefOnly, 174);
  assert.strictEqual(BOOK.counts.herbs, 165);
});
