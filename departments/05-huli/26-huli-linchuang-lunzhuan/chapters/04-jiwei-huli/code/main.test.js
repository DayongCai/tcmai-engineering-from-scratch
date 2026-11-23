'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { report, problem, structure, noteKind, callParts, CALL_PARTS, CHAPTER, SLUG } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

test('规模：汉字数与正文独立复算一致，且不少于两千五', () => {
  const n = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.strictEqual(report().size.hanzi, n);
  assert.strictEqual(report().size.hanzi, 2863);
  assert.ok(n >= 2500, `正文汉字过少：${n}`);
  assert.deepStrictEqual(report().size, { hanzi: 2863, sections: 6, tables: 1, rows: 4 });
});

test('排序算术：按到达顺序的平均等待位次与最重者前面的人数都能复算', () => {
  const m = problem(doc);
  assert.strictEqual(m.arrivals, 40);
  assert.strictEqual(m.averageWait, 20);
  assert.strictEqual(m.worstAhead, 19);
  assert.strictEqual(m.sortedAhead, 1);
  assert.strictEqual(m.consistent, true, '正文写出的位次与重算不一致');
  assert.strictEqual(m.averageWait, m.arrivals / 2);
  assert.strictEqual(m.worstAhead, m.averageWait - 1);
  assert.ok(m.worstAhead > m.sortedAhead * 10, '排序前后的差距应显著');
});

test('结构：四级分诊、五个信号、呼叫四段、记录三特点、交接三形态、五项考核、五条失效', () => {
  assert.deepStrictEqual(structure(doc), {
    triageLevels: 4, signals: 5, callParts: 4, recordTraits: 3, handoverFailures: 3, examItems: 5, failures: 5
  });
  assert.strictEqual(CALL_PARTS.length, 4);
});

test('记录与呼叫规则：结论式不可复核，四段呼叫缺一段就算残缺', () => {
  assert.strictEqual(noteKind('病情稳定'), '结论式');
  assert.strictEqual(noteKind('患者不配合'), '结论式');
  assert.strictEqual(noteKind('14:20 呼吸费力，需坐起，口唇发绀'), '事实式');
  assert.strictEqual(noteKind('某时点：呼吸平稳、能完整说话'), '事实式');
  assert.deepStrictEqual(report().notes.map((x) => x.kind), ['结论式', '事实式', '结论式', '事实式']);
  const full = report().calls[0];
  assert.deepStrictEqual(full.parts, CALL_PARTS.map((p) => p.name));
  assert.deepStrictEqual(report().calls[1].parts, ['我是谁、在哪里']);
  assert.strictEqual(callParts('三床不行了，快来人').length, 1);
});

test('脚本可运行，输出含章名、教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('谁先看'), '输出缺章名');
  assert.match(out, /平均每人要等前面 20 位/);
  assert.match(out, /教学样例/);
  assert.match(out, /不构成临床判断依据/);
  assert.ok(out.length > 200);
});

test('代码头部注释指向本章正文，且章号与目录一致', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('departments/05-huli/26-huli-linchuang-lunzhuan/chapters/04-jiwei-huli/docs/zh.md'));
  assert.strictEqual(SLUG, '04-jiwei-huli');
  assert.strictEqual(CHAPTER, '4');
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
