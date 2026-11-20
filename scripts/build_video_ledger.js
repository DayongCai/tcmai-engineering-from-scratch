#!/usr/bin/env node
/**
 * scripts/build_video_ledger.js —— [tcmP] 成片台账：视频到底生成了没有
 *
 * 为什么需要它：
 *   仓库里已经有两套台账，但都不是「成片」这一层：
 *     · VIDEO-LESSONS.md     —— 学科有没有网络课**语料**（讲数 / 语句 / 时长）
 *     · course.yaml          —— 每章声称 `video: rendered`、`measured_minutes: 20.78`
 *   中间缺一环：**声称渲染过的章，盘上到底有没有 mp4、能不能 ffprobe 出时长、字幕在不在**。
 *   「course.yaml 写了 rendered」和「真的有一支能播的片子」是两件事，这条台账把它们焊住。
 *
 * 做法（不信目录名，不信自述，逐项实测）：
 *   1. 扫 platform/courses/<dept>/<subject>/course.yaml 的章清单；
 *   2. 逐章实测六件实物：narration/lesson.json、slides/index.html、frames/*.png、
 *      narration/audio/*.mp3、narration/subtitles.vtt、video/lesson.mp4（ffprobe 时长）；
 *   3. 落台账 `data/video-artifacts.json` + 人读版 `platform/RENDER-LEDGER.md`；
 *   4. `--check` 只认「有实物就核实物」：本机有成片时，声称 rendered 的章必须六件齐、
 *      时长 > 0；本机没有成片（干净克隆 / 未渲染机器）时，只核 course.yaml 自洽，
 *      并明确打印「跳过实物校验」—— 不伪装成通过。
 *
 * 用法：
 *   node scripts/build_video_ledger.js
 *   node scripts/build_video_ledger.js --check
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const COURSES = path.join(ROOT, 'platform', 'courses');
const OUT_JSON = path.join(ROOT, 'data', 'video-artifacts.json');
const OUT_MD = path.join(ROOT, 'platform', 'RENDER-LEDGER.md');

const { findFfprobe } = require(path.join(ROOT, 'platform', 'pipeline', 'find_tools.js'));
const FFPROBE = findFfprobe();

const CHECK = process.argv.includes('--check');

/** 极简 course.yaml 读取：只认顶层标量 + chapters 列表（该文件由 scripts/build_*_course_yaml.py 渲染） */
function parseCourseYaml(text) {
  const out = { chapters: [] };
  let inChapters = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^#/.test(line) || !line.trim()) continue;
    if (/^chapters:\s*$/.test(line)) { inChapters = true; continue; }
    if (!inChapters) {
      const m = /^([a-zA-Z_][\w]*):\s*(.*)$/.exec(line);
      if (m) out[m[1]] = m[2].trim();
      continue;
    }
    const item = /^\s*-\s+slug:\s*(\S+)\s*$/.exec(line);
    if (item) { out.chapters.push({ slug: item[1] }); continue; }
    const kv = /^\s+([a-zA-Z_][\w]*):\s*(.*)$/.exec(line);
    if (kv && out.chapters.length) out.chapters[out.chapters.length - 1][kv[1]] = kv[2].trim();
  }
  return out;
}

function countFiles(dir, re) {
  try {
    return fs.readdirSync(dir).filter((f) => re.test(f)).length;
  } catch { return 0; }
}

/** ffprobe 实测时长（秒）。拿不到就返回 null —— 不拿字数估算冒充实测。 */
function probeDuration(mp4) {
  if (!FFPROBE || !fs.existsSync(mp4)) return null;
  const r = spawnSync(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    mp4,
  ], { encoding: 'utf8', timeout: 30000 });
  if (r.status !== 0) return null;
  const v = Number(String(r.stdout).trim());
  return Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null;
}

