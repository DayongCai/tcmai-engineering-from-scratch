#!/usr/bin/env node
/**
 * 中医护理技术 · 第 1 章 「适宜」指的是资源可及，不是风险低
 * 课程: departments/05-huli/04-zhongyi-huli-jishu/chapters/01-gaishu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的分析对象是正文本身：汉字、节、表格、三档判据是否齐全、五类技术的
 * 「量—靶器官」是否各自落地、记录字段是否齐，以及「禁忌先于适应证」「先处理条件
 * 再缩小范围」这两条顺序判据。正文改一个字，这里的结果就跟着变。
 * 正文不给温度、时长、剂量、疗程，本脚本也不补。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '「适宜」指的是资源可及，不是风险低';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const count = (t, w) => (w ? t.split(w).length - 1 : 0);
const squash = (t) => t.replace(/\s+/g, '');

// 每组词应在正文里各自出现；命中几项就是「落地几项」。
const LEDGER = [
  { label: '三档判据（甲/乙/丙）', items: ['甲：不可做', '乙：调条件后做', '丙：可做'] },
  { label: '五类技术与量—靶器官', items: ['温热类', '负压与机械类', '经皮给药类', '穴位刺激类', '饮食情志类'] },
  {
    label: '记录字段',
    items: ['术式与部位侧别', '术前基线', '禁忌核对结论', '参数执行口径', '观察所见', '异常与处置', '报告对象'],
  },
];

// 词序判据：在指定小节内按顺序出现，才算「正文这么写」。
const SEQUENCES = [
  { label: '核对顺序：禁忌先于适应证', words: ['先排禁忌', '再看适应证'] },
];

// 先后判据：前一个词在正文中必须先于后一个词出现。
const ORDERS = [
  { label: '乙档处置：先处理条件，再缩小范围', before: '先处理条件', after: '缩小范围' },
];

function sectionsOf(body) {
  const out = [];
  let cur = { title: '（题头）', text: '' };
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], text: '' };
      out.push(cur);
      continue;
    }
    cur.text += line + '\n';
  }
  for (const s of out) {
    s.hanzi = (s.text.match(HANZI) || []).length;
    s.flat = squash(s.text);
  }
  return out;
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const flat = squash(body);
  const sections = sectionsOf(body);
  const scoped = (re) => {
    if (!re) return flat;
    const s = sections.find((x) => re.test(x.title));
    return s ? s.flat : '';
  };
  return {
    hanzi: (body.match(HANZI) || []).length,
    sections,
    tables: (body.match(/^\s*\|[\s:|-]+\|\s*$/gm) || []).length,
    ledger: LEDGER.map((g) => ({
      label: g.label,
      items: g.items.map((w) => ({ w, n: count(flat, squash(w)) })),
    })),
    sequences: SEQUENCES.map((s) => {
      const scope = scoped(s.in);
      const at = s.words.map((w) => scope.indexOf(squash(w)));
      return {
        label: s.label,
        words: s.words,
        at,
        ok: at.every((p, i) => p >= 0 && (i === 0 || p > at[i - 1])),
      };
    }),
    orders: ORDERS.map((o) => {
      const a = flat.indexOf(squash(o.before));
      const b = flat.indexOf(squash(o.after));
      return { label: o.label, a, b, ok: a >= 0 && b >= 0 && a < b };
    }),
  };
}

function main() {
  const a = analyze(read());
  console.log(`中医护理技术 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下结果均从本章 docs/zh.md 现算，不手打）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 二级标题 ${a.sections.length} 节 · 表格 ${a.tables} 张`);
  console.log('');
  for (const g of a.ledger) {
    const hit = g.items.filter((i) => i.n > 0);
    console.log(`${g.label}：${hit.length}/${g.items.length} 项在正文落地`);
    if (hit.length) console.log('  ' + hit.map((i) => `${i.w}（${i.n}）`).join(' · '));
  }
  console.log('');
  for (const s of a.sequences) {
    console.log(`${s.label}：${s.ok ? '顺序与正文一致' : '正文顺序与此不符'}`);
  }
  for (const o of a.orders) {
    console.log(`${o.label}：${o.ok ? '正文如此排列' : '正文未按此排列'}`);
  }
  console.log('');
  console.log('※ 教学演示用，不构成操作指导；参数与禁忌以现行规范、机构制度与医嘱为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, LEDGER, SEQUENCES, ORDERS };
