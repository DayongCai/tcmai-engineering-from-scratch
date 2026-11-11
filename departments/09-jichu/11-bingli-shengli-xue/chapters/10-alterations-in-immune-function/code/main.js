#!/usr/bin/env node
/**
 * 病理生理学 · 第 10 章 免疫功能异常
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/10-alterations-in-immune-function/docs/zh.md
 * 出处: 补充·hermes-病理生理学讲义·第10章（10 节）
 * 数据: standards/binglishengli/supplements/jiangyi.json（讲义 15 单元 53 章）
 * 依赖: 仅 Node.js 标准库
 *
 *  * 为什么全部现算：本章要讲的命题是「免疫病不是强弱问题，是识别、强度与时相三条约束里断了一条」。
 * 这个判断只能由讲义自己的组织来证：四型超敏各占一节，缺陷与排斥各占一节，
 * 每节都落在「谁在识别、谁在执行」上。手打的数字会在讲义改版后静默过期。
 *
 * 一处口径：讲义章号与本课程章号 1:1。引文只写
 * 「补充·hermes-病理生理学讲义·第10章·节号」，节号取讲义原号，
 * 不按本课程重排；讲义是原创教学正文，不是任何外文教材的译本。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 standards/binglishengli 的那一级
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 14; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'binglishengli', 'supplements', 'jiangyi.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/binglishengli/supplements/jiangyi.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const INDEX = path.join(ROOT, 'standards', 'binglishengli', 'supplements', 'jiangyi.json');

const CHAPTER = 10;
const TITLE = '免疫功能异常';

/** 章级锚点一：这组词只在本章某一节同时出现，那节就是全章的枢轴 */
const ANCHOR = ['识别正确', '强度适度', '及时关闭'];

/** 章级锚点二：第二组词，用来核「另一条线索也只在某一节齐备」 */
const FRAME = ['致敏', '激发'];

/** 观察词表：用来描述讲义把笔墨放在哪几类环节上（不描述难度，只描述写法） */
const LEXICON = ['超敏', '复合物', '耐受', '缺陷', '排斥', '免疫抑制', '脱颗粒'];

/** 教学边界句：main.js 最后一行，也是单测与章级门共同依赖的字符串 */
const BOUNDARY = '教学边界：本章只说明讲义给出的类别与环节，不写数值与单位与正常值，不构成诊断、治疗或用药依据';

const locatorOf = (sec) => `补充·hermes-病理生理学讲义·第${CHAPTER}章·${sec}`;
const nonWs = (s) => String(s || '').replace(/\s/g, '');
const textOf = (s) => (s.paras || []).join('\n');

/** 讲义里本课程第 CHAPTER 章：节清单 + 所属单元 */
function sourceOf() {
  const idx = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
  for (const u of idx.units) {
    for (const c of u.chapters) {
      if (Number(c.no) === CHAPTER) return { unit: u.unit, chapter: c };
    }
  }
  throw new Error(`讲义里没有第 ${CHAPTER} 章`);
}

/** 本章的节：每节带正文、汉字数、非空白字符数，出处按节号现组 */
function chapterSecs() {
  const { unit, chapter } = sourceOf();
  return chapter.secs.map((s) => {
    const text = textOf(s);
    return {
      sec: s.no,
      title: s.title,
      unit,
      locator: locatorOf(s.no),
      text,
      hanzi: s.hanzi || 0,
      chars: nonWs(text).length,
      paras: (s.paras || []).length,
    };
  });
}

/** 规模：节数 / 非空白字符 / 汉字 / 段落数，后者是本章讲义字数的口径 */
function shape(list) {
  return {
    secs: list.length,
    chars: list.reduce((n, s) => n + s.chars, 0),
    hanzi: list.reduce((n, s) => n + s.hanzi, 0),
    paras: list.reduce((n, s) => n + s.paras, 0),
    widest: list.slice().sort((a, b) => b.chars - a.chars)[0].sec,
    narrowest: list.slice().sort((a, b) => a.chars - b.chars)[0].sec,
  };
}

