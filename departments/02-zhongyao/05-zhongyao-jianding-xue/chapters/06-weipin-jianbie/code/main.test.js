#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 6 章 伪品不是长得像，是把正品的判据一条条做掉
 * 确定性单元测试 —— 运行: node --test code/main.test.js
 *
 * 断言钉的是本机实测值：正文、算术解析或 quiz 任一处改动，这里就应当变红。
 * 数字不回读 main.js 再自比（那样什么都测不出），而是写在断言里。
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const m = require('./main.js');

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const readQuiz = () => JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const grams = (t, n = 4) => {
  const out = new Set();
  for (const seg of String(t || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
};

test('正文规模：汉字 2929 / 段 15 / 节 5', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 2929);
  assert.strictEqual(hanzi(readDoc()), 2929, '汉字口径必须与正文一致');
  assert.strictEqual(r.paragraphs, 15);
  assert.strictEqual(r.sections.length, 5);
});

test('表格：2 张，列数 [5,2]，行数 [4,6]', () => {
  const r = m.analyze();
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [5, 2]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [4, 6]);
  assert.deepStrictEqual(r.tables[0].header, ['药材', '正品专属性判据（须全部成立）', '常见伪品', '伪品缺什么', '不成立条件（任一出现即退）']);
});

test('算术·声明对账：人参 3 + 天麻 4 + 大黄 3 + 半夏 2 = 12，与正文声明的总数一致', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.statedTotal, 12);
  assert.deepStrictEqual(a.perHerb.map((x) => [x.herb, x.stated]), [['人参', 3], ['天麻', 4], ['大黄', 3], ['半夏', 2]]);
  assert.strictEqual(a.declaredSum, 12);
  assert.strictEqual(a.nameSum, 12, '括号里点名的个数');
  assert.strictEqual(a.eachParenOk, true, '每一味的数字与括号内名字个数必须相等');
  assert.strictEqual(a.totalOk, true);
  assert.strictEqual(a.meanPerHerb, 3);
});

test('算术·表内复核：「常见伪品」一列逐行相加也等于 12', () => {
  const a = m.analyze().arith;
  assert.deepStrictEqual(a.tableRows.map((x) => [x.herb, x.names.length]), [['人参', 3], ['三七', 2], ['大黄', 3], ['天麻', 4]]);
  assert.strictEqual(a.tableSum, 12);
  assert.strictEqual(a.tableOk, true);
});

test('算术·取样对账：抽样 5 件 ÷ 总包件数 600 件 = 覆盖 0.83%，未开包 595 件', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.sampled, 5);
  assert.strictEqual(a.lots, 600);
  assert.strictEqual(a.coverage, 0.83);
  assert.strictEqual(a.unopened, 595);
  assert.strictEqual(a.uncovered, 99.17);
  assert.strictEqual(a.layers, 3, '上／中／下三层取样');
});

test('算术·路线与混淆品：三条路线、4 对名称相近者、5 种有毒伪品', () => {
  const a = m.analyze().arith;
  assert.deepStrictEqual(a.routes, ['第一条', '第二条', '第三条']);
  assert.deepStrictEqual(a.confNames, ['当归与欧当归', '柴胡与大叶柴胡', '川芎与东川芎', '白术与苍术']);
  assert.deepStrictEqual(a.toxicNames, ['商陆', '华山参', '紫茉莉根', '大叶柴胡', '菊三七']);
});

test('算术·累计：表格 10 行 7 列，判据表 5 列 4 行、字段 6 条', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.rowTotal, 10);
  assert.strictEqual(a.colTotal, 7);
  assert.strictEqual(a.judgeRows, 4);
  assert.strictEqual(a.judgeCols, 5);
  assert.strictEqual(a.fieldRows, 6);
  assert.strictEqual(a.failFilled, 4, '「不成立条件」写满的行数');
  assert.strictEqual(a.failShare, 100);
  assert.strictEqual(a.failures, 4);
  assert.strictEqual(a.tasks, 4);
});

test('自检无一项不成立（analyze + verify 全绿）', () => {
  assert.deepStrictEqual(m.verify(m.analyze()), []);
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [3, 0, 2, 1, 3, 0]);
  assert.deepStrictEqual(q.questions.map((x) => x.stage), ['pre', 'check', 'check', 'check', 'post', 'post']);
  for (const x of q.questions) {
    assert.strictEqual(x.options.length, 4, x.question);
    assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4, 'correct 越界: ' + x.question);
  }
  const s = m.analyze().quiz;
  assert.strictEqual(s.distinctAnswers, 4);
  assert.strictEqual(s.allFourOptions, true);
  assert.strictEqual(s.badCorrect, 0);
});

test('quiz 接地：3 道 check 题的正确选项含正文原词，最短解释 83 汉字', () => {
  const body = grams(readDoc());
  const q = readQuiz();
  const grounded = q.questions.filter((x) => {
    if (x.stage !== 'check') return false;
    const right = String(x.options[x.correct] || '');
    return [...grams(right)].some((g) => body.has(g));
  });
  assert.strictEqual(grounded.length, 3);
  const s = m.analyze().quiz;
  assert.strictEqual(s.checkGrounded, grounded.length, 'main.js 与测试口径必须一致');
  assert.strictEqual(s.minExplain, 83);
  assert.deepStrictEqual(q.questions.map((x) => hanzi(x.explain)).filter((n) => n < 30), []);
});

test('脚本可运行：退出码 0，输出带规模、算术、自检与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /第 6 章/);
  assert.match(out, /2929 汉字/);
  assert.match(out, /抽样 5 件 ÷ 总包件数 600 件/);
  assert.match(out, /✓ 自检全部成立/);
  assert.match(out, /不构成任何药材的真伪结论/);
});

test('代码不含脚手架指纹，且不读本章以外的数据', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  const BANNED = ['\u4e09\u8fa8', '\u56db\u4f4d\u9762', '\u5355\u5143\u89c4\u6a21', '\u672c\u7ae0\u5b9e\u6d4b'];
  for (const w of BANNED) assert.ok(!src.includes(w), '残留脚手架词');
  assert.ok(!/standards\//.test(src), '不应读取 standards/ 目录');
  assert.ok(src.includes('chapters/06-weipin-jianbie/docs/zh.md'), '头部注释未指向本章');
  assert.ok(!/require\(['"][^'"]*units\.json/.test(src), '不应依赖单元层数据');
});
