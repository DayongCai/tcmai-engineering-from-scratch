'use strict';
/**
 * 六经可核性检查：《伤寒论》底本逐经给出 {提纲条, 篇数, 条数, 方命中, 状态}
 *
 *   node code/main.js
 *
 * 设计：
 *   1. 只按 domain 字段分组统计规模，不对「属哪经」下判断 —— 底本的域标签有错配。
 *   2. 提纲条用逐字检索，不做同义扩展；找不到就是 MIA，不许用记忆补。
 *   3. MIA 的经必须同时报「标志物全 0」的探针结果，让缺口可复核而不只是「没找到」。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));

/** 六经：提纲条首句 + 用来验证「这一经真的在库里」的标志方 */
const JING = [
  { name: '太阳', outline: '太阳之为病', probes: ['桂枝汤', '麻黄汤'] },
  { name: '阳明', outline: '阳明之为病', probes: ['大承气汤', '调胃承气汤'] },
  { name: '少阳', outline: '少阳之为病', probes: ['小柴胡汤'] },
  { name: '太阴', outline: '太阴之为病', probes: ['理中丸'] },
  { name: '少阴', outline: '少阴之为病', probes: ['麻黄附子细辛汤', '黄连阿胶汤', '但欲寐'] },
  { name: '厥阴', outline: '厥阴之为病', probes: ['乌梅丸', '当归四逆汤'] },
];

const ITEMS = [];
for (const p of BOOK.pian) {
  for (const it of p.items) ITEMS.push({ pian: p.no, pianName: p.pian, domain: p.domain, text: it.text });
}

const count = (needle) => ITEMS.filter((i) => i.text.includes(needle)).length;

/** 逐经检查。status: ok（提纲+至少一个标志物）/ weak（有提纲，标志物缺）/ MIA（提纲缺） */
function audit() {
  return JING.map((j) => {
    const outlineHits = ITEMS.filter((i) => i.text.includes(j.outline));
    const pianSet = new Set();
    for (const h of outlineHits) pianSet.add(h.pian);
    const tiao = ITEMS.filter((i) => i.domain === `${j.name}病`).length;
    const pian = new Set(ITEMS.filter((i) => i.domain === `${j.name}病`).map((i) => i.pian)).size;
    const probes = j.probes.map((p) => ({ probe: p, hits: count(p) }));
    const anyProbe = probes.some((p) => p.hits > 0);
    const status = outlineHits.length === 0 ? 'MIA' : anyProbe ? 'ok' : 'weak';
    return {
      name: j.name,
      status,
      tiao,
      pian,
      outline: outlineHits.length ? outlineHits[0].text : null,
      outlineAt: outlineHits.length ? `篇${outlineHits[0].pian}` : null,
      probes,
    };
  });
}

function main() {
  const rows = audit();
  console.log('六经可核性（底本 27 篇 / 逐字检索，不用记忆补缺）\n');
  console.log('经    状态  条数  篇数  提纲条位置  提纲首句');
  for (const r of rows) {
    const head = r.outline ? r.outline.slice(0, 18) + '…' : '——（检索不到）';
    console.log(`${r.name}  ${r.status.padEnd(5)} ${String(r.tiao).padStart(4)}  ${String(r.pian).padStart(3)}   ${String(r.outlineAt || '-').padEnd(8)} ${head}`);
  }
  const mia = rows.filter((r) => r.status !== 'ok');
  console.log('\n不可用/偏弱的经：');
  for (const r of mia) {
    const zero = r.probes.filter((p) => p.hits === 0).map((p) => p.probe);
    console.log(`  · ${r.name}（${r.status}）标志物零命中：${zero.join('、') || '无'}`);
  }
  console.log('\n口径：条数按 domain 字段分组，底本域标签存在错配，故条数只表规模、不表归属。');
  console.log('本输出为文本结构核对，不构成辨证指导。');
}

if (require.main === module) main();
module.exports = { JING, ITEMS, count, audit, BOOK };
