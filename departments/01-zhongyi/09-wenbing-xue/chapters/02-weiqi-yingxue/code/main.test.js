'use strict';
const assert = require('node:assert');
const test = require('node:test');
const {
  BOOK,
  ARTICLES,
  ASSIGN,
  art,
  layerOf,
  signals,
  distribution,
  ladder,
  permeate,
  gap,
  totals,
  QUIZ,
  docAudit,
} = require('./main.js');

test('底本规模：1 卷 · 37 条（1–37）· 0 方 · 繁字 4433', () => {
  const t = totals();
  assert.strictEqual(t.articles, 37);
  assert.strictEqual(t.sections, 1);
  assert.strictEqual(t.formulas, 0, '《溫熱論》是论不是方书，源页无方文');
  assert.strictEqual(t.charsHant, 4433);
  assert.strictEqual(t.noMin, 1);
  assert.strictEqual(t.noMax, 37);
  assert.ok(t.charsHans > 3000, `简体合计 ${t.charsHans}`);
});

test('条号 1..37 连续且无重号，繁/简两栏皆非空', () => {
  const nos = ARTICLES.map((a) => a.no);
  assert.deepStrictEqual(nos, Array.from({ length: 37 }, (_, i) => i + 1));
  for (const a of ARTICLES) {
    assert.ok(a.zhHant && a.zhHant.length > 0, `第${a.no}条缺繁文`);
    assert.ok(a.zhHans && a.zhHans.length > 0, `第${a.no}条缺简文`);
  }
});

test('原文抽样：关键句必须与留档逐字一致（防凭记忆改字）', () => {
  const must = {
    1: ['温邪上受，首先犯肺', '逆传心包', '肺主气属卫，心主血属营'],
    2: ['在表初用辛凉轻剂', '透风于热外', '渗湿于热下'],
    4: ['渐欲入营也', '营分受热，则血液受劫', '即撤去气药', '急急透斑为要'],
    6: ['邪始终在气分流连者', '可冀其战汗透邪'],
    8: ['卫之后，方言气，营之后，方言血', '在卫汗之可也', '到气才可清气', '入营犹可透热转气', '入血就恐耗血动血，直须凉血散血'],
    29: ['斑属血者恒多，疹属气者不少'],
    37: ['热邪陷入，与血相结', '血结者，身体必重'],
  };
  for (const [no, frags] of Object.entries(must)) {
    for (const f of frags) assert.ok(art(Number(no)).zhHans.includes(f), `第${no}条缺「${f}」`);
  }
});

test('四层分布：卫 3 · 气 5 · 营 2 · 血 1 · 纲 1 · 其他 25 = 37', () => {
  const d = distribution();
  assert.deepStrictEqual(d.卫, [1, 2, 3]);
  assert.deepStrictEqual(d.气, [6, 7, 10, 11, 12]);
  assert.deepStrictEqual(d.营, [4, 5]);
  assert.deepStrictEqual(d.血, [37]);
  assert.deepStrictEqual(d.纲, [8], '第8条是纲，不能压进任何单层');
  assert.strictEqual(d.其他.length, 25);
  assert.strictEqual(d.卫.length + d.气.length + d.营.length + d.血.length + d.纲.length + d.其他.length, 37);
});

test('其他分项：舌诊 14 · 斑疹 4 · 验齿 4 · 妇人 2 · 杂论 1', () => {
  const d = distribution();
  assert.deepStrictEqual(d.kinds, { 杂论: 1, 舌诊: 14, 斑疹: 4, 验齿: 4, 妇人: 2 });
  assert.strictEqual(Object.values(d.kinds).reduce((n, v) => n + v, 0), d.其他.length);
});

test('37 条全部归类，判据非空；未归类条号抛错而不是猜', () => {
  for (let no = 1; no <= 37; no += 1) {
    const r = layerOf(no);
    assert.ok(['卫', '气', '营', '血', '纲', '其他'].includes(r.layer), `第${no}条层名非法`);
    assert.ok(r.why && r.why.length >= 6, `第${no}条缺判据`);
    if (r.layer !== '其他') assert.strictEqual(r.kind, null);
  }
  assert.strictEqual(Object.keys(ASSIGN).length, 37);
  assert.throws(() => layerOf(38), /未归类|无第 38 条/);
  assert.throws(() => layerOf(0), /未归类|无第 0 条/);
});

test('诊断面条不得被摊进四层（舌/斑疹/验齿/妇人 一律其他）', () => {
  const d = distribution();
  const layers = new Set([...d.卫, ...d.气, ...d.营, ...d.血]);
  for (const no of d.其他) assert.ok(!layers.has(no), `第${no}条同时出现在其他与层内`);
  // 第 14（绛舌）与第 16（紫暗舌）虽含「营/血/散血」，仍是舌诊条
  for (const no of [14, 16, 15, 29, 31]) {
    assert.strictEqual(layerOf(no).layer, '其他', `第${no}条应归其他`);
  }
  assert.strictEqual(layerOf(14).kind, '舌诊');
  assert.strictEqual(layerOf(16).kind, '舌诊');
  assert.strictEqual(layerOf(29).kind, '斑疹');
  assert.strictEqual(layerOf(31).kind, '验齿');
});

