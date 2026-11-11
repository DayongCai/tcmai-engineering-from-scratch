'use strict';
/**
 * 第 10 章 · 肢体经络病证 —— 五个病证，五格一模一样的骨架
 *
 *   node code/main.js
 *
 * 数据：standards/neike/底本.json 第 10 章（qhzy-中医内科学.xlsx · 表「10 肢体经络病证」）
 * 唯一来源，全部现算；docs/zh.md 里的每个数都是这里打印出来的。
 *
 * 口径：
 *   · 本章骨架极端规整：五个病证，每个都是「概述 / 病因病机 / 辨证论治 / 预防调护 / 按语」五格。
 *     与第 9 章（血证 11、虚劳 9）形成对照 —— 规整不等于简单，规整意味着**没有二次分轴**，
 *     所有证型都平铺在唯一的「辨证论治」小节里。
 *   · 证—方对仍以「代表方：」为锚（第 9 章同一套取法），证名以「X证。」句首回取。
 *   · 定义句：概述的第一句，用「。」切。五个病证的接口各是一句，句句都以「是/是指」起。
 *   · 字数分布：五节辨证论治占全章正文的比例，是这一章「证型密度」的直接指标。
 *   · 底本量值 0：本章正文没有一处剂量或计量，A 支形状（但章门按全书统一口径走 B 支，见 docs）。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/neike/底本.json'), 'utf8'));
const NO = 10;

const FANG = /代表方[：:]([^（(]{1,24})/;
const ZHENG = /([\u4e00-\u9fa5]{2,8}证)。/g;
const SRC = /《([^》]{2,20})》/;
const VALUE = /\d+(?:\.\d+)?\s*(?:mg|μg|g|kg|ml|mL|L|克|钱|两|枚|片|粒|丸|剂|次|日|天|周|个月|年|小时|分钟)/g;
const SLOT = ['概述', '病因病机', '辨证论治', '预防调护', '按语'];

function chap() {
  const c = BASE.chapters.find((x) => x.no === NO);
  if (!c) throw new Error(`底本里没有第 ${NO} 章`);
  return c;
}
const subs = () => chap().secs.flatMap((s) => s.subs.map((u) => ({ ...u, sec: s.no, secTitle: s.title })));

function shape() {
  const c = chap();
  return {
    no: c.no,
    title: c.title,
    secs: c.secs.length,
    subs: c.secs.reduce((n, s) => n + s.subs.length, 0),
    hanzi: c.counts.hanzi,
    valueLike: c.counts.valueLike,
  };
}

/** 骨架是否同构：每节的小节标题序列是否全等于 SLOT */
function skeleton() {
  return chap().secs.map((s) => ({
    no: s.no,
    title: s.title,
    titles: s.subs.map((u) => u.title),
    regular: s.subs.length === SLOT.length && s.subs.every((u, i) => u.title === SLOT[i]),
  }));
}

/** 五节辨证论治的字数占比：证型密度 */
function density() {
  const c = chap();
  const total = c.secs.reduce((n, s) => n + s.subs.reduce((m, u) => m + u.items[0].body.length, 0), 0);
  const rows = c.secs.map((s) => {
    const bz = s.subs.find((u) => u.title === '辨证论治');
    const own = s.subs.reduce((m, u) => m + u.items[0].body.length, 0);
    return {
      no: s.no,
      title: s.title,
      chars: own,
      bzChars: bz ? bz.items[0].body.length : 0,
      share: Number((own / total * 100).toFixed(1)),
      bzShare: bz ? Number((bz.items[0].body.length / own * 100).toFixed(1)) : 0,
    };
  });
  const bzTotal = c.secs.reduce((n, s) => {
    const bz = s.subs.find((u) => u.title === '辨证论治');
    return n + (bz ? bz.items[0].body.length : 0);
  }, 0);
  return { total, bzTotal, bzPct: Number((bzTotal / total * 100).toFixed(1)), rows };
}

/** 定义句：每个概述的第一句 */
function definitions() {
  return chap().secs.map((s) => {
    const g = s.subs.find((u) => u.title === '概述').items[0].body;
    const m = /^(.{6,160}?。)/.exec(g);
    return { no: s.no, disease: s.title, sentence: m ? m[1] : g.slice(0, 120) };
  });
}

function pairs() {
  const out = [];
  for (const u of subs()) {
    if (u.title !== '辨证论治') continue;
    const body = u.items[0].body;
    const marks = [...body.matchAll(/代表方[：:]/g)];
    let prev = 0;
    for (const m of marks) {
      const before = body.slice(prev, m.index);
      const zs = [...before.matchAll(ZHENG)];
      const zheng = zs.length ? zs[zs.length - 1][1] : '（未取到证名）';
      const tail = body.slice(m.index);
      const fang = ((FANG.exec(tail) || [])[1] || '（未取到方名）').trim();
      const srcm = SRC.exec(tail.slice(0, 60));
      out.push({ sub: u.no, sec: u.sec, disease: u.secTitle, zheng, fang, src: srcm ? srcm[1] : '' });
      prev = m.index;
    }
  }
  return out;
}

function zhengPerDisease() {
  const p = pairs();
  return chap().secs.map((s) => ({
    no: s.no,
    title: s.title,
    zheng: p.filter((x) => x.sec === s.no).length,
  }));
}

