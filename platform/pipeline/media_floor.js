#!/usr/bin/env node
/**
 * platform/pipeline/media_floor.js —— 成片 / 配音「是不是占位」的统一判据
 *
 * 为什么单独一个模块：
 *   同一条判据要同时被 `tests/test_platform_pipeline.js`（扫真实产物）和
 *   `tests/test_media_floors.js`（正负例自测）使用。判据写在两处就一定会分叉 ——
 *   而分叉的那一天，门会一边判真片是占位、一边放截断片过关。
 *
 * 为什么是「体积 × 时长」而不是一刀切：
 *   2026-11-18 实测教训：
 *     · 成片：中医哲学史 08 章只有 998,882 字节（约 55 秒的短章），一刀切 1 MB 判成占位 → 误杀；
 *     · 配音：章标题段只有 0.8–2.5 秒、9.6–15 KB，一刀切 10 KB 同样误杀。
 *   只降阈值又会让「截断的片子」过关。正确的判据是**码率**：截断必然掉码率，
 *   而短章只要真的编过码，码率就落在正常区间。
 *
 * 实测基线（本机）：
 *   · 成片 1080p25 静态画面：18–20 KB/s；
 *   · 配音 edge-tts 直出：5.85–5.92 KB/s（~48 kbps；ffmpeg 的 96k 只在 SAPI wav 转码时生效）。
 * 下限分别取 6 KB/s 与 4 KB/s（3× / 1.35× 余量），再各配一条绝对体积下限挡 0 字节与极小文件。
 */

'use strict';

const KB = 1024;

const FLOOR = {
  videoBytes: 200 * KB,   // 绝对下限：0 字节 / touch / 首帧未写完
  videoKBps: 6,           // 码率下限：实测 18–20 KB/s
  audioBytes: 4 * KB,     // 绝对下限
  audioKBps: 4,           // 码率下限：实测 5.85–5.92 KB/s
};

/** 成片是否通过体积判据。seconds 未知（讲稿缺失）时只判绝对下限。 */
function videoFloorOk(bytes, seconds) {
  if (!(bytes >= FLOOR.videoBytes)) return { ok: false, why: `只有 ${bytes} 字节（绝对下限 ${FLOOR.videoBytes}）` };
  if (seconds && seconds > 0) {
    const kbps = bytes / seconds / KB;
    if (kbps < FLOOR.videoKBps) {
      return { ok: false, why: `码率 ${kbps.toFixed(2)} KB/s（下限 ${FLOOR.videoKBps}）—— ${seconds} 秒的片子不该只有 ${bytes} 字节` };
    }
    return { ok: true, kbps };
  }
  return { ok: true, kbps: null };
}

/** 单段配音是否通过体积判据。seconds 未知时只判绝对下限。 */
function audioFloorOk(bytes, seconds) {
  if (!(bytes >= FLOOR.audioBytes)) return { ok: false, why: `只有 ${bytes} 字节（绝对下限 ${FLOOR.audioBytes}）` };
  if (seconds && seconds > 0) {
    const kbps = bytes / seconds / KB;
    if (kbps < FLOOR.audioKBps) {
      return { ok: false, why: `码率 ${kbps.toFixed(2)} KB/s（下限 ${FLOOR.audioKBps}）—— ${seconds} 秒的音频不该只有 ${bytes} 字节` };
    }
    return { ok: true, kbps };
  }
  return { ok: true, kbps: null };
}

module.exports = { FLOOR, videoFloorOk, audioFloorOk, KB };
