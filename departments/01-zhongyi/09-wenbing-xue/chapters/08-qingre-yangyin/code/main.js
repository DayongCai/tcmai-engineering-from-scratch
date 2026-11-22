'use strict';
/**
 * 第 8 章 · 清热透邪与养阴的治法次序
 *
 *   node code/main.js
 *
 * 数据：standards/wenbing/底本.json（外源·笈成，三书合计 630 条 / 243 方）
 *
 * 口径（四条，改任何一条都要同步改 docs/zh.md 与 code/main.test.js）：
 *   · 检索单位 = 「条」。條辨/溫熱論/溫疫論的每一条连它的分注（notesHant）算一个单位；
 *     正文（art）与分注（note）分开计，因为**治法语大量只出现在注里**——
 *     把两者混成一个数字，就会把「吴鞠通自己的解释」当成「条文原话」。
 *   · 频次 = 子串出现次数；条数 = 含该词的**去重条数**。同一注里出现两次算一次条数。
 *     本文件的阶梯表两个数都报，测试对两个数分别断言。
 *   · 条号沿用源文：條辨用漢数字（每篇从「一」重起），溫熱論用源页 id（1–37 阿拉伯），
 *     溫疫論无条号，用本库「篇·第N段」。凡例（14 条）与上焦篇·補秋燥勝氣論（22 条）
 *     的条号**全部是「一」**，故 cite() 对这两处改用「篇内第N条」消歧。
 *   · 治法语按「阶」归并是本章归纳，原文没有阶梯表；原文明说「甘瀾」是煎法用水
 *     （取其走而不守），不是一阶治法——本文件把它单列并标注 notMethod: true。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/wenbing/底本.json'), 'utf8'));

const TITLE = { tiaobian: '溫病條辨', wenrelun: '溫熱論', wenyilun: '溫疫論' };
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

/** 病类全名太长（「風温、温熱、温疫、温毒、冬温」），引用时压成首病类；口径写在 docs */
const PIAN_SHORT = {
  '風温、温熱、温疫、温毒、冬温': '風温',
  '暑温、伏暑': '暑温',
  '濕温、寒濕': '濕温',
  '補秋燥勝氣論': '補秋燥勝氣論',
  '保胎論二': '保胎論二',
};

const shortPian = (p) => (p == null ? null : PIAN_SHORT[p] || p);
const shortJuan = (j) => (j == null ? null : j.replace(/^卷[一二三四五六七八九十]+·/, ''));

/** 语料库：一条 = 正文 + 它的全部分注 */
function buildCorpus() {
  const units = [];
  for (const b of BOOK.books) {
    for (const s of b.sections) {
      const nums = s.articles.map((a) => String(a.no));
      s.articles.forEach((a, i) => {
        const notes = a.notesHant || [];
        units.push({
          book: b.id,
          title: TITLE[b.id],
          juan: s.juan,
          pian: s.pian,
          no: a.no,
          pos: i + 1,
          // 同一篇内条号重复（凡例 14 个「一」、補秋燥勝氣論 22 个「一」）
          degenerate: nums.filter((x) => x === String(a.no)).length > 1,
          art: a.zhHant,
          notes,
          text: [a.zhHant, ...notes].join('\n'),
        });
      });
    }
  }
  return units;
}

const CORPUS = buildCorpus();

/** 卷 → 三焦归属（凡例/原病篇/解產難 不属三焦，单列） */
function jiaoOf(u) {
  if (u.book === 'wenrelun') return '溫熱論';
  if (u.book === 'wenyilun') return '溫疫論';
  const j = shortJuan(u.juan);
  if (j === '上焦篇') return '上焦';
  if (j === '中焦篇') return '中焦';
  if (j === '下焦篇') return '下焦';
  return j || '其他';
}

