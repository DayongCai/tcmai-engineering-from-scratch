#!/usr/bin/env node
/**
 * build_hls.js —— 把成片打成「APP 可直接播放」的自适应流（HLS/CMAF）+ 发布清单
 *
 *   node platform/pipeline/build_hls.js 09-jichu/12-yaoli-xue [...更多课程]
 *   node platform/pipeline/build_hls.js 09-jichu/12-yaoli-xue --only 01-introduction
 *   node platform/pipeline/build_hls.js 09-jichu/12-yaoli-xue --limit 1
 *   node platform/pipeline/build_hls.js --index            # 只重写根 index.json
 *
 * 为什么要有这一步：
 *   video/lesson.mp4 是「一个 36 MB 的整段文件」——APP 要边下边播、要按网速切清晰度、
 *   要能跳转，都只能靠 Range 请求硬扛；网差时首屏要么等很久，要么干脆播不动。
 *   HLS 把同一章切成 6 秒分片，播放器按带宽在 1080p / 540p 之间自动切，首屏只需 1 个分片。
 *
 * 与发布的关系（详见 platform/MEDIA-DELIVERY.md）：
 *   · 流转产物写在仓库之外（默认 D:/tcm-media），**不入库**；
 *   · 清单（index.json / publish.json）很小，随仓库走；APP 只读清单 + 流；
 *   · 清单里的 URL 全是相对路径，换域名/CDN 只改一处 BASE_PREFIX（HLS_BASE）。
 *
 * 码率为什么这样定（实测，不是拍脑袋）：
 *   成片 1920×1080 视频只有 113 kbps、音频 106 kbps——**音频占了 47% 的字节**，
 *   因为单声道旁白按 128 kbps 编码。这一版：
 *     1080p：视频 250k、音频 64k 单声道（画面不降质，字节主要省在音频）
 *     540p ：视频 120k、音频 48k 单声道（弱网/手机流量档）
 *
 * 实现取舍：**每档单独跑一次 ffmpeg**，不用 `-var_stream_map`。
 *   实测 `-var_stream_map` + `%v` 在本机 ffmpeg 9.0.2 上直接 EACCES（写不了 header），
 *   而单档调用一次一档稳定；代价是多解码一遍，幻灯片这种静态内容解码很便宜。
 *   master.m3u8 由本脚本自己写，BANDWIDTH/AVERAGE-BANDWIDTH 从**实际分片字节数**算，
 *   不写名义值——播放器选档靠的就是这个数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const COURSES = path.join(ROOT, 'platform', 'courses');
const HLS_ROOT = process.env.HLS_ROOT || 'D:/tcm-media';
const BASE_PREFIX = process.env.HLS_BASE || '';

const SEG = 6;
const FPS = 25;
const GOP = SEG * FPS;

const LADDER = [
  // 1080p 档**视频直接 copy**：源片就是我们自己产出的、已审过的画质，
  // 再编一次只会掉质量、不会更好。只把音频从 128k 立体声改成 64k 单声道（省掉约 40% 字节）。
  { name: '1080p', w: 1920, h: 1080, vk: 0, ak: 64, copyVideo: true },
  { name: '540p', w: 960, h: 540, vk: 100, ak: 48 },
];

const CODECS = 'avc1.640028,mp4a.40.2';
// 只闻不听画面的一档：通勤/后台播放用。48k 单声道 ≈ 6.5 MB/小时。
// 不放进 master 的 ABR 档位——播放器不会在「有画面/无画面」之间自动切换，
// 所以清单里单独给一个 audioOnly 字段，由 APP 自己决定要不要提供「只听」模式。
const AUDIO_ONLY_KBPS = 48;

function sh(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 << 20 });
  if (r.status !== 0) {
    const tail = (r.stderr || '').split('\n').filter(Boolean).slice(-8).join('\n');
    throw new Error(`${cmd} 失败（${r.status}）：\n${tail}`);
  }
  return r.stdout;
}

const fp = (p) => p.replace(/\\/g, '/');
const ffprobeJson = (f) => JSON.parse(sh('ffprobe',
  ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', f]));
const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

function listSlugs(courseRel) {
  const dir = path.join(COURSES, courseRel);
  if (!fs.existsSync(dir)) throw new Error(`课程目录不存在：${courseRel}`);
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(dir, d.name, 'video', 'lesson.mp4')))
    .map((d) => d.name).sort();
}

function readCourseYaml(courseRel) {
  const p = path.join(COURSES, courseRel, 'course.yaml');
  if (!fs.existsSync(p)) return { title: courseRel, chapters: [] };
  const txt = fs.readFileSync(p, 'utf8');
  const title = (txt.match(/^title:\s*(.+)$/m) || [, courseRel])[1].trim();
  const chapters = [];
  const blocks = txt.split(/\n\s*- slug:\s*/).slice(1);
  for (const b of blocks) {
    const slug = b.split('\n')[0].trim();
    const t = (b.match(/^\s*title:\s*(.+)$/m) || [, ''])[1].trim();
    chapters.push({ slug, title: t });
  }
  return { title, chapters };
}

