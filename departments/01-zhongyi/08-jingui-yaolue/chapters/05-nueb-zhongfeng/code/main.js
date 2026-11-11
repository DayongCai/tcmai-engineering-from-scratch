'use strict';
/**
 * 第 5 章 · 疟病（节律）与中风历节（痹阻）
 *
 *   node code/main.js
 *
 * 数据：standards/jingui/底本.json（外源·笈成，sha256 见 standards/jingui/README.md）
 *
 * 口径（三条，任何一条改动都要同步 docs/zh.md）：
 *   · 方只统计**有方文**的（articles[].formulas[] 非空）。条文里提名的方、
 *     以及正文后「附方」段（牡蛎汤、侯氏黑散、风引汤、续命汤…）不计入方数。
 *     第 5 篇 10 条因此只有 2 方 —— 这是本章最容易被误报的数字。
 *   · 中风 / 历节的分界取篇内顺序：5.1–5.3 论中风，5.4–5.10 论历节。
 *     原文没有小标题，这个切法是本章按文义归纳的，边界写在 docs「代价与边界」。
 *   · 疟型只认原文点名的四个名号（疟母/瘅疟/温疟/牝疟）；4.1 是脉法总纲，
 *     不做归型 —— 给它硬塞一个型别就是把「辨脉」读成「辨病」。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));

const NUE_PIAN = 4;
const ZF_PIAN = 5;

const pianOf = (no) => {
  const p = BOOK.pian.find((x) => x.no === no);
  if (!p) throw new Error(`底本无第 ${no} 篇`);
  return p;
};
const tiaoOf = (no, tiao) => {
  const a = pianOf(no).articles.find((x) => x.tiao === tiao);
  if (!a) throw new Error(`底本无第 ${no} 篇第 ${tiao} 条`);
  return a;
};
/**
 * 主文 = 第一条空行之前的正文段。
 * 归型必须只看主文：4.5 的方后注里有「温疟加蜀漆半分」，
 * 用整条文本匹配会把牝疟条误判成温疟（实测踩过）。
 */
const mainText = (a) => a.zhHans.split('\n\n')[0];

const formulasOf = (p) => p.articles.flatMap((a) => a.formulas || []);
const herbsOf = (p) => formulasOf(p).flatMap((f) => f.ingredients.map((i) => i.herbSimp || i.herb));

// ─────────── 疟：四型与判据 ───────────
/**
 * 四型的判据全部取原文的「定义句」，不是后世注家的扩写。
 * 顺序 = 底本条序（4.2 疟母 → 4.3 瘅疟 → 4.4 温疟 → 4.5 牝疟），
 * 所以 nueType() 用「先命中先返回」，同一条不会被归两次。
 */
const NUE_TYPES = [
  {
    name: '疟母',
    tiao: '4.2',
    sign: '疟母',
    rule: '久疟不差，结为症瘕：以月计病程（一日发 → 十五日 → 当月尽解），逾期不愈即有形可据',
    fang: '鳖甲煎丸方',
  },
  {
    name: '瘅疟',
    tiao: '4.3',
    sign: '瘅疟',
    rule: '阴气孤绝、阳气独发；但热不寒，少气烦冤，手足热而欲呕，消铄脱肉',
    fang: null,
  },
  {
    name: '温疟',
    tiao: '4.4',
    sign: '温疟',
    rule: '脉如平而身无寒但热，骨节疼烦、时呕 —— 热在表而不在里，故脉不数',
    fang: '白虎加桂枝汤方',
  },
  {
    name: '牝疟',
    tiao: '4.5',
    sign: '牝疟',
    rule: '疟多寒 —— 只有「多寒」两字，是四型里判据最短的一条',
    fang: '蜀漆散方',
  },
];

/** 单条归型：命中 sign 即返回型名；4.1 这类纯脉法条返回「未分型」 */
function nueType(article) {
  const a = typeof article === 'string' ? tiaoOf(NUE_PIAN, article) : article;
  const text = mainText(a);
  for (const t of NUE_TYPES) if (text.includes(t.sign)) return t.name;
  return '未分型';
}

