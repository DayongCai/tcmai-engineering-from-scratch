'use strict';
/**
 * 第 7 章 · 痰饮咳嗽：水液代谢的失效
 *   node code/main.js
 *
 * 数据：standards/jingui/底本.json 第 12 篇（外源·笈成，sha256 见该目录 README）
 *
 * 本章只做一件原文自己做了、但读者常常跳过的事：把 41 条**归到四饮**。
 * 四条口径，改任何一条都要同步改 docs/zh.md 与 main.test.js：
 *   · 方只计 `formulas[]`（有方文者），条文提名的方不计。底本 v2 起，一个
 *     `h-formula` 块里的并列方按「<b>X方：</b>」切开，故 12.23（大青龙汤／小青龙汤）、
 *     12.24（木防己汤／木防己去石膏加茯苓芒硝汤）各出两方，全篇 18 方即全部有方文者。
 *   · 归类只认「原文里出现的词」，不认后世注解。判据词一律取自 12.2 的定义句，
 *     因为四饮的边界是那一条自己划的，不是我们从症状表反推的。
 *   · 12.1 / 12.2 是**定义条**，四饮名全出现，归任何一个都是错的 —— 单列「总纲」。
 *   · 「承前」只给方后加减条（12.36–12.40 一条链）。它们的正文里没有饮名，
 *     但首句（青龙汤下已 / 冲气即低 / 咳满即止 / 水去呕止 / 若面热如醉）
 *     逐字承接前条，是按原文结构可判的，不是按我们的理解硬安。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));
const PIAN = BOOK.pian.find((p) => p.no === 12);

/** 四饮，顺序即 12.1 的列举顺序 —— 平票时按此序取先，保证结果可复现 */
const YIN = ['痰饮', '悬饮', '溢饮', '支饮'];

/**
 * 12.2 的判据词，逐字取自该条：
 *   痰饮：其人素盛今瘦，水走肠间，沥沥有声
 *   悬饮：饮后水流在胁下，咳唾引痛
 *   溢饮：饮水流行，归于四肢，当汗出而不汗出，身体疼重
 *   支饮：咳逆倚息，短气不得卧，其形如肿
 *
 * 为什么用「短语」而不是单字（如 喘、短气、胁下）：
 * 单个症状词在本篇遍地都是（12.3 水在心也「短气」，12.13 肺饮也「喘」），
 * 用它归类会把一半条文吸进支饮。四饮的分界靠的是**症状组合**，不是单症。
 *
 * 每条词都带出处（from）：只允许 12.2 的定义词，外加本篇后文**自己重述过**的
 * 等价说法（目前只有 12.29 的「肠间有水气」——它说的就是 12.2 的「水走肠间」）。
 * 测试会反查每个词是否真出现在所标条文的原文里，防止凭记忆添词。
 */
const CRITERIA = {
  痰饮: [
    { w: '水走肠间', from: '12.2' },
    { w: '沥沥有声', from: '12.2' },
    { w: '素盛今瘦', from: '12.2' },
    { w: '肠间有水气', from: '12.29' },
  ],
  悬饮: [
    { w: '水流在胁下', from: '12.2' },
    { w: '咳唾引痛', from: '12.2' },
  ],
  溢饮: [
    { w: '归于四肢', from: '12.2' },
    { w: '当汗出而不汗出', from: '12.2' },
    { w: '身体疼重', from: '12.2' },
  ],
  支饮: [
    { w: '咳逆倚息', from: '12.2' },
    { w: '短气不得卧', from: '12.2' },
    { w: '其形如肿', from: '12.2' },
    { w: '倚息不得卧', from: '12.35' },
  ],
};

/** 方后加减条的承接语，逐字取自各条首句；只在正文无饮名时启用 */
const CONTINUE = ['青龙汤下已', '冲气即低', '咳满即止', '水去呕止', '若面热如醉'];

