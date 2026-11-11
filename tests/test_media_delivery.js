#!/usr/bin/env node
/**
 * tests/test_media_delivery.js —— 交付层门（HLS 打包 + 发布清单）
 *
 * 为什么单独一道门：
 *   打包产物在仓库外（D:/tcm-media），没有 git 帮你看 diff；而流媒体出错的方式很安静——
 *   master 里少一档、分片数与时长对不上、清单写的是旧数，播放器都不会报错，
 *   只会在某个网速下卡住或放错片段。所以这里逐项核**磁盘实况**，不信 publish.json 的自述。
 *
 * 判据（与 platform/MEDIA-DELIVERY.md 第六节一一对应）。
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const HLS_ROOT = process.env.HLS_ROOT || 'D:/tcm-media';
const COURSES = path.join(ROOT, 'platform', 'courses');

const read = (p) => fs.readFileSync(p, 'utf8');

function summarize(tag, msgs) {
  if (msgs.length) console.log(`\n✗ ${tag}：${msgs.length} 处\n  ` + msgs.slice(0, 12).join('\n  '));
  assert.deepStrictEqual(msgs, [], `${tag} 未通过`);
}

/** 从 playlist 读 EXTINF 之和 */
function playlistDuration(txt) {
  const re = /#EXTINF:([\d.]+),/g;
  let m; let sum = 0;
  while ((m = re.exec(txt))) sum += Number(m[1]);
  return sum;
}

