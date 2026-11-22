'use strict';
/**
 * 第 6 章 · 秋燥与伏暑：燥邪的辨证
 * departments/01-zhongyi/09-wenbing-xue/chapters/06-qiuzzao-fushu/docs/zh.md
 *
 *   node code/main.js
 *   node --test code/main.test.js
 *
 * 数据：standards/wenbing/底本.json → books[id='tiaobian']（外源·笈成·溫病條辨，
 *       sha256 30d2e6ca…ece59，见 standards/wenbing/底本.md）。本章不引任何记忆中的条文。
 *
 * 口径（四条，改任何一条都要同步改 docs/zh.md）：
 *   · 只取 5 个篇：上焦·秋燥 / 上焦·補秋燥勝氣論 / 上焦·伏暑 / 中焦·秋燥 / 下焦·秋燥。
 *   · 方取 section.formulas[] 全部；refOnly=true 者只有方名与出处注（「方见前」「并见前」），
 *     无药味，报数时单列，不并进「有方文」。
 *   · 補秋燥勝氣論的 22 段里，14 段是化症回生丹的方后主治（「治症结不散不痛。」式，
 *     源页把它们切成独立段、条号一律记为「一」）。条辨只有 8 条 —— isIndication() 负责剔除。
 *   · 凉燥 / 温燥 不是原文的证型名（全书「凉燥」0 次，「温燥」5 次全指「温燥之方」的药性）。
 *     本章按两个证据通道归类：① 条内寒热词 ② 方名前后的治法词（辛凉平剂、苦温…）。
 *     这是本章的教学标签，原文没有这两个证型 —— 见 docs「代价与边界」。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/wenbing/底本.json'), 'utf8'));
const BOOK = BOOKS.books.find((b) => b.id === 'tiaobian');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

/** 本章 5 个篇。key 只用在本文件与测试里 */
const SEC_DEFS = [
  { key: 'zaoShang', juan: '卷一·上焦篇', pian: '秋燥', label: '上焦·秋燥' },
  { key: 'zaoBu', juan: '卷一·上焦篇', pian: '補秋燥勝氣論', label: '上焦·補秋燥勝氣論' },
  { key: 'fuShu', juan: '卷一·上焦篇', pian: '伏暑', label: '上焦·伏暑' },
  { key: 'zaoZhong', juan: '卷二·中焦篇', pian: '秋燥', label: '中焦·秋燥' },
  { key: 'zaoXia', juan: '卷三·下焦篇', pian: '秋燥', label: '下焦·秋燥' },
];

const secOf = (def) => BOOK.sections.find((s) => s.juan === def.juan && s.pian === def.pian);
const SEC = Object.fromEntries(SEC_DEFS.map((d) => [d.key, { ...d, sec: secOf(d) }]));

/**
 * 方后主治段：以「治」起、以「。」收、不超过 24 字、无方（「治妇女经前作痛，古谓之痛经者。」）。
 * 化症回生丹后 14 段全是这种式子，源页把每段切成一条、条号一律记「一」；
 * 补论真正的第一条是「秋燥之气，轻则为燥…」，不以「治」起，故不误伤。
 */
const isIndication = (a) => /^治[\s\S]{2,22}。$/.test(a.zhHant.replace(/\n/g, '')) && (a.formulas || []).length === 0;

const articlesOf = (def) => (def.sec ? def.sec.articles : []);
const tiaoOf = (def) => articlesOf(def).filter((a) => !isIndication(a));
const formulasOf = (def) => (def.sec ? def.sec.formulas : []);
const bodyOf = (a) => [a.zhHant, ...(a.notes || [])].join('\n');
const sourceOf = (a) => [a.zhHans, ...(a.notes || [])].join('\n');

// ─────────── 1. 篇章画像 ───────────

/** 逐篇：段数 / 条辨数 / 方（有方文 + 互见）/ 字 */
function profile() {
  return SEC_DEFS.map((d) => {
    const def = SEC[d.key];
    const f = formulasOf(def);
    const arts = articlesOf(def);
    return {
      label: def.label,
      juan: def.juan,
      duan: arts.length,
      tiao: tiaoOf(def).length,
      zhuZhi: arts.length - tiaoOf(def).length,
      fang: f.length,
      fangWen: f.filter((x) => !x.refOnly).length,
      fangRef: f.filter((x) => x.refOnly).length,
      chars: arts.reduce((n, a) => n + bodyOf(a).length, 0),
    };
  });
}

