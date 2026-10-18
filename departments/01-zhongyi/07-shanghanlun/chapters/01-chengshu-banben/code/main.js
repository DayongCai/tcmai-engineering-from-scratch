'use strict';
/**
 * 《伤寒论》底本结构校验：域统计 · 声明/实测差异 · 篇内条号引用
 *
 *   node code/main.js
 *
 * 口径：
 *   · 条 = 底本 items 的编号单位（刻本把方后注、煎服法也计在内，故 1760 条 > 宋本 398 条）
 *   · declared = 源表声称值；actual = 逐条解析后的实测值。两者分开存，差异本身是证据。
 *   · 条号只在**声明底本**的前提下有效（本底本篇章内连续编号）
 */

const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const SRC = path.join(ROOT, 'standards/shanghan/底本.json');

function load() {
  return JSON.parse(require('node:fs').readFileSync(SRC, 'utf8'));
}

/** 按语义域汇总 */
function domains(j = load()) {
  return j.domains.map((d) => ({
    name: d.name, pian: d.pianist, tiao: d.actualTiao, chars: d.chars,
  }));
}

/** declared ≠ actual 的篇（含差值），这是「源表数字与实测不一致」的可核对证据 */
function drift(j = load()) {
  return j.pian
    .filter((p) => p.declared.tiao !== p.actual.tiao || p.declared.chars !== p.actual.chars)
    .map((p) => ({
      no: p.no,
      pian: p.pian,
      tiaoDelta: p.actual.tiao - p.declared.tiao,
      charsDelta: p.actual.chars - p.declared.chars,
    }));
}

/**
 * 篇内条号引用。
 * @param {string} pianName 篇名（允许片段，但必须唯一命中）
 * @param {number} n 篇内条号（1 起）
 */
function tiao(pianName, n, j = load()) {
  if (!pianName || !Number.isInteger(n) || n < 1) {
    throw new Error('必须同时给出篇名与篇内条号（不给条号就是猜，猜出来的引用无法复核）');
  }
  const hits = j.pian.filter((p) => p.pian.includes(pianName));
  if (hits.length === 0) throw new Error(`没有这一篇: ${pianName}`);
  if (hits.length > 1) {
    throw new Error(`篇名不唯一（命中 ${hits.length} 篇）：${hits.map((p) => p.pian).join(' / ')}`);
  }
  const it = hits[0].items.find((x) => x.no === n);
  if (!it) throw new Error(`${hits[0].pian} 只有 ${hits[0].items.length} 条，没有第 ${n} 条`);
  return { pian: hits[0].pian, no: it.no, text: it.text };
}

function main() {
  const j = load();
  console.log(`底本：${j.counts.pian} 篇 · ${j.counts.tiao} 条 · ${j.counts.chars} 字 · ${j.counts.domains} 域`);
  console.log('\n语义域（按条数降序）：');
  for (const d of domains(j).sort((a, b) => b.tiao - a.tiao)) {
    console.log(`  ${d.name.padEnd(9, '　')} 篇 ${String(d.pian).padStart(2)} · 条 ${String(d.tiao).padStart(4)} · ${d.chars} 字`);
  }
  const d = drift(j);
  console.log(`\n声明数与实测数不一致的篇：${d.length}/${j.counts.pian}`);
  for (const x of d.slice(0, 5)) {
    console.log(`  第${x.no}篇 ${x.pian}｜条差 ${x.tiaoDelta >= 0 ? '+' : ''}${x.tiaoDelta}｜字差 ${x.charsDelta >= 0 ? '+' : ''}${x.charsDelta}`);
  }
  const t = tiao('辨太阳病脉证并治中', 72);
  console.log(`\n引用：${t.pian} 篇内第 ${t.no} 条 → ${t.text.slice(0, 40)}…`);
  console.log('\n提醒：条号是版本属性，引用必须带底本标识。本输出为教学样例。');
}

if (require.main === module) main();
module.exports = { domains, drift, tiao, load, SRC };
