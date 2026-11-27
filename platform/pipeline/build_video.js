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

const { findFfmpeg, findFfprobe, findTtsBackend } = require('./find_tools');

const ffmpeg = findFfmpeg();
const ffprobe = findFfprobe();
const ttsBackend = findTtsBackend();

console.log(`═══ [tcmP] 成片合成 · ${target} ═══\n`);

if (!ffmpeg) {
  console.error('✗ 缺少 ffmpeg —— 无法合成 MP4。');
  console.error('');
  console.error('  本脚本不会生成占位视频。"视频已生成"必须对应一个真实的、可用 ffprobe 校验的 MP4。');
  console.error('');
  console.error('  安装 ffmpeg:');
  console.error('    Windows : winget install Gyan.FFmpeg');
  console.error('              （本机实测：winget 会从 github.com 拉包，若被墙会报');
  console.error('               InternetOpenUrl() failed 0x80072efd，改用 gh-proxy 镜像，');
  console.error('               完整步骤见 platform/README.md「ffmpeg 装不上怎么办」）');
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
console.log(`  tts      ${ttsBackend.kind ? `✅ ${ttsBackend.label}` : `⬚ ${ttsBackend.label}`}  （配音在上一段合成，这里只消费 narration/audio/）`);
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
    console.error(`  ✗ ${ch}: 缺 frames/ 目录 —— 先用无头浏览器逐张导出画面帧`);
    console.error(`     node platform/pipeline/render_frames.js ${dept}/${subject} --chapter ${ch}`);
    console.error(`     幻灯片: ${path.relative(ROOT, slidePath).replace(/\\/g, '/')}`);
    console.error('     截图器会生成 frames/001.png … 每段一张，尺寸 1920×1080');
    continue;
  }

  const narr = JSON.parse(fs.readFileSync(narrPath, 'utf8'));
  const frames = fs.readdirSync(framesDir).filter((f) => /\.(png|jpg|jpeg)$/i.test(f)).sort();
  // 拆片之后「片数 ≠ 段数」：靠 slides/manifest.json 把每一段映射到它的若干张片，
  // 否则第 i 段会配到第 i 张片（内容整体错位，而且错得很像真的）。
  const manifestPath = path.join(cdir, 'slides', 'manifest.json');
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : null;
  const needFrames = manifest ? manifest.slideCount : narr.segments.length;
  if (frames.length < needFrames) {
    console.error(`  ✗ ${ch}: frames/ 只有 ${frames.length} 张，需要至少 ${needFrames} 张`);
    continue;
  }
  const slidesOf = (segNo) => {
    if (!manifest) return [frames[segNo - 1]];
    return manifest.slides.filter((x) => x.segment === segNo).map((x) => frames[x.n - 1]).filter(Boolean);
  };
  const charsOf = (segNo) => {
    if (!manifest) return 1;
    return manifest.slides.filter((x) => x.segment === segNo).reduce((a, x) => a + (x.chars || 1), 0);
  };

  fs.mkdirSync(videoDir, { recursive: true });
  const listPath = path.join(cdir, 'concat.txt');
  // 先清掉上一轮的分片：讲稿段数变少时（如 14 段 → 12 段），多出来的 part-013/014
  // 会留在目录里——成片只拼前 12 段，看着正常，但「分片数 = 段数」的门会判红，
  // 而且下次别人按目录内容排查会以为成片有 14 段。
  {
    const stale = fs.readdirSync(videoDir).filter((f) => /^part-\d{3}\.mp4$/.test(f));
    for (const f of stale) {
      try { fs.unlinkSync(path.join(videoDir, f)); } catch { /* 占用就留着，下面按段数重建 */ }
    }
  }
  const lines = [];
  let withAudio = 0;

  for (let i = 0; i < narr.segments.length; i += 1) {
    const seg = narr.segments[i];
    const segFrames = slidesOf(i + 1).map((f) => path.join(framesDir, f));
    // 配音文件只要**存在**就用，不关心它是哪个 TTS 产的：
    // 人工录音、edge-tts、SAPI、云端 TTS 都可能落在同一个位置，把「谁产的」写死在判据里
    // 会让非 edge-tts 的配音被静默忽略（然后你会以为配音没生效是 TTS 的问题）。
    // 讲稿里记了 audio 文件名就用它（可区分 wav/mp3），否则按 mp3 → wav 顺序找。
    const candidates = seg.audio
      ? [path.join(audioDir, seg.audio)]
      : [path.join(audioDir, `${String(i + 1).padStart(3, '0')}.mp3`),
         path.join(audioDir, `${String(i + 1).padStart(3, '0')}.wav`)];
    const audioFile = candidates.find((p) => fs.existsSync(p)) || null;
    const hasAudio = Boolean(audioFile);
    if (hasAudio) withAudio += 1;
    const partFile = path.join(videoDir, `part-${String(i + 1).padStart(3, '0')}.mp4`);

    // 时长必须用**实测配音时长**，不能用估算：估算只用于排期，用它定时长会让字幕整体偏移
    // 而且「实测」要以音频文件本身为准（ffprobe），不能信 lesson.json 里的 audioSeconds——
    // 那个字段在旧批次里记的是估算值，会让画面被拉长到估算长度、段尾留一段静音。
    const probeSeconds = hasAudio && ffprobe
      ? Number((spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', audioFile], { encoding: 'utf8' }).stdout || '').trim())
      : NaN;
    const seconds = Number.isFinite(probeSeconds) && probeSeconds > 0
      ? probeSeconds
      : (Number.isFinite(seg.audioSeconds) && seg.audioSeconds > 0 ? seg.audioSeconds : seg.estimateSeconds);
    // 一段配多张片时按时长按字数分摊，片内字幕与画面才对得上
    const totalChars = charsOf(i + 1) || 1;
    const segSlides = manifest ? manifest.slides.filter((x) => x.segment === i + 1) : [];
    const plans = segFrames.length === 1
      ? [{ path: segFrames[0], seconds }]
      : segFrames.map((f, k) => ({
          path: f,
          seconds: Math.max(0.4, (seconds * (segSlides[k] ? segSlides[k].chars : 1)) / totalChars),
        }));
    if (plans.length === 0) {
      // 不能把空数组丢给 ffmpeg：滤镜会拿到 concat=n=0，报
      // 「Value 0.000000 for parameter 'n' out of range」，看着像 ffmpeg 的错，
      // 实际是 slides/manifest.json 没覆盖到这一段（讲稿段数与幻灯片页数不同步）。
      const covered = manifest
        ? Math.max(...manifest.slides.map((x) => x.segment || 0), 0)
        : 0;
      console.error(
        `  ✗ ${ch} 第 ${i + 1} 段无对应画面帧（slides/manifest.json 只覆盖到第 ${covered} 段，` +
        `讲稿 ${narr.segments.length} 段）——先重跑 build_slides.js 再导帧`
      );
      break;
    }
    const args = ffmpegArgs({ frames: plans, seconds, audioFile: hasAudio ? audioFile : null, out: partFile });
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

  // 字幕嵌入：把 narration/subtitles.vtt 作为 mov_text 轨嵌进 MP4。
  // 没有字幕就跳过 —— 但**不静默**：缺字幕是缺一步流水线，得说出来。
  const vttPath = path.join(cdir, 'narration', 'subtitles.vtt');
  let subtitleNote = '无字幕轨';
  if (fs.existsSync(vttPath)) {
    const embedded = path.join(videoDir, 'lesson.with-subs.mp4');
    const r = spawnSync(ffmpeg, [
      '-y', '-i', outFile, '-i', vttPath,
      '-map', '0', '-map', '1', '-c', 'copy', '-c:s', 'mov_text',
      '-metadata:s:s:0', 'language=chi', embedded,
    ], { encoding: 'utf8' });
    if (r.status === 0 && fs.existsSync(embedded)) {
      fs.renameSync(embedded, outFile);
      // 复核：字幕轨必须真的在成片里，不能只相信 ffmpeg 的退出码
      if (ffprobe) {
        const probe = spawnSync(ffprobe, ['-v', 'error', '-select_streams', 's', '-show_entries', 'stream=index,codec_name', '-of', 'csv=p=0', outFile], { encoding: 'utf8' });
        const hasSub = /mov_text|subrip/.test(String(probe.stdout || ''));
        subtitleNote = hasSub ? '已嵌入 mov_text 字幕轨' : '⚠ 字幕嵌入后 ffprobe 未检出字幕轨';
      } else {
        subtitleNote = '已嵌入 mov_text 字幕轨（无 ffprobe，未复核）';
      }
    } else {
      subtitleNote = '⚠ 字幕嵌入失败（成片仍可播放，但不带字幕轨）';
    }
  } else {
    subtitleNote = '无字幕轨（先跑 build_subtitles.js）';
  }

  const size = fs.statSync(outFile).size;
  console.log(`  ✅ ${ch} → video/lesson.mp4 (${(size / 1024 / 1024).toFixed(1)} MB${duration ? `, ${duration.toFixed(1)}s [ffprobe 实测]` : ', 时长未校验'})`);
  console.log(`     💬 ${subtitleNote}`);
  if (withAudio === 0) {
    console.log('     ⚠ 本片为静音轨（narration/audio/ 下没有配音文件）');
    console.log('       配音来源不限：edge-tts、云端 TTS、人工录音都可以，放到 narration/audio/001.mp3 … 即可');
  } else {
    console.log(`     🔊 已配 ${withAudio}/${narr.segments.length} 段旁白`);
  }
  built += 1;
}

console.log(`\n完成: ${built}/${chapters.length} 个章节成片`);
if (built < chapters.length) {
  // 打印「0/N 个章节成片」却 exit 0 = 没有门：批量脚本会把它当成功，继续往下跑，
  // 然后 course.yaml 与台账里留下一条「流水线全绿但没有成片」的糊涂账
  // （2026-11-19 口腔内科学 07-e97 就是这么漏过去的：001.mp3 是 0 字节，ffmpeg 报 Invalid data）。
  console.error(`✗ ${chapters.length - built} 章未出成片 —— 失败原因见上方各章日志`);
  console.log('成片不入库（见 .gitignore），走 release 附件发布；site/build.js 会自动在章节页挂上播放器。');
  process.exit(1);
}
console.log('成片不入库（见 .gitignore），走 release 附件发布；site/build.js 会自动在章节页挂上播放器。');

/**
 * 生成单段的 ffmpeg 参数。
 *
 * **必须显式 `-t seconds`，不能只靠 `-shortest`。**
 * 实测：`-loop 1 -i frame -i audio -shortest` 产出的视频流比音频长 2.0～2.2 秒
 * （第 2 段：视频流 16.800s / 420 帧，音频 14.778s）—— 单张静图被循环喂进来时，
 * 编码器会跑到音频前面去，`-shortest` 只在数据包边界检查，拦不住已经编好的那几秒。
 * 后果是每段多出约 2 秒静默画面，12 段累计 +21.8 秒「对视音差」——
 * 画面上看不出来，字幕却会整体提前。所以时长由外部实测值给定，`-shortest` 只作双保险。
 *
 * 采样率也必须与配音一致：有配音的段是 22050Hz，无配音的段若用 44100Hz 的 anullsrc，
 * 拼接时 `-c copy` 会把不同采样率的流硬接在一起。
 */
function ffmpegArgs({ frames, seconds, audioFile, out }) {
  const hasAudio = audioFile && fs.existsSync(audioFile);
  const args = ['-y'];
  if (frames.length === 1) {
    args.push('-loop', '1', '-i', frames[0].path);
  } else {
    // 一段多片：每张片各自 -loop 1 -t <停留秒数>，再用 concat 滤镜拼成一段。
    // 不走 concat demuxer：单张图片只有一帧，demuxer 的 duration 对它不生效，
    // 实测结果是整段只显示第一张（且时长正好等于第一张的分配值，很容易被当成编码成功）。
    for (const f of frames) args.push('-loop', '1', '-t', f.seconds.toFixed(3), '-i', f.path);
  }
  const audioIdx = frames.length;
  if (hasAudio) args.push('-i', audioFile);
  else args.push('-f', 'lavfi', '-i', 'anullsrc=channel_layout=mono:sample_rate=22050');

  if (frames.length === 1) {
    args.push('-map', '0:v:0', '-map', `${audioIdx}:a`);
  } else {
    const ins = frames.map((_, i) => `[${i}:v]`).join('');
    args.push(
      '-filter_complex', `${ins}concat=n=${frames.length}:v=1:a=0,scale=1920:-2,format=yuv420p[v]`,
      '-map', '[v]', '-map', `${audioIdx}:a`
    );
  }
  args.push(
    '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p', '-r', '25',
    '-c:a', 'aac', '-b:a', '128k',
    '-t', String(seconds)
  );
  if (hasAudio) args.push('-shortest');
  args.push(out);
  return args;
}
