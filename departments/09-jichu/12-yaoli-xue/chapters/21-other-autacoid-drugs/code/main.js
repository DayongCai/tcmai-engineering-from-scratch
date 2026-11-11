#!/usr/bin/env node
/**
 * 药理学 · 第 21 章 其他影响自体活性物质的药物
 * 课程: departments/09-jichu/12-yaoli-xue/chapters/21-other-autacoid-drugs/docs/zh.md
 * 出处: 教材·药理学·第21章（21.1–21.4，共 4 节 12 小节）
 * 数据: standards/yaoli/底本.json（chapters[n=21]，secs[].subs[] 带 brief 口径句与 body 正文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章是「环节」章——四组物质各自被拆成生成、释放、受体、降解
 * 四个位点，药物按位点归位。这个写法留下两个可数的痕迹：
 * 一是四组物质的名字在正文里各占多少（谁被写得最重）；
 * 二是小节标题的重复次数——「分类与代表药」出现了几次，就说明教材收了几次口。
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
const CHAPTER = 21;
const TITLE = '其他影响自体活性物质的药物';
const SLUG = 'other-autacoid-drugs';

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

/** 小节标题（去掉编号前缀），用于统计教材收口的方式 */
const cleanTitle = (t) => t.replace(/^\d+\.\d+\.\d+\s*/, '').trim();

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
 * 骨架词表：四组物质 + 两个元词。
 * 四组物质（膜磷脂代谢物、5-羟色胺、多肽、一氧化氮）是本章的四根柱子；
 * 「受体」与「环节」是教材用来说明药物位置的两个元词——
 * 前者定位靶点，后者定位药物落在通路的哪一段。
 */
const KEYWORDS = [
  { key: '前列腺素', group: '物质' },
  { key: '白三烯', group: '物质' },
  { key: '5-羟色胺', group: '物质' },
  { key: '缓激肽', group: '物质' },
  { key: '一氧化氮', group: '物质' },
  { key: '血管紧张素', group: '物质' },
  { key: '受体', group: '元词' },
  { key: '环节', group: '元词' },
];

function keywordCounts(chap) {
  return KEYWORDS.map((p) => {
    const h = keywordHits(chap, p.key);
    return { key: p.key, group: p.group, total: h.total, per: h.per };
  }).sort((a, b) => b.total - a.total);
}

/** 四根柱子：每组物质被写在哪几个小节，决定「四节各管一组」是否成立 */
const AXES = ['前列腺素', '5-羟色胺', '缓激肽', '一氧化氮'];

function axisSpread(chap) {
  return AXES.map((w) => {
    const h = keywordHits(chap, w);
    return { axis: w, total: h.total, subs: h.per.map((x) => x.sub) };
  });
}

/**
 * 小节标题的重复次数：教材用同名的第三小节为每节收口。
 * 「分类与代表药」出现几次，就说明教材在四节里收了几次口；
 * 21.4 把它放在第一节而非第三节，是本章唯一的次序例外。
 */
function titleTally(chap) {
  const tally = new Map();
  for (const u of subsOf(chap)) {
    const t = cleanTitle(u.title);
    if (!tally.has(t)) tally.set(t, []);
    tally.get(t).push(u.no);
  }
  return [...tally.entries()]
    .map(([title, subs]) => ({ title, count: subs.length, subs }))
    .sort((a, b) => b.count - a.count || a.title.localeCompare(b.title, 'zh'));
}

/** 判断的去向 */
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

function main() {
  const base = load();
  const chap = chapter(base);
  const subs = subsOf(chap);
  const s = shape(chap);
  const secs = sectionStats(chap);
  const kws = keywordCounts(chap);
  const axes = axisSpread(chap);
  const titles = titleTally(chap);
  const handoff = handoffAudit(chap);
  const values = valueAudit(chap);
  const briefs = briefAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 其他影响自体活性物质的药物：四根柱子，一套环节语言（药理学 第21章）═══');
  console.log(`教材规模: 第21章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处，分布在 ${values.offenders.length} 个小节`);
  console.log(`按节分布: ${secs.map((x) => `${x.no} ${x.hanzi} 字`).join(' · ')}`);
  console.log('');
  console.log(`12 个小节与正文汉字（最薄 ${ext.thinnest.sub} · ${ext.thinnest.hanzi} 字；最厚 ${ext.thickest.sub} · ${ext.thickest.hanzi} 字）：`);
  for (const u of subs) console.log(`  ${u.no} ${cleanTitle(u.title)} · ${hanzi(u.body)} 字`);
  console.log('');
  console.log(`骨架词频: ${kws.map((p) => `${p.key} ${p.total}`).join(' · ')}`);
  console.log('  → 六组物质与两个元词（受体 / 环节）并置：前者是本章的四根柱子，后者是定位语言。');
  for (const a of axes) console.log(`  ${a.axis}: ${a.total} 次 · 见于 ${a.subs.length} 个小节（${a.subs.join(' ')}）`);
  console.log('');
  console.log('小节标题的重复次数（教材怎么收口）：');
  for (const t of titles) console.log(`  ${t.title} · ${t.count} 次（${t.subs.join(' ')}）`);
  console.log('');
  console.log(`判断去向: 「${HANDOFF}」${handoff.count} 次，分布在 ${handoff.subs.length} 个小节`);
  console.log(`  没有交接句: ${handoff.missing.join(' ') || '（无）'}`);
  console.log('');
  console.log(`口径句核验: ${briefs.filter((b) => b.ok).length} / ${briefs.length} 小节的 brief 同时带「剂量与用法照底本」与「本书不构成用药建议」`);
  console.log('');

  const last = '教学边界：本章只说明膜磷脂代谢物、5-羟色胺、多肽类与一氧化氮四组物质的通路环节与药物分类，不写剂量与浓度与用法量值（剂量与用法照底本），不作适应证判定与疗效断言，不构成用药建议';
  console.log(last);

  return { chap, subs, shape: s, secs, kws, axes, titles, handoff, values, briefs, extremes: ext, last };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  TITLE,
  SLUG,
  KEYWORDS,
  AXES,
  HANDOFF,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  hanzi,
  cleanTitle,
  shape,
  sectionStats,
  keywordHits,
  keywordCounts,
  axisSpread,
  titleTally,
  handoffAudit,
  valueAudit,
  briefAudit,
  extremes,
  main,
};