/** 引用串：外源·笈成·溫病條辨 上焦篇·風温·第四 / 外源·笈成·溫熱論 第8条 / 溫疫論 上卷·篇·第1段 */
function cite(u) {
  if (u.book === 'wenrelun') return `外源·笈成·溫熱論 第${u.no}条`;
  if (u.book === 'wenyilun') return `外源·笈成·溫疫論 ${u.juan}·${u.pian}·第${u.no}段`;
  const j = shortJuan(u.juan);
  const p = shortPian(u.pian);
  const head = [j, p].filter(Boolean).join('·');
  if (u.degenerate) return `外源·笈成·溫病條辨 ${head}·篇内第${u.pos}条（源页条号「${u.no}」重复）`;
  return `外源·笈成·溫病條辨 ${head}·第${u.no}`;
}

/** 按 (书, 卷简名, 病类简名, 条号) 定位一条；找不到直接抛错，避免引用漂移 */
function at(book, juan, pian, no) {
  const u = CORPUS.find(
    (x) =>
      x.book === book &&
      shortJuan(x.juan) === juan &&
      shortPian(x.pian) === pian &&
      String(x.no) === String(no)
  );
  if (!u) throw new Error(`引文定位失败: ${book} ${juan} ${pian} ${no}`);
  return u;
}

// ───────────────────────── 一、治法阶梯 ─────────────────────────

/**
 * 七阶 + 一条非治法。
 * 每阶只挂**能逐字回到原文**的锚点条；方名与原文词同时给出，便于对读。
 * 阶序按三焦自上而下：上焦辛涼三階 → 中焦苦寒/甘寒 → 下焦鹹寒/甘潤酸甘。
 */
const LADDER = [
  {
    step: 1,
    jiao: '上焦',
    fa: '辛涼平劑',
    fang: '銀翹散',
    term: '辛涼平劑',
    anchor: ['tiaobian', '上焦篇', '風温', '四'],
    quote: '但熱不惡寒而渴者，辛涼平劑銀翹散主之',
    note: '平劑者，邪在衛分而熱已起、津未大傷；吳鞠通自注「温病忌汗，最喜解肌」，故不用麻桂而用辛涼。',
  },
  {
    step: 2,
    jiao: '上焦',
    fa: '辛涼輕劑',
    fang: '桑菊飲',
    term: '辛涼輕劑',
    anchor: ['tiaobian', '上焦篇', '風温', '六'],
    quote: '太隂風温，但咳，身不甚熱，微渴者，辛涼輕劑桑菊飲主之',
    note: '自注「恐病輕藥重，故另立輕劑方」——轻重的判据是热势与渴的程度，不是病名。',
  },
  {
    step: 3,
    jiao: '上焦',
    fa: '辛涼重劑',
    fang: '白虎湯',
    term: '辛涼重劑',
    anchor: ['tiaobian', '上焦篇', '風温', '七'],
    quote: '太隂温病，脈浮洪，舌黃，渴甚，大汗，面赤，惡熱者，辛涼重劑白虎湯主之',
    note: '自注「辛涼平劑焉能勝任」；中焦篇論瘡家濕瘧又复用「白虎辛涼重劑」一语，可见重劑不专属上焦。',
  },
  {
    step: 4,
    jiao: '中焦',
    fa: '苦寒',
    fang: '冬地三黃湯（苦寒僅十之一二）',
    term: '苦寒',
    anchor: ['tiaobian', '中焦篇', '風温', '三一'],
    quote: '温病燥熱，欲解燥者，先滋其干，不可純用苦寒也，服之反燥甚',
    note: '苦寒在中焦是**佐**不是主：同条自注「甘寒十之八、九，苦寒僅十之一、二」，并立「苦寒之禁」。',
  },
  {
    step: 5,
    jiao: '中焦',
    fa: '甘寒',
    fang: '玉女煎 / 梨皮蔗漿 / 冬地三黃湯',
    term: '甘寒',
    anchor: ['wenrelun', null, '溫熱論', 5],
    quote: '若斑出熱不解者，胃津亡也，主以甘寒，重則如玉女煎，輕則如梨皮、蔗漿之類',
    note: '甘寒是中焦养胃阴的主法；上焦篇注里也用它（「甘寒法」），说明法阶与三焦并非一一对应。',
  },
  {
    step: 6,
    jiao: '下焦',
    fa: '鹹寒',
    fang: '加減復脈湯 / 三甲復脈湯 / 黃連阿膠湯',
    term: '鹹寒',
    anchor: ['wenrelun', null, '溫熱論', 5],
    quote: '如甘寒之中，加入鹹寒，務在先安未受邪之地，恐其陷入易易耳',
    note: '鹹寒的原文语境是「预防下陷」，不是「已入下焦再用」；中焦篇另一处「芒硝之鹹寒」说的是药性，不作阶。',
  },
  {
    step: 7,
    jiao: '下焦',
    fa: '甘潤 / 酸甘化隂',
    fang: '復脈湯 / 人參烏梅湯（酸甘化隂法）',
    term: '酸甘',
    anchor: ['tiaobian', '下焦篇', '暑温', '三十六'],
    quote: '以色黑沉降之阿膠救腎水，麥冬、生地合烏梅酸甘化隂，庶消渴可止也',
    note: '下焦存隂的主力其实是甘潤与酸甘（阿膠、麥冬、生地、烏梅），鹹寒是其中的镇潜部分。',
  },
  {
    step: 8,
    jiao: '上焦',
    fa: '甘瀾（煎法用水，非治法）',
    fang: '小半夏加茯苓湯（加厚朴、杏仁）',
    term: '甘瀾',
    anchor: ['tiaobian', '上焦篇', '暑温', '二九'],
    quote: '水用甘瀾，取其走而不守也',
    note: '全库仅此 1 处。它是煎法用水而非一阶清热法——把甘瀾当「下焦治法」是转述时最常见的错。',
    notMethod: true,
  },
];

