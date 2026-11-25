'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const { analyze, formulaAudit, quizSummary, readDoc, CHAPTER, TITLE } = require('./main.js');

test('脚本自带自检：规模与算术都能算出来', () => {
  const r = analyze();
  assert.ok(r.docHanzi > 1000, '正文汉字过少：' + r.docHanzi);
  assert.ok(r.paragraphs >= 10, '段落过少：' + r.paragraphs);
  assert.ok(r.sections.length >= 5, '节数过少：' + r.sections.length);
  assert.ok(r.arith.lines.length >= 3, '算术输出过少');
});

test('正文里每一处二元算式都能复算', () => {
  const bad = formulaAudit(readDoc()).filter((x) => !x.ok);
  assert.deepStrictEqual(bad.map((x) => x.expr), [], '有算式对不上');
});

test('quiz 六项硬指标：题量、三段、四选项、解释长度、答案合法、check 接地', () => {
  const q = quizSummary(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8')), readDoc());
  assert.ok(q.total >= 6, '题量不足：' + q.total);
  assert.ok(q.stageComplete, 'pre/check/post 不齐');
  assert.ok(q.allFour, '有题目不是 4 个选项');
  assert.strictEqual(q.badCorrect, 0, '有题目 correct 下标非法');
  assert.ok(q.minExplain >= 30, '有解释短于 30 汉字');
  assert.ok(q.checkGrounded >= 2, 'check 题接地不足：' + q.checkGrounded);
});

test('只读本章正文与 quiz，不碰取数层', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(!/['"]standards['"]/.test(src), '代码里出现了取数层路径');
  assert.ok(!/units\.json|chapter-map/.test(src), '代码里出现了单元层取数');
  assert.ok(src.includes("'..', 'docs', 'zh.md'"), '正文路径不对');
  assert.ok(src.includes("'..', 'quiz.json'"), 'quiz 路径不对');
});

test('脚本可运行且退出码为 0，输出含自检结论', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /公式复核：/);
  assert.match(out, /自检：通过/);
  assert.match(out, /由本章正文与 quiz 现算/);
});

test('章节号与标题取自正文一级标题', () => {
  const h1 = readDoc().match(/^#\s*第\s*(\d+)\s*章\s*·\s*(.+)$/m);
  assert.ok(h1, '正文缺少一级标题');
  assert.strictEqual(Number(h1[1]), CHAPTER);
  const norm = (s) => String(s).replace(/[「」“”"']/g, '');
  assert.strictEqual(norm(h1[2].trim()), norm(TITLE));
});