function dirBytes(dir) {
  let n = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    n += e.isDirectory() ? dirBytes(p) : fs.statSync(p).size;
  }
  return n;
}

/** 单档打包：返回该档的真实带宽与分片数 */
function packageRendition(src, outDir, l) {
  fs.mkdirSync(outDir, { recursive: true });
  // 清残档：上一版更长的成片会留下多余 seg_*.m4s，而清单若按「文件数」统计就会把它算进去。
  // 实测 540p：playlist 113 条 EXTINF、目录里 114 个 .m4s（旧编码残留），交付门 #2 报
  // 「清单写 114 片，实际 113 片」——重打一次也不消失，因为目录从不清空。
  for (const f of fs.readdirSync(outDir)) {
    if (/^seg_\d+\.m4s$/.test(f) || f === 'init.mp4') {
      fs.rmSync(path.join(outDir, f), { force: true });
    }
  }
  const playlist = path.join(outDir, 'index.m3u8');
  const vArgs = l.copyVideo
    // copy 档不重编视频，但必须显式忽略字幕流，否则 hls 会把 mov_text 拖成 vtt 档
    ? ['-c:v', 'copy']
    : ['-vf', `scale=${l.w}:${l.h}:flags=lanczos`,
      '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'veryfast',
      '-b:v', `${l.vk}k`, '-maxrate', `${Math.round(l.vk * 1.25)}k`, '-bufsize', `${l.vk * 2}k`,
      '-g', String(GOP), '-keyint_min', String(GOP), '-sc_threshold', '0', '-pix_fmt', 'yuv420p'];
  const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', fp(src),
    // 只取第一路视频与第一路音频；-sn 明确丢掉 mov_text（否则会多出 vtt 档）
    '-map', '0:v:0', '-map', '0:a:0', '-sn',
    ...vArgs,
    '-c:a', 'aac', '-b:a', `${l.ak}k`, '-ac', '1', '-ar', '48000',
    '-f', 'hls', '-hls_time', String(SEG), '-hls_playlist_type', 'vod',
    '-hls_segment_type', 'fmp4', '-hls_fmp4_init_filename', 'init.mp4',
    '-hls_flags', 'independent_segments',
    '-hls_segment_filename', fp(path.join(outDir, 'seg_%05d.m4s')),
    fp(playlist)];
  sh('ffmpeg', args);

  const segs = fs.readdirSync(outDir).filter((f) => f.endsWith('.m4s'));
  let bytes = 0;
  for (const f of segs) bytes += fs.statSync(path.join(outDir, f)).size;
  // 分片数以**播放列表**为准（单一真源）：文件数只是副产品，历史上正是它把残档算进了清单。
  const listed = (fs.readFileSync(playlist, 'utf8').match(/^#EXTINF/gm) || []).length;
  const dur = Number((sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'csv=p=0', fp(playlist)]).trim()) || 0);
  const seconds = dur > 0 ? dur : 1;
  const avg = Math.round((bytes * 8) / seconds);
  return { segments: listed || segs.length, bytes, avgBandwidth: avg, peakBandwidth: Math.round(avg * 1.3) };
}

function buildChapter(courseRel, slug, title, outRoot, courseId) {
  const src = path.join(COURSES, courseRel, slug, 'video', 'lesson.mp4');
  const subSrc = path.join(COURSES, courseRel, slug, 'narration', 'subtitles.vtt');
  const chapterOut = path.join(outRoot, slug);
  const subsDir = path.join(chapterOut, 'subs');
  const pubFile = path.join(chapterOut, 'publish.json');

  // 幂等：两档齐 + 清单在 + **源 mp4 的 sha256 没变** → 跳过。
  // 只看「文件在不在」会把重渲过的成片当成已打包（中基十章改版面后，HLS 仍是旧画面，
  // 工具却报「已有 10」）——那正是「重跑一次不会重编码」这条幂等在骗人。
  const done = LADDER.every((l) => fs.existsSync(path.join(chapterOut, l.name, 'index.m3u8')))
    && fs.existsSync(pubFile) && fs.existsSync(path.join(chapterOut, 'master.m3u8'));
  if (done) {
    const prev = JSON.parse(fs.readFileSync(pubFile, 'utf8'));
    if (prev.source && prev.source.mp4Sha256 === sha256(src)) {
      return { skipped: true, manifest: prev };
    }
  }

  fs.mkdirSync(subsDir, { recursive: true });
  const info = ffprobeJson(src);
  const durationSec = Number(info.format.duration);

  const rends = LADDER.map((l) => {
    const r = packageRendition(src, path.join(chapterOut, l.name), l);
    return { ...l, ...r, uri: `${l.name}/index.m3u8` };
  });

  // 字幕（HLS SUBTITLES 组）与封面（APP 列表页）
  const vtt = path.join(subsDir, 'zh.vtt');
  const hasSubs = fs.existsSync(subSrc);
  if (hasSubs) fs.copyFileSync(subSrc, vtt);
  // 纯音频档（audio.m3u8 + audio/ 分片）
  const audioDir = path.join(chapterOut, 'audio');
  const audioPl = path.join(chapterOut, 'audio.m3u8');
  if (!fs.existsSync(audioPl)) {
    fs.mkdirSync(audioDir, { recursive: true });
    sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', fp(src),
      '-map', '0:a:0', '-vn', '-sn',
      '-c:a', 'aac', '-b:a', `${AUDIO_ONLY_KBPS}k`, '-ac', '1', '-ar', '48000',
      '-f', 'hls', '-hls_time', String(SEG), '-hls_playlist_type', 'vod',
      '-hls_segment_type', 'fmp4', '-hls_fmp4_init_filename', 'init.mp4',
      '-hls_flags', 'independent_segments',
      '-hls_segment_filename', fp(path.join(audioDir, 'a_%05d.m4s')), fp(audioPl)]);
  }

  const poster = path.join(chapterOut, 'poster.jpg');
  if (!fs.existsSync(poster)) {
    sh('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '3', '-i', fp(src),
      '-frames:v', '1', '-vf', 'scale=640:-2', '-q:v', '4', fp(poster)]);
  }

  // master.m3u8 自己写：带宽用实测值
  const master = path.join(chapterOut, 'master.m3u8');
  const lines = ['#EXTM3U', '#EXT-X-VERSION:7', '#EXT-X-INDEPENDENT-SEGMENTS'];
  if (hasSubs) {
    lines.push('#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="中文",LANGUAGE="zh",'
      + 'DEFAULT=YES,AUTOSELECT=YES,FORCED=NO,URI="subs/zh.vtt"');
  }
  for (const r of rends) {
    lines.push(`#EXT-X-STREAM-INF:BANDWIDTH=${r.peakBandwidth},AVERAGE-BANDWIDTH=${r.avgBandwidth},`
      + `RESOLUTION=${r.w}x${r.h},FRAME-RATE=${FPS.toFixed(3)},CODECS="${CODECS}"`
      + (hasSubs ? ',SUBTITLES="subs"' : ''), r.uri);
  }
  lines.push('');
  fs.writeFileSync(master, lines.join('\n'), 'utf8');

  const manifest = {
    slug,
    title: title || slug,
    durationSec: Number(durationSec.toFixed(3)),
    hls: `${BASE_PREFIX}${courseId}/${slug}/master.m3u8`,
    poster: `${BASE_PREFIX}${courseId}/${slug}/poster.jpg`,
    subtitles: hasSubs ? `${BASE_PREFIX}${courseId}/${slug}/subs/zh.vtt` : null,
    audioOnly: `${BASE_PREFIX}${courseId}/${slug}/audio.m3u8`,
    renditions: rends.map((r) => ({
      name: r.name, uri: r.uri, width: r.w, height: r.h,
      avgBandwidth: r.avgBandwidth, peakBandwidth: r.peakBandwidth,
      segments: r.segments, bytes: r.bytes,
    })),
    bytes: dirBytes(chapterOut),
    source: { mp4Bytes: fs.statSync(src).size, mp4Sha256: sha256(src) },
    packagedAt: new Date().toISOString(),
  };
  fs.writeFileSync(pubFile, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  return { skipped: false, manifest };
}