/** 词频：去重条数 + 出现次数 + 正文/分注拆分 + 三焦分布 */
function termStat(term) {
  const hits = CORPUS.filter((u) => u.text.includes(term));
  const tok = hits.reduce((n, u) => n + u.text.split(term).length - 1, 0);
  const jiao = {};
  for (const u of hits) jiao[jiaoOf(u)] = (jiao[jiaoOf(u)] || 0) + 1;
  return {
    term,
    nTiao: hits.length,
    nTok: tok,
    inArt: hits.filter((u) => u.art.includes(term)).length,
    inNote: hits.filter((u) => u.notes.some((x) => x.includes(term))).length,
    jiao,
    refs: hits.map(cite),
  };
}

/**
 * treatmentLadder() —— 按阶给出治法词在原文中的落点与权重
 * 返回 { steps, byTerm, totals }：
 *   steps  每阶：条数/次数/正文注拆分/锚点引文/是否治法
 *   byTerm 同一批词按词聚合（苦寒、甘寒在上中下三焦都出现，故单看阶会失真）
 */
function treatmentLadder() {
  const steps = LADDER.map((s) => {
    const u = at(...s.anchor);
    const st = termStat(s.term);
    return {
      ...s,
      notMethod: !!s.notMethod,
      citeStr: cite(u),
      artText: u.art,
      nTiao: st.nTiao,
      nTok: st.nTok,
      inArt: st.inArt,
      inNote: st.inNote,
      jiao: s.jiao,
      spread: st.jiao,
      refs: st.refs,
    };
  });
  const terms = [...new Set(LADDER.map((s) => s.term))];
  const byTerm = terms.map(termStat);
  const methodSteps = steps.filter((s) => !s.notMethod);
  return {
    steps,
    byTerm,
    totals: {
      steps: steps.length,
      methodSteps: methodSteps.length,
      tiaoByStep: Object.fromEntries(steps.map((s) => [s.fa, s.nTiao])),
      // 四阶合计：辛涼（三階并计）+ 苦寒 + 甘寒 + 鹹寒，各自去重后相加会重复计条，故另给并集
      distinctTiao: CORPUS.filter((u) =>
        ['辛涼平劑', '辛涼輕劑', '辛涼重劑', '苦寒', '甘寒', '鹹寒', '酸甘'].some((t) => u.text.includes(t))
      ).length,
    },
  };
}

