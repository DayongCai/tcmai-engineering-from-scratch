#!/usr/bin/env node
/**
 * 智能工程实践 · 第 5 章 复盘不是找责任人，是把下一次的失败提前写出来
 * 课程: departments/07-zhineng/18-zhineng-gongcheng-shijian/chapters/05-yunwei-fupan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读并复算四笔账：
 *   ① 37 起事件的五个根因计数，前 24 起是否正好是三种根因之和；
 *   ② 4 小时 12 分的 MTTR 里，定位占多少；
 *   ③ 12 次复盘会 43 条改进项只完成 5 条，完成率是多少；
 *   ④ 1,400 条告警去掉 1,180 条无人处理后，剩下的是否落在健康区间。
 * 事件数、告警量与 MTTR 均为正文演算设定，不对应真实机构数据。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');
const num = (s) => Number(String(s).replace(/,/g, ''));

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

/** 立项问题段：事件总数、五个根因、前 24 起、MTTR、复盘与告警 */
function parseIncident(text) {
  const total = text.match(/记录在案的事件\s*(\d+)\s*起/);
  const roots = text.match(
    /证书过期\s*(\d+)\s*起、磁盘写满\s*(\d+)\s*起、上游接口变更未通知\s*(\d+)\s*起、配置误改\s*(\d+)\s*起、模型输入异常\s*(\d+)\s*起/
  );
  const top = text.match(/前\s*(\d+)\s*起占了三分之二/);
  const mttr = text.match(/平均恢复时间\s*(\d+)\s*小时\s*(\d+)\s*分/);
  const locate = text.match(/其中约\s*(\d+)\s*小时花在/);
  const reviews = text.match(/开了\s*(\d+)\s*次复盘会/);
  const items = text.match(/(\d+)\s*条改进项，完成并验证的只有\s*(\d+)\s*条/);
  const alerts = text.match(/每月产生约\s*([\d,]+)\s*条告警，其中\s*([\d,]+)\s*条没有人做任何处理/);
  if (!total || !roots || !top || !mttr || !locate || !reviews || !items || !alerts) {
    throw new Error('正文里没找到运维问题段的数字');
  }
  return {
    total: num(total[1]),
    roots: {
      证书过期: num(roots[1]),
      磁盘写满: num(roots[2]),
      上游变更: num(roots[3]),
      配置误改: num(roots[4]),
      模型输入异常: num(roots[5]),
    },
    topEvents: num(top[1]),
    mttrMin: num(mttr[1]) * 60 + num(mttr[2]),
    locateMin: num(locate[1]) * 60,
    reviews: num(reviews[1]),
    improvements: num(items[1]),
    improvementsDone: num(items[2]),
    alerts: num(alerts[1]),
    alertsUnhandled: num(alerts[2]),
  };
}

/** 告警健康区间与复发率区间 */
function parseBands(text) {
  const alert = text.match(/可执行告警在\s*(\d+)–(\d+)\s*条之间比较健康/);
  const recur = text.match(/健康值大致在\s*(\d+)%\s*以下；超过\s*(\d+)%/);
  const cert = text.match(/提前\s*(\d+)\s*天、(\d+)\s*天、(\d+)\s*天三次提醒/);
  const disk = text.match(/剩余不足\s*(\d+)\s*天告警/);
  if (!alert || !recur || !cert || !disk) throw new Error('正文里没找到告警阈值或复发率区间');
  return {
    alertBand: [Number(alert[1]), Number(alert[2])],
    recurBand: [Number(recur[1]), Number(recur[2])],
    certReminders: [Number(cert[1]), Number(cert[2]), Number(cert[3])],
    diskDays: Number(disk[1]),
  };
}

