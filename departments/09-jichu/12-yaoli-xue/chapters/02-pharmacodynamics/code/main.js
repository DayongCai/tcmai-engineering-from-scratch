#!/usr/bin/env node
/**
 * 药理学 · 第 2 章 药物效应动力学——药效学
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/02-pharmacodynamics/docs/zh.md
 * 出处: 教材·药理学·第2章（2.1–2.4，12 个小节）
 * 数据: standards/yaoli/底本.json（chapters 中 no=2；subs[].brief 是写作约束句，subs[].body 才是正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 这一章要讲的两件事，本程序各做一次核验，而不是抄结论：
 *
 *   一、12 个小节按「作用规律 / 机制 / 受体 / 表述与观察」四组归类，现算汉字比重。
 *       教材把 4 节 × 3 小节写成了几乎等重的四块 —— 这说明四块是并列的前提，
 *       不是「概念打底、后面展开」的从属关系。比重是数出来的，不是读出来的。
 *
 *   二、S 型量效曲线的「半最大效应对应的剂量位置」用有限差分求，不靠解析式代入。
 *       做法：把 Hill 曲线写成对数剂量 u = ln C 的函数，用中心差分算 dE/du，
 *       再用三分法找 dE/du 最大的位置 —— 也就是曲线最陡处。
 *       然后另用二分法解 E = Emax/2，得到半最大位置。
 *       两条路互不相干，若结果重合，说明「效价强度可以从曲线最陡处读出来」
 *       这一说法在单一 S 型曲线上成立；再用两相曲线跑一遍，说明它在哪里不成立。
 *       竞争性拮抗与非竞争性拮抗也在这里被区分：前者移动峰值位置，
 *       后者只压低峰值高度 —— 这是有限差分能看出来的差别，光看曲线「右移/下移」看不出机制。
 *
 * 正文不写量值：本文件的输出里有小数，是为了自证计算过程；docs 只引用其中的结构结论。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/09-jichu/12-yaoli-xue/chapters/02-pharmacodynamics/code
// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 standards/yaoli 的那一级
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'yaoli', '底本.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/yaoli/底本.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const BASE = path.join(ROOT, 'standards', 'yaoli', '底本.json');
const CHAPTER = 2;

const load = () => JSON.parse(fs.readFileSync(BASE, 'utf8'));

/** 本章对象 */
function chapterOf(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

/** 本章 12 个小节，扁平化后按小节号排序 */
function subsOf(chap) {
  const out = [];
  for (const sec of chap.secs) {
    for (const u of sec.subs) out.push({ ...u, sec: sec.no, secTitle: sec.title });
  }
  return out.sort((a, b) => a.no.localeCompare(b.no, 'en'));
}

const hanzi = (s) => (s || '').replace(/[^\u4e00-\u9fa5]/g, '').length;

/** 规模：节数 / 小节数 / 汉字数。汉字数是现算的，不采信任何声明值 */
function shape(chap) {
  const list = subsOf(chap);
  return {
    secs: chap.secs.length,
    subs: list.length,
    hanzi: list.reduce((n, u) => n + hanzi(u.body), 0),
    perSub: Math.round(list.reduce((n, u) => n + hanzi(u.body), 0) / list.length),
  };
}

/**
 * 四组归类：按节归属，不按标题猜。
 * 为什么按节而不按关键词：2.2.1 的标题叫「受体途径」，讲的是机制的一支；
 * 2.3.1 讲受体概念，落在受体组。标题会让关键词法把两者搅在一起 ——
 * 下面 keywordMix() 会把这处交叉算出来给人看。
 */
const GROUPS = [
  { key: '作用规律', sec: '2.1' },
  { key: '机制', sec: '2.2' },
  { key: '受体', sec: '2.3' },
  { key: '表述与观察', sec: '2.4' },
];

function groupOf(secNo) {
  const g = GROUPS.find((x) => x.sec === secNo);
  return g ? g.key : '（未归类）';
}

/** 每组几个小节、多少汉字、在三组内占多少 */
function groups(chap) {
  const list = subsOf(chap);
  const out = GROUPS.map((g) => {
    const mine = list.filter((u) => u.sec === g.sec);
    return {
      key: g.key,
      sec: g.sec,
      secTitle: chap.secs.find((s) => s.no === g.sec).title,
      subs: mine.map((u) => u.no),
      hanzi: mine.reduce((n, u) => n + hanzi(u.body), 0),
    };
  });
  const three = out.filter((g) => g.sec !== '2.4');
  const threeTotal = three.reduce((n, g) => n + g.hanzi, 0);
  for (const g of out) g.shareOfThree = g.sec === '2.4' ? null : g.hanzi / threeTotal;
  return { all: out, three, threeTotal };
}

/** 关键词分布：看不见的比重，看得见的用词 */
const KEYWORDS = ['受体', '机制', '剂量', '观察'];

function keywordMix(chap) {
  return subsOf(chap).map((u) => {
    const row = { no: u.no, title: u.title, group: groupOf(u.sec) };
    for (const k of KEYWORDS) {
      row[k] = (u.body || '').split(k).length - 1;
    }
    return row;
  });
}

/**
 * 标题与归类交叉的小节：标题里带某组的关键词，归属却在另一组。
 * 这一处不是错误，是分类的依据不同 —— 名字按「作用于谁」起，归类按「讲什么」定。
 */
function titleCrossing(chap) {
  const NAME = { 受体: '受体', 机制: '机制', 通道: '机制', 酶: '机制' };
  const out = [];
  for (const u of subsOf(chap)) {
    for (const [word, nameGroup] of Object.entries(NAME)) {
      if (u.title.includes(word) && groupOf(u.sec) !== nameGroup) {
        out.push({ no: u.no, title: u.title, nameGroup, group: groupOf(u.sec) });
      }
    }
  }
  return out;
}

// ─────────────────────────── 量效曲线：有限差分 ───────────────────────────

/**
 * Hill 曲线，按对数剂量取值归一化：C50 = 1、Emax = 1。
 * 归一化只影响横轴的刻度，不影响任何比值 —— 本章关心的全是比值（是否右移、是否压低）。
 */
const CURVE = { emax: 1, c50: 1 };

/** E(C) = Emax · (C/C50)^n / (1 + (C/C50)^n) */
function hillAt(c, p) {
  const xn = Math.pow(c / p.c50, p.n);
  return (p.emax * xn) / (1 + xn);
}

/** dE/d(lnC)，中心差分。步长取 1e-5：再小就被双精度的舍入噪声吃掉 */
function slopeAt(u, p, h = 1e-5) {
  return (hillAt(Math.exp(u + h), p) - hillAt(Math.exp(u - h), p)) / (2 * h);
}

/** 三分法找 dE/d(lnC) 的最大点：曲线最陡处。区间在对数尺度上对称展开 */
function peakByDifference(p, span = 14) {
  let lo = Math.log(p.c50) - span;
  let hi = Math.log(p.c50) + span;
  for (let i = 0; i < 400 && hi - lo > 1e-13; i += 1) {
    const a = lo + (hi - lo) / 3;
    const b = hi - (hi - lo) / 3;
    if (slopeAt(a, p) < slopeAt(b, p)) lo = a;
    else hi = b;
  }
  const u = (lo + hi) / 2;
  return { logDose: u, dose: Math.exp(u), slope: slopeAt(u, p) };
}

/** 二分法解 E(C) = Emax/2：半最大效应对应的剂量位置 */
function halfMaxDose(p) {
  let lo = Math.log(p.c50) - 40;
  let hi = Math.log(p.c50) + 40;
  for (let i = 0; i < 300; i += 1) {
    const mid = (lo + hi) / 2;
    if (hillAt(Math.exp(mid), p) < p.emax / 2) lo = mid;
    else hi = mid;
  }
  return Math.exp((lo + hi) / 2);
}

/** 斜率取一组：0.5 平缓、1 常用、2 与 4 陡峭。教材不给数值，这里给的是形状 */
const SLOPES = [0.5, 1, 1.5, 2, 4];

function slopeSweep() {
  return SLOPES.map((n) => {
    const p = { ...CURVE, n };
    const peak = peakByDifference(p);
    const half = halfMaxDose(p);
    return {
      n,
      peakDose: peak.dose,
      peakSlope: peak.slope,
      halfDose: half,
      // 两条互不相干的路：三分法找最陡处 vs 二分法解半最大
      logGap: Math.abs(peak.logDose - Math.log(half)),
      // 峰值斜率与解析值 Emax·n/4 的比（理论上是 1）
      slopeVsAnalytic: peak.slope / (p.emax * n / 4),
    };
  });
}

/**
 * 竞争性拮抗：表观 C50 抬高 (1 + I/Ki)，曲线右移而峰值不变。
 * 非竞争性拮抗：峰值压低而位置不动。
 * 两者都用有限差分重新定位峰值，看的是「峰值位置动没动」。
 */
function antagonism(iOverKi = 3) {
  const n = 1;
  const base = { ...CURVE, n };
  const basePeak = peakByDifference(base);

  const comp = { ...CURVE, n, c50: CURVE.c50 * (1 + iOverKi) };
  const compPeak = peakByDifference(comp);

  const noncomp = { ...CURVE, n, emax: CURVE.emax * (1 / (1 + iOverKi)) };
  const noncompPeak = peakByDifference(noncomp);

  return {
    iOverKi,
    expectedShift: 1 + iOverKi,
    basePeak,
    compPeak,
    noncompPeak,
    shiftByDifference: compPeak.dose / basePeak.dose,
    heightByDifference: noncompPeak.slope / basePeak.slope,
    positionRatioNoncomp: noncompPeak.dose / basePeak.dose,
    noncompEmax: noncomp.emax,
  };
}

/**
 * 边界案例：两相曲线（两个结合位点，C50 相隔两个数量级）。
 * 这种曲线不对称，最陡处不再等于半最大处 —— 上一节的等同只在单一 S 型上成立。
 */
function twoPhase(span = 14) {
  const parts = [
    { w: 0.6, p: { emax: 1, c50: 1, n: 2 } },
    { w: 0.4, p: { emax: 1, c50: 100, n: 2 } },
  ];
  const E = (c) => parts.reduce((s, q) => s + q.w * hillAt(c, q.p), 0);
  const dE = (u, h = 1e-5) => (E(Math.exp(u + h)) - E(Math.exp(u - h))) / (2 * h);

  let lo = Math.log(0.01) - span;
  let hi = Math.log(100) + span;
  for (let i = 0; i < 400 && hi - lo > 1e-13; i += 1) {
    const a = lo + (hi - lo) / 3;
    const b = hi - (hi - lo) / 3;
    if (dE(a) < dE(b)) lo = a;
    else hi = b;
  }
  const steepest = Math.exp((lo + hi) / 2);

  // 半最大：曲线两端为 0 与 1（权重和为 1），解 E = 0.5
  let a = Math.log(1e-6);
  let b = Math.log(1e6);
  for (let i = 0; i < 300; i += 1) {
    const mid = (a + b) / 2;
    if (E(Math.exp(mid)) < 0.5) a = mid;
    else b = mid;
  }
  const half = Math.exp((a + b) / 2);

  return { steepest, half, logGap: Math.abs(Math.log(steepest) - Math.log(half)) };
}

// ─────────────────────────── 主程序 ───────────────────────────

const pct = (x) => (x * 100).toFixed(1);

function main() {
  const base = load();
  const chap = chapterOf(base);
  const s = shape(chap);
  const g = groups(chap);
  const mix = keywordMix(chap);
  const cross = titleCrossing(chap);

  console.log('═══ 药效学：作用规律 / 机制 / 受体 / 表述边界（药理学 第2章）═══');
  console.log(`底本规模: 第${chap.no}章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${s.perSub} 字`);
  console.log(`底本量值: 本章 valueLike = ${chap.counts.valueLike}（全书 ${base.counts.valueLike} 处）`);
  console.log('');

  console.log('四组归类（按节归属，共 12 小节）：');
  for (const x of g.all) {
    const share = x.shareOfThree === null ? '不计入三组' : `占三组 ${pct(x.shareOfThree)}%`;
    console.log(`  ${x.key.padEnd(5, '　')} · ${x.sec} ${x.secTitle} · ${x.subs.length} 小节 · ${x.hanzi} 字 · ${share}`);
    console.log(`           ${x.subs.join(' ')}`);
  }
  console.log(`  → 三组合计 ${g.threeTotal} 字；四节几乎等重，说明它们是并列的前提，不是「概念打底、后面展开」的从属关系。`);
  console.log('');

  console.log(`关键词分布（每小节出现次数：${KEYWORDS.join(' / ')}）：`);
  for (const r of mix) {
    console.log(`  ${r.no} ${r.title.padEnd(12, '　')} ${r.group.padEnd(5, '　')} ` +
      KEYWORDS.map((k) => `${k} ${String(r[k]).padStart(2)}`).join(' · '));
  }
  console.log('');
  if (cross.length) {
    console.log('标题与归类的交叉（名字按「作用于谁」起，归类按「讲什么」定）：');
    for (const c of cross) {
      console.log(`  ${c.no}「${c.title}」标题指向${c.nameGroup}组，归属却是${c.group}组`);
    }
    console.log('  → 所以四组只能按节归属：按标题归类，2.2.1 会被算进受体组。');
    console.log('');
  }

  console.log('S 型量效曲线：半最大位置用两种互不相干的办法各求一次（对数剂量尺度）');
  console.log('  ① 三分法找 dE/d(lnC) 的最大点 —— 曲线最陡处');
  console.log('  ② 二分法解 E = Emax/2');
  for (const r of slopeSweep()) {
    console.log(`  斜率 n=${String(r.n).padEnd(3)} 最陡处/半最大处 = ${r.peakDose.toFixed(6)}/${r.halfDose.toFixed(6)}` +
      ` · 对数差 ${r.logGap.toExponential(1)}` +
      ` · 峰值斜率 实测/解析 = ${r.slopeVsAnalytic.toFixed(6)}`);
  }
  console.log('  → 两条路重合：单一 S 型曲线上，效价强度可以从最陡处读出来，不必先知道 Max。');
  console.log('');

  const a = antagonism(3);
  console.log('两类拮抗在峰值上的差别（有限差分定位，斜率取 1）：');
  console.log(`  竞争性   : 峰值位置移动 ${a.shiftByDifference.toFixed(6)} 倍（表观 C50 抬高 ${a.expectedShift.toFixed(6)} 倍）· 峰值高度比 1`);
  console.log(`  非竞争性 : 峰值位置移动 ${a.positionRatioNoncomp.toFixed(6)} 倍 · 峰值高度比 ${a.heightByDifference.toFixed(6)}（Emax 压到 ${a.noncompEmax.toFixed(4)}）`);
  console.log('  → 位置动 = 效价改变；高度动 = 效能改变。曲线「右移」与「下移」是两件事，机制不同。');
  console.log('');

  const t = twoPhase();
  console.log('边界案例：两相曲线（两个结合位点，C50 相隔两个数量级）');
  console.log(`  最陡处 ${t.steepest.toFixed(4)} · 半最大处 ${t.half.toFixed(4)} · 对数差 ${t.logGap.toFixed(4)}`);
  console.log('  → 曲线不对称时两者分开：「最陡处即半最大处」只在单一 S 型上成立，不当作通则。');
  console.log('');

  console.log('教学边界：本章只说明药物作用与效应的类别、受体与非受体两条机制、量效关系的参数含义与表述边界，剂量与用法照底本引用，不写非引文行的量值，不作疗效与优越性断言，不构成用药建议');

  return { chap, shape: s, groups: g, mix, cross, sweep: slopeSweep(), ant: a, two: t };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  BASE,
  CHAPTER,
  GROUPS,
  KEYWORDS,
  SLOPES,
  CURVE,
  load,
  chapterOf,
  subsOf,
  hanzi,
  shape,
  groupOf,
  groups,
  keywordMix,
  titleCrossing,
  hillAt,
  slopeAt,
  peakByDifference,
  halfMaxDose,
  slopeSweep,
  antagonism,
  twoPhase,
  main,
};
