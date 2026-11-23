'use strict';
/**
 * 中医体质学 · 第 6 章 体质与疾病易感性：横向数据只能看共现
 *
 *   node code/main.js
 *
 * 课程：departments/01-zhongyi/04-zhongyi-tizhi-xue/chapters/06-tizhi-liuxing/docs/zh.md
 * 习题：chapters/06-tizhi-liuxing/quiz.json
 *
 * 本章每个数字都从本章正文现算，不读仓库底本、不手抄结论：
 *   · 结构：小节数、汉字数、表格张数与行数、段落数、引书
 *   · 算术：把「共现的形状」那张表逐行复算一遍——
 *           每证覆盖 = 覆盖病名 ÷ 证候数（一位小数），外科占比的分母是否等于该质证候数；
 *           兼夹占比 = 带第二病性族的证候 ÷ 全表证候合计
 *   · 判据：一组关键术语在正文里的出现次数
 *   · 骨架：几组并列项是否真的在正文里立住
 *   · 习题：题量、三段分布、解释长度、check 题能否在正文找到原词
 * 正文一改，重跑就知道是哪一条对不上。
 */

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const CHAPTER = 6;
const SLUG = '06-tizhi-liuxing';
const TITLE = '体质与疾病易感性：横向数据只能看共现';

/** 本章的判据术语：正文靠它们把「横向数据只能看共现」立住 */
const TERMS = [
  ['横断面', '能看同时出现，看不出谁先谁后'],
  ['队列', '先测体质再随访，才有时序'],
  ['病例对照', '回看体质分布，选择偏倚敏感'],
  ['干预试验', '唯一能答「调体质能否降发病」的设计'],
  ['共现', '本章唯一允许从本库读出的关系'],
  ['分母', '替换分母是四个坑里最先要查的一个'],
  ['转诊偏倚', '教材病例来自医院，不是人群'],
  ['教材偏倚', '写得细的病会在多个质里出现'],
  ['可推翻', '找不到可推翻推论的表述还没进入可检验范围'],
];

/** 本章的骨架：几组并列项必须齐全，缺一项说明正文这一节没写完 */
const GROUPS = [
  { label: '三种设计＋干预试验', all: ['横断面', '队列', '病例对照', '干预试验'] },
  { label: '四个坑', all: ['分母替换', '时序倒置', '转诊偏倚', '教材偏倚'] },
  { label: '动作翻译三原则', all: ['该关注什么指标', '减少什么、观察什么', '体质提示优先级'] },
  { label: '随访记录六字段', all: ['辨识时点', '基线四域', '随访结局', '暴露与行为', '失访原因', '样本来源'] },
];

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const round1 = (x) => Math.round(x * 10) / 10;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');

/** 「## 」小节标题 */
function sections(doc) {
  return [...String(doc).matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
}

/** 表格：逐张给出表头与数据行 */
function tables(doc) {
  const blocks = [];
  let cur = null;
  for (const line of String(doc).split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith('|')) {
      if (!cur) {
        cur = [];
        blocks.push(cur);
      }
      cur.push(t);
    } else {
      cur = null;
    }
  }
  return blocks.map((rows) => {
    const body = rows.filter((r) => !/^\|[\s:|-]+\|$/.test(r));
    const cells = body.map((r) =>
      r
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((c) => c.trim())
    );
    return { header: cells[0], rows: cells.slice(1) };
  });
}

function tableShape(doc) {
  const ts = tables(doc);
  return { tables: ts.length, rows: ts.reduce((a, t) => a + t.rows.length, 0) };
}

/** 正文段落：以空行分块，去掉标题行与表格行 */
function paragraphs(doc) {
  return String(doc)
    .split(/\r?\n\r?\n/)
    .map((x) => x.trim())
    .filter((x) => x && !x.startsWith('#') && !x.startsWith('|'));
}

/** 正文引到的书名（《》里的条目，去重） */
function books(doc) {
  const out = new Set();
  for (const m of String(doc).matchAll(/《([^》]+)》/g)) out.add(m[1]);
  return [...out];
}

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '')
    .replace(/[^\u4e00-\u9fff]/g, ' ')
    .split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

/** 「共现的形状」表：找出表头带证候数与覆盖病名的那一张，逐行解析 */
function coverageRows(doc) {
  const t = tables(doc).find((x) => x.header.some((h) => h.includes('证候数')) && x.header.some((h) => h.includes('覆盖病名')));
  if (!t) throw new Error('正文里找不到「证候数 / 覆盖病名」那张表');
  const idx = (needle) => t.header.findIndex((h) => h.includes(needle));
  const iType = idx('体质');
  const iZheng = idx('证候数');
  const iDisease = idx('覆盖病名');
  const iPer = idx('每证覆盖');
  const iSurgery = idx('外科占比');
  return t.rows.map((r) => {
    const [n, d] = String(r[iSurgery] || '').split('/').map((x) => Number(x));
    return {
      type: r[iType],
      zheng: Number(r[iZheng]),
      diseases: Number(r[iDisease]),
      statedPer: Number(r[iPer]),
      surgeryN: n,
      surgeryD: d,
    };
  });
}

/** 本章算术：把表里的每个比值重算一遍，把对不上的行单独列出来 */
function arithmetic(doc) {
  const rows = coverageRows(doc);
  const zhengTotal = rows.reduce((a, r) => a + r.zheng, 0);
  const diseaseTotal = rows.reduce((a, r) => a + r.diseases, 0);
  const cells = rows.map((r) => ({
    type: r.type,
    computed: round1(r.diseases / r.zheng),
    stated: r.statedPer,
    ok: round1(r.diseases / r.zheng) === r.statedPer,
    surgeryShare: round1((r.surgeryN / r.surgeryD) * 100),
    surgeryDenomOk: r.surgeryD === r.zheng,
  }));
  const bad = cells.filter((c) => !c.ok || !c.surgeryDenomOk).map((c) => c.type);
  const sorted = [...cells].sort((a, b) => b.computed - a.computed);
  const top = sorted[0];
  const bottom = sorted[sorted.length - 1];
  // 兼夹：正文自己写的「N 个证候里有 M 个带有第二个病性族」，比值的分母现算
  const m = String(doc).match(/(\d+)\s*个证候里有\s*(\d+)\s*个带有第二个病性族/);
  const mixed = m
    ? { part: Number(m[2]), whole: Number(m[1]), share: round1((Number(m[2]) / Number(m[1])) * 100) }
    : null;
  return {
    cells,
    bad,
    zhengTotal,
    diseaseTotal,
    top,
    bottom,
    mixed,
    mixedShareMatchesDoc: mixed ? String(doc).includes(`${mixed.share}%`) : false,
  };
}

function termCounts(doc) {
  return TERMS.map(([term, why]) => ({ term, why, n: count(doc, term) }));
}

function groupCheck(doc) {
  return GROUPS.map((g) => ({
    label: g.label,
    all: g.all,
    missing: g.all.filter((x) => !String(doc).includes(x)),
  }));
}

function quizSummary(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    return {
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(q.explain),
      grounded: [...grams(right)].filter((g) => body.has(g)).length,
    };
  });
  return {
    total: qs.length,
    stage,
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    allFourOptions: items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
  };
}

function analyze() {
  const doc = readDoc();
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  return {
    doc,
    hanzi: hanzi(doc),
    sections: sections(doc),
    table: tableShape(doc),
    paragraphs: paragraphs(doc).length,
    books: books(doc),
    arithmetic: arithmetic(doc),
    terms: termCounts(doc),
    groups: groupCheck(doc),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = analyze();
  const a = r.arithmetic;
  console.log(`中医体质学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log(
    `正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · ${r.sections.length} 节 · 表 ${r.table.tables} 张 / ${r.table.rows} 行 · 段 ${r.paragraphs} · 引书 ${r.books.length} 部`
  );
  console.log('');
  console.log('小节：');
  for (const s of r.sections) console.log(`  · ${s}`);
  console.log('');
  console.log('共现表逐行复算（每证覆盖 = 覆盖病名 ÷ 证候数，一位小数；外科占比分母须等于该质证候数）：');
  for (const c of a.cells) {
    console.log(
      `  ${c.ok && c.surgeryDenomOk ? '✓' : '✗'} ${c.type}\t${c.computed.toFixed(1)}（正文 ${c.stated.toFixed(1)}）\t外科 ${c.surgeryShare.toFixed(1)}%\t分母${c.surgeryDenomOk ? '对得上' : '对不上'}`
    );
  }
  console.log(
    `  合计：证候 ${a.zhengTotal} 个 · 各质病名相加 ${a.diseaseTotal} 个（病名跨质重复计，故大于不重复的病名数）`
  );
  console.log(`  每证覆盖最高 ${a.top.type} ${a.top.computed.toFixed(1)}；最低 ${a.bottom.type} ${a.bottom.computed.toFixed(1)}`);
  if (a.mixed) {
    console.log(
      `  兼夹：${a.mixed.part} / ${a.mixed.whole} = ${a.mixed.share}%${a.mixedShareMatchesDoc ? '（与正文一致）' : '（与正文不一致）'}`
    );
  }
  console.log(`  与正文对不上的行：${a.bad.length ? a.bad.join('、') : '无'}`);
  console.log('');
  console.log('判据命中：');
  for (const t of r.terms) console.log(`  ${t.n > 0 ? '✓' : '✗'} ${t.term} ${t.n} 次 — ${t.why}`);
  console.log('');
  console.log('骨架：');
  for (const g of r.groups) {
    console.log(`  ${g.missing.length ? '✗' : '✓'} ${g.label}${g.missing.length ? `（缺 ${g.missing.join('、')}）` : ''}`);
  }
  console.log('');
  console.log(
    `习题 ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.checkGrounded} 道 · 答案 ${r.quiz.answers.join('/')}`
  );
  console.log('※ 以上数字全部从本章正文与习题现算，改正文后重跑即可复核；病名跨质重复计，覆盖率不等于人群风险。');
  console.log('※ 本章为教学材料，不构成临床判断依据，也不能替代医师面诊；出现新发或加重的症状应先就医。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  sections,
  tables,
  tableShape,
  paragraphs,
  books,
  grams,
  hanzi,
  count,
  round1,
  coverageRows,
  arithmetic,
  termCounts,
  groupCheck,
  quizSummary,
  TERMS,
  GROUPS,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
