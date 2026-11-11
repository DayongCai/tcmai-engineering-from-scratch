#!/usr/bin/env node
/**
 * 药理学 · 第 23 章 治疗慢性心功能不全的药物
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/23-drugs-for-chronic-heart-failure/docs/zh.md
 * 出处: 教材·药理学·第23章（23.1–23.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=23]，secs[].subs[] 带 brief 与 body）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：
 *   本章的论点是「六类药物的差别写在同一个系统的不同干预点上，效应时程因此不同」。
 *   这句话能不能落到实处，只看四件事——每节摊多少字、八个关键词各被提了几次、
 *   代表药在正文里被点名几次、教材的剂量量值压在哪几节。
 *   手打的数字会在教材改版后静默过期；现算的数字一旦对不上，测试自己会红。
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
const CHAPTER = 23;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

function chapter(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

function subsOf(chap) {
  return chap.secs.flatMap((s) => s.subs).sort((a, b) => a.no.localeCompare(b.no, 'en'));
}

/** 汉字数：只数 CJK 统一表意文字 */
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
 * 八个关键词，分三组：
 *   机制组（心肌重构 / 神经内分泌）——本章的对象；
 *   血流动力学组（前负荷 / 后负荷）——药物的效应位置；
 *   长期过程组（耐受 / 高钾 / 受体 / 效应时程的对应物）——短期指标之外的代价。
 */
const KEYWORDS = ['心肌重构', '神经内分泌', '前负荷', '后负荷', '耐受', '高钾', '受体', '重构'];

function keywordTable(chap) {
  return KEYWORDS.map((w) => keywordHits(chap, w))
    .sort((a, b) => b.total - a.total || KEYWORDS.indexOf(a.word) - KEYWORDS.indexOf(b.word));
}

/**
 * 六类代表药。教材自己在 23.1.2 与 23.2.3 两处列过名单，
 * 这里只把名单当作**复核对象**：数一数每个名字在正文里被点名几次。
 * 螺内酯与依普利酮同时出现在利尿药与醛固酮拮抗药两处——这是教材的分类方式，
 * 不是本课程的归并；重叠次数被单独算出来，免得把「一类一药」当成前提。
 */
const CLASSES = [
  { name: '正性肌力药', drugs: ['地高辛', '洋地黄毒苷', '去乙酰毛花苷', '毒毛花苷K', '多巴酚丁胺', '多巴胺', '米力农', '氨力农', '左西孟旦'] },
  { name: '利尿药', drugs: ['呋塞米', '托拉塞米', '氢氯噻嗪', '螺内酯', '依普利酮', '托伐普坦'] },
  { name: '系统抑制药', drugs: ['卡托普利', '依那普利', '贝那普利', '培哚普利', '雷米普利', '福辛普利', '氯沙坦', '缬沙坦', '厄贝沙坦', '坎地沙坦', '替米沙坦', '螺内酯', '依普利酮'] },
  { name: 'β受体阻断药', drugs: ['美托洛尔', '比索洛尔', '卡维地洛'] },
  { name: '血管扩张药', drugs: ['硝酸甘油', '硝酸异山梨酯', '单硝酸异山梨酯', '肼屈嗪', '硝普钠', '哌唑嗪'] },
  { name: '钙通道阻断药', drugs: ['硝苯地平', '氨氯地平', '非洛地平', '尼群地平', '维拉帕米', '地尔硫䓬'] },
];

function drugMentions(chap) {
  const body = subsOf(chap).map((u) => u.body).join('\n');
  return CLASSES.map((c) => {
    const rows = c.drugs.map((d) => ({ drug: d, hits: (body.match(new RegExp(d, 'g')) || []).length }));
    return { name: c.name, drugs: rows.length, hits: rows.reduce((n, r) => n + r.hits, 0), rows };
  });
}

/** 跨类重复：同一个药名被两个类别同时收录 */
function overlaps() {
  const seen = new Map();
  for (const c of CLASSES) for (const d of c.drugs) {
    if (!seen.has(d)) seen.set(d, []);
    seen.get(d).push(c.name);
  }
  return [...seen.entries()].filter(([, v]) => v.length > 1).map(([drug, v]) => ({ drug, classes: v }));
}

