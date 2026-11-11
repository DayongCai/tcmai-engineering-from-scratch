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
const tools = require('./find_tools');

const TOOLS = [
  {
    name: 'ffmpeg',
    stage: '第 4 段 · 成片编码',
    needed: true,
    find: tools.findFfmpeg,
    install: {
      win32: 'winget install Gyan.FFmpeg（github.com 被墙时改用 gh-proxy 镜像，见 platform/README.md「ffmpeg 装不上怎么办」）',
      darwin: 'brew install ffmpeg',
      linux: 'sudo apt install ffmpeg',
    },
  },
  {
    name: 'ffprobe',
    stage: '第 4 段 · 时长探测',
    needed: false,
    find: tools.findFfprobe,
    install: { win32: '随 ffmpeg 一同安装', darwin: '随 ffmpeg 一同安装', linux: '随 ffmpeg 一同安装' },
  },
  {
    name: 'headless-browser',
    stage: '第 3.5 段 · 画面帧导出（Edge / Chrome）',
    needed: true,
    find: tools.findBrowser,
    install: {
      win32: 'Edge 随 Windows 预装；或 winget install Google.Chrome',
      darwin: 'brew install --cask google-chrome',
      linux: 'sudo apt install chromium',
    },
  },
  {
    name: 'tts',
    stage: '第 3 段 · 配音合成',
    needed: false,
    find: () => tools.findTtsBackend().path,
    note: () => tools.findTtsBackend().label,
    installed_ok: true,   // 只要有任何一条 TTS 链可用就算可用（含离线语音）
    install: {
      win32: '两条链任选：pip install edge-tts（需 python），或装 Windows 中文语音包（设置 → 时间和语言 → 语音）',
      darwin: 'pip install edge-tts',
      linux: 'pip install edge-tts',
    },
  },
  {
    name: 'pandoc',
    stage: '[textbooks] · PDF / EPUB 排版',
    needed: false,
    find: tools.findPandoc,
    install: {
      win32: 'winget install JohnMacFarlane.Pandoc',
      darwin: 'brew install pandoc',
      linux: 'sudo apt install pandoc',
    },
  },
  {
    // 图的两条链各管一类：matplotlib 管数据图（.py），mermaid 管结构图（.mmd）。
    // 两者都不是教材正文的必需项 —— 没有图的书仍然是书，所以说 needed:false。
    name: 'matplotlib',
    stage: '[textbooks] · 数据图（figures/*.py）',
    needed: false,
    find: () => {
      const m = tools.probeMatplotlib();
      return m ? m.path : null;
    },
    note: () => {
      const m = tools.probeMatplotlib();
      return m ? `matplotlib ${m.version}` : '';
    },
    install: {
      win32: 'python -m pip install matplotlib -i https://mirrors.aliyun.com/pypi/simple/',
      darwin: 'pip3 install matplotlib',
      linux: 'pip3 install matplotlib',
    },
  },
  {
    name: 'mermaid',
    stage: '[textbooks] · 结构图（figures/*.mmd）',
    needed: false,
    find: () => {
      const p = require('node:path').join(__dirname, '..', '..', 'scripts', 'figures', 'vendor', 'mermaid.min.js');
      return require('node:fs').existsSync(p) ? p : null;
    },
    note: () => '10.9.1 · vendor 内置，借 Edge/Chrome 无头渲染',
    install: {
      win32: 'curl -sSL -o scripts/figures/vendor/mermaid.min.js https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js',
      darwin: '同上（见 textbooks/FIGURES.md）',
      linux: '同上（见 textbooks/FIGURES.md）',
    },
  },
];

function version(cmd) {
  // 非可执行文件（如 TTS 后端名）不尝试 -version，避免把语音名当成命令跑
  if (!cmd || !/\.exe$|ffmpeg|ffprobe|pandoc|msedge|chrome|edge-tts$/i.test(cmd)) return '';
  const r = spawnSync(cmd, ['-version'], { encoding: 'utf8' });
  if (r.status !== 0) return '';
  const line = String(r.stdout || '').split(/\r?\n/)[0] || '';
  return line.slice(0, 72);
}

const platform = process.platform;
const results = TOOLS.map((t) => ({ ...t, path: t.find() }));

console.log('═══ [tcmP] 视频流水线 · 工具链探测 ═══');
console.log(`  平台: ${platform} · Node ${process.version}\n`);

for (const r of results) {
  const ok = Boolean(r.path);
  const tag = ok ? '✅ 可用' : r.needed ? '❌ 缺失（阻断）' : '⬚ 缺失（可降级）';
  console.log(`  ${r.name.padEnd(10)} ${tag}`);
  console.log(`     阶段: ${r.stage}`);
  if (ok) {
    const v = ['headless-browser', 'matplotlib'].includes(r.name) ? '' : version(r.path);
    if (v) console.log(`     版本: ${v}`);
    console.log(`     路径: ${r.path}`);
    if (r.note) console.log(`     后端: ${r.note()}`);
  } else {
    console.log(`     安装: ${r.install[platform] || r.install.linux}`);
  }
  console.log('');
}

const blocked = results.filter((t) => t.needed && !t.path);
const degraded = results.filter((t) => !t.needed && !t.path);

console.log('─── 结论 ───');
if (blocked.length === 0) {
  console.log('  ✅ 全部必需工具齐备，流水线六个阶段均可执行');
} else {
  console.log(`  ⚠ 阻断项: ${blocked.map((t) => t.name).join(', ')}`);
  console.log('  → 缺 headless-browser 时无法导出画面帧');
  console.log('  → 缺 ffmpeg 时无法合成 MP4（build_video.js 会明确拒绝，而不是生成占位文件）');
}
if (degraded.length) {
  console.log(`  ⬚ 降级项: ${degraded.map((r) => `${r.name}(${r.stage})`).join(' · ')}`);
}

process.exit(0);
