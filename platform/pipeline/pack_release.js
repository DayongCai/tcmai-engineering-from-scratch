#!/usr/bin/env node
/**
 * pack_release.js —— 把已打包的 HLS 媒体切成「可发布的分卷离线包」
 *
 *   node platform/pipeline/pack_release.js                 # 全部分卷（默认 ≤1.6 GB/卷）
 *   node platform/pipeline/pack_release.js --course 09-jichu/12-yaoli-xue
 *   node platform/pipeline/pack_release.js --max-bytes 1500000000
 *
 * 为什么需要这一步：
 *   `index.json` + HLS 是给「在线播放」用的；但学员常常要离线（地铁、家里没网、教室断网）。
 *   GitHub Release 单 asset 上限 2 GB，而药理学 2.59 GB、病理生理学 3.24 GB 都超了，
 *   所以必须**按章分卷**，并在分卷之间留一份清单让解压脚本能核对。
 *
 * 为什么是未压缩的 .tar：
 *   HLS 分片本身已是 h264/aac 压缩码流，再 gzip 只省 1–2%（m3u8/json 占比极小），
 *   却要多花一倍时间；而且本机 Node 调 `tar` 命中的是 System32 的 bsdtar，
 *   它对「扩展名 .tar.gz + -I gzip」会报 Conflicting compression options。
 *   Windows 10+ 自带 tar，`tar -xf x.tar` 直接可用。
 *
 * 产物：<RELEASE_ROOT>/<course>-v1-part-NN.tar.gz + parts.json（含每卷 sha256 与章清单）
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const HLS_ROOT = process.env.HLS_ROOT || 'D:/tcm-media';
const RELEASE_ROOT = process.env.RELEASE_ROOT || 'D:/tcm-release';
const MAX_BYTES = 1.6 * 1024 ** 3; // 1.6 GB，留出余量给 GitHub 的 2 GB 上限

function sh(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 << 20, ...opts });
  if (r.status !== 0) {
    throw new Error(`${cmd} 失败（${r.status}）：\n${(r.stderr || '').split('\n').slice(-6).join('\n')}`);
  }
  return r.stdout;
}

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function sha256File(p) {
  const h = crypto.createHash('sha256');
  const fd = fs.openSync(p, 'r');
  const buf = Buffer.allocUnsafe(4 << 20);
  let n;
  while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
  fs.closeSync(fd);
  return h.digest('hex');
}

/** 按章把一门课切成若干卷（不拆章——拆了章就不是「完整一集」了） */
function splitParts(chapters, maxBytes) {
  const parts = [];
  let cur = [];
  let curBytes = 0;
  for (const ch of chapters) {
    if (cur.length && curBytes + ch.bytes > maxBytes) {
      parts.push(cur);
      cur = [];
      curBytes = 0;
    }
    cur.push(ch);
    curBytes += ch.bytes;
  }
  if (cur.length) parts.push(cur);
  return parts;
}

