#!/usr/bin/env node
/**
 * 护理研究与循证护理 · 第 8 章 护理研究中的伦理审查
 * 正文: chapters/08-lunli-shencha/docs/zh.md
 * 做法: 从正文解析节、表、四问与首轮意见分布，复算两条比例。数字不手打。
 * 依赖: 仅 Node.js 标准库。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const TITLE = '护理研究中的伦理审查';

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
 * 题面算术：四类意见之和要等于首轮意见数；同一处指向的占比、
 * 以及「说明意义」与「说明风险」的篇幅比，都要能复算。
 * 任何一项对不上，说明正文被改过而这里没跟上。
 */
function problemArithmetic(text) {
  const m = /\*\*PROBLEM:\*\*([\s\S]*?)\n\n/.exec(text);
  const block = m ? m[1] : '';
  const num = (re) => {
    const hit = re.exec(block);
    return hit ? Number(hit[1]) : null;
  };
  const pages = num(/一份\s*(\d+)\s*页的方案送审/);
  const comments = num(/首轮反馈\s*(\d+)\s*条/);
  const consent = num(/知情同意\s*(\d+)\s*条/);
  const riskBenefit = num(/风险与受益\s*(\d+)\s*条/);
  const privacy = num(/隐私与数据\s*(\d+)\s*条/);
  const vulnerable = num(/弱势人群\s*(\d+)\s*条/);
  const sameIssue = num(/有\s*(\d+)\s*条指向同一处/);
  const riskParas = num(/涉及风险描述的只有\s*(\d+)\s*段/);
  const riskSentences = num(/合计\s*(\d+)\s*句话/);
  const meaningHit = /研究意义的段落有\s*(\d+)\s*段，合计\s*(\d+)\s*句/.exec(block);
  const meaningParas = meaningHit ? Number(meaningHit[1]) : null;
  const meaningSentences = meaningHit ? Number(meaningHit[2]) : null;
  const sum = [consent, riskBenefit, privacy, vulnerable].reduce((a, b) => a + (b || 0), 0);
  return {
    pages,
    comments,
    buckets: { consent, riskBenefit, privacy, vulnerable },
    sum,
    sumOk: comments !== null && sum === comments,
    sameIssue,
    sameIssueShare: comments ? sameIssue / comments : null,
    riskParas,
    riskSentences,
    meaningParas,
    meaningSentences,
    sentenceRatio: riskSentences && meaningSentences ? meaningSentences / riskSentences : null,
    riskShare: riskSentences && meaningSentences ? riskSentences / (riskSentences + meaningSentences) : null,
  };
}

function analyze() {
  const text = docText();
  const secs = sections(text);
  const tbs = tables(text);
  const consentTable = tbs.find((t) => t[0] && t[0][0] === '项目');
  const failSec = secs.find((s) => s.title.includes('失效模式'));
  const citations = [...new Set([...text.matchAll(/《([^》]+)》/g)].map((x) => x[1]))];
  const questions = ['风险是否已最小化', '比例是否合理', '知情同意', '选择是否公正'].map((q) => ({ name: q, hits: count(text, q) }));
  return {
    title: TITLE,
    hanzi: (text.match(/[\u4e00-\u9fff]/g) || []).length,
    sections: secs.map((s) => s.title),
    tables: tbs.length,
    consentItems: consentTable ? consentTable.slice(1).map((r) => r[0]) : [],
    questions,
    failModes: failSec ? leads(failSec.body) : [],
    citations,
    problem: problemArithmetic(text),
  };
}

function report(a) {
  const p = a.problem;
  const b = p.buckets;
  console.log(`护理研究与循证护理 · 第 8 章 ${a.title}`);
  console.log('');
  console.log(`正文 ${a.hanzi.toLocaleString('en-US')} 汉字，${a.sections.length} 节，${a.tables} 张表。`);
  console.log(`节序：${a.sections.join(' → ')}`);
  console.log('');
  console.log(`题面算术：${p.pages} 页方案，首轮 ${p.comments} 条意见 = 知情同意 ${b.consent} + 风险与受益 ${b.riskBenefit} + 隐私与数据 ${b.privacy} + 弱势人群 ${b.vulnerable} = ${p.sum}，${p.sumOk ? '对得上' : '对不上'}`);
  console.log(`  指向同一处的占比 = ${p.sameIssue} / ${p.comments} = ${(p.sameIssueShare * 100).toFixed(1)}%`);
  console.log(`  篇幅对比：风险 ${p.riskParas} 段 ${p.riskSentences} 句，意义 ${p.meaningParas} 段 ${p.meaningSentences} 句`);
  console.log(`  意义句数是风险句数的 ${p.sentenceRatio.toFixed(2)} 倍；风险句只占 ${(p.riskShare * 100).toFixed(1)}%`);
  console.log('');
  console.log(`同意书要写的 ${a.consentItems.length} 项：${a.consentItems.join(' / ')}`);
  console.log(`失效模式 ${a.failModes.length} 条：${a.failModes.join('、')}`);
  console.log(`引书 ${a.citations.length} 部：${a.citations.map((c) => `《${c}》`).join('')}`);
  console.log('');
  console.log('※ 以上结构由本章正文现算；具体要件与程序以现行法规和所在机构伦理委员会规程为准。');
}

if (require.main === module) report(analyze());

module.exports = { DOC, TITLE, docText, sections, tables, leads, count, problemArithmetic, analyze };
