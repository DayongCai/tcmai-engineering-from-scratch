#!/usr/bin/env node
/**
 * tests/test_neijing_text.js —— 《内经选读》底本的指纹门
 *
 * 这一课长期是「有课程、无底本」（kt-sphere 里 units=0 / std=""）。底本落库后，
 * 这里钉五件事，任何一件变了都说明产物与工作簿脱钩：
 *   1. sha256 与底本.json 记录一致（工作簿被替换过就会红）；
 *   2. 规模：31 篇类 · 162 篇 · 1,728 原文段 · 168 篇注释 · 136,032 汉字；
 *   3. 素问 81 / 灵枢 81，篇号 1..81 各一次（缺号、重号都是切错了）；
 *   4. 单元正文 = 该篇原文段按序拼接（逐篇对读，不是抽样）；
 *   5. 三轴可测且成员词公开；正文里不许混进教材注释。
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'standards/neijing-xuandu');
const BEN = JSON.parse(fs.readFileSync(path.join(DIR, '底本.json'), 'utf8'));
const U = JSON.parse(fs.readFileSync(path.join(DIR, 'units.json'), 'utf8'));

const HANZI = /\p{Script=Han}/gu;  // 与 build_neijing_text.py 的 unicodedata 判定同口径（含扩展区）
const count = (s) => (s.match(HANZI) || []).length;

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};

console.log('\n内经选读 底本\n');

test('sha256 与母本一致（留档副本也算）', () => {
  const sha = crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, 'sources', 'qhzy-黄帝内经(通读注释版).xlsx'))).digest('hex');
  assert.strictEqual(sha, BEN.source.sha256, '留档副本与底本.json 记录的 sha256 不符');
  assert.ok(BEN.source.bytes > 100000, `母本只有 ${BEN.source.bytes} B，太小`);
});

test('规模：31 篇类 · 162 篇 · 1,728 段 · 168 注 · 136,032 字', () => {
  const c = BEN.counts;
  assert.strictEqual(c.classes, 31);
  assert.strictEqual(c.pians, 162);
  assert.strictEqual(c.paras, 1728);
  assert.strictEqual(c.notes, 168);
  assert.strictEqual(c.units, 162);
  assert.strictEqual(c.hanzi, 136032);
});

test('素问 81 篇 + 灵枢 81 篇，篇号 1..81 各一次', () => {
  const c = BEN.counts;
  assert.deepStrictEqual(c.byBook.素问, { pians: 81, hanzi: 74749 });
  assert.deepStrictEqual(c.byBook.灵枢, { pians: 81, hanzi: 61283 });
  for (const book of ['素问', '灵枢']) {
    const nos = U.units.filter((u) => u.sec === book).map((u) => Number(u.sub)).sort((a, b) => a - b);
    assert.strictEqual(nos.length, 81, `${book} 只有 ${nos.length} 篇`);
    assert.deepStrictEqual(nos, Array.from({ length: 81 }, (_, i) => i + 1), `${book} 篇号不连续或不唯一`);
  }
});

test('单元正文 = 原文段按序拼接（162 篇逐篇对读）', () => {
  const bad = [];
  for (const u of U.units) {
    const joined = u.paras.map((p) => p.text).join('\n');
    if (u.body !== joined) bad.push(`${u.locator}: 正文与段落拼接不一致`);
    if (u.body !== u.rawBody) bad.push(`${u.locator}: body ≠ rawBody`);
    if (count(u.body) !== u.hanzi) bad.push(`${u.locator}: hanzi ${u.hanzi} ≠ 实测 ${count(u.body)}`);
    if (!u.body.trim()) bad.push(`${u.locator}: 正文为空`);
  }
  assert.strictEqual(bad.length, 0, bad.slice(0, 3).join(' | '));
});

test('教材注释与通读不进正文（否则字数会把按语算成原文）', () => {
  const bad = [];
  for (const u of U.units) {
    for (const n of u.notes) {
      const frag = n.text.slice(0, 12);
      if (frag && u.body.includes(frag)) bad.push(`${u.locator}: 注释混进正文（${frag}）`);
    }
  }
  assert.strictEqual(bad.length, 0, bad.slice(0, 3).join(' | '));
  assert.ok(BEN.counts.hanziNotes > 0 && BEN.counts.hanziTongdu > 0, '注释/通读应当非空');
});

test('三轴可测，成员词公开', () => {
  const axes = BEN.axes.map((a) => a.name).sort();
  assert.deepStrictEqual(axes, ['五行', '养生', '治则', '经络', '藏象', '病机', '运气', '阴阳'].sort());
  for (const a of BEN.axes) {
    assert.ok(a.members.length >= 2, `${a.name} 成员词太少`);
    const total = U.units.reduce((n, u) => n + u.measure.views[a.name], 0);
    assert.strictEqual(total, BEN.counts.axisTotals[a.name], `${a.name} 合计与各单元之和不符`);
  }
  assert.ok(BEN.counts.axisTotals.阴阳 > 300, '阴阳轴偏低，可能又把成员词数成真名了');
  assert.ok(BEN.counts.axisTotals.五行 < 100, '五行轴过高：单字「木火土金水」会把轴撑爆');
});

test('引用格式：教材·素问·篇名（素问第N篇），不得写成影印本页码', () => {
  const md = fs.readFileSync(path.join(DIR, 'README.md'), 'utf8');
  assert.ok(/教材·素问·/.test(md), 'README 未给出引用格式');
  assert.ok(!/影印本第\s*\d+\s*页/.test(md), 'README 把教材整理本写成了影印本');
  for (const u of U.units) {
    assert.ok(/^黄帝内经·(素问|灵枢)·.+（(素问|灵枢)第[0-9]+篇）$/.test(u.locator), `locator 不合口径：${u.locator}`);
  }
});

if (failures.length) {
  console.log(`\n  ${passed} 通过 · ${failures.length} 失败\n`);
  process.exit(1);
}
console.log(`\n  ${passed} 通过 · 0 失败\n\n✅ 内经选读底本通过\n`);
