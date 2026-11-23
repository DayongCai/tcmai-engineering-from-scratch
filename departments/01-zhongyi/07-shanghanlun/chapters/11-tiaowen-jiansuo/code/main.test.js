'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { tokenize, bm25, substringAnd, DOCS, IDX } = require('./main.js');

test('分词：单字 + 双字，异体 𤍠 归一', () => {
  const t = tokenize('发𤍠恶寒');
  assert.ok(t.includes('发热'), '应切成「发热」双字');
  assert.ok(!t.includes('发𤍠'), '异体不应保留');
  assert.ok(t.includes('热'));
});

test('索引：1760 条，词表规模可复现', () => {
  assert.strictEqual(DOCS.length, 1760);
  assert.strictEqual(IDX.N, 1760);
  assert.strictEqual(IDX.df.size, 13687);
  assert.ok(IDX.avgdl > 70 && IDX.avgdl < 90, `avgdl=${IDX.avgdl}`);
});

test('四个有答案查询全部命中第一位（MRR=1）', () => {
  const cases = [
    ['太阳 脉浮 头项强痛 恶寒', '4:1'],
    ['胃家实', '9:2'],
    ['但见一证 不必悉具', '5:222'],
    ['心中疼热 气上撞心 消渴', '24:1'],
  ];
  for (const [q, gold] of cases) assert.strictEqual(bm25(q)[0].id, gold, q);
});

test('BM25 对「不存在的词」仍会给结果：乌梅丸首位不含乌梅丸', () => {
  const top = bm25('乌梅丸 吐蛔')[0];
  assert.ok(!top.text.includes('乌梅丸'), '底本无乌梅丸，首位不应含该词');
  assert.ok(top.score < 31.14, `分数 ${top.score} 应低于弃答阈值`);
});

test('子串 AND 对无答案查询返回 0 条（精确但不会模糊）', () => {
  assert.strictEqual(substringAnd('乌梅丸 吐蛔').length, 0);
  assert.strictEqual(substringAnd('少阴之为病 但欲寐').length, 0);
});

test('阈值两侧：真·无答案最高 27.051，有答案最低 31.43（余量 4.38）', () => {
  const noAnsTrue = Math.max(bm25('乌梅丸 吐蛔')[0].score, bm25('少阴之为病 但欲寐')[0].score);
  const hasAns = Math.min(bm25('胃家实')[0].score, bm25('但见一证 不必悉具')[0].score);
  assert.ok(Math.abs(noAnsTrue - 27.051) < 0.01, `noAnsTrue=${noAnsTrue}`);
  assert.ok(Math.abs(hasAns - 31.43) < 0.01, `hasAns=${hasAns}`);
  assert.ok(Math.abs(hasAns - noAnsTrue - 4.379) < 0.02, '真·余量应为 4.38');
});

test('「下利 厥 恶寒 四逆汤」不是负样本：它是四逆汤证条，会把无答案侧抬到 30.852', () => {
  const t = bm25('下利 厥 恶寒 四逆汤')[0];
  assert.strictEqual(t.id, '19:121');
  assert.match(t.text, /四逆汤/);
  assert.ok(Math.abs(t.score - 30.852) < 0.01, `score=${t.score}`);
  assert.ok(Math.abs(31.43 - t.score - 0.578) < 0.02, '含错标负样本时余量应为 0.578');
});

test('通假：底本 0 条「默默」、3 条「嘿嘿」', () => {
  assert.strictEqual(DOCS.filter((d) => d.text.includes('默默')).length, 0);
  assert.strictEqual(DOCS.filter((d) => d.text.includes('嘿嘿')).length, 3);
});

// ── quiz 结构契约（与 scripts/check_chapter_exercises.js 同源）──
const { quizContract } = require('../../_quiz-contract.js');
quizContract(__dirname);
