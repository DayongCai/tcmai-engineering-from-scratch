'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, sectionOf, auditPerf, verify, ALLOCS, TOOLS } = require('./main.js');

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
  assert.ok(DOC.endsWith(path.join('chapters', '06-y6', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 6);
  assert.strictEqual(TITLE, '绩效方案按收入分配的那天，质量指标就成了成本');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 6 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断、引文', () => {
  assert.strictEqual(A.hanzi, 2754);
  assert.strictEqual(A.sections.length, 7);
  assert.strictEqual(A.claims, 42);
  assert.strictEqual(A.quotes.length, 1);
});

test('绩效结构：闭环四环、三次分配、三种工具、三条红线、闭环四节点', () => {
  const p = auditPerf(A.sections);
  assert.doesNotThrow(() => verify(p));
  assert.deepStrictEqual(p.loop, ['目标设定', '指标与权重', '考核与核算', '反馈与应用']);
  assert.deepStrictEqual(p.allocs, ALLOCS);
  assert.deepStrictEqual(p.tools, TOOLS);
  assert.strictEqual(p.redlines.length, 3);
  assert.deepStrictEqual(p.eRClosed, ['医嘱', '执行', '记录', '评价']);
});

test('红线与主指标判断取自正文原句', () => {
  const s3 = sectionOf(A.sections, '红线');
  assert.match(s3.text, /不得与药品、耗材、检查、化验等业务收入挂钩/);
  assert.match(s3.text, /这个指标能不能通过损害患者或基金的方式达成/);
  const s2 = sectionOf(A.sections, '三种工具');
  assert.match(s2.text, /必须先定\*\*主指标\*\*/);
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

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /红线 3\/3/);
  assert.match(r.stdout, /不构成薪酬方案或合规审查意见/);
});
