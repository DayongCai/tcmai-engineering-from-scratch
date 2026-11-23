'use strict';
/**
 * 中医体质学 · 第 7 章 体质调理与治未病：以平为期
 *
 *   node code/main.js
 *
 * 课程：departments/01-zhongyi/04-zhongyi-tizhi-xue/chapters/07-tizhi-tiaoli/docs/zh.md
 * 习题：chapters/07-tizhi-tiaoli/quiz.json
 *
 * 本章每个数字都从本章正文现算，不读仓库底本、不手抄结论：
 *   · 结构：小节数、汉字数、表格张数与行数、段落数、引书
 *   · 算术：把「九种体质里八种有证候支撑」换成占比；把每个小节标题里的数目
 *           （三层含义 / 六类动作 / 三类停用 / 四类转诊）与该节表格的数据行数对上；
 *           把六类动作按可改程度拆成「高度可改 / 部分可改 / 须在机构内」三档
 *   · 判据：一组关键术语在正文里的出现次数
 *   · 骨架：几组并列项是否真的在正文里立住
 *   · 习题：题量、三段分布、解释长度、check 题能否在正文找到原词
 * 正文一改，重跑就知道是哪一条对不上。
 */

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const CHAPTER = 7;
const SLUG = '07-tizhi-tiaoli';
const TITLE = '体质调理与治未病：以平为期';

/** 本章的判据术语：正文靠它们把「目标可测、可停」立住 */
const TERMS = [
  ['以平为期', '经典原话，三层含义从它展开'],
  ['不偏', '第一层：各域不显著偏向任何一侧'],
  ['能应对', '第二层：同一诱因下恢复得更快'],
  ['不误治', '第三层：动作不与当下病机相冲'],
  ['回移一档', '教学刻度，让目标可比、可停'],
  ['复评间隔', '没有间隔就没有成败判定'],
  ['方向相冲', '停用信号里最容易被误读的一条'],
  ['目标已达', '转为维持，不再加大力度'],
  ['危险征象', '转诊信号里唯一即刻的一类'],
];

/** 本章的骨架：几组并列项必须齐全，缺一项说明正文这一节没写完 */
const GROUPS = [
  { label: '三层含义', all: ['不偏', '能应对', '不误治'] },
  { label: '六类动作', all: ['饮食', '起居', '运动', '情志', '外治', '避邪'] },
  { label: '三类停用信号', all: ['方向相冲', '目标已达', '出现新问题'] },
  { label: '四类转诊信号', all: ['危险征象', '性质改变', '进行性加重', '无法解释'] },
  {
    label: '调护记录七字段',
    all: ['目标域与目标档', '动作清单', '前提检查', '观察记录', '停止或继续', '转诊记录', '复评时点'],
  },
];

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const round1 = (x) => Math.round(x * 10) / 10;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');

/** 按「## 」切节，保留每节标题与正文 */
function sectionBlocks(doc) {
  const parts = String(doc).split(/^##\s+/m);
  return parts.slice(1).map((p) => {
    const lines = p.split(/\r?\n/);
    return { title: lines[0].trim(), body: lines.slice(1).join('\n') };
  });
}

const sections = (doc) => sectionBlocks(doc).map((s) => s.title);

/** 表格：逐张给出表头与数据行 */
function tables(text) {
  const blocks = [];
  let cur = null;
  for (const line of String(text).split(/\r?\n/)) {
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

/** 小节标题里的数目与该节首张表的数据行数是否一致 */
function enumChecks(doc) {
  return sectionBlocks(doc)
    .map((s) => {
      const m = s.title.match(/([一二三四五六七八九十])(层|类)/);
      const ts = tables(s.body);
      if (!m || !ts.length) return null;
      const stated = NUM[m[1]];
      const rows = ts[0].rows.length;
      return { title: s.title, stated, unit: m[2], rows, ok: stated === rows };
    })
    .filter(Boolean);
}

/** 本章算术：九质里几质有证候支撑、六类动作按可改程度分档 */
function arithmetic(doc) {
  const text = String(doc);
  const m = text.match(/([一二三四五六七八九十])种体质里，([一二三四五六七八九十])种有证候支撑/);
  if (!m) throw new Error('正文里找不到「九种体质里八种有证候支撑」这句');
  const whole = NUM[m[1]];
  const supported = NUM[m[2]];
  const silent = whole - supported;

  const hi = text.match(/([^。；，：\n]+)属高度可改/);
  const part = text.match(/([^。；，：\n]+)属部分可改/);
  if (!hi || !part) throw new Error('正文里找不到「高度可改 / 部分可改」的分档');
  const split = (s) => s.split(/[、，]/).map((x) => x.trim()).filter(Boolean);
  const highChange = split(hi[1]);
  const partialChange = split(part[1]);

  const actionTable = tables(doc).find((t) => t.header.some((h) => h.includes('能做什么')));
  const actionRows = actionTable ? actionTable.rows.length : 0;
  const inClinic = actionRows - highChange.length - partialChange.length;

  return {
    types: { whole, supported, silent },
    supportedShare: round1((supported / whole) * 100),
    silentShare: round1((silent / whole) * 100),
    highChange,
    partialChange,
    actionRows,
    inClinic,
    partitions: highChange.length + partialChange.length + inClinic === actionRows,
    enums: enumChecks(doc),
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
  console.log(
    `算术一：九质里 ${a.types.supported} 质有证候支撑、${a.types.silent} 质没有，支撑面 ${a.supportedShare}%；`
  );
  console.log(
    `        ${r.doc.includes('平和质') ? '正文点名的那一质是平和质' : '正文未点名缺的那一质'}——目标若写成「调成平和质」，需要测的东西在本库里不存在。`
  );
  console.log(
    `算术二：六类动作按可改程度分档 = 高度可改 ${a.highChange.length}（${a.highChange.join('、')}）+ 部分可改 ${a.partialChange.length}（${a.partialChange.join('、')}）+ 机构内 ${a.inClinic} = ${a.actionRows} 类，${a.partitions ? '分档闭合' : '分档不闭合'}`
  );
  console.log('');
  console.log('算术三：小节标题里的数目与该节表格行数：');
  for (const e of a.enums) {
    console.log(`  ${e.ok ? '✓' : '✗'} ${e.unit} ${e.stated} 项 vs 表格 ${e.rows} 行 — ${e.title}`);
  }
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
  console.log('※ 以上数字全部从本章正文与习题现算，改正文后重跑即可复核；「回移一档」是教学刻度，「不偏」不等于越标准越好。');
  console.log('※ 本章为教学材料，不构成临床判断依据，也不能替代医师面诊；调护方案与外治须由具备资质的医师按所在机构制度执行。');
}

if (require.main === module) main();

module.exports = {
  analyze,
  readDoc,
  sections,
  sectionBlocks,
  tables,
  tableShape,
  paragraphs,
  books,
  grams,
  hanzi,
  count,
  round1,
  enumChecks,
  arithmetic,
  termCounts,
  groupCheck,
  quizSummary,
  TERMS,
  GROUPS,
  NUM,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
};
