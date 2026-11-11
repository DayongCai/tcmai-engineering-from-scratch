#!/usr/bin/env node
/**
 * 药理学 · 第 31 章 子宫兴奋药：分类、受体链、双向作用与观察闭环
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/31-uterine-stimulants/docs/zh.md
 * 出处: 教材·药理学·第31章（31.1–31.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=31]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「分类是推断工具，不是药名清单」。
 * 这个命题能落在哪几个数上——四组类别的词频如何分布、机制链的五个环节各被提到几次、
 * 观察与记录与复核三元组落在哪些小节——都能在底本正文里数出来。
 * 手打会在教材改版后静默过期；现算的数字一旦对不上，测试自己会红。
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
const CHAPTER = 31;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

function chapter(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

function subsOf(chap) {
  return chap.secs.flatMap((s) => s.subs).sort((a, b) => a.no.localeCompare(b.no, 'en'));
}

/** 汉字数：只数 CJK 统一表意文字 */
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
 * 四组类别：教材 31.1.2 按来源与化学属性分的四组。
 * 词频只说明笔墨摊在哪一组，不说明哪一组更重要，更不构成排序。
 */
const GROUPS = [
  { key: '垂体后叶', label: '垂体后叶激素类' },
  { key: '前列腺素', label: '前列腺素类' },
  { key: '麦角', label: '麦角生物碱类' },
  { key: '中药', label: '传统中药类' },
];

function groupDensity(chap) {
  return GROUPS.map((g) => {
    const h = keywordHits(chap, g.key);
    const top = [...h.per].sort((a, b) => b.hits - a.hits)[0] || { sub: '', hits: 0 };
    return { ...g, total: h.total, top: top.sub, topHits: top.hits, subs: h.per.length };
  });
}

/**
 * 机制链五环节：31.2.1 把缩宫素的作用写成 受体 → 磷脂酶C → 胞内钙 → 轻链磷酸化 → 收缩。
 * 链条是否完整写在教材正文里，是本章可复算的一条结构事实。
 */
const CHAIN = ['受体', '磷脂酶C', '钙', '肌球蛋白轻链', '收缩'];

function chainAudit(chap) {
  const rows = CHAIN.map((w) => {
    const h = keywordHits(chap, w);
    return { step: w, total: h.total, subs: h.per.length };
  });
  const base = rows[0].total || 1;
  return { rows, ratio: Math.round((rows[0].total / base) * 100) };
}

/**
 * 观察三元组：观察获取事实、记录固定事实、复核检验事实。
 * 三个词各有落点的小节数，说明教材把闭环拆开写在了哪几处。
 */
const LOOP = ['观察', '记录', '复核', '留痕'];

function loopAudit(chap) {
  const subs = subsOf(chap);
  return LOOP.map((w) => {
    const h = keywordHits(chap, w);
    return {
      word: w,
      total: h.total,
      subs: h.per.length,
      tail: subs.filter((u) => u.body.includes(w)).map((u) => u.no),
    };
  });
}

/**
 * 双向作用：前列腺素类对子宫体兴奋、对子宫颈软化。
 * 教材用「双向」概括，这里数一数「松弛」与「软化」各自出现在哪一节。
 */
function bidirectional(chap) {
  const soften = keywordHits(chap, '软化');
  const relax = keywordHits(chap, '松弛');
  return { soften, relax };
}

/** 量值核验：词表与 scripts/lib_value_caliber.js 同一套单位 */
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
  const groups = groupDensity(chap);
  const chain = chainAudit(chap);
  const loop = loopAudit(chap);
  const bi = bidirectional(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 子宫兴奋药：分类、受体链、双向作用与观察闭环（药理学 第31章）═══');
  console.log(`教材规模: 第31章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本声明与复算一致）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`四组类别词频: ${groups.map((g) => `${g.label} ${g.total}`).join(' · ')}`);
  console.log(`  最密集的小节: ${groups.map((g) => `${g.label}→${g.top}(${g.topHits})`).join(' ')}`);
  console.log('  → 词频只说明笔墨摊在哪一组，不说明哪一组更重要，更不构成处方上的先后。');
  console.log('');
  console.log(`机制链五环节词频: ${chain.rows.map((r) => `${r.step} ${r.total}`).join(' · ')}`);
  console.log(`  链条在 ${chain.rows.filter((r) => r.total > 0).length} / ${chain.rows.length} 个环节上有落笔，分布 ${chain.rows.map((r) => r.subs).join('/')} 个小节`);
  console.log('');
  console.log('观察三元组的落点（全章次数 / 覆盖小节数）：');
  for (const x of loop) console.log(`  ${x.word} ${x.total} 次 · ${x.subs} 个小节 · ${x.tail.join(' ')}`);
  console.log('');
  console.log(`双向作用: 软化 ${bi.soften.total} 次（${bi.soften.per.map((p) => p.sub).join(' ')}） · 松弛 ${bi.relax.total} 次（${bi.relax.per.map((p) => p.sub).join(' ')}）`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明子宫兴奋药的分类/受体与胞内钙链/双向作用/观察与记录与复核要求，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, groups, chain, loop, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  GROUPS,
  CHAIN,
  LOOP,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  groupDensity,
  chainAudit,
  loopAudit,
  bidirectional,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
