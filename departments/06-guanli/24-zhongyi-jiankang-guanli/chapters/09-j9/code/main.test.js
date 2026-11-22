'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections,
  variables, seasonChannels, envLevels, orgForms, observeItems, shiftRules, shareMath, audit,
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
  assert.ok(DOC.endsWith(path.join('chapters', '09-j9', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 9);
  assert.strictEqual(BODY.split('\n')[0], `# 第 9 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 1);
});

test('三个变量与时相锚点', () => {
  assert.deepStrictEqual(A.vars, ['时相', '时长', '稳定性']);
  assert.match(BODY, /固定起床时间是最有效的一条/);
  assert.match(BODY, /周末补觉之所以效果有限/);
});

test('四时只调光照、温度、活动量三条通道', () => {
  assert.deepStrictEqual(A.channels, ['光照', '温度', '活动量']);
});

test('环境四层面都给出「不可改时的减损方向」', () => {
  assert.deepStrictEqual(A.env.map((e) => e.level), ['卧室', '居住区', '工作环境', '职业暴露']);
  assert.match(A.env[0].mitigate, /眼罩耳塞/);
  assert.ok(A.env.every((e) => e.mitigate && e.fixed), '某层面缺可改/不可改的区分');
});

test('组织三方式与轮班五条', () => {
  assert.deepStrictEqual(A.orgs, ['个体指导', '小组活动', '单位与社区层面的安排']);
  assert.strictEqual(A.shift.length, 5);
  assert.match(A.shift[0], /班次内的相对固定/);
  assert.match(A.shift[3], /早→中→夜/);
});

test('观察七项，都能自己记、不依赖设备', () => {
  assert.strictEqual(A.observe.length, 7);
  assert.match(A.observe[0], /固定起床时间的达成天数/);
  assert.match(A.observe[3], /咖啡因/);
});

test('比例复算：120 人里 45.6 人轮班，执行不足 6 人', () => {
  assert.deepStrictEqual(A.share, { people: 120, pct: 38, exec: 5, shiftWorkers: 45.6, keepers: 6 });
  assert.ok(A.share.shiftWorkers > 40 && A.share.shiftWorkers < 50);
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
  assert.match(r.stdout, /45\.6 人轮班/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成诊疗意见/);
});
