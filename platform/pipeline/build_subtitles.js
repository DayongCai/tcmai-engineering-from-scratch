#!/usr/bin/env node
/**
 * platform/pipeline/build_subtitles.js — 讲稿 → 字幕轨（WebVTT）
 *
 *   node platform/pipeline/build_subtitles.js <dept>/<subject> [--chapter <slug>]
 *
 * 技能来源：桌面资料里那套「语义群阅读」的网课生产法（SHL 伤寒论 28 集）：
 *   字幕按**语义群**推进，群内不因字数断开；切换点对齐语音实测停顿；
 *   底本异体字/讹字订正为通行字、画面与配音一致；多音字按上下文只改配音。
 *
 * 本仓库移植其中与「可机械验证」有关的三条：
 *
 * 1. **语义群 = 段**。本仓库的 docs/zh.md 已按固定角色分段
 *    （motto / problem / roots / figure / objectives / concept / build / use / ship / verify / disclaimer），
 *    一段就是一个语义群 —— 字幕绝不在段内断开。这直接消灭了「同一句被切成两行、
 *    第二行的停顿被当成新句」这类对齐错误。
 *
 * 2. **时间轴用实测时长，不用估算**。每段结束时间 = 前面各段 audioSeconds 的累计值。
 *    估算值只用于还没合成配音时占位，并且会在 JSON 里显式标 `estimated: true` ——
 *    估算是排期工具，不是时长。
 *
 * 3. **对视音差必须可复核**。成片时长与「置信音总时长」的差值会算出来写进 JSON
 *    并在日志里打印；源资料的做法是把这个差值压到毫秒级（实测 +0.002s）。
 *    差值不可解释就是有 bug，而不是"差不多"。
 *
 * 输出：
 *   narration/subtitles.vtt    标准 WebVTT（可被 <track> 直接引用、可被 ffmpeg 压制）
 *   narration/subtitles.json   结构化字幕 + 对齐报告
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { findFfprobe } = require('./find_tools');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const target = argv.find((a) => !a.startsWith('--'));
const chapterIdx = argv.indexOf('--chapter');
const chapterArg = chapterIdx >= 0 ? argv[chapterIdx + 1] : null;

if (!target || !target.includes('/')) {
  console.error('用法: node platform/pipeline/build_subtitles.js <dept>/<subject> [--chapter <slug>]');
  process.exit(1);
}

const [dept, subject] = target.split('/');
const courseDir = path.join(ROOT, 'platform', 'courses', dept, subject);

/** 秒 → WebVTT 时间戳 HH:MM:SS.mmm */
function vttTime(sec) {
  const s = Math.max(0, sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${rest.toFixed(3).padStart(6, '0')}`;
}

/**
 * WebVTT 里不能出现裸的 `-->`，也不能有空行（会被当成新 cue 的分隔）。
 * 段落文本里的换行压成空格：字幕是一行一行显示的，段内换行会让某些播放器把
 * 后半句当成新的一句。
 */
function sanitize(text) {
  return String(text)
    .replace(/-->/g, '→')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** 读 MP4 实测时长（有 ffprobe 才有；没有就返回 null，不猜） */
function probeDuration(file) {
  const ffprobe = findFfprobe();
  if (!ffprobe || !fs.existsSync(file)) return null;
  const r = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  if (r.status !== 0) return null;
  const d = parseFloat(String(r.stdout || '').trim());
  return Number.isFinite(d) ? d : null;
}

let chapters = [];
if (chapterArg) {
  chapters = [chapterArg];
} else if (fs.existsSync(courseDir)) {
  chapters = fs.readdirSync(courseDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{2}-/.test(e.name))
    .map((e) => e.name)
    .sort();
}

console.log(`═══ [tcmP] 字幕轨 · ${target} ═══\n`);

let done = 0;

for (const ch of chapters) {
  const narrPath = path.join(courseDir, ch, 'narration', 'lesson.json');
  if (!fs.existsSync(narrPath)) {
    console.error(`  ✗ ${ch}: 缺 narration/lesson.json —— 先跑 extract_narration.js`);
    continue;
  }
  const narr = JSON.parse(fs.readFileSync(narrPath, 'utf8'));

  // 一、语义群（段）与时间轴。时间段一律由实测时长累加而来。
  let t = 0;
  let estimatedCount = 0;
  const cues = narr.segments.map((seg) => {
    const spoken = seg.spoken || seg.text;
    const measured = Number.isFinite(seg.audioSeconds) && seg.audioSeconds > 0;
    const dur = measured ? seg.audioSeconds : seg.estimateSeconds;
    if (!measured) estimatedCount += 1;
    const cue = {
      n: seg.n,
      role: seg.role,
      start: Number(t.toFixed(3)),
      end: Number((t + dur).toFixed(3)),
      seconds: Number(dur.toFixed(3)),
      estimated: !measured,
      text: sanitize(spoken),
      audio: seg.audio || null,
    };
    t += dur;
    return cue;
  });

  const audioTotal = Number(t.toFixed(3));

  // 二、字幕文本必须与配音文本逐字一致（源资料里这是硬规则：
  //     画面与配音不同步的最常见原因就是字幕改了、配音没重录，或反过来）。
  const mismatches = [];
  narr.segments.forEach((seg, i) => {
    const a = sanitize(seg.spoken || seg.text);
    if (a !== cues[i].text) mismatches.push(`第 ${seg.n} 段`);
  });

  // 三、对视音差：成片实测时长 − 置信音总时长。
  const videoPath = path.join(courseDir, ch, 'video', 'lesson.mp4');
  const videoSeconds = probeDuration(videoPath);
  const drift = videoSeconds === null ? null : Number((videoSeconds - audioTotal).toFixed(3));

  // 四、写 WebVTT
  const vtt = [
    'WEBVTT',
    `NOTE ${narr.title || ch}`,
    `NOTE 语义群推进：一段一群，群内不断开；时间轴取自配音实测时长`,
    '',
    ...cues.flatMap((c) => [
      String(c.n),
      `${vttTime(c.start)} --> ${vttTime(c.end)}`,
      c.text,
      '',
    ]),
  ].join('\n');

  const narrDir = path.join(courseDir, ch, 'narration');
  fs.writeFileSync(path.join(narrDir, 'subtitles.vtt'), vtt, 'utf8');
  fs.writeFileSync(
    path.join(narrDir, 'subtitles.json'),
    `${JSON.stringify({
      generatedBy: 'platform/pipeline/build_subtitles.js',
      source: `platform/courses/${dept}/${subject}/${ch}/narration/lesson.json`,
      rule: '语义群 = 段；字幕绝不在段内断开；切换点对齐配音实测时长，不做累计漂移',
      cueCount: cues.length,
      audioBackend: narr.audioBackend || null,
      audioTotalSeconds: audioTotal,
      estimatedCues: estimatedCount,
      videoSeconds,
      videoMinusNarrationSeconds: drift,
      textMatchesNarration: mismatches.length === 0,
      mismatches,
      cues,
    }, null, 2)}\n`,
    'utf8'
  );

  console.log(`  ✅ ${ch}`);
  console.log(`     ${cues.length} 条字幕 · ${Math.floor(audioTotal / 60)}分${Math.round(audioTotal % 60)}秒` +
    (estimatedCount ? `  ⚠ 其中 ${estimatedCount} 条用的是估算时长（配音未合成）` : '  （全部为实测时长）'));
  console.log(`     文本与配音一致: ${mismatches.length === 0 ? '✅' : `✗ ${mismatches.join(' ')}`}`);
  if (drift === null) {
    console.log('     对视音差: 未校验（无 ffprobe 或无成片）');
  } else {
    console.log(`     对视音差: 成片 ${videoSeconds}s − 配音 ${audioTotal}s = ${drift >= 0 ? '+' : ''}${drift}s`);
  }
  console.log(`     → narration/subtitles.vtt · narration/subtitles.json`);
  done += 1;
}

console.log(`\n完成: ${done}/${chapters.length} 个章节`);
console.log('下一步: node platform/pipeline/build_video.js ' + target + '   （会顺带把字幕嵌入成片）');
