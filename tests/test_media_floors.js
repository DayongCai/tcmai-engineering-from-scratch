#!/usr/bin/env node
/**
 * tests/test_media_floors.js —— 「体积 × 时长」判据自己的正负例
 *
 * 为什么单独一支门：
 *   判据写对了不等于**判得对**。2026-11-18 两条阈值都是「一刀切体积」，结果
 *   把 55 秒的真片（998,882 B）和 1.6 秒的章标题配音（9,648 B）判成占位 ——
 *   真产物被误杀，假产物反倒可能因为文件大一点而过关。
 *   换成码率判据后，必须有正负例把两个方向都钉住，否则下次改阈值又只能靠猜。
 *
 * 每条用例都标「期望过 / 期望不过」，用的是同一份 platform/pipeline/media_floor.js。
 * 数据取自本机实测：成片 18–20 KB/s、edge-tts 配音 5.85–5.92 KB/s。
 */

'use strict';

const assert = require('node:assert');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { videoFloorOk, audioFloorOk, FLOOR } = require(path.join(ROOT, 'platform', 'pipeline', 'media_floor.js'));

let passed = 0;
const failures = [];
const case_ = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};

console.log('\n体积 × 时长判据\n');

// ── 成片 ───────────────────────────────────────────────────
case_('成片：55 秒短章 998,882 B（实测真片）→ 过', () => {
  const r = videoFloorOk(998882, 55);
  assert.strictEqual(r.ok, true, r.why);
});

case_('成片：0 字节 → 不过（touch 骗不过）', () => {
  assert.strictEqual(videoFloorOk(0, 60).ok, false);
});

case_('成片：100 KB 但 60 秒 → 不过（绝对下限）', () => {
  assert.strictEqual(videoFloorOk(100 * 1024, 60).ok, false);
});

case_('成片：1 MB 但声称 300 秒 → 不过（码率 3.4 KB/s，像是截断）', () => {
  const r = videoFloorOk(1024 * 1024, 300);
  assert.strictEqual(r.ok, false, '这条应当被判成截断');
});

case_('成片：10 MB / 20 分钟（长章实测区间）→ 过', () => {
  assert.strictEqual(videoFloorOk(10 * 1024 * 1024, 20 * 60).ok, true);
});

case_('成片：时长未知时只判绝对下限（不因缺讲稿误杀）', () => {
  assert.strictEqual(videoFloorOk(500 * 1024, 0).ok, true);
  assert.strictEqual(videoFloorOk(10, 0).ok, false);
});

// ── 配音 ───────────────────────────────────────────────────
case_('配音：1.61 秒的章标题段 9,648 B（实测真段）→ 过', () => {
  const r = audioFloorOk(9648, 1.61);
  assert.strictEqual(r.ok, true, r.why);
});

case_('配音：0 字节 → 不过', () => {
  assert.strictEqual(audioFloorOk(0, 3).ok, false);
});

case_('配音：2 KB → 不过（绝对下限 4 KB）', () => {
  assert.strictEqual(audioFloorOk(2048, 1).ok, false);
});

case_('配音：12 KB 但声称 30 秒 → 不过（0.4 KB/s，像是截断）', () => {
  const r = audioFloorOk(12 * 1024, 30);
  assert.strictEqual(r.ok, false, '这条应当被判成截断');
});

case_('配音：86 KB / 15 秒（正文段实测）→ 过', () => {
  assert.strictEqual(audioFloorOk(86 * 1024, 15).ok, true);
});

case_('配音：时长未知时只判绝对下限', () => {
  assert.strictEqual(audioFloorOk(12 * 1024, 0).ok, true);
  assert.strictEqual(audioFloorOk(1024, 0).ok, false);
});

// ── 阈值本身的自洽 ─────────────────────────────────────────
case_('阈值自洽：成片码率下限低于实测基线（否则必然误杀）', () => {
  assert.ok(FLOOR.videoKBps < 18, `成片下限 ${FLOOR.videoKBps} KB/s 应低于实测 18–20 KB/s`);
});
case_('阈值自洽：配音码率下限低于实测基线', () => {
  assert.ok(FLOOR.audioKBps < 5.85, `配音下限 ${FLOOR.audioKBps} KB/s 应低于实测 5.85 KB/s`);
});

if (failures.length) {
  console.error(`\n${failures.length} 项失败 / ${passed} 项通过`);
  process.exit(1);
}
console.log(`\n${passed} 项全部通过`);