/**
 * 只提名、本篇无方文的方 —— 本章逐条核出，不是正则扫出来的。
 * 正则扫「…汤/丸/散」会把「青龙汤下已」「苓甘五味…」这类叙述句误当方名，
 * 而漏收与误收在「18 方」这种数字上都会变成错账，所以宁可手列 + 测试反查原文。
 * 注：12.41 原文作「小半夏茯苓汤」，12.30 的方名作「小半夏加茯苓汤」；
 * 两处照录，不替底本改字。
 * 注：12.23 的小青龙汤 v1 曾列在此（当时 formulas[] 只读首方，它只剩提名）；
 * 底本 v2 已把它从并列方块里切出、有方文有药味，故此处只留真正无方文者。
 */
const NAMED_ONLY = {
  '12.17': ['苓桂术甘汤', '肾气丸'],
  '12.27': ['葶苈大枣泻肺汤'],
  '12.32': ['十枣汤'],
  '12.33': ['十枣汤'],
  '12.35': ['小青龙汤'],
  '12.41': ['小半夏茯苓汤'],
};

const stripFang = (s) => String(s || '').replace(/方$/, '');

function articles() {
  return PIAN.articles.slice().sort((a, b) => a.idx - b.idx);
}

/**
 * 四饮归类。逐条返回 {tiao, yin, by, hit}：
 *   by = 总纲 | 显名 | 判据词 | 承前 | 无判据词
 * 优先级：显名 > 判据词 > 承前。显名先于判据词，是因为「病悬饮者，十枣汤主之」
 * 这种条自己报了名，再拿症状词去覆盖它等于不信原文。
 */
function siYin() {
  const arts = articles();
  const out = [];
  arts.forEach((a, i) => {
    const text = a.zhHans;
    if (a.tiao === '12.1' || a.tiao === '12.2') {
      out.push({ tiao: a.tiao, yin: '总纲', by: '总纲', hit: '' });
      return;
    }
    // 1 显名：取正文中**最先**出现的饮名（一句里提两个饮时，先说的那个是主语）
    let byName = null;
    let best = Infinity;
    for (const y of YIN) {
      const k = text.indexOf(y);
      if (k >= 0 && k < best) { best = k; byName = y; }
    }
    if (byName) { out.push({ tiao: a.tiao, yin: byName, by: '显名', hit: byName }); return; }

    // 2 判据词：命中条数最多者胜；平票按 YIN 顺序取先
    let pick = null;
    let pickHits = 0;
    let pickWords = '';
    for (const y of YIN) {
      const hits = CRITERIA[y].filter((c) => text.includes(c.w)).map((c) => c.w);
      if (hits.length > pickHits) { pick = y; pickHits = hits.length; pickWords = hits.join('、'); }
    }
    if (pick) { out.push({ tiao: a.tiao, yin: pick, by: '判据词', hit: pickWords }); return; }

    // 3 承前：仅当前条已判为四饮之一才继承，避免把 12.3（水在心）之后的东西连带污染
    const mark = CONTINUE.find((m) => text.startsWith(m));
    const prev = out[i - 1];
    if (mark && prev && YIN.includes(prev.yin)) {
      out.push({ tiao: a.tiao, yin: prev.yin, by: '承前', hit: mark });
      return;
    }

    // 4 未判：五脏水、留饮/伏饮、脉诊、治则与杂症条都在这里
    out.push({ tiao: a.tiao, yin: '未判', by: '无判据词', hit: '' });
  });
  return out;
}

/** 每条带上方文数与提名方，供 yinSummary / fangOfYin 复用 */
function tiaoShape() {
  return siYin().map((r) => {
    const a = PIAN.articles.find((x) => x.tiao === r.tiao);
    const fang = (a.formulas || []).map((f) => stripFang(f.nameSimp));
    return { ...r, fang, named: NAMED_ONLY[r.tiao] || [], chars: a.zhHans.length };
  });
}

/** 四饮 × 条/方 的交叉表（「总纲」与「未判」单列，两者都不是四饮之一） */
function yinSummary() {
  const rows = tiaoShape();
  const keys = ['总纲', ...YIN, '未判'];
  const out = {};
  for (const k of keys) out[k] = { tiao: 0, fang: 0, named: 0, per: 0, list: [] };
  for (const r of rows) {
    out[r.yin].tiao += 1;
    out[r.yin].fang += r.fang.length;
    out[r.yin].named += r.named.length;
    out[r.yin].list.push(r.tiao.slice(3));
  }
  for (const k of keys) out[k].per = Number((out[k].fang / out[k].tiao).toFixed(2));
  return out;
}

