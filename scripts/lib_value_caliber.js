#!/usr/bin/env node
'use strict';
/**
 * scripts/lib_value_caliber.js —— 数值口径的判定核心（两支共用一份实现）
 *
 * 为什么要单独抽出来：
 *   「教材带数值时怎么写」这条口径如果只写在 README 里，就是君子协定；如果只在
 *   章门里写一段 if，就永远只有一支被执行——另一支等于没写过。抽成模块后，
 *   tests/test_bingli_chapters.js 可以拿**构造的 fixture** 把两支都跑一遍：
 *   同一段正文，A 支（教材 0 数值）该红的地方必须红，B 支（教材带数值）该放行的
 *   地方必须放行。这样「带数值怎么写」是被执行过的规则，不是一句承诺。
 *
 * 规则（两支共用一条底线：值必须能回到教材的某一行）：
 *   A 支（valueLike = 0）：正文任何位置都不许出现「数字＋计量单位」。
 *     —— 引文行也放行不通：教材本来没有值，能引出来的「值」必然是编的，
 *        由引文逐字门去挡（它会把这句话回查到教材原文里）。
 *   B 支（valueLike > 0）：值**只允许**出现在带 locator（教材·第N章·N.M.K）的行；
 *     其余位置裸写即红；改写为「正常值/参考区间」也是红（由 boundaryIssue 判）。
 */

const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;
// locator 允许带著作名：`教材·第9章·9.2.1`（病理学）与 `教材·药理学·第2章·2.1.1`（药理学）都算。
// 不加这一段，带书名的引文行会被当成裸写数值——B 支「引文行放行」对药理学静默失效。
const LOCATOR = /教材·(?:[^·\n]{1,12}·)?第\d+章/;
// 把教材的观察值说成「正常值/参考区间」——B 支里这是最危险的一步：数值还在，含义被换了
const REFRAME = /正常值|参考区间|参考范围|正常范围/;

function branchOf(valueLike) {
  return valueLike > 0 ? 'B' : 'A';
}

/**
 * @param {string} doc  docs/zh.md 全文
 * @param {number} valueLike  底本 counts.valueLike
 * @returns {{branch:string, values:number, bare:string[], quoted:string[], reframed:boolean}}
 */
function classify(doc, valueLike) {
  const branch = branchOf(valueLike);
  let values = 0;
  const bare = [];
  const quoted = [];
  for (const line of doc.split('\n')) {
    const hits = line.match(VALUE_RE) || [];
    if (!hits.length) continue;
    values += hits.length;
    if (LOCATOR.test(line)) quoted.push(...hits);
    else bare.push(...hits);
  }
  return { branch, values, bare, quoted, reframed: REFRAME.test(doc) };
}

/**
 * 门用的判决：返回错误串数组（空 = 通过）
 * @param {string} doc
 * @param {number} valueLike
 * @param {boolean} hasBoundary  正文是否写了「教材不给值/逐字引」类声明
 */
function verdict(doc, valueLike, hasBoundary) {
  const { branch, bare, reframed } = classify(doc, valueLike);
  const errs = [];
  if (bare.length) {
    errs.push(`数值口径（${branch} 支）：正文出现 ${bare.length} 处数值不在教材引文行内（${bare.slice(0, 5).join('、')}）`);
  }
  if (reframed && !hasBoundary) {
    errs.push('docs 提到正常值/参考范围，但没有「教材不给值」或「逐字引」的边界声明');
  }
  if (branch === 'B' && REFRAME.test(doc) && /教材·第\d+章/.test(doc) && !hasBoundary) {
    errs.push('B 支：引了教材的值又用「正常值/参考区间」表述，必须写明这是教材原话的范围而不是本课程给的正常值');
  }
  return errs;
}

module.exports = { classify, verdict, branchOf, VALUE_RE, LOCATOR, REFRAME };
