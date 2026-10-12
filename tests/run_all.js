#!/usr/bin/env node
/**
 * tests/run_all.js — 跑全部测试套件，汇总结果
 *
 *   node tests/run_all.js
 *   node tests/run_all.js --fast   跳过章节代码执行（只跑结构与契约）
 *
 * 退出码 0 = 全部通过；1 = 有套件失败。
 */

'use strict';

const path = require('path');
const { spawnSync } = require('node:child_process');

const FAST = process.argv.includes('--fast');
const ROOT = path.resolve(__dirname, '..');

const SUITES = [
  { file: 'test_curriculum_contract.js', desc: '课程结构与章节契约（复用 audit_curriculum）' },
  { file: 'test_learning_paths.js', desc: '学习路径引用与计数一致性' },
  { file: 'test_site_artifacts.js', desc: '站点生成物形状（data.js / content.js / HTML）' },
  { file: 'test_glossary_bridge.js', desc: '桥梁表与术语表的完整性' },
  { file: 'test_chapter_code.js', desc: '每个已建章节的 code/main.js 与单元测试', slow: true },
  { file: 'test_content_review.js', desc: '人机闭环：内容复核清单', advisory: true },
];

console.log('═══ tcmai-engineering-from-scratch · 测试 ═══');
console.log(`  模式: ${FAST ? '快速（跳过章节代码执行）' : '完整'}\n`);

const results = [];

for (const s of SUITES) {
  if (FAST && s.slow) {
    console.log(`  ⏭  ${s.file} —— 跳过（--fast）`);
    results.push({ ...s, status: 'skipped' });
    continue;
  }
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, s.file)], {
    encoding: 'utf8',
    cwd: ROOT,
  });
  const ms = Date.now() - t0;
  const ok = r.status === 0;
  const status = ok ? 'pass' : s.advisory ? 'advisory-fail' : 'fail';
  const icon = ok ? '✅' : s.advisory ? '⚠' : '❌';
  console.log(`  ${icon} ${s.file} (${ms}ms) — ${s.desc}`);
  if (!ok) {
    const out = `${r.stdout || ''}${r.stderr || ''}`.trim().split('\n');
    out.slice(-14).forEach((l) => console.log(`       ${l}`));
  }
  results.push({ ...s, status, ms, ok });
}

const passed = results.filter((r) => r.status === 'pass').length;
const failed = results.filter((r) => r.status === 'fail').length;
const advisory = results.filter((r) => r.status === 'advisory-fail').length;
const skipped = results.filter((r) => r.status === 'skipped').length;

console.log('\n─── 汇总 ───');
console.log(`  通过 ${passed} · 失败 ${failed} · 咨询性失败 ${advisory}${skipped ? ` · 跳过 ${skipped}` : ''}`);

if (failed) {
  console.log('\n❌ 测试未通过');
  process.exit(1);
}
console.log('\n✅ 测试通过');
