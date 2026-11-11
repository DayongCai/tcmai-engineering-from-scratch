#!/usr/bin/env node
/**
 * 药理学 · 第 47 章 抗恶性肿瘤药：选择性只有相对，毒性是作用的延伸
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/47-anticancer-drugs/docs/zh.md
 * 出处: 教材·药理学·第47章（47.1–47.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=47]）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「这一类药物没有绝对选择性，毒性不是意外
 * 而是药理作用的延伸」。命题能否站住，要看教材是否真的把「选择性」「耐药」
 * 「毒性」写成了贯穿多数小节的高频词，以及三条应用原则是否各占一节。
 * 手打的数字会在底本改版后静默过期；现算的数字一旦对不上，测试自己会红。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../chapters/47-anticancer-drugs/code
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
const CHAPTER = 47;
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

/** 本章（默认第 47 章）的结构对象 */
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
 * 词表分三组，对应本章的三条推理线。
 * 「前提组」：选择性 / 增殖——本章的起点是「两类细胞同源，差别只在增殖」。
 * 「机制组」：耐药 / 靶点——机制的另一面就是耐药，两者共用一份结构。
 * 「边界组」：毒性——毒性不是意外，是作用的延伸，落在第 4 节收口。
 */
const PARAMS = [
  { key: '选择性', group: '前提组' },
  { key: '增殖', group: '前提组' },
  { key: '耐药', group: '机制组' },
  { key: '靶点', group: '机制组' },
  { key: '毒性', group: '边界组' },
  { key: '联合', group: '边界组' },
];

/** 词频：按次数降序，同次数保持词表顺序（稳定排序，结果可复算） */
function paramCounts(chap) {
  return PARAMS.map((p) => ({ ...p, ...keywordHits(chap, p.key) }))
    .map((p) => ({ key: p.key, group: p.group, total: p.total, per: p.per }))
    .sort((a, b) => b.total - a.total);
}

/**
 * 判断的去向：正文把结论交给「具备资质的人员」的小节。
 * 这个分布是不是结构性的，只看两件事：写在几节、缺的是哪几节。
 */
const HANDOFF = '具备资质的人员';

function handoffAudit(chap) {
  const subs = subsOf(chap);
  return {
    subs: subs.filter((u) => u.body.includes(HANDOFF)).map((u) => u.no),
    count: subs.reduce((n, u) => n + (u.body.match(new RegExp(HANDOFF, 'g')) || []).length, 0),
    missing: subs.filter((u) => !u.body.includes(HANDOFF)).map((u) => u.no),
    of: subs.length,
  };
}

/**
 * 量值核验：底本对本章声明「不写含量与浓度与滴度的量值」。
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

/** 四节的推理分工：前提（基础）→ 细胞毒 → 非细胞毒 → 三条原则收口 */
const CLASSES = [
  { name: '药理学基础：细胞特点与分类与机制', prefix: '47.1' },
  { name: '细胞毒类三组', prefix: '47.2' },
  { name: '非细胞毒类三组', prefix: '47.3' },
  { name: '应用原则：动力学与机制与毒性', prefix: '47.4' },
];

function classShape(subs) {
  return CLASSES.map((c) => ({
    name: c.name,
    subs: subs.filter((u) => u.no.startsWith(`${c.prefix}.`)).length,
    hanzi: subs.filter((u) => u.no.startsWith(`${c.prefix}.`)).reduce((n, u) => n + hanzi(u.body), 0),
  }));
}

/** 与章门同一套折叠规则：去空白与常见标点后逐字比对 */
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』""'']/g, '');

/** 引文逐字回查：带 locator 的行里的「」引语，逐条回底本 */
function quoteAudit(doc, chap) {
  const pool = subsOf(chap).map((u) => fold(`${u.brief}\n${u.body}`));
  const quotes = [];
  const unresolved = [];
  for (const line of doc.split('\n')) {
    if (!/教材·药理学·第\d+章/.test(line)) continue;
    for (const m of line.matchAll(/「([^」]{6,})」/g)) {
      quotes.push(m[1]);
      if (!pool.some((p) => p.includes(fold(m[1])))) unresolved.push(m[1]);
    }
  }
  return { count: quotes.length, unresolved };
}

/**
 * 课程章的自我对账：规模、12 小节覆盖、四个固定小节、边界句。
 * 这一层与底本无关，只检查 docs/zh.md 自己有没有守住契约。
 */
const REQUIRED = ['十二个小节：逐条落位', '代价与边界', '运行与验证', '免责'];

function docAudit(docPath = DOC, chap) {
  if (!fs.existsSync(docPath)) return { exists: false };
  const doc = fs.readFileSync(docPath, 'utf8');
  const subs = subsOf(chap).map((u) => u.no);
  const q = quoteAudit(doc, chap);
  return {
    exists: true,
    nonWs: doc.replace(/\s/g, '').length,
    missingSubs: subs.filter((s) => !doc.includes(s)),
    missingSections: REQUIRED.filter((k) => !doc.includes(k)),
    quotes: q.count,
    unresolved: q.unresolved,
    hasBoundary: /剂量与用法照底本/.test(doc),
    hasDisclaimer: /不构成用药建议/.test(doc),
    locators: (doc.match(/教材·药理学·第47章·\d+\.\d+\.\d+/g) || []).length,
  };
}

function main() {
  const base = load();
  const chap = chapter(base);
  const subs = subsOf(chap);
  const s = shape(chap);
  const secs = sectionStats(chap);
  const params = paramCounts(chap);
  const handoff = handoffAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);
  const classes = classShape(subs);
  const doc = docAudit(DOC, chap);

  console.log('═══ 抗恶性肿瘤药：选择性只有相对，毒性是作用的延伸（药理学 第47章）═══');
  console.log(`教材规模: 第47章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本带剂量，故本章走 B 支）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`四节的推理分工: ${classes.map((c) => `${c.name} ${c.subs} 小节 · ${c.hanzi} 字`).join('；')}`);
  console.log('  → 前提在前，细胞毒居中，非细胞毒在后，三条原则收口：一条线走到底。');
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`词频: ${params.map((p) => `${p.key} ${p.total}`).join(' · ')}`);
  console.log('  → 「选择性」管前提，「耐药」与「靶点」管机制的两面，「毒性」管观察的边界。');
  console.log(`  分布最广的词: ${params[0].key}，覆盖 ${params[0].per.length} 个小节`);
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  没有交接句: ${handoff.missing.join(' ') || '无'}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  if (doc.exists) {
    console.log(`课程章对账: ${doc.nonWs} 非空白字 · 引文 ${doc.quotes} 条（未回查 ${doc.unresolved.length} 条）· 三级出处 ${doc.locators} 处`);
    console.log(`  未提到的小节: ${doc.missingSubs.join(' ') || '无'} · 缺固定小节: ${doc.missingSections.join(' ') || '无'}`);
  } else {
    console.log('课程章对账: docs/zh.md 尚未落笔');
  }
  console.log('');
  console.log('教学边界：本章只说明抗恶性肿瘤药的分类/药理作用与机制/体内过程要点与不良反应类别与三条应用原则，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, params, handoff, values, briefs, extremes: ext, classes, doc };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  DOC,
  CHAPTER,
  PARAMS,
  CLASSES,
  REQUIRED,
  HANDOFF,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  paramCounts,
  handoffAudit,
  valueAudit,
  briefAudit,
  extremes,
  classShape,
  fold,
  quoteAudit,
  docAudit,
  main,
};
