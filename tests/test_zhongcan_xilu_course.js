#!/usr/bin/env node
/**
 * tests/test_zhongcan_xilu_course.js —— 汇通期《医学衷中参西录选读》10 章的「引文不许编」门
 *
 * 与 test_wenbing_chapters.js 同构，三条本书特有约束：
 *   1. 本书在本仓库**没有教材底本**，原文全部来自外源文字化本 —— 每章必须标「外源·笈成」，
 *      且不得出现「底本第 N 条」（那是把外源冒充底本）；
 *   2. 「参西」是 1909 年的解释层（化合/脑筋/血管），章里必须与辨证判定分开写，
 *      不得把它当病理学结论；
 *   3. 剂量是清末衡制（两/钱/分/枚），章里不得换算成克 —— 一换就成了伪精确。
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments/01-zhongyi/23-zhongcan-xilu-xuandu');
const U = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/zhongcan-xilu/units.json'), 'utf8'));
const CURR = JSON.parse(fs.readFileSync(path.join(ROOT, 'curriculum.json'), 'utf8'));

// 折叠：空白 + 标点不参与比对（原文按句读切分，引文允许截断）
const norm = (s) => s.replace(/[\s，。；：、？！…「」『』（）()《》〈〉\-—·＝=*`/＋+→]/g, '');
const POOL = norm(U.units.map((u) => u.body).join(''));

const chapters = JSON.parse(fs.readFileSync(path.join(SUBJ, 'chapters.json'), 'utf8')).chapters;
const baseName = (slug) => slug.replace(/^\d+-/, '');
const read = (slug, f) => fs.readFileSync(path.join(SUBJ, 'chapters', slug, f), 'utf8');

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};

console.log('\n医学衷中参西录选读 10 章\n');

test('10 章目录齐，每章 6 个文件齐', () => {
  assert.strictEqual(chapters.length, 10);
  for (const c of chapters) {
    const dir = path.join(SUBJ, 'chapters', c.slug);
    assert.ok(fs.existsSync(dir), `缺章节目录 ${c.slug}`);
    for (const f of ['docs/zh.md', 'code/main.js', 'code/main.test.js', 'quiz.json',
      `outputs/prompt-${baseName(c.slug)}.md`, `outputs/skill-${baseName(c.slug)}.md`]) {
      assert.ok(fs.existsSync(path.join(dir, f)), `${c.slug} 缺 ${f}`);
    }
  }
});

test('引文保真：每处引证行（「…」——《医学衷中参西录·…》）都能在 534 单元里逐字找到', () => {
  const bad = [];
  let checked = 0;
  for (const c of chapters) {
    const md = read(c.slug, 'docs/zh.md');
    // 只核「引证行」：行尾给出《书名·篇·条》的才是原文引用；正文里「」夹的是强调语，不算引文
    for (const m of md.matchAll(/^> 「([^」]{6,})」——《医学衷中参西录·/gm)) {
      const q = norm(m[1]);
      if (q.length < 6) continue;
      checked += 1;
      if (!POOL.includes(q)) bad.push(`${c.slug}: ${m[1].slice(0, 24)}`);
    }
  }
  assert.strictEqual(bad.length, 0, `编造或改字 ${bad.length} 处：\n      ${bad.slice(0, 5).join('\n      ')}`);
  assert.ok(checked >= 30, `只核到 ${checked} 处引文，太少（每章 3 处、共 30）`);
});

test('引用格式：《医学衷中参西录·…》+ 外源·笈成 + 禁「底本第 N 条」', () => {
  for (const c of chapters) {
    const md = read(c.slug, 'docs/zh.md');
    assert.ok(/《医学衷中参西录·[^》]+》/.test(md), `${c.slug} 缺《书名·篇》级引文`);
    assert.ok(/外源·笈成/.test(md), `${c.slug} 未标注外源`);
    assert.ok(!/底本第\s*\d+\s*条/.test(md), `${c.slug} 把外源标成了底本`);
    assert.ok(/(免责声明|不构成诊疗)/.test(md), `${c.slug} 缺免责声明`);
    assert.ok(/代价与边界/.test(md), `${c.slug} 缺「代价与边界」`);
  }
});

test('剂量不许换算成克（两/钱是清末衡制，换算无依据）', () => {
  const bad = [];
  for (const c of chapters) {
    const md = read(c.slug, 'docs/zh.md');
    // 只拦「数字+克」的换算表述，不拦「不可换算」这类说明
    for (const m of md.matchAll(/(\d+(?:\.\d+)?)\s*(?:克|g\b)/g)) {
      const ctx = md.slice(Math.max(0, m.index - 20), m.index + 10);
      if (/不(可|做|能)|不换算|无依据/.test(ctx)) continue;
      bad.push(`${c.slug}: ${ctx.replace(/\n/g, ' ')}`);
    }
  }
  assert.strictEqual(bad.length, 0, `出现克数换算：${bad.slice(0, 3).join(' | ')}`);
});

test('「参西」必须与辨证分开陈述（不得写成病理学结论）', () => {
  for (const c of chapters) {
    const md = read(c.slug, 'docs/zh.md');
    if (!md.includes('参西')) continue;
    assert.ok(/(解释层|解释|不可替代|辨证)/.test(md), `${c.slug} 提到参西但没说清它与辨证的关系`);
  }
});

test('quiz 契约：每章 6 题，pre/check/post 三段齐，答案下标合法', () => {
  for (const c of chapters) {
    const quiz = JSON.parse(read(c.slug, 'quiz.json'));
    const qs = quiz.questions;
    assert.strictEqual(qs.length, 6, `${c.slug} 题数 ${qs.length}`);
    const stages = qs.map((q) => q.stage);
    assert.strictEqual(stages[0], 'pre', `${c.slug} 首题不是 pre`);
    assert.strictEqual(stages[5], 'post', `${c.slug} 末题不是 post`);
    assert.ok(stages.filter((s) => s === 'check').length >= 3, `${c.slug} check 题不足 3`);
    for (const q of qs) {
      assert.strictEqual(q.options.length, 4, `${c.slug} 选项数 ${q.options.length}`);
      assert.ok(q.correct >= 0 && q.correct <= 3, `${c.slug} correct 越界`);
      assert.ok(q.explanation, `${c.slug} 缺解释`);
    }
  }
});

test('课程注册与底本映射一致（curriculum ↔ chapters.json ↔ units）', () => {
  const dept = CURR.departments.find((d) => d.slug === '01-zhongyi');
  const row = dept.subjects.find((s) => s[0] === '23-zhongcan-xilu-xuandu');
  assert.ok(row, 'curriculum.json 里没有 23-zhongcan-xilu-xuandu');
  assert.strictEqual(row[6], chapters.length, `curriculum 章数 ${row[6]} ≠ chapters.json ${chapters.length}`);
  const sum = chapters.reduce((a, c) => a + c.units + (c.extends || 0), 0);
  assert.strictEqual(sum, U.counts.units, `精读 + 延伸合计 ${sum} ≠ 全书 ${U.counts.units}（有单元没上课）`);
  for (const c of chapters) {
    assert.ok(c.units > 0, `${c.slug} 精读单元为 0`);
  }
  const readSum = chapters.reduce((a, c) => a + c.units, 0);
  assert.ok(readSum < U.counts.units, '十章的「精读」不应等于全书（选读不是全文重排）');
});

if (failures.length) {
  console.log(`\n  ${passed} 通过 · ${failures.length} 失败\n`);
  process.exit(1);
}
console.log(`\n  ${passed} 通过 · 0 失败\n\n✅ 选读课通过\n`);