function totals() {
  const rows = profile();
  const sum = (k) => rows.reduce((n, r) => n + r[k], 0);
  return {
    tiao: sum('tiao'),
    duan: sum('duan'),
    fang: sum('fang'),
    fangWen: sum('fangWen'),
    fangRef: sum('fangRef'),
    chars: sum('chars'),
  };
}

// ─────────── 2. zaoType()：凉燥 / 温燥 ───────────

/**
 * 两个证据通道都写死在表里，便于复核与反驳：
 *   寒词 —— 原文自己给出的「寒/温」方向
 *   热词 —— 同上
 * 先看条辨正文，正文无词才看作者自注（标「据注」）。命中两侧即「兼见」
 * （如「轻则为燥，重则为寒…复气为火」、阳明未化/已化两法并出）。
 * 这是关键词通道，粗；所以输出把命中的词原样列出来，让人自己看是「正治」还是「所忌」。
 */
const COLD_WORDS = ['苦温', '辛温', '温燥', '小寒', '为寒', '恶寒', '无汗', '稀痰', '鼻塞', '脉弦', '嗌塞', '桂枝'];
const HOT_WORDS = ['辛凉', '甘寒', '苦寒', '数大', '化火', '燥热', '清窍', '舌赤', '口渴', '润剂', '为火'];

/** 正文是繁体、注是半简半繁 —— 关键词匹配前先归一，否则「右脈數大」查不到「数大」 */
const T2S = { 數: '数', 脈: '脉', 熱: '热', 證: '证', 溫: '温', 隂: '阴', 澀: '涩', 乾: '干', 渴: '渴', 燥: '燥' };
const normT = (s) => s.replace(/[數脈熱證溫隂澀乾]/g, (c) => T2S[c] || c);

/** 方名前 12 字内的治法词（全书写法，如「辛凉轻剂桑菊饮主之」） */
const NATURES = ['辛凉平剂', '辛凉轻剂', '辛凉', '辛温', '苦温', '甘寒', '苦寒', '甘润'];
const NATURE_DIR = { 辛凉平剂: '温燥', 辛凉轻剂: '温燥', 辛凉: '温燥', 甘寒: '温燥', 苦寒: '温燥', 甘润: '温燥', 苦温: '凉燥', 辛温: '凉燥' };

function formulaNature(name) {
  const base = String(name).replace(/方$/, '');
  for (const s of BOOK.sections) {
    for (const a of s.articles) {
      const t = a.zhHans;
      let i = t.indexOf(base);
      while (i >= 0) {
        const before = t.slice(Math.max(0, i - 12), i);
        for (const n of NATURES) if (before.includes(n)) return { nature: n, dir: NATURE_DIR[n], ref: `${s.pian}·${a.no}` };
        i = t.indexOf(base, i + 1);
      }
    }
  }
  return { nature: null, dir: null, ref: null };
}

const hitWords = (text, words) => words.filter((w) => text.includes(w));
const firstClause = (a) => a.zhHant.split(/[，。；]/)[0].slice(0, 22);

/** 归类的对象：上焦秋燥 + 補论 + 下焦秋燥 的全部条辨（不含方后主治段） */
function zaoRows() {
  const rows = [];
  for (const key of ['zaoShang', 'zaoBu', 'zaoXia']) {
    const def = SEC[key];
    for (const a of tiaoOf(def)) {
      // 正文用 zhHans（构建脚本已转简）；注只有半简半繁的 notes，用 normT 兜底
      const body = a.zhHans;
      const note = normT((a.notes || []).join('\n'));
      const bCold = hitWords(body, COLD_WORDS);
      const bHot = hitWords(body, HOT_WORDS);
      let layer = '正文';
      let cold = bCold;
      let hot = bHot;
      if (!bCold.length && !bHot.length) {
        cold = hitWords(note, COLD_WORDS);
        hot = hitWords(note, HOT_WORDS);
        layer = '据注';
      }
      const fangs = formulasOf(def).filter((f) => f.tiao === a.no);
      const fname = fangs.length ? fangs[0].nameSimp : null;
      const nat = fname ? formulaNature(fname) : { nature: null, dir: null, ref: null };
      const byWord = cold.length && hot.length ? '兼见' : cold.length ? '凉燥' : hot.length ? '温燥' : '未定';
      const final_ = byWord === '未定' && nat.dir ? nat.dir : byWord;
      rows.push({
        sec: def.label,
        no: a.no,
        clause: firstClause(a),
        byWord,
        layer: byWord === '未定' ? '—' : layer,
        words: { cold, hot },
        fang: fname,
        nature: nat.nature,
        byFang: nat.dir,
        natureRef: nat.ref,
        type: final_,
        agree: byWord === '未定' ? '词证缺' : nat.dir ? (nat.dir === byWord ? '一致' : '相反') : '无方证',
      });
    }
  }
  return rows;
}

