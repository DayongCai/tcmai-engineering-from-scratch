#!/usr/bin/env node
/**
 * 药理学 · 第 19 章 中枢兴奋药
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/19-central-nervous-system-stimulants/docs/zh.md
 * 出处: 教材·药理学·第19章（19.1–19.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=19]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要说的命题是「中枢兴奋药的分类与剂量绑定」。
 * 这个命题能不能落到数上——三类药各占几节、剂量迁移被写了几次、
 * 「惊厥」这个词压在哪几个小节、判断交给了谁——都能在底本正文里数出来。
 * 手打的数字会在教材改版后静默过期；现算的数字一旦对不上，测试自己会红。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../19-central-nervous-system-stimulants/code
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
const CHAPTER = 19;
const TITLE = '中枢兴奋药';
const SLUG = 'central-nervous-system-stimulants';

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

/** 本章（默认第 19 章）的结构对象 */
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
 * 骨架词表：三组语言。
 * 「剂量迁移」「剂量」讲分类与剂量的绑定；「皮质 / 延髓 / 脊髓」是三条作用轴；
 * 「惊厥」「双相」是风险与反转的两副面孔——教材在这三组词上摊开了全章。
 */
const KEYWORDS = [
  { key: '剂量迁移', group: '轴' },
  { key: '大脑皮质', group: '轴' },
  { key: '延髓', group: '轴' },
  { key: '脊髓', group: '轴' },
  { key: '惊厥', group: '风险' },
  { key: '腺苷受体', group: '机制' },
  { key: '甘氨酸', group: '机制' },
  { key: '双相', group: '风险' },
];

/** 骨架词词频：按次数降序，同次数保持词表顺序（稳定排序，结果可复算） */
function keywordCounts(chap) {
  return KEYWORDS.map((p) => {
    const h = keywordHits(chap, p.key);
    return { key: p.key, group: p.group, total: h.total, per: h.per };
  }).sort((a, b) => b.total - a.total);
}

/** 三条作用轴各自落在哪几个小节：分类是否真被三节分开写，看这个分布 */
const AXES = ['大脑皮质', '延髓', '脊髓'];

function axisSpread(chap) {
  return AXES.map((w) => {
    const h = keywordHits(chap, w);
    return { axis: w, total: h.total, subs: h.per.map((x) => x.sub) };
  });
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
 * 量值核验：底本带剂量（B 支），但本章正文的剂量全部写在少数几个小节里。
 * 本函数把「哪几个小节出现量值」当断言复算——不是相信它，是检查它。
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
  const kws = keywordCounts(chap);
  const axes = axisSpread(chap);
  const handoff = handoffAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 中枢兴奋药：分类与剂量绑定的三条轴（药理学 第19章）═══');
  console.log(`教材规模: 第19章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处，分布在 ${values.offenders.length} 个小节`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`骨架词频: ${kws.map((p) => `${p.key} ${p.total}`).join(' · ')}`);
  console.log('  → 轴组（大脑皮质 / 延髓 / 脊髓）与风险组（惊厥 / 双相）分列：');
  console.log('     前者回答「药作用在哪一级」，后者回答「剂量再大一步会怎样」。');
  for (const a of axes) console.log(`  ${a.axis}: ${a.total} 次 · 见于 ${a.subs.length} 个小节（${a.subs.join(' ')}）`);
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  有交接句: ${handoff.subs.join(' ')}`);
  console.log(`  没有交接句: ${handoff.missing.join(' ')}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');

  const last = '教学边界：本章只说明中枢兴奋药的分类、作用部位、剂量迁移与安全边界，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议';
  console.log(last);

  return { chap, subs, shape: s, secs, kws, axes, handoff, values, briefs, extremes: ext, last };
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
  handoffAudit,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