/**
 * 教材常挂在嘴边的四句治法语：频次与出处。
 * 「育隂潛陽」在库里写作「育隂潛陽法」（上焦篇·十七注），不是通行本的「育阴潜阳」四字，
 * 也不存在「青阴潜阳」这种写法——所以这里给的是**汉字异形的实际统计**。
 */
const PHRASES = [
  { phrase: '透熱轉氣', variants: ['透熱轉氣'], where: '溫熱論 第8条', famous: true },
  { phrase: '涼血散血', variants: ['涼血散血'], where: '溫熱論 第8条', famous: true },
  { phrase: '先安未受邪之地', variants: ['先安未受邪之地'], where: '溫熱論 第5条', famous: true },
  { phrase: '育隂潛陽', variants: ['育隂潛陽', '育陰潛陽'], where: '上焦篇·十七（注）', famous: true },
  { phrase: '潛陽', variants: ['潛陽'], where: '下焦篇·十三/十六/十八', famous: false },
];

function methodPhrases() {
  return PHRASES.map((p) => {
    const st = p.variants.map((v) => ({ variant: v, ...termStat(v) }));
    const nTok = st.reduce((n, x) => n + x.nTok, 0);
    const refs = [...new Set(st.flatMap((x) => x.refs))];
    return {
      phrase: p.phrase,
      variants: p.variants,
      nTok,
      nTiao: refs.length,
      refs,
      where: p.where,
      missing: nTok === 0,
    };
  });
}

// ───────────────────────── 二、忌禁索引 ─────────────────────────

/**
 * 禁例规则表。每条规则 = 一个**可复核的正则**，命中即「原文确实在这一条里说了这个禁」。
 * 规则只收原文有「忌/禁/不可」实词的条，不收本章的推论——
 * 于是「温病忌汗」有 7 条落点、「湿温忌润（忌柔）」只有 2 条，这个不对称本身就是结论。
 */
const FORBID_RULES = [
  {
    id: 'han',
    label: '忌汗（温病忌汗，只宜辛涼解肌）',
    re: /(忌汗|禁汗|忌發汗|最忌發汗|忌用發散|不得發汗|不可發汗)/,
    why: '邪由口鼻而入，不在足太陽之表；强责其汗则伤津。',
  },
  {
    id: 'run',
    label: '忌柔潤（濕重／濕温忌柔潤）',
    re: /(忌柔潤|濕重忌柔潤|忌柔喜剛|柔潤藥)/,
    why: '柔潤恋湿，湿未化而先润，则湿愈胶滞。',
  },
  {
    id: 'ni',
    label: '忌滋膩（濕熱未化，滋膩則戀邪）',
    re: /(滋膩|膩膈)/,
    why: '「慎勿用血藥，以滋膩難散」——湿热未净而先腻补，邪无出路。',
  },
  {
    id: 'xinwen',
    label: '忌辛溫（温病最忌辛温）',
    re: /(忌辛温|禁辛温|最忌辛温|辛温[^。]{0,12}(所忌|不可用)|純辛走表)/,
    why: '辛温助火，与温邪同气相求；暑病兼湿者例外（香薷、厚朴）。',
  },
  {
    id: 'kuhan',
    label: '忌苦寒（不可純用苦寒）',
    re: /(苦寒之禁|不可純用苦寒|禁苦寒|苦寒[^。]{0,8}禁)/,
    why: '苦先入心，其化以燥；温病燥热，苦寒愈化愈燥。',
  },
  {
    id: 'danshen',
    label: '忌淡滲（小便不利不可淡滲）',
    re: /(淡滲不可與|淡滲之禁|淡滲[^。]{0,6}禁)/,
    why: '热病有余于火、不足于水，淡渗动阳而燥津；忌五苓、八正辈。',
  },
  {
    id: 'xia',
    label: '忌下（脈浮不可下／可下不可混）',
    re: /(不可與承氣|數下之禁|忌下|不可下)/,
    why: '下之太早则伤胃气、引邪内陷；可下之据在脉沉实与痞满燥实，不在发热。',
  },
  {
    id: 'zoubu',
    label: '忌驟補（疫後大忌參耆朮）',
    re: /(大忌參|忌投參|切忌再補)/,
    why: '余焰尚在、阴血未复而骤补，则余邪留伏，变生异证。',
  },
];

