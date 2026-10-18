'use strict';
/**
 * 太阳病表证：异体字归一化检索 + 中风/伤寒分支判定
 *
 *   node code/main.js
 *
 * 口径：
 *   · 归一化只用于**检索**，不回写原文；替换次数单独报，便于核对。
 *   · 判定只覆盖原文给出的两条经典分支（汗出脉缓 / 无汗脉浮紧），
 *     其余情况一律「不确定」，不硬分。
 *   · 频次≠权重：桂枝汤 134 条里含大量禁忌与误治条，代码只报数不排序。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));
const TEXTS = [];
for (const p of BOOK.pian) for (const it of p.items) TEXTS.push({ pian: p.no, text: it.text });

/** 异体字 → 正体（本章只收实测影响最大的一组，其余标注未纳入） */
const VARIANTS = { '𤍠': '热', '蚘': '蛔', '欬': '咳' };

function normalize(text) {
  let out = text;
  const replaced = {};
  for (const [from, to] of Object.entries(VARIANTS)) {
    const n = out.split(from).length - 1;
    if (n) { replaced[from] = n; out = out.split(from).join(to); }
  }
  return { text: out, replaced };
}

/** 检索：raw（原样）与 normalized（归一后）两种命中数，差即漏检 */
function search(needle) {
  const raw = TEXTS.filter((t) => t.text.includes(needle)).length;
  const norm = TEXTS.filter((t) => normalize(t.text).text.includes(needle)).length;
  return { needle, raw, normalized: norm, missed: norm - raw };
}

/** 表证分支判定：只认原文条件 */
function classify(signs = {}) {
  const { sweat, pulse, dyspnea, vomiting } = signs;
  const base = { sweat: !!sweat, pulse: pulse || null, dyspnea: !!dyspnea, vomiting: !!vomiting };
  const unclear = (why) => ({ branch: '不确定', formula: null, why, ...base, notExcluded: ['合病（见第 9 章）', '变证/坏病'] });

  if (sweat === undefined || pulse === undefined) return unclear('缺关键条件：汗出与否、脉象');
  if (sweat === true && pulse === '缓') {
    return { branch: '太阳中风', formula: '桂枝汤', why: '发热汗出恶风，脉缓（篇 4）', ...base, notExcluded: ['若兼喘满，须排除合病'] };
  }
  if (sweat === false && pulse === '浮紧' && dyspnea) {
    return { branch: '太阳伤寒', formula: '麻黄汤', why: '无汗而喘，脉浮紧（篇 5）', ...base, notExcluded: ['若烦躁，原文另有分支（大青龙汤条）'] };
  }
  return unclear('条件不落在两条经典分支内');
}

function main() {
  console.log('检索：raw 命中 vs 归一化命中（差 = 因异体字漏掉的条数）\n');
  for (const n of ['发热', '汗出', '无汗', '恶寒']) {
    const r = search(n);
    console.log(`  ${n}：raw ${r.raw} → 归一后 ${r.normalized}（漏检 ${r.missed}）`);
  }
  const domainTiao = BOOK.pian.filter((x) => x.domain === '太阳病').reduce((a, x) => a + x.actual.tiao, 0);
  const mention = TEXTS.filter((t) => t.text.includes('太阳')).length;
  console.log(`\n规模：太阳病域 ${domainTiao} 条（4 篇）· 正文提及「太阳」${mention} 条；` +
    `桂枝汤 ${search('桂枝汤').raw} 条 · 麻黄汤 ${search('麻黄汤').raw} 条（频次≠权重）`);

  console.log('\n判定样例：');
  for (const s of [{ sweat: true, pulse: '缓' }, { sweat: false, pulse: '浮紧', dyspnea: true }, {}]) {
    const r = classify(s);
    console.log(`  ${JSON.stringify(s)} → ${r.branch}${r.formula ? '/' + r.formula : ''}`);
  }
  console.log('\n本输出为文本检索与规则演示，不构成辨证处方建议。');
}

if (require.main === module) main();
module.exports = { normalize, search, classify, VARIANTS, TEXTS, BOOK };
