'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { shape, axes, syndromes, combos, examples, citation, resolve, doc, ch } = require('./main.js');

const DOCS = path.join(__dirname, '..', 'docs', 'zh.md');

test('规模：1,823 字 = 全书 8.2%；五节 412/408/385/332/286 逐节递减', () => {
  const s = shape();
  assert.strictEqual(s.total, 1823);
  assert.deepStrictEqual(s.rows.map((r) => r.chars), [412, 408, 385, 332, 286]);
  assert.strictEqual(s.total, s.rows.reduce((n, r) => n + r.chars, 0));
  assert.ok(Math.abs(s.share - 1823 / doc.counts.chars) < 1e-9);
  assert.strictEqual(s.thick.no, '6.1');
  assert.strictEqual(s.thin.no, '6.5');
  assert.ok(s.rows.every((r, i, a) => i === 0 || a[i - 1].chars > r.chars));
});

test('结构：5 节 10 小节 20 段，每节 2 小节 4 段', () => {
  const s = shape();
  assert.strictEqual(s.secs, 5);
  assert.strictEqual(s.subs, 10);
  assert.strictEqual(s.paras, 20);
  assert.ok(s.rows.every((r) => r.subs === 2 && r.paras === 4));
});

test('四对轴 = 8 纲：表里 / 寒热 / 虚实 / 阴阳', () => {
  const a = axes();
  assert.strictEqual(a.axes, 4);
  assert.strictEqual(a.n, 8);
  assert.deepStrictEqual(a.gang, ['表', '里', '寒', '热', '虚', '实', '阴', '阳']);
  assert.deepStrictEqual(a.pairs.map((p) => p.axis), ['表里', '寒热', '虚实', '阴阳']);
});

test('教材原文核对：13 个具体证候逐个在正文出现，名单不多不少', () => {
  const syn = syndromes();
  assert.strictEqual(syn.n, 13);
  assert.strictEqual(syn.allPresent, true);
  assert.deepStrictEqual(syn.missing, []);
  assert.deepStrictEqual(syn.rows.map((r) => r.name), [
    '表证', '里证', '半表半里证', '寒证', '热证', '虚证', '实证',
    '阴证', '阳证', '阴虚证', '阳虚证', '亡阴证', '亡阳证',
  ]);
  assert.deepStrictEqual(syn.rows.map((r) => r.hits), [5, 7, 1, 4, 4, 5, 3, 2, 2, 1, 1, 1, 1]);
});

test('组合空间：2^4=16 是上界，阴阳为复合轴后有效 8 格，点名覆盖仅 2 格', () => {
  const co = combos();
  assert.strictEqual(co.naive, 16);
  assert.strictEqual(co.effective, 8);
  assert.strictEqual(co.threeValued, 12); // 表/半表半里/里 使表里成三值
  assert.strictEqual(co.coveredN, 2);
  assert.deepStrictEqual(co.covered.map((x) => [x.cell, x.by]), [['里·寒·虚', '阴证'], ['表·热·实', '阳证']]);
  assert.ok(Math.abs(co.ratioEffective - 2 / 8) < 1e-9);
  assert.ok(Math.abs(co.ratioNaive - 2 / 16) < 1e-9);
  // 复合定义须在教材正文里逐字可查
  const t = ch.secs.flatMap((s) => [...(s.paras || []), ...s.subs.flatMap((x) => x.paras)]).join('\n');
  for (const c of co.composite) assert.ok(t.includes(c.quote), `${c.name} 的 ${c.quote} 不在正文`);
});

test('举例：两轴 8 例 + 部位 2 例 + 真假 4 例 + 夹杂 2 例，全部可查；「上热下寒」不落网格', () => {
  const ex = examples();
  assert.deepStrictEqual(ex.map((g) => g.n), [8, 2, 4, 2]);
  assert.ok(ex.every((g) => g.items.every((i) => i.present && i.hits > 0)));
  const co = combos();
  assert.ok(!co.cells.includes('上热下寒'));
  assert.ok(co.cells.every((c) => c.split('·').length === 3));
});

test('本仓库口径说明：引用只写「教材·第6章·M.M」，不加旧称，引用须落到教材节点', () => {
  assert.strictEqual(citation('6.5.1'), '教材·第6章·6.5.1');
  assert.strictEqual(resolve('6.1'), true);
  assert.strictEqual(resolve('6.2.2'), true);
  assert.strictEqual(resolve('6.5.1'), true);
  assert.strictEqual(resolve('6.9.9'), false);

  const text = fs.readFileSync(DOCS, 'utf8');
  // 旧称禁用表：以码点写，避免源码里出现该词本身
  for (const w of ['\u5e95\u672c', '\u7ecf\u6587']) {
    assert.ok(!text.includes(w), 'docs 不得用旧称作引用');
  }
  const cites = [...text.matchAll(/《中医诊断学·第(\d+)章·([\d.]+)》/g)];
  assert.ok(cites.length >= 1);
  for (const [, no, node] of cites) {
    assert.strictEqual(no, '6');
    assert.strictEqual(resolve(node), true, `引用 ${node} 落不到教材节点`);
  }
  const han = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  assert.ok(han >= 1600, `docs 汉字数 ${han} < 1600`);
});

test('运行时最后一行是教学边界声明', () => {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  const lines = out.trim().split(/\r?\n/);
  const last = lines[lines.length - 1];
  assert.ok(last.startsWith('教学边界：'), last);
  assert.ok(last.endsWith('不构成诊断依据。'), last);
});
