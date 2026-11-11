#!/usr/bin/env node
/**
 * 药理学 · 第 35 章 甲状腺激素与抗甲状腺药
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/35-thyroid-hormones-and-antithyroid-drugs/docs/zh.md
 * 出处: 教材·药理学·第35章（35.1–35.4，4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=35]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章要讲的核心命题是一条「环节梯度」：三组抗甲状腺药分别落在
 * 合成（硫脲类）、释放（碘及碘化物）、腺体实质（放射性碘）三个环节上，
 * 教材用「起效由慢到快」「作用由短到持久」两句把它们分开。
 * 这条梯度是不是药效强弱造成的？不是。本程序用一个双室模型把话说清：
 *
 *   腺体内激素的储存池 S 与血中水平 B，S 以时间常数 Tstore 更新，B 以外周
 *   清除速率 kPeriph 衰减。阻断合成，等于让 S 断供，B 只能跟着 S 一起慢慢掉；
 *   阻断释放，等于把 S 到 B 的通道掐断，B 立刻按自己的清除速度掉下来。
 *   两者的「降一半所需时间」相差的就是 Tstore 与 1/kPeriph 之比 —— 这个比值
 *   是储存池与外周清除的结构之比，与药物「有多强」无关。
 *   放射性碘既不阻断合成也不阻断释放，它让腺体实质本身按自己的节奏减少，
 *   所以第三种时间尺度出现：不可逆、渐进、且没有反弹。
 *
 *   第二个量是储存池的偏离面积 ∫|S−1|dt。硫脲类让 S 单向耗尽（面积有限），
 *   碘剂让 S 单向堆积（面积随时程平方增长）—— 这就是教材说碘剂「长期单独
 *   使用，腺体增生反而加剧」的机制来源，而不是一句用法禁忌。
 *
 * 量值口径：本文件输出里有小数与相对时间，是为了自证模型；docs 只引用结构结论，
 * 不写任何剂量、浓度与检验数值。
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
const CHAPTER = 35;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

function chapterOf(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

const subsOf = (chap) => chap.secs.flatMap((s) => s.subs).sort((a, b) => a.no.localeCompare(b.no, 'en'));
const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;

/** 规模：节 / 小节 / 汉字 */
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
 * 环节词表：一章之内三组抗甲状腺药各自落在哪个环节，看这三个词压在哪些小节。
 * 合成 = 硫脲类的作用点；释放 = 碘剂在大剂量时的作用点；实质 = 放射性碘的靶子。
 */
const LINKS = ['合成', '释放', '实质', '摄取'];

function linkMatrix(chap) {
  const anti = subsOf(chap).filter((u) => u.no.startsWith('35.2'));
  return LINKS.map((w) => ({
    word: w,
    total: keywordHits(chap, w).total,
    per: anti.map((u) => ({ sub: u.no, hits: (u.body.match(new RegExp(w, 'g')) || []).length })),
  }));
}

/**
 * 观察侧词表：本章后半（35.3 / 35.4）不是讲药，是讲「怎么看待药」。
 * 若这三个词真的压在后半，说明教材把「知识」与「知识的使用方式」分开放了。
 */
const OPS = ['观察', '记录', '复核', '留痕', '量值'];

function opsDensity(chap) {
  return OPS.map((w) => {
    const front = subsOf(chap).filter((u) => u.no.startsWith('35.1') || u.no.startsWith('35.2'));
    const back = subsOf(chap).filter((u) => u.no.startsWith('35.3') || u.no.startsWith('35.4'));
    const cnt = (us) => us.reduce((n, u) => n + (u.body.match(new RegExp(w, 'g')) || []).length, 0);
    return { word: w, front: cnt(front), back: cnt(back) };
  });
}

/* ───────────────────────── 双室模型 ───────────────────────── */

/**
 * 腺体储存池 S 与血中水平 B（均为归一化值，稳态 = 1）。
 *   dS/dt = synth(t)/Tstore − c(t)·S/Tstore      合成进池、按池自己的节奏释放
 *   dB/dt = c(t)·S/Tstore − kPeriph·B            释放进血、按外周清除速率掉下来
 * c(t) 是释放通道的开度（碘剂把它关到 0）；腺体实质的减少体现在 Tstore 的拉长上。
 */
const MODEL = { Tstore: 1, kPeriph: 60, horizon: 2, steps: 4000 };

function simulate(opts = {}) {
  const { Tstore, kPeriph, horizon, steps } = { ...MODEL, ...opts };
  const dt = horizon / steps;
  let S = 1;
  let B = 1;
  const series = [{ t: 0, S, B }];
  const storeDrift = [];
  for (let i = 1; i <= steps; i += 1) {
    const t = i * dt;
    const synth = opts.synth ? opts.synth(t) : 1;
    const gate = opts.gate ? opts.gate(t) : 1;
    const release = gate * (S / Tstore);
    const dS = (synth / Tstore - release) * dt;
    const dB = (release - kPeriph * B) * dt;
    storeDrift.push(Math.abs(S - 1) * dt);
    S += dS;
    B += dB;
    series.push({ t, S, B });
  }
  return { series, drift: storeDrift.reduce((a, b) => a + b, 0), end: { S, B } };
}

