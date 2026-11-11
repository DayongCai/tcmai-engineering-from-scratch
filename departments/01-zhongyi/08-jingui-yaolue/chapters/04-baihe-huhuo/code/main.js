'use strict';
/**
 * 第 4 章 · 篇 3「百合病狐惑阴阳毒」的三病鉴别
 *
 *   node code/main.js
 *
 * 数据：standards/jingui/底本.json 篇 3（外源·笈成，sha256 见 standards/jingui/README.md）
 *
 * 三条口径（改任何一条都要同步改 docs/zh.md 与 quiz.json）：
 *   1. 「条」= 源页 <p id="3.M"> 一段；「方」只计**有方文**者（formulas[] 非空）。
 *      条文提名而源页未给方文的（3.15 升麻鳖甲汤去雄黄、蜀椒）单列，不并入 12。
 *   2. 归类按**段界**（篇内顺序），不按关键字。理由见 SEGMENTS 注释 —— 狐惑段后三条
 *      条文里没有「狐惑」二字，关键字法会漏。
 *   3. 特征词只用**可判定**的字面（咽喉/蚀于阴/蚀于肛/斑斑如锦纹/欲卧不能卧…），
 *      不用「属热」「属虚」这类需要解释才能判的表述 —— 否则矩阵不可复核。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));
const PIAN = BOOK.pian.find((p) => p.no === 3);
if (!PIAN) throw new Error('底本.json 里找不到第 3 篇');

/** 条文正文：源页把方文紧接在条文之后（空行分隔）。只取第一段，避免方名/药名污染特征词统计。 */
function tiaoOnly(a) {
  return a.zhHans.split(/\n\s*\n/)[0].trim();
}

/**
 * 段界表。篇内顺序即分类顺序 —— 这是本篇的写作事实，不是我们的归纳：
 * 第 1 条立名（「百合病者，百脉一宗」）→ 第 9 条以治则收束；第 10 条另起「狐之为病」；
 * 第 14/15 条一阳一阴对举。三病各有明确的起句。
 *
 * 为什么不用关键字归类：3.11（蚀于下部则咽干）、3.12（蚀于肛者）、3.13（目赤如鸠眼）
 * 条文里一个字都没有「狐惑」。这三条靠段界才落得进狐惑，靠关键字会掉出来。
 */
const SEGMENTS = [
  {
    key: '百合病',
    from: 1,
    to: 9,
    anchor: '百合病者，百脉一宗',
    why: '第 1 条立名并给全程证候，第 2–8 条逐条给方（汗后/下后/吐后/未经汗吐下/渴/渴不差/变发热），第 9 条以「以阳法救之、以阴法救之」收束',
  },
  {
    key: '狐惑',
    from: 10,
    to: 13,
    anchor: '狐',
    why: '第 10 条立名（「蚀于阴为狐」「蚀于喉为惑」），第 11–12 条续讲外蚀部位与洗熏两法，第 13 条讲成脓（目赤如鸠眼、目四眦黑）',
  },
  {
    key: '阴阳毒',
    from: 14,
    to: 15,
    anchor: '毒之为病',
    why: '第 14 条阳毒、第 15 条阴毒，面赤斑斑 vs 面目青、唾脓血 vs 身痛如被杖，一阳一阴对举',
  },
];

const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * 段界自检：三条必须无缝、无重叠地覆盖全部 15 条，且段首必须含锚词。
 * 检查放在函数里而不是模块顶层 —— 顶层抛异常会让 `require` 失败，
 * 测试就看不到「哪一段对不上」，只能看到一个 require 报错。
 */
function assertSegments() {
  const actual = PIAN.articles.map((a) => a.idx).sort((x, y) => x - y);
  const claimed = SEGMENTS.flatMap((s) => range(s.from, s.to));
  if (claimed.length !== actual.length || claimed.some((v, i) => v !== actual[i])) {
    throw new Error(`段界与条目不符：段界 ${claimed.length} 条，底本 ${actual.length} 条（${actual.join(',')}）`);
  }
  for (const s of SEGMENTS) {
    const head = PIAN.articles.find((a) => a.idx === s.from);
    if (!tiaoOnly(head).includes(s.anchor)) {
      throw new Error(`段首锚词不符：${s.key} 第 ${s.from} 条不含「${s.anchor}」—— 底本被改过分条？`);
    }
  }
}

