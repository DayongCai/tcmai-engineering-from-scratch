#!/usr/bin/env node
/**
 * 中医口腔科学 · 第 9 章 急症章的一半功夫，是教人少做五件事
 * 课程: departments/08-wuguan/08-zhongyi-kouqiang-kexue/chapters/09-e89/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章从正文现算：三类急症与固定次序、全脱位的四步、禁用介质清单、
 * 感染四层表的行数、七条红旗与现场禁止的四件事。
 * 次序是本章的全部内容，所以次序由位置判定，不由注释声明。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 9;
const SLUG = '09-e89';

const TYPES = ['外伤', '出血', '感染'];
const SEQ = ['先气道', '再出血', '再保牙', '最后辨证'];
const STEPS4 = [
  ['拿', '**第一步，拿。**'],
  ['洗', '**第二步，洗。**'],
  ['泡', '**第三步，泡。**'],
  ['送', '**第四步，送。**'],
];
const BANNED = ['自来水', '干藏', '酒精', '漱口水', '含糖饮料'];
const FORBID = ['热敷', '挤压排脓', '自行挑破', '含酒'];
const RED7 = ['张口受限', '发热寒战', '吞咽困难', '流涎', '舌体抬高', '呼吸困难', '肿胀越过下颌下缘'];
const BOUNDARY = ['本章不给操作参数', '不构成急救指令', '不替代现场急救'];

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');
const present = (doc, term) => doc.includes(term);
const sections = (doc) => [...doc.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());

function ordering(doc, terms) {
  let last = -1;
  for (const t of terms) {
    const i = doc.indexOf(t);
    if (i <= last) return false;
    last = i;
  }
  return true;
}

function sliceSection(doc, from, to) {
  const a = doc.indexOf(from);
  const b = doc.indexOf(to, a + 1);
  return a < 0 ? '' : doc.slice(a, b < 0 ? undefined : b);
}

/** 取小节内第一张表的行数（跳过表头与分隔行） */
function tableRowCount(text) {
  const lines = text.split(String.fromCharCode(10));
  const block = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('|')) {
      if (block.length) break;
      continue;
    }
    const cells = line.replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
    block.push({ cells, separator: cells.every((c) => /^:?-{2,}:?$/.test(c)) });
  }
  const sep = block.findIndex((r) => r.separator);
  return Math.max(0, block.length - (sep >= 0 ? sep + 1 : 1));
}

function audit(doc = readDoc()) {
  const infSec = sliceSection(doc, '## 五、感染', '## 六、');
  const title = (doc.split(String.fromCharCode(10))[0] || '')
    .replace(/^#\s*第\s*\d+\s*章\s*·\s*/, '')
    .trim();
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title,
    sections: sections(doc),
    types: TYPES.filter((t) => present(doc, t)),
    seq: SEQ.filter((t) => present(doc, t)),
    seqOk: ordering(doc, SEQ),
    steps4: STEPS4.filter(([, mark]) => present(doc, mark)).map(([n]) => n),
    banned: BANNED.filter((t) => present(doc, t)),
    forbid: FORBID.filter((t) => present(doc, t)),
    redCount: RED7.filter((t) => infSec.includes(t)).length,
    layers: tableRowCount(infSec),
    dryWorstOk: present(doc, '干藏是最坏的一种'),
    boundaryOk: BOUNDARY.every((t) => present(doc, t)),
  };
}

function main() {
  const a = audit();
  console.log(`中医口腔科学 · 第 ${a.chapter} 章 ${a.title}`);
  console.log('');
  console.log(`三类急症：${a.types.join('、')}`);
  console.log(`处置次序：${a.seq.join(' → ')}`);
  console.log(`次序与正文一致：${a.seqOk ? '是' : '否'}`);
  console.log('');
  console.log(`全脱位四步：${a.steps4.join(' → ')}（${a.steps4.length}／4）`);
  console.log(`禁用介质：${a.banned.join('、')}（${a.banned.length}／5）`);
  console.log(`干藏为最坏：${a.dryWorstOk ? '在正文' : '缺'}`);
  console.log('');
  console.log(`感染四层表：${a.layers} 行`);
  console.log(`七条红旗命中：${a.redCount}／7`);
  console.log(`现场禁止：${a.forbid.join('、')}`);
  console.log('');
  console.log('※ 教学样例：次序、条数与表行均由 docs/zh.md 现算，不手打。');
  console.log('※ 本输出仅用于教学演示，不构成急救指令；本章不给操作参数。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, SLUG, TYPES, SEQ, STEPS4, BANNED, FORBID, RED7, BOUNDARY,
  readDoc, sections, ordering, sliceSection, tableRowCount, audit,
};
