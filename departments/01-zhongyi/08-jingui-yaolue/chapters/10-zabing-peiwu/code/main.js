'use strict';
/**
 * 第 10 章 · 杂病方剂的配伍规律与统计
 *
 *   node code/main.js
 *
 * 数据：standards/jingui/底本.json（外源·笈成，sha256 见该目录 README）
 *
 * 口径（四条，改任何一条都要同步改 docs/zh.md 与 main.test.js）：
 *   1. 总体 = 174 方，但配伍统计只用 **165 个有方文的方**。另有 9 方是互见方
 *      （refOnly: true，药文在他篇），它们的 ingredients 为空数组。
 *      为什么不进统计：空数组会被当成「0 味/1 味方」，既拉低平均药味，
 *      又让它在药对共现里成为一个「什么都没配」的假样本。174 与 165 必须分开报。
 *   2. 分篇一律用「有方文的方」计；跨篇比较只用内伤（6–10、12–19）与妇人（20–22）。
 *   3. 药名先清洗再统计（清洗规则见 cleanHerb 注释）；清洗只做「同一味药的不同写法」，
 *      不做异名归并（薯蓣/山药、黄耆/黄芪、蜀椒/川椒仍分列）—— 那是另一个轴，另立工程。
 *   4. 「君臣佐使」只能给**代理指标**（方内剂量最大者），不是原书标注；原书无一处标注君臣。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));

/** 篇 N → 大类。跨篇比较只用「内伤」「妇人」两类（第 1 章已定，本章不另立分类）。 */
const CLASS_OF = {
  1: '总论', 11: '总论',
  2: '外感', 4: '外感', 5: '外感',
  3: '少见病',
  6: '内伤', 7: '内伤', 8: '内伤', 9: '内伤', 10: '内伤',
  12: '内伤', 13: '内伤', 14: '内伤', 15: '内伤', 16: '内伤',
  17: '内伤', 18: '内伤', 19: '内伤',
  20: '妇人', 21: '妇人', 22: '妇人',
};

// ─────────────────────────── 药名清洗 ───────────────────────────
/**
 * 为什么必须清洗：底本的「药名」列不是纯药名。
 * v2 底本已在解析层把 ⟨…⟩ 双行夹注（校勘异文、一法几两）与剂量拆出单元格，
 * 所以 v1 那批「茯苓⟨三两⟩⟨一法四两。⟩」「半夏大者洗⟨八枚⟩⟨一法半升⟩」不再出现
 * （实测带 ⟨⟩ 的行 0）；但同一味药仍留下 13 种带炮制/规格尾巴的写法，
 * 165 个不同「药名」因此收敛到 154 味：
 *   甘草如指大、半夏大者洗、枳实大者、甘遂大者、大附子 / 用大附子、
 *   白术各等分、茵陈蒿末、水蛭百枚、生姜汁、生地黄汁.、鸡子黄.、滑石.
 * 不清洗直接 count，会把「甘草」和「甘草如指大」算成两味药，
 * 高频药的排名随之失真（附子 16 → 18、枳实 12 → 13）—— 这就是本章第一个可复现的发现。
 *
 * 规则按顺序执行（顺序不能换，换了会切错）：
 *   A 去 ⟨…⟩ 夹注。v1 留档把双行夹注并进了单元格，它们是「关于这味药的注」，
 *     不是药名的一部分；v2 已在数据层拆开，这道规则实测不再触发，保留作旧留档兼容。
 *     允许嵌套，故循环剥。
 *   B 去尾部句读（. 。 、 ， ： ； —— 底本个别单元格带句号）。
 *   C 去尾部剂量串（数字/汉字数目 + 量词）。剂量要单独成列；
 *     剂量列本身在 doseSimp 里，洗药名时把它从名字尾巴上剥掉。
 *     例外：剥完会变空串时保留原样 —— 「百合」= 百 + 合（合是容量单位），
 *     不设这道闸，百合会被量词规则吃成空串。
 *   D 循环去尾部炮制法/修治词（炮、炙、洗、去皮、去节、去皮尖、去心、切、碎、擘、熬、
 *     烧、末、汁、大者、如指大、各、各等分、等分）。循环是因为会出现「各等分」「去皮尖」叠加。
 *     只剥尾部不剥头部：「干姜」「生姜」「干地黄」「大生地」这类首字是药名的一部分，
 *     剥了就把两味药并成一味。
 *   E 去头部「用」（「用大附子」=「附子」；底本用它承接上方的炮制法）。
 *   F 少量显式别名（见 ALIAS）：只收「大小/生干」这类规格词造成的重复写法。
 *     不做薯蓣→山药、黄耆→黄芪这种异名归并（见口径 3）。
 *
 * 清洗结果分三类：
 *   ok        —— 得到药名，进频次/药对/规模统计（v2 实测 728 行全部落这一类）
 *   note      —— 校勘残行（整格只有 ⟨…⟩ 注，或「一法」残字），不是药味，直接丢弃，不罚该方
 *                （v2 实测 0 行）
 *   misplaced —— 底本单元格错位（方名当成药名、煎法整句当成药名、整行药文挤在一格）。
 *                这类行会让该方的「药味数」失真，所以该方退出规模分布与君臣分析，
 *                但它的其余正常药味照常计入频次（频次是「出现次数」，不依赖方内完整性）。
 *                v1 有 3 方落这一类（橘皮竹茹汤、越婢加术汤、百合洗方），v2 拆列后
 *                判定规则实测命中 0 方；但 百合洗方 的煎法句被拆成 7 个短格（每格 ≤5 字、
 *                无句读），逃过下面那条长度/句读判定，仍被当成 7 味药 —— 这是数据侧的
 *                残留缺陷，已在 docs「代价与边界」点名，本章不替底本改数据。
 */
