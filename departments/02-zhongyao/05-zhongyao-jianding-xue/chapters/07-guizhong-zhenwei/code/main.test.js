#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 7 章 贵重药材的真伪，全押在几条能数出来的特征上
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

test('正文规模：汉字 2967 / 段 14 / 节 5', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 2967);
  assert.strictEqual(hanzi(readDoc()), 2967, '汉字口径必须与正文一致');
  assert.strictEqual(r.paragraphs, 14);
  assert.strictEqual(r.sections.length, 5);
});

test('表格：2 张，列数 [4,2]，行数 [5,6]', () => {
  const r = m.analyze();
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [4, 2]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [5, 6]);
  assert.deepStrictEqual(r.tables[0].header, ['药材', '正品可指认的判据（须全部成立）', '掺伪与伪品的破口', '不成立条件（任一出现即退）']);
});

test('算术·增重：10 根 × 0.2 g = 2 g，2 g ÷ 100 g = 2%，两处都与正文一致', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.wholeG, 100);
  assert.strictEqual(a.pins, 10);
  assert.strictEqual(a.perPin, 0.2);
  assert.strictEqual(a.addedG, 2);
  assert.strictEqual(a.statedG, 2);
  assert.strictEqual(a.weightOk, true);
  assert.strictEqual(a.computedPct, 2);
  assert.strictEqual(a.statedPct, 2);
  assert.strictEqual(a.pctOk, true);
});

test('算术·可数特征：足 8 对、中部明显 4 对，占 50%', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.feet, 8);
  assert.strictEqual(a.feetObvious, 4);
  assert.strictEqual(a.feetShare, 50);
});

test('算术·区间跨度：环纹 20–30 个（跨度 10）、蛤蚧环带 6–7 个（跨度 1）', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.ringLow, 20);
  assert.strictEqual(a.ringHigh, 30);
  assert.strictEqual(a.ringSpan, 10);
  assert.strictEqual(a.bandLow, 6);
  assert.strictEqual(a.bandHigh, 7);
  assert.strictEqual(a.bandSpan, 1);
});

test('算术·取样对账：按比例 2 / 20 件覆盖 10%、漏检 18 件；逐件取样漏检 0', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.lots, 20);
  assert.strictEqual(a.taken, 2);
  assert.strictEqual(a.proportionalCover, 10);
  assert.strictEqual(a.proportionalMissed, 18);
  assert.strictEqual(a.piecewiseTaken, 20, '贵重药材逐件取样：件数 = 总件数');
  assert.strictEqual(a.piecewiseCover, 100);
  assert.strictEqual(a.piecewiseMissed, 0);
});

test('算术·层级与步骤：判据 3 层、取样 5 步，表格 11 行 6 列', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.tiers, 3, '可数形态／水火行为／理化数据');
  assert.strictEqual(a.steps, 5, '称重与量尺 → 外观与断面 → 水火试验 → 理化与分子 → 留样');
  assert.strictEqual(a.rowTotal, 11);
  assert.strictEqual(a.colTotal, 6);
  assert.strictEqual(a.drugRows, 5);
  assert.strictEqual(a.drugCols, 4);
  assert.strictEqual(a.fieldRows, 6);
  assert.strictEqual(a.failFilled, 5);
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
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [0, 2, 0, 3, 1, 2]);
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

test('quiz 接地：3 道 check 题的正确选项含正文原词，最短解释 84 汉字', () => {
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
  assert.strictEqual(s.minExplain, 84);
  assert.deepStrictEqual(q.questions.map((x) => hanzi(x.explain)).filter((n) => n < 30), []);
});

test('脚本可运行：退出码 0，输出带规模、算术、自检与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /第 7 章/);
  assert.match(out, /2967 汉字/);
  assert.match(out, /漏检 0 件/);
  assert.match(out, /✓ 自检全部成立/);
  assert.match(out, /不构成任何药材的真伪结论或价格判断/);
});

test('代码不含脚手架指纹，且不读本章以外的数据', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  const BANNED = ['\u4e09\u8fa8', '\u56db\u4f4d\u9762', '\u5355\u5143\u89c4\u6a21', '\u672c\u7ae0\u5b9e\u6d4b'];
  for (const w of BANNED) assert.ok(!src.includes(w), '残留脚手架词');
  assert.ok(!/standards\//.test(src), '不应读取 standards/ 目录');
  assert.ok(src.includes('chapters/07-guizhong-zhenwei/docs/zh.md'), '头部注释未指向本章');
  assert.ok(!/require\(['"][^'"]*units\.json/.test(src), '不应依赖单元层数据');
});
