#!/usr/bin/env node
/**
 * 卫生信息管理 · 第 4 章 信息安全管理：权限不是一张表，是一条能被审计的证据链
 * 课程: departments/06-guanli/10-yixue-xinxi-guanli/chapters/04-i4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读：账号总数、离职未停用数、仍在登录数、导出告警阈值与单次最大导出条数。
 * 现算：账号陈旧率、陈旧账号的活跃比例、超阈值倍数；并清点四判据、五要素、三脱敏法、四步响应、四级分级。
 * 同时用哈希链把一批访问记录串起来，演示「回改一条就断链」——安全靠的是证据链，不是权限表。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '信息安全管理：权限不是一张表，是一条能被审计的证据链';

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const one = (re, body, name) => {
  const m = body.match(re);
  if (!m) throw new Error('正文里没找到' + name);
  return m[1];
};
const num = (s) => Number(String(s).replace(/,/g, ''));
const fmt = (n) => Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 });

function params(body) {
  return {
    accounts: Number(one(/系统里 (\d+) 个可查病历的账号/, body, '账号总数')),
    stale: Number(one(/(\d+) 个属于已离职或已转岗人员/, body, '离职未停用账号数')),
    activeStale: Number(one(/其中 (\d+) 个在近半年仍有登录记录/, body, '仍在登录数')),
    exportWindowDays: Number(one(/再看 (\d+) 天的导出日志/, body, '导出日志窗口')),
    exporting: Number(one(/(\d+) 个账号在凌晨/, body, '凌晨导出账号数')),
    maxRows: num(one(/单次最多 ([\d,]+) 条/, body, '单次最大导出条数')),
    threshold: Number(one(/单日导出超 (\d+) 条即告警/, body, '导出告警阈值')),
  };
}

/** 控制项清点：每一项都必须在正文里真实出现。 */
function controls(body) {
  const groups = {
    判据: ['唯一身份', '离职即停', '最小权限 + 定期复核', '职责分离'],
    日志要素: ['**谁**', '**何时**', '**从哪**', '**做了什么**', '**结果**'],
    脱敏法: ['掩码', '泛化', '假名化'],
    响应四步: ['遏制', '取证', '恢复', '复盘'],
    分级四级: ['可公开', '内部', '敏感', '高敏'],
  };
  const out = {};
  for (const [k, list] of Object.entries(groups)) {
    const hit = list.filter((s) => body.includes(s));
    if (hit.length !== list.length) throw new Error(k + '不全，缺: ' + list.filter((s) => !hit.includes(s)).join('、'));
    out[k] = hit.length;
  }
  return out;
}

/** 复算：陈旧率、陈旧账号仍在用的比例、超阈值倍数。 */
function compute(p) {
  return {
    staleRate: (p.stale / p.accounts) * 100,
    activeStaleRate: (p.activeStale / p.stale) * 100,
    overThreshold: p.maxRows / p.threshold,
    wouldAlert: p.maxRows > p.threshold,
  };
}

const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

/** 一条记录连同它的前序 hash 一起算摘要；hash 字段本身不参与计算。 */
function hashOf(entry, prevHash) {
  const { hash: _drop, ...rest } = entry;
  return sha256(JSON.stringify({ ...rest, prevHash }));
}

/** 正文的哈希链：每条包含上一条的 hash，任何回改都会断链。 */
function append(prev, entry) {
  return { ...entry, prevHash: prev.hash, hash: hashOf(entry, prev.hash) };
}

function verifyChain(chain) {
  let prev = { hash: 'GENESIS' };
  for (const e of chain) {
    if (hashOf(e, prev.hash) !== e.hash || e.prevHash !== prev.hash) return false;
    prev = e;
  }
  return true;
}