function analyze(doc) {
  const inc = parseIncident(doc);
  const bands = parseBands(doc);
  const layers = tableRows(doc, '层');
  const severity = tableRows(doc, '级别');
  const handover = tableRows(doc, '字段');
  const first30 = tableRows(doc, '时间');
  const review = tableRows(doc, '栏');

  const rootSum = Object.values(inc.roots).reduce((a, b) => a + b, 0);
  const top3 = inc.roots.证书过期 + inc.roots.上游变更 + inc.roots.磁盘写满;
  const actionable = inc.alerts - inc.alertsUnhandled;

  return {
    ...inc,
    rootSum,
    unaccounted: inc.total - rootSum,
    top3,
    top3Matches: top3 === inc.topEvents,
    top3Share: inc.topEvents / inc.total,
    locateShare: inc.locateMin / inc.mttrMin,
    recoverMin: inc.mttrMin - inc.locateMin,
    doneRate: inc.improvementsDone / inc.improvements,
    actionable,
    noiseShare: inc.alertsUnhandled / inc.alerts,
    alertsPerDay: inc.alerts / 30,
    actionableInBand: actionable >= bands.alertBand[0] && actionable <= bands.alertBand[1],
    ...bands,
    layers,
    severity,
    handover,
    first30,
    review,
  };
}

function main() {
  const a = analyze(readDoc());

  console.log('═══ 复盘不是找责任人，是把下一次的失败提前写出来 ═══');
  console.log('');
  console.log('一、37 起事件的根因分布（正文逐项现读）');
  for (const [k, v] of Object.entries(a.roots)) {
    console.log(`  ${k.padEnd(7, ' ')} ${String(v).padStart(2, ' ')} 起  ${'█'.repeat(v)}`);
  }
  console.log(`  五项合计 ${a.rootSum} 起，零散 ${a.unaccounted} 起；前三项 ${a.roots.证书过期} + ${a.roots.上游变更} + ${a.roots.磁盘写满} = ${a.top3}`);
  console.log(`  正文说前 ${a.topEvents} 起占三分之二：${a.top3Matches ? '与三项之和一致' : '与三项之和不一致'}，占 ${(a.top3Share * 100).toFixed(1)}%。`);
  console.log(`  → 三分之二的事故来自三种根因，说明该修的是三处可预防的机制，不是 37 个处置动作。`);
  console.log('');

  console.log('二、4 小时 12 分里，3 小时在定位');
  console.log(`  MTTR ${a.mttrMin} 分钟，其中定位 ${a.locateMin} 分钟 = ${(a.locateShare * 100).toFixed(1)}%，留给止损与恢复 ${a.recoverMin} 分钟`);
  console.log(`  → 缩短 MTTR 的杠杆在可观测性，不在修复速度；request_id 与三层监控都是压这一段的。`);
  console.log('');

  console.log('三、复盘产出：从经过到可验证的改动');
  console.log(`  ${a.reviews} 次复盘会、${a.improvements} 条改进项、完成并验证 ${a.improvementsDone} 条 = ${(a.doneRate * 100).toFixed(1)}%`);
  console.log(`  原因不是没人干活，是每条太大、没有单一负责人、也没有验证方式；一条改进项只写一个动作。`);
  console.log(`  复盘模板 ${a.review.length} 栏、交接单 ${a.handover.length} 字段、前 30 分钟 ${a.first30.length} 个动作、监控 ${a.layers.length} 层、告警 ${a.severity.length} 级`);
  console.log(`  30/60/90 回看；复发率健康值 ${a.recurBand[0]}% 以下，超过 ${a.recurBand[1]}% 说明复盘流程本身要复盘`);
  console.log('');

  console.log('四、1,400 条告警里真正能用的有多少');
  console.log(`  每月 ${a.alerts.toLocaleString('en-US')} 条（约 ${a.alertsPerDay.toFixed(0)} 条/日），无人处理 ${a.alertsUnhandled.toLocaleString('en-US')} 条 = ${(a.noiseShare * 100).toFixed(1)}%`);
  console.log(`  剩下 ${a.actionable} 条可执行告警，健康区间 ${a.alertBand[0]}–${a.alertBand[1]} 条 ⇒ ${a.actionableInBand ? '落在区间内' : '仍偏高，需继续治理'}`);
  console.log(`  证书到期按 ${a.certReminders.join(' / ')} 天三次提醒；磁盘剩余不足 ${a.diskDays} 天告警。`);
  console.log(`  → 告警的价值不在数量，在每一条都能让人做出动作。`);
  console.log('');
  console.log('※ 数字均从 docs/zh.md 现读现算；事件数、告警量与 MTTR 为演算设定，不对应任何真实机构的运行数据。');
  console.log('※ 输出仅用于教学演示，不构成可用性承诺或事故处置的法律意见。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  tableRows,
  parseIncident,
  parseBands,
  analyze,
  main,
};