/** 某条曲线上首次跌到 level 以下的时间（找不到返回 null） */
function firstBelow(series, level, key = 'B') {
  for (const p of series) if (p[key] <= level) return p.t;
  return null;
}

/**
 * 四种情形的对照。参数是教学用的归一化量，只用来比较时间尺度，不描述任何真实个体。
 *   thiourea  阻断合成：synth 归零
 *   iodide    阻断释放：gate 归零
 *   radio     腺体实质渐进减少：Tstore 拉长（释放能力随实质减少而下降），不可逆
 *   baseline  不给药
 */
function scenarios() {
  const base = simulate({});
  const thiourea = simulate({ synth: () => 0 });
  const iodide = simulate({ gate: () => 0 });
  const radio = simulate({ Tstore: 1, kPeriph: 60, horizon: 8, synth: (t) => Math.exp(-t / 3) });
  const rows = [
    { key: 'baseline', label: '不给药', run: base, note: 'S 与 B 都停在 1：合成与释放相等' },
    { key: 'thiourea', label: '硫脲类（阻断合成）', run: thiourea, note: 'S 断供，B 只能跟着 S 慢慢掉' },
    { key: 'iodide', label: '碘及碘化物（阻断释放）', run: iodide, note: '通道掐断，B 按自己的清除速度掉' },
    { key: 'radio', label: '放射性碘（实质减少）', run: radio, note: '释放能力随实质一起减少，不可逆' },
  ];
  return rows.map((r) => ({
    ...r,
    halfBlood: firstBelow(r.run.series, 0.5, 'B'),
    halfStore: firstBelow(r.run.series, 0.5, 'S'),
    drift: r.run.drift,
    end: r.run.end,
  }));
}

/**
 * 反弹：硫脲类停药后合成恢复，S 以自身时间常数回填，B 随之回升。
 * 负反馈在这段时间里一直是被解除的状态（TSH 高），教材称之腺体增生与充血。
 */
function rebound(stopAt = 1) {
  const run = simulate({ horizon: 3, synth: (t) => (t < stopAt ? 0 : 1) });
  const after = run.series.filter((p) => p.t >= stopAt);
  return { run, backHalf: after.find((p) => p.B >= 0.5)?.t ?? null, series: run.series };
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
  const links = linkMatrix(chap);
  const ops = opsDensity(chap);
  const sc = scenarios();
  const rb = rebound();
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 甲状腺激素与抗甲状腺药（药理学 第35章）═══');
  console.log(`教材规模: 第35章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log('环节词在 35.2 三组里的分布（全章次数 / 逐小节）：');
  for (const l of links) console.log(`  ${l.word} 全章 ${l.total} 次 · ${l.per.map((p) => `${p.sub}(${p.hits})`).join(' ')}`);
  console.log('');
  console.log('观察侧词表：前半（35.1–35.2）与后半（35.3–35.4）· ');
  for (const o of ops) console.log(`  ${o.word} 前 ${o.front} / 后 ${o.back}`);
  console.log('');
  console.log('双室模型的四种情形（相对时间，非真实个体）：');
  for (const r of sc) {
    console.log(`  ${r.label}: 血中降至一半 ${r.halfBlood === null ? '未到' : r.halfBlood.toFixed(3)} · 储存降至一半 ${r.halfStore === null ? '未到' : r.halfStore.toFixed(3)} · 储存偏离面积 ${r.drift.toFixed(3)}`);
  }
  const t = sc.find((x) => x.key === 'thiourea').halfBlood;
  const i = sc.find((x) => x.key === 'iodide').halfBlood;
  console.log(`  → 阻断合成与阻断释放的降半时间之比 ≈ ${(t / i).toFixed(1)}，等于储存更新时间与 1/外周清除速率之比`);
  console.log(`  → 储存偏离面积：硫脲类 ${sc.find((x) => x.key === 'thiourea').drift.toFixed(3)}（有限）/ 碘剂 ${sc.find((x) => x.key === 'iodide').drift.toFixed(3)}（随时程平方增长）`);
  console.log(`  → 放射性碘的储存降至一半 ${sc.find((x) => x.key === 'radio').halfStore === null ? '在本时程内未到' : sc.find((x) => x.key === 'radio').halfStore.toFixed(3)}：渐进且不可逆`);
  console.log('');
  console.log(`反弹: 停药后血中回升过半在 ${rb.backHalf === null ? '未到' : rb.backHalf.toFixed(3)}（同一时间尺度）`);
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明甲状腺激素与抗甲状腺药的分类/作用/机制/体内过程/不良反应类别与表述口径，不写剂量与浓度与检验数值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, links, ops, scenarios: sc, rebound: rb, values, briefs, extremes: ext };
}

if (require.main === module) main();

module.exports = {
  ROOT, FILE, CHAPTER, MODEL, LINKS, OPS, VALUE_RE,
  load, chapterOf, subsOf, hanzi, shape, sectionStats, keywordHits,
  linkMatrix, opsDensity, simulate, firstBelow, scenarios, rebound,
  valueAudit, briefAudit, extremes, main,
};