function zaoType() {
  const rows = zaoRows();
  const summary = { 凉燥: 0, 温燥: 0, 兼见: 0, 未定: 0 };
  for (const r of rows) summary[r.type] += 1;
  return { rows, summary };
}

// ─────────── 3. ganZao()：燥证症状字 ───────────

/** 繁简归一：乾→干、澀→涩。其余三字繁简同形 */
const ZAO_CHARS = ['干', '裂', '涩', '咳'];
const norm = (s) => s.replace(/乾/g, '干').replace(/澀/g, '涩');

/** 每条命中带 16 字上下文，方便回原文核对 */
function ganZao() {
  const corpus = [];
  for (const key of ['zaoShang', 'zaoBu', 'zaoZhong', 'zaoXia']) {
    for (const a of articlesOf(SEC[key])) corpus.push({ sec: SEC[key].label, no: a.no, text: norm(bodyOf(a)) });
  }
  const all = corpus.map((c) => c.text).join('\n');
  const rows = ZAO_CHARS.map((ch) => {
    const hits = [];
    for (const c of corpus) {
      let i = c.text.indexOf(ch);
      while (i >= 0) {
        hits.push({ sec: c.sec, no: c.no, ctx: c.text.slice(Math.max(0, i - 8), i + 8).replace(/\n/g, '') });
        i = c.text.indexOf(ch, i + 1);
      }
    }
    return { char: ch, count: hits.length, tiao: [...new Set(hits.map((h) => `${h.sec}·${h.no}`))], hits };
  });
  return { rows, zaoCount: (all.match(/燥/g) || []).length, chars: all.length };
}

// ─────────── 4. fuShu()：伏暑的时间词与症状 ───────────

const TIME_WORDS = ['长夏', '过夏', '霜未降', '霜既降', '冬日', '冬月', '秋凉'];
const STAGE_RULES = [
  { word: '长夏', stage: '受邪（伏）' },
  { word: '霜未降', stage: '霜前·轻' },
  { word: '霜既降', stage: '霜后·重' },
  { word: '冬日', stage: '冬日·尤重' },
  { word: '冬月', stage: '冬月·仍属伏暑' },
  { word: '秋凉', stage: '秋凉引动' },
];
const SYMPTOMS = ['头痛', '恶寒', '面赤', '烦渴', '舌白', '舌赤', '口渴', '无汗', '有汗', '汗多', '大汗', '脉濡', '脉洪大', '脉虚大', '芤'];

function fuShu() {
  const def = SEC.fuShu;
  const rows = tiaoOf(def).map((a) => {
    const text = bodyOf(a);
    const time = hitWords(text, TIME_WORDS);
    return {
      no: a.no,
      clause: firstClause(a),
      time,
      stage: STAGE_RULES.filter((r) => text.includes(r.word)).map((r) => r.stage),
      symptoms: hitWords(text, SYMPTOMS),
      taiYin: text.includes('太隂伏暑'),
      fangs: formulasOf(def).filter((f) => f.tiao === a.no).map((f) => f.nameSimp),
    };
  });
  return {
    rows,
    withTime: rows.filter((r) => r.time.length).length,
    taiYin: rows.filter((r) => r.taiYin).length,
    symptoms: [...new Set(rows.flatMap((r) => r.symptoms))],
  };
}

// ─────────── 5. diffTable()：秋燥 vs 伏暑 ───────────

/**
 * 每格 = 一句原文（≤22 字）+ 条号。空格也是证据：
 * 上焦·秋燥 5 条无一字及舌，伏暑 4 条以舌白/舌赤定治法 —— 这一格故意留空，不补。
 * 条号一律写成「上焦·秋燥·五四」式（卷 + 篇 + 源页条号），因为「秋燥」在三卷各有一篇。
 */