/** 逐条归型表（篇 4 全部 5 条，含未分型的 4.1） */
function nueTypes() {
  return pianOf(NUE_PIAN).articles.map((a) => ({
    tiao: a.tiao,
    type: nueType(a),
    fang: (a.formulas || []).map((f) => f.nameSimp),
  }));
}

// ─────────── 节律词 ───────────
/**
 * 疟篇真正可复算的「节律」只有时间词。这份词表是本章从原文里**抄出来的**，
 * 不是先验清单：每个词都能在本篇找到出处，找不到的（如「间日」）保留并记 0 ——
 * 记 0 才有信息量，删掉就等于假装本篇讲过间日疟。
 */
const RHYTHM_TERMS = ['一日发', '十五日', '当月尽解', '以月', '未发前', '临发时', '日三服', '时呕', '间日'];

/** 统计篇 4 各节律词的出现次数与所在条号 */
function jieLv() {
  const arts = pianOf(NUE_PIAN).articles;
  const terms = RHYTHM_TERMS.map((term) => {
    let count = 0;
    const tiao = [];
    for (const a of arts) {
      const n = a.zhHans.split(term).length - 1;
      if (n > 0) {
        count += n;
        tiao.push(a.tiao);
      }
    }
    return { term, count, tiao };
  });
  return {
    terms,
    total: terms.reduce((n, t) => n + t.count, 0),
    absent: terms.filter((t) => t.count === 0).map((t) => t.term),
    // 出现在条文（含方后注）里 vs 只出现在服法里，是两件事：
    // 「日三服」是给药节律，「一日发」才是病情节律。
    attack: terms.filter((t) => ['一日发', '十五日', '当月尽解', '以月'].includes(t.term)),
    dosing: terms.filter((t) => ['未发前', '临发时', '日三服'].includes(t.term)),
  };
}

// ─────────── 中风：四层 ───────────
/**
 * 5.2 的「在络 / 在经 / 入腑 / 入脏」是**病位深度**，不是病情轻重分级：
 * 原文给的是症状，没给预后排序。表里只放原文症状，另加一个「可验之处」，
 * 全部由条文本身可读，不引入后世「中经络/中脏腑」的二分。
 */
const ZF_LAYERS = [
  { layer: '在络', sign: '肌肤不仁', depth: 1 },
  { layer: '在经', sign: '即重不胜', depth: 2 },
  { layer: '入腑', sign: '即不识人', depth: 3 },
  { layer: '入脏', sign: '舌即难言，口吐涎', depth: 4 },
];

function zhongfengLayers() {
  const a = tiaoOf(ZF_PIAN, '5.2');
  return ZF_LAYERS.map((l) => ({ ...l, quoted: a.zhHans.includes(l.sign) }));
}

/** 中风段：5.1–5.3（篇内前三段），有方文者 0 —— 侯氏黑散/风引汤都在段内附方，不入 formulas[] */
function zhongfengSection() {
  const arts = pianOf(ZF_PIAN).articles.filter((a) => ['5.1', '5.2', '5.3'].includes(a.tiao));
  return {
    tiao: arts.map((a) => a.tiao),
    fang: arts.flatMap((a) => (a.formulas || []).map((f) => f.nameSimp)),
    cause: tiaoOf(ZF_PIAN, '5.2').zhHans.includes('络脉空虚') && tiaoOf(ZF_PIAN, '5.2').zhHans.includes('贼邪不泻'),
  };
}

// ─────────── 历节：条文与方 ───────────
/** 成因句只认原文两个表述：汗出入水中、饮酒汗出当风 */
const LIJI_CAUSE = { water: '汗出入水中', wine: '饮酒汗出当风' };

function lijiSection() {
  const arts = pianOf(ZF_PIAN).articles.filter((a) => {
    const n = Number(a.tiao.split('.')[1]);
    return n >= 4;
  });
  return {
    tiao: arts.map((a) => ({
      tiao: a.tiao,
      hasLiji: a.zhHans.includes('历节'),
      fang: (a.formulas || []).map((f) => f.nameSimp),
      cause: a.zhHans.includes(LIJI_CAUSE.water)
        ? '汗出入水中'
        : a.zhHans.includes(LIJI_CAUSE.wine)
        ? '饮酒汗出当风'
        : null,
    })),
    fang: arts.flatMap((a) => (a.formulas || []).map((f) => f.nameSimp)),
  };
}

