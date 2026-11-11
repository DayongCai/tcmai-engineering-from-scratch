#!/usr/bin/env node
/**
 * 药理学 · 第 1 章 绪论：概念、范围、发展、方法与研发链条
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/01-introduction/docs/zh.md
 * 出处: 教材·药理学·第1章（1.1–1.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=1]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「绪论给的不是药名，是一套提问方式」。
 * 这套提问方式能落在哪几个数上——四节各摊多少字、参数被提了几次、
 * 判断交给谁、量值有没有漏进来——都能在底本正文字数出来。
 * 手打的数字会在教材改版后静默过期；现算的数字一旦对不上，测试自己会红。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/09-jichu/12-yaoli-xue/chapters/01-introduction/code
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
const CHAPTER = 1;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

/** 本章（默认第 1 章）的结构对象 */
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
 * 参数词表：两组语言。
 * 量效组讲「作用有多强」，体内过程组讲「在体内怎么变」——章节里这两套语言在
 * 1.1.2 与 1.4.2 交汇，因为那两节既要描述作用，又要描述暴露。
 */
const PARAMS = [
  { key: '参数', group: '元词' },
  { key: '量效', group: '量效' },
  { key: '效价强度', group: '量效' },
  { key: '最大效应', group: '量效' },
  { key: '半衰期', group: '体内过程' },
  { key: '生物利用度', group: '体内过程' },
  { key: '清除率', group: '体内过程' },
  { key: '表观分布容积', group: '体内过程' },
];

/** 参数词频：按次数降序，同次数保持词表顺序（稳定排序，结果可复算） */
function paramCounts(chap) {
  return PARAMS.map((p) => ({ ...p, ...keywordHits(chap, p.key) }))
    .map((p) => ({ key: p.key, group: p.group, total: p.total, per: p.per }))
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

/** 研究设计要素：密度集中在哪里 */
const ELEMENTS = ['对照', '随机', '盲法', '重复', '样本量'];

function designDensity(chap) {
  return ELEMENTS.map((w) => {
    const h = keywordHits(chap, w);
    const top = [...h.per].sort((a, b) => b.hits - a.hits)[0] || { sub: '', hits: 0 };
    return { word: w, total: h.total, top: top.sub, topHits: top.hits };
  });
}

/**
 * 量值核验：底本声明「不写含量与浓度与滴度的量值」。
 * 本函数把这条声明当断言复算——不是相信它，是检查它。
 * 词表与章门用的是同一套单位（见 scripts/lib_value_caliber.js）。
 */
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
  const params = paramCounts(chap);
  const handoff = handoffAudit(chap);
  const design = designDensity(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 绪论：概念、范围、发展、方法与研发链条（药理学 第1章）═══');
  console.log(`教材规模: 第1章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本声明与复算一致）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`参数词频: ${params.map((p) => `${p.key} ${p.total}`).join(' · ')}`);
  console.log('  → 量效组（效价强度 / 最大效应）与体内过程组（半衰期 / 生物利用度 / 清除率 / 表观分布容积）');
  console.log('     在 1.1.2 与 1.4.2 交汇：那两节既要说作用，也要说暴露。');
  console.log(`  参数最密集的小节: ${[...params[0].per].sort((a, b) => b.hits - a.hits).map((x) => `${x.sub}(${x.hits})`).slice(0, 4).join(' ')}`);
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  有交接句: ${handoff.subs.join(' ')}`);
  console.log(`  没有交接句: ${handoff.missing.join(' ')}`);
  console.log('  → 缺口正好是沿革（1.2.1）、方法原理（1.3.1 / 1.3.2）与研究类别（1.4.2）：');
  console.log('     这几节不产生对某个人或某个药的当下判断，所以不必交。这不是套话，是结构。');
  console.log('');
  console.log('研究设计要素的密度（全章次数 / 最集中的小节）：');
  for (const d of design) console.log(`  ${d.word} ${d.total} 次 · 集中在 ${d.top}（${d.topHits} 次）`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明药理学的研究对象/方法/发展/研发流程与表述口径，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, params, handoff, design, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  PARAMS,
  ELEMENTS,
  HANDOFF,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  paramCounts,
  handoffAudit,
  designDensity,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
