#!/usr/bin/env node
/**
 * 知识产权转化 · 第 5 章 新技术申请下来算谁的
 * 课程: departments/06-guanli/14-zhishichanquan-zhuanhua/chapters/05-ip5/docs/zh.md
 *
 * 正文把三件容易被混为一谈的事拆开了：可专利的客体、发明人资格、数据合法性。
 * 这里各做一个判据：给一个方案或一个人，返回它落在哪一侧；数据则返回三关里断了哪几关。
 * 不可专利的客体清单直接从正文第五节表格读出，避免代码与正文各说一套。
 *
 * 依赖: 仅 Node.js 标准库
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TECHNICAL = ['系统', '装置', '数据处理方法', '制药用途', '模型结构'];

const readDoc = () => fs.readFileSync(DOC, 'utf8');

function cells(line) {
  return line.split('|').slice(1, -1).map((s) => s.trim());
}

/** 第五节「不可专利的那一侧」表格：对象 / 理由 / 可行的替代路径 */
function parseNonPatentable(text) {
  const sec = text.split('## 五、')[1] || '';
  const body = sec.split('## 六、')[0];
  const rows = [];
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) continue;
    const c = cells(line);
    if (c.length < 3) continue;
    if (c[0] === '不可专利的对象') continue;
    if (!c[1] || c[1].includes('---')) continue;
    rows.push({ object: c[0], reason: c[1], alternative: c[2] });
  }
  return rows;
}

/** 这类客体能不能进专利；能进的话，落在哪一种技术写法上 */
function subjectRoute(kind) {
  if (kind === '算法' || kind === '数学方法') return '不可专利：属智力活动的规则与方法';
  if (kind === '诊疗方法') return '不可专利：直接作用于具体病患';
  if (kind === '人体商业利用' || kind === '生殖系基因编辑') return '不可专利：公序良俗';
  if (TECHNICAL.includes(kind)) return '可专利：以技术方案主张';
  return '待判断：需结合具体写法与检索结果';
}

/** 该角色是否应列入发明人：看是否对实质性特点作出创造性贡献 */
function inventorIncluded(role) {
  const table = {
    老中医_经验构成关键特征: true,
    老中医_仅提供数据: false,
    工程师_设计模型结构: true,
    工程师_按既定方案实现: false,
    研究生_完成标注: false,
    研究生_设计评价方法: true,
  };
  if (!(role in table)) throw new Error('未知角色: ' + role);
  return table[role];
}

/** 数据三关：来源 / 处理 / 流转。返回断掉的关 */
function dataLegality({ consentCoversTraining, deidentified, transferApproved }) {
  const broken = [];
  if (!consentCoversTraining) broken.push('来源合法');
  if (!deidentified) broken.push('处理合法');
  if (!transferApproved) broken.push('流转合法');
  return broken;
}

function main() {
  const text = readDoc();
  const rows = parseNonPatentable(text);
  if (rows.length !== 3) throw new Error('不可专利表读出 ' + rows.length + ' 行，与预期不符');

  console.log('第 5 章 · 客体、发明人与数据三关');
  console.log('');
  console.log('不可专利的客体（' + rows.length + ' 类）：');
  for (const r of rows) console.log('  ' + r.object + ' → ' + r.alternative);
  console.log('');
  console.log('写法判断：');
  console.log('  「AI 辨证—开方」写成诊疗方法 → ' + subjectRoute('诊疗方法'));
  console.log('  「AI 辨证—开方」写成系统 → ' + subjectRoute('系统'));
  console.log('');
  console.log('发明人：老中医经验构成关键特征 → ' + (inventorIncluded('老中医_经验构成关键特征') ? '列入' : '不列入'));
  console.log('发明人：研究生完成标注 → ' + (inventorIncluded('研究生_完成标注') ? '列入' : '不列入'));
  console.log('');
  const broken = dataLegality({ consentCoversTraining: true, deidentified: false, transferApproved: true });
  console.log('数据自查：同意覆盖训练、未完成去标识、出境已批 → 断在 ' + broken.join('、'));
  console.log('');
  console.log('※ 客体清单与角色判据取自本章正文；合规以现行规范为准且会变。');
  console.log('※ 本章不构成法律意见或伦理审查结论。');
}

if (require.main === module) main();

module.exports = { parseNonPatentable, subjectRoute, inventorIncluded, dataLegality, TECHNICAL, DOC };
