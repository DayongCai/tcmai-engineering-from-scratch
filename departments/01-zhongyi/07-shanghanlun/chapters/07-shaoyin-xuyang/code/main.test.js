'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { prognosis, loadFormulas, crossCheck, SY, BOOK } = require('./main.js');

test('外源规模：45 条 · 15 方 · 14 项方后加减', () => {
  assert.strictEqual(SY.tiao.length, 45);
  assert.strictEqual(SY.formulas.length, 15);
  assert.strictEqual(SY.counts.additions, 14);
  assert.strictEqual(SY.tiao[0].text, '少阴之为病，脉微细，但欲寐也。');
});

test('底本确实缺少阴篇：篇 27 · 1760 条', () => {
  assert.strictEqual(BOOK.pian.length, 27);
  assert.strictEqual(BOOK.pian.reduce((a, p) => a + p.actual.tiao, 0), 1760);
  const all = BOOK.pian.flatMap((p) => p.items.map((i) => i.text)).join('');
  assert.ok(!all.includes('少阴之为病'));
  assert.ok(!all.includes('但欲寐'));
});

test('预后分层：死 5（16–20）· 不治 1（15）· 难治 1（14）· 可治 3（8,9,12）', () => {
  const buckets = {};
  for (const t of SY.tiao) {
    const p = prognosis(t.text);
    (buckets[p.cls] = buckets[p.cls] || []).push(t.no);
  }
  assert.deepStrictEqual(buckets['死'], [16, 17, 18, 19, 20]);
  assert.deepStrictEqual(buckets['不治'], [15]);
  assert.deepStrictEqual(buckets['难治'], [14]);
  assert.deepStrictEqual(buckets['可治'], [8, 9, 12]);
  assert.deepStrictEqual(buckets['欲解'], [7]);
  assert.deepStrictEqual(buckets['欲愈'], [10]);
  assert.deepStrictEqual(buckets['欲解时'], [11]);
});

test('预后类合计 13 条（占 45 条的 29%）', () => {
  const n = SY.tiao.filter((t) => prognosis(t.text).cls !== '未判定').length;
  assert.strictEqual(n, 13);
  assert.ok(Math.abs(n / SY.tiao.length - 0.29) < 0.01);
});

test('判据可解释：条 15 依据手足逆冷，条 7 依据脉暴微与手足反温', () => {
  assert.match(prognosis(SY.tiao[14].text).why, /手足逆冷/);
  assert.match(prognosis(SY.tiao[6].text).why, /脉暴微|手足反温/);
});

test('方名归一：黄连阿肢→黄连阿胶、自通→白通', () => {
  const names = loadFormulas().map((f) => f.name);
  assert.ok(names.includes('黄连阿胶汤'));
  assert.ok(names.includes('白通汤'));
  assert.ok(!names.includes('黄连阿肢汤'));
  assert.ok(!names.includes('自通汤'));
});

test('交叉核对：底本侧 6 方有子串命中、9 方 0 命中（子串口径，非方证依据）', () => {
  const cc = crossCheck();
  assert.strictEqual(cc.hit, 6);
  assert.deepStrictEqual(cc.zero.sort(), [
    '麻黄附子细辛汤', '黄连阿胶汤', '桃花汤', '猪肤汤', '桔梗汤',
    '苦酒汤', '半夏散及汤', '白通加猪胆汁', '四逆散',
  ].sort());
});

test('禁例 3 条（不可发汗/不可下/不可吐）：条 5、6、44', () => {
  const f = SY.tiao.filter((t) => /不可发汗|不可下|不可吐/.test(t.text)).map((t) => t.no);
  assert.deepStrictEqual(f, [5, 6, 44]);
});

test('急下三承气落在少阴篇：条 40–42', () => {
  const ids = SY.tiao.filter((t) => /急下之，宜大承气汤/.test(t.text)).map((t) => t.no);
  assert.deepStrictEqual(ids, [40, 41, 42]);
});

// ── quiz 结构契约（与 scripts/check_chapter_exercises.js 同源）──
const { quizContract } = require('../../_quiz-contract.js');
quizContract(__dirname);
