#!/usr/bin/env node
/**
 * check_readme_counts.js — 校验 README 徽章数字与 catalog 一致（PR 咨询性 / main 自愈）
 *
 *   node scripts/check_readme_counts.js          # 检查
 *   node scripts/check_readme_counts.js --fix    # 自动改写 README 计数块
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT } = require('./lib');

const fix = process.argv.includes('--fix');
const readmePath = path.join(ROOT, 'README.md');
const catalogPath = path.join(ROOT, 'catalog.json');

if (!fs.existsSync(catalogPath)) {
  console.error('✗ catalog.json 不存在，先运行 node scripts/build_catalog.js');
  process.exit(1);
}
if (!fs.existsSync(readmePath)) {
  console.error('✗ README.md 不存在');
  process.exit(1);
}

const c = JSON.parse(fs.readFileSync(catalogPath, 'utf8')).counts;
let readme = fs.readFileSync(readmePath, 'utf8');

const block =
  '<!-- COUNTS:START (由 scripts/build_catalog.js 生成 — 请勿手工编辑) -->\n' +
  `**${c.departments}** 院系 &nbsp;·&nbsp; **${c.subjects}** 学科 &nbsp;·&nbsp; **${c.chapters}** 章节 &nbsp;·&nbsp; ` +
  `**${c.hours}** 学时 &nbsp;·&nbsp; 已建 **${c.chaptersBuilt}** 章 &nbsp;·&nbsp; ` +
  `视频 **${c.videos}** / 教材章节 **${c.textbookChapters}**\n` +
  '<!-- COUNTS:END -->';

const re = /<!-- COUNTS:START[\s\S]*?<!-- COUNTS:END -->/;
const current = re.test(readme) ? readme.match(re)[0] : null;

if (current === block) {
  console.log('✅ README 计数与 catalog 一致');
  console.log(`   ${c.departments} 院系 · ${c.subjects} 学科 · ${c.chapters} 章节 · ${c.hours} 学时`);
  process.exit(0);
}

if (fix) {
  readme = current ? readme.replace(re, block) : `${readme}\n\n${block}\n`;
  fs.writeFileSync(readmePath, readme, 'utf8');
  console.log('🔧 已改写 README 计数块');
  console.log(`   ${c.departments} 院系 · ${c.subjects} 学科 · ${c.chapters} 章节 · ${c.hours} 学时`);
  process.exit(0);
}

console.error('✗ README 计数块与 catalog 不一致（main 分支会自动修复；PR 上仅提示）');
if (current) console.error(`  当前: ${current.split('\n')[1]}`);
console.error(`  期望: ${block.split('\n')[1]}`);
console.error('  修复: node scripts/check_readme_counts.js --fix');
process.exit(1);
