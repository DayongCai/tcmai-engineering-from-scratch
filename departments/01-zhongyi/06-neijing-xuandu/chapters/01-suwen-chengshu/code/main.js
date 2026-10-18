'use strict';
/**
 * 《黄帝内经》文本结构统计：162 篇的字数与条数
 *
 *   node code/main.js
 *
 * 口径（写在结论旁边，换口径数字就变）：
 *   · 字数 = 去掉空白后的字符数，含标点，不含篇名与校勘夹注
 *   · 条数 = 材料里「原文/注释」块的数量（不是通行本的「条」编号）
 *   · 只统计仓库内已入库的原件，不联网
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const SRC = path.join(ROOT, 'standards/materials/neijing-quanwen/sources/黄帝内经全文.xls');

function loadWorkbook() {
  const { readWorkbook } = require(path.join(ROOT, 'scripts/lib_xls.js'));
  return readWorkbook(SRC);
}

/** 逐表统计：SW* 为素问，LS* 为灵枢 */
function stats(wb = loadWorkbook()) {
  const acc = {
    素问: { pian: 0, chars: 0, blocks: 0 },
    灵枢: { pian: 0, chars: 0, blocks: 0 },
  };
  for (const s of wb.sheets) {
    const book = s.name.startsWith('SW') ? '素问' : s.name.startsWith('LS') ? '灵枢' : null;
    if (!book) continue;
    const blocks = s.rows.slice(2).filter((r) => String(r[2] || '').trim());
    const chars = blocks.reduce((a, r) => a + String(r[2]).replace(/\s/g, '').length, 0);
    acc[book].pian += 1;
    acc[book].chars += chars;
    acc[book].blocks += blocks.length;
  }
  const total = {
    pian: acc.素问.pian + acc.灵枢.pian,
    chars: acc.素问.chars + acc.灵枢.chars,
    blocks: acc.素问.blocks + acc.灵枢.blocks,
  };
  for (const k of ['素问', '灵枢']) {
    acc[k].avgChars = Math.round(acc[k].chars / acc[k].pian);
    acc[k].avgBlocks = +(acc[k].blocks / acc[k].pian).toFixed(1);
  }
  return { books: acc, total };
}

/** 按篇名片段检索：返回 {name, book, chars, blocks} 或 null（找不到就说找不到） */
function find(name, wb = loadWorkbook()) {
  const hit = wb.sheets.find((s) => String((s.rows[0] || [])[0] || '').includes(name));
  if (!hit) return null;
  const blocks = hit.rows.slice(2).filter((r) => String(r[2] || '').trim());
  return {
    name: String(hit.rows[0][0]),
    book: hit.name.startsWith('SW') ? '素问' : '灵枢',
    chars: blocks.reduce((a, r) => a + String(r[2]).replace(/\s/g, '').length, 0),
    blocks: blocks.length,
  };
}

function main() {
  if (!fs.existsSync(SRC)) {
    console.log('源文件未入库，无法统计（先跑 node scripts/import_materials.js）');
    return;
  }
  const s = stats();
  for (const k of ['素问', '灵枢']) {
    const b = s.books[k];
    console.log(`${k}：${b.pian} 篇 · ${b.chars} 字 · 篇均 ${b.avgChars} 字 / ${b.avgBlocks} 条`);
  }
  console.log(`合计：${s.total.pian} 篇 · ${s.total.chars} 字 · ${s.total.blocks} 条`);
  console.log(`素问篇均比灵枢长 ${((s.books.素问.avgChars / s.books.灵枢.avgChars - 1) * 100).toFixed(0)}% —— 体裁差异，不是重要性差异`);

  for (const q of ['至真要大论', '九针十二原', '不存在篇']) {
    const r = find(q);
    console.log(r ? `  检索「${q}」→ ${r.name}（${r.book}，${r.chars} 字 / ${r.blocks} 条）` : `  检索「${q}」→ 未找到（不猜、不返回最相近的）`);
  }
  console.log('\n本输出为教学样例，统计口径见文件头；不构成诊疗建议。');
}

if (require.main === module) main();
module.exports = { stats, find, loadWorkbook, SRC };
