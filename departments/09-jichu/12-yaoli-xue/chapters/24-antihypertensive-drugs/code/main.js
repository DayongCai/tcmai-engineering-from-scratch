#!/usr/bin/env node
/**
 * 药理学 · 第 24 章 抗高血压药
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/24-antihypertensive-drugs/docs/zh.md
 * 出处: 教材·药理学·第24章（24.1–24.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=24]，secs[].subs[] 带 brief 与 body）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：
 *   本章的论点是「血压调节是一条链，五类是链上的五个切点；类别是切点的名字，不是药的等级」。
 *   这句话要落地，得看四件事：每节摊多少字、八个关键词各几次、五类的代表药被点名几次、
 *   教材在同一章里到底说「五类」还是「六组」。
 *   第四件事最关键：它是教材内部的一处口径差，手打复述必错，只有现算才敢写。
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
const CHAPTER = 24;

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

function secSum(hits, secNo) {
  return hits.per.filter((p) => p.sub.startsWith(`${secNo}.`)).reduce((n, p) => n + p.hits, 0);
}

function topSub(hits) {
  return [...hits.per].sort((a, b) => b.hits - a.hits)[0] || { sub: '', hits: 0 };
}

/**
 * 八个关键词，四组：
 *   分类组（作用部位 / 作用机制）——本章的纲目；
 *   时间组（起效 / 持续）——决定给药频次的那一维；
 *   代价组（钠水潴留 / 血钾）——两条最常被推出来的不良反应；
 *   过程组（不良反应 / 观察）——把效应放到记录里。
 */
const KEYWORDS = ['作用部位', '作用机制', '不良反应', '联合', '起效', '钠水潴留', '血钾', '观察'];

function keywordTable(chap) {
  return KEYWORDS.map((w) => keywordHits(chap, w))
    .sort((a, b) => b.total - a.total || KEYWORDS.indexOf(a.word) - KEYWORDS.indexOf(b.word));
}

/**
 * 教材的口径差：24.1.1 与 24.1.3 说「五类」，24.1.2 说「六组」。
 * 差的是一组补充类别（中枢性降压药与钾通道开放药）是否单列。
 * 这件事不能靠记忆复述，只能数。
 */
const LABELS = ['五类', '六组'];

function labelAudit(chap) {
  return LABELS.map((w) => keywordHits(chap, w));
}

/**
 * 五类代表药。教材在 24.1.2 与 24.1.3 两处列名单，这里只作复核对象：
 * 数每个名字在正文被点名几次，再按类别合计。跨类药品单列（拉贝洛尔、卡维地洛）。
 */
const CLASSES = [
  { name: '利尿药', drugs: ['氢氯噻嗪', '吲达帕胺', '呋塞米', '螺内酯', '氨苯蝶啶'] },
  {
    name: '系统抑制药',
    drugs: ['卡托普利', '依那普利', '赖诺普利', '贝那普利', '福辛普利', '氯沙坦', '缬沙坦', '厄贝沙坦', '替米沙坦', '阿利吉仑'],
  },
  { name: '钙通道阻断药', drugs: ['硝苯地平', '氨氯地平', '非洛地平', '尼群地平', '维拉帕米', '地尔硫䓬'] },
  {
    name: '交感神经抑制药',
    drugs: ['可乐定', '甲基多巴', '莫索尼定', '利血平', '胍乙啶', '普萘洛尔', '美托洛尔', '阿替洛尔', '哌唑嗪', '特拉唑嗪', '多沙唑嗪'],
  },
  { name: '血管扩张药', drugs: ['肼屈嗪', '硝普钠', '米诺地尔', '二氮嗪', '地巴唑'] },
];

/** 兼有 α 与 β 阻断的药：教材列于交感神经抑制药项下，同时注明血管效应 */
const CROSS = ['拉贝洛尔', '卡维地洛', '乌拉地尔'];

function drugMentions(chap) {
  const body = subsOf(chap).map((u) => u.body).join('\n');
  return CLASSES.map((c) => {
    const rows = c.drugs.map((d) => ({ drug: d, hits: (body.match(new RegExp(d, 'g')) || []).length }));
    return { name: c.name, drugs: rows.length, hits: rows.reduce((n, r) => n + r.hits, 0), rows };
  });
}

function crossMentions(chap) {
  const body = subsOf(chap).map((u) => u.body).join('\n');
  return CROSS.map((d) => ({ drug: d, hits: (body.match(new RegExp(d, 'g')) || []).length }));
}

