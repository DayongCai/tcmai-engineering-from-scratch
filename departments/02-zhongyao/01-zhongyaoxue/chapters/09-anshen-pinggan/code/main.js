'use strict';
/**
 * 第 9 章 · 安神药 + 平肝息风药 + 开窍药（教材·第22/23/24章）
 *
 *   node code/main.js
 *   node --test code/main.test.js
 *
 * 口径（全部现算）：
 *   规模   三章 counts 相加 → 5 节 / 26 小节 / 78 段 / 4923 字 / 26 味
 *   靶经   每章「归经覆盖最高的一条经」——22 心、23 肝、24 心
 *   四气   nature.qi 原样，含「微寒」「微温」「凉」
 *   缺口   nature.wei 或 nature.guijing 为空的药，单列成缺失，不补、不推断
 *   毒性   有大毒 > 有小毒 > 有毒 > 无毒
 *   禁忌   /孕妇[^。；]*?(禁用|忌用|慎用)/ 四值（含未标注）
 *
 * 本章唯一的真实数据缺口是龙骨：教材段在「性平」处断了，drugs.json 因此无味无归经。
 * 程序把它标成 missing，而不是猜一个「甘、涩，归心、肝经」补上 —— 补出来的字段无法溯源。
 */

const fs = require('node:fs');
const path = require('node:path');

const CHAPTERS = ['22', '23', '24'];

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

function chapter(no) {
  const c = loadText().chapters.find((x) => x.no === no);
  if (!c) throw new Error(`教材里没有第 ${no} 章`);
  return c;
}

/** 三章小节扁平化，带上章号 */
function unitsAll(nos = CHAPTERS) {
  const out = [];
  for (const no of nos) {
    for (const s of chapter(no).secs) {
      for (const u of s.subs) {
        out.push({ chapter: no, sec: s.no, secTitle: s.title, sub: u.no, name: u.title, paras: u.paras });
      }
    }
  }
  return out;
}

const drugsAll = (nos = CHAPTERS) => loadDrugs().filter((d) => nos.includes(d.chapter));
const drug = (name) => {
  const d = loadDrugs().find((x) => x.name === name);
  if (!d) throw new Error(`drugs.json 里没有 ${name}`);
  return d;
};
const bodyOf = (name) => {
  const u = unitsAll().find((x) => x.name === name);
  if (!u) throw new Error(`第 ${CHAPTERS.join('/')} 章没有 ${name}`);
  return u.paras.join('');
};