/** 用正文参数造一批访问记录：6 个凌晨导出账号 + 1 次常规查询。 */
function buildChain(p) {
  const base = { who: 'u0000', at: '2026-03-11T09:42:00', from: '10.20.3.14', action: 'query', result: 'ok' };
  const entries = [
    { ...base, who: 'u0043', at: '2026-03-11T02:10:07', action: `export ${p.maxRows} rows`, result: 'ok' },
    { ...base, who: 'u0113', at: '2026-03-11T02:41:55', action: 'export 620 rows', result: 'ok' },
    { ...base, who: 'u0079', at: '2026-03-11T03:02:11', action: 'query (no grant)', result: 'denied' },
    { ...base, who: 'u0142', at: '2026-03-11T03:20:48', action: 'export 310 rows', result: 'ok' },
    { ...base, who: 'u0008', at: '2026-03-11T09:42:00', action: 'query', result: 'ok' },
  ];
  const chain = [];
  let prev = { hash: 'GENESIS' };
  for (const e of entries) { prev = append(prev, e); chain.push(prev); }
  return chain;
}

function verify(c, ctrl, chain, body) {
  if (c.staleRate <= 0 || c.staleRate >= 50) throw new Error('陈旧账号比例异常: ' + c.staleRate);
  if (c.activeStale > c.stale) throw new Error('仍在登录数不可能超过陈旧账号数');
  if (!c.wouldAlert) throw new Error('单次导出已超阈值，规则本应告警');
  if (Object.values(ctrl).some((n) => n < 3)) throw new Error('控制项清点不足: ' + JSON.stringify(ctrl));
  if (!verifyChain(chain)) throw new Error('哈希链自检失败');
  const tampered = chain.map((e, i) => (i === 0 ? { ...e, action: 'export 1 rows' } : e));
  if (verifyChain(tampered)) throw new Error('回改后哈希链竟然还能通过，链没有起作用');
  for (const k of ['1,800 条', '超 500 条即告警']) {
    if (!body.includes(k)) throw new Error('正文缺关键数字: ' + k);
  }
}

function main() {
  const body = read();
  const p = params(body);
  const c = compute(p);
  const ctrl = controls(body);
  const chain = buildChain(p);
  verify(c, ctrl, chain, body);

  console.log(`卫生信息管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`账号 ${p.accounts} 个，离职或转岗未停用 ${p.stale} 个 → 陈旧率 ${c.staleRate.toFixed(1)}%`);
  console.log(`其中 ${p.activeStale} 个近半年仍有登录 → 陈旧账号活跃比例 ${c.activeStaleRate.toFixed(1)}%`);
  console.log(`${p.exportWindowDays} 天导出日志：${p.exporting} 个账号凌晨导出，单次最多 ${fmt(p.maxRows)} 条`);
  console.log(`  阈值 ${p.threshold} 条：实际 ${c.overThreshold.toFixed(1)} 倍 >> ${c.wouldAlert ? '本应告警，实际 0 次告警' : '未超阈值'}`);
  console.log('');
  console.log(`控制项清点：判据 ${ctrl.判据} 条 · 日志要素 ${ctrl.日志要素} 项 · 脱敏 ${ctrl.脱敏法} 法 · 响应 ${ctrl.响应四步} 步 · 分级 ${ctrl.分级四级} 级`);
  console.log('');
  console.log('哈希链自检：');
  console.log(`  原始链 ${chain.length} 条 → ${verifyChain(chain) ? '通过' : '断链'}`);
  const tampered = chain.map((e, i) => (i === 0 ? { ...e, action: 'export 1 rows' } : e));
  console.log(`  回改第 1 条导出条数 → ${verifyChain(tampered) ? '仍通过（链失效）' : '断链，回改被抓住'}`);
  console.log('');
  console.log('※ 有日志不等于有审计：链能自证，前提是有人每周真的看一遍。');
  console.log('※ 本输出仅用于教学演示，不构成安全建设方案或合规意见。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, params, controls, compute, append, verifyChain, buildChain, verify, sha256, hashOf,
};
