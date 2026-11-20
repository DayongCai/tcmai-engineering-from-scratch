#!/usr/bin/env node
/**
 * platform/pipeline/synthesize_narration.js — 讲稿 → 配音文件（narration/audio/NNN.mp3）
 *
 *   node platform/pipeline/synthesize_narration.js <dept>/<subject> [--chapter <slug>] [--force]
 *
 * 为什么有降级链:
 *   成片流水线里最脆的一环是 TTS。云端 TTS 需要 key；edge-tts 需要 python，
 *   而且它的接口会随微软改签名而 403。这些都跟「内容写得好不好」无关，
 *   却会整体卡住成片。所以这里按可用性依次尝试，并把「用了哪条链」明确打出来 ——
 *   否则你听到的配音是真人、SAPI 还是云端，事后无从分辨。
 *
 * 后端优先级:
 *   1. edge-tts   —— 音质最好，需要 python + edge-tts
 *   2. sapi       —— Windows 内置离线语音（System.Speech, zh-CN 语音如 Microsoft Huihui）
 *   3. 失败       —— 明确报错并给出补救命令，不写占位音频
 *
 * 输出一律 mp3（有 ffmpeg 时转码；无 ffmpeg 时保留 wav 并提示）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { findFfmpeg, findFfprobe } = require('./find_tools');

const ROOT = path.resolve(__dirname, '..', '..');
const argv = process.argv.slice(2);
const target = argv.find((a) => !a.startsWith('--'));
const chapterIdx = argv.indexOf('--chapter');
const chapterArg = chapterIdx >= 0 ? argv[chapterIdx + 1] : null;
const force = argv.includes('--force');

if (!target || !target.includes('/')) {
  console.error('用法: node platform/pipeline/synthesize_narration.js <dept>/<subject> [--chapter <slug>] [--force]');
  process.exit(1);
}

const [dept, subject] = target.split('/');
const courseDir = path.join(ROOT, 'platform', 'courses', dept, subject);

// ── 后端探测 ────────────────────────────────────────────────────────────

function which(name) {
  const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', [name], { encoding: 'utf8' });
  return r.status === 0 ? String(r.stdout).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0] : null;
}

function ps(script) {
  return spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
}

/** Windows 内置离线语音：查是否装了中文语音 */
function detectSapi() {
  if (process.platform !== 'win32') return null;
  const r = ps(
    'Add-Type -AssemblyName System.Speech; ' +
    '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; ' +
    '$s.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { ' +
    '  $i = $_.VoiceInfo; if ($i.Culture.Name -like "zh*") { Write-Output $i.Name } }'
  );
  if (r.status !== 0) return null;
  const name = String(r.stdout).split(/\r?\n/).map((l) => l.trim()).filter(Boolean)[0];
  return name ? { voice: name } : null;
}

const edgeTts = which('edge-tts');
const sapi = detectSapi();
const ffmpeg = findFfmpeg();

let backend = null;
if (edgeTts) backend = { kind: 'edge', label: `edge-tts (${edgeTts})` };
else if (sapi) backend = { kind: 'sapi', label: `Windows SAPI 离线语音 · ${sapi.voice}` };

console.log(`═══ [tcmP] 配音合成 · ${target} ═══\n`);
console.log(`  ffmpeg   ${ffmpeg ? '✅ ' + ffmpeg : '⬚ 缺失（将输出 wav，不转 mp3）'}`);
console.log(`  edge-tts ${edgeTts ? '✅ ' + edgeTts : '⬚ 缺失'}`);
console.log(`  sapi     ${sapi ? '✅ ' + sapi.voice : '⬚ 不可用（非 Windows 或未装中文语音）'}`);

