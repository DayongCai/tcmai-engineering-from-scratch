'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { totals, profile, zaoType, ganZao, fuShu, diffTable, SEC_DEFS, QUIZ, docAudit } = require('./main.js');

const rows = () => (zaoType().rows || zaoType());

test('五篇规模：22 条辨 · 36 段 · 22 方（13 有方文 + 9 互见）· 5502 字', () => {
  const t = totals();
  assert.strictEqual(t.tiao, 22);
  assert.strictEqual(t.duan, 36);
  assert.strictEqual(t.fang, 22);
  assert.strictEqual(t.fangWen, 13);
  assert.strictEqual(t.fangRef, 9);
  assert.strictEqual(t.fangWen + t.fangRef, t.fang);
  assert.strictEqual(t.chars, 5502);
});

test('分段型不混算：补论 22 段里 14 段是方后主治', () => {
  const secs = profile();
  const bu = secs.find((s) => /補秋燥|补秋燥/.test(s.label || ''));
  assert.ok(bu, '缺补秋燥胜气论篇');
  assert.strictEqual(bu.duan, 22);
  assert.strictEqual(bu.tiao, 8);
  assert.strictEqual(bu.zhuZhi, 14);
  assert.strictEqual(bu.tiao + bu.zhuZhi, bu.duan);
});

test('中焦秋燥 0 条却有 4 方（方无本文）', () => {
  const secs = profile();
  const zj = secs.find((s) => /中焦.*秋燥/.test(s.label || ''));
  assert.ok(zj, '缺中焦秋燥篇');
  assert.strictEqual(zj.tiao, 0);
  assert.strictEqual(zj.fang, 4);
});

test('判型分布：温燥 5 · 凉燥 6 · 兼见 2 · 未定 1', () => {
  const t = {};
  for (const r of rows()) t[r.type] = (t[r.type] || 0) + 1;
  assert.deepStrictEqual(t, { 温燥: 5, 凉燥: 6, 兼见: 2, 未定: 1 });
  assert.strictEqual(rows().length, 14);
});

test('凉燥全在补论、温燥全在秋燥正文（这是本章的核心发现）', () => {
  const r = rows();
  const wen = r.filter((x) => x.type === '温燥');
  const liang = r.filter((x) => x.type === '凉燥');
  assert.ok(wen.every((x) => /^上焦·秋燥/.test(x.sec)), '温燥应全在秋燥篇');
  assert.ok(liang.every((x) => /補秋燥|补秋燥/.test(x.sec)), '凉燥应全在补论');
});

test('双通道：12 条无方证、2 条词证缺（几乎没有两条通道齐备的）', () => {
  const agree = {};
  for (const r of rows()) agree[r.agree] = (agree[r.agree] || 0) + 1;
  assert.strictEqual(agree['无方证'], 12);
  assert.strictEqual(agree['词证缺'], 2);
});

test('燥证症状词：咳 12 · 涩 6 · 干 3 · 裂 0', () => {
  const g = ganZao();
  const by = (c) => (g.rows.find((r) => r.char === c) || {}).count;
  assert.strictEqual(by('咳'), 12);
  assert.strictEqual(by('涩'), 6);
  assert.strictEqual(by('干'), 3);
  assert.strictEqual(by('裂'), 0, '「裂」在本书 0 次，别当常用词引');
});

test('伏暑有时间轴（长夏受暑 → 霜前轻 / 霜后重 / 冬日尤重）', () => {
  const f = fuShu();
  const row = (f.rows || f).find((r) => r.no === '三六');
  assert.ok(row, '缺伏暑第三六条');
  assert.ok(row.time.includes('长夏'));
  assert.strictEqual(row.stage.length, 5);
  assert.ok(row.stage.join('|').includes('冬日·尤重'));
});

test('秋燥 vs 伏暑 鉴别表 10 维，且每格原文都能回查（ok 全真）', () => {
  const d = diffTable();
  assert.strictEqual(d.length, 10);
  for (const row of d) {
    assert.ok(row.dim && row.zao && row.shu, `维度 ${row.dim} 结构不全`);
    assert.strictEqual(row.zao.ok, true, `${row.dim} 秋燥侧原文回查失败：${row.zao.ref}`);
    assert.strictEqual(row.shu.ok, true, `${row.dim} 伏暑侧原文回查失败：${row.shu.ref}`);
  }
});

test('五个篇名常量齐全（不靠硬编码字符串数篇）', () => {
  assert.ok(Array.isArray(SEC_DEFS) || typeof SEC_DEFS === 'object');
  assert.strictEqual(profile().length, 5);
});

/* ── 正文与 quiz 同源：段型 / 判型 / 字频，全部现读现核 ── */

test('正文五篇表、判型、字频，逐格与底本现算一致', () => {
  const a = docAudit();
  assert.ok(a.facts.length >= 9);
  for (const f of a.facts) assert.strictEqual(f.got, f.want, `${f.label}: 现算 ${f.got} ≠ 正文 ${f.want}`);
});

test('正文五条引文逐字落在秋燥与伏暑条文或自注里', () => {
  assert.strictEqual(docAudit().quotes.length, 5);
  for (const q of docAudit().quotes) {
    assert.strictEqual(q.inDoc, true, `正文缺「${q.quote}」`);
    assert.strictEqual(q.inSource, true, `底本缺「${q.quote}」`);
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
