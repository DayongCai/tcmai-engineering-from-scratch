'use strict';
/**
 * 第 1 章 · 全书结构画像：篇 / 条 / 方 / 药 与四类划分
 *
 *   node code/main.js
 *
 * 数据：standards/jingui/底本.json（外源·笈成，sha256 见该目录 README）
 *
 * 口径（三条，改任何一条都要同步改 docs/zh.md）：
 *   · 方取 formulas[] 全部：174 = **165 有方文** + **9 互见（refOnly）**。
 *     互见者只有方名与出处注（「見前痙病中」「未見」），无药味，故不进药味统计；
 *     条文里只提名而源页无方块的，仍不计。
 *   · 序 + 3 附篇（杂疗方/禽兽鱼虫禁忌/果实菜谷禁忌）无条号（tiao: null），
 *     单列为「附」，不进四类，也不参与方条比排序。
 *   · 四类划分是本章归纳（原文无此分类）：论点见 docs，边界重叠如实标注。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));

/** 篇 N → 类别。单列出来，便于测试与文档对齐 */
const CLASS_OF = {
  1: '总论', 11: '总论',
  2: '外感', 4: '外感', 5: '外感',
  3: '少见病',
  6: '内伤', 7: '内伤', 8: '内伤', 9: '内伤', 10: '内伤',
  12: '内伤', 13: '内伤', 14: '内伤', 15: '内伤', 16: '内伤',
  17: '内伤', 18: '内伤', 19: '内伤',
  20: '妇人', 21: '妇人', 22: '妇人',
};

const formulasOf = (p) => p.articles.flatMap((a) => a.formulas || []);
const herbsOf = (p) => formulasOf(p).flatMap((f) => f.ingredients.map((i) => i.herbSimp || i.herb));

/** 逐篇画像（按篇号排序，附篇排最后） */
function profile() {
  return BOOK.pian
    .map((p) => {
      const f = formulasOf(p);
      return {
        no: p.no,
        name: p.nameSimp,
        kind: p.no == null ? '附' : '正文',
        cls: p.no == null ? '附' : CLASS_OF[p.no] || '未归',
        tiao: p.articles.length,
        fang: f.length,
        per: p.articles.length ? Number((f.length / p.articles.length).toFixed(2)) : 0,
        herbs: herbsOf(p).length,
        chars: p.chars,
      };
    })
    .sort((a, b) => (a.no == null ? 999 : a.no) - (b.no == null ? 999 : b.no));
}

/** 四类汇总（附单列，不并入） */
function classify() {
  const rows = profile();
  const out = {};
  for (const r of rows) {
    const k = r.cls;
    out[k] = out[k] || { tiao: 0, fang: 0, pian: 0, herbs: 0 };
    out[k].tiao += r.tiao;
    out[k].fang += r.fang;
    out[k].pian += 1;
    out[k].herbs += r.herbs;
  }
  return out;
}

/** 方条比两端：论多治少（=0）与方最密 */
function densityRank() {
  const rows = profile().filter((r) => r.kind === '正文');
  return {
    sparsest: rows.filter((r) => r.per === 0).map((r) => `第${r.no}篇 ${r.name}`),
    densest: [...rows].sort((a, b) => b.per - a.per).slice(0, 3).map((r) => `第${r.no}篇 ${r.name} ${r.per}`),
  };
}

function totals() {
  const rows = profile();
  const zhengwen = rows.filter((r) => r.kind === '正文');
  return {
    pianTotal: rows.length,
    pianZhengwen: zhengwen.length,
    pianFu: rows.length - zhengwen.length,
    tiao: rows.reduce((n, r) => n + r.tiao, 0),
    tiaoZhengwen: zhengwen.reduce((n, r) => n + r.tiao, 0),
    fang: rows.reduce((n, r) => n + r.fang, 0),
    fangRefOnly: BOOK.pian.flatMap(formulasOf).filter((f) => f.refOnly).length,
    herbTokens: rows.reduce((n, r) => n + r.herbs, 0),
    distinctHerbs: new Set(BOOK.pian.flatMap((p) => herbsOf(p))).size,
  };
}

if (require.main === module) {
  console.log('');
  console.log('  教学边界：本输出为《金匮要略》文本结构统计，外源·笈成留档可复算，不构成诊疗依据。');
  console.log('');
  const t = totals();
  console.log('═══ 金匮要略 · 全书结构 ═══');
  console.log(`  篇 ${t.pianTotal}（正文 ${t.pianZhengwen} + 序附 ${t.pianFu}）· 条 ${t.tiao}（正文 ${t.tiaoZhengwen}）· 方 ${t.fang}（有方文 ${t.fang - t.fangRefOnly} + 互见 ${t.fangRefOnly}）`);
  console.log(`  药味出现 ${t.herbTokens} 次 · 不同药 ${t.distinctHerbs} 味\n`);
  console.log('  篇 | 名 | 类 | 条 | 方 | 方/条');
  for (const r of profile()) console.log(`  ${r.no == null ? '—' : r.no} | ${r.name} | ${r.cls} | ${r.tiao} | ${r.fang} | ${r.per}`);
  console.log('\n  类 | 篇 | 条 | 方');
  for (const [k, v] of Object.entries(classify())) console.log(`  ${k} | ${v.pian} | ${v.tiao} | ${v.fang}`);
  const d = densityRank();
  console.log(`\n  论多治少：${d.sparsest.join('、') || '无'}`);
  console.log(`  方最密：${d.densest.join('；')}`);
}

module.exports = { BOOK, CLASS_OF, profile, classify, densityRank, totals, formulasOf, herbsOf };