const PROC_TAIL = [
  '去皮尖', '去皮', '去节', '去心', '去核', '去毛', '去芦', '去翅足', '去咸', '去腥',
  '炮', '炙', '洗', '炒', '熬', '烧', '切', '碎', '擘', '末',
  '各等分', '等分', '各', '大者', '如指大', '汁',
];
const NUM = '一二三四五六七八九十百千半零';
const UNIT = '两|斤|分|铢|升|合|斗|枚|个|尺|寸|把|片|钱|字|具';
const DOSE_TAIL = new RegExp(`[${NUM}\\d]+(?:${UNIT})$`);
/** 规格词造成的重复写法；键是清洗到这一步的残串，值是正名 */
const ALIAS = { 大附子: '附子' };
/** 不是药味的残行（校勘字、章节小标题碎片） */
const RESIDUE = new Set(['', '一法', '等分', '各']);

function cleanHerb(raw) {
  if (typeof raw !== 'string') return { name: '', kind: 'note' };
  const original = raw;
  // A 夹注
  let s = raw.replace(/⟨[^⟨⟩]*⟩/g, '');
  while (/⟨[^⟨⟩]*⟩/.test(s)) s = s.replace(/⟨[^⟨⟩]*⟩/g, '');
  // 整格就是一条夹注 → 校勘残行
  if (!s.trim()) return { name: '', kind: 'note' };
  // B 尾部句读
  s = s.replace(/[\s.。、，,：:；;]+$/, '').trim();
  // C 尾部剂量（剥空则回退，见「百合」）
  const afterDose = s.replace(DOSE_TAIL, '');
  if (afterDose) s = afterDose;
  // D 炮制/修治尾巴，循环
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of PROC_TAIL) {
      if (s.endsWith(t) && s.length > t.length) {
        s = s.slice(0, -t.length);
        changed = true;
      }
    }
  }
  // E 头部「用」
  s = s.replace(/^用/, '');
  // 再剥一次尾部剂量（「水蛭百枚」去『百枚』已在 C 完成；这一道接 D 之后新露出的尾巴）
  const again = s.replace(DOSE_TAIL, '');
  if (again) s = again;
  s = s.replace(/^[\s.。、，,：:；;]+|[\s.。、，,：:；;]+$/g, '');

  if (RESIDUE.has(s)) return { name: '', kind: 'note', raw: original };
  // 错位判定：药名格出现句读、或整格是方名/煎法
  const bad = /[，。、；]/.test(s) || /汤方$/.test(s) || s.length > 8;
  if (bad) return { name: s, kind: 'misplaced', raw: original };
  if (ALIAS[s]) return { name: ALIAS[s], kind: 'ok', raw: original };
  return { name: s, kind: 'ok', raw: original };
}

// ─────────────────────────── 剂量解析 ───────────────────────────
/**
 * 君药代理要比较剂量，而原书剂量有三大族：重量（两/斤/分/铢）、容量（升/合/斗）、
 * 计数（枚/个）。族内可折算，族间**不可折算**（一升水与一升半夏不是一回事）。
 * 所以这里只做族内归一，并把「跨族」如实标成不可判 —— 不发明换算率。
 */
