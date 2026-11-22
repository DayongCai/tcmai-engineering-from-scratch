'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, DISPLACEMENT, HEALING, UNION, read, analyze } = require('./main.js');

const A = analyze(read());
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '05-guzhe-yi', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 5);
  assert.strictEqual(TITLE, '上肢骨折的难点不在接骨，在功能');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
});

test('规模与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2920);
  assert.strictEqual(A.sections.length, 5);
  assert.strictEqual(A.citeCount, 2);
});

test('移位五项与临床愈合五条都齐全', () => {
  assert.deepStrictEqual(A.displacement, DISPLACEMENT);
  assert.deepStrictEqual(A.union, UNION);
});

test('愈合三段按血肿—骨痂—塑形排，次序不反', () => {
  assert.strictEqual(A.healing.length, HEALING.length);
  assert.ok(A.healingOrdered, JSON.stringify(A.healing));
  assert.deepStrictEqual(A.healing.map((h) => h.key), ['血肿炎症期', '原始骨痂形成期', '骨痂改造塑形期']);
});

test('孟氏与盖氏两个组合都写到，且关键词与脱位部位对应', () => {
  assert.strictEqual(A.combos.length, 2);
  for (const c of A.combos) {
    assert.ok(c.at > 0, c.name + ' 未在正文出现');
    assert.ok(c.ok, c.name + ' 缺关键词 ' + c.keyword);
  }
  // 孟氏在盖氏之前
  assert.ok(A.combos[0].at < A.combos[1].at);
});

test('功能判据写着：复位成功不等于治疗成功，目标是手能到该到的地方', () => {
  assert.ok(A.functionalGoal, '缺「复位成功了，治疗失败了」');
  assert.ok(A.handReach, '缺「手能不能到该到的地方」');
  assert.ok(A.rotationJoke, '缺旋转的床边判法（指甲是否共面）');
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /以所在机构规范为准/);
  assert.ok(out.includes('汉字 2920 字'));
  assert.ok(out.includes('次序成立'));
});
