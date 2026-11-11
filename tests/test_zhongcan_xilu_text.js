#!/usr/bin/env node
/**
 * tests/test_zhongcan_xilu_text.js —— 《醫學衷中參西錄》底本与单元层的"不许改口"测试
 *
 * 这本书的正文是外源文字化本（笈成，底本声明河北人民 1977 年 2 版），一旦网页改版或解析改坏，
 * 534 个单元就会静默变样 —— 所以这里钉的是留档指纹与解析结果：
 *   sha256 / 字节数 / 五大類 / 篇条数 / 段数 / 汉字数 / 双栏一致 / 单元与底本逐条相等 / 参西轴可测。
 * 任何一个数变了都会红，逼人去看是"网页改版"还是"解析改坏"。
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'standards/zhongcan-xilu');
const BEN = JSON.parse(fs.readFileSync(path.join(DIR, '底本.json'), 'utf8'));
const UNI = JSON.parse(fs.readFileSync(path.join(DIR, 'units.json'), 'utf8'));

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};

// 含扩展区：t2s 会把罕见异体转成 Ext-A/B（藭→䓖、瞤→𥆧），只认基本区会静默少数
const hanzi = (s) => (s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]|[\u{20000}-\u{3ffff}]/gu) || [];
const entries = BEN.classes.flatMap((c) => c.pian.flatMap((p) => p.entries.map((e) => ({ ...e, cls: c.name, pian: p.name }))));

console.log('\n醫學衷中參西錄 底本\n');

test('留档 sha256 与产物登记一致（网页改版即失效）', () => {
  const buf = fs.readFileSync(path.join(DIR, 'sources/source.html'));
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  assert.strictEqual(sha, BEN.source.sha256, 'source.html 的 sha256 与底本.json 登记不符');
  assert.strictEqual(buf.length, BEN.source.bytes, '字节数不符');
});

test('来源与底本声明写全（外源不得标底本）', () => {
  assert.strictEqual(BEN.source.provider, 'jicheng');
  assert.ok(/河北人民出版社1977年2版/.test(BEN.source.edition), '底本声明缺失');
  assert.ok(/jicheng\.tw/.test(BEN.source.url), 'URL 缺失');
  assert.ok(/1977/.test(fs.readFileSync(path.join(DIR, 'README.md'), 'utf8')), 'README 必须记底本与版本');
});

test('规模：5 大类 · 265 篇 · 534 单元 · 4,346 段 · 459,728 汉字（含扩展区）', () => {
  assert.strictEqual(BEN.counts.classes, 5);
  assert.strictEqual(BEN.counts.pian, 265);
  assert.strictEqual(BEN.counts.entries, 534);
  assert.strictEqual(BEN.counts.paras, 4346);
  assert.strictEqual(BEN.counts.charsHant, 459728);
});

test('五大類就是书自己的分部：醫方/藥物/醫論/醫話/醫案', () => {
  assert.deepStrictEqual(BEN.classes.map((c) => c.name.replace(/^[一二三四五六七八九十]+、/, '')),
    ['醫方', '藥物', '醫論', '醫話', '醫案']);
});

test('繁简双栏逐条字数一致（t2s 只动字形）', () => {
  let bad = [];
  for (const e of entries) {
    const a = hanzi(e.zhHant).length;
    const b = hanzi(e.zhHans).length;
    if (a !== b) bad.push(`${e.name}: ${a} vs ${b}`);
  }
  assert.deepStrictEqual(bad.slice(0, 3), [], `双栏字数不一致 ${bad.length} 条`);
});

test('单元层与底本逐条相等（534 条，字字对读）', () => {
  assert.strictEqual(UNI.counts.units, 534);
  assert.strictEqual(UNI.counts.chapters, 265);
  assert.strictEqual(UNI.counts.hanzi, BEN.counts.charsHant);
  const byLoc = new Map();
  for (const e of entries) byLoc.set(e.zhHans, e.nameSimp);
  let missing = 0;
  for (const u of UNI.units) {
    if (!byLoc.has(u.body)) missing += 1;
  }
  assert.strictEqual(missing, 0, `${missing} 个单元的正文在底本里找不到逐字对应`);
});

test('「参西」轴可测：赭石解 / 一味铁养汤 / 论脑充血都是参西密集条目', () => {
  const pick = (kw) => UNI.units.find((u) => u.title.includes(kw));
  for (const kw of ['赭石解', '一味铁养汤', '论脑充血']) {
    const u = pick(kw);
    assert.ok(u, `找不到条目 ${kw}`);
    assert.ok(u.measure.views['参西'] >= 8, `${kw} 的参西命中只有 ${u.measure.views['参西']}，口径可能被改坏`);
  }
  const total = UNI.units.reduce((s, u) => s + u.measure.views['参西'], 0);
  assert.ok(total > 500, `全书参西命中 ${total}，低于 500 说明成员词表被削弱`);
});

test('五大類都有单元（分部不空）', () => {
  const cls = new Set(UNI.units.map((u) => u.sec));
  assert.strictEqual(cls.size, 5, `实际只有 ${[...cls].join('、')}`);
  assert.deepStrictEqual(UNI.triaxis.byPrimaryLevel,
    { 医方: 176, 药物: 84, 医论: 90, 医话: 47, 医案: 137 });
});

if (failures.length) {
  console.log(`\n  ${passed} 通过 · ${failures.length} 失败\n`);
  process.exit(1);
}
console.log(`\n  ${passed} 通过 · 0 失败\n\n✅ 醫學衷中參西錄 底本通过\n`);
