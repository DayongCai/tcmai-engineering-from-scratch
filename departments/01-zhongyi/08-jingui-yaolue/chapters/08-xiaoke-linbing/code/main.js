'use strict';
/**
 * 第 8 章 · 消渴与淋病：津液与排泄（说明见 docs/zh.md）
 *
 *   node code/main.js
 *
 * 数据：standards/jingui/底本.json 第 13 篇
 *       （外源·笈成·金匱要略方論 第13篇·第1–13条；本仓库无金匮教材底本）
 *
 * 口径（六条，改任何一条都要同步改 docs/zh.md 的数字）：
 *   1. 主题（theme）与条作用（role）都是本章归的，原文没有这两种标签；
 *      规则只看条文用词，不看注解，便于逐条复核。
 *   2. 「三消」归型纯属后世（宋以后）归纳 —— 原文 13 条里没有「上消/中消/下消」
 *      任何一个词。归不进三消的条文如实列在「未归」，不许硬塞。
 *   3. 方只统计**有方文**的（formulas[] 非空）。条文提名而方文见于他篇的
 *      （肾气丸「方见脚气中」、五苓散「方见上」、白虎加人参汤「方见中暍中」）
 *      另计「提名方」，不混入 6 方。
 *   4. 13.11 一条并列三方（蒲灰散、滑石白鱼散、茯苓戎盐汤）。底本 v1 的
 *      formulas[] 只解析出「蒲灰散方」；v2 按「<b>X方：</b>」切段后三方各有
 *      条目，并带「右N味」自校验（全库 148/148 通过）。
 *   5. 「饮一斗/小便一斗」是全篇唯一可量化的出入量表述；其余条文只有
 *      多/数/不利这类定性词，fluidBalance() 对它们返回 none 而不是估一个数。
 *   6. 禁例只认条文自带的禁令语（不可发汗、下之不肯止），不含后世方后注的服法禁忌。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));

const PIAN_NO = 13;
const PIAN = BOOK.pian.find((p) => p.no === PIAN_NO);
const PIAN_SHUIQI = BOOK.pian.find((p) => p.no === 14); // 水气病：只用来划篇际分工，不展开
if (!PIAN) throw new Error(`底本里没有第 ${PIAN_NO} 篇`);

/** 条文首句：方文另起段落，首句即脉证部分，引文与归类都只认它 */
const head = (a) => a.zhHans.split('\n')[0].trim();

/** 主题归类。顺序即优先级：13.4 兼「小便不利」与「消渴」，落在消渴（五苓散治的是消渴）。 */
const THEME_RULES = [
  ['淋', /淋/],
  ['消渴', /消渴|消谷/],
  ['渴', /渴/],
  ['小便不利', /小便不利/],
];

/**
 * 条作用。顺序也是优先级：
 * 13.1 既是「厥阴之为病」的提纲、又带「下之不肯止」的禁例，归提纲 ——
 * 禁例另有 bans() 单列，两者不互斥，故不必在 role 里二选一。
 */
const ROLE_RULES = [
  ['提纲', /之为病/],
  ['方证', /主之/],
  ['禁例', /不可|不肯/],
  ['病机', /./],
];

/** 三消归型：判据取自条文自身的症状词，不带任何注解推断 */
const SANXIAO_RULES = [
  ['下消', /饮一斗|小便反多|肾气丸/],
  ['中消', /消谷|大便必坚|大坚/],
  ['上消', /渴欲饮水不止|口干舌燥/],
];

/** 淋病判据：三条症候 + 一条误治转归（转归不是判据，单列） */
const LIN_RULES = [
  ['小便性状', /小便如粟状/],
  ['腹诊', /小腹弦急/],
  ['痛位', /痛引脐中/],
];

const CN_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

const pick = (rules, text) => (rules.find(([, re]) => re.test(text)) || [null])[0];

/** 提名方：只认「X散/丸/汤 + 主之|、|并主之」这种处方式句式，避免抓到方名后的「方：」 */
const FORMULA_NAME_RE = /([\u4e00-\u9fa5]{2,7}(?:散|丸|汤))(?:主之|、|，|并主之)/g;

/** 13 条逐条归型：{tiao, theme, role, fang, text} */
function classifyTiao() {
  return PIAN.articles.map((a) => {
    const t = head(a);
    const named = [...t.matchAll(FORMULA_NAME_RE)].map((m) => m[1]);
    return {
      tiao: a.tiao,
      theme: pick(THEME_RULES, t) || '未归',
      role: pick(ROLE_RULES, t) || '病机',
      fang: [...new Set(named)],
      fangText: (a.formulas || []).map((f) => f.nameSimp),
      text: t,
    };
  });
}

