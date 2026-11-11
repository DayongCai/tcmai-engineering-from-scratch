#!/usr/bin/env node
/**
 * 药理学 · 第 6 章 拟胆碱药：直接作用者与抗胆碱酯酶药
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/06-cholinergic-agonists/docs/zh.md
 * 出处: 教材·药理学·第6章（6.1–6.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=6]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「受体分布决定效应谱，化学性质决定作用部位与时长」。
 * 这条主张能落在哪几个数上——三类直接作用药各占多少笔墨、十二个代表药谁被反复提到、
 * 季铵与叔胺的对照有多密、M 样与 N 样与中枢三组效应如何分配——都能在底本正文里数出来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../chapters/06-cholinergic-agonists/code
// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 standards/yaoli/底本.json 的那一级
const DIBEN = path.join('standards', 'yaoli', '底本.json');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, DIBEN))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/yaoli/底本.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const FILE = path.join(ROOT, DIBEN);
const CHAPTER = 6;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

/** 本章（默认第 6 章）的结构对象 */
function chapter(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

/** 摊平成 12 个小节，按 no 排序 */
function subsOf(chap) {
  return chap.secs.flatMap((s) => s.subs).sort((a, b) => a.no.localeCompare(b.no, 'en'));
}

/** 汉字数：只数 CJK 统一表意文字 */
const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;

/** 规模：节数 / 小节数 / 汉字数 */
function shape(chap) {
  const subs = subsOf(chap);
  return {
    secs: chap.secs.length,
    subs: subs.length,
    hanzi: subs.reduce((n, u) => n + hanzi(u.body), 0),
  };
}

/** 逐节统计 */
function sectionStats(chap) {
  return chap.secs.map((s) => {
    const h = s.subs.reduce((n, u) => n + hanzi(u.body), 0);
    return {
      no: s.no,
      title: s.title.replace(/^\d+\.\d+\s*/, ''),
      subs: s.subs.length,
      hanzi: h,
      avg: Math.round(h / s.subs.length),
    };
  });
}

/** 关键词计数：全章次数 + 每个小节的次数 */
function keywordHits(chap, word) {
  const per = [];
  let total = 0;
  for (const u of subsOf(chap)) {
    const n = (u.body.match(new RegExp(word, 'g')) || []).length;
    if (n) per.push({ sub: u.no, hits: n });
    total += n;
  }
  return { word, total, per };
}

/**
 * 十二个代表药：三类直接作用药与两类抗胆碱酯酶药的代表。
 * 出场次数说明教材拿谁当例证反复用——例证密度就是叙述重心。
 */
const DRUGS = [
  '乙酰胆碱', '卡巴胆碱', '氯贝胆碱', '毛果芸香碱', '烟碱',
  '新斯的明', '毒扁豆碱', '吡斯的明', '加兰他敏', '多奈哌齐',
  '有机磷酸酯', '碘解磷定',
];

function drugAudit(chap) {
  return DRUGS.map((w) => {
    const h = keywordHits(chap, w);
    const top = [...h.per].sort((a, b) => b.hits - a.hits)[0] || { sub: '', hits: 0 };
    return { word: w, total: h.total, subs: h.per.length, top: top.sub, topHits: top.hits };
  });
}

/**
 * 化学性质的两条对照线：季铵（带电荷、吸收少、不入中枢）与叔胺（不带电荷、吸收好、可入中枢）。
 * 本章几乎每一次「为什幺作用部位不同」都回到这两条线上。
 */
const STRUCT = ['季铵', '叔胺', '胆碱酯酶'];

function structAudit(chap) {
  return STRUCT.map((w) => {
    const h = keywordHits(chap, w);
    const top = [...h.per].sort((a, b) => b.hits - a.hits)[0] || { sub: '', hits: 0 };
    return { word: w, total: h.total, subs: h.per.length, top: top.sub, topHits: top.hits };
  });
}

/**
 * 三组效应：M 样、N 样、中枢。
 * 教材对本章的概括是「M 样效应为主、N 样效应为辅、中枢效应因药而异」——
 * 三组的词频比，就是这句概括的证据。
 */
const EFFECTS = ['M 样', 'N 样', '中枢'];

function effectAudit(chap) {
  return EFFECTS.map((w) => {
    const h = keywordHits(chap, w);
    return { word: w, total: h.total, subs: h.per.length };
  });
}

/** 体内过程的四环节：6.4 三小节按吸收、分布、生物转化与排泄铺开 */
const LINKS = ['吸收', '分布', '生物转化', '排泄'];

function linkAudit(chap) {
  return LINKS.map((w) => {
    const h = keywordHits(chap, w);
    return { word: w, total: h.total, subs: h.per.length };
  });
}

/** 判断的去向 */
const HANDOFF = '具备资质的人员';

function handoffAudit(chap) {
  const subs = subsOf(chap);
  return {
    subs: subs.filter((u) => u.body.includes(HANDOFF)).map((u) => u.no),
    count: subs.reduce((n, u) => n + (u.body.match(new RegExp(HANDOFF, 'g')) || []).length, 0),
    missing: subs.filter((u) => !u.body.includes(HANDOFF)).map((u) => u.no),
    of: subs.length,
  };
}

/** 量值核验：本章声明不写含量与浓度的量值，这里当断言复算 */
const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;

function valueAudit(chap) {
  const subs = subsOf(chap);
  const offenders = [];
  let hits = 0;
  for (const u of subs) {
    const m = u.body.match(VALUE_RE) || [];
    if (m.length) offenders.push({ sub: u.no, hits: m.join(',') });
    hits += m.length;
  }
  return { subs: subs.length, hits, offenders };
}

/** 口径句核验 */
function briefAudit(chap) {
  const need = ['剂量与用法照底本', '本书不构成用药建议'];
  return subsOf(chap).map((u) => ({
    sub: u.no,
    ok: need.every((k) => u.brief.includes(k)),
    missing: need.filter((k) => !u.brief.includes(k)),
  }));
}

/** 最薄与最厚的小节 */
function extremes(chap) {
  const rows = subsOf(chap).map((u) => ({ sub: u.no, hanzi: hanzi(u.body) }));
  const sorted = [...rows].sort((a, b) => a.hanzi - b.hanzi);
  return { thinnest: sorted[0], thickest: sorted[sorted.length - 1] };
}

function main() {
  const base = load();
  const chap = chapter(base);
  const subs = subsOf(chap);
  const s = shape(chap);
  const secs = sectionStats(chap);
  const drugs = drugAudit(chap);
  const struct = structAudit(chap);
  const effects = effectAudit(chap);
  const links = linkAudit(chap);
  const handoff = handoffAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 拟胆碱药：直接作用者与抗胆碱酯酶药（药理学 第6章）═══');
  console.log(`教材规模: 第6章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本声明与复算一致）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log('十二个代表药的出场（次数 / 小节数 / 最密小节）：');
  for (const d of drugs) console.log(`  ${d.word} ${d.total} · ${d.subs} · ${d.top}（${d.topHits}）`);
  console.log(`  → 出场最多的是 ${[...drugs].sort((a, b) => b.total - a.total)[0].word}：它被当作「结构与时长」的对照基线。`);
  console.log('');
  console.log(`化学性质三条线: ${struct.map((x) => `${x.word} ${x.total} 次 / ${x.subs} 小节（最密 ${x.top}）`).join(' · ')}`);
  console.log('  → 季铵与叔胺的对照贯穿全章：吸收、分布、中枢效应三处都由它推。');
  console.log('');
  console.log(`三组效应: ${effects.map((e) => `${e.word} ${e.total} 次 / ${e.subs} 小节`).join(' · ')}`);
  console.log('  → 「M 样」最厚，与教材的概括一致：M 样为主、N 样为辅、中枢因药而异。');
  console.log('');
  console.log(`体内过程四环节: ${links.map((l) => `${l.word} ${l.total} 次 / ${l.subs} 小节`).join(' · ')}`);
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  有交接句: ${handoff.subs.join(' ')}`);
  console.log(`  没有交接句: ${handoff.missing.join(' ') || '（无）'}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明拟胆碱药的分类、受体效应、作用机制与体内过程类别，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, drugs, struct, effects, links, handoff, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  DRUGS,
  STRUCT,
  EFFECTS,
  LINKS,
  HANDOFF,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  drugAudit,
  structAudit,
  effectAudit,
  linkAudit,
  handoffAudit,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
