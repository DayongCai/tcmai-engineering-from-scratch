'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, MECHANISMS, PATHO, STAGES, STEPS, read, analyze } = require('./main.js');

const A = analyze(read());
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '08-jinshang', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 8);
  assert.strictEqual(TITLE, '筋伤的病人大多不需要手术，但都需要诊断');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
});

test('规模与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2957);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.citeCount, 3);
});

test('机制六类与病机四线齐全', () => {
  assert.deepStrictEqual(A.mechanisms, MECHANISMS);
  assert.deepStrictEqual(A.patho, PATHO);
});

test('三期按急性—亚急性—慢性排（按加粗定位，避开病机段的散见）', () => {
  assert.deepStrictEqual(A.stages.map((s) => s.key), STAGES);
  assert.ok(A.stagesOrdered, JSON.stringify(A.stages));
});

test('诊断四步按问—查—试—影像排，次序递增', () => {
  assert.deepStrictEqual(A.steps.map((s) => s.key), STEPS);
  assert.ok(A.stepsOrdered, JSON.stringify(A.steps));
});

test('红旗征七条、马尾急症、脊髓型禁忌、影像边界都写着', () => {
  assert.strictEqual(A.redFlags.length, 7, A.redFlags.join('、'));
  assert.ok(A.caudaEmergency, '缺「马尾综合征是急症」');
  assert.ok(A.cordContra, '缺「手法的绝对禁忌」');
  assert.ok(A.imagingLimit, '缺影像只能解释与查体一致的部分');
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /以所在机构规范为准/);
  assert.ok(out.includes('汉字 2957 字'));
  assert.ok(out.includes('机制六类'));
});
