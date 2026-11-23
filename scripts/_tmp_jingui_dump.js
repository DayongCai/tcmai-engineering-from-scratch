'use strict';
// 临时取证脚本（不入库）
const fs = require('node:fs');
const path = require('node:path');
const ROOT = 'E:/tcmai-engineering-from-scatch';
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));

const list = [
  ['11', 7], ['12', 8], ['13', 9], ['14', 10], ['15', 11], ['16', 14], ['17', 15],
  ['18', 16], ['19', 17], ['20', 18], ['21', 19], ['22', 23], ['23', 24], ['24', 25],
];

const cps = (s) => [...s].length;

function getPian(no) {
  return no <= 22 ? BOOK.pian.find((p) => p.no === no) : BOOK.pian.filter((p) => !p.no)[no - 22];
}

const out = [];
for (const [ch, no] of list) {
  const P = getPian(no);
  const A = [...P.articles].sort((a, b) => a.idx - b.idx);
  const fang = A.flatMap((a) => a.formulas || []);
  const herbs = fang.flatMap((f) => f.ingredients || []);
  const freq = new Map();
  for (const h of herbs) freq.set(h.herbSimp, (freq.get(h.herbSimp) || 0) + 1);
  const top = [...freq.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh')).slice(0, 8);
  out.push({
    ch, no, name: P.nameSimp, chars: P.chars, tiao: A.length, fangCount: fang.length,
    chu: A.filter((a) => (a.formulas || []).length > 0).length,
    herbTokens: herbs.length, distinct: freq.size,
    top,
    articles: A.map((a) => ({
      tiao: a.tiao, idx: a.idx, len: cps(a.zhHans),
      text: a.zhHans,
      nf: (a.formulas || []).length,
      fang: (a.formulas || []).map((f) => ({ name: f.nameSimp, n: (f.ingredients || []).length })),
    })),
  });
}
fs.writeFileSync(path.join(ROOT, 'scripts/_tmp_jingui_dump.json'), JSON.stringify(out, null, 1));
console.log('ok', out.length);
