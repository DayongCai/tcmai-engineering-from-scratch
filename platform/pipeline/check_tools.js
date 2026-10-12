#!/usr/bin/env node
/**
 * platform/pipeline/check_tools.js — 探测视频流水线的外部工具链
 *
 *   node platform/pipeline/check_tools.js
 *
 * 不装任何东西，只报告。每个缺失项都给出安装命令。
 * 退出码恒为 0：工具缺失是可接受的降级状态，不是错误。
 */

'use strict';

const { spawnSync } = require('node:child_process');

const TOOLS = [
  {
    name: 'ffmpeg',
    stage: '第 4 段 · 成片编码',
    needed: true,
    install: {
      win32: 'winget install Gyan.FFmpeg   （或 scoop install ffmpeg / choco install ffmpeg）',
      darwin: 'brew install ffmpeg',
      linux: 'sudo apt install ffmpeg',
    },
  },
  {
    name: 'ffprobe',
    stage: '第 4 段 · 时长探测',
    needed: false,
    install: { win32: '随 ffmpeg 一同安装', darwin: '随 ffmpeg 一同安装', linux: '随 ffmpeg 一同安装' },
  },
  {
    name: 'edge-tts',
    stage: '第 4 段 · 旁白配音（可替代）',
    needed: false,
    install: { win32: 'pip install edge-tts', darwin: 'pip install edge-tts', linux: 'pip install edge-tts' },
  },
  {
    name: 'pandoc',
    stage: '[textbooks] · PDF / EPUB 排版',
    needed: false,
    install: {
      win32: 'winget install JohnMacFarlane.Pandoc',
      darwin: 'brew install pandoc',
      linux: 'sudo apt install pandoc',
    },
  },
];

function probe(name) {
  const isWin = process.platform === 'win32';
  const r = spawnSync(isWin ? 'where' : 'which', [name], { encoding: 'utf8', shell: false });
  if (r.status !== 0) return null;
  const first = String(r.stdout || '').split(/\r?\n/).find((l) => l.trim());
  return first ? first.trim() : null;
}

function version(cmd) {
  const r = spawnSync(cmd, ['-version'], { encoding: 'utf8' });
  if (r.status !== 0) return '';
  const line = String(r.stdout || '').split(/\r?\n/)[0] || '';
  return line.slice(0, 72);
}

const platform = process.platform;
const results = TOOLS.map((t) => ({ ...t, path: probe(t.name) }));

console.log('═══ [tcmP] 视频流水线 · 工具链探测 ═══');
console.log(`  平台: ${platform} · Node ${process.version}\n`);

for (const r of results) {
  const ok = Boolean(r.path);
  const tag = ok ? '✅ 可用' : r.needed ? '❌ 缺失（阻断）' : '⬚ 缺失（可降级）';
  console.log(`  ${r.name.padEnd(10)} ${tag}`);
  console.log(`     阶段: ${r.stage}`);
  if (ok) {
    const v = version(r.path);
    if (v) console.log(`     版本: ${v}`);
    console.log(`     路径: ${r.path}`);
  } else {
    console.log(`     安装: ${r.install[platform] || r.install.linux}`);
  }
  console.log('');
}

const blocked = results.filter((r) => r.needed && !r.path);
const degraded = results.filter((r) => !r.needed && !r.path);

console.log('─── 结论 ───');
if (blocked.length === 0) {
  console.log('  ✅ 全部必需工具齐备，四段流水线均可执行');
} else {
  console.log(`  ⚠ 阻断项: ${blocked.map((r) => r.name).join(', ')}`);
  console.log('  → 第 1–3 段（探测 / 讲稿 / 幻灯片）仍可完整执行；');
  console.log('  → 第 4 段（成片）会被 build_video.js 明确拒绝，而不是生成占位文件。');
}
if (degraded.length) {
  console.log(`  ⬚ 降级项: ${degraded.map((r) => `${r.name}(${r.stage})`).join(' · ')}`);
}

process.exit(0);