const DIFF = [
  { dim: '受邪时令', zao: ['秋感燥气', '上焦·秋燥·五四'], shu: ['长夏受暑', '上焦·伏暑·三六'] },
  { dim: '发病结构', zao: ['本气自病，初起必在肺卫', '上焦·秋燥·五四'], shu: ['过夏而发者，名曰伏暑', '上焦·伏暑·三六'] },
  { dim: '轻重的时间轴', zao: ['原文不按发病时日分轻重', '上焦·秋燥·五四—五八'], shu: ['霜未降而发者少轻，霜既降而发者则重，冬日发者尤重', '上焦·伏暑·三六'] },
  { dim: '初起病位', zao: ['伤手太隂气分', '上焦·秋燥·五四'], shu: ['太隂伏暑', '上焦·伏暑·三八—四一'] },
  { dim: '关键脉', zao: ['右脉数大', '上焦·秋燥·五四'], shu: ['脉濡而数', '上焦·伏暑·三七'] },
  { dim: '舌', zao: ['（五条无一字及舌）', '上焦·秋燥·五四—五八'], shu: ['舌白口渴 / 舌赤口渴', '上焦·伏暑·三八、上焦·伏暑·三九'] },
  { dim: '主症', zao: ['感燥而咳', '上焦·秋燥·五五'], shu: ['头痛微恶寒，面赤烦渴', '上焦·伏暑·三七'] },
  { dim: '治法与方', zao: ['治以苦温，佐以甘辛', '上焦·補秋燥勝氣論·五'], shu: ['银翘散去牛蒡、元参加杏仁、滑石', '上焦·伏暑·三八'] },
  { dim: '深重转归', zao: ['燥久伤及肝肾之隂', '下焦·秋燥·七十八'], shu: ['冬日发者尤重', '上焦·伏暑·三六'] },
  { dim: '两者的接点', zao: ['叶氏医案谓伏暑内发，新凉外加', '上焦·補秋燥勝氣論·一'], shu: ['伏暑、暑温、湿温，证本一源', '上焦·伏暑·四二'] },
];

/** 「卷一·上焦篇」→「上焦」 */
const juanShort = (j) => (/(上焦|中焦|下焦)/.exec(j) || [, j])[1];
const TIAO_INDEX = new Set(
  BOOK.sections.flatMap((s) => s.articles.map((a) => `${juanShort(s.juan)}·${s.pian}·${a.no}`)),
);

function diffTable() {
  return DIFF.map((r) => ({
    dim: r.dim,
    zao: { text: r.zao[0], ref: r.zao[1], ok: refExists(r.zao[1]) },
    shu: { text: r.shu[0], ref: r.shu[1], ok: refExists(r.shu[1]) },
  }));
}

/** 条号是否真在底本里。diffTable 的每个 ref 都必须过这一关 */
function refExists(ref) {
  return String(ref)
    .split('、')
    .every((one) => {
      const parts = one.split('·');
      const no = parts.pop().replace(/注$/, '');
      const head = parts.join('·');
      if (TIAO_INDEX.has(`${head}·${no}`)) return true;
      // 「上焦·秋燥·五四—五八」这类区间：两端存在即算
      const m = /^([^—]+)—(.+)$/.exec(no);
      return !!m && TIAO_INDEX.has(`${head}·${m[1]}`) && TIAO_INDEX.has(`${head}·${m[2]}`);
    });
}

// ─────────── 输出 ───────────

const BOUNDARY = '教学边界：本输出是对《温病条辨》秋燥/伏暑诸篇的文本统计，外源留档可复算，不构成诊疗依据。';

