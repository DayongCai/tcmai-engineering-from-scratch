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
  assert.ok(DOC.endsWith(path.join('chapters', '05-j5', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 5);
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章 · ' + TITLE), '正文首行与章题不一致');
});

test('等价类与成员数来自规模表，简繁英三种写法相加等于成员总数', () => {
  assert.strictEqual(A.classes, 117);
  assert.strictEqual(A.members, 251);
  assert.deepStrictEqual(A.langs, [137, 61, 53]);
  assert.strictEqual(A.langSum, A.members);
});

test('平均每类写法由成员数除等价类数得到，与正文口径一致', () => {
  assert.strictEqual(Number(A.avgComputed.toFixed(2)), A.avgStated);
  assert.ok(A.avgComputed > 2 && A.avgComputed < 2.2, String(A.avgComputed));
});

test('等价强度三级之和等于成员总数，A 级占九成五以上', () => {
  assert.deepStrictEqual(A.strength.map((s) => s.level), ['A', 'B', 'C']);
  assert.deepStrictEqual(A.strength.map((s) => s.count), [239, 8, 4]);
  assert.strictEqual(A.strengthSum, A.members);
  assert.ok(A.aShare > 0.95, String(A.aShare));
});

test('覆盖漏斗每一档的百分比都能由分子分母复算出来', () => {
  assert.deepStrictEqual(A.funnel.map((f) => f.count), [117, 41, 19, 15, 66]);
  for (const f of A.funnel) {
    if (!f.pct) continue;
    const mine = ((f.count / A.classes) * 100).toFixed(1);
    assert.strictEqual(mine, f.pct, `${f.count} 类：现算 ${mine} vs 正文 ${f.pct}`);
  }
});

test('四种「不同写法」各占一类，不得混成一类', () => {
  assert.deepStrictEqual(A.relations, ['synonym', 'composition', 'qualified', 'broader']);
});

test('文献核对：硬命中率由 75+1 除以 97 得到', () => {
  assert.strictEqual(A.checked, 97);
  assert.strictEqual(A.lit.specific, 75);
  assert.strictEqual(A.lit.viaSynonymAlias, 1);
  assert.strictEqual(A.hardHits, A.lit.specific + A.lit.viaSynonymAlias);
  assert.strictEqual(Number((A.hardRate * 100).toFixed(1)), 78.4);
});

test('四条纪律都在正文里：近邻不适用、别名须字面出现、合称整条正名为空、离线标未能核实', () => {
  assert.strictEqual(A.noVectorNeighborMerge, true);
  assert.strictEqual(A.aliasMustAppear, true);
  assert.strictEqual(A.wholeNameEmpty, true);
  assert.strictEqual(A.unverifiedMark, true);
});

test('脚本可运行，输出带现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成诊疗建议/);
  assert.ok(out.includes('等价类 ' + A.classes + ' 个'), '输出里的等价类数与现算不一致');
});
