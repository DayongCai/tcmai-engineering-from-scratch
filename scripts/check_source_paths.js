#!/usr/bin/env node
/**
 * scripts/check_source_paths.js —— 出处路径不许出现重复前缀
 *
 * 为什么要有这道门：本库的课程材料由一批一次性脚本生成，其中有脚本写的是
 *   f"F:/textbooks/{cfg['xlsx']}"
 * 而 cfg['xlsx'] 本身已经带了 `F:/textbooks/` 前缀，于是产出的 docs 里出现
 *   `F:/textbooks/F:/textbooks/qhzy-卫生统计学.xlsx`
 * ——这条路径谁也打不开，等于「出处不可核」。实测全库曾有 382 个文件 / 730 处。
 *
 * 核两件事：
 *   1. 仓库里（departments / textbooks / standards，排除 textbooks/build）不许出现 `F:/textbooks/F:/textbooks`；
 *   2. 每份 doc-config.json 的 xlsx 值必须真的是一个 `F:/textbooks/<文件名>` 形态的路径。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BAD = 'F:/textbooks/F:/textbooks';
const SKIP = new Set(['build', 'node_modules', '.git']);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(md|json|html|js|py)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = [];
for (const d of ['departments', 'textbooks', 'standards']) {
  const abs = path.join(ROOT, d);
  if (fs.existsSync(abs)) walk(abs, files);
}

let bad = 0;
for (const f of files) {
  let t;
  try { t = fs.readFileSync(f, 'utf8'); } catch { continue; }
  if (t.includes(BAD)) {
    bad += 1;
    console.error('✗ 重复前缀：' + path.relative(ROOT, f));
  }
}

let cfgBad = 0;
for (const d of fs.readdirSync(path.join(ROOT, 'standards'))) {
  const p = path.join(ROOT, 'standards', d, 'doc-config.json');
  if (!fs.existsSync(p)) continue;
  let j;
  try { j = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
  // 只核「声称是 F:/ 路径」的值：派生课/合成课会把 xlsx 写成一句说明，那不是错
  const v = j.xlsx;
  if (typeof v === 'string' && /^F:[\/]/.test(v) && !/^F:\/textbooks\/[^/（(]+/.test(v)) {
    cfgBad += 1;
    console.error(`✗ doc-config xlsx 形态不对：standards/${d}/doc-config.json → ${v}`);
  }
}

if (bad || cfgBad) {
  console.error(`\n✗ 出处路径 ${bad} 个文件带重复前缀、${cfgBad} 份 doc-config 形态不对（共扫 ${files.length} 个文件）`);
  process.exit(1);
}
console.log(`✓ 出处路径无重复前缀（扫 ${files.length} 个文件；各课 doc-config 的 xlsx 形态正确）`);
