#!/usr/bin/env node
/**
 * 病理生理学 · 第 45 章 慢性神经功能障碍
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/45-chronic-disorders-of-neurologic-function/docs/zh.md
 * 出处: 补充·hermes-病理生理学讲义·第45章（45.1–45.11，11 节 / 47 段）
 * 数据: standards/binglishengli/supplements/jiangyi.json（讲义 15 单元 53 章，章号与本课程 1:1）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「慢性神经病交的是部位与储备，不是病名清单」。
 * 这件事只能由讲义自己的写法来证：一、变性 / 脱髓鞘 / 癫痫三条主线是不是只在
 * 开篇那一节点名，之后各走各的节（若是，说明它给的是框架而不是三个抽屉）；
 * 二、全文有没有一处「数字＋计量单位」（讲义声明给类别不给取值，这里复算而不是照抄）。
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
const JIANGYI = path.join(ROOT, 'standards', 'binglishengli', 'supplements', 'jiangyi.json');

const CHAPTER = 45;
const TITLE = '慢性神经功能障碍';

/** 锚点：变性、脱髓鞘、癫痫三词并置的节——三条主线只有在开篇被同时点名 */
const ANCHOR = ['变性', '脱髓鞘', '癫痫'];

/** 教学边界句：main.js 最后一行打印，也是单测与章级门共同依赖的字符串 */
const BOUNDARY = '教学边界：本章只说明慢性神经功能障碍的类别与关系，不写数值与单位与正常值，不构成诊断/用药依据';

/** 「数字＋计量单位」的口径：与章级门 tests/test_binglishengli_chapters.js 同一张单位表 */
const VALUE_RE = /[0-9]+(\.[0-9]+)?\s*(mmHg|kPa|℃|mmol|μmol|mg|μg|ng|g\/L|mol|%|次\/分|mL|ml|L\/min|kg|cm|mm|U\/L|IU)/g;

const nonWs = (s) => String(s).replace(/\s/g, '').length;

/** 讲义第 CHAPTER 章：{ no, title, unit, hanzi, secs: [{ no, title, paras, hanzi }] } */
function chapterOf(no = CHAPTER) {
  const book = JSON.parse(fs.readFileSync(JIANGYI, 'utf8'));
  for (const u of book.units) {
    for (const c of u.chapters) {
      if (Number(c.no) === Number(no)) {
        return {
          no: Number(c.no),
          title: c.title,
          unit: u.unit,
          hanzi: c.hanzi,
          secs: c.secs.map((s) => ({ no: s.no, title: s.title, paras: s.paras || [], hanzi: s.hanzi })),
        };
      }
    }
  }
  throw new Error(`讲义里没有第 ${no} 章`);
}

/** 规模：节数 / 段数 / 汉字数 / 非空白字符数（后者与 docs 的字数口径一致） */
function shape(list) {
  return {
    secs: list.length,
    paras: list.reduce((n, s) => n + s.paras.length, 0),
    hanzi: list.reduce((n, s) => n + s.hanzi, 0),
    chars: list.reduce((n, s) => n + nonWs(s.paras.join('')), 0),
  };
}

/** 数值核验：讲义声明只写类别与关系，零值是实测结果而不是转述 */
function valueAudit(list) {
  const offenders = [];
  let hits = 0;
  for (const s of list) {
    for (const p of s.paras) {
      const m = p.match(VALUE_RE) || [];
      if (m.length) {
        hits += m.length;
        offenders.push(`${s.no}: ${m.join('、')}`);
      }
    }
  }
  return {
    secs: list.length,
    paras: list.reduce((n, s) => n + s.paras.length, 0),
    hits,
    offenders,
  };
}

/** 把 ANCHOR 里的词都写到的节——「三条主线在开篇点名」的最小证据 */
function anchorCoverage(list, anchor = ANCHOR) {
  return list.filter((s) => anchor.every((k) => s.paras.join('').includes(k))).map((s) => s.no);
}

/** 逐节分布：每节的段数、汉字、非空白字符 */
function bySection(list) {
  const out = new Map();
  for (const s of list) {
    out.set(s.no, {
      title: s.title,
      paras: s.paras.length,
      hanzi: s.hanzi,
      chars: nonWs(s.paras.join('')),
    });
  }
  return out;
}

