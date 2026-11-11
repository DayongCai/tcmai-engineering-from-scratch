#!/usr/bin/env node
/**
 * 病理生理学 · 第 26 章 肾脏功能（讲义第 26 章为第一文本）
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/26-renal-function/docs/zh.md
 * 第一文本: standards/binglishengli/supplements/jiangyi.json（讲义第 26 章，11 节）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要证的命题是「尿液的生成是一条四环节的链：滤过、重吸收与分泌、
 * 浓缩稀释、排出，任一环节出问题都能用尿量、尿成分、尿渗透压三个维度定位」，
 * 而这件事只能由讲义自己的用词结构来证——滤过与重吸收各自出现在哪几节、
 * 浓缩为什么只与髓袢和集合管绑定、内分泌四产物分布在哪一节。
 * 手打的数字会在讲义改稿后静默过期；现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

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

const CHAPTER = 26;
const TITLE = '肾脏功能';
/** 用词重心的锚点：前四个是四环节，后两个是它的出口与调控 */
const KEYS = ['滤过', '重吸收', '浓缩', '梯度', '激素', '排出'];
/** 四环节：讲义给的那张整体图景 */
const STAGES = ['滤过', '重吸收', '浓缩', '排出'];
/** 教学边界句：main.js 最后一行，也是单测与章级门共同依赖的字符串 */
const BOUNDARY = '教学边界：本章只说明讲义第 26 章肾功能环节的类别与关系，不写数值与单位与正常值，不构成诊断、治疗或用药依据';

const nonWs = (s) => String(s).replace(/\s/g, '').length;
const hanzi = (s) => (String(s).match(/[\u4e00-\u9fff]/g) || []).length;
const countOf = (flat, k) => flat.split(k).length - 1;

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

function shape(ch) {
  return {
    secs: ch.secs.length,
    paras: ch.secs.reduce((n, s) => n + s.paras.length, 0),
    chars: ch.secs.reduce((n, s) => n + nonWs(s.text), 0),
    hanzi: ch.secs.reduce((n, s) => n + hanzi(s.text), 0),
  };
}

function keyCounts(ch, keys = KEYS) {
  const flat = ch.secs.map((s) => s.text).join('\n');
  return keys.map((k) => ({ key: k, n: countOf(flat, k) }));
}

function secsWith(ch, key) {
  return ch.secs.filter((s) => s.text.includes(key)).map((s) => s.no);
}

/** 四环节分布：每个环节落在哪几节，用来说明「链」而不是「堆」 */
function stageMap(ch, stages = STAGES) {
  return stages.map((k) => ({ stage: k, secs: secsWith(ch, k) }));
}

/** 内分泌四产物：肾素、促红细胞生成素、活性维生素 D、前列腺素 */
const HORMONES = ['肾素', '促红细胞生成素', '活性维生素 D', '前列腺素'];

function hormoneBoard(ch) {
  const sec = ch.secs.find((s) => s.no === '26.8');
  return HORMONES.map((h) => ({ name: h, inSec: Boolean(sec && sec.text.includes(h)) }));
}

const CITE_RE = /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/g;
const BARE_RE = /[0-9]+(\.[0-9]+)?\s*(mmHg|kPa|℃|mmol|μmol|mg|μg|ng|g\/L|mol|%|次\/分|mL|ml|L\/min|kg|cm|mm|U\/L|IU)/;
const isCite = (line) => /补充·hermes-病理生理学讲义·第\s*\d+\s*章·\d+\.\d+/.test(line);
const isQuoteLine = (line) => /^\s*>/.test(line);

function docsAudit(ch) {
  if (!fs.existsSync(DOC)) return { missing: true };
  const doc = fs.readFileSync(DOC, 'utf8');
  const lines = doc.split(/\r?\n/);
  const flat = ch.secs.map((s) => s.text).join('\n');
  const cites = [...doc.matchAll(CITE_RE)].map((m) => ({ ch: Number(m[1]), sec: m[2] }));
  const quotes = [];
  for (const l of lines) {
    if (isCite(l) || isQuoteLine(l)) continue;
    for (const m of l.matchAll(/「([^「」]{6,})」/g)) quotes.push(m[1]);
  }
  return {
    missing: false,
    chars: nonWs(doc),
    cites: cites.length,
    sectionsCited: new Set(cites.map((c) => c.sec)).size,
    wrongCh: cites.filter((c) => c.ch !== ch.no).length,
    unknownSec: cites.filter((c) => !ch.secs.some((s) => s.no === c.sec)).map((c) => c.sec),
    quotes: quotes.length,
    lostQuotes: quotes.filter((q) => !flat.includes(q)),
    bare: lines.filter((l) => !isCite(l) && !isQuoteLine(l) && BARE_RE.test(l)).length,
    uncovered: ch.secs.filter((s) => !doc.includes(s.no)).map((s) => s.no),
  };
}

function main() {
  const ch = chapterOf();
  const s = shape(ch);
  const keys = keyCounts(ch);
  const stages = stageMap(ch);
  const horm = hormoneBoard(ch);
  const audit = docsAudit(ch);

  console.log(`═══ ${TITLE}（病理生理学 第${CHAPTER}章 · 讲义 ${ch.unit}）═══`);
  console.log(`讲义规模: ${s.secs} 节 · ${s.chars} 非空白字 · ${s.hanzi} 汉字 · ${s.paras} 段 · 平均每节 ${Math.round(s.chars / s.secs)} 字`);
  console.log('用词重心（讲义第 26 章全章计数）：');
  for (const k of keys) console.log(`  ${k.key.padEnd(4, '　')} ${String(k.n).padStart(3)} 次`);
  console.log('');
  console.log(`节内落位（节号 / 标题 / 非空白字），合计 ${s.secs} 节：`);
  for (const sec of ch.secs) console.log(`  ${sec.no} ${sec.title} · ${nonWs(sec.text)} 字`);
  console.log('');
  console.log('四环节分布（环节 / 出现的节）：');
  for (const st of stages) console.log(`  ${st.stage} ${st.secs.join('、')}`);
  console.log('');
  console.log(`内分泌产物是否都在 26.8：${horm.map((h) => `${h.name}${h.inSec ? '✓' : '✗'}`).join(' · ')}`);
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

  return { ch, shape: s, keys, stages, horm, audit };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  CHAPTER,
  TITLE,
  KEYS,
  STAGES,
  HORMONES,
  BOUNDARY,
  nonWs,
  hanzi,
  countOf,
  chapterOf,
  shape,
  keyCounts,
  secsWith,
  stageMap,
  hormoneBoard,
  docsAudit,
  main,
};

// 末行契约：main() 打印的最后一句就是下面这句；章级门按文件末三行核「教学边界」，所以在此复写一次。
// 教学边界：本章只说明讲义第 26 章肾功能环节的类别与关系，不写数值与单位与正常值，不构成诊断、治疗或用药依据