const NUM_VALUE = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10, 半: 0.5 };
function cnNumber(t) {
  if (t === '半') return 0.5;
  if (/^\d+$/.test(t)) return Number(t);
  if (t in NUM_VALUE) return NUM_VALUE[t];
  if (t.includes('十')) {
    const [a, b] = t.split('十');
    return (a ? NUM_VALUE[a] || 1 : 1) * 10 + (b ? NUM_VALUE[b] || 0 : 0);
  }
  return null;
}
const DOSE_RE = new RegExp(`([${NUM}\\d]+)(${UNIT})`);
const FAMILY = { 两: 'w', 斤: 'w', 分: 'w', 铢: 'w', 升: 'v', 合: 'v', 斗: 'v', 枚: 'c', 个: 'c' };
/** → { fam, val } | { fam: 'equal' } | null */
function parseDose(dose) {
  if (!dose) return null;
  if (dose.includes('等分')) return { fam: 'equal' };
  const m = DOSE_RE.exec(dose);
  if (!m) return null;
  const v = cnNumber(m[1]);
  if (v == null) return null;
  const u = m[2];
  // 族内归一：重量折「两」（1 斤 = 16 两，1 两 = 24 铢 = 4 分）
  if (u === '斤') return { fam: 'w', val: v * 16 };
  if (u === '铢') return { fam: 'w', val: v / 24 };
  if (u === '分') return { fam: 'w', val: v / 4 };
  // 容量折「合」（1 斗 = 10 升 = 100 合）
  if (u === '斗') return { fam: 'v', val: v * 100 };
  if (u === '升') return { fam: 'v', val: v * 10 };
  if (u === '枚' || u === '个') return { fam: 'c', val: v };
  return { fam: FAMILY[u] || 'x', val: v };
}

// ─────────────────────────── 总体与方表 ───────────────────────────
/** 全部方（含 9 个互见方），带清洗后的药味 */
function formulas() {
  const out = [];
  for (const p of BOOK.pian) {
    for (const a of p.articles) {
      for (const f of a.formulas || []) {
        const ing = (f.ingredients || []).map((i) => {
          const c = cleanHerb(i.herbSimp || i.herb);
          return { raw: i.herbSimp || i.herb, name: c.name, kind: c.kind, dose: i.doseSimp || '', parsed: parseDose(i.doseSimp) };
        });
        out.push({
          pianNo: p.no,
          pianName: p.nameSimp,
          tiao: a.tiao,
          name: (f.nameSimp || f.name).replace(/方$/, ''),
          refOnly: !!f.refOnly,
          cls: CLASS_OF[p.no] || '附',
          method: f.methodSimp || '',
          ingredients: ing,
        });
      }
    }
  }
  return out;
}

/** 统计总体：174 = 165 有方文 + 9 互见 */
function population() {
  const all = formulas();
  const withText = all.filter((f) => !f.refOnly);
  return {
    formulas: all.length,
    withText: withText.length,
    refOnly: all.length - withText.length,
    refOnlyNames: all.filter((f) => f.refOnly).map((f) => `第${f.pianNo}篇 ${f.name}`),
    declared: BOOK.counts,
  };
}

// ─────────────────────────── 频次 ───────────────────────────
/** 药味逐条（只取 kind === 'ok'） */
function tokens() {
  return formulas()
    .filter((f) => !f.refOnly)
    .flatMap((f) => f.ingredients.filter((i) => i.kind === 'ok').map((i) => ({ ...i, pianNo: f.pianNo, fang: f.name })));
}

/** 清洗前后的口径对照：raw 不同名 / 清洗后不同名 / 各类残行 */
function cleanupReport() {
  const rows = formulas().filter((f) => !f.refOnly).flatMap((f) => f.ingredients);
  const raw = new Set(rows.map((r) => r.raw));
  const ok = rows.filter((r) => r.kind === 'ok');
  return {
    rawDistinct: raw.size,
    cleanDistinct: new Set(ok.map((r) => r.name)).size,
    tokens: rows.length,
    okTokens: ok.length,
    noteRows: rows.filter((r) => r.kind === 'note').length,
    misplacedRows: rows.filter((r) => r.kind === 'misplaced').length,
    misplacedDetail: rows.filter((r) => r.kind === 'misplaced').map((r) => `${r.raw.slice(0, 18)}…`),
    notes: rows.filter((r) => r.kind === 'note').map((r) => r.raw),
    merged: [...new Set(rows.filter((r) => r.kind === 'ok' && r.raw !== r.name).map((r) => `${r.raw} → ${r.name}`))],
  };
}