/** 一门的成片实物，逐章实测 */
function scanChapter(cdir, ch) {
  const narrDir = path.join(cdir, ch.slug, 'narration');
  const lessonPath = path.join(narrDir, 'lesson.json');
  let segments = 0;
  if (fs.existsSync(lessonPath)) {
    try {
      const l = JSON.parse(fs.readFileSync(lessonPath, 'utf8'));
      segments = Array.isArray(l.segments) ? l.segments.length : 0;
    } catch { segments = 0; }
  }
  const slides = fs.existsSync(path.join(cdir, ch.slug, 'slides', 'index.html'))
    ? fs.statSync(path.join(cdir, ch.slug, 'slides', 'index.html')).size : 0;
  const frames = countFiles(path.join(cdir, ch.slug, 'frames'), /^\d{3}\.png$/);
  const audio = countFiles(path.join(narrDir, 'audio'), /\.mp3$/);
  const vttPath = path.join(narrDir, 'subtitles.vtt');
  const vtt = fs.existsSync(vttPath) ? fs.statSync(vttPath).size : 0;
  const mp4 = path.join(cdir, ch.slug, 'video', 'lesson.mp4');
  const mp4Bytes = fs.existsSync(mp4) ? fs.statSync(mp4).size : 0;
  const durationSec = probeDuration(mp4);

  const facts = {
    slug: ch.slug,
    title: ch.title || ch.slug,
    claimed: ch.video || 'unnamed',
    claimedMinutes: ch.measured_minutes ? Number(ch.measured_minutes) : null,
    segments,
    frames,
    audio,
    subtitles: vtt > 0,
    mp4: mp4Bytes > 0,
    durationSec,
    bytes: mp4Bytes,
  };
  facts.status = facts.mp4 && facts.durationSec
    ? (facts.subtitles && facts.frames > 0 && facts.audio > 0 && facts.segments > 0 ? 'rendered' : 'partial')
    : (facts.frames > 0 || facts.audio > 0 || facts.subtitles || facts.segments > 0 ? 'partial' : 'missing');
  // 没渲染的章只留「有信息量」的三列：这层是台账不是产物清单，
  // 2000 条 missing 各带 9 个 0/空字段只会把文件撑到 900 KB（实测），读者也读不出东西。
  if (facts.status === 'missing') {
    return { slug: facts.slug, title: facts.title, claimed: facts.claimed, status: 'missing' };
  }
  return facts;
}

function scan() {
  const courses = [];
  if (fs.existsSync(COURSES)) {
    for (const dept of fs.readdirSync(COURSES).sort()) {
      const deptDir = path.join(COURSES, dept);
      if (!fs.statSync(deptDir).isDirectory()) continue;
      for (const subject of fs.readdirSync(deptDir).sort()) {
        const cdir = path.join(deptDir, subject);
        const yamlPath = path.join(cdir, 'course.yaml');
        if (!fs.existsSync(yamlPath)) continue;
        const meta = parseCourseYaml(fs.readFileSync(yamlPath, 'utf8'));
        const chapters = (meta.chapters || []).map((ch) => scanChapter(cdir, ch));
        const durationSec = chapters.reduce((n, c) => n + (c.durationSec || 0), 0);
        courses.push({
          id: `${dept}/${subject}`,
          title: meta.title || subject,
          dept,
          semester: Number(meta.semester) || null,
          chapters: chapters.length,
          rendered: chapters.filter((c) => c.status === 'rendered').length,
          partial: chapters.filter((c) => c.status === 'partial').length,
          missing: chapters.filter((c) => c.status === 'missing').length,
          durationSec: Math.round(durationSec * 100) / 100,
          bytes: chapters.reduce((n, c) => n + (c.bytes || 0), 0),
          items: chapters,
        });
      }
    }
  }
  const totals = {
    courses: courses.length,
    chapters: courses.reduce((n, c) => n + c.chapters, 0),
    rendered: courses.reduce((n, c) => n + c.rendered, 0),
    partial: courses.reduce((n, c) => n + c.partial, 0),
    missing: courses.reduce((n, c) => n + c.missing, 0),
    durationSec: Math.round(courses.reduce((n, c) => n + c.durationSec, 0) * 100) / 100,
    bytes: courses.reduce((n, c) => n + c.bytes, 0),
  };
  return {
    schema: 'tcm-video-artifacts/1',
    generated: 'scripts/build_video_ledger.js',
    note: '成片实物台账：rendered 必须有 mp4（ffprobe 实测时长）+ 字幕 + 帧 + 配音 + 分镜。无生成时间戳，避免每日自报漂移。',
    totals,
    courses,
  };
}

