'use strict';
/**
 * 第 4 章 · 风温与春温：新感与伏邪
 *
 *   node code/main.js
 *
 * 数据：standards/wenbing/底本.json  books[id=tiaobian] 的三个篇
 *   · 卷一·上焦篇 風温、温熱、温疫、温毒、冬温  21 条
 *   · 卷二·中焦篇 風温、温熱、温疫、温毒、冬温  37 条
 *   · 卷三·下焦篇 風温、温熱、温疫、温毒、冬温  35 条
 *   合计 93 条。条号沿用源页漢数字（卷一·上焦篇 一..二一，卷内连编）。
 *
 * 口径（三条，改任何一条都要同步改 docs/zh.md 与本文件头注）：
 *   · 方取 formulas[] 全部条目，含 refOnly（互见）：只留方名与出处注，无药味，
 *     故不进药味统计。方条数 ≠ 有方文方数，报数必须写清是哪一种。
 *   · 「新感 / 伏邪」是本章设定的两类词证，**原文无此二分**：全书「新感」0 见，
 *     「伏邪」仅 1 见且不在本三篇。分类只按条文里的起手词与病程词，不按病机推演。
 *   · 三焦转归链的每一跳都必须落一条原文（条号 + 原字），方后注单列标 src。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/wenbing/底本.json'), 'utf8'));
const TIAOBIAN = BOOK.books.find((b) => b.id === 'tiaobian');

/** 三篇共用的篇名（原文作繁体，「風」不作「风」） */
const PIAN_NAME = '風温、温熱、温疫、温毒、冬温';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

/** 卷 → 三焦名 */
const STAGE_OF_JUAN = { '卷一': '上焦', '卷二': '中焦', '卷三': '下焦' };

/** 取本三篇：篇名相符，且卷次属上/中/下三焦 */
function pians() {
  const out = [];
  for (const s of TIAOBIAN.sections) {
    if (s.pian !== PIAN_NAME) continue;
    const juanKey = String(s.juan || '').split('·')[0];
    const stage = STAGE_OF_JUAN[juanKey];
    if (!stage) continue;
    out.push({ stage, juan: s.juan, articles: s.articles, formulas: s.formulas || [] });
  }
  const ORDER = { 上焦: 0, 中焦: 1, 下焦: 2 };
  return out.sort((a, b) => ORDER[a.stage] - ORDER[b.stage]);
}

const herbsOf = (p) =>
  p.formulas.flatMap((f) => (f.ingredients || []).map((i) => i.herbSimp || i.herb));

/** 逐焦画像：条 / 方条 / 有方文 / 互见 / 方条比 / 药味 */
function fangByStage() {
  return pians().map((p) => {
    const hujian = p.formulas.filter((f) => f.refOnly).length;
    const youFang = p.formulas.filter((f) => !f.refOnly);
    const tokens = herbsOf(p);
    return {
      stage: p.stage,
      juan: p.juan,
      tiao: p.articles.length,
      fang: p.formulas.length,
      youFang: youFang.length,
      hujian,
      per: p.articles.length ? Number((p.formulas.length / p.articles.length).toFixed(2)) : 0,
      herbTokens: tokens.length,
      distinctHerbs: new Set(tokens).size,
      /** 有方文方名（按源页出现顺序），供文档逐焦列名 */
      names: youFang.map((f) => f.nameSimp),
      /** 首条与末条的源页条号 */
      firstNo: p.articles[0] && p.articles[0].no,
      lastNo: p.articles[p.articles.length - 1] && p.articles[p.articles.length - 1].no,
    };
  });
}

/**
 * 新感 / 伏邪的词证
 *
 * 词表是本章判据，不是原文范畴：
 *   新感 —— 起手见卫表：恶风寒 / 恶寒；起手时间词：初起 / 始于 / 得之二、三日
 *   伏邪 —— 病程已长或伏而后发：久羁 / 已下 / 汗下后 / 六、七日以外 / 但热不恶寒 /
 *           藏于精 / 冬伤于寒
 * 一条可同时命中两类（如「初起」而「但热不恶寒」），故先按类各统计，再报交叉数。
 */
