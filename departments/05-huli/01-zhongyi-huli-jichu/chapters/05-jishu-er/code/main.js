#!/usr/bin/env node
/**
 * 中医护理学基础 · 第 5 章 常用中医护理技术（二）：正文判断卡
 * 课程: departments/05-huli/01-zhongyi-huli-jichu/chapters/05-jishu-er/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部现算：汉字数、节与小节、表格与数据行、成组判据的组数与同现项数、
 * 失效模式条数，都由本脚本从本章正文读出；样例记录的归类与可比性由规则逐条跑出。
 * 改正文后重跑即可复现，不留手打数字。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = '5';
const SLUG = '05-jishu-er';
const TITLE = '外治的效力与风险同源，差的只是边界清不清';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

// 样例记录取自本章正文的写法示例，逐条过规则，看它落在哪一类。
const SAMPLES = [
  {
    "text": "已行熏洗，患者无不适",
    "note": "六字段全缺"
  },
  {
    "text": "水温以患者能耐受为度",
    "note": "参数口头化，未写确认方式"
  },
  {
    "text": "敷贴后两小时查看局部：无起疱、无瘙痒、皮肤淡红",
    "note": "写明观察时点与内容"
  },
  {
    "text": "出痧越深，说明邪气越重、效果越好",
    "note": "把体表反应当疗效"
  },
  {
    "text": "足背动脉搏动可触及，皮温与健侧相近，无麻木",
    "note": "下肢外治的前置四项"
  }
];

// 判断性用语：证名与诊断名，护理记录里出现即属写结论。
const CONCLUSION = /(脾虚|肾阳虚|肾阴虚|气血两虚|气血不足|肝郁|心脾两虚|阳虚|阴虚|寒湿|湿热|瘀血|贫血貌|营养状况差|焦虑症|低血压|高血压|证属|诊断为)/;
// 空话式用语：无法复核，也交接不了。
const EMPTY = /(一般情况可|无不适|明显好转|情绪好转|已宣教|已行|按计划执行|适当活动|清淡饮食|注意休息|配合良好|情况稳定|患者表示理解|食欲可|三餐正常|睡眠改善|精神可|精神差)/;
// 疗效断言：把体表反应或照护说成效果，越出本分。
const EFFICACY = /(效果越好|效果好|湿气重|排毒|见效|治愈|保证|就能|包好)/;
// 条件与量：有其一才谈得上「可比较」。
const CONDITION = /(后|前|时|伴|因|加重|缓解|减轻|加衣|进冷|遇|可减|不能|需|若|按|拒)/;
const QUANTITY = /(\d|[一二三四五六七八九十]|半碗|少量|多次|小时|分钟|次)/;

function readDoc() {
  return fs.readFileSync(DOC, 'utf8');
}

function hanzi(text) {
  return (text.match(/[\u4e00-\u9fff]/g) || []).length;
}

function countHeadings(text, prefix) {
  return text.split(/\r?\n/).filter((line) => line.startsWith(prefix) && !line.startsWith(prefix + '#')).length;
}

/** 连续以 | 开头的行算一张表；返回每张表的原始行 */
function tableBlocks(lines) {
  const blocks = [];
  let cur = null;
  for (const line of lines) {
    const t = line.trim();
    if (t.startsWith('|')) {
      if (!cur) { cur = []; blocks.push(cur); }
      cur.push(t);
    } else {
      cur = null;
    }
  }
  return blocks;
}

/** 表头之外的数据行 */
function dataRows(block) {
  const body = block.filter((l) => !/^\|[\s:\-|]+\|$/.test(l));
  return body.slice(1);
}

/** 取出某个二级标题下的正文（不含该标题行） */
function sectionText(text, key) {
  const out = [];
  let on = false;
  for (const line of text.split(/\r?\n/)) {
    const m = /^##\s+(.*)$/.exec(line);
    if (m) {
      on = m[1].includes(key);
      continue;
    }
    if (on) out.push(line);
  }
  return out.join('\n');
}

