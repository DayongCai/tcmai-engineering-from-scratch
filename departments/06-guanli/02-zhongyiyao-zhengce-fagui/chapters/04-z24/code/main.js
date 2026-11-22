#!/usr/bin/env node
/**
 * 中医药政策法规 · 第 4 章 · 规范进不了诊室的那一步
 * 课程: departments/06-guanli/02-zhongyiyao-zhengce-fagui/chapters/04-z24/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的清单与分工全部由本脚本从正文现算，不手打：
 *   三层规范及其在责任认定中的作用、三层分工那一句、三个可行切口、
 *   病历四段可核内容、知情同意表里的场景与风险、三个抓手、责任链三个环节。
 *
 * 口径：汉字按 Unicode 汉字块计；有序列表按行首「数字.」切，只取该行第一个粗体短语。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const CHAPTER = '4';
const SLUG = '04-z24';
const TITLE = '规范进不了诊室的那一步';

/** 三层规范，正文第一张表首列 */
const EXPECTED_LAYERS = ['法律与行政法规', '诊疗规范与技术标准', '指南、共识与院内制度'];

/** 三层分工那一句，正文第一节 */
const EXPECTED_ROLES = ['法律定底线', '规范定水准', '院内制度定落实'];

/** 三个可行切口，正文第二节 */
const EXPECTED_CUTS = ['可追溯', '可复核', '可拦截'];

/** 病历四段，正文第三节有序列表 */
const EXPECTED_RECORD = ['主症与病史', '四诊要点', '辨证与治则', '处方与用法'];

/** 三个抓手，正文第五节三个粗体 */
const EXPECTED_HANDLES = ['核心制度落地', '技术准入', '不良事件报告'];

/** 责任链三个环节，正文第五节末句 */
const EXPECTED_CHAIN = ['过错看过程', '因果看专业', '赔偿看损害'];

/** 每节一个探针词：第 i 个必须出现在第 i 节 */
const SECTION_PROBES = [
  '法律定底线',
  '个体化是诊疗策略，标准化是过程管理',
  '修改留痕',
  '预期偏差',
  '过错看过程',
  '本章不引具体条文序号与规范全称',
];

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

/** 有序列表里每行的第一个粗体短语 */
function orderedBold(body) {
  const out = [];
  for (const line of String(body).split(LINES)) {
    const m = /^\d+\.\s+\*\*(.+?)\*\*/.exec(line.trim());
    if (m) out.push(m[1].replace(/[。、，：:]$/, '').trim());
  }
  return out;
}

/** 三层规范：第一张表首列 */
function threeLayers() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => r[0]) : [];
}

/** 三层各自在责任认定中的作用：同一张表末列 */
function layerDuties() {
  const t = tableBlocks(readDoc())[0];
  return t ? t.rows.map((r) => ({ layer: r[0], duty: r[3] })) : [];
}

/** 三层分工那一句：正文「法律定底线，规范定水准，院内制度定落实」 */
function layerRoles() {
  const text = readDoc();
  const m = /\*\*([^*]*法律定底线[^*]*)\*\*/.exec(text);
  return m ? m[1].split(/[，,]/).map((s) => s.trim()).filter(Boolean) : [];
}

/** 三个可行切口 */
const threeCuts = () => ['可追溯', '可复核', '可拦截'].filter((k) => readDoc().includes(k));

/** 病历四段：第三节有序列表的粗体 */
const recordParts = () => orderedBold(sectionAt(readDoc(), 2).body);

/** 知情同意表：场景与需重点告知的风险 */
function informedScenes() {
  const t = tableBlocks(readDoc())[1];
  return t ? t.rows.map((r) => ({ scene: r[0], expect: r[1], risk: r[2] })) : [];
}

/** 三个抓手：第五节三个粗体，去掉「抓手一：」前缀 */
function threeHandles() {
  return boldItems(sectionAt(readDoc(), 4).body)
    .filter((x) => x.startsWith('抓手'))
    .map((x) => x.replace(/^抓手[一二三][：:]/, ''));
}

/** 责任链三个环节：末句粗体按逗号拆 */
function responsibilityChain() {
  const m = /\*\*([^*]*过错看过程[^*]*)\*\*/.exec(readDoc());
  return m ? m[1].split(/[，,]/).map((s) => s.trim()).filter(Boolean) : [];
}

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
    layers: threeLayers(),
    duties: layerDuties(),
    roles: layerRoles(),
    cuts: threeCuts(),
    record: recordParts(),
    scenes: informedScenes(),
    handles: threeHandles(),
    chain: responsibilityChain(),
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
  console.log(`三层规范（表序，${r.layers.length} 层）：${r.layers.join(' / ')}`);
  for (const d of r.duties) console.log(`  ${d.layer} → ${d.duty}`);
  console.log(`三层分工（正文那一句，现算 ${r.roles.length} 段）：${r.roles.join(' / ')}`);
  console.log('');
  console.log(`三个可行切口（${r.cuts.length} 个）：${r.cuts.join(' / ')}`);
  console.log(`病历四段（第三节有序列表，${r.record.length} 段）：${r.record.join(' / ')}`);
  console.log(`外治记录与修改留痕：${readDoc().includes('修改留痕') ? '正文有' : '正文缺'}`);
  console.log('');
  console.log(`知情同意场景（表序，${r.scenes.length} 个）：`);
  for (const s of r.scenes) console.log(`  ${s.scene}｜患者预期：${s.expect}｜须告知：${s.risk}`);
  console.log('');
  console.log(`三个抓手（${r.handles.length} 个）：${r.handles.join(' / ')}`);
  console.log(`责任链（${r.chain.length} 环）：${r.chain.join(' → ')}`);
  console.log('');
  console.log('小节探针（每节一个词，须落在本节）：');
  console.log('  ' + r.probes.map((p) => `${p.ok ? '✓' : '✗'} ${p.probe}`).join(' · '));
  console.log('');
  console.log(
    `quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.grounded} 道（门槛 ≥2）· 答案落在 ${r.quiz.spread} 个位置 · 最短解释 ${r.quiz.minExplain} 汉字`
  );
  console.log('');
  console.log('※ 以上清单与分工全部由本章正文现算，无手打常数；改正文后重跑即可复核。');
  console.log('※ 本章为教学材料，讨论质量管理的方法，不构成诊疗意见。');
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
  orderedBold,
  threeLayers,
  layerDuties,
  layerRoles,
  threeCuts,
  recordParts,
  informedScenes,
  threeHandles,
  responsibilityChain,
  quizSummary,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  EXPECTED_LAYERS,
  EXPECTED_ROLES,
  EXPECTED_CUTS,
  EXPECTED_RECORD,
  EXPECTED_HANDLES,
  EXPECTED_CHAIN,
  SECTION_PROBES,
};