const MARKS = {
  新感: {
    label: '新感（感而即发）',
    words: ['恶风寒', '恶寒', '初起', '始于', '得之二、三日'],
    basis: '上焦篇·第二「凡病温者，始于上焦，在手太隂」；上焦篇·第四「初起恶风寒者，桂枝汤主之」',
  },
  伏邪: {
    label: '伏邪（伏而后发）',
    words: ['久羁', '已下', '汗下后', '六、七日以外', '但热不恶寒', '藏于精', '冬伤于寒'],
    basis: '原病篇·第二「冬伤于寒，春必病温」；原病篇·第三「藏于精者，春不病温」；下焦篇·第一「邪在阳明久羁」',
  },
};

function xingan() {
  const rows = pians().map((p) => {
    const hits = { 新感: [], 伏邪: [] };
    const both = [];
    for (const a of p.articles) {
      const text = a.zhHans || '';
      const inX = MARKS.新感.words.some((w) => text.includes(w));
      const inF = MARKS.伏邪.words.some((w) => text.includes(w));
      if (inX) hits.新感.push(a.no);
      if (inF) hits.伏邪.push(a.no);
      if (inX && inF) both.push(a.no);
    }
    return {
      stage: p.stage,
      tiao: p.articles.length,
      新感: hits.新感,
      伏邪: hits.伏邪,
      交叉: both,
      未标: p.articles.filter((a) => !hits.新感.includes(a.no) && !hits.伏邪.includes(a.no)).length,
    };
  });
  return { marks: MARKS, rows, totals: totalsOf(rows) };
}

function totalsOf(rows) {
  const t = { tiao: 0, 新感: 0, 伏邪: 0, 交叉: 0, 未标: 0 };
  for (const r of rows) {
    t.tiao += r.tiao;
    t.新感 += r.新感.length;
    t.伏邪 += r.伏邪.length;
    t.交叉 += r.交叉.length;
    t.未标 += r.未标;
  }
  return t;
}

/** 逐条索引：便于取原文原字做引证 */
function index() {
  const map = new Map();
  for (const p of pians()) for (const a of p.articles) map.set(`${p.stage}:${a.no}`, { ...a, stage: p.stage });
  return map;
}

/**
 * 三焦转归链：每跳一条原文
 *
 * 节点 = 三焦；跳 = 转归；闸 = 原文明写的「不可与」（阻止继续传变的判据）。
 * src: 'tiao' 条文 / 'note' 方后注（非条文，引用时必须写明）。
 */
function progression() {
  return {
    nodes: [
      { stage: '上焦', where: '手太隂', evidence: { at: '上焦篇·第二', src: 'tiao', quote: '凡病温者，始于上焦，在手太隂。' } },
      { stage: '中焦', where: '阳明', evidence: { at: '中焦篇·第一', src: 'tiao', quote: '日晡益甚者，传至中焦，阳明温病也。' } },
      { stage: '下焦', where: '少隂、厥隂', evidence: { at: '下焦篇·第一', src: 'tiao', quote: '邪在阳明久羁……脉虚大，手足心热甚于手足背者，加减复脉汤主之。' } },
    ],
    hops: [
      {
        from: '上焦', to: '中焦',
        words: ['传至中焦', '中下焦证', '阳明病居多'],
        evidence: [
          { at: '中焦篇·第一', src: 'tiao', quote: '传至中焦，阳明温病也。' },
          { at: '上焦篇·第四', src: 'note', quote: '缓缓延至数日后，必成中下焦证矣。' },
          { at: '中焦篇·第三七', src: 'tiao', quote: '风温、温热、温疫、温毒、冬温之在中焦，阳明病居多；' },
        ],
      },
      {
        from: '中焦', to: '下焦',
        words: ['属下焦复脉法', '邪在阳明久羁', '少隂'],
        evidence: [
          { at: '中焦篇·第三三', src: 'tiao', quote: '日深舌微干者，属下焦复脉法也（方见下焦）。' },
          { at: '下焦篇·第一', src: 'tiao', quote: '邪在阳明久羁，或已下，或未下……脉虚大，手足心热甚于手足背者，加减复脉汤主之。' },
        ],
      },
    ],
    gates: [
      { at: '上焦篇·第九', scope: '上焦', quote: '脉浮弦而细者，不可与也；脉沉者，不可与也；不渴者，不可与也，汗不出者，不可与也；', what: '白虎四禁' },
      { at: '中焦篇·第三十', scope: '中焦', quote: '温病小便不利者，淡渗不可与也，忌五苓、八正辈。', what: '禁淡渗' },
      { at: '中焦篇·第三一', scope: '中焦', quote: '温病燥热，欲解燥者，先滋其干，不可纯用苦寒也，服之反燥甚。', what: '禁纯苦寒' },
      { at: '下焦篇·第十七', scope: '下焦', quote: '壮火尚盛者，不得用定风珠、复脉。邪少虚多者，不得用黄连阿胶汤。隂虚欲痉者，不得用青蒿鳖甲汤。', what: '三不得用' },
    ],
  };
}

