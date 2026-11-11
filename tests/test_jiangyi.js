/**
 * tests/test_jiangyi.js —— 讲义层（supplements/jiangyi）自身的门
 *
 * 讲义是本仓库原创的病理生理学学习材料（按 Banasik 8th ed. 目录结构），不属底本，
 * 但它一旦写坏，课程里 82 条「补充·hermes-病理生理学讲义·第N章·N.M」引文就全部失去依据。
 * 所以讲义层需要自己的门，而不是只靠「课程引文能找到」这一条间接约束。
 *
 * 核什么：
 *   1. 文件命名与单元号：U01…U15，每个文件对应一个单元，且单元号不重复
 *   2. 章号连续：全库章号从 1 开始、逐个 +1、不重不漏（不与路线图对表——路线图是计划，这里是实物）
 *   3. 每章必备部分：学习目标 / 关键术语表 / 本章小结 / 自测题
 *   4. 每章规模：正文 ≥1,200 汉字、节数 ≥8
 *   5. 每单元一个临床案例（HPP-Uxx-CASE-01）
 *   6. 指纹：jianguyi.json 记录的 sha256 必须与磁盘文件一致（防止「改了 md 没重跑索引」）
 *
 * 进度：53 章已写满，所以章数与单元数现在都是硬断言（没写满就判红）。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const SUP = path.join(ROOT, 'standards', 'binglishengli', 'supplements');
const DIR = path.join(SUP, 'jiangyi');
const INDEX = path.join(SUP, 'jiangyi.json');
const doc = () => JSON.parse(fs.readFileSync(INDEX, 'utf8'));
const nonWs = (s) => s.replace(/\s/g, '').length;
const hanzi = (s) => (String(s).match(/[\u4e00-\u9fff]/g) || []).length;

test('1. 单元文件命名与单元号唯一', () => {
  const files = fs.readdirSync(DIR).filter((f) => /^U\d\d-.+\.md$/.test(f)).sort();
  assert.ok(files.length >= 1, '一个单元文件都没有');
  const nos = files.map((f) => f.slice(0, 3));
  assert.deepStrictEqual([...new Set(nos)], nos, '单元号重复');
  assert.strictEqual(files.length, 15, `应有 15 个单元文件（U01…U15），实有 ${files.length}`);
  assert.deepStrictEqual(nos, Array.from({ length: 15 }, (_, i) => `U${String(i + 1).padStart(2, '0')}`), '单元号应为 U01…U15 连续');
  const idx = doc();
  assert.strictEqual(idx.units.length, files.length, '索引与磁盘文件数不一致（跑 python scripts/build_jiangyi_index.py）');
});

test('2. 章号连续、不重不漏', () => {
  const idx = doc();
  const nos = idx.chapters.map((c) => Number(c.no)).sort((a, b) => a - b);
  assert.ok(nos.length > 0, '索引里没有章');
  assert.strictEqual(new Set(nos).size, nos.length, `章号有重复：${nos.join(',')}`);
  assert.strictEqual(nos[0], 1, '章号应从 1 开始');
  for (let i = 1; i < nos.length; i++) {
    assert.strictEqual(nos[i], nos[i - 1] + 1, `章号不连续：${nos[i - 1]} → ${nos[i]}`);
  }
});

test('3. 每章必备部分齐（学习目标 / 关键术语表 / 本章小结 / 自测题）', () => {
  const bad = doc().chapters.filter((c) => (c.missingParts || []).length);
  assert.deepStrictEqual(bad.map((c) => `${c.no}:${c.missingParts.join('+')}`), [], '这些章缺必备部分');
});

test('4. 每章规模：正文 ≥1,200 汉字、节数 ≥8', () => {
  const bad = [];
  for (const c of doc().chapters) {
    if (c.hanzi < 1200) bad.push(`第${c.no}章 ${c.hanzi} 字`);
    if (c.secs.length < 8) bad.push(`第${c.no}章 ${c.secs.length} 节`);
  }
  assert.deepStrictEqual(bad, [], `规模不足：${bad.join('；')}`);
});

test('5. 每单元一个临床案例', () => {
  const bad = [];
  for (const u of doc().units) {
    const hay = fs.readFileSync(path.join(DIR, path.basename(u.file)), 'utf8');
    const want = `HPP-${u.unit}-CASE-01`;
    if (!hay.includes(want)) bad.push(`${u.unit} 缺 ${want}`);
  }
  assert.deepStrictEqual(bad, [], bad.join('；'));
});

test('6. 指纹：索引记录的 sha256 与磁盘一致', () => {
  for (const u of doc().units) {
    const p = path.join(ROOT, u.file);
    const sha = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
    assert.strictEqual(sha, u.sha256, `${u.unit} 的 md 改了但没重跑索引（python scripts/build_jiangyi_index.py）`);
  }
});

test('7. 进度（不判红，只报数）', () => {
  const idx = doc();
  const road = JSON.parse(fs.readFileSync(path.join(SUP, 'roadmap.json'), 'utf8'));
  const total = road.counts.chapters;
  const done = idx.counts.chapters;
  const secs = idx.counts.secs;
  assert.strictEqual(done, total, `讲义应写满 ${total} 章，实有 ${done} 章`);
  console.log(`  讲义进度：${done} / ${total} 章 · ${idx.counts.units} 个单元 · ${secs} 节 · ${idx.counts.hanzi.toLocaleString()} 汉字`);
  assert.ok(done <= total, `讲义章数 ${done} 超过路线图的 ${total}`);
  assert.ok(nonWs(JSON.stringify(idx)) > 0);
  assert.ok(hanzi(idx.book) > 0);
});
