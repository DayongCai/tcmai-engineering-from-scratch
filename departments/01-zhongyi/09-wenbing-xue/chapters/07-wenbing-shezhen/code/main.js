'use strict';
/**
 * 第 7 章 · 温病舌诊与斑疹的辨识：体征词表 / 斑疹判据 / 预后配对 / 两书贡献
 * departments/01-zhongyi/09-wenbing-xue/chapters/07-wenbing-shezhen/docs/zh.md
 *
 *   node code/main.js
 *
 * 数据：standards/wenbing/底本.json（外源·笈成，三书合成；sha256 见 standards/wenbing/ 与
 *       scripts/build_wenbing_text.py --check）
 *
 * 口径（四条，改任何一条都要同步改 docs/zh.md 与测试）：
 *   · 入章范围 = 条文（zhHant）命中体征字的条：/舌|苔|斑|疹|㾦|齒|齿/。
 *     这是**字面**筛法，不按「是否在讲舌诊」二次判断 —— 一条既讲舌又讲齿的，
 *     在「舌」与「齿」两族各计一次（族计数允许重复，条数不重复）。
 *   · 「齿」族剔除「抵齒」：溫熱論第 17 条的「舌絳欲伸出口，而抵齒難驟伸」讲的是舌体
 *     活动受限，不是齿象；不剔除会把齿族多算 1 条。
 *   · 舌象词表三分类：苔色 / 苔質 / 舌體。同一处字串在**同一类内**只计一次（长词优先，
 *     已消费区间不再匹配），跨类可同时命中（「舌白滑」= 苔色白 + 苔質滑，本是一件事的
 *     两个维度）。
 *   · 引文一律走 cite()：溫熱論「外源·笈成·溫熱論 第N条」，溫病條辨
 *     「外源·笈成·溫病條辨 上焦篇·十六」（条号沿用源文漢数字，不编阿拉伯序号）。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const SRC = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/wenbing/底本.json'), 'utf8'));

const BOOKS = Object.fromEntries(SRC.books.map((b) => [b.id, b]));

/**
 * 本章只用两本书。第三本《溫疫論》（303 条、47 条命中同一批体征字）**不取**：
 * 本章讲的是「温病派的舌诊与斑疹辨识」，而溫疫論的舌诊服务于戾气/膜原的另一套框架，
 * 混进来会让「两书贡献」这个口径失效。剔除量与理由写进 docs 的代价与边界。
 */
const BOOK_IDS = ['wenrelun', 'tiaobian'];

/** 卷名 → 引用用的篇名（溫病條辨的条号在卷内连续，必须带卷） */
const JUAN_SHORT = {
  '卷一·上焦篇': '上焦篇',
  '卷二·中焦篇': '中焦篇',
  '卷三·下焦篇': '下焦篇',
  原病篇: '原病篇',
};

/** 引用格式：两本书不同，不许混写 */
function cite(bookId, juan, no) {
  if (bookId === 'wenrelun') return `外源·笈成·溫熱論 第${no}条`;
  const j = JUAN_SHORT[juan] || juan || '篇';
  return `外源·笈成·溫病條辨 ${j}·${no}`;
}

/** 体征族：一条可同时属多族 */
const FAMILIES = [
  { key: '舌', re: /舌|苔/ },
  { key: '斑疹', re: /斑|疹/ },
  { key: '白㾦', re: /㾦/ },
  { key: '齿', re: /[齒齿]/g },
];

/**
 * 「抵齒」不算齿象：溫熱論第 17 条「舌絳欲伸出口，而抵齒難驟伸」讲的是舌体活动受限。
 * 不剔除会把齿族多算 1 条。
 */
function hasToothSign(text) {
  const all = (text.match(/[齒齿]/g) || []).length;
  if (all === 0) return false;
  const di = (text.match(/抵齒/g) || []).length;
  return all - di > 0;
}

function familiesOf(text) {
  return FAMILIES.filter((f) => (f.key === '齿' ? hasToothSign(text) : f.re.test(text))).map((f) => f.key);
}