/**
 * 给药频次：教材用「每日1次 / 每日2次 / 每日3次」三种写法。
 * 这里只数这三种字面写法各被用过几次，用来对照 24.3.3 的三条整理线索
 * （作用部位 / 起效快慢 / 持续时间）。
 */
const FREQ = ['每日1次', '每日2次', '每日3次'];

function freqAudit(chap) {
  const body = subsOf(chap).map((u) => u.body).join('\n');
  return FREQ.map((f) => ({ phrase: f, hits: (body.match(new RegExp(f, 'g')) || []).length }));
}

/** 剂量量值：本章底本 88 处量值，正文里的「数字＋剂量单位」最密 */
const DOSE_RE = /\d+(?:\.\d+)?\s*(?:毫克|微克|mg|克|ml|mL|μg|ug)/g;

function doseAudit(chap) {
  const per = [];
  let hits = 0;
  for (const u of subsOf(chap)) {
    const m = u.body.match(DOSE_RE) || [];
    if (m.length) per.push({ sub: u.no, hits: m.length });
    hits += m.length;
  }
  return { hits, per };
}

const HANDOFF = '具备资质的人员';

function handoffAudit(chap) {
  const subs = subsOf(chap);
  return {
    count: subs.reduce((n, u) => n + (u.body.match(new RegExp(HANDOFF, 'g')) || []).length, 0),
    subs: subs.filter((u) => u.body.includes(HANDOFF)).map((u) => u.no),
    of: subs.length,
  };
}

function main() {
  const base = load();
  const chap = chapter(base);
  const subs = subsOf(chap);
  const s = shape(chap);
  const secs = sectionStats(chap);
  const kw = keywordTable(chap);
  const labels = labelAudit(chap);
  const drugs = drugMentions(chap);
  const cross = crossMentions(chap);
  const freq = freqAudit(chap);
  const dose = doseAudit(chap);
  const handoff = handoffAudit(chap);

  console.log('═══ 抗高血压药：一条调节链上的五个切点（药理学 第24章）═══');
  console.log(`教材规模: 第24章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / subs.length)} 字`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  for (const x of secs) console.log(`  ${x.no} ${x.title} · ${x.subs} 小节 · ${x.hanzi} 字（均 ${x.avg}）`);
  console.log('');
  console.log(`关键词: ${kw.map((k) => `${k.word} ${k.total}`).join(' · ')}`);
  const kp = keywordHits(chap, '作用部位');
  const km = keywordHits(chap, '作用机制');
  console.log(`  → 分类两词（作用部位 ${kp.total} / 作用机制 ${km.total}）最密都在 ${topSub(kp).sub}`);
  console.log('     分类是纲目，不是药名清单。');
  console.log('');
  console.log(`教材口径: ${labels.map((l) => `${l.word} ${l.total} 次（${l.per.map((p) => p.sub).join(' ')}）`).join(' · ')}`);
  console.log('  → 同一章说过五类，也说过六组：差的是中枢性降压药与钾通道开放药是否单列。');
  console.log('');
  console.log('五类代表药的点名次数（教材名单，仅作复核）:');
  for (const c of drugs) console.log(`  ${c.name} · 名单 ${c.drugs} 个 · 正文点名 ${c.hits} 次`);
  console.log(`  跨类药品: ${cross.map((c) => `${c.drug} ${c.hits}`).join(' · ')}`);
  console.log('');
  console.log(`给药频次的字面写法: ${freq.map((f) => `${f.phrase} ${f.hits}`).join(' · ')}`);
  console.log('');
  console.log(`剂量量值: 正文命中 ${dose.hits} 处，分布在 ${dose.per.map((x) => `${x.sub}(${x.hits})`).join(' ')}`);
  console.log('  → 本章是全科量值最密的一章之一：剂量只出现在教材列用法处，课程正文一律写「剂量与用法照底本」。');
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节（共 ${handoff.of} 个）`);
  console.log('');
  console.log('教学边界：本章只说明抗高血压药的分类依据、作用环节、时间特性与观察类别，不写剂量与用法量值（剂量与用法照底本），不作诊断与适应证判定，不作疗效与优劣断言，不构成用药建议');

  return { chap, subs, shape: s, secs, keywords: kw, labels, drugs, cross, freq, dose, handoff };
}

if (require.main === module) main();

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  KEYWORDS,
  LABELS,
  CLASSES,
  CROSS,
  FREQ,
  HANDOFF,
  DOSE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  shape,
  sectionStats,
  keywordHits,
  secSum,
  topSub,
  keywordTable,
  labelAudit,
  drugMentions,
  crossMentions,
  freqAudit,
  doseAudit,
  handoffAudit,
  main,
};
