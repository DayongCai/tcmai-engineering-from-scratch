'use strict';
/**
 * 《内经选读》第 7 章 · 治则是排序问题，不是选方问题
 *
 *   node code/main.js
 *
 * 正文：chapters/07-zhize-biaoben/docs/zh.md
 * 语料：standards/materials/neijing-quanwen/content.json（全文 162 篇，只取「原文」块）
 *       standards/neijing-xuandu/units.json（教材选读本 162 篇，只取原文主体）
 *
 * 本章每个数字都从这两份语料现算，再和正文写下的数对读：
 *   · 篇数、原文汉字、段数、篇长分布（中位数 / 最长 / 最短 / 倍差）
 *   · 「底本对读」表：教材本字数、全文字数、相似度、全文还是节选
 *   · 正文引文是否逐字落在所标的那一篇里（节引按「……」分段、按序找）
 *   · 关键词在全书与指定篇里的出现次数
 *   · quiz 的结构与接地
 * 正文或底本一改，重跑就能看出是哪一行对不上。
 *
 * 口径：汉字按 Unicode 汉字块计（含扩展 B 区，与底本脚本同一口径）；
 * 相似度是 difflib.SequenceMatcher.ratio() 的同构实现（含 autojunk 与两端延伸），
 * 与 scripts/wire_neijing_chapters.py 写进正文的数逐位对齐。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const FULL = path.join(ROOT, 'standards/materials/neijing-quanwen/content.json');
const XUANDU = path.join(ROOT, 'standards/neijing-xuandu/units.json');

const CHAPTER = 7;
const SLUG = '07-zhize-biaoben';
const TITLE = '治则是排序问题，不是选方问题';

/** 教材本篇名 → 全文篇名：今字/古字与「遗篇·」前缀的差异，逐条写死，不做模糊匹配 */
const ALIAS = {
  五脏生成: '五藏生成',
  五脏别论: '五藏别论',
  本脏: '本藏',
  玉机真脏论: '玉机真藏论',
  脏气法时论: '藏气法时论',
  邪气脏腑病形: '邪气藏府病形',
  忧恚无言: '忧患无言',
  '遗篇·刺法论': '刺法论',
  '遗篇·本病论': '本病论',
  上膈: '上隔',
  背腧: '背俞',
};

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]|[\u{20000}-\u{3ffff}]/u;
const FOLD = { 遊: '游', 於: '于', 穀: '谷', 欬: '咳', 徧: '遍', 臟: '藏' };
const chars = (s) => [...String(s || '')];
const isHan = (ch) => HAN.test(ch);
const hanzi = (s) => chars(s).filter(isHan).length;
const norm = (s) => chars(s).filter(isHan).map((ch) => FOLD[ch] || ch);
const count = (text, term) => String(text).split(term).length - 1;

/* ── 语料 ────────────────────────────────────────────────────────── */

/** 全文：162 篇，每篇只取「原文」块（译文与按语不入正文） */
function loadCorpus(file = FULL) {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const pians = doc.sections.map((s) => {
    const blocks = s.blocks.filter((b) => b.type === '原文');
    const text = blocks.map((b) => b.text).join('');
    return {
      title: s.title.split('·').pop(),
      book: s.title.split('·')[0],
      blocks: blocks.length,
      hanzi: hanzi(text),
      text,
      flat: norm(text).join(''),
    };
  });
  const byTitle = new Map(pians.map((p) => [p.title, p]));
  const byBook = {};
  for (const book of ['素问', '灵枢']) {
    const xs = pians.filter((p) => p.book === book);
    const h = xs.reduce((a, p) => a + p.hanzi, 0);
    const b = xs.reduce((a, p) => a + p.blocks, 0);
    byBook[book] = { pians: xs.length, hanzi: h, blocks: b, avgHanzi: h / xs.length, avgBlocks: b / xs.length };
  }
  const sorted = [...pians].sort((a, b) => a.hanzi - b.hanzi);
  const half = sorted.length / 2;
  const median = sorted.length % 2
    ? sorted[(sorted.length - 1) / 2].hanzi
    : (sorted[half - 1].hanzi + sorted[half].hanzi) / 2;
  const total = {
    pians: pians.length,
    hanzi: pians.reduce((a, p) => a + p.hanzi, 0),
    blocks: pians.reduce((a, p) => a + p.blocks, 0),
  };
  return {
    pians,
    byTitle,
    byBook,
    total,
    median,
    longest: sorted[sorted.length - 1],
    shortest: sorted[0],
    avgHanzi: total.hanzi / total.pians,
    avgBlocks: total.blocks / total.pians,
    charsPerBlock: total.hanzi / total.blocks,
    /** 全书或指定篇里的次数；scope 用篇名 */
    countTerm(term, scope) {
      const text = scope ? byTitle.get(ALIAS[scope] || scope).text : pians.map((p) => p.text).join('');
      return count(text, term);
    },
  };
}

