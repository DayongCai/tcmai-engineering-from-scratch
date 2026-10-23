'use strict';
/**
 * scripts/mark_relation_chain.js —— 标记/取消「因果链（一证为因、一证为果）」证候
 *
 * 为什么要单独一个脚本：证名里的「A、B证」不全是并列构件，也不全是并病。
 * `热毒犯肺、痰瘀阻络证(哮喘性支气管肺炎)` 这种是**一条病机的先后**：
 * 前者是始动病机，后者是它的后果。要求一条文献写出整串是错的标准；
 * 但把它当并病也不对 —— 并病是两证同存，因果链是先后。
 *
 * 判据（见 EVIDENCE-STANDARD.md「因果链」节）：同一病种内，因、果各有一源即达标；
 * 名称不拆。哪些是因果链是**领域判断**，所以由人给定，脚本只负责落库（可复核、可撤销）。
 *
 * 与并病**互斥**：concurrent 与 relationChain 不能同时存在。脚本会拒绝这种写入 ——
 * 手工改数据绕不过去，测试里也有钉子。
 *
 * 用法：
 *   node scripts/mark_relation_chain.js labels.json        # 标记（写 relationChain + relationWhy）
 *   node scripts/mark_relation_chain.js labels.json --off  # 取消标记
 *   labels.json：[{"label":"…","why":"因果链：…（依据哪条来源的哪句话）"}, …]
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EXT = path.join(ROOT, 'standards/semtensor/descriptions/external.json');

function main() {
  const [listPath, flag] = process.argv.slice(2);
  if (!listPath) {
    console.log('用法: node scripts/mark_relation_chain.js <labels.json> [--off]');
    process.exit(2);
  }
  const off = flag === '--off';
  const list = JSON.parse(fs.readFileSync(path.resolve(listPath), 'utf8'));
  const ext = JSON.parse(fs.readFileSync(EXT, 'utf8'));
  let changed = 0;
  for (const item of list) {
    const e = ext.entries.find((x) => x.label === item.label);
    if (!e) { console.log(`跳过（未入库）：${item.label}`); continue; }
    if (off) { delete e.relationChain; delete e.relationWhy; changed += 1; continue; }
    if (e.concurrent) {
      // 互斥：同一条目不能既是「两证同存」又是「一证为因一证为果」。先撤销并病再标。
      console.log(`拒绝（已标并病 concurrent）：${item.label} —— 先 --off 撤销再改判`);
      continue;
    }
    if (e.scope !== 'component') {
      // whole/single 本来就算整串级，给它挂因果链会把两套口径混在一起。
      console.log(`跳过（scope=${e.scope}，不是构件级）：${item.label}`);
      continue;
    }
    if (!item.why || item.why.length < 10) {
      console.log(`拒绝（缺 relationWhy 依据）：${item.label}`);
      continue;
    }
    e.relationChain = 'cause-effect';
    e.relationWhy = item.why;
    changed += 1;
  }
  fs.writeFileSync(EXT, `${JSON.stringify(ext, null, 2)}\n`, 'utf8');
  console.log(`${off ? '取消标记' : '标记为因果链'} ${changed} 条`);
  console.log('接着跑：node scripts/external_batch.js --audit && node scripts/build_dsu_descriptions.js');
}

if (require.main === module) main();
