#!/usr/bin/env node
/**
 * 护理研究与循证护理 · 第 7 章 证据到实践的转化
 * 正文: chapters/07-zhuanhua-shijian/docs/zh.md
 * 做法: 从正文解析节、表、障碍四类，并复算推荐分档与按机会计的执行率。数字不手打。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '证据到实践的转化';

function docText() {
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function sections(text) {
  const marks = [...text.matchAll(/^## (.+)$/gm)];
  return marks.map((m, i) => {
    const start = m.index + m[0].length;
    const end = i + 1 < marks.length ? marks[i + 1].index : text.length;
    return { title: m[1].trim(), body: text.slice(start, end) };
  });
}

function tables(text) {
  const out = [];
  let cur = null;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line.startsWith('|')) { cur = null; continue; }
    if (!cur) { cur = []; out.push(cur); }
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue;
    cur.push(cells);
  }
  return out.filter((t) => t.length > 0);
}

function leads(body) {
  return [...body.matchAll(/^\*\*([^*]+)\*\*/gm)]
    .map((m) => m[1].replace(/^[一二三四五六七八九十]+是[，、]?\s*/, '').replace(/[。：:]\s*$/, '').trim())
    .filter(Boolean);
}

function count(text, term) {
  return text.split(term).length - 1;
}

/**
 * 题面算术：可执行条数 = 总数 − 三类障碍条数之和；
 * 机会数 = 动作点数 × 天数 × 班次数；执行率 = 完成数 / 机会数。
 * 任何一项对不上，说明正文被改过而这里没跟上。
 */
function problemArithmetic(text) {
  const m = /\*\*PROBLEM:\*\*([\s\S]*?)\n\n/.exec(text);
  const block = m ? m[1] : '';
  const num = (re) => {
    const hit = re.exec(block);
    return hit ? Number(hit[1]) : null;
  };
  const total = num(/一份材料里的\s*(\d+)\s*条推荐/);
  const noResource = num(/(\d+)\s*条缺本地设备或人力/);
  const conflict = num(/(\d+)\s*条与现行流程冲突/);
  const needSystem = num(/(\d+)\s*条要改信息系统/);
  const ready = num(/剩下\s*(\d+)\s*条当场可执行/);
  const actions = num(/再把\s*\d+\s*条拆成\s*(\d+)\s*个可核对的动作点/);
  const oppLine = /(\d+)\s*个动作点按「\s*(\d+)\s*天\s*×\s*每班一次」计/.exec(block);
  const points = oppLine ? Number(oppLine[1]) : null;
  const days = oppLine ? Number(oppLine[2]) : null;
  const shiftHit = /\d+\s*×\s*\d+\s*×\s*(\d+)\s*=/.exec(block);
  const shifts = shiftHit ? Number(shiftHit[1]) : null;
  const opportunities = num(/机会数为\s*\d+\s*×\s*\d+\s*×\s*\d+\s*=\s*(\d+)/);
  const done = num(/实际完成\s*(\d+)\s*次/);
  const blockedSum = noResource === null || conflict === null || needSystem === null
    ? null
    : noResource + conflict + needSystem;
  const expectedOpp = points === null || days === null || shifts === null ? null : points * days * shifts;
  return {
    total,
    blocked: { noResource, conflict, needSystem },
    blockedSum,
    ready,
    readyOk: total !== null && ready === total - blockedSum,
    actions,
    points,
    days,
    shifts,
    opportunities,
    oppOk: expectedOpp === opportunities,
    done,
    rate: opportunities ? done / opportunities : null,
    pointsShare: actions ? points / actions : null,
  };
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const tbs = tables(text);
  const obstacleTable = tbs.find((t) => t[0] && t[0][0] === '障碍类型');
  const failSec = secs.find((s) => s.title.includes('失效模式'));
  const citations = [...new Set([...text.matchAll(/《([^》]+)》/g)].map((x) => x[1]))];
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    tables: tbs.length,
    obstacles: obstacleTable ? obstacleTable.slice(1).map((r) => r[0]) : [],
    levels: ['推荐到动作', '动作到流程', '流程到留痕'].map((x) => ({ name: x, hits: count(text, x) })),
    failModes: failSec ? leads(failSec.body) : [],
    citations,
    problem: problemArithmetic(text),
  };
}

function report(a) {
  const p = a.problem;
  console.log(`护理研究与循证护理 · 第 7 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节，${a.tables} 张表。`);
  console.log(`节序：${a.sections.join(' → ')}`);
  console.log('');
  console.log(`题面算术：${p.total} 条推荐，缺设备或人力 ${p.blocked.noResource} + 流程冲突 ${p.blocked.conflict} + 要改系统 ${p.blocked.needSystem} = ${p.blockedSum} 条卡住`);
  console.log(`  当场可执行 = ${p.total} − ${p.blockedSum} = ${p.ready} 条，${p.readyOk ? '对得上' : '对不上'}`);
  console.log(`  动作点数 ${p.actions} 个，其中 ${p.points} 个按机会计`);
  console.log(`  机会数 = ${p.points} × ${p.days} 天 × ${p.shifts} 班 = ${p.opportunities}，${p.oppOk ? '对得上' : '对不上'}`);
  console.log(`  执行率 = ${p.done} / ${p.opportunities} = ${(p.rate * 100).toFixed(1)}%（约四成）`);
  console.log(`  按机会计与按动作点计的分母不同：${p.points} / ${p.actions} = ${(p.pointsShare * 100).toFixed(1)}% 只是动作点占比，不是执行率`);
  console.log('');
  console.log(`障碍四类：${a.obstacles.join(' / ')}`);
  console.log(`三级改写：${a.levels.map((x) => x.name).join(' → ')}`);
  console.log(`失效模式 ${a.failModes.length} 条：${a.failModes.join('、')}`);
  console.log(`引书 ${a.citations.length} 部：${a.citations.map((c) => `《${c}》`).join('')}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；分档为教学设定，实施以所在机构制度为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, problemArithmetic, analyze };
