#!/usr/bin/env node
/**
 * 病理生理学 · 第 13 章 氧运输异常
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/13-alterations-in-oxygen-transport/docs/zh.md
 * 文本: 补充·hermes-病理生理学讲义·第 13 章（standards/binglishengli/supplements/jiangyi.json）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章要讲的命题是「讲义是唯一文本，章号即节号」，
 * 而这件事只能由三处对账来证——讲义该章的节号集合、docs 里出现的节号、
 * 以及 docs 中每条引文与引语是否真的落在该章正文里。
 * 手打的数字会在讲义改版后静默过期；现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 standards/binglishengli 的那一级
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 14; i += 1) {
    const p = path.join(dir, 'standards', 'binglishengli', 'supplements', 'jiangyi.json');
    if (fs.existsSync(p)) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/binglishengli/supplements/jiangyi.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const INDEX = path.join(ROOT, 'standards', 'binglishengli', 'supplements', 'jiangyi.json');
const CHAPTER = 13;
const TITLE = '氧运输异常';

/** 引文与引语的最小口径，与 tests/test_binglishengli_chapters.js 同一套正则 */
const CITE_RE = /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/g;
const isCite = (line) => /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/.test(line);
const isQuoteLine = (line) => /^\s*>/.test(line);

/** 「数字＋计量单位」：非引用行出现即视为裸数值 */
const BARE_RE = /[0-9]+(\.[0-9]+)?\s*(mmHg|kPa|℃|mmol|μmol|mg|μg|ng|g\/L|mol|%|次\/分|mL|ml|L\/min|kg|cm|mm|U\/L|IU)/;

const nonWs = (s) => String(s).replace(/\s/g, '').length;

/** 讲义里本章的全部节：no → 正文（段落以换行连接） */
function chapterOf(n = CHAPTER) {
  const idx = JSON.parse(fs.readFileSync(INDEX, 'utf8'));
  for (const u of idx.units) {
    for (const c of u.chapters) {
      if (Number(c.no) !== n) continue;
      const secs = new Map();
      for (const s of c.secs) secs.set(s.no, (s.paras || []).join('\n'));
      return { no: Number(c.no), title: c.title, unit: u.unit, hanzi: c.hanzi, secs };
    }
  }
  throw new Error(`讲义里没有第 ${n} 章`);
}

function docsPath() {
  return path.join(__dirname, '..', 'docs', 'zh.md');
}

/** 对账：规模、引文、引语逐字、裸数值、节号覆盖、quiz 契约 */
function audit(doc, book) {
  const lines = doc.split(/\r?\n/);
  const flat = [...book.secs.values()].join('\n');

  const cites = [...doc.matchAll(CITE_RE)].map((m) => ({ ch: Number(m[1]), sec: m[2] }));
  const wrongCh = cites.filter((x) => x.ch !== CHAPTER);
  const missingSec = cites.filter((x) => x.ch === CHAPTER && !book.secs.has(x.sec));

  // 引语逐字：非引文行、非「>」行里的「」片段（≥6 字）必须能在本章正文里找到
  const quotes = [];
  const lost = [];
  for (const line of lines) {
    if (isCite(line) || isQuoteLine(line)) continue;
    for (const m of line.matchAll(/「([^「」]{6,})」/g)) {
      quotes.push(m[1]);
      if (!flat.includes(m[1])) lost.push(m[1]);
    }
  }

  const bare = lines.filter((l) => !isCite(l) && !isQuoteLine(l) && BARE_RE.test(l));
  const uncovered = [...book.secs.keys()].filter((s) => !doc.includes(s));

  return {
    chars: nonWs(doc),
    lines: lines.length,
    cites: cites.length,
    sections: book.secs.size,
    quoted: quotes.length,
    lost,
    wrongCh,
    missingSec,
    bare,
    uncovered,
    hasMotto: doc.includes('MOTTO'),
    hasProblem: doc.includes('PROBLEM'),
    hasRoots: doc.includes('双根因定位'),
    hasRun: doc.includes('运行与验证'),
    endSection: lines.some((l) => /^##\s/.test(l) && /代价与边界|边界|免责/.test(l)),
  };
}

/** quiz.json：恰 6 题、pre 1 / check 3 / post 2、题干键 question、每题 explanation 带引证 */
function quizAudit() {
  const p = path.join(__dirname, '..', 'quiz.json');
  const q = JSON.parse(fs.readFileSync(p, 'utf8'));
  const qs = q.questions || [];
  const byStage = qs.reduce((m, x) => ((m[x.stage] = (m[x.stage] || 0) + 1), m), {});
  return {
    n: qs.length,
    byStage,
    wrongKey: qs.filter((x) => !x.question).length,
    cited: qs.filter((x) => /(依据|口径见|前提|算见)/.test(x.explanation || '')).length,
  };
}

const pad = (s, n) => String(s).padEnd(n, ' ');

function report() {
  const book = chapterOf();
  const doc = fs.readFileSync(docsPath(), 'utf8');
  const a = audit(doc, book);
  const q = quizAudit();

  console.log(`═══ ${TITLE}（病理生理学 第${CHAPTER}章）═══`);
  console.log(`讲义规模: ${a.sections} 节 · ${book.hanzi} 汉字 · 节号 ${[...book.secs.keys()].join(' / ')}`);
  console.log(`docs 规模: ${a.chars} 非空白字 · ${a.lines} 行`);
  console.log('');
  console.log(`引文: ${a.cites} 条（引到别章 ${a.wrongCh.length} 条 · 节号不存在 ${a.missingSec.length} 条）`);
  console.log(`引语: ${a.quoted} 条（未被本章正文逐字命中 ${a.lost.length} 条）`);
  for (const x of a.lost.slice(0, 5)) console.log(`   ✗ 「${x.slice(0, 24)}…」`);
  console.log(`节号覆盖: ${a.sections - a.uncovered.length} / ${a.sections}${a.uncovered.length ? ' · 缺 ' + a.uncovered.join(',') : ''}`);
  console.log(`非引用行裸数值: ${a.bare.length} 行`);
  for (const l of a.bare.slice(0, 5)) console.log(`   ✗ ${l.trim().slice(0, 60)}`);
  console.log('');
  console.log(`结构: MOTTO ${a.hasMotto ? '✓' : '✗'} · PROBLEM ${a.hasProblem ? '✓' : '✗'} · 双根因定位 ${a.hasRoots ? '✓' : '✗'} · 运行与验证 ${a.hasRun ? '✓' : '✗'} · 末节 ${a.endSection ? '✓' : '✗'}`);
  console.log(`quiz: ${q.n} 题（pre ${q.byStage.pre || 0} · check ${q.byStage.check || 0} · post ${q.byStage.post || 0}）· 引证 ${q.cited} / ${q.n} · 题干键异常 ${q.wrongKey}`);
  console.log('');
  console.log('判读：先定哪一段断，再定哪一个指标动；先看分压，再看容量，最后看动静脉氧差。');
}

report();

console.log('教学边界：本章只解释讲义第 13 章的类别与环节，不写数值与单位与正常值，不构成诊断、用药依据');
