'use strict';
/**
 * 太阴篇证据链核对：拆篇 / 逐环核对 / 太阴阳明腹满鉴别
 *
 *   node code/main.js
 *
 * 口径：
 *   · 篇 12 是卷首与目录（isToc=true），不计入可用条文。
 *   · 提纲条两版并列（篇 23「下之必」/ 篇 27「若下之，必」），不择一。
 *   · 「跨篇」不算错，但必须在结论里标出篇名；代码用 crossPian 表达这件事。
 *   · 不据频次推归属，不重建缺失条文。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));
const TEXTS = [];
for (const p of BOOK.pian) for (const it of p.items) TEXTS.push({ pian: p.no, text: it.text });

const TOC_MARKS = ['辨太阴病脉证并治第十', '伤寒论卷', '校正', '校刻', '校。'];

function isToc(pian) {
  const items = BOOK.pian.find((p) => p.no === pian).items;
  const hits = items.filter((i) => TOC_MARKS.some((m) => i.text.includes(m))).length;
  return hits / items.length >= 0.6;
}

/** 拆太阴三篇 */
function splitPian() {
  return [12, 23, 27].map((n) => {
    const p = BOOK.pian.find((x) => x.no === n);
    return {
      pian: n,
      tiao: p.actual.tiao,
      chars: p.actual.chars,
      isToc: isToc(n),
      hasOutline: p.items.some((i) => i.text.includes('太阴之为病')),
      outline: (p.items.find((i) => i.text.includes('太阴之为病')) || {}).text || null,
    };
  });
}

/** 逐环核对：每条「结论←条文」映射的落点 */
function chainCheck(list) {
  return list.map(({ claim, needles, expectPian }) => {
    const hits = [];
    for (const n of needles) {
      for (const t of TEXTS) if (t.text.includes(n)) hits.push({ needle: n, pian: t.pian });
    }
    if (hits.length === 0) return { claim, status: 'missing', hits: [] };
    const pians = [...new Set(hits.map((h) => h.pian))];
    // 只以首个检索词（主判据）的落点判跨篇，避免旁证词把结论拉成 crossPian
    const primaryPians = [...new Set(hits.filter((h) => h.needle === needles[0]).map((h) => h.pian))];
    const base = primaryPians.length ? primaryPians : pians;
    const outside = expectPian ? base.filter((x) => !expectPian.includes(x)) : [];
    return {
      claim,
      status: outside.length ? 'crossPian' : 'hit',
      hits: hits.slice(0, 6),
      pians,
      crossPian: outside.length > 0,
    };
  });
}

/** 太阴 vs 阳明：腹满 ×（吐利 / 潮热大便硬）共现 */
function differentiate() {
  const tai = TEXTS.filter((t) => t.text.includes('腹满') && (t.text.includes('吐') || t.text.includes('自利')));
  const yang = TEXTS.filter((t) => t.text.includes('腹满') && (t.text.includes('潮热') || t.text.includes('大便硬')));
  return { taiyin: tai.length, yangming: yang.length };
}

function main() {
  console.log('太阴三篇拆解：');
  for (const r of splitPian()) {
    console.log(`  篇${r.pian}：${r.tiao} 条 / ${r.chars} 字｜目录残片 ${r.isToc ? '是' : '否'}｜提纲条 ${r.hasOutline ? '有' : '无'}`);
    if (r.outline) console.log(`       ${r.outline.slice(0, 46)}…`);
  }
  console.log('\n教材链条逐环核对：');
  const rows = chainCheck([
    { claim: '提纲：腹满而吐、食不下、自利益甚、时腹自痛', needles: ['腹满而吐', '食不下', '自利益甚', '时腹自痛'], expectPian: [23, 27] },
    { claim: '自利不渴者，属太阴', needles: ['自利不渴'], expectPian: [23, 27] },
    { claim: '宜服四逆辈', needles: ['四逆辈'], expectPian: [23, 27] },
    { claim: '理中丸主之', needles: ['理中丸'], expectPian: [23, 27] },
  ]);
  for (const r of rows) {
    const where = r.hits.length ? `命中篇 ${[...new Set(r.hits.map((h) => h.pian))].join('/')}` : '—';
    console.log(`  ${r.status.padEnd(9)} ${r.claim}（${where}）`);
  }
  const d = differentiate();
  console.log(`\n腹满鉴别：腹满+吐/自利 ${d.taiyin} 条；腹满+潮热/大便硬 ${d.yangming} 条`);
  console.log('\n口径：跨篇命中不是错误，但结论必须标篇名；本章不重建缺失条文。');
  console.log('本输出为文本核对，不构成辨证处方建议。');
}

if (require.main === module) main();
module.exports = { splitPian, chainCheck, differentiate, isToc, TEXTS };
