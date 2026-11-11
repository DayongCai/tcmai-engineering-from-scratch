#!/usr/bin/env node
/**
 * 病理生理学 · 第 23 章 限制性肺疾病（讲义第 23 章为第一文本）
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/23-restrictive-pulmonary-disorders/docs/zh.md
 * 第一文本: standards/binglishengli/supplements/jiangyi.json（讲义第 23 章，10 节）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要证的命题是「限制性疾病的共同点不是某个病名，而是装不下」，
 * 而这件事只能由讲义自己的用词重心来证——顺应性与通气在全章反复出现，
 * 弥散与分流只在肺内限制的几节里才登场，呼吸功与死腔则把力学后果接到通气效率上。
 * 手打的数字会在讲义改稿后静默过期；现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带讲义索引的那一级
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
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const BOOK = JSON.parse(fs.readFileSync(INDEX, 'utf8'));

const CHAPTER = 23;
const TITLE = '限制性肺疾病';
/** 用词重心的锚点：前四个属「装不下」的力学与交换，后两个属它带来的通气效率代价 */
const KEYS = ['顺应性', '通气', '弥散', '分流', '呼吸功', '死腔'];
/** 教学边界句：main.js 最后一行，也是单测与章级门共同依赖的字符串 */
const BOUNDARY = '教学边界：本章只说明讲义第 23 章限制性通气障碍的类别与关系，不写数值与单位与正常值，不构成诊断、治疗或用药依据';

const nonWs = (s) => String(s).replace(/\s/g, '').length;
const hanzi = (s) => (String(s).match(/[\u4e00-\u9fff]/g) || []).length;
const countOf = (flat, k) => flat.split(k).length - 1;

/** 讲义第 CHAPTER 章：节号、标题、段落原文，一律取自 jiangyi.json，不手抄 */
function chapterOf(no = CHAPTER) {
  for (const u of BOOK.units) {
    for (const c of u.chapters) {
      if (Number(c.no) !== no) continue;
      return {
        no,
        unit: c.unit || u.unit,
        title: c.title,
        secs: (c.secs || []).map((s) => ({
          no: s.no,
          title: s.title || '',
          paras: s.paras || [],
          text: (s.paras || []).join('\n'),
        })),
      };
    }
  }
  throw new Error(`讲义里没有第 ${no} 章`);
}

/** 规模：节数 / 段数 / 非空白字 / 汉字 */
function shape(ch) {
  const chars = ch.secs.reduce((n, s) => n + nonWs(s.text), 0);
  const paras = ch.secs.reduce((n, s) => n + s.paras.length, 0);
  return {
    secs: ch.secs.length,
    paras,
    chars,
    hanzi: ch.secs.reduce((n, s) => n + hanzi(s.text), 0),
  };
}

/** 用词重心：关键词在全章的计数，用来说明「讲义把笔墨放在哪」 */
function keyCounts(ch, keys = KEYS) {
  const flat = ch.secs.map((s) => s.text).join('\n');
  return keys.map((k) => ({ key: k, n: countOf(flat, k) }));
}

/** 每节落在哪几节里才有这个词——回答「弥散是不是全章都在谈」这类问题 */
function secsWith(ch, key) {
  return ch.secs.filter((s) => s.text.includes(key)).map((s) => s.no);
}

const CITE_RE = /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/g;
const BARE_RE = /[0-9]+(\.[0-9]+)?\s*(mmHg|kPa|℃|mmol|μmol|mg|μg|ng|g\/L|mol|%|次\/分|mL|ml|L\/min|kg|cm|mm|U\/L|IU)/;
const isCite = (line) => /补充·hermes-病理生理学讲义·第\s*\d+\s*章·\d+\.\d+/.test(line);
const isQuoteLine = (line) => /^\s*>/.test(line);

/**
 * docs 自查：把章级门的四道口径在本章内复算一遍——
 * 引文条数与节号归属、节号覆盖、「」引语逐字、正文零裸值。
 * 自查通过不代表门通过（门还核 quiz 与 outputs），但自查不过，门一定不过。
 */
