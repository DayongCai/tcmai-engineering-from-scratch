'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, DIMENSIONS, STAGES, ROLES, DIGITAL, LAYERS, RX, read, analyze } = require('./main.js');

const A = analyze(read());
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '10-kangfu-shuzihua', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 10);
  assert.strictEqual(TITLE, '康复不是治疗之后，是治疗的一部分');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
});

test('规模与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 3103);
  assert.strictEqual(A.sections.length, 7);
  assert.strictEqual(A.citeCount, 4);
});

test('六个功能维度齐全，且写着「没有基线就没有进步」', () => {
  assert.deepStrictEqual(A.dimensions, DIMENSIONS);
  assert.ok(A.baseline, '缺基线判据');
});

test('康复三期按制动—活动—负重排，且与愈合同步', () => {
  assert.deepStrictEqual(A.stages.map((s) => s.key), STAGES);
  assert.ok(A.stagesOrdered, JSON.stringify(A.stages));
  assert.ok(A.syncHealing, '缺「与愈合同步，而不是与日历同步」');
});

test('五方角色与数字化五方向齐全', () => {
  assert.deepStrictEqual(A.roles, ROLES);
  assert.deepStrictEqual(A.digital, DIGITAL);
});

test('评价三层各自有判据，处方五要素齐全', () => {
  assert.strictEqual(A.layers.length, LAYERS.length);
  for (const l of A.layers) assert.ok(l.ok, l.name + ' 缺判据 ' + l.mark);
  assert.deepStrictEqual(A.rx, RX);
});

test('贯穿三期的原则与随访的地位都写着', () => {
  assert.ok(A.fixedNotLimb, '缺「固定的是骨折端，不是整条肢体」');
  assert.ok(A.followupBias, '缺「失访是最大的偏倚来源」');
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /以所在机构规范与治疗师评定为准/);
  assert.ok(out.includes('汉字 3103 字'));
  assert.ok(out.includes('处方五要素'));
});