/**
 * forbid() —— 禁例条文索引
 * 返回 { rules, total, byBook, units }：
 *   rules  每条禁例：命中条数 + 引用串
 *   total  去重后的禁例条数（一条可同时犯多条规则，故不等于各规则之和）
 *   units  去重后的禁例清单（条 + 命中的规则 id），供人工复核
 */
function forbid() {
  const rules = FORBID_RULES.map((r) => {
    const hits = CORPUS.filter((u) => r.re.test(u.text));
    return { ...r, re: String(r.re), n: hits.length, refs: hits.map(cite) };
  });
  const map = new Map();
  for (const r of rules) {
    const re = new RegExp(r.re.slice(1, -1));
    for (const u of CORPUS) {
      if (!re.test(u.text)) continue;
      const k = cite(u);
      const rec = map.get(k) || { cite: k, title: u.title, jiao: jiaoOf(u), rules: [], no: u.no };
      rec.rules.push(r.id);
      map.set(k, rec);
    }
  }
  const units = [...map.values()];
  const byBook = {};
  for (const u of units) byBook[u.title] = (byBook[u.title] || 0) + 1;
  const byRuleSum = rules.reduce((n, r) => n + r.n, 0);
  return { rules, total: units.length, byBook, units, byRuleSum };
}

// ───────────────────────── 三、养阴药分布 ─────────────────────────

/**
 * 养阴药的正名归并表。
 * 底本 366 个药名未清洗（見 standards/wenbing/README.md §五），这里只归并本章用到的 12 味；
 * 每味都列出**实际出现的异写**，异写取自底本，不凭通行本补。
 */
const YIN_HERBS = [
  { canon: '麥冬', grade: '甘寒', forms: ['麥冬', '麥冬汁', '連心麥冬'] },
  { canon: '生地', grade: '甘寒', forms: ['細生地', '生地', '炒生地', '乾地黃'] },
  { canon: '元參', grade: '鹹寒', forms: ['元參', '元參心'] },
  { canon: '阿膠', grade: '血肉有情', forms: ['阿膠', '眞阿膠'] },
  { canon: '龜板', grade: '鹹寒', forms: ['龜板', '生龜板', '炙龜板'] },
  { canon: '沙參', grade: '甘寒', forms: ['沙參'] },
  { canon: '鱉甲', grade: '鹹寒', forms: ['鱉甲'] },
  { canon: '熟地', grade: '甘溫', forms: ['熟地黃', '熟地'] },
  { canon: '烏梅', grade: '酸甘', forms: ['烏梅', '烏梅肉'] },
  { canon: '玉竹', grade: '甘平', forms: ['玉竹', '萎蕤'] },
  { canon: '海參', grade: '血肉有情', forms: ['海參'] },
  { canon: '天冬', grade: '甘寒', forms: ['天冬'] },
];

/** 单列：白芍/芍药是酸甘敛阴，桂枝汤里却在解肌，混进养阴统计会把数字抬高 */
const YIN_SIDE = [{ canon: '白芍', grade: '酸甘斂隂（另计）', forms: ['白芍', '生白芍', '炒白芍', '芍藥'] }];