/**
 * 「未判」19 条按内容分片 —— 这一层是本章的读法，写进代码是为了让 docs 的分片数字
 * 可被断言：分片合起来必须正好等于未判集合，多一条少一条测试就红。
 */
const UNJUDGED_GROUPS = [
  { label: '五脏水', tiao: ['12.3', '12.4', '12.5', '12.6', '12.7'] },
  { label: '留饮/伏饮', tiao: ['12.8', '12.9', '12.10', '12.11', '12.18'] },
  { label: '水停心下与脉诊', tiao: ['12.12', '12.13', '12.19', '12.20'] },
  { label: '微饮 / 咳家有水', tiao: ['12.17', '12.32'] },
  { label: '定位模糊（膈间有水/水停心下）', tiao: ['12.30', '12.31', '12.41'] },
];

function unjudgedGroups() {
  const un = tiaoShape().filter((r) => r.yin === '未判').map((r) => r.tiao);
  const listed = UNJUDGED_GROUPS.flatMap((g) => g.tiao);
  return {
    rows: UNJUDGED_GROUPS.map((g) => ({ label: g.label, tiao: g.tiao, n: g.tiao.length })),
    total: listed.length,
    missing: un.filter((t) => !listed.includes(t)), // 未判里没被分片解释的
    extra: listed.filter((t) => !un.includes(t)),   // 分片里其实不是未判的
  };
}

/** 18 个有方文的方 → 所属饮类（按方所在的条判） */
function fangOfYin() {
  const rows = tiaoShape();
  const out = [];
  for (const r of rows) for (const f of r.fang) out.push({ name: f, tiao: r.tiao, yin: r.yin, by: r.by });
  return out;
}

/**
 * 「病痰饮者，当以温药和之」（12.15）。
 * 温药表是**本章标注**，不是底本内容 —— 底本只给方与药味，不给四气。
 * 标在此处的目的是让「和之」可数：若 18 方全是温药堆叠，「和」字就无从谈起。
 * 药名归一：底本 12.39/12.40 作「五味」，其余条作「五味子」，同一味药两种写法。
 */
const HERB_ALIAS = { 五味: '五味子' };
const WARM = ['桂枝', '干姜', '细辛', '生姜', '半夏', '麻黄', '杏仁', '白术', '厚朴', '椒目', '人参', '五味子'];

/**
 * 底本的 herbSimp 会把校注与剂量粘在药名上（「甘草如指大⟨一枚，炙⟩」「茯苓⟨三两⟩」），
 * 不清洗就会把「茯苓」算成 8 方而不是 9 方 —— 一个隐性错账，肉眼看表格看不出来。
 * 只剥夹注与尾部剂量串，不动药名本身：五味子的「五」、半夏的「半」都长得像数字，
 * 所以数字规则只截「名字之后」的部分。
 */
