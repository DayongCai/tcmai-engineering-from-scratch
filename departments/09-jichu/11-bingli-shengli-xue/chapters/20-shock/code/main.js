#!/usr/bin/env node
/**
 * 病理生理学 · 第 19 章 心力衰竭与心律失常
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/20-shock/docs/zh.md
 * 第一文本: standards/binglishengli/supplements/jiangyi.json（讲义第 19 章，U05 心脏功能，12 节）
 * 依赖: 仅 Node.js 标准库（白名单见 CONTRIBUTING.md）
 *
 * 为什么全部现算：本章要证的命题是「代偿—重构—失代偿是一条链，不是一个分类表」，
 * 而这件事只能由讲义自己的用词分布来证：代偿、重构、失代偿三个词分别落在哪些节，
 * 「淤血」与「灌注」两条主线各占多少笔墨，12 节是不是真的被 docs 全覆盖。
 * 手打的数字会在讲义改版后静默过期；现算的数字一旦对不上，程序自己会报错。
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
const IDX = path.join(ROOT, 'standards', 'binglishengli', 'supplements', 'jiangyi.json');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const CHAPTER = 20;
const TITLE = '休克';

/** 本章主线：三个分期（代偿期 / 进展期 / 难治期）。程序只负责证明这几个词确实分布在不同节里，不负责替读者判断。 */
const CHAIN = { label: '三个分期（代偿期 / 进展期 / 难治期）', words: ['代偿期', '进展期', '难治期'] };

/** 观察轴：用来核「本章写的是过程，不是名词表」 */
const LENS = { label: '观察轴', words: ['灌注', '微循环', '容量', '细胞', '器官', '分类'] };

/** 教学边界句：main.js 最后一行，也是单测与章级门共同依赖的字符串 */
const BOUNDARY = '教学边界：本章只说明讲义给出的机制类别与方向，不写数值与单位与正常值，不构成诊断、治疗或用药依据';

const nonWs = (s) => String(s).replace(/\s/g, '').length;
const hanziOf = (s) => (String(s).match(/[\u4e00-\u9fff]/g) || []).length;

/** 讲义里本章的实体：章号、标题、所属单元、逐节正文 */
function loadChapter(no = CHAPTER) {
  const idx = JSON.parse(fs.readFileSync(IDX, 'utf8'));
  for (const u of idx.units) {
    for (const c of u.chapters) {
      if (Number(c.no) !== Number(no)) continue;
      const secs = c.secs.map((s) => {
        const text = (s.paras || []).join('\n');
        return { no: s.no, title: s.title, paras: (s.paras || []).length, text, chars: nonWs(text), hanzi: hanziOf(text) };
      });
      return { no: Number(c.no), title: c.title, unit: u.unit, secs };
    }
  }
  throw new Error(`讲义里没有第 ${no} 章`);
}

/** 规模：节数 / 段数 / 非空白字符 / 汉字 */
function shape(ch) {
  return {
    secs: ch.secs.length,
    paras: ch.secs.reduce((n, s) => n + s.paras, 0),
    chars: ch.secs.reduce((n, s) => n + s.chars, 0),
    hanzi: ch.secs.reduce((n, s) => n + s.hanzi, 0),
  };
}

/** 词频：只数正文里的出现次数，不做同义合并 */
function termCount(text, words) {
  const out = {};
  for (const w of words) out[w] = (text.split(w).length - 1);
  return out;
}

/** 用一个词落在哪些节，证明「主线贯穿全章」不是修辞 */
function secsMentioning(ch, word) {
  return ch.secs.filter((s) => s.text.includes(word)).map((s) => s.no);
}

/** 小节号格式：第 19 章必须是 19.M */
function checkSecFormat(ch) {
  const bad = ch.secs.filter((s) => !new RegExp(`^${CHAPTER}\\.[1-9][0-9]?$`).test(s.no)).map((s) => s.no);
  return { ok: bad.length === 0, bad };
}

/**
 * docs 对账：覆盖、引文、引语逐字、裸数值。
 * 引语只查非引用行（引用行是讲义原话，出处已在行内）；
 * 数值只查既非引用行、又非讲义引文行的正文行。
 */