test('治法阶梯：四级顺序 卫→气→营→血，每级 rule 都是第8条原文子串', () => {
  const L = ladder();
  assert.strictEqual(L.rungs.length, 4);
  assert.deepStrictEqual(L.rungs.map((r) => r.layer), ['卫', '气', '营', '血']);
  assert.deepStrictEqual(L.rungs.map((r) => r.order), [1, 2, 3, 4]);
  for (const r of L.rungs) assert.ok(r.verified, `「${r.rule}」不在第8条原文里`);
  assert.strictEqual(L.guard, '否则前后不循缓急之法，虑其动手便错');
  assert.ok(L.shortcut.includes('逆传心包'));
  assert.strictEqual(L.rungs[0].move, '汗');
  assert.strictEqual(L.rungs[1].move, '清');
  assert.strictEqual(L.rungs[2].move, '透');
  assert.strictEqual(L.rungs[3].move, '凉血散血');
});

test('「透」族：10 条 12 处；层间转出 3 处；「透热转气」四字字面仅 1 次', () => {
  const p = permeate();
  assert.strictEqual(p.articles, 10);
  assert.strictEqual(p.hits, 12);
  assert.deepStrictEqual(p.nos, [2, 4, 6, 8, 13, 14, 19, 26, 29, 32]);
  assert.strictEqual(p.byWord['透热'], 2);
  assert.strictEqual(p.byWord['透营'], 1);
  assert.strictEqual(p.literal, 1, '教材口号「透热转气」在原文字面只出现一次');
  assert.strictEqual(p.transfer.length, 3);
  assert.deepStrictEqual(p.transfer.map((h) => h.no), [8, 14, 19]);
  assert.strictEqual(p.byLayer['其他'], 6, '「透」是跨层通用动词，不是营分专属');
});

test('词表缺口实数：召回 19/37 · 零命中 18 条 · 多桶 8 条', () => {
  const g = gap();
  assert.strictEqual(g.withSignal.length, 19);
  assert.strictEqual(g.withoutSignal.length, 18);
  assert.strictEqual(g.recall, '19/37');
  assert.deepStrictEqual(g.multi, [1, 4, 7, 8, 14, 16, 17, 30]);
  // 零命中里既有真该归层的（3、5），也有纯诊断面的
  assert.ok(g.withoutSignal.includes(3), '卫表鉴别条词表漏掉');
  assert.ok(g.withoutSignal.includes(35));
  // 多桶里既有真跨层，也有只在讲舌
  assert.ok(g.multi.includes(8));
});

test('signals() 只作旁证：空文本返回空桶，不制造命中', () => {
  assert.deepStrictEqual(signals(''), {});
  assert.deepStrictEqual(signals('舌绛而干'), {});
  assert.deepStrictEqual(signals('入营犹可透热转气'), { 营: ['入营', '营'] });
  assert.strictEqual(BOOK.author, '葉桂（天士）');
});

/* ── 正文与 quiz 同源：全部从 docs/zh.md 现读现核 ── */

test('正文写死的数，逐格与《溫熱論》现算一致', () => {
  const a = docAudit();
  assert.ok(a.facts.length >= 6);
  for (const f of a.facts) assert.strictEqual(f.got, f.want, `${f.label}: 现算 ${f.got} ≠ 正文 ${f.want}`);
});

test('第 8 条四级治法引文：正文与原文逐字一致', () => {
  const a = docAudit();
  assert.strictEqual(a.quotes.length, 4);
  for (const q of a.quotes) {
    assert.strictEqual(q.inDoc, true, `正文缺「${q.quote}」`);
    assert.strictEqual(q.inSource, true, `第8条缺「${q.quote}」`);
  }
  assert.deepStrictEqual(a.layerRows.map((r) => [r.layer, r.n]), [['卫', 3], ['气', 5], ['营', 2], ['血', 1], ['纲', 1]]);
});

test('quiz 结构：题量、三段、四选项、解释长度、答案合法', () => {
  const { quiz } = docAudit();
  assert.ok(quiz.total >= 5, `只有 ${quiz.total} 题`);
  for (const s of ['pre', 'check', 'post']) assert.ok(quiz.stage[s] >= 1, `缺 ${s} 段`);
  assert.strictEqual(quiz.allFour, true, '有题不是 4 个选项');
  assert.strictEqual(quiz.badCorrect, 0, 'correct 下标非法');
  assert.ok(quiz.minExplain >= 30, `最短解释只有 ${quiz.minExplain} 汉字`);
});

test('quiz 接地与打散：≥2 道 check 题的正确选项能在正文找到原词', () => {
  const { quiz } = docAudit();
  assert.ok(quiz.groundedChecks >= 2, `只有 ${quiz.groundedChecks} 道 check 题接地`);
  assert.ok(quiz.distinctAnswers >= 3, `正确答案只用了 ${quiz.distinctAnswers} 个位置`);
});

test('quiz 无脚手架残留，且不把引文写成「底本」或来源行', () => {
  const raw = require('node:fs').readFileSync(QUIZ, 'utf8');
  assert.strictEqual(docAudit().quiz.scaffold, false);
  for (const bad of ['三辨', '四位面', '单元规模', '底本', '外源·笈成']) assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
});