/**
 * 剂量量值：教材带剂量，本章正文里的「数字＋剂量单位」全部落在特指小节。
 * 这里不引用任何数值，只数它们出现在哪几节——用来证明本章正文为什么不能抄剂量。
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

/** 判断去向：教材把结论交给「具备资质的人员」的地方 */
const HANDOFF = '具备资质的人员';

function handoffAudit(chap) {
  const subs = subsOf(chap);
  return {
    count: subs.reduce((n, u) => n + (u.body.match(new RegExp(HANDOFF, 'g')) || []).length, 0),
    subs: subs.filter((u) => u.body.includes(HANDOFF)).map((u) => u.no),
    of: subs.length,
  };
}

/** 时间尺度：短期效应与长期过程被分开叙述的小节（教材用词「短期」「长期」） */
const SCALES = ['短期', '长期'];

function scaleAudit(chap) {
  return SCALES.map((w) => {
    const h = keywordHits(chap, w);
    return { word: w, total: h.total, subs: h.per.length, top: (h.per.sort((a, b) => b.hits - a.hits)[0] || {}).sub || '' };
  });
}

function main() {
  const base = load();
  const chap = chapter(base);
  const subs = subsOf(chap);
  const s = shape(chap);
  const secs = sectionStats(chap);
  const kw = keywordTable(chap);
  const drugs = drugMentions(chap);
  const dose = doseAudit(chap);
  const handoff = handoffAudit(chap);
  const scales = scaleAudit(chap);

  console.log('═══ 治疗慢性心功能不全的药物：六类干预点与两种时间尺度（药理学 第23章）═══');
  console.log(`教材规模: 第23章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  for (const x of secs) console.log(`  ${x.no} ${x.title} · ${x.subs} 小节 · ${x.hanzi} 字（均 ${x.avg}）`);
  console.log('');
  console.log(`关键词: ${kw.map((k) => `${k.word} ${k.total}`).join(' · ')}`);
  console.log('  → 机制组的两个词（心肌重构 / 神经内分泌）与血流动力学组的两个词（前负荷 / 后负荷）');
  console.log('     不在同一节密集：前者压在 23.1.1，后者散在各类药物之下。');
  console.log('');
  console.log('六类代表药的点名次数（教材名单，仅作复核）:');
  for (const c of drugs) console.log(`  ${c.name} · 名单 ${c.drugs} 个 · 正文点名 ${c.hits} 次`);
  const ov = overlaps();
  console.log(`  跨类重复: ${ov.map((o) => `${o.drug}（${o.classes.join('/')}）`).join(' · ')}`);
  console.log('  → 同一个药名落在两类里，是教材的分类方式：利尿与拮抗醛固酮本是两条效应轴。');
  console.log('');
  console.log(`剂量量值: 正文命中 ${dose.hits} 处，分布在 ${dose.per.map((x) => `${x.sub}(${x.hits})`).join(' ')}`);
  console.log('  → 剂量只出现在教材列用法的小节，课程正文一律写「剂量与用法照底本」。');
  console.log('');
  console.log(`时间尺度: ${scales.map((x) => `${x.word} ${x.total} 次 / ${x.subs} 小节（最密 ${x.top}）`).join(' · ')}`);
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节（共 ${handoff.of} 个）`);
  console.log('');
  console.log('教学边界：本章只说明慢性心功能不全的药物分类、作用环节、效应时程与观察类别，不写剂量与用法量值（剂量与用法照底本），不作诊断与预后判定，不作疗效与优劣断言，不构成用药建议');

  return { chap, subs, shape: s, secs, keywords: kw, drugs, overlaps: ov, dose, handoff, scales };
}

if (require.main === module) main();

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  KEYWORDS,
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
  keywordTable,
  drugMentions,
  overlaps,
  doseAudit,
  handoffAudit,
  scaleAudit,
  main,
};