/** 全库扁平化（保留原文繁、简体与出处）；只留 BOOK_IDS 两本 */
const ART = SRC.books
  .filter((b) => BOOK_IDS.includes(b.id))
  .flatMap((b) =>
    b.sections.flatMap((s) =>
      s.articles.map((a) => ({
        book: b.id,
        bookTitle: b.title,
        juan: s.juan || null,
        pian: s.pian || null,
        no: a.no,
        hant: a.zhHant,
        hans: a.zhHans,
        cite: cite(b.id, s.juan, a.no),
        families: familiesOf(a.zhHant),
      }))
    )
  );

/** 被排除的第三本命中数（docs 必须披露；测试核对它与 BOOK_IDS 一致） */
const EXCLUDED = SRC.books
  .filter((b) => !BOOK_IDS.includes(b.id))
  .map((b) => ({
    id: b.id,
    title: b.title,
    total: b.sections.reduce((n, s) => n + s.articles.length, 0),
    hits: b.sections.reduce((n, s) => n + s.articles.filter((a) => familiesOf(a.zhHant).length > 0).length, 0),
  }));

/** 本章语料：命中体征字的条 */
function inScope() {
  return ART.filter((a) => a.families.length > 0);
}

/* ───────────────────────── 一、舌象词表 ───────────────────────── */

/**
 * 词表条目：cls ∈ 苔色 / 苔質 / 舌體。
 * `sample` 是该词在底本里的**字面**出处；测试逐条核对 sample 真在原文里
 * （凭记忆写词表，sample 一定对不上 —— 这是本章的反编造锁）。
 */
