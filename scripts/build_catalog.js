#!/usr/bin/env node
/**
 * build_catalog.js — 由 curriculum.json 生成 catalog.json 与 site/data.js
 *
 *   catalog.json   机器可读全量课程表（含文件系统探测到的进度）
 *   site/data.js   站点运行时数据（window.TCMAI_DATA）
 *
 * 二者均为生成物，不入库手工编辑。CI 在 main 分支上重建。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
  ROOT,
  TRACKS,
  loadCurriculum,
  semesterPlan,
  subjectStatus,
  readMeta,
  writeJson,
  countPublishedVideos,
} = require('./lib');

const cur = loadCurriculum();

// ---- 学科 + 进度 ----
const departments = cur.departments.map((d) => ({
  n: d.n,
  slug: d.slug,
  title: d.title,
  en: d.en,
  icon: d.icon,
  focus: d.focus,
  path: d.path,
  hours: d.hours,
  chapters: d.chapters,
  subjects: d.subjects.map((s) => {
    const st = subjectStatus(s);
    const meta = readMeta(s);
    return {
      n: s.n,
      globalN: s.globalN,
      slug: s.slug,
      title: s.title,
      en: s.en,
      type: s.type,
      semester: s.semester,
      stage: s.stageId,
      hours: s.hours,
      chaptersTarget: s.chapters,
      chaptersBuilt: st.built,
      pct: st.pct,
      status: st.status,
      glyph: st.glyph,
      bridge: s.bridge,
      path: s.path,
      prereq: s.prereqFull || [],
      platform: meta ? meta.platform || null : null,
      textbook: meta ? meta.textbook || null : null,
    };
  }),
}));

// ---- 先修图：前置 / 后续 / 链深 / 根课理由 ----
// 学生页面上要回答两个问题：① 这门课要先学什么；② 它如果是根课，凭什么没有前置。
// 「凭什么」只能来自 data/prereq-roots.json —— 那里每条根课都写清了前置在哪个体系里。
const rootsPath = path.join(ROOT, 'data', 'prereq-roots.json');
const rootsDoc = fs.existsSync(rootsPath) ? JSON.parse(fs.readFileSync(rootsPath, 'utf8')) : { roots: [] };
const rootWhy = new Map((rootsDoc.roots || []).map((r) => [r.key, r.why]));

const flat = departments.flatMap((d) => d.subjects.map((s) => ({ ...s, deptSlug: d.slug, deptTitle: d.title })));
const byPath = new Map(flat.map((s) => [`${s.deptSlug}/${s.slug}`, s]));

const dependents = new Map();
for (const s of flat) {
  for (const p of s.prereq) {
    if (!dependents.has(p)) dependents.set(p, []);
    dependents.get(p).push(`${s.deptSlug}/${s.slug}`);
  }
}

// 链深：根课 = 0，其余 = max(前置链深) + 1。图已由 audit L0 保证无环，这里仍加 seen 兜底。
const depth = new Map();
function depthOf(key, seen = new Set()) {
  if (depth.has(key)) return depth.get(key);
  if (seen.has(key)) return 0;
  const s = byPath.get(key);
  if (!s || !s.prereq.length) { depth.set(key, 0); return 0; }
  seen.add(key);
  const d = 1 + Math.max(...s.prereq.map((p) => depthOf(p, seen)));
  seen.delete(key);
  depth.set(key, d);
  return d;
}

const prereqIndex = {};
for (const s of flat) {
  const key = `${s.deptSlug}/${s.slug}`;
  prereqIndex[key] = {
    prereq: s.prereq.map((p) => {
      const t = byPath.get(p);
      return { key: p, title: t ? t.title : p, semester: t ? t.semester : null, dept: t ? t.deptSlug : p.split('/')[0], cross: !p.startsWith(`${s.deptSlug}/`) };
    }),
    dependents: (dependents.get(key) || []).map((p) => {
      const t = byPath.get(p);
      return { key: p, title: t ? t.title : p, semester: t ? t.semester : null, dept: t ? t.deptSlug : p.split('/')[0] };
    }),
    depth: depthOf(key),
    root: rootWhy.get(key) || null,
  };
}

const allSubjects = departments.flatMap((d) => d.subjects);
const plan = semesterPlan(cur);

const catalog = {
  $generated: 'scripts/build_catalog.js — 请勿手工编辑',
  version: cur.version,
  domain: cur.domain,
  stages: cur.stages,
  tracks: TRACKS,
  counts: {
    ...cur.counts,
    chaptersBuilt: allSubjects.reduce((a, s) => a + s.chaptersBuilt, 0),
    subjectsDone: allSubjects.filter((s) => s.status === 'done').length,
    subjectsWip: allSubjects.filter((s) => s.status === 'wip').length,
    subjectsPlanned: allSubjects.filter((s) => s.status === 'planned').length,
    videos: countPublishedVideos(),
    textbookChapters: allSubjects.reduce((a, s) => a + (s.textbook?.chaptersWritten || 0), 0),
  },
  semesterPlan: plan.map((p) => ({
    semester: p.semester,
    stage: p.stage.id,
    stageTitle: p.stage.title,
    years: p.stage.years,
    hours: p.hours,
    chapters: p.chapters,
    subjects: p.subjects.map((s) => ({
      slug: s.slug,
      title: s.title,
      dept: s.deptSlug,
      deptTitle: s.deptTitle,
      type: s.type,
      hours: s.hours,
      path: s.path,
    })),
  })),
  prereqIndex,
  departments,
};

writeJson(path.join(ROOT, 'catalog.json'), catalog);

console.log('═══ tcmai-engineering-from-scratch · catalog ═══');
console.log(`  领域      : ${cur.domain.title} (${cur.domain.en})`);
console.log(`  院系      : ${catalog.counts.departments}`);
console.log(`  先修图    : ${Object.values(prereqIndex).filter((v) => v.prereq.length).length} 门有前置 / ${Object.values(prereqIndex).filter((v) => v.root).length} 门根课（有理由）`);
console.log(`  学科      : ${catalog.counts.subjects}  (✅${catalog.counts.subjectsDone} 🚧${catalog.counts.subjectsWip} ⬚${catalog.counts.subjectsPlanned})`);
console.log(`  章节目标  : ${catalog.counts.chapters}`);
console.log(`  学时合计  : ${catalog.counts.hours}`);
console.log(`  已建章节  : ${catalog.counts.chaptersBuilt}`);
console.log(`  视频已发  : ${catalog.counts.videos}`);
console.log(`  → catalog.json  （站点数据由 node site/build.js 生成）`);
