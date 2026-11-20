#!/usr/bin/env node
/**
 * scripts/build_rewrite_backlog.js —— 「源正文层待补判断层」清单
 *
 * 为什么要有这份清单：源正文层课的正文已经出版（进五卷），但 N.2/N.5 是判断层，
 * 只能人写。清单把「还剩多少段、每门多少章」量出来，避免"以为补完了"。
 *
 * 输出：standards/REWRITE-待写清单.md（可直接读），并打印汇总。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const STD = path.join(ROOT, 'standards');
const OUT = path.join(STD, 'REWRITE-待写清单.md');
const hanzi = (s) => (String(s || '').match(/[\u4e00-\u9fff]/g) || []).length;

const rows = [];
for (const d of fs.readdirSync(STD)) {
  const p = path.join(STD, d, 'rewrite-plan.json');
  if (!fs.existsSync(p)) continue;
  const plan = JSON.parse(fs.readFileSync(p, 'utf8'));
  const chs = plan.chapters || [];
  const n2done = chs.filter((c) => hanzi(c.n2) >= 200).length;
  const n5done = chs.filter((c) => hanzi(c.n5) >= 200).length;
  const n3given = chs.filter((c) => hanzi(c.n3) >= 60).length;
  const quiz = chs.filter((c) => (c.check || []).length > 0).length;
  rows.push({
    dir: d, dept: plan.dept, subject: plan.subject, book: plan.book || '',
    status: plan.status || 'complete',
    chapters: chs.length,
    need: (chs.length - n2done) + (chs.length - n5done),
    n3given, quiz,
  });
}

const done = rows.filter((r) => r.status !== 'draft' && r.need === 0);
const todo = rows.filter((r) => !(r.status !== 'draft' && r.need === 0));
const needAll = todo.reduce((a, r) => a + r.need, 0);

const L = [];
L.push('# 源正文层：判断层待写清单');
L.push('');
L.push('本清单由 `node scripts/build_rewrite_backlog.js` 生成。');
L.push('');
L.push('口径：**源正文层已出版**（正文逐字来自底本，进五卷）；缺的是 N.2「为什么可以这样翻译」与');
L.push('N.5「争议与本项目立场」——这两节只能人写，脚本不许编。每段下限 200 汉字。');
L.push('');
L.push(`- 已完工：**${done.length} 门**（${done.reduce((a, r) => a + r.chapters, 0)} 章）`);
L.push(`- 待写：**${todo.length} 门 / ${todo.reduce((a, r) => a + r.chapters, 0)} 章 / ${needAll} 段**（约 ${(needAll * 0.21).toFixed(1)} 万汉字）`);
L.push('');
L.push('## 已完工');
L.push('');
L.push('| 课 | 目录 | 章 |');
L.push('|---|---|--:|');
for (const r of done.sort((a, b) => a.dir.localeCompare(b.dir))) {
  L.push(`| ${r.book || r.subject} | \`standards/${r.dir}\` | ${r.chapters} |`);
}
L.push('');
L.push('## 待写（按缺口排序）');
L.push('');
L.push('| 课 | 目录 | 章 | 待写段 | 已备 N.3 | 已备思考题 |');
L.push('|---|---|--:|--:|--:|--:|');
for (const r of todo.sort((a, b) => b.need - a.need || a.dir.localeCompare(b.dir))) {
  L.push(`| ${r.book || r.subject} | \`standards/${r.dir}\` | ${r.chapters} | ${r.need} | ${r.n3given}/${r.chapters} | ${r.quiz}/${r.chapters} |`);
}
L.push('');
L.push('## 怎么补');
L.push('');
L.push('```bash');
L.push('# 1) 打开某门的草稿（src / n3 / n4 / check 已从仓库现有材料取到）');
L.push('#    standards/<dir>/rewrite-plan.json');
L.push('# 2) 逐章写 n2 与 n5（各 ≥200 汉字），写完把 status 改成 "complete"');
L.push('python scripts/apply_rewrite_block.py --slug <dir>        # 注入章末 REWRITE 块');
L.push('node tests/test_rewrite_blocks.js                          # 门');
L.push('node scripts/build_rewrite_backlog.js                      # 刷新本清单');
L.push('```');
L.push('');

fs.writeFileSync(OUT, L.join('\n'), 'utf8');
console.log(`✓ ${path.relative(ROOT, OUT)}`);
console.log(`  已完工 ${done.length} 门 / ${done.reduce((a, r) => a + r.chapters, 0)} 章；待写 ${todo.length} 门 / ${todo.reduce((a, r) => a + r.chapters, 0)} 章 / ${needAll} 段（约 ${(needAll * 0.21).toFixed(1)} 万汉字）`);