function cleanHerb(raw) {
  return String(raw || '')
    .replace(/⟨[^⟩]*⟩/g, '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .replace(/(如指大|如指|大者)$/, '')
    .replace(/各.*$/, '')
    .replace(/\d.*$/, '')
    .trim();
}

const herbName = (h) => HERB_ALIAS[cleanHerb(h)] || cleanHerb(h);

function warmRule() {
  const rows = fangOfYin().map((f) => {
    const art = PIAN.articles.find((a) => a.tiao === f.tiao);
    const fm = art.formulas.find((x) => stripFang(x.nameSimp) === f.name);
    const herbs = fm.ingredients.map((i) => herbName(i.herbSimp || i.herb));
    const warm = herbs.filter((h) => WARM.includes(h));
    return { ...f, herbs, warm, n: herbs.length, k: warm.length, pure: warm.length === herbs.length };
  });
  return {
    rows,
    formulas: rows.length,
    withWarm: rows.filter((r) => r.k > 0).length,
    pureWarm: rows.filter((r) => r.pure).length,
    noWarm: rows.filter((r) => r.k === 0).map((r) => `${r.name}（${r.tiao}）`),
    warmTokens: rows.reduce((n, r) => n + r.k, 0),
    herbTokens: rows.reduce((n, r) => n + r.n, 0),
    poria: rows.filter((r) => r.herbs.includes('茯苓')).length,
    guizhi: rows.filter((r) => r.herbs.includes('桂枝')).length,
  };
}

/** 药味频次（按「几方用到」计，同一方内重复不叠） */
function herbFreq() {
  const m = new Map();
  for (const r of warmRule().rows) for (const h of r.herbs) m.set(h, (m.get(h) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
}

/** 条级形态：涉方 / 无方 */
function totals() {
  const rows = tiaoShape();
  return {
    tiao: rows.length,
    fang: rows.reduce((n, r) => n + r.fang.length, 0),
    fangTiao: rows.filter((r) => r.fang.length > 0).length,
    namedOnly: rows.filter((r) => r.named.length > 0).length,
    withFang: rows.filter((r) => r.fang.length > 0 || r.named.length > 0).length,
    per: Number((rows.reduce((n, r) => n + r.fang.length, 0) / rows.length).toFixed(2)),
    chars: PIAN.chars,
    by: rows.reduce((acc, r) => ((acc[r.by] = (acc[r.by] || 0) + 1), acc), {}),
  };
}

if (require.main === module) {
  console.log('');
  console.log('  教学边界：本输出为《金匮要略》文本结构统计，外源·笈成留档可复算，不构成诊疗依据。');
  console.log('');
  const t = totals();
  const s = yinSummary();
  console.log('═══ 第 12 篇 · 痰饮咳嗽病脉证并治 ═══');
  console.log(`  ${t.tiao} 条 · ${t.fang} 方（有方文）· 方条比 ${t.per}`);
  console.log(`  带方文 ${t.fangTiao} 条 · 只提名 ${t.namedOnly} 条 · 涉方共 ${t.withFang} 条 · 无方 ${t.tiao - t.withFang} 条\n`);

  console.log('  四饮 | 条 | 方 | 方/条 | 方名数 | 条号');
  for (const k of Object.keys(s)) {
    const v = s[k];
    console.log(`  ${k} | ${v.tiao} | ${v.fang} | ${v.per} | ${v.named} | ${v.list.join(',')}`);
  }

  console.log('\n  归类依据：' + Object.entries(t.by).map(([k, v]) => `${k} ${v}`).join(' · '));
  console.log('  未判 19 条分片：' + unjudgedGroups().rows.map((r) => `${r.label} ${r.n}`).join(' · '));
  const odd = tiaoShape().filter((r) => r.by === '承前' || r.by === '判据词');
  for (const r of odd) console.log(`    ${r.tiao} ${r.yin} ← ${r.by}「${r.hit}」`);

  console.log('\n  方 | 条 | 饮');
  for (const f of fangOfYin()) console.log(`  ${f.name} | ${f.tiao} | ${f.yin}`);

  const w = warmRule();
  console.log(`\n  温药和之：${w.formulas} 方中`);
  console.log(`    含温药 ${w.withWarm} 方 · 纯温药 ${w.pureWarm} 方 · 无温药 ${w.noWarm.length} 方（${w.noWarm.join('、')}）`);
  console.log(`    温药味次 ${w.warmTokens} / 总药味 ${w.herbTokens}（${(100 * w.warmTokens / w.herbTokens).toFixed(1)}%）`);
  console.log(`    用茯苓 ${w.poria} 方 · 用桂枝 ${w.guizhi} 方`);

  console.log('\n  药味（几方用）：');
  console.log('    ' + herbFreq().slice(0, 8).map(([h, n]) => `${h} ${n}`).join(' · '));
}

module.exports = {
  PIAN, YIN, CRITERIA, CONTINUE, NAMED_ONLY, WARM,
  articles, siYin, tiaoShape, yinSummary, fangOfYin, warmRule, herbFreq, totals, unjudgedGroups,
};