function formulas() {
  const out = [];
  for (const b of BOOK.books) {
    for (const s of b.sections) {
      for (const f of s.formulas || []) {
        out.push({ ...f, juan: f.juan || s.juan, jiao: jiaoOf({ book: b.id, juan: f.juan || s.juan }) });
      }
    }
  }
  return out;
}

const FORMULAS = formulas();

function tally(group) {
  const map = new Map(group.forms.map((f) => [f, group.canon]));
  const rows = [];
  let tokens = 0;
  const fset = new Set();
  const byJiao = { 上焦: 0, 中焦: 0, 下焦: 0, 其他: 0 };
  for (const f of FORMULAS) {
    for (const ing of f.ingredients || []) {
      const canon = map.get(ing.herb);
      if (!canon) continue;
      tokens += 1;
      fset.add(f);
      byJiao[f.jiao] = (byJiao[f.jiao] || 0) + 1;
    }
  }
  rows.push({ canon: group.canon, grade: group.grade, forms: group.forms, n: tokens, fang: fset.size, byJiao });
  return rows[0];
}

/**
 * yinHerbs() —— 养阴类药物在方中的分布
 * 返回 { rows, side, top, coverage, totalTokens }
 *   rows     12 味正名后的出现次数 / 所在方数 / 三焦分布（按次数降序）
 *   top      前 3 味
 *   coverage 含 ≥1 味养阴药的方 ÷ 有药味的方（178），并给三焦各自的覆盖
 */
function yinHerbs() {
  const rows = YIN_HERBS.map(tally).sort((a, b) => b.n - a.n || a.canon.localeCompare(b.canon));
  const side = YIN_SIDE.map(tally);
  const withIng = FORMULAS.filter((f) => (f.ingredients || []).length);
  const canonSet = new Set(YIN_HERBS.flatMap((g) => g.forms));
  const cov = (list) => {
    const hit = list.filter((f) => (f.ingredients || []).some((i) => canonSet.has(i.herb))).length;
    return { n: hit, of: list.length, pct: list.length ? Math.round((hit / list.length) * 100) : 0 };
  };
  const byJiao = {};
  for (const j of ['上焦', '中焦', '下焦', '其他']) byJiao[j] = cov(withIng.filter((f) => f.jiao === j));
  return {
    rows,
    side,
    top: rows.slice(0, 3).map((r) => `${r.canon} ${r.n}`),
    totalTokens: rows.reduce((n, r) => n + r.n, 0),
    coverage: { ...cov(withIng), byJiao, formulasWithIngredients: withIng.length },
  };
}

// ───────────────────────── 汇总 ─────────────────────────

function totals() {
  return {
    books: BOOK.books.length,
    articles: CORPUS.length,
    texts: CORPUS.reduce((n, u) => n + 1 + u.notes.length, 0),
    formulas: FORMULAS.length,
    formulasRefOnly: FORMULAS.filter((f) => f.refOnly).length,
    formulasWithIngredients: FORMULAS.filter((f) => (f.ingredients || []).length).length,
    byBook: Object.fromEntries(BOOK.books.map((b) => [b.id, b.counts.articles])),
    degenerate: CORPUS.filter((u) => u.degenerate).length,
  };
}

