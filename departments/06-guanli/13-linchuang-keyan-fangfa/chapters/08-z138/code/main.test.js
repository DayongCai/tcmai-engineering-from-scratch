'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, analyze, sectionOf, power, delayChain, enrollment, schedule, auditStructure, verify, REAL_PER_ARM,
} = require('./main.js');

const BODY = read();
const A = analyze(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '08-z138', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 8);
  assert.strictEqual(TITLE, '方案书写在收第一例之前，因为收完之后它什么都改不了');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 8 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断', () => {
  assert.strictEqual(A.hanzi, 2649);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.claims, 41);
});

test('延误链复算：3×10=30 周，首例推到第 11 个月，入组窗口剩 5 个月', () => {
  const d = delayChain();
  assert.strictEqual(d.lostWeeks, 30);
  assert.strictEqual(d.lostMonths, 7);
  assert.strictEqual(d.firstEnrollMonth, 11);
  assert.strictEqual(d.windowAfter, 5);
  assert.match(BODY, /从第 4 个月推到第 11 个月/);
  assert.match(BODY, /从 12 个月压到 5 个月/);
});

test('入组量复算：计划 142 例，实际 68 例', () => {
  const e = enrollment();
  assert.strictEqual(e.planned, 142);
  assert.strictEqual(e.real, 68);
  assert.strictEqual(e.perArm, 34);
  assert.strictEqual(e.share, 48);
  assert.match(BODY, /142 例（71 例\/组）只完成 68 例（34 例\/组）/);
});

test('把握度复算：δ=1.5 时 0.80、33 例 0.79；δ=1.0 时与正文 0.46 相差不到 0.01', () => {
  assert.strictEqual(power(1.5, REAL_PER_ARM), 0.8);
  assert.strictEqual(power(1.5, REAL_PER_ARM - 1), 0.79);
  assert.ok(Math.abs(power(1.0, REAL_PER_ARM) - 0.46) < 0.01, String(power(1.0, REAL_PER_ARM)));
  assert.match(BODY, /把握度只有 0\.46/);
});

test('进度切分加起来正好 24 个月，准备期 4 个月', () => {
  const s = schedule();
  assert.deepStrictEqual(s, { prep: 4, enroll: 12, follow: 6, write: 2, total: 24 });
});

test('结构五组齐：骨架 15 项、伦理 3 关、数据管理 6 步、证据链 4 环、风险 4 行', () => {
  const j = auditStructure(A.sections);
  assert.doesNotThrow(() => verify(j, delayChain(), enrollment(), schedule()));
  assert.strictEqual(j.items, 15);
  assert.deepStrictEqual(j.gates, ['科学价值', '风险受益比', '知情同意']);
  assert.strictEqual(j.steps.length, 6);
  assert.deepStrictEqual(j.chain, ['源数据', '病例报告表', '数据库', '分析数据集']);
  assert.strictEqual(j.risks, 4);
});

test('「方案的价钱在漏掉的那几行」与「改不动」都在正文里', () => {
  const s1 = sectionOf(A.sections, '方案书的骨架');
  assert.match(BODY, /方案的价钱不在写它的那两周，在它漏掉的那几行/);
  assert.match(s1.text, /统计分析计划/);
  assert.match(BODY, /入组开始后任何方案改动都须重新报审/);
});

test('quiz：≥5 题、三段齐、四选项、解释够长、答案打散', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const qs = quiz.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  for (const s of ['pre', 'check', 'post']) assert.ok(qs.some((q) => q.stage === s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
    assert.ok(hanzi(q.explain) >= 30, `explain 只有 ${hanzi(q.explain)} 汉字`);
  }
  assert.ok(new Set(qs.map((q) => q.correct)).size >= 3, '正确答案过于集中');
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道）', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => [...shingles(q.options[q.correct])].some((s) => body.has(s)));
  assert.ok(checks.length >= 3);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('脚本可运行，输出含现算延误链与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /30 周 ≈ 7 个月/);
  assert.match(r.stdout, /入组窗口 12 个月 → 5 个月/);
  assert.match(r.stdout, /不构成研究结论或临床建议/);
});
