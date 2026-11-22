#!/usr/bin/env node
/**
 * 知识产权转化 · 第 3 章 专利审查只问新的、难想到的、做得出的
 * 课程: departments/06-guanli/14-zhishichanquan-zhuanhua/chapters/03-ip3/docs/zh.md
 *
 * 正文第二节列了三类典型缺陷（公开不充分 / 得不到支持 / 缺效果证据），
 * 第三节列了权利要求的三个层次，第一节讲了新颖性宽限期的有限性。
 * 这里把三块都做成可执行的判据：给一份申请的自查结果，返回它会踩中哪几类缺陷。
 *
 * 依赖: 仅 Node.js 标准库
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const DEFECT_NAMES = ['公开不充分', '得不到支持', '缺效果证据'];

const readDoc = () => fs.readFileSync(DOC, 'utf8');

function cells(line) {
  return line.split('|').slice(1, -1).map((s) => s.trim());
}

/** 读出三类典型缺陷表 */
function parseDefectTable(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const c = cells(line);
    if (c.length < 3) continue;
    if (!DEFECT_NAMES.includes(c[0])) continue;
    rows.push({ defect: c[0], symptom: c[1], cause: c[2] });
  }
  return rows;
}

/**
 * 按正文判据筛查一份申请，返回命中的缺陷。
 * 三项都来自「说明书要写到什么程度」那一节：工艺参数、范围与实施例的匹配、对照与统计。
 */
function screen(application) {
  const hits = [];
  if (!application.hasProcessParams) hits.push('公开不充分');
  if (application.claimRangeWiderThanExamples) hits.push('得不到支持');
  if (!application.hasControlledData) hits.push('缺效果证据');
  return hits;
}

/** 新颖性：申请日前的公开是否被宽限期兜住（宽限期短且仅限特定情形） */
function noveltyLost({ monthsBeforeFiling, coveredByGrace }) {
  return monthsBeforeFiling > 0 && !coveredByGrace;
}

/** 权利要求三层是否齐备 */
function claimLayers(text) {
  const layers = [];
  if (text.includes('独立权利要求')) layers.push('独立');
  if (text.includes('从属权利要求')) layers.push('从属');
  if (text.includes('方法权利要求')) layers.push('方法');
  if (text.includes('用途权利要求')) layers.push('用途');
  return layers;
}

function main() {
  const text = readDoc();
  const rows = parseDefectTable(text);
  if (rows.length !== DEFECT_NAMES.length) {
    throw new Error('缺陷表读出 ' + rows.length + ' 行，与预期不符');
  }

  console.log('第 3 章 · 申请自查：三类典型缺陷');
  console.log('');
  for (const r of rows) console.log('  ' + r.defect + '：' + r.cause);
  console.log('');
  const caseA = { hasProcessParams: false, claimRangeWiderThanExamples: true, hasControlledData: false };
  console.log('示例（无工艺参数、范围大于实施例、无对照数据）命中：' + screen(caseA).join('、'));
  const caseB = { hasProcessParams: true, claimRangeWiderThanExamples: false, hasControlledData: true };
  console.log('示例（三问都答上）命中：' + (screen(caseB).length ? screen(caseB).join('、') : '无'));
  console.log('');
  console.log('权利要求层次：' + claimLayers(text).join(' / '));
  console.log('申请日前已公开 1 个月、不在宽限情形内 → 新颖性' + (noveltyLost({ monthsBeforeFiling: 1, coveredByGrace: false }) ? '已丧失' : '尚存'));
  console.log('');
  console.log('※ 判据取自本章正文，未引入正文之外的审查尺度。');
  console.log('※ 本章不给撰写模板，具体案件以现行规范与个案通知为准。');
}

if (require.main === module) main();

module.exports = { parseDefectTable, screen, noveltyLost, claimLayers, DEFECT_NAMES, DOC };
