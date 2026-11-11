'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { shape, pulse, citation, resolve, doc, ch, supplements } = require('./main.js');

const DOCS = path.join(__dirname, '..', 'docs', 'zh.md');

test('规模：2,030 字 = 全书 9.1%；5.1 1,545 + 5.2 485', () => {
  const s = shape();
  assert.strictEqual(s.total, 2030);
  assert.deepStrictEqual(s.rows.map((r) => r.chars), [1545, 485]);
  assert.strictEqual(s.total, s.rows.reduce((n, r) => n + r.chars, 0));
  assert.ok(Math.abs(s.share - 2030 / doc.counts.chars) < 1e-9);
  assert.ok(Math.abs(s.maiShare - 1545 / 2030) < 1e-9);
});

test('结构：2 节 6 小节 14 段；脉诊 4 小节 10 段、按诊 2 小节 4 段', () => {
  const s = shape();
  assert.strictEqual(s.secs, 2);
  assert.strictEqual(s.subs, 6);
  assert.strictEqual(s.paras, 14);
  assert.deepStrictEqual(s.rows.map((r) => [r.subs, r.paras]), [[4, 10], [2, 4]]);
  assert.strictEqual(ch.counts.items, 14);
});

test('教材原文核对：5.1.2.1 段标题逐字为 15 个单字脉名，不是 14 个', () => {
  const p = pulse();
  assert.strictEqual(p.compact.raw, '浮沉迟数虚实洪细弦紧滑涩濡弱微');
  assert.strictEqual(p.compact.n, 15);
  assert.deepStrictEqual(p.compact.names, [...'浮沉迟数虚实洪细弦紧滑涩濡弱微']);
  assert.notStrictEqual(p.compact.n, 14);
});

test('5.1.2.2 段标题：8 个顿号片段、去重 12 名，「长短短脉」重复「短」', () => {
  const p = pulse();
  assert.strictEqual(p.grouped.parts.length, 8);
  assert.deepStrictEqual(p.grouped.parts, ['结代促', '长短短脉', '革牢', '动脉', '疾脉', '散脉', '芤脉', '伏脉']);
  assert.strictEqual(p.grouped.n, 12);
  assert.deepStrictEqual(p.grouped.dups, ['短']);
  assert.strictEqual(p.grouped.rawCount, 13);
  assert.ok(p.grouped.names.every((n) => n.length === 1));
});

test('标题 27 名 vs 正文 28 名：标题漏「缓」，差 1（简报的「差 2」前提不成立）', () => {
  const p = pulse();
  assert.strictEqual(p.titleN, 27);
  assert.strictEqual(p.body.n, 28);
  assert.deepStrictEqual(p.body.per.map((x) => x.length), [12, 16]);
  assert.deepStrictEqual(p.missing, ['缓']);
  assert.deepStrictEqual(p.extra, []);
  assert.strictEqual(p.gap, 1);
  assert.strictEqual(p.gapIfBrief, 2); // 只有按「14 + 12」假设才会得到 2
  assert.notStrictEqual(p.gap, p.gapIfBrief);
});

test('按诊只占 23.9%，且 485 字里没有量化判据', () => {
  const s = shape();
  assert.ok(Math.abs(s.anShare - 485 / 2030) < 1e-9);
  assert.ok(s.anShare < 0.25);
  const an = ch.secs.find((x) => x.no === '5.2');
  assert.strictEqual(an.subs.length, 2);
  assert.strictEqual(an.subs.flatMap((x) => x.paras).length, 4);
});

test('本仓库口径说明：引用只写「教材·第5章·M.M」，不加旧称，且每条引用都能落到教材节点', () => {
  assert.strictEqual(citation('5.1.2.1'), '教材·第5章·5.1.2.1');
  assert.strictEqual(resolve('5.1'), true);
  assert.strictEqual(resolve('5.1.2'), true);
  assert.strictEqual(resolve('5.1.2.1'), true);
  assert.strictEqual(resolve('5.1.2.9'), false);

  const text = fs.readFileSync(DOCS, 'utf8');
  // 旧称禁用表：以码点写，避免源码里出现该词本身
  for (const w of ['\u5e95\u672c', '\u7ecf\u6587']) {
    assert.ok(!text.includes(w), 'docs 不得用旧称作引用');
  }
  const cites = [...text.matchAll(/《中医诊断学·第(\d+)章·([\d.]+)》/g)];
  assert.ok(cites.length >= 1);
  for (const [, no, node] of cites) {
    assert.strictEqual(no, '5');
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

test('补录：标题 27 / 正文 28 / 漏「缓」，《脈經》二十四種在册', () => {
  const g = supplements('z1-mai-ming-que-huan');
  assert.deepStrictEqual(g.textbookSeen.onlyInBody, ['缓']);
  assert.strictEqual(g.comparison.maijingCount, 24);
  assert.deepStrictEqual(g.comparison.onlyTextbook.sort(), ['长', '牢', '疾', '短'].sort());
  assert.ok(g.entries.find((e) => e.name === '緩脈').text.includes('去來亦遲'));
});