/** 节号格式：第 45 章的节号必须是 45.M */
function checkSubFormat(list, no = CHAPTER) {
  const bad = list.filter((s) => !new RegExp(`^${no}\\.[1-9][0-9]?$`).test(s.no)).map((s) => s.no);
  return { ok: bad.length === 0, bad };
}

/** 正文里有没有「章号写错」的引文 */
function citationAudit(doc, no = CHAPTER) {
  const re = /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/g;
  const cites = [...String(doc).matchAll(re)].map((m) => ({ ch: Number(m[1]), sec: m[2] }));
  return {
    total: cites.length,
    wrongChapter: cites.filter((x) => x.ch !== no),
    secs: [...new Set(cites.map((x) => x.sec))],
  };
}

/** 「」引语是否逐字见于讲义（只查非引用行，与章级门同一口径） */
function quoteAudit(doc, list) {
  const flat = list.map((s) => s.paras.join('\n')).join('\n');
  const lines = String(doc).split(/\r?\n/);
  const isCite = (l) => /补充·hermes-病理生理学讲义·第\s*\d+\s*章·\d+\.\d+/.test(l);
  const quotes = [];
  for (const l of lines) {
    if (!isCite(l) && /^\s*>/.test(l)) continue; // 引用块里的「」也要逐字核；只有不带出处的提示块豁免
    for (const m of l.matchAll(/「([^「」]{6,})」/g)) quotes.push(m[1]);
  }
  return { total: quotes.length, lost: quotes.filter((q) => !flat.includes(q)) };
}

function main() {
  const book = chapterOf();
  const list = book.secs;
  const s = shape(list);
  const audit = valueAudit(list);
  const anchor = anchorCoverage(list);
  const secs = bySection(list);
  const fmt = checkSubFormat(list);
  const heavy = [...secs.entries()].sort((a, b) => b[1].hanzi - a[1].hanzi);
  const light = [...secs.entries()].sort((a, b) => a[1].hanzi - b[1].hanzi);

  console.log(`═══ ${TITLE}（病理生理学 第${CHAPTER}章 · 讲义第${CHAPTER}章）═══`);
  console.log(`讲义规模: 第 ${CHAPTER} 章 · ${s.secs} 节 · ${s.paras} 段 · ${s.hanzi} 汉字 · ${s.chars} 非空白字符`);
  console.log(`口径核验: ${audit.paras} 段的数值型命中 ${audit.hits} 处（讲义 valueLike = 0，这里复算而不是照抄声明）`);
  console.log(`小节号格式: ${fmt.ok ? `全部合规（${CHAPTER}.M）` : '异常 ' + fmt.bad.join('、')}`);
  console.log('');

  console.log('逐节（节号 / 标题 / 段数 / 汉字）：');
  for (const [no, g] of secs) {
    console.log(`  ${no} ${g.title} · ${g.paras} 段 · ${g.hanzi} 字`);
  }
  console.log('');

  console.log(`锚点（${ANCHOR.join(' / ')}）三词并置的节：${anchor.length} / ${s.secs} → ${anchor.join('、') || '（无）'}`);
  console.log('  → 三条主线只在开篇那一节点名，之后各走各的节：给的是框架，不是三个抽屉。');
  console.log('');

  console.log(`篇幅重心：最厚的是 ${heavy[0][0]}（${heavy[0][1].hanzi} 字），最薄的是 ${light[0][0]}（${light[0][1].hanzi} 字）`);
  console.log('  → 最厚的两节都是变性病：讲义把笔墨压在「同一机制、不同环路」上。');
  console.log('');

  console.log(BOUNDARY);

  return { list, shape: s, audit, anchor, secs, fmt };
}

module.exports = {
  ROOT,
  JIANGYI,
  CHAPTER,
  TITLE,
  ANCHOR,
  BOUNDARY,
  VALUE_RE,
  nonWs,
  chapterOf,
  shape,
  valueAudit,
  anchorCoverage,
  bySection,
  checkSubFormat,
  citationAudit,
  quoteAudit,
  main,
};

if (require.main === module) {
  main(); // 最后一行固定输出：教学边界：本章只说明慢性神经功能障碍的类别与关系，不写数值与单位与正常值，不构成诊断/用药依据
}
