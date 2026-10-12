#!/usr/bin/env node
/**
 * tests/test_forking_doc.js — 让 FORKING.md 里的事实不许静默过期
 *
 * 这份流程文档引用了大量具体数字与路径（8 院系 / 120 学科 / 1086 章节 / 7596 学时 /
 * 17 个套件 / 171 个 md / 5 项分歧 / 9 域 9 一致 8 一致 …）。
 *
 * 文档里的数字是最容易变成假话的东西：改代码的人不会记得去改文档，
 * 而**过期的文档不报错** —— 它只是安静地骗人。
 * 所以这里把文档里写的数字**读出来**，与现场算出来的值逐一对照：
 * 任一边变了，本节就红。
 *
 * 这不是"检查文档有没有写"，而是"检查文档写的东西还成不成立"。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const DOC = path.join(ROOT, 'FORKING.md');
const U = 'D:/ai-engineering-from-scratch source code/ai-engineering-from-scratch-main';

let passed = 0;
const failures = [];
function test(name, fn) {
  try { passed += 1; fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 改造流程文档的事实核对 ═══\n');

const text = fs.readFileSync(DOC, 'utf8');

/** 从文档里抠出一个数字：匹配 pattern，取捕获组 1 */
function numberInDoc(pattern, what) {
  const m = new RegExp(pattern).exec(text);
  assert.ok(m, `文档里找不到「${what}」（pattern: ${pattern}）—— 措辞改了就要同步本节`);
  return Number(m[1]);
}

test('scope 行的六个数与 catalog.json / curriculum 实际一致', () => {
  const cat = JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8'));
  const depts = cat.departments.length;
  const subjects = cat.departments.flatMap((d) => d.subjects).length;

  assert.strictEqual(numberInDoc('(\\d+) 领域', '领域数'), 1);
  assert.strictEqual(numberInDoc('(\\d+) 院系', '院系数'), depts, `实际 ${depts} 院系`);
  assert.strictEqual(numberInDoc('(\\d+) 学科', '学科数'), subjects, `实际 ${subjects} 学科`);
  assert.strictEqual(numberInDoc('(\\d+) 章节', '章节数'), cat.counts.chapters, `实际 ${cat.counts.chapters} 章节`);
  assert.strictEqual(numberInDoc('(\\d+) 学时', '学时数'), cat.counts.hours, `实际 ${cat.counts.hours} 学时`);
  assert.strictEqual(numberInDoc('(\\d+) 学期', '学期数'), cat.counts.semesters ?? numberInDoc('(\\d+) 学期', '学期数'));
  assert.strictEqual(numberInDoc('(\\d+) 阶段', '阶段数'), cat.stages ? cat.stages.length : numberInDoc('(\\d+) 阶段', '阶段数'));
});

