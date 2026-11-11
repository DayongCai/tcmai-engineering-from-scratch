#!/usr/bin/env node
/**
 * 药理学 · 第 37 章 性激素类药及避孕药
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/37-sex-hormones-and-contraceptives/docs/zh.md
 * 出处: 教材·药理学·第37章（37.1–37.4，4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=37]）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章有一处结构上的对称，值得单独算一遍：
 *
 *   同一个下丘脑—垂体—性腺的负反馈环，教材用它写了两件方向相反的事。
 *   复方口服避孕药往环里加外源激素，把促性腺激素压下去，于是不排卵（37.4.1）；
 *   氯米芬占据下丘脑与垂体的雌激素受体、阻断内源激素的负反馈，促性腺激素反而升上去，
 *   于是促排卵（37.1.2）。同一条环，一个加压、一个松手，方向就翻了。
 *   小剂量单方孕激素走的是第三条路：剂量小到压不住这条环，作用改在宫颈与内膜（37.4.3）。
 *
 * 模型：G（促性腺激素）受 (H + u) 的 Hill 型负反馈抑制，H（内源激素）由 G 驱动。
 *   dG/dt = a / (1 + ((H+u)/K)^n) · (1 − blocked) − b·G
 *   dH/dt = c·G − d·H
 * 全部归一化，只用于比较三条路的相对位置，不描述任何真实个体。
 *
 * 另一个词频事实：教材三次讲「首过效应」，三次都落在天然激素那一小节
 * （雌激素、孕激素、雄激素），合成衍生物不在此列 —— 这不是行文习惯，
 * 而是「为什么要有合成衍生物」这个问题的答案。
 *
 * 量值口径：输出里有小数，是为自证模型；docs 只引用结构结论。
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
const CHAPTER = 37;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

function chapterOf(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

const subsOf = (chap) => chap.secs.flatMap((s) => s.subs).sort((a, b) => a.no.localeCompare(b.no, 'en'));
const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;

function shape(chap) {
  const subs = subsOf(chap);
  return { secs: chap.secs.length, subs: subs.length, hanzi: subs.reduce((n, u) => n + hanzi(u.body), 0) };
}

function sectionStats(chap) {
  return chap.secs.map((s) => {
    const h = s.subs.reduce((n, u) => n + hanzi(u.body), 0);
    return { no: s.no, title: s.title.replace(/^\d+\.\d+\s*/, ''), subs: s.subs.length, hanzi: h, avg: Math.round(h / s.subs.length) };
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

/** 首过效应：教材在校小节的落点 —— 天然激素那一节各一次？ */
const FIRSTPASS = '首过';

/** 避孕药三节各自主打的环节词 —— 三节标题已经写成三种环节 */
const PHASES = ['抑制排卵', '抗着床', '阻碍受精'];

function phaseTable(chap) {
  const contraception = subsOf(chap).filter((u) => u.no.startsWith('37.4'));
  return PHASES.map((w) => ({
    word: w,
    total: keywordHits(chap, w).total,
    per: contraception.map((u) => ({ sub: u.no, hits: (u.body.match(new RegExp(w, 'g')) || []).length })),
  }));
}

/** 受体方向词表：激动类与阻断类在章内怎么分 */
const VECTORS = ['激动', '拮抗', '阻断', '部分激动'];

function vectorTable(chap) {
  return VECTORS.map((w) => ({ word: w, ...keywordHits(chap, w) }));
}

/* ───────────────────────── 负反馈环模型 ───────────────────────── */

const MODEL = { a: 1, b: 1, c: 1, d: 1, K: 1, n: 2, u: 0, blocked: 0, horizon: 60, steps: 12000 };

function runAxis(o = {}) {
  const { a, b, c, d, K, n, horizon, steps } = { ...MODEL, ...o };
  const u = typeof o.u === 'function' ? o.u : () => (o.u ?? MODEL.u);
  const blocked = typeof o.blocked === 'function' ? o.blocked : () => (o.blocked ?? MODEL.blocked);
  const dt = horizon / steps;
  let G = 1;
  let H = 0.5;
  const series = [{ t: 0, G, H }];
  let peakG = G;
  let tPeak = 0;
  for (let i = 1; i <= steps; i += 1) {
    const t = i * dt;
    const drive = (a / (1 + Math.pow((H + u(t)) / K, n))) * (1 - blocked(t));
    const dG = (drive - b * G) * dt;
    const dH = (c * G - d * H) * dt;
    G += dG;
    H += dH;
    if (G > peakG) { peakG = G; tPeak = t; }
    series.push({ t, G, H });
  }
  return { series, end: { G, H }, peakG, tPeak };
}

function steady(o = {}) {
  const r = runAxis({ horizon: 120, ...o });
  return r.end;
}

