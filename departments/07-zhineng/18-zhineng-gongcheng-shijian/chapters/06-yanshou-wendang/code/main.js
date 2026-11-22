#!/usr/bin/env node
/**
 * 智能工程实践 · 第 6 章 验收的标准不是文档齐了，是别人能接手
 * 课程: departments/07-zhineng/18-zhineng-gongcheng-shijian/chapters/06-yanshou-wendang/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读并复算四笔账：
 *   ① 40 分钟过 96 项 = 每项多少秒；5 项事后无法验证占多少；
 *   ② 214 页里 130 页截图的真实占比，与六份文档篇幅上限的差；
 *   ③ 故障处置半页在全文里占多少；
 *   ④ 压测、回滚、知识转移与保修条款的可复核参数。
 * 页数、比例与时限均为正文建议值与演算设定，不具法律效力。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');
const num = (s) => Number(String(s).replace(/,/g, ''));
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 两: 2 };

function tableRows(text, headerCell, col = 0) {
  const lines = text.split('\n');
  const head = lines.findIndex((l) => {
    const cells = l.split('|').slice(1, -1).map((c) => c.trim());
    return l.trim().startsWith('|') && cells[col] === headerCell;
  });
  if (head < 0) throw new Error('正文里没找到表头：' + headerCell);
  const rows = [];
  for (let i = head + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) break;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.every((c) => c === '' || /^:?-{2,}:?$/.test(c))) continue;
    rows.push(cells);
  }
  return rows;
}

/** 立项问题段：96 项、40 分钟、六周、214 页、130 页截图、5 项无法验证 */
function parseIncident(text) {
  const items = text.match(/(\d+)\s*项功能逐条打勾/);
  const minutes = text.match(/验收会开了\s*(\d+)\s*分钟/);
  const weeks = text.match(/([一二三四五六七八九十两])周后，原团队两名核心成员调岗/);
  const ask = text.match(/同一个问题\s*([一二三四五六七八九十])\s*次/);
  const pages = text.match(/交付文档\s*(\d+)\s*页，其中\s*(\d+)%\s*是界面截图/);
  const shot = text.match(/(\d+)\s*页里有\s*(\d+)\s*页截图/);
  const unverifiable = text.match(/有\s*(\d+)\s*项事后无法验证/);
  if (!items || !minutes || !weeks || !ask || !pages || !shot || !unverifiable) {
    throw new Error('正文里没找到交付问题段的数字');
  }
  return {
    items: num(items[1]),
    minutes: num(minutes[1]),
    weeksLater: CN[weeks[1]],
    sameQuestionTimes: CN[ask[1]],
    pages: num(pages[1]),
    screenshotPct: Number(pages[2]) / 100,
    screenshotPages: num(shot[2]),
    unverifiable: num(unverifiable[1]),
  };
}

/** 压测报告的五个可复核参数 */
function parseLoadTest(text) {
  const m = text.match(/并发\s*(\d+)、持续\s*(\d+)\s*分钟、数据集\s*([\d.]+)\s*万条、P95 为\s*(\d+)ms、错误率\s*([\d.]+)%/);
  if (!m) throw new Error('正文里没找到压测参数');
  return {
    concurrency: Number(m[1]),
    durationMin: Number(m[2]),
    datasetWan: Number(m[3]),
    p95ms: Number(m[4]),
    errorPct: Number(m[5]),
  };
}

/** 文档篇幅上限：六份里接口文档由 schema 生成，不计页数 */
function parseDocCaps(text) {
  const rows = tableRows(text, '文档');
  return rows.map((r) => ({
    name: r[0],
    reader: r[1],
    cap: (r[2].match(/\d+/) || [])[0],
    must: r[3],
  }));
}

function parseTerms(text) {
  const handover = text.match(/知识转移\s*\|\s*不少于\s*(\d+)\s*次、每次不少于\s*(\d+)\s*小时/);
  const exit = text.match(/独立运维满\s*(\d+)\s*天/);
  const rollback = text.match(/总耗时超过\s*(\d+)\s*分钟的，说明回滚方案需要简化/);
  const shadow = text.match(/影子值班(两)周/);
  if (!handover || !exit || !rollback || !shadow) throw new Error('正文里没找到交接演练或保修条款的数字');
  return {
    transferTimes: Number(handover[1]),
    transferHours: Number(handover[2]),
    exitDays: Number(exit[1]),
    rollbackCapMin: Number(rollback[1]),
    shadowWeeks: CN[shadow[1]],
  };
}

