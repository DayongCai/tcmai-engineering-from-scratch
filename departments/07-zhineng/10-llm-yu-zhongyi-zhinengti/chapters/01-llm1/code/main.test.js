#!/usr/bin/env node
/**
 * 第 1 章 特征是人挑的，表示是数据自己长出来的 —— 确定性测试
 * 运行: node --test（在本章目录下）
 *
 * 断言对象是「脚本从正文算出来的量」：正文改了数字，这些测试必须跟着变；
 * 脚本里写死数字则测试里的「源码不含该常数」一条会失败。
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC,
  readDoc,
  parseEmbedding,
  parseAliasScale,
  parseCosineTable,
  isHomograph,
  isSynonym,
  summarize,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文存在且是补实稿，不是占位', () => {
  const doc = readDoc();
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2500, `正文汉字过少：${hanzi}`);
  assert.ok(!/TODO|待补|占位/.test(doc), '正文里还有占位标记');
  assert.ok(doc.includes('代价与边界'), '缺「代价与边界」节');
});

test('嵌入表参数量由词表 × 维度现算，且与正文一致', () => {
  const emb = parseEmbedding(readDoc());
  assert.strictEqual(emb.vocab, 12000);
  assert.strictEqual(emb.dim, 768);
  assert.strictEqual(emb.vocab * emb.dim, emb.params);
  assert.strictEqual(emb.params, 9216000);
});

test('正文自己写了「约 921.6 万」，不是脚本臆造的量级', () => {
  const doc = readDoc();
  const emb = parseEmbedding(doc);
  assert.ok(doc.includes('921.6 万'), '正文缺 921.6 万这一量级');
  assert.strictEqual((emb.params / 1e4).toFixed(1), '921.6');
});

test('长尾字符串规模 400 × 2.5 复算为 1,000，与正文一致', () => {
  const a = parseAliasScale(readDoc());
  assert.strictEqual(a.names, 400);
  assert.strictEqual(a.aliases, 2.5);
  assert.strictEqual(a.names * a.aliases, a.strings);
  assert.strictEqual(a.strings, 1000);
});

test('余弦表能逐行读出，且都是合法区间内的数', () => {
  const rows = parseCosineTable(readDoc());
  assert.ok(rows.length >= 5, `余弦表只有 ${rows.length} 行`);
  for (const r of rows) {
    assert.ok(r.cos >= 0 && r.cos <= 1, `${r.a}—${r.b} 的余弦越界：${r.cos}`);
    assert.ok(r.a && r.b, '词对有空项');
  }
});

test('同形不同指那一行被正文点名，且余弦高于近义对均值', () => {
  const rows = parseCosineTable(readDoc());
  const homo = rows.filter(isHomograph);
  assert.strictEqual(homo.length, 1, '正文的同形不同指示例应恰好一行');
  assert.match(homo[0].b + homo[0].a, /中风/);
  const s = summarize(rows);
  assert.ok(homo[0].cos > s.synonymMean, '正文的论点正是它被判得比近义还近');
});

test('近义对与不同义对之间留有落差，脚本算得出方向', () => {
  const s = summarize(parseCosineTable(readDoc()));
  assert.ok(s.synonyms >= 2, `近义对只有 ${s.synonyms} 对`);
  assert.ok(s.synonymMean > s.apartMean, '近义均值应高于不同义均值');
  assert.ok(s.gap > 0.2, `落差过小：${s.gap.toFixed(3)}`);
});

test('「不寐—不寐病」属近义一侧，不被误判为同形不同指', () => {
  const rows = parseCosineTable(readDoc());
  const r = rows.find((x) => x.b === '不寐病');
  assert.ok(r, '余弦表里应有「不寐—不寐病」一行');
  assert.strictEqual(isHomograph(r), false);
  assert.strictEqual(isSynonym(r), true);
});

test('脚本不写死参数量：9216000 只能算出来，不能抄进源码', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(!src.includes('9216000'), '源码写死了参数量 9216000');
  assert.ok(!src.includes('9,216,000'), '源码写死了参数量 9,216,000');
});

test('脚本可运行，输出含现读口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.match(out, /现读现算/);
  assert.match(out, /不构成临床判断依据/);
  assert.match(out, /12,000 × 维度 768 = 9,216,000/);
});
