#!/usr/bin/env node
/**
 * scripts/rewrite_next.js —— 判断层排期助手：下一门写哪、写哪几段、写到多长
 *
 * 用法：
 *   node scripts/rewrite_next.js            # 输出下一门（缺口最大者）的清单
 *   node scripts/rewrite_next.js --slug X   # 指定某门的清单
 *   node scripts/rewrite_next.js --all      # 全量排期（按缺口降序）
 *
 * 只读不写：它不生成任何判断层文本。N.2/N.5 必须人写——这一条写在本脚本第一行注释里，
 * 就是为了防止后来者"顺手"给个模板批量填。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STD = path.join(ROOT, 'standards');
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

const args = process.argv.slice(2);
const slugArg = args.includes('--slug') ? args[args.indexOf('--slug') + 1] : null;
const allMode = args.includes('--all');

const rows = [];
for (const d of fs.readdirSync(STD)) {
  const p = path.join(STD, d, 'rewrite-plan.json');
  if (!fs.existsSync(p) || d.startsWith('_probe')) continue;
  const plan = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (plan.status !== 'draft') continue;
  const chs = plan.chapters || [];
  const need2 = chs.filter((c) => hanzi(c.n2) < 200);
  const need5 = chs.filter((c) => hanzi(c.n5) < 200);
  const need3 = chs.filter((c) => hanzi(c.n3) < 60);
  const needQ = chs.filter((c) => !(c.check || []).length);
  rows.push({ dir: d, book: plan.book || plan.subject, chs, need2, need5, need3, needQ,
    gap: need2.length + need5.length });
}
// 默认「小门先行」：一轮能做完的门排前面，避免队首卡在一门 49 章的巨课上。
// --by-gap 保留按缺口降序，用于看总量。
rows.sort((a, b) => (a.chs.length - b.chs.length) || (b.gap - a.gap));

if (!rows.length) { console.log('没有草稿课：所有 rewrite-plan 都已 complete。'); process.exit(0); }

if (allMode) {
  console.log('| 目录 | 课 | 章 | 缺 N.2 | 缺 N.5 | 缺 N.3 | 缺思考题 |');
  console.log('|---|---|--:|--:|--:|--:|--:|');
  for (const r of [...rows].sort((a, b) => b.gap - a.gap)) {
    console.log(`| \`standards/${r.dir}\` | ${r.book} | ${r.chs.length} | ${r.need2.length} | ${r.need5.length} | ${r.need3.length} | ${r.needQ.length} |`);
  }
  const gap = rows.reduce((a, r) => a + r.gap, 0);
  console.log(`\n合计 ${rows.length} 门 / ${rows.reduce((a, r) => a + r.chs.length, 0)} 章 / 待写 ${gap} 段（约 ${(gap * 0.21).toFixed(1)} 万汉字）。`);
  process.exit(0);
}

const r = slugArg ? rows.find((x) => x.dir === slugArg) : rows[0];
if (!r) { console.log(`没有 ${slugArg} 的草稿，或它已完工。`); process.exit(1); }

console.log(`下一门：${r.book}（standards/${r.dir}）`);
console.log(`  ${r.chs.length} 章；缺 N.2 ${r.need2.length} 段 · N.5 ${r.need5.length} 段 · N.3 ${r.need3.length} 段 · 思考题 ${r.needQ.length} 组`);
console.log('');
console.log('| 章 | 章名 | N.2 | N.5 | N.3 | 思考题 |');
console.log('|--:|---|--:|--:|--:|--:|');
for (const c of r.chs) {
  const mark = (v) => (v ? '✓' : '写');
  console.log(`| ${c.n} | ${c.title} | ${mark(hanzi(c.n2) >= 200)} | ${mark(hanzi(c.n5) >= 200)} | ${mark(hanzi(c.n3) >= 60)} | ${(c.check || []).length ? '✓' : '写'} |`);
}
console.log('');
console.log('写法：N.2「为什么可以这样翻译」讲清楚"为什么这个组织方式是合法的"，须给判据；');
console.log('      N.5「争议与本项目立场」给 2–3 条争议 + 本项目立场，不许只罗列不表态。');
console.log('写完：');
console.log(`  python scripts/apply_rewrite_block.py --slug ${r.dir}`);
console.log('  node tests/test_rewrite_blocks.js && node scripts/build_rewrite_backlog.js');
