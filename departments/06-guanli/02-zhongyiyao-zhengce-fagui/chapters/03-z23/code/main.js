#!/usr/bin/env node
/**
 * 中医药政策法规 · 第 3 章 · 两条轨的准入：机构靠一张证，人员靠一条路
 * 课程: departments/06-guanli/02-zhongyiyao-zhengce-fagui/chapters/03-z23/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的清单与判断全部由本脚本从正文现算，不手打：
 *   两条轨与四个维度、人员四条路、备案制的三个读数、准入之后的三件事，
 *   以及「机构科目 ∩ 医师范围」这张示例表——脚本自己取交集，再和正文的「是否可开展」一列对读。
 *
 * 口径：科目与范围按「、＋+」拆项；括号里的是范围名，带「培训／证明／进修／备案」的项不算执业范围
 *      （正文的 C 行正是靠这一条判成「不可」）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '3';
const SLUG = '03-z23';
const TITLE = '两条轨的准入：机构靠一张证，人员靠一条路';

/** 两条轨，正文第一张表的两列表头 */
const EXPECTED_TRACKS = ['许可轨', '备案轨'];

/** 人员四条路，正文第二张表首列 */
const EXPECTED_PATHS = ['院校教育 + 规范化培训', '师承', '医术确有专长', '中西医结合'];

/** 备案制的三个读数，正文第一节 */
const EXPECTED_READINGS = ['变更报告率', '检查覆盖率', '撤销备案'];

/** 准入之后三件事，正文第五节三个粗体 */
const EXPECTED_AFTER = ['变更', '校验', '退出'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '审查的位置不同',
  '四条路并存',
  '准入筛的是下限',
  '以备案为准',
  '僵尸机构',
  '本章不引具体条文序号与法规全称',
];

/** 括号名与机构科目名的对应：示例表里人写「中医（内科）」，机构写「中医内科」 */
const SCOPE_ALIAS = { 内科: '中医内科' };

const GRAM = 4;
const LINES = /\r?\n/;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const occurrences = (text, term) => String(text).split(term).length - 1;

function h2Titles(text) {
  const out = [];
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) out.push(m[1].trim());
  }
  return out;
}

function h2Sections(text) {
  const out = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
    const m = /^##\s+(.+)$/.exec(line.trim());
    if (m) {
      cur = { title: m[1].trim(), body: [line] };
      out.push(cur);
    } else if (cur) cur.body.push(line);
  }
  return out.map((s) => ({ title: s.title, body: s.body.join('\n') }));
}

const sectionAt = (text, i) => (h2Sections(text)[i] || { title: '', body: '' });

function tableBlocks(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(LINES)) {
    const s = line.trim();
    if (s.startsWith('|')) {
      if (!cur) {
        cur = [];
        blocks.push(cur);
      }
      cur.push(s);
    } else cur = null;
  }
  return blocks.map((b) => {
    const cells = b.map((r) => r.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
    return { head: cells[0] || [], rows: cells.slice(2) };
  });
}

function grams(text, n = GRAM) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function boldItems(body) {
  const out = [];
  for (const line of String(body).split(LINES)) {
    const m = /^(?:-\s+)?\*\*(.+?)。?\*\*/.exec(line.trim());
    if (m) out.push(m[1].replace(/[。、，]$/, '').trim());
  }
  return out;
}

/** 两条轨：第一张表的表头（表头第一格是「维度」） */
function twoTracks() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.head.slice(1) : [];
}