/** 教材选读本：一篇一单元，body 只含「原文」段 */
function loadXuandu(file = XUANDU) {
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const byTitle = new Map(doc.units.map((u) => [u.title, u]));
  return { units: doc.units, byTitle, counts: doc.counts };
}

/* ── 相似度：difflib.SequenceMatcher 的同构实现 ──────────────────── */

function chainB(b) {
  const m = new Map();
  b.forEach((ch, i) => {
    const list = m.get(ch);
    if (list) list.push(i);
    else m.set(ch, [i]);
  });
  // autojunk：b ≥ 200 字时，出现次数超过 1% + 1 的字不建索引（b[0] 除外）
  if (b.length >= 200) {
    const ntest = Math.floor(b.length / 100) + 1;
    for (const [ch, list] of [...m]) if (list.length > ntest && ch !== b[0]) m.delete(ch);
  }
  return m;
}

function longestMatch(a, b, b2j, alo, ahi, blo, bhi) {
  let besti = alo;
  let bestj = blo;
  let best = 0;
  let j2len = new Map();
  for (let i = alo; i < ahi; i += 1) {
    const next = new Map();
    const js = b2j.get(a[i]);
    if (js) {
      for (const j of js) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const k = (j2len.get(j - 1) || 0) + 1;
        next.set(j, k);
        if (k > best) {
          besti = i - k + 1;
          bestj = j - k + 1;
          best = k;
        }
      }
    }
    j2len = next;
  }
  while (besti > alo && bestj > blo && b[bestj - 1] === a[besti - 1]) {
    besti -= 1;
    bestj -= 1;
    best += 1;
  }
  while (besti + best < ahi && bestj + best < bhi && b[bestj + best] === a[besti + best]) best += 1;
  return [besti, bestj, best];
}

function matchingBlocks(a, b) {
  const b2j = chainB(b);
  const queue = [[0, a.length, 0, b.length]];
  const found = [];
  while (queue.length) {
    const [alo, ahi, blo, bhi] = queue.pop();
    const [i, j, k] = longestMatch(a, b, b2j, alo, ahi, blo, bhi);
    if (!k) continue;
    found.push([i, j, k]);
    if (alo < i && blo < j) queue.push([alo, i, blo, j]);
    if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
  }
  found.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const out = [];
  let [li, lj, lk] = [0, 0, 0];
  for (const [i, j, k] of found) {
    if (li + lk === i && lj + lk === j) lk += k;
    else {
      if (lk) out.push([li, lj, lk]);
      [li, lj, lk] = [i, j, k];
    }
  }
  if (lk) out.push([li, lj, lk]);
  out.push([a.length, b.length, 0]);
  return out;
}

function ratio(a, b) {
  const A = typeof a === 'string' ? chars(a) : a;
  const B = typeof b === 'string' ? chars(b) : b;
  if (!A.length && !B.length) return 1;
  const matched = matchingBlocks(A, B).reduce((acc, x) => acc + x[2], 0);
  return (2 * matched) / (A.length + B.length);
}

const round3 = (x) => Math.round(x * 1000) / 1000;

/* ── 正文：篇目表、合计行、引文 ──────────────────────────────────── */

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');

/** 「底本对读」表的行：篇名 | 版本 | 教材本字数 | 全文字数 | 相似度 | 定位 */
function docRowTable(doc) {
  const re = /^\|\s*([^|]+?)\s*\|\s*(全文|节选)\s*\|\s*([\d,]+)\s*\|\s*([\d,]+)\s*\|\s*([\d.]+)\s*\|\s*(.+?)\s*\|\s*$/gm;
  return [...String(doc).matchAll(re)].map((m) => ({
    title: m[1].trim(),
    edition: m[2],
    xuanduHanzi: Number(m[3].replace(/,/g, '')),
    fullHanzi: Number(m[4].replace(/,/g, '')),
    ratio: Number(m[5]),
    locator: m[6].trim(),
  }));
}

