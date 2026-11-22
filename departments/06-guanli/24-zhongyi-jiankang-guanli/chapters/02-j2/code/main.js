#!/usr/bin/env node
/**
 * 中医健康管理 · 第 2 章 理论不能生成分层，就只是修辞
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/02-j2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的四组清单——体质学说的三个工程条件、风险接口的三层、三种典型误用、
 * 风险的乘数，以及「神」的五项观察——都从正文读出；条数再与句子里写的中文数字对账。
 * 正文改了条数而没改数字，脚本会报不一致。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '理论不能生成分层，就只是修辞';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function hanzi(text) {
  return (String(text || '').match(HANZI) || []).length;
}

function sections(body) {
  const out = [];
  let cur = { title: '', lines: [], hanzi: 0 };
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], lines: [], hanzi: 0 };
      out.push(cur);
      continue;
    }
    cur.lines.push(line);
    cur.hanzi += hanzi(line);
  }
  return out;
}

function sectionText(body, prefix) {
  const s = sections(body).find((x) => x.title.startsWith(prefix));
  if (!s) throw new Error('正文里没有以「' + prefix + '」开头的一节');
  return s.lines.join('\n');
}

/** 体质学说被采纳的三个工程条件：加粗的「可测。」「可分。」「可重复。」。 */
function engineeringConditions(body) {
  const t = sectionText(body, '三、');
  return [...t.matchAll(/^\*\*(可[^*\n]{1,3})。\*\*/gm)].map((m) => m[1]);
}

/** 风险接口三层：加粗的「第一层，状态用于分层。」。 */
function riskLayers(body) {
  const t = sectionText(body, '五、');
  return [...t.matchAll(/^\*\*第([一二三])层，([^*\n]+?)。\*\*/gm)].map((m) => ({ n: m[1], action: m[2] }));
}

/** 三种典型误用：第三节的列表项。 */
function misuses(body) {
  const t = sectionText(body, '三、');
  return [...t.matchAll(/^- \*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 风险的两个乘数：「风险有两个乘数：**A** 与 **B**」。 */
function riskMultipliers(body) {
  const m = body.match(/风险有两个乘数：\*\*(.+?)\*\*\s*与\s*\*\*(.+?)\*\*/);
  if (!m) throw new Error('正文里没有「风险有两个乘数：」这句');
  return [m[1].trim(), m[2].trim()];
}

/** 「神」的可观察项：第四节的表格首列（去表头与分隔行）。 */
function shenRows(body) {
  const t = sectionText(body, '四、');
  return t
    .split('\n')
    .filter((l) => /^\|\s*[^|]+\|/.test(l) && !/^\|\s*[-: ]+\|/.test(l))
    .map((l) => l.split('|').map((c) => c.trim()).filter(Boolean)[0])
    .filter((c) => c && c !== '神的表现');
}

function audit(body) {
  const conds = engineeringConditions(body);
  const layers = riskLayers(body);
  const misuse = misuses(body);
  const mult = riskMultipliers(body);
  const shen = shenRows(body);

  const claims = [
    { label: '三个工程条件', want: 3, got: conds.length },
    { label: '三层搭法', want: 3, got: layers.length },
    { label: '三种典型误用', want: 3, got: misuse.length },
    { label: '两个乘数', want: 2, got: mult.length },
    { label: '五项可观察', want: 5, got: shen.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);

  return { conds, layers, misuse, mult, shen, claims, mismatched };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 引书 ${cites.length} 部`);
  console.log('');
  console.log(`体质学说被采纳的 ${a.conds.length} 个工程条件：${a.conds.join('／')}`);
  console.log('  → 三条同时成立，理论才能变成分层；缺一条就只能停在解释句里。');
  console.log('');
  console.log('与风险管理接口的三层（顺序不能颠倒）：');
  a.layers.forEach((l) => console.log(`  第${l.n}层：${l.action}`));
  console.log(`风险的两个乘数：${a.mult.join(' × ')}`);
  console.log('');
  console.log(`三种典型误用：${a.misuse.join('；')}`);
  console.log(`「神」的可观察项 ${a.shen.length} 项：${a.shen.join('／')}`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：一套理论能不能用，看它能不能生成区分；能解释一切，就等于不能区分任何。');
  console.log('※ 条数与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见，也不构成任何体质判定或风险预测的依据。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText,
  engineeringConditions, riskLayers, misuses, riskMultipliers, shenRows, audit,
};
