'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, KINDS, PATHOLOGY, RESET_STEPS, SUCCESS, read, analyze } = require('./main.js');

const A = analyze(read());
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '07-tuowei', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 7);
  assert.strictEqual(TITLE, '脱位是关节的事，后果常在关节外');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
});

test('规模与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 3011);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.citeCount, 3);
});

test('分类五维与病理四层齐全', () => {
  assert.deepStrictEqual(A.kinds, KINDS);
  assert.deepStrictEqual(A.pathology, PATHOLOGY);
});

test('复位三步按松弛—牵引—顺路径排，次序递增', () => {
  assert.deepStrictEqual(A.steps.map((s) => s.step), RESET_STEPS);
  assert.ok(A.stepsOrdered, JSON.stringify(A.steps));
});

test('复位成功四条标准齐全，且纪律写着', () => {
  assert.deepStrictEqual(A.success, SUCCESS);
  assert.ok(A.twice, '缺「复位前后各查一次神经血管」');
  assert.ok(A.reImage, '缺「复位后必须复查影像」');
});

test('三个高频部位都配上了该查的神经', () => {
  assert.strictEqual(A.pairs.length, 3);
  for (const p of A.pairs) assert.ok(p.ok, `${p.site} 与 ${p.nerve} 没有配对`);
  // 膝关节脱位一节里必须同时出现腘动脉与腓总神经
  assert.ok(A.pairs[2].nerveAt > 0);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /以所在机构规范为准/);
  assert.ok(out.includes('汉字 3011 字'));
  assert.ok(out.includes('次序成立'));
});
