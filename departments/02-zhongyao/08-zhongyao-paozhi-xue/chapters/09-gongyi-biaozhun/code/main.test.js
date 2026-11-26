#!/usr/bin/env node
/**
 * 中药炮制学 · 第 9 章 炮制工艺的标准化与质控
 * 确定性单元测试 —— 运行: node --test code/main.test.js
 *
 * 断言钉的是本机实测值：正文、算术解析或 quiz 任一处改动，这里就应当变红。
 * 数字不从 main.js 回读再自比（那样什么都测不出），而是写在断言里。
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
/** 正确选项在正文里的最长连续命中字数 */
const longestHit = (option, doc) => {
  let best = 0;
  for (const seg of String(option || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/).filter(Boolean)) {
    for (let n = seg.length; n > best; n -= 1) {
      let hit = false;
      for (let i = 0; i + n <= seg.length; i += 1) if (doc.includes(seg.slice(i, i + n))) { hit = true; break; }
      if (hit) { best = n; break; }
    }
  }
  return best;
};

test('正文规模：汉字 3999 / 段 29 / 节 7', () => {
  const r = m.analyze();
  assert.strictEqual(r.docHanzi, 3999);
  assert.strictEqual(r.paragraphs, 29);
  assert.strictEqual(r.sections.length, 7);
  assert.strictEqual(hanzi(readDoc()), 3999, '汉字口径必须与正文一致');
});

test('表格：1 张，列数 [3]，行数 [8]', () => {
  const r = m.analyze();
  assert.deepStrictEqual(r.tables.map((t) => t.cols), [3]);
  assert.deepStrictEqual(r.tables.map((t) => t.rows), [8]);
});

test('逐节规模：单元 7 个，汉字 3300，平均 471 字/节', () => {
  const s = m.analyze().shape;
  assert.strictEqual(s.units, 7);
  assert.strictEqual(s.hanzi, 3300);
  assert.strictEqual(s.mean, 471);
  assert.strictEqual(s.hanzi, m.analyze().units.reduce((a, u) => a + u.hanzi, 0), '逐节相加必须等于总量');
});

test('判据词频：前五项与正文实测一致', () => {
  const top = m.analyze().terms.slice(0, 5).map((t) => [t.key, t.count]);
  assert.deepStrictEqual(top, [["参数",17],["标准",15],["药典",12],["限度",11],["存性",9]]);
});

test('操作词与引书：命中与部数可复算', () => {
  const r = m.analyze();
  assert.deepStrictEqual(r.ops.slice(0, 3), [["炒",17],["蒸",9],["炙",9]]);
  assert.strictEqual(r.cites.books, 5);
  assert.strictEqual(r.cites.total, 9);
  assert.deepStrictEqual(r.cites.top, [["中国药典",4],["修事指南",2],["本草蒙筌·制造资水火",1]]);
});

test('节键与节标题一一对应', () => {
  assert.strictEqual(m.KEYS.length, m.analyze().sections.length);
  assert.deepStrictEqual(m.KEYS, ["一","二","三","四","五","代价与边界","运行与验证"]);
});

test('quiz 结构：6 题、三段齐、4 选项、下标合法、答案打散', () => {
  const q = readQuiz();
  assert.strictEqual(q.questions.length, 6);
  assert.deepStrictEqual(q.questions.map((x) => x.correct), [2,0,3,1,0,2]);
  assert.deepStrictEqual([...new Set(q.questions.map((x) => x.stage))].sort(), ['check', 'post', 'pre']);
  for (const x of q.questions) {
    assert.strictEqual(x.options.length, 4, x.question);
    assert.strictEqual(new Set(x.options).size, 4, '选项必须互异: ' + x.question);
    assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4, 'correct 越界: ' + x.question);
    assert.ok(typeof x.explain === 'string' && x.explain.length > 0, '缺 explain: ' + x.question);
  }
  const distinct = [...new Set(q.questions.map((x) => x.correct))];
  assert.ok(distinct.length >= 3, '答案位置只有 ' + distinct.length + ' 种');
});

test('quiz 接地：check 题正确选项逐字引正文，连续 ≥6 汉字', () => {
  const doc = readDoc();
  const checks = readQuiz().questions.filter((x) => x.stage === 'check');
  assert.strictEqual(checks.length, 3);
  for (const x of checks) {
    const hit = longestHit(x.options[x.correct], doc);
    assert.ok(hit >= 6, '接地不足（' + hit + ' 字）: ' + x.options[x.correct]);
  }
  assert.strictEqual(m.analyze().quiz.checkGrounded, 3, 'main.js 与测试口径必须一致');
});

test('quiz 解释：每题 40–80 汉字', () => {
  const lens = readQuiz().questions.map((x) => hanzi(x.explain));
  assert.deepStrictEqual(lens.filter((n) => n < 40 || n > 80), [], '有解释不在 40–80 汉字: ' + lens.join(','));
  const r = m.analyze().quiz;
  assert.strictEqual(r.minExplain, 70);
  assert.strictEqual(r.maxExplain, 77);
});

test('脚本可运行：退出码 0，输出带现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, String(r.stderr));
  const out = String(r.stdout || '');
  assert.ok(out.length > 400, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成/);
  assert.match(out, /第 9 章/);
  assert.match(out, /单元 7 ·/);
});

test('代码头部指向本章目录', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('chapters/09-gongyi-biaozhun/docs/zh.md'), '头部注释未指向本章');
});
