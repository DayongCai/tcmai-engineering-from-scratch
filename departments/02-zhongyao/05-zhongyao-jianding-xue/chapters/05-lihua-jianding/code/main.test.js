#!/usr/bin/env node
/**
 * 中药鉴定学 · 第 5 章 同一块板上的对照，比任何绝对数值都硬
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

test('正文规模：汉字 3195 / 段 23 / 节 5', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 3195);
  assert.strictEqual(hanzi(readDoc()), 3195, '汉字口径必须与正文一致');
  assert.strictEqual(r.paragraphs, 23);
  assert.strictEqual(r.sections.length, 5);
});

test('表格：3 张，列数 [4,4,2]，行数 [5,4,6]', () => {
  const r = m.analyze();
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [4, 4, 2]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [5, 4, 6]);
  assert.deepStrictEqual(r.tables[0].header, ['成分类型', '常用反应', '现象', '假阳性来源']);
});

test('算术·比移值：斑点 4.2 cm ÷ 展开 10 cm = 0.42，与正文一致', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.rfDist, 10, 'rfDist');
  assert.strictEqual(a.rfSpot, 4.2, 'rfSpot');
  assert.strictEqual(a.rfComputed, 0.42, 'rfComputed');
  assert.strictEqual(a.rfStated, 0.42, 'rfStated');
  assert.strictEqual(a.rfOk, true, '比移值必须复算得平');
});

test('算术·漂移：同一块板换条件后 Rf 由 0.42 到 0.35，位移 -16.7%', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.driftFrom, 0.42);
  assert.strictEqual(a.driftTo, 0.35);
  assert.strictEqual(a.driftPct, -16.7);
});

test('算术·条件区间：展开 8–15 cm、点样 1–1.5 cm、斑点 2–4 mm', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.developLow, 8);
  assert.strictEqual(a.developHigh, 15);
  assert.strictEqual(a.developSpan, 7, '展开跨度');
  assert.strictEqual(a.spotLow, 1);
  assert.strictEqual(a.spotHigh, 1.5);
  assert.strictEqual(a.spotDiaLow, 2);
  assert.strictEqual(a.spotDiaHigh, 4);
  assert.strictEqual(a.activateLow, 105);
  assert.strictEqual(a.activateHigh, 110);
  assert.strictEqual(a.activateMin, 30);
  assert.strictEqual(a.saturateLow, 15);
  assert.strictEqual(a.saturateHigh, 30);
});

test('算术·占比：点样区占该次展开距离的 10%–15%', () => {
  const a = m.analyze().arith;
  assert.deepStrictEqual(a.spotShare, [10, 15]);
  assert.strictEqual(a.fpFilled, 5, '「假阳性来源」写满的行数');
  assert.strictEqual(a.fpShare, 100, '写满比例');
});

test('算术·对账：板上 3 个点对 3 条关系式（同板／同法／同显色）', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.pointItems, 3, '供试品／对照品／对照药材');
  assert.strictEqual(a.ruleItems, 3, '同板／同法／同显色');
  assert.strictEqual(a.boardOk, true);
});

test('算术·合计：物理常数 9 项、通则编号 6 个、薄层 5 个动作、检测器 3 种', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.constItems.length, 9, '物理常数项数');
  assert.deepStrictEqual(a.standardNos, ['0502', '0512', '0521', '0601', '0612', '0621']);
  assert.strictEqual(a.actions.length, 5, '薄层动作个数');
  assert.deepStrictEqual(a.detectors, ['FID', 'ECD', 'FPD']);
  assert.strictEqual(a.hplcItems.length, 6, '高效液相覆盖的成分类型');
});

test('算术·累计：表格 15 行 10 列，判据组 4、字段 6', () => {
  const a = m.analyze().arith;
  assert.strictEqual(a.rowTotal, 15);
  assert.strictEqual(a.colTotal, 10);
  assert.strictEqual(a.reactionRows, 5);
  assert.strictEqual(a.ruleRows, 4);
  assert.strictEqual(a.fieldRows, 6);
  assert.strictEqual(a.failures, 4);
  assert.strictEqual(a.tasks, 4);
});

test('自检无一项不成立（analyze + verify 全绿）', () => {
  assert.deepStrictEqual(m.verify(m.analyze()), []);
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [2, 1, 0, 3, 0, 1]);
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

test('quiz 接地：3 道 check 题的正确选项含正文原词，最短解释 87 汉字', () => {
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
  assert.strictEqual(s.minExplain, 87);
  assert.deepStrictEqual(q.questions.map((x) => hanzi(x.explain)).filter((n) => n < 30), []);
});

test('脚本可运行：退出码 0，输出带规模、算术、自检与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /第 5 章/);
  assert.match(out, /3195 汉字/);
  assert.match(out, /0\.42/);
  assert.match(out, /✓ 自检全部成立/);
  assert.match(out, /不构成任何药材的检验结论/);
});

test('代码不含脚手架指纹，且不读本章以外的数据', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  const BANNED = ['\u4e09\u8fa8', '\u56db\u4f4d\u9762', '\u5355\u5143\u89c4\u6a21', '\u672c\u7ae0\u5b9e\u6d4b'];
  for (const w of BANNED) assert.ok(!src.includes(w), '残留脚手架词');
  assert.ok(!/standards\//.test(src), '不应读取 standards/ 目录');
  assert.ok(src.includes('chapters/05-lihua-jianding/docs/zh.md'), '头部注释未指向本章');
  assert.ok(!/require\(['"][^'"]*units\.json/.test(src), '不应依赖单元层数据');
});
