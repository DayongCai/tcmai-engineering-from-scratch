#!/usr/bin/env node
/**
 * 卫生信息管理 · 第 7 章 项目管理与决策支持：CDS 接在哪一步，决定它是提醒还是噪音
 * 课程: departments/06-guanli/10-yixue-xinxi-guanli/chapters/07-i7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读：规则总数、忽略率、三类规则的条数、五个接入点、五条合同条款、四步迁移、三条工程原则。
 * 现算：三类可归因规则是否覆盖全部规则（不覆盖就是复盘本身有缺口）、可点选替代的规则占比、被忽略的规则条数。
 * 并把正文里的规则 JSON 读出来校验：有没有 evidence、有没有 owner、动作里有几个可执行项。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '项目管理与决策支持：CDS 接在哪一步，决定它是提醒还是噪音';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function parseTables(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*\|(.+)\|\s*$/);
    if (!m) { cur = null; continue; }
    const cells = m[1].split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    if (!cur) { cur = { header: cells, rows: [] }; out.push(cur); } else { cur.rows.push(cells); }
  }
  return out;
}

const one = (re, body, name) => {
  const m = body.match(re);
  if (!m) throw new Error('正文里没找到' + name);
  return m;
};

function params(body) {
  return {
    rules: Number(one(/累计 (\d+) 条规则/, body, '规则总数')[1]),
    ignoredPct: Number(one(/「忽略」率 (\d+)%/, body, '忽略率')[1]),
    warnOnly: Number(one(/(\d+) 条只在开立时提示风险/, body, '只提示条数')[1]),
    badThreshold: Number(one(/(\d+) 条与药品说明书重复但剂量阈值设错/, body, '阈值设错条数')[1]),
    withAlt: Number(one(/(\d+) 条在开立前就给出了可点选的替代医嘱/, body, '给出替代条数')[1]),
  };
}

/** 正文里的 CDS 规则 JSON：直接解析，不抄字段。 */
function ruleSpec(body) {
  const m = body.match(/```json\n([\s\S]*?)```/);
  if (!m) throw new Error('正文里没找到 CDS 规则 JSON');
  const rule = JSON.parse(m[1]);
  if (!rule.id || !rule.trigger || !rule.severity) throw new Error('规则 JSON 缺关键字段');
  return rule;
}

/** 结构清点：五个接入点、五条合同条款、四步迁移、三条工程原则、三级严重度。 */
function structure(body, tables) {
  const ap = tables.find((t) => t.header[0] === '接入点');
  if (!ap) throw new Error('正文里没找到接入点表');
  const count = (re) => (body.match(re) || []).length;
  const contract = ['数据所有权与导出', '接口与文档', '验收标准', '源代码托管或退出机制', '运维响应'];
  const migration = ['盘点', '映射', '试迁', '对账'];
  const principles = ['能给默认值就不弹窗', '弹窗必须带可执行动作', '分级而不是全拦'];
  return {
    接入点: ap.rows.length,
    接入点名: ap.rows.map((r) => r[0]),
    合同条款: contract.filter((k) => body.includes(k)).length,
    迁移步骤: migration.filter((k) => body.includes(k + '（')).length,
    工程原则: principles.filter((k) => body.includes(k)).length,
    分级数: ['硬拦截', '软提示', '只进汇总'].filter((k) => body.includes(k)).length,
    需求对照行: count(/^\| 界面友好 \|/gm),
  };
}

/** 复算：复盘覆盖度、可替代规则占比、被忽略条数。 */
function compute(p) {
  const accounted = p.warnOnly + p.badThreshold + p.withAlt;
  return {
    accounted,
    unaccounted: p.rules - accounted,
    coverage: (accounted / p.rules) * 100,
    altShare: (p.withAlt / p.rules) * 100,
    ignoredCount: Math.round((p.rules * p.ignoredPct) / 100),
  };
}

function verify(c, p, s, rule, body) {
  if (c.unaccounted !== 3) throw new Error('复盘缺口应为 3 条，实际 ' + c.unaccounted);
  if (!(c.accounted < p.rules)) throw new Error('三类归因不应覆盖全部规则——否则复盘没有缺口');
  if (!(c.altShare < 10)) throw new Error('可点选替代的规则占比异常: ' + c.altShare);
  if (s.接入点 !== 5) throw new Error('接入点表行数异常: ' + s.接入点);
  if (s.合同条款 !== 5) throw new Error('五条合同条款不全: ' + s.合同条款);
  if (s.迁移步骤 !== 4) throw new Error('数据迁移四步不全: ' + s.迁移步骤);
  if (s.工程原则 !== 3) throw new Error('三条工程原则不全: ' + s.工程原则);
  if (!rule.evidence || !rule.owner) throw new Error('规则缺 evidence 或 owner');
  if (!Array.isArray(rule.actions) || rule.actions.length < 1) throw new Error('规则没有可执行动作');
  for (const k of ['47 条规则', '92%', '上线一周就会被要求关掉']) {
    if (!body.includes(k)) throw new Error('正文缺关键判据: ' + k);
  }
}

function main() {
  const body = read();
  const p = params(body);
  const s = structure(body, parseTables(body));
  const rule = ruleSpec(body);
  const c = compute(p);
  verify(c, p, s, rule, body);

  console.log(`卫生信息管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`规则 ${p.rules} 条，忽略率 ${p.ignoredPct}% → 约 ${c.ignoredCount} 条被忽略`);
  console.log(`复盘归因：只提示 ${p.warnOnly} + 阈值设错 ${p.badThreshold} + 给出替代 ${p.withAlt} = ${c.accounted} 条（${c.coverage.toFixed(0)}%）`);
  console.log(`  → 还有 ${c.unaccounted} 条没被解释：复盘的覆盖面本身有缺口，先补完再谈上线`);
  console.log(`  → 真正在开立前给替代的只有 ${p.withAlt} 条，占 ${c.altShare.toFixed(1)}%`);
  console.log('');
  console.log(`结构清点：接入点 ${s.接入点} 个（${s.接入点名.join('、')}）`);
  console.log(`  合同条款 ${s.合同条款} 条 · 迁移 ${s.迁移步骤} 步 · 工程原则 ${s.工程原则} 条 · 严重度分级 ${s.分级数} 级`);
  console.log('');
  console.log(`规则 JSON 读自正文：${rule.id} · ${rule.trigger} · ${rule.severity}`);
  console.log(`  动作 ${rule.actions.length} 项：${rule.actions.map((a) => a.type).join('、')}`);
  console.log(`  出处 ${rule.evidence.source}（${rule.evidence.version}）· 责任人 ${rule.owner}`);
  console.log('');
  console.log('※ 没有出处的规则无法被质疑，没有责任人的规则没人有权删它。');
  console.log('※ 本输出仅用于教学演示，不构成用药、诊疗或采购建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, params, ruleSpec, structure, compute, verify };
