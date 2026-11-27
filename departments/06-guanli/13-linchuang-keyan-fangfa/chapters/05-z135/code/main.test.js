'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, analyze, sectionOf, rSquared, mcidMultiple, compositeShares, decay, auditStructure, verify,
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
  assert.ok(DOC.endsWith(path.join('chapters', '05-z135', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 5);
  assert.strictEqual(TITLE, '结局选错，检验再对也答错了题');
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 5 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('正文统计可复算：汉字、节、加粗判断', () => {
  assert.strictEqual(A.hanzi, 2706);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.claims, 30);
});

test('r=0.18 只解释 3.2%：r² 复算与正文一致', () => {
  assert.strictEqual(rSquared(), 0.032);
  assert.strictEqual((rSquared() * 100).toFixed(1), '3.2');
  assert.match(BODY, /只解释了复发差异的 3\.2%/);
});

test('MCID 锚定：1.8 分是 1.5 分的 1.2 倍，刚过线', () => {
  assert.strictEqual(mcidMultiple(), 1.2);
  assert.ok(mcidMultiple(0.6) <= 0.5, '0.6 分远低于 MCID');
  assert.match(BODY, /MCID 的 1\.2 倍/);
});

test('复合终点拆分：25 例里住院占 80%，不能替死亡发言', () => {
  const s = compositeShares();
  assert.strictEqual(s.total, 25);
  assert.strictEqual(s.hosp, 80);
  assert.strictEqual(s.hosp + s.mi + s.death, 100);
  assert.match(BODY, /住院占 40 例|住院 20 例（80%）/);
});

test('时点衰减：8 周 1.8 → 24 周 0.9，只剩一半', () => {
  const d = decay();
  assert.strictEqual(d.kept, 0.5);
  assert.strictEqual(d.lost, 50);
});

test('结构五组齐：三层结局、三条件、三复合规则、三误用、六行检验表', () => {
  const j = auditStructure(A.sections);
  assert.doesNotThrow(() => verify(j, compositeShares(), decay()));
  assert.deepStrictEqual(j.layers, ['硬终点', '替代终点', '中间指标']);
  assert.strictEqual(j.conditions, 3);
  assert.strictEqual(j.compositeRules.length, 3);
  assert.strictEqual(j.misuses.length, 3);
  assert.strictEqual(j.testRows, 6);
});

test('替代终点第三条件在正文里写成「完全解释」', () => {
  const s2 = sectionOf(A.sections, '三个条件');
  assert.match(s2.text, /能被该指标的变化完全解释/);
  assert.match(s2.text, /第三条最严/);
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

test('脚本可运行，输出含现算 r² 与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /r²=0\.032/);
  assert.match(r.stdout, /住院 20（80%）/);
  assert.match(r.stdout, /不构成研究结论或临床建议/);
});
