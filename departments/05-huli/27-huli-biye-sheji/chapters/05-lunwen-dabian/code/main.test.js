'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { report, schedule, structure, questionKind, CHAPTER, SLUG } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

test('规模：汉字数与正文独立复算一致，且不少于两千五', () => {
  const n = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.strictEqual(report().size.hanzi, n);
  assert.strictEqual(report().size.hanzi, 2836);
  assert.ok(n >= 2500, `正文汉字过少：${n}`);
  assert.deepStrictEqual(report().size, { hanzi: 2836, sections: 6, tables: 3, rows: 15 });
});

test('时间分配：平均 3.75，五段 2/3/5/4/1 合计 15，结果与讨论占 60%', () => {
  const s = schedule(doc);
  assert.strictEqual(s.parts, 4);
  assert.strictEqual(s.evenAvg, 3.75);
  assert.deepStrictEqual(s.segments, { problem: 2, method: 3, result: 5, discussion: 4, conclusion: 1 });
  assert.strictEqual(s.total, 15);
  assert.strictEqual(s.judged, 9);
  assert.strictEqual(s.share, 60);
  assert.strictEqual(s.figures, 6);
  assert.strictEqual(s.perFigure, 2.5);
  assert.strictEqual(s.consistent, true, '正文写出的总时长或占比与重算不一致');
  const sum = Object.values(s.segments).reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, s.total);
  assert.strictEqual(s.evenAvg, Number((s.total / s.parts).toFixed(2)));
});

test('结构：四段式、时长表五行、六类提问、图表三规矩、五条失效', () => {
  assert.deepStrictEqual(structure(doc), {
    fourParts: 4, durationRows: 5, questionTypes: 6, chartRules: 3, failures: 5
  });
});

test('提问归类：六类问法各自归位，归不进去的返回未归类', () => {
  assert.strictEqual(questionKind('这个问题真的存在吗？有多大？'), '缺口类');
  assert.strictEqual(questionKind('为什么不设对照组？'), '设计类');
  assert.strictEqual(questionKind('这个指标能代表你要测的东西吗？'), '测量类');
  assert.strictEqual(questionKind('干预真的做到了吗？'), '执行类');
  assert.strictEqual(questionKind('病人怎么同意的？数据怎么存的？'), '伦理类');
  assert.strictEqual(questionKind('这个结论能推广吗？'), '推广类');
  assert.strictEqual(questionKind('你觉得这个研究怎么样'), '未归类');
  assert.deepStrictEqual(report().questions.map((q) => q.kind), ['缺口类', '设计类', '测量类', '执行类', '伦理类', '推广类']);
});

test('脚本可运行，输出含章名、教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('判断链'), '输出缺章名');
  assert.match(out, /结果与讨论 9 分钟，占 9 ÷ 15 = 60%/);
  assert.match(out, /教学样例/);
  assert.match(out, /不构成学术评价意见/);
  assert.ok(out.length > 200);
});

test('代码头部注释指向本章正文，且章号与目录一致', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('departments/05-huli/27-huli-biye-sheji/chapters/05-lunwen-dabian/docs/zh.md'));
  assert.strictEqual(SLUG, '05-lunwen-dabian');
  assert.strictEqual(CHAPTER, '5');
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
