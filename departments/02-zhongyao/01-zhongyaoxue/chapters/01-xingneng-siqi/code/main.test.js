'use strict';
/**
 * 第 1 章 单测（教材·第5章 中药的性能）
 * 断言里钉死期望值；程序里的数字全部现算。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  book, ch, drugs, CH_NO, sec, sub, para, text, fold,
  shape, lex, mentions, citation, resolve,
} = require('./main.js');

const DOCS = path.join(__dirname, '..', 'docs', 'zh.md');

test('规模：本章 2,126 字 = 全书 63,865 字的 3.33%', () => {
  const s = shape();
  assert.strictEqual(CH_NO, '5');
  assert.strictEqual(s.total, 2126);
  assert.strictEqual(book.counts.chars, 63865);
  assert.strictEqual(s.total, s.rows.reduce((n, r) => n + r.chars, 0));
  assert.ok(Math.abs(s.share - 2126 / 63865) < 1e-12);
  assert.ok(s.share > 0.03 && s.share < 0.034);
});

test('结构：5 节 10 小节 20 段 20 段标题，五节同构（每节 2 小节 / 4 段）', () => {
  const s = shape();
  assert.strictEqual(s.secs, 5);
  assert.strictEqual(s.subs, 10);
  assert.strictEqual(s.paras, 20);
  assert.strictEqual(s.items, 20);
  assert.deepStrictEqual(s.rows.map((r) => [r.subs, r.paras]), [[2, 4], [2, 4], [2, 4], [2, 4], [2, 4]]);
  assert.strictEqual(s.uniform, true);
  assert.deepStrictEqual(s.rows.map((r) => r.chars), [399, 442, 457, 403, 425]);
  assert.strictEqual(s.spread, 58);
  assert.strictEqual(s.max, 457);
  assert.strictEqual(s.min, 399);
});

test('教材原文核对：5.1.1 首段起句与 5.5.1 的毒性三级逐字一致', () => {
  const p = para('5.1.1', 0);
  assert.ok(
    p.startsWith('四气（四性）指药物寒、热、温、凉四种药性（另有平性，实际仍偏于温凉）：'),
    p.slice(0, 40),
  );
  const tox = para('5.5.1', 1);
  for (const t of ['大毒（如川乌、马钱子、巴豆）', '有毒（如附子、半夏、苍耳子）', '小毒（如苦杏仁、吴茱萸、蛇床子）']) {
    assert.ok(tox.includes(t), `5.5.1 第 2 段缺 ${t}`);
  }
  // 五味那句「辛能散能行（…）」的括号内举例逐字可查
  assert.ok(para('5.2.1', 0).includes('辛能散能行（发散表邪、行气活血——薄荷、川芎）'));
  // 段标题与段正文一比一：20 个 items、20 段 paras
  const items = ch.secs.flatMap((s) => s.subs.flatMap((u) => u.items || []));
  assert.strictEqual(items.length, ch.counts.paras);
});

test('本仓库口径说明：引用只写「教材·第5章·M.M」，三级节点可校验，docs 不用旧称', () => {
  assert.strictEqual(citation('5.1.1'), '教材·第5章·5.1.1');
  assert.strictEqual(resolve('5.1'), true);
  assert.strictEqual(resolve('5.1.2'), true);
  assert.strictEqual(resolve('5.1.2.1'), true);
  assert.strictEqual(resolve('5.1.9'), false);
  assert.strictEqual(resolve('5.6'), false);

  const doc = fs.readFileSync(DOCS, 'utf8');
  for (const w of ['\u5e95\u672c', '\u539f\u6587']) {
    assert.ok(!doc.includes(w), 'docs 不得把旧称当引用标签');
  }
  const cites = [
    ...[...doc.matchAll(/《中药学·第(\d+)章·([\d.]+)》/g)].map((m) => [m[1], m[2]]),
    ...[...doc.matchAll(/教材·第(\d+)章·([\d.]+)/g)].map((m) => [m[1], m[2]]),
  ];
  assert.ok(cites.length >= 6, `docs 的教材级引用只有 ${cites.length} 条`);
  for (const [no, node] of cites) {
    assert.strictEqual(no, '5');
    assert.strictEqual(resolve(node), true, `引用 ${node} 落不到教材节点`);
  }
  // docs 里必须出现本章字数
  assert.ok(doc.replace(/,/g, '').includes('2126'));
  const han = (doc.match(/[\u4e00-\u9fa5]/g) || []).length;
  assert.ok(han >= 1500, `docs 汉字数 ${han} < 1500`);
});

test('术语热度 ≠ 篇幅：五味 12 次最多、四气 3 次最少，极差 58 字', () => {
  const l = lex();
  assert.deepStrictEqual(l.elements.map((x) => [x.word, x.n]), [
    ['五味', 12], ['毒性', 7], ['归经', 6], ['升降浮沉', 4], ['四气', 3],
  ]);
  assert.strictEqual(l.most.word, '五味');
  assert.strictEqual(l.least.word, '四气');
  const s = shape();
  const longest = [...s.rows].sort((a, b) => b.chars - a.chars)[0];
  // 术语最多的那节（五味 442 字）与篇幅最长的那节（升降浮沉 457 字）不是同一节
  assert.strictEqual(longest.title, '升降浮沉');
  assert.strictEqual(s.rows[1].title, l.most.word);
  assert.notStrictEqual(longest.title, l.most.word);
  assert.strictEqual(s.rows[1].chars, 442);
});

test('举药 54 味 / 94 处，立目 0 条：总论是词表不是数据库', () => {
  const m = mentions();
  assert.strictEqual(m.distinct, 54);
  assert.strictEqual(m.places, 94);
  assert.strictEqual(m.records, 0);
  assert.strictEqual(m.bookRecords, 287);
  assert.strictEqual(m.recordRate, 0);
  assert.ok(m.names.includes('麻黄') && m.names.includes('石膏') && m.names.includes('甘草'));
  // 药名与性味字段并未出现在本章正文里
  assert.ok(!text().includes('归肺、膀胱经'));
  assert.ok(drugs.filter((d) => String(d.chapter) === CH_NO).length === 0);
});

test('运行时最后一行是教学边界声明', () => {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  const lines = out.trim().split(/\r?\n/);
  const last = lines[lines.length - 1];
  assert.ok(last.startsWith('教学边界：'), last);
  assert.ok(last.endsWith('不构成用药依据。'), last);
  assert.ok(/教材·第5章/.test(out));
});

test('quiz 契约：6 题 pre/check×3/post×2', () => {
  const q = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const qs = q.questions || q;
  assert.strictEqual(qs.length, 6);
  assert.deepStrictEqual(qs.map((x) => x.stage), ['pre', 'check', 'check', 'check', 'post', 'post']);
  for (const x of qs) {
    assert.strictEqual(x.options.length, 4);
    assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3);
    assert.ok((x.explanation || '').length >= 10);
  }
  // 折叠函数本身也要可用：quiz 讲到的「辛能散能行」在本章可逐字回查
  assert.ok(fold(text()).includes(fold('辛能散能行（发散表邪、行气活血——薄荷、川芎）')));
});
