#!/usr/bin/env node
/**
 * scripts/asr/merge_chunks.js —— 把分段转写合并成整讲转写（带绝对时间）
 *
 *   node scripts/asr/merge_chunks.js <slug>
 *
 * 输入：$LOCALAPPDATA/Temp/asr/<slug>/chunk-*.json（transcribe.py 产物，含 audioSec）
 * 输出：standards/materials/<slug>/sources/asr/<slug>.json
 *
 * 口径：
 *   · 偏移量按前序 chunk 的 audioSec 累加（不是按 CHUNK 常量），末段短也无误差。
 *   · 段文本原样拼接，不改写、不纠错 —— 纠错另走 corrections 流程。
 *   · 缺 chunk 就报错退出：宁可不合，不给一份缺段的「完整转写」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const slug = process.argv[2];
if (!slug) {
  console.error('用法: node scripts/asr/merge_chunks.js <slug>');
  process.exit(2);
}

const WORK = path.join(process.env.LOCALAPPDATA || '', 'Temp', 'asr', slug);
const OUTDIR = path.join(ROOT, 'standards', 'materials', slug, 'sources', 'asr');

if (!fs.existsSync(WORK)) {
  console.error(`找不到分段目录：${WORK}`);
  process.exit(1);
}

const files = fs.readdirSync(WORK).filter((f) => /^chunk-\d+\.json$/.test(f)).sort();
if (!files.length) {
  console.error('没有 chunk-*.json，先跑转写');
  process.exit(1);
}

// 连续性检查：chunk 编号必须从 000 开始连续
const nums = files.map((f) => Number(f.match(/chunk-(\d+)\.json/)[1]));
nums.forEach((n, i) => {
  if (n !== i) {
    console.error(`分段不连续：缺 chunk-${String(i).padStart(3, '0')}.json（有 ${n}）`);
    process.exit(1);
  }
});

let offset = 0;
let audioSec = 0;
let wallSec = 0;
const segments = [];
const chunkMeta = [];

for (const f of files) {
  const j = JSON.parse(fs.readFileSync(path.join(WORK, f), 'utf8'));
  for (const s of j.segments) {
    segments.push({ start: Number((s.start + offset).toFixed(2)), end: Number((s.end + offset).toFixed(2)), text: s.text });
  }
  chunkMeta.push({ file: f, audioSec: j.audioSec, wallSec: j.wallSec, segs: j.segments.length });
  offset += j.audioSec;
  audioSec += j.audioSec;
  wallSec += j.wallSec || 0;
}

const out = {
  slug,
  source: path.join('sources', 'asr'),
  model: 'faster-whisper-turbo (int8, cpu)',
  language: 'zh',
  counts: { chunks: files.length, segments: segments.length, chars: segments.reduce((a, s) => a + s.text.length, 0) },
  audioSec: Number(audioSec.toFixed(1)),
  wallSec: Number(wallSec.toFixed(1)),
  speed: wallSec ? Number((audioSec / wallSec).toFixed(2)) : null,
  chunks: chunkMeta,
  segments,
};

fs.mkdirSync(OUTDIR, { recursive: true });
fs.writeFileSync(path.join(OUTDIR, `${slug}.json`), JSON.stringify(out, null, 1), 'utf8');

console.log(`${slug}: ${files.length} 段/chunk · ${segments.length} 句 · ${out.counts.chars} 字 · 音频 ${(audioSec / 3600).toFixed(2)}h · 用时 ${(wallSec / 3600).toFixed(2)}h · ${out.speed}×`);
console.log(`→ ${path.relative(ROOT, path.join(OUTDIR, `${slug}.json`))}`);
