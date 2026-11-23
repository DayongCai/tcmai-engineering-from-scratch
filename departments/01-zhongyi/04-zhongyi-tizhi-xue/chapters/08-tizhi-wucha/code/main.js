'use strict';
/**
 * 中医体质学 · 第 8 章 可重复性与测量误差：四域各自计量，再谈结论
 *
 *   node code/main.js
 *
 * 课程：departments/01-zhongyi/04-zhongyi-tizhi-xue/chapters/08-tizhi-wucha/docs/zh.md
 * 习题：chapters/08-tizhi-wucha/quiz.json
 *
 * 本章每个数字都从本章正文现算，不读仓库底本、不手抄结论：
 *   · 结构：小节数、汉字数、表格张数与行数、段落数、引书
 *   · 算术：把正文开头那组示例（真值 3.4 / 漂移 0.2 / 判定线 3.5 / 量程 1–4）重算一遍——
 *           漂移后是否真的跨线、0.2 占量程几个百分点；
 *           把「90 人判同一质、其余 10 人散在八质」的一致率拆成机遇一致与 Kappa；
 *           湿热质与阳虚质的证候数量级差
 *   · 判据：一组关键术语在正文里的出现次数
 *   · 骨架：几组并列项是否真的在正文里立住
 *   · 习题：题量、三段分布、解释长度、check 题能否在正文找到原词
 * 正文一改，重跑就知道是哪一条对不上。
 */

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const CHAPTER = 8;
const SLUG = '08-tizhi-wucha';
const TITLE = '可重复性与测量误差：四域各自计量，再谈结论';

/** 本章的判据术语：正文靠它们把「先查尺子再查人」立住 */
const TERMS = [
  ['对象内变异', '同一人两次结果不同'],
  ['施测者间变异', '体质辨识里通常是最大的一处'],
  ['工具变异', '版本一换，跨版本比较即无意义'],
  ['一致率', '受「都判最常见那一类」策略抬高'],
  ['Kappa', '扣除机遇一致后还剩多少'],
  ['ICC', '只对连续分数成立，不适用于质名'],
  ['待定', '近线时唯一不勉强的结论'],
  ['近线', '判定线附近天生给不出稳定答案'],
  ['判定线', '跨过它，结论就整体翻转'],
];

/** 本章的骨架：几组并列项必须齐全，缺一项说明正文这一节没写完 */
const GROUPS = [
  { label: '三类误差', all: ['对象内变异', '施测者间变异', '工具变异'] },
  { label: '六个重测条件', all: ['时段', '近期事件', '饮食', '施测者', '工具版本', '间隔'] },
  { label: '三个一致性指标', all: ['一致率', 'Kappa', 'ICC'] },
  {
    label: '四类近线处置',
    all: ['关键域分数落在判定线附近', '两质同时近线', '复测后仍近线', '复测后离开近线'],
  },
  {
    label: '重测记录七字段',
    all: ['测量条件', '施测者', '工具版本', '双次结果', '差异归因', '待定标记', '复核结论'],
  },
];

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const count = (text, term) => String(text).split(term).length - 1;
const round1 = (x) => Math.round(x * 10) / 10;

const readDoc = (file = DOC) => fs.readFileSync(file, 'utf8');