/** 四条轨对比的维度：第一张表首列 */
function trackDimensions() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 人员四条路：第二张表首列 */
function fourPaths() {
  const t = tableBlocks(readDoc())[1];
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 四条路各自的能力画像：第二张表第三列 */
function pathProfiles() {
  const t = tableBlocks(readDoc())[1];
  return t ? t.rows.map((r) => ({ path: r[0], profile: r[2], gap: r[3] })) : [];
}

/** 备案制的三个读数：第一节「看三件事：……」一句 */
function threeReadings() {
  const line = readDoc().split(LINES).find((l) => l.includes('看三件事')) || '';
  const tail = (/看三件事[：:](.+?)\./.exec(line) || [null, ''])[1] || (/看三件事[：:](.+?)。/.exec(line) || [null, ''])[1];
  return tail ? tail.split(/、/).map((s) => s.trim()).filter(Boolean) : [];
}

/** 机构科目 → 数组 */
const parseOrg = (cell) => String(cell).split(/[、＋+]/).map((s) => s.trim()).filter(Boolean);

/** 医师范围 → 数组；括号里取范围名，带培训／证明／进修／备案的项不算范围 */
function parseScope(cell) {
  return String(cell)
    .split(/[、＋+]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((part) => {
      const inner = /（(.+?)）/.exec(part);
      const core = (inner ? inner[1] : part).trim();
      if (/培训|证明|进修|备案/.test(core)) return null;
      return SCOPE_ALIAS[core] || core;
    })
    .filter(Boolean);
}

/** 取交集，保持机构侧的顺序 */
const intersect = (org, scope) => org.filter((x) => scope.includes(x));

/** 正文「是否可开展」一列 → 允许的科目数组；「可」表示机构侧全部允许 */
function docVerdict(cell, org) {
  const s = String(cell).trim();
  if (s.startsWith('不可')) return [];
  if (s === '可') return org.slice();
  const pos = [];
  for (const seg of s.split(/[，,]/)) {
    const m = /^(.+?)不可$/.exec(seg.trim());
    if (m) continue;
    const p = /^(.+?)可$/.exec(seg.trim());
    if (p) pos.push(p[1]);
  }
  return pos;
}

/** 交集示例表：逐行现算，再与正文那一列对读 */
function intersectionTable() {
  const t = tableBlocks(readDoc())[2];
  if (!t) return [];
  return t.rows.map((r) => {
    const org = parseOrg(r[1]);
    const scope = parseScope(r[2]);
    const allowed = intersect(org, scope);
    const docAllowed = docVerdict(r[3], org);
    return {
      case: r[0],
      org,
      scope,
      allowed,
      verdict: r[3],
      docAllowed,
      agree: allowed.slice().sort().join('/') === docAllowed.slice().sort().join('/'),
    };
  });
}

/** 准入之后三件事：第五节三个粗体 */
const threeAfterCare = () => boldItems(sectionAt(readDoc(), 4).body).filter((x) => x.length <= 2);

function quizSummary(quiz, text) {
  const body = grams(text);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  for (const q of qs) if (stage[q.stage] !== undefined) stage[q.stage] += 1;
  const hits = qs
    .filter((q) => q.stage === 'check')
    .map((q) => {
      const right = String((q.options || [])[q.correct] || '');
      return { question: q.question, grams: [...grams(right)].filter((g) => body.has(g)) };
    });
  return {
    total: qs.length,
    stage,
    check: hits.length,
    grounded: hits.filter((h) => h.grams.length).length,
    hits,
    spread: new Set(qs.map((q) => q.correct)).size,
    minExplain: Math.min(...qs.map((q) => hanzi(q.explain))),
  };
}

function analyze() {
  const text = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    hanzi: hanzi(text),
    sections: h2Titles(text),
    tracks: twoTracks(),
    dimensions: trackDimensions(),
    paths: fourPaths(),
    profiles: pathProfiles(),
    readings: threeReadings(),
    after: threeAfterCare(),
    cases: intersectionTable(),
    probes: SECTION_PROBES.map((p, i) => ({ probe: p, ok: sectionAt(text, i).body.includes(p) })),
    quiz: quizSummary(quiz, text),
  };
}

function main() {
  const r = analyze();
  console.log(`中医药政策法规 · 第 ${CHAPTER} 章 · ${TITLE}`);
  console.log('');
  console.log(`正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · 小节 ${r.sections.length} 个`);
  r.sections.forEach((s, i) => console.log(`  ${String(i + 1).padStart(2)}  ${s}`));
  console.log('');
  console.log(`两条轨（表头现算，${r.tracks.length} 条）：${r.tracks.join(' / ')}`);
  console.log(`对比维度（${r.dimensions.length} 个）：${r.dimensions.join(' / ')}`);
  console.log('');
  console.log(`人员四条路（表序，${r.paths.length} 条）：`);
  for (const p of r.profiles) console.log(`  ${p.path}｜画像：${p.profile}｜短板：${p.gap}`);
  console.log('');
  console.log(`备案制的三个读数（${r.readings.length} 个）：${r.readings.join(' / ')}`);
  console.log(`准入之后三件事（${r.after.length} 件）：${r.after.join(' / ')}`);
  console.log('');
  console.log('科目与范围取交集（脚本现算 ∩ 正文那一列）：');
  for (const c of r.cases) {
    console.log(
      `  ${c.case} 机构[${c.org.join('、')}] ∩ 医师[${c.scope.join('、')}] = [${c.allowed.join('、') || '空'}] ${c.agree ? '✓' : '✗'} 正文：${c.verdict}`
    );
  }
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上清单与交集全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，讨论准入的制度结构，不构成执业指导。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  h2Titles,
  h2Sections,
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  boldItems,
  twoTracks,
  trackDimensions,
  fourPaths,
  pathProfiles,
  threeReadings,
  parseOrg,
  parseScope,
  intersect,
  docVerdict,
  intersectionTable,
  threeAfterCare,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_TRACKS,
  EXPECTED_PATHS,
  EXPECTED_READINGS,
  EXPECTED_AFTER,
  SECTION_PROBES,
};
