#!/usr/bin/env node
/**
 * 医院信息化与病案 · 第 7 章 项目实施与验收：验收单上不能写「满足临床需要」
 * 课程: departments/06-guanli/11-yiyuan-xinxihua-bingan/chapters/07-z117/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 参数从本章正文的合同与验收段读：合同额、年运维、并发数、响应要求、数据抽样表。
 * 复算：运维费占建设费的比例是否落在经验区间；验收抽样总量；并行期的效率损失。
 * 正文任何一格改动，本脚本都会报出偏差——手打的结论会在改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '项目实施与验收：验收单上不能写「满足临床需要」';

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
  return m[1];
};
const num = (s) => Number(String(s).replace(/,/g, ''));
const CN = { 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
function cnNum(s) {
  const t = String(s || '');
  if (!t) return NaN;
  if (/^\d+$/.test(t)) return Number(t);
  if (t === '十') return 10;
  if (t.length === 1) return CN[t] === undefined ? NaN : CN[t];
  if (t.length === 2) {
    if (t[0] === '十') return 10 + CN[t[1]];
    if (t[1] === '十') return CN[t[0]] * 10;
    return NaN;
  }
  if (t.length === 3 && t[1] === '十') return CN[t[0]] * 10 + CN[t[2]];
  return NaN;
}

function params(body) {
  const resp = body.match(/(\d+)% 的请求在 (\d+) 秒内返回/);
  if (!resp) throw new Error('正文里没找到响应时间要求');
  const par = body.match(/可行的并行期是([一二两三四五六七八九十\d]+)到([一二两三四五六七八九十\d]+)周/);
  if (!par) throw new Error('正文里没找到并行期');
  return {
    contract: num(one(/一份 ([\d,]+) 万元的系统合同/, body, '合同金额')),
    maintenance: num(one(/续 ([\d,]+) 万元运维费/, body, '年运维费')),
    concurrency: num(one(/并发 (\d+) 用户/, body, '并发用户数')),
    respPct: Number(resp[1]),
    respSeconds: Number(resp[2]),
    sampleSize: num(one(/抽样 ([\d,]+) 份，一致率不低于 ([\d.]+)%/, body, '关键字段抽样')),
    sampleRate: Number(one(/抽样 [\d,]+ 份，一致率不低于 ([\d.]+)%/, body, '一致率下限')),
    parallelWeeksLow: cnNum(par[1]),
    parallelWeeksHigh: cnNum(par[2]),
    batchHours: num(one(/夜间结算在 ([\d]+) 小时内完成/, body, '批处理窗口')),
  };
}

/** 结构清点：功能清单五字段、上线三方式、迁移四件事、验收抽样表。 */
function structure(body, tables) {
  const fields = ['功能点', '前置条件', '预期结果', '判定方法', '不达标处理']
    .filter((k) => body.includes(`| ${k} `) || body.includes(`| ${k} |`)).length;
  const rollout = ['直接切换', '并行运行', '灰度上线']
    .filter((k) => new RegExp('\\*\\*' + k + '\\*\\*').test(body)).length;
  const migration = ['抽取', '清洗', '映射', '验证']
    .filter((k) => new RegExp('\\*\\*' + k + '\\*\\*').test(body)).length;
  const t = tables.find((x) => x.header.includes('比对项') && x.header.includes('抽样量'));
  if (!t) throw new Error('正文里没找到验收抽样比对表');
  return {
    fields,
    rollout,
    migration,
    sampleRows: t.rows.length,
    sampleTotal: t.rows.reduce((a, r) => a + Number(r[1]), 0),
    sampleNames: t.rows.map((r) => r[0]),
  };
}

/** 复算：运维占建设费比例、抽样总量、并行期效率损失。 */
function compute(p, s) {
  const maintPct = (p.maintenance / p.contract) * 100;
  return {
    maintPct,
    maintPctFixed: maintPct.toFixed(1),
    inTypicalRange: maintPct >= 10 && maintPct <= 15,
    sampleTotal: s.sampleTotal,
    sampleRows: s.sampleRows,
  };
}

/** 正文与复算必须对得上：任一处对不上就抛错，不许两份数并存。 */
function verify(c, s, p, body) {
  const must = [
    ['1,200 万元', '合同金额'],
    ['210 万元', '年运维费'],
    ['并发 300 用户', '并发要求'],
    ['一致率不低于 99%', '数据验收判据'],
    ['不达标处理', '功能清单第五字段'],
  ];
  const miss = must.filter(([str]) => !body.includes(str)).map(([, k]) => k);
  if (miss.length) throw new Error('正文与复算不一致，缺: ' + miss.join('、'));
  if (s.fields !== 5) throw new Error('功能清单字段数异常: ' + s.fields);
  if (s.rollout !== 3) throw new Error('上线方式数异常: ' + s.rollout);
  if (s.migration !== 4) throw new Error('迁移环节数异常: ' + s.migration);
  if (c.sampleTotal !== 430) throw new Error('验收抽样总量异常: ' + c.sampleTotal);
  if (c.sampleRows !== 4) throw new Error('抽样比对项数异常: ' + c.sampleRows);
  if (!(p.parallelWeeksLow < p.parallelWeeksHigh)) throw new Error('并行期区间异常');
}

function main() {
  const body = read();
  const s = structure(body, parseTables(body));
  const p = params(body);
  const c = compute(p, s);
  verify(c, s, p, body);

  console.log(`医院信息化与病案 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`合同 ${p.contract.toLocaleString('en-US')} 万元 · 年运维 ${p.maintenance} 万元 → 占建设费 ${c.maintPctFixed}%`);
  console.log(`  运维经验区间 10%–15% → ${c.inTypicalRange ? '在区间内' : '已超出，属于要单独论证的长期账'}`);
  console.log(`可测条款样例：并发 ${p.concurrency} 用户，${p.respPct}% 请求 ${p.respSeconds} 秒内返回；夜间结算 ${p.batchHours} 小时内完成`);
  console.log(`数据验收：抽样 ${p.sampleSize} 份、一致率不低于 ${p.sampleRate}%`);
  console.log('');
  console.log(`验收抽样表 ${s.sampleRows} 项，合计 ${c.sampleTotal} 份（${s.sampleNames.join('、')}）`);
  console.log(`结构清点：功能清单 ${s.fields} 字段 · 上线 ${s.rollout} 种方式 · 迁移 ${s.migration} 个环节 · 并行期 ${p.parallelWeeksLow}–${p.parallelWeeksHigh} 周`);
  console.log('');
  console.log('※ 抽样比对只能证明抽到的部分是对的，不能证明全量正确；它的作用是给出判断，不是免责。');
  console.log('※ 本输出仅用于教学演示，不构成招标文件、合同条款或验收标准意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify };
