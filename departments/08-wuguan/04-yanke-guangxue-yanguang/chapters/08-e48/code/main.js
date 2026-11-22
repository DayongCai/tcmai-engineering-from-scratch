#!/usr/bin/env node
/**
 * 眼科光学验光 · 第 8 章 验光记录与安全：记录不是数据，是判断链
 * 正文: departments/08-wuguan/04-yanke-guangxue-yanguang/chapters/08-e48/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 做法：把正文的几组结构化清单解析出来，再核算「四行」与「十二项」的差距：
 *   十二项字段（**一、**…**十二、**）、三查、五个卡点、五类纠纷、三种抗辩力，
 *   以及正文自己举的「少了某项会怎样」那四句。
 * 解析出的条数要与正文说的数目一致；不一致就报错——清单被改动时这里先响。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 8;
const TITLE = '验光记录与安全：记录不是数据，是判断链';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function grab(text, re, label) {
  const m = String(text).match(re);
  if (!m) throw new Error(`正文里找不到${label}：${re}`);
  return Number(String(m[1]).replace(/[−–—]/g, '-').replace(/[^\d.\-]/g, ''));
}

/** 取某句「甲、乙、丙。」里的条目。 */
function splitList(sentence) {
  return String(sentence).split(/[、，]/).map((s) => s.replace(/[。；]$/, '').trim()).filter(Boolean);
}

/** 十二项字段：从 **一、xxx。** 到 **十二、xxx。** */
function parseFields(text) {
  return [...text.matchAll(/\*\*([一二三四五六七八九十]{1,3})、([^*\n]+?)\*\*/g)]
    .map((m) => ({ no: m[1], name: m[2].replace(/。$/, '').trim() }))
    .filter((f) => f.name.length <= 12); // 排除术前谈话那类长句
}

/** 四行最小集与全部字段的覆盖率。 */
function coverage(rowCount, fieldCount) {
  return { rowCount, fieldCount, missing: fieldCount - rowCount, ratio: rowCount / fieldCount };
}

function compute(text) {
  const fields = parseFields(text);
  const rowMin = 4; // 球镜、柱镜、轴、瞳距
  const checks = (text.match(/\*\*第[一二三]查/g) || []).length;
  const gateSentence = (text.match(/五个卡点要单独标出来：([^。]+)。/) || [])[1] || '';
  const gates = splitList(gateSentence);
  const disputeBlock = (text.match(/验光环节的纠纷集中在五类。([\s\S]*?)\n\n/) || [])[1] || '';
  const disputes = (disputeBlock.match(/\*\*[^*\n]+\*\*——/g) || []).map((s) => s.replace(/\*\*|——/g, ''));
  const defenses = (text.match(/\*\*(时间戳|原始数据|告知痕迹)\*\*/g) || []).map((s) => s.replace(/\*\*/g, ''));
  const missingSentence = (text.match(/这十二项不是格式偏好。([^。]+(?:。[^。]+){0,2}。)/) || [])[1] || '';
  const missingExamples = (missingSentence.match(/少了/g) || []).length;
  const reviewItems = splitList(((text.match(/每次复查单列，不与初诊混写。([^。]+)。/) || [])[1] || '').split('——')[0]);

  return { fields, rowMin, cov: coverage(rowMin, fields.length), checks, gates, disputes, defenses, missingExamples, reviewItems };
}

function verify(r) {
  const bad = [];
  if (r.fields.length !== 12) bad.push(`十二项字段解析出 ${r.fields.length} 项：${r.fields.map((f) => f.name).join('、')}`);
  for (const must of ['身份与时间', '主诉', '散瞳记录', '视力', '处方', '签名与日期', '复查记录']) {
    if (!r.fields.some((f) => f.name.includes(must))) bad.push(`字段缺「${must}」`);
  }
  if (r.fields[0] && r.fields[0].no !== '一') bad.push('第一项编号不是「一」');
  if (r.fields[r.fields.length - 1] && r.fields[r.fields.length - 1].no !== '十二') bad.push('最后一项编号不是「十二」');
  if (!(r.checks === 3)) bad.push(`三查解析出 ${r.checks} 条`);
  if (!(r.gates.length === 5)) bad.push(`五个卡点解析出 ${r.gates.length} 条：${r.gates.join('、')}`);
  if (!(r.disputes.length === 5)) bad.push(`五类纠纷解析出 ${r.disputes.length} 类：${r.disputes.join('、')}`);
  if (!(r.defenses.length === 3)) bad.push(`三种抗辩力解析出 ${r.defenses.length} 种：${r.defenses.join('、')}`);
  if (!(r.missingExamples === 4)) bad.push(`「少了某项」的例子解析出 ${r.missingExamples} 处`);
  if (!(r.reviewItems.length === 4)) bad.push(`复查四项解析出 ${r.reviewItems.length} 项：${r.reviewItems.join('、')}`);
  if (!(Math.abs(r.cov.ratio - 4 / 12) < 1e-9)) bad.push('覆盖率算错');
  if (bad.length) throw new Error('正文与解析不自洽：\n  - ' + bad.join('\n  - '));
  return true;
}

function main() {
  const r = compute(read());
  verify(r);
  console.log(`眼科光学验光 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（清单与条数从正文解析；不一致即报错）');
  console.log('');
  console.log(`十二项字段（实解 ${r.fields.length} 项）：`);
  for (const f of r.fields) console.log(`  ${f.no}、${f.name}`);
  console.log('');
  console.log(`最小四行：球镜 · 柱镜 · 轴 · 瞳距 → 覆盖率 ${r.cov.rowCount}/${r.cov.fieldCount} = ${(r.cov.ratio * 100).toFixed(1)}%，缺口 ${r.cov.missing} 项`);
  console.log(`三查 ${r.checks} 道 · 五个卡点 ${r.gates.length} 处 · 五类纠纷 ${r.disputes.length} 类 · 抗辩力 ${r.defenses.length} 样`);
  console.log('');
  console.log(`卡点：${r.gates.join(' / ')}`);
  console.log(`纠纷：${r.disputes.join(' / ')}`);
  console.log(`抗辩力：${r.defenses.join(' / ')}`);
  console.log('');
  console.log(`「少了某项」的情形 ${r.missingExamples} 处；复查四项：${r.reviewItems.join('、')}`);
  console.log('  （少了出生日期、少了散瞳记录、少了「未查」、少了告知——四处都指向同一件事：不写等于没做）');
  console.log('');
  console.log('※ 字段与条数均取自本章 docs/zh.md；本章只写哪些字段不能空、为什么不能空，不引条款号、不给成品模板。');
  console.log('※ 记录格式、保存、修改与隐私要求以现行规范与所在机构制度为准；本章不构成法律意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE,
  read, grab, splitList, parseFields, coverage, compute, verify
};