function segCount(txt) {
  return (txt.match(/^[^#\n][^\n]*\.(m4s|ts)$/gm) || []).length;
}

/** 磁盘上应当被打包的章（有 video/lesson.mp4 的） */
function expectedChapters() {
  const out = [];
  for (const dept of fs.readdirSync(COURSES, { withFileTypes: true })) {
    if (!dept.isDirectory()) continue;
    for (const sub of fs.readdirSync(path.join(COURSES, dept.name), { withFileTypes: true })) {
      if (!sub.isDirectory()) continue;
      const dir = path.join(COURSES, dept.name, sub.name);
      if (!fs.existsSync(path.join(dir, 'course.yaml'))) continue;
      for (const ch of fs.readdirSync(dir, { withFileTypes: true })) {
        if (ch.isDirectory() && fs.existsSync(path.join(dir, ch.name, 'video', 'lesson.mp4'))) {
          out.push({ course: `${dept.name}/${sub.name}`, slug: ch.name });
        }
      }
    }
  }
  return out;
}

const PACKED = fs.existsSync(HLS_ROOT) && fs.existsSync(path.join(HLS_ROOT, 'index.json'));

// 「已发布」的课程 = 根清单里登记过的。这样 `--only` 单章试跑不会让门变红，
// 而一旦某门课进了 index.json，就必须**整门打完**——半个课程包在 APP 里就是个坑。
const PUBLISHED = PACKED
  ? new Set(JSON.parse(read(path.join(HLS_ROOT, 'index.json'))).courses.map((c) => c.id))
  : new Set();
const ALL = PACKED ? expectedChapters().filter((c) => PUBLISHED.has(c.course)) : [];

test('0. 打包根存在（不存在则视为未打包，本门跳过）', () => {
  if (!PACKED) {
    console.log(`\n[跳过] ${HLS_ROOT} 不存在——媒体包只在本机/发布机生成，不进仓库。`);
    console.log('       生成：node platform/pipeline/build_hls.js <course>');
    return;
  }
  assert.ok(fs.existsSync(path.join(HLS_ROOT, 'index.json')), '缺根清单 index.json');
});

test('1. 每章 master.m3u8：两档 + 字幕组', () => {
  if (!PACKED) return;
  const errs = [];
  let checked = 0;
  for (const c of ALL) {
    const m = path.join(HLS_ROOT, c.course, c.slug, 'master.m3u8');
    if (!fs.existsSync(m)) { errs.push(`${c.course}/${c.slug}: 无 master.m3u8`); continue; }
    const txt = read(m);
    checked++;
    if (!txt.startsWith('#EXTM3U')) errs.push(`${c.slug}: master 不以 #EXTM3U 开头`);
    const infs = txt.match(/#EXT-X-STREAM-INF:/g) || [];
    if (infs.length < 2) errs.push(`${c.slug}: 只有 ${infs.length} 档（应 ≥2）`);
    for (const need of ['1080p/index.m3u8', '540p/index.m3u8']) {
      if (!txt.includes(need)) errs.push(`${c.slug}: master 缺 ${need}`);
    }
    const vtt = path.join(HLS_ROOT, c.course, c.slug, 'subs', 'zh.vtt');
    if (fs.existsSync(vtt)) {
      if (!/EXT-X-MEDIA:TYPE=SUBTITLES/.test(txt)) errs.push(`${c.slug}: 有 vtt 但 master 无 SUBTITLES 组`);
      if (!/SUBTITLES="subs"/.test(txt)) errs.push(`${c.slug}: STREAM-INF 未挂 SUBTITLES`);
    }
  }
  if (checked === 0 && ALL.length) errs.push(`没有任何章被打包（应 ${ALL.length} 章）`);
  summarize('1. master 结构', errs);
});

test('2. 各档分片数与时长：分片 ≥1，EXTINF 之和与清单时长差 ≤8s', () => {
  if (!PACKED) return;
  const errs = [];
  for (const c of ALL) {
    const pubFile = path.join(HLS_ROOT, c.course, c.slug, 'publish.json');
    if (!fs.existsSync(pubFile)) { errs.push(`${c.slug}: 无 publish.json`); continue; }
    const pub = JSON.parse(read(pubFile));
    for (const r of pub.renditions) {
      const pl = path.join(HLS_ROOT, c.course, c.slug, r.uri);
      if (!fs.existsSync(pl)) { errs.push(`${c.slug}: 缺 ${r.uri}`); continue; }
      const txt = read(pl);
      const n = segCount(txt);
      if (n < 1) errs.push(`${c.slug}/${r.name}: 分片数 0`);
      if (n !== r.segments) errs.push(`${c.slug}/${r.name}: 清单写 ${r.segments} 片，实际 ${n} 片`);
      const d = playlistDuration(txt);
      if (Math.abs(d - pub.durationSec) > 8) {
        errs.push(`${c.slug}/${r.name}: 分片合计 ${d.toFixed(1)}s ≠ 时长 ${pub.durationSec}s`);
      }
    }
  }
  summarize('2. 分片与时长', errs);
});

test('3. 带宽字段：为正，且 AVERAGE ≤ BANDWIDTH', () => {
  if (!PACKED) return;
  const errs = [];
  for (const c of ALL) {
    const m = path.join(HLS_ROOT, c.course, c.slug, 'master.m3u8');
    if (!fs.existsSync(m)) continue;
    const re = /#EXT-X-STREAM-INF:([^\n]+)/g;
    let mm;
    while ((mm = re.exec(read(m)))) {
      const bw = Number((mm[1].match(/BANDWIDTH=(\d+)/) || [, 0])[1]);
      const av = Number((mm[1].match(/AVERAGE-BANDWIDTH=(\d+)/) || [, 0])[1]);
      if (!(bw > 0)) errs.push(`${c.slug}: BANDWIDTH 缺失或为 0`);
      if (av > bw) errs.push(`${c.slug}: AVERAGE ${av} > BANDWIDTH ${bw}`);
      if (bw > 2000000) errs.push(`${c.slug}: BANDWIDTH ${bw} 异常大（幻灯片刻意做小，超 2 Mbps 说明档位配错）`);
    }
  }
  summarize('3. 带宽字段', errs);
});

test('4. publish.json 字段齐 · 章数与磁盘一致 · 源 sha256 是 64 位', () => {
  if (!PACKED) return;
  const errs = [];
  // 进了 index.json 的课必须整门打齐
  for (const course of PUBLISHED) {
    const want = expectedChapters().filter((c) => c.course === course).map((c) => c.slug);
    const got = want.filter((s) => fs.existsSync(path.join(HLS_ROOT, course, s, 'master.m3u8')));
    if (got.length !== want.length) {
      const miss = want.filter((s) => !got.includes(s));
      errs.push(`${course}: 已发布但只打了 ${got.length}/${want.length} 章（缺 ${miss.slice(0, 3).join(', ')}${miss.length > 3 ? ' …' : ''}）`);
    }
  }
  const byCourse = new Map();
  for (const c of ALL) {
    if (!byCourse.has(c.course)) byCourse.set(c.course, []);
    byCourse.get(c.course).push(c.slug);
  }
  for (const [course, slugs] of byCourse) {
    const p = path.join(HLS_ROOT, course, 'publish.json');
    if (!fs.existsSync(p)) { errs.push(`${course}: 无 publish.json`); continue; }
    const pub = JSON.parse(read(p));
    // 只要求「已打包的章」都在清单里；没打包的章不算错（可以分次打包）
    const listed = new Set(pub.chapters.map((x) => x.slug));
    const packed = slugs.filter((s) => fs.existsSync(path.join(HLS_ROOT, course, s, 'master.m3u8')));
    for (const s of packed) if (!listed.has(s)) errs.push(`${course}: 磁盘有 ${s} 但清单没登记`);
    if (pub.chapterCount !== pub.chapters.length) {
      errs.push(`${course}: chapterCount ${pub.chapterCount} ≠ 实际 ${pub.chapters.length}`);
    }
    for (const ch of pub.chapters) {
      for (const k of ['slug', 'title', 'durationSec', 'hls', 'poster', 'renditions', 'bytes']) {
        if (ch[k] === undefined || ch[k] === null || ch[k] === '') errs.push(`${course}/${ch.slug}: 缺字段 ${k}`);
      }
      if (!ch.renditions || ch.renditions.length < 2) errs.push(`${course}/${ch.slug}: 档位少于 2`);
      if (!/^[0-9a-f]{64}$/.test((ch.source || {}).mp4Sha256 || '')) {
        errs.push(`${course}/${ch.slug}: source.mp4Sha256 不是 64 位十六进制`);
      }
    }
  }
  summarize('4. 课程清单', errs);
});

test('5. 根 index.json：汇总数与各课一致', () => {
  if (!PACKED) return;
  const idx = JSON.parse(read(path.join(HLS_ROOT, 'index.json')));
  const errs = [];
  if (idx.schema !== 'tcm-media-index/1') errs.push(`schema=${idx.schema}`);
  let dur = 0; let bytes = 0;
  for (const c of idx.courses) {
    const p = path.join(HLS_ROOT, c.id, 'publish.json');
    if (!fs.existsSync(p)) { errs.push(`${c.id}: index 登记了但磁盘无 publish.json`); continue; }
    const pub = JSON.parse(read(p));
    if (pub.chapterCount !== c.chapterCount) errs.push(`${c.id}: 章数 ${c.chapterCount} ≠ ${pub.chapterCount}`);
    if (Math.abs(pub.totalDurationSec - c.totalDurationSec) > 1) errs.push(`${c.id}: 时长汇总不一致`);
    dur += c.totalDurationSec; bytes += c.totalBytes;
  }
  if (idx.courses.length) {
    if (Math.abs(idx.totalDurationSec - dur) > 2) errs.push(`总时长 ${idx.totalDurationSec} ≠ 各课之和 ${dur.toFixed(1)}`);
    if (Math.abs(idx.totalBytes - bytes) > 1024) errs.push('总字节与各课之和不一致');
  }
  summarize('5. 根清单', errs);
});

test('6. 分片总字节与清单 bytes 差 ≤1%（防清单写旧数）', () => {
  if (!PACKED) return;
  const errs = [];
  for (const c of ALL) {
    const pubFile = path.join(HLS_ROOT, c.course, c.slug, 'publish.json');
    const dir = path.join(HLS_ROOT, c.course, c.slug);
    if (!fs.existsSync(pubFile) || !fs.existsSync(dir)) continue;
    const pub = JSON.parse(read(pubFile));
    let actual = 0;
    const walk = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p); else actual += fs.statSync(p).size;
      }
    };
    walk(dir);
    const drift = Math.abs(actual - pub.bytes) / Math.max(1, pub.bytes);
    if (drift > 0.01) errs.push(`${c.slug}: 清单 ${(pub.bytes / 1048576).toFixed(1)} MB，实际 ${(actual / 1048576).toFixed(1)} MB`);
  }
  summarize('6. 字节一致性', errs);
});

test('7. 可播放性抽检：随机 3 章用 ffprobe 读 master，时长与清单相符', () => {
  if (!PACKED) return;
  const has = spawnSync('ffprobe', ['-version'], { encoding: 'utf8' });
  if (has.status !== 0) { console.log('[跳过] ffprobe 不可用'); return; }
  const errs = [];
  const picked = ALL.filter((c) => fs.existsSync(path.join(HLS_ROOT, c.course, c.slug, 'master.m3u8')));
  if (!picked.length) return;
  // 固定取首/中/尾，避免随机导致的不可复现
  const idxs = [0, Math.floor(picked.length / 2), picked.length - 1];
  for (const i of idxs) {
    const c = picked[i];
    const master = path.join(HLS_ROOT, c.course, c.slug, 'master.m3u8');
    const pub = JSON.parse(read(path.join(HLS_ROOT, c.course, c.slug, 'publish.json')));
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
      '-of', 'csv=p=0', master.replace(/\\/g, '/')], { encoding: 'utf8' });
    if (r.status !== 0) { errs.push(`${c.slug}: ffprobe 打不开 master`); continue; }
    const d = Number((r.stdout || '').trim());
    if (!(d > 0)) errs.push(`${c.slug}: master 时长为 0`);
    if (Math.abs(d - pub.durationSec) > 8) errs.push(`${c.slug}: ffprobe ${d}s ≠ 清单 ${pub.durationSec}s`);
  }
  summarize('7. 可播放性', errs);
});