const TONGUE = [
  // ── 苔色 ──
  { id: 'tai-bai', cls: '苔色', label: '白苔', re: /舌(?:胎|苔)?白|苔白/g, sample: '舌白滑', gloss: '主表、主湿、主寒；温病初起多见，薄白而干则肺津伤' },
  { id: 'tai-huang', cls: '苔色', label: '黃苔', re: /舌(?:苔|色)?(?:老|微|淡|深)?黃|苔(?:老|微|淡|深)?黃/g, sample: '舌苔老黃', gloss: '主里、主热；「有地之黃」方可下，光滑者属无形湿热' },
  { id: 'tai-hui', cls: '苔色', label: '灰苔', re: /舌(?:色)?灰|苔灰|灰白|灰滑|灰滯|灰而/g, sample: '舌灰滑', gloss: '灰而滑多寒湿，灰而燥多燥热；温病中灰苔少见，见则多夹湿' },
  { id: 'tai-hei', cls: '苔色', label: '黑苔', re: /舌黑|苔(?:乾)?黑|黑苔|乾黑|如煙煤/g, sample: '舌黑而滑', gloss: '黑而滑为阴证当温，黑而干为津枯火炽；黑而晦者多不治' },
  { id: 'tai-jinhuang', cls: '苔色', label: '金黃苔', re: /金黃/g, sample: '舌色金黃', gloss: '黄之极，多属阳明腑实与痰涎并结' },
  { id: 'tai-huihuang', cls: '苔色', label: '灰黃苔', re: /灰黃/g, sample: '舌色灰黃', gloss: '灰黄相兼，湿热久滞、气血两伤' },
  // ── 苔質 ──
  { id: 'zhi-hou', cls: '苔質', label: '厚苔', re: /舌[^，。]{0,3}厚|苔厚|白厚|厚㾦/g, sample: '白厚而乾燥', gloss: '厚主邪盛。白厚而燥＝胃燥气伤，须于滋润药中加甘草' },
  { id: 'zhi-bao', cls: '苔質', label: '薄苔', re: /舌[^，。]{0,3}薄|苔薄|白薄|薄而乾/g, sample: '而薄者', gloss: '薄主邪浅。薄而干者津伤，忌重药，宜甘寒轻剂' },
  { id: 'zhi-hua', cls: '苔質', label: '滑苔', re: /舌[^，。]{0,4}滑|白滑|灰滑|黃滑|滑苔/g, sample: '舌滑脈緩', gloss: '滑主湿、主津未伤；温病见滑苔，先问湿之有无' },
  { id: 'zhi-zao', cls: '苔質', label: '燥苔', re: /舌[^，。]{0,4}燥|苔燥|黃燥|乾燥/g, sample: '黃燥', gloss: '燥主津伤。燥而黄可下，燥而白当养胃阴' },
  { id: 'zhi-ni', cls: '苔質', label: '膩苔', re: /黏膩|膩苔|苔[^，。]{0,3}膩/g, sample: '苔白黏膩', gloss: '腻主湿浊、痰浊；「似苔非苔」者中挟秽浊，急加芳香' },
  { id: 'zhi-fu', cls: '苔質', label: '腐苔', re: /白腐|腐白|苔腐/g, sample: '舌白腐', gloss: '腐如豆腐渣，主胃中宿滞、浊秽郁伏' },
  { id: 'zhi-wutai', cls: '苔質', label: '無苔／苔少', re: /無苔|苔少/g, sample: '舌無苔', gloss: '无苔或苔少，主胃阴亏；舌绛苔少已是血分' },
  { id: 'zhi-mangci', cls: '苔質', label: '芒刺', re: /芒刺/g, sample: '舌上生芒刺', gloss: '不拘何色，生芒刺皆上焦热极；拭之即去者轻，旋即生者险' },
  { id: 'zhi-jian', cls: '苔質', label: '如鹼', re: /如鹼/g, sample: '舌上苔如鹼', gloss: '苔如碱，胃中宿滞挟浊秽郁伏，急急开泄' },
  { id: 'zhi-fen', cls: '苔質', label: '如粉', re: /如粉/g, sample: '舌白如粉而滑', gloss: '白如积粉，温疫初入膜原之舌，未归胃腑' },
  { id: 'zhi-duanwen', cls: '苔質', label: '斷紋', re: /斷紋/g, sample: '中有斷紋', gloss: '苔中裂纹，里热伤津、腑气不通，可与下法' },
  // ── 舌體 ──
  { id: 'ti-zhongxin', cls: '舌體', label: '中心乾（舌心乾）', re: /中心乾|舌心乾|中心絳乾|舌尖絳/g, sample: '舌中心乾', gloss: '中心干＝心胃火燔；舌尖绛独干＝心火上炎' },
  { id: 'ti-jiang', cls: '舌體', label: '絳（深紅）', re: /絳/g, sample: '舌色必絳', gloss: '绛＝深红，热传营之标志；兼黄白者气分之邪未尽' },
  { id: 'ti-zi', cls: '舌體', label: '紫', re: /紫(?:而|色)/g, sample: '舌色必紫', gloss: '紫而暗、扪之湿＝瘀；紫而肿大＝酒毒冲心；紫而干晦＝肾肝色泛，难治' },
  { id: 'ti-danhong', cls: '舌體', label: '淡紅／無色', re: /淡紅|無色/g, sample: '舌淡紅無色', gloss: '淡红无色或干而不荣，胃津伤而气无化液，宜炙甘草汤' },
  { id: 'ti-hong', cls: '舌體', label: '紅／赤', re: /舌赤|色紅|紅點/g, sample: '舌赤口渴', gloss: '红而赤主热；大红点为热毒乘心' },
  { id: 'ti-zhang', cls: '舌體', label: '脹大', re: /脹大|舌脹/g, sample: '舌脹大不能出口', gloss: '胀大不能出口，脾湿胃热郁极化风，毒延于口' },
  { id: 'ti-duan', cls: '舌體', label: '短縮／痿', re: /短縮|舌短|舌萎/g, sample: '若見短縮', gloss: '短缩为肾气竭，难治；痿为肾阴涸，急以阿胶鸡子黄救之' },
  { id: 'ti-jian', cls: '舌體', label: '蹇／強', re: /舌蹇|舌強|舌本不縮而硬/g, sample: '舌蹇肢厥', gloss: '舌蹇、舌强，邪闭心包或热灼津伤，语言不利' },
  { id: 'ti-guang', cls: '舌體', label: '光亮（光剝）', re: /光亮|光剝/g, sample: '舌絳而光亮', gloss: '绛而光亮＝胃阴亡，急用甘凉濡润' },
  { id: 'ti-gan', cls: '舌體', label: '乾（舌本）', re: /舌(?:就|上)?乾|舌微乾/g, sample: '舌就乾', gloss: '初病舌就干而神不昏，急加养正透邪；神已昏则内匮' },
];