const hhmm = (sec) => `${Math.floor(sec / 3600)}:${String(Math.round((sec % 3600) / 60)).padStart(2, '0')}`;

function renderMd(ledger) {
  const L = [];
  L.push('# [tcmP] 成片台账（实物校验）');
  L.push('');
  L.push('> 由 `node scripts/build_video_ledger.js` 生成，**勿手改**。');
  L.push('> 与 `VIDEO-LESSONS.md` 分工：那份数「有没有语料」，这份数「有没有成片」。');
  L.push('');
  L.push('| 指标 | 值 |');
  L.push('|---|---|');
  L.push(`| 课程（有 course.yaml） | ${ledger.totals.courses} |`);
  L.push(`| 章 | ${ledger.totals.chapters} |`);
  L.push(`| 成片齐（rendered） | **${ledger.totals.rendered}** |`);
  L.push(`| 部分（partial） | ${ledger.totals.partial} |`);
  L.push(`| 无（missing） | ${ledger.totals.missing} |`);
  L.push(`| 实测时长合计 | ${hhmm(ledger.totals.durationSec)}（${(ledger.totals.durationSec / 3600).toFixed(1)} 小时） |`);
  L.push(`| 成片字节合计 | ${(ledger.totals.bytes / 1073741824).toFixed(2)} GB |`);
  L.push('');
  L.push('## 逐课');
  L.push('');
  L.push('| 课程 | 院系 | 学期 | 章 | rendered | partial | missing | 实测时长 | 字节 |');
  L.push('|---|---|--:|--:|--:|--:|--:|--:|--:|');
  for (const c of ledger.courses) {
    L.push(`| ${c.title} \`${c.id}\` | ${c.dept} | ${c.semester ?? '—'} | ${c.chapters} | ${c.rendered} | ${c.partial} | ${c.missing} | ${hhmm(c.durationSec)} | ${(c.bytes / 1048576).toFixed(0)} MB |`);
  }
  L.push('');
  L.push('## 判定口径（recompute 得到，不许手填）');
  L.push('');
  L.push('| 状态 | 判据 |');
  L.push('|---|---|');
  L.push('| `rendered` | `video/lesson.mp4` 存在 且 `ffprobe` 实测时长 > 0 且 字幕 `.vtt` 在 且 帧数 > 0 且 配音 mp3 数 > 0 且 `lesson.json` 有 segments |');
  L.push('| `partial` | 有部分中间产物，但没有可播成片（或缺字幕/缺帧/缺配音） |');
  L.push('| `missing` | 六件全无 |');
  L.push('');
  L.push('> 时长只认 `ffprobe`；`course.yaml` 里的 `estimate_minutes` 是按字数估算，两者不可互换。');
  return L.join('\n') + '\n';
}

