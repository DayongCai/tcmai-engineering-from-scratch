'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { splitPian, chainCheck, differentiate, isToc } = require('./main.js');

test('篇 12 是目录残片（7 条全为卷首/目录），概不当作可用条文', () => {
  assert.strictEqual(isToc(12), true);
  assert.strictEqual(isToc(23), false);
  const r = splitPian().find((x) => x.pian === 12);
  assert.strictEqual(r.tiao, 7);
  assert.strictEqual(r.hasOutline, false);
});

test('太阴只有 1 条真提纲（篇 23）+ 篇 27 重复一版，两版字面不同', () => {
  const rows = splitPian();
  const p23 = rows.find((x) => x.pian === 23);
  const p27 = rows.find((x) => x.pian === 27);
  assert.strictEqual(p23.tiao, 1);
  assert.match(p23.outline, /下之必胸下结硬/);
  assert.match(p27.outline, /若下之，必胸下结硬/);
  assert.notStrictEqual(p23.outline, p27.outline);
});

test('教材链条：「自利不渴」「四逆辈」在底本里缺失', () => {
  const rows = chainCheck([
    { claim: '自利不渴者，属太阴', needles: ['自利不渴'], expectPian: [23, 27] },
    { claim: '宜服四逆辈', needles: ['四逆辈'], expectPian: [23, 27] },
  ]);
  assert.deepStrictEqual(rows.map((r) => r.status), ['missing', 'missing']);
});

test('理中丸 5 处全在霍乱篇（15/16）→ crossPian，不许标成太阴篇', () => {
  const [r] = chainCheck([{ claim: '理中丸主之', needles: ['理中丸'], expectPian: [23, 27] }]);
  assert.strictEqual(r.status, 'crossPian');
  assert.deepStrictEqual(r.pians.sort(), [15, 16]);
});

test('提纲主判据命中，跨篇旁证不改变结论', () => {
  const [r] = chainCheck([{ claim: '提纲', needles: ['腹满而吐'], expectPian: [23, 27] }]);
  assert.strictEqual(r.status, 'hit');
});

test('腹满鉴别：太阴（吐/自利）与阳明（潮热/大便硬）都有可计数条文', () => {
  const d = differentiate();
  assert.ok(d.taiyin >= 3, `太阴侧 ${d.taiyin}`);
  assert.ok(d.yangming >= 3, `阳明侧 ${d.yangming}`);
});

// ── quiz 结构契约（与 scripts/check_chapter_exercises.js 同源）──
const { quizContract } = require('../../_quiz-contract.js');
quizContract(__dirname);
