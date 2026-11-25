#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 4 章 显微报告里没有标定值，就等于没有数字
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

test('正文规模：汉字 3068 / 段 18 / 节 5', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 3068);
  assert.strictEqual(hanzi(readDoc()), 3068, '汉字口径必须与正文一致');
  assert.strictEqual(r.paragraphs, 18);
  assert.strictEqual(r.sections.length, 5);
});

test('表格：3 张，列数 [3,4,2]，行数 [6,4,6]', () => {
  const r = m.analyze();
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [3, 4, 2]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [6, 4, 6]);
  assert.deepStrictEqual(r.tables[0].header, ['特征', '形态要点', '常见归属']);
});

test('算术·台尺：100 格 × 10 μm = 1000 μm = 1 mm，三处对得上', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.stageCells, 100, 'stageCells');
  assert.strictEqual(a.stagePerCell, 10, 'stagePerCell');
  assert.strictEqual(a.stageLengthMm, 1, 'stageLengthMm');
  assert.strictEqual(a.stageTotalUm, 1000, 'stageTotalUm');
  assert.strictEqual(a.stageTotalMm, 1, 'stageTotalMm');
  assert.strictEqual(a.stageOk, true, '台尺换算必须自洽');
});

test('算术·目尺标定：台尺 10 格 ÷ 目尺 100 格 × 10 μm = 1 μm/格', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.calibM, 10, 'calibM');
  assert.strictEqual(a.calibN, 100, 'calibN');
  assert.strictEqual(a.calibStated, 1, 'calibStated');
  assert.strictEqual(a.calibPerCell, 1, 'calibPerCell');
  assert.strictEqual(a.calibOk, true, '标定值必须与正文给出的数一致');
});

test('算术·项数对账：六类特征在中文数字、枚举、表行三处同数', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.featStated, 6, 'featStated');
  assert.deepStrictEqual(a.featItems, ['导管', '纤维', '石细胞', '淀粉粒', '草酸钙结晶', '花粉粒']);
  assert.strictEqual(a.featRows, 6, 'featRows');
  assert.strictEqual(a.slideStated, 4, 'slideStated');
  assert.strictEqual(a.slideItems.length, 4, 'slideItems');
  assert.strictEqual(a.coverPerSlide, 1.5, '六类特征 ÷ 四种装片');
});

test('算术·合计与累计：测量点数 120、表格 16 行 9 列', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.perFeature, 20, 'perFeature');
  assert.strictEqual(a.points, 120, '20 个 × 6 类');
  assert.strictEqual(a.rowTotal, 16, 'rowTotal');
  assert.strictEqual(a.colTotal, 9, 'colTotal');
  assert.strictEqual(a.ruleRows, 4, '判据组 4 组');
  assert.strictEqual(a.fieldRows, 6, '记录字段 6 条');
});

test('算术·第 4 节：四种失效 4 条、考核项 4 项', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.failures, 4, 'failures');
  assert.strictEqual(a.tasks, 4, 'tasks');
});

test('自检无一项不成立（analyze + verify 全绿）', () => {
  const r = m.analyze();
  assert.deepStrictEqual(m.verify(r), []);
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [1, 0, 2, 3, 1, 2]);
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

test('quiz 接地：3 道 check 题的正确选项含正文原词，最短解释 85 汉字', () => {
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
  assert.strictEqual(s.minExplain, 85);
  assert.deepStrictEqual(q.questions.map((x) => hanzi(x.explain)).filter((n) => n < 30), []);
});

test('脚本可运行：退出码 0，输出带规模、算术、自检与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /第 4 章/);
  assert.match(out, /3068 汉字/);
  assert.match(out, /120 个读数/);
  assert.match(out, /✓ 自检全部成立/);
  assert.match(out, /不构成任何药材的检验结论/);
});

test('代码不含脚手架指纹，且不读本章以外的数据', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  const BANNED = ['\u4e09\u8fa8', '\u56db\u4f4d\u9762', '\u5355\u5143\u89c4\u6a21', '\u672c\u7ae0\u5b9e\u6d4b'];
  for (const w of BANNED) assert.ok(!src.includes(w), '残留脚手架词');
  assert.ok(!/standards\//.test(src), '不应读取 standards/ 目录');
  assert.ok(src.includes('chapters/04-xianwei-jianding/docs/zh.md'), '头部注释未指向本章');
  assert.ok(!/require\(['"][^'"]*units\.json/.test(src), '不应依赖单元层数据');
});
