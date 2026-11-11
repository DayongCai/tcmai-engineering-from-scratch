'use strict';
/**
 * 第 3 章 · 痉湿暍病（篇 2）：27 条的三分、刚柔判定、方剂归属与误治统计
 *
 *   node code/main.js
 *
 * 数据：standards/jingui/底本.json（外源·笈成，sha256 见该目录 README），篇 2。
 *
 * 口径（改任何一条都要同步改 docs/zh.md 与 main.test.js）：
 *   · 归类的输入只有 **zhHans 条文本身**，不看篇名、不看方名。
 *     这是刻意的：如果按「有没有方」来归类，2.13 大承气汤会被判成阳明腑实而不是痉；
 *     原文的顺序本身就是判据 —— 它先说「痉为病」，再给方。
 *   · 归类优先级 痉 → 暍 → 湿。必须如此：2.7 讲痉而句中有「寒湿相得」，
 *     若湿优先，这一篇的主证条文会被吞进湿病，痉的 13 条立刻掉到 12 条。
 *   · 方只计 formulas[]（有方文者），条文提名的方不计 —— 与第 1 章同一口径。
 *   · 误治表（MIS_TAGS）是**人工判读**，但每条都要过正则机械核对；
 *     表与底本字面不一致就抛错。理由见 validateTags() 的注释。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));

/** 篇 2。按 no 取而不是按下标取 —— 底本 pian 的顺序不是契约，no 才是。 */
const PIAN = BOOK.pian.find((p) => p.no === 2);
/** 按源页条序（idx）排好，后面所有「第几条」都以这个序为准 */
const ARTICLES = [...PIAN.articles].sort((a, b) => a.idx - b.idx);

const byTiao = new Map(ARTICLES.map((a) => [a.tiao, a]));

/** 分类关键词。顺序 = 优先级，见文件头第 2 条口径。 */
const RULES = [
  { cls: '痉', re: /痉/ },
  { cls: '暍', re: /暍/ },
  { cls: '湿', re: /湿/ },
];

/** 取条文：传 '2.7' 取该条 zhHans；传整段文字则原样用（便于测试与试算） */
function textOf(input) {
  if (typeof input !== 'string') return input.zhHans;
  const a = byTiao.get(input);
  return a ? a.zhHans : input;
}

/**
 * 把一条归入 痉 / 湿 / 暍 / 未判。
 * 只认 zhHans：繁简两栏在本库里字字对应，用简体是为了与 docs 引用同一份字面。
 */
function classify(input) {
  const t = textOf(input);
  for (const { cls, re } of RULES) if (re.test(t)) return cls;
  return '未判';
}

/** 全篇归类表：条号 → 类，外加 条数/方数 汇总 */
function classifyAll() {
  const rows = ARTICLES.map((a) => ({
    tiao: a.tiao,
    cls: classify(a),
    fang: (a.formulas || []).length,
    text: a.zhHans,
  }));
  const count = { 痉: 0, 湿: 0, 暍: 0, 未判: 0 };
  const fang = { 痉: 0, 湿: 0, 暍: 0, 未判: 0 };
  for (const r of rows) {
    count[r.cls] += 1;
    fang[r.cls] += r.fang;
  }
  return { rows, count, fang };
}

/**
 * 刚痉 / 柔痉 判定。
 *
 * 原文只在 2.1、2.2 直接下定义，2.12 是「欲作刚痉」（尚未成，故标 欲作）。
 * 其余 24 条不给这两字 —— 不要用「有汗/无汗」去外推：
 * 2.11 栝蒌桂枝汤条只说「身体强，𠘧𠘧然，脉反沉迟」，没有一个汗字，
 * 硬判成柔痉就是把注家的推断冒充原文。
 */
function gangRou(input) {
  const t = textOf(input);
  if (/欲作刚痉/.test(t)) return '刚痉（欲作）';
  if (/刚痉/.test(t)) return '刚痉';
  if (/柔痉/.test(t)) return '柔痉';
  return '未判';
}

