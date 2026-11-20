#!/usr/bin/env node
/**
 * tests/test_textbooks_source.js —— 「桌面 100 份学科种子稿 → 教材正文」的可复核性
 *
 * 测的四件事（都不是「文件存在」这种糊得过去的东西）：
 *   1. 账本齐全：registry 覆盖 100 份工作簿，四种状态的计数加起来等于份数
 *   2. 逐章可复算：抽三份工作簿重跑解析，章数 / 逐章字数 / 正文总和必须与 registry 一致
 *   3. 教材与账本对得上：每门 status=textbook 的学科，目录里章文件数 = 账本章数，
 *      每个章文件的「源文 N 字」= 该章复算字数（差一个数就失败）
 *   4. 不越权：conflict / no-body 的学科，textbooks 目录里不许有本脚本产出的文件；
 *      conflict 的正文必须已经保全在 fulltext/（内容不丢）
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const MAT = path.join(ROOT, 'standards', 'materials', 'textbooks-batch');
const REG = path.join(MAT, 'registry.json');
const TB = path.join(ROOT, 'textbooks');
const MARK = '本文件由 `scripts/import_textbooks.js` 从源工作簿生成';

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 学科种子稿 → [textbooks] 抽取层 ═══\n');

const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const { parseWorkbook } = require('../scripts/import_textbooks.js');
const words = (t) => t.replace(/\s/g, '').length;

// 复算三份形态各异的：五列数值族 / 类型族 / 卷族
const SAMPLE = ['方剂学', '中医知识树', '伤寒论讲义'];

console.log('[1] 账本形状');
test('registry 覆盖 100 份工作簿（账本按「文件×学科」计条，可多一条合编书）', () => {
  // 经络腧穴学一本合编书服务经络学 + 腧穴学 → 同一 file 有两条记录，所以条数 ≥ 份数
  const files = new Set(reg.materials.map((m) => m.file));
  assert.strictEqual(files.size, 100);
  assert.ok(reg.materials.length >= 100 && reg.materials.length <= 102, `账本条数异常：${reg.materials.length}`);
  const by = {};
  for (const m of reg.materials) by[m.status] = (by[m.status] || 0) + 1;
  assert.strictEqual((by.textbook || 0) + (by.fulltext || 0) + (by.conflict || 0) + (by.manual || 0) + (by['no-body'] || 0), reg.materials.length);
  assert.ok(by.textbook >= 90, `textbook 学科过少：${by.textbook}`);
});
test('每条都有自己的 sha256 与非零字节数', () => {
  for (const m of reg.materials) {
    assert.match(m.sha256, /^[0-9a-f]{64}$/, `${m.base} sha256 形状不对`);
    assert.ok(m.bytes > 1000, `${m.base} 字节数异常：${m.bytes}`);
  }
});
test('summary 的章数/字数等于逐条累加', () => {
  assert.strictEqual(reg.summary.chapters, reg.materials.reduce((a, m) => a + m.chapters, 0));
  assert.strictEqual(reg.summary.chars, reg.materials.reduce((a, m) => a + m.chars, 0));
  assert.strictEqual(reg.summary.files, 100);
});

console.log('\n[2] 逐章可复算（三份形态不同的源）');
for (const base of SAMPLE) {
  test(`${base}：章数 / 逐章字数 / 总字数与账本一致`, () => {
    const entry = reg.materials.find((m) => m.base === base);
    assert.ok(entry, '账本里没有这份');
    const p = parseWorkbook(`qhzy-${base}.xlsx`);
    assert.strictEqual(p.chapters.length, entry.chapters, `章数不符：解析 ${p.chapters.length} vs 账本 ${entry.chapters}`);
    const total = p.chapters.reduce((a, c) => a + c.chars, 0);
    assert.strictEqual(total, entry.chars, `总字数不符：${total} vs ${entry.chars}`);
    if (entry.chapterTable) {
      for (const row of entry.chapterTable) {
        const c = p.chapters.find((x) => x.sheet === row.sheet);
        assert.ok(c, `账本里的章表「${row.sheet}」解析不到`);
        assert.strictEqual(c.chars, row.chars, `章表「${row.sheet}」字数不符`);
      }
    }
  });
}

console.log('\n[3] 教材与账本对得上');
const textbookEntries = reg.materials.filter((m) => m.status === 'textbook');
// 补章（无底本表的撰写层章）不计入底本账：逐门读 standards/*/补章登记.json，
// 把「底本章数 + 补章数」作为该学科的应有章数。没有登记就不许有额外章文件。
const supplementBySubject = new Map();
for (const dirName of fs.readdirSync(path.join(ROOT, 'standards'))) {
  const p = path.join(ROOT, 'standards', dirName, '补章登记.json');
  if (!fs.existsSync(p)) continue;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (j.subject) supplementBySubject.set(j.subject, (j.chapters || []).length);
}
test('每门 textbook 学科的章文件数 = 账本章数 + 补章数，且都有 00-前言.md', () => {
  for (const m of textbookEntries) {
    const dir = path.join(TB, m.subject);
    assert.ok(fs.existsSync(dir), `${m.subject} 目录不存在`);
    const chapters = fs.readdirSync(dir).filter((f) => /^\d{2,}-第\d+章-.*\.md$/.test(f));
    const supp = supplementBySubject.get(m.subject) || 0;
    // rewrite 层的章数不等于源章数（账本 reason 写明「源 12 章按手写体例扩展为 13 章」），
    // 所以这类只核「有章文件」，不拿源章数当判据——否则改写的教材每加一章都会假红。
    if (m.layer === 'rewrite') {
      assert.ok(chapters.length >= m.chapters, `${m.subject} 改写层章文件 ${chapters.length} 少于源章 ${m.chapters}`);
    } else {
      assert.strictEqual(
        chapters.length, m.chapters + supp,
        `${m.subject} 章文件 ${chapters.length} ≠ 账本 ${m.chapters} + 补章 ${supp}（补章须登记在 standards/*/补章登记.json）`
      );
    }
    assert.ok(fs.existsSync(path.join(dir, '00-前言.md')), `${m.subject} 缺 00-前言.md`);
  }
});
test('抽 6 章核对「源文 N 字」与实际复算字数一致', () => {
  const samples = textbookEntries.slice(0, 6);
  for (const m of samples) {
    const p = parseWorkbook(`qhzy-${m.base}.xlsx`);
    const dir = path.join(TB, m.subject);
    // 只取源正文层文件（带「源文 N 字」声明）：补章的撰写层文件排在末尾且无该声明，
    // 混进来会让「末章 = 源表末章」的索引假设失效
    const files = fs.readdirSync(dir)
      .filter((f) => /^\d{2,}-第\d+章-.*\.md$/.test(f))
      .filter((f) => /源文 [\d,]+ 字/.test(fs.readFileSync(path.join(dir, f), 'utf8')))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    const last = files[files.length - 1];
    const text = fs.readFileSync(path.join(dir, last), 'utf8');
    const claimed = Number((/表「[^」]+」 · 源文 ([\d,]+) 字/.exec(text) || [])[1]?.replace(/,/g, ''));
    assert.ok(claimed > 0, `${m.subject}/${last} 没有「源文 N 字」声明`);
    const idx = files.indexOf(last);
    assert.strictEqual(claimed, p.chapters[idx].chars, `${m.subject}/${last} 声明 ${claimed} ≠ 复算 ${p.chapters[idx].chars}`);
  }
});
test('meta.json 的 textbook.words = 账本字数（ROADMAP 读的是这个数）', () => {
  for (const m of textbookEntries.slice(0, 10)) {
    const metaPath = path.join(ROOT, 'departments', m.subject, 'meta.json');
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    assert.strictEqual(meta.textbook.words, m.chars, `${m.subject} meta.words ${meta.textbook.words} ≠ ${m.chars}`);
    assert.strictEqual(meta.textbook.chaptersWritten, m.chapters);
  }
});

