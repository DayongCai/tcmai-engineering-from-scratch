#!/usr/bin/env node
/**
 * 药理学 · 第 36 章 降血糖药
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/36-antihyperglycemic-drugs/docs/zh.md
 * 出处: 教材·药理学·第36章（36.1–36.4，4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=36]）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的降血糖药可以按「动的是哪一段」排成一张环节表：
 *   补充外源（胰岛素）、促泌（磺酰脲类与格列奈类，关β细胞钾通道）、
 *   减少肝糖输出（双胍类）、延缓肠道吸收（α-葡萄糖苷酶抑制药）。
 * 四条路都能让餐后峰值变低，所以「都能降血糖」这句话是对的，也是无用的 ——
 * 它把三条性质完全不同的曲线说成了一件事。本程序把这四条路各跑一遍：
 *
 *   一室模型：肠道 G 经一级速率 ka 进入血糖池 C，肝脏以恒定速率 E 输出，
 *   外周以一级速率 k 处置。dC/dt = ka·G + E − k·C。
 *   全部为归一化量，只用于比较曲线形状，不描述任何真实个体。
 *
 *   由此得到的三个可分辨量：
 *     · 峰值高度（峰有多高）
 *     · 达峰时间（峰何时到）
 *     · 餐后增量面积（这一次进餐一共带来多少暴露）
 *   四条路在这三个量上的签名各不相同：
 *     延缓吸收 —— 峰降、峰推迟、增量面积不变（把同样的糖摊得更薄）
 *     促泌/补充 —— 峰降、峰不推迟、增量面积下降（把糖处置得更快）
 *     减少肝输出 —— 峰降，但降的是起点，增量面积不变（把地板压低）
 *   再补一组「不进食」的探针：促泌剂在无糖可处置时把血糖压到基线以下，
 *   延缓吸收药在无糖可延缓时什么也不发生。低血糖风险为何只属于前一类，
 *   在这里变成可算的差别，而不是一句不良反应登记。
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
const CHAPTER = 36;

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

/**
 * 环节词表：四个作用环节在 36.1（胰岛素）与 36.2（口服药）里的落点。
 * 「促泌」是磺酰脲类的动词，「输出」是双胍类的动词，「延缓」是糖苷酶抑制药的动词。
 */
const LINKS = ['促泌', '输出', '延缓', '受体'];

function linkTable(chap) {
  return LINKS.map((w) => ({ word: w, ...keywordHits(chap, w) }));
}

/** 低血糖：教材把它写成不良反应的首要类别；看它压在哪些小节 */
const RISK = ['低血糖', '不良反应', '观察', '复核'];

function riskTable(chap) {
  return RISK.map((w) => ({ word: w, ...keywordHits(chap, w) }));
}

/* ───────────────────────── 餐后曲线模型 ───────────────────────── */

const MODEL = { meal: 1, ka: 2, E: 1, k: 1, horizon: 10, steps: 8000 };

/**
 * @param {{meal:number, ka:number, E:number, k:number, horizon:number, steps:number}} o
 * 返回曲线与三个可分辨量：峰值、达峰时间、餐后增量面积（相对基线的面积）
 */
function runCurve(o = {}) {
  const { meal, ka, E, k, horizon, steps } = { ...MODEL, ...o };
  const dt = horizon / steps;
  const base = E / k; // 无进餐时的稳态起点
  let gut = meal;
  let C = base;
  const series = [{ t: 0, C }];
  let auc = 0;
  let peak = C;
  let tPeak = 0;
  for (let i = 1; i <= steps; i += 1) {
    const t = i * dt;
    const influx = ka * gut;
    const dGut = -influx * dt;
    const dC = (influx + E - k * C) * dt;
    gut += dGut;
    C += dC;
    auc += (C - base) * dt;
    if (C > peak) { peak = C; tPeak = t; }
    series.push({ t, C });
  }
  // 回到基线之上某个小量以内的时间（取首次跌破 base + 峰值的百分之一）
  const eps = base + (peak - base) * 0.01;
  const back = series.find((p) => p.t > tPeak && p.C <= eps)?.t ?? null;
  return { series, base, peak, tPeak, auc, back, end: C };
}