// ── 9. 离线分卷（platform/release-bundle.json）：单卷 ≤2 GB、章覆盖齐、sha256 齐 ──
// GitHub Release 单 asset 上限 2 GB；卷超了就是发布时才被发现，那时已经打了几个小时。
test('9. 离线分卷清单：单卷 ≤2 GB · 章覆盖 = 已发布章 · sha256 齐', () => {
  const rec = path.join(ROOT, 'platform', 'release-bundle.json');
  if (!fs.existsSync(rec)) { console.log('[跳过] 未生成离线分卷（npm run media:pack）'); return; }
  const b = JSON.parse(read(rec));
  const errs = [];
  let chapters = 0;
  for (const bundle of b.bundles) {
    const seen = new Set();
    for (const p of bundle.parts) {
      if (p.bytes > 2 * 1024 ** 3) errs.push(`${bundle.course} part-${p.part}: ${(p.bytes / 1073741824).toFixed(2)} GB > 2 GB`);
      if (bundle.parts.length > 1 && !/part-\d\d\.tar$/.test(p.file)) errs.push(`${bundle.course}: 多卷但文件名未带 part-NN`);
      if (!/^[0-9a-f]{64}$/.test(p.sha256 || '')) errs.push(`${bundle.course} part-${p.part}: sha256 缺失`);
      for (const c of p.chapters) {
        if (seen.has(c.slug)) errs.push(`${bundle.course}: ${c.slug} 出现在两卷里`);
        seen.add(c.slug);
        chapters++;
      }
    }
    if (bundle.chapterCount !== seen.size) {
      errs.push(`${bundle.course}: 分卷覆盖 ${seen.size} 章 ≠ 清单 ${bundle.chapterCount} 章`);
    }
  }
  if (PACKED) {
    const pub = expectedChapters().filter((c) => PUBLISHED.has(c.course)).length;
    if (chapters !== pub) errs.push(`分卷总章数 ${chapters} ≠ 已发布章数 ${pub}`);
  }
  summarize('9. 离线分卷', errs);
});

