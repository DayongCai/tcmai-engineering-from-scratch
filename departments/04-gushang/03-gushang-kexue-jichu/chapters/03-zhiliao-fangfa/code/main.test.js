'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, CONDITIONS, TOOLS, read, analyze } = require('./main.js');

const A = analyze(read());
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '03-zhiliao-fangfa', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 3);
  assert.strictEqual(TITLE, '治疗的次序比方法清单重要');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
});

test('规模与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2828);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.citeCount, 5);
});

test('手法三条件齐全，缺一不可', () => {
  assert.deepStrictEqual(A.missingConditions, []);
  assert.strictEqual(A.conditions.length, CONDITIONS.length);
  for (const c of A.conditions) assert.ok(c.at > 0 && c.hits >= 1, c.name);
});

test('固定五工具在正文里都出现过，且各自带着代价', () => {
  assert.deepStrictEqual(A.coldTools, []);
  assert.deepStrictEqual(A.tools.map((t) => t.name), TOOLS);
  // 小夹板讲观察、石膏讲剖开、牵引讲卧床、外固定架讲针道、内固定讲取出
  assert.ok(A.tools.find((t) => t.name === '牵引').hits > 1);
});

test('复位两层次与反复复位的三项代价都在正文里', () => {
  assert.deepStrictEqual(A.reductions, ['解剖复位', '功能复位']);
  assert.deepStrictEqual(A.redoCost, ['血运破坏', '软组织剥离', '骨不连']);
});

test('内治三期的次序与治法对应，且「固定的是骨折端」写着', () => {
  assert.ok(A.phaseOrdered, JSON.stringify(A.phases));
  assert.deepStrictEqual(A.phases.map((p) => p.phase), ['初期', '中期', '后期']);
  for (const p of A.phases) {
    assert.ok(p.ruleAt > p.phaseAt, `${p.phase} 的治法关键词应在该期之后出现`);
  }
  assert.ok(A.quiet, '正文没有写出动静结合的判据');
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不列方名、不给剂量/);
  assert.ok(out.includes('汉字 2828 字'));
  assert.ok(out.includes('三条齐全'));
});
