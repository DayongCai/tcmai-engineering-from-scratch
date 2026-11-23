#!/usr/bin/env node
/**
 * 中医护理技术 · 第 5 章 灸与罐真正要控的是两个不可逆的量
 * 课程: departments/05-huli/04-zhongyi-huli-jishu/chapters/05-aijiu-baguan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现算：灸的三个量、罐的三个量、三类不适用、四条停止线，
 * 晕灸晕罐五步的顺序，以及「先问感觉，再看皮肤」的核对顺序。
 * 正文不给灸距、壮数、留罐时长与负压值，本脚本也不推导。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '灸与罐真正要控的是两个不可逆的量';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const count = (t, w) => (w ? t.split(w).length - 1 : 0);
const squash = (t) => t.replace(/\s+/g, '');

const LEDGER = [
  { label: '灸的三个量', items: ['热源与皮肤的距离', '单次持续的时间', '累计作用的面积'] },
  { label: '罐的三个量', items: ['负压强度', '留置时长', '施罐面积'] },
  { label: '三类不适用', items: ['皮不可用', '感觉不可靠', '热或负压会加重'] },
  { label: '四条停止线', items: ['主诉说', '皮肤颜色走出', '全身反应出现', '沉默或绷紧'] },
];

const SEQUENCES = [
  { label: '晕灸晕罐五步', in: /晕灸与晕罐/, words: ['停', '卧', '暖', '通风', '报告'] },
];

const ORDERS = [
  { label: '核对顺序：先问感觉，再看皮肤', before: '先问感觉', after: '再看皮肤' },
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
  console.log('※ 教学演示用，不构成操作指导；灸距、壮数、负压与留罐时长以现行规范与机构制度为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, LEDGER, SEQUENCES, ORDERS };