if (require.main === module) {
  console.log('');
  console.log('  教学边界：本输出为《温病学》三书（外源·笈成）的治法词频与方药分布统计，不构成诊疗依据。');
  console.log('');
  const t = totals();
  console.log('═══ 温病学 · 清热透邪与养阴的治法次序 ═══');
  console.log(
    `  三书 ${t.books} · 条 ${t.articles}（條辨 ${t.byBook.tiaobian} · 溫熱論 ${t.byBook.wenrelun} · 溫疫論 ${t.byBook.wenyilun}）· 文本块 ${t.texts}`
  );
  console.log(
    `  方 ${t.formulas}（有药味 ${t.formulasWithIngredients} + 互见/加减 ${t.formulasRefOnly}）· 条号重复 ${t.degenerate} 条（凡例、補秋燥勝氣論）\n`
  );

  const L = treatmentLadder();
  console.log('  阶 | 焦 | 治法 | 方 | 条数 | 次数 | 正文/注');
  for (const s of L.steps) {
    console.log(
      `  ${s.step} | ${s.jiao} | ${s.fa}${s.notMethod ? '（非治法）' : ''} | ${s.fang} | ${s.nTiao} | ${s.nTok} | ${s.inArt}/${s.inNote}`
    );
  }
  console.log(`  治法阶 ${L.totals.methodSteps} · 涉及条 ${L.totals.distinctTiao}（去重）\n`);

  console.log('  治法语 | 次数 | 条数 | 出处');
  for (const p of methodPhrases()) console.log(`  ${p.phrase} | ${p.nTok} | ${p.nTiao} | ${p.where}`);

  const F = forbid();
  console.log(`\n  禁例 ${F.total} 条（各规则命中合计 ${F.byRuleSum}，一条可犯多条）`);
  for (const r of F.rules) console.log(`  ${r.id.padEnd(8)} ${r.n} 条 · ${r.label}`);
  console.log(`  分布：${Object.entries(F.byBook).map(([k, v]) => `${k} ${v}`).join(' · ')}`);

  const Y = yinHerbs();
  console.log(`\n  养阴药 ${Y.rows.length} 味 · 出现 ${Y.totalTokens} 次 · 含养阴药的方 ${Y.coverage.n}/${Y.coverage.of}（${Y.coverage.pct}%）`);
  for (const r of Y.rows.slice(0, 6)) {
    console.log(`  ${r.canon} | ${r.n} 次 | ${r.fang} 方 | 上${r.byJiao.上焦} 中${r.byJiao.中焦} 下${r.byJiao.下焦}`);
  }
  console.log(`  Top3：${Y.top.join(' · ')}`);
  console.log(`  另计：${Y.side.map((r) => `${r.canon} ${r.n} 次`).join('、')}`);

  const a = docAudit();
  console.log('\n  正文与 quiz 对账（读 docs/zh.md）');
  for (const f of a.facts) console.log(`  ${f.got === f.want ? '✓' : '✗'} ${f.label} 现算 ${f.got} · 正文 ${f.want}`);
  console.log(`  quiz ${a.quiz.total} 题（pre ${a.quiz.stage.pre} / check ${a.quiz.stage.check} / post ${a.quiz.stage.post}）· check 接地 ${a.quiz.groundedChecks} 道 · 答案 ${a.quiz.answers.join('/')}`);
}