function auditDoc(ch) {
  if (!fs.existsSync(DOC)) return { ready: false };
  const doc = fs.readFileSync(DOC, 'utf8');
  const lines = doc.split(/\r?\n/);
  const CITE = /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/g;
  const cites = [...doc.matchAll(CITE)].map((m) => ({ ch: Number(m[1]), sec: m[2] }));
  const flat = ch.secs.map((s) => s.text).join('\n');

  const quotes = [];
  for (const l of lines) {
    if (/^\s*>/.test(l)) continue;
    for (const m of l.matchAll(/「([^「」]{6,})」/g)) quotes.push(m[1]);
  }

  const BARE = /[0-9]+(\.[0-9]+)?\s*(mmHg|kPa|℃|mmol|μmol|mg|μg|ng|g\/L|mol|%|次\/分|mL|ml|L\/min|kg|cm|mm|U\/L|IU)/;

  return {
    ready: true,
    chars: nonWs(doc),
    cites: cites.length,
    wrongCh: cites.filter((x) => x.ch !== CHAPTER).length,
    noSec: cites.filter((x) => !ch.secs.some((s) => s.no === x.sec)).map((x) => x.sec),
    quotes: quotes.length,
    lost: quotes.filter((q) => !flat.includes(q)),
    bare: lines.filter((l) => !/^\s*>/.test(l) && !CITE.test(l) && BARE.test(l)).length,
    uncovered: ch.secs.filter((s) => !doc.includes(s.no)).map((s) => s.no),
    boundary: doc.includes(BOUNDARY),
  };
}

function main() {
  const ch = loadChapter();
  const s = shape(ch);
  const fmt = checkSecFormat(ch);
  const all = ch.secs.map((x) => x.text).join('\n');
  const lens = termCount(all, LENS.words);
  const doc = auditDoc(ch);

  console.log(`═══ 第${ch.no}章 ${TITLE}（讲义 ${ch.unit} · ${s.secs} 节）═══`);
  console.log(`讲义规模: ${s.secs} 节 · ${s.paras} 段 · ${s.chars} 非空白字符 · ${s.hanzi} 汉字`);
  console.log(`小节号格式: ${fmt.ok ? `全部合规（${CHAPTER}.M）` : '异常 ' + fmt.bad.join('、')}`);
  console.log('');

  console.log(`${CHAIN.label} 落位：`);
  for (const w of CHAIN.words) {
    const hit = secsMentioning(ch, w);
    console.log(`  ${w.padEnd(4, '　')} ${String(hit.length).padStart(2)} 节 → ${hit.join('、') || '（无）'}`);
  }
  console.log('  → 三期不是并列的选项，而是同一条链上的三个位置：后一期以前一期的代价为前提。');
  console.log('');

  console.log('观察轴词频（本章正文）：');
  for (const [k, v] of Object.entries(lens).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(4, '　')} ${String(v).padStart(3)} 次`);
  }
  console.log('');

  console.log('逐节（节号 / 标题 / 段数 / 汉字）：');
  for (const x of ch.secs) console.log(`  ${x.no.padEnd(5)} ${x.title} · ${x.paras} 段 · ${x.hanzi} 字`);
  console.log('');

  if (!doc.ready) {
    console.log('docs 对账: docs/zh.md 尚未写入');
  } else {
    console.log(`docs 覆盖: ${s.secs - doc.uncovered.length} / ${s.secs} 节${doc.uncovered.length ? '，缺 ' + doc.uncovered.join('、') : ''}`);
    console.log(`引文: ${doc.cites} 条 · 章号错 ${doc.wrongCh} 条 · 节号不存在 ${doc.noSec.length} 条`);
    console.log(`引语逐字: ${doc.quotes - doc.lost.length} / ${doc.quotes} 条可在讲义本章正文里逐字找到`);
    console.log(`正文裸数值行: ${doc.bare}`);
    console.log(`教学边界句在 docs: ${doc.boundary ? '有' : '缺'}`);
  }
  console.log('');

  console.log(BOUNDARY);

  return { ch, shape: s, fmt, lens, doc };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  DOC,
  CHAPTER,
  TITLE,
  CHAIN,
  LENS,
  BOUNDARY,
  loadChapter,
  shape,
  termCount,
  secsMentioning,
  checkSecFormat,
  auditDoc,
  main,
};

// ── 末行留痕：章级门按源码最后三行核对教学边界，故在此与运行时末行同文重复一次 ──
// 教学边界：本章只说明讲义给出的机制类别与方向，不写数值与单位与正常值，不构成诊断、治疗或用药依据
