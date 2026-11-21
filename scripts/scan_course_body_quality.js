#!/usr/bin/env node
/**
 * 全库「课程正文成色」扫描（只读，不改任何文件）
 *
 * 判据从「模板句有没有」改为「**元话语段落占全文段落的比例**」与「**净正文字数**」：
 *   元话语段落 = 含 三辨／四位面／实测／引书／占比／重心／本章取数 等「关于文本本身的统计」的段落
 *   净正文段落 = 其余段落
 *
 * ⚠ 已知缺陷（2026-11-21 标定失败，勿当结论用）：
 *   只有「模板残迹命中」一项可信（`F:/textbooks/机器学习`、`这一章要回答什么`）。
 *   四档分级不可单独采信——拿已知成色标定，占位稿《嗓音医学》被判成
 *   「真有正文 2,255 字/章」，因为占位稿的「正文」本身是关于文本的叙述
 *   （「本章走的是……固定链」「本章实测……」），关键词切不干净。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEPTS = path.join(ROOT, 'departments');
const OUT = path.join(ROOT, 'data', 'course-body-quality.json');

const META_KEYS = ['三辨', '四位面', '实测分布', '引书', '占比', '重心', '本章取数', '教材出处', '双根因'];
const TMPL = [/F:\/textbooks\/机器学习/, /这一章要回答什么/];
const hz = (s) => (s.match(/[\u4e00-\u9fa5]/g) || []).length;

function scoreDoc(s) {
  const lines = s.split('\n');
  let metaHz = 0, realHz = 0, metaPara = 0, realPara = 0;
  let buf = [], isTable = false, isCode = false;
  const flush = () => {
    if (!buf.length) return;
    const p = buf.join('').trim();
    buf = [];
    if (p.length < 8) return;
    const meta = META_KEYS.some((k) => p.includes(k));
    if (meta) { metaPara += 1; metaHz += hz(p); } else { realPara += 1; realHz += hz(p); }
  };
  for (const ln of lines) {
    const t = ln.trim();
    if (!t) { flush(); continue; }
    // 只有标题与块引打断段落；表格行、列表项、公式都算正文（这些课大量把实质写在表里）
    if (t.startsWith('#')) { flush(); continue; }
    if (t.startsWith('>')) { flush(); continue; }
    if (/^\|?\s*:?-{2,}/.test(t)) { continue; } // 表格分隔行
    if (t.startsWith('```')) { flush(); continue; }
    buf.push(t);
  }
  flush();
  const paras = metaPara + realPara;
  const tmpl = TMPL.reduce((a, re) => a + (s.match(new RegExp(re.source, 'g')) || []).length, 0);
  return {
    metaRatio: paras ? +(metaPara / paras).toFixed(2) : 0,
    realHz, metaHz, paras, tmpl,
  };
}

const subjects = [];
for (const dept of fs.readdirSync(DEPTS).filter((d) => fs.statSync(path.join(DEPTS, d)).isDirectory())) {
  const dp = path.join(DEPTS, dept);
  for (const subj of fs.readdirSync(dp).filter((d) => fs.statSync(path.join(dp, d)).isDirectory())) {
    const chapDir = path.join(dp, subj, 'chapters');
    if (!fs.existsSync(chapDir)) continue;
    let chapters = 0, metaHz = 0, realHz = 0, metaPara = 0, paras = 0, tmpl = 0, hollow = 0;
    let worst = null;
    for (const c of fs.readdirSync(chapDir).filter((d) => fs.statSync(path.join(chapDir, d)).isDirectory())) {
      const doc = path.join(chapDir, c, 'docs', 'zh.md');
      if (!fs.existsSync(doc)) continue;
      const r = scoreDoc(fs.readFileSync(doc, 'utf8'));
      chapters += 1;
      metaHz += r.metaHz; realHz += r.realHz; metaPara += Math.round(r.metaRatio * r.paras); paras += r.paras; tmpl += r.tmpl;
      if (r.realHz < 800) hollow += 1;
      if (!worst || r.realHz < worst.realHz) worst = { chapter: c, ...r };
    }
    if (!chapters) continue;
    const metaRatio = +(metaPara / Math.max(paras, 1)).toFixed(2);
    const perChapterReal = Math.round(realHz / chapters);
    const hollowRatio = +(hollow / chapters).toFixed(2);
    const verdict = hollowRatio >= 0.5 ? '空壳'
      : metaRatio >= 0.5 || hollowRatio >= 0.2 ? '半成色'
      : perChapterReal < 1200 ? '偏薄' : '真有正文';
    subjects.push({
      dept, subject: subj, chapters,
      realHz, metaHz, perChapterReal, metaRatio, tmpl, hollowRatio, worst: worst && worst.chapter,
      verdict,
    });
  }
}

subjects.sort((a, b) => b.hollowRatio - a.hollowRatio || a.perChapterReal - b.perChapterReal);
const tally = subjects.reduce((a, s) => (a[s.verdict] = (a[s.verdict] || 0) + 1, a), {});
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ generatedAt: new Date().toISOString().slice(0, 10), criterion: '净正文字数/章 + 元话语段落占比 + 模板句', tally, subjects }, null, 2) + '\n', 'utf8');

console.log('分级：', JSON.stringify(tally), '· 科目', subjects.length);
for (const v of ['空壳', '半成色', '偏薄']) {
  const list = subjects.filter((s) => s.verdict === v);
  if (!list.length) continue;
  console.log(`\n== ${v}（${list.length} 门）==`);
  for (const s of list) {
    console.log(`  ${s.dept}/${s.subject}  ${s.chapters}章 · 净正文 ${s.perChapterReal}字/章 · 元话语 ${(s.metaRatio * 100).toFixed(0)}% · 空壳章 ${s.hollow}/${s.chapters}`);
  }
}
console.log('\n已写 data/course-body-quality.json');