const QI_ORDER = ['大寒', '寒', '微寒', '凉', '平', '微温', '温', '热', '大热'];
function qiDist(nos = CHAPTERS) {
  const m = new Map();
  for (const d of drugsAll(nos)) m.set(d.nature.qi, (m.get(d.nature.qi) || 0) + 1);
  return [...m.entries()].sort((a, b) => QI_ORDER.indexOf(a[0]) - QI_ORDER.indexOf(b[0]));
}
function jingDist(nos = CHAPTERS) {
  const m = new Map();
  for (const d of drugsAll(nos)) for (const j of d.nature.guijing) m.set(j, (m.get(j) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
}
const weiDist = (nos = CHAPTERS) => {
  const m = new Map();
  for (const d of drugsAll(nos)) for (const w of d.nature.wei) m.set(w, (m.get(w) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
};

/** 每章规模：节 / 小节 / 段 / 字，逐章相加应等于三章 counts 之和 */
function chapterStats(nos = CHAPTERS) {
  return nos.map((no) => {
    const c = chapter(no);
    const subs = c.secs.reduce((n, s) => n + s.subs.length, 0);
    const paras = c.secs.reduce((n, s) => n + s.subs.reduce((m, u) => m + u.paras.length, 0), 0);
    const chars = c.secs.reduce((n, s) => n + s.subs.reduce((m, u) => m + u.paras.join('').length, 0), 0);
    return { no, title: c.title, secs: c.secs.length, subs, paras, chars, counts: c.counts };
  });
}

/** 靶经：某章归经覆盖最高的一条经，平手时按出现先后 */
function targetChannel(no) {
  const top = jingDist([no])[0];
  const n = drugsAll([no]).filter((d) => d.nature.guijing.includes(top[0])).length;
  return { jing: top[0], n, total: drugsAll([no]).length };
}

/** 数据缺口：味或归经为空 —— 标成缺失，不补 */
const missingNature = (nos = CHAPTERS) =>
  drugsAll(nos).filter((d) => d.nature.wei.length === 0 || d.nature.guijing.length === 0)
    .map((d) => ({ name: d.name, chapter: d.chapter, wei: d.nature.wei.length, guijing: d.nature.guijing.length }));

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

function badges(nos = CHAPTERS) {
  const out = [];
  for (const u of unitsAll(nos)) {
    for (const m of u.paras.join('').matchAll(/([\u4e00-\u9fa5、]{2,14}要药)/g)) {
      if (!out.some((x) => x.name === u.name && x.badge === m[1])) out.push({ name: u.name, chapter: u.chapter, badge: m[1] });
    }
  }
  return out;
}

const tally = (arr) => {
  const m = new Map();
  for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const fmt = (pairs) => pairs.map(([k, v]) => `${k} ${v}`).join(' · ');

function main() {
  const st = chapterStats();
  const tot = st.reduce((a, s) => ({
    secs: a.secs + s.secs, subs: a.subs + s.subs, paras: a.paras + s.paras, chars: a.chars + s.chars,
  }), { secs: 0, subs: 0, paras: 0, chars: 0 });
  console.log(`安神药 · 平肝息风药 · 开窍药（教材·第${CHAPTERS.join('/')}章）`);
  console.log(`规模：${tot.secs} 节 / ${tot.subs} 小节 / ${tot.paras} 段 / ${tot.chars} 字 / ${drugsAll().length} 味`);
  for (const s of st) console.log(`  ${s.no} ${s.title.padEnd(6, '　')} ${s.secs} 节 ${s.subs} 味 ${s.paras} 段 ${s.chars} 字`);
  console.log('靶经：');
  for (const no of CHAPTERS) {
    const t = targetChannel(no);
    console.log(`  ${no} ${chapter(no).title} → ${t.jing} ${t.n}/${t.total}`);
  }
  console.log(`四气：${fmt(qiDist())}`);
  console.log(`五味：${fmt(weiDist())}`);
  console.log(`归经（三章合并）：${fmt(jingDist())}`);
  const miss = missingNature();
  console.log(`数据缺口：${miss.length} 味 — ${miss.map((x) => `${x.name}（第${x.chapter}章，味 ${x.wei} 条、归经 ${x.guijing} 条）`).join('；')}`);
  console.log('  · 教材·第22章·22.1.3 龙骨的首段在「性平」处截断，故无味无归经；标为缺失，不补「甘、涩，归心、肝经」');
  console.log(`毒性：${fmt(tally(unitsAll().map((u) => toxicOf(u.name))))}（有毒/小毒：${unitsAll().filter((u) => toxicOf(u.name) !== '无毒').map((u) => u.name).join('、')}）`);
  console.log(`妊娠禁忌：${fmt(tally(unitsAll().map((u) => pregTolerant(u.name))))}`);
  const bd = badges();
  const bdHerbs = [...new Set(bd.map((b) => b.name))];
  console.log(`教材定位语「××要药」${bd.length} 条 / ${bdHerbs.length} 味：${bd.slice(0, 4).map((b) => `${b.name}=${b.badge}`).join('、')} …`);
  console.log(`抽查：${bodyOf('朱砂').slice(0, 40)}……`);
  console.log(`  → 气 ${drug('朱砂').nature.qi}；味 ${drug('朱砂').nature.wei.join('、')}；归 ${drug('朱砂').nature.guijing.join('、')}；毒性 ${toxicOf('朱砂')}；妊娠 ${pregTolerant('朱砂')}`);
  console.log('教学边界：本章只做教材文本的结构化、缺口标注与统计口径演示，不含剂量、炮制、配伍与辨证，不构成用药依据。');
}

if (require.main === module) main();

module.exports = {
  CHAPTERS, ROOT, chapter, unitsAll, drugsAll, drug, bodyOf, qiDist, jingDist, weiDist,
  chapterStats, targetChannel, missingNature, toxicOf, pregNaive, pregTolerant, badges, QI_ORDER,
};
