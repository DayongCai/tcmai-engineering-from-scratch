'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections,
  stages, stageTable, threeQuestions, mergeRules, crowdRules, layers, loadMath, audit,
} = require('./main.js');

const BODY = read();
const A = audit(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '10-j10', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 10);
  assert.strictEqual(BODY.split('\n')[0], `# 第 10 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 1);
});

test('四个段落，待查段只记录与转介', () => {
  assert.strictEqual(A.st.length, 4);
  assert.deepStrictEqual(A.sTable.map((s) => s.stage), ['未构成诊断', '确诊稳定期', '病后恢复', '症状待查']);
  assert.match(A.sTable[3].canDo, /只做记录与转介/);
  assert.match(A.sTable[3].stop, /唯一动作是转介/);
});

test('分段靠三问，不靠病名', () => {
  assert.deepStrictEqual(A.qs, ['有没有确诊？', '最近有没有变化？', '有没有警示表现？']);
  assert.match(BODY, /段落还会移动/);
});

test('共病合并四规则与重点人群三规则', () => {
  assert.deepStrictEqual(A.merge, ['一个时相锚点', '一份饮食框架', '一套活动总量', '一次随访']);
  assert.strictEqual(A.crowd.length, 3);
  assert.match(A.crowd[0], /一次只改一件事/);
  assert.match(A.crowd[2], /转介路径/);
});

test('三层服务带频次与退出条件', () => {
  assert.deepStrictEqual(A.ls.map((l) => l.layer), ['基础层', '加强层', '密集层']);
  assert.deepStrictEqual(A.ls.map((l) => l.freq), ['季度', '月度', '双周']);
  assert.match(A.ls[2].exit, /稳定满三个月/);
});

test('负荷复算：1600 人里的 992 与 608，完成率掉 37 点', () => {
  assert.deepStrictEqual(A.load, { people: 1600, two: 992, three: 608, rateA: 71, rateB: 34, dropPoints: 37, dropPct: 52.1 });
  assert.ok(A.load.dropPct > 50);
});

test('清单条数与句中的中文数字对账一致', () => {
  assert.deepStrictEqual(A.mismatched, []);
  assert.strictEqual(A.claims.length, 6);
});

test('quiz：check 题正确选项落在正文里（≥2 道），答案下标打散', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) =>
    [...shingles(q.options[q.correct])].some((g) => body.has(g)));
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
  const used = new Set(quiz.questions.map((q) => q.correct));
  assert.ok(used.size >= 3, '正确答案过于集中在一个下标');
  for (const q of quiz.questions) {
    assert.strictEqual(q.options.length, 4, q.question);
    assert.ok(hanzi(q.explain) >= 30, q.question);
  }
});

test('脚本可运行，输出含复算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /992 人两项以上/);
  assert.match(r.stdout, /掉 37 个百分点/);
  assert.match(r.stdout, /对账：一致/);
});
