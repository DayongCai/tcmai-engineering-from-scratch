#!/usr/bin/env node
/**
 * 药理学 · 第 46 章 抗寄生虫药：靶点跟着生活史走，一个阶段一个药
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/46-antiparasitic-drugs/docs/zh.md
 * 出处: 教材·药理学·第46章（46.1–46.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=46]）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「寄生虫的每个发育阶段都是一道门，
 * 药只能站在其中一道门口；于是分类不按化学结构走，按阶段走」。
 * 这条命题能否站住，要看教材是否真的把「红内期」「红外期」「配子体」「童虫」「微丝蚴」
 * 写成分类的坐标，而不是写成一串病名。
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
const CHAPTER = 46;
const TITLE = '抗寄生虫药：靶点跟着生活史走，一个阶段一个药';

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
 * 词表分三组。
 * 「品种组」：青蒿素、甲硝唑、吡喹酮——三种不同虫种、三种不同靶点。
 * 「对象组」：虫体——本章多数叙述的主语不是人，是虫。
 * 「机制组」：耐药、阶段——一个管失败的入口，一个管分类的坐标。
 */
const PARAMS = [
  { key: '青蒿素', group: '品种组' },
  { key: '甲硝唑', group: '品种组' },
  { key: '吡喹酮', group: '品种组' },
  { key: '虫体', group: '对象组' },
  { key: '阶段', group: '机制组' },
  { key: '耐药', group: '机制组' },
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

const CLASSES = [
  { name: '抗疟药', prefix: '46.1' },
  { name: '抗阿米巴病及抗滴虫病药', prefix: '46.2' },
  { name: '抗血吸虫病药与抗丝虫病药', prefix: '46.3' },
  { name: '驱肠蠕虫药', prefix: '46.4' },
];

function classShape(subs) {
  return CLASSES.map((c) => ({ name: c.name, subs: subs.filter((u) => u.no.startsWith(`${c.prefix}.`)).length }));
}

/**
 * 生活史阶段词的落位：疟原虫的四段、血吸虫的童虫、丝虫的微丝蚴。
 * 本章「分类按阶段」这句话的证据就在这里——阶段词出现得越散，说明它越像坐标。
 */
const STAGES = ['红内期', '红外期', '配子体', '童虫', '微丝蚴'];

function stageAudit(chap) {
  return STAGES.map((k) => ({ key: k, ...keywordHits(chap, k) }))
    .map((p) => ({ key: p.key, total: p.total, subs: (p.subs || []).length }));
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
  const stages = stageAudit(chap);

  console.log(`═══ ${TITLE}（药理学 第46章）═══`);
  console.log(`教材规模: 第46章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本带剂量，故本章走 B 支）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`四节的推理分工: ${classes.map((c) => `${c.name} ${c.subs}`).join(' · ')}`);
  console.log('  → 四节按虫种排：疟原虫、阿米巴与滴虫、血吸虫与丝虫、肠蠕虫：一节一种生活史。');
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`词频: ${params.map((p) => `${p.key} ${p.total}`).join(' · ')}`);
  console.log('  → 三个品种各守一种虫，「虫体」是本章的主语，「阶段」是分类的坐标。');
  console.log(`  分布最广的词: ${params[0].key}，覆盖 ${params[0].per.length} 个小节`);
  console.log('');
  console.log(`阶段词落位: ${stages.map((p) => `${p.key} ${p.total}（${p.subs} 小节）`).join(' · ')}`);
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  没有交接句: ${handoff.missing.join(' ') || '无'}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明抗寄生虫药的分类/靶点/生活史阶段与耐药机制与不良反应类别与观察要求，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, params, handoff, values, briefs, extremes: ext, classes, stages };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  TITLE,
  PARAMS,
  CLASSES,
  STAGES,
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
  stageAudit,
  quoteAudit,
  main,
};
