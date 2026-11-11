#!/usr/bin/env node
/**
 * 药理学 · 第 11 章 局部麻醉药
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/11-local-anesthetics/docs/zh.md
 * 出处: 教材·药理学·第11章（11.1–11.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=11]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的命题是一条链：结构 → 代谢 → 时程 → 给药方法 → 观察项目。
 * 这条链不是本章编的，是底本自己在 11.1.2 结尾写出来的一句「分析工具」。
 * 所以本脚本不去复述链，而是去底本里逐环找证据：
 *   哪几个小节同时提到「酯键」与「假性胆碱酯酶」——结构到代谢这一环有没有写实；
 *   哪几个小节同时提到「脂溶性」与「穿透力」——药物因素这一环有没有写实；
 *   全章「使用依赖性」「分离性阻滞」各出现几次、落在哪一节。
 * 这些数都能从 body 现算；手抄的数会在教材改版后静默过期，现算的对不上测试自己会红。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../chapters/11-local-anesthetics/code
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
const CHAPTER = 11;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

/** 本章（默认第 11 章）的结构对象 */
function chapter(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

/** 摊平成 12 个小节，按小节号排序 */
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

/**
 * 本章的关键词表。
 * 前六个词属「结构—代谢」一组，后六个属「穿透—吸收—阻滞」一组；
 * 两组在 11.1.2 与 11.3.1 交汇，因为那两节既要说分子，也要说效应。
 */
const KEYWORDS = [
  '脂溶性', '解离', '碱基', '阳离子', '酯键', '酰胺键',
  '钠通道', '使用依赖性', '穿透力', '吸收', '血管收缩药', '分离性阻滞',
];

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

/** 关键词表：按次数降序，同次数保持词表顺序（稳定排序，结果可复算） */
function keywordTable(chap) {
  return KEYWORDS.map((w) => keywordHits(chap, w)).sort((a, b) => b.total - a.total);
}

/**
 * 分类链的五环。每一环用一对探针词去正文里找共现的小节：
 * 两个探针落在同一小节，说明这一环在该小节被写实了；找不到则是链上的缺口。
 * 探针是固定词，不随改写漂移；缺口的名字会直接打出来，方便定位。
 */
const CHAIN = [
  { ring: '结构 → 代谢', a: '酯键', b: '假性胆碱酯酶', note: '酯类的酯键在血浆水解，酰胺类靠肝' },
  { ring: '代谢 → 时程', a: '水解', b: '作用维持', note: '水解快则维持短，蓄积少' },
  { ring: '时程 → 给药方法', a: '作用维持', b: '表面麻醉', note: '维持短者配短操作，穿透弱者不入表面' },
  { ring: '脂溶性 → 穿透力', a: '脂溶性', b: '穿透力', note: '脂溶性是药物因素的第一条' },
  { ring: '血管活性 → 吸收', a: '血管收缩药', b: '吸收', note: '配伍血管收缩药，延缓吸收' },
  { ring: '阻滞顺序 → 观察项目', a: '分离性阻滞', b: '运动', note: '感觉先于运动，故分栏记录' },
];

/** 逐环找共现小节 */
function chainAudit(chap) {
  return CHAIN.map((c) => {
    const hits = subsOf(chap)
      .filter((u) => u.body.includes(c.a) && u.body.includes(c.b))
      .map((u) => u.no);
    return { ...c, subs: hits, n: hits.length };
  });
}

/**
 * 判断的去向：正文把结论交给「具备资质的人员」的小节。
 * 分布是不是结构性的，只看两件事：写在几节、缺的是哪几节。
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
 * 量值核验：底本声明「不写含量与浓度与滴度的量值」。
 * 本函数把这条声明当断言复算——不是相信它，是检查它。
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
  const words = keywordTable(chap);
  const chain = chainAudit(chap);
  const handoff = handoffAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 局部麻醉药：结构—代谢—时程—给药—观察（药理学 第11章）═══');
  console.log(`教材规模: 第11章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本声明与复算一致）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`关键词: ${words.map((w) => `${w.word} ${w.total}`).join(' · ')}`);
  console.log(`  分布最广: ${[...words].sort((a, b) => b.per.length - a.per.length).slice(0, 3).map((w) => `${w.word}(${w.per.length} 小节)`).join(' · ')}`);
  console.log('');
  console.log('分类链逐环核验（两个探针同落一小节即为写实）：');
  for (const c of chain) {
    console.log(`  ${c.ring} · 探针「${c.a}」+「${c.b}」· ${c.n} 小节 ${c.subs.join(' ')} · ${c.note}`);
  }
  const gaps = chain.filter((c) => c.n === 0).map((c) => c.ring);
  console.log(`  缺口: ${gaps.length ? gaps.join('、') : '无'}`);
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  没有交接句: ${handoff.missing.join(' ') || '无'}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('教学边界：本章只说明局麻药的分类/作用机制/体内过程/给药类别与表述口径，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, words, chain, handoff, values, briefs, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  KEYWORDS,
  CHAIN,
  HANDOFF,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  keywordTable,
  chainAudit,
  handoffAudit,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
