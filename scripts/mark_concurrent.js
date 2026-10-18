'use strict';
/**
 * scripts/mark_concurrent.js —— 标记/取消「并病（两证同存）」证候
 *
 * 为什么需要它：证名里有「A、B证」这一批，并不都是"一个复合证"。
 * 中医里**并病**是指两个证候同时存在（合病/并病），两者可以同存、各有各的证候表现 ——
 * 这类证候的合格判据不能要求"某一条文献把整串写出来"：
 * **两侧各有来源覆盖即可**（即 scope=component 即达标），名称也不拆。
 *
 * 这不是放宽标准，是换判据：证据要求从「整串同现」变成「两证各自成立且并存不矛盾」。
 * 哪些是并病是**领域判断**，所以由人给定，脚本只负责把它记进数据（可复核、可撤销）。
 *
 * 用法：
 *   node scripts/mark_concurrent.js labels.json        # 标记（写入 concurrent: true + 依据）
 *   node scripts/mark_concurrent.js labels.json --off  # 取消标记
 *   labels.json：[{"label":"…","why":"并病：…（谁认定的）"}, …]
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EXT = path.join(ROOT, 'standards/semtensor/descriptions/external.json');

function main() {
  const [listPath, flag] = process.argv.slice(2);
  if (!listPath) {
    console.log('用法: node scripts/mark_concurrent.js <labels.json> [--off]');
    process.exit(2);
  }
  const off = flag === '--off';
  const list = JSON.parse(fs.readFileSync(path.resolve(listPath), 'utf8'));
  const ext = JSON.parse(fs.readFileSync(EXT, 'utf8'));
  let changed = 0;
  for (const item of list) {
    const e = ext.entries.find((x) => x.label === item.label);
    if (!e) { console.log(`跳过（未入库）：${item.label}`); continue; }
    if (off) { delete e.concurrent; delete e.concurrentWhy; changed += 1; }
    else { e.concurrent = true; e.concurrentWhy = item.why || '并病（两证同存）'; changed += 1; }
  }
  fs.writeFileSync(EXT, `${JSON.stringify(ext, null, 2)}\n`, 'utf8');
  console.log(`${off ? '取消标记' : '标记为并病'} ${changed} 条`);
  console.log('接着跑：node scripts/external_batch.js --audit && node scripts/build_dsu_descriptions.js');
}

if (require.main === module) main();
