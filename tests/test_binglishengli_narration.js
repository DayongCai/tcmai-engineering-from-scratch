#!/usr/bin/env node
/**
 * tests/test_binglishengli_narration.js —— 病理生理学旁白层（narration/lesson.json）
 *
 * 为什么单独一道门：旁白是最容易被「看起来有」骗过去的一层 ——
 * 一份只有 5 段的 lesson.json（标题 + 三个头 + 免责）也能让 course.yaml 写 narration-ready，
 * 但那不是「讲稿」，只是封面。本门核的是「正文真的进了旁白」。
 *
 * 九件事（旁白 → 幻灯片 → 配音 → 字幕 → 成片，逐层核）：
 *   1. 53 章都有 lesson.json，段数 ≥8（本册实测 12–25），role 序列含 title/motto/problem/roots/boundary/disclaimer；
 *   2. spoken 不许残留 Markdown 标记（**、##、| 表格、``` 围栏）——那是「把文档喂给 TTS」的痕迹；
 *   3. 每段 estimateSeconds 与 spoken 字数对得上（RATE=4.6 字/秒），且合计 = estimateTotalSeconds；
 *   4. 诚实字段齐（source / textVsSpoken / estimateNote），且没有伪造的实测时长；
 *   5. course.yaml 的 video 状态与 lesson.json 一致（逐级按磁盘实况）；
 *   6. 幻灯片片数与片内密度（拆片后单页 ≤700 字）；
 *   7. 配音与字幕：音频数 = 段数、字幕条数 = 段数、时间轴不越界、实测与估算同量级；
 *   8. slides/manifest.json 的片↔段映射齐全（拆片后下游不能靠"第 i 片 = 第 i 段"猜）；
 *   9. 成片时长 = 实测配音（差 >2s 即判红，本仓踩过被裁 28% 仍报成功）。
 */
'use strict';

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const COURSE = path.join(ROOT, 'platform/courses/09-jichu/11-bingli-shengli-xue');
const YAML = path.join(COURSE, 'course.yaml');
const RATE = 4.6;

let pass = 0;
let fail = 0;
const reds = [];
const ok = (n) => { pass++; console.log('  ✅ ' + n); };
const no = (n, why) => { fail++; reds.push(n + ' — ' + why); console.log('  ❌ ' + n + ' — ' + why); };

const chapters = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'departments/09-jichu/11-bingli-shengli-xue/chapters.json'), 'utf8')).chapters;

// ── 1. 段数与角色 ────────────────────────────────────────────────────
const missing = [];
const thin = [];
const roleBad = [];
const counts = [];
for (const c of chapters) {
  const p = path.join(COURSE, c.slug, 'narration/lesson.json');
  if (!fs.existsSync(p)) { missing.push(c.slug); continue; }
  const L = JSON.parse(fs.readFileSync(p, 'utf8'));
  counts.push(L.segmentCount);
  if (L.segmentCount < 8) thin.push(`${c.slug}: ${L.segmentCount} 段`);
  const roles = new Set((L.segments || []).map((s) => s.role));
  for (const need of ['title', 'motto', 'problem', 'roots', 'boundary', 'disclaimer']) {
    if (!roles.has(need)) roleBad.push(`${c.slug}: 缺 ${need} 段`);
  }
}
{
  const lo = Math.min(...counts), hi = Math.max(...counts);
  const avg = (counts.reduce((a, b) => a + b, 0) / counts.length).toFixed(1);
  if (missing.length) no('53 章都有 lesson.json', `${missing.length} 章缺，如 ${missing[0]}`);
  else if (thin.length) no('段数 ≥8', `${thin.length} 章过薄，如 ${thin[0]}`);
  else if (roleBad.length) no('角色齐', `${roleBad.length} 处，如 ${roleBad[0]}`);
  else ok(`旁白：53 章齐 · 段数 ${lo}–${hi}（均 ${avg}）· 六个必备角色都在`);
}

