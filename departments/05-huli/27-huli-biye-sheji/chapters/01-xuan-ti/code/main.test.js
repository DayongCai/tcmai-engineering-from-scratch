'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { report, market, sampling, structure, oversizeKind, CHAPTER, SLUG } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const doc = fs.readFileSync(DOC, 'utf8');
const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));

test('规模：汉字数与正文独立复算一致，且不少于两千五', () => {
  const n = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.strictEqual(report().size.hanzi, n);
  assert.strictEqual(report().size.hanzi, 2834);
  assert.ok(n >= 2500, `正文汉字过少：${n}`);
  assert.deepStrictEqual(report().size, { hanzi: 2834, sections: 6, tables: 2, rows: 9 });
});

test('市场侧缺口：6498 × 5.5% × 0.2 取整 71，1% 与 10% 两边界为 13 与 130', () => {
  const m = market(doc);
  assert.strictEqual(m.hospitals, 6498);
  assert.strictEqual(m.penetration, 5.5);
  assert.strictEqual(m.maturity, 0.2);
  assert.strictEqual(m.raw, 71.478);
  assert.strictEqual(m.mid, 71);
  assert.strictEqual(m.low, 13);
  assert.strictEqual(m.high, 130);
  assert.strictEqual(m.consistent, true, '正文写出的四个数与重算不一致');
  assert.strictEqual(m.mid, Math.round(m.hospitals * (m.penetration / 100) * m.maturity));
  assert.ok(m.low < m.mid && m.mid < m.high);
});

test('临床侧抽样：1200 例抽 120 例，45 例留空为 37.5% 的抽样值', () => {
  const p = sampling(doc);
  assert.strictEqual(p.admissions, 1200);
  assert.strictEqual(p.sample, 120);
  assert.strictEqual(p.samplePct, 10);
  assert.strictEqual(p.actualSamplePct, 10);
  assert.strictEqual(p.blank, 45);
  assert.strictEqual(p.rate, 37.5);
  assert.strictEqual(p.stated.rate, 37.5);
  assert.strictEqual(p.consistent, true);
  assert.strictEqual(p.rate, Number(((p.blank / p.sample) * 100).toFixed(1)));
});

test('结构：四条判据、五个节点、四种过大形态、开题四件事、边界五条', () => {
  assert.deepStrictEqual(structure(doc), {
    criteria: 4, milestones: 5, oversizeForms: 4, proposalItems: 4, boundaryRules: 5
  });
});

test('选题形态识别：四种过大各自可辨，缩小后的写法判为可做', () => {
  assert.strictEqual(oversizeKind('某地区老年患者跌倒预防现状调查'), '对象过大');
  assert.strictEqual(oversizeKind('同时改评估表、交接流程、健康教育、家属参与、随访五件事'), '变量过多');
  assert.strictEqual(oversizeKind('方案要求随访三个月'), '时间过长');
  assert.strictEqual(oversizeKind('构建老年跌倒预防体系'), '野心过大');
  assert.strictEqual(oversizeKind('制定一份含 N 栏的评估表并试用'), '可做');
  assert.deepStrictEqual(report().titles.map((x) => x.kind), ['对象过大', '变量过多', '时间过长', '野心过大', '可做']);
});

test('脚本可运行，输出含章名、教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('缺口必须算得出来'), '输出缺章名');
  assert.match(out, /可触达 6,498 家 × 5\.5% × 0\.2 = 71\.478，取整 71 家/);
  assert.match(out, /教学样例/);
  assert.match(out, /不构成临床判断依据/);
  assert.ok(out.length > 200);
});

test('代码头部注释指向本章正文，且章号与目录一致', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('departments/05-huli/27-huli-biye-sheji/chapters/01-xuan-ti/docs/zh.md'));
  assert.strictEqual(SLUG, '01-xuan-ti');
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
