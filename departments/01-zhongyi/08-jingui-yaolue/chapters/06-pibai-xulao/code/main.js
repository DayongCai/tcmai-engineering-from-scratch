'use strict';
/**
 * 第 6 章 · 血痹虚劳：虚损的分层
 *
 *   node code/main.js            # 逐条分层 + 方归层 + 血痹/虚劳鉴别
 *   node --test code/main.test.js
 *
 * 数据：standards/jingui/底本.json（外源·笈成·金匱要略方論 第6篇，sha256 见该目录 README）
 *
 * 三条口径（改任何一条都要同步改 docs/zh.md）：
 *   1. 条号沿用源页 <p id="6.N">，共 18 条。引用格式「外源·笈成·金匮要略方论 第6篇·第N条」。
 *   2. 方只统计 formulas[] 非空者，共 7 方。6.14「黄耆建中汤主之」提名而无方文，
 *      单列 namedOnly，不进 7 方 —— 这与第 1 章「165 方只含有方文者」同一口径。
 *   3. 分层是本课归纳，原文无「层」字。所以每层的每条都带**判据词**，
 *      由 assertCriteria() 逐字回查原文；底本一改、判据词消失，就报错而不是静默漂移。
 *      这是本章相对「凭记忆背分层」的唯一硬约束。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));

const PIAN_NO = 6;
const PIAN = BOOK.pian.find((p) => p.no === PIAN_NO);
const TIAO = new Map(PIAN.articles.map((a) => [a.tiao, a]));

/** 6.N → 简体原文。全章引文只从这里取，别处不许手写条文 */
const textOf = (n) => {
  const a = TIAO.get(`6.${n}`);
  if (!a) throw new Error(`第6篇无第 ${n} 条`);
  return a.zhHans;
};

// ─────────── 层定义 ───────────
/**
 * 分层的依据不是「虚劳分几种」这种教材说法，而是**原文自己给出的判据**：
 * 阳虚层的判据是「手足逆寒／脱气」，阴虚层是「盗汗／虚烦不得眠」，
 * 阴阳两虚层是「里急／诸不足／失精」这类既耗阴又耗阳的复合语，
 * 干血层是「内有干血／肌肤甲错／两目黯黑」。
 *
 * 「纲」不是一层病机，而是三类**脉法/总纲条**：它们不指认病位，
 * 只给判定标准（脉大为劳、极虚亦为劳；革脉；劳之变证）。
 * 单列出来，是为了不让「脉纲」被误算成「某一层虚」。
 */
const LAYERS = {
  血痹: {
    label: '血痹（营卫痹阻）',
    bingji: '阳气痹阻于肌腠，营卫不通',
    zhifa: '通阳行痹（针引阳气 / 黄芪桂枝五物汤）',
  },
  阳虚: {
    label: '阳虚（气不温煦）',
    bingji: '阳气衰少，温煦不能，责在脾肾',
    zhifa: '温阳益气（肾气丸、建中之属）',
  },
  阴虚: {
    label: '阴虚（精血耗损）',
    bingji: '阴精血液耗损，虚热内生，神不守舍',
    zhifa: '养阴清热、安神（酸枣仁汤之属）',
  },
  阴阳两虚: {
    label: '阴阳两虚（虚而失守）',
    bingji: '阴损及阳、阳损及阴，气血精三者同耗',
    zhifa: '建中、扶阳固阴（小建中、桂枝加龙骨牡蛎、薯蓣丸）',
  },
  干血: {
    label: '干血（虚极夹瘀）',
    bingji: '五劳虚极，血枯成干，瘀阻而新血不生',
    zhifa: '缓中补虚 —— 以通为补，非直补',
  },
  纲: {
    label: '脉纲（判定标准，不指病位）',
    bingji: '只立判定标准：脉象与变证，不落具体虚层',
    zhifa: '—（此层不出方）',
  },
};

/** 层的阅读顺序：先分病（血痹），再按虚损深度由浅入深，脉纲殿后 */
const LAYER_ORDER = ['血痹', '阳虚', '阴虚', '阴阳两虚', '干血', '纲'];

/**
 * 逐条分层表。crit = 判据词，必须**逐字**出现在该条 zhHans 里（由测试与运行时双重校验）。
 * fang 由 formulas[] 反查，不手写，避免方名与底本不一致。
 */