/**
 * 提名无方文：条文说「某方主之」，但源页没给药味与煎法。
 * 这里不靠关键字猜，而是反过来查：凡 formulas 为空却出现「主之」的条，必须登记在此表。
 * 3.1 与 3.9 没有「主之」，所以全篇只有 1 处 —— 这条断言能挡住「漏计方」。
 */
const NAMED_ONLY = [{ tiao: '3.15', name: '升麻鳖甲汤去雄黄、蜀椒', basedOn: '3.14' }];

function assertNamedOnly() {
  const bare = PIAN.articles.filter((a) => (a.formulas || []).length === 0 && tiaoOnly(a).includes('主之'));
  const registered = new Set(NAMED_ONLY.map((n) => n.tiao));
  for (const a of bare) {
    if (!registered.has(a.tiao)) throw new Error(`第 ${a.tiao} 条提名了方却没有方文，且未登记到 NAMED_ONLY`);
  }
  for (const n of NAMED_ONLY) {
    const a = PIAN.articles.find((x) => x.tiao === n.tiao);
    if (!a || !tiaoOnly(a).includes(n.name)) throw new Error(`NAMED_ONLY 登记与条文不符：${n.tiao} 不含「${n.name}」`);
  }
}

/** 按病分段汇总：条 / 有方文 / 提名无方文 / 方条比 / 方名 */
function classify() {
  assertSegments();
  assertNamedOnly();
  return SEGMENTS.map((s) => {
    const arts = PIAN.articles.filter((a) => a.idx >= s.from && a.idx <= s.to);
    const fang = arts.flatMap((a) => a.formulas || []);
    const namedOnly = NAMED_ONLY.filter((n) => arts.some((a) => a.tiao === n.tiao));
    return {
      key: s.key,
      from: s.from,
      to: s.to,
      tiao: arts.length,
      tiaos: arts.map((a) => a.tiao),
      fang: fang.length,
      fangNames: fang.map((f) => f.nameSimp),
      namedOnly,
      per: Number((fang.length / arts.length).toFixed(2)),
      why: s.why,
    };
  });
}

/**
 * 特征矩阵。每行一个「可判定词」——判据是字面上能不能一眼判定有/无，
 * 不是病理上重不重要。所以「咽喉」进表（咽喉痛/蚀于喉/咽干/声喝），
 * 「湿热」不进表（要解释才判，不可复核）。
 */
const FEATURES = [
  { key: '神志不安', label: '默默 / 欲卧不能卧 / 卧起不安 / 微烦', re: /默默|欲卧不能卧|卧起不安|欲眠|如有神灵|微烦/ },
  { key: '饮食异常', label: '欲食不能食 / 不欲饮食 / 恶闻食臭', re: /欲食|不能食|不欲饮食|闻食臭/ },
  { key: '假寒热', label: '如寒无寒 / 如热无热 / 无热', re: /如寒无寒|如热无热|无热|变发热/ },
  { key: '口苦尿赤', label: '口苦 / 小便赤', re: /口苦|小便赤/ },
  { key: '目症', label: '目不得闭 / 目赤如鸠眼 / 目四眦黑', re: /目不得闭|目赤|目四眦黑/ },
  { key: '咽喉', label: '咽喉痛 / 蚀于喉 / 声喝 / 咽干', re: /咽喉痛|蚀于喉|声喝|咽干/ },
  { key: '前后阴蚀烂', label: '蚀于阴 / 蚀于肛 / 蚀于下部', re: /蚀于阴|蚀于肛|蚀于下部/ },
  { key: '发斑', label: '面赤斑斑如锦纹', re: /斑斑如锦纹/ },
  { key: '面青', label: '面目青', re: /面目青/ },
  { key: '身痛', label: '身痛如被杖', re: /身痛如被杖/ },
  { key: '唾脓血', label: '唾脓血', re: /唾脓血/ },
  { key: '脉数', label: '脉微数 / 脉数', re: /脉微数|脉数/ },
];

