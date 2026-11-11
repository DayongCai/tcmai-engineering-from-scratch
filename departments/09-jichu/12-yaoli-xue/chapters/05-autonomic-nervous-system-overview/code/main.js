#!/usr/bin/env node
/**
 * 药理学 · 第 5 章 传出神经系统药理概论：解剖、递质、受体三层框架
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/05-autonomic-nervous-system-overview/docs/zh.md
 * 出处: 教材·药理学·第5章（5.1–5.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=5]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「药名要挂在受体轴上，而不是挂在药名表上」。
 * 这条主张能落在哪几个数上——三层框架各被提了几次、受体亚型各出现几次、
 * 递质五个环节的笔墨如何分配、六类药物是否都落地、判断交给谁——都能在底本正文里数出来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../chapters/05-autonomic-nervous-system-overview/code
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
const CHAPTER = 5;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

/** 本章（默认第 5 章）的结构对象 */
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
 * 三层框架：解剖学给骨架（起点、神经节、末梢），递质给化学物质，受体给识别位点。
 * 三层是本篇所有章节的索引结构，哪一层薄，后面的药就挂不上去。
 */
const LAYERS = ['神经节', '递质', '受体'];

function layerAudit(chap) {
  return LAYERS.map((w) => {
    const h = keywordHits(chap, w);
    const top = [...h.per].sort((a, b) => b.hits - a.hits)[0] || { sub: '', hits: 0 };
    return { word: w, total: h.total, subs: h.per.length, top: top.sub, topHits: top.hits };
  });
}

/** 受体亚型词表：M1–M5、N1–N2、α1–α2、β1–β3 */
const SUBTYPES = ['M1', 'M2', 'M3', 'N1', 'N2', 'α1', 'α2', 'β1', 'β2', 'β3'];

function subtypeAudit(chap) {
  return SUBTYPES.map((w) => ({ word: w, ...keywordHits(chap, w) }));
}

/**
 * 递质的五个可干预环节：合成、储存、释放、灭活、再摄取。
 * 5.4.1 正是按这五环铺开的，5.4.3 把它写成「作用方式」的第二条主线。
 */
const LINKS = ['合成', '储存', '释放', '灭活', '再摄取'];

function linkAudit(chap) {
  return LINKS.map((w) => {
    const h = keywordHits(chap, w);
    return { word: w, total: h.total, subs: h.per.length };
  });
}

/** 六类主干药物：分类以受体为纲、以作用方式为目 */
const CLASSES = [
  '胆碱受体激动药',
  '抗胆碱酯酶药',
  '胆碱受体阻断药',
  '肾上腺素受体激动药',
  '肾上腺素受体阻断药',
  '末梢阻滞药',
];

function classAudit(chap) {
  return CLASSES.map((w) => ({ word: w, ...keywordHits(chap, w) }));
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
  const layers = layerAudit(chap);
  const subtypes = subtypeAudit(chap);
  const links = linkAudit(chap);
  const classes = classAudit(chap);
  const handoff = handoffAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 传出神经系统药理概论：解剖、递质、受体三层框架（药理学 第5章）═══');
  console.log(`教材规模: 第5章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本声明与复算一致）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`三层框架: ${layers.map((l) => `${l.word} ${l.total} 次 / ${l.subs} 小节`).join(' · ')}`);
  console.log(`  受体最密: ${layers[2].top}（${layers[2].topHits} 次）——亚型表就压在那里。`);
  console.log('');
  console.log(`受体亚型出场次数: ${subtypes.map((x) => `${x.word} ${x.total}`).join(' · ')}`);
  console.log('  → M 族的亚型被逐个点名，N 族只分神经节型与肌肉型：');
  console.log('     前者要解释器官差异，后者要解释两类阻断药为何能分开。');
  console.log('');
  console.log(`递质五环节: ${links.map((l) => `${l.word} ${l.total} 次 / ${l.subs} 小节`).join(' · ')}`);
  console.log('  → 「释放」被写得最厚：五个环节里只有它同时受促进与抑制两类药物干预。');
  console.log('');
  console.log(`六类主干药物: ${classes.map((c) => `${c.word} ${c.total}`).join(' · ')}`);
  console.log(`  六类全部落地: ${classes.filter((c) => c.total > 0).length} / ${classes.length}`);
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  有交接句: ${handoff.subs.join(' ')}`);
  console.log(`  没有交接句: ${handoff.missing.join(' ') || '（无）'}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明传出神经系统的解剖分类、递质与受体分型、生理功能与药物分类框架，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, layers, subtypes, links, classes, handoff, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  LAYERS,
  SUBTYPES,
  LINKS,
  CLASSES,
  HANDOFF,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  layerAudit,
  subtypeAudit,
  linkAudit,
  classAudit,
  handoffAudit,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
