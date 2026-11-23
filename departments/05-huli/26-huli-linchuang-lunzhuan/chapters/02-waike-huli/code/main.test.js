'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { report, problem, structure, painNote, CHAPTER, SLUG } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

test('规模：汉字数与正文独立复算一致，且不少于两千五', () => {
  const n = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.strictEqual(report().size.hanzi, n);
  assert.strictEqual(report().size.hanzi, 3152);
  assert.ok(n >= 2500, `正文汉字过少：${n}`);
  assert.deepStrictEqual(report().size, { hanzi: 3152, sections: 6, tables: 3, rows: 11 });
});

test('术前术后算术：住院拆分与「漏一项 × 术后天数」都能复算并与正文对账', () => {
  const m = problem(doc);
  assert.strictEqual(m.stayDays, 5);
  assert.strictEqual(m.preDays, 1);
  assert.strictEqual(m.postDays, 4);
  assert.strictEqual(m.missed, 1);
  assert.strictEqual(m.extraChecks, 4);
  assert.strictEqual(m.consistent, true, '正文写出的拆分或次数与重算不一致');
  assert.strictEqual(m.stayDays, m.preDays + m.postDays);
  assert.strictEqual(m.extraChecks, m.missed * m.postDays);
});

test('结构：三段性质、术前四类、四个窗口、三处断点、五项考核、五条失效', () => {
  assert.deepStrictEqual(structure(doc), {
    phases: 3, prepCategories: 4, windows: 4, boundaries: 3, examItems: 5, failures: 5
  });
});

test('疼痛记录三段规则：评价与单点分数都不算观察，三段齐才可用', () => {
  assert.strictEqual(painNote('疼痛可忍').kind, '评价式');
  assert.strictEqual(painNote('疼痛评分 3 分').kind, '只有分数');
  assert.strictEqual(painNote('翻身时切口处疼，静卧可缓解，昨夜起持续约十分钟').kind, '三段齐');
  assert.deepStrictEqual(report().pain.map((p) => p.kind), ['评价式', '只有分数', '三段齐', '缺动作']);
  assert.deepStrictEqual(report().pain[2].parts, ['时点', '动作', '减轻']);
  assert.strictEqual(report().pain.filter((p) => p.kind === '三段齐').length, 1);
});

test('脚本可运行，输出含章名、教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('术前那一天'), '输出缺章名');
  assert.match(out, /住院 5 天 = 术前 1 天 \+ 术后 4 天/);
  assert.match(out, /教学样例/);
  assert.match(out, /不构成临床判断依据/);
  assert.ok(out.length > 200);
});

test('代码头部注释指向本章正文，且章号与目录一致', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('departments/05-huli/26-huli-linchuang-lunzhuan/chapters/02-waike-huli/docs/zh.md'));
  assert.strictEqual(SLUG, '02-waike-huli');
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
