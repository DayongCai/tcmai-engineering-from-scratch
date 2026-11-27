#!/usr/bin/env node
/**
 * 护理研究与循证护理 · 第 3 章 质性研究与访谈分析
 * 正文: chapters/03-zhixing-fangtan/docs/zh.md
 * 做法: 从正文解析节、表、抽样策略、饱和判据与题面里的算术，现算后打印。数字不手打。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '质性研究不是聊天，是把重复说的话听成结构';

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
 * 题面的算术：主题支撑人数之和要等于主题数；饱和要看
 * 受访者总数 − 起算位 + 1 是否够「连续多少位无新码」。
 * 任何一项对不上，说明正文被改过而这里没跟上。
 */
function problemArithmetic(text) {
  const m = /\*\*PROBLEM:\*\*([\s\S]*?)\n\n/.exec(text);
  const block = m ? m[1] : '';
  const num = (re) => {
    const hit = re.exec(block);
    return hit ? Number(hit[1]) : null;
  };
  const people = num(/拿一份\s*(\d+)\s*人访谈的资料/);
  const hours = num(/录音合计\s*(\d+)\s*小时\s*(\d+)\s*分/);
  const minutes = hours === null ? null : hours * 60 + Number((/录音合计\s*\d+\s*小时\s*(\d+)\s*分/.exec(block) || [, 0])[1]);
  const wanChars = num(/转写文本\s*([\d.]+)\s*万字/);
  const codes = num(/初始编码\s*(\d+)\s*个/);
  const themes = num(/归并为\s*(\d+)\s*个主题/);
  const singleSupported = num(/其中\s*(\d+)\s*个主题只由\s*1\s*位受访者/);
  const wellSupported = num(/另外\s*(\d+)\s*个主题有\s*(\d+)\s*人以上发言/) ;
  const startAt = num(/实际从第\s*(\d+)\s*位受访者起不再出现新编码/);
  const consecutive = num(/连续\s*(\d+)\s*人无新编码即视为饱和/);
  return {
    people,
    minutes,
    minutesPerPerson: minutes === null || people === null ? null : minutes / people,
    transcriptChars: wanChars === null ? null : Math.round(wanChars * 10000),
    codes,
    themes,
    singleSupported,
    wellSupported,
    supportSumOk: themes !== null && themes === singleSupported + wellSupported,
    saturation: startAt === null || consecutive === null || people === null
      ? null
      : { startAt, consecutive, count: people - startAt + 1, ok: people - startAt + 1 >= consecutive },
    codesPerTheme: codes === null || themes === null ? null : codes / themes,
  };
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const tbs = tables(text);
  const sampleTable = tbs.find((t) => t[0] && t[0][0] === '目的');
  const failSec = secs.find((s) => s.title.includes('失效模式'));
  const citations = [...new Set([...text.matchAll(/《([^》]+)》/g)].map((x) => x[1]))];
  const trust = ['可信度', '可转移性', '可依赖性', '可确认性'];
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    tables: tbs.length,
    strategies: sampleTable ? sampleTable.slice(1).map((r) => r[1]) : [],
    trust: trust.map((t) => ({ name: t, hits: count(text, t) })),
    failModes: failSec ? leads(failSec.body) : [],
    citations,
    problem: problemArithmetic(text),
  };
}

function report(a) {
  const p = a.problem;
  console.log(`护理研究与循证护理 · 第 3 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节，${a.tables} 张表。`);
  console.log(`节序：${a.sections.join(' → ')}`);
  console.log('');
  console.log(`题面算术：${p.people} 人访谈，录音 ${p.minutes} 分钟 → 人均 ${p.minutesPerPerson.toFixed(1)} 分钟；转写 ${p.transcriptChars.toLocaleString('en-US')} 字。`);
  console.log(`  ${p.codes} 个初始编码归并成 ${p.themes} 个主题 → 平均 ${p.codesPerTheme.toFixed(1)} 码/主题`);
  console.log(`  主题支撑：仅 1 人 ${p.singleSupported} 个 + 8 人以上 ${p.wellSupported} 个 = ${p.singleSupported + p.wellSupported}，${p.supportSumOk ? '等于主题数' : '不等于主题数'}`);
  console.log(`  称为主题的门槛是 3 位不同受访者，故 ${p.singleSupported} 个主题只能写作个案观察。`);
  console.log(`  饱和复算：${p.people} − ${p.saturation.startAt} + 1 = ${p.saturation.count}，要求连续 ${p.saturation.consecutive} 位无新码 → ${p.saturation.ok ? '条件满足' : '条件不满足'}`);
  console.log('');
  console.log(`抽样策略（${a.strategies.length} 种）：${a.strategies.join(' / ')}`);
  console.log(`质量四要素在正文出现次数：${a.trust.map((t) => `${t.name} ${t.hits}`).join(' · ')}`);
  console.log(`失效模式 ${a.failModes.length} 条：${a.failModes.join('、')}`);
  console.log(`引书 ${a.citations.length} 部：${a.citations.map((c) => `《${c}》`).join('')}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；不构成医学意见，访谈与材料使用以伦理审查同意的范围为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, problemArithmetic, analyze };