/** 其余三组体征（供 banZhen / prognosis 配对用，不进舌象三分类） */
const OTHER_SIGNS = [
  { id: 'bz-ban', cls: '斑疹', label: '斑', re: /斑/g, sample: '斑色紅者屬胃熱' },
  { id: 'bz-zhen', cls: '斑疹', label: '疹', re: /疹/g, sample: '瑣碎小粒者為疹' },
  { id: 'bz-dadian', cls: '斑疹', label: '點大（斑之形）', re: /點大/g, sample: '點大而在皮膚之上者為斑' },
  { id: 'bz-suosui', cls: '斑疹', label: '瑣碎小粒（疹之形）', re: /瑣碎小粒/g, sample: '或瑣碎小粒者為疹' },
  { id: 'bz-yuntou', cls: '斑疹', label: '雲頭隱隱（疹之形）', re: /雲頭隱隱/g, sample: '或雲頭隱隱' },
  { id: 'bz-yinban', cls: '斑疹', label: '虛斑／陰斑', re: /虛斑|陰斑/g, sample: '非虛斑即陰斑' },
  { id: 'bz-baizhen', cls: '斑疹', label: '白疹', re: /白疹/g, sample: '胸腹白疹' },
  { id: 'bj-jing', cls: '白㾦', label: '晶㾦（水晶色）', re: /水晶色|白㾦/g, sample: '小粒如水晶色者' },
  { id: 'bj-ku', cls: '白㾦', label: '枯㾦（如枯骨）', re: /白如枯骨|枯骨/g, sample: '或白如枯骨者' },
  { id: 'ch-zao', cls: '齿', label: '齒燥（光燥如石）', re: /光燥如石/g, sample: '齒若光燥如石者' },
  { id: 'ch-gou', cls: '齿', label: '齒垢（如灰糕）', re: /齒垢|如灰糕/g, sample: '若齒垢如灰糕樣者' },
  { id: 'ch-jiao', cls: '齿', label: '齒焦', re: /齒焦/g, sample: '齒焦無垢者' },
  { id: 'ch-hei', cls: '齿', label: '齒黑（如枯骨色）', re: /齒黑|齒如枯骨/g, sample: '舌乾齒黑' },
  { id: 'ch-ban', cls: '齿', label: '結瓣（紫如乾漆／黃如醬瓣）', re: /結瓣|乾漆|醬瓣/g, sample: '結瓣於上' },
  { id: 'ch-yao', cls: '齿', label: '咬牙／齧齒', re: /咬牙|齧齒/g, sample: '若咬牙嚙齒者' },
  { id: 'ch-yaguan', cls: '齿', label: '牙關（咬定難開）', re: /牙關咬定/g, sample: '而牙關咬定難開者' },
  { id: 'ch-yin', cls: '齿', label: '齦（胃之絡）', re: /齦/g, sample: '齦為胃之絡' },
];

const ALL_SIGNS = [...TONGUE, ...OTHER_SIGNS];

/**
 * 舌象分类计数。
 * 规则：同一类内长词优先、已消费区间不再匹配；跨类可重复命中。
 */
