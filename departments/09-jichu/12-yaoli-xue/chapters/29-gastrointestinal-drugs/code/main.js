#!/usr/bin/env node
/**
 * 药理学 · 第 29 章 消化系统药：一条攻防线，四个落点
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/29-gastrointestinal-drugs/docs/zh.md
 * 出处: 教材·药理学·第29章（29.1–29.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=29]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题有三句——
 *   「抗消化性溃疡药按靶点分三节，一节一个亚类，不是按药物排列」；
 *   「给药时间是机制的组成部分，不是附加的操作细节」；
 *   「分类会交叉：同一味药可以同时出现在两类里」。
 * 三句都能落在可复算的结构上：三个亚类词的主峰小节、四个时机词的次数与分布、
 * 三个交叉词各自出现的节。手打会在教材改版后静默过期。
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
const CHAPTER = 29;

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
 * 溃疡药的三个亚类：抗酸药 / 抑制胃酸分泌 / 胃黏膜保护。
 * 判据是三个词的主峰分别落在 29.2.1 / 29.2.2 / 29.2.3——
 * 一节一个亚类，说明这一节是按靶点分节，不是按药物清单排列。
 */
const SUBCLASS = [
  { word: '抗酸药', sub: '29.2.1', route: '中和已分泌的酸' },
  { word: '抑制胃酸分泌', sub: '29.2.2', route: '减少酸的来源' },
  { word: '胃黏膜保护', sub: '29.2.3', route: '增强黏膜防御' },
];

function subclassAudit(chap) {
  return SUBCLASS.map((s) => {
    const h = keywordHits(chap, s.word);
    const top = [...h.per].sort((a, b) => b.hits - a.hits)[0] || { sub: '', hits: 0 };
    return {
      word: s.word,
      sub: s.sub,
      route: s.route,
      total: h.total,
      top: top.sub,
      topHits: top.hits,
      ok: top.sub === s.sub,
      subs: h.per.map((p) => p.sub),
    };
  });
}

/**
 * 四个时机词：饭前 / 睡前 / 空腹 / 餐时。
 * 本章最特别的一处是「时间就是机制」——酶的底物、苦味反射、胰酶与食糜同步、
 * 渗透性泻药的空腹饮水，都靠时间成立。次数本身就是一条可复算的证据。
 */
const TIMINGS = ['饭前', '睡前', '空腹', '餐时'];

function timingAudit(chap) {
  return TIMINGS.map((w) => {
    const h = keywordHits(chap, w);
    return {
      word: w,
      total: h.total,
      subs: h.per.map((p) => p.sub),
      secs: [...new Set(h.per.map((p) => p.sub.split('.').slice(0, 2).join('.')))],
    };
  });
}

/**
 * 三个交叉词：乳果糖（渗透性泻药 + 治疗肝昏迷）、硫酸镁（容积性泻药 + 利胆药）、
 * 铋剂（胃黏膜保护药 + 抑制幽门螺杆菌）。判据是它们跨了几个小节。
 */
const CROSS = ['乳果糖', '硫酸镁', '铋剂'];

function crossAudit(chap) {
  return CROSS.map((w) => {
    const h = keywordHits(chap, w);
    return {
      word: w,
      total: h.total,
      subs: h.per.map((p) => p.sub),
      secs: [...new Set(h.per.map((p) => p.sub.split('.').slice(0, 2).join('.')))],
    };
  });
}

const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;

function valueAudit(chap) {
  const subs = subsOf(chap);
  const offenders = [];
  let hits = 0;
  for (const u of subs) {
    const m = u.body.match(VALUE_RE) || [];
    if (m.length) offenders.push({ sub: u.no, hits: m.length });
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
  const sub3 = subclassAudit(chap);
  const timing = timingAudit(chap);
  const cross = crossAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 消化系统药：一条攻防线，四个落点（药理学 第29章）═══');
  console.log(`教材规模: 第29章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处，落在 ${values.offenders.map((o) => `${o.sub}(${o.hits})`).join(' ')}`);
  console.log('');
  console.log('溃疡药的三个亚类是否一节一个（按靶点分节，不是按药物排列）：');
  for (const x of sub3) {
    console.log(`  ${x.word} ${x.total} 次 · 主峰 ${x.top}（${x.topHits} 次）· 认领 ${x.sub} ${x.route} · 覆盖 ${x.subs.length} 个小节 · ${x.ok ? '各归其位' : '越界'}`);
  }
  console.log('');
  console.log('四个时机词（时间是不是机制的一部分，看它写了多少次）：');
  for (const t of timing) {
    console.log(`  ${t.word} ${t.total} 次 · 落在 ${t.subs.length} 个小节、${t.secs.length} 节（${t.secs.join('/')}）`);
  }
  const tSum = timing.reduce((n, t) => n + t.total, 0);
  console.log(`  合计 ${tSum} 次 · 覆盖 ${[...new Set(timing.flatMap((t) => t.secs))].length} 节`);
  console.log('');
  console.log('三个交叉词跨了几节（分类会交叉，不是互斥的筐）：');
  for (const c of cross) {
    console.log(`  ${c.word} ${c.total} 次 · ${c.subs.join('/')} · 跨 ${c.secs.length} 节（${c.secs.join('/')}）`);
  }
  console.log('');
  console.log(`12 个小节汉字（最薄 ${ext.thinnest.sub} ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明消化系统药的分类、作用环节与用药时机的机制关系，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, subclass: sub3, timing, timingSum: tSum, cross, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  SUBCLASS,
  TIMINGS,
  CROSS,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  subclassAudit,
  timingAudit,
  crossAudit,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
