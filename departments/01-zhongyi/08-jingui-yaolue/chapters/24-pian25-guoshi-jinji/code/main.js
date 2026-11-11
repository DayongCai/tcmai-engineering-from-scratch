'use strict';
/**
 * 第 24 章 · 篇目精读：篇目精读第二十五：果实菜谷禁忌——与禽兽鱼虫禁忌合起来才是完整的食禁
 *
 *   node code/main.js
 *
 * 数据：standards/jingui/底本.json（外源·笈成）第 25 篇；
 *       校勘：standards/jingui/gushiwen/gushiwen.json（外源·古诗文网）第 25 篇。
 *
 * 口径（改任一条都要同步改 docs/zh.md 与 main.test.js）：
 *   · 条序按源页 idx；条号为「篇.条」；附篇（23-25）底本无条号，整篇 1 条。
 *   · 方只计 formulas[]（有方文者）；仅存方名者不并入方数。
 *   · 表 2 的分类是**字面命中**：同一条可落进多类，不合计为条数。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));
const GS = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/gushiwen/gushiwen.json'), 'utf8'));

const PIAN_NO = 25;
const GS_NO = 25;

/** 附篇（23-25）在底本里没有 no，按末尾三条（序之后）的顺序取。 */
const PIAN =
  PIAN_NO <= 22
    ? BOOK.pian.find((p) => p.no === PIAN_NO)
    : BOOK.pian.filter((p) => !p.no)[PIAN_NO - 22];

const ARTICLES = [...PIAN.articles].sort((a, b) => a.idx - b.idx);
const GSPIAN = GS.pian.find((p) => p.no === GS_NO);

/** 字面判据。数组顺序 = 表 2 的行序。 */
const RULES = [
  ['标「死／不治」', /死|不治/],
  ['标「难治」', /难治/],
  ['禁忌句（不可／禁／勿）', /不可|禁|勿/],
  ['自愈／欲解', /自愈|欲解|乃愈|即愈/],
];

const cps = (s) => [...s].length;

function totals() {
  const fang = ARTICLES.flatMap((a) => a.formulas || []);
  const herbs = fang.flatMap((f) => f.ingredients || []);
  const freq = new Map();
  for (const h of herbs) freq.set(h.herbSimp, (freq.get(h.herbSimp) || 0) + 1);
  const top = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'))
    .slice(0, 5);
  return {
    pian: PIAN_NO,
    tiao: ARTICLES.length,
    fang: fang.length,
    chars: PIAN.chars,
    tiaoChars: ARTICLES.reduce((n, a) => n + cps(a.zhHans), 0),
    chu: ARTICLES.filter((a) => (a.formulas || []).length > 0).length,
    wu: ARTICLES.filter((a) => (a.formulas || []).length === 0).length,
    herbTokens: herbs.length,
    distinctHerbs: freq.size,
    top,
  };
}

/** 表 2：字面命中计数（可重叠） */
function hits() {
  const out = {};
  for (const [label, re] of RULES) out[label] = ARTICLES.filter((a) => re.test(a.zhHans)).length;
  return out;
}

/** 表 3：方证表（方名 / 味数 / 条号 / 该条首句） */
function formulaTable() {
  return ARTICLES.flatMap((a) =>
    (a.formulas || []).map((f) => ({
      name: f.nameSimp,
      herbs: (f.ingredients || []).length,
      tiao: a.tiao,
      first: a.zhHans.split(/[。！？]/)[0].slice(0, 30),
    }))
  );
}

/** 校勘用：古诗文网本的口径（段数 / 字数） */
function crossCheck() {
  return { pian: GS_NO, paras: GSPIAN.paraCount, chars: GSPIAN.chars, sha8: GSPIAN.rawSha256.slice(0, 8) };
}

function report() {
  const t = totals();
  const h = hits();
  console.log(`第 ${t.pian} 篇 · ${PIAN.nameSimp}`);
  console.log(`  条 ${t.tiao} · 方 ${t.fang} · 字 ${t.chars}（条文 ${t.tiaoChars}）· 方条比 ${(t.fang / t.tiao).toFixed(2)}`);
  console.log(`  出方条 ${t.chu} · 无方条 ${t.wu} · 药味 ${t.herbTokens} 次 / ${t.distinctHerbs} 味`);
  console.log('  表 2（字面命中，可重叠）：');
  for (const [k, v] of Object.entries(h)) console.log(`    ${k}: ${v}`);
  const c = crossCheck();
  console.log(`  校勘：古诗文网本第 ${c.pian} 篇 ${c.paras} 段 / ${c.chars} 字（sha256 ${c.sha8}…）`);
}

module.exports = { PIAN_NO, GS_NO, PIAN, ARTICLES, GSPIAN, RULES, cps, totals, hits, formulaTable, crossCheck };

if (require.main === module) report();