const TABLE = [
  { tiao: 1, layer: '血痹', crit: ['尊荣人', '骨弱肌肤盛', '针引阳气'] },
  { tiao: 2, layer: '血痹', crit: ['身体不仁', '如风痹状'] },
  { tiao: 3, layer: '纲', crit: ['脉大为劳', '极虚亦为劳'] },
  { tiao: 4, layer: '阴虚', crit: ['面色薄', '卒喘悸', '里虚也'] },
  { tiao: 5, layer: '阴阳两虚', crit: ['短气里急', '面色白', '兼衄'] },
  { tiao: 6, layer: '阴虚', crit: ['手足烦', '春夏剧', '酸削不能行'] },
  { tiao: 7, layer: '阴虚', crit: ['精气清冷'] },
  { tiao: 8, layer: '阴阳两虚', crit: ['失精家', '脉极虚芤迟', '梦交'] },
  { tiao: 9, layer: '阴虚', crit: ['盗汗'] },
  { tiao: 10, layer: '纲', crit: ['痹侠背行', '马刀侠瘿', '皆为劳得之'] },
  { tiao: 11, layer: '阳虚', crit: ['脱气', '手足逆寒', '食不消化'] },
  { tiao: 12, layer: '纲', crit: ['虚寒相搏', '此名为革', '亡血失精'] },
  { tiao: 13, layer: '阴阳两虚', crit: ['里急', '梦失精', '手足烦热'] },
  { tiao: 14, layer: '阴阳两虚', crit: ['里急、诸不足'] },
  { tiao: 15, layer: '阳虚', crit: ['虚劳腰痛', '少腹拘急', '小便不利'] },
  { tiao: 16, layer: '阴阳两虚', crit: ['诸不足', '风气百疾'] },
  { tiao: 17, layer: '阴虚', crit: ['虚烦不得眠'] },
  { tiao: 18, layer: '干血', crit: ['五劳虚极', '内有干血', '肌肤甲错', '两目黯黑'], ganxue: true },
];

/**
 * 条文提名、但底本未录方文的方。
 * 6.14 只写「黄耆建中汤主之」，方文不在本库 —— 因此 7 方里没有它。
 * 若把它算进 7 方，本章的方数就与第 1 章的 165 方（有方文者）口径打架。
 */
const NAMED_ONLY = [{ tiao: 14, name: '黄耆建中汤', why: '条文提名，底本未录方文（方文另见）' }];

/** 6.8 条后有天雄散方，6.18 条后附《千金翼》炙甘草汤、《肘后》獭肝散：
 *  这三段有方文，但不是独立条，也没有进 formulas[]，故不计入 7 方。如实登记。 */
const SIDE_FANG = [
  { at: 8, name: '天雄散', kind: '条后附方' },
  { at: 18, name: '《千金翼》炙甘草汤', kind: '附方' },
  { at: 18, name: '《肘后》獭肝散', kind: '附方' },
];

// ─────────── 判据校验 ───────────
/**
 * 为什么要在运行时校验判据词：
 * 分层表是人写的，条文是机器读的。两者一旦脱钩（底本换版、手写引文走样），
 * 表面上一切照跑，实际上每一层都在张冠李戴。校验把这种漂移变成硬错误。
 */
function assertCriteria() {
  const bad = [];
  for (const row of TABLE) {
    const t = textOf(row.tiao);
    for (const c of row.crit) {
      if (!t.includes(c)) bad.push(`6.${row.tiao} 缺判据词「${c}」`);
    }
  }
  if (bad.length) throw new Error(`判据词与底本不符：\n  ${bad.join('\n  ')}`);
  return true;
}

/** 条号 → 底本里该条的第一个方名（去尾「方」字）；无方文返回 null */
function fangOf(tiao) {
  const a = TIAO.get(`6.${tiao}`);
  const f = (a.formulas || [])[0];
  return f ? f.nameSimp.replace(/方$/, '') : null;
}

// ─────────── 三个函数 ───────────
/** xulaoLayer(): 逐条归层。判据词随行输出，便于人工复核「凭什么这么分」 */
function xulaoLayer() {
  assertCriteria();
  return TABLE.map((row) => ({
    tiao: `6.${row.tiao}`,
    n: row.tiao,
    layer: row.layer,
    layerLabel: LAYERS[row.layer].label,
    crit: row.crit,
    fang: fangOf(row.tiao),
    ganxue: !!row.ganxue,
  }));
}