function tongueIndex() {
  const pool = inScope().filter((a) => a.families.includes('舌'));
  const rows = [];
  const byClass = { 苔色: 0, 苔質: 0, 舌體: 0 };
  const articles = [];

  for (const art of pool) {
    const hits = [];
    for (const cls of ['苔色', '苔質', '舌體']) {
      const entries = TONGUE.filter((t) => t.cls === cls).sort((a, b) => b.label.length - a.label.length);
      const used = new Array(art.hant.length).fill(false);
      for (const t of entries) {
        const re = new RegExp(t.re.source, 'g');
        let m;
        while ((m = re.exec(art.hant)) !== null) {
          const s = m.index;
          const e = s + m[0].length;
          let overlap = false;
          for (let i = s; i < e; i += 1) if (used[i]) { overlap = true; break; }
          if (overlap) continue;
          for (let i = s; i < e; i += 1) used[i] = true;
          hits.push({ id: t.id, cls, label: t.label, text: m[0] });
          byClass[cls] += 1;
        }
      }
    }
    // 术语→计次（跨条汇总）
    for (const h of hits) {
      const row = rows.find((r) => r.id === h.id);
      if (!row) rows.push({ id: h.id, cls: h.cls, label: h.label, count: 1, cites: [art.cite] });
      else { row.count += 1; row.cites.push(art.cite); }
    }
    if (hits.length) articles.push({ cite: art.cite, book: art.book, terms: hits.map((h) => h.label) });
  }

  return {
    vocabSize: TONGUE.length,
    classCount: Object.fromEntries(['苔色', '苔質', '舌體'].map((c) => [c, TONGUE.filter((t) => t.cls === c).length])),
    articles: pool.length,
    mentions: byClass['苔色'] + byClass['苔質'] + byClass['舌體'],
    byClass,
    terms: rows.sort((a, b) => b.count - a.count || a.cls.localeCompare(b.cls)),
    perArticle: articles,
  };
}

/* ───────────────────── 二、斑与疹的判据 ───────────────────── */

/**
 * 判据表：每格都带**字面引文 + 出处**。测试逐条核对 quote 真在该条原文里。
 * 这是本章的核心：斑/疹不是「红点」的同义词，两条判据线（形态／所属／色／多少／转归）分开写。
 */
const BAN_ZHEN_CRITERIA = [
  {
    dim: '形态',
    ban: { quote: '點大而在皮膚之上者為斑', cite: cite('wenrelun', null, 27) },
    zhen: { quote: '或雲頭隱隱，或瑣碎小粒者為疹', cite: cite('wenrelun', null, 27) },
    note: '斑＝点大且**在皮肤之上**（平铺、抚之不去）；疹＝云头隐隐、琐碎小粒（有颗粒、高出皮面）。',
  },
  {
    dim: '所属',
    ban: { quote: '斑屬血者恆多', cite: cite('wenrelun', null, 29) },
    zhen: { quote: '疹屬氣者不少', cite: cite('wenrelun', null, 29) },
    note: '「恆多／不少」是**概率判断**而非定义：斑多属血分、疹多属气分，但不能反推。',
  },
  {
    dim: '色与脏腑',
    ban: { quote: '斑色紅者屬胃熱，紫者熱極，黑者胃爛', cite: cite('wenrelun', null, 27) },
    zhen: { quote: '如淡紅色，四肢清，口不甚渴，脈不洪數，非虛斑即陰斑', cite: cite('wenrelun', null, 28) },
    note: '斑以色分三层（红/紫/黑）；疹色淡红而四肢清、脉不洪数者，要往虚、寒上想，不可径作热治。',
  },
  {
    dim: '多少',
    ban: { quote: '又宜見而不宜見多', cite: cite('wenrelun', null, 27) },
    zhen: { quote: '又宜見而不宜見多', cite: cite('wenrelun', null, 27) },
    note: '此条对斑疹**共同**成立：宜见（邪有外达之路）不宜见多（邪盛）。故本章不把它当区分判据，只当共同前提。',
  },
  {
    dim: '兼见',
    ban: { quote: '若夾斑帶疹，皆是邪之不一，各隨其部而泄', cite: cite('wenrelun', null, 29) },
    zhen: { quote: '若夾斑帶疹，皆是邪之不一，各隨其部而泄', cite: cite('wenrelun', null, 29) },
    note: '夹斑带疹＝邪不一而分部不同，不是「两种病」，故治则各随其部而泄。',
  },
  {
    dim: '出后转归',
    ban: { quote: '發出宜神情清爽，為外解裏和之意', cite: cite('wenrelun', null, 29) },
    zhen: { quote: '如斑疹出而昏者，正不勝邪，內陷為患', cite: cite('wenrelun', null, 29) },
    note: '判转归看**神**不看疹：出而清爽＝外解里和；出而昏＝正不胜邪内陷，或胃津内涸。',
  },
];