function buildCourse(courseRel, opts = {}) {
  const courseId = courseRel.replace(/\\/g, '/');
  const outRoot = path.join(HLS_ROOT, courseId);
  fs.mkdirSync(outRoot, { recursive: true });
  const meta = readCourseYaml(courseRel);
  const titles = new Map(meta.chapters.map((c) => [c.slug, c.title]));
  let slugs = listSlugs(courseRel);
  if (opts.only) slugs = slugs.filter((s) => s === opts.only);
  // --skip N：从第 N 个（按 slug 排序）开始，配合 --limit 就能把一门课劈成几段并行打
  if (opts.skip) slugs = slugs.slice(opts.skip);
  if (opts.limit) slugs = slugs.slice(0, opts.limit);
  if (!slugs.length) throw new Error(`${courseId} 没有可打包的章（缺 video/lesson.mp4）`);

  const chapters = [];
  let built = 0; let skipped = 0;
  const t0 = Date.now();
  for (const slug of slugs) {
    process.stdout.write(`  · ${slug} ... `);
    const r = buildChapter(courseRel, slug, titles.get(slug), outRoot, courseId);
    chapters.push(r.manifest);
    r.skipped ? skipped++ : built++;
    const mb = (r.manifest.bytes / 1048576).toFixed(1);
    const bd = r.manifest.renditions.map((x) => `${x.name}@${Math.round(x.avgBandwidth / 1000)}k`).join(' / ');
    console.log(`${r.skipped ? '已有' : '打包'} ${r.manifest.durationSec.toFixed(0)}s · ${mb} MB · ${bd}`);
  }

  const pubPath = path.join(outRoot, 'publish.json');
  let merged = chapters;
  if ((opts.only || opts.limit || opts.skip) && fs.existsSync(pubPath)) {
    const old = JSON.parse(fs.readFileSync(pubPath, 'utf8'));
    const byslug = new Map(old.chapters.map((c) => [c.slug, c]));
    for (const c of chapters) byslug.set(c.slug, c);
    merged = [...byslug.values()];
  }
  merged.sort((a, b) => a.slug.localeCompare(b.slug));

  const pub = {
    id: courseId,
    title: meta.title,
    hlsBase: `${BASE_PREFIX}${courseId}/`,
    chapterCount: merged.length,
    totalDurationSec: Number(merged.reduce((a, c) => a + c.durationSec, 0).toFixed(3)),
    totalBytes: merged.reduce((a, c) => a + c.bytes, 0),
    ladder: LADDER.map((l) => ({ name: l.name, width: l.w, height: l.h, videoKbps: l.vk, audioKbps: l.ak })),
    segmentSeconds: SEG,
    chapters: merged,
    packagedAt: new Date().toISOString(),
  };
  fs.writeFileSync(pubPath, JSON.stringify(pub, null, 2) + '\n', 'utf8');
  const secs = Math.round((Date.now() - t0) / 1000);
  console.log(`✅ ${courseId}：打包 ${built} · 已有 ${skipped} · ${secs}s · ${(pub.totalBytes / 1073741824).toFixed(2)} GB`);
  return pub;
}

/**
 * 扫描已打包的课程。
 * **只收「整门打齐」的课**：根 index.json 是给 APP 的发布清单，
 * 里面出现半门课（例如 53 章只打了 12 章）在 APP 里就是个坑——
 * 用户点进第 13 章得到 404，而清单说这门课「有」。
 * 未打齐的课不写进 index，只打印一行提示。
 */