function docsAudit(ch) {
  if (!fs.existsSync(DOC)) return { missing: true };
  const doc = fs.readFileSync(DOC, 'utf8');
  const lines = doc.split(/\r?\n/);
  const flat = ch.secs.map((s) => s.text).join('\n');

  const cites = [...doc.matchAll(CITE_RE)].map((m) => ({ ch: Number(m[1]), sec: m[2] }));
  const wrongCh = cites.filter((c) => c.ch !== ch.no);
  const unknownSec = cites.filter((c) => !ch.secs.some((s) => s.no === c.sec));

  const quotes = [];
  for (const l of lines) {
    if (isCite(l) || isQuoteLine(l)) continue;
    for (const m of l.matchAll(/「([^「」]{6,})」/g)) quotes.push(m[1]);
  }
  const lostQuotes = quotes.filter((q) => !flat.includes(q));

  const bare = lines.filter((l) => !isCite(l) && !isQuoteLine(l) && BARE_RE.test(l));
  const uncovered = ch.secs.filter((s) => !doc.includes(s.no)).map((s) => s.no);

  return {
    missing: false,
    chars: nonWs(doc),
    cites: cites.length,
    sectionsCited: new Set(cites.map((c) => c.sec)).size,
    wrongCh: wrongCh.length,
    unknownSec: unknownSec.map((c) => c.sec),
    quotes: quotes.length,
    lostQuotes,
    bare: bare.length,
    uncovered,
  };
}

function main() {
  const ch = chapterOf();
  const s = shape(ch);
  const keys = keyCounts(ch);
  const audit = docsAudit(ch);

  console.log(`═══ ${TITLE}（病理生理学 第${CHAPTER}章 · 讲义 ${ch.unit}）═══`);
  console.log(`讲义规模: ${s.secs} 节 · ${s.chars} 非空白字 · ${s.hanzi} 汉字 · ${s.paras} 段 · 平均每节 ${Math.round(s.chars / s.secs)} 字`);
  console.log('用词重心（讲义第 23 章全章计数）：');
  for (const k of keys) console.log(`  ${k.key.padEnd(4, '　')} ${String(k.n).padStart(3)} 次`);
  console.log('');
  console.log(`节内落位（节号 / 标题 / 非空白字），合计 ${s.secs} 节：`);
  for (const sec of ch.secs) console.log(`  ${sec.no} ${sec.title} · ${nonWs(sec.text)} 字`);
  console.log('');
  console.log(`「弥散」出现的节：${secsWith(ch, '弥散').join('、')}（肺内限制才谈弥散，肺外限制不谈）`);
  console.log(`「呼吸功」出现的节：${secsWith(ch, '呼吸功').join('、')}`);
  console.log('');
  if (audit.missing) {
    console.log('docs 自查: docs/zh.md 尚未写出');
  } else {
    console.log(`docs 自查: 正文 ${audit.chars} 非空白字 · 引文 ${audit.cites} 条（覆盖 ${audit.sectionsCited}/${s.secs} 节）· 引语逐字失配 ${audit.lostQuotes.length} 条 · 裸值 ${audit.bare} 行 · 未覆盖节 ${audit.uncovered.length}`);
    if (audit.wrongCh) console.log(`  ⚠ ${audit.wrongCh} 条引文引到了别的章`);
    if (audit.unknownSec.length) console.log(`  ⚠ 引文节号不在本章：${audit.unknownSec.join('、')}`);
    for (const q of audit.lostQuotes) console.log(`  ⚠ 引语查不到：${q.slice(0, 24)}`);
  }
  console.log('');
  console.log(BOUNDARY);

  return { ch, shape: s, keys, audit };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  CHAPTER,
  TITLE,
  KEYS,
  BOUNDARY,
  nonWs,
  hanzi,
  countOf,
  chapterOf,
  shape,
  keyCounts,
  secsWith,
  docsAudit,
  main,
};

// 末行契约：main() 打印的最后一句就是下面这句；章级门按文件末三行核「教学边界」，所以在此复写一次。
// 教学边界：本章只说明讲义第 23 章限制性通气障碍的类别与关系，不写数值与单位与正常值，不构成诊断、治疗或用药依据

