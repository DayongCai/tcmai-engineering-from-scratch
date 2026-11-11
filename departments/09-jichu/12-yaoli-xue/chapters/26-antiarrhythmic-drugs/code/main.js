#!/usr/bin/env node
/**
 * 药理学 · 第 26 章 抗心律失常药
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/26-antiarrhythmic-drugs/docs/zh.md
 * 出处: 教材·药理学·第26章（26.1–26.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=26]，secs[].subs[] 带 brief 与 body）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：
 *   本章的论点是「治疗与致心律失常同源：抑制异常电活动的每一个动作，都同时抑制正常电活动」。
 *   这句话不是修辞，它有一个可数的影子——「致心律失常」在本章出现几次、落在哪几节。
 *   另一个可数的影子是四分法被写了两遍（26.1.3 与 26.2.2）：一遍从电生理讲，一遍从机制讲。
 *   这两件事都必须现算；手打会把「说过的」写成「记住的」。
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
const CHAPTER = 26;

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

const KEYWORDS = ['传导', '自律性', '不应期', '复极', '折返', '通道', '后除极', '致心律失常'];

function keywordTable(chap) {
  return KEYWORDS.map((w) => keywordHits(chap, w))
    .sort((a, b) => b.total - a.total || KEYWORDS.indexOf(a.word) - KEYWORDS.indexOf(b.word));
}

/** 两类发生机制（26.1.2）：冲动形成异常与冲动传导异常 */
const MECHANISMS = ['冲动形成异常', '冲动传导异常'];

function mechanismTable(chap) {
  return MECHANISMS.map((w) => keywordHits(chap, w));
}

/**
 * 四个基本环节（26.2.1）：降低自律性、减少后除极、改变传导性、延长有效不应期。
 * 每一环都能在药物身上找到落点，也都能在不良反应里找到回声——这是本章的对称结构。
 */
const LINKS = ['降低自律性', '后除极', '改变传导性', '有效不应期'];

function linkTable(chap) {
  return LINKS.map((w) => keywordHits(chap, w));
}

/**
 * 四分法被写了两遍：26.1.3（电生理视角）与 26.2.2（机制视角）。
 * 两处都用了同一套罗马数字标签，这里数标签落在哪几节。
 */
const ROMAN = ['Ⅰ类', 'Ⅱ类', 'Ⅲ类', 'Ⅳ类'];

function romanTable(chap) {
  return ROMAN.map((w) => keywordHits(chap, w));
}

/**
 * 致心律失常：本章的「代价」专名。
 * 治疗作用与它同源——抑制异常电活动的动作，同时抑制正常电活动。
 */
const PRICE = '致心律失常';

function priceAudit(chap) {
  const h = keywordHits(chap, PRICE);
  return { total: h.total, subs: h.per.map((p) => p.sub), per: h.per };
}

/** 六组代表药（Ⅰa / Ⅰb / Ⅰc / Ⅱ / Ⅲ / Ⅳ + 未分类） */
const CLASSES = [
  { name: 'Ⅰa类', drugs: ['奎尼丁', '普鲁卡因胺'] },
  { name: 'Ⅰb类', drugs: ['利多卡因', '美西律', '苯妥英钠'] },
  { name: 'Ⅰc类', drugs: ['普罗帕酮', '氟卡尼'] },
  { name: 'Ⅱ类', drugs: ['普萘洛尔', '美托洛尔', '艾司洛尔', '阿替洛尔', '比索洛尔'] },
  { name: 'Ⅲ类', drugs: ['胺碘酮', '索他洛尔', '决奈达隆', '多非利特', '伊布利特'] },
  { name: 'Ⅳ类', drugs: ['维拉帕米', '地尔硫䓬'] },
  { name: '未分类', drugs: ['腺苷', '镁盐'] },
];

function drugMentions(chap) {
  const body = subsOf(chap).map((u) => u.body).join('\n');
  return CLASSES.map((c) => {
    const rows = c.drugs.map((d) => ({ drug: d, hits: (body.match(new RegExp(d, 'g')) || []).length }));
    return { name: c.name, drugs: rows.length, hits: rows.reduce((n, r) => n + r.hits, 0), rows };
  });
}

/**
 * 剂量量值：本章是全科量值最少的一章（底本 6 处）。
 * 这个「少」本身是本章论点的证据：抗心律失常药的差别写在靶点与时间尺度上，不写在剂量上。
 */
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
  const mech = mechanismTable(chap);
  const links = linkTable(chap);
  const roman = romanTable(chap);
  const price = priceAudit(chap);
  const drugs = drugMentions(chap);
  const dose = doseAudit(chap);
  const handoff = handoffAudit(chap);

  console.log('═══ 抗心律失常药：两类机制、四个环节、四类药与一笔同源的代价（药理学 第26章）═══');
  console.log(`教材规模: 第26章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / subs.length)} 字`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  for (const x of secs) console.log(`  ${x.no} ${x.title} · ${x.subs} 小节 · ${x.hanzi} 字（均 ${x.avg}）`);
  console.log('');
  console.log(`关键词: ${kw.map((k) => `${k.word} ${k.total}`).join(' · ')}`);
  console.log('');
  console.log(`两类机制: ${mech.map((m) => `${m.word} ${m.total}`).join(' · ')}`);
  console.log(`四个环节: ${links.map((l) => `${l.word} ${l.total}`).join(' · ')}`);
  console.log('');
  console.log(`四分法写了两遍: ${roman.map((r) => `${r.word} ${r.total}（${r.per.map((p) => p.sub).join(' ')}）`).join(' · ')}`);
  console.log('  → 26.1.3 从电生理讲，26.2.2 从机制讲；同一框架两次出现，是为了让分类有两条来路。');
  console.log('');
  console.log(`代价专名「${PRICE}」: ${price.total} 次，落在 ${price.subs.length} 个小节（${price.subs.join(' ')}）`);
  console.log('  → 治疗作用与这笔代价同源：抑制异常电活动的动作，同时抑制正常电活动。');
  console.log('');
  console.log('六组代表药的点名次数（教材名单，仅作复核）:');
  for (const c of drugs) console.log(`  ${c.name} · 名单 ${c.drugs} 个 · 正文点名 ${c.hits} 次`);
  console.log('');
  console.log(`剂量量值: 正文命中 ${dose.hits} 处，分布在 ${dose.per.map((x) => `${x.sub}(${x.hits})`).join(' ')}`);
  console.log('  → 全科量值最少的一章之一：差别写在靶点与时间尺度上，不写在数字上。');
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节（共 ${handoff.of} 个）`);
  console.log('');
  console.log('教学边界：本章只说明心律失常的两类机制、抗心律失常药的四个基本环节与四类分类，不写剂量与用法量值（剂量与用法照底本），不作诊断与分型判定，不作疗效与优劣断言，不构成用药建议');

  return { chap, subs, shape: s, secs, keywords: kw, mechanisms: mech, links, roman, price, drugs, dose, handoff };
}

if (require.main === module) main();

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  KEYWORDS,
  MECHANISMS,
  LINKS,
  ROMAN,
  PRICE,
  CLASSES,
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
  mechanismTable,
  linkTable,
  romanTable,
  priceAudit,
  drugMentions,
  doseAudit,
  handoffAudit,
  main,
};
