'use strict';
/**
 * 少阳病：柴胡证 OR 判定 + 三禁检查 + 通假/异体归一检索
 *
 *   node code/main.js
 *
 * 口径：
 *   · 原文「但见一证便是，不必悉具」→ 四证取一即可立证，逻辑是 OR 不是 AND。
 *   · 提纲三症（口苦/咽干/目眩）单列，不与四证合并计分。
 *   · 七个「或」是兼症，不当必要条件，代码不参与判定。
 *   · 三禁（汗/吐/下）只做文本提示，不作绝对禁忌。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));
const TEXTS = [];
for (const p of BOOK.pian) for (const it of p.items) TEXTS.push({ pian: p.no, text: it.text });

/** 归一：type 区分「异体字」与「通假」，日后扩展可分辨 */
const VARIANTS = [
  { from: '𤍠', to: '热', type: '异体' },
  { from: '嘿嘿', to: '默默', type: '通假' },
];

function normalize(text) {
  let out = text;
  const replaced = [];
  for (const v of VARIANTS) {
    const n = out.split(v.from).length - 1;
    if (n) { replaced.push({ ...v, n }); out = out.split(v.from).join(v.to); }
  }
  return { text: out, replaced };
}

function search(needle) {
  const raw = TEXTS.filter((t) => t.text.includes(needle)).length;
  const norm = TEXTS.filter((t) => normalize(t.text).text.includes(needle)).length;
  return { needle, raw, normalized: norm, missed: norm - raw };
}

const MAIN = ['往来寒热', '胸胁苦满', '默默不欲饮食', '心烦喜呕'];
const OUTLINE = ['口苦', '咽干', '目眩'];

/** 柴胡证判定：OR 逻辑 */
function shaoYang(signs = {}) {
  const hit = MAIN.filter((k) => signs[k] === true);
  const outline = OUTLINE.filter((k) => signs[k] === true);
  if (hit.length === 0) {
    return {
      established: false,
      hit,
      outline,
      missing: MAIN.filter((k) => !hit.includes(k)),
      why: '四证皆无（原文：但见一证便是，故无证不立）',
      notExcluded: ['提纲三症可单独提示少阳倾向，但不等于柴胡证'],
    };
  }
  return {
    established: true,
    hit,
    outline,
    missing: [],
    why: `一证即可立（原文「不必悉具」）：${hit[0]}`,
    notExcluded: ['若已汗/吐/下，须看柴胡证罢不罢', '合病（见第 9 章）'],
  };
}

/** 三禁：报了做过什么，就给对应告诫；未做则不提 */
function contra(signs = {}) {
  const out = [];
  if (signs.已汗) out.push('已发汗：津伤则邪易入里，原文反复言不可发汗');
  if (signs.已吐) out.push('已吐：胃气受损，柴胡证欲解而中气先虚');
  if (signs.已下) out.push('已下：若柴胡证不罢者，原文仍许复与柴胡汤，但须防引邪入里');
  return out;
}

function main() {
  console.log('检索（raw vs 归一化）：');
  for (const k of ['默默不欲饮食', '嘿嘿不欲饮食', '往来寒热', '胸胁苦满', '心烦喜呕', '但见一证']) {
    const r = search(k);
    console.log(`  ${k}：raw ${r.raw} → 归一 ${r.normalized}（漏检 ${r.missed}）`);
  }
  const tiao = BOOK.pian.filter((p) => p.domain === '少阳病').reduce((a, p) => a + p.actual.tiao, 0);
  console.log(`\n规模：少阳病域 ${tiao} 条 · 小柴胡汤 ${search('小柴胡汤').raw} 条 · 柴胡证 ${search('柴胡证').raw} 条`);

  console.log('\n判定：');
  for (const s of [{ 往来寒热: true }, { 心烦喜呕: true, 已下: true }, {}]) {
    const r = shaoYang(s);
    const c = contra(s);
    console.log(`  ${JSON.stringify(s)} → ${r.established ? '立柴胡证' : '不立证'}｜命中 ${r.hit.join('/') || '无'}`);
    if (c.length) console.log(`     三禁提示：${c.join('；')}`);
  }
  console.log('\n本输出为条文逻辑演示，不构成辨证处方建议。');
}

if (require.main === module) main();
module.exports = { normalize, search, shaoYang, contra, VARIANTS, TEXTS };