function scanPublished(opts = {}) {
  const out = new Map();
  const incomplete = [];
  if (!fs.existsSync(HLS_ROOT)) return out;
  for (const dept of fs.readdirSync(HLS_ROOT, { withFileTypes: true })) {
    if (!dept.isDirectory()) continue;
    for (const sub of fs.readdirSync(path.join(HLS_ROOT, dept.name), { withFileTypes: true })) {
      const p = path.join(HLS_ROOT, dept.name, sub.name, 'publish.json');
      if (!fs.existsSync(p)) continue;
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      // 期望章数 = 源侧有 video/lesson.mp4 的章
      let want = 0;
      try {
        const src = path.join(COURSES, j.id);
        want = fs.readdirSync(src, { withFileTypes: true })
          .filter((d) => d.isDirectory() && fs.existsSync(path.join(src, d.name, 'video', 'lesson.mp4')))
          .length;
      } catch { want = j.chapterCount; }
      if (j.chapterCount < want) {
        incomplete.push(`${j.id}（${j.chapterCount}/${want}）`);
        if (!opts.includeIncomplete) continue;
      }
      out.set(j.id, j);
    }
  }
  if (incomplete.length) {
    console.log(`⏳ 未打齐、暂不进 index.json：${incomplete.join('、')}`);
  }
  return out;
}

function writeIndex(courses) {
  const idx = {
    schema: 'tcm-media-index/1',
    generatedAt: new Date().toISOString(),
    note: 'APP 只读这一份：每门课、每章的 HLS 地址 / 时长 / 封面 / 字幕。播放用 HLS，支持 EXT-X-MEDIA 字幕组。',
    segmentSeconds: SEG,
    ladder: LADDER.map((l) => ({ name: l.name, width: l.w, height: l.h })),
    totalDurationSec: Number(courses.reduce((a, c) => a + c.totalDurationSec, 0).toFixed(3)),
    totalBytes: courses.reduce((a, c) => a + c.totalBytes, 0),
    courses: courses.map((c) => ({
      id: c.id,
      title: c.title,
      chapterCount: c.chapterCount,
      totalDurationSec: c.totalDurationSec,
      totalBytes: c.totalBytes,
      publishJson: `${BASE_PREFIX}${c.id}/publish.json`,
    })),
  };
  const out = path.join(HLS_ROOT, 'index.json');
  fs.mkdirSync(HLS_ROOT, { recursive: true });
  fs.writeFileSync(out, JSON.stringify(idx, null, 2) + '\n', 'utf8');

  // 仓库内留一份**发布记录**（很小，随 git 走）：记这一版发了哪些课、多大、何时打的。
  // 媒体本体在仓库外，只有这份记录能让「线上那套是哪一版」可追溯。
  const record = path.join(ROOT, 'platform', 'media-release.json');
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(record, 'utf8')); } catch { prev = null; }
  const rel = {
    ...idx,
    repoRecord: 'platform/media-release.json',
    regenerate: 'npm run media:hls:index',
    previous: prev
      ? { generatedAt: prev.generatedAt, totalBytes: prev.totalBytes, courses: (prev.courses || []).length }
      : null,
  };
  fs.writeFileSync(record, JSON.stringify(rel, null, 2) + '\n', 'utf8');
  console.log(`✅ index.json（${courses.length} 门课 / ${(idx.totalBytes / 1073741824).toFixed(2)} GB）→ ${fp(out)}`);
  console.log('✅ 发布记录 → platform/media-release.json');
  return idx;
}

function main() {
  const argv = process.argv.slice(2);
  const opts = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--only') opts.only = argv[++i];
    else if (argv[i] === '--limit') opts.limit = Number(argv[++i]);
    else if (argv[i] === '--skip') opts.skip = Number(argv[++i]);
    else if (argv[i] === '--index') opts.indexOnly = true;
    else rest.push(argv[i]);
  }
  if (opts.indexOnly) {
    writeIndex([...scanPublished().values()].sort((a, b) => a.id.localeCompare(b.id)));
    return;
  }
  if (!rest.length) {
    console.error('用法：node platform/pipeline/build_hls.js <课程相对路径> [--only <slug>] [--limit N]');
    console.error('      node platform/pipeline/build_hls.js --index');
    process.exit(2);
  }
  const all = scanPublished();
  for (const rel of rest) {
    const pub = buildCourse(rel.replace(/\\/g, '/'), opts);
    all.set(pub.id, pub);
  }
  writeIndex([...all.values()].sort((a, b) => a.id.localeCompare(b.id)));
}

if (require.main === module) main();
module.exports = { buildCourse, writeIndex, LADDER, SEG, HLS_ROOT };
