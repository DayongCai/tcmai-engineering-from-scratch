'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC, CHAPTER, TITLE, read, cnToNum, sections, tables, tableBy, col,
  facts, costTiers, brokenRing, nonStandardizable, summary, bulletLines,
} = require('./main.js');

const TEXT = read();
const S = summary(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '05-e75', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 5);
  assert.strictEqual(TITLE, '考什么就学什么：选择题考不出会看病的人');
  assert.ok(TEXT.startsWith('# 第 5 章'));
});

test('四种考核形式的成本分档：两低一中一高，仅笔试可机读', () => {
  const t = tableBy(TEXT, '形式');
  assert.strictEqual(t.rows.length, 4);
  const c = costTiers(t);
  assert.deepStrictEqual(c.counts, { 低: 2, 中: 1, 高: 1 });
  assert.deepStrictEqual(c.machineReadable, ['笔试（选择、填空、简答）']);
  assert.match(TEXT, /学校会自然选择最便宜的那一种/);
});

test('病例题四条判据从正文取到', () => {
  assert.deepStrictEqual(S.caseRules, ['给阴性所见', '给干扰信息', '要求写处置，不只写证名', '评分点分级']);
  assert.strictEqual(S.caseRules.length, 4);
});

test('OSCE 可标准化五项、不可标准化三项', () => {
  const ns = nonStandardizable(TEXT);
  assert.deepStrictEqual(ns, ['脉象', '舌象的细微差别', '手法的「得气」感']);
  assert.strictEqual(ns.length, 3);
  assert.strictEqual(S.standardizable, 5);
  assert.match(TEXT, /OSCE 站考「结构与安全」，床边考「手感与判断」/);
});

test('形成性评价三条硬要求，不把代码块里的编号算进来', () => {
  assert.strictEqual(S.feedbackRules, 3);
  assert.strictEqual(bulletLines(facts(TEXT).sec4.body).length, 0);
});

test('质量闭环五环，最常断在第四环「反馈」', () => {
  const rings = facts(TEXT).rings;
  assert.deepStrictEqual(S.rings, ['培养方案', '课程实施', '考核', '反馈', '复核']);
  assert.deepStrictEqual(brokenRing(TEXT, rings), { no: 4, name: '反馈' });
  assert.strictEqual(S.ringEvidenceMissing, 0);
});

test('章节共六节，代价与边界单列', () => {
  const titles = sections(TEXT).map((s) => s.title);
  assert.strictEqual(titles.length, 6);
  assert.ok(titles[5].includes('代价与边界'));
  assert.ok(tables(TEXT).length >= 2);
});

test('脚本可运行，输出成本分档、断环与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /成本分档：高 1 \/ 中 1 \/ 低 2/);
  assert.match(out, /最常断的是第 4 环「反馈」/);
  assert.match(out, /形成性评价的硬要求 3 条/);
  assert.match(out, /不构成诊疗/);
  assert.ok(out.split('\n').every((l) => !/undefined|NaN/.test(l)), '输出里有未取到的字段');
});
