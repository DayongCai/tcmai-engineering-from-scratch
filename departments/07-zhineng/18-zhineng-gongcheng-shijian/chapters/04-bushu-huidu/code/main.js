#!/usr/bin/env node
/**
 * 智能工程实践 · 第 4 章 上线不是发布，是把决策权交出去的那一刻
 * 课程: departments/07-zhineng/18-zhineng-gongcheng-shijian/chapters/04-bushu-huidu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读并复算四笔账：
 *   ① 灰度三天的 87 次提示：触发率、被关闭的次数、静默返回的占比；
 *   ② 四个阶段的观察期与最小样本，哪个条件真正在卡进度；
 *   ③ 五种失败模式与四个监控数的条数、阈值；
 *   ④ 采纳／推翻／忽略健康区间的中点是否闭合到 100%。
 * 流量比例、观察期与阈值均为正文演算设定，须按本院门诊量重新标定。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');
const num = (s) => Number(String(s).replace(/,/g, ''));
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

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

/** 灰度头三天的现场数字 */
function parseIncident(text) {
  const pilot = text.match(/灰度\s*(\d+)%\s*流量，三天跑了\s*([\d,]+)\s*例，触发提示\s*(\d+)\s*次/);
  const close = text.match(/被点了\s*(\d+)%/);
  const silent = text.match(/三天里有\s*(\d+)\s*例属于这种情况/);
  const silentHours = text.match(/([一二三四五六七八九十])个小时里所有请求都返回空/);
  const daily = text.match(/以门诊量每日\s*([\d,]+)\s*人次估算/);
  if (!pilot || !close || !silent || !silentHours || !daily) throw new Error('正文里没找到灰度头三天的数字');
  return {
    pilotShare: Number(pilot[1]),
    cases: num(pilot[2]),
    alerts: num(pilot[3]),
    closeRate: Number(close[1]) / 100,
    silentCases: num(silent[1]),
    silentHours: CN[silentHours[1]],
    dailyVisits: num(daily[1]),
  };
}

/** 灰度四阶段：流量、最短观察期、最小样本 */
function parsePhases(text) {
  return tableRows(text, '阶段').map((r) => ({
    name: r[0],
    share: r[1],
    days: (r[2].match(/\d+/g) || []).map(Number)[0],
    samples: num((r[3].match(/[\d,]+/g) || ['0'])[0]),
    exit: r[4],
  }));
}

/** 人机接口五种失败模式 */
function parseFailures(text) {
  return tableRows(text, '失败模式').map((r) => ({ mode: r[0], signal: r[1], detect: r[2], action: r[3] }));
}

/** 四个监控数：指标、阈值、响应时限 */
function parseMonitor(text) {
  return tableRows(text, '指标').map((r) => ({ metric: r[0], threshold: r[2], sla: r[3] }));
}

/** 事件分级 */
function parseSeverity(text) {
  return tableRows(text, '级别').map((r) => ({ level: r[0], rule: r[1], first: r[2], stop: r[3] }));
}

function parseHealthBand(text) {
  const m = text.match(/健康区间大致是采纳\s*(\d+)%–(\d+)%、推翻\s*(\d+)%–(\d+)%、忽略\s*(\d+)%–(\d+)%/);
  if (!m) throw new Error('正文里没找到采纳／推翻／忽略的健康区间');
  return {
    adopt: [Number(m[1]), Number(m[2])],
    override: [Number(m[3]), Number(m[4])],
    ignore: [Number(m[5]), Number(m[6])],
  };
}

function analyze(doc) {
  const inc = parseIncident(doc);
  const phases = parsePhases(doc);
  const failures = parseFailures(doc);
  const monitor = parseMonitor(doc);
  const severity = parseSeverity(doc);
  const band = parseHealthBand(doc);

  const checklistCount = (doc.match(/\*\*第[一二三四五]张：/g) || []).length;
  const upgrade = doc.match(/(\d+)\s*分钟未定位，自动升一级；(\d+)\s*分钟未止损/);
  if (!upgrade) throw new Error('正文里没找到升级路径的时间');

  const mid = (pair) => (pair[0] + pair[1]) / 2;
  return {
    ...inc,
    triggerRate: inc.alerts / inc.cases,
    closedAlerts: Math.round(inc.alerts * inc.closeRate),
    silentShareOfAlerts: inc.silentCases / inc.alerts,
    silentEstimate: Math.round((inc.dailyVisits * inc.silentHours) / 24),
    phases,
    phaseDays: phases.reduce((a, p) => a + p.days, 0),
    phaseSamples: phases.reduce((a, p) => a + p.samples, 0),
    daysForSamples: phases.reduce((a, p) => a + p.samples, 0) / inc.dailyVisits,
    shadowDaysNeeded: phases[0].samples / inc.dailyVisits,
    failures,
    monitor,
    severity,
    checklistCount,
    upgradeFirst: Number(upgrade[1]),
    upgradeSecond: Number(upgrade[2]),
    band,
    bandMidSum: mid(band.adopt) + mid(band.override) + mid(band.ignore),
  };
}

