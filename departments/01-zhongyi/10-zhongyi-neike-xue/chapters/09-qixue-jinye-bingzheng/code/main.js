'use strict';
/**
 * 第 9 章 · 气血津液病证 —— 章的可枚举单位是「证」，不是「小节」
 *
 *   node code/main.js
 *
 * 数据：standards/neike/底本.json（qhzy-中医内科学.xlsx · 表「9 气血津液病证」）
 * 唯一来源。本文件不抄任何数字，全部现算；docs/zh.md 里的每个数都是这里打印出来的。
 *
 * 口径（改一条就要同步改 docs 与 main.test.js）：
 *   · 节 = secs[]，小节 = subs[]，小节下各挂 1 个 item（正文）。
 *     本章 9 节 55 小节，但「小节」是**容器**：血证与虚劳用「(部位|虚类)证治」再分一层，
 *     其余七个病证把全部证型平铺在「辨证论治」一节里。
 *   · 可枚举单位取「代表方：」锚点：底本每写一个证，就写一次「治法：…代表方：…」。
 *     71 个锚点 = 71 个证—方对。这个数不是小节数（55），也不是病数（9）。
 *   · 证名用「X证。」句首回取，**只认 证治 / 辨证论治 小节**，且以「代表方」为右界，
 *     否则概述里的「……的一类病证。」会被误当成证名（初版就踩了这个坑）。
 *   · 证名不是主键：同名证跨病出现时代表方可以不同（胃热炽盛证在鼻衄用玉女煎、
 *     在消渴也用玉女煎，但气虚类证在血证与汗证两处都落到归脾汤而治法表述不同）。
 *     所以键必须是 (病, 证)，单靠证名归并会串病。
 *   · 剂量类数值（底本 valueLike）只数不解读：它们是教材原话里的用量，
 *     本章不把它们抽成结构化字段，也不在正文裸写。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/neike/底本.json'), 'utf8'));
const NO = 9;

const FANG = /代表方[：:]([^（(]{1,24})/;
const ZHENG = /([\u4e00-\u9fa5]{2,8}证)。/g;
const SRC = /《([^》]{2,20})》/;
/** 与 scripts/build_neike_diben.py 的 VALUE 同口径：这样「复算量值」能对上 counts.valueLike */
const VALUE = /\d+(?:\.\d+)?\s*(?:mg|μg|g|kg|ml|mL|L|克|钱|两|枚|片|粒|丸|剂|次|日|天|周|个月|年|小时|分钟)/g;
/** 证治类小节的标题特征：血证 6 个「(部位)证治」、虚劳 4 个「(虚类)证治」 */
const ZHENGZHI = /证治$/;
const BIANZHENG = /^辨证论治$/;
const BIANZHENGYAODIAN = /^辨证要点与治疗原则$/;

function chap() {
  const c = BASE.chapters.find((x) => x.no === NO);
  if (!c) throw new Error(`底本里没有第 ${NO} 章`);
  return c;
}
const subs = () => chap().secs.flatMap((s) => s.subs.map((u) => ({ ...u, sec: s.no, secTitle: s.title })));

/** 章的规模：节 / 小节 / 汉字 / 底本量值 */
function shape() {
  const c = chap();
  return {
    no: c.no,
    title: c.title,
    secs: c.secs.length,
    subs: c.secs.reduce((n, s) => n + s.subs.length, 0),
    hanzi: c.counts.hanzi,
    valueLike: c.counts.valueLike,
    secTable: c.secs.map((s) => ({ no: s.no, title: s.title, subs: s.subs.length })),
  };
}

/**
 * 槽位分类：概述 / 病因病机 / 辨证论治 / 辨证要点与治疗原则 / (X)证治 / 预防调护 / 按语
 * 返回每节的槽位序列，用来显示「血证、虚劳为什么多出一层」。
 */
function slots() {
  return chap().secs.map((s) => {
    const kinds = s.subs.map((u) => {
      if (u.title === '概述') return '概述';
      if (u.title === '病因病机') return '病因病机';
      if (BIANZHENG.test(u.title)) return '辨证论治';
      if (BIANZHENGYAODIAN.test(u.title)) return '辨证要点';
      if (ZHENGZHI.test(u.title)) return '证治';
      if (u.title === '预防调护') return '预防调护';
      if (u.title === '按语') return '按语';
      return '其他';
    });
    return { no: s.no, title: s.title, subs: s.subs.length, kinds, zhengzhi: kinds.filter((k) => k === '证治').length };
  });
}

