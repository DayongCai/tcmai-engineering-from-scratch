'use strict';
/**
 * 第 6 章 · 底本对读
 *
 *   node code/neijing.js
 *
 * 两份语料，各管一段：
 *   · standards/neijing-xuandu/units.json         教材选读本（31 篇类 / 162 篇，含注释与通读）
 *   · standards/materials/neijing-quanwen/content.json  全文（162 篇，155,206 字）
 * 本章篇目在两边各多少字、教材本有没有节选、docs 的引文能否逐字落到全文——都从这里现算。
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const MAP = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/neijing-xuandu/chapter-map.json'), 'utf8'));
const CHAPTER = MAP.chapters.find((c) => c.slug === '06-zhenfa-maiyao');
if (!CHAPTER) throw new Error('chapter-map.json 里没有 06-zhenfa-maiyao');

function report() {
  const lines = [];
  lines.push('');
  lines.push('═══ 第 6 章 · 底本对读（06-zhenfa-maiyao）═══');
  lines.push(`  教材本 ${CHAPTER.totals.xuanduHanzi.toLocaleString()} 字 · 全文 ${CHAPTER.totals.fullHanzi.toLocaleString()} 字 · `
    + `覆盖 ${(CHAPTER.totals.coverage * 100).toFixed(1)}% · 节选 ${CHAPTER.totals.excerpt} 篇`);
  for (const p of CHAPTER.pians) {
    lines.push(`  ${p.edition === 'excerpt' ? '节选' : '全文'} ${p.title}  教材 ${p.xuanduHanzi} / 全文 ${p.fullHanzi}  相似度 ${p.ratio}`);
  }
  lines.push(`  引文 ${CHAPTER.quotes.lines} 条 · 全文篇内命中 ${CHAPTER.quotes.hitFull}`);
  for (const b of CHAPTER.quotes.missing) lines.push(`  ✗ 未命中：${b.pian}「${b.preview}」`);
  lines.push('  边界：本章只有这 ' + CHAPTER.pians.length + ' 篇是「本章篇目」，其余篇目不在本章口径内。');
  return lines;
}

module.exports = { CHAPTER, MAP, report };

if (require.main === module) {
  for (const l of report()) console.log(l);
}