// ── 10. 本地服务（platform/serve_media.js）：MIME / CORS / Range 三个头缺一不可 ──
// HLS 文件在磁盘上能读，不等于 APP 能拉：没有 Range 拖动失效、没有 CORS 浏览器拒、
// MIME 配错播放器报「清单解析失败」。所以真起一个服务器，用 HTTP 验。
test('10. 本地媒体服务：200/206/CORS/MIME 都对', async () => {
  if (!PACKED) return;
  const { spawn } = require('node:child_process');
  const port = 7791;
  const srv = spawn(process.execPath, [path.join(ROOT, 'platform', 'serve_media.js'),
    '--port', String(port), '--root', HLS_ROOT.split(path.sep).join('/')], { stdio: 'ignore' });
  const base = `http://127.0.0.1:${port}`;
  const waitUp = async () => {
    for (let i = 0; i < 50; i++) {
      try { const r = await fetch(`${base}/index.json`); if (r.ok) return; } catch { /* 还没起来 */ }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('serve_media.js 在 5 秒内没起来');
  };
  try {
    await waitUp();
    const idx = await fetch(`${base}/index.json`);
    assert.strictEqual(idx.status, 200);
    assert.strictEqual(idx.headers.get('access-control-allow-origin'), '*');

    const first = JSON.parse(read(path.join(HLS_ROOT, 'index.json'))).courses[0];
    const pub = JSON.parse(read(path.join(HLS_ROOT, first.id, 'publish.json')));
    const ch = pub.chapters[0];

    const master = await fetch(`${base}/${first.id}/${ch.slug}/master.m3u8`);
    assert.strictEqual(master.status, 200, '清单应 200（不该按 Range 切）');
    assert.match(master.headers.get('content-type') || '', /mpegurl/i, 'm3u8 的 MIME 必须是 application/vnd.apple.mpegurl');

    const variant = await fetch(`${base}/${first.id}/${ch.slug}/${ch.renditions[0].uri}`);
    assert.strictEqual(variant.status, 200, '变体清单应 200');

    const segUri = ch.renditions[0].uri.replace(/index\.m3u8$/, 'seg_00001.m4s');
    const seg = await fetch(`${base}/${first.id}/${ch.slug}/${segUri}`, { headers: { Range: 'bytes=0-99' } });
    assert.strictEqual(seg.status, 206, '分片必须支持 Range（206）');
    assert.match(seg.headers.get('content-range') || '', /^bytes 0-99\//, 'Content-Range 头不对');
    assert.match(seg.headers.get('content-type') || '', /iso\.segment/, 'fMP4 分片 MIME 应为 video/iso.segment');
  } finally {
    srv.kill();
  }
});

// ── 11. 发布脚本（--self-test）：仓库→README→Release→上传→回读，全流程不发请求 ──
// 没有令牌时也能证明「发布链路」是通的；否则等真拿到令牌才发现字段拼错就太晚。
test('11. GitHub 发布脚本：--self-test 全流程通过（13 个附件）', () => {
  const rec = path.join(ROOT, 'platform', 'release-bundle.json');
  if (!fs.existsSync(rec)) return;
  const py = ['python', 'py', 'python3'].find((c) => {
    const r = spawnSync(c, ['--version'], { encoding: 'utf8' });
    return r.status === 0;
  });
  if (!py) { console.log('[跳过] 没有 python'); return; }
  const r = spawnSync(py, [path.join(ROOT, 'scripts', 'publish_release_github.py'),
    '--repo', 'DayongCai/tcm-course-media', '--create-repo', '--self-test'],
  { encoding: 'utf8', env: { ...process.env, GITHUB_TOKEN: 'selftest' } });
  assert.strictEqual(r.status, 0, `self-test 失败：${(r.stderr || '').slice(-400)}`);
  const out = r.stdout || '';
  assert.match(out, /发布完成/, '没有「发布完成」字样');
  assert.match(out, /13 个附件/, `附件数不对：${(out.match(/发布完成[^\n]*/) || [''])[0]}`);
  // 每个分卷都出现在结果里
  const bundle = JSON.parse(read(rec));
  for (const b of bundle.bundles) {
    for (const p of b.parts) assert.ok(out.includes(p.file), `结果里缺 ${p.file}`);
  }
});