function main() {
  const a = analyze(readDoc());

  console.log('═══ 上线不是发布，是把决策权交出去的那一刻 ═══');
  console.log('');
  console.log('一、灰度头三天：没报错不等于没问题');
  console.log(`  ${a.pilotShare}% 流量、${a.cases.toLocaleString('en-US')} 例、提示 ${a.alerts} 次 → 触发率 ${(a.triggerRate * 100).toFixed(1)}%`);
  console.log(`  关闭按钮被点 ${(a.closeRate * 100).toFixed(0)}% ⇒ 约 ${a.closedAlerts} 次提示当场被关掉，人机接口先失败`);
  console.log(`  静默返回 ${a.silentCases} 例，占提示 ${(a.silentShareOfAlerts * 100).toFixed(1)}%；按日均 ${a.dailyVisits} 人次摊到 ${a.silentHours} 小时，约 ${a.silentEstimate} 例受影响`);
  console.log(`  → 空返回必须显式提示「服务不可用」，否则它和阴性结论在界面上长得一样。`);
  console.log('');

  console.log('二、四阶段：观察期与样本量要同时满足');
  for (const p of a.phases) {
    console.log(`  ${p.name.padEnd(4, ' ')} ${String(p.share).padEnd(22, ' ')} ${String(p.days).padStart(2, ' ')} 天 · ${String(p.samples).padStart(5, ' ')} 例`);
  }
  console.log(`  观察期合计 ${a.phaseDays} 天；样本合计 ${a.phaseSamples.toLocaleString('en-US')} 例，按 ${a.dailyVisits} 人次/日只需 ${a.daysForSamples.toFixed(1)} 天`);
  console.log(`  影子阶段 ${a.phases[0].samples.toLocaleString('en-US')} 例需 ${a.shadowDaysNeeded.toFixed(1)} 天，但最短观察期是 ${a.phases[0].days} 天 ⇒ 卡进度的是观察期，不是样本量。`);
  console.log('');

  console.log('三、人机接口五种失败模式（指标合格也会栽在这里）');
  for (const f of a.failures) console.log(`  ${f.mode.padEnd(5, ' ')} 检测：${f.detect}`);
  const bandText = `采纳 ${a.band.adopt[0]}–${a.band.adopt[1]}% / 推翻 ${a.band.override[0]}–${a.band.override[1]}% / 忽略 ${a.band.ignore[0]}–${a.band.ignore[1]}%`;
  console.log(`  行为指标健康区间：${bandText}；三者中点相加 = ${a.bandMidSum.toFixed(0)}（闭合到 100）`);
  console.log('');

  console.log('四、四个数、五张清单、四级事件');
  for (const m of a.monitor) console.log(`  ${m.metric.padEnd(6, ' ')} ${String(m.threshold).padEnd(22, ' ')} · ${m.sla}`);
  console.log(`  上线前清单 ${a.checklistCount} 张，缺签不上线；最常被跳过的是第三张「人」。`);
  console.log(`  事件 ${a.severity.length} 级：P1 首响 ${a.severity[0].first}、止损 ${a.severity[0].stop}`);
  console.log(`  升级按时间：${a.upgradeFirst} 分钟未定位升一级，${a.upgradeSecond} 分钟未止损再升一级。`);
  console.log('');
  console.log('※ 数字均从 docs/zh.md 现读现算；流量比例、观察期与阈值是演算设定与经验区间，不可直接作为验收承诺。');
  console.log('※ 输出仅用于教学演示，不构成安全性承诺或临床指导意见。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  tableRows,
  parseIncident,
  parsePhases,
  parseFailures,
  parseMonitor,
  parseSeverity,
  parseHealthBand,
  analyze,
  main,
};