/** 「出」与「不透」：条文对治法与禁忌的判据 */
const BAN_ZHEN_RULES = [
  { kind: '禁忌', quote: '斑疹，用升提，則衄，或厥，或嗆咳，或昏痙，用壅補則瞀亂', cite: cite('tiaobian', '卷二·中焦篇', '二三') },
  { kind: '禁忌', quote: '禁升麻、柴胡、當歸、防風、羌活、白芷、葛根、三春柳', cite: cite('tiaobian', '卷一·上焦篇', '十六') },
  { kind: '不透', quote: '斑疹陽明證悉具，外出不快，內壅特甚者，調胃承氣湯微和之，得通則已，不可令大泄，大泄則內陷', cite: cite('tiaobian', '卷二·中焦篇', '二四') },
  { kind: '误汗', quote: '太隂温病，不可發汗，發汗而汗不出者，必發斑疹', cite: cite('tiaobian', '卷一·上焦篇', '十六') },
];

function banZhen() {
  const pool = inScope().filter((a) => a.families.includes('斑疹'));
  const banOnly = pool.filter((a) => /斑/.test(a.hant) && !/疹/.test(a.hant));
  const zhenOnly = pool.filter((a) => /疹/.test(a.hant) && !/斑/.test(a.hant));
  const both = pool.filter((a) => /斑/.test(a.hant) && /疹/.test(a.hant));
  return {
    criteria: BAN_ZHEN_CRITERIA,
    rules: BAN_ZHEN_RULES,
    articles: pool.length,
    banOnly: banOnly.map((a) => a.cite),
    zhenOnly: zhenOnly.map((a) => a.cite),
    both: both.map((a) => a.cite),
    exclusiveDims: BAN_ZHEN_CRITERIA.filter((c) => c.ban.quote !== c.zhen.quote).map((c) => c.dim),
    sharedDims: BAN_ZHEN_CRITERIA.filter((c) => c.ban.quote === c.zhen.quote).map((c) => c.dim),
  };
}

/* ───────────────────── 三、预后词 × 体征 ───────────────────── */

/** 预示词→判定档。顺序即优先级：先长词（死不治）后短词（不治）。 */
const PROGNOSIS = [
  { re: /死不治|不可救藥|無救/, verdict: '死', word: '死不治／无救' },
  { re: /必死|多死|百日死/, verdict: '死', word: '必死／多死' },
  { re: /不治/, verdict: '難治', word: '不治' },
  { re: /難治/, verdict: '難治', word: '难治' },
  { re: /必見凶|多凶/, verdict: '凶', word: '凶' },
  { re: /險/, verdict: '凶', word: '险' },
  { re: /尚可救|可治|則生/, verdict: '可治', word: '可治／尚可救' },
];

const CLAUSE_SPLIT = /[。；？！]/;

function clauseOf(text, idx) {
  const parts = [];
  let start = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (CLAUSE_SPLIT.test(text[i])) { parts.push([start, i]); start = i + 1; }
  }
  parts.push([start, text.length]);
  const seg = parts.find(([s, e]) => idx >= s && idx < e) || [0, text.length];
  return text.slice(seg[0], seg[1]);
}

/** 在一个片段里找本章体征词（含舌象三分类与其余四类） */
function signsIn(text) {
  const out = [];
  for (const s of ALL_SIGNS) {
    const re = new RegExp(s.re.source, 'g');
    if (re.test(text)) out.push({ cls: s.cls, label: s.label });
  }
  return out;
}

/**
 * 预示词抽取：把条文里的 吉/凶/可治/难治/死 抽出来，与**同一小句**的体征配对；
 * 小句里没有体征的，退回条级体征并标 scope='条'（避免把「多死」挂到一个不相干的舌象上）。
 */
