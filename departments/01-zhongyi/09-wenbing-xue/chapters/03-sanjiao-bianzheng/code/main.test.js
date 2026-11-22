'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { JIAO, juanStats, organMap, crossAxis, QUIZ, docAudit } = require('./main.js');

test('三卷齐备：上焦 / 中焦 / 下焦', () => {
  assert.strictEqual(JIAO.length, 3);
  const rows = juanStats().rows;
  assert.deepStrictEqual(rows.map((r) => r.jiao), ['上焦', '中焦', '下焦']);
});

test('三卷规模：80/65 · 99/107 · 78/69，合计 290 条 243 方', () => {
  const { rows, total } = juanStats();
  const pick = (j) => rows.find((r) => r.jiao === j);
  assert.strictEqual(pick('上焦').tiao, 80);
  assert.strictEqual(pick('上焦').fang, 65);
  assert.strictEqual(pick('中焦').tiao, 99);
  assert.strictEqual(pick('中焦').fang, 107);
  assert.strictEqual(pick('下焦').tiao, 78);
  assert.strictEqual(pick('下焦').fang, 69);
  assert.strictEqual(total.tiao, 290);
  assert.strictEqual(total.fang, 243);
  assert.strictEqual(total.fangHerb + total.fangRef, total.fang);
});

test('中焦方条比 > 1（一条并列数方），上焦下焦都 < 1', () => {
  const { rows } = juanStats();
  assert.ok(rows.find((r) => r.jiao === '中焦').perFang > 1, '中焦方条比应大于 1');
  assert.ok(rows.find((r) => r.jiao === '上焦').perFang < 1);
  assert.ok(rows.find((r) => r.jiao === '下焦').perFang < 1);
});

test('凡例与原病篇不在三焦内（另计），否则条数虚增 33', () => {
  const { rows, extra } = juanStats();
  const sum = rows.reduce((n, r) => n + r.tiao, 0);
  const extraTiao = extra.reduce((n, e) => n + e.tiao, 0);
  assert.strictEqual(sum, 257);
  assert.strictEqual(extraTiao, 33, '凡例 14 + 原病篇 19');
  assert.strictEqual(sum + extraTiao, 290);
});

test('六病位：肺 33 条 / 心包 4 条 / 胃 43 条 / 脾 13 条 / 肾 16 条 / 肝 6 条', () => {
  const om = organMap();
  assert.strictEqual(om.length, 6);
  const by = (w) => om.find((o) => o.wei.startsWith(w));
  assert.strictEqual(by('肺').tiao, 33);
  assert.strictEqual(by('心包').tiao, 4);
  assert.strictEqual(by('胃').tiao, 43);
  assert.strictEqual(by('脾').tiao, 13);
  assert.strictEqual(by('腎').tiao, 16);
  assert.strictEqual(by('肝').tiao, 6);
  assert.ok(by('肺').tiao > by('心包').tiao * 5, '上焦重心在肺不在心包');
});

test('代表方必须能在方表里查到（不许编方名）', () => {
  for (const o of organMap()) {
    for (const f of o.rep) assert.ok(f && f.length >= 2, `${o.wei} 代表方为空`);
    assert.strictEqual(o.missing.length, 0, `${o.wei} 有查不到的代表方：${o.missing.join('、')}`);
  }
});

test('卫气营血 × 三焦：6 组里只有 1 组严格对上，另有 2 组无对应', () => {
  const c = crossAxis();
  assert.strictEqual(c.rows.length, 6);
  assert.strictEqual(c.aligned, 1);
  assert.strictEqual(c.gaps, 2);
  const levels = c.rows.map((r) => r.level);
  assert.deepStrictEqual(levels, ['对上', '一对多', '部分重合', '跨三段', '对不上', '对不上']);
  assert.strictEqual(c.rows[0].weiqi, '衛分');
  assert.strictEqual(c.rows[0].sanjiao, '上焦·肺');
});

test('气分横跨两焦（一对多），血分散在三焦（跨三段）', () => {
  const c = crossAxis();
  const qi = c.rows.find((r) => r.weiqi === '氣分');
  const xue = c.rows.find((r) => r.weiqi === '血分');
  assert.ok(qi.sanjiao.includes('上焦') && qi.sanjiao.includes('中焦'), '气分应跨上中焦');
  assert.strictEqual(qi.level, '一对多');
  assert.strictEqual(xue.level, '跨三段');
  for (const j of ['上焦', '中焦', '下焦']) assert.ok(xue.sanjiao.includes(j), `血分应在${j}有落点`);
});

/* ── 正文与 quiz 同源：读 docs/zh.md 现算后逐格断言 ── */

test('正文三卷表与六病位表，逐格与底本现算一致', () => {
  const a = docAudit();
  assert.ok(a.facts.length >= 12);
  for (const f of a.facts) assert.strictEqual(f.got, f.want, `${f.label}: 现算 ${f.got} ≠ 正文 ${f.want}`);
});

test('正文三条引文逐字落在底本条文里', () => {
  for (const q of docAudit().quotes) {
    assert.strictEqual(q.inDoc, true, `正文缺「${q.quote.slice(0, 12)}…」`);
    assert.strictEqual(q.inSource, true, `底本缺「${q.quote.slice(0, 12)}…」`);
  }
});

test('quiz 结构：题量、三段、四选项、解释长度、答案合法', () => {
  const { quiz } = docAudit();
  assert.ok(quiz.total >= 5);
  for (const s of ['pre', 'check', 'post']) assert.ok(quiz.stage[s] >= 1, `缺 ${s} 段`);
  assert.strictEqual(quiz.allFour, true);
  assert.strictEqual(quiz.badCorrect, 0);
  assert.ok(quiz.minExplain >= 30, `最短解释 ${quiz.minExplain} 汉字`);
});

test('quiz 接地与打散：≥2 道 check 题的正确选项能在正文找到原词', () => {
  const { quiz } = docAudit();
  assert.ok(quiz.groundedChecks >= 2, `只有 ${quiz.groundedChecks} 道接地`);
  assert.ok(quiz.distinctAnswers >= 3, `答案只用了 ${quiz.distinctAnswers} 个位置`);
});

test('quiz 无脚手架残留，且不把引文写成「底本」或来源行', () => {
  const raw = require('node:fs').readFileSync(QUIZ, 'utf8');
  assert.strictEqual(docAudit().quiz.scaffold, false);
  for (const bad of ['三辨', '四位面', '单元规模', '底本', '外源·笈成']) assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
});