/* ── 正文与 quiz 的对账：七阶 / 禁例 / 养阴药，逐格回底本复算 ── */

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
  const L = treatmentLadder();
  const F = forbid();
  const Y = yinHerbs();
  const MP = methodPhrases();
  const grab = (re, label) => {
    const m = re.exec(doc);
    if (!m) throw new Error(`正文里定位不到「${label}」`);
    return m.slice(1).map((v) => Number(String(v).replace(/,/g, '')));
  };

  const [docTiao, docTexts, docFang] = grab(/共 (\d+) 条 \/ (\d+) 文本块 \/ (\d+) 方/, '三书规模');
  const [docForbid, docUnits] = grab(/合计 (\d+) 处、(\d+) 条/, '禁例合计');
  const [docTb, docWrl, docWyl] = grab(/温病条辨 (\d+) · 温热论 (\d+) · 温疫论 (\d+)/, '禁例分布');
  const [docTiao32] = grab(/「该用什么」的治法条只有 (\d+) 条/, '治法条数');
  const [docYin50, docYin178, docYin100] = grab(/含养阴药的方 (\d+)\/(\d+)（\d+%）/, '含养阴药方').concat(grab(/12 味药共出现 (\d+) 次/, '养阴药次数'));
  const [docYinCount] = grab(/养阴药 (\d+) 味、(\d+) 次/, '养阴药味数');
  const herbRows = [...doc.matchAll(/^\| (麦冬|生地|元参|阿胶|龟板|鳖甲) \| [^|]+ \| (\d+) \| (\d+) \| (\d+) \| (\d+) \|$/gm)]
    .map((m) => ({ herb: m[1], n: +m[2], shang: +m[3], zhong: +m[4], xia: +m[5] }));
  if (herbRows.length !== 6) throw new Error(`正文养阴药表是 ${herbRows.length} 行，应为 6`);
  const [docPhrase1, docPhrase2, docPhrase3] = grab(/透热转气 \| (\d+) \| 《温热论》第 8 条 \|/, '透热转气次数')
    .concat(grab(/凉血散血 \| (\d+) \| 《温热论》第 8 条 \|/, '凉血散血次数'))
    .concat(grab(/先安未受邪之地 \| (\d+) \| 《温热论》第 5 条 \|/, '先安次数'));

  const canon = (n) => Y.rows.find((r) => r.canon === n);
  const facts = [
    { label: '三书 条/文本块/方', got: [t.articles, t.texts, t.formulas].join('/'), want: [docTiao, docTexts, docFang].join('/') },
    { label: '治法阶 7 + 非治法 1 / 涉条 32', got: `${L.totals.methodSteps}+${L.totals.steps - L.totals.methodSteps}/${L.totals.distinctTiao}`, want: `7+1/${docTiao32}` },
    { label: '禁例 处/条', got: `${F.byRuleSum}/${F.total}`, want: `${docForbid}/${docUnits}` },
    { label: '禁例分布 条辨/温热论/温疫论', got: [F.byBook.溫病條辨, F.byBook.溫熱論, F.byBook.溫疫論].join('/'), want: [docTb, docWrl, docWyl].join('/') },
    { label: '养阴药 方占比 / 味次 / 味数', got: `${Y.coverage.n}/${Y.coverage.of}/${Y.totalTokens}/${Y.rows.length}`, want: `${docYin50}/${docYin178}/${docYin100}/${docYinCount}` },
    { label: '三句名语 各 1 次', got: MP.filter((p) => ['透熱轉氣', '涼血散血', '先安未受邪之地'].includes(p.phrase)).map((p) => p.nTok).join('/'), want: [docPhrase1, docPhrase2, docPhrase3].join('/') },
  ];
  for (const r of herbRows) {
    const g = canon({ 麦冬: '麥冬', 生地: '生地', 元参: '元參', 阿胶: '阿膠', 龟板: '龜板', 鳖甲: '鱉甲' }[r.herb]);
    facts.push({ label: `${r.herb} 次/上/中/下`, got: g ? [g.n, g.byJiao.上焦, g.byJiao.中焦, g.byJiao.下焦].join('/') : '缺', want: [r.n, r.shang, r.zhong, r.xia].join('/') });
  }

  const q = quizAudit(qraw);
  const body = grams(doc);
  const grounded = q.rows.filter((r) => r.stage === 'check' && [...grams(r.right)].some((v) => body.has(v))).length;
  const allText = BOOK.books.flatMap((b) => b.sections.flatMap((s) => s.articles.map((a) => `${a.zhHans}\n${(a.notes || []).join('\n')}`))).join('\n');
  return {
    facts,
    quiz: { ...q, groundedChecks: grounded },
    quotes: ['先滋其干', '服之反燥甚', '救阴不在血，而在津汗', '苦先入心', '先安未受邪之地'].map((w) => ({ quote: w, inDoc: doc.includes(w), inSource: allText.includes(w) })),
  };
}

module.exports = {
  BOOK,
  CORPUS,
  LADDER,
  FORBID_RULES,
  YIN_HERBS,
  FORMULAS,
  cite,
  jiaoOf,
  shortJuan,
  shortPian,
  termStat,
  treatmentLadder,
  methodPhrases,
  forbid,
  yinHerbs,
  totals,
  DOC,
  QUIZ,
  hanzi,
  grams,
  quizAudit,
  docAudit,
};