/** 槽位词表的频次：一眼看出哪几个槽位是全章共有的骨架 */
function vocabulary() {
  const freq = new Map();
  for (const s of slots()) for (const k of s.kinds) freq.set(k, (freq.get(k) || 0) + 1);
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([kind, n]) => ({ kind, n }));
}

/**
 * 证—方对：以「代表方：」为锚，向左回取最近一个「X证。」作为证名。
 * 只扫 证治 / 辨证论治 两类小节 —— 其余小节没有证型清单。
 */
function pairs() {
  const out = [];
  for (const u of subs()) {
    if (!(ZHENGZHI.test(u.title) || BIANZHENG.test(u.title))) continue;
    const body = u.items[0].body;
    const marks = [...body.matchAll(/代表方[：:]/g)];
    if (!marks.length) continue;
    let prev = 0;
    for (const m of marks) {
      const before = body.slice(prev, m.index);
      const zs = [...before.matchAll(ZHENG)];
      const zheng = zs.length ? zs[zs.length - 1][1] : '（未取到证名）';
      const tail = body.slice(m.index);
      const fang = (FANG.exec(tail) || [])[1] || '（未取到方名）';
      const srcm = SRC.exec(tail.slice(0, 60));
      out.push({
        sub: u.no,
        sec: u.sec,
        disease: u.secTitle,
        container: u.title,
        zheng,
        fang: fang.trim(),
        src: srcm ? srcm[1] : '',
      });
      prev = m.index;
    }
  }
  return out;
}

/** 每个病证挂几个证；以及「一节里平铺」与「分证治小节」两种形状的分布 */
function zhengPerDisease() {
  const p = pairs();
  return chap().secs.map((s) => {
    const own = p.filter((x) => x.sec === s.no);
    return {
      no: s.no,
      title: s.title,
      subs: s.subs.length,
      zheng: own.length,
      dense: own.length ? Number((own.length / s.subs.length).toFixed(2)) : 0,
      shape: s.subs.some((u) => ZHENGZHI.test(u.title)) ? '二次分轴' : '一次平铺',
    };
  });
}

/** 方名的跨病复用：同一张方出现在几个病证、几处 */
function formulaSpread() {
  const by = new Map();
  for (const p of pairs()) {
    const key = p.fang.replace(/加减$/, '');
    if (!by.has(key)) by.set(key, { fang: key, hits: [], diseases: new Set() });
    const e = by.get(key);
    e.hits.push(p.sub);
    e.diseases.add(p.disease);
  }
  return [...by.values()]
    .map((e) => ({ fang: e.fang, n: e.hits.length, diseases: [...e.diseases], diseaseCount: e.diseases.size }))
    .sort((a, b) => b.diseaseCount - a.diseaseCount || b.n - a.n);
}

/** 只在单一病证里出现的方：换病即换方的部分；与上式互补地说明「方不是病的属性」 */
function singleUse() {
  const sp = formulaSpread();
  return { distinct: sp.length, multi: sp.filter((x) => x.diseaseCount > 1).length, single: sp.filter((x) => x.diseaseCount === 1).length };
}

/** 证名跨病重现：同名不等于同一条知识 */
function syndromeClash() {
  const by = new Map();
  for (const p of pairs()) {
    if (!by.has(p.zheng)) by.set(p.zheng, []);
    by.get(p.zheng).push(p);
  }
  return [...by.entries()]
    .filter(([, arr]) => arr.length > 1)
    .map(([zheng, arr]) => ({
      zheng,
      n: arr.length,
      where: arr.map((a) => `${a.sub}${a.disease}`),
      fangs: [...new Set(arr.map((a) => a.fang))],
      sameFang: new Set(arr.map((a) => a.fang)).size === 1,
    }))
    .sort((a, b) => b.n - a.n);
}

/** 底本里的量值落在哪些小节：只定位，不解读 */
function valueSpots() {
  const rows = [];
  for (const u of subs()) {
    const hits = u.items[0].body.match(VALUE) || [];
    if (hits.length) rows.push({ sub: u.no, title: u.title, hits });
  }
  return rows;
}

