#!/usr/bin/env node
/**
 * 知识产权转化 · 第 2 章 五种互不替代的保护形态
 * 课程: departments/06-guanli/14-zhishichanquan-zhuanhua/chapters/02-ip2/docs/zh.md
 *
 * 正文第一节给了一张五形态对照表（分形 / 保护对象 / 取得方式 / 期限 / 排他强度 / 主要代价）。
 * 本章的可算部分是：把表读出来，按「必须公开」「可以无限期」「主体是集体」这些性质
 * 给每种形态打上属性，再验证这些属性确实来自正文而不是代码里的偏好。
 *
 * 依赖: 仅 Node.js 标准库
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const FORMS = ['专利', '商业秘密', '著作权', '商标', '地理标志'];

const readDoc = () => fs.readFileSync(DOC, 'utf8');

function cells(line) {
  return line.split('|').slice(1, -1).map((s) => s.trim());
}

/** 读出五形态对照表 */
function parseFormTable(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const c = cells(line);
    if (c.length < 6) continue;
    if (!FORMS.includes(c[0])) continue;
    rows.push({
      form: c[0],
      object: c[1],
      acquire: c[2],
      term: c[3],
      strength: c[4],
      cost: c[5],
    });
  }
  return rows;
}

/** 取得该形态是否必须以公开技术内容为代价 */
function mustDisclose(form) {
  return form === '专利';
}

/** 该形态在正文里被描述为没有期限（公开即灭） */
function isIndefinite(row) {
  return row.term.includes('无期限');
}

/** 该形态的排他强度是否限于某一类别或范围 */
function isScoped(row) {
  return /限于|只禁|只对/.test(row.strength);
}

/**
 * 选型的第一问：这一层的信息已经公开到什么程度。
 * 已进入公有领域的，专利与商业秘密都无从谈起，只能靠表达、标识或来源类权利。
 */
function candidateForms({ publiclyKnown }) {
  if (publiclyKnown) return ['著作权', '商标', '地理标志'];
  return FORMS.slice();
}

function main() {
  const text = readDoc();
  const rows = parseFormTable(text);
  if (rows.length !== FORMS.length) {
    throw new Error('五形态对照表读出 ' + rows.length + ' 行，与预期不符');
  }

  console.log('第 2 章 · 五种保护形态的性质对照');
  console.log('');
  for (const r of rows) {
    const flags = [
      mustDisclose(r.form) ? '须公开' : '无须公开',
      isIndefinite(r) ? '无期限' : '有期限',
      isScoped(r) ? '范围受限' : '范围较宽',
    ];
    console.log('  ' + r.form.padEnd(6, '　') + ' ' + flags.join(' · ') + ' —— ' + r.term);
  }
  console.log('');
  console.log('已进入公有领域的信息，可选形态：' + candidateForms({ publiclyKnown: true }).join('、'));
  console.log('尚未公开的信息，可选形态：' + candidateForms({ publiclyKnown: false }).join('、'));
  console.log('');
  console.log('※ 属性判据（须公开／无期限／范围受限）直接从表格栏目文字推出。');
  console.log('※ 本章讨论形态取舍，不构成法律意见或商业建议。');
}

if (require.main === module) main();

module.exports = { parseFormTable, mustDisclose, isIndefinite, isScoped, candidateForms, FORMS, DOC };
