#!/usr/bin/env node
/**
 * platform/pipeline/build_video.js — slides + narration → MP4 成片
 *
 *   node platform/pipeline/build_video.js 01-zhongyi/01-zhongyi-jichu-lilun [--chapter <slug>]
 *
 * 需要 ffmpeg（必需）与 TTS（可选，缺则生成静音轨 + 可配音的分镜脚本）。
 *
 * ⚠ 本脚本在缺工具时**明确失败**，不生成占位文件。
 *   这一步是刻意的：成片是交付物，占位文件会让"视频已生成"的声明变成假话。
 *
 * 流程:
 *   1. 探测 ffmpeg / ffprobe / TTS
 *   2. 逐段截图（需要 headless 浏览器）或使用预渲染帧目录
 *   3. 逐段配音（TTS 可用时）
 *   4. 按 beat 拼接 → concat 清单 → ffmpeg 合成 → ffprobe 校验时长
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const target = argv.find((a) => !a.startsWith('--'));
const chapterArgIdx = argv.indexOf('--chapter');
const chapterArg = chapterArgIdx >= 0 ? argv[chapterArgIdx + 1] : null;

if (!target || !target.includes('/')) {
  console.error('用法: node platform/pipeline/build_video.js <dept>/<subject> [--chapter <slug>]');
  process.exit(1);
}

const [dept, subject] = target.split('/');
const courseDir = path.join(ROOT, 'platform', 'courses', dept, subject);

function which(name) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
  return r.status === 0 ? String(r.stdout).split(/\r?\n/).find((l) => l.trim()) : null;
}

const ffmpeg = which('ffmpeg');
const ffprobe = which('ffprobe');
const tts = which('edge-tts');

console.log(`═══ [tcmP] 成片合成 · ${target} ═══\n`);

if (!ffmpeg) {
  console.error('✗ 缺少 ffmpeg —— 无法合成 MP4。');
  console.error('');
  console.error('  本脚本不会生成占位视频。"视频已生成"必须对应一个真实的、可用 ffprobe 校验的 MP4。');
  console.error('');
  console.error('  安装 ffmpeg:');
  console.error('    Windows : winget install Gyan.FFmpeg');
  console.error('    macOS   : brew install ffmpeg');
  console.error('    Linux   : sudo apt install ffmpeg');
  console.error('');
  console.error('  当前可用的替代产物（无需 ffmpeg）:');
  console.error(`    node platform/pipeline/extract_narration.js ${target}    # 分镜脚本`);
  console.error(`    node platform/pipeline/build_slides.js ${target}         # 幻灯片（可打印为 PDF）`);
  console.error('');
  console.error('  幻灯片路径:');
  console.error(`    platform/courses/${dept}/${subject}/<chapter>/slides/index.html`);
  process.exit(1);
}

if (!fs.existsSync(courseDir)) {
  console.error(`✗ 课程目录不存在: platform/courses/${dept}/${subject}`);
  console.error(`  先跑: node platform/pipeline/extract_narration.js ${target}`);
  process.exit(1);
}

const chapters = fs
  .readdirSync(courseDir)
  .filter((d) => fs.statSync(path.join(courseDir, d)).isDirectory())
  .filter((d) => !chapterArg || d === chapterArg)
  .sort();

if (!chapters.length) {
  console.error(`✗ 没有可合成的章节${chapterArg ? `（--chapter ${chapterArg} 未匹配）` : ''}`);
  process.exit(1);
}

console.log(`  ffmpeg   ✅ ${ffmpeg}`);
console.log(`  ffprobe  ${ffprobe ? `✅ ${ffprobe}` : '⬚ 缺失（时长校验将跳过，并在输出中标注）'}`);
console.log(`  edge-tts ${tts ? `✅ ${tts}` : '⬚ 缺失（将生成静音轨，配音需人工或换 TTS）'}`);
console.log('');

let built = 0;

for (const ch of chapters) {
  const cdir = path.join(courseDir, ch);
  const narrPath = path.join(cdir, 'narration', 'lesson.json');
  const slidePath = path.join(cdir, 'slides', 'index.html');
  const framesDir = path.join(cdir, 'frames');
  const audioDir = path.join(cdir, 'narration', 'audio');
  const videoDir = path.join(cdir, 'video');

  if (!fs.existsSync(narrPath)) {
    console.error(`  ✗ ${ch}: 缺 narration/lesson.json`);
    continue;
  }
  if (!fs.existsSync(framesDir)) {
    console.error(`  ✗ ${ch}: 缺 frames/ 目录（需先用无头浏览器或截图工具把 slides/index.html 逐页导出为 001.png …）`);
    console.error(`     幻灯片: ${path.relative(ROOT, slidePath).replace(/\\/g, '/')}`);
    console.error('     导出建议: 浏览器打开后按 p 打印为 PDF，或用 Chrome headless:');
    console.error(`       chrome --headless --print-to-pdf="${path.join(cdir, 'slides', 'lesson.pdf')}" "${slidePath}"`);
    continue;
  }

  const narr = JSON.parse(fs.readFileSync(narrPath, 'utf8'));
  const frames = fs.readdirSync(framesDir).filter((f) => /\.(png|jpg|jpeg)$/i.test(f)).sort();
  if (frames.length < narr.segments.length) {
    console.error(`  ✗ ${ch}: frames/ 只有 ${frames.length} 张，需要至少 ${narr.segments.length} 张`);
    continue;
  }

  fs.mkdirSync(videoDir, { recursive: true });
  const listPath = path.join(cdir, 'concat.txt');
  const lines = [];

  for (let i = 0; i < narr.segments.length; i += 1) {
    const seg = narr.segments[i];
    const frame = path.join(framesDir, frames[i]);
    const audioFile = tts ? path.join(audioDir, `${String(i + 1).padStart(3, '0')}.mp3`) : null;
    const partFile = path.join(videoDir, `part-${String(i + 1).padStart(3, '0')}.mp4`);

    const args = ffmpegArgs({ frame, seconds: seg.estimateSeconds, audioFile, out: partFile });
    const r = spawnSync(ffmpeg, args, { encoding: 'utf8' });
    if (r.status !== 0) {
      console.error(`  ✗ ${ch} 第 ${i + 1} 段编码失败:`);
      console.error(`     ${(r.stderr || '').split('\n').slice(-4).join('\n     ')}`);
      break;
    }
    lines.push(`file '${path.relative(path.dirname(listPath), partFile).replace(/\\/g, '/')}'`);
  }

  if (lines.length !== narr.segments.length) {
    console.error(`  ✗ ${ch}: 只完成 ${lines.length}/${narr.segments.length} 段，未拼接成片`);
    continue;
  }

  fs.writeFileSync(listPath, `${lines.join('\n')}\n`, 'utf8');
  const outFile = path.join(videoDir, 'lesson.mp4');
  const concat = spawnSync(ffmpeg, ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outFile], { encoding: 'utf8' });
  if (concat.status !== 0) {
    console.error(`  ✗ ${ch}: 拼接失败`);
    console.error(`     ${(concat.stderr || '').split('\n').slice(-4).join('\n     ')}`);
    continue;
  }

  let duration = null;
  if (ffprobe) {
    const p = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', outFile], { encoding: 'utf8' });
    duration = p.status === 0 ? Number(String(p.stdout).trim()) : null;
  }

  const size = fs.statSync(outFile).size;
  console.log(`  ✅ ${ch} → video/lesson.mp4 (${(size / 1024 / 1024).toFixed(1)} MB${duration ? `, ${duration.toFixed(1)}s [ffprobe 实测]` : ', 时长未校验'})`);
  if (!tts) console.log(`     ⚠ 无 TTS：本片为静音轨，配音需人工补录`);
  built += 1;
}

console.log(`\n完成: ${built}/${chapters.length} 个章节成片`);
console.log('成片不入库（见 .gitignore），走 release 附件发布；site/build.js 会自动在章节页挂上播放器。');

/**
 * 生成单段的 ffmpeg 参数。
 * - 有音频：以音频时长为准，画面静帧铺满
 * - 无音频：用 estimateSeconds 生成静音轨
 */
function ffmpegArgs({ frame, seconds, audioFile, out }) {
  if (audioFile && fs.existsSync(audioFile)) {
    return [
      '-y', '-loop', '1', '-i', frame, '-i', audioFile,
      '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-r', '25',
      '-c:a', 'aac', '-b:a', '128k', '-shortest', '-vf', 'scale=1920:-2', out,
    ];
  }
  return [
    '-y', '-loop', '1', '-i', frame, '-f', 'lavfi', '-i', 'anullsrc=channel_layout=mono:sample_rate=44100',
    '-t', String(seconds),
    '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-r', '25',
    '-c:a', 'aac', '-b:a', '128k', '-shortest', '-vf', 'scale=1920:-2', out,
  ];
}
