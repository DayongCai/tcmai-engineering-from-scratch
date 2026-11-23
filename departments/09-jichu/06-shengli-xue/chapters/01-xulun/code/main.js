#!/usr/bin/env node
/**
 * 生理学 · 第 1 章 绪论：把「稳态」写成一条可检查的回路
 * 课程正文: departments/09-jichu/06-shengli-xue/chapters/01-xulun/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本程序只读本章正文，所有计数与判别都由正文现算：
 *   规模（汉字 / 各级小节 / 表格 / 引文 / 加粗判断句）、关键词命中，
 *   以及本章的两条机制判别——反馈方向、调节方式的时间尺度分工。
 * 不读缓存、不读标准库 JSON：正文改了，程序与单测会同时报警。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

const read = () => fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
const hanzi = (s) => (String(s || '').match(CJK) || []).length;

/** 规模：正文的骨架有多厚（标题与表格只在围栏代码块之外计数） */
function shape(md) {
  const body = md.replace(/```[\s\S]*?```/g, '');
  const lines = body.split('\n');
  const count = (re) => lines.filter((l) => re.test(l)).length;
  return {
    hanzi: hanzi(body),
    h1: count(/^# /),
    h2: count(/^## /),
    h3: count(/^### /),
    h4: count(/^#### /),
    tables: count(/^\|/),
    paras: body.split(/\n{2,}/).filter((p) => hanzi(p) >= 40).length,
  };
}

/** 引文：《书名·篇名》级，本章要求每一条都带篇名 */
function citations(md) {
  const prose = md.replace(/```[\s\S]*?```/g, '');
  const out = [];
  for (const m of prose.matchAll(/《([^》·]{2,12})·([^》]{2,20})》/g)) out.push({ book: m[1], part: m[2] });
  return out;
}

/** 加粗判断句：本章把「可拿去用的判断」写成加粗句，句数本身就是论点密度 */
function judgments(md) {
  const prose = md.replace(/```[\s\S]*?```/g, '');
  const seen = new Set();
  for (const line of prose.split('\n')) {
    if (/^\s*[|#>]/.test(line)) continue;
    for (const m of line.matchAll(/\*\*([^*]{4,40})\*\*/g)) {
      const s = m[1].trim().replace(/[：:，,。；;]$/, '');
      if (hanzi(s) < 4) continue;
      if (/^(MOTTO|PROBLEM|双根因定位|免责声明|边界声明|教材出处)$/.test(s)) continue;
      seen.add(s);
    }
  }
  return [...seen];
}

/** 关键词命中：本章的笔墨落在哪几个概念上 */
const KEYWORDS = ['稳态', '调节', '反馈', '前馈', '回路'];
function keywords(md) {
  const prose = md.replace(/```[\s\S]*?```/g, '');
  const out = {};
  for (const k of KEYWORDS) out[k] = prose.split(k).length - 1;
  return out;
}

/** 「不给值」类边界句的条数：本章反复声明的取舍，可数 */
function boundaryHits(md) {
  return (md.match(/本书不给值|不写数值|不给正常值|不给单位|不提供数值/g) || []).length;
}

/**
 * 判别一：反馈方向。
 * 本章给的判据不是背定义，而是「看结果把原来的改变往哪边推」。
 * @param {'减小'|'加强'} effect
 */
function feedbackDirection(effect) {
  if (effect === '减小') return { type: '负反馈', why: '偏差被改小，条件回到适宜一侧' };
  if (effect === '加强') return { type: '正反馈', why: '沿原方向加强，把过程推向完成，不自行终止' };
  throw new Error('未知方向：' + effect);
}

/**
 * 判别二：反馈与前馈的差别只在时点。
 * @param {'已发生'|'将发生'} basis
 */
function controlTiming(basis) {
  if (basis === '已发生') return '反馈：依据已经发生的改变来纠正';
  if (basis === '将发生') return '前馈：依据对即将发生情况的判断提前安排';
  throw new Error('未知依据：' + basis);
}

/**
 * 判别三：三种调节按时间与范围分工，问「归谁管」不成立，
 * 该问「此刻哪一层在起主要作用」。
 * @param {'神经'|'体液'|'自身'} kind
 */
function regulationProfile(kind) {
  const T = {
    神经: { speed: '快', reach: '局限', basis: '反射弧五段' },
    体液: { speed: '慢', reach: '广而久', basis: '载体 + 靶细胞' },
    自身: { speed: '局部即时', reach: '最小', basis: '局部条件变化' },
  };
  if (!T[kind]) throw new Error('未知调节方式：' + kind);
  return { kind, ...T[kind] };
}

/** 反射弧五环节：本章唯一被写成完整回路的调节方式靠它落地 */
const ARC = ['感受器', '传入神经', '神经中枢', '传出神经', '效应器'];
function arcComplete(md) {
  return ARC.every((k) => md.includes(k));
}

function main() {
  const md = read();
  const s = shape(md);
  const cites = citations(md);
  const judges = judgments(md);
  const kw = keywords(md);
  const ranked = Object.entries(kw).sort((a, b) => b[1] - a[1]);

  console.log('═══ 绪论：把「稳态」写成一条可检查的回路（生理学 第 1 章）═══');
  console.log(`正文（不含代码块）：${s.hanzi} 汉字 · ${s.h2} 个二级小节 · ${s.h3} 个三级 · ${s.h4} 个四级 · ${s.tables} 行表格 · ${s.paras} 个成段段落`);
  console.log(`引文：《书名·篇名》级 ${cites.length} 条 → ${[...new Set(cites.map((c) => `《${c.book}·${c.part}》`))].join(' ')}`);
  console.log(`加粗判断句 ${judges.length} 条（句数即论点密度，不按字数估）`);
  console.log('');
  console.log('关键词命中：');
  for (const [k, v] of ranked) console.log(`  ${k.padEnd(3)} ${String(v).padStart(3)} 次`);
  console.log(`  → 笔墨最重的是「${ranked[0][0]}」：本章要它从口号变成回路，而不是再背一遍定义。`);
  console.log('');
  console.log('两条判别（本章的判断都是方向题，不是数值题）：');
  for (const e of ['减小', '加强']) {
    const r = feedbackDirection(e);
    console.log(`  结果使原改变${e} → ${r.type}（${r.why}）`);
  }
  console.log(`  依据${'已发生'}的改变 → ${controlTiming('已发生')}`);
  console.log(`  依据${'将发生'}的情况 → ${controlTiming('将发生')}`);
  console.log('');
  console.log(`反射弧五环节在正文里${arcComplete(md) ? '写全' : '未写全'}：${ARC.join('—')}`);
  console.log(`「不给值」类边界句 ${boundaryHits(md)} 处——不给值是取舍，不是遗漏。`);
  console.log('教学边界：本章只说明类别、关系与调节框架，不写数值与单位与正常值，不构成诊断或用药依据。');

  return { shape: s, cites, judges, kw, arc: arcComplete(md), boundary: boundaryHits(md) };
}

if (require.main === module) main();

module.exports = {
  DOC,
  ARC,
  KEYWORDS,
  read,
  hanzi,
  shape,
  citations,
  judgments,
  keywords,
  boundaryHits,
  feedbackDirection,
  controlTiming,
  regulationProfile,
  arcComplete,
  main,
};
