'use strict';
/**
 * 第 7 章 · 活血化瘀药（教材·第20章）
 *
 * 从 standards/zhongyao 的两个 JSON 现算，不写死任何统计结果：
 *   规模    底本.json  chapters[no=20].counts  → 4 节 / 23 小节 / 69 段 / 4184 字
 *   四气    drugs.json nature.qi 原样取值（微寒、微温 不压平）
 *   归经    drugs.json nature.guijing 原样取值
 *   毒性    正文关键词：有大毒 > 有小毒 > 有毒 > 无毒
 *   禁忌    容错正则 /孕妇[^。；]*?(禁用|忌用|慎用)/ —— 朴素子串会漏「孕妇及月经过多者忌用」
 *   称号    正文里带「要药」的短语，是教材的定位语，不是疗效排名
 *
 *   node code/main.js
 *   node --test code/main.test.js
 */

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '20';

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'zhongyao', '底本.json'))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error('找不到仓库根：从 code/ 向上 8 层没有 standards/zhongyao/底本.json');
}
const ROOT = findRoot(__dirname);
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const loadText = () => readJson(path.join(ROOT, 'standards', 'zhongyao', '底本.json'));
const loadDrugs = () => readJson(path.join(ROOT, 'standards', 'zhongyao', 'drugs.json')).drugs;

function chapter(no = CHAPTER) {
  const c = loadText().chapters.find((x) => x.no === no);
  if (!c) throw new Error(`教材里没有第 ${no} 章`);
  return c;
}

/** 章内小节扁平化：一节一药，每药三段（来源性味归经 / 功效主治 / 用法注意） */
function units(no = CHAPTER) {
  const out = [];
  for (const s of chapter(no).secs) {
    for (const u of s.subs) {
      out.push({ sec: s.no, secTitle: s.title, sub: u.no, name: u.title, paras: u.paras });
    }
  }
  return out;
}

const drugsOf = (no = CHAPTER) => loadDrugs().filter((d) => d.chapter === no);
const drug = (name) => {
  const d = loadDrugs().find((x) => x.name === name);
  if (!d) throw new Error(`drugs.json 里没有 ${name}`);
  return d;
};

const QI_ORDER = ['寒', '凉', '平', '温', '热', '大寒', '大热', '微寒', '微温'];
function qiDist(no = CHAPTER) {
  const m = new Map();
  for (const d of drugsOf(no)) m.set(d.nature.qi, (m.get(d.nature.qi) || 0) + 1);
  return [...m.entries()].sort((a, b) => QI_ORDER.indexOf(a[0]) - QI_ORDER.indexOf(b[0]));
}

