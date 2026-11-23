'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { report, problem, structure, handoverSegment, handoverCoverage, CHAPTER, SLUG } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

test('规模：汉字数与正文独立复算一致，且不少于两千五', () => {
  const n = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.strictEqual(report().size.hanzi, n);
  assert.strictEqual(report().size.hanzi, 3473);
  assert.ok(n >= 2500, `正文汉字过少：${n}`);
  assert.deepStrictEqual(report().size, { hanzi: 3473, sections: 6, tables: 3, rows: 12 });
});

test('入科算术：站 × 周、工作日 − 考核、再扣开头几天，四步都能复算并与正文对账', () => {
  const m = problem(doc);
  assert.strictEqual(m.stations, 6);
  assert.strictEqual(m.weeksPer, 4);
  assert.strictEqual(m.totalWeeks, 24);
  assert.strictEqual(m.workdays, 20);
  assert.strictEqual(m.examDays, 2);
  assert.strictEqual(m.realDays, 18);
  assert.strictEqual(m.frontDays, 3);
  assert.strictEqual(m.restDays, 15);
  assert.strictEqual(m.consistent, true, '正文写出的三个数与重算不一致');
  assert.strictEqual(m.realDays, m.workdays - m.examDays);
  assert.strictEqual(m.restDays, m.realDays - m.frontDays);
});

test('结构：三问三行、目标四行、观察五项、交接四段、考核五条、失效五条', () => {
  assert.deepStrictEqual(structure(doc), {
    questions: 3, goals: 4, observations: 5, handoverParts: 4, examItems: 5, failures: 5
  });
});

test('交接分类：四段样例各归其位，空话不进任何一段', () => {
  const r = report();
  assert.deepStrictEqual(r.samples.map((s) => s.segment), ['现状', '变化', '未决', '下一步', '空话']);
  assert.strictEqual(handoverSegment('密切观察'), '空话');
  assert.strictEqual(handoverSegment('继续观察'), '空话');
  assert.strictEqual(handoverSegment('与昨日相比尿量明显减少'), '变化');
  assert.strictEqual(handoverSegment('血常规结果还没回'), '未决');
  assert.strictEqual(handoverSegment('接班后先复测体温'), '下一步');
  assert.deepStrictEqual(r.coverage, { got: ['现状', '变化', '未决', '下一步'], missing: [] });
  assert.deepStrictEqual(handoverCoverage(['诊断类别、当前措施']), {
    got: ['现状'], missing: ['变化', '未决', '下一步']
  });
});

test('脚本可运行，输出含章名、教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('内科轮转的前三天'), '输出缺章名');
  assert.match(out, /6 站 × 每站 4 周 = 24 周/);
  assert.match(out, /教学样例/);
  assert.match(out, /不构成临床判断依据/);
  assert.ok(out.length > 200);
});

test('代码头部注释指向本章正文，且章号与目录一致', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('departments/05-huli/26-huli-linchuang-lunzhuan/chapters/01-neike-huli/docs/zh.md'));
  assert.strictEqual(SLUG, '01-neike-huli');
  assert.strictEqual(CHAPTER, '1');
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