// ─────────── 两篇统计 ───────────
function pianStats(no) {
  const p = pianOf(no);
  const f = formulasOf(p);
  const herbs = herbsOf(p);
  return {
    no,
    name: p.nameSimp,
    tiao: p.articles.length,
    fang: f.length,
    per: p.articles.length ? Number((f.length / p.articles.length).toFixed(2)) : 0,
    herbTokens: herbs.length,
    distinctHerbs: new Set(herbs).size,
    chars: p.chars,
    formulas: f.map((x) => ({ name: x.nameSimp, herbs: x.ingredients.length })),
  };
}

function totals() {
  const a = pianStats(NUE_PIAN);
  const b = pianStats(ZF_PIAN);
  return {
    tiao: a.tiao + b.tiao,
    fang: a.fang + b.fang,
    herbTokens: a.herbTokens + b.herbTokens,
    // 两篇合并去重才有意义：桂枝、甘草都在两篇里重复出现
    distinctHerbs: new Set([...herbsOf(pianOf(NUE_PIAN)), ...herbsOf(pianOf(ZF_PIAN))]).size,
    nueTypes: NUE_TYPES.length,
    zfLayers: ZF_LAYERS.length,
    lijiTiao: lijiSection().tiao.length,
  };
}

if (require.main === module) {
  console.log('');
  console.log('  教学边界：本输出为《金匮要略》文本结构统计，外源·笈成留档可复算，不构成诊疗依据。');
  console.log('');
  const t = totals();
  const s4 = pianStats(NUE_PIAN);
  const s5 = pianStats(ZF_PIAN);

  console.log('═══ 第 5 章 · 疟病 / 中风历节 ═══\n');
  console.log(`  第 4 篇 ${s4.name}：${s4.tiao} 条 · ${s4.fang} 方（方/条 ${s4.per}）· 药 ${s4.herbTokens} 味次 / ${s4.distinctHerbs} 味`);
  for (const f of s4.formulas) console.log(`     · ${f.name} ${f.herbs} 味`);
  console.log(`  第 5 篇 ${s5.name}：${s5.tiao} 条 · ${s5.fang} 方（方/条 ${s5.per}）· 药 ${s5.herbTokens} 味次 / ${s5.distinctHerbs} 味`);
  for (const f of s5.formulas) console.log(`     · ${f.name} ${f.herbs} 味`);
  console.log(`  合计：${t.tiao} 条 · ${t.fang} 方 · 不同药 ${t.distinctHerbs} 味\n`);

  console.log('  疟 · 归型');
  for (const r of nueTypes()) {
    const meta = NUE_TYPES.find((x) => x.name === r.type);
    console.log(`  ${r.tiao} | ${r.type} | ${r.fang.join('、') || '—'} | ${meta ? meta.rule : '脉法总纲，不归型'}`);
  }

  console.log('\n  疟 · 节律词');
  const j = jieLv();
  for (const x of j.terms) console.log(`  ${x.term} | ${x.count} | ${x.tiao.join('、') || '—'}`);
  console.log(`  合计 ${j.total} 处；本篇未出现：${j.absent.join('、') || '无'}`);

  console.log('\n  中风 · 四层（5.2）');
  for (const l of zhongfengLayers()) console.log(`  ${l.depth} | 邪${l.layer} | ${l.sign} | ${l.quoted ? '原文可核' : '缺'}`);
  const zf = zhongfengSection();
  console.log(`  中风段 ${zf.tiao.join('、')}：有方文之方 ${zf.fang.length} 个`);

  console.log('\n  历节 · 条文与方');
  const lj = lijiSection();
  for (const r of lj.tiao)
    console.log(`  ${r.tiao} | ${r.fang.join('、') || '—'} | ${r.cause || (r.fang.length ? '证治条' : '脉法/病机')}`);
  console.log(`  历节段 ${lj.tiao.length} 条，有方文之方 ${lj.fang.length} 个：${lj.fang.join('、')}`);
}

module.exports = {
  BOOK,
  NUE_TYPES,
  RHYTHM_TERMS,
  ZF_LAYERS,
  nueType,
  nueTypes,
  jieLv,
  zhongfengLayers,
  zhongfengSection,
  lijiSection,
  pianStats,
  totals,
};
