#!/usr/bin/env node
/**
 * 药理学 · 第 20 章 组胺及抗组胺药
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/20-histamine-and-antihistamines/docs/zh.md
 * 出处: 教材·药理学·第20章（20.1–20.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=20]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的主语不是药名，是「受体亚型」这条轴。
 * 轴的证据在词的分布上——H1 与 H2 各被提到几次、落在几个小节，
 * 「第一代 / 第二代」这一对代际词是不是真的在替「优劣」说话，
 * 20.3 的三节写作规范又在全章占了多少分量，都能数出来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

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
const CHAPTER = 20;
const TITLE = '组胺及抗组胺药';
const SLUG = 'histamine-and-antihistamines';

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

function chapter(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

function subsOf(chap) {
  return chap.secs.flatMap((s) => s.subs).sort((a, b) => a.no.localeCompare(b.no, 'en'));
}

const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;

function shape(chap) {
  const subs = subsOf(chap);
  return {
    secs: chap.secs.length,
    subs: subs.length,
    hanzi: subs.reduce((n, u) => n + hanzi(u.body), 0),
  };
}

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
 * 骨架词表：四组语言。
 * 「组胺 / 肥大细胞」是物质与来源；「H1受体 / H2受体」是轴；
 * 「拮抗」是本章所有药物的共同动作；「首过」与「复核」分属药动学与写作规范
 * ——20.3 与 20.4 各占一节，词频上应能看出它们不是附论。
 */
const KEYWORDS = [
  { key: '组胺', group: '物质' },
  { key: 'H1受体', group: '轴' },
  { key: 'H2受体', group: '轴' },
  { key: '拮抗', group: '动作' },
  { key: '肥大细胞', group: '物质' },
  { key: '复核', group: '规范' },
  { key: '首过', group: '体内过程' },
  { key: '嗜睡', group: '表现' },
];

function keywordCounts(chap) {
  return KEYWORDS.map((p) => {
    const h = keywordHits(chap, p.key);
    return { key: p.key, group: p.group, total: h.total, per: h.per };
  }).sort((a, b) => b.total - a.total);
}

/** 受体轴：H1 与 H2 各自铺在几个小节，决定「按亚型分类」是否真被贯彻 */
const AXES = ['H1受体', 'H2受体'];

function axisSpread(chap) {
  return AXES.map((w) => {
    const h = keywordHits(chap, w);
    return { axis: w, total: h.total, subs: h.per.map((x) => x.sub) };
  });
}

/**
 * 代际词：第一代 / 第二代。
 * 教材在 20.2.1 与 20.2.3 用这对词描述「中枢作用强弱」，
 * 并在同一处反复声明「属类别特征，不作优劣比较」。
 * 两个词的次数接近，说明它们是并列描述而不是递进排名。
 */
const GENERATIONS = ['第一代', '第二代'];

function generationSpread(chap) {
  return GENERATIONS.map((w) => {
    const h = keywordHits(chap, w);
    return { gen: w, total: h.total, subs: h.per.map((x) => x.sub) };
  });
}

/** 判断的去向：正文把结论交给「具备资质的人员」的小节 */
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

function briefAudit(chap) {
  const need = ['剂量与用法照底本', '本书不构成用药建议'];
  return subsOf(chap).map((u) => ({
    sub: u.no,
    ok: need.every((k) => u.brief.includes(k)),
    missing: need.filter((k) => !u.brief.includes(k)),
  }));
}

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
  const kws = keywordCounts(chap);
  const axes = axisSpread(chap);
  const gens = generationSpread(chap);
  const handoff = handoffAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 组胺及抗组胺药：一条受体轴与两节写作规范（药理学 第20章）═══');
  console.log(`教材规模: 第20章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处，分布在 ${values.offenders.length} 个小节`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`骨架词频: ${kws.map((p) => `${p.key} ${p.total}`).join(' · ')}`);
  console.log('  → 轴组（H1 / H2）与规范组（复核）分列：前者是分类依据，后者是本章自设的写作要求。');
  for (const a of axes) console.log(`  ${a.axis}: ${a.total} 次 · 见于 ${a.subs.length} 个小节（${a.subs.join(' ')}）`);
  console.log('');
  console.log(`代际词: ${gens.map((g) => `${g.gen} ${g.total} 次 / ${g.subs.length} 小节`).join(' · ')}`);
  console.log('  → 第一代与第二代的次数接近，说明这对词在描述「中枢作用强弱」，而不是排先后。');
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  没有交接句: ${handoff.missing.join(' ') || '（无）'}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');

  const last = '教学边界：本章只说明组胺作为自体活性物质的释放环节、四个受体亚型与抗组胺药的分类，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议';
  console.log(last);

  return { chap, subs, shape: s, secs, kws, axes, gens, handoff, values, briefs, extremes: ext, last };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  TITLE,
  SLUG,
  KEYWORDS,
  AXES,
  GENERATIONS,
  HANDOFF,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  keywordCounts,
  axisSpread,
  generationSpread,
  handoffAudit,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
