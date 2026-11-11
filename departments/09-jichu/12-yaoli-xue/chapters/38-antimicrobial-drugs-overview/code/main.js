#!/usr/bin/env node
/**
 * 药理学 · 第 38 章 抗病原微生物药物概论
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/38-antimicrobial-drugs-overview/docs/zh.md
 * 出处: 教材·药理学·第38章（38.1–38.4，4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=38]）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章有一处结构，只有把目录并排放才看得见：
 *
 *   38.2 抗菌药物作用机制：38.2.1 受体途径 / 38.2.2 非受体途径 / 38.2.3 效应与机制的关联
 *   38.3 细菌的耐药性及其产生机制：38.3.1 受体途径 / 38.3.2 非受体途径 / 38.3.3 效应与机制的关联
 *
 * 六个小节标题，三对完全同名。教材用同一副骨架讲了两件镜像的事：
 * 药怎么进来、怎么打中靶位；菌怎么把药挡在外面、改掉靶位、把药破坏掉。
 * 本程序把这副镜像算出来（标题对 / 字数对 / 关键词对），而不是靠读者自己去发现。
 *
 * 第二个计算是耐药出现的代数。耐药不是一次事件，而是一个概率事件：
 * 单个位点的耐药突变概率为 p。单药只需一次命中；两药机制独立时需两次独立命中，
 * 概率为 p²；两药机制相同（交叉耐药）时又退化为一次命中。
 * 达到「一半概率出现耐药株」所需代数 = ln2 / (N · p^k)，k 为需同时命中的位点数。
 * 三个 k 值给出三个数量级，这正是「联合延缓耐药」这句话的全部内容 ——
 * 也说明它为什么有前提：一旦交叉耐药，联合只是一次开两种药。
 *
 * 量值口径：p 与 N 为合成教学参数，输出里的小数只为自证；docs 只引用结构结论。
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
const CHAPTER = 38;

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

/** 把小节标题压成「去掉编号的纯文本」，用于比较同名 */
const bare = (t) => t.replace(/^\d+\.\d+\.\d+\s*/, '').trim();

/**
 * 镜像结构：38.2 与 38.3 的小节标题逐条对照。
 * 同名不是巧合，是教材把「作用」与「耐药」放在同一副骨架上的证据。
 */
function mirrorPairs(chap) {
  const s2 = chap.secs.find((s) => s.no === '38.2').subs;
  const s3 = chap.secs.find((s) => s.no === '38.3').subs;
  return s2.map((a, i) => {
    const b = s3[i];
    return {
      a: a.no, b: b.no,
      titleA: bare(a.title), titleB: bare(b.title),
      same: bare(a.title) === bare(b.title),
      hanziA: hanzi(a.body), hanziB: hanzi(b.body),
    };
  });
}

/** 镜像两侧的关键词对照：药这一侧说什么，菌那一侧说什么 */
const MIRROR_WORDS = ['靶位', '灭活酶', '外排', '膜', '基因'];

function mirrorWords(chap) {
  const s2 = chap.secs.find((s) => s.no === '38.2').subs.map((u) => u.body).join('');
  const s3 = chap.secs.find((s) => s.no === '38.3').subs.map((u) => u.body).join('');
  const cnt = (t, w) => (t.match(new RegExp(w, 'g')) || []).length;
  return MIRROR_WORDS.map((w) => ({ word: w, drug: cnt(s2, w), resistance: cnt(s3, w) }));
}

/** 概念词表：本章的四个基本概念各被讲了几次 */
const CONCEPTS = ['选择性毒性', '抗菌谱', '抑菌', '杀菌', '耐药'];

function conceptTable(chap) {
  return CONCEPTS.map((w) => ({ word: w, ...keywordHits(chap, w) }));
}

/* ───────────────────────── 耐药出现的代数模型 ───────────────────────── */

const MODEL = { p: 1e-6, N: 1e9 };

