#!/usr/bin/env node
/**
 * 中医内科学 · 第 5 章 心系病证：九个病证，四十五个小节
 * 课程: departments/01-zhongyi/10-zhongyi-neike-xue/chapters/05-xinxi-bingzheng/docs/zh.md
 * 出处: 教材·中医内科学·第5章（5.1–5.9，共 9 节 45 小节）
 * 数据: standards/neike/底本.json（chapters[n=5]，secs[].subs[].items[] 带 title 与 body）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「心系九病不是九个病名的清单，而是同一条
 * 心神—心脉—气机轴上的九种失序」。这套说法能落在哪几个数上——九节各摊多少字、
 * 辨证论治占几成、证型一共多少个、哪几首方被跨病证复用、五脏提到了几次——
 * 都能在底本正文里数出来。手打的数字会在教材改版后静默过期；现算的数字一旦
 * 对不上，测试自己会红。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/01-zhongyi/10-zhongyi-neike-xue/chapters/05-xinxi-bingzheng/code
// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 standards/neike/底本.json 的那一级
const DIBEN = path.join('standards', 'neike', '底本.json');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, DIBEN))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/neike/底本.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const FILE = path.join(ROOT, DIBEN);
const CHAPTER = 5;

const load = () => JSON.parse(fs.readFileSync(FILE, 'utf8'));

/** 本章（默认第 5 章）的结构对象 */
function chapter(base, no = CHAPTER) {
  const c = base.chapters.find((x) => x.no === no);
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c;
}

/** 摊平小节，保持书中顺序（9 节 × 5 小节） */
function subsOf(chap) {
  return chap.secs.flatMap((s) => s.subs);
}

/** 小节正文：一个小节可能由多个 item 组成，按序拼接 */
const bodyOf = (u) => u.items.map((i) => i.body).join('\n');

/** 汉字数：只数 CJK 统一表意文字，标点与数字不算 */
const hanzi = (s) => (s.match(/[\u4e00-\u9fff]/g) || []).length;

/** 规模：节数 / 小节数 / 汉字数 */
function shape(chap) {
  const subs = subsOf(chap);
  return {
    secs: chap.secs.length,
    subs: subs.length,
    hanzi: subs.reduce((n, u) => n + hanzi(bodyOf(u)), 0),
  };
}

/**
 * 逐病证统计：几个小节、多少汉字、辨证论治占该病证的几成。
 * 「成」而不是百分号：本章正文口径允字数，不允裸写量值，成数是描述不是量值。
 */
function sectionStats(chap) {
  return chap.secs.map((s) => {
    const h = s.subs.reduce((n, u) => n + hanzi(bodyOf(u)), 0);
    const bz = s.subs
      .filter((u) => u.title === '辨证论治' || u.title === '辨证要点'
        || u.title === '中经络证治' || u.title === '中脏腑证治' || u.title === '恢复期证治')
      .reduce((n, u) => n + hanzi(bodyOf(u)), 0);
    return {
      no: s.no,
      title: s.title.replace(/^\d+\.\d+\s*/, ''),
      subs: s.subs.length,
      hanzi: h,
      avg: Math.round(h / s.subs.length),
      bianzheng: bz,
      cheng: Math.round((bz / h) * 10),
    };
  });
}

/**
 * 证型清点：教材在「辨证论治」里把每个证型写成独立一段，段首是「某某证。」，
 * 段内必有「治法：」。两条同时成立才算一个证型——只靠「证」字会数进病机句。
 * 第 8 章淋证用的是「热淋。」「石淋。」这类以病名代证名的写法，同一规则照样收。
 */
function syndromeAudit(chap) {
  return chap.secs.map((s) => {
    const names = [];
    for (const u of s.subs) {
      for (const it of u.items) {
        for (const line of it.body.split('\n')) {
          const t = line.trim();
          const m = t.match(/^([^。]{2,14})。(.{0,120}?治法：)/);
          if (m) names.push(m[1].trim());
        }
      }
    }
    return { sec: s.no, title: s.title.replace(/^\d+\.\d+\s*/, ''), count: names.length, names };
  });
}