/** 频次表：出现次数 / 出现方数 / 出现率（分母 = 165） */
function frequencies() {
  const pop = population().withText;
  const byName = new Map();
  for (const f of formulas().filter((x) => !x.refOnly)) {
    const seen = new Set();
    for (const i of f.ingredients) {
      if (i.kind !== 'ok') continue;
      const rec = byName.get(i.name) || { herb: i.name, tokens: 0, formulas: 0 };
      rec.tokens += 1;
      if (!seen.has(i.name)) { rec.formulas += 1; seen.add(i.name); }
      byName.set(i.name, rec);
    }
  }
  return [...byName.values()]
    .map((r) => ({ ...r, rate: (r.formulas / pop) * 100 }))
    .sort((a, b) => b.formulas - a.formulas || b.tokens - a.tokens || a.herb.localeCompare(b.herb));
}

const topHerbs = (n = 20) => frequencies().slice(0, n);

// ─────────────────────────── 药对 ───────────────────────────
/**
 * 药对 = 同一方内共现。计数单位是「方」不是「次数」：一方里两味药各出现两次也只算一次共现。
 * 门槛 8 方：165 方的 5%。低于 5% 的共现大半是「某方特有的两味」，不构成配伍结构。
 */
function herbPairs(min = 8) {
  const rows = [];
  for (const f of formulas().filter((x) => !x.refOnly)) {
    const names = [...new Set(f.ingredients.filter((i) => i.kind === 'ok').map((i) => i.name))].sort();
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) rows.push([names[i], names[j]]);
    }
  }
  const count = new Map();
  for (const [a, b] of rows) {
    const k = `${a} + ${b}`;
    count.set(k, (count.get(k) || 0) + 1);
  }
  const pop = population().withText;
  return [...count.entries()]
    .map(([pair, n]) => ({ pair, n, rate: (n / pop) * 100 }))
    .filter((r) => r.n >= min)
    .sort((a, b) => b.n - a.n || a.pair.localeCompare(b.pair));
}

// ─────────────────────────── 方剂规模 ───────────────────────────
/**
 * 只用「药名格无错位」的方：错位方的药味数不可信，进分布会制造假的 1 味方。
 * v2 底本无一方被判定为错位，所以这里进分布的是全部 165 个有方文的方
 * （v1 曾因 3 方错位只进 154 方 —— 代码保留这道闸，数据变了它就不再扣方）。
 */
function sizeDist() {
  const list = formulas().filter((f) => !f.refOnly && !f.ingredients.some((i) => i.kind === 'misplaced'));
  const dist = new Map();
  for (const f of list) {
    const n = f.ingredients.filter((i) => i.kind === 'ok').length;
    dist.set(n, (dist.get(n) || 0) + 1);
  }
  const rows = [...dist.entries()].sort((a, b) => a[0] - b[0]).map(([size, n]) => ({ size, n }));
  const pick = (dir) => {
    const target = dir === 'min' ? rows[0].size : rows[rows.length - 1].size;
    return list
      .filter((f) => f.ingredients.filter((i) => i.kind === 'ok').length === target)
      .map((f) => ({ name: f.name, pianNo: f.pianNo, tiao: f.tiao, size: target }));
  };
  const sizes = list.map((f) => f.ingredients.filter((i) => i.kind === 'ok').length);
  return {
    n: list.length,
    rows,
    peak: rows.reduce((m, r) => (r.n > m.n ? r : m), rows[0]),
    min: pick('min'),
    max: pick('max'),
    mean: sizes.reduce((a, b) => a + b, 0) / sizes.length,
    median: [...sizes].sort((a, b) => a - b)[Math.floor(sizes.length / 2)],
    within2to10: sizes.filter((s) => s >= 2 && s <= 10).length,
  };
}

// ─────────────────────────── 君臣佐使（代理） ───────────────────────────
/**
 * 原书**没有**君臣佐使标注（金匮 402 条无一处写「君」「臣」）。所以这里只能算代理指标：
 *   君 ≈ 该方中剂量最大的一味。
 * 为使这个代理可复现，先把「算不出来」的方如实分类，而不是硬凑：
 *   no-dose  有药味查不到剂量（底本 92 格剂量列为空）→ 不可判
 *   equal    方内写「等分」→ 剂量无差，本就不分君臣
 *   mixed    方内剂量跨族（两 + 枚 / 两 + 升）→ 族间不可折算，不发明换算率
 *   tie      同族内最大剂量并列 → 「君臣」不唯一
 *   unique   唯一最大 → 记为君候选
 * 覆盖率本身就是结论：代理指标只覆盖 44/165 的方（26.7%）。
 */
