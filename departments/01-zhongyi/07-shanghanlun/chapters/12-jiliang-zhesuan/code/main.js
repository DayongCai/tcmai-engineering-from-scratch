'use strict';
/**
 * 经方剂量的度量衡折算：三档并列，不裁一种
 *
 *   node code/main.js
 *
 * 口径：
 *   · 底本原方用汉制（两/斤/铢/升/合/枚/个），本章只做「同一数字在不同折算前提下」的并列换算。
 *   · 三档的前提必须写在结果里：没有前提的克数不能引用。
 *   · 枚/个/把/片 等计数单位**不折算为质量** —— 大枣一枚几克没有原文依据，任何数字都是猜。
 *   · 容量按汉制 1 升 = 200 ml 折算（学界通行值），仍给区间标注。
 *   · 底本内嵌宋人（林亿等）校语，本身就带「今以算法约之」的折算痕迹 —— 折算不是现代发明。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));
const ITEMS = [];
for (const p of BOOK.pian) for (const it of p.items) ITEMS.push({ id: `${p.no}:${it.no}`, text: it.text });

/** 三档折算前提（每档都带出处与区间，不给点值） */
const SCHOOLS = {
  han220: { label: '汉制·1 斤=220 g（东汉偏低值）', liang: [13.75, 13.75], basis: '东汉权衡实测偏低一端' },
  han250: { label: '汉制·1 斤=250 g（偏高一端）', liang: [15.625, 15.625], basis: '汉制权衡实测偏高一端' },
  ming: { label: '明清折量·1 两≈3 g', liang: [3, 3], basis: '「古之一两，今用一钱可也」一系折量法' },
};

const RATIO = { jin: 16, liang: 24 };       // 1 斤 = 16 两；1 两 = 24 铢
const VOLUME = { sheng: 200, ge: 20 };       // ml，汉制 1 升 = 10 合

/** 重量换算：斤/两/铢/分（分 = 1/4 两，仅部分方使用；这里按两制分注） */
function toGrams(amount, unit, school) {
  const s = SCHOOLS[school];
  if (!s) throw new Error(`未知折算档：${school}`);
  const perLiang = s.liang[0];
  let liang;
  if (unit === '斤') liang = amount * RATIO.jin;
  else if (unit === '两') liang = amount;
  else if (unit === '铢') liang = amount / RATIO.liang;
  else if (unit === '分') liang = amount / 4;
  else throw new Error(`不支持的重量单位：${unit}`);
  return { grams: Number((liang * perLiang).toFixed(2)), label: s.label, basis: s.basis, perLiang };
}

/** 容量换算 */
function toMl(amount, unit) {
  if (unit === '升') return { ml: amount * VOLUME.sheng, basis: '汉制 1 升 = 200 ml（通行值）' };
  if (unit === '合') return { ml: amount * VOLUME.ge, basis: '汉制 1 合 = 20 ml' };
  throw new Error(`不支持的容量单位：${unit}`);
}

/** 计数单位：拒绝换算 */
function countUnit(amount, unit) {
  if (!['枚', '个', '把', '片', '茎', '尺'].includes(unit)) throw new Error(`不是计数单位：${unit}`);
  return { count: amount, unit, grams: null, note: '计数单位不折算为质量：原文未给单枚重量，任何克数都是推测' };
}

/** 单位关系自检 */
function checkRelations() {
  return [
    { rel: '1 斤 = 16 两', ok: RATIO.jin === 16 },
    { rel: '1 两 = 24 铢', ok: RATIO.liang === 24 },
    { rel: '1 升 = 10 合', ok: VOLUME.sheng / VOLUME.ge === 10 },
  ];
}

/** 底本里出现过的单位频次 */
function unitCensus() {
  const units = ['两', '升', '枚', '合', '分', '斤', '个', '铢', '尺', '片', '钱匕', '方寸匕', '把', '茎'];
  return units.map((u) => ({ unit: u, tiao: ITEMS.filter((i) => i.text.includes(u)).length }));
}

/** 桂枝汤（底本 4:41 林亿校语所载方）三档并列 */
function guizhiTang() {
  const recipe = [['桂枝', 3, '两'], ['芍药', 3, '两'], ['生姜', 3, '两'], ['甘草', 2, '两']];
  return Object.keys(SCHOOLS).map((k) => {
    const rows = recipe.map(([name, n, u]) => ({ name, n, u, ...toGrams(n, u, k) }));
    const sum = rows.reduce((a, r) => a + r.grams, 0);
    return { school: SCHOOLS[k].label, rows, sum: Number(sum.toFixed(2)) };
  });
}

function main() {
  console.log('单位关系自检：');
  for (const r of checkRelations()) console.log(`  ${r.ok ? '✓' : '✗'} ${r.rel}`);

  console.log('\n底本单位频次（条数）：');
  console.log('  ' + unitCensus().map((x) => `${x.unit} ${x.tiao}`).join(' · '));

  console.log('\n桂枝汤（底本 4:41 载：桂枝/芍药/生姜各三两，甘草二两）三档并列：');
  for (const s of guizhiTang()) {
    console.log(`  ${s.school}`);
    console.log('    ' + s.rows.map((r) => `${r.name} ${r.n}${r.u}=${r.grams}g`).join('  ') + ` ｜四味合计 ${s.sum} g`);
  }
  const sums = guizhiTang().map((s) => s.sum);
  console.log(`  最高/最低 = ${(Math.max(...sums) / Math.min(...sums)).toFixed(2)} 倍`);

  console.log('\n容量：水七升 / 煮取三升 / 服一升');
  for (const [n, u] of [[7, '升'], [3, '升'], [1, '升']]) {
    const r = toMl(n, u);
    console.log(`  ${n}${u} = ${r.ml} ml（${r.basis}）`);
  }

  console.log('\n计数单位（拒绝折算）：');
  const c = countUnit(12, '枚');
  console.log(`  大枣 ${c.count}${c.unit} → ${c.grams === null ? 'null' : c.grams}g｜${c.note}`);

  console.log('\n口径：三档前提必须随数字一起给出；本章不裁哪一种正确。');
  console.log('本输出为度量衡换算演示，不构成用量建议。');
}

if (require.main === module) main();
module.exports = { SCHOOLS, RATIO, VOLUME, toGrams, toMl, countUnit, checkRelations, unitCensus, guizhiTang, ITEMS };