/** 层 → 条数/条号/方，按 LAYER_ORDER 排（不用对象键序，避免读数依赖插入顺序） */
function layerSummary() {
  const rows = xulaoLayer();
  return LAYER_ORDER.map((k) => {
    const own = rows.filter((r) => r.layer === k);
    return {
      layer: k,
      label: LAYERS[k].label,
      tiao: own.length,
      nos: own.map((r) => r.n),
      fang: own.map((r) => r.fang).filter(Boolean),
      ganxue: own.some((r) => r.ganxue),
    };
  });
}

/**
 * pibaiVsXulao(): 两病鉴别。
 * 关键判据不是「有没有麻木」—— 6.2 明说「如风痹状」，麻木本身两病都可见；
 * 真正的界限是**有没有精气/血/阴阳的全身耗损证**（失精、亡血、盗汗、羸瘦、里急）。
 * 所以这里用 VITAL 词组去两边条文里数命中数，让「界限」是个可复算的数，不是一句形容。
 */
const VITAL = ['失精', '亡血', '盗汗', '羸瘦', '里急', '面色白', '手足烦热'];

function pibaiVsXulao() {
  assertCriteria();
  const rows = xulaoLayer();
  const pibai = rows.filter((r) => r.layer === '血痹');
  const xulao = rows.filter((r) => r.layer !== '血痹');
  const hits = (list) => {
    const t = list.map((r) => textOf(r.n)).join('');
    return VITAL.filter((w) => t.includes(w));
  };
  return {
    pibai: { tiao: pibai.map((r) => r.tiao), fang: pibai.map((r) => r.fang).filter(Boolean), vitalHits: hits(pibai) },
    xulao: { tiao: xulao.map((r) => r.tiao), fang: xulao.map((r) => r.fang).filter(Boolean), vitalHits: hits(xulao) },
    dims: [
      ['病位', '肌腠营卫（骨弱肌肤盛，阳不得行）', '脏腑精气（虚极羸瘦，精血耗损）'],
      ['成因', '体质 + 微风：尊荣人汗出卧动摇，加被微风', '内伤七伤：食伤、忧伤、房室伤、劳伤'],
      ['脉', '寸口关上微，尺中小紧（阳微而阴涩）', '脉大为劳、极虚亦为劳、芤、革（无定形）'],
      ['主证', '身体不仁，如风痹状（只此一证）', '失精、亡血、盗汗、里急、手足烦热、羸瘦'],
      ['治法', '通阳行痹：针引阳气，黄芪桂枝五物汤', '补虚：建中、固精、养阴、缓中补虚'],
      ['界限', '无全身精气耗损证（VITAL 命中 0）', '必有全身耗损证之一（VITAL 命中 ≥1）'],
    ],
    vitalTerms: VITAL,
  };
}

/** fangByLayer(): 7 方归层。纲层不出方，故合计 7 = 各层之和 */
function fangByLayer() {
  const rows = xulaoLayer();
  const out = {};
  for (const k of LAYER_ORDER) {
    out[k] = rows.filter((r) => r.layer === k && r.fang).map((r) => ({ tiao: r.tiao, name: r.fang }));
  }
  return out;
}

/** 干血：全篇唯一一条「以通为补」，与建中类方向相反，必须单列 */
function ganxueCases() {
  checkedOnly();
  return xulaoLayer()
    .filter((r) => r.ganxue)
    .map((r) => ({
      tiao: r.tiao,
      fang: r.fang,
      zhifa: '缓中补虚',
      crit: r.crit,
      // 治法反差点：6.13/6.14 同为「虚劳里急」，用建中温补；6.18 虚极而夹干血，反而用大黄䗪虫丸攻瘀
      contrast: '同篇 6.13／6.14 治里急用建中温补，6.18 虚极夹干血却用攻瘀 —— 虚劳不是「一律补」',
    }));
}

function checkedOnly() {
  assertCriteria();
  return true;
}

// ─────────── 规模统计 ───────────
/**
 * 药味统计与校注串（底本 v2 口径）。
 *
 * v1 的 ingredients 里混着双行夹注「⟨深師有生薑二兩⟩」（酸枣仁汤），机械 flatMap
 * 会把它当第 42 味药；v1 靠 isEditorial() 事后剔掉才得 64 味次 / 41 味。
 *
 * v2 起，底本解析器已把整 token 为夹注者丢进 articles[].notes，ingredients 里
 * 不再有这类串 —— 所以 **64 味次 / 41 味是 ingredients 的原值**，不是「剔完剩的」。
 * isEditorial() 保留为回归防线：底本若退回 v1 行为，editorial 会从 0 变 1，
 * 单测「校注串不入药名表」当场红，而不是静默多出一味不存在的药。
 *
 * 注意断言方向：这条串**不在**药名表里（不是「应把它剔除」）；它仍在 6.17 的
 * notes 里留档，只是不参与药味计数。
 */