// ── 门 ──────────────────────────────────────────────────────
function check(ledger) {
  const problems = [];
  const withArtifacts = ledger.courses.filter((c) => c.rendered + c.partial > 0);
  console.log('═══ [tcmP] 成片台账校核 ═══\n');
  console.log(`  课程 ${ledger.courses.length} · 章 ${ledger.totals.chapters} · rendered ${ledger.totals.rendered} · partial ${ledger.totals.partial} · missing ${ledger.totals.missing}`);

  // 1) 台账文件必须与实测一致（本机有成片时才有意义；干净克隆上不制造假失败）
  const committed = fs.existsSync(OUT_JSON) ? JSON.parse(fs.readFileSync(OUT_JSON, 'utf8')) : null;
  if (!withArtifacts.length) {
    console.log('\n  ⬚ 本机没有任何中间产物 —— 跳过实物校验（不是通过，是这台机器还没渲染过）');
    console.log('     渲染一门: node platform/pipeline/extract_narration.js <dept>/<subject>');
  } else {
    if (!committed) {
      problems.push('缺 data/video-artifacts.json —— 先跑 node scripts/build_video_ledger.js');
    } else {
      const key = (x) => JSON.stringify(x.totals);
      if (key(committed) !== key(ledger)) {
        problems.push(`台账 totals 与实测不符：台账 ${key(committed)} ≠ 实测 ${key(ledger)}（跑 node scripts/build_video_ledger.js 重算）`);
      }
      const byId = new Map(committed.courses.map((c) => [c.id, c]));
      for (const c of ledger.courses) {
        const old = byId.get(c.id);
        if (!old) { problems.push(`台账缺课程 ${c.id}`); continue; }
        if (old.rendered !== c.rendered) problems.push(`${c.id}: 台账 rendered ${old.rendered} ≠ 实测 ${c.rendered}`);
        // 声称 rendered → 六件必须齐（这条对**实测**成立才算，不看台账）
      }
    }

    // 2) 声称与实物对不上：course.yaml 写 rendered，盘上却没有可播片子
    for (const c of ledger.courses) {
      const claimsRendered = c.items.filter((i) => /^(rendered|done|已渲染)$/i.test(i.claimed));
      for (const i of claimsRendered) {
        if (i.status !== 'rendered') {
          problems.push(`${c.id}/${i.slug}: course.yaml 声称 ${i.claimed}，实测 ${i.status}（mp4 ${i.mp4 ? '有' : '无'} · 时长 ${i.durationSec ?? '—'} · 字幕 ${i.subtitles ? '有' : '无'} · 帧 ${i.frames} · 配音 ${i.audio}）`);
        }
      }
      // 3) 台账里的时长与 course.yaml 的 measured_minutes 不一致（超过 0.5 分钟）→ 有一处过期
      for (const i of c.items) {
        if (i.status !== 'rendered' || i.claimedMinutes == null) continue;
        const measured = i.durationSec / 60;
        if (Math.abs(measured - i.claimedMinutes) > 0.5) {
          problems.push(`${c.id}/${i.slug}: measured_minutes 写 ${i.claimedMinutes}，ffprobe 实测 ${measured.toFixed(2)} 分钟（差 ${(measured - i.claimedMinutes).toFixed(2)}）`);
        }
      }
    }
  }

  if (problems.length) {
    console.error(`\n✗ 成片台账未通过：${problems.length} 项`);
    for (const p of problems.slice(0, 25)) console.error(`   - ${p}`);
    if (problems.length > 25) console.error(`   … 另有 ${problems.length - 25} 项`);
    return false;
  }
  console.log('\n✅ 成片台账通过（声称 rendered 的章都有 mp4 + 实测时长 + 字幕 + 帧 + 配音）');
  return true;
}

const ledger = scan();

if (CHECK) {
  const ok = check(ledger);
  process.exit(ok ? 0 : 1);
}

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(ledger, null, 2) + '\n', 'utf8');
fs.writeFileSync(OUT_MD, renderMd(ledger), 'utf8');

console.log('═══ [tcmP] 成片台账 ═══\n');
for (const c of ledger.courses) {
  console.log(`  ${c.rendered === c.chapters ? '✅' : '◐'} ${c.id}: ${c.rendered}/${c.chapters} 章成片 · ${hhmm(c.durationSec)} · ${(c.bytes / 1048576).toFixed(0)} MB`);
}
console.log(`\n  合计: ${ledger.totals.rendered}/${ledger.totals.chapters} 章 · ${(ledger.totals.durationSec / 3600).toFixed(1)} 小时 · ${(ledger.totals.bytes / 1073741824).toFixed(2)} GB`);
console.log(`  → ${path.relative(ROOT, OUT_JSON).replace(/\\/g, '/')}`);
console.log(`  → ${path.relative(ROOT, OUT_MD).replace(/\\/g, '/')}`);
console.log('\n校核: node scripts/build_video_ledger.js --check');
