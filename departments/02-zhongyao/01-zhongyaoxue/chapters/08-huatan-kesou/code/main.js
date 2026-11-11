'use strict';
/**
 * 第 8 章 · 化痰止咳平喘药（教材·第21章）
 *
 *   node code/main.js
 *   node --test code/main.test.js
 *
 * 口径（全部现算，不写死统计结果）：
 *   规模   底本.json chapters[no=21].counts → 3 节 / 25 小节 / 75 段 / 4306 字
 *   四气   drugs.json nature.qi 原样取值；本章含「大寒」1 味（葶苈子）
 *   五味   nature.wei 原样取值，含「微苦」「涩」，不并入「苦」
 *   归经   nature.guijing 原样取值；本章有 4 味不归肺
 *   毒性   有大毒 > 有小毒 > 有毒 > 无毒
 *   禁忌   /孕妇[^。；]*?(禁用|忌用|慎用)/ 四值（含未标注）
 *   称号   正文里带「要药」的短语
 *
 * 本章最值得演示的一件事：四气词表漏掉「大寒」，葶苈子就会读成空 —— 空值是解析缺口，
 * 不是教材缺口。main() 里用两套词表跑同一批药，把差值打出来。
 */

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '21';

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
const bodyOf = (name) => {
  const u = units().find((x) => x.name === name);
  if (!u) throw new Error(`第 ${CHAPTER} 章没有 ${name}`);
  return u.paras.join('');
};

const QI_ORDER = ['大寒', '寒', '微寒', '凉', '平', '微温', '温', '热', '大热'];
/** 四气词表：教科书常见版漏了「大寒」，README 第 4 坑记的就是这条 */
const QI_VOCAB_FULL = ['寒', '凉', '平', '温', '热', '大寒', '微寒', '微温'];
const QI_VOCAB_SHORT = ['寒', '凉', '平', '温', '热', '微寒', '微温'];

function qiDist(no = CHAPTER) {
  const m = new Map();
  for (const d of drugsOf(no)) m.set(d.nature.qi, (m.get(d.nature.qi) || 0) + 1);
  return [...m.entries()].sort((a, b) => QI_ORDER.indexOf(a[0]) - QI_ORDER.indexOf(b[0]));
}

/** 用指定词表读四气：词表里没有的值读成空 —— 空值就是解析缺口 */
function qiByVocab(vocab, no = CHAPTER) {
  return drugsOf(no).map((d) => ({ name: d.name, qi: vocab.includes(d.nature.qi) ? d.nature.qi : null }));
}

