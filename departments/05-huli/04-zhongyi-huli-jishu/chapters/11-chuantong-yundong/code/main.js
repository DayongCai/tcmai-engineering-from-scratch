#!/usr/bin/env node
/**
 * 中医护理技术 · 第 11 章 导引的风险靶点从皮肤换成了心肺和关节
 * 课程: departments/05-huli/04-zhongyi-huli-jishu/chapters/11-chuantong-yundong/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现算：三处风险靶点、术前六方面、三档强度、四条停止线，
 * 以及「强度三档由轻到重」「不屏气先于不追幅度」两条判据。
 * 正文不给强度、时长、频次与幅度数值，本脚本也不推导。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 11;
const TITLE = '导引的风险靶点从皮肤换成了心肺和关节';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const count = (t, w) => (w ? t.split(w).length - 1 : 0);
const squash = (t) => t.replace(/\s+/g, '');

const LEDGER = [
  { label: '三处风险靶点', items: ['心肺', '关节与肌肉', '平衡与跌倒'] },
  { label: '术前六方面', items: ['心肺状态', '骨关节与肌肉', '平衡与跌倒史', '感觉与认知', '用药与时机', '意愿与环境'] },
  { label: '强度三档', items: ['呼吸略快', '说话断续', '说不出话'] },
  { label: '四条停止线', items: ['说不出完整的话', '胸闷', '关节出现锐痛', '面色苍白'] },
];

const SEQUENCES = [
  { label: '强度三档由轻到重', in: /动作与呼吸/, words: ['一档：适宜', '二档：偏强', '三档：过强'] },
];

const ORDERS = [
  { label: '两条纪律：不屏气先于不追幅度', before: '不屏气', after: '不追幅度' },
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
  console.log('※ 教学演示用，不构成操作指导，也不构成运动处方；功法与强度以评估及专业人员意见为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, LEDGER, SEQUENCES, ORDERS };