/** 方名跨病复用（本章预期多数为单次出现） */
function formulaSpread() {
  const by = new Map();
  for (const p of pairs()) {
    const key = p.fang.replace(/加减$/, '');
    if (!by.has(key)) by.set(key, { fang: key, hits: [], diseases: new Set() });
    by.get(key).hits.push(p.sub);
    by.get(key).diseases.add(p.disease);
  }
  return [...by.values()]
    .map((e) => ({ fang: e.fang, n: e.hits.length, diseases: [...e.diseases], diseaseCount: e.diseases.size }))
    .sort((a, b) => b.diseaseCount - a.diseaseCount || b.n - a.n);
}

/** 证名跨病重现 */
function syndromeClash() {
  const by = new Map();
  for (const p of pairs()) {
    if (!by.has(p.zheng)) by.set(p.zheng, []);
    by.get(p.zheng).push(p);
  }
  return [...by.entries()]
    .filter(([, arr]) => arr.length > 1)
    .map(([zheng, arr]) => ({ zheng, n: arr.length, where: arr.map((a) => `${a.sub}${a.disease}`) }));
}

/** 按语里的治则句与边界句：关键词计数，不做语义判断 */
function maxims() {
  const words = [
    '治痿独取阳明', '诸风掉眩', '腰为肾之府', '肾虚为本',
    '顾护脾胃', '顾护胃气', '不可一味',
    // 五节按语各自都写了一句疗效评价的审慎声明 —— 这是本章自带的边界层
    '疗效评价', '力戒夸大', '中西医结合', '转诊',
  ];
  const text = subs().filter((u) => u.title === '按语').map((u) => u.items[0].body).join('\n');
  return words.map((w) => ({ w, n: (text.match(new RegExp(w, 'g')) || []).length })).filter((x) => x.n);
}

/** 底本量值：本章预期 0 */
function values() {
  const rows = [];
  for (const u of subs()) {
    const hits = u.items[0].body.match(VALUE) || [];
    if (hits.length) rows.push({ sub: u.no, hits });
  }
  return rows;
}

function totals() {
  const p = pairs();
  return {
    ...shape(),
    pairs: p.length,
    distinctZheng: new Set(p.map((x) => x.zheng)).size,
    distinctFang: new Set(p.map((x) => x.fang)).size,
    regular: skeleton().filter((s) => s.regular).length,
  };
}

if (require.main === module) {
  const t = totals();
  console.log('');
  console.log('═══ 中医内科学 · 第 10 章 肢体经络病证 ═══');
  console.log(`  底本：${t.title} · 节 ${t.secs} · 小节 ${t.subs} · ${t.hanzi} 汉字 · 量值 ${t.valueLike}`);
  console.log(`  骨架规整：${t.regular}/${t.secs} 节的小节序列完全相同（概述·病因病机·辨证论治·预防调护·按语）`);
  console.log(`  证—方对 ${t.pairs} 个 · 证名去重 ${t.distinctZheng} · 方名去重 ${t.distinctFang}`);

  console.log('\n── 五格骨架 ──');
  for (const s of skeleton()) console.log(`  ${s.no} ${s.title}：${s.titles.join(' / ')}${s.regular ? '' : '（不规整）'}`);

  const d = density();
  console.log('\n── 字数分布 ──');
  console.log(`  全章正文 ${d.total} 字；辨证论治五节合计 ${d.bzTotal} 字，占 ${d.bzPct}%`);
  for (const r of d.rows) console.log(`  ${r.no} ${r.title}：${r.chars} 字（占 ${r.share}%），其中辨证论治 ${r.bzChars} 字（占本节 ${r.bzShare}%）`);

  console.log('\n── 五个定义句 ──');
  for (const x of definitions()) console.log(`  ${x.no} ${x.disease}：${x.sentence}`);

  console.log('\n── 证—方对 ──');
  for (const p of pairs()) console.log(`  ${p.sub} ${p.disease} · ${p.zheng} → ${p.fang}（${p.src || '出处未标'}）`);

  console.log('\n── 每病证数 ──');
  for (const r of zhengPerDisease()) console.log(`  ${r.no} ${r.title}：证 ${r.zheng}`);

  const sp = formulaSpread();
  console.log('\n── 方：跨病复用 ──');
  const multi = sp.filter((x) => x.diseaseCount > 1);
  console.log(`  方名去重 ${sp.length}，跨病 ${multi.length}：${multi.map((x) => `${x.fang}(${x.n}处/${x.diseaseCount}病)`).join('、') || '无'}`);
  console.log(`  单病专用 ${sp.filter((x) => x.diseaseCount === 1).length}`);

  console.log('\n── 证名跨病重现 ──');
  const cl = syndromeClash();
  if (!cl.length) console.log('  无');
  for (const c of cl) console.log(`  ${c.zheng} × ${c.n}（${c.where.join('、')}）`);

  console.log('\n── 按语治则句频次 ──');
  for (const m of maxims()) console.log(`  ${m.w} × ${m.n}`);

  const vs = values();
  console.log(`\n── 底本量值：${vs.length} 小节命中 ──`);
  for (const v of vs) console.log(`  ${v.sub}：${v.hits.join('、')}`);
  console.log('');
  console.log('  教学边界：本章输出为教材文本结构与证—方归属统计，逐条可回查底本.json；剂量照底本、不构成诊断与用药依据。');
}

module.exports = {
  BASE, NO, chap, subs, shape, skeleton, density, definitions, pairs,
  zhengPerDisease, formulaSpread, syndromeClash, maxims, values, totals,
};
