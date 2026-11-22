'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const A = analyze(read());

test('正文就在本章目录下，章号与标题与正文首行一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '02-j2', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 2);
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章 · ' + TITLE), '正文首行与章题不一致');
});

test('七步法表七行，每步都有产出物', () => {
  assert.strictEqual(A.steps.length, 7);
  assert.deepStrictEqual(A.steps.map((s) => s.step), ['①', '②', '③', '④', '⑤', '⑥', '⑦']);
  for (const s of A.steps) assert.ok(s.artifact && s.artifact.length > 0, s.step + ' 没有产出物');
});

test('八域学科数相加等于源骨架枝数 120', () => {
  assert.strictEqual(A.domains.length, 8);
  assert.strictEqual(A.subjectSum, 120);
  assert.strictEqual(A.srcBranches, A.subjectSum);
  assert.deepStrictEqual(A.domains.map((d) => d.subjects), [28, 20, 12, 10, 12, 10, 14, 14]);
});

test('须六项、根四条，语义分别是共祖与公理', () => {
  assert.strictEqual(A.xu.length, 6);
  assert.ok(A.xu.includes('象数阴阳') && A.xu.includes('恒动整体'), A.xu.join('·'));
  assert.strictEqual(A.roots.length, 4);
  assert.deepStrictEqual(A.roots.map((r) => r.id), ['G1', 'G2', 'G3', 'G4']);
});

test('spine 条数 = 公理数 × 域数，两端都可复算', () => {
  assert.strictEqual(A.spineSrc, A.roots.length * A.domains.length);
  assert.strictEqual(A.spineSrc, 32);
  assert.strictEqual(A.spineLocal, 36);
  assert.deepStrictEqual(A.edgeTypes, ['nourish', 'spine']);
});

test('枝数差额由两端相减得到，且正文选择不静默对齐', () => {
  assert.strictEqual(A.localBranches, 188);
  assert.strictEqual(A.branchGap, A.localBranches - A.srcBranches);
  assert.strictEqual(A.branchGap, 68);
  assert.strictEqual(A.noSilentAlign, true);
  assert.strictEqual(A.pendingBranches, 89);
});

test('学派归属的判据写在正文里：词频只作召回', () => {
  assert.strictEqual(A.freqRecallOnly, true);
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不涉及病证判断/);
  assert.ok(out.includes('合计 ' + A.subjectSum), '输出里的合计与现算不一致');
});
