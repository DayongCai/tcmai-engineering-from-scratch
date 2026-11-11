'use strict';
/**
 * 第 9 章 · 妇人病三篇：妊娠 / 产后 / 杂病 的分工
 *
 *   node code/main.js
 *
 * 数据：standards/jingui/底本.json（外源·笈成，sha256 见该目录 README）
 *
 * 口径（四条，改任何一条都要同步改 docs/zh.md）：
 *   1. 只取篇 20 / 21 / 22，共 44 条 26 方；其余 19 篇不参与本章统计。
 *   2. 「方」= formulas[] 里的一条方文（有方名即计）。其中 4 条只有方名、
 *      没有药味（21.4 当归生姜羊肉汤、22.17 当归芍药散、22.18 小建中汤、
 *      22.22 膏发煎）。计次口径仍算 1 方，另列「无药味方」一栏，不隐瞒。
 *      为什么单列：把「有方名」与「有药味」混成一个数，会让「26 方」
 *      看起来像 26 张可执行的处方，实际只有 22 张有药味。
 *   3. 26 方里有 1 个方名重复（当归芍药散：20.5 立方的方文、22.17 承前省方），
 *      所以「计次 26 / 去重 25」两个数都要报 —— 只报一个必然误导。
 *   4. 妊娠篇的「禁忌/慎用」与「常服/养胎」分组，是本章按条文用词归纳的
 *      （regex 见 PREG_RULES），原文没有这两个小标题。分组只为看结构，
 *      不作用药依据 —— 逐条标注命中的字串，方便逐字复核。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));

/** 三篇 → 短名。键必须与底本 pian[].no 对齐 */
const SAN_PIAN = { 20: '妊娠', 21: '产后', 22: '杂病' };
const PIAN_NOS = Object.keys(SAN_PIAN).map(Number);

const pianOf = (no) => {
  const p = BOOK.pian.find((x) => x.no === no);
  if (!p) throw new Error(`底本缺第 ${no} 篇`);
  return p;
};
const articlesOf = (no) => pianOf(no).articles;
const formulasOf = (p) => p.articles.flatMap((a) => a.formulas || []);
const herbsOf = (p) => formulasOf(p).flatMap((f) => f.ingredients.map((i) => i.herbSimp || i.herb));

/** 按条号（"20.5" 这种字符串）取简体原文；取不到就抛，不返回空串 */
function tiaoText(id) {
  for (const no of PIAN_NOS) {
    const a = articlesOf(no).find((x) => x.tiao === id);
    if (a) return a.zhHans;
  }
  throw new Error(`底本找不到条 ${id}`);
}

/** 逐篇：条 / 方 / 方条比 / 药味 / 无药味方 / 原文字数 */
function pianStats() {
  const rows = PIAN_NOS.map((no) => {
    const p = pianOf(no);
    const f = formulasOf(p);
    const herbs = herbsOf(p);
    return {
      no,
      short: SAN_PIAN[no],
      name: p.nameSimp,
      tiao: p.articles.length,
      fang: f.length,
      per: Number((f.length / p.articles.length).toFixed(2)),
      herbTokens: herbs.length,
      distinctHerbs: new Set(herbs).size,
      noRecipe: f.filter((x) => x.ingredients.length === 0).length,
      chars: p.chars,
    };
  });
  const sum = (k) => rows.reduce((n, r) => n + r[k], 0);
  const tiao = sum('tiao');
  const fang = sum('fang');
  return {
    rows,
    total: {
      tiao,
      fang,
      per: Number((fang / tiao).toFixed(2)),
      herbTokens: sum('herbTokens'),
      noRecipe: sum('noRecipe'),
      chars: sum('chars'),
    },
  };
}

/**
 * 26 方按篇归并，两种口径同报：
 *   counted  = 26（方文条数，重复方各算一次）
 *   distinct = 25（方名去重）
 * 为什么要两个：讲「三篇多少方」时，26 是文献里的方文数，25 是方剂数；
 * 22 篇的当归芍药散只写方名、不列药味，是承 20.5 省方 —— 计次会把它
 * 当成第二张方，去重会把它藏起来。两个数一起给，读者才知道差在哪。
 */
