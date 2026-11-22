'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, hanzi, sections,
  chain, canSay, cannotSay, roles, risks, gaps, techQuestions, deviceMath, audit,
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
  assert.ok(DOC.endsWith(path.join('chapters', '16-j16', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 16);
  assert.strictEqual(BODY.split('\n')[0], `# 第 16 章 · ${TITLE}`);
});

test('规模可复算：汉字、节、引文', () => {
  assert.ok(hanzi(BODY) > 2500, String(hanzi(BODY)));
  assert.strictEqual(sections(BODY).filter((s) => s.title).length, 6);
  assert.ok(new Set([...BODY.matchAll(/《([^》]+)》/g)].map((m) => m[1])).size >= 1);
});

test('数据链四段，误差在解释段放大', () => {
  assert.deepStrictEqual(A.ch, ['采集', '传输', '解释', '动作']);
  assert.match(BODY, /这是误差放大的一段/);
  assert.match(BODY, /设备给出的从来不是含义，是数值/);
});

test('能说两件事、不能说三件事', () => {
  assert.deepStrictEqual(A.yes, ['相对自己的变化', '趋势与节律']);
  assert.deepStrictEqual(A.no, ['诊断', '因果', '单点异常']);
});

test('智能三角色与四种风险', () => {
  assert.deepStrictEqual(A.rl, ['提示', '筛查', '替代']);
  assert.deepStrictEqual(A.rk, ['标注偏差', '分布漂移', '过度诊断', '黑箱与不可申诉']);
  assert.match(BODY, /系统可以做「提醒人」的事，不能做「代替人」的事/);
});

test('数字鸿沟三形态与引入技术四问', () => {
  assert.deepStrictEqual(A.gp, ['接入鸿沟', '使用鸿沟', '收益鸿沟']);
  assert.strictEqual(A.tq.length, 4);
  assert.match(A.tq[0], /它替代了谁的什么动作/);
  assert.match(A.tq[3], /最弱的那批人/);
});

test('设备复算：800 人里约 168 人佩戴，跟进 300/12000 = 2.5%', () => {
  assert.strictEqual(A.math.wearers, 168);
  assert.strictEqual(A.math.followedPct, 2.5);
  assert.strictEqual(A.math.match, true);
  assert.ok(A.math.followedPct < 5);
});

test('清单条数与句中的中文数字对账一致', () => {
  assert.deepStrictEqual(A.mismatched, []);
  assert.strictEqual(A.claims.length, 7);
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
  assert.match(r.stdout, /算得 2\.5%（文中 2\.5%，对得上）/);
  assert.match(r.stdout, /对账：一致/);
  assert.match(r.stdout, /不构成技术选型建议/);
});