function analyze(doc) {
  const inc = parseIncident(doc);
  const load = parseLoadTest(doc);
  const caps = parseDocCaps(doc);
  const terms = parseTerms(doc);
  const evidence = tableRows(doc, '类别');
  const caseFields = tableRows(doc, '字段');
  const warranty = tableRows(doc, '条款');

  const halfPage = doc.match(/「故障处置」只有半页/);
  const capSum = caps.reduce((a, c) => a + (c.cap ? Number(c.cap) : 0), 0);
  return {
    ...inc,
    ...load,
    ...terms,
    evidence,
    caseFields,
    warranty,
    caps,
    capSum,
    secondsPerItem: (inc.minutes * 60) / inc.items,
    unverifiableShare: inc.unverifiable / inc.items,
    shotShare: inc.screenshotPages / inc.pages,
    nonShotPages: inc.pages - inc.screenshotPages,
    halfPageShare: (halfPage ? 0.5 : 0) / inc.pages,
    capRatio: inc.pages / capSum,
    transferTotalHours: terms.transferTimes * terms.transferHours,
    defectLevels: 4,
  };
}

function main() {
  const a = analyze(readDoc());

  console.log('═══ 验收的标准不是文档齐了，是别人能接手 ═══');
  console.log('');
  console.log('一、40 分钟过 96 项，快的是签字不是验收');
  console.log(`  ${a.items} 项 / ${a.minutes} 分钟 = 每项 ${a.secondsPerItem.toFixed(1)} 秒，这节奏判的是「存在」，不是「可用」`);
  console.log(`  ${a.unverifiable} 项事后无法验证 = ${(a.unverifiableShare * 100).toFixed(1)}%；没有证据、没有留存、当事人在休假`);
  console.log(`  ${a.weeksLater} 周后两名核心成员调岗，接手方在三个月内问了同一个问题 ${a.sameQuestionTimes} 次。`);
  console.log(`  → 验收不是一场会，是一组能被第三人复核的证据。`);
  console.log('');

  console.log('二、214 页文档的结构问题');
  console.log(`  ${a.pages} 页里 ${a.screenshotPages} 页截图，真实占比 ${(a.shotShare * 100).toFixed(1)}%（正文取整为 ${(a.screenshotPct * 100).toFixed(0)}%）`);
  console.log(`  六份文档篇幅上限合计 ${a.capSum} 页（接口文档由 schema 生成，不计），实际是上限的 ${a.capRatio.toFixed(1)} 倍`);
  console.log(`  「故障处置」只有半页 = 全文 ${(a.halfPageShare * 100).toFixed(2)}%，而它是夜里三点唯一要用的部分。`);
  for (const c of a.caps) console.log(`  ${c.name.padEnd(5, ' ')} 读者 ${c.reader.padEnd(6, ' ')} ${String(c.cap || 'schema').padStart(6, ' ')}`);
  console.log('');

  console.log('三、可复核的证据长什么样');
  console.log(`  四类证据：${a.evidence.map((e) => e[0]).join(' / ')}（功能只是其中最弱的一类）`);
  console.log(`  压测：并发 ${a.concurrency}、持续 ${a.durationMin} 分钟、数据集 ${a.datasetWan} 万条、P95 ${a.p95ms}ms、错误率 ${a.errorPct}%`);
  console.log(`  回滚：备用环境真跑一遍，总耗时超过 ${a.rollbackCapMin} 分钟即需简化方案；验收用例 ${a.caseFields.length} 个字段缺一不可复核`);
  console.log('');

  console.log('四、移交后的 90 天');
  console.log(`  影子值班 ${a.shadowWeeks} 周 + 三个问题测试 + 独立完成一次发布；知识转移 ${a.transferTimes} 次 × ${a.transferHours} 小时 = ${a.transferTotalHours} 小时`);
  console.log(`  保修覆盖缺陷不覆盖新需求；缺陷 ${a.defectLevels} 级；接手方独立运维满 ${a.exitDays} 天且无阻断缺陷，保修可提前结束`);
  console.log(`  条款 ${a.warranty.length} 项，「响应」与「修复」分开写：4 小时响应是有人看，24 小时修复是代码改完上线。`);
  console.log('');
  console.log('※ 数字均从 docs/zh.md 现读现算；页数上限、抽检比例与保修时限为建议值，实际条款依合同与机构制度确定。');
  console.log('※ 输出仅用于教学演示，不构成合同建议或法律意见。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  tableRows,
  parseIncident,
  parseLoadTest,
  parseDocCaps,
  parseTerms,
  analyze,
  main,
};
