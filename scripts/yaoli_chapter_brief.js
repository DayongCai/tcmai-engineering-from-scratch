#!/usr/bin/env node
/**
 * scripts/yaoli_chapter_brief.js —— 给某一章打印「写作素材包」
 *
 *   node scripts/yaoli_chapter_brief.js 5
 *
 * 输出：章名 / slug / 篇 / 4 节的 12 个小节号与标题 / 每小节的写作约束（brief）
 *      与正文的**前 120 字**（不是全文：全文去读 textbooks/09-jichu/12-yaoli-xue/0N-*.md）。
 *
 * 为什么要这个：底本.json 有 1 MB，让写稿的人（或子代理）每次自己 grep 一遍
 * 既慢又容易抓错章；这里一次给全，章号错了立刻能看出来。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'yaoli', '底本.json'), 'utf8'));
const LIST = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'departments', '09-jichu', '12-yaoli-xue', 'chapters.json'), 'utf8')).chapters;

const n = Number(process.argv[2]);
if (!n) {
  console.error('用法: node scripts/yaoli_chapter_brief.js <章号>');
  process.exit(2);
}
const chap = BASE.chapters.find((c) => c.no === n);
const meta = LIST.find((c) => c.n === n);
if (!chap || !meta) {
  console.error(`第 ${n} 章不存在（底本 1–49）`);
  process.exit(2);
}

console.log(`${chap.title}`);
console.log(`slug: ${meta.slug}`);
console.log(`unit: ${meta.unit}`);
console.log(`底本: ${chap.sheet} · 小节 ${chap.counts.subs} · 汉字 ${chap.counts.hanzi} · 量值 ${chap.counts.valueLike}`);
console.log('');

for (const s of chap.secs) {
  console.log(`## ${s.title}`);
  for (const u of s.subs) {
    const body = (u.body || '').replace(/\s+/g, ' ');
    console.log(`  ### ${u.title}`);
    console.log(`      约束: ${(u.brief || '').slice(0, 60)}…`);
    console.log(`      正文: ${body.slice(0, 120)}…（共 ${body.length} 字）`);
  }
}
console.log('');
console.log(`引文写法: 「逐字引语」——教材·药理学·第${n}章·${chap.secs[0].subs[0].no}`);
console.log(`全文素材: textbooks/09-jichu/12-yaoli-xue/${String(n).padStart(2, '0')}-${chap.title.replace(' ', '-')}.md`);
