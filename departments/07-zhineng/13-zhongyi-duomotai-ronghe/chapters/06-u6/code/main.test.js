'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, parseDoc, analyze } = require('./main.js');

const text = () => fs.readFileSync(DOC, 'utf8');
const doc = () => parseDoc(text());

test('正文可解析：章号、标题、结构齐', () => {
  const d = doc();
  assert.strictEqual(d.chapterNo, 6);
  assert.match(d.title, /融合的难点不在拼/);
  assert.ok(d.sections.length >= 4);
  assert.ok(d.tables.length >= 3);
  assert.ok(d.hanzi > 2000);
});

test('两组 AUROC 都读到，且缺失条件整体更低', () => {
  const a = analyze(doc());
  assert.strictEqual(a.fullScores.length, 3);
  assert.strictEqual(a.missScores.length, 3);
  for (let i = 0; i < 3; i += 1) assert.ok(a.missScores[i] < a.fullScores[i], '缺失条件应更低');
  assert.strictEqual(a.missingRate, 30);
});

test('排序翻转由数组比较得出，不是写死', () => {
  const a = analyze(doc());
  assert.deepStrictEqual(a.fullScores, [0.79, 0.84, 0.83]);
  assert.deepStrictEqual(a.missScores, [0.66, 0.79, 0.8]);
  assert.strictEqual(a.bestFull, '中期');
  assert.strictEqual(a.bestMiss, '晚期');
  assert.strictEqual(a.flipped, true);
  assert.deepStrictEqual(a.fullRanking, ['中期', '晚期', '早期']);
  assert.deepStrictEqual(a.missRanking, ['晚期', '中期', '早期']);
});

test('早期融合跌幅最大，晚期最小', () => {
  const a = analyze(doc());
  assert.ok(a.drop[0] > a.drop[1] && a.drop[1] > a.drop[2], `跌幅顺序异常：${a.drop}`);
  assert.ok(Math.abs(a.drop[0] - 0.13) < 1e-9);
});

test('非空组合数由模态数现算', () => {
  const a = analyze(doc());
  assert.strictEqual(a.modalities, 4);
  assert.strictEqual(a.combos, 15);
  assert.strictEqual(a.combos, a.combosStated);
});

test('改正文的缺失条件数值，结论随之变化（证明确实现算）', () => {
  const mutated = text().replace('中期掉到 0.79，晚期 0.80', '中期掉到 0.79，晚期 0.70');
  assert.notStrictEqual(mutated, text(), '替换未命中，正文表述可能已改');
  const a = analyze(parseDoc(mutated));
  assert.strictEqual(a.bestMiss, '中期');
  assert.strictEqual(a.flipped, false);
});

test('脚本可运行且输出含边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /排序是否翻转/);
  assert.match(out, /非空组合/);
  assert.match(out, /不构成临床决策模型的设计规范/);
});
