'use strict';
/**
 * 合病 / 并病扫描：从底本条文里抽「类型 + 经名配对 + 出处」
 *
 *   node code/main.js
 *
 * 口径（写在结论旁边）：
 *   · 计数单位是**条文处数**，不是病案数；刻本里同类条文重复出现会重复计数
 *   · 条文没写具体经名的（以「二阳」「三阳」指代）单列「未标经」，不并入任何配对
 *   · 只认六经名，不推断「太阳病」是否含阳明
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const SRC = path.join(ROOT, 'standards/shanghan/底本.json');
const JING = ['太阳', '阳明', '少阳', '太阴', '少阴', '厥阴'];

function load() {
  return JSON.parse(fs.readFileSync(SRC, 'utf8'));
}

/** 扫描全部条文，返回 [{kind, pair, pian, no, text}] */
function scan(j = load()) {
  const out = [];
  for (const p of j.pian) {
    for (const it of p.items) {
      for (const kind of ['合病', '并病']) {
        if (!it.text.includes(kind)) continue;
        const found = JING.filter((x) => it.text.includes(x));
        out.push({
          kind,
          pair: `${kind}:${found.join('+') || '未标经'}`,
          named: found,
          pian: p.pian,
          no: it.no,
          text: it.text,
        });
      }
    }
  }
  return out;
}

/** 按配对计数（未标经单列，不合并进任何配对） */
function tally(j = load()) {
  const rows = scan(j);
  const by = {};
  for (const r of rows) by[r.pair] = (by[r.pair] || 0) + 1;
  const total = { 合病: 0, 并病: 0 };
  for (const r of rows) total[r.kind] += 1;
  return { by, total };
}

/** 按配对检索：'太阳+阳明' 或 '并病:太阳+少阳' */
function find(pair, j = load()) {
  return scan(j).filter((r) => r.pair.includes(pair));
}

function main() {
  const t = tally();
  console.log(`合病 ${t.total.合病} 处 · 并病 ${t.total.并病} 处`);
  const rows = Object.entries(t.by).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of rows) console.log(`  ${k.padEnd(14, '　')} ${v}`);

  for (const q of ['太阳+阳明', '太阳+少阳']) {
    const hits = find(q);
    console.log(`\n检索「${q}」→ ${hits.length} 处`);
    for (const h of hits.slice(0, 4)) {
      console.log(`  ${h.kind}｜${h.pian} 篇内第 ${h.no} 条｜${h.text.slice(0, 42)}…`);
    }
  }
  console.log('\n提醒：计数单位是条文处数，不是病案数；5 处未标经名的条文单列，未并入任何配对。');
  console.log('本输出为教学样例，不构成诊疗建议。');
}

if (require.main === module) main();
module.exports = { scan, tally, find, JING, load };