function classify(text) {
  if (CONCLUSION.test(text)) return '结论式';
  if (EFFICACY.test(text)) return '疗效式';
  if (EMPTY.test(text)) return '空话式';
  return '依据式';
}

function comparable(text) {
  const parts = text.split(/[，,；;、]/).map((s) => s.trim()).filter((s) => s.length >= 2);
  return parts.length >= 2 || CONDITION.test(text) || QUANTITY.test(text);
}

function blockOf(lines) {
  const blocks = tableBlocks(lines);
  let rows = 0;
  for (const b of blocks) rows += dataRows(b).length;
  return { tables: blocks.length, rows };
}

function report() {
  const text = readDoc();
  const lines = text.split(/\r?\n/);

  const size = {
    hanzi: hanzi(text),
    sections: countHeadings(text, '## '),
    subsections: countHeadings(text, '### '),
    ...blockOf(lines),
  };

  // 成组判据：段落内的表、表内带 ＋ 的同现行、每行的同现项数
  const critLines = sectionText(text, '成组判据').split(/\r?\n/);
  const critBlocks = tableBlocks(critLines);
  let critRows = 0;
  const itemCounts = [];
  for (const b of critBlocks) {
    for (const row of dataRows(b)) {
      critRows += 1;
      const cells = row.split('|').map((c) => c.trim());
      let best = 0;
      for (const c of cells) {
        const n = c.split(/[＋、；]/).map((x) => x.trim()).filter(Boolean).length;
        if (n > best) best = n;
      }
      if (best >= 2) itemCounts.push(best);
    }
  }

  const modes = (sectionText(text, '失效模式').match(/其[一二三四五六七八九]，/g) || []).length;

  const samples = SAMPLES.map((s) => ({
    text: s.text,
    note: s.note,
    kind: classify(s.text),
    comparable: comparable(s.text),
  }));

  return { chapter: CHAPTER, title: TITLE, size, crit: { tables: critBlocks.length, rows: critRows, items: itemCounts }, modes, samples };
}

function main() {
  const r = report();
  console.log(`中医护理学基础 · 第 ${r.chapter} 章 ${r.title}`);
  console.log(`正文: chapters/${SLUG}/docs/zh.md`);
  console.log('');
  console.log(`规模: 汉字 ${r.size.hanzi.toLocaleString('en-US')} · 节 ${r.size.sections} · 小节 ${r.size.subsections} · 表格 ${r.size.tables} 张（数据行 ${r.size.rows}）`);
  const items = r.crit.items;
  const min = items.length ? Math.min(...items) : 0;
  const max = items.length ? Math.max(...items) : 0;
  if (r.crit.rows === 0) {
    console.log('判据: 本章以段落判据呈现，未设判据表');
  } else {
    console.log(`判据: 成组判据表 ${r.crit.tables} 张 / 数据行 ${r.crit.rows}；带同现项的行 ${items.length} 行，每行同现 ${min} 至 ${max} 项`);
  }
  console.log(`失效模式: ${r.modes} 条`);
  console.log('');
  console.log('样例记录（规则逐条判定）:');
  for (const s of r.samples) {
    const mark = s.kind === '依据式' && s.comparable ? '✅' : '❌';
    const why = s.kind === '依据式'
      ? (s.comparable ? '依据式·可比较' : '依据式·单点不可比较')
      : `${s.kind}（不可交接）`;
    console.log(`  ${mark} ${why.padEnd(12)} ← ${s.text}　〔${s.note}〕`);
  }
  const ok = r.samples.filter((s) => s.kind === '依据式' && s.comparable).length;
  console.log('');
  console.log(`结论: ${r.samples.length} 条例句里 ${ok} 条可交接；本章的判断要求成组同现，单点不构成判断。`);
  console.log('边界声明: 本输出为教学样例，数字由本章正文现算，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, hanzi, tableBlocks, dataRows, sectionText, classify, comparable, report, SAMPLES, CHAPTER, SLUG, TITLE };
