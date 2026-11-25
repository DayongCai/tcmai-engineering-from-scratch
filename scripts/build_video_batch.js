#!/usr/bin/env node
/**
 * scripts/build_video_batch.js —— [tcmP] 批量成片：一门课 / 一个学期 / 全库
 *
 * 为什么需要它：
 *   六个阶段各自的脚本都齐（讲稿 → 幻灯片 → 画面帧 → 配音 → 字幕 → 成片），
 *   但只能一章一章手敲；189 门 / 2,154 章这个量级下「手工点击」就是产能上限。
 *   更麻烦的是跑完还得手工回写 course.yaml —— 忘了写，`tests/test_platform_pipeline.js`
 *   第二天就红（yaml 写 planned、磁盘已经 rendered）。这一步正是最容易被忘的。
 *
 * 它做四件事：
 *   1. 按 course.yaml 的章清单逐章跑流水线（缺工具/失败**立即停在该章**，不伪造）；
 *   2. 成片出得来才回写 course.yaml（video/segments/estimate/measured，数字取
 *      lesson.json 与 ffprobe 实测，不手估）；失败章状态不动；
 *   3. 支持 `--semester` / `--dept` / `--all` 批量按「学期 → 院系 → 课」顺序推，
 *      `--limit` 限本次章数（无人值守长跑时按批切）；
 *   4. 打印逐章矩阵与失败原因；任何一章失败 → 退出码 1。
 *
 * 用法：
 *   node scripts/build_video_batch.js 03-zhenjiu/01-jingluo-xue            # 一门课
 *   node scripts/build_video_batch.js 03-zhenjiu/01-jingluo-xue --resume   # 跳过已成片的章
 *   node scripts/build_video_batch.js <course> --chapter 02-shier-jingmai  # 单章
 *   node scripts/build_video_batch.js --semester 1 --limit 20              # 第 1 学期，最多 20 章
 *   node scripts/build_video_batch.js --all --limit 50 --resume            # 全库，每批 50 章
 *   node scripts/build_video_batch.js --semester 1 --dry                   # 只列计划
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const COURSES = path.join(ROOT, 'platform', 'courses');
const STAGES = [
  { id: 'narration', label: '讲稿', script: 'platform/pipeline/extract_narration.js' },
  { id: 'slides', label: '幻灯片', script: 'platform/pipeline/build_slides.js' },
  { id: 'frames', label: '画面帧', script: 'platform/pipeline/render_frames.js' },
  { id: 'tts', label: '配音', script: 'platform/pipeline/synthesize_narration.js' },
  { id: 'subtitles', label: '字幕', script: 'platform/pipeline/build_subtitles.js' },
  { id: 'video', label: '成片', script: 'platform/pipeline/build_video.js' },
  // 成片后**再跑一次字幕**：字幕要先有才能在成片里嵌轨，但「对视音差」只有成片存在时才量得出。
  // 少了这一步，subtitles.json 里那栏永远是 null，而 tests/test_platform_pipeline.js 要求
  // 「成片已存在 ⇒ 对视音差必须是实测数字」——2026-11-18 就是这么红了 9 章的。
  { id: 'subtitles-final', label: '字幕(实测)', script: 'platform/pipeline/build_subtitles.js' },
];

const argv = process.argv.slice(2);
const flagVal = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : null;
};
const target = argv[0] && !argv[0].startsWith('--') ? argv[0] : null;
const chapterArg = flagVal('--chapter');
const semesterArg = flagVal('--semester');
const deptArg = flagVal('--dept');
const limitArg = flagVal('--limit');
const LIMIT = limitArg ? Number(limitArg) : Infinity;
const RESUME = argv.includes('--resume');
const DRY = argv.includes('--dry');
const ALL = argv.includes('--all');

// ── course.yaml 读写 ───────────────────────────────────────
function readChapters(txt) {
  const out = [];
  let inCh = false;
  let cur = null;
  for (const line of txt.split(/\r?\n/)) {
    if (/^chapters:\s*$/.test(line)) { inCh = true; continue; }
    if (!inCh) continue;
    const m = /^\s*-\s+slug:\s*(\S+)\s*$/.exec(line);
    if (m) { cur = { slug: m[1], video: null }; out.push(cur); continue; }
    const v = /^\s*video:\s*(\S+)/.exec(line);
    if (v && cur) cur.video = v[1];
  }
  return out;
}

/**
 * 回写一章的状态。只动这个 slug 块内的四个键，其余行（注释、title、unit…）原样保留。
 * 顺序固定为 slug → title → segments → video → estimate_minutes → measured_minutes → 其他键，
 * 这样重跑一次结果逐字相同（幂等），不会因为键序变化制造 diff。
 */
