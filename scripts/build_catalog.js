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

const path = require('path');
const {
  ROOT,
  TRACKS,
  loadCurriculum,
  semesterPlan,
  subjectStatus,
  readMeta,
  writeJson,
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
      platform: meta ? meta.platform || null : null,
      textbook: meta ? meta.textbook || null : null,
    };
  }),
}));

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
    videos: allSubjects.reduce((a, s) => a + (s.platform?.videosPublished || 0), 0),
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
  departments,
};

writeJson(path.join(ROOT, 'catalog.json'), catalog);

console.log('═══ tcmai-engineering-from-scratch · catalog ═══');
console.log(`  领域      : ${cur.domain.title} (${cur.domain.en})`);
console.log(`  院系      : ${catalog.counts.departments}`);
console.log(`  学科      : ${catalog.counts.subjects}  (✅${catalog.counts.subjectsDone} 🚧${catalog.counts.subjectsWip} ⬚${catalog.counts.subjectsPlanned})`);
console.log(`  章节目标  : ${catalog.counts.chapters}`);
console.log(`  学时合计  : ${catalog.counts.hours}`);
console.log(`  已建章节  : ${catalog.counts.chaptersBuilt}`);
console.log(`  视频已发  : ${catalog.counts.videos}`);
console.log(`  → catalog.json  （站点数据由 node site/build.js 生成）`);
