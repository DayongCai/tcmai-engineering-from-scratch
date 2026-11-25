#!/usr/bin/env node
/**
 * make_rewrite_skeleton.js —— 为某门课生成 rewrite-plan 骨架（只填 n/title/src，判断层留空待写）
 *
 *   node scripts/make_rewrite_skeleton.js <dept>/<subject> <slug> "<书名>"
 *   例：node scripts/make_rewrite_skeleton.js 09-jichu/12-yaoli-xue yaoli "药理学"
 *
 * 为什么要骨架：`apply_rewrite_block.py` 的输入是 standards/<slug>/rewrite-plan.json，
 * 里面 n / title / src 是机械可算的（章号、章名、底本节范围），N.2–N.5 才是要人写的判断层。
 * 分开生成，写稿的人就不会在章号与出处上手滑。
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const [deptRel, slug, book] = process.argv.slice(2);
if (!deptRel || !slug || !book) {
  console.error('用法：node scripts/make_rewrite_skeleton.js <dept>/<subject> <slug> "<书名>"');
  process.exit(2);
}

const cjPath = path.join(ROOT, 'departments', deptRel, 'chapters.json');
const cj = JSON.parse(fs.readFileSync(cjPath, 'utf8'));
const [dept, subject] = deptRel.split('/');

// 底本：standards/<slug>/底本.json（有就用它取节范围，没有就退到 chapters.json 的节号）
const basePath = path.join(ROOT, 'standards', slug, '底本.json');
const secRange = (() => { const m = new Map(); if (fs.existsSync(basePath)) { const b = JSON.parse(fs.readFileSync(basePath, 'utf8')); for (const c of b.chapters || []) { const secs = (c.secs || []).map((s) => s.no); if (secs.length) m.set(Number(c.no), `${secs[0]}–${secs[secs.length - 1]}`); } } return m; })();

// 章号来源以「注入目标」为准：apply_rewrite_block.py 是按 textbooks/<dept>/<subject>/NN-第N章-*.md
// 找文件的。有些课 chapters.json 是「观点式重写章」（章数 ≠ 教材章数，如药事管理 28 章 vs 教材 20 章），
// 拿它做骨架会写出没有落点的章。所以优先扫教材文件，扫不到才退回 chapters.json。
const txtDir = path.join(ROOT, 'textbooks', dept, subject);
let srcChapters = [];
if (fs.existsSync(txtDir)) {
  srcChapters = fs
    .readdirSync(txtDir)
    .map((f) => f.match(/^(\d{2})-第(\d+)章-(.+)\.md$/))
    .filter(Boolean)
    .map((m) => ({ n: Number(m[2]), title: m[3] }))
    .sort((a, b) => a.n - b.n);
}
const fromTextbook = srcChapters.length > 0;
if (!fromTextbook) srcChapters = cj.chapters.map((c) => ({ n: c.n, title: c.title }));
else if (srcChapters.length !== cj.chapters.length) {
  console.log(`   ⚠ 教材章 ${srcChapters.length} ≠ 课程章 ${cj.chapters.length}：骨架按教材章生成（注入目标只能是教材篇）`);
}

const chapters = srcChapters.map((c) => ({
  n: c.n,
  title: c.title,
  // src 优先取底本节范围；没有底本时退回「第 N 章「章名」」，保证 apply 的出处行不为空
  src: secRange.get(Number(c.n)) || `第 ${c.n} 章「${c.title}」`,
  question: '',
  n2: '',
  n3: '',
  n4: '',
  n5: '',
  check: [],
}));

const out = {
  dept,
  subject,
  book,
  slug,
  status: 'draft',           // 判断层未写完 → draft，门的草稿豁免靠它
  baseline: '源正文层逐字取自底本工作簿；判断层 N.1–N.5 人工撰写',
  chapters,
};
const dir = path.join(ROOT, 'standards', slug);
fs.mkdirSync(dir, { recursive: true });
const p = path.join(dir, 'rewrite-plan.json');
if (fs.existsSync(p) && !process.argv.includes('--force')) {
  console.error(`已存在 ${p}（加 --force 覆盖）`);
  process.exit(3);
}
fs.writeFileSync(p, JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`✅ 骨架 → standards/${slug}/rewrite-plan.json（${chapters.length} 章，status=draft）`);
console.log(`   dept=${dept} subject=${subject} book=${book}`);
console.log(`   缺字段的章：${chapters.filter((c) => !c.src).length} 个没有节范围`);
