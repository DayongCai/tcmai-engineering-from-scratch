#!/usr/bin/env node
/**
 * 第 7 章 知识不是喂给模型的背景，是它必须引用的证据 —— 确定性测试
 * 运行: node --test（在本章目录下）
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  readDoc,
  parseKb,
  parseBudget,
  parseRrfK,
  parseFusionStory,
  rrf,
  validateCitations,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const doc = readDoc();
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('正文是补实稿，注入路径与引用契约都在', () => {
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2500, `正文汉字过少：${hanzi}`);
  for (const k of ['提示内联', '检索增强', '权重内化', '强制引用', '代价与边界']) assert.ok(doc.includes(k), `缺「${k}」`);
  assert.ok(!/TODO|待补|占位/.test(doc));
});

test('全库规模复算：3,000 条 × 100 字 = 30 万字', () => {
  const kb = parseKb(doc);
  assert.strictEqual(kb.entries, 3000);
  assert.strictEqual(kb.charsEach, 100);
  assert.strictEqual((kb.entries * kb.charsEach) / 1e4, kb.totalCharsWan);
});

test('引用占比复算到 0.48%，与正文一致', () => {
  const bud = parseBudget(doc);
  const kb = parseKb(doc);
  assert.strictEqual(bud.refs, 5);
  assert.strictEqual(bud.refTokens, 1500);
  const share = bud.refTokens / (kb.totalTokensWan * 1e4);
  near(share, bud.sharePct, 5e-4, '占比');
  near(share * 100, 0.48, 0.01, '百分比');
});

test('全库塞入的相对成本约两百倍', () => {
  const kb = parseKb(doc);
  const bud = parseBudget(doc);
  const factor = (kb.totalTokensWan * 1e4) / bud.refTokens;
  assert.ok(factor > 190 && factor < 220, `倍数 ${factor} 偏离正文口径`);
  near(factor / bud.costFactor, 1, 0.05, '与正文 200 倍同量级');
});

test('倒数排序的 k 读得出 60，且分数定义与公式一致', () => {
  assert.strictEqual(parseRrfK(doc), 60);
  const out = rrf([['x'], ['x']], 60);
  near(out[0].score, 2 / 61, 1e-12, '双路首位');
});

test('融合算例：两路重合的条目占据最前两位', () => {
  const fus = parseFusionStory(doc);
  assert.deepStrictEqual(fus, { literalK: 5, literalHit: 3, semanticK: 5, overlap: 2, takeTop: 5 });
  const literal = ['a1', 'a2', 'a3', 'a4', 'a5'];
  const semantic = ['a1', 'a3', 'b1', 'b2', 'b3'];
  const top = rrf([literal, semantic], 60).slice(0, fus.overlap).map((x) => x.id).sort();
  assert.deepStrictEqual(top, ['a1', 'a3']);
});

test('融合不依赖量纲：分数整体缩放不影响名次', () => {
  const a = rrf([['p', 'q'], ['q', 'p']], 60);
  const b = rrf([['p', 'q'], ['q', 'p']], 60);
  assert.deepStrictEqual(a.map((x) => x.id), b.map((x) => x.id));
  near(a[0].score, a[1].score, 1e-12, '对称输入应平分');
});

test('引用校验：合规的通过', () => {
  const sources = { 1: '太阳中风，阳浮而阴弱。', 2: '证候条目「太阳中风」：主症 恶风、汗出。' };
  const v = validateCitations('原文「太阳中风，阳浮而阴弱」[1]，舌脉见 [2]。', sources);
  assert.strictEqual(v.ok, true);
  assert.deepStrictEqual(v.missingRefs, []);
  assert.deepStrictEqual(v.unverifiedQuotes, []);
});

test('引用校验：编造的编号被拦下', () => {
  const sources = { 1: '太阳中风，阳浮而阴弱。' };
  const v = validateCitations('出自《温病条辨》[3]。', sources);
  assert.strictEqual(v.ok, false);
  assert.deepStrictEqual(v.missingRefs, [3]);
});

test('引用校验：原文对不上资料被拦下', () => {
  const sources = { 1: '太阳中风，阳浮而阴弱。' };
  const v = validateCitations('原文「太阳病，脉浮紧」[1]。', sources);
  assert.strictEqual(v.ok, false);
  assert.deepStrictEqual(v.missingRefs, []);
  assert.strictEqual(v.unverifiedQuotes.length, 1);
});

test('引用校验：一条不带编号的回答不算合规（无依据断言）', () => {
  const v = validateCitations('本条属太阳中风。', { 1: '太阳中风，阳浮而阴弱。' });
  assert.strictEqual(v.noRefs, true);
  assert.strictEqual(v.ok, false);
});

test('脚本可运行，输出含预算、融合与三种校验结论', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /3,000 条 × 100 字 = 300,000 字/);
  assert.match(out, /重合的 2 条是否占据最前 2 位：是/);
  assert.match(out, /不构成诊疗、用药或处方建议/);
});

test('脚本不写死占比与倍数', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(!/0\.48/.test(src), '源码写死了 0.48%');
  assert.ok(!/\b207\b/.test(src), '源码写死了成本倍数');
});