/** 四条路 + 不进食探针 */
function mechanisms() {
  const rows = [
    { key: 'baseline', label: '不给药（进餐）', opts: {}, note: '肠道按 ka 吸收，肝输出与外周处置为基线' },
    { key: 'delay', label: '延缓吸收（α-葡萄糖苷酶抑制药）', opts: { ka: MODEL.ka / 4 }, note: '同一份糖，进得更慢' },
    { key: 'secrete', label: '促泌 / 补充胰岛素', opts: { k: MODEL.k * 1.6 }, note: '处置更快，与肠道无关' },
    { key: 'liver', label: '减少肝糖输出（双胍类）', opts: { E: MODEL.E / 2 }, note: '地板被压低，糖本身没变' },
  ].map((r) => ({ ...r, run: runCurve(r.opts) }));
  return rows;
}

/** 不进食时的两种探针：促泌剂把血糖压到基线以下；延缓吸收药无事可做 */
function fastingProbe() {
  const fast = (o) => runCurve({ meal: 0, horizon: 4, ...o });
  return {
    none: fast({}),
    delay: fast({ ka: MODEL.ka / 4 }),
    secrete: fast({ k: MODEL.k * 1.6 }),
  };
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
  const links = linkTable(chap);
  const risk = riskTable(chap);
  const mech = mechanisms();
  const probe = fastingProbe();
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 降血糖药（药理学 第36章）═══');
  console.log(`教材规模: 第36章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log('环节词落点（全章次数 / 逐小节）：');
  for (const l of links) console.log(`  ${l.word} ${l.total} 次 · ${l.per.map((p) => `${p.sub}(${p.hits})`).join(' ')}`);
  console.log('');
  console.log('不良反应与观察侧词表：');
  for (const r of risk) console.log(`  ${r.word} ${r.total} 次 · ${r.per.map((p) => `${p.sub}(${p.hits})`).join(' ')}`);
  console.log('');
  console.log('餐后曲线的三条签名（峰 / 达峰 / 增量面积，归一化教学量）：');
  for (const m of mech) {
    console.log(`  ${m.label}: 峰 ${m.run.peak.toFixed(3)} · 达峰 ${m.run.tPeak.toFixed(2)} · 增量面积 ${m.run.auc.toFixed(3)} · 起点 ${m.run.base.toFixed(2)}`);
  }
  const b = mech[0].run;
  for (const m of mech.slice(1)) {
    console.log(`  → ${m.key}: 峰 ${((m.run.peak / b.peak) * 100).toFixed(0)}% · 达峰 ${((m.run.tPeak / b.tPeak) * 100).toFixed(0)}% · 增量面积 ${((m.run.auc / b.auc) * 100).toFixed(0)}%`);
  }
  console.log('');
  console.log('不进食探针（起点与稳态，归一化）：');
  console.log(`  不给药: 起点 ${probe.none.base.toFixed(2)} → 末态 ${probe.none.end.toFixed(2)}`);
  console.log(`  延缓吸收: 起点 ${probe.delay.base.toFixed(2)} → 末态 ${probe.delay.end.toFixed(2)}（无糖可延缓，什么都不发生）`);
  console.log(`  促泌: 起点 ${probe.secrete.base.toFixed(2)} → 末态 ${probe.secrete.end.toFixed(2)}（无糖可处置，压到基线以下）`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((x) => x.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明降血糖药的分类/作用/机制/体内过程/不良反应类别与表述口径，不写剂量与浓度与检验数值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, links, risk, mechanisms: mech, probe, values, briefs, extremes: ext };
}

if (require.main === module) main();

module.exports = {
  ROOT, FILE, CHAPTER, MODEL, LINKS, RISK, VALUE_RE,
  load, chapterOf, subsOf, hanzi, shape, sectionStats, keywordHits,
  linkTable, riskTable, runCurve, mechanisms, fastingProbe,
  valueAudit, briefAudit, extremes, main,
};