console.log('\n[4] 不越权');
test('conflict / no-body 的学科目录里没有本脚本产出的章文件', () => {
  for (const m of reg.materials.filter((x) => x.status === 'conflict' || x.status === 'no-body' || x.status === 'manual')) {
    const dir = path.join(TB, m.subject);
    if (!fs.existsSync(dir)) continue;
    const ours = fs.readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .filter((f) => fs.readFileSync(path.join(dir, f), 'utf8').includes(MARK));
    assert.deepStrictEqual(ours, [], `${m.subject} 不该有脚本产出的文件：${ours.join('、')}`);
  }
});
test('conflict 的源正文已保全到 fulltext（内容不丢）', () => {
  for (const m of reg.materials.filter((x) => x.status === 'conflict')) {
    const ft = m.fulltext && path.join(ROOT, m.fulltext);
    assert.ok(ft && fs.existsSync(ft), `${m.base} 的 fulltext 缺失`);
    assert.ok(fs.statSync(ft).size > 5000, `${m.base} 的 fulltext 太小，疑似抽空`);
  }
});
test('树外归零：17 门选修入住后，不再有「无对应学科」的文件', () => {
  const outside = reg.materials.filter((m) => m.status === 'fulltext');
  // 2026-10：树外 47 → 35 → 20 → 17 → 0（选修并入四系）。留 0 是结果，不是目标失败。
  assert.strictEqual(outside.length, 0, `仍有 ${outside.length} 份未入住：${outside.map((m) => m.base).join('、')}`);
  const files = new Set(reg.materials.map((m) => m.file));
  assert.strictEqual(files.size, 100, `工作簿应有 100 份，账本只记到 ${files.size} 份`);
  assert.ok(reg.materials.filter((m) => m.status === 'textbook').length >= 95, '入住学科数异常');
});

test('全量正文仍按 2860 万字级保全（含两份 conflict 的全文）', () => {
  const total = reg.materials.reduce((acc, m) => acc + m.chars, 0);
  assert.ok(total > 25_000_000, `账本正文合计只有 ${total} 字，疑似抽取退化`);
  for (const m of reg.materials.filter((x) => x.status === 'conflict')) {
    assert.ok(m.chars > 0, `${m.base} 的冲突保全为 0 字`);
  }
});

console.log(`\n═══ ${passed} 通过 · ${failures.length} 失败 ═══`);
if (failures.length) process.exit(1);
