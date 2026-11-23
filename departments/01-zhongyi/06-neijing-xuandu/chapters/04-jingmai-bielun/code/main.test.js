'use strict';
/**
 * 第 4 章的习题与正文对齐：篇章数字、引文、quiz 结构，全部从语料现算后断言。
 * 底本换版、正文改数、引文改字、quiz 跑题，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const { analyze, hanzi, ratio, norm } = require('./main.js');

const r = analyze();

test('正文「底本对读」表的每一行都能由两份语料现算出来', () => {
  assert.ok(r.rows.length > 0, '正文里没有篇目表');
  for (const row of r.rows) {
    assert.ok(row.computed, `${row.title}: ${row.why}`);
    assert.strictEqual(row.computed.xuanduHanzi, row.xuanduHanzi, `${row.title} 教材本字数对不上`);
    assert.strictEqual(row.computed.fullHanzi, row.fullHanzi, `${row.title} 全文字数对不上`);
    assert.ok(Math.abs(row.computed.ratio - row.ratio) <= 0.001, `${row.title} 相似度 ${row.computed.ratio} ≠ 正文 ${row.ratio}`);
    assert.strictEqual(row.computed.edition, row.edition, `${row.title} 全文/节选判定对不上`);
    assert.strictEqual(row.locatorOk, true, `${row.title} 的定位写法与教材本不一致`);
  }
});

test('合计行 = 各篇之和，覆盖率与节选篇数一致', () => {
  const sumX = r.rows.reduce((a, x) => a + x.computed.xuanduHanzi, 0);
  const sumF = r.rows.reduce((a, x) => a + x.computed.fullHanzi, 0);
  assert.strictEqual(sumX, r.totals.xuanduHanzi, '教材本合计算不平');
  assert.strictEqual(sumF, r.totals.fullHanzi, '全文合计算不平');
  assert.strictEqual(r.totals.pians, r.rows.length, '篇数与表行数不一致');
  assert.strictEqual(Number(((100 * sumX) / sumF).toFixed(1)), r.totals.coverage, '覆盖率对不上');
  assert.strictEqual(r.rows.filter((x) => x.computed.edition === '节选').length, r.totals.excerpt, '节选篇数对不上');
});

test('正文每一条引文都逐字落在所标的那一篇里', () => {
  assert.ok(r.quotes.length >= 1, '正文没有可核的引文');
  for (const q of r.quotes) {
    assert.ok(q.hit, `《${q.pian}》「${q.text.slice(0, 20)}…」未命中：${q.why}`);
    assert.ok(q.hanzi >= 8, `《${q.pian}》的引文只有 ${q.hanzi} 字，太短不足以核`);
  }
});

test('正文写死的数字与语料现算一致', () => {
  assert.strictEqual(r.facts.length >= 8, true);
  for (const f of r.facts) assert.strictEqual(f.got, f.want, `${f.label}: 现算 ${f.got} ≠ 正文 ${f.want}`);
});

test('正文引到的关键词，在所称的那一篇里确有这么多处', () => {
  for (const p of r.probes) assert.strictEqual(p.got, p.want, `《${p.scope}》「${p.term}」现算 ${p.got} ≠ 正文 ${p.want}`);
});

test('相似度实现与 difflib 同构：自己比自己为 1，改一个字会掉下来', () => {
  const a = norm('阴阳者，天地之道也，万物之纲纪').join('');
  assert.strictEqual(ratio(a, a), 1);
  const b = norm('阴阳者，天地之道也，万物之纲目').join('');
  assert.ok(ratio(a, b) < 1 && ratio(a, b) > 0.9);
});

test('quiz 结构：题量、三段、四选项、解释长度、答案合法', () => {
  const q = r.quiz;
  assert.ok(q.total >= 5, `只有 ${q.total} 题`);
  for (const s of ['pre', 'check', 'post']) assert.ok(q.stage[s] >= 1, `缺 ${s} 段`);
  assert.strictEqual(q.allFourOptions, true, '有题不是 4 个选项');
  assert.strictEqual(q.badCorrect, 0, 'correct 下标非法');
  assert.ok(q.minExplain >= 30, `最短的解释只有 ${q.minExplain} 汉字`);
});

test('quiz 接地：check 题的正确选项能在正文找到原词，且答案打散', () => {
  assert.ok(r.quiz.checkGrounded >= 2, `只有 ${r.quiz.checkGrounded} 道 check 题接地`);
  assert.ok(r.quiz.distinctAnswers >= 3, `正确答案只用到了 ${r.quiz.distinctAnswers} 个位置`);
});

test('quiz 不出现正文之外的脚手架名目', () => {
  const raw = JSON.stringify(r.quiz) + require('node:fs').readFileSync(require('./main.js').QUIZ, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
});

test('正文与 quiz 用同一套术语：篇名都在全书里查得到', () => {
  for (const row of r.rows) assert.ok(r.corpus.byTitle.get(row.title) || r.corpus.byTitle.get(require('./main.js').ALIAS[row.title] || row.title), `${row.title} 不在全文语料里`);
  assert.ok(hanzi(r.corpus.longest.text) === r.corpus.longest.hanzi);
});

test('实测值钉死：全书口径与本章覆盖率不随代码改动漂移', () => {
  // 全书语料（155,206 字 / 162 篇 / 3,147 段）与本章合计按实测定值写死。
  // 语料或正文一改这里先红，再决定是改数还是改文，不许让 want 跟着 got 走。
  assert.deepStrictEqual(
    {
      pians: r.corpus.total.pians,
      hanzi: r.corpus.total.hanzi,
      blocks: r.corpus.total.blocks,
      suwen: r.corpus.byBook.素问.hanzi,
      lingshu: r.corpus.byBook.灵枢.hanzi,
      median: r.corpus.median,
    },
    { pians: 162, hanzi: 155206, blocks: 3147, suwen: 88940, lingshu: 66266, median: 696.5 },
  );
  assert.deepStrictEqual(
    { pians: r.totals.pians, xuandu: r.totals.xuanduHanzi, full: r.totals.fullHanzi, coverage: r.totals.coverage, excerpt: r.totals.excerpt },
    { pians: 5, xuandu: 6048, full: 6911, coverage: 87.5, excerpt: 1 },
  );
});
