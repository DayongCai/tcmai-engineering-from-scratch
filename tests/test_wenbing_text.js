#!/usr/bin/env node
/**
 * tests/test_wenbing_text.js —— 温病学外源底本的指纹测试
 *
 * 三本书各自的解析坑（见 standards/wenbing/README.md §4）都很有意思：
 * 首版把「方名带尾注」的 200 方漏掉、把方论吞掉后面几十条正文、把全角括号剂量的药味行
 * 当成散文。这组测试钉住修好之后的形态，让下次改动立刻显形。
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DIR = path.join(ROOT, 'standards/wenbing');
const BOOK = JSON.parse(fs.readFileSync(path.join(DIR, '底本.json'), 'utf8'));

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};

const byId = (id) => BOOK.books.find((b) => b.id === id);
const tb = byId('tiaobian');
const wr = byId('wenrelun');
const wy = byId('wenyilun');
const tbFormulas = tb.sections.flatMap((s) => s.formulas);
const tbHerbs = tbFormulas.flatMap((f) => f.ingredients);

console.log('\n温病学外源底本（三书）\n');

test('三本齐 · 合计 630 条 · 243 方', () => {
  assert.strictEqual(BOOK.books.length, 3);
  assert.deepStrictEqual(BOOK.books.map((b) => b.titleSimp), ['温病条辨', '温热论', '温疫论']);
  assert.strictEqual(BOOK.counts.articles, 630);
  assert.strictEqual(BOOK.counts.formulas, 243);
});

test('三份留档 sha256 与产物登记一致（逐本比对）', () => {
  for (const b of BOOK.books) {
    const p = path.join(DIR, b.id, 'source.html');
    const buf = fs.readFileSync(p);
    const sha = crypto.createHash('sha256').update(buf).digest('hex');
    assert.strictEqual(sha, b.source.sha256, `${b.titleSimp} sha256 不符`);
    assert.strictEqual(buf.length, b.source.bytes, `${b.titleSimp} 字节数不符`);
  }
});

test('溫病條辨：290 条 · 243 方（178 有药味 + 65 无处方/加减/主治）', () => {
  assert.strictEqual(tb.counts.articles, 290);
  assert.strictEqual(tbFormulas.length, 243);
  const withH = tbFormulas.filter((f) => f.ingredients.length > 0);
  assert.strictEqual(withH.length, 178);
  assert.strictEqual(tbFormulas.length - withH.length, 65);
  for (const f of tbFormulas) {
    if (f.ingredients.length === 0) assert.strictEqual(f.refOnly, true, `${f.nameSimp} 无药味却未标 refOnly`);
  }
});

test('方名带尾注也要认（<u>方名</u>（方見前））—— 首版在这里漏了 200 方', () => {
  const names = tbFormulas.map((f) => f.nameSimp);
  assert.ok(names.some((n) => n.includes('银翘散')), '缺银翘散');
  assert.ok(names.some((n) => n.includes('桑菊饮')), '缺桑菊饮');
  assert.ok(names.some((n) => n.includes('白虎')), '缺白虎汤类');
  const withNote = tbFormulas.filter((f) => (f.noteSimp || '').length > 0);
  assert.ok(withNote.length >= 150, `带尾注的方只有 ${withNote.length}，疑又漏认`);
});

test('方论不得吞掉后续条文（条文数必须 290，不是 111）', () => {
  assert.strictEqual(tb.counts.articles, 290);
  const longComments = tbFormulas.filter((f) => (f.comment || '').length > 4000);
  assert.strictEqual(longComments.length, 0, '有方论超长，疑把后续条文吞了');
});

test('药味用全角括号剂量：银翘散 9 味，剂量逐个可读', () => {
  const yinqiao = tbFormulas.find((f) => f.nameSimp.includes('银翘散') && f.ingredients.length >= 8);
  assert.ok(yinqiao, '缺银翘散');
  assert.strictEqual(yinqiao.ingredients.length, 9);
  const first = yinqiao.ingredients[0];
  assert.ok(first.doseSimp.length > 0, `${first.herbSimp} 缺剂量`);
  assert.ok(yinqiao.methodSimp.length > 20, '缺煎服法');
});

test('药味里不得混入散文（单 token 超长一律拦下）', () => {
  const long = tbHerbs.filter((i) => i.herbSimp.length > 8);
  assert.deepStrictEqual(long.map((i) => i.herbSimp), [], '散文段被当成药名');
  assert.strictEqual(tbHerbs.length, 1153);
  assert.strictEqual(new Set(tbHerbs.map((i) => i.herbSimp)).size, 366);
});

test('条号形态：條辨用漢数字（可跨篇重号，须带篇名）；溫熱論用源页 1–37', () => {
  for (const s of tb.sections) {
    for (const a of s.articles) assert.match(String(a.no), new RegExp('^[一二三四五六七八九十百]+$'), `條辨条号异常：${s.pian} ${a.no}`);
  }
  const wrNos = wr.sections[0].articles.map((a) => a.no);
  assert.strictEqual(wrNos.length, 37);
  assert.deepStrictEqual(wrNos, Array.from({ length: 37 }, (_, i) => i + 1));
});

test('繁简双栏与自注都在（温病条辨的「自注」是它的骨骼）', () => {
  for (const b of BOOK.books) {
    for (const s of b.sections) {
      for (const a of s.articles) {
        // 溫疫論有「舌裂」「潮熱」「發狂」这类两三字的症目段，不是缺文；只要求非空
        assert.ok(a.zhHant && a.zhHant.length >= 2, `${b.titleSimp} 缺繁文`);
        assert.ok(a.zhHans && a.zhHans.length >= 2, `${b.titleSimp} 缺简文`);
      }
    }
  }
  const tbNotes = tb.sections.flatMap((s) => s.articles).filter((a) => (a.notes || []).length);
  assert.ok(tbNotes.length >= 100, `带自注的条文只有 ${tbNotes.length}，疑漏收`);
});

test('《溫疫論》无条号，段落为本库编号；九传类篇目在册', () => {
  assert.strictEqual(wy.counts.articles, 303);
  const pianNames = wy.sections.map((s) => s.pian || '').join('|');
  for (const k of ['原病', '溫疫初起', '傳變不常']) assert.ok(pianNames.includes(k), `缺篇：${k}`);
  for (const s of wy.sections) {
    const nos = s.articles.map((a) => a.no);
    assert.deepStrictEqual(nos, Array.from({ length: nos.length }, (_, i) => i + 1), '段落号应从 1 连号');
  }
});

test('README 记录三份来源与引用格式（外源不得标「底本」）', () => {
  const md = fs.readFileSync(path.join(DIR, 'README.md'), 'utf8');
  for (const b of BOOK.books) {
    assert.ok(md.includes(b.source.sha256.slice(0, 12)), `${b.titleSimp} 的 sha256 未入 README`);
    assert.ok(md.includes(b.title), `${b.titleSimp} 未在 README 出现`);
  }
  assert.ok(md.includes('外源·笈成'), 'README 未声明引用格式');
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) { for (const f of failures) console.error(`  · ${f[0]}: ${f[1]}`); process.exit(1); }
