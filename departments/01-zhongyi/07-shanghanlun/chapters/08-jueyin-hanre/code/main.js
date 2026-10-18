'use strict';
/**
 * 厥阴篇：提纲逐症解析 + 篇内/篇外分布探针 + 混入检查
 *
 *   node code/main.js
 *
 * 口径：
 *   · 提纲里「下之利不止」是误治后果，不是症状；代码把它放进 contra，不并入 symptoms。
 *   · 每类证据都报两列：篇 24 内条数 / 全库条数 —— 只报一列会看不出证据边界。
 *   · 乌梅丸、四逆散在底本全库 0 命中；本章只标缺口，不补条文。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));

const JUEYIN = 24;
const PIAN = BOOK.pian.find((p) => p.no === JUEYIN);
const ALL = [];
for (const p of BOOK.pian) for (const it of p.items) ALL.push({ pian: p.no, text: it.text });

/** 异体归一：底本「心中疼𤍠」用 𤍠，不归一就数不出这一症（本章自身踩到的坑） */
const norm = (x) => x.split('𤍠').join('热');

/** 提纲逐症拆分：「下之利不止」归 contra */
function parseOutline() {
  const t = norm(PIAN.items[0].text);
  const symptoms = ['消渴', '气上撞心', '心中疼热', '饥而不欲食', '食则吐蛔'].filter((k) => t.includes(k));
  const contra = ['下之利不止', '若下之', '下之'].find((k) => t.includes(k)) || null;
  return { raw: t, symptoms, contra, symptomCount: symptoms.length };
}

/** 篇内 vs 全库 */
function probe(key) {
  return {
    key,
    inPian: PIAN.items.filter((i) => i.text.includes(key)).length,
    all: ALL.filter((i) => i.text.includes(key)).length,
  };
}

/** 篇内混入的其他经病名 */
function mixCheck() {
  const out = {};
  for (const k of ['太阳病', '阳明病', '少阳病', '太阴病', '少阴病', '霍乱']) {
    const n = PIAN.items.filter((i) => i.text.includes(k)).length;
    if (n) out[k] = n;
  }
  return out;
}

function main() {
  const o = parseOutline();
  console.log(`厥阴提纲（篇 ${JUEYIN} 第 1 条）：\n  ${o.raw}\n`);
  console.log(`  症状 ${o.symptomCount} 项：${o.symptoms.join('、')}`);
  console.log(`  误治后果：${o.contra}（不是症状）\n`);

  console.log(`篇 ${JUEYIN} 共 ${PIAN.actual.tiao} 条 / ${PIAN.actual.chars} 字\n`);
  console.log('篇内 vs 全库：');
  for (const k of ['厥', '乌梅丸', '四逆散', '当归四逆汤', '厥深', '热亦深', '气上撞心', '消渴', '吐蛔']) {
    const r = probe(k);
    const flag = r.inPian === 0 && r.all === 0 ? '  ← 底本无此条' : r.inPian === 0 ? '  ← 仅篇外' : '';
    console.log(`  ${k.padEnd(6, '　')} 篇内 ${String(r.inPian).padStart(2)} ｜ 全库 ${String(r.all).padStart(3)}${flag}`);
  }
  console.log(`\n混入检查：${JSON.stringify(mixCheck())}`);
  console.log('口径：厥阴篇残缺，「厥」字在别经语境亦大量出现，不可按字面归经。');
  console.log('本输出为文本核对，不构成辨证处方建议。');
}

if (require.main === module) main();
module.exports = { parseOutline, probe, mixCheck, PIAN, ALL };
