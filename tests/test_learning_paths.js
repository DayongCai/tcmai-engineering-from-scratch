#!/usr/bin/env node
/**
 * test_learning_paths.js — 校验 learning-paths/*.json
 *
 * 检查:
 *   1. 每个 path 引用的 <dept>/<subject> 都真实存在于 curriculum.json
 *   2. 学期范围合法（1..10），且与学科自身的 semester 声明不矛盾（允许 ±1 的排课浮动，超过则警告）
 *   3. 不重复引用同一学科
 *   4. 声明的 subjectCount / hours 与实测一致
 *   5. 声明了 capstone 与 criteria
 *
 * 用法: node tests/test_learning_paths.js [--fix]
 *   --fix 会把实测的 subjectCount / hours 写回 json 与 learning-paths/README.md
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROOT, loadCurriculum } = require('../scripts/lib');

const fix = process.argv.includes('--fix');
const cur = loadCurriculum();
const flat = cur.departments.flatMap((d) => d.subjects);
const index = new Map(flat.map((s) => [`${s.deptSlug}/${s.slug}`, s]));

const dir = path.join(ROOT, 'learning-paths');
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

const errors = [];
const rows = [];

for (const file of files) {
  const p = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
  const seen = new Set();
  let count = 0;
  let hours = 0;
  let chapterSum = 0;

  if (!p.id || !p.title || !p.audience || !p.outcome) {
    errors.push(`${file}: 缺 id/title/audience/outcome`);
  }
  if (p.id !== file.replace(/\.json$/, '')) {
    errors.push(`${file}: id "${p.id}" 与文件名不一致`);
  }
  if (!p.capstone || !p.capstone.title || !Array.isArray(p.capstone.criteria)) {
    errors.push(`${file}: 缺 capstone.title / capstone.criteria`);
  }

  for (const term of p.route || []) {
    if (!(term.semester >= 1 && term.semester <= cur.domain.scale.semesters)) {
      errors.push(`${file}: 学期越界 ${term.semester}`);
    }
    for (const ref of term.subjects || []) {
      const s = index.get(ref);
      if (!s) {
        errors.push(`${file}: 引用不存在的学科 "${ref}"`);
        continue;
      }
      if (seen.has(ref)) errors.push(`${file}: 学科重复引用 "${ref}"`);
      seen.add(ref);
      count += 1;
      hours += s.hours;
      chapterSum += s.chapters;
      if (Math.abs(s.semester - term.semester) > 1) {
        console.warn(
          `  ⚠ ${file}: "${ref}" 在路径中排到第 ${term.semester} 学期，但 curriculum.json 声明第 ${s.semester} 学期`
        );
      }
    }
  }

  const declaredCount = p.subjectCount;
  const declaredHours = p.hours;
  const okCount = declaredCount === count;
  const okHours = declaredHours === hours;

  if (!okCount || !okHours) {
    if (fix) {
      p.subjectCount = count;
      p.hours = hours;
      fs.writeFileSync(path.join(dir, file), `${JSON.stringify(p, null, 2)}\n`, 'utf8');
      console.log(`  🔧 ${file}: subjectCount ${declaredCount}→${count} · hours ${declaredHours}→${hours}`);
    } else {
      errors.push(`${file}: 声明 subjectCount=${declaredCount}/hours=${declaredHours}，实测 ${count}/${hours}`);
    }
  } else {
    console.log(`  ✅ ${file}: ${count} 学科 · ${hours} 学时 · ${chapterSum} 章`);
  }

  rows.push({ file, id: p.id, title: p.title, audience: p.audience, count, hours, chapterSum });
}

// 回写 README 表格
if (fix) {
  const readmePath = path.join(dir, 'README.md');
  let readme = fs.readFileSync(readmePath, 'utf8');
  const table =
    '| 路径 | 面向 | 学期跨度 | 学科数 | 学时 | 核心交付 |\n' +
    '|------|------|---------|-------|------|---------|\n' +
    rows
      .map((r) => {
        const p = JSON.parse(fs.readFileSync(path.join(dir, r.file), 'utf8'));
        const span = p.semesters ? `${p.semesters[0]}–${p.semesters[1]}` : '—';
        const audience = r.audience.split('：')[0].replace(/^面向/, '');
        return `| [${r.title}](${r.file}) | ${audience} | ${span} | ${r.count} | ${r.hours} | ${p.capstone?.title || '—'} |`;
      })
      .join('\n');
  const re = /\| 路径 \| 面向[\s\S]*?\n\n/;
  readme = re.test(readme) ? readme.replace(re, `${table}\n\n`) : `${readme}\n${table}\n`;
  fs.writeFileSync(readmePath, readme, 'utf8');
  console.log(`  🔧 learning-paths/README.md 表格已同步`);
}

console.log('');
if (errors.length) {
  console.error(`✗ learning-paths 校验失败（${errors.length} 项）:`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error('\n修复: node tests/test_learning_paths.js --fix');
  process.exit(1);
}
console.log(`✅ learning-paths 校验通过（${files.length} 条路径）`);