if (!backend) {
  console.error('\n  ✗ 没有任何可用的 TTS 后端。配音无法生成。');
  console.error('    任选一种：');
  console.error('      winget install --id Python.Python.3.12  然后  pip install edge-tts');
  console.error('      Windows 设置 → 时间和语言 → 语音 → 添加「中文(简体，中国)」语音包');
  console.error('    也可以人工录音，按 001.mp3、002.mp3 … 放进 narration/audio/ 即可被成片脚本采用。');
  process.exit(1);
}
console.log(`\n  使用后端: ${backend.label}\n`);

// ── 合成单段 ────────────────────────────────────────────────────────────

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tcmai-tts-'));

function synthEdge(text, outWav) {
  // edge-tts 只能输出 mp3；先出 mp3，后续若需转码由 ffmpeg 处理
  // timeout 必给：edge-tts 在远端掐断时会**无限挂着**（2026-11-18 实测：第 4 章第 5 段
  // 挂 20 分钟不返回，整批 58 章就停在那里）。超时被杀 → 走下面的重试 / SAPI 降级，
  // 而不是让一条挂死的子进程拖住整批。
  const r = spawnSync(edgeTts, [
    '--voice', 'zh-CN-XiaoxiaoNeural',
    '--text', text,
    '--write-media', outWav,
  ], { encoding: 'utf8', timeout: 150000 });
  // 退出码 0 不等于出了音频：实测过 edge-tts 远端断开仍 exit 0、留下 0 字节文件，
  // 后续 ffprobe 拿不到时长，字幕层只好按字数猜——所以这里必须验体积。
  if (r.error || r.status !== 0) {
    // 把 stderr 尾巴带出来：之前只打「合成失败」，遇到整章 0 秒时无从判断是网络、限流还是文本问题
    const tail = String(r.stderr || r.error?.message || '').trim().split('\n').slice(-2).join(' | ');
    if (tail) console.error(`     · edge-tts: ${tail}`);
    return false;
  }
  try {
    return fs.statSync(outWav).size >= 1024;
  } catch {
    return false;
  } finally {
    // 失败时把 0 字节残留删掉：留着它会让 build_video 读到「Invalid data」，
    // 而人看到的是一个「存在但打不开」的 mp3（这比缺文件更难查）。
    try {
      if (fs.statSync(outWav).size < 1024) fs.unlinkSync(outWav);
    } catch { /* 没生成过就算了 */ }
  }
}

function synthSapi(text, outWav) {
  // 文本走临时文件传递，避免命令行引号/换行带来的转义地狱（中文尤其容易踩）
  const txtFile = path.join(tmpDir, `${path.basename(outWav)}.txt`);
  fs.writeFileSync(txtFile, text, 'utf8');
  const script =
    'Add-Type -AssemblyName System.Speech; ' +
    `$t = Get-Content -Raw -Encoding UTF8 -LiteralPath '${txtFile.replace(/'/g, "''")}'; ` +
    '$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; ' +
    `$s.SelectVoice('${sapi.voice.replace(/'/g, "''")}'); ` +
    // Rate -2：教材旁白的语速要能跟得上画面，默认语速念「阴阳学说」这类术语偏快
    '$s.Rate = -2; $s.Volume = 100; ' +
    `$s.SetOutputToWaveFile('${outWav.replace(/'/g, "''")}'); ` +
    '$s.Speak($t); $s.SetOutputToNull(); $s.Dispose();';
  const r = ps(script);
  if (r.status !== 0) {
    if (r.stderr) process.stderr.write(String(r.stderr).split('\n').slice(0, 3).join('\n') + '\n');
    return false;
  }
  return fs.existsSync(outWav) && fs.statSync(outWav).size > 1024;
}

