#!/usr/bin/env node
/**
 * 药理学 · 第 22 章 作用于心血管系统离子通道的药物
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/22-drugs-acting-on-cardiovascular-ion-channels/docs/zh.md
 * 出处: 教材·药理学·第22章（22.1–22.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=22]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的骨架是「通道方向 × 组织分布」。
 * 三条通道（钙、钾、钠）各被写了几节、词频多少；
 * 「复极」与「除极」这对方向词各压在哪几节；
 * 「门控」这个元词出现了几次——这些都能数出来，也都该被数出来。
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
const CHAPTER = 22;
const TITLE = '作用于心血管系统离子通道的药物';
const SLUG = 'drugs-acting-on-cardiovascular-ion-channels';

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
const cleanTitle = (t) => t.replace(/^\d+\.\d+\.\d+\s*/, '').trim();

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
 * 骨架词表：三条通道 + 两个方向词 + 两个机制词。
 * 通道词说明「写谁」，方向词（复极 / 除极）说明「往哪个方向写」，
 * 机制词（门控 / 状态依赖）说明「凭什么方向可被利用」。
 */
const KEYWORDS = [
  { key: '离子通道', group: '元词' },
  { key: '钙通道', group: '通道' },
  { key: '钾通道', group: '通道' },
  { key: '钠通道', group: '通道' },
  { key: '复极', group: '方向' },
  { key: '除极', group: '方向' },
  { key: '门控', group: '机制' },
  { key: '胺碘酮', group: '药' },
];

function keywordCounts(chap) {
  return KEYWORDS.map((p) => {
    const h = keywordHits(chap, p.key);
    return { key: p.key, group: p.group, total: h.total, per: h.per };
  }).sort((a, b) => b.total - a.total);
}

/** 三条通道：各铺在几个小节，决定 22.2 的三节是否真的三分天下 */
const AXES = ['钙通道', '钾通道', '钠通道'];

function axisSpread(chap) {
  return AXES.map((w) => {
    const h = keywordHits(chap, w);
    return { axis: w, total: h.total, subs: h.per.map((x) => x.sub) };
  });
}

/**
 * 方向词对：复极 / 除极。
 * 一对方向词的分布若高度集中在 22.2.2 与 22.2.3，
 * 说明「同一通道两个方向对应两类相反用途」不是靠记，是靠读出来的。
 */
const DIRECTIONS = ['复极', '除极'];

function directionSpread(chap) {
  return DIRECTIONS.map((w) => {
    const h = keywordHits(chap, w);
    return { dir: w, total: h.total, subs: h.per.map((x) => x.sub) };
  });
}

/** 判断的去向 */
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
  const dirs = directionSpread(chap);
  const handoff = handoffAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 作用于心血管系统离子通道的药物：通道方向决定用途类别（药理学 第22章）═══');
  console.log(`教材规模: 第22章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处，分布在 ${values.offenders.length} 个小节`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${cleanTitle(u.title)} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`骨架词频: ${kws.map((p) => `${p.key} ${p.total}`).join(' · ')}`);
  console.log('  → 通道词（写谁）、方向词（往哪写）、机制词（凭什么可被利用）三组并置。');
  for (const a of axes) console.log(`  ${a.axis}: ${a.total} 次 · 见于 ${a.subs.length} 个小节（${a.subs.join(' ')}）`);
  console.log('');
  console.log(`方向词: ${dirs.map((d) => `${d.dir} ${d.total} 次 / ${d.subs.length} 小节`).join(' · ')}`);
  console.log('  → 一对方向词都压在 22.2 里：同一通道的两个方向，对应两类相反的用途。');
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  没有交接句: ${handoff.missing.join(' ') || '（无）'}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');

  const last = '教学边界：本章只说明离子通道的选择性与门控性、三条通道药物的作用方向与体内过程，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议';
  console.log(last);

  return { chap, subs, shape: s, secs, kws, axes, dirs, handoff, values, briefs, extremes: ext, last };
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
  DIRECTIONS,
  HANDOFF,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  cleanTitle,
  shape,
  sectionStats,
  keywordHits,
  keywordCounts,
  axisSpread,
  directionSpread,
  handoffAudit,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