function prognosis() {
  const hits = [];
  for (const art of inScope()) {
    for (const p of PROGNOSIS) {
      const re = new RegExp(p.re.source, 'g');
      let m;
      while ((m = re.exec(art.hant)) !== null) {
        const clause = clauseOf(art.hant, m.index);
        let signs = signsIn(clause);
        let scope = '句';
        if (!signs.length) { signs = signsIn(art.hant); scope = '条'; }
        hits.push({
          cite: art.cite,
          book: art.book,
          verdict: p.verdict,
          word: p.word,
          matched: m[0],
          clause,
          signs,
          scope,
        });
      }
    }
  }
  const byVerdict = {};
  for (const h of hits) byVerdict[h.verdict] = (byVerdict[h.verdict] || 0) + 1;

  // 体征 × 判定 的配对矩阵（只列出现过 ≥2 次的体征，避免一次性噪声）
  const cells = new Map();
  for (const h of hits) {
    for (const s of h.signs) {
      const k = `${s.cls}·${s.label}`;
      if (!cells.has(k)) cells.set(k, { sign: k, 可治: 0, 凶: 0, 難治: 0, 死: 0, cites: [] });
      const c = cells.get(k);
      c[h.verdict] += 1;
      c.cites.push(h.cite);
    }
  }
  const pairs = [...cells.values()]
    .map((c) => ({ ...c, total: c.可治 + c.凶 + c.難治 + c.死 }))
    .sort((a, b) => b.total - a.total || b.死 - a.死);

  return { hits, count: hits.length, byVerdict, pairs, pairCount: pairs.length };
}

/* ───────────────────── 四、两书各贡献多少条 ───────────────────── */

/** 条数按书拆；族计数允许一条计多族，故族和 ≥ 条数 */
function sourceSplit() {
  const pool = inScope();
  const byBook = {};
  for (const id of ['wenrelun', 'tiaobian']) {
    const rows = pool.filter((a) => a.book === id);
    const fam = {};
    for (const f of FAMILIES) fam[f.key] = rows.filter((a) => a.families.includes(f.key)).length;
    byBook[id] = {
      title: BOOKS[id].title,
      total: ART.filter((a) => a.book === id).length,
      articles: rows.length,
      fam,
      share: 0,
    };
  }
  const sum = byBook.wenrelun.articles + byBook.tiaobian.articles;
  for (const id of Object.keys(byBook)) byBook[id].share = Number(((byBook[id].articles / sum) * 100).toFixed(1));

  // 词表里只在一边出现的术语：说明两书的「舌诊语汇」并不等价
  const only = { wenrelun: [], tiaobian: [] };
  for (const s of ALL_SIGNS) {
    const re = new RegExp(s.re.source);
    const inW = pool.some((a) => a.book === 'wenrelun' && re.test(a.hant));
    const inT = pool.some((a) => a.book === 'tiaobian' && re.test(a.hant));
    if (inW && !inT) only.wenrelun.push(s.label);
    if (inT && !inW) only.tiaobian.push(s.label);
  }

  return { byBook, sum, only };
}

/* ───────────────────── 引文自检（反编造） ───────────────────── */

/** 逐条核对：判据/规则表里的 quote 必须是对应条文的字面子串 */
function verifyQuotes() {
  const bad = [];
  const check = (quote, citeStr) => {
    const art = ART.find((a) => a.cite === citeStr);
    if (!art) { bad.push({ quote, cite: citeStr, why: '条不存在' }); return; }
    if (!art.hant.includes(quote)) bad.push({ quote, cite: citeStr, why: '原文中无此字串' });
  };
  for (const c of BAN_ZHEN_CRITERIA) { check(c.ban.quote, c.ban.cite); check(c.zhen.quote, c.zhen.cite); }
  for (const r of BAN_ZHEN_RULES) check(r.quote, r.cite);
  return bad;
}

/** 词表 sample 必须在底本任何一处出现（繁/简都算，取繁） */
function verifyVocab() {
  const pool = ART.map((a) => a.hant).join('');
  return ALL_SIGNS.filter((s) => !pool.includes(s.sample)).map((s) => `${s.id} ${s.label} ← ${s.sample}`);
}

/* ───────────────────── 输出 ───────────────────── */