function fangIndex() {
  const rows = [];
  for (const no of PIAN_NOS) {
    for (const a of articlesOf(no)) {
      for (const f of a.formulas || []) {
        rows.push({
          pian: no,
          short: SAN_PIAN[no],
          tiao: a.tiao,
          name: f.nameSimp,
          herbs: f.ingredients.length,
          recipe: f.ingredients.length > 0,
        });
      }
    }
  }
  const byName = new Map();
  for (const r of rows) {
    if (!byName.has(r.name)) byName.set(r.name, []);
    byName.get(r.name).push(r);
  }
  const dup = [...byName.entries()]
    .filter(([, v]) => v.length > 1)
    .map(([name, v]) => ({
      name,
      times: v.length,
      at: v.map((r) => r.tiao),
      withRecipe: v.filter((r) => r.recipe).length,
    }));
  const byPian = PIAN_NOS.map((no) => ({
    no,
    short: SAN_PIAN[no],
    items: rows.filter((r) => r.pian === no),
  }));
  return { rows, counted: rows.length, distinct: byName.size, dup, byPian };
}

/**
 * 产后三病（21.1）。三病是**并列**的三类新产常见病，不是一条病程的
 * 三个阶段 —— 原文用「一者…二者…三者…」并列，且逐条给病机。
 * cause 字段必须是 21.1 原文的逐字子串（main.test.js 会断言），
 * 这样改数据或手抄错字会立刻报错，而不是悄悄变成「我记得是这样」。
 */
const SAN_BING = [
  {
    name: '病痉',
    cause: '新产血虚，多汗出，喜中风',
    chain: ['21.9'],
    why: '21.1「喜中风，故令病痉」；21.9 正为「产后中风，发热，面正赤，喘而头痛」立竹叶汤',
  },
  {
    name: '病郁冒',
    cause: '亡血复汗，寒多',
    chain: ['21.2'],
    why: '21.2 以「产妇郁冒」起，以「小柴胡汤主之」收',
  },
  {
    name: '大便难',
    cause: '亡津液，胃燥',
    chain: ['21.3', '21.7'],
    why: '21.3「此为胃实」、21.7「不大便……热在里」皆承此一路',
  },
];

function sanBing() {
  const src = tiaoText('21.1');
  return SAN_BING.map((b) => ({ ...b, source: '21.1', verbatim: src.includes(b.cause) }));
}

/**
 * 杂病篇的两组结构事实，都靠原文字串核对，不靠印象：
 *
 *   热入血室 4 条（22.1–22.4）：四条都以「热入血室」四字指病，
 *   但治法分三路（小柴胡汤 / 不犯胃气自愈 / 刺期门）—— 同名不同治，
 *   正是「辨病位」优先于「守一方」的例子。
 *
 *   外治给药 4 条（22.15 内藏、22.20 坐药、22.21 洗、22.22 导）：
 *   22 篇是全书唯一集中出现外治给药的妇人篇。这里只记录给药途径，
 *   不判断疗效 —— 丸、散、汤的内服方一条也没被算进来。
 */
const EXTERNAL_TX = [
  { tiao: '22.15', name: '矾石丸', mark: '内脏中', route: '内藏' },
  { tiao: '22.20', name: '蛇床子散', mark: '棉裹内之', route: '坐药' },
  { tiao: '22.21', name: '狼牙汤', mark: '沥阴中', route: '洗' },
  { tiao: '22.22', name: '膏发煎', mark: '导之', route: '导' },
];

function externalTx() {
  return EXTERNAL_TX.map((x) => ({ ...x, verified: tiaoText(x.tiao).includes(x.mark) }));
}

function heatIntoBlood() {
  return articlesOf(22)
    .filter((a) => a.zhHans.includes('热入血室'))
    .map((a) => ({ tiao: a.tiao, text: a.zhHans }));
}

/**
 * 妊娠篇的「禁忌/慎用」与「常服/养胎」单列。
 * 规则是本章归纳的，所以每条都记下**命中的原文字串**（at），
 * 让人能回原文核对分类是否有据，而不是接受一个结论。
 */
const PREG_RULES = [
  { kind: '攻下', re: /当下其症|下其症/, note: '妊娠而用下法去症，原文给出的前提是「其症不去故也」' },
  { kind: '刺法', re: /当刺|刺泻/, note: '妊娠而施刺泻（劳宫、关元），原文以此泻「心气实」' },
  { kind: '常服', re: /常服|养胎/, note: '原文自标「常服」「养胎」，属长期服食，不是治病方' },
];

function pregnancyFlags() {
  const out = [];
  for (const a of articlesOf(20)) {
    const hits = [];
    for (const r of PREG_RULES) {
      const m = r.re.exec(a.zhHans);
      if (m) hits.push({ kind: r.kind, at: m[0], note: r.note });
    }
    if (hits.length) out.push({ tiao: a.tiao, kinds: hits.map((h) => h.kind), hits });
  }
  return out;
}