/** 「## 」小节标题 */
function sections(doc) {
  return [...String(doc).matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
}

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

/** 从正文句子里取数：取不到就抛，绝不退回手打常数 */
function must(doc, re, what) {
  const m = String(doc).match(re);
  if (!m) throw new Error(`正文里找不到${what}`);
  return m;
}

/**
 * 本章算术：
 *   一、近线翻转：真值 + 漂移 是否跨过判定线；漂移占量程百分之几
 *   二、一致率拆解：一致率 → 机遇一致 → Kappa
 *   三、量级差：两个质的证候数相差几倍
 */
function arithmetic(doc) {
  const text = String(doc);

  // 一、近线翻转
  const trueValue = Number(must(text, /真值是\s*(\d+(?:\.\d+)?)/, '真值')[1]);
  const drift = Number(must(text, /漂\s*(\d+(?:\.\d+)?)/, '漂移量')[1]);
  const cut = Number(must(text, /判定线设在\s*(\d+(?:\.\d+)?)/, '判定线')[1]);
  const [, loRaw, hiRaw] = must(text, /落在\s*(\d+)\s*到\s*(\d+)\s*之间/, '量程');
  const lo = Number(loRaw);
  const hi = Number(hiRaw);
  const after = round1(trueValue + drift);
  const flipped = after >= cut;
  const span = hi - lo;
  const driftShare = round1((drift / span) * 100);
  const domains = NUM[must(text, /([一二三四五六七八九十])个域各判定一次/, '四域各判定一次')[1]];

  // 二、一致率拆解
  const [, sameRaw, restRaw, othersRaw] = must(
    text,
    /各把\s*(\d+)\s*人判为同一质，其余\s*(\d+)\s*人分散在\s*([一二三四五六七八九十]+)\s*个质上/,
    '一致率算例'
  );
  const same = Number(sameRaw);
  const rest = Number(restRaw);
  const others = NUM[othersRaw];
  const total = same + rest;
  const agree = same / total;
  const restShare = rest / others / total;
  const chance = agree * agree + others * restShare * restShare;
  const kappa = (agree - chance) / (1 - chance);

  // 三、量级差
  const [, bigRaw, smallRaw] = must(text, /湿热质\s*(\d+)\s*证、阳虚质\s*(\d+)\s*证/, '两质证候数');
  const big = Number(bigRaw);
  const small = Number(smallRaw);
  const ratio = round1(big / small);
  const times = Math.floor(ratio);

  return {
    nearLine: { trueValue, drift, cut, lo, hi, after, flipped, span, driftShare, domains },
    agreement: {
      same,
      rest,
      others,
      total,
      agree: round1(agree * 100),
      restShare: round1(restShare * 10000) / 10000,
      chance: round1(chance * 100),
      chanceMatchesDoc: text.includes(`${Math.round(chance * 100)}%`),
      kappa: round1(kappa * 100) / 100,
      kappaMatchesDoc: text.includes(`${round1(kappa * 100) / 100}`),
    },
    magnitude: { big, small, ratio, times },
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
  const n = a.nearLine;
  const g = a.agreement;
  const g2 = a.magnitude;
  console.log(`中医体质学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log(
    `正文 ${r.hanzi.toLocaleString('en-US')} 汉字 · ${r.sections.length} 节 · 表 ${r.table.tables} 张 / ${r.table.rows} 行 · 段 ${r.paragraphs} · 引书 ${r.books.length} 部`
  );
  console.log('');
  console.log('小节：');
  for (const s of r.sections) console.log(`  · ${s}`);
  console.log('');
  console.log(
    `算术一：真值 ${n.trueValue}，漂 ${n.drift} 后为 ${n.after}；判定线 ${n.cut}，${n.flipped ? '已跨线，结论翻转' : '未跨线'}。`
  );
  console.log(
    `        量程 ${n.lo}–${n.hi} 共 ${n.span} 个刻度间隔，${n.drift} 只占 ${n.driftShare}%，却足以改掉一整个质名；${n.domains} 个域各判一次就是 ${n.domains} 次机会。`
  );
  console.log(
    `算术二：一致率 ${g.agree}% 里，机遇一致约 ${g.chance}%（正文写 ${g.chanceMatchesDoc ? '八成一' : '与实测不符'}）；${g.same} / ${g.total} 同判一质，其余 ${g.rest} 人散在 ${g.others} 质，每质 ${g.restShare}`
  );
  console.log(
    `        扣掉机遇：(${g.agree}/100 − ${g.chance}/100) ÷ (1 − ${g.chance}/100) = Kappa ≈ ${g.kappa}${g.kappaMatchesDoc ? '（与正文一致）' : '（与正文不一致）'}`
  );
  console.log(`        同一组数：只报一致率是「九成」，扣掉机遇只剩中等——这就是三个数要一起看的原因。`);
  console.log(
    `算术三：证候数 ${g2.big} vs ${g2.small}，相差 ${g2.ratio} 倍（按整倍算 ${g2.times} 倍）；分布如此不均时，近线判读会倒向大组。`
  );
  console.log('');
  console.log('判据命中：');
  for (const t of r.terms) console.log(`  ${t.n > 0 ? '✓' : '✗'} ${t.term} ${t.n} 次 — ${t.why}`);
  console.log('');
  console.log('骨架：');
  for (const x of r.groups) {
    console.log(`  ${x.missing.length ? '✗' : '✓'} ${x.label}${x.missing.length ? `（缺 ${x.missing.join('、')}）` : ''}`);
  }
  console.log('');
  console.log(
    `习题 ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 题接地 ${r.quiz.checkGrounded} 道 · 答案 ${r.quiz.answers.join('/')}`
  );
  console.log('※ 以上数字全部从本章正文与习题现算，改正文后重跑即可复核；示例数值均为教学演算，不是量表阈值或实测信度。');
  console.log('※ 本章为教学材料，不构成临床判断依据，也不能替代医师面诊；量表信度与判定线须由研制方与具备资质的医师确定。');
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
