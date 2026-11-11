#!/usr/bin/env node
/**
 * tests/test_jingui_gushiwen.js —— 古诗文网本（第二见证）留档与校勘的自检
 *
 * 为什么单独一道：`scripts/build_jingui_gushiwen.py --check` 只在 npm run check 里跑，
 * 而「留档被谁改了一个字」这种事故，最可能发生在重建 JSON 的那一步（本脚本正是那次重建的产物）。
 * 这里只读 standards/jingui/gushiwen/，不联网：
 *   1. raw/ 里 26 个文件（目录页 + 25 篇）都在，且每篇登记的 sha256 与磁盘一致；
 *   2. 篇数 25、卷 3、段落数与字数与 JSON 自述一致，且与「底本」互校表行数一致；
 *   3. 校勘.md 存在且字数与 JSON 一致（防「表里两套数」）；
 *   4. 与笈成本的差异是**被登记过的**：每篇都有一行对照（不静默丢篇）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'standards', 'jingui', 'gushiwen');
const J = JSON.parse(fs.readFileSync(path.join(DIR, 'gushiwen.json'), 'utf8'));

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

console.log('\n金匮要略 · 古诗文网本（第二见证）\n');

test('目录页 + 25 篇，共 26 个留档文件', () => {
  const raws = fs.readdirSync(path.join(DIR, 'raw')).sort();
  assert.strictEqual(raws.length, 26, `raw/ 实为 ${raws.length} 个文件`);
  assert.ok(raws.includes('index.html'), '缺目录页 index.html');
  assert.strictEqual(J.pian.length, 25);
});

test('每篇 sha256 与磁盘一致（改版或手改都会被抓住）', () => {
  const bad = [];
  for (const p of J.pian) {
    const f = path.join(DIR, p.rawFile);
    if (!fs.existsSync(f)) { bad.push(`${p.no} 缺 ${p.rawFile}`); continue; }
    if (sha(f) !== p.rawSha256) bad.push(`${p.no} ${p.rawFile} sha256 不符`);
  }
  assert.deepStrictEqual(bad, [], bad.join('; '));
  assert.strictEqual(sha(path.join(DIR, 'raw', 'index.html')), J.source.indexSha256, '目录页 sha256 不符');
});

test('篇 / 卷 / 段 / 字 与实际解析一致', () => {
  assert.strictEqual(J.counts.pian, 25);
  assert.strictEqual(J.counts.juan, 3);
  assert.strictEqual(new Set(J.pian.map((p) => p.juan)).size, 3, '卷不是 上/中/下');
  const sumPara = J.pian.reduce((n, p) => n + p.paraCount, 0);
  const sumChar = J.pian.reduce((n, p) => n + p.chars, 0);
  assert.strictEqual(J.counts.paras, sumPara, '段落合计不符');
  assert.strictEqual(J.counts.chars, sumChar, '字数合计不符');
  // 与 standards/jingui/README.md §七 自述的两个数对齐（改了就要一起改）
  assert.strictEqual(J.counts.chars, 29929, '字数应为 29,929');
  assert.strictEqual(J.counts.paras, 1282, '段落应为 1,282');
});

test('每篇都有与笈成本的对照行（不许静默丢篇）', () => {
  assert.strictEqual(J.crossCheck.length, 25);
  const missing = J.crossCheck.filter((r) => !r.benchTitle || r.benchChars == null);
  assert.deepStrictEqual(missing, [], `缺对照：${missing.map((r) => r.no).join(',')}`);
  const noBenchTitle = J.crossCheck.filter((r) => !r.gushiwenTitle);
  assert.deepStrictEqual(noBenchTitle, [], '缺古诗文网篇名');
});

test('校勘.md 的字数与 JSON 同源', () => {
  const md = fs.readFileSync(path.join(DIR, '校勘.md'), 'utf8');
  assert.ok(md.includes(`古诗文网本 ${J.counts.chars} 字`), '校勘.md 字数与 JSON 不一致');
  assert.ok(md.includes(`| 篇 | ${J.counts.pian} |`) || md.includes('| 篇 | 25 |'), '校勘.md 缺篇数行');
});

test('附篇三篇（23-25）在笈成本里是「整篇 1 条」，差异必须写在对照表里', () => {
  const tail = J.crossCheck.filter((r) => r.no >= 23);
  assert.strictEqual(tail.length, 3);
  for (const r of tail) {
    assert.strictEqual(r.benchArticles, 1, `第 ${r.no} 篇笈成本条数应为 1`);
    assert.ok(r.gushiwenPara > 20, `第 ${r.no} 篇古诗文网本段落应远多于 1`);
  }
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) { for (const f of failures) console.error(`  · ${f[0]}: ${f[1]}`); process.exit(1); }