function packCourse(courseId) {
  const pubPath = path.join(HLS_ROOT, courseId, 'publish.json');
  if (!fs.existsSync(pubPath)) throw new Error(`没有 publish.json：${courseId}`);
  const pub = readJson(pubPath);
  const chapters = [...pub.chapters].sort((a, b) => a.slug.localeCompare(b.slug));
  const parts = splitParts(chapters, MAX_BYTES);
  const outDir = path.join(RELEASE_ROOT, courseId.replace(/\//g, '__'));
  fs.mkdirSync(outDir, { recursive: true });

  const base = path.basename(courseId);
  const records = [];

  parts.forEach((chs, i) => {
    const nn = String(i + 1).padStart(2, '0');
    const name = `${base}-v1-part-${nn}.tar`;
    const out = path.join(outDir, name);
    const expectedBytes = chs.reduce((a, c) => a + c.bytes, 0);

    if (fs.existsSync(out) && fs.statSync(out).size > 0) {
      // 幂等：已存在就只重新登记（体积/哈希重算，防止半截文件被当成成品）
      const size = fs.statSync(out);
      console.log(`  · ${name} 已有 ${(size.size / 1048576).toFixed(0)} MB，重算 sha256 …`);
    } else {
      process.stdout.write(`  · ${name} ← ${chs.length} 章（源 ${(expectedBytes / 1048576).toFixed(0)} MB）… `);
      // -C 到课时目录，包内路径保持 <course>/<slug>/…，解压后能直接对着 index.json 用
      // 不压缩：HLS 分片已是压缩码流；且 Node 调到的可能是 System32 的 bsdtar，
      // 它对「.tar.gz + -I gzip」会报 Conflicting compression options。
      const tail = [];
      for (const c of chs) tail.push(`${courseId}/${c.slug}`);
      tail.push(`${courseId}/publish.json`);
      const outF = out.replace(/\\/g, '/');
      const hlsF = HLS_ROOT.replace(/\\/g, '/');
      // msys/GNU tar 会把 `D:/x` 读成「远程主机 D 上的 x」，必须加 --force-local；
      // Windows 自带 bsdtar 不认这个开关，所以先带、失败再退回不带。
      try {
        sh('tar', ['-cf', outF, '--force-local', '-C', hlsF, ...tail]);
      } catch (e) {
        if (!/force-local|unrecognized|not supported/i.test(e.message)) throw e;
        sh('tar', ['-cf', outF, '-C', hlsF, ...tail]);
      }
      console.log('完成');
    }

    const st = fs.statSync(out);
    records.push({
      part: i + 1,
      file: name,
      bytes: st.size,
      sha256: sha256File(out),
      chapters: chs.map((c) => ({ slug: c.slug, title: c.title, bytes: c.bytes, durationSec: c.durationSec })),
      sourceBytes: expectedBytes,
    });
  });

  const bundle = {
    course: courseId,
    title: pub.title,
    version: 'v1',
    chapterCount: pub.chapterCount,
    totalDurationSec: pub.totalDurationSec,
    totalBytes: pub.totalBytes,
    partMaxBytes: MAX_BYTES,
    parts: records,
    note: '解压：tar -xf <part>.tar -C <目标目录>；各卷互不重叠，按章切分，可单独解压其中一卷。',
    packedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, 'parts.json'), JSON.stringify(bundle, null, 2) + '\n', 'utf8');
  const total = records.reduce((a, r) => a + r.bytes, 0);
  console.log(`✅ ${courseId}：${records.length} 卷 · ${(total / 1073741824).toFixed(2)} GB → ${outDir.replace(/\\/g, '/')}`);
  return bundle;
}

function main() {
  const argv = process.argv.slice(2);
  let only = null;
  let maxBytes = MAX_BYTES;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--course') only = argv[++i];
    else if (argv[i] === '--max-bytes') maxBytes = Number(argv[++i]);
  }
  if (!fs.existsSync(HLS_ROOT)) throw new Error(`媒体目录不存在：${HLS_ROOT}（先跑 npm run media:hls）`);

  const idx = readJson(path.join(HLS_ROOT, 'index.json'));
  const courses = only ? idx.courses.filter((c) => c.id === only) : idx.courses;
  if (!courses.length) throw new Error(`index.json 里没有课程 ${only || ''}`);

  const bundles = [];
  for (const c of courses) bundles.push(packCourse(c.id));

  const all = {
    schema: 'tcm-media-bundle/1',
    generatedAt: new Date().toISOString(),
    partMaxBytes: maxBytes,
    totalChapters: bundles.reduce((a, b) => a + b.chapterCount, 0),
    totalBytes: bundles.reduce((a, b) => a + b.parts.reduce((x, p) => x + p.bytes, 0), 0),
    bundles,
    uploadHint: 'GitHub: gh release upload media-v1 <file>；或 rclone copy 到对象存储的 /v1/offline/ 前缀。',
  };
  fs.mkdirSync(RELEASE_ROOT, { recursive: true });
  fs.writeFileSync(path.join(RELEASE_ROOT, 'bundle-index.json'), JSON.stringify(all, null, 2) + '\n', 'utf8');

  // 仓库里留一份「离线包清单」（不含 sha256 全量会很啰嗦，这里保留，体积仍很小）
  const repoRecord = path.join(ROOT, 'platform', 'release-bundle.json');
  fs.writeFileSync(repoRecord, JSON.stringify(all, null, 2) + '\n', 'utf8');

  console.log(`✅ 离线包 ${bundles.reduce((a, b) => a + b.parts.length, 0)} 卷 · ${(all.totalBytes / 1073741824).toFixed(2)} GB · ${all.totalChapters} 章`);
  console.log(`   bundle-index.json → ${path.join(RELEASE_ROOT, 'bundle-index.json').replace(/\\/g, '/')}`);
  console.log('   仓库记录 → platform/release-bundle.json');
}

if (require.main === module) main();
module.exports = { packCourse, splitParts };