/** 三篇在全书里的位置：条 44/398、方 26/174 */
function totals() {
  const ps = pianStats();
  const zhengwen = BOOK.pian.filter((p) => p.no != null);
  const bookTiao = zhengwen.reduce((n, p) => n + p.articles.length, 0);
  const bookFang = zhengwen.reduce((n, p) => n + formulasOf(p).length, 0);
  const distinctHerbs = new Set(PIAN_NOS.flatMap((no) => herbsOf(pianOf(no)))).size;
  return {
    ...ps.total,
    distinctHerbs,
    bookTiao,
    bookFang,
    bookPer: Number((bookFang / bookTiao).toFixed(2)),
    tiaoShare: Number(((ps.total.tiao / bookTiao) * 100).toFixed(1)),
    fangShare: Number(((ps.total.fang / bookFang) * 100).toFixed(1)),
  };
}

if (require.main === module) {
  console.log('');
  console.log('  教学边界：本输出为《金匮要略》文本结构统计，外源·笈成留档可复算，不构成诊疗依据。');
  console.log('');
  const t = totals();
  const fi = fangIndex();
  const ps = pianStats();
  const sb = sanBing();
  const pf = pregnancyFlags();

  console.log('═══ 妇人病三篇 · 妊娠 / 产后 / 杂病 ═══');
  console.log(`  ${t.tiao} 条 / ${t.fang} 方（方名去重 ${fi.distinct}）· 药味出现 ${t.herbTokens} 次 · 不同药 ${t.distinctHerbs} 味`);
  console.log(`  占全书：条 ${t.tiao}/${t.bookTiao} = ${t.tiaoShare}% · 方 ${t.fang}/${t.bookFang} = ${t.fangShare}% · 全书方条比 ${t.bookPer.toFixed(2)}`);
  console.log(`  有方名无药味 ${t.noRecipe} 条 · 原文 ${t.chars} 字\n`);

  console.log('  篇 | 名 | 条 | 方 | 方/条 | 药味 | 无药味方');
  for (const r of ps.rows) {
    console.log(`  ${r.no} | ${r.name} | ${r.tiao} | ${r.fang} | ${r.per.toFixed(2)} | ${r.herbTokens} | ${r.noRecipe}`);
  }
  console.log(`  合计 | — | ${ps.total.tiao} | ${ps.total.fang} | ${ps.total.per.toFixed(2)} | ${ps.total.herbTokens} | ${ps.total.noRecipe}\n`);

  console.log('  产后三病（21.1，三病并列）');
  for (const b of sb) {
    console.log(`    ${b.name} ← ${b.cause}  → 承接 ${b.chain.join('、')}${b.verbatim ? '' : '  ⚠ 病机非逐字'}`);
  }

  console.log('\n  妊娠篇分组（本章按用词归纳，非原文标题）');
  for (const f of pf) {
    console.log(`    ${f.tiao} [${f.kinds.join('/')}] 命中「${f.hits.map((h) => h.at).join('」「')}」`);
  }
  const flagged = pf.filter((f) => f.kinds.some((k) => k === '攻下' || k === '刺法')).length;
  console.log(`    禁忌/慎用 ${flagged} 条 · 常服/养胎 ${pf.filter((f) => f.kinds.includes('常服')).length} 条 · 其余 ${ps.rows[0].tiao - pf.length} 条为辨胎与证治`);

  console.log('\n  方按篇归并（计次 26 / 去重 25）');
  for (const g of fi.byPian) {
    const s = g.items.map((r) => `${r.name}(${r.herbs}味)${r.recipe ? '' : ' [无药味]'}`).join(' · ');
    console.log(`    ${g.no} ${g.short} ${g.items.length} 方：${s}`);
  }
  for (const d of fi.dup) {
    console.log(`    重复方：${d.name} ×${d.times}（${d.at.join('、')}；其中 ${d.withRecipe} 条有药味）`);
  }

  const hib = heatIntoBlood();
  console.log(`\n  杂病篇「热入血室」${hib.length} 条：${hib.map((x) => x.tiao).join('、')} —— 同名三治（小柴胡汤 / 不犯胃气自愈 / 刺期门）`);
  const ex = externalTx();
  console.log(`  杂病篇外治给药 ${ex.length} 条：${ex.map((x) => `${x.tiao} ${x.name}(${x.route})`).join(' · ')}`);
}

module.exports = {
  BOOK,
  SAN_PIAN,
  PIAN_NOS,
  pianOf,
  articlesOf,
  tiaoText,
  formulasOf,
  herbsOf,
  pianStats,
  fangIndex,
  sanBing,
  pregnancyFlags,
  PREG_RULES,
  EXTERNAL_TX,
  externalTx,
  heatIntoBlood,
  totals,
};
