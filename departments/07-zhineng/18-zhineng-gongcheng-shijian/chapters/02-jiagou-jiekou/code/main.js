#!/usr/bin/env node
/**
 * 智能工程实践 · 第 2 章 接口定不下来，架构就只是画在纸上的分工
 * 课程: departments/07-zhineng/18-zhineng-gongcheng-shijian/chapters/02-jiagou-jiekou/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读并复算三笔账：
 *   ① 联调延期：5 个系统、37 个交换字段、计划 3 周实际 9 周、每轮澄清 3–5 天；
 *   ② 契约成本：6 个字段 × 7 列 = 42 个格子，37 个字段就是 259 个待定决策；
 *   ③ 失败参数：三次重试共 4 次请求，退避 1/2/4 秒合计 7 秒，版本并存至少 90 天。
 * 数字全部摘自正文，改正文后重跑即可复现。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');
const num = (s) => Number(String(s).replace(/,/g, ''));

/** 取一张 markdown 表：headerCell 是表头第 col 格的原文 */
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

/** 立项问题段：系统数、字段数、计划与实际周数、每轮澄清天数 */
function parseProblem(text) {
  const sys = text.match(/涉及\s*(\d+)\s*个系统、(\d+)\s*个交换字段/);
  const weeks = text.match(/计划里联调\s*(\d+)\s*周，实际做了\s*(\d+)\s*周/);
  const round = text.match(/一轮\s*(\d+)\s*到\s*(\d+)\s*天/);
  if (!sys || !weeks || !round) throw new Error('正文里没找到立项问题段的数字');
  return {
    systems: Number(sys[1]),
    fields: Number(sys[2]),
    planWeeks: Number(weeks[1]),
    actualWeeks: Number(weeks[2]),
    roundMin: Number(round[1]),
    roundMax: Number(round[2]),
  };
}

/** 失败处理参数表：一行一个参数的推荐起点 */
function parseFailureTable(text) {
  return tableRows(text, '参数').map((r) => ({ param: r[0], start: r[1], basis: r[2] }));
}

function parseNumbers(text) {
  const adrCap = text.match(/通常不超过\s*(\d+)\s*条；超过\s*(\d+)\s*条/);
  const reconcile = text.match(/差异超过\s*([\d.]+)%\s*就告警/);
  const version = text.match(/通常不少于\s*(\d+)\s*天，到期前\s*(\d+)\s*天与\s*(\d+)\s*天/);
  if (!adrCap || !reconcile || !version) throw new Error('正文里没找到 ADR / 对账 / 版本维护的数字');
  return {
    adrCap: Number(adrCap[1]),
    adrWarn: Number(adrCap[2]),
    reconcilePct: Number(reconcile[1]),
    versionDays: Number(version[1]),
    remindEarly: Number(version[2]),
    remindLate: Number(version[3]),
  };
}

/** 联调进门清单：编号行的数量与首条内容 */
function parseChecklist(text) {
  const from = text.indexOf('进门先对一遍');
  const to = text.indexOf('第 7 条最值得坚持');
  if (from < 0 || to < 0) throw new Error('正文里没找到联调清单段');
  return text
    .slice(from, to)
    .split(/\r?\n/)
    .filter((l) => /^\d+\.\s+\S/.test(l.trim()))
    .map((l) => l.trim().replace(/^\d+\.\s+/, ''));
}

/** 契约五项必须写进的内容 */
function parseContractRules(text) {
  const from = text.indexOf('另外五项必须写进契约');
  const to = text.indexOf('契约的落地形式');
  if (from < 0 || to < 0) throw new Error('正文里没找到契约五项段');
  return text
    .slice(from, to)
    .split(/\r?\n/)
    .filter((l) => /^\d+\.\s+\*\*/.test(l.trim()))
    .map((l) => l.trim().replace(/^\d+\.\s+/, ''));
}

/** 接口验收八项：冒号后按分号切开 */
function parseAcceptance(text) {
  const m = text.match(/接口验收按八项判定，全部通过才签字：([^。]+)。/);
  if (!m) throw new Error('正文里没找到接口验收八项');
  return m[1].split('；').map((s) => s.trim()).filter(Boolean);
}

