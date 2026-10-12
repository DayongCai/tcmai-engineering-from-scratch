#!/usr/bin/env node
/**
 * audit_curriculum.js — 课程结构与章节契约审计（CI 阻断门）
 *
 * 分三层:
 *   L0 数据层 : curriculum.json 自身合法（数量/唯一性/元组形状/取值域）
 *   L1 结构层 : 磁盘目录与 curriculum.json 对齐，命名规范
 *   L2 契约层 : 已建章节必须满足 docs/zh.md + quiz.json + outputs/ 契约
 *
 * 退出码: 0 通过 / 1 有错误
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, STATUS, loadCurriculum, subjectStatus } = require('./lib');

const errors = [];
const warns = [];
const ok = [];

const VALID_TYPES = ['Core', 'Build', 'Reference', 'Clinic'];
const QUIZ_STAGES = { pre: 1, check: 3, post: 2 };

function err(msg) { errors.push(msg); }
function warn(msg) { warns.push(msg); }

// ─────────── L0 数据层 ───────────
const cur = loadCurriculum();

if (cur.departments.length !== cur.domain.scale.departments) {
  err(`L0 院系数 ${cur.departments.length} ≠ 声明值 ${cur.domain.scale.departments}`);
}
const flat = cur.departments.flatMap((d) => d.subjects);
if (flat.length !== cur.domain.scale.subjects) {
  err(`L0 学科数 ${flat.length} ≠ 声明值 ${cur.domain.scale.subjects}`);
}
for (const d of cur.departments) {
  if (d.subjects.length !== 15) warn(`L0 院系 ${d.slug} 学科数为 ${d.subjects.length}（设计基准 15）`);
}
const slugSeen = new Map();
for (const s of flat) {
  if (slugSeen.has(s.slug)) err(`L0 学科目录名重复: ${s.slug}`);
  slugSeen.set(s.slug, s);
  if (!/^\d{2}-[a-z0-9-]+$/.test(s.slug)) err(`L0 学科目录名不合规范: ${s.slug}`);
  if (!VALID_TYPES.includes(s.type)) err(`L0 类型非法: ${s.slug} = ${s.type}`);
  if (!(s.semester >= 1 && s.semester <= cur.domain.scale.semesters)) {
    err(`L0 学期越界: ${s.slug} = ${s.semester}`);
  }
  if (!(s.hours > 0)) err(`L0 学时非法: ${s.slug}`);
  if (!(s.chapters > 0)) err(`L0 章节数非法: ${s.slug}`);
  if (!s.bridge || s.bridge.length < 4) err(`L0 缺中医→AI 桥梁说明: ${s.slug}`);
}
for (const d of cur.departments) {
  const deptSeen = new Set();
  for (const s of d.subjects) {
    if (deptSeen.has(s.n)) err(`L0 院系 ${d.slug} 内序号重复: ${s.n}`);
    deptSeen.add(s.n);
  }
}
ok.push(`L0 数据层: ${cur.departments.length} 院系 / ${flat.length} 学科 / 学期与类型字段全部合法`);

// ─────────── L1 结构层 ───────────
const deptDir = path.join(ROOT, 'departments');
if (!fs.existsSync(deptDir)) {
  warn('L1 departments/ 尚未创建（脚手架未运行）');
} else {
  for (const d of cur.departments) {
    const dp = path.join(ROOT, d.path);
    if (!fs.existsSync(dp)) {
      warn(`L1 未落盘院系: ${d.path}`);
      continue;
    }
    if (!fs.existsSync(path.join(dp, 'README.md'))) err(`L1 院系缺 README.md: ${d.path}`);
    for (const s of d.subjects) {
      const sp = path.join(ROOT, s.path);
      if (!fs.existsSync(sp)) continue; // 未落盘不报错（增量建设）
      if (!fs.existsSync(path.join(sp, 'README.md'))) err(`L1 学科缺 README.md: ${s.path}`);
      if (!fs.existsSync(path.join(sp, 'meta.json'))) err(`L1 学科缺 meta.json: ${s.path}`);
      else {
        try {
          const m = JSON.parse(fs.readFileSync(path.join(sp, 'meta.json'), 'utf8'));
          if (m.slug !== s.slug) err(`L1 meta.json slug 不匹配: ${s.path}`);
          if (m.title !== s.title) warn(`L1 meta.json title 与 curriculum.json 不一致: ${s.path}`);
        } catch (e) {
          err(`L1 meta.json 解析失败: ${s.path} — ${e.message}`);
        }
      }
    }
  }
  ok.push('L1 结构层: 已落盘院系/学科的 README + meta.json 齐备');
}

// ─────────── L2 契约层 ───────────
let builtChapters = 0;
for (const s of flat) {
  const st = subjectStatus(s);
  if (st.built === 0) continue;
  const chaptersDir = path.join(ROOT, s.path, 'chapters');
  for (const name of fs.readdirSync(chaptersDir)) {
    const cdir = path.join(chaptersDir, name);
    if (!fs.statSync(cdir).isDirectory()) continue;
    const zh = path.join(cdir, 'docs', 'zh.md');
    if (!fs.existsSync(zh)) { err(`L2 缺 docs/zh.md: ${s.path}/chapters/${name}`); continue; }
    const body = fs.readFileSync(zh, 'utf8');
    for (const key of ['MOTTO', 'PROBLEM', '环境逼迫', '知识积累']) {
      if (!body.includes(key)) err(`L2 docs/zh.md 缺 ${key}: ${s.path}/chapters/${name}`);
    }
    const quizPath = path.join(cdir, 'quiz.json');
    if (!fs.existsSync(quizPath)) { err(`L2 缺 quiz.json: ${s.path}/chapters/${name}`); continue; }
    try {
      const q = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
      const got = { pre: 0, check: 0, post: 0 };
      for (const item of q.questions || []) {
        if (!(item.stage in got)) { err(`L2 quiz stage 非法: ${s.path}/chapters/${name} = ${item.stage}`); continue; }
        got[item.stage] += 1;
        if (!Array.isArray(item.options) || item.options.length !== 4) {
          err(`L2 quiz 选项数必须为 4: ${s.path}/chapters/${name}`);
        }
        if (!Number.isInteger(item.correct) || item.correct < 0 || item.correct > 3) {
          err(`L2 quiz correct 必须为 0..3 整数: ${s.path}/chapters/${name}`);
        }
      }
      for (const [stage, want] of Object.entries(QUIZ_STAGES)) {
        if (got[stage] !== want) err(`L2 quiz ${stage} 题数 ${got[stage]} ≠ ${want}: ${s.path}/chapters/${name}`);
      }
    } catch (e) {
      err(`L2 quiz.json 解析失败: ${s.path}/chapters/${name} — ${e.message}`);
    }
    if (!fs.existsSync(path.join(cdir, 'outputs'))) {
      warn(`L2 缺 outputs/: ${s.path}/chapters/${name}`);
    }
    builtChapters += 1;
  }
}
ok.push(`L2 契约层: ${builtChapters} 个已建章节通过 docs/quiz/outputs 契约`);

// ─────────── 输出 ───────────
console.log('═══ tcmai-engineering-from-scratch · 课程审计 ═══\n');
for (const line of ok) console.log(`  ${STATUS.DONE} ${line}`);
if (warns.length) {
  console.log('');
  for (const w of warns) console.log(`  ${STATUS.WIP} ${w}`);
}
if (errors.length) {
  console.log('');
  for (const e of errors) console.log(`  ✗ ${e}`);
}
console.log(`\n─── 统计 ───`);
console.log(`  院系 ${cur.departments.length} · 学科 ${flat.length} · 章节目标 ${cur.counts.chapters} · 已建章节 ${builtChapters}`);
console.log(`  提示 ${warns.length} · 错误 ${errors.length}`);

if (errors.length) {
  console.log('\n❌ 审计未通过');
  process.exit(1);
}
console.log('\n✅ 审计通过');