/** 主题/作用的分布，供文档与测试对齐 */
function tally(rows, key) {
  const out = {};
  for (const r of rows) out[r[key]] = (out[r[key]] || 0) + 1;
  return out;
}

/**
 * 三消归型。作用域只取「消渴」与「渴」两类（淋病与纯小便不利不属消渴）。
 * 归型失败一律进 notFit —— 这一栏是本函数最诚实的部分：
 * 13.1 厥阴消渴、13.4/13.10 水气类、13.5 水逆、13.13 猪苓汤，用三消套上去只会丢信息。
 */
function xiaokeType() {
  const scope = classifyTiao().filter((r) => r.theme === '消渴' || r.theme === '渴');
  const buckets = { 上消: [], 中消: [], 下消: [], 未归: [] };
  for (const r of scope) {
    const k = pick(SANXIAO_RULES, r.text);
    (buckets[k] || buckets.未归).push(r.tiao);
  }
  return {
    ...buckets,
    scope: scope.map((r) => r.tiao),
    note: '「上消/中消/下消」是后世归纳，原文无此名；未归者不强行归类',
  };
}

/** 淋病判据抽取：只从条文里抓，抓不到就是抓不到 */
function linSigns() {
  const out = [];
  for (const a of PIAN.articles) {
    const t = head(a);
    for (const [sign, re] of LIN_RULES) {
      const m = re.exec(t);
      if (m) out.push({ tiao: a.tiao, sign, text: m[0] });
    }
    const after = /发汗则必([\u4e00-\u9fa5]{2})/.exec(t);
    if (after) out.push({ tiao: a.tiao, sign: '误治转归', text: `发汗则必${after[1]}` });
  }
  return out;
}

/**
 * 出入量收支。只认「饮N斗 / 小便N斗」这种带量词的原句；
 * 全篇只有 13.3 一条合格，ratio = 小便 / 饮水，1.00 表示「喝多少排多少」——
 * 这正是原文要说「小便反多」的量：正常人不该 1:1。
 */
function fluidBalance() {
  const rows = [];
  for (const a of PIAN.articles) {
    const t = head(a);
    const inM = /饮([一二三四五六七八九十])斗/.exec(t);
    const outM = /小便([一二三四五六七八九十])斗/.exec(t);
    if (!inM && !outM) continue;
    const intake = inM ? CN_NUM[inM[1]] : null;
    const output = outM ? CN_NUM[outM[1]] : null;
    rows.push({
      tiao: a.tiao,
      intake,
      output,
      ratio: intake && output ? Number((output / intake).toFixed(2)) : null,
    });
  }
  return { rows, quantified: rows.length, total: PIAN.articles.length, none: rows.length === 0 };
}

/** 禁例清单：直禁（不可…）与误下后果（下之不肯止）分开记，二者严重程度不同 */
function bans() {
  const out = [];
  for (const a of PIAN.articles) {
    const t = head(a);
    const direct = /([\u4e00-\u9fa5]{2})不可发汗/.exec(t);
    if (direct) {
      const after = /发汗则必([\u4e00-\u9fa5]{2})/.exec(t);
      out.push({ tiao: a.tiao, kind: '直禁', who: direct[1], action: '发汗', after: after ? after[1] : '' });
    }
    const misdown = /下之(不肯止)/.exec(t);
    if (misdown) out.push({ tiao: a.tiao, kind: '误下', who: '', action: '下之', after: misdown[1] });
  }
  return out;
}

/** 方：有方文者逐方列药；提名无方文者单列，供「6 方 vs 9 方名」的口径区分 */
function formulas() {
  const withText = [];
  const mentioned = new Set();
  let mentions = 0;
  for (const a of PIAN.articles) {
    for (const f of a.formulas || []) {
      withText.push({
        tiao: a.tiao,
        name: f.nameSimp,
        herbs: f.ingredients.map((i) => i.herbSimp || i.herb),
      });
    }
    for (const r of classifyTiao()) {
      if (r.tiao !== a.tiao) continue;
      for (const n of r.fang) mentioned.add(n);
      mentions += r.fang.length;
    }
  }
  const haveText = new Set(withText.map((f) => f.name.replace(/方$/, '')));
  return {
    withText,
    herbTokens: withText.reduce((n, f) => n + f.herbs.length, 0),
    mentioned: [...mentioned],
    mentionCount: mentions,
    refOnly: [...mentioned].filter((n) => !haveText.has(n)),
  };
}