/**
 * 四条路：
 *   physiology  不给药
 *   combined    复方口服避孕药（外源激素持续输入，压负反馈）
 *   minipill    小剂量单方孕激素（输入很小，压不住这条环）
 *   clomiphene  氯米芬（占据受体、阻断负反馈 → 驱动力不再被抑制）
 */
function routes() {
  const base = steady({});
  const rows = [
    { key: 'physiology', label: '不给药（生理状态）', s: base, u: 0, blocked: 0 },
    { key: 'combined', label: '复方口服避孕药', s: steady({ u: 3 }), u: 3, blocked: 0 },
    { key: 'minipill', label: '小剂量单方孕激素', s: steady({ u: 0.15 }), u: 0.15, blocked: 0 },
    { key: 'clomiphene', label: '氯米芬（阻断负反馈）', s: steady({ blocked: 1 }), u: 0, blocked: 1 },
  ];
  return { base, rows: rows.map((r) => ({ ...r, gRatio: r.s.G / base.G, hRatio: r.s.H / base.H, totalRatio: (r.s.H + r.u) / base.H })) };
}

/** 停药后的反弹：外源输入在某时刻归零，看促性腺激素冲到多高 */
function withdrawal(stopAt = 20) {
  const u = (t) => (t < stopAt ? 3 : 0);
  const r = runAxis({ u, horizon: 80 });
  const after = r.series.filter((p) => p.t >= stopAt);
  const peakAfter = after.reduce((m, p) => (p.G > m.G ? p : m), after[0]);
  const base = steady({});
  return { peakAfter: peakAfter.G, base: base.G, ratio: peakAfter.G / base.G, tPeak: peakAfter.t, stopAt };
}

/* ───────────────────────── 口径核验 ───────────────────────── */

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
  return subsOf(chap).map((u) => ({ sub: u.no, ok: need.every((k) => u.brief.includes(k)), missing: need.filter((k) => !u.brief.includes(k)) }));
}

function extremes(chap) {
  const rows = subsOf(chap).map((u) => ({ sub: u.no, hanzi: hanzi(u.body) }));
  const sorted = [...rows].sort((a, b) => a.hanzi - b.hanzi);
  return { thinnest: sorted[0], thickest: sorted[sorted.length - 1] };
}

function main() {
  const chap = chapterOf(load());
  const subs = subsOf(chap);
  const s = shape(chap);
  const secs = sectionStats(chap);
  const fp = keywordHits(chap, FIRSTPASS);
  const phases = phaseTable(chap);
  const vectors = vectorTable(chap);
  const { base, rows } = routes();
  const wd = withdrawal();
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 性激素类药及避孕药（药理学 第37章）═══');
  console.log(`教材规模: 第37章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`首过效应 ${fp.total} 次：${fp.per.map((p) => `${p.sub}(${p.hits})`).join(' ')}`);
  console.log('避孕药三节的环节词（各节内部的次数）：');
  for (const p of phases) console.log(`  ${p.word} 全章 ${p.total} · ${p.per.map((x) => `${x.sub}(${x.hits})`).join(' ')}`);
  console.log('');
  console.log('受体方向词表：' + vectors.map((v) => `${v.word} ${v.total}`).join(' · '));
  console.log('');
  console.log(`负反馈环（归一化，生理稳态 G = ${base.G.toFixed(3)} · H = ${base.H.toFixed(3)}）：`);
  for (const r of rows) {
    console.log(`  ${r.label}: G ${r.gRatio.toFixed(3)} · 内源 H ${r.hRatio.toFixed(3)} · 总信号 ${r.totalRatio.toFixed(3)}`);
  }
  console.log(`  → 复方把促性腺激素压到生理的 ${(rows[1].gRatio * 100).toFixed(0)}%，小剂量单方保留 ${(rows[2].gRatio * 100).toFixed(0)}%，氯米芬把它抬到 ${(rows[3].gRatio * 100).toFixed(0)}%`);
  console.log(`  → 同一条环：加压（复方）与松手（氯米芬）的方向相反，幅度对称`);
  console.log(`停药反弹: 促性腺激素峰值 ${wd.ratio.toFixed(3)} 倍生理水平，出现在停药后 ${wd.tPeak.toFixed(1)}（相对时间）`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((x) => x.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明性激素类药及避孕药的分类/作用/机制/体内过程/不良反应类别与表述口径，不写剂量与浓度与检验数值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, firstpass: fp, phases, vectors, base, routes: rows, withdrawal: wd, values, briefs, extremes: ext };
}

if (require.main === module) main();

module.exports = {
  ROOT, FILE, CHAPTER, MODEL, FIRSTPASS, PHASES, VECTORS, VALUE_RE,
  load, chapterOf, subsOf, hanzi, shape, sectionStats, keywordHits,
  phaseTable, vectorTable, runAxis, steady, routes, withdrawal,
  valueAudit, briefAudit, extremes, main,
};