function analyze(doc) {
  const p = parseProblem(doc);
  const params = parseFailureTable(doc);
  const n = parseNumbers(doc);
  const checklist = parseChecklist(doc);
  const rules = parseContractRules(doc);
  const acceptance = parseAcceptance(doc);
  const adr = tableRows(doc, '字段');
  const contract = tableRows(doc, '类型', 1);
  const modes = tableRows(doc, '模式');

  const slipWeeks = p.actualWeeks - p.planWeeks;
  const workdays = slipWeeks * 5;
  const backoff = params
    .find((x) => x.param === '退避')
    .start.match(/\d+/g)
    .map(Number);
  const retries = num(params.find((x) => x.param === '重试次数').start.match(/\d+/)[0]);

  return {
    ...p,
    slipWeeks,
    slipMultiple: p.actualWeeks / p.planWeeks,
    workdays,
    roundsMin: Math.ceil(workdays / p.roundMax),
    roundsMax: Math.round(workdays / p.roundMin),
    adrFields: adr.length,
    contractFields: contract.length,
    contractCols: contract[0].length,
    contractCells: contract.length * contract[0].length,
    fieldDecisions: p.fields * contract[0].length,
    modeRows: modes.length,
    params,
    rules,
    checklist,
    acceptance,
    ...n,
    backoff,
    backoffTotal: backoff.reduce((a, b) => a + b, 0),
    attempts: retries + 1,
    lastRemindDay: n.versionDays - n.remindLate,
  };
}

function main() {
  const a = analyze(readDoc());

  console.log('═══ 接口定不下来，架构就只是画在纸上的分工 ═══');
  console.log('');
  console.log('一、联调延期是语义成本，不是技术成本');
  console.log(`  ${a.systems} 个系统、${a.fields} 个交换字段；计划 ${a.planWeeks} 周，实际 ${a.actualWeeks} 周 → ${a.slipMultiple.toFixed(0)} 倍`);
  console.log(`  超期 ${a.slipWeeks} 周 = ${a.workdays} 个工作日；按每轮 ${a.roundMin}–${a.roundMax} 天算，相当于 ${a.roundsMin}–${a.roundsMax} 轮澄清`);
  console.log(`  → 每一轮都要开会、改代码、重跑数据，工期不是被技术难度吃掉，是被语义未定吃掉。`);
  console.log('');

  console.log('二、契约的格子数就是决策数');
  console.log(`  契约表 ${a.contractFields} 个字段 × ${a.contractCols} 列 = ${a.contractCells} 个格子；本章示例只覆盖 6 个字段`);
  console.log(`  37 个字段按同样粒度 = ${a.fieldDecisions} 个待定决策，其中「缺失语义」一列最容易被留空`);
  console.log(`  ADR ${a.adrFields} 个字段，全周期通常不超过 ${a.adrCap} 条，超过 ${a.adrWarn} 条说明在拿文档替代决策`);
  console.log('');

  console.log('三、失败参数（表内现读，不凭感觉给）');
  for (const x of a.params) console.log(`  ${x.param.padEnd(5, ' ')} 起点 ${String(x.start).padEnd(18, ' ')} · ${x.basis}`);
  console.log(`  重试 ${a.attempts - 1} 次 ⇒ 最多 ${a.attempts} 次请求；退避 ${a.backoff.join(' + ')} = ${a.backoffTotal} 秒（外加抖动）`);
  console.log(`  第 ${a.attempts} 次仍失败，多半不是瞬时故障：停下来查，而不是继续放大流量。`);
  console.log(`  异步链路每天对账，差异超过 ${a.reconcilePct}% 告警；没有对账的最终一致，实际上是不一致。`);
  console.log('');

  console.log('四、兼容是设计出来的');
  console.log(`  旧版本维护不少于 ${a.versionDays} 天；到期前 ${a.remindEarly} 天与 ${a.remindLate} 天各提醒一次，最后一次在第 ${a.lastRemindDay} 天`);
  console.log(`  联调进门清单 ${a.checklist.length} 条，接口验收 ${a.acceptance.length} 项，缺一项都不签字`);
  console.log(`  契约必含 ${a.rules.length} 项：幂等键、错误码分段、分页排序、超时重试、版本标识`);
  console.log(`  集成模式 ${a.modeRows} 种（同步 / 异步 / 批量），选错会在半年后以系统卡死的形式暴露`);
  console.log('');
  console.log('※ 数字均从 docs/zh.md 现读现算；延迟、重试与熔断参数为工程起点值，须按实际链路重新标定。');
  console.log('※ 输出仅用于教学演示，不构成对任何系统性能的承诺。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  tableRows,
  parseProblem,
  parseFailureTable,
  parseNumbers,
  parseChecklist,
  parseContractRules,
  parseAcceptance,
  analyze,
  main,
};