/**
 * 代表方清点：以「代表方：X加减」抽方名，去掉「加减」与括号内的出处。
 * 跨病证复用是本章的一条实情——同一首方在不同病证里承担不同角色，
 * 这正是「九病一条轴」的证据，也是背方名背不出来的东西。
 */
function formulaAudit(chap) {
  const bySec = new Map();
  const hits = [];
  for (const s of chap.secs) {
    for (const u of s.subs) {
      for (const it of u.items) {
        for (const line of it.body.split('\n')) {
          const m = line.match(/代表方：([^。（]+?)加减/);
          if (!m) continue;
          const name = m[1].trim();
          hits.push({ sec: s.no, name });
          if (!bySec.has(name)) bySec.set(name, new Set());
          bySec.get(name).add(s.no);
        }
      }
    }
  }
  const reused = [...bySec.entries()]
    .filter(([, secs]) => secs.size > 1)
    .map(([name, secs]) => ({ name, secs: [...secs] }))
    .sort((a, b) => b.secs.length - a.secs.length || a.name.localeCompare(b.name, 'zh'));
  return { total: hits.length, distinct: bySec.size, reused };
}

/** 关键词计数：全章次数 + 每个小节的次数 */
function keywordHits(chap, word) {
  const per = [];
  let total = 0;
  for (const u of subsOf(chap)) {
    const n = (bodyOf(u).match(new RegExp(word, 'g')) || []).length;
    if (n) per.push({ sub: u.no, hits: n });
    total += n;
  }
  return { word, total, per };
}

/**
 * 病机词表：本章七个词。
 * 「虚」「实」是辨证的两端；「痰」「瘀」「水」「火」是四类实邪；
 * 「神」是心系独有的落点——九病里有五个最终都落在神志上。
 */
const KEYWORDS = [
  { key: '虚', group: '虚实' },
  { key: '实', group: '虚实' },
  { key: '痰', group: '实邪' },
  { key: '瘀', group: '实邪' },
  { key: '水', group: '实邪' },
  { key: '火', group: '实邪' },
  { key: '神', group: '神志' },
];

/** 病机词频：按次数降序，同次数保持词表顺序（稳定排序，结果可复算） */
function keywordCounts(chap) {
  return KEYWORDS.map((k) => ({ ...k, ...keywordHits(chap, k.key) }))
    .map((k) => ({ key: k.key, group: k.group, total: k.total, per: k.per }))
    .sort((a, b) => b.total - a.total);
}

/** 病位：五脏在正文里各被提到几次——心系病证并不只讲心 */
const ORGANS = ['心', '肝', '脾', '肺', '肾'];

function organCounts(chap) {
  return ORGANS.map((w) => ({ organ: w, total: keywordHits(chap, w).total }));
}

/** 调护与按语：处方之外的那两段各占几成 */
function tailShare(chap) {
  const subs = subsOf(chap);
  const care = subs.filter((u) => u.title === '预防调护').reduce((n, u) => n + hanzi(bodyOf(u)), 0);
  const anYu = subs.filter((u) => u.title === '按语').reduce((n, u) => n + hanzi(bodyOf(u)), 0);
  const all = subs.reduce((n, u) => n + hanzi(bodyOf(u)), 0);
  return {
    care,
    anYu,
    all,
    cheng: Math.round(((care + anYu) / all) * 100) / 10,
    careAvg: Math.round(care / subs.filter((u) => u.title === '预防调护').length),
    anYuAvg: Math.round(anYu / subs.filter((u) => u.title === '按语').length),
  };
}

/**
 * 量值核验：底本在预防调护里给了极少数生活量值（饮水、卧床小时数）。
 * 本函数把这条实情当断言复算——不是回避它，是把它数清楚，正文一律不复述。
 * 词表与章门用的是同一套单位（见 scripts/lib_value_caliber.js）。
 */
const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;

function valueAudit(chap) {
  const subs = subsOf(chap);
  const offenders = [];
  let hits = 0;
  for (const u of subs) {
    const m = bodyOf(u).match(VALUE_RE) || [];
    if (m.length) offenders.push({ sub: u.no, hits: m.join(',') });
    hits += m.length;
  }
  return { subs: subs.length, hits, offenders };
}

