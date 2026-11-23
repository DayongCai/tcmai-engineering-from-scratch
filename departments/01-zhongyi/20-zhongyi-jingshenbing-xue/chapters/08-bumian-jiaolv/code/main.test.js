'use strict';
/**
 * 第 8 章 不寐与焦虑障碍 —— 本章现算值与 quiz 结构的确定性断言。
 * 数字由 docs/zh.md 现算后钉在这里：正文一改，测试先响，迫使写的人回头同步。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');

const { stats, quizAudit, countCells, hanzi, DOC, QUIZ, CHAPTER, SLUG } = require('./main.js');

const s = stats();
const q = quizAudit();

test('章节号与目录一致', () => {
  assert.strictEqual(CHAPTER, 8);
  assert.strictEqual(SLUG, '08-bumian-jiaolv');
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
});

test('正文规模：汉字 / 节 / 段', () => {
  assert.strictEqual(s.hanzi, 3111);
  assert.strictEqual(s.sectionCount, 6);
  assert.strictEqual(s.paragraphCount, 25);
  assert.ok(s.hanzi >= 2500, '正文只有 ' + s.hanzi + ' 汉字');
});

test('表格与表行', () => {
  assert.strictEqual(s.tableCount, 3);
  assert.strictEqual(s.tableRows, 14);
  for (const t of s.tables) assert.ok(t.cols >= 2, t.firstCell + ' 列数不足');
});

test('睡眠五项、焦虑三层，与正文标目一致', () => {
  assert.strictEqual(s.tables[0].rows, 5);
  assert.strictEqual(s.tables[0].cols, 3);
  assert.strictEqual(s.tables[1].rows, 3);
  assert.strictEqual(s.tables[1].cols, 3);
  assert.strictEqual(countCells(s.tables[1].cells, 0, /^发作性$/), 1);
});

test('六证表 6 行，按「见于」一列拆分：不寐 3、焦虑 1、两病 2', () => {
  const zheng = s.tables[2];
  assert.strictEqual(zheng.rows, 6);
  assert.strictEqual(zheng.cols, 6);
  const buMei = countCells(zheng.cells, 5, /^不寐$/);
  const jiaoLv = countCells(zheng.cells, 5, /^焦虑$/);
  const both = countCells(zheng.cells, 5, /^两病$/);
  assert.strictEqual(buMei, 3);
  assert.strictEqual(jiaoLv, 1);
  assert.strictEqual(both, 2);
  assert.strictEqual(buMei + jiaoLv + both, zheng.rows);
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