function jingDist(no = CHAPTER) {
  const m = new Map();
  for (const d of drugsOf(no)) for (const j of d.nature.guijing) m.set(j, (m.get(j) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
}

const paraOf = (name, i) => {
  const u = units().find((x) => x.name === name);
  if (!u) throw new Error(`第 ${CHAPTER} 章没有 ${name}`);
  return u.paras[i];
};
const bodyOf = (name) => units().find((x) => x.name === name).paras.join('');

const toxicOf = (name) => {
  const t = bodyOf(name);
  if (/有大毒/.test(t)) return '大毒';
  if (/有小毒/.test(t)) return '小毒';
  if (/有毒/.test(t)) return '有毒';
  return '无毒';
};

/** 朴素子串：教材原文写的是「孕妇忌用」「孕妇慎用」才命中 */
function pregNaive(name) {
  const t = bodyOf(name);
  if (t.includes('孕妇禁用')) return '禁用';
  if (t.includes('孕妇忌用')) return '忌用';
  if (t.includes('孕妇慎用')) return '慎用';
  return '未标注';
}

/** 容错正则：允许「孕妇及月经过多者忌用」「孕妇及无瘀滞者忌用」这类插入语 */
function pregTolerant(name) {
  const m = bodyOf(name).match(/孕妇[^。；]*?(禁用|忌用|慎用)/);
  return m ? m[1] : '未标注';
}

/** 教材的「××要药」定位语，按小节收一遍 */
function badges(no = CHAPTER) {
  const out = [];
  for (const u of units(no)) {
    for (const m of u.paras.join('').matchAll(/([\u4e00-\u9fa5、]{2,14}要药)/g)) {
      if (!out.some((x) => x.name === u.name && x.badge === m[1])) out.push({ name: u.name, badge: m[1] });
    }
  }
  return out;
}

/** 「破血」是力度词，看它落在哪些节 —— 与节标题并不完全对齐 */
function breakBlood(no = CHAPTER) {
  return units(no).filter((u) => u.paras.join('').includes('破血')).map((u) => ({ name: u.name, sec: u.sec }));
}

/** 节级规模：段数与字数，字数逐节相加应等于章 counts.chars */
function secStats(no = CHAPTER) {
  return chapter(no).secs.map((s) => {
    const paras = s.subs.reduce((n, u) => n + u.paras.length, 0);
    const chars = s.subs.reduce((n, u) => n + u.paras.join('').length, 0);
    return { sec: s.no, title: s.title, herbs: s.subs.length, paras, chars };
  });
}

const tally = (arr) => {
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const fmt = (pairs) => pairs.map(([k, v]) => `${k} ${v}`).join(' · ');

function main() {
  const c = chapter();
  const st = secStats();
  console.log(`活血化瘀药（教材·第${c.no}章）`);
  console.log(`规模：${c.counts.secs} 节 / ${c.counts.subs} 小节 / ${c.counts.paras} 段 / ${c.counts.chars} 字 / ${drugsOf().length} 味`);
  console.log(`四气：${fmt(qiDist())}`);
  console.log(`归经：${fmt(jingDist().slice(0, 6))}`);
  const tox = tally(units().map((u) => toxicOf(u.name)));
  const bigTox = units().filter((u) => toxicOf(u.name) === '大毒').map((u) => u.name).join('、');
  console.log(`毒性：${fmt(tox)}（大毒：${bigTox}）`);
  const tol = tally(units().map((u) => pregTolerant(u.name)));
  const gap = units().filter((u) => pregNaive(u.name) !== pregTolerant(u.name)).map((u) => u.name);
  console.log(`妊娠禁忌：${fmt(tol)}`);
  console.log(`  · 朴素子串「孕妇忌用」只捞到 ${units().filter((u) => pregNaive(u.name) === '忌用').length} 味，容错正则捞到 ${units().filter((u) => pregTolerant(u.name) === '忌用').length} 味；差 ${gap.length} 味：${gap.join('、')}`);
  console.log(`  · 差在教材把禁忌写成了「孕妇及月经过多者忌用」这类插入语，子串匹配看不见`);
  const bb = breakBlood();
  const bySec = new Map();
  for (const x of bb) bySec.set(x.sec, [...(bySec.get(x.sec) || []), x.name]);
  console.log(`「破血」${bb.length} 味 / 跨 ${bySec.size} 节：${[...bySec.entries()].map(([s, n]) => `${s} ${n.join('、')}`).join('；')}`);
  console.log('节 × 规模：');
  for (const s of st) console.log(`  ${s.sec} ${s.title.padEnd(6, '　')} ${s.herbs} 味 ${String(s.paras).padStart(2)} 段 ${s.chars} 字`);
  console.log(`  · 逐节字数相加 = ${st.reduce((n, s) => n + s.chars, 0)}，与章 counts.chars ${c.counts.chars} ${st.reduce((n, s) => n + s.chars, 0) === c.counts.chars ? '一致' : '不一致'}`);
  const bd = badges();
  console.log(`教材定位语「××要药」${bd.length} 条：${bd.map((b) => `${b.name}=${b.badge}`).join('、')}`);
  console.log(`抽查：${paraOf('丹参', 0).slice(0, 46)}……`);
  console.log(`  → 气 ${drug('丹参').nature.qi}；味 ${drug('丹参').nature.wei.join('、')}；归 ${drug('丹参').nature.guijing.join('、')}；妊娠 ${pregTolerant('丹参')}`);
  console.log('教学边界：本章只演示把教材文本结构化成可核对的统计口径，不含剂量、炮制、配伍与辨证，不构成用药依据。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, ROOT, chapter, units, drugsOf, drug, qiDist, jingDist, paraOf, bodyOf,
  toxicOf, pregNaive, pregTolerant, badges, breakBlood, secStats, QI_ORDER,
};
