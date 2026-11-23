#!/usr/bin/env node
/**
 * 中医老年病学 · 第 2 章 发展简史：从「养老」到「老年病学」 —— 正文现算
 * 课程: departments/01-zhongyi/19-zhongyi-laonianbing-xue/chapters/02-fazhan-jianshi/docs/zh.md
 * 数据: 同目录 docs/zh.md（章正文）与 quiz.json（本章自测题）
 * 依赖: 仅 Node.js 标准库
 *
 * 所有数字都从正文现读现算：小节、汉字、表格行数、本章结构表及其条目、
 * 分档判据、记录字段、失效模式与考核项条数，以及自测题的结构。
 * 正文改一个字，输出跟着变；这里不存任何手打的统计。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const SLUG = '02-fazhan-jianshi';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 汉字数（只数 CJK 基本区与扩展 A） */
function hanzi(s) {
  return (String(s || '').match(HANZI) || []).length;
}

/** 只有汉字、供「接地」比对用的连续片段 */
function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

const cells = (line) =>
  line.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());

const isSeparator = (line) => cells(line).every((c) => /^:?-{2,}:?$/.test(c));

/** 把正文切成小节，并把每个小节的表格、加粗条目、列表项收进去 */
function parse(text) {
  const lines = String(text).replace(/\r\n/g, '\n').split('\n');
  const h1 = (lines.find((l) => /^#\s+/.test(l)) || '').replace(/^#\s+/, '').trim();

  const sections = [];
  const tables = [];
  let sec = { title: '（章首）', lines: [] };
  sections.push(sec);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^##\s+/.test(line)) {
      sec = { title: line.replace(/^##\s+/, '').trim(), lines: [] };
      sections.push(sec);
      continue;
    }
    sec.lines.push(line);

    if (/^\s*\|/.test(line)) {
      const block = [];
      let j = i;
      while (j < lines.length && /^\s*\|/.test(lines[j])) {
        block.push(lines[j]);
        j += 1;
      }
      const sepAt = block.findIndex(isSeparator);
      if (sepAt > 0) {
        const head = cells(block[sepAt - 1]);
        const rows = block.slice(sepAt + 1).filter((l) => !isSeparator(l)).map(cells);
        tables.push({ section: sec.title, head, rows });
      }
      i = j - 1;
    }
  }

  for (const s of sections) {
    s.boldLeads = s.lines
      .map((l) => (l.match(/^\*\*(.+?)\*\*/) || [])[1])
      .filter(Boolean)
      .map((b) => b.replace(/[。，；：、]+$/, ''));
    s.items = s.lines.filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, '').trim());
  }

  return { h1, sections, tables };
}

/** 章号从标题里读，不另外维护一份 */
function chapterNo(h1) {
  const m = String(h1).match(/第\s*(\d+)\s*章/);
  return m ? Number(m[1]) : 0;
}

function findSection(parsed, re) {
  return parsed.sections.find((s) => re.test(s.title)) || null;
}

function firstTableIn(parsed, re) {
  const s = findSection(parsed, re);
  return s ? parsed.tables.find((t) => t.section === s.title) || null : null;
}

/**
 * 本章的结构量。
 * 结构表取正文第一张表：这张表就是本章把问题拆成的几项
 * （五维、五次迁移、四个观察量、四张清单…），不写死条数，只读表。
 */