function junProxy() {
  const list = formulas().filter((f) => !f.refOnly && !f.ingredients.some((i) => i.kind === 'misplaced'));
  const out = { total: list.length, noDose: 0, equal: 0, mixed: 0, tie: 0, unique: 0, cases: [], top: [] };
  const win = new Map();
  for (const f of list) {
    const ing = f.ingredients.filter((i) => i.kind === 'ok');
    // 「等分」要先判：写了等分就是明说「不分君臣」，比缺剂量更决定性。
    if (ing.some((i) => i.parsed && i.parsed.fam === 'equal')) { out.equal += 1; continue; }
    if (!ing.length || ing.some((i) => !i.parsed)) { out.noDose += 1; continue; }
    const fams = new Set(ing.map((i) => i.parsed.fam));
    if (fams.size > 1) { out.mixed += 1; continue; }
    const max = Math.max(...ing.map((i) => i.parsed.val));
    const winners = ing.filter((i) => i.parsed.val === max).map((i) => i.name);
    if (winners.length > 1) { out.tie += 1; out.cases.push({ name: f.name, pianNo: f.pianNo, kind: 'tie', herbs: winners }); continue; }
    out.unique += 1;
    win.set(winners[0], (win.get(winners[0]) || 0) + 1);
    out.cases.push({ name: f.name, pianNo: f.pianNo, kind: 'unique', herbs: winners });
  }
  out.top = [...win.entries()].map(([herb, n]) => ({ herb, n })).sort((a, b) => b.n - a.n || a.herb.localeCompare(b.herb));
  out.judged = out.tie + out.unique;
  return out;
}

// ─────────────────────────── 跨篇比较 ───────────────────────────
/** 内伤（6–10、12–19）vs 妇人（20–22）：同类内出现率之差 */
function crossSection(n = 8) {
  const list = formulas().filter((f) => !f.refOnly);
  const side = (cls) => {
    const fs2 = list.filter((f) => f.cls === cls);
    const cnt = new Map();
    for (const f of fs2) for (const name of new Set(f.ingredients.filter((i) => i.kind === 'ok').map((i) => i.name))) {
      cnt.set(name, (cnt.get(name) || 0) + 1);
    }
    return { fang: fs2.length, rows: [...cnt.entries()].map(([herb, k]) => ({ herb, k, rate: (k / fs2.length) * 100 })) };
  };
  const a = side('内伤');
  const b = side('妇人');
  const keys = new Set([...a.rows.map((r) => r.herb), ...b.rows.map((r) => r.herb)]);
  const merged = [...keys].map((herb) => {
    const x = a.rows.find((r) => r.herb === herb) || { k: 0, rate: 0 };
    const y = b.rows.find((r) => r.herb === herb) || { k: 0, rate: 0 };
    return { herb, inside: x.k, insideRate: x.rate, women: y.k, womenRate: y.rate, diff: x.rate - y.rate };
  });
  const byIn = [...merged].sort((p, q) => q.inside - p.inside || q.diff - p.diff).slice(0, n);
  const byWo = [...merged].sort((p, q) => q.women - p.women || p.diff - q.diff).slice(0, n);
  return { inside: { fang: a.fang, top: byIn }, women: { fang: b.fang, top: byWo }, merged };
}

// ─────────────────────────── 自校验：原文自述味数 ───────────────────────────
/**
 * 原书方的煎服法几乎都以「右N味」收尾 —— 这是**原文自己给出的药味数**。
 * 拿它校验解析器，比任何人工抽查都硬：对不上只有两种可能，解析漏了/多了，或底本这一格错位。
 * 所以这个函数既报一致率，也把不一致的方逐条点名。
 * v2 底本拆列后：148 方自述、148 方一致、0 方不一致（v1 是 139 方自述 / 129 一致 / 10 不一致）。
 * 注意：比的是「清洗后的有效药味数」，因为夹注残行（⟨深师有生姜二两⟩）不是药；
 * 而 百合洗方 的煎法句被拆成 7 个短格、无「右N味」自述，所以它既不进分母、也校验不到。
 */