function totals() {
  const rows = fangByStage();
  const x = xingan().totals;
  return {
    pians: rows.length,
    tiao: rows.reduce((n, r) => n + r.tiao, 0),
    fang: rows.reduce((n, r) => n + r.fang, 0),
    youFang: rows.reduce((n, r) => n + r.youFang, 0),
    hujian: rows.reduce((n, r) => n + r.hujian, 0),
    herbTokens: rows.reduce((n, r) => n + r.herbTokens, 0),
    distinctHerbs: new Set(pians().flatMap(herbsOf)).size,
    /** 能按词表判新感/伏邪的条数 = 总条数 − 未标 */
    kePan: x.tiao - x.未标,
    xingan: x,
  };
}

/** 方名 → 出处（焦、条号、是否互见、药味数），供引证与测试 */
function formulaIndex() {
  const out = new Map();
  for (const p of pians()) {
    for (const f of p.formulas) {
      if (!out.has(f.nameSimp)) out.set(f.nameSimp, []);
      out.get(f.nameSimp).push({
        stage: p.stage,
        tiao: f.tiao,
        refOnly: !!f.refOnly,
        herbs: (f.ingredients || []).length,
      });
    }
  }
  return out;
}

if (require.main === module) {
  console.log('');
  console.log('  教学边界：本输出为《温病条辨》风温三篇的条文统计与词证，原文取自 standards/wenbing/底本.json，可复算；不构成诊疗依据。');
  console.log('');
  const t = totals();
  console.log('═══ 温病条辨 · 风温三篇（新感与伏邪） ═══');
  console.log(`  篇 ${t.pians} · 条 ${t.tiao} · 方条 ${t.fang}（有方文 ${t.youFang} + 互见 ${t.hujian}）`);
  console.log(`  药味出现 ${t.herbTokens} 次 · 不同药 ${t.distinctHerbs} 味\n`);
  console.log('  焦 | 卷 | 条 | 方条 | 有方文 | 互见 | 方/条 | 药味次 | 不同药');
  for (const r of fangByStage()) {
    console.log(`  ${r.stage} | ${r.juan} | ${r.tiao} | ${r.fang} | ${r.youFang} | ${r.hujian} | ${r.per} | ${r.herbTokens} | ${r.distinctHerbs}`);
  }
  console.log('\n  有方文方名：');
  for (const r of fangByStage()) console.log(`  ${r.stage}（${r.youFang}）：${r.names.join('、')}`);

  const x = xingan();
  console.log(`\n  新感 / 伏邪 词证（本章判据，原文无此二分）`);
  console.log(`  焦 | 条 | 新感 | 伏邪 | 交叉 | 未标`);
  for (const r of x.rows) console.log(`  ${r.stage} | ${r.tiao} | ${r.新感.length} | ${r.伏邪.length} | ${r.交叉.length} | ${r.未标}`);
  console.log(`  合计 | ${x.totals.tiao} | ${x.totals.新感} | ${x.totals.伏邪} | ${x.totals.交叉} | ${x.totals.未标}`);
  console.log(`  可按词表判者 ${t.kePan} / ${t.tiao} 条（新感 ${x.totals.新感} + 伏邪 ${x.totals.伏邪} − 交叉 ${x.totals.交叉}），其余 ${x.totals.未标} 条不含时间/病程词，不判`);
  for (const r of x.rows) {
    console.log(`  ${r.stage} 新感条：${r.新感.join('、') || '无'}`);
    console.log(`  ${r.stage} 伏邪条：${r.伏邪.join('、') || '无'}`);
  }

  const p = progression();
  console.log('\n  三焦转归链（每跳落原文）：');
  for (const h of p.hops) {
    console.log(`  ${h.from} → ${h.to}｜词：${h.words.join('、')}`);
    for (const e of h.evidence) console.log(`     ${e.at}（${e.src === 'note' ? '方后注' : '条文'}）「${e.quote}」`);
  }
  console.log('\n  闸（原文明写的不可与）：');
  for (const g of p.gates) console.log(`  ${g.at} ${g.what}：「${g.quote}」`);

  const a = docAudit();
  console.log('\n  正文与 quiz 对账（读 docs/zh.md）');
  for (const f of a.facts) console.log(`  ${f.got === f.want ? '✓' : '✗'} ${f.label} 现算 ${f.got} · 正文 ${f.want}`);
  console.log(`  quiz ${a.quiz.total} 题（pre ${a.quiz.stage.pre} / check ${a.quiz.stage.check} / post ${a.quiz.stage.post}）· check 接地 ${a.quiz.groundedChecks} 道 · 答案 ${a.quiz.answers.join('/')}`);
}