/** 观察词表：逐词统计在节正文里的出现次数（含表格行，按原样匹配） */
function tally(list) {
  const counts = {};
  for (const k of LEXICON) counts[k] = 0;
  for (const s of list) for (const k of LEXICON) counts[k] += s.text.split(k).length - 1;
  return counts;
}

const rank = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);

/**
 * 数值核验：讲义在本章写不写「数字＋计量单位」，是实测结果而不是声明。
 * 本函数把它当可核验的断言复算——不是相信它，是检查它。
 */
function valueAudit(list) {
  const RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|mmol|μmol|mg|μg|ng|g\/L|mol|%|次\/分|mL|ml|L\/min|kg|cm|mm|U\/L)/g;
  let hits = 0;
  const offenders = [];
  for (const s of list) {
    const n = (s.text.match(RE) || []).length;
    if (n) { hits += n; offenders.push(s.sec); }
  }
  return { secs: list.length, hits, offenders };
}

/** 把一组词都写到的节——「这条线索只在某一节齐备」的最小证据 */
function anchorCoverage(list, words = ANCHOR) {
  return list.filter((s) => words.every((k) => s.text.includes(k))).map((s) => s.sec);
}

/** 节号格式：第 10 章必须是 10.M */
function checkSecFormat(list) {
  const bad = list.filter((s) => !new RegExp(`^${CHAPTER}\\.[1-9][0-9]*$`).test(s.sec)).map((s) => s.sec);
  return { ok: bad.length === 0, bad };
}

function main() {
  const list = chapterSecs();
  const s = shape(list);
  const counts = tally(list);
  const audit = valueAudit(list);
  const anchor = anchorCoverage(list);
  const frame = anchorCoverage(list, FRAME);
  const fmt = checkSecFormat(list);

  console.log(`═══ ${TITLE}（病理生理学 第${CHAPTER}章）═══`);
  console.log(`讲义规模: ${s.secs} 节 · ${s.chars} 非空白字符 · ${s.hanzi} 汉字 · ${s.paras} 段 · 平均每节 ${Math.round(s.chars / s.secs)} 非空白字`);
  console.log(`口径核验: 本章 ${audit.secs} 节的数值型命中 ${audit.hits} 处（讲义 valueLike 复算，不照抄声明）`);
  console.log(`节号格式: ${fmt.ok ? `全部合规（${CHAPTER}.M）` : '异常 ' + fmt.bad.join('、')}`);
  console.log(`篇幅分布: 最宽 ${s.widest} · 最窄 ${s.narrowest}`);
  console.log('');

  console.log(`观察词表（${LEXICON.join(' / ')}）本章词频：`);
  for (const [k, v] of rank(counts)) console.log(`  ${k} ${String(v).padStart(4)} 次`);
  console.log('');

  console.log(`逐条（节号 / 标题 / 汉字 / 出处），合计 ${s.secs} 节、${s.chars} 非空白字符：`);
  for (const sec of list) console.log(`  ${sec.sec} ${sec.title} · ${sec.hanzi} 字 · ${sec.locator}`);
  console.log('');

  console.log(`锚点一（${ANCHOR.join(' / ')}）同节齐备：${anchor.length} / ${s.secs} → ${anchor.join('、') || '（无）'}`);
  console.log(`锚点二（${FRAME.join(' / ')}）同节齐备：${frame.length} / ${s.secs} → ${frame.join('、') || '（无）'}`);
  console.log('');

  console.log(BOUNDARY);

  return { list, shape: s, counts, audit, anchor, frame, fmt };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  CHAPTER,
  TITLE,
  ANCHOR,
  FRAME,
  LEXICON,
  BOUNDARY,
  sourceOf,
  locatorOf,
  chapterSecs,
  shape,
  tally,
  rank,
  total,
  valueAudit,
  anchorCoverage,
  checkSecFormat,
  main,
};

// 末行（`node code/main.js` 的最后一条输出，也是章级门检查的那一句）：
// 教学边界：本章只说明讲义给出的类别与环节，不写数值与单位与正常值，不构成诊断、治疗或用药依据