function weiDist(no = CHAPTER) {
  const m = new Map();
  for (const d of drugsOf(no)) for (const w of d.nature.wei) m.set(w, (m.get(w) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
}

function jingDist(no = CHAPTER) {
  const m = new Map();
  for (const d of drugsOf(no)) for (const j of d.nature.guijing) m.set(j, (m.get(j) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
}

/** 不归肺经的药：名字带「化痰/止咳」不等于靶点在肺 */
const withoutLung = (no = CHAPTER) => drugsOf(no).filter((d) => !d.nature.guijing.includes('肺'));

const toxicOf = (name) => {
  const t = bodyOf(name);
  if (/有大毒/.test(t)) return '大毒';
  if (/有小毒/.test(t)) return '小毒';
  if (/有毒/.test(t)) return '有毒';
  return '无毒';
};
const pregNaive = (name) => {
  const t = bodyOf(name);
  if (t.includes('孕妇禁用')) return '禁用';
  if (t.includes('孕妇忌用')) return '忌用';
  if (t.includes('孕妇慎用')) return '慎用';
  return '未标注';
};
const pregTolerant = (name) => {
  const m = bodyOf(name).match(/孕妇[^。；]*?(禁用|忌用|慎用)/);
  return m ? m[1] : '未标注';
};

function badges(no = CHAPTER) {
  const out = [];
  for (const u of units(no)) {
    for (const m of u.paras.join('').matchAll(/([\u4e00-\u9fa5、]{2,14}要药)/g)) {
      if (!out.some((x) => x.name === u.name && x.badge === m[1])) out.push({ name: u.name, sec: u.sec, badge: m[1] });
    }
  }
  return out;
}

function secStats(no = CHAPTER) {
  return chapter(no).secs.map((s) => ({
    sec: s.no,
    title: s.title,
    herbs: s.subs.length,
    paras: s.subs.reduce((n, u) => n + u.paras.length, 0),
    chars: s.subs.reduce((n, u) => n + u.paras.join('').length, 0),
  }));
}

const tally = (arr) => {
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const fmt = (pairs) => pairs.map(([k, v]) => `${k} ${v}`).join(' · ');
const byQi = (qi) => drugsOf().filter((d) => d.nature.qi === qi).map((d) => d.name);

function main() {
  const c = chapter();
  const st = secStats();
  console.log(`化痰止咳平喘药（教材·第${c.no}章）`);
  console.log(`规模：${c.counts.secs} 节 / ${c.counts.subs} 小节 / ${c.counts.paras} 段 / ${c.counts.chars} 字 / ${drugsOf().length} 味`);
  console.log(`四气：${fmt(qiDist())}`);
  console.log(`五味：${fmt(weiDist())}`);
  console.log(`归经：${fmt(jingDist())}`);
  const nl = withoutLung();
  console.log(`归肺：${drugsOf().length - nl.length}/${drugsOf().length}；不归肺 ${nl.length} 味：${nl.map((d) => `${d.name}(${d.nature.guijing.join('·')})`).join('、')}`);
  const tox = tally(units().map((u) => toxicOf(u.name)));
  console.log(`毒性：${fmt(tox)}（有毒/小毒：${units().filter((u) => toxicOf(u.name) !== '无毒').map((u) => u.name).join('、')}）`);
  const preg = tally(units().map((u) => pregTolerant(u.name)));
  console.log(`妊娠禁忌：${fmt(preg)}`);
  const short = qiByVocab(QI_VOCAB_SHORT).filter((x) => x.qi === null).map((x) => x.name);
  console.log(`四气词表自检：全词表读空 ${qiByVocab(QI_VOCAB_FULL).filter((x) => x.qi === null).length} 味；漏「大寒」后读空 ${short.length} 味（${short.join('、')}）`);
  console.log(`  · 空值是解析缺口，不是教材缺口：教材·第21章·21.3.8 写的是「性大寒」`);
  console.log('节 × 规模：');
  for (const s of st) console.log(`  ${s.sec} ${s.title.padEnd(6, '　')} ${s.herbs} 味 ${String(s.paras).padStart(2)} 段 ${s.chars} 字`);
  console.log(`  · 逐节字数相加 = ${st.reduce((n, s) => n + s.chars, 0)}，与章 counts.chars ${c.counts.chars} ${st.reduce((n, s) => n + s.chars, 0) === c.counts.chars ? '一致' : '不一致'}`);
  const bd = badges();
  const bdHerbs = [...new Set(bd.map((b) => b.name))];
  console.log(`教材定位语「××要药」${bd.length} 条 / ${bdHerbs.length} 味（${bdHerbs.length}/${drugsOf().length}）`);
  const bySec = st.map((s) => `${s.sec} ${bd.filter((b) => b.sec === s.sec).length} 条`).join(' · ');
  console.log(`  分布：${bySec}`);
  console.log(`抽查：${bodyOf('葶苈子').slice(0, 40)}……`);
  console.log(`  → 气 ${drug('葶苈子').nature.qi}；味 ${drug('葶苈子').nature.wei.join('、')}；归 ${drug('葶苈子').nature.guijing.join('、')}；妊娠 ${pregTolerant('葶苈子')}`);
  console.log('教学边界：本章只演示教材文本的结构化与解析口径，不含剂量、炮制、配伍与辨证，不构成用药依据。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, ROOT, chapter, units, drugsOf, drug, bodyOf, qiDist, qiByVocab, weiDist, jingDist,
  withoutLung, toxicOf, pregNaive, pregTolerant, badges, secStats,
  QI_ORDER, QI_VOCAB_FULL, QI_VOCAB_SHORT,
};
