#!/usr/bin/env node
/**
 * tests/test_video_textbook_links.js —— 视频 ↔ 教学章 ↔ 教材章 挂接表不许自说自话
 *
 * 挂接表最容易犯的错是「填得好看，点进去没有」：讲次挂着教材第 N 章，
 * 但那章文件不存在；或者关键词是脚本自己编的、教材正文里根本没有。
 * 这里钉六件事：
 *   1. 课程集合 = 视频台账里 status≠none 的课（多一门少一门都要说话）；
 *   2. 每课讲数可重算（= 各 source 的 rows 之和）；
 *   3. 已挂行的教材章文件必须真实存在；
 *   4. linkedBy=keyword 的行，教材章正文必须真的含该关键词（复核脚本自己的判断）；
 *   5. status 与行状态自洽：linked 必须全挂；no-textbook 必须 0 章；
 *   6. 合计 = 各课之和。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

let pass = 0;
const bad = [];
const ok = (cond, msg) => { if (cond) { pass += 1; console.log('  ok - ' + msg); } else { bad.push(msg); console.log('  not ok - ' + msg); } };

const LINKS = readJson('data/video-textbook-links.json');
const VIDEO = readJson('data/video-lessons.json');

console.log('\n视频 ↔ 教材挂接\n');

// 1. 课程集合
{
  const want = VIDEO.subjects.filter((s) => s.status && s.status !== 'none').map((s) => `${s.dept}/${s.slug}`).sort();
  const got = LINKS.courses.map((c) => `${c.dept}/${c.slug}`).sort();
  const miss = want.filter((x) => !got.includes(x));
  const extra = got.filter((x) => !want.includes(x));
  ok(!miss.length && !extra.length,
    `课程集合与视频台账一致（${got.length} 门${miss.length ? ' 缺 ' + miss.join('、') : ''}${extra.length ? ' 多 ' + extra.join('、') : ''}）`);
}

// 2. 讲数可重算
{
  const errs = [];
  for (const c of LINKS.courses) {
    const s = VIDEO.subjects.find((x) => `${x.dept}/${x.slug}` === `${c.dept}/${c.slug}`);
    const n = (s.sources || []).reduce((a, src) => a + (src.rows || []).length, 0);
    if (c.lectures !== n) errs.push(`${c.title}: 挂接表 ${c.lectures} 讲 ≠ 台账 ${n} 讲`);
    if (c.rows.length !== c.lectures) errs.push(`${c.title}: rows ${c.rows.length} ≠ lectures ${c.lectures}`);
  }
  ok(!errs.length, `每课讲数可从台账重算（${LINKS.courses.length} 门${errs.length ? '；' + errs[0] : ''}）`);
}

// 3 + 4. 教材章文件存在 + 关键词复核
{
  const errs = [];
  let kwChecked = 0;
  for (const c of LINKS.courses) {
    for (const r of c.rows) {
      for (const b of r.textbook || []) {
        if (!fs.existsSync(path.join(ROOT, b.file))) errs.push(`${c.title} 第${r.lectureNo}讲 → 教材第${b.no}章文件不存在（${b.file}）`);
      }
      if (r.linkedBy === 'keyword') {
        if (!r.keyword) { errs.push(`${c.title} 第${r.lectureNo}讲：keyword 挂接但没记关键词`); continue; }
        const f = (r.textbook && r.textbook[0]) ? path.join(ROOT, r.textbook[0].file) : null;
        if (!f || !fs.existsSync(f)) continue;
        const t = fs.readFileSync(f, 'utf8');
        if (!t.includes(r.keyword)) errs.push(`${c.title} 第${r.lectureNo}讲：关键词「${r.keyword}」在教材第${r.textbook[0].no}章正文里找不到`);
        kwChecked += 1;
      }
    }
  }
  ok(!errs.length, `已挂行教材文件都存在、keyword 挂接复核 ${kwChecked} 处${errs.length ? '；' + errs[0] : ''}`);
}

// 5. status 自洽
{
  const errs = [];
  for (const c of LINKS.courses) {
    const linked = c.rows.filter((r) => (r.textbook || []).length).length;
    if (c.linkedLectures !== linked) errs.push(`${c.title}: linkedLectures ${c.linkedLectures} ≠ rows 实数 ${linked}`);
    if (c.status === 'linked' && linked !== c.rows.length) errs.push(`${c.title}: 标 linked 但只挂 ${linked}/${c.rows.length}`);
    if (c.status === 'no-textbook' && c.textbookChapters !== 0) errs.push(`${c.title}: 标 no-textbook 但有 ${c.textbookChapters} 章`);
    if (c.status === 'linked' && c.textbookChapters === 0) errs.push(`${c.title}: 标 linked 却没有教材章`);
  }
  ok(!errs.length, `status 与行状态自洽${errs.length ? '；' + errs[0] : ''}`);
}

// 6. 合计
{
  const t = LINKS.totals;
  const lec = LINKS.courses.reduce((a, c) => a + c.lectures, 0);
  const lin = LINKS.courses.reduce((a, c) => a + c.linkedLectures, 0);
  ok(t.courses === LINKS.courses.length && t.lectures === lec && t.linkedLectures === lin,
    `合计可重算：${t.courses} 门 · ${t.lectures} 讲 · 已挂 ${t.linkedLectures} 讲`);
}

// 7. 纯编号标题的讲次不许被强行挂接（防「平摊冒充」）
{
  const generic = [/^第\s*\d+\s*讲$/, /^wy\d+$/i, /^p\d+$/i, /^原文$/, /^\d+$/];
  const errs = [];
  for (const c of LINKS.courses) {
    for (const r of c.rows) {
      const g = generic.some((re) => re.test(String(r.title || '').trim()));
      if (g && r.linkedBy === 'keyword') errs.push(`${c.title} 第${r.lectureNo}讲（纯编号标题）却按关键词挂上了`);
    }
  }
  ok(!errs.length, `纯编号标题的讲次未被强行挂接${errs.length ? '；' + errs[0] : ''}`);
}

console.log(`\n# pass ${pass}\n# fail ${bad.length}`);
process.exit(bad.length ? 1 : 0);
