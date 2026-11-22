'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, figures, firstDegree } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const FIG = figures(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '06-duo-jiyin-yuzhi-moxing', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 6);
  assert.strictEqual(TITLE, '多基因病不在某一条染色体上，在「易患性的分布」里');
  assert.ok(TEXT.startsWith('# 第 6 章'), '正文首行不是本章章题');
});

test('结构量与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2782);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tables, 1);
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

test('一级亲属风险始终高于人群频率，且倍数随罕见程度放大', () => {
  let prevRatio = 0;
  for (const p of [1 / 10, 1 / 100, 1 / 1000, 1 / 10000]) {
    const ratio = firstDegree(p) / p;
    assert.ok(ratio > 1, `p=${p} 时一级亲属应高于人群`);
    assert.ok(ratio > prevRatio, `p=${p} 时倍数应更大`);
    prevRatio = ratio;
  }
});

test('二级、三级亲属按一半与四分之一衰减，但不归零', () => {
  const f1 = firstDegree(1 / 1000);
  assert.ok(Math.abs(f1 / 2 - f1 * 0.5) < 1e-12);
  assert.ok(f1 / 4 > 0);
});

test('阈值模型与遗传度的关键表述在正文里都有对应', () => {
  for (const s of ['连续分布', '平方根', '遗传度不能用于个体归因', '人群分层与筛查策略设计']) {
    assert.ok(TEXT.includes(s), `正文里找不到「${s}」`);
  }
});


test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes('汉字 ' + A.hanzi + ' 字'), '输出里的汉字数与快照不一致');
});
