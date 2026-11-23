'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { report, completeness, structure, receiverKind, FORM_FIELDS, CHAPTER, SLUG } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

test('规模：汉字数与正文独立复算一致，且不少于两千五', () => {
  const n = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.strictEqual(report().size.hanzi, n);
  assert.strictEqual(report().size.hanzi, 2821);
  assert.ok(n >= 2500, `正文汉字过少：${n}`);
  assert.deepStrictEqual(report().size, { hanzi: 2821, sections: 6, tables: 1, rows: 4 });
});

test('完整度：四件齐 100%，缺一件 75%，缺数据字典时可用性为 0', () => {
  const c = completeness(doc);
  assert.strictEqual(c.items, 4);
  assert.strictEqual(c.fullItems, 4);
  assert.strictEqual(c.shortItems, 3);
  assert.strictEqual(c.full, 100);
  assert.strictEqual(c.short, 75);
  assert.strictEqual(c.usableIfDictionaryMissing, 0);
  assert.strictEqual(c.consistent, true, '正文写出的完整度与重算不一致');
  assert.strictEqual(c.full, Number(((c.fullItems / c.items) * 100).toFixed(0)));
  assert.strictEqual(c.short, Number(((c.shortItems / c.items) * 100).toFixed(0)));
});

test('结构：移交四件、数据三事、交接会三段、接手方三问、移交单五栏、五条失效', () => {
  assert.deepStrictEqual(structure(doc), {
    packageItems: 4, dataBounds: 3, meetingParts: 3, receiverQuestions: 3, formFields: 5, failures: 5
  });
  assert.strictEqual(FORM_FIELDS.length, 5);
  for (const k of FORM_FIELDS) assert.ok(doc.includes(k), `正文缺移交单栏位：${k}`);
});

test('三问归类：数据链、依赖结构、边界各自可辨', () => {
  assert.strictEqual(receiverKind('这个数是怎么来的？'), '数据链');
  assert.strictEqual(receiverKind('如果我要改一处，会牵连哪些地方？'), '依赖结构');
  assert.strictEqual(receiverKind('什么情况下我应该停下来问你？'), '边界');
  assert.strictEqual(receiverKind('你觉得这个研究有意思吗'), '未归类');
  assert.deepStrictEqual(report().questions.map((q) => q.kind), ['数据链', '依赖结构', '边界']);
});

test('脚本可运行，输出含章名、教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('别人能不能接着用'), '输出缺章名');
  assert.match(out, /缺一件：3 ÷ 4 = 75%/);
  assert.match(out, /教学样例/);
  assert.match(out, /不构成法律或信息管理意见/);
  assert.ok(out.length > 200);
});

test('代码头部注释指向本章正文，且章号与目录一致', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('departments/05-huli/27-huli-biye-sheji/chapters/06-zhishi-yijiao/docs/zh.md'));
  assert.strictEqual(SLUG, '06-zhishi-yijiao');
  assert.strictEqual(CHAPTER, '6');
});

test('quiz：题量、三段齐、四选项、解释够长', () => {
  assert.ok(quiz.questions.length >= 5, '题目少于五道');
  const stages = new Set(quiz.questions.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.strictEqual(new Set(q.options).size, 4, `选项重复：${q.question}`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, q.question);
    const han = (q.explain.match(/[\u4e00-\u9fff]/g) || []).length;
    assert.ok(han >= 30, `解释不足三十字：${q.question}`);
  }
});

test('quiz：答案打散，check 题不少于两道且正确项能在正文找到原词', () => {
  const answers = quiz.questions.map((q) => q.correct);
  assert.ok(new Set(answers).size >= 3, `答案分布过于集中：${answers.join(',')}`);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  assert.ok(checks.length >= 2, 'check 题少于两道');
  for (const q of checks) {
    const right = q.options[q.correct];
    let hit = false;
    for (let i = 0; i + 4 <= right.length; i += 1) {
      const g = right.slice(i, i + 4);
      if (/^[\u4e00-\u9fff]+$/.test(g) && doc.includes(g)) { hit = true; break; }
    }
    assert.ok(hit, `正确项与正文没有共同四字表述：${q.question}`);
  }
});

test('quiz：无残留痕迹与越界表述', () => {
  const body = fs.readFileSync(QUIZ, 'utf8');
  const banned = ['剂' + '量', '疗' + '程', '发生' + '率', '页' + '码'];
  const stub = ['T' + 'ODO', '待' + '补', '占' + '位', '脚' + '手' + '架', '示' + '例' + '题', '三' + '辨', '四位' + '面', '单' + '元' + '规' + '模'];
  for (const w of banned) assert.ok(!body.includes(w), `quiz 出现越界表述：${w}`);
  for (const w of stub) assert.ok(!body.includes(w), `quiz 留有未完成痕迹：${w}`);
  assert.ok(!/第\s*\d+\s*页/.test(body), 'quiz 出现页号式引用');
});