// ── 2. spoken 清洁度 ────────────────────────────────────────────────
const dirty = [];
for (const c of chapters) {
  const p = path.join(COURSE, c.slug, 'narration/lesson.json');
  if (!fs.existsSync(p)) continue;
  const L = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const s of L.segments || []) {
    const t = s.spoken || '';
    if (/```/.test(t)) dirty.push(`${c.slug}#${s.n} 残留代码围栏`);
    if (/\*\*|^#{1,6}\s/.test(t)) dirty.push(`${c.slug}#${s.n} 残留 Markdown 标记`);
    if (/^\s*\|/.test(t)) dirty.push(`${c.slug}#${s.n} 残留表格行`);
    if (!t.trim()) dirty.push(`${c.slug}#${s.n} spoken 为空`);
  }
}
if (dirty.length) no('spoken 可朗读', `${dirty.length} 处，如 ${dirty[0]}`);
else ok('spoken：无代码围栏 / Markdown 标记 / 表格行，且非空');

// ── 3. 估算时长自洽 ────────────────────────────────────────────────
const drift = [];
for (const c of chapters) {
  const p = path.join(COURSE, c.slug, 'narration/lesson.json');
  if (!fs.existsSync(p)) continue;
  const L = JSON.parse(fs.readFileSync(p, 'utf8'));
  let sum = 0;
  for (const s of L.segments || []) {
    const chars = (s.spoken || '').replace(/[\s`*#>|$-]/g, '').length;
    const want = Math.max(3, Math.round(chars / RATE));
    if (Math.abs(want - s.estimateSeconds) > 1) drift.push(`${c.slug}#${s.n}：写 ${s.estimateSeconds}s，按 ${RATE} 字/秒应为 ${want}s`);
    sum += s.estimateSeconds;
  }
  if (Math.abs(sum - L.estimateTotalSeconds) > 1) drift.push(`${c.slug}：段和 ${sum}s ≠ 总 ${L.estimateTotalSeconds}s`);
}
if (drift.length) no('估算时长自洽', `${drift.length} 处，如 ${drift[0]}`);
else ok(`估算：每段按 ${RATE} 字/秒可复算，段和 = 总时长`);

// ── 4. 诚实字段 ────────────────────────────────────────────────────
{
  const bad = [];
  for (const c of chapters) {
    const p = path.join(COURSE, c.slug, 'narration/lesson.json');
    if (!fs.existsSync(p)) continue;
    const L = JSON.parse(fs.readFileSync(p, 'utf8'));
    for (const k of ['source', 'textVsSpoken', 'estimateNote', 'generatedBy']) {
      if (!L[k]) bad.push(`${c.slug} 缺 ${k}`);
    }
    // 有实测时长就必须有音频文件与后端说明；没有音频就不许写实测（两头都堵）。
    const audioDir = path.join(COURSE, c.slug, 'narration', 'audio');
    const hasAudio = fs.existsSync(audioDir) && fs.readdirSync(audioDir).some((f) => /\.(mp3|wav)$/.test(f));
    if (L.audioMeasuredSeconds !== undefined && L.audioMeasuredSeconds !== null) {
      if (!hasAudio) bad.push(`${c.slug} 写了实测时长却找不到音频文件`);
      if (!L.audioBackend) bad.push(`${c.slug} 有实测时长但缺 audioBackend`);
      if (!L.estimateVsActual) bad.push(`${c.slug} 有实测时长但缺 estimateVsActual`);
    } else if (hasAudio) {
      bad.push(`${c.slug} 有音频却没写 audioMeasuredSeconds`);
    }
    if (L.estimateNote && !/估算/.test(L.estimateNote)) bad.push(`${c.slug} estimateNote 未声明「估算」`);
  }
  if (bad.length) no('诚实字段', `${bad.length} 处，如 ${bad[0]}`);
  else ok('诚实字段：source / textVsSpoken / estimateNote（明写「估算」）/ generatedBy 齐，且无伪造实测');
}

// ── 5. course.yaml 与旁白一致 ──────────────────────────────────────
{
  const txt = fs.readFileSync(YAML, 'utf8');
  const entries = [];
  let cur = null;
  for (const line of txt.split('\n')) {
    const mS = line.match(/^\s*-\s*slug:\s*(\S+)/);
    if (mS) { cur = { slug: mS[1], video: null, est: null }; entries.push(cur); continue; }
    const mV = line.match(/^\s*video:\s*(\S+)/);
    if (mV && cur) cur.video = mV[1];
    const mE = line.match(/^\s*estimate_minutes:\s*([\d.]+)/);
    if (mE && cur) cur.est = Number(mE[1]);
  }
  const bad = [];
  for (const e of entries) {
    const p = path.join(COURSE, e.slug, 'narration/lesson.json');
    const has = fs.existsSync(p);
    const slidePath = path.join(COURSE, e.slug, 'slides', 'index.html');
    const videoPath = path.join(COURSE, e.slug, 'video', 'lesson.mp4');
    // 逐级按磁盘实况：有片就是 rendered，有幻灯片就是 slides-ready，只有旁白是 narration-ready。
    // 与 scripts/build_binglishengli_course_yaml.py 同一口径（否则成片一出来这道门就误报）。
    const want = fs.existsSync(videoPath) ? 'rendered'
      : fs.existsSync(slidePath) ? 'slides-ready' : 'narration-ready';
    if (has && e.video !== want) bad.push(`${e.slug}: 磁盘实况 ${want}，yaml 写 ${e.video}`);
    if (!has && e.video !== 'planned') bad.push(`${e.slug}: 无 lesson.json 但 yaml 写 ${e.video}`);
    if (has) {
      const L = JSON.parse(fs.readFileSync(p, 'utf8'));
      const want = L.estimateTotalSeconds / 60;
      if (e.est === null || Math.abs(e.est - want) > 0.05) {
        bad.push(`${e.slug}: estimate_minutes ${e.est} ≠ ${want.toFixed(2)}`);
      }
    }
  }
  if (bad.length) no('course.yaml 与旁白一致', `${bad.length} 处，如 ${bad[0]}`);
  else ok(`course.yaml：53 章状态与磁盘一致 · estimate_minutes 与 lesson.json 对齐`);
}

// ── 6. 幻灯片：片数与片内密度 ──────────────────────────────────────
// 这一层最容易「看着有」：只有一张封面页的 HTML 也能让状态升到 slides-ready。
// 核两件事：片数不少于段数（拆分后可以更多），单片正文 ≤700 字（拆分的意义就在这里）。
{
  const miss = [];
  const thin = [];
  const heavy = [];
  const counts = [];
  for (const c of chapters) {
    const p = path.join(COURSE, c.slug, 'slides', 'index.html');
    if (!fs.existsSync(p)) { miss.push(c.slug); continue; }
    const h = fs.readFileSync(p, 'utf8');
    const n = h.split('<section class="slide"').length - 1;
    counts.push(n);
    const L = JSON.parse(fs.readFileSync(path.join(COURSE, c.slug, 'narration', 'lesson.json'), 'utf8'));
    if (n < L.segmentCount) thin.push(`${c.slug}: ${n} 片 < ${L.segmentCount} 段`);
    if (fs.statSync(p).size < 2048) thin.push(`${c.slug}: 文件 < 2 KB（空壳）`);
    for (const sec of h.split('<section class="slide"').slice(1).map((x) => x.split('</section>')[0])) {
      const txt = sec.replace(/<[^>]+>/g, '').replace(/\s/g, '');
      if (txt.length > 700) { heavy.push(`${c.slug}: 单片 ${txt.length} 字`); break; }
    }
  }
  if (miss.length) no('53 章都有 slides/index.html', `${miss.length} 章缺，如 ${miss[0]}`);
  else if (thin.length) no('幻灯片完整', `${thin.length} 处，如 ${thin[0]}`);
  else if (heavy.length) no('单片密度', `${heavy.length} 处超 700 字，如 ${heavy[0]}`);
  else ok(`幻灯片：53 章齐 · 片数 ${Math.min(...counts)}–${Math.max(...counts)} · 单片 ≤700 字`);
}

// ── 7. 配音与字幕：时长是实测值，字幕条数与段数对齐 ────────────
// 这一层最容易自欺：把估算值抄进 audioMeasuredSeconds 也"有数"。
// 所以核三件事：音频文件数与段数相等、字段时间轴不超过实测时长、字幕条数 = 段数。
{
  const bad = [];
  let totalAudio = 0;
  let totalCues = 0;
  for (const c of chapters) {
    const dir = path.join(COURSE, c.slug, 'narration');
    const L = JSON.parse(fs.readFileSync(path.join(dir, 'lesson.json'), 'utf8'));
    const audio = path.join(dir, 'audio');
    const mp3 = fs.existsSync(audio) ? fs.readdirSync(audio).filter((f) => /\.mp3$/.test(f)) : [];
    if (mp3.length !== L.segments.length) bad.push(`${c.slug} 音频 ${mp3.length} 个 ≠ 段数 ${L.segments.length}`);
    const measured = L.audioMeasuredSeconds;
    if (!(measured > 0)) { bad.push(`${c.slug} 无实测时长`); continue; }
    totalAudio += measured;
    // 实测值必须与估算值同量级（差异 >40% 说明抄错了或换了讲稿）
    const est = L.estimateTotalSeconds;
    if (Math.abs(measured / est - 1) > 0.4) bad.push(`${c.slug} 实测 ${measured.toFixed(0)}s 与估算 ${est}s 相差 >40%`);
    const vtt = path.join(dir, 'subtitles.json');
    if (!fs.existsSync(vtt)) { bad.push(`${c.slug} 无 subtitles.json`); continue; }
    const S = JSON.parse(fs.readFileSync(vtt, 'utf8'));
    if (S.cues.length !== L.segments.length) bad.push(`${c.slug} 字幕 ${S.cues.length} 条 ≠ 段数 ${L.segments.length}`);
    totalCues += S.cues.length;
    if (S.audioTotalSeconds !== undefined && Math.abs(S.audioTotalSeconds - measured) > 1) {
      bad.push(`${c.slug} 字幕记录的音频时长 ${S.audioTotalSeconds} ≠ lesson.json 的 ${measured}`);
    }
    const last = S.cues[S.cues.length - 1];
    if (last && last.end > measured + 1) bad.push(`${c.slug} 末条字幕 ${last.end}s 超过实测时长 ${measured.toFixed(1)}s`);
  }
  const name = `配音与字幕：53 章音频齐 · 字幕条数对齐 · 时间轴不越界（${(totalAudio / 60).toFixed(0)} 分钟实测 · ${totalCues} 条字幕）`;
  if (bad.length) no(name, `${bad.length} 处：${bad.slice(0, 3).join('；')}`);
  else ok(name);
}

// ── 8. 幻灯片清单：片↔段映射必须存在，且段号覆盖 1..N ────────────
// 拆片后片数 ≠ 段数，下游（截图 / 成片）靠 manifest 对齐；缺了就会"第 i 段配第 i 片"，
// 错得整齐，最容易当成对的。
{
  const bad = [];
  let totalSlides = 0;
  for (const c of chapters) {
    const mp = path.join(COURSE, c.slug, 'slides', 'manifest.json');
    const L = JSON.parse(fs.readFileSync(path.join(COURSE, c.slug, 'narration', 'lesson.json'), 'utf8'));
    if (!fs.existsSync(mp)) { bad.push(`${c.slug} 缺 slides/manifest.json`); continue; }
    const M = JSON.parse(fs.readFileSync(mp, 'utf8'));
    totalSlides += M.slideCount;
    if (M.slideCount < M.segmentCount) bad.push(`${c.slug} 片数 ${M.slideCount} < 段数 ${M.segmentCount}`);
    const seen = new Set(M.slides.map((s) => s.segment));
    for (let i = 1; i <= L.segments.length; i += 1) if (!seen.has(i)) bad.push(`${c.slug} 第 ${i} 段没有对应片`);
    // 片号必须与 manifest 下标一致（否则截图文件名与 manifest 对不上）
    M.slides.forEach((s, i) => { if (s.n !== i + 1) bad.push(`${c.slug} 片号错位：第 ${i + 1} 项写 n=${s.n}`); });
  }
  const name = `幻灯片清单：53 章片↔段映射齐全 · 每段至少一帧 · 片号连续（共 ${totalSlides} 片）`;
  if (bad.length) no(name, `${bad.length} 处：${bad.slice(0, 3).join('；')}`);
  else ok(name);
}

// ── 9. 成片：时长必须等于实测配音，且有字幕轨 ──────────────────
// 时长不等于配音 = 中间被裁（本仓踩过：concat demuxer 对单帧图片不认 duration，
// 整段只显示第一张，成片比配音短 28%，而日志仍写"成功"）。
{
  const bad = [];
  let n = 0;
  let totalSec = 0;
  for (const c of chapters) {
    const mp4 = path.join(COURSE, c.slug, 'video', 'lesson.mp4');
    const L = JSON.parse(fs.readFileSync(path.join(COURSE, c.slug, 'narration', 'lesson.json'), 'utf8'));
    if (!fs.existsSync(mp4)) { bad.push(`${c.slug} 无 video/lesson.mp4`); continue; }
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', mp4], { encoding: 'utf8' });
    if (r.status !== 0) { bad.push(`${c.slug} ffprobe 读不出成片`); continue; }
    const info = JSON.parse(r.stdout);
    const dur = Number(info.format && info.format.duration);
    if (!(dur > 0)) { bad.push(`${c.slug} 成片时长读不出`); continue; }
    if (Math.abs(dur - L.audioMeasuredSeconds) > 2) {
      bad.push(`${c.slug} 成片 ${dur.toFixed(1)}s ≠ 配音 ${L.audioMeasuredSeconds.toFixed(1)}s`);
    }
    if (!(info.streams || []).some((s) => s.codec_type === 'subtitle')) bad.push(`${c.slug} 成片无字幕轨`);
    n += 1;
    totalSec += dur;
  }
  const name = `成片：${n}/53 章 · 时长等于实测配音 · 带字幕轨（合计 ${(totalSec / 3600).toFixed(1)} 小时）`;
  if (bad.length) no(name, `${bad.length} 处：${bad.slice(0, 3).join('；')}`);
  else ok(name);
}

console.log(`\n# pass ${pass}\n# fail ${fail}`);
if (reds.length) for (const r of reds) console.log('  RED ' + r);
process.exit(fail ? 1 : 0);
