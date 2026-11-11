#!/usr/bin/env node
/**
 * check_readme_counts.js — 校验 README 徽章数字与 catalog 一致，并同步 FORKING.md 的生成型数字
 * （PR 咨询性 / main 自愈）
 *
 *   node scripts/check_readme_counts.js          # 检查
 *   node scripts/check_readme_counts.js --fix    # 自动改写 README 计数块 + FORKING.md 扫描数
 *
 * 为什么连 FORKING.md 也在这里改：它的「扫描 N 个 md」与 README 的章节数一样，
 * 都是「由脚本产出、人手抄不进来」的数字。每加一章就会漂一次，靠人记就会漏
 * （2026-11 已漂过两次：3747→3756→3771）。所以把它并入同一个 --fix。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ROOT } = require('./lib');

const fix = process.argv.includes('--fix');
const readmePath = path.join(ROOT, 'README.md');
const catalogPath = path.join(ROOT, 'catalog.json');
const forkingPath = path.join(ROOT, 'FORKING.md');

if (!fs.existsSync(catalogPath)) {
  console.error('✗ catalog.json 不存在，先运行 node scripts/build_catalog.js');
  process.exit(1);
}
if (!fs.existsSync(readmePath)) {
  console.error('✗ README.md 不存在');
  process.exit(1);
}

let problems = 0;

/* ── ① README 计数块 ────────────────────────────────────── */

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
} else if (fix) {
  readme = current ? readme.replace(re, block) : `${readme}\n\n${block}\n`;
  fs.writeFileSync(readmePath, readme, 'utf8');
  console.log('🔧 已改写 README 计数块');
  console.log(`   ${c.departments} 院系 · ${c.subjects} 学科 · ${c.chapters} 章节 · ${c.hours} 学时`);
} else {
  console.error('✗ README 计数块与 catalog 不一致（main 分支会自动修复；PR 上仅提示）');
  if (current) console.error(`  当前: ${current.split('\n')[1]}`);
  console.error(`  期望: ${block.split('\n')[1]}`);
  problems += 1;
}

/* ── ② FORKING.md 的链接扫描数 ──────────────────────────── */

if (fs.existsSync(forkingPath)) {
  const r = spawnSync(process.execPath, ['scripts/check_links.js', '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  let scanned = null;
  try {
    scanned = JSON.parse(r.stdout).scanned;
  } catch {
    console.error('✗ check_links.js --json 未能给出 scanned（跳过 FORKING.md 同步）');
  }
  if (typeof scanned === 'number') {
    const src = fs.readFileSync(forkingPath, 'utf8');
    const reScan = /扫描 (\d+) 个 md/;
    const m = src.match(reScan);
    if (m && Number(m[1]) === scanned) {
      console.log(`✅ FORKING.md 扫描数一致（${scanned} 个 md）`);
    } else if (fix) {
      const next = m
        ? src.replace(reScan, `扫描 ${scanned} 个 md`)
        : src; /* 没这行就不硬塞，交给 test_forking_doc 报缺 */
      fs.writeFileSync(forkingPath, next, 'utf8');
      console.log(`🔧 已同步 FORKING.md 扫描数：${m ? m[1] : '缺'} → ${scanned} 个 md`);
    } else {
      console.error(`✗ FORKING.md 写的扫描数 ${m ? m[1] : '（缺）'} ≠ 实际 ${scanned} 个 md`);
      console.error('  修复: node scripts/check_readme_counts.js --fix');
      problems += 1;
    }
  }
}

/* ── ③ FORKING.md scope 行的「章节 / 学时」 ──────────────── */
// 与扫描数同类：由 catalog 产出、被文档抄进散文。只认 scope 行的固定格式，
// 不动文档里叙述历史的旧数字（如「从 1086 章节出发」）。

if (fs.existsSync(forkingPath)) {
    const src = fs.readFileSync(forkingPath, 'utf8');
    const reScope = /· (\d+) 章节 · (\d+) 学时 ·/;
    const m = src.match(reScope);
    if (m) {
      const okC = Number(m[1]) === c.chapters;
      const okH = Number(m[2]) === c.hours;
      if (okC && okH) {
        console.log(`✅ FORKING.md scope 行一致（${c.chapters} 章节 · ${c.hours} 学时）`);
      } else if (fix) {
        fs.writeFileSync(forkingPath, src.replace(reScope, `· ${c.chapters} 章节 · ${c.hours} 学时 ·`), 'utf8');
        console.log(`🔧 已同步 FORKING.md scope 行：${m[1]}/${m[2]} → ${c.chapters}/${c.hours}`);
      } else {
        console.error(`✗ FORKING.md scope 行写 ${m[1]} 章节 / ${m[2]} 学时 ≠ 实际 ${c.chapters} / ${c.hours}`);
        problems += 1;
      }
    }
}

if (problems > 0) {
  console.error(`\n共 ${problems} 处生成型数字不一致`);
  process.exit(1);
}
process.exit(0);
