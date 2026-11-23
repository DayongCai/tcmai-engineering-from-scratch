'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { report, problem, structure, talkClass, CARER_ITEMS, CHAPTER, SLUG } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

test('规模：汉字数与正文独立复算一致，且不少于两千五', () => {
  const n = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.strictEqual(report().size.hanzi, n);
  assert.strictEqual(report().size.hanzi, 2944);
  assert.ok(n >= 2500, `正文汉字过少：${n}`);
  assert.deepStrictEqual(report().size, { hanzi: 2944, sections: 6, tables: 2, rows: 5 });
});

test('双对象记录算术：周数相加、每班两份、一半缺线，四步都能复算并与正文对账', () => {
  const m = problem(doc);
  assert.strictEqual(m.weeksEach, 2);
  assert.strictEqual(m.weeksTotal, 4);
  assert.strictEqual(m.workdays, 20);
  assert.strictEqual(m.objectsPerShift, 2);
  assert.strictEqual(m.records, 40);
  assert.strictEqual(m.missing, 20);
  assert.strictEqual(m.consistent, true, '正文写出的合计与缺线数同重算不一致');
  assert.strictEqual(m.records, m.workdays * m.objectsPerShift);
  assert.strictEqual(m.missing, m.records / 2);
});

test('结构：双对象两行、年龄段三档、三条观察线、照护者四类、三类沟通话', () => {
  assert.deepStrictEqual(structure(doc), {
    objectPairs: 2, ageBands: 3, observationLines: 3, carerItems: 4, talkClasses: 3, examItems: 5, failures: 5
  });
  assert.deepStrictEqual(CARER_ITEMS, ['照护能力', '情绪状态', '依从情况', '家庭条件']);
  for (const k of CARER_ITEMS) assert.ok(doc.includes(k));
});

test('沟通分类：事实、判断、安排各自可辨，越界承诺单列', () => {
  assert.strictEqual(talkClass('今天体温三十七度二，已经喂过两次'), '事实');
  assert.strictEqual(talkClass('明天上午找张医生复诊'), '安排');
  assert.strictEqual(talkClass('这个手术肯定没问题'), '越界承诺');
  assert.strictEqual(talkClass('预后可能会好一些'), '判断');
  assert.strictEqual(talkClass('我去问一下，稍后回复你'), '安排');
  assert.deepStrictEqual(report().talks.map((t) => t.kind), ['事实', '越界承诺', '安排', '安排']);
});

test('脚本可运行，输出含章名、教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('写两个人的记录'), '输出缺章名');
  assert.match(out, /20 个班 × 每班 2 份 = 40 份记录/);
  assert.match(out, /教学样例/);
  assert.match(out, /不构成临床判断依据/);
  assert.ok(out.length > 200);
});

test('代码头部注释指向本章正文，且章号与目录一致', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('departments/05-huli/26-huli-linchuang-lunzhuan/chapters/03-fuer-huli/docs/zh.md'));
  assert.strictEqual(SLUG, '03-fuer-huli');
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