/** wav → mp3（有 ffmpeg 才做；转码失败则保留 wav，不假装成功） */
function toMp3(wav, mp3) {
  if (!ffmpeg) return null;
  const r = spawnSync(ffmpeg, ['-v', 'error', '-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '96k', mp3], { encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(mp3)) return null;
  return mp3;
}

/**
 * 读音频真实时长。
 *
 * 注意必须用 ffprobe：`ffmpeg -show_entries ...` 不是合法调用，它会静默失败，
 * 于是所有时长都变成 null，而日志只显示「时长未知」——看起来像「探测功能没实现」，
 * 实际是「调错了工具」。这类错误不会报错，只会让下游悄悄降级。
 */
function probeDuration(file) {
  const ffprobe = findFfprobe();
  if (!ffprobe) return NaN;
  const r = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  if (r.status !== 0) return NaN;
  return parseFloat(String(r.stdout || '').trim());
}

// ── 主流程 ──────────────────────────────────────────────────────────────

let chapters = [];
if (chapterArg) {
  chapters = [chapterArg];
} else {
  const chaptersDir = path.join(courseDir);
  if (!fs.existsSync(chaptersDir)) {
    console.error(`  ✗ 课程目录不存在: ${chaptersDir}`);
    process.exit(1);
  }
  chapters = fs.readdirSync(chaptersDir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /^\d{2}-/.test(e.name))
    .map((e) => e.name)
    .sort();
}

let done = 0;
let totalSec = 0;

for (const ch of chapters) {
  const narrPath = path.join(courseDir, ch, 'narration', 'lesson.json');
  if (!fs.existsSync(narrPath)) {
    console.error(`  ✗ ${ch}: 缺 narration/lesson.json —— 先跑 extract_narration.js`);
    continue;
  }
  const narr = JSON.parse(fs.readFileSync(narrPath, 'utf8'));
  const audioDir = path.join(courseDir, ch, 'narration', 'audio');
  fs.mkdirSync(audioDir, { recursive: true });

  console.log(`  ${ch} — ${narr.segments.length} 段`);
  let made = 0;
  let skipped = 0;
  let failed = 0;
  // 按章清零：写过累计值，整册跑时第 N 章的实测时长会变成前 N 章之和
  let chapterSec = 0;

  for (const seg of narr.segments) {
    const nnn = String(seg.n).padStart(3, '0');
    const mp3 = path.join(audioDir, `${nnn}.mp3`);
    const wav = path.join(tmpDir, `${ch}-${nnn}.wav`);

    const existingOk = [mp3, path.join(audioDir, `${nnn}.wav`)].find((p) => {
      try { return fs.statSync(p).size >= 1024; } catch { return false; }
    });
    if (!force && existingOk) {
      // 跳过不等于不计时：只累加新合成的秒数会让总时长归零（重跑一次就把实测值冲成 0）。
      // 所以跳过也要 ffprobe 一遍已存在的文件，把时长补进 totalSec。
      const existing = existingOk;
      const dur = probeDuration(existing);
      if (Number.isFinite(dur)) chapterSec += dur;
      seg.audio = path.basename(existing);
      seg.audioSeconds = Number.isFinite(dur) ? Number(dur.toFixed(2)) : seg.audioSeconds ?? null;
      skipped += 1;
      continue;
    }

    // spoken 优先；缺失说明讲稿是旧版产物，退回 text 是显式降级，不是静默行为
    const text = seg.spoken || seg.text;
    if (!seg.spoken) console.log(`     ⚠ 第 ${seg.n} 段无 spoken 字段（旧版讲稿），用 text 合成`);

    // edge-tts 偶发「exit 0 但 0 字节」（远端断开）：同一次跑里就地重试一次，
    // 否则整册批量会卡在某一段，人得手动删文件重跑（05-qi-xue-jin-ye 就是这么卡的）。
    let ok = backend.kind === 'edge' ? synthEdge(text, mp3) : synthSapi(text, wav);
    if (!ok) {
      console.log(`     ↻ 第 ${seg.n} 段首次失败，重试一次`);
      ok = backend.kind === 'edge' ? synthEdge(text, mp3) : synthSapi(text, wav);
    }
    if (!ok) {
      console.error(`     ✗ 第 ${seg.n} 段合成失败`);
      failed += 1;
      continue;
    }

    if (backend.kind === 'sapi') {
      const converted = toMp3(wav, mp3);
      if (!converted) {
        fs.copyFileSync(wav, path.join(audioDir, `${nnn}.wav`));
        console.log(`     ⚠ 第 ${seg.n} 段已合成 wav（无 ffmpeg，未转 mp3）`);
      }
    }

    // 用 ffprobe 拿真实时长——只有真实时长才能进字幕与进度条
    const target_file = fs.existsSync(mp3) ? mp3 : path.join(audioDir, `${nnn}.wav`);
    const dur = probeDuration(target_file);
    if (Number.isFinite(dur)) chapterSec += dur;

    seg.audio = path.basename(target_file);
    seg.audioSeconds = Number.isFinite(dur) ? Number(dur.toFixed(2)) : null;
    made += 1;

    const size = (fs.statSync(target_file).size / 1024).toFixed(0);
    console.log(`     ${nnn}.${path.extname(target_file).slice(1)}  ${(dur ? dur.toFixed(1) + 's' : '时长未知').padStart(7)}  ${size.padStart(5)} KB`);
  }

  // 补洞：个别段在合成瞬间 ffprobe 可能瞬时失败（并发跑两个进程时见过），
  // audioSeconds 会是 null —— 字幕层再探一次就能拿到，两边于是对不上。
  // 这里统一重探一遍，仍然拿不到就计为失败，不许留 null 混进总时长。
  for (const seg of narr.segments) {
    if (seg.audioSeconds !== null && seg.audioSeconds !== undefined) continue;
    const nnn = String(seg.n).padStart(3, '0');
    const f = [path.join(audioDir, `${nnn}.mp3`), path.join(audioDir, `${nnn}.wav`)].find((p) => fs.existsSync(p));
    const dur = f ? probeDuration(f) : NaN;
    if (Number.isFinite(dur)) {
      seg.audio = path.basename(f);
      seg.audioSeconds = Number(dur.toFixed(2));
      chapterSec += dur;
      console.log(`     ↩ 第 ${seg.n} 段补探时长 ${dur.toFixed(1)}s`);
    } else {
      failed += 1;
      console.error(`     ✗ 第 ${seg.n} 段无可用时长（文件${f ? '在' : '缺失'}）`);
    }
  }

  // 收尾清扫：把本章 <1 KB 的 mp3 删掉。
  // 为什么不在失败当场删就够了：edge-tts 被 timeout 杀掉后仍会留下 0 字节文件，
  // 而删除时刻可能早于它落盘（实测 03-fangfa-xiaorong 的 004/005 就是这样漏下的）。
  // 留着它们，下一轮 build_video 会读到「Invalid data」——一个「存在但打不开」的假配音。
  let swept = 0;
  for (const f of fs.readdirSync(audioDir)) {
    if (!f.endsWith('.mp3')) continue;
    const p = path.join(audioDir, f);
    try {
      if (fs.statSync(p).size < 1024) { fs.unlinkSync(p); swept += 1; }
    } catch { /* 并发删掉了 */ }
  }
  if (swept) console.log(`     ⚠ 清掉 ${swept} 个空/损坏的 mp3（<1 KB）`);

  // 回填真实时长到讲稿（估算值保留，便于对照）
  narr.audioBackend = backend.label;
  narr.audioMeasuredSeconds = Number(chapterSec.toFixed(2));
  totalSec += chapterSec;
  narr.estimateVsActual = 'estimateSeconds 为排期估算；audioSeconds 为合成实测，成片时长由后者决定';
  fs.writeFileSync(narrPath, `${JSON.stringify(narr, null, 2)}\n`, 'utf8');

  console.log(`     → 新合成 ${made} · 跳过 ${skipped} · 失败 ${failed}`);
  if (failed === 0) done += 1;
}

console.log(`\n完成: ${done}/${chapters.length} 个章节`);
if (totalSec > 0) {
  console.log(`实测配音总时长: ${Math.floor(totalSec / 60)}分${Math.round(totalSec % 60)}秒`);
}
console.log('下一步: node platform/pipeline/build_video.js ' + target);