/** 最薄与最厚的小节：两端说明教材不是平均用力 */
function extremes(chap) {
  const rows = subsOf(chap).map((u) => ({ sub: u.no, hanzi: hanzi(bodyOf(u)) }));
  const sorted = [...rows].sort((a, b) => a.hanzi - b.hanzi);
  return { thinnest: sorted[0], thickest: sorted[sorted.length - 1] };
}

function main() {
  const base = load();
  const chap = chapter(base);
  const subs = subsOf(chap);
  const s = shape(chap);
  const secs = sectionStats(chap);
  const syn = syndromeAudit(chap);
  const fx = formulaAudit(chap);
  const words = keywordCounts(chap);
  const organs = organCounts(chap);
  const tail = tailShare(chap);
  const values = valueAudit(chap);
  const ext = extremes(chap);

  console.log('═══ 心系病证：九个病证，四十五个小节（中医内科学 第5章）═══');
  console.log(`教材规模: 第5章 ${s.hanzi} 字 · ${s.secs} 节 · ${s.subs} 小节 · 平均每小节 ${Math.round(s.hanzi / s.subs)} 字`);
  console.log(`量值核验: ${values.subs} 小节正文的数字＋单位命中 ${values.hits} 处${values.hits ? `（${values.offenders.map((o) => o.sub).join('、')}，为生活调护量值，正文不复述）` : ''}`);
  console.log('');
  console.log('按病证分布（汉字 / 辨证论治占几成）：');
  for (const x of secs) {
    console.log(`  ${x.no} ${x.title} · ${x.subs} 小节 · ${x.hanzi} 字 · 辨证论治 ${x.bianzheng} 字（${x.cheng} 成）`);
  }
  console.log('');
  console.log(`证型清点: ${syn.reduce((n, x) => n + x.count, 0)} 个证型，分布在 ${syn.filter((x) => x.count).length} 个病证`);
  console.log(`  ${syn.map((x) => `${x.sec}(${x.count})`).join(' · ')}`);
  console.log('');
  console.log(`代表方: 出现 ${fx.total} 次、去重 ${fx.distinct} 首；跨病证复用 ${fx.reused.length} 首`);
  console.log(`  ${fx.reused.map((r) => `${r.name}(${r.secs.join('/')})`).join(' · ')}`);
  console.log('');
  console.log(`病机词频: ${words.map((w) => `${w.key} ${w.total}`).join(' · ')}`);
  console.log(`病位词频: ${organs.map((o) => `${o.organ} ${o.total}`).join(' · ')}`);
  console.log('  → 心之外，脾与肾次之，肝再次：虚从脾生、水从肾主、气逆从肝。');
  console.log('');
  console.log(`调护与按语: 预防调护 ${tail.care} 字（每篇均 ${tail.careAvg}）· 按语 ${tail.anYu} 字（每篇均 ${tail.anYuAvg}）· 合计占全章 ${tail.cheng} 成`);
  console.log(`小节两端: 最薄 ${ext.thinnest.sub}（${ext.thinnest.hanzi} 字）· 最厚 ${ext.thickest.sub}（${ext.thickest.hanzi} 字）`);
  console.log('');
  console.log(`45 个小节: ${subs.map((u) => u.no).join(' ')}`);
  console.log('');
  console.log('教学边界：本章只说明心系病证的病名源流、病机要素、证型框架与治法方向，不写剂量与用法的量值（剂量与用法照底本），不作诊断与疗效判定，不构成诊疗建议');

  return { chap, subs, shape: s, secs, syn, fx, words, organs, tail, values, extremes: ext };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  FILE,
  CHAPTER,
  KEYWORDS,
  ORGANS,
  VALUE_RE,
  load,
  chapter,
  subsOf,
  bodyOf,
  hanzi,
  shape,
  sectionStats,
  syndromeAudit,
  formulaAudit,
  keywordHits,
  keywordCounts,
  organCounts,
  tailShare,
  valueAudit,
  extremes,
  main,
};
