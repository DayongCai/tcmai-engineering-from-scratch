'use strict';
/**
 * scripts/merge_evidence.js —— 给**已入库**的证名追加来源（按 url 去重）
 *
 * 为什么要它：`--import` 对已有 label 是"跳过"，所以想给一条已入库的记录补证据，
 * 必须先 `--requery` 把条目退回队列，再用**合并后的完整来源清单**重新 import。
 * 手写合并容易漏掉旧来源（那等于用新证据覆盖掉旧的溯源），这个脚本负责：
 *   读 external.json 现状 → 与补丁按 url 合并 → 输出可直接喂给 --import 的批文件。
 *
 * 用法：
 *   node scripts/merge_evidence.js patch.json              # 输出到 %TEMP%/merged.json
 *   node scripts/merge_evidence.js patch.json out.json
 *   patch.json 形如：[{label, sources:[{type,title,url,snippet}]}, ...]
 *
 * 之后：
 *   node scripts/external_batch.js --requery "<证名>"   # 逐条退回
 *   node scripts/external_batch.js --import <out.json>
 *   node scripts/external_batch.js --audit
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EXT = path.join(ROOT, 'standards/semtensor/descriptions/external.json');

function main() {
  const [patchPath, outArg] = process.argv.slice(2);
  if (!patchPath) {
    console.log('用法: node scripts/merge_evidence.js <patch.json> [out.json]');
    process.exit(2);
  }
  const out = outArg || path.join(process.env.LOCALAPPDATA || require('node:os').tmpdir(), 'Temp', 'merged.json');
  const patch = JSON.parse(fs.readFileSync(path.resolve(patchPath), 'utf8'));
  const ext = JSON.parse(fs.readFileSync(EXT, 'utf8'));

  const result = [];
  for (const item of patch) {
    if (!item || !item.label || !Array.isArray(item.sources)) continue;
    const cur = ext.entries.find((e) => e.label === item.label);
    if (!cur) {
      // 未入库的证名不该走这里 —— 直接用 --import 即可，不必合并
      console.log(`跳过（未入库，直接用 --import）：${item.label}`);
      continue;
    }
    const have = new Set(cur.sources.map((s) => s.url));
    const usable = item.sources.filter((s) => s && s.url && s.snippet);
    const added = usable.filter((s) => !have.has(s.url));
    const merged = cur.sources.concat(added);
    result.push({ label: item.label, sources: merged });
    console.log(`${item.label}: ${cur.sources.length} → ${merged.length} 条（+${added.length}）`);
  }

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(`\n→ ${out}（${result.length} 条）`);
  if (result.length) {
    console.log('接着跑：');
    for (const r of result) console.log(`  node scripts/external_batch.js --requery "${r.label}"`);
    console.log(`  node scripts/external_batch.js --import "${out}"`);
    console.log('  node scripts/external_batch.js --audit');
  }
}

if (require.main === module) main();

module.exports = { main };
