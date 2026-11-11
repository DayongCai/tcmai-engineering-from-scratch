#!/usr/bin/env node
/**
 * 药理学 · 第 44 章 抗真菌药与抗病毒药：靶点往外挪一层，选择性就窄一分
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/44-antifungal-and-antiviral-drugs/docs/zh.md
 * 出处: 教材·药理学·第44章（44.1–44.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=44]）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「真菌与病毒都比细菌更靠近宿主细胞，
 * 所以靶点只能往外挪——挪到膜、壁、活化酶上，选择性随之变窄」。
 * 这条命题能否站住，要看教材是否真的把「麦角固醇」「胸苷激酶」写成贯穿多节的坐标。
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
const CHAPTER = 44;
const TITLE = '抗真菌药与抗病毒药：靶点往外挪一层，选择性就窄一分';

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
 * 「靶点组」：麦角固醇（膜）、胸苷激酶（活化链）——本章两条最硬的机制坐标。
 * 「类别组」：唑类与抗病毒，分别代表两节的重心。
 * 「过程组」：吸收与耐药，一个是给药的入口，一个是治疗的出口。
 */
const PARAMS = [
  { key: '唑类', group: '类别组' },
  { key: '抗病毒', group: '类别组' },
  { key: '麦角固醇', group: '靶点组' },
  { key: '胸苷激酶', group: '靶点组' },
  { key: '吸收', group: '过程组' },
  { key: '耐药', group: '过程组' },
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
  { name: '抗真菌药', prefix: '44.1' },
  { name: '抗病毒药', prefix: '44.2' },
  { name: '观察与表述要求', prefix: '44.3' },
  { name: '体内过程与不良反应的类别', prefix: '44.4' },
];

function classShape(subs) {
  return CLASSES.map((c) => ({ name: c.name, subs: subs.filter((u) => u.no.startsWith(`${c.prefix}.`)).length }));
}

/**
 * 给药途径对照：静脉与口服各落在几个小节。
 * 本章「吸收决定途径」这句话的证据就在这里：同门之内，有的必须静脉，有的可以口服。
 */
function routeAudit(chap) {
  const subs = subsOf(chap);
  return {
    iv: subs.filter((u) => /静脉/.test(u.body)).map((u) => u.no),
    po: subs.filter((u) => /口服/.test(u.body)).map((u) => u.no),
    neither: subs.filter((u) => !/静脉|口服/.test(u.body)).map((u) => u.no),
  };
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
  const routes = routeAudit(chap);

  console.log(`═══ ${TITLE}（药理学 第44章）═══`);
  console.log(`教材规模: 第44章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处（底本带剂量，故本章走 B 支）`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`四节的推理分工: ${classes.map((c) => `${c.name} ${c.subs}`).join(' · ')}`);
  console.log('  → 一节真菌、一节病毒、一节表述、一节体内过程：靶点—活化—途径三层走完。');
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${u.title.replace(/^\d+\.\d+\.\d+\s*/, '')} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`词频: ${params.map((p) => `${p.key} ${p.total}`).join(' · ')}`);
  console.log('  → 「麦角固醇」管膜，「胸苷激酶」管活化链；两个靶点一个在膜上，一个在酶上。');
  console.log(`  分布最广的词: ${params[0].key}，覆盖 ${params[0].per.length} 个小节`);
  console.log('');
  console.log(`途径对照: 讲静脉的 ${routes.iv.length} 个小节 · 讲口服的 ${routes.po.length} 个小节 · 两者都讲的 ${routes.iv.filter((x) => routes.po.includes(x)).length} 个小节`);
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  没有交接句: ${handoff.missing.join(' ') || '无'}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');
  console.log('教学边界：本章只说明抗真菌药与抗病毒药的靶点/活化链/体内过程与不良反应类别与观察要求，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议');

  return { chap, subs, shape: s, secs, params, handoff, values, briefs, extremes: ext, classes, routes };
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
  routeAudit,
  quoteAudit,
  main,
};