/** 刚柔分布：{刚痉: [条号], 柔痉: [], 刚痉（欲作）: [], 未判: []} */
function gangRouAll() {
  const out = { 刚痉: [], 柔痉: [], '刚痉（欲作）': [], 未判: [] };
  for (const a of ARTICLES) out[gangRou(a)].push(a.tiao);
  return out;
}

/** 某一类的方：返回 [{tiao, name, herbs}]，herbs 为药味数（按 ingredients 计） */
function fangOf(cls) {
  return ARTICLES.filter((a) => classify(a) === cls).flatMap((a) =>
    (a.formulas || []).map((f) => ({
      tiao: a.tiao,
      name: f.nameSimp,
      herbs: f.ingredients.length,
    }))
  );
}

/** 三方对比用的药味表：药名 → 出现在几方（只统计篇 2 的 11 方） */
function herbFreq() {
  const m = new Map();
  for (const f of ARTICLES.flatMap((a) => a.formulas || [])) {
    for (const i of f.ingredients) {
      const h = i.herbSimp || i.herb;
      m.set(h, (m.get(h) || 0) + 1);
    }
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
}

/**
 * 误治表：条号 → 用了哪种「不该用的手段」。
 *
 * 只收**原文自己把手段与坏结果写成因果**的条：
 *   「发汗太多，因致痉」「下之则痉」「若下之早则哕」「慎不可以火攻之」
 *   「若发其汗，则恶寒甚；加温针，则发热甚；数下之，则淋甚」
 * 2.18 收「汗」，因为它是全篇唯一把「汗之病不愈」讲成机理的一条（汗大出则风气去湿气在）。
 * 2.14「但当利其小便」是**正治**，不入表 —— 误治表不是「出现手段」表。
 */
const MIS_TAGS = {
  '2.4': ['汗'],
  '2.5': ['下', '汗'],
  '2.6': ['汗'],
  '2.7': ['汗'],
  '2.16': ['下'],
  '2.17': ['下'],
  '2.18': ['汗'],
  '2.20': ['火攻'],
  '2.25': ['汗', '温针', '下'],
};

const TAG_RE = { 汗: /汗/, 下: /下/, 温针: /温针/, 火攻: /火攻/ };

/**
 * 机械核对 MIS_TAGS。
 *
 * 为什么要有这一步：误治表是本章唯一一张**不来自代码、来自人读**的表。
 * 人读的表会随版本漂移（有人为了凑数字加一行），而 docs 里的「9 条 11 次」
 * 是从这张表算出来的。核对方式是：每个 tag 的对应汉字必须真的出现在该条 zhHans 里，
 * 条号必须真的存在。不符即抛错 —— 宁可 main.js 跑不起来，也不要一张漂亮但假的表。
 */
function validateTags(tags = MIS_TAGS) {
  for (const [tiao, list] of Object.entries(tags)) {
    const a = byTiao.get(tiao);
    if (!a) throw new Error(`误治表引用了不存在的条号：${tiao}`);
    for (const tag of list) {
      const re = TAG_RE[tag];
      if (!re) throw new Error(`误治表出现未知手段「${tag}」（${tiao}）`);
      if (!re.test(a.zhHans)) throw new Error(`${tiao} 标了「${tag}」，但条文里没有这个字：${a.zhHans}`);
    }
  }
  return tags;
}

/** 误治统计：按手段计数 + 去重后的条数 */
function misTreat(tags = MIS_TAGS) {
  validateTags(tags);
  const byTag = { 汗: 0, 下: 0, 温针: 0, 火攻: 0 };
  for (const list of Object.values(tags)) for (const t of list) byTag[t] += 1;
  return {
    byTag,
    tiao: Object.keys(tags).length,
    times: Object.values(byTag).reduce((n, v) => n + v, 0),
    list: Object.keys(tags).sort((a, b) => Number(a.split('.')[1]) - Number(b.split('.')[1])),
  };
}

/** 原文自标「难治」的条：2.3（脉沉而细）、2.10（有灸疮） */
function hardCases() {
  return ARTICLES.filter((a) => /难治/.test(a.zhHans)).map((a) => a.tiao);
}

/** 篇级规模：条 / 方 / 字 / 药味 */
function totals() {
  const f = ARTICLES.flatMap((a) => a.formulas || []);
  const herbs = f.flatMap((x) => x.ingredients.map((i) => i.herbSimp || i.herb));
  return {
    pian: PIAN.no,
    name: PIAN.nameSimp,
    tiao: ARTICLES.length,
    fang: f.length,
    // 用码点数而不是 .length：2.11 的「𠘧𠘧」、2.13 的「𬹼」是增补平面字，
    // 在 UTF-16 里各占 2 个单元，直接 .length 会把全篇算成 1807 字（底本记 1804）。
    chars: ARTICLES.reduce((n, a) => n + [...a.zhHans].length, 0),
    herbTokens: herbs.length,
    distinctHerbs: new Set(herbs).size,
  };
}

if (require.main === module) {
  console.log('');
  console.log('  教学边界：本输出为《金匮要略》文本结构统计，外源·笈成留档可复算，不构成诊疗依据。');
  console.log('');
  const t = totals();
  const c = classifyAll();
  const g = gangRouAll();
  const m = misTreat();
  const h = hardCases();

  console.log('═══ 金匮要略 · 篇 2 痉湿暍病脉证并治 ═══');
  console.log(`  条 ${t.tiao} · 方 ${t.fang}（有方文）· 简体正文 ${t.chars} 字 · 药味 ${t.herbTokens} 次 / ${t.distinctHerbs} 味\n`);

  console.log(`  三分：痉 ${c.count['痉']} · 湿 ${c.count['湿']} · 暍 ${c.count['暍']} · 未判 ${c.count['未判']}`);
  console.log(`  出方：痉 ${c.fang['痉']} · 湿 ${c.fang['湿']} · 暍 ${c.fang['暍']}\n`);

  console.log('  条 | 类 | 刚柔 | 方');
  for (const r of c.rows) {
    const a = byTiao.get(r.tiao);
    const fn = (a.formulas || []).map((f) => f.nameSimp).join('/') || '—';
    const gr = gangRou(a) === '未判' ? '—' : gangRou(a);
    console.log(`  ${r.tiao} | ${r.cls} | ${gr} | ${fn}`);
  }

  console.log(`\n  刚柔：刚痉 ${g['刚痉'].length}（${g['刚痉'].join('、')}）· 欲作刚痉 ${g['刚痉（欲作）'].length}（${g['刚痉（欲作）'].join('、')}）· 柔痉 ${g['柔痉'].length}（${g['柔痉'].join('、')}）· 未判 ${g['未判'].length}`);
  console.log(`  误治：${m.tiao} 条 / ${m.times} 次 —— 汗 ${m.byTag['汗']} · 下 ${m.byTag['下']} · 温针 ${m.byTag['温针']} · 火攻 ${m.byTag['火攻']}`);
  console.log(`  误治条：${m.list.join('、')}`);
  console.log(`  原文自标难治：${h.join('、')}\n`);

  for (const cls of ['痉', '湿', '暍']) {
    const fs2 = fangOf(cls);
    console.log(`  ${cls}方 ${fs2.length}：${fs2.map((f) => `${f.tiao} ${f.name}(${f.herbs})`).join(' · ')}`);
  }
  console.log(`\n  药味频次（上 8）：${herbFreq().slice(0, 8).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
}

module.exports = {
  BOOK,
  PIAN,
  ARTICLES,
  RULES,
  MIS_TAGS,
  byTiao,
  classify,
  classifyAll,
  gangRou,
  gangRouAll,
  fangOf,
  herbFreq,
  misTreat,
  validateTags,
  hardCases,
  totals,
};