function report() {
  const p = profile();
  const t = totals();
  const z = zaoType();
  const g = ganZao();
  const f = fuShu();
  const d = diffTable();

  console.log('');
  console.log(`  ${BOUNDARY}`);
  console.log('');
  console.log('═══ 六、秋燥与伏暑 ═══');
  console.log(`  五篇合计 · 条辨 ${t.tiao} 条（另有方后主治 ${t.duan - t.tiao} 段）· 方 ${t.fang}（有方文 ${t.fangWen} + 互见 ${t.fangRef}）· 正文与注 ${t.chars} 字`);
  console.log('');
  console.log('  篇 | 段 | 条辨 | 主治段 | 方 | 有方文 | 互见 | 字');
  for (const r of p) {
    console.log(`  ${r.label} | ${r.duan} | ${r.tiao} | ${r.zhuZhi} | ${r.fang} | ${r.fangWen} | ${r.fangRef} | ${r.chars}`);
  }

  console.log('');
  console.log('  ── zaoType()：凉燥 / 温燥（词证优先，词证缺时用方证）──');
  console.log('  条 | 起句 | 词证（层） | 寒词/热词 | 方 | 方证 | 判 | 两通道');
  for (const r of z.rows) {
    const w = `${r.words.cold.join('、') || '—'} / ${r.words.hot.join('、') || '—'}`;
    console.log(`  ${r.sec}·${r.no} | ${r.clause} | ${r.byWord}（${r.layer}） | ${w} | ${r.fang || '—'} | ${r.nature || '—'}${r.byFang ? `→${r.byFang}` : ''} | ${r.type} | ${r.agree}`);
  }
  console.log(`  小计：凉燥 ${z.summary['凉燥']} · 温燥 ${z.summary['温燥']} · 兼见 ${z.summary['兼见']} · 未定 ${z.summary['未定']}`);

  console.log('');
  console.log('  ── ganZao()：干 / 裂 / 涩 / 咳 四字在秋燥四篇中的分布 ──');
  for (const r of g.rows) {
    console.log(`  ${r.char} | ${r.count} 次 | ${r.tiao.join('、') || '—'}`);
    for (const h of r.hits.slice(0, 3)) console.log(`      …${h.ctx}…  （${h.sec}·${h.no}）`);
  }
  console.log(`  对照：「燥」${g.zaoCount} 次 / 四篇 ${g.chars} 字`);

  console.log('');
  console.log('  ── fuShu()：伏暑的时间词与症状 ──');
  console.log(`  8 条中带时令词 ${f.withTime} 条 · 冠「太隂伏暑」${f.taiYin} 条`);
  for (const r of f.rows) {
    console.log(`  ${r.no} | ${r.clause} | ${r.time.join('、') || '—'} | ${r.stage.join('；') || '—'} | ${r.symptoms.join('、') || '—'}`);
  }

  console.log('');
  console.log('  ── diffTable()：秋燥 vs 伏暑 ──');
  console.log('  维度 | 秋燥 | 伏暑');
  for (const r of d) {
    console.log(`  ${r.dim} | ${r.zao.text}（${r.zao.ref}） | ${r.shu.text}（${r.shu.ref}）`);
  }
  const bad = d.filter((r) => !r.zao.ok || !r.shu.ok).length;
  console.log(`  条号校验：${d.length * 2} 格 · 不存在 ${bad} 格`);

  console.log('');
  console.log('  读法：凉燥/温燥在条数上几乎打平（见 zaoType 小计），但它分的是「有方之条」；');
  console.log('        補秋燥勝氣論把燥推到络病、症瘕、八脉空虚，二分在那里失效（未定 1 条即下焦七八）。');
  console.log('        伏暑的分层轴不是寒热，是「霜未降 / 霜既降 / 冬日」——时间在方上，不在证上。');
  console.log(`  ${BOUNDARY}`);

  const a = docAudit();
  console.log('\n  正文与 quiz 对账（读 docs/zh.md）');
  for (const f of a.facts) console.log(`  ${f.got === f.want ? '✓' : '✗'} ${f.label} 现算 ${f.got} · 正文 ${f.want}`);
  console.log(`  quiz ${a.quiz.total} 题（pre ${a.quiz.stage.pre} / check ${a.quiz.stage.check} / post ${a.quiz.stage.post}）· check 接地 ${a.quiz.groundedChecks} 道 · 答案 ${a.quiz.answers.join('/')}`);
  console.log('');
}

if (require.main === module) report();

/* ── 正文与 quiz 的对账：段型 / 判型 / 字频，逐格回底本复算 ── */

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
    scaffold: /三辨|四位面|单元规模|本章实测/.test(raw),
  };
}