function metrics(parsed) {
  const structure = parsed.tables[0] || { section: '（无表）', head: [], rows: [] };
  const tierTable = firstTableIn(parsed, /分档/);
  const recordTable = firstTableIn(parsed, /记录字段/) ||
    [...parsed.tables].reverse().find((t) => /记录/.test(t.section) || /记录/.test(t.head.join('')));
  const failSection = findSection(parsed, /失效模式/);

  const checkItems = (() => {
    const own = findSection(parsed, /考核项/);
    if (own) return own.items;
    const lines = [];
    let on = false;
    for (const l of parsed.sections.flatMap((s) => s.lines)) {
      if (/^###\s*考核项/.test(l)) { on = true; continue; }
      if (on && /^#{2,3}\s/.test(l)) break;
      if (on) lines.push(l);
    }
    return lines.filter((l) => /^\s*[-*]\s+/.test(l)).map((l) => l.replace(/^\s*[-*]\s+/, '').trim());
  })();

  return {
    chapter: chapterNo(parsed.h1),
    title: parsed.h1,
    sections: parsed.sections.filter((s) => s.title !== '（章首）').map((s) => s.title),
    hanzi: hanzi(parsed.sections.filter((s) => s.title !== '（章首）').map((s) => s.lines.join('\n')).join('\n')),
    tables: parsed.tables.length,
    tableRows: parsed.tables.reduce((a, t) => a + t.rows.length, 0),
    structure: {
      section: structure.section,
      head: structure.head,
      count: structure.rows.length,
      dims: structure.rows.map((r) => r[0]),
    },
    tiers: tierTable ? { count: tierTable.rows.length, names: tierTable.rows.map((r) => r[0]) } : { count: 0, names: [] },
    records: recordTable ? { count: recordTable.rows.length, names: recordTable.rows.map((r) => r[0]) } : { count: 0, names: [] },
    failures: failSection ? failSection.boldLeads.filter((b) => !/^考核项/.test(b)) : [],
    checkItems,
    quiz: JSON.parse(fs.readFileSync(QUIZ, 'utf8')),
  };
}

/** 自测题的结构对账：三段齐、四选项、解释够长、check 题能在正文找到原词、正确项不扎堆 */
function quizAudit(quiz, body) {
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stages = { pre: 0, check: 0, post: 0 };
  const spread = [0, 0, 0, 0];
  const grounded = [];
  let minExplain = Infinity;
  let optionsOk = true;
  let indexOk = true;

  const bodyGrams = shingles(body, 4);
  for (const q of qs) {
    stages[q.stage] = (stages[q.stage] || 0) + 1;
    if (!Array.isArray(q.options) || q.options.length !== 4) optionsOk = false;
    if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct > 3) indexOk = false;
    else spread[q.correct] += 1;
    const n = hanzi(q.explain);
    if (n < minExplain) minExplain = n;
    if (q.stage === 'check' && Array.isArray(q.options)) {
      const right = String(q.options[q.correct] || '');
      const hit = [...shingles(right, 4)].some((g) => bodyGrams.has(g));
      grounded.push({ q: q.question, hit });
    }
  }

  return {
    total: qs.length,
    stages,
    spread,
    minExplain,
    optionsOk,
    indexOk,
    grounded,
    groundedCount: grounded.filter((g) => g.hit).length,
  };
}

function main() {
  const text = fs.readFileSync(DOC, 'utf8');
  const parsed = parse(text);
  const m = metrics(parsed);
  const a = quizAudit(m.quiz, text);

  console.log(`═══ 中医老年病学 · 第 ${m.chapter} 章 ${m.title.replace(/^第\s*\d+\s*章\s*·?\s*/, '')} ═══`);
  console.log(`正文 ${DOC.replace(/^.*chapters[\\/]/, 'chapters/')}：${m.hanzi} 汉字 · ${m.sections.length} 节 · ${m.tables} 张表 / ${m.tableRows} 行`);
  console.log('');
  console.log(`结构表 ${m.structure.count} 条（取自「${m.structure.section}」）：`);
  m.structure.dims.forEach((d, i) => console.log(`  ${i + 1}. ${d}`));
  console.log('');
  console.log(`分档判据 ${m.tiers.count} 档：${m.tiers.names.join(' / ')}`);
  console.log(`记录字段 ${m.records.count} 条：${m.records.names.join('、')}`);
  console.log(`失效模式 ${m.failures.length} 条：${m.failures.join('、')}`);
  console.log(`考核项 ${m.checkItems.length} 条`);
  console.log('');
  console.log(`自测题 ${a.total} 道：pre ${a.stages.pre} / check ${a.stages.check} / post ${a.stages.post}`);
  console.log(`  四选项齐全 ${a.optionsOk ? '是' : '否'} · 解释最短 ${a.minExplain} 汉字 · check 题接地 ${a.groundedCount}/${a.grounded.length}`);
  console.log(`  正确项分布 0:${a.spread[0]} 1:${a.spread[1]} 2:${a.spread[2]} 3:${a.spread[3]}`);
  console.log('');
  console.log('※ 教学样例：以上数字全部由 docs/zh.md 与 quiz.json 现算，改正文即变；不构成诊疗建议，不能替代医师面诊。');
}

if (require.main === module) main();

module.exports = { SLUG, DOC, QUIZ, hanzi, shingles, parse, chapterNo, metrics, quizAudit, main };