/** 按语里的「代价句」：底本自己承认的用药风险，用关键词计数，不做语义判断 */
function cautions() {
  const words = ['中病即止', '顾护胃气', '顾护脾胃', '不可过用', '不可一味', '忌用', '慎用', '伤阴', '碍胃'];
  const text = subs().filter((u) => u.title === '按语').map((u) => u.items[0].body).join('\n');
  return words.map((w) => ({ w, n: (text.match(new RegExp(w, 'g')) || []).length })).filter((x) => x.n);
}

function totals() {
  const p = pairs();
  return {
    ...shape(),
    pairs: p.length,
    diseases: chap().secs.length,
    distinctFang: new Set(p.map((x) => x.fang)).size,
    distinctZheng: new Set(p.map((x) => x.zheng)).size,
    zhengzhiSubs: subs().filter((u) => ZHENGZHI.test(u.title)).length,
    plainSubs: subs().filter((u) => BIANZHENG.test(u.title)).length,
  };
}

if (require.main === module) {
  const t = totals();
  console.log('');
  console.log('═══ 中医内科学 · 第 9 章 气血津液病证 ═══');
  console.log(`  底本：${t.title} · 节 ${t.secs} · 小节 ${t.subs} · ${t.hanzi} 汉字 · 量值 ${t.valueLike}`);
  console.log(`  可枚举单位：证—方对 ${t.pairs} 个（不是小节 ${t.subs}，也不是病 ${t.diseases}）`);
  console.log(`  证治小节 ${t.zhengzhiSubs} 个（血证 6 + 虚劳 4）· 平铺辨证论治小节 ${t.plainSubs} 个 · 辨证要点 2 个`);

  console.log('\n── 节—小节骨架 ──');
  for (const s of slots()) {
    console.log(`  ${s.no} ${s.title}：小节 ${s.subs}，证治容器 ${s.zhengzhi}`);
    console.log(`      槽位：${s.kinds.join(' / ')}`);
  }

  console.log('\n── 槽位词表（全章频次）──');
  for (const v of vocabulary()) console.log(`  ${v.kind} × ${v.n}`);

  console.log('\n── 每病的证数 ──');
  for (const r of zhengPerDisease()) {
    console.log(`  ${r.no} ${r.title}：小节 ${r.subs} · 证 ${r.zheng} · 证/小节 ${r.dense} · ${r.shape}`);
  }

  console.log('\n── 证—方对（前 12 条）──');
  for (const p of pairs().slice(0, 12)) console.log(`  ${p.sub} ${p.disease} · ${p.zheng} → ${p.fang}（${p.src || '出处未标'}）`);

  const sp = formulaSpread();
  console.log('\n── 方的跨病复用（≥2 病）──');
  for (const x of sp.filter((y) => y.diseaseCount > 1)) {
    console.log(`  ${x.fang}：${x.n} 处 / ${x.diseaseCount} 病（${x.diseases.join('、')}）`);
  }
  const su = singleUse();
  console.log(`  方名去重 ${su.distinct}：跨病复用 ${su.multi}，单病专用 ${su.single}`);

  console.log('\n── 证名跨病重现 ──');
  for (const c of syndromeClash()) {
    console.log(`  ${c.zheng} × ${c.n}（${c.where.join('、')}）→ ${c.fangs.join(' / ')}${c.sameFang ? '｜同方' : '｜异方'}`);
  }

  console.log('\n── 底本量值落点（只定位）──');
  const vs = valueSpots();
  console.log(`  小节数 ${vs.length} · 命中 ${vs.reduce((n, v) => n + v.hits.length, 0)} 处`);
  for (const v of vs) console.log(`  ${v.sub} ${v.title}：${v.hits.join('、')}`);

  console.log('\n── 按语里的代价句（关键词计数）──');
  for (const c of cautions()) console.log(`  ${c.w} × ${c.n}`);
  console.log('');
  console.log('  教学边界：本章输出为教材文本结构与证—方归属统计，逐条可回查底本.json；剂量照底本、不构成诊断与用药依据。');
}

module.exports = {
  BASE,
  NO,
  chap,
  subs,
  shape,
  slots,
  vocabulary,
  pairs,
  zhengPerDisease,
  formulaSpread,
  singleUse,
  syndromeClash,
  valueSpots,
  cautions,
  totals,
};