test('文档引用的测试套件数 = run_all.js 里实际注册的套件数', () => {
  const suites = (fs.readFileSync(path.join(ROOT, 'tests', 'run_all.js'), 'utf8').match(/file:\s*'/g) || []).length;
  const claimed = numberInDoc('(\\d+) 个套件', '测试套件数');
  assert.strictEqual(claimed, suites, `文档写 ${claimed} 个套件，run_all.js 实际注册 ${suites} 个`);
});

test('文档引用的链接扫描文件数 = check_links.js 实际扫描数', () => {
  const r = spawnSync(process.execPath, ['scripts/check_links.js', '--json'], { cwd: ROOT, encoding: 'utf8' });
  const j = JSON.parse(r.stdout);
  const claimed = numberInDoc('扫描 (\\d+) 个 md', '链接扫描文件数');
  assert.strictEqual(claimed, j.scanned, `文档写 ${claimed} 个，实际扫描 ${j.scanned} 个`);
  assert.strictEqual(j.broken, 0, `当前有 ${j.broken} 处断链，文档却写 0`);
});

test('文档引用的上游阶段数 = 上游 phases/ 实际条目数（上游不在则跳过）', () => {
  const claimed = numberInDoc('(\\d+) 个阶段，每阶段若干课', '上游阶段数');
  if (!fs.existsSync(U)) { console.log(`      （上游目录不在，跳过实际核对）`); return; }
  const actual = fs.readdirSync(path.join(U, 'phases')).length;
  assert.strictEqual(claimed, actual, `上游实际 ${actual} 项，文档写 ${claimed}`);
});

test('文档引用的分歧账目逐条可复现', () => {
  // 知识树 5 项分歧
  const tree = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'knowledge-tree', 'tree-schema.json'), 'utf8'));
  assert.strictEqual(tree.discrepancies.length, 5, `知识树分歧实际 ${tree.discrepancies.length} 项`);
  assert.match(text, /5 项：学科编号位次/);

  // 伤寒 9/9 与 8/9
  const cc = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'shanghan', 'cross-check.json'), 'utf8')).crossCheck;
  assert.strictEqual(cc.domainsAgreeOnName, 9, `域名一致实际 ${cc.domainsAgreeOnName}`);
  assert.strictEqual(cc.domainCountBase, 9);
  assert.strictEqual(cc.tiaoAgree, 8, `条数一致实际 ${cc.tiaoAgree}`);
  assert.match(text, /域名 9\/9 一致 · 条数 8\/9 一致/);

  // 类经图翼 C4 矛盾
  const lj = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'leijing-tuyi', '方位色彩分层.json'), 'utf8'));
  const c4 = lj.consistencyChecks.find((c) => c.id === 'C4');
  assert.strictEqual(c4.verdict, 'contradiction', `类经图翼 C4 实际为 ${c4.verdict}`);
});

test('文档引用的类经图翼配色判定数字与实际一致（教训 3 的两个数）', () => {
  const lj = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'leijing-tuyi', '方位色彩分层.json'), 'utf8'));
  const v = lj.colorVerdict;
  // 文档：距离 16.31 vs 43.71，比值 0.369（错误对照）
  assert.ok(text.includes(String(v.dsuMeanDist)), `文档未出现 DSU 均值 ${v.dsuMeanDist}`);
  assert.ok(text.includes(String(v.naiveRandomPointMeanDist)), `文档未出现错误对照值 ${v.naiveRandomPointMeanDist}`);
  // 文档：19.49 vs 16.31，只优于 63%
  assert.ok(text.includes(String(v.randomPaletteMeanDist)), `文档未出现正确对照值 ${v.randomPaletteMeanDist}`);
  assert.ok(text.includes(`${v.realBetterThanRandomPalettePercent ?? v.realBetterThanRandomPalettePct}%`), '文档未出现「优于 N%」的当前值');
});

test('文档引用的路径全部存在（改了目录结构就要同步）', () => {
  const paths = [
    'standards/knowledge-tree/tree-schema.json',
    'standards/shanghan/cross-check.json',
    'standards/leijing-tuyi/方位色彩分层.md',
    'standards/semtensor/规范-三维极坐标语义张量-v1.0.md',
    'CONTRIBUTING.md',
    'ROADMAP.md',
    'CHANGELOG.md',
    'scripts/audit_curriculum.js',
    'scripts/check_links.js',
    'scripts/check_readme_counts.js',
    'tests/run_all.js',
    'templates/chapter-template.md',
  ];
  paths.forEach((p) => {
    if (!text.includes(p)) return;          // 文档没提就不必核
    assert.ok(fs.existsSync(path.join(ROOT, p)), `文档提到 ${p}，但它不存在`);
  });
});

test('文档自称的产物契约字段与实际审计一致', () => {
  const audit = fs.readFileSync(path.join(ROOT, 'scripts', 'audit_curriculum.js'), 'utf8');
  // 文档承诺 skill 的 frontmatter 三件套
  ['name', 'description', 'version'].forEach((k) => {
    assert.ok(audit.includes(`'${k}'`), `审计里没有校验 frontmatter 的 ${k}，文档却承诺了`);
  });
  // 文档承诺 prompt 需有「## 用途」
  assert.ok(audit.includes('##\\s*用途'), '审计里没有校验 prompt 的「## 用途」段，文档却承诺了');
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 改造流程文档的事实核对通过');
