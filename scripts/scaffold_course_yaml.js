#!/usr/bin/env node
/**
 * scripts/scaffold_course_yaml.js —— [tcmP] 给学科补 course.yaml（视频生产的起点）
 *
 * 为什么需要它：
 *   视频流水线的入口是 `platform/courses/<dept>/<subject>/course.yaml`：
 *   没有它，extract_narration / build_slides / render_frames / synthesize_narration /
 *   build_video 一律无从谈起。而 189 门学科里只有 5 门有这个文件 —— 于是「视频课」这件事
 *   在其余 184 门上根本启动不了，不是内容不够，是**没有编排入口**。
 *
 * 做法：
 *   1. 从 departments/<dept>/<subject>/meta.json 取课程元数据（学期 / 学时 / 前置 / 类型）；
 *   2. 章清单只收**有 docs/zh.md 的章** —— 没有正文的章进了编排，流水线第一步就会退出；
 *   3. 生成的 course.yaml 里 `video: planned`：这是「可渲染」的声明，不是「已渲染」；
 *      状态词只有五档（planned / narration-ready / slides-ready / rendered / published），
 *      且必须与磁盘实况一致（tests/test_platform_pipeline.js 逐章核）；
 *   4. 已存在的 course.yaml **不覆盖**（那 5 门有实测数字，覆盖即毁）；`--force` 才重写。
 *
 * `--check` 核的是**已有编排与磁盘是否对得上**（不是逐字相同）：
 *   · 每个已存在的 course.yaml，章清单必须与「有 docs/zh.md 的章目录」逐个一致；
 *   · id / dept / semester 必须与 meta.json 一致。
 *   这条门正是 2026-11-10 那类事故（占位章名与磁盘不符，extract_narration 直接退出）的解药。
 *
 * 用法：
 *   node scripts/scaffold_course_yaml.js 01-zhongyi/01-zhongyi-jichu-lilun
 *   node scripts/scaffold_course_yaml.js --all
 *   node scripts/scaffold_course_yaml.js --check
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DEPTS = path.join(ROOT, 'departments');
const COURSES = path.join(ROOT, 'platform', 'courses');

const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const ALL = argv.includes('--all');
const FORCE = argv.includes('--force');
const target = argv.find((a) => !a.startsWith('--'));

if (!CHECK && !ALL && !target) {
  console.error('用法: node scripts/scaffold_course_yaml.js <dept>/<subject> [--force] | --all | --check');
  process.exit(1);
}

/** 有正文的章：章目录下必须有 docs/zh.md（流水线第一步的硬前提） */
function chaptersWithDocs(subjectDir) {
  const dir = path.join(subjectDir, 'chapters');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((d) => fs.existsSync(path.join(dir, d, 'docs', 'zh.md')))
    .sort();
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

/** 极简 course.yaml 读取：顶层标量 + chapters[].slug */
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

/** 章标题：优先 chapters.json（教学章名与章号），退回 meta.json，再退回目录名 */
function chapterTitle(subjectDir, slug, n) {
  const cj = path.join(subjectDir, 'chapters.json');
  const meta = path.join(subjectDir, 'meta.json');
  for (const p of [cj, meta]) {
    if (!fs.existsSync(p)) continue;
    const j = readJson(p);
    const hit = (j.chapters || []).find((c) => c.slug === slug);
    if (hit && hit.title) return `第${hit.n ?? n}章 ${hit.title}`;
  }
  return `第${n}章 ${slug.replace(/^\d+-/, '')}`;
}

function courseYaml(meta, subjectDir, slugs) {
  const lines = [];
  lines.push(`# [tcmP] 课程编排 · ${meta.deptSlug}/${meta.slug}`);
  lines.push('#');
  lines.push(`# 由 node scripts/scaffold_course_yaml.js 生成（首版）。之后手工维护：`);
  lines.push(`# 单一事实来源是 departments/${meta.deptSlug}/${meta.slug}/chapters/<slug>/docs/zh.md；`);
  lines.push('# 本文件只登记「讲什么、什么状态」，不重复正文。');
  lines.push('#');
  lines.push('# chapters[].slug 必须与 chapters/ 下的目录名完全一致，否则 extract_narration.js 报错退出。');
  lines.push('# `video: planned` = 可渲染（正文在），不是已渲染；');
  lines.push('# 状态词只有五档：planned / narration-ready / slides-ready / rendered / published，');
  lines.push('# 必须与磁盘实况一致（tests/test_platform_pipeline.js 逐章核）。');
  lines.push('');
  lines.push(`id: ${meta.slug}`);
  lines.push(`title: ${meta.title}`);
  if (meta.en) lines.push(`en: ${meta.en}`);
  lines.push(`dept: ${meta.deptSlug}`);
  lines.push(`dept_title: ${meta.deptTitle}`);
  lines.push(`semester: ${meta.semester}`);
  lines.push(`stage: ${meta.stage}`);
  lines.push(`hours: ${meta.hours}`);
  lines.push(`chapters_target: ${meta.chaptersTarget ?? slugs.length}`);
  if (meta.bridge) lines.push(`bridge: ${meta.bridge}`);
  lines.push('');
  lines.push('platform:');
  lines.push('  host: 站点内嵌播放器（site/ 自动挂载）');
  lines.push('  resolution: 1920x1080');
  lines.push('  fps: 25');
  lines.push('  voice: zh-CN edge-tts（缺失时降级为静音轨 + 人工配音）');
  lines.push('  captions: 由 narration/lesson.json 的 segments 生成，时间码只取 TTS 返回或 ffprobe 实测');
  lines.push('');
  lines.push('chapters:');
  slugs.forEach((slug, i) => {
    lines.push(`  - slug: ${slug}`);
    lines.push(`    title: ${chapterTitle(subjectDir, slug, i + 1)}`);
    lines.push('    video: planned');
    lines.push('    segments: 0');
  });
  return lines.join('\n') + '\n';
}

function subjects() {
  const out = [];
  for (const dept of fs.readdirSync(DEPTS).sort()) {
    const deptDir = path.join(DEPTS, dept);
    if (!fs.statSync(deptDir).isDirectory()) continue;
    for (const subject of fs.readdirSync(deptDir).sort()) {
      const dir = path.join(deptDir, subject);
      if (!fs.existsSync(path.join(dir, 'meta.json'))) continue;
      out.push({ dept, subject, dir });
    }
  }
  return out;
}

// ── 校核 ────────────────────────────────────────────────────
function runCheck() {
  console.log('═══ [tcmP] 课程编排校核 ═══\n');
  const problems = [];
  let existing = 0;
  let ready = 0;
  for (const s of subjects()) {
    const meta = readJson(path.join(s.dir, 'meta.json'));
    const slugs = chaptersWithDocs(s.dir);
    if (slugs.length) ready += 1;
    const yamlPath = path.join(COURSES, s.dept, s.subject, 'course.yaml');
    if (!fs.existsSync(yamlPath)) continue;
    existing += 1;
    const y = parseCourseYaml(fs.readFileSync(yamlPath, 'utf8'));
    const got = y.chapters.map((c) => c.slug);
    const missing = slugs.filter((x) => !got.includes(x));
    const extra = got.filter((x) => !slugs.includes(x));
    if (missing.length) problems.push(`${s.dept}/${s.subject}: 编排缺 ${missing.length} 章（有正文但没进 course.yaml）：${missing.slice(0, 3).join('、')}${missing.length > 3 ? ' …' : ''}`);
    if (extra.length) problems.push(`${s.dept}/${s.subject}: 编排多 ${extra.length} 章（磁盘上没有 docs/zh.md）：${extra.slice(0, 3).join('、')}${extra.length > 3 ? ' …' : ''}`);
    if (y.id && y.id !== s.subject) problems.push(`${s.dept}/${s.subject}: id 写 ${y.id}，目录是 ${s.subject}`);
    if (y.dept && y.dept !== s.dept) problems.push(`${s.dept}/${s.subject}: dept 写 ${y.dept}，实际 ${s.dept}`);
    if (y.semester && Number(y.semester) !== Number(meta.semester)) problems.push(`${s.dept}/${s.subject}: semester 写 ${y.semester}，meta.json 是 ${meta.semester}`);
  }
  console.log(`  已建编排 ${existing} 门 · 有正文可编排 ${ready} 门`);
  if (problems.length) {
    console.error(`\n✗ 编排与磁盘不一致：${problems.length} 项`);
    for (const p of problems.slice(0, 20)) console.error(`   - ${p}`);
    if (problems.length > 20) console.error(`   … 另有 ${problems.length - 20} 项`);
    console.error('\n  修法：删掉有问题的那门 course.yaml 再跑 node scripts/scaffold_course_yaml.js <dept>/<subject>');
    console.error('  （已有实测数字的课优先手工改 slug，别整份重生成）');
    return false;
  }
  console.log('\n✅ 课程编排通过（已建编排的章清单与磁盘逐条一致）');
  return true;
}

if (CHECK) process.exit(runCheck() ? 0 : 1);

const picks = ALL ? subjects() : (() => {
  const [dept, subject] = target.split('/');
  const dir = path.join(DEPTS, dept || '', subject || '');
  if (!dept || !subject || !fs.existsSync(path.join(dir, 'meta.json'))) {
    console.error(`✗ 找不到学科: departments/${target}/meta.json`);
    process.exit(1);
  }
  return [{ dept, subject, dir }];
})();

console.log('═══ [tcmP] 课程编排脚手架 ═══\n');
let created = 0;
let skipped = 0;
let empty = 0;
const summary = [];
for (const s of picks) {
  const meta = readJson(path.join(s.dir, 'meta.json'));
  const slugs = chaptersWithDocs(s.dir);
  if (!slugs.length) {
    empty += 1;
    summary.push(`  ⬚ ${s.dept}/${s.subject}: 没有 docs/zh.md 的章，未生成`);
    continue;
  }
  const outPath = path.join(COURSES, s.dept, s.subject, 'course.yaml');
  if (fs.existsSync(outPath) && !FORCE) {
    skipped += 1;
    continue;
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, courseYaml(meta, s.dir, slugs), 'utf8');
  created += 1;
  summary.push(`  ✅ ${s.dept}/${s.subject}: ${slugs.length} 章 → ${path.relative(ROOT, outPath).replace(/\\/g, '/')}`);
}

for (const line of summary) console.log(line);
console.log(`\n  新建 ${created} 门 · 跳过（已存在） ${skipped} 门 · 无正文 ${empty} 门`);
if (created) {
  console.log('\n渲染一讲（先讲稿，再画面/配音/成片）:');
  console.log('  node platform/pipeline/extract_narration.js <dept>/<subject> --chapter <slug>');
  console.log('  node platform/pipeline/build_slides.js     <dept>/<subject> --chapter <slug>');
}
