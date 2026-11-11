#!/usr/bin/env node
/**
 * 药理学 · 第 15 章 抗精神失常药：分类、受体阻断谱、时间尺度与表述边界
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/15-antipsychotic-drugs/docs/zh.md
 * 出处: 教材·药理学·第15章（15.1–15.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=15]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「同一类受体在不同通路上被阻断，
 * 治疗作用与不良反应同源」。这条命题能不能落在数上？
 * 能——「通路」被提了几次、落在哪几个小节、「锥体外系」的密度在哪、
 * 判断交给谁、量值有没有漏进正文，都能在底本正文里数出来。
 * 手打的数字会在教材改版后静默过期；现算的数字一旦对不上，测试自己会红。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../chapters/15-antipsychotic-drugs/code
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
const CHAPTER = 15;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

/** 本章（默认第 15 章）的结构对象 */
function chapter(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

/** 摊平成 12 个小节，按 no 排序（底本已按节序给出，这里再排一次以防改版打乱） */
function subsOf(chap) {
  return chap.secs.flatMap((s) => s.subs).sort((a, b) => a.no.localeCompare(b.no, 'en'));
}

/** 汉字数：只数 CJK 统一表意文字，标点与数字不算 */
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

/** 逐节统计：每节几个小节、多少汉字、小节均字 */
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
 * 词表：三条词线。
 * 「通路」组讲受体被阻断之后效应落在哪——本章的主线；
 * 「锥体外系」组讲同源效应的代价；
 * 「时间」组讲起效与观察窗口，是本章把三类药分开的第二种切法。
 */
const WORDS = ['受体', '多巴胺', '通路', '锥体外系', '镇静', '镇吐', '5-HT', '锂'];

/** 词频：按次数降序，同次数保持词表顺序（稳定排序，结果可复算） */
function wordCounts(chap) {
  return WORDS.map((w) => keywordHits(chap, w))
    .map((h) => ({
      word: h.word,
      total: h.total,
      subs: h.per.length,
      top: [...h.per].sort((a, b) => b.hits - a.hits)[0] || { sub: '', hits: 0 },
    }))
    .sort((a, b) => b.total - a.total);
}

/**
 * 判断的去向：正文把结论交给「具备资质的人员」的小节。
 * 这个分布是不是结构性的，只看两件事：写在几节、缺的是哪几节。
 */
const HANDOFF = '具备资质的人员';

function handoffAudit(chap) {
  const subs = subsOf(chap);
  const withIt = subs.filter((u) => u.body.includes(HANDOFF));
  return {
    subs: withIt.map((u) => u.no),
    count: subs.reduce((n, u) => n + (u.body.match(new RegExp(HANDOFF, 'g')) || []).length, 0),
    missing: subs.filter((u) => !u.body.includes(HANDOFF)).map((u) => u.no),
    of: subs.length,
  };
}

/**
 * 量值核验：底本在这一章带剂量（valueLike > 0），所以逐小节数「数字＋单位」，
 * 只用于说明剂量集中写在哪些小节的用法段落里，不把值抄进课程正文。
 * 词表与章门用的是同一套单位（见 scripts/lib_value_caliber.js）。
 */
const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;

function valueAudit(chap) {
  const subs = subsOf(chap);
  const offenders = [];
  let hits = 0;
  for (const u of subs) {
    const m = (u.body.match(VALUE_RE) || []);
    if (m.length) offenders.push({ sub: u.no, hits: m.length });
    hits += m.length;
  }
  return { subs: subs.length, hits, offenders };
}

/** 口径句核验：每个小节的 brief 必须带「剂量与用法照底本」与「本书不构成用药建议」 */
function briefAudit(chap) {
  const need = ['剂量与用法照底本', '本书不构成用药建议'];
  return subsOf(chap).map((u) => ({
    sub: u.no,
    ok: need.every((k) => u.brief.includes(k)),
    missing: need.filter((k) => !u.brief.includes(k)),
  }));
}

/** 最薄与最厚的小节：两端的落差说明教材不是平均用力 */
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
  const words = wordCounts(chap);
  const handoff = handoffAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 抗精神失常药：分类、受体阻断谱、时间尺度与表述边界（药理学 第15章）═══');
  console.log(`教材规模: 第${CHAPTER}章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log(`小节落差: 最薄 ${ext.thinnest.sub} ${ext.thinnest.hanzi} 字 · 最厚 ${ext.thickest.sub} ${ext.thickest.hanzi} 字`);
  console.log('');
  console.log('12 个小节与正文汉字：');
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`词频: ${words.map((w) => `${w.word} ${w.total}`).join(' · ')}`);
  for (const w of words.slice(0, 4)) {
    console.log(`  ${w.word} 最密在 ${w.top.sub}（${w.top.hits} 次），覆盖 ${w.subs} 个小节`);
  }
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  有交接句: ${handoff.subs.join(' ')}`);
  console.log(`  没有交接句: ${handoff.missing.join(' ')}`);
  console.log('');
  console.log(`量值分布: ${values.hits} 处数字＋单位，落在 ${values.offenders.map((x) => `${x.sub}(${x.hits})`).join(' ')}`);
  console.log('  → 教材的剂量写在上述小节的「用法与用量」段；课程正文只写「剂量与用法照底本」。');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明抗精神失常药的分类/作用/机制/体内过程/用途类别/不良反应类别与表述口径，不写剂量与浓度与用法量值（剂量与用法照底本），不作诊断与疗效与优劣断言，不构成用药建议');

  return { chap, subs, shape: s, secs, words, handoff, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  WORDS,
  HANDOFF,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  wordCounts,
  handoffAudit,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