function setChapterState(txt, slug, state) {
  const lines = txt.split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^\\s*-\\s+slug:\\s*${slug}\\s*$`).test(l));
  if (start < 0) throw new Error(`course.yaml 里找不到章 ${slug}`);
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i += 1) {
    if (/^\s*-\s+slug:/.test(lines[i]) || /^\S/.test(lines[i])) { end = i; break; }
  }
  const block = lines.slice(start, end);
  const keep = [];
  let titleLine = null;
  for (const l of block) {
    const m = /^\s*([a-zA-Z_][\w]*):\s*(.*)$/.exec(l);
    if (!m) continue;
    const k = m[1];
    if (k === 'slug') continue;
    if (k === 'title') { titleLine = `    title: ${m[2]}`; continue; }
    if (['video', 'segments', 'estimate_minutes', 'measured_minutes'].includes(k)) continue;
    keep.push(`    ${k}: ${m[2]}`.trimEnd());
  }
  const out = [`  - slug: ${slug}`];
  if (titleLine) out.push(titleLine);
  out.push(`    segments: ${state.segments}`);
  out.push(`    video: ${state.video}`);
  if (state.estimateMinutes != null) out.push(`    estimate_minutes: ${state.estimateMinutes}`);
  if (state.measuredMinutes != null) out.push(`    measured_minutes: ${state.measuredMinutes}`);
  out.push(...keep);
  lines.splice(start, end - start, ...out);
  return lines.join('\n');
}

const round2 = (n) => Math.round(n * 100) / 100;

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', timeout: 60 * 60 * 1000 });
  return { ok: r.status === 0, status: r.status, out: `${r.stdout || ''}`, err: `${r.stderr || ''}` };
}

// ── 课程选择 ───────────────────────────────────────────────
function catalogCourses() {
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
  const list = [];
  for (const d of catalog.departments) {
    for (const s of d.subjects) {
      const yamlPath = path.join(COURSES, d.slug, s.slug, 'course.yaml');
      if (!fs.existsSync(yamlPath)) continue;
      list.push({
        id: `${d.slug}/${s.slug}`,
        title: s.title,
        semester: s.semester,
        deptSlug: d.slug,
        deptN: d.n,
        n: s.n,
        yamlPath,
      });
    }
  }
  return list.sort((a, b) => a.semester - b.semester || a.deptN - b.deptN || a.n - b.n);
}

function pickCourses() {
  const all = catalogCourses();
  if (target && target.includes('/')) {
    const hit = all.find((c) => c.id === target);
    if (!hit) {
      // 允许没有 course.yaml 时报清楚，而不是静默跳过
      const y = path.join(COURSES, target, 'course.yaml');
      console.error(`✗ ${fs.existsSync(y) ? '课程存在但 catalog 里找不到' : `缺编排: platform/courses/${target}/course.yaml`}`);
      console.error('  先建: node scripts/scaffold_course_yaml.js ' + target);
      process.exit(1);
    }
    return [hit];
  }
  let list = all;
  if (semesterArg) list = list.filter((c) => Number(c.semester) === Number(semesterArg));
  if (deptArg) list = list.filter((c) => c.deptSlug === deptArg || c.deptSlug.startsWith(deptArg));
  if (!semesterArg && !deptArg && !ALL) {
    console.error('用法: node scripts/build_video_batch.js <dept>/<subject> | --semester N | --dept <slug> | --all');
    console.error('      可选: [--chapter <slug>] [--resume] [--limit N] [--dry]');
    process.exit(1);
  }
  return list;
}

// ── 跑一门课 ───────────────────────────────────────────────
// ── 单实例锁：无人值守长跑必须有，否则两次定时任务撞在同一章上会互相覆盖 ──
const LOCK = path.join(ROOT, 'platform', '.video-batch.lock');
function acquireLock() {
  try {
    const pid = Number(fs.readFileSync(LOCK, 'utf8').trim());
    if (pid && pid !== process.pid) {
      const probe = spawnSync(process.platform === 'win32' ? 'tasklist' : 'ps',
        process.platform === 'win32' ? ['/FI', `PID eq ${pid}`] : ['-p', String(pid)],
        { encoding: 'utf8' });
      const alive = process.platform === 'win32'
        ? new RegExp(`\\b${pid}\\b`).test(String(probe.stdout || '')) && !/No tasks/i.test(String(probe.stdout || ''))
        : probe.status === 0;
      if (alive) {
        console.error(`✗ 已有批量任务在跑（PID ${pid}，锁 ${path.relative(ROOT, LOCK)}）—— 本次退出，不并行。`);
        process.exit(0);
      }
    }
  } catch { /* 没有锁文件就是没在跑 */ }
  fs.writeFileSync(LOCK, String(process.pid), 'utf8');
  const release = () => { try { fs.unlinkSync(LOCK); } catch { /* 已删 */ } };
  process.on('exit', release);
  process.on('SIGINT', () => { release(); process.exit(130); });
  process.on('SIGTERM', () => { release(); process.exit(143); });
}
acquireLock();

const results = [];
let budget = LIMIT;

function renderCourse(course) {
  const [dept, subject] = course.id.split('/');
  const cdir = path.join(COURSES, course.id);
  const subjectDir = path.join(ROOT, 'departments', course.id);
  let yamlText = fs.readFileSync(course.yamlPath, 'utf8');
  const staleOnly = argv.includes('--stale');
  let chapters = readChapters(yamlText).filter((c) => !chapterArg || c.slug === chapterArg);
  // --stale：只重做「正文比讲稿新」或还没有讲稿的章。
  // 为什么需要它：正文被补实后旧讲稿仍是薄稿，成片就成了 1 分钟空壳（全库实测 1739 章）。
  if (staleOnly) {
    chapters = chapters.filter((c) => {
      const d = path.join(subjectDir, 'chapters', String(c.slug), 'docs', 'zh.md');
      const l = path.join(cdir, String(c.slug), 'narration', 'lesson.json');
      if (!fs.existsSync(d)) return false;
      if (!fs.existsSync(l)) return true;
      return fs.statSync(d).mtimeMs > fs.statSync(l).mtimeMs;
    });
    if (!chapters.length) { console.log(`  ✓ ${course.id}: 没有陈旧章，跳过`); return; }
    console.log(`  ↻ ${course.id}: 陈旧章 ${chapters.length} 个，逐个重做`);
  }
  if (chapterArg && !chapters.length) {
    console.error(`✗ ${course.id} 的 course.yaml 里没有章 ${chapterArg}`);
    process.exit(1);
  }

  for (const ch of chapters) {
    if (budget <= 0) return;
    const docPath = path.join(subjectDir, 'chapters', ch.slug, 'docs', 'zh.md');
    if (!fs.existsSync(docPath)) {
      console.log(`  ⬚ ${course.id}/${ch.slug}: 缺 docs/zh.md，跳过`);
      results.push({ course: course.id, slug: ch.slug, status: 'nodoc' });
      continue;
    }
    const mp4 = path.join(cdir, ch.slug, 'video', 'lesson.mp4');
    if (RESUME && fs.existsSync(mp4)) {
      results.push({ course: course.id, slug: ch.slug, status: 'skipped' });
      continue;
    }

    console.log(`  ▶ ${course.id}/${ch.slug}`);
    budget -= 1;
    let failed = null;
    for (const stage of STAGES) {
      const r = run(process.execPath, [stage.script, course.id, '--chapter', ch.slug]);
      if (!r.ok) {
        // 注意键名：这里**不能**用 status —— 它会把下面 results 里的 status:'failed' 覆盖成退出码（数字），
        // 于是 tally 里多出一个 "1" 键、失败计数恒为 0，整批明明有章失败却 exit 0。
        // 2026-11-19 学期 7/8 各有 1–3 章「消失」且退出码为 0，就是这个原因。
        failed = { stage: stage.label, exitCode: r.status, tail: (r.err || r.out).trim().split('\n').slice(-4).join(' | ') };
        break;
      }
    }
    if (failed) {
      console.log(`     ✗ 停在「${failed.stage}」(${failed.exitCode})：${failed.tail}`);
      results.push({ course: course.id, slug: ch.slug, status: 'failed', ...failed });
      continue;
    }

    const lessonPath = path.join(cdir, ch.slug, 'narration', 'lesson.json');
    const L = fs.existsSync(lessonPath) ? JSON.parse(fs.readFileSync(lessonPath, 'utf8')) : null;
    const hasMp4 = fs.existsSync(mp4) && fs.statSync(mp4).size > 0;
    if (!hasMp4 || !L || !L.audioMeasuredSeconds) {
      console.log('     ✗ 流水线全绿但没有可核的成片/实测时长，yaml 不回写');
      results.push({ course: course.id, slug: ch.slug, status: 'unverified' });
      continue;
    }
    const state = {
      video: 'rendered',
      segments: Array.isArray(L.segments) ? L.segments.length : 0,
      estimateMinutes: L.estimateTotalSeconds ? round2(L.estimateTotalSeconds / 60) : null,
      measuredMinutes: round2(L.audioMeasuredSeconds / 60),
    };
    yamlText = setChapterState(yamlText, ch.slug, state);
    fs.writeFileSync(course.yamlPath, yamlText, 'utf8');
    console.log(`     ✅ 成片 ${(fs.statSync(mp4).size / 1048576).toFixed(1)} MB · ${state.measuredMinutes} 分钟（实测）· yaml 已回写`);
    results.push({ course: course.id, slug: ch.slug, status: 'rendered', ...state });
  }
}

// ── 主流程 ─────────────────────────────────────────────────
const courses = pickCourses();
console.log(`═══ [tcmP] 批量成片 · ${courses.length} 门课${semesterArg ? ` · 第 ${semesterArg} 学期` : ''}${deptArg ? ` · ${deptArg}` : ''}${chapterArg ? ` · 章 ${chapterArg}` : ''} ═══\n`);
console.log(`  阶段 ${STAGES.map((s) => s.label).join(' → ')}${RESUME ? ' · resume' : ''}${Number.isFinite(LIMIT) ? ` · 本次上限 ${LIMIT} 章` : ''}\n`);

if (DRY) {
  let total = 0;
  let done = 0;
  for (const c of courses) {
    const chapters = readChapters(fs.readFileSync(c.yamlPath, 'utf8'));
    const haveMp4 = chapters.filter((ch) => fs.existsSync(path.join(COURSES, c.id, ch.slug, 'video', 'lesson.mp4'))).length;
    total += chapters.length;
    done += haveMp4;
    console.log(`  · ${c.id}  第 ${c.semester} 学期 · ${chapters.length} 章 · 已成片 ${haveMp4}`);
  }
  console.log(`\n  合计 ${total} 章 · 已成片 ${done} · 待渲染 ${total - done}`);
  process.exit(0);
}

const t0 = Date.now();
for (const c of courses) {
  if (budget <= 0) { console.log(`\n  （已达本次上限 ${LIMIT} 章，停）`); break; }
  const before = results.length;
  renderCourse(c);
  if (results.length === before) continue;
  const rendered = results.slice(before).filter((r) => r.status === 'rendered').length;
  if (rendered) console.log(`  ── ${c.id}: 本次成片 ${rendered} 章`);
}

const tally = results.reduce((m, r) => ({ ...m, [r.status]: (m[r.status] || 0) + 1 }), {});
// 记账自洽：每个 result 必须落在已知状态里，且各状态之和 == 结果条数。
// 「章数对不上自己」比失败更危险 —— 失败会打红字，漏记不会（2026-11-19 学期 7/8 各漏 1–3 章）。
const KNOWN = new Set(['rendered', 'skipped', 'nodoc', 'failed', 'unverified']);
const unknown = Object.keys(tally).filter((k) => !KNOWN.has(k));
const accounted = Object.entries(tally).reduce((n, [k, v]) => (KNOWN.has(k) ? n + v : n), 0);
if (unknown.length || accounted !== results.length) {
  console.error(`\n✗ 记账自洽失败：结果 ${results.length} 条，已分类 ${accounted} 条，未知状态 ${unknown.join('、') || '无'}`);
  process.exit(1);
}
const mins = Math.round((Date.now() - t0) / 60000);
console.log(`\n  合计: ${results.length} 章 · 成片 ${tally.rendered || 0} · 跳过 ${tally.skipped || 0} · 无正文 ${tally.nodoc || 0} · 失败 ${tally.failed || 0} · 未验 ${tally.unverified || 0} · 用时 ${mins} 分钟`);
if (tally.rendered) {
  const per = mins > 0 ? (tally.rendered / mins).toFixed(2) : '—';
  console.log(`  速率: ${per} 章/分钟（本机实测，含 TTS 与 ffmpeg 编码）`);
}
console.log('  下一步: node scripts/build_video_ledger.js   # 重算成片台账');

if (tally.failed || tally.unverified) process.exit(1);
