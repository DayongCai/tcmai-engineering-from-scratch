'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { report, consentCoverage, fidelity, structure, changeKind, CHAPTER, SLUG } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

test('规模：汉字数与正文独立复算一致，且不少于两千五', () => {
  const n = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.strictEqual(report().size.hanzi, n);
  assert.strictEqual(report().size.hanzi, 2837);
  assert.ok(n >= 2500, `正文汉字过少：${n}`);
  assert.deepStrictEqual(report().size, { hanzi: 2837, sections: 6, tables: 2, rows: 6 });
});

test('授权覆盖：4 类数据里 2 类需单独同意，只签一份总同意即覆盖 50%', () => {
  const c = consentCoverage(doc);
  assert.strictEqual(c.dataTypes, 4);
  assert.strictEqual(c.sensitive, 2);
  assert.strictEqual(c.signed, 1);
  assert.strictEqual(c.coverage, 50);
  assert.strictEqual(c.blankShare, 50);
  assert.strictEqual(c.consistent, true, '正文写出的覆盖比例与重算不一致');
  assert.strictEqual(c.coverage, Number(((c.sensitive / c.dataTypes) * 100).toFixed(1)));
});

test('保真度：30 位 × 4 次 = 120，有据 96 次即 80%，缺口 24 次', () => {
  const f = fidelity(doc);
  assert.strictEqual(f.subjects, 30);
  assert.strictEqual(f.times, 4);
  assert.strictEqual(f.planned, 120);
  assert.strictEqual(f.documented, 96);
  assert.strictEqual(f.rate, 80);
  assert.strictEqual(f.missing, 24);
  assert.strictEqual(f.consistent, true);
  assert.strictEqual(f.planned, f.subjects * f.times);
  assert.strictEqual(f.rate, Number(((f.documented / f.planned) * 100).toFixed(1)));
});

test('结构：干预四要素、变更两类、送审四份、同意五要素、五条失效', () => {
  assert.deepStrictEqual(structure(doc), {
    interventionElements: 4, changeClasses: 2, reviewDocs: 4, consentElements: 5, failures: 5
  });
});

test('变更分类：改地点与格式只报备，动样本动字段动随访动干预先报审', () => {
  assert.strictEqual(changeKind('访谈地点改在会议室'), '报备');
  assert.strictEqual(changeKind('记录表格式调整'), '报备');
  assert.strictEqual(changeKind('扩大样本'), '先报审');
  assert.strictEqual(changeKind('增加数据字段'), '先报审');
  assert.strictEqual(changeKind('延长随访'), '先报审');
  assert.strictEqual(changeKind('改变干预内容'), '先报审');
  assert.deepStrictEqual(report().changes.map((x) => x.kind), ['报备', '报备', '先报审', '先报审', '先报审', '先报审']);
});

test('脚本可运行，输出含章名、教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('受试者的代价'), '输出缺章名');
  assert.match(out, /保真度 96 ÷ 120 = 80%/);
  assert.match(out, /教学样例/);
  assert.match(out, /不构成法律、伦理审查或医学意见/);
  assert.ok(out.length > 200);
});

test('代码头部注释指向本章正文，且章号与目录一致', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('departments/05-huli/27-huli-biye-sheji/chapters/03-ganyu-shixian/docs/zh.md'));
  assert.strictEqual(SLUG, '03-ganyu-shixian');
  assert.strictEqual(CHAPTER, '3');
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
