'use strict';
/**
 * 第 12 章 中西医结合、康复与数字化 —— 本章现算值与 quiz 结构的确定性断言。
 * 数字由 docs/zh.md 现算后钉在这里：正文一改，测试先响，迫使写的人回头同步。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');

const { stats, quizAudit, countCells, hanzi, DOC, QUIZ, CHAPTER, SLUG } = require('./main.js');

const s = stats();
const q = quizAudit();

test('章节号与目录一致', () => {
  assert.strictEqual(CHAPTER, 12);
  assert.strictEqual(SLUG, '12-jiehe-kangfu-shuzihua');
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
});

test('正文规模：汉字 / 节 / 段', () => {
  assert.strictEqual(s.hanzi, 3498);
  assert.strictEqual(s.sectionCount, 6);
  assert.strictEqual(s.paragraphCount, 30);
  assert.ok(s.hanzi >= 2500, '正文只有 ' + s.hanzi + ' 汉字');
});

test('表格与表行', () => {
  assert.strictEqual(s.tableCount, 2);
  assert.strictEqual(s.tableRows, 10);
  for (const t of s.tables) assert.ok(t.cols >= 2, t.firstCell + ' 列数不足');
});

test('三块边界表 3 行；用药清单 7 栏，第 4 栏确为保健品', () => {
  const blocks = s.tables[0];
  assert.strictEqual(blocks.rows, 3);
  assert.strictEqual(blocks.cols, 4);
  assert.strictEqual(countCells(blocks.cells, 0, /^联合治疗$/), 1);
  assert.strictEqual(countCells(blocks.cells, 0, /^康复$/), 1);
  assert.strictEqual(countCells(blocks.cells, 0, /^数字化$/), 1);
  const list = s.tables[1];
  assert.strictEqual(list.rows, 7);
  assert.strictEqual(list.cols, 2);
  assert.strictEqual(list.cells[3][0], '4');
  assert.ok(list.cells[3][1].includes('保健品'), '第 4 栏不是保健品');
});

test('各节都非空，节标题不重复', () => {
  assert.strictEqual(new Set(s.sections.map((x) => x.title)).size, s.sectionCount);
  for (const sec of s.sections) assert.ok(sec.hanzi > 0, sec.title);
});

test('汉字统计口径：章首 + 逐节 = 全文', () => {
  assert.strictEqual(s.sections.reduce((a, x) => a + x.hanzi, 0) + s.preamble.hanzi, s.hanzi);
  assert.strictEqual(hanzi(fs.readFileSync(DOC, 'utf8')), s.hanzi);
});

test('quiz 结构：三段齐、四选项、解释够长、答案合法', () => {
  assert.ok(q.total >= 5, '只有 ' + q.total + ' 题');
  for (const st of ['pre', 'check', 'post']) assert.ok(q.stage[st] >= 1, '缺 ' + st + ' 段');
  assert.strictEqual(q.allFourOptions, true, '有题不是 4 个选项');
  assert.strictEqual(q.badCorrect, 0, 'correct 下标非法');
  assert.ok(q.minExplain >= 60, '最短解释只有 ' + q.minExplain + ' 汉字');
});

test('quiz 接地与打散：≥2 道 check 题的正确选项落在正文，答案 ≥3 个位置', () => {
  assert.ok(q.checkGrounded >= 2, '只有 ' + q.checkGrounded + ' 道 check 题接地');
  assert.ok(q.distinctAnswers >= 3, '答案只用了 ' + q.distinctAnswers + ' 个位置');
});

test('quiz 不含脚手架名目与禁用参数', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  assert.strictEqual(q.scaffold, false, 'quiz 仍含脚手架指纹');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '剂量', '疗程', '发生率', '页码']) {
    assert.ok(!raw.includes(bad), 'quiz 仍含「' + bad + '」');
  }
});