/**
 * 三病 × 12 特征 → 各病命中条号。
 * 返回 { features, rows[病] = { featKey: [tiao...] }, exclusive: [featKey], shared: [featKey] }
 */
function signature() {
  const rows = {};
  for (const d of classify()) {
    const arts = PIAN.articles.filter((a) => a.idx >= d.from && a.idx <= d.to);
    rows[d.key] = {};
    for (const f of FEATURES) {
      rows[d.key][f.key] = arts.filter((a) => f.re.test(tiaoOnly(a))).map((a) => a.tiao);
    }
  }
  const hits = FEATURES.map((f) => ({
    key: f.key,
    by: Object.keys(rows).filter((k) => rows[k][f.key].length > 0),
  }));
  return {
    features: FEATURES.map((f) => ({ key: f.key, label: f.label })),
    rows,
    // 独占 = 只有一种病命中 → 可直接当鉴别点
    exclusive: hits.filter((h) => h.by.length === 1).map((h) => ({ key: h.key, only: h.by[0] })),
    // 共有 = 两种以上命中 → 单看这条会误诊，必须配独占点
    shared: hits.filter((h) => h.by.length > 1).map((h) => ({ key: h.key, by: h.by })),
  };
}

/** 方数：全篇有方文 / 提名无方文 / 分病归属 / 单味药主导情况 */
function fangCount() {
  const rows = classify();
  const all = PIAN.articles.flatMap((a) => a.formulas || []);
  const bak = rows.find((r) => r.key === '百合病');
  // 「用百合」要两个口子都认：3.6 百合洗方在源页没有药味栏，整句煎法被解析成 1 条「药」，
  // 只按药味查会漏掉它；3.3 滑石代赭汤方冠名不带百合，但药味里第一味就是百合，只按方名查会漏。
  // 两处都认才是 6/7 —— 单认一处会得出 5/7 或 5/7 两种错的数。
  const uses = (f) => f.ingredients.some((i) => i.herbSimp.includes('百合')) || f.nameSimp.includes('百合');
  const arts = PIAN.articles.filter((a) => a.idx >= bak.from && a.idx <= bak.to);
  const bakForms = arts.flatMap((a) => (a.formulas || []).map((f) => ({ tiao: a.tiao, f })));
  const withBaihe = bakForms.filter((x) => uses(x.f));
  return {
    fang: all.length,
    named: all.length + NAMED_ONLY.length,
    namedOnly: NAMED_ONLY.length,
    byDisease: Object.fromEntries(rows.map((r) => [r.key, r.fang])),
    per: Number((all.length / PIAN.articles.length).toFixed(2)),
    baiheOfBaihe: `${withBaihe.length}/${bak.fang}`,
    baiheTiaos: withBaihe.map((x) => x.tiao),
    baiheExempt: bakForms.filter((x) => !uses(x.f)).map((x) => `${x.f.nameSimp}（第 ${x.tiao} 条）`),
  };
}

/**
 * 篇 3 在全书的位次。为什么必须给这个数：12/15=0.80 是全书 22 篇正文的第二，
 * 不说位次就只是「一个比值」；说成「第 2 / 22」才是可核的说法。
 *
 * 位次随底本口径变：底本 v2 按 `<b>X方：</b>` 切开并列方，篇 9 胸痹 9 条 9 方 = 1.00
 * 反超为全书第一，篇 3 的 0.80 退到第二（篇 8 奔豚 0.75 第三）。v1 的 164 方里
 * 并列方被吞，篇 9 被算低了 —— 所以「第一」这个结论是 v1 口径的产物，不能沿用。
 */