/** 表上方的三行合计：篇数、教材本/全文字数与覆盖率、节选篇数、引文条数与命中数 */
function docTotals(doc) {
  const t = String(doc);
  const pian = /\|\s*本章篇目\s*\|\s*(\d+)\s*篇（教材本\s*([\d,]+)\s*字\s*\/\s*全文\s*([\d,]+)\s*字，覆盖\s*([\d.]+)%）/.exec(t);
  const ex = /\|\s*节选篇\s*\|\s*(\d+)\s*篇/.exec(t);
  const q = /\|\s*docs 引文\s*\|\s*(\d+)\s*条，\*\*全文篇内逐字命中\s*(\d+)\s*条\*\*/.exec(t);
  if (!pian || !ex || !q) throw new Error('正文缺少「底本对读」块的合计行');
  return {
    pians: Number(pian[1]),
    xuanduHanzi: Number(pian[2].replace(/,/g, '')),
    fullHanzi: Number(pian[3].replace(/,/g, '')),
    coverage: Number(pian[4]),
    excerpt: Number(ex[1]),
    quotes: Number(q[1]),
    quoteHits: Number(q[2]),
  };
}

/** 正文引文：行内「……」——《素问·篇名》，以及夹在括号里的「……」】（《素问·篇名》） */
function docQuotes(doc) {
  const t = String(doc);
  const out = [];
  for (const m of t.matchAll(/^>\s*(?:\*\*MOTTO:\*\*\s*)?(.+?)\s*——《(?:素问|灵枢)·([^》]+)》/gm)) {
    out.push({ where: '引文行', pian: m[2].trim(), text: m[1].replace(/^「|」$/g, '').trim() });
  }
  for (const m of t.matchAll(/「([^」]{4,})」\s*（《(?:素问|灵枢)·([^》]+)》）/g)) {
    out.push({ where: '行内引', pian: m[2].trim(), text: m[1].trim() });
  }
  return out.filter((q) => q.text);
}

/** 逐段核：节引用「……」断开，每一段都要在**所标那一篇**里按序出现（允许省略，不许改字） */
function verifyQuotes(quotes, corpus) {
  return quotes.map((q) => {
    const name = ALIAS[q.pian] || q.pian;
    const p = corpus.byTitle.get(name);
    const segs = q.text.split(/…+/).map(norm).map((s) => s.join('')).filter((s) => s.length >= 4);
    if (!p) return { ...q, segments: segs.length, hit: false, why: '全文里没有这一篇' };
    let pos = 0;
    for (const seg of segs) {
      const i = p.flat.indexOf(seg, pos);
      if (i < 0) return { ...q, segments: segs.length, hit: false, why: `篇内找不到「${seg.slice(0, 12)}…」` };
      pos = i + seg.length;
    }
    return { ...q, segments: segs.length, hit: segs.length > 0, hanzi: segs.reduce((a, s) => a + s.length, 0) };
  });
}

/* ── quiz：结构 + 接地 ──────────────────────────────────────────── */

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizSummary(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    return {
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(q.explain),
      grounded: hit.length,
    };
  });
  return {
    total: qs.length,
    stage,
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: Math.min(...items.map((x) => x.explainHanzi)),
    allFourOptions: items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
  };
}

/* ── 本章要点：正文里写死的数字，逐条对语料 ─────────────────────── */

function chapterFacts(corpus) {
  const p = (t) => corpus.byTitle.get(t);
  return [
    { label: '标本病传论全文字数', got: p('标本病传论').hanzi, want: 675 },
    { label: '异法方宜论全文字数', got: p('异法方宜论').hanzi, want: 360 },
    { label: '至真要大论全文字数', got: p('至真要大论').hanzi, want: 7018 },
    { label: '阴阳应象大论全文字数', got: p('阴阳应象大论').hanzi, want: 2031 },
    { label: '标本病传论「中满」次数', got: corpus.countTerm('中满', '标本病传论'), want: 3 },
    { label: '标本病传论「小大不利」次数', got: corpus.countTerm('小大不利', '标本病传论'), want: 2 },
    { label: '全书「间者并行」次数', got: corpus.countTerm('间者并行'), want: 2 },
    { label: '至真要大论「塞因塞用」次数', got: corpus.countTerm('塞因塞用', '至真要大论'), want: 1 },
  ];
}

/** 关键词在全书/指定篇里的次数：正文拿它们做论证，就核它们 */
function chapterProbes(corpus) {
  return [
    { term: '间者并行', scope: '标本病传论', want: 1 },
    { term: '小大不利', scope: '标本病传论', want: 2 },
    { term: '塞因塞用', scope: '至真要大论', want: 1 },
    { term: '中满', scope: '标本病传论', want: 3 },
  ];
}

/* ── 汇总 ──────────────────────────────────────────────────────── */

