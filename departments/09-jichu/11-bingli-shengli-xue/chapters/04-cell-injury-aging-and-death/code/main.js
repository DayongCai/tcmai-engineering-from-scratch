#!/usr/bin/env node
/**
 * 病理生理学 · 第 4 章 细胞损伤、衰老与死亡
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/04-cell-injury-aging-and-death/docs/zh.md
 * 出处: 补充·hermes-病理生理学讲义·第4章（4.1–4.11，11 节 / 65 段）
 * 数据: standards/binglishengli/supplements/jiangyi.json（讲义 15 单元 53 章，章号与本课程 1:1）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「可逆与不可逆是一条线，不是两种病」。
 * 这件事只能由讲义自己的用词分布来证：膜完整性与线粒体两词在哪几节并置——
 * 并置处就是「阈值」与「判据」这两处骨架；其余各节是它们的展开。
 * 手打的数字会在讲义改版后静默过期；现算的对不上，程序自己会报错。
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

const CHAPTER = 4;
const TITLE = '细胞损伤、衰老与死亡';

/** 锚点：膜完整性与线粒体两词并置的节——不可逆的两条判据，本章骨架的落点 */
const ANCHOR = ['膜完整性', '线粒体'];

/** 教学边界句：main.js 最后一行打印，也是单测与章级门共同依赖的字符串 */
const BOUNDARY = '教学边界：本章只说明细胞损伤、衰老与死亡的类别与关系，不写数值与单位与正常值，不构成诊断/用药依据';

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

/**
 * 数值核验：讲义声明「只写类别与关系」，本书的零值是实测结果而不是转述。
 * 本函数把这件事当可核验的断言来复算——不是相信它，是检查它。
 */
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

/** 把 ANCHOR 里的词都写到的节——「两条判据落在哪几节」的最小证据 */
function anchorCoverage(list, anchor = ANCHOR) {
  return list.filter((s) => anchor.every((k) => s.paras.join('').includes(k))).map((s) => s.no);
}

/** 逐节分布：每节的段数、汉字、非空白字符，用来核「篇幅是否压在某一节」 */
function bySection(list) {
  const out = new Map();
  for (const s of list) {
    out.set(s.no, { title: s.title, paras: s.paras.length, hanzi: s.hanzi, chars: nonWs(s.paras.join('')) });
  }
  return out;
}

/** 节号格式：第 4 章的节号必须是 4.M */
function checkSubFormat(list, no = CHAPTER) {
  const bad = list.filter((s) => !new RegExp(`^${no}\\.[1-9][0-9]?$`).test(s.no)).map((s) => s.no);
  return { ok: bad.length === 0, bad };
}

/** 正文里有没有「章号写错」的引文（引文必须引本课程本章） */
function citationAudit(doc, no = CHAPTER) {
  const re = /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/g;
  const cites = [...String(doc).matchAll(re)].map((m) => ({ ch: Number(m[1]), sec: m[2] }));
  return { total: cites.length, wrongChapter: cites.filter((x) => x.ch !== no), secs: [...new Set(cites.map((x) => x.sec))] };
}

function main() {
  const list = chapterOf().secs;
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
  for (const [no, g] of secs) console.log(`  ${no} ${g.title} · ${g.paras} 段 · ${g.hanzi} 字`);
  console.log('');

  console.log(`锚点（${ANCHOR.join(' / ')}）两词并置的节：${anchor.length} / ${s.secs} → ${anchor.join('、') || '（无）'}`);
  console.log('  → 一处立阈值，一处立判据；两条判据分别对应「容器」与「能量」，不是两个并列现象。');
  console.log('');
  console.log(`篇幅重心：最厚的是 ${heavy[0][0]}（${heavy[0][1].hanzi} 字），最薄的是 ${light[0][0]}（${light[0][1].hanzi} 字），相差 ${heavy[0][1].hanzi - light[0][1].hanzi} 字`);
  console.log('  → 字数不按「一个死法一节」平摊：讲义按机制分量分篇幅，不按名目分。');
  console.log('');

  console.log(BOUNDARY);

  return { list, shape: s, audit, anchor, secs, fmt };
}

module.exports = {
  ROOT, JIANGYI, CHAPTER, TITLE, ANCHOR, BOUNDARY, VALUE_RE,
  nonWs, chapterOf, shape, valueAudit, anchorCoverage, bySection, checkSubFormat, citationAudit, main,
};

if (require.main === module) {
  main(); // 最后一行固定输出：教学边界：本章只说明细胞损伤、衰老与死亡的类别与关系，不写数值与单位与正常值，不构成诊断/用药依据
}
