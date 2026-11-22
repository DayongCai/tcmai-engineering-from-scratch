#!/usr/bin/env node
/**
 * 智能工程实践 · 第 1 章 合规不是在合同上签字，是在第一行代码之前画好边界
 * 课程: departments/07-zhineng/18-zhineng-gongcheng-shijian/chapters/01-xuqiu-hegui/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 全部数字从正文现读：47 条需求、12 条读门诊病历原文、11 个工作日、3 个字段只读、
 * 第 14 周推到第 26 周、原预算的四成；表行数（分级四类、申请表十四项、时限六环节、
 * 出口条件六条）也由表格现数。手打的数字会在正文改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');
const num = (s) => Number(String(s).replace(/,/g, ''));
const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

/** 取一张 markdown 表：headerCell 是表头第一格的原文 */
function tableRows(text, headerCell) {
  const lines = text.split(/\r?\n/);
  const head = lines.findIndex((l) => {
    const cells = l.split('|').slice(1, -1).map((c) => c.trim());
    return l.trim().startsWith('|') && cells[0] === headerCell;
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

/** 立项问题段：需求条数、触碰病历原文条数、审批天数、获批字段、周次与返工比例 */
function parseProblem(text) {
  const total = text.match(/需求清单写了\s*([\d,]+)\s*条/);
  const sensitive = text.match(/其中\s*([\d,]+)\s*条要读取门诊病历原文/);
  const flow = text.match(/按流程需要\s*([\d,]+)\s*个工作日、批下来只有\s*([\d,]+)\s*个字段/);
  const weeks = text.match(/上线从第\s*(\d+)\s*周推到第\s*(\d+)\s*周/);
  const rework = text.match(/约为原预算的(.)成/);
  if (!total || !sensitive || !flow || !weeks || !rework) throw new Error('正文里没找到立项问题段的数字');
  return {
    reqTotal: num(total[1]),
    sensitiveReqs: num(sensitive[1]),
    approvalDays: num(flow[1]),
    fieldsGranted: num(flow[2]),
    weekBefore: num(weeks[1]),
    weekAfter: num(weeks[2]),
    reworkPct: CN[rework[1]] * 10,
  };
}

/** 审批时限表：每个环节及其工作日数（伦理审查有两个档） */
function parseSla(text) {
  const rows = tableRows(text, '环节');
  return rows.map((r) => ({
    stage: r[0],
    owner: r[1],
    days: (r[2].match(/\d+/g) || []).map(Number),
  }));
}

const parseGrading = (text) => tableRows(text, '数据类别');
const parseApplyForm = (text) => tableRows(text, '序号');

/** 出口条件六条：数「出口条件六条」到「签署人三个」之间的编号行 */
function parseExitConditions(text) {
  const from = text.indexOf('出口条件六条');
  const to = text.indexOf('签署人三个');
  if (from < 0 || to < 0) throw new Error('正文里没找到出口条件段');
  return text
    .slice(from, to)
    .split(/\r?\n/)
    .filter((l) => /^\d+\.\s+\S/.test(l.trim()))
    .map((l) => l.trim().replace(/^\d+\.\s+/, ''));
}

function analyze(doc) {
  const p = parseProblem(doc);
  const sla = parseSla(doc);
  const grading = parseGrading(doc);
  const form = parseApplyForm(doc);
  const exits = parseExitConditions(doc);

  const priority = doc.match(/比例建议控制在\s*(\d+):(\d+):(\d+)/);
  const review = doc.match(/(\d+)\s*分钟的会议按下面的时间盒/);
  const fieldCount = tableRows(doc, '字段').length;
  const useMonths = doc.match(/默认不超过\s*(\d+)\s*个月/);

  const slipWeeks = p.weekAfter - p.weekBefore;
  const noEthics = sla.filter((s) => !s.stage.includes('伦理')).reduce((a, s) => a + s.days[0], 0);
  const ethicsRow = sla.find((s) => s.stage.includes('伦理'));
  const ethicsMeeting = ethicsRow ? ethicsRow.days[0] : 0;

  return {
    ...p,
    slipWeeks,
    slipShare: slipWeeks / p.weekBefore,
    sensitiveShare: p.sensitiveReqs / p.reqTotal,
    approvalWeeks: p.approvalDays / 5,
    reworkMultiple: slipWeeks / (p.approvalDays / 5),
    sla,
    noEthics,
    ethicsMeeting,
    withEthics: noEthics + ethicsMeeting,
    withEthicsWeeks: (noEthics + ethicsMeeting) / 5,
    gradingRows: grading.length,
    formRows: form.length,
    fieldCount,
    exits,
    priority: priority ? [Number(priority[1]), Number(priority[2]), Number(priority[3])] : [],
    reviewMinutes: review ? Number(review[1]) : 0,
    useMonths: useMonths ? Number(useMonths[1]) : 0,
  };
}

function main() {
  const a = analyze(readDoc());

  console.log('═══ 合规不是在合同上签字，是在第一行代码之前画好边界 ═══');
  console.log('');
  console.log('一、立项问题段（正文现读）');
  console.log(`  需求 ${a.reqTotal} 条，其中 ${a.sensitiveReqs} 条要读取门诊病历原文 → 占 ${(a.sensitiveShare * 100).toFixed(1)}%`);
  console.log(`  数据使用申请 ${a.approvalDays} 个工作日（${a.approvalWeeks.toFixed(1)} 周），批下来只有 ${a.fieldsGranted} 个字段的只读权限`);
  console.log(`  上线第 ${a.weekBefore} 周 → 第 ${a.weekAfter} 周，推迟 ${a.slipWeeks} 周，占原计划 ${(a.slipShare * 100).toFixed(0)}%`);
  console.log(`  多花人力约为原预算的 ${a.reworkPct}%；返工 ${a.slipWeeks} 周是审批 ${a.approvalWeeks.toFixed(1)} 周的 ${a.reworkMultiple.toFixed(1)} 倍`);
  console.log(`  → 边界不是第 6 周才出现的：${a.sensitiveReqs} 条需求立项时就在清单上。`);
  console.log('');

  console.log('二、审批链路（时限表逐环节相加）');
  for (const s of a.sla) {
    console.log(`  ${s.stage.padEnd(10, ' ')} ${String(s.days.join(' / ')).padStart(10, ' ')} 工作日  · ${s.owner}`);
  }
  console.log(`  不含伦理：${a.noEthics} 个工作日；含伦理会议审查：${a.withEthics} 个工作日 = ${a.withEthicsWeeks.toFixed(1)} 周`);
  console.log(`  ※ 正文按 ${a.approvalDays} 个工作日估算，逐环节相加为 ${a.noEthics}，差 1 日来自环节口径；排期取较大值。`);
  console.log('');

  console.log('三、表单与会议的结构（表格行数现数）');
  console.log(`  数据分级 ${a.gradingRows} 类；数据使用申请表 ${a.formRows} 项；需求条目 ${a.fieldCount} 个字段`);
  console.log(`  优先级四档 ${a.priority.join(':')} 加一份排除清单；评审会 ${a.reviewMinutes} 分钟；出口条件 ${a.exits.length} 条`);
  console.log(`  使用期限默认不超过 ${a.useMonths} 个月，期满处置须可验证`);
  console.log('');

  console.log('四、越到后面越贵的三个数');
  console.log(`  1. ${a.sensitiveReqs} 条敏感需求 × 三级数据 = 一次分级确认，换 ${a.slipWeeks} 周返工；`);
  console.log(`  2. ${a.approvalDays} 个工作日的审批是固定前置任务，第 6 周提出就必然压上线；`);
  console.log(`  3. 出口条件里「受理编号在案」把外部周期钉进计划，其余五条管的是写法与判据。`);
  console.log('');
  console.log('※ 数字均从 docs/zh.md 现读现算；时限为演算设定与常见实践区间，各机构以本单位制度为准。');
  console.log('※ 输出仅用于教学演示，不构成法律意见或合规结论。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  tableRows,
  parseProblem,
  parseSla,
  parseGrading,
  parseApplyForm,
  parseExitConditions,
  analyze,
  main,
};
