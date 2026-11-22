#!/usr/bin/env node
/**
 * 知识产权转化 · 第 6 章 侵权判定比权利要求覆盖不覆盖
 * 课程: departments/06-guanli/14-zhishichanquan-zhuanhua/chapters/06-ip6/docs/zh.md
 *
 * 正文第一节给了两步判定：先字面全面覆盖，再等同；等同受三条限制。
 * 第三节给了被控方的六类抗辩，其门槛在表格里。
 * 这里把两步判定写成可运行函数，把抗辩清单从正文表格读出，避免两处结论打架。
 *
 * 依赖: 仅 Node.js 标准库
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const DEFENSES = ['不落入', '现有技术抗辩', '权利用尽', '先用权', '科研实验例外', '无效宣告'];

const readDoc = () => fs.readFileSync(DOC, 'utf8');

function cells(line) {
  return line.split('|').slice(1, -1).map((s) => s.trim());
}

/** 第三节的抗辩表：抗辩 / 核心主张 / 门槛与要点 */
function parseDefenseTable(text) {
  const sec = text.split('## 三、')[1] || '';
  const body = sec.split('## 四、')[0];
  const rows = [];
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const c = cells(line);
    if (c.length < 3) continue;
    if (!DEFENSES.includes(c[0])) continue;
    rows.push({ defense: c[0], claim: c[1], threshold: c[2] });
  }
  return rows;
}

/** 第一步：全面覆盖。权利要求记载的全部特征都在被控方案里，才落入 */
function literalInfringes(claimFeatures, productFeatures) {
  const have = new Set(productFeatures);
  return claimFeatures.every((f) => have.has(f));
}

/** 第二步：等同。字面不落入时才有这一步，且受三条限制。
 *  任一条被触发，等同主张即不成立。
 */
function equivalentAvailable({ estoppel, dedicatedToPublic, readsOnPriorArt }) {
  if (estoppel) return { ok: false, reason: '禁止反悔' };
  if (dedicatedToPublic) return { ok: false, reason: '捐献规则' };
  if (readsOnPriorArt) return { ok: false, reason: '现有技术抗辩的挤压' };
  return { ok: true, reason: '手段、功能、效果实质相同且无需创造性劳动' };
}

/**
 * 两步判定合并。
 * 等同只针对「被替换的特征」；某个特征在被控方案里根本没有对应物，那是缺必要技术特征，
 * 直接不落入，轮不到等同。
 * opts.equivalents：权利要求特征 → 被控方案中与之等同的那一项。
 */
function assess(claim, product, options = {}) {
  if (literalInfringes(claim, product)) return { infringes: true, basis: '字面全面覆盖' };
  const missing = claim.filter((f) => !product.includes(f));
  const eq = options.equivalents || {};
  if (!missing.length || !missing.every((f) => eq[f] && product.includes(eq[f]))) {
    return { infringes: false, basis: '不落入（缺少必要技术特征）' };
  }
  const verdict = equivalentAvailable(options);
  return verdict.ok
    ? { infringes: true, basis: '等同：' + verdict.reason }
    : { infringes: false, basis: '不落入（' + verdict.reason + '）' };
}

function main() {
  const text = readDoc();
  const rows = parseDefenseTable(text);
  if (rows.length !== DEFENSES.length) throw new Error('抗辩表读出 ' + rows.length + ' 行，与预期不符');

  console.log('第 6 章 · 两步判定与被控方的六张牌');
  console.log('');
  const claim = ['A', 'B', 'C'];
  const same = assess(claim, ['A', 'B', 'C', 'D']);
  const substituted = { equivalents: { C: 'D' } };
  const swapped = assess(claim, ['A', 'B', 'D'], substituted);
  const missing = assess(claim, ['A', 'B'], {});
  console.log('  特征全在（多一项无妨）→ ' + (same.infringes ? '落入' : '不落入') + ' · ' + same.basis);
  console.log('  C 换 D、无限制 → ' + (swapped.infringes ? '落入' : '不落入') + ' · ' + swapped.basis);
  console.log('  少 C 且无对应物 → ' + (missing.infringes ? '落入' : '不落入') + ' · ' + missing.basis);
  console.log('  C 换 D、审查中已放弃 → ' + assess(claim, ['A', 'B', 'D'], { equivalents: { C: 'D' }, estoppel: true }).basis);
  console.log('');
  console.log('抗辩清单（' + rows.length + ' 类）：');
  for (const r of rows) console.log('  ' + r.defense + ' —— ' + r.threshold);
  console.log('');
  console.log('※ 判定函数只看特征与三条限制，不评价任何具体案件。');
  console.log('※ 本章不构成诉讼或谈判建议。');
}

if (require.main === module) main();

module.exports = { parseDefenseTable, literalInfringes, equivalentAvailable, assess, DEFENSES, DOC };