function analyze() {
  const corpus = loadCorpus();
  const xuandu = loadXuandu();
  const doc = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rows = docRowTable(doc).map((r) => {
    const u = xuandu.byTitle.get(r.title);
    const full = corpus.byTitle.get(ALIAS[r.title] || r.title);
    if (!u) return { ...r, computed: null, why: '教材本没有这一篇' };
    if (!full) return { ...r, computed: null, why: '全文里没有对应的篇' };
    const x = hanzi(u.body);
    const f = hanzi(full.text);
    const sim = round3(ratio(norm(u.body), norm(full.text)));
    return {
      ...r,
      computed: { xuanduHanzi: x, fullHanzi: f, ratio: sim, edition: sim >= 0.9 ? '全文' : '节选' },
      locatorOk: u.locator === r.locator,
    };
  });
  const totals = docTotals(doc);
  const quotes = verifyQuotes(docQuotes(doc), corpus);
  return {
    corpus,
    xuandu,
    rows,
    totals,
    quotes,
    facts: chapterFacts(corpus),
    probes: chapterProbes(corpus).map((p) => ({ ...p, got: corpus.countTerm(p.term, p.scope) })),
    quiz: quizSummary(quiz, doc),
    docHanzi: hanzi(doc),
  };
}

function main() {
  const r = analyze();
  const c = r.corpus;
  console.log(`《内经选读》第 ${CHAPTER} 章 · ${TITLE}`);
  console.log(`正文 ${r.docHanzi.toLocaleString('en-US')} 汉字 · 本章篇目 ${r.rows.length} 篇`);
  console.log('');
  console.log(`全书：${c.total.pians} 篇 · ${c.total.hanzi.toLocaleString('en-US')} 汉字 · ${c.total.blocks.toLocaleString('en-US')} 段`);
  console.log(`  素问 ${c.byBook.素问.pians} 篇 ${c.byBook.素问.hanzi.toLocaleString('en-US')} 字（篇均 ${Math.round(c.byBook.素问.avgHanzi)}）`);
  console.log(`  灵枢 ${c.byBook.灵枢.pians} 篇 ${c.byBook.灵枢.hanzi.toLocaleString('en-US')} 字（篇均 ${Math.round(c.byBook.灵枢.avgHanzi)}）`);
  console.log(`  中位数 ${c.median} · 最长 ${c.longest.title} ${c.longest.hanzi} 字 / ${c.longest.blocks} 段 · 最短 ${c.shortest.title} ${c.shortest.hanzi} 字 / ${c.shortest.blocks} 段`);
  console.log('');
  console.log('底本对读（正文写的 vs 语料现算）');
  for (const row of r.rows) {
    const k = row.computed;
    console.log(`  ${row.edition}/${k ? k.edition : '—'} ${row.title} 教材 ${row.xuanduHanzi}→${k ? k.xuanduHanzi : '?'} · 全文 ${row.fullHanzi}→${k ? k.fullHanzi : '?'} · 相似度 ${row.ratio}→${k ? k.ratio : '?'}`);
  }
  console.log(`  合计 教材 ${r.totals.xuanduHanzi.toLocaleString('en-US')} / 全文 ${r.totals.fullHanzi.toLocaleString('en-US')} · 覆盖 ${r.totals.coverage}% · 节选 ${r.totals.excerpt} 篇`);
  console.log('');
  console.log(`引文 ${r.quotes.length} 条 · 逐字命中 ${r.quotes.filter((q) => q.hit).length} 条`);
  for (const q of r.quotes) console.log(`  ${q.hit ? '✓' : '✗'} 《${q.pian}》${q.segments} 段 · ${q.text.slice(0, 18)}…`);
  console.log('');
  console.log('正文写死的数（现算 → 正文值）：');
  for (const f of r.facts) console.log(`  ${f.got === f.want ? '✓' : '✗'} ${f.label} ${f.got} → ${f.want}`);
  console.log('关键词次数：');
  for (const p of r.probes) console.log(`  ${p.got === p.want ? '✓' : '✗'} ${p.scope ? `《${p.scope}》` : '全书'}「${p.term}」${p.got} → ${p.want}`);
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.checkGrounded} 道 · 答案 ${r.quiz.answers.join('/')}`);
  console.log('※ 以上数字全部由正文与两份语料现算，改正文后重跑即可复核。');
  console.log('※ 本章为文本结构的教学材料，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  loadCorpus,
  loadXuandu,
  ratio,
  matchingBlocks,
  hanzi,
  norm,
  count,
  grams,
  readDoc,
  docRowTable,
  docTotals,
  docQuotes,
  verifyQuotes,
  quizSummary,
  chapterFacts,
  chapterProbes,
  ALIAS,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  FULL,
  XUANDU,
};