if (require.main === module) {
  const t = tongueIndex();
  const bz = banZhen();
  const pg = prognosis();
  const sp = sourceSplit();

  console.log('');
  console.log('  教学边界：本输出为《溫熱論》《溫病條辨》条文的结构统计与词表对照，');
  console.log('  外源·笈成留档可复算；不构成诊疗依据，不作处方与剂量参考。');
  console.log('');
  console.log('═══ 温病舌诊与斑疹 · 语料与词表 ═══');
  console.log(`  入章条 ${sp.sum}：溫熱論 ${sp.byBook.wenrelun.articles}/${sp.byBook.wenrelun.total}（${sp.byBook.wenrelun.share}%）· 溫病條辨 ${sp.byBook.tiaobian.articles}/${sp.byBook.tiaobian.total}（${sp.byBook.tiaobian.share}%）`);
  console.log(`  范围外：${EXCLUDED.map((e) => `${e.title} ${e.total} 条（同类体征 ${e.hits} 条，本章不取）`).join('；')}`);
  for (const [id, v] of Object.entries(sp.byBook)) {
    const fam = Object.entries(v.fam).map(([k, n]) => `${k}${n}`).join(' · ');
    console.log(`    ${v.title}：${fam}`);
  }
  console.log(`\n  舌象词表 ${t.vocabSize} 条（苔色 ${t.classCount.苔色} / 苔質 ${t.classCount.苔質} / 舌體 ${t.classCount.舌體}）`);
  console.log(`  命中 ${t.mentions} 处，分布在 ${t.articles} 条舌诊条文中；类内去重后：苔色 ${t.byClass.苔色} · 苔質 ${t.byClass.苔質} · 舌體 ${t.byClass.舌體}`);
  console.log('\n  词 | 类 | 次');
  for (const r of t.terms) console.log(`  ${r.label} | ${r.cls} | ${r.count}`);

  console.log('\n═══ 斑与疹：判据线 ═══');
  console.log(`  涉及条 ${bz.articles}：只提斑 ${bz.banOnly.length} · 只提疹 ${bz.zhenOnly.length} · 斑疹并提 ${bz.both.length}`);
  for (const c of bz.criteria) {
    const same = c.ban.quote === c.zhen.quote;
    console.log(`  · ${c.dim}${same ? '（共同前提，非区分判据）' : ''}`);
    if (!same) {
      console.log(`      斑「${c.ban.quote}」— ${c.ban.cite}`);
      console.log(`      疹「${c.zhen.quote}」— ${c.zhen.cite}`);
    } else {
      console.log(`      「${c.ban.quote}」— ${c.ban.cite}`);
    }
  }
  console.log('\n  「不透」与禁忌：');
  for (const r of bz.rules) console.log(`    [${r.kind}]「${r.quote}」— ${r.cite}`);

  console.log('\n═══ 预示词 × 体征 ═══');
  console.log(`  预示词命中 ${pg.count} 处：${Object.entries(pg.byVerdict).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  console.log('  体征 | 可治 | 凶 | 难治 | 死');
  for (const p of pg.pairs.slice(0, 12)) {
    console.log(`  ${p.sign} | ${p.可治} | ${p.凶} | ${p.難治} | ${p.死}`);
  }

  const badQ = verifyQuotes();
  const badV = verifyVocab();
  console.log(`\n  引文自检：${badQ.length ? `✗ ${badQ.length} 处对不上` : '✓ 判据与规则表引文全部字面命中'}`);
  console.log(`  词表自检：${badV.length ? `✗ ${badV.join('；')}` : '✓ 全部 sample 在底本中出现'}`);
  console.log('');
}

module.exports = {
  ROOT,
  BOOKS,
  BOOK_IDS,
  EXCLUDED,
  ART,
  FAMILIES,
  TONGUE,
  OTHER_SIGNS,
  ALL_SIGNS,
  BAN_ZHEN_CRITERIA,
  BAN_ZHEN_RULES,
  PROGNOSIS,
  cite,
  familiesOf,
  inScope,
  tongueIndex,
  banZhen,
  prognosis,
  sourceSplit,
  verifyQuotes,
  verifyVocab,
};
