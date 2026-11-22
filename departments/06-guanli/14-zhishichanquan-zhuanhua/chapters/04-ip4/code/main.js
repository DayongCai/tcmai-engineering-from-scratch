#!/usr/bin/env node
/**
 * 知识产权转化 · 第 4 章 把不确定的未来切成可交付的几段
 * 课程: departments/06-guanli/14-zhishichanquan-zhuanhua/chapters/04-ip4/docs/zh.md
 *
 * 正文第一节是四条路径的对照表（转让什么 / 对价形式 / 剩余控制 / 退出难度），
 * 第四节给了七个合同问题，第二节给了尽调六问，第三节给了三种定价方法。
 * 这里把三张清单都从正文读出来，并把「里程碑能不能执行」做成判据。
 *
 * 依赖: 仅 Node.js 标准库
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const PATHS = ['自行实施', '许可', '转让', '作价入股'];

const readDoc = () => fs.readFileSync(DOC, 'utf8');

function cells(line) {
  return line.split('|').slice(1, -1).map((s) => s.trim());
}

/** 读出四条转化路径 */
function parsePathTable(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const c = cells(line);
    if (c.length < 5) continue;
    if (!PATHS.includes(c[0])) continue;
    rows.push({ path: c[0], object: c[1], payment: c[2], control: c[3], exit: c[4] });
  }
  return rows;
}

/** 该路径是否仍保留权利本身（看剩余控制一栏的措辞） */
function retainsOwnership(row) {
  return /保留所有权|完全|间接控制/.test(row.control);
}

/** 里程碑是否可以执行：必须绑定可验证事件，不接受「顺利」「进展」这类描述 */
function isVerifiableMilestone(text) {
  if (/顺利|进展良好|按计划推进/.test(text)) return false;
  return /提交注册申请|取得批件|销量|上市|验收/.test(text);
}

/** 第二节的尽调六问（按括号深度切分，括号内的顿号不算分隔） */
function diligenceQuestions(text) {
  const m = text.match(/尽调清单可以压缩成六问：([^。]+)。/);
  if (!m) return [];
  const out = [];
  let buf = '';
  let depth = 0;
  for (const ch of m[1]) {
    if (ch === '（') depth += 1;
    if (ch === '）') depth = Math.max(0, depth - 1);
    if (ch === '、' && depth === 0) {
      out.push(buf.trim());
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out.filter(Boolean);
}

/** 第四节列出的七个合同问题（编号 1–7） */
function contractPoints(text) {
  const sec = text.split('## 四、合同要点')[1] || '';
  const body = sec.split('## 五、')[0];
  return body
    .split(/\r?\n/)
    .map((l) => l.match(/^(\d)\.\s*\*\*([^*]+)\*\*/))
    .filter(Boolean)
    .map((m) => ({ n: Number(m[1]), title: m[2] }));
}

function main() {
  const text = readDoc();
  const rows = parsePathTable(text);
  if (rows.length !== PATHS.length) throw new Error('路径表读出 ' + rows.length + ' 行，与预期不符');

  console.log('第 4 章 · 四条路径与合同结构');
  console.log('');
  for (const r of rows) {
    console.log('  ' + r.path.padEnd(4, '　') + ' ' + (retainsOwnership(r) ? '仍保留权利' : '权利已交出') + ' · ' + r.payment);
  }
  console.log('');
  console.log('尽调六问（' + diligenceQuestions(text).length + ' 项）：' + diligenceQuestions(text).join(' / '));
  console.log('合同七问（' + contractPoints(text).length + ' 项）：' + contractPoints(text).map((p) => p.title).join(' / '));
  console.log('');
  console.log('里程碑判据：');
  console.log('  「取得批件后支付」→ ' + (isVerifiableMilestone('取得批件后支付') ? '可执行' : '不可执行'));
  console.log('  「项目进展顺利时支付」→ ' + (isVerifiableMilestone('项目进展顺利时支付') ? '可执行' : '不可执行'));
  console.log('');
  console.log('※ 三张清单均从本章正文读出；不给价格、比例与分成区间。');
  console.log('※ 本章不构成投资建议或资产评估意见。');
}

if (require.main === module) main();

module.exports = { parsePathTable, retainsOwnership, isVerifiableMilestone, diligenceQuestions, contractPoints, PATHS, DOC };