function bookContext() {
  const per = BOOK.pian
    .filter((p) => p.no != null)
    .map((p) => {
      const f = p.articles.flatMap((a) => a.formulas || []);
      return { no: p.no, name: p.nameSimp, tiao: p.articles.length, fang: f.length, per: f.length / p.articles.length };
    });
  const sorted = [...per].sort((a, b) => b.per - a.per);
  const rank = sorted.findIndex((r) => r.no === 3) + 1;
  const bookFang = per.reduce((n, r) => n + r.fang, 0);
  const bookTiao = per.reduce((n, r) => n + r.tiao, 0);
  return {
    rank,
    of: sorted.length,
    bookPer: Number((bookFang / bookTiao).toFixed(2)),
    bookFang,
    bookTiao,
    top: sorted.slice(0, 3).map((r) => `第${r.no}篇 ${r.name} ${r.per.toFixed(2)}`),
    p17: sorted.find((r) => r.no === 17),
  };
}

/**
 * 底本 v2 复算：v1 那几处「解析瑕疵」的**反向断言**。
 *
 * v1 的四个症状（并列方被吞、非贪婪截断、下一味被排进上一味的剂量夹注、纯校注被当成药）
 * 表现在数据上是同一个等式失效：药数 ≠ 原文自述的「右N味」。所以这里不再登记「当前仍有
 * 哪些瑕疵」（那会让同一条断言在底本修好后变成「证明错还在」），而是**要求等式成立** ——
 * 底本一旦退回 v1，mismatched / pseudo 立刻非空。
 *
 * 边界：源页没有「右N味」的方（全书 17 方，本篇 3.6 百合洗方在内）没有自述锚点，味数无从
 * 自校验，也不计入本篇药味统计 —— 这是源页缺项，不是解析偏差，单列在 unanchored 里。
 */
