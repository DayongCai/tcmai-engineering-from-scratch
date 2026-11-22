#!/usr/bin/env node
/**
 * 中医骨伤科学基础 · 第 2 章 影像能看见骨折线，看不见病人是怎么伤的
 * 课程: departments/04-gushang/03-gushang-kexue-jichu/chapters/02-linchuang-zhencha/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的骨架是一张特殊检查表和三组「同」。脚本直接从正文里把表读成数组，
 * 再去找量诊的三个同、神经血管的两次检查、影像的先后次序——全部现算，不手打。
 *
 * 现算项：
 *   规模      汉字数 / 节数 / 引书
 *   特殊检查  表格行数、每行四个字段、按部位归类
 *   量诊      同一解剖标志 / 同一水平 / 同一体位
 *   神经血管  复位前一次、复位后一次
 *   影像次序  X 线 → CT → MRI → 超声 在正文里的排列
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '影像能看见骨折线，看不见病人是怎么伤的';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const SAME_THREE = ['同一解剖标志', '同一水平', '同一体位'];
const IMAGING = ['X 线', 'CT', 'MRI', '超声'];

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 把「| 动作 | 部位 | 阳性提示 | 局限 |」这类表读成对象数组；分隔行与表头跳过 */
function parseTable(body) {
  const lines = body.split('\n').filter((l) => /^\s*\|/.test(l));
  const rows = [];
  for (const line of lines) {
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // 分隔行
    if (cells[0] === '动作') continue; // 表头
    rows.push({ test: cells[0], site: cells[1], positive: cells[2] || '', limit: cells[3] || '', cells: cells.length });
  }
  return rows;
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const hanzi = (body.match(HANZI) || []).length;
  const sections = body.split('\n').filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const cites = [...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]);

  const tests = parseTable(body);
  const badRows = tests.filter((r) => r.cells !== 4).map((r) => r.test);
  const siteCount = tests.reduce((m, r) => {
    for (const s of r.site.split('、')) m[s] = (m[s] || 0) + 1;
    return m;
  }, {});

  // 影像次序：正文用「CT 排在…MRI 排在…超声排在…」逐一交代
  const chain = [
    { key: 'X 线', at: body.indexOf('X 线是底线') },
    { key: 'CT', at: body.indexOf('CT 排在') },
    { key: 'MRI', at: body.indexOf('MRI 排在') },
    { key: '超声', at: body.indexOf('超声排在') },
  ];
  const chainOrdered = chain.every((c, i) => c.at >= 0 && (i === 0 || c.at > chain[i - 1].at));

  const sameThree = SAME_THREE.filter((w) => body.includes(w));
  const twice = body.includes('复位前一次') && body.includes('复位后一次');
  const falsPositive = body.includes('验前概率');

  return { hanzi, sections, cites, citeCount: cites.length, tests, badRows, siteCount, chain, chainOrdered, sameThree, twice, falsPositive };
}

function main() {
  const a = analyze(read());
  console.log(`中医骨伤科学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 引书 ${a.citeCount} 处`);
  console.log('');
  console.log(`特殊检查表：${a.tests.length} 项（每项四栏：动作 / 部位 / 阳性提示 / 局限）`);
  for (const r of a.tests) console.log(`  ${r.test.padEnd(16, '　')} ${r.site}`);
  console.log(`  → 字段不全的行：${a.badRows.length ? a.badRows.join('、') : '无'}`);
  console.log(`  → 覆盖部位：${Object.keys(a.siteCount).join('、')}`);
  console.log('');
  console.log(`量诊三个「同」：${a.sameThree.join('、') || '—'}（${a.sameThree.length}/3）`);
  console.log(`神经血管两次检查：${a.twice ? '复位前一次、复位后一次，均已写入正文' : '正文未写全两次'}`);
  console.log(`特殊检查的定位：${a.falsPositive ? '阳性只提高验前概率，阴性不能排除诊断' : '正文未说明概率定位'}`);
  console.log('');
  console.log('影像次序（出现先后）：');
  for (const c of a.chain) console.log(`  ${c.key.padEnd(5, '　')} 第 ${String(c.at + 1).padStart(5)} 字`);
  console.log(`  → ${a.chainOrdered ? '与正文叙述一致：X 线 → CT → MRI → 超声' : '与正文叙述不一致'}`);
  console.log('');
  console.log('※ 检查是问题带出来的，不是设备清单带出来的。');
  console.log('※ 本章讨论诊查思路，不构成诊疗意见；实际判读以影像科报告与接诊机构规范为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, SAME_THREE, IMAGING, read, parseTable, analyze };
