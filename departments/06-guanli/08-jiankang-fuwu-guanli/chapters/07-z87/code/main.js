#!/usr/bin/env node
/**
 * 健康服务管理 · 第 7 章 改革的难点不在出政策，在最后一公里不改形
 * 课程: departments/06-guanli/08-jiankang-fuwu-guanli/chapters/07-z87/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出全部从本章正文现算：汉字、节、加粗判断、引文；六类政策工具由正文那个带括号的
 * 列举里数出来（括号内的顿号不算分隔）；减少失真的四条、获客四条红线、预付费三个环节
 * 分别计数并与中文数字对账；卷首的预收金额折算成月均，看「12 万元三年」是什么量级。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '改革的难点不在出政策，在最后一公里不改形';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const hanzi = (t) => (String(t || '').match(HANZI) || []).length;

function sections(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], hanzi: 0 };
      out.push(cur);
      continue;
    }
    if (cur) cur.hanzi += hanzi(line);
  }
  return out;
}

function clauseAfter(body, label) {
  const i = body.indexOf(label + '：');
  if (i < 0) throw new Error('正文里没找到「' + label + '：」');
  const rest = body.slice(i + label.length + 1);
  const j = rest.indexOf('。');
  return (j < 0 ? rest : rest.slice(0, j)).trim();
}

/** 只在括号外切分，括号内的顿号保留在条目里。 */
function splitTop(str, seps = /[、，]/) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(str)) {
    if (ch === '（' || ch === '(') depth += 1;
    if (ch === '）' || ch === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && seps.test(ch)) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function numbersBy(body, re) {
  const m = body.match(re);
  if (!m) throw new Error('正文里没找到：' + re);
  return m.slice(1).map((x) => Number(String(x).replace(/,/g, '')));
}

function audit(body) {
  const tools = splitTop(clauseAfter(body, '常用的是六类'));
  const reduceLoss = ['指标少而硬', '结果指标与过程指标配对', '抽查与第三方评估', '允许地方差异']
    .filter((k) => body.includes(k));
  const redLines = (body.match(/第[一二三四]条是/g) || []).length;
  const prepaidParts = splitTop(clauseAfter(body, '坏在三个环节'));

  const counts = {
    tools: tools.length,
    reduceLoss: reduceLoss.length,
    redLines,
    prepaidParts: prepaidParts.length,
  };
  const claims = [
    { label: '六类工具', want: 6, got: counts.tools },
    { label: '减少失真四条', want: 4, got: counts.reduceLoss },
    { label: '获客四条红线', want: 4, got: counts.redLines },
    { label: '预付费三个环节', want: 3, got: counts.prepaidParts },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);

  const [prepaidWan] = numbersBy(body, /一次性预收三年服务费\s*(\d+)\s*万元/);
  const years = body.includes('三年服务费') ? 3 : NaN;
  const [upsellRate] = numbersBy(body, /到店后加项率\s*(\d+)%/);

  const raw = { prepaidWan, years, upsellRate };
  const derived = {
    prepaidYuan: prepaidWan * 1e4,
    months: years * 12,
    perMonth: (prepaidWan * 1e4) / (years * 12),
  };

  return { tools, reduceLoss, redLines, prepaidParts, counts, claims, mismatched, raw, derived };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((x) => x[1]))];

  console.log(`健康服务管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 加粗判断 ${(body.match(/\*\*[^*\n]+\*\*/g) || []).length} 处 · 引书 ${cites.length} 部`);
  console.log('');
  console.log('结构清单（条数由正文数出，与句中的中文数字对账）：');
  console.log(`  六类政策工具 ${a.counts.tools} 类：`);
  a.tools.forEach((t, i) => console.log(`    ${i + 1}. ${t}`));
  console.log(`  减少失真 ${a.counts.reduceLoss} 条：${a.reduceLoss.join('／')}`);
  console.log(`  获客四条红线 ${a.counts.redLines} 条`);
  console.log(`  预付费三个环节 ${a.counts.prepaidParts} 个：${a.prepaidParts.join('／')}`);
  console.log(`  → 对账${a.mismatched.length ? '不一致，须改稿：' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('卷首数字复算：');
  const { raw, derived } = a;
  console.log(`  预收 ${raw.prepaidWan} 万元 / ${raw.years} 年 = 每月约 ${derived.perMonth.toFixed(0)} 元（合计 ${derived.prepaidYuan.toFixed(0)} 元，分 ${derived.months} 个月交付）`);
  console.log(`  → 一次性收进来的钱，是未来 ${derived.months} 个月的负债，不是当期收入。`);
  console.log(`  免费筛查引流的门店，到店加项率 ${raw.upsellRate}%：低价获客靠加项盈利。`);
  console.log('');
  console.log('逐节字数：');
  for (const s of secs) {
    const share = hanzi(body) ? ((s.hanzi / hanzi(body)) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(26, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('→ 判据：只谈目标不谈工具，政策就是文件里的正确话；配套不是同时做完所有事，而是让关键的两三件工具同向发力。');
  console.log('※ 数字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成法律或投资意见，也不构成对具体商业模式的合法性判断。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, hanzi, sections, clauseAfter, splitTop, audit };
