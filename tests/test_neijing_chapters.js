#!/usr/bin/env node
/**
 * tests/test_neijing_chapters.js —— 内经选读 10 章是否真的接上了底本
 *
 * 底本入库 ≠ 课程用上底本。这里钉四件事：
 *   1. 每章都有「底本对读」块 + code/neijing.js + code/neijing.test.js；
 *   2. chapter-map.json 的每个数字都能从两份语料（教材选读本 / 全文）重算出来；
 *   3. docs 的引文行一条都不许落空（落空＝标错篇名或改了字）；
 *   4. 每篇都能回指「教材·书名·篇名（第N篇）」级定位。
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments/01-zhongyi/06-neijing-xuandu');
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/neijing-xuandu/chapter-map.json'), 'utf8'));
const XUANDU = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/neijing-xuandu/units.json'), 'utf8'));
const FULL = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/materials/neijing-quanwen/content.json'), 'utf8'));

const FOLD = { '遊': '游', '於': '于', '穀': '谷', '欬': '咳', '徧': '遍', '臟': '藏' };
const han = (s) => [...norm(s)].length;  // 按码点计数：扩展 B 区在 UTF-16 里占两个单元，用 .length 会多算
const norm = (s) => (s || '').replace(/[^\u3400-\u4dbf\u4e00-\u9fff\u{20000}-\u{3FFFF}]/gu, '').replace(/[遊於穀欬徧臟]/g, (c) => FOLD[c]);  // 与 wire_neijing_chapters.py 同口径

const xuandu = new Map(XUANDU.units.map((u) => [u.title, u]));
const full = new Map(FULL.sections.map((s) => [s.title.split('·').pop(), s.blocks.filter((b) => b.type === '原文').map((b) => b.text).join('')]));
const alias = MAP.alias || {};

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};

const read = (slug, f) => fs.readFileSync(path.join(SUBJ, 'chapters', slug, f), 'utf8');

console.log('\n内经选读 10 章 × 底本\n');

test('10 章：docs 有「底本对读」块，code 有 neijing.js / neijing.test.js', () => {
  assert.strictEqual(MAP.chapters.length, 10);
  for (const c of MAP.chapters) {
    const md = read(c.slug, 'docs/zh.md');
    assert.ok(md.includes('<!-- neijing:begin -->') && md.includes('## 底本对读'), `${c.slug} 缺底本对读块`);
    for (const f of ['code/neijing.js', 'code/neijing.test.js']) {
      assert.ok(fs.existsSync(path.join(SUBJ, 'chapters', c.slug, f)), `${c.slug} 缺 ${f}`);
    }
  }
});

test('每个篇目都能在教材本找到，且字数与 units.json 一致', () => {
  for (const c of MAP.chapters) {
    for (const p of c.pians) {
      const u = xuandu.get(p.title);
      assert.ok(u, `${c.slug}: 教材本没有篇「${p.title}」`);
      assert.strictEqual(p.xuanduHanzi, han(u.body), `${c.slug}/${p.title} 教材本字数对不上`);
      assert.strictEqual(p.locator, u.locator, `${c.slug}/${p.title} locator 与底本不一致`);
      assert.ok(/^黄帝内经·(素问|灵枢)·.+（(素问|灵枢)第[0-9]+篇）$/.test(p.locator), p.locator);
    }
  }
});

test('全文字数可重算（教材本 ↔ 全文 靠 alias 对上）', () => {
  for (const c of MAP.chapters) {
    let sumX = 0; let sumF = 0;
    for (const p of c.pians) {
      sumX += p.xuanduHanzi;
      const fname = p.fullTitle || alias[p.title] || p.title;
      const body = full.get(fname) || '';
      assert.ok(body, `${c.slug}/${p.title} 在全文里找不到（alias 表可能要补）`);
      assert.strictEqual(han(body), p.fullHanzi, `${c.slug}/${p.title} 全文字数对不上`);
      sumF += p.fullHanzi;
    }
    assert.strictEqual(c.totals.xuanduHanzi, sumX, `${c.slug} 教材本合计`);
    assert.strictEqual(c.totals.fullHanzi, sumF, `${c.slug} 全文合计`);
    assert.strictEqual(c.totals.excerpt, c.pians.filter((p) => p.edition === 'excerpt').length, `${c.slug} 节选篇数`);
  }
});

test('docs 的引文一条都不落空（落空＝标错篇名或改了字）', () => {
  const bad = [];
  for (const c of MAP.chapters) {
    for (const m of c.quotes.missing) bad.push(`${c.slug} 《${m.pian}》「${m.preview}」`);
  }
  assert.strictEqual(bad.length, 0, `未命中：\n      ${bad.join('\n      ')}`);
  const total = MAP.chapters.reduce((n, c) => n + c.quotes.lines, 0);
  const hit = MAP.chapters.reduce((n, c) => n + c.quotes.hitFull, 0);
  assert.ok(total >= 20, `只核到 ${total} 条引文，太少`);
  assert.strictEqual(hit, total, `命中 ${hit}/${total}`);
});

test('docs 引文条数与 chapter-map.json 一致（两处不许各说各话）', () => {
  for (const c of MAP.chapters) {
    const md = read(c.slug, 'docs/zh.md');
    const quoted = (md.match(/^>\s*(?:\*\*MOTTO:\*\*\s*)?.+?——《(?:素问|灵枢)·[^》]+》/gm) || []).length;
    assert.strictEqual(quoted, c.quotes.lines, `${c.slug}: docs 引文 ${quoted} 条 ≠ map ${c.quotes.lines} 条`);
    const block = md.slice(md.indexOf('<!-- neijing:begin -->'), md.indexOf('<!-- neijing:end -->'));
    assert.ok(block.includes(`全文篇内逐字命中 ${c.quotes.hitFull} 条`), `${c.slug}: 块内命中数与 map 不一致`);
  }
});

test('两份语料本身没被改坏（162 篇 / 155,206 字 · 136,032 字）', () => {
  assert.strictEqual(XUANDU.units.length, 162);
  assert.strictEqual(XUANDU.counts.hanzi, 136032);
  assert.strictEqual(FULL.sections.length, 162);
  const fullHanzi = [...full.values()].reduce((n, b) => n + han(b), 0);
  assert.strictEqual(fullHanzi, 155206, `全文字数 ${fullHanzi}`);
});

if (failures.length) {
  console.log(`\n  ${passed} 通过 · ${failures.length} 失败\n`);
  process.exit(1);
}
console.log(`\n  ${passed} 通过 · 0 失败\n\n✅ 内经选读 10 章已接上底本\n`);