function parseAudit() {
  const CN = { 零: 0, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const num = (s) => {
    const i = s.indexOf('十');
    if (i < 0) return [...s].reduce((n, c) => n * 10 + CN[c], 0);
    const head = i === 0 ? 1 : CN[s.slice(0, i)];
    const tail = s.slice(i + 1);
    return head * 10 + (tail ? CN[tail] : 0);
  };
  // 伪药名：v1 把煎法/校注切进了药味栏（以水 / 渍之 / 一法二分 / 深師有生薑…）
  const PSEUDO = /^(以|煎|煮|取|服|洗|渍|食|勿|右|一法|一方|一作|深師|深师|令|候|须|微|先|再|更|别|绞|筛|为末)/;

  const rows = [];
  for (const p of BOOK.pian) {
    for (const a of p.articles) {
      for (const f of a.formulas || []) {
        const base = { pian: p.no, tiao: a.tiao, name: f.nameSimp, n: f.ingredients.length };
        if (!f.ingredients.length) { rows.push({ ...base, want: null, state: 'refOnly' }); continue; }
        const m = `${f.methodSimp || ''} ${a.zhHans || ''}`.match(/右([零一二三四五六七八九十]+)味/);
        if (!m) { rows.push({ ...base, want: null, state: 'unanchored' }); continue; }
        const want = num(m[1]);
        rows.push({
          ...base,
          want,
          state: want === f.ingredients.length ? 'match' : 'MISMATCH',
          pseudo: f.ingredients.map((i) => i.herbSimp).filter((h) => PSEUDO.test(h)),
        });
      }
    }
  }
  const anchored = rows.filter((r) => r.state === 'match' || r.state === 'MISMATCH');
  const of = (no) => rows.filter((r) => r.pian === no);
  const mine = of(3);
  return {
    anchored: anchored.length,
    matched: anchored.filter((r) => r.state === 'match').length,
    mismatched: anchored.filter((r) => r.state === 'MISMATCH').map((r) => `${r.tiao} ${r.name}：原文自述 ${r.want} 味 / 解析出 ${r.n} 味`),
    pseudo: anchored.flatMap((r) => r.pseudo.map((h) => `${r.tiao} ${r.name}：「${h}」`)),
    unanchored: rows.filter((r) => r.state === 'unanchored').map((r) => r.tiao),
    refOnly: rows.filter((r) => r.state === 'refOnly').length,
    pian3: {
      formulas: mine.length,
      anchored: mine.filter((r) => r.state === 'match' || r.state === 'MISMATCH').length,
      matched: mine.filter((r) => r.state === 'match').length,
      unanchored: mine.filter((r) => r.state === 'unanchored').map((r) => r.tiao),
    },
  };
}

if (require.main === module) {
  console.log('');
  console.log('  教学边界：本输出为《金匮要略》文本结构统计，外源·笈成留档可复算，不构成诊疗依据。');
  console.log('');
  const rows = classify();
  const f = fangCount();
  const b = bookContext();
  const sig = signature();

  console.log('═══ 篇 3 · 百合病 / 狐惑 / 阴阳毒 ═══');
  console.log(
    `  条 ${PIAN.articles.length} · 有方文 ${f.fang} · 提名无方文 ${f.namedOnly} · 方条比 ${f.per.toFixed(2)}（全书 ${b.of} 篇正文第 ${b.rank}）`
  );
  console.log(`  全书对照：${b.bookFang} 方 / ${b.bookTiao} 条 = ${b.bookPer.toFixed(2)}\n`);

  console.log('  病 | 条 | 有方文 | 方/条 | 条号');
  for (const r of rows) console.log(`  ${r.key} | ${r.tiao} | ${r.fang} | ${r.per.toFixed(2)} | 3.${r.from}–3.${r.to}`);

  console.log('\n  方（按病归属）：');
  for (const r of rows) {
    console.log(`  ${r.key}：${r.fangNames.join('、') || '—'}`);
    for (const n of r.namedOnly) console.log(`    ＋提名无方文：${n.name}（第 ${n.tiao} 条）`);
  }
  console.log(`  百合病 ${f.baiheOfBaihe} 方用百合（第 ${f.baiheTiaos.join('、')} 条）；例外：${f.baiheExempt.join('、')}`);

  console.log('\n  特征矩阵（条数 × 条号）：');
  const head = ['特征'.padEnd(12), ...Object.keys(sig.rows).map((k) => k.padEnd(18))].join(' | ');
  console.log(`  ${head}`);
  for (const feat of sig.features) {
    const cells = Object.keys(sig.rows).map((k) => {
      const t = sig.rows[k][feat.key];
      return (t.length ? `${t.length}·${t.map((x) => x.replace('3.', '')).join(',')}` : '—').padEnd(18);
    });
    console.log(`  ${feat.key.padEnd(12)} | ${cells.join(' | ')}`);
  }

  console.log('\n  独占鉴别点（只有一种病命中 → 可直接用）：');
  for (const e of sig.exclusive) console.log(`  · ${e.key} → ${e.only}`);
  console.log('  共有症（两种以上命中 → 单看这条会误诊）：');
  for (const s of sig.shared) console.log(`  · ${s.key} ← ${s.by.join(' / ')}`);

  console.log('\n  底本 v2 复算（反向断言：v1 的解析瑕疵已修）：');
  const audit = parseAudit();
  console.log(
    `  「右N味」味数自校验 ${audit.matched}/${audit.anchored} 吻合 · 伪药名 ${audit.pseudo.length} 处 · 无锚点 ${audit.unanchored.length} 方（${audit.unanchored.join('、')}，源页缺项，不计入味数统计）`
  );
  console.log(
    `  本篇：${audit.pian3.formulas} 方中有锚点 ${audit.pian3.anchored} 方、${audit.pian3.matched} 方吻合；${audit.pian3.unanchored.join('、')} 无「右N味」→ 不入本表`
  );
}

module.exports = {
  BOOK,
  PIAN,
  SEGMENTS,
  FEATURES,
  NAMED_ONLY,
  tiaoOnly,
  classify,
  signature,
  fangCount,
  bookContext,
  parseAudit,
};
