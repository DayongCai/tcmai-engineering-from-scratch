'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { report, funnel, structure, exclusionKind, hasOutcomeExclusion, EXCLUSION_KINDS, CHAPTER, SLUG } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

test('规模：汉字数与正文独立复算一致，且不少于两千五', () => {
  const n = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.strictEqual(report().size.hanzi, n);
  assert.strictEqual(report().size.hanzi, 2943);
  assert.ok(n >= 2500, `正文汉字过少：${n}`);
  assert.deepStrictEqual(report().size, { hanzi: 2943, sections: 6, tables: 3, rows: 15 });
});

test('漏斗：5 库 × 3 组 = 15 条式，命中 300，逐层 120/20/8/3', () => {
  const f = funnel(doc);
  assert.strictEqual(f.databases, 5);
  assert.strictEqual(f.concepts, 3);
  assert.strictEqual(f.formulas, 15);
  assert.strictEqual(f.perHit, 20);
  assert.strictEqual(f.total, 300);
  assert.deepStrictEqual(f.ladder.map((s) => s.count), [300, 120, 20, 8, 3]);
  assert.strictEqual(f.consistent, true, '正文写出的检索式或命中数与重算不一致');
  assert.strictEqual(f.formulas, f.databases * f.concepts);
  assert.strictEqual(f.total, f.formulas * f.perHit);
});

test('漏斗保留率：每层相对上一层与相对命中两个口径都能复算', () => {
  const f = funnel(doc);
  assert.deepStrictEqual(f.steps.map((s) => s.fromPrev), [null, 40, 16.7, 40, 37.5]);
  assert.deepStrictEqual(f.steps.map((s) => s.ofStart), [100, 40, 6.7, 2.7, 1]);
  for (let i = 1; i < f.steps.length; i += 1) {
    assert.ok(f.steps[i].count <= f.steps[i - 1].count, '漏斗必须逐层收缩');
  }
});

test('结构：问题四格、证据层级六类、漏斗五层、留档四样、适配三道、五条失效', () => {
  assert.deepStrictEqual(structure(doc), {
    questionGrid: 4, evidenceLevels: 6, funnelRows: 5, records: 4, fitSteps: 3, failures: 5
  });
});

test('排除理由归类：五类各自可辨，「结局不符」在不在是标准的判据', () => {
  assert.strictEqual(exclusionKind('人群不符'), '人群不符');
  assert.strictEqual(exclusionKind('干预方式不同'), '干预不符');
  assert.strictEqual(exclusionKind('测的结局不一样'), '结局不符');
  assert.strictEqual(exclusionKind('无法获取全文'), '无法获取全文');
  assert.strictEqual(exclusionKind('读起来像二手转述'), '非原文');
  assert.strictEqual(exclusionKind('样本量太小'), '其他');
  assert.strictEqual(hasOutcomeExclusion(EXCLUSION_KINDS), true);
  assert.strictEqual(hasOutcomeExclusion(['人群不符', '非原文']), false);
});

test('脚本可运行，输出含章名、教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('找到边界'), '输出缺章名');
  assert.match(out, /5 个来源库 × 3 组概念 = 15 条检索式/);
  assert.match(out, /教学样例/);
  assert.match(out, /不构成临床判断依据/);
  assert.ok(out.length > 200);
});

test('代码头部注释指向本章正文，且章号与目录一致', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('departments/05-huli/27-huli-biye-sheji/chapters/02-zhengju-chaxun/docs/zh.md'));
  assert.strictEqual(SLUG, '02-zhengju-chaxun');
  assert.strictEqual(CHAPTER, '2');
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