function selfCountCheck() {
  const out = { stated: 0, agree: 0, mismatch: [], noStatement: 0 };
  for (const f of formulas().filter((x) => !x.refOnly)) {
    const m = /右([一二三四五六七八九十]+)味/.exec(f.method);
    if (!m) { out.noStatement += 1; continue; }
    out.stated += 1;
    const want = cnNumber(m[1]);
    const got = f.ingredients.filter((i) => i.kind === 'ok').length;
    if (want === got) out.agree += 1;
    else out.mismatch.push({ name: f.name, pianNo: f.pianNo, tiao: f.tiao, stated: want, got });
  }
  out.mismatch.sort((a, b) => a.pianNo - b.pianNo);
  return out;
}

// ─────────────────────────── 输出 ───────────────────────────
function pct(x) { return `${x.toFixed(1)}%`; }

/** 供 docs 表格直接抄的纯文本（数字只在这里出现一次，docs 与测试都对齐它） */
function report() {
  const pop = population();
  const c = cleanupReport();
  const freq = topHerbs(20);
  const pairs = herbPairs(8);
  const sd = sizeDist();
  const jun = junProxy();
  const cs = crossSection(6);
  const L = [];
  L.push('═══ 《金匮要略》杂病方剂配伍统计 ═══');
  L.push(`  有方文的方 ${pop.withText} / 全部 ${pop.formulas}（互见 ${pop.refOnly}：${pop.refOnlyNames.join('、')}）`);
  L.push(`  药名：清洗前 ${c.rawDistinct} 味 → 清洗后 ${c.cleanDistinct} 味（药味行 ${c.tokens}：可用 ${c.okTokens} · 校勘残行 ${c.noteRows} · 错位 ${c.misplacedRows}）`);
  L.push('');
  L.push('  序 | 药 | 方数 | 出现率 | 次数');
  freq.forEach((r, i) => L.push(`  ${i + 1} | ${r.herb} | ${r.formulas} | ${pct(r.rate)} | ${r.tokens}`));
  L.push('');
  L.push(`  药对（同方共现 ≥8 方）：${pairs.length} 对`);
  for (const r of pairs) L.push(`  ${r.pair} | ${r.n} 方 | ${pct(r.rate)}`);
  L.push('');
  L.push(`  规模（${sd.n} 方）：均值 ${sd.mean.toFixed(2)} 味 · 中位 ${sd.median} 味 · 2–10 味 ${sd.within2to10} 方`);
  for (const r of sd.rows) L.push(`  ${r.size} 味 | ${r.n} 方`);
  L.push(`  最小 ${sd.min.map((x) => `第${x.pianNo}篇 ${x.name}(${x.size})`).join('、')}`);
  L.push(`  最大 ${sd.max.map((x) => `第${x.pianNo}篇 ${x.name}(${x.size})`).join('、')}`);
  L.push('');
  L.push(`  君臣代理（${jun.total} 方可试算）：可判 ${jun.judged}（唯一 ${jun.unique} · 并列 ${jun.tie}）· 等分 ${jun.equal} · 跨族 ${jun.mixed} · 缺剂量 ${jun.noDose}`);
  L.push(`  唯一最大者 Top：${jun.top.slice(0, 5).map((t) => `${t.herb} ${t.n}`).join(' · ')}`);
  L.push('');
  const sc = selfCountCheck();
  L.push(`  自校验「右N味」：自述 ${sc.stated} 方 · 一致 ${sc.agree} · 不一致 ${sc.mismatch.length} · 无自述 ${sc.noStatement}`);
  L.push(`  不一致：${sc.mismatch.map((x) => `第${x.pianNo}篇 ${x.name}(${x.stated}→${x.got})`).join('、')}`);
  L.push('');
  L.push(`  内伤 ${cs.inside.fang} 方：${cs.inside.top.map((r) => `${r.herb} ${pct(r.insideRate)}`).join(' · ')}`);
  L.push(`  妇人 ${cs.women.fang} 方：${cs.women.top.map((r) => `${r.herb} ${pct(r.womenRate)}`).join(' · ')}`);
  return L.join('\n');
}

if (require.main === module) {
  console.log(report());
  console.log('');
  console.log('  教学边界：本输出为《金匮要略》文本结构统计，外源·笈成留档可复算，不构成诊疗依据。');
}

module.exports = {
  BOOK, ROOT, CLASS_OF,
  cleanHerb, parseDose, formulas, population,
  tokens, cleanupReport, frequencies, topHerbs, herbPairs,
  sizeDist, junProxy, crossSection, selfCountCheck, report,
};