/* ── 正文与 quiz 的对账：正文写死的数逐格回底本复算 ── */

function hanzi(s) {
  return (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
}

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizAudit(raw) {
  const qs = JSON.parse(raw).questions || [];
  const stage = { pre: 0, check: 0, post: 0 };
  const rows = qs.map((q) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    return { stage: q.stage, options: opts.length, correct: q.correct, explainHanzi: hanzi(q.explain), right: String(opts[q.correct] || '') };
  });
  return {
    total: qs.length,
    stage,
    rows,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    allFour: rows.every((r) => r.options === 4),
    badCorrect: rows.filter((r) => !(Number.isInteger(r.correct) && r.correct >= 0 && r.correct < 4)).length,
    minExplain: Math.min(...rows.map((r) => r.explainHanzi)),
    scaffold: new RegExp(['三' + '辨', '四位' + '面', '单元' + '规模', '本章' + '实测'].join('|')).test(raw),
  };
}

function docAudit() {
  const doc = fs.readFileSync(DOC, 'utf8');
  const qraw = fs.readFileSync(QUIZ, 'utf8');
  const t = totals();
  const fbs = fangByStage();
  const x = xingan();
  const grab = (re, label) => {
    const m = re.exec(doc);
    if (!m) throw new Error(`正文里定位不到「${label}」`);
    return m.slice(1).map((v) => Number(String(v).replace(/,/g, '')));
  };

  const [docPian, docTiao, docFang, docYou, docHu] = grab(/篇 (\d+) · 条 (\d+) · 方条 (\d+)（(\d+) \+ (\d+)）/, '三篇规模').map(Number);
  const [docHerb, docDistinct] = grab(/出现 \*\*(\d+) 次\*\* · 不同药名 \*\*(\d+)\*\*/, '药味统计');
  const stageRows = [...doc.matchAll(/^\| (上焦|中焦|下焦) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| ([\d.]+) \| (\d+) \| (\d+) \|$/gm)]
    .map((m) => ({ stage: m[1], tiao: +m[2], fang: +m[3], youFang: +m[4], hujian: +m[5], per: +m[6], herbTokens: +m[7], distinctHerbs: +m[8] }));
  if (stageRows.length !== 3) throw new Error('正文三篇分工表不是 3 行');
  const xRows = [...doc.matchAll(/^\| (上焦|中焦|下焦) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \|$/gm)]
    .map((m) => ({ stage: m[1], tiao: +m[2], xin: +m[3], fu: +m[4], cross: +m[5], untagged: +m[6] }));
  if (xRows.length !== 3) throw new Error('正文「按焦分布」表不是 3 行');
  const [docXin, docFu, docCross, docUntagged] = grab(/新感 (\d+) · 伏邪 (\d+) · 交叉 (\d+) · 未标 (\d+)/, '词证四类');
  const [docMarkXin, docMarkQi, docMarkFu, docMarkChun] = grab(/「新感」(\d+) 次、「伏气」(\d+) 次、「伏邪」(\d+) 次、「春温」(\d+) 次/, '全书四词计数');

  const allText = TIAOBIAN.sections.flatMap((s) => s.articles.map((a) => a.zhHans)).join('\n');
  const count = (w) => (allText.match(new RegExp(w, 'g')) || []).length;

  const facts = [
    { label: '篇 / 条 / 方条', got: `${t.pians}/${t.tiao}/${t.fang}`, want: `${docPian}/${docTiao}/${docFang}` },
    { label: '有方文 / 互见', got: `${t.youFang}/${t.hujian}`, want: `${docYou}/${docHu}` },
    { label: '药味次 / 不同药', got: `${t.herbTokens}/${t.distinctHerbs}`, want: `${docHerb}/${docDistinct}` },
    { label: '新感/伏邪/交叉/未标', got: [x.totals.新感, x.totals.伏邪, x.totals.交叉, x.totals.未标].join('/'), want: [docXin, docFu, docCross, docUntagged].join('/') },
    { label: '全书 新感/伏气/伏邪/春温', got: [count('新感'), count('伏气'), count('伏邪'), count('春温')].join('/'), want: [docMarkXin, docMarkQi, docMarkFu, docMarkChun].join('/') },
    { label: '证据面 16/93 ≈ 17%', got: `${x.totals.新感 + x.totals.伏邪 + x.totals.交叉}/${t.tiao}`, want: `16/${t.tiao}` },
  ];
  for (const r of stageRows) {
    const g = fbs.find((v) => v.stage === r.stage);
    facts.push({ label: `${r.stage} 条/方/有方文/互见/方条比/药味/药名`, got: g ? [g.tiao, g.fang, g.youFang, g.hujian, g.per, g.herbTokens, g.distinctHerbs].join('/') : '缺', want: [r.tiao, r.fang, r.youFang, r.hujian, r.per, r.herbTokens, r.distinctHerbs].join('/') });
  }
  for (const r of xRows) {
    const g = x.rows.find((v) => v.stage === r.stage);
    facts.push({ label: `${r.stage} 新感/伏邪/交叉/未标`, got: g ? [g.新感.length, g.伏邪.length, g.交叉.length, g.未标].join('/') : '缺', want: [r.xin, r.fu, r.cross, r.untagged].join('/') });
  }

  const q = quizAudit(qraw);
  const body = grams(doc);
  const grounded = q.rows.filter((r) => r.stage === 'check' && [...grams(r.right)].some((v) => body.has(v))).length;
  return {
    facts,
    quiz: { ...q, groundedChecks: grounded },
    quotes: ['冬伤于寒，春必病温', '邪在阳明久羁', '春温内陷下痢', '中虚伏邪'].map((w) => ({
      quote: w,
      inDoc: doc.includes(w),
      inSource: allText.includes(w),
    })),
  };
}

module.exports = { BOOK, TIAOBIAN, PIAN_NAME, pians, fangByStage, xingan, progression, totals, formulaIndex, index, MARKS, DOC, QUIZ, hanzi, grams, quizAudit, docAudit };
