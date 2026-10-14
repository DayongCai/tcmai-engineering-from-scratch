#!/usr/bin/env node
/**
 * tests/assert_disclaimers.js — 断言每一集讲稿都带免责声明卡
 *
 * 硬规则：「每集结尾必须有免责声明卡。」这条规则由本脚本执行，
 * 而不是靠自觉。医疗健康类内容的教育项目里，免责声明的缺失是不可接受的。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const coursesDir = path.join(ROOT, 'platform', 'courses');

if (!fs.existsSync(coursesDir)) {
  // 明说，不静默通过 —— 「报绿的跳过比没有检查更坏」：
  // 目录一被删，这道门就会无声消失，而人以为它还在守。
  console.log('⚠ 免责声明检查：platform/courses 不存在 —— **未检查**（明说，不是通过）');
  process.exit(0);
}

let checked = 0;
let missing = 0;
const problems = [];

const walk = (dir) => {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      walk(p);
      continue;
    }
    if (e.name !== 'lesson.json') continue;
    checked += 1;
    let j;
    try {
      j = JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch (err) {
      problems.push(`${path.relative(ROOT, p)}: JSON 解析失败 — ${err.message}`);
      missing += 1;
      continue;
    }
    if (!Array.isArray(j.segments)) {
      problems.push(`${path.relative(ROOT, p)}: 缺 segments 数组`);
      missing += 1;
      continue;
    }
    const last = j.segments[j.segments.length - 1];
    if (!j.segments.some((s) => s.role === 'disclaimer')) {
      problems.push(`${path.relative(ROOT, p)}: 全文缺少 disclaimer 段`);
      missing += 1;
    } else if (!last || last.role !== 'disclaimer') {
      problems.push(`${path.relative(ROOT, p)}: disclaimer 不是最后一段（当前末段为 ${last && last.role}）`);
      missing += 1;
    }
  }
};

walk(coursesDir);

console.log(`═══ 讲稿免责声明断言 ═══`);
console.log(`  检查 ${checked} 集讲稿`);
if (problems.length) {
  problems.forEach((p) => console.error(`  ✗ ${p}`));
  console.error(`\n❌ ${missing} 集不合格`);
  process.exit(1);
}
console.log(`  ✅ 全部 ${checked} 集都带末位免责声明卡`);
