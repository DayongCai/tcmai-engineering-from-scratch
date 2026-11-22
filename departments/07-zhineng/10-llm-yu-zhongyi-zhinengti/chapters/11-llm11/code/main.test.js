#!/usr/bin/env node
/**
 * 第 11 章 延迟与单价不是运维指标，是临床能不能用的门槛 —— 确定性测试
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
  parseTraffic,
  parsePrice,
  parseLatency,
  parseKvShape,
  parseCache,
  parseStructured,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const doc = readDoc();
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`);

test('正文是补实稿，部署形态与数据分级都在', () => {
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2500, `正文汉字过少：${hanzi}`);
  for (const k of ['公有 API', '本地 GPU 服务器', '数据分级', '代价与边界']) assert.ok(doc.includes(k), `缺「${k}」`);
  assert.ok(!/TODO|待补|占位稿/.test(doc));
});

test('月成本复算 295.7 元，与正文一致', () => {
  const tr = parseTraffic(doc);
  const pr = parsePrice(doc);
  assert.strictEqual(tr.callsPerDay, 800);
  assert.strictEqual(tr.input, 1800);
  assert.strictEqual(tr.output, 600);
  assert.strictEqual(tr.workdays, 22);
  assert.deepStrictEqual(pr, { inPerM: 4, outPerM: 16 });
  const calls = tr.callsPerDay * tr.workdays;
  const total = (tr.input * calls) / 1e6 * pr.inPerM + (tr.output * calls) / 1e6 * pr.outPerM;
  near(total, 295.7, 0.1, '月成本');
  near(total / calls, 0.017, 1e-3, '单次成本');
});

test('输出占 token 四分之一，却占费用近六成', () => {
  const tr = parseTraffic(doc);
  const pr = parsePrice(doc);
  const tokenShare = tr.output / (tr.input + tr.output);
  const costShare = (tr.output * pr.outPerM) / (tr.input * pr.inPerM + tr.output * pr.outPerM);
  near(tokenShare, 0.25, 1e-9, 'token 占比');
  assert.ok(costShare > 0.55 && costShare < 0.60, `费用占比 ${costShare}`);
  assert.strictEqual(pr.outPerM / pr.inPerM, 4);
});

test('结构化输出把单次输出费用从 0.0096 降到 0.0024', () => {
  const st = parseStructured(doc);
  const pr = parsePrice(doc);
  assert.strictEqual(st.tokens, 150);
  near((600 * pr.outPerM) / 1e6, st.before, 1e-4, '改前');
  near((st.tokens * pr.outPerM) / 1e6, st.after, 1e-4, '改后');
});

test('缓存三成命中把月成本降到 207 元', () => {
  const c = parseCache(doc);
  const tr = parseTraffic(doc);
  const pr = parsePrice(doc);
  const calls = tr.callsPerDay * tr.workdays;
  const total = (tr.input * calls) / 1e6 * pr.inPerM + (tr.output * calls) / 1e6 * pr.outPerM;
  assert.strictEqual(c.hit, 0.3);
  near(total * (1 - c.hit), c.monthly, 1, '命中后月成本');
});

test('延迟四段合计 4.6 秒，用三次即近十四秒', () => {
  const l = parseLatency(doc);
  assert.strictEqual(l.retrieveMs, 300);
  assert.strictEqual(l.inferS, 4);
  assert.strictEqual(l.verifyMs, 200);
  assert.strictEqual(l.renderMs, 100);
  const sum = (l.retrieveMs + l.inferS * 1000 + l.verifyMs + l.renderMs) / 1000;
  near(sum, l.quotedS, 0.05, '端到端');
  assert.ok(sum < 5, '四段合计应在五秒内');
  near(sum * 3, 13.8, 0.1, '三次');
});

test('KV 缓存每 token 524,288 字节，单会话约 1.95 GiB', () => {
  const kv = parseKvShape(doc);
  const perToken = 2 * kv.layers * kv.heads * kv.headDim * 2;
  assert.strictEqual(perToken, 524288);
  near((perToken * 4000) / 1024 ** 3, 1.95, 0.02, '单会话');
  near(perToken / 1024 ** 2, 0.5, 0.01, 'MiB');
});

test('并发天花板由剩余显存除以单会话占用得出，约九路', () => {
  const kv = parseKvShape(doc);
  const perToken = 2 * kv.layers * kv.heads * kv.headDim * 2;
  const fits = Math.floor(((kv.cardGB - kv.weightsGB) * 1024 ** 3) / (perToken * 4000));
  assert.strictEqual(fits, 9);
  assert.ok(fits >= kv.sessions[0] && fits <= kv.sessions[1], `复算 ${fits} 不在正文 ${kv.sessions.join('–')} 内`);
  assert.strictEqual(kv.shortCtx, 1500);
  near(4000 / kv.shortCtx, kv.ratioQuoted, 0.1, '短上下文倍数');
});

test('脚本可运行，输出含成本表、延迟与并发', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /合计 295\.7 元\/月，单次约 0\.0168 元/);
  assert.match(out, /= 4\.6 s（正文 4\.6）/);
  assert.match(out, /约 9 路并发（正文 8–9）/);
  assert.match(out, /不构成采购、合规或技术选型建议/);
});

test('脚本不写死月成本与并发数', () => {
  const src = fs.readFileSync(MAIN, 'utf8');
  assert.ok(!/295\.7/.test(src), '源码写死了月成本');
  assert.ok(!/\b9 路并发\b/.test(src), '源码写死了并发数');
});
