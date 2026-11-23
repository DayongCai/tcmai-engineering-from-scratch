#!/usr/bin/env node
/**
 * 中医护理技术 · 第 4 章 轻手法不是低风险，是低信号
 * 课程: departments/05-huli/04-zhongyi-huli-jishu/chapters/04-anmo-tiefu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现算：按压三档、四类不适用、贴敷三个变量、贴敷观察三段，
 * 以及「按是压进去、贴是留在上面」的物理量分工与揭除顺序。
 * 正文不给力度值、贴敷时长与药物配比，本脚本也不补。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '轻手法不是低风险，是低信号';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const count = (t, w) => (w ? t.split(w).length - 1 : 0);
const squash = (t) => t.replace(/\s+/g, '');

const LEDGER = [
  { label: '按压三档', items: ['一档：可接受', '二档：过强', '三档：异常'] },
  { label: '四类不适用', items: ['局部不可压', '部位不可压', '全身状态不适宜', '不能表达者'] },
  { label: '贴敷三个变量', items: ['药物类别', '接触面积', '留置时长'] },
  { label: '贴敷观察三段', items: ['贴后即刻', '留置中', '揭除后'] },
];

const SEQUENCES = [
  { label: '揭除顺序：先看，再清洁，再决定后续', words: ['先看', '再清洁', '再决定后续'] },
];

const ORDERS = [
  { label: '物理量分工：按是压力，贴是接触', before: '按压的物理量是压力', after: '贴敷的物理量是接触' },
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
  console.log('※ 教学演示用，不构成操作指导；力度、时长与用药以现行规范、机构制度与医嘱为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, LEDGER, SEQUENCES, ORDERS };