const isEditorial = (h) => /[⟨⟩]/.test(h);

/** 药名表：全篇 7 方的药味 token（已剔夹注串），tests 与 scale() 共用同一份 */
function herbNames() {
  return PIAN.articles
    .flatMap((a) => a.formulas || [])
    .flatMap((f) => f.ingredients.map((i) => i.herbSimp || i.herb))
    .filter((h) => !isEditorial(h));
}

function scale() {
  const fangs = PIAN.articles.flatMap((a) => a.formulas || []);
  const tokensAll = fangs.flatMap((f) => f.ingredients.map((i) => i.herbSimp || i.herb));
  const tokens = tokensAll.filter((h) => !isEditorial(h));
  const rows = xulaoLayer();
  const pibaiN = rows.filter((r) => r.layer === '血痹').length;
  return {
    tiao: PIAN.articles.length,
    pibaiTiao: pibaiN,
    xulaoTiao: PIAN.articles.length - pibaiN,
    fang: fangs.length,
    namedOnly: NAMED_ONLY.length,
    sideFang: SIDE_FANG.length,
    chars: PIAN.chars,
    herbTokens: tokens.length,
    herbTokensRaw: tokensAll.length,
    editorial: tokensAll.length - tokens.length,
    distinctHerbs: new Set(tokens).size,
    layers: layerSummary().length,
    ganxue: rows.filter((r) => r.ganxue).length,
  };
}

// ─────────── 输出 ───────────
if (require.main === module) {
  console.log('');
  console.log('  教学边界：本输出为《金匮要略》文本结构统计，外源·笈成留档可复算，不构成诊疗依据。');
  console.log('');
  const s = scale();
  console.log('═══ 第 6 篇 · 血痹虚劳：虚损的分层 ═══');
  console.log(`  条 ${s.tiao}（血痹 ${s.pibaiTiao} + 虚劳 ${s.xulaoTiao}）· 方 ${s.fang}（有方文）· 原文 ${s.chars} 字`);
  console.log(`  药 味次 ${s.herbTokens} · 不同 ${s.distinctHerbs}（校注串单存 notes，混入药名表 ${s.editorial} 条）`);
  console.log(`  提名无方文 ${s.namedOnly}（黄耆建中汤 6.14）· 条后附方 ${s.sideFang}（天雄散 / 炙甘草汤 / 獭肝散）\n`);

  console.log('  条 | 层 | 判据词（逐字取自原文） | 方');
  for (const r of xulaoLayer()) {
    console.log(`  ${r.tiao} | ${r.layer} | ${r.crit.join('·')} | ${r.fang || '—'}`);
  }

  console.log('\n  层 | 条 | 方 | 病机');
  for (const l of layerSummary()) {
    console.log(`  ${l.layer} | ${l.tiao} | ${l.fang.length} | ${LAYERS[l.layer].bingji}`);
  }

  const d = pibaiVsXulao();
  console.log('\n  ── 血痹 vs 虚劳 ──');
  console.log(`  血痹：6.${d.pibai.tiao.map((t) => t.slice(2)).join(' / 6.')} · ${d.pibai.fang.join('、')} · 全身耗损证命中 ${d.pibai.vitalHits.length}`);
  console.log(`  虚劳：6.${d.xulao.tiao[0].slice(2)}–6.${d.xulao.tiao.at(-1).slice(2)}（${d.xulao.tiao.length} 条）· ${d.xulao.fang.length} 方 · 全身耗损证命中 ${d.xulao.vitalHits.length}`);
  for (const [k, a, b] of d.dims) console.log(`  ${k}｜${a} ／ ${b}`);

  console.log('\n  ── 干血：唯一的攻法 ──');
  for (const g of ganxueCases()) console.log(`  ${g.tiao} · ${g.fang} · ${g.zhifa} —— ${g.contrast}`);
}

module.exports = {
  ROOT,
  BOOK,
  PIAN_NO,
  PIAN,
  LAYERS,
  LAYER_ORDER,
  TABLE,
  NAMED_ONLY,
  SIDE_FANG,
  VITAL,
  textOf,
  fangOf,
  assertCriteria,
  xulaoLayer,
  layerSummary,
  pibaiVsXulao,
  fangByLayer,
  ganxueCases,
  isEditorial,
  herbNames,
  scale,
};
