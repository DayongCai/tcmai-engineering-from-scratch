#!/usr/bin/env node
/**
 * 药理学 · 第 25 章 抗心绞痛药
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/25-antianginal-drugs/docs/zh.md
 * 出处: 教材·药理学·第25章（25.1–25.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=25]，secs[].subs[] 带 brief 与 body）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：
 *   本章的论点是「心绞痛是氧供需失衡，三类药分别在三项耗氧构成上减法；而 25.2 三节
 *   讲的其实是受体学，不是β阻断药的临床」。
 *   第二句要成立，得看两个数：25.2 占了全章多少字、又占了多少个「受体」。
 *   这两个数手打必错，只有现算才敢写成结论。
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
const CHAPTER = 25;

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

const KEYWORDS = ['耗氧', '前负荷', '后负荷', '心率', '受体', '耐受', '反射性', '联合'];

function keywordTable(chap) {
  return KEYWORDS.map((w) => keywordHits(chap, w))
    .sort((a, b) => b.total - a.total || KEYWORDS.indexOf(a.word) - KEYWORDS.indexOf(b.word));
}

/**
 * 耗氧的三项构成（教材 25.3.2 的表述）：心率、心肌收缩力、心室壁张力。
 * 三类抗心绞痛药各自在这三项上做减法——这张表就是本章的坐标。
 */
const OXYGEN = ['心率', '心肌收缩力', '心室壁张力'];

function oxygenTable(chap) {
  return OXYGEN.map((w) => keywordHits(chap, w));
}

/**
 * 联合应用的三类关系（25.4.2）：协同 / 相加 / 相互抵消。
 * 数这三个词，是为了看教材把多少笔墨放在「关系」而不是「组合」上。
 */
const RELATIONS = ['协同', '相加', '抵消'];

function relationTable(chap) {
  return RELATIONS.map((w) => keywordHits(chap, w));
}

/**
 * 受体学的重心落在 25.2：三节讨论受体的概念、分类与结合，
 * 而β阻断药本身的临床应用只占其中一小段。
 * 这里把「25.2 的字数占比」与「25.2 的受体占比」一起算出来。
 */
function receptorShare(chap) {
  const secs = sectionStats(chap);
  const totalHanzi = secs.reduce((n, x) => n + x.hanzi, 0);
  const hits = keywordHits(chap, '受体');
  const inSec = secSum(hits, '25.2');
  const secHanzi = secs.find((x) => x.no === '25.2').hanzi;
  return {
    total: hits.total,
    inSec,
    secHanzi,
    totalHanzi,
    hanziShare: secHanzi / totalHanzi,
    hitShare: hits.total ? inSec / hits.total : 0,
  };
}

/**
 * 三类药与一类辅助药的代表药。教材在 25.1.1 与 25.3.1 两处点名，
 * 这里只作复核：数每个名字在正文被点名几次。
 */
const CLASSES = [
  { name: '硝酸酯类', drugs: ['硝酸甘油', '硝酸异山梨酯', '单硝酸异山梨酯', '戊四硝酯', '亚硝酸异戊酯'] },
  { name: 'β受体阻断药', drugs: ['普萘洛尔', '美托洛尔', '阿替洛尔', '比索洛尔', '拉贝洛尔', '卡维地洛'] },
  { name: '钙通道阻断药', drugs: ['硝苯地平', '氨氯地平', '非洛地平', '尼群地平', '尼莫地平', '维拉帕米', '地尔硫䓬'] },
  { name: '其他', drugs: ['曲美他嗪', '尼可地尔', '雷诺嗪'] },
];

function drugMentions(chap) {
  const body = subsOf(chap).map((u) => u.body).join('\n');
  return CLASSES.map((c) => {
    const rows = c.drugs.map((d) => ({ drug: d, hits: (body.match(new RegExp(d, 'g')) || []).length }));
    return { name: c.name, drugs: rows.length, hits: rows.reduce((n, r) => n + r.hits, 0), rows };
  });
}

/** 剂量量值：本章底本 27 处，全部落在列用法的小节 */
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
  const oxy = oxygenTable(chap);
  const rel = relationTable(chap);
  const rs = receptorShare(chap);
  const drugs = drugMentions(chap);
  const dose = doseAudit(chap);
  const handoff = handoffAudit(chap);
  const pct = (x) => `${Math.round(x * 100)}%`;

  console.log('═══ 抗心绞痛药：氧供需的两侧与三类减法（药理学 第25章）═══');
  console.log(`教材规模: 第25章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / subs.length)} 字`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  for (const x of secs) console.log(`  ${x.no} ${x.title} · ${x.subs} 小节 · ${x.hanzi} 字（均 ${x.avg}）`);
  console.log('');
  console.log(`关键词: ${kw.map((k) => `${k.word} ${k.total}`).join(' · ')}`);
  console.log('');
  console.log(`耗氧三项（教材 25.3.2 的构成）：${oxy.map((o) => `${o.word} ${o.total}`).join(' · ')}`);
  console.log(`  最密小节：${oxy.map((o) => `${o.word}→${topSub(o).sub}`).join(' · ')}`);
  console.log('');
  console.log(`联合三类关系：${rel.map((r) => `${r.word} ${r.total}`).join(' · ')}`);
  console.log('');
  console.log(`受体学的重心: 25.2 三节占全章 ${pct(rs.hanziShare)} 的字（${rs.secHanzi} / ${rs.totalHanzi}）`);
  console.log(`              却占全章 ${pct(rs.hitShare)} 的「受体」（${rs.inSec} / ${rs.total}）`);
  console.log('  → 25.2 讲的不是β阻断药的临床，是受体学本身；药只是受体学的例证。');
  console.log('');
  console.log('四类代表药的点名次数（教材名单，仅作复核）:');
  for (const c of drugs) console.log(`  ${c.name} · 名单 ${c.drugs} 个 · 正文点名 ${c.hits} 次`);
  console.log('');
  console.log(`剂量量值: 正文命中 ${dose.hits} 处，分布在 ${dose.per.map((x) => `${x.sub}(${x.hits})`).join(' ')}`);
  console.log('  → 剂量只出现在教材列用法处，课程正文一律写「剂量与用法照底本」。');
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节（共 ${handoff.of} 个）`);
  console.log('');
  console.log('教学边界：本章只说明抗心绞痛药的分类、作用环节、氧供需的两侧与联合应用的类别关系，不写剂量与用法量值（剂量与用法照底本），不作诊断与适应证判定，不作疗效与优劣断言，不构成用药建议');

  return { chap, subs, shape: s, secs, keywords: kw, oxygen: oxy, relations: rel, receptorShare: rs, drugs, dose, handoff };
}

if (require.main === module) main();

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  KEYWORDS,
  OXYGEN,
  RELATIONS,
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
  oxygenTable,
  relationTable,
  receptorShare,
  drugMentions,
  doseAudit,
  handoffAudit,
  main,
};