/** 篇际分工：13 篇管「渴 + 小便」，14 篇管「水」，只报数字不展开 */
function pianSplit() {
  const f = (p) => p.articles.reduce((n, a) => n + (a.formulas || []).length, 0);
  return {
    pian13: { no: 13, name: PIAN.nameSimp, tiao: PIAN.articles.length, fang: f(PIAN) },
    pian14: { no: 14, name: PIAN_SHUIQI.nameSimp, tiao: PIAN_SHUIQI.articles.length, fang: f(PIAN_SHUIQI) },
  };
}

function report() {
  const rows = classifyTiao();
  const theme = tally(rows, 'theme');
  const role = tally(rows, 'role');
  const sx = xiaokeType();
  const fb = fluidBalance();
  const ban = bans();
  const fm = formulas();
  const sp = pianSplit();

  return {
    pian: { no: PIAN.no, name: PIAN.nameSimp, tiao: rows.length, chars: PIAN.chars },
    theme,
    role,
    sanxiao: { 上消: sx.上消.length, 中消: sx.中消.length, 下消: sx.下消.length, 未归: sx.未归.length },
    sanxiaoDetail: sx,
    linSigns: linSigns(),
    fluid: fb,
    bans: ban,
    formulas: fm,
    split: sp,
  };
}

if (require.main === module) {
  console.log('');
  console.log('  教学边界：本输出为《金匮要略》文本结构统计，外源·笈成留档可复算，不构成诊疗依据。');
  console.log('');
  const r = report();
  console.log('═══ 金匮要略 · 第 13 篇 消渴小便利淋病脉证并治 ═══');
  console.log(
    `  条 ${r.pian.tiao} · 有方文 ${r.formulas.withText.length} 方 · 提名方 ${r.formulas.mentioned.length}（${r.formulas.mentionCount} 处）· 方文药味 ${r.formulas.herbTokens} · 篇内 ${r.pian.chars} 字`
  );
  console.log(`\n  主题：${Object.entries(r.theme).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log(`  作用：${Object.entries(r.role).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log('\n  条 | 主题 | 作用 | 方');
  for (const x of classifyTiao()) {
    console.log(
      `  ${x.tiao} | ${x.theme} | ${x.role} | ${x.fang.join('、') || '—'}${x.fangText.length ? `（方文：${x.fangText.join('、')}）` : ''}`
    );
  }
  const s = r.sanxiaoDetail;
  console.log(
    `\n  三消归型（后世归纳，原文无此名）：上消 ${s.上消.join(',')} · 中消 ${s.中消.join(',')} · 下消 ${s.下消.join(',')} · 未归 ${s.未归.length} 条（${s.未归.join(',')}）`
  );
  console.log(`  淋病判据 ${r.linSigns.filter((x) => x.sign !== '误治转归').length} 条：`);
  for (const x of r.linSigns) console.log(`    ${x.tiao} | ${x.sign} | ${x.text}`);
  const f = r.fluid;
  console.log(`\n  量化收支：${f.quantified}/${f.total} 条带「N 斗」口径`);
  for (const x of f.rows) console.log(`    ${x.tiao} | 饮 ${x.intake} 斗 / 小便 ${x.output} 斗 | ratio ${x.ratio.toFixed(2)}`);
  console.log(`\n  禁例 ${r.bans.length} 条：${r.bans.map((b) => `${b.tiao} ${b.kind}（${b.action}→${b.after}）`).join(' · ')}`);
  console.log(
    `  提名而无方文 ${r.formulas.refOnly.length}：${r.formulas.refOnly.join('、')}（方见他篇或承前）`
  );
  console.log(
    `\n  篇际分工：第 13 篇 ${r.split.pian13.tiao} 条 ${r.split.pian13.fang} 方（渴与小便）｜第 14 篇 ${r.split.pian14.tiao} 条 ${r.split.pian14.fang} 方（水气主篇）`
  );
}

module.exports = {
  BOOK,
  PIAN,
  PIAN_SHUIQI,
  head,
  classifyTiao,
  tally,
  xiaokeType,
  linSigns,
  fluidBalance,
  bans,
  formulas,
  pianSplit,
  report,
};
