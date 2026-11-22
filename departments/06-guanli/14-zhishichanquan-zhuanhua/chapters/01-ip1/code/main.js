#!/usr/bin/env node
/**
 * 知识产权转化 · 第 1 章 一张方子是一束可以分开主张的权利
 * 课程: departments/06-guanli/14-zhishichanquan-zhuanhua/chapters/01-ip1/docs/zh.md
 *
 * 本章的可算部分有两块：
 *   一、正文第三节的六层切分表 —— 逐行读出公开状态与可用权利，据此判断哪几层能独立交易；
 *   二、同一层上专利与商业秘密的取舍 —— 判据是反向工程能否还原。
 * 两层都从正文现读，不在这里另抄一份结论；正文改了，运行结果随之改变。
 *
 * 依赖: 仅 Node.js 标准库
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

/** 六层表的第一列，按正文字面固定，用来在表格里认出这六行 */
const LAYER_NAMES = ['组成', '配比与剂量', '制备工艺', '用途与适应症', '临床与实验数据', '名称与标识'];

const readDoc = () => fs.readFileSync(DOC, 'utf8');

function cells(line) {
  return line.split('|').slice(1, -1).map((s) => s.trim());
}

/** 从正文表格里读出六层：层 / 内容 / 典型公开状态 / 可用的权利 */
function parseLayerTable(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const c = cells(line);
    if (c.length < 4) continue;
    if (!LAYER_NAMES.includes(c[0])) continue;
    rows.push({ layer: c[0], content: c[1], disclosure: c[2], rights: c[3] });
  }
  return rows;
}

/** 能直接变成可独立交易资产的层：可用权利一栏含「专利」的那几层 */
function tradableLayers(rows) {
  return rows.filter((r) => r.rights.includes('专利')).map((r) => r.layer);
}

/** 同一层上专利与商业秘密的二选一：反向工程能还原就申请专利，还原不了就保密 */
function chooseProtection(reverseEngineerable) {
  return reverseEngineerable ? '专利' : '商业秘密';
}

/** 该层是否已经被公开到拿不回来（「不公开」「部分披露」都不算已公开） */
function isPublicLayer(row) {
  return row.disclosure.includes('公开') && !row.disclosure.includes('不公开');
}

function hanzi(s) {
  return (String(s).match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
}

function main() {
  const text = readDoc();
  const rows = parseLayerTable(text);
  if (rows.length !== LAYER_NAMES.length) {
    throw new Error('正文六层表读出 ' + rows.length + ' 行，与预期层数不符');
  }

  console.log('第 1 章 · 一张方子的可主张层次');
  console.log('');
  console.log('正文 ' + hanzi(text).toLocaleString('en-US') + ' 汉字；六层切分表读出 ' + rows.length + ' 行：');
  for (const r of rows) {
    const open = isPublicLayer(r) ? '已公开' : '未公开';
    console.log('  ' + r.layer.padEnd(8, '　') + ' ' + open + ' · ' + r.rights);
  }
  console.log('');
  console.log('可独立交易的层：' + tradableLayers(rows).join('、'));
  console.log('');
  console.log('同一层上的取舍判据（反向工程）：');
  console.log('  成分与配比可测 → ' + chooseProtection(true));
  console.log('  工艺参数与火候难测 → ' + chooseProtection(false));
  console.log('');
  console.log('※ 表格与判据均由本章正文现读，未在代码里另存一份结论。');
  console.log('※ 本章讨论对象与类型划分，不构成法律意见。');
}

if (require.main === module) main();

module.exports = { parseLayerTable, tradableLayers, chooseProtection, isPublicLayer, LAYER_NAMES, DOC };
