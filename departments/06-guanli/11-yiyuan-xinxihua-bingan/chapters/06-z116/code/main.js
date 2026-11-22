#!/usr/bin/env node
/**
 * 医院信息化与病案 · 第 6 章 信息安全与权限：能登录的人越多，签名越不值钱
 * 课程: departments/06-guanli/11-yiyuan-xinxihua-bingan/chapters/06-z116/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 参数从本章正文的权限梳理段读：账号总数、共用账号数、其中有病历修改权的账号数。
 * 复算：共用占比、共用账号里带修改权的比例、一人一账号的覆盖面；并清点五类日志、三条签名前提、两个工程条件。
 * 正文任何一格改动，本脚本都会报出偏差——手打的结论会在改版后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '信息安全与权限：能登录的人越多，签名越不值钱';

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

const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
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
  return {
    accounts: num(one(/全院 ([\d,]+) 个账号/, body, '账号总数')),
    shared: num(one(/里有 ([\d,]+) 个是「科室共用」/, body, '共用账号数')),
    sharedWithEdit: num(one(/其中 ([\d,]+) 个拥有病历修改权限/, body, '带修改权的共用账号数')),
    passwordHolders: cnNum(one(/科室([一二三四五六七八九十\d]+)个人都知道密码/, body, '知道密码的人数')),
    roleCeiling: cnNum(one(/超过([一二三四五六七八九十\d]+)个必然出现/, body, '角色数量上限')),
  };
}

/** 五类日志、三条签名前提、两个工程条件、权限三层。 */
function structure(body, tables) {
  const logTable = tables.find((x) => x.header.includes('日志类型') && x.header.includes('必记字段'));
  if (!logTable) throw new Error('正文里没找到日志类型表');
  const premises = ['专有性', '可控性', '可检测性']
    .filter((k) => new RegExp('\\*\\*' + k + '\\*\\*').test(body)).length;
  const engineering = ['可信时间源', '证书生命周期管理'].filter((k) => body.includes(k)).length;
  const levels = ['角色而非个人', '最小必要', '时限与场景'].filter((k) => body.includes(k)).length;
  return {
    logTypes: logTable.rows.length,
    logNames: logTable.rows.map((r) => r[0]),
    premises,
    engineering,
    levels,
  };
}

/** 复算：共用占比、共用账号里带修改权的比例、一人一账号覆盖面。 */
function compute(p) {
  const sharedPct = (p.shared / p.accounts) * 100;
  const editShare = (p.sharedWithEdit / p.shared) * 100;
  return {
    sharedPct,
    sharedPctFixed: sharedPct.toFixed(1),
    editShare,
    editShareFixed: editShare.toFixed(1),
    exclusiveAccounts: p.accounts - p.shared,
    exclusivePct: ((p.accounts - p.shared) / p.accounts * 100).toFixed(1),
  };
}

/** 正文与复算必须对得上：任一处对不上就抛错，不许两份数并存。 */
function verify(c, s, p, body) {
  const must = [
    ['1,900 个账号', '账号总数'],
    ['214 个是「科室共用」', '共用账号数'],
    ['37 个拥有病历修改权限', '带修改权账号数'],
    ['一人一账号', '专有性落地形式'],
    ['登录凭证与签名凭证分离', '可控性落地形式'],
  ];
  const miss = must.filter(([str]) => !body.includes(str)).map(([, k]) => k);
  if (miss.length) throw new Error('正文与复算不一致，缺: ' + miss.join('、'));
  if (!(p.sharedWithEdit < p.shared && p.shared < p.accounts)) {
    throw new Error('账号数关系不自洽: ' + [p.sharedWithEdit, p.shared, p.accounts].join('/'));
  }
  if (s.logTypes !== 5) throw new Error('日志类型数异常: ' + s.logTypes);
  if (s.premises !== 3) throw new Error('签名技术前提数异常: ' + s.premises);
  if (s.engineering !== 2) throw new Error('签名工程条件数异常: ' + s.engineering);
  if (s.levels !== 3) throw new Error('权限层次数异常: ' + s.levels);
  if (c.sharedPct < 10 || c.sharedPct > 12) throw new Error('共用占比异常: ' + c.sharedPctFixed);
}

function main() {
  const body = read();
  const s = structure(body, parseTables(body));
  const p = params(body);
  const c = compute(p);
  verify(c, s, p, body);

  console.log(`医院信息化与病案 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下比例均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`账号 ${p.accounts.toLocaleString('en-US')} 个，共用 ${p.shared} 个 → ${c.sharedPctFixed}% 不是「一个人一个账号」`);
  console.log(`共用账号里 ${p.sharedWithEdit} 个带病历修改权限 → 占共用账号 ${c.editShareFixed}%`);
  console.log(`一人一账号覆盖 ${c.exclusiveAccounts} 个（${c.exclusivePct}%）；一个账号 ${p.passwordHolders} 人知道密码，专有性即不成立`);
  console.log('');
  console.log(`结构清点：日志 ${s.logTypes} 类（${s.logNames.join('、')}）· 权限 ${s.levels} 层 · 签名前提 ${s.premises} 条 · 工程条件 ${s.engineering} 条`);
  console.log(`角色数量上限经验值：${p.roleCeiling} 个，超过必然为一个人新建角色`);
  console.log('');
  console.log('※ 共用账号越多，签名能证明的就越少——它只证明这个科室有人点了确认。');
  console.log('※ 本输出仅用于教学演示，不构成安全方案设计、等保测评意见或法律意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify };
