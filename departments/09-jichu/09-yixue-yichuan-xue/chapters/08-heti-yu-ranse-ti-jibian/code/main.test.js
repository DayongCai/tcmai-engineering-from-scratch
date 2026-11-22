'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, figures, missChance, cellsNeeded } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const FIG = figures(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '08-heti-yu-ranse-ti-jibian', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 8);
  assert.strictEqual(TITLE, '核型是一条「分辨率就是判据」的技术');
  assert.ok(TEXT.startsWith('# 第 8 章'), '正文首行不是本章章题');
});

test('结构量与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2778);
  assert.strictEqual(A.sections.length, 7);
  assert.strictEqual(A.tables, 2);
});

test('每节都有字，逐节相加不超过全篇', () => {
  for (const s of A.sections) assert.ok(s.hanzi > 0, s.title + ' 一节为空');
  const sum = A.sections.reduce((n, s) => n + s.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('每个算式的结果都能对上正文写下的同一个数', () => {
  assert.ok(FIG.length >= 3, '算式太少：' + FIG.length);
  for (const f of FIG) {
    assert.ok(f.ok, `${f.name}：算得 ${f.got}，正文写 ${f.token}`);
    assert.ok(TEXT.includes(f.token), `正文里找不到 ${f.token}（${f.name}）`);
  }
});

test('分辨率由基因组除以带数得到，条带越少刻度越粗', () => {
  assert.ok(missChance(20) > 0.3 && missChance(20) < 0.4, String(missChance(20)));
  const need = cellsNeeded();
  assert.ok(missChance(need) < 0.05, '所需细胞数当年的漏检率应低于 5%');
  assert.ok(missChance(need - 1) >= 0.05, '少算一个细胞时应仍高于 5%');
  assert.ok(need >= 55 && need <= 65, `所需细胞数应在六十附近，实得 ${need}`);
});

test('嵌合比例越低，需要计数的细胞越多', () => {
  assert.ok(cellsNeeded(0.05, 0.01) > cellsNeeded(0.05, 0.05), '1% 的嵌合要数更多细胞');
});

test('分辨率、命名与检测分层的关键表述在正文里都有对应', () => {
  for (const s of ['在常规显带下不可见', '不平衡配子', '臂间倒位', '先排除最可能的那一类']) {
    assert.ok(TEXT.includes(s), `正文里找不到「${s}」`);
  }
});


test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成核型判读/);
  assert.ok(out.includes('汉字 ' + A.hanzi + ' 字'), '输出里的汉字数与快照不一致');
});
