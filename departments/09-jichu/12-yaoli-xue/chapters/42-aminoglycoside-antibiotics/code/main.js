#!/usr/bin/env node
/**
 * 药理学 · 第 42 章 氨基糖苷类抗生素：转运决定谱，蓄积决定毒性
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/42-aminoglycoside-antibiotics/docs/zh.md
 * 出处: 教材·药理学·第42章（42.1–42.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=42]）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「三条线贯通——结构决定转运，
 * 转运决定谱，蓄积决定毒性」。这条命题能否站住，要看教材是否真的
 * 把「转运」「耳毒性」「肾毒性」写成贯穿多数小节的高频词。
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
const CHAPTER = 42;

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
 * 词表分两组，对应本章的两条推理线。
 * 「机制组」：核糖体（靶位）与转运（谱的边界）。
 * 「毒性组」：耳毒性、肾毒性、耐药——三条各自成段，且互相牵制。
 */
const PARAMS = [
  { key: '核糖体', group: '机制组' },
  { key: '转运', group: '机制组' },
  { key: '耳毒性', group: '毒性组' },
  { key: '肾毒性', group: '毒性组' },
  { key: '耐药', group: '机制组' },
  { key: '氨基糖苷', group: '类别组' },
];

function paramCounts(chap) {
  return PARAMS.map((p) => ({ ...p, ...keywordHits(chap, p.key) }))
    .map((p) => ({ key: p.key, group: p.group, total: p.total, per: p.per }))
    .sort((a, b) => b.total - a.total);
}

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

/** 四节的推理分工：两支点（机制 / 耐药）+ 毒性 + 文书 */
const CLASSES = [
  { name: '概况：来源分类与两条支点', prefix: '42.1' },
  { name: '常用品种类别', prefix: '42.2' },
  { name: '不良反应与用药观察', prefix: '42.3' },
  { name: '观察与表述要求', prefix: '42.4' },
];

function classShape(subs) {
  return CLASSES.map((c) => ({
    name: c.name,
    subs: subs.filter((u) => u.no.startsWith(`${c.prefix}.`)).length,
  }));
}

const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』""'']/g, '');

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

  console.log('═══ 氨基糖苷类抗生素：转运决定谱，蓄积决定毒性（药理学 第42章）═══');
  console.log(`教材规模: 第42章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本带剂量，故本章走 B 支）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`四节的推理分工: ${classes.map((c) => `${c.name} ${c.subs}`).join(' · ')}`);
  console.log('  → 两支点（机制与耐药）立在前，毒性居中，文书在后：一条线走到底。');
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`词频: ${params.map((p) => `${p.key} ${p.total}`).join(' · ')}`);
  console.log('  → 「核糖体」管靶位，「转运」管谱的边界；「耳毒性」「肾毒性」管观察的两个窗口。');
  console.log(`  分布最广的词: ${params[0].key}，覆盖 ${params[0].per.length} 个小节`);
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  没有交接句: ${handoff.missing.join(' ') || '无'}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明氨基糖苷类的来源分类/转运机制/耐药通路与不良反应类别与观察要求，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, params, handoff, values, briefs, extremes: ext, classes };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  PARAMS,
  CLASSES,
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
  quoteAudit,
  main,
};
