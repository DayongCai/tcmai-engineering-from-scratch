#!/usr/bin/env node
/**
 * Compare 枚举数 between course docs and textbook chapter for 护理学导论 11–17.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const dep = path.join(ROOT, 'departments/05-huli/16-huli-xue-daolun/chapters');
const txt = path.join(ROOT, 'textbooks/05-huli/16-huli-xue-daolun');

const CN = '一二三四五六七八九十';
for (const d of fs.readdirSync(dep).filter((x) => /^1[1-7]-/.test(x)).sort()) {
  const n = Number(d.slice(0, 2));
  const docP = path.join(dep, d, 'docs', 'zh.md');
  const tP = fs.readdirSync(txt).find((f) => f.startsWith(String(n).padStart(2, '0') + '-'));
  if (!fs.existsSync(docP) || !tP) { console.log(`${n}: 缺文件`); continue; }
  const doc = fs.readFileSync(docP, 'utf8');
  const book = fs.readFileSync(path.join(txt, tP), 'utf8');
  const docCount = [...doc.matchAll(/([一二三四五六七八九十])类/g)].map((m) => m[1]);
  const bookCount = (book.match(/第[一二三四五六七八九十]类/g) || []).length;
  const bookSeen = new Set([...book.matchAll(/第([一二三四五六七八九十])类/g)].map((m) => m[1]));
  console.log(`第 ${String(n).padStart(2)} 章 | docs 提到: ${docCount.join('') || '无'} | 教材枚举: ${bookCount} 类 (${[...bookSeen].join('')})`);
}