function docAudit() {
  const doc = fs.readFileSync(DOC, 'utf8').replace(/\*\*/g, '');
  const qraw = fs.readFileSync(QUIZ, 'utf8');
  const t = totals();
  const pr = profile();
  const zt = zaoType();
  const gz = ganZao();
  const grab = (re, label) => {
    const m = re.exec(doc);
    if (!m) throw new Error(`正文里定位不到「${label}」`);
    return m.slice(1).map((v) => Number(String(v).replace(/,/g, '')));
  };

  const [docTiao, docDuanTotal, docFang, docWen, docRef, docChars] = grab(/(\d+) 条辨 · (\d+) 段 · (\d+) 方（(\d+) 有方文 \+ (\d+) 互见）· ([\d,]+) 字/, '五篇合计');
  const [docZao, docLiang, docJian, docUndecided] = grab(/分布：温燥 (\d+) · 凉燥 (\d+) · 兼见 (\d+) · 未定 (\d+)/, '判型分布');
  const [docNoFang, docNoWord] = grab(/无方证 (\d+) 条/, '无方证').concat(grab(/词证缺 (\d+) 条/, '词证缺'));
  const [docKe, docSe, docGan, docLie] = grab(/咳 (\d+) · 涩 (\d+) · 干 (\d+) · 裂 (\d+)/, '四字频次');

  const rows = [...doc.matchAll(/^\| (上焦|中焦|下焦)·([^|]+?) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| ([\d,]+) \|$/gm)]
    .map((m) => ({ label: `${m[1]}·${m[2].trim()}`, duan: +m[3], tiao: +m[4], zhuZhi: +m[5], fang: +m[6], fangWen: +m[7], fangRef: +m[8], chars: +m[9].replace(/,/g, '') }));
  if (rows.length !== 5) throw new Error(`正文五篇表是 ${rows.length} 行，应为 5`);

  const facts = [
    { label: '条辨/段/方/有方文/互见/字', got: [t.tiao, t.duan, t.fang, t.fangWen, t.fangRef, t.chars].join('/'), want: [docTiao, docDuanTotal, docFang, docWen, docRef, docChars].join('/') },
    { label: '温燥/凉燥/兼见/未定', got: [zt.summary.温燥, zt.summary.凉燥, zt.summary.兼见, zt.summary.未定].join('/'), want: [docZao, docLiang, docJian, docUndecided].join('/') },
    { label: '无方证 / 词证缺 / 一致', got: [zt.rows.filter((r) => r.agree === '无方证').length, zt.rows.filter((r) => r.agree === '词证缺').length, zt.rows.filter((r) => r.agree === '一致').length].join('/'), want: `${docNoFang}/${docNoWord}/0` },
    { label: '咳/涩/干/裂', got: ['咳', '涩', '干', '裂'].map((c) => gz.rows.find((r) => r.char === c).count).join('/'), want: [docKe, docSe, docGan, docLie].join('/') },
  ];
  for (const r of rows) {
    const g = pr.find((p) => p.label.replace(/補/g, '补').replace(/勝/g, '胜').replace(/論/g, '论').replace(/氣/g, '气') === r.label);
    facts.push({ label: `${r.label} 段/条辨/主治段/方/有方文/互见/字`, got: g ? [g.duan, g.tiao, g.zhuZhi, g.fang, g.fangWen, g.fangRef, g.chars].join('/') : '缺', want: [r.duan, r.tiao, r.zhuZhi, r.fang, r.fangWen, r.fangRef, r.chars].join('/') });
  }

  const q = quizAudit(qraw);
  const body = grams(doc);
  const grounded = q.rows.filter((r) => r.stage === 'check' && [...grams(r.right)].some((v) => body.has(v))).length;
  const sourceText = Object.values(SEC).map((d) => d.sec.articles.map((a) => `${a.zhHans}\n${(a.notes || []).join('\n')}`).join('\n')).join('\n');
  return {
    facts,
    quiz: { ...q, groundedChecks: grounded },
    quotes: ['头微痛，恶寒，咳嗽稀痰，鼻塞', '轻则为燥，重则为寒', '不与血搏', '长夏受暑，过夏而发者，名曰伏暑', '证本一源'].map((w) => ({ quote: w, inDoc: doc.includes(w), inSource: sourceText.includes(w) })),
  };
}

module.exports = {
  BOOK,
  SEC,
  SEC_DEFS,
  isIndication,
  tiaoOf,
  profile,
  totals,
  zaoType,
  ganZao,
  fuShu,
  diffTable,
  formulaNature,
  refExists,
  COLD_WORDS,
  HOT_WORDS,
  DOC,
  QUIZ,
  hanzi,
  grams,
  quizAudit,
  docAudit,
};
