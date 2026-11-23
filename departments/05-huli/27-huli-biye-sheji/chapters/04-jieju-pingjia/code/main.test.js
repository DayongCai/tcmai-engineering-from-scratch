'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { report, readings, blankRate, substitution, structure, metricKind, BIAS_TYPES, CHAPTER, SLUG } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

test('规模：汉字数与正文独立复算一致，且不少于两千五', () => {
  const n = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.strictEqual(report().size.hanzi, n);
  assert.strictEqual(report().size.hanzi, 2806);
  assert.ok(n >= 2500, `正文汉字过少：${n}`);
  assert.deepStrictEqual(report().size, { hanzi: 2806, sections: 6, tables: 1, rows: 3 });
});

test('读数算术：三层 × 两时点 = 6，只测结局 2 个即缺 4 个', () => {
  const d = readings(doc);
  assert.strictEqual(d.layers, 3);
  assert.strictEqual(d.timepoints, 2);
  assert.strictEqual(d.total, 6);
  assert.strictEqual(d.outcomeOnly, 2);
  assert.strictEqual(d.missing, 4);
  assert.strictEqual(d.consistent, true, '正文写出的读数与重算不一致');
  assert.strictEqual(d.total, d.layers * d.timepoints);
  assert.strictEqual(d.missing, d.total - d.outcomeOnly);
});

test('两季留空率与降幅：21/60 → 35%，12/60 → 20%，降幅 42.9%', () => {
  const b = blankRate(doc);
  assert.strictEqual(b.admissions, 300);
  assert.strictEqual(b.sample, 60);
  assert.strictEqual(b.samplePct, 20);
  assert.strictEqual(b.blank, 21);
  assert.strictEqual(b.rate1, 35);
  assert.strictEqual(b.nextBlank, 12);
  assert.strictEqual(b.rate2, 20);
  assert.strictEqual(b.drop, 42.9);
  assert.strictEqual(b.consistent, true);
  assert.strictEqual(b.drop, Number((((b.rate1 - b.rate2) / b.rate1) * 100).toFixed(1)));
});

test('替代指标：35000 ÷ 351038 = 9.97%，只说明省了不说明好了', () => {
  const u = substitution(doc);
  assert.strictEqual(u.saving, 351038);
  assert.strictEqual(u.price, 35000);
  assert.strictEqual(u.ratio, 9.97);
  assert.strictEqual(u.stated, 9.97);
  assert.strictEqual(u.consistent, true);
});

test('结构：三层指标、四要素、三风险、四类偏倚、五条失效', () => {
  assert.deepStrictEqual(structure(doc), {
    layers: 3, measurableParts: 4, substitutionRisks: 3, biasTypes: 4, failures: 5
  });
  assert.strictEqual(BIAS_TYPES.length, 4);
  for (const k of BIAS_TYPES) assert.ok(doc.includes(k));
});

test('指标写法判据：有分母才算率，总量与感受都不成指标', () => {
  assert.strictEqual(metricKind('共完成 120 次'), '总量');
  assert.strictEqual(metricKind('患者满意'), '感受');
  assert.strictEqual(metricKind('交接栏留空率 35%'), '率');
  assert.strictEqual(metricKind('已建立流程'), '空话');
  assert.deepStrictEqual(report().metrics.map((x) => x.kind), ['总量', '感受', '率', '率', '空话']);
});

test('脚本可运行，输出含章名、教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('指标选错'), '输出缺章名');
  assert.match(out, /3 类指标 × 2 个时点 = 6 个读数/);
  assert.match(out, /教学样例/);
  assert.match(out, /不构成临床判断依据/);
  assert.ok(out.length > 200);
});

test('代码头部注释指向本章正文，且章号与目录一致', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('departments/05-huli/27-huli-biye-sheji/chapters/04-jieju-pingjia/docs/zh.md'));
  assert.strictEqual(SLUG, '04-jieju-pingjia');
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
