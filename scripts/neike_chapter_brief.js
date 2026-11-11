#!/usr/bin/env node
/**
 * scripts/neike_chapter_brief.js —— 打印某一章的写作素材包
 *
 *   node scripts/neike_chapter_brief.js 4
 *
 * 输出：章名 / slug / 节数 / 小节数 / 各节（病证）下的全部小节号与正文开头。
 * 底本.json 有 330 万字节，让写稿的人自己 grep 既慢又容易抓错章；这里一次给全。
 * 综合章（13/14）没有底本对应章，会打印可跨章引用的章目表。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'neike', '底本.json'), 'utf8'));
const LIST = JSON.parse(fs.readFileSync(
  path.join(ROOT, 'departments/01-zhongyi/10-zhongyi-neike-xue/chapters.json'), 'utf8')).chapters;

const n = Number(process.argv[2]);
if (!n) {
  console.error('用法: node scripts/neike_chapter_brief.js <章号 1-14>');
  process.exit(2);
}
const meta = LIST.find((c) => c.n === n);
if (!meta) {
  console.error(`第 ${n} 章不存在（1–14）`);
  process.exit(2);
}

console.log(meta.title);
console.log(`slug: ${meta.slug}`);
console.log(`unit: ${meta.unit}`);
console.log('');

const chap = BASE.chapters.find((c) => c.no === n);
if (!chap) {
  console.log('本章是综合章（底本无对应章）：引文要跨章引用，可引的底本章目如下 ——');
  for (const c of BASE.chapters) {
    console.log(`  ${c.title}：${c.secs.map((s) => `${s.no} ${s.title}`).join(' / ').slice(0, 160)}…`);
  }
  console.log('');
  console.log('要求：≥5 个不同章号的引文；每个引文都要能逐字回查到底本对应小节。');
  process.exit(0);
}

console.log(`底本：${chap.title} · 节 ${chap.counts.secs} · 小节 ${chap.counts.subs} · ${chap.counts.hanzi} 汉字 · 量值 ${chap.counts.valueLike}`);
console.log('');
for (const s of chap.secs) {
  console.log(`## ${s.no} ${s.title}`);
  for (const u of s.subs) {
    const body = (u.items[0] && u.items[0].body ? u.items[0].body : '').replace(/\s+/g, ' ');
    console.log(`   ${u.no} ${u.title} · ${body.length} 字`);
    console.log(`      ${body.slice(0, 100)}…`);
  }
}
console.log('');
console.log(`引文写法: 「逐字引语」——教材·中医内科学·第${n}章·${chap.secs[0].subs[0].no}`);
console.log(`全文素材: textbooks/01-zhongyi/10-zhongyi-neike-xue/${String(n + 0).padStart(2, '0')}-第${n}章-*.md`);
