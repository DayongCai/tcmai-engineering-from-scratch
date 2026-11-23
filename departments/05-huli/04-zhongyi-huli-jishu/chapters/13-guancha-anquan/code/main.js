#!/usr/bin/env node
/**
 * 中医护理技术 · 第 13 章 观察记录、安全与效果评价
 * 课程: departments/05-huli/04-zhongyi-huli-jishu/chapters/13-guancha-anquan/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现算：观察三层、记录五组字段、报告三时点、评价四维、三条禁令，
 * 以及「中止四步」「观察先于记录」两处顺序。
 * 正文不给报告时限、观察频次与量表条目，本脚本也不生成。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 13;
const TITLE = '观察、记录、评价是同一条链上的三次落笔';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const count = (t, w) => (w ? t.split(w).length - 1 : 0);
const squash = (t) => t.replace(/\s+/g, '');

const LEDGER = [
  { label: '观察三层', items: ['局部', '全身', '主观'] },
  { label: '记录五组字段', items: ['基线与依据', '过程', '所见', '处置与报告', '交代'] },
  { label: '报告三时点', items: ['即时报告', '当班报告', '事后报告'] },
  { label: '评价四维', items: ['主观感受', '症状变化', '依从性与满意度', '反馈渠道'] },
  { label: '三条禁令', items: ['不作疗效断言', '不作优越性比较', '不作分值与等级判定'] },
];

const SEQUENCES = [
  { label: '中止四步顺序', in: /三、安全/, words: ['先去掉刺激源', '再评估', '再处置', '再报告'] },
];

const ORDERS = [
  { label: '先观察，后记录', before: '观察发生在', after: '记录发生在' },
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
  console.log('※ 教学演示用，不构成操作指导，也不构成法律意见；报告时限与记录格式以现行规范与机构制度为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, LEDGER, SEQUENCES, ORDERS };