/**
 * 半数概率出现耐药株所需代数：P(G)=1−exp(−N·p^k·G)=0.5 → G=ln2/(N·p^k)
 * k = 1：单药（一次命中）；k = 2：两药机制独立（两次独立命中）
 */
function generations({ p, N, k }) {
  return Math.log(2) / (N * Math.pow(p, k));
}

function resistanceTable(o = {}) {
  const { p, N } = { ...MODEL, ...o };
  const rows = [
    { key: 'single', label: '单药', k: 1, note: '一次命中即可耐药' },
    { key: 'combo', label: '联合两药（机制独立）', k: 2, note: '两次独立命中，概率相乘' },
    { key: 'cross', label: '联合两药（交叉耐药）', k: 1, note: '同一机制，退化为一次命中' },
  ];
  return rows.map((r) => ({
    ...r,
    gens: generations({ p, N, k: r.k }),
    perGen: N * Math.pow(p, r.k),
  }));
}

/** 单药与联合的代际比：应当恰为 1/p */
function comboGain(o = {}) {
  const { p, N } = { ...MODEL, ...o };
  return generations({ p, N, k: 2 }) / generations({ p, N, k: 1 });
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
  const pairs = mirrorPairs(chap);
  const mw = mirrorWords(chap);
  const concepts = conceptTable(chap);
  const rz = resistanceTable();
  const gain = comboGain();
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 抗病原微生物药物概论（药理学 第38章）═══');
  console.log(`教材规模: 第38章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${bare(u.title)} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log('镜像结构（38.2 作用机制 与 38.3 耐药机制 逐条对照）：');
  for (const p of pairs) {
    console.log(`  ${p.a} ${p.titleA} ‖ ${p.b} ${p.titleB} ${p.same ? '· 同名' : '· 不同名'} · ${p.hanziA}/${p.hanziB} 字`);
  }
  console.log(`  → 同名 ${pairs.filter((p) => p.same).length} / ${pairs.length}：同一副骨架讲两件镜像的事`);
  console.log('');
  console.log('镜像两侧的关键词：');
  for (const w of mw) console.log(`  ${w.word} 药侧 ${w.drug} / 耐药侧 ${w.resistance}`);
  console.log('');
  console.log('概念词的落点：');
  for (const c of concepts) console.log(`  ${c.word} ${c.total} 次 · ${c.per.map((x) => `${x.sub}(${x.hits})`).join(' ')}`);
  console.log('');
  console.log(`耐药出现的代数（p=${MODEL.p} · N=${MODEL.N}，合成教学参数）：`);
  for (const r of rz) console.log(`  ${r.label}: 半数概率所需代数 ${r.gens.toExponential(2)} · 每代预期命中 ${r.perGen.toExponential(2)}`);
  console.log(`  → 联合相对单药的代际增益 = ${gain.toExponential(2)}，恰好等于 1/p：把一次事件拆成两次独立事件`);
  console.log('  → 交叉耐药一行与单药完全相同：联合的前提是两药各自独立有效');
  console.log('');
  console.log(`口径句核验: ${briefs.filter((x) => x.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明抗病原微生物药物的概念/分类/作用机制/耐药机制/合理应用原则与表述口径，不写剂量与浓度与检验数值（剂量与用法照底本），不作适应证判定与感染诊断，不构成用药建议');

  return { chap, subs, shape: s, secs, pairs, mirrorWords: mw, concepts, resistance: rz, gain, values, briefs, extremes: ext };
}

if (require.main === module) main();

module.exports = {
  ROOT, FILE, CHAPTER, MODEL, MIRROR_WORDS, CONCEPTS, VALUE_RE,
  load, chapterOf, subsOf, hanzi, bare, shape, sectionStats, keywordHits,
  mirrorPairs, mirrorWords, conceptTable, generations, resistanceTable, comboGain,
  valueAudit, briefAudit, extremes, main,
};
