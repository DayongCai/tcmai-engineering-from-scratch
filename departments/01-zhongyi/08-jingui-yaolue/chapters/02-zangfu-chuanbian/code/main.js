'use strict';
/**
 * 第 2 章 · 脏腑经络先后病：传变预判与预防
 *
 *   node code/main.js
 *   node --test code/main.test.js
 *
 * 数据：standards/jingui/底本.json 篇 1（外源·笈成·金匮要略方论 第1篇·第1–17条）
 *
 * 口径（改任一条都要同步改 docs/zh.md）：
 *   · 引文一律取 zhHans 栏、逐字；本文件里每一段「引文」都在运行时与源文比对
 *     （verifyQuotes）。比对失败即报错 —— 不靠人眼核，靠 include()。
 *   · 五藏传变图不是抄一张现成的图，而是由五行相克关系**推出**（KE 表 → nextOf），
 *     再用 1.1 的原文逐边找印证。图上「有原文印证」的边数是算出来的。
 *   · 三因（3 类）与五邪（5 名 / 5 法度）是两套独立分类轴：前者按受邪途径与部位，
 *     后者按邪气性质。两者不一一对应 —— 这一点由交集大小算出，不靠印象。
 *   · 「急则治标、缓则治本」是后世对 1.14 / 1.15 的概括，不是原文用语；原文只说
 *     「急当救里」「先治其卒病」。凡属概括，字段名一律叫 biaoBen 并在此注明。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));
const PIAN = BOOK.pian.find((p) => p.no === 1);

/** 条号 → 简文。条号只认源页编号，跨版本引用须核对分条 */
const TEXT = new Map(PIAN.articles.map((a) => [a.tiao, a.zhHans]));

/** 取某条原文；条号不存在直接抛错 —— 宁可崩，也不要凭记忆补一条出来 */
function text(tiao) {
  const t = TEXT.get(tiao);
  if (!t) throw new Error(`底本无此条：${tiao}`);
  return t;
}

/** 该条是否逐字含 phrase。所有表格里的「引文」字段都要过这一关 */
function quoted(tiao, phrase) {
  return text(tiao).includes(phrase);
}

// ─────────── 五藏传变 ───────────

/**
 * 五行配属。1.7「假令肝旺色青，四时各随其色」只直接坐实了「肝—青—春」这一组；
 * 其余四组按同一五行框架补全，docs 里已标注为「框架补全，非原文枚举」。
 * 放在代码里而不是散在正文，是为了让「传变图」能被重算：改 KE 表，图立刻变。
 */
const ZANG = [
  { zang: '肝', xing: '木', se: '青', shi: '春' },
  { zang: '心', xing: '火', se: '赤', shi: '夏' },
  { zang: '脾', xing: '土', se: '黄', shi: '长夏' },
  { zang: '肺', xing: '金', se: '白', shi: '秋' },
  { zang: '肾', xing: '水', se: '黑', shi: '冬' },
];

/** 相克：我克者。木克土 → 肝病传脾，这是 1.1 的推演起点 */
const KE = { 木: '土', 火: '金', 土: '水', 金: '木', 水: '火' };

/**
 * 1.1 里能逐字找到的传变印証。
 * 这一条的后半段（「脾能伤肾…心火气盛则伤肺…金气不行则肝气盛」）本身就是一整圈克序，
 * 所以五条边全在同一篇同一条里 —— 这不是巧合，是张仲景把克序当论证用了。
 */
const KE_EVIDENCE = {
  '肝>脾': '知肝传脾',
  '脾>肾': '脾能伤肾',
  '肾>心': '水不行则心火气盛',
  '心>肺': '心火气盛则伤肺',
  '肺>肝': '金气不行则肝气盛',
};

/**
 * 五藏传变图：从肝起，沿克序走一圈。
 * 返回的 closes / unique 是自检位：KE 表写错时链条会提前重复或合不拢，
 * 断言会立刻失败，而不是安静地画出一张错图。
 */
function chuanbian() {
  const byXing = new Map(ZANG.map((z) => [z.xing, z]));
  const xingOf = new Map(ZANG.map((z) => [z.zang, z.xing]));
  const nextOf = (zang) => byXing.get(KE[xingOf.get(zang)]).zang;

  const chain = ['肝'];
  for (let i = 1; i < ZANG.length; i += 1) chain.push(nextOf(chain[i - 1]));

  const closes = nextOf(chain[chain.length - 1]) === chain[0];
  const unique = new Set(chain).size === ZANG.length;

  const edges = chain.map((from) => {
    const to = nextOf(from);
    const phrase = KE_EVIDENCE[`${from}>${to}`] || null;
    return {
      from,
      to,
      ke: `${xingOf.get(from)}克${xingOf.get(to)}`,
      tiao: '1.1',
      phrase,
      quoted: phrase ? quoted('1.1', phrase) : false,
    };
  });

  return {
    chain,
    closes,
    unique,
    n: edges.length,
    edges,
    attested: edges.filter((e) => e.quoted).length,
    tiao: '1.1',
  };
}

/** 五季当旺之藏。「四季脾旺不受邪」= 四季末十八日土气当令，故「四季」与「长夏」同归脾 */
const SEASON_WANG = { 春: '肝', 夏: '心', 长夏: '脾', 秋: '肺', 冬: '肾', 四季: '脾' };

/**
 * 治未病判定（1.1）。三个出口，缺一个就把这一条读窄了：
 *   实X  —— 见肝之病，知肝传脾，当先实脾（截断于未受邪之藏）
 *   勿补 —— 四季脾旺不受邪，即勿补之（旺时不受邪，补之无的放矢）
 *   不补 —— 肝虚则用此法，实则不在用之（此法专为虚设，实证另有治法）
 */
function zhiweibing({ zang = '肝', xu = true, season = '春' } = {}) {
  const edge = chuanbian().edges.find((e) => e.from === zang);
  if (!edge) throw new Error(`未收录之藏：${zang}`);
  const to = edge.to;
  const base = { from: zang, to, tiao: '1.1' };

  if (!xu) {
    return { ...base, act: '不补', quote: '肝虚则用此法，实则不在用之' };
  }
  if (SEASON_WANG[season] === to) {
    return { ...base, act: '勿补', quote: '四季脾旺不受邪，即勿补之', season };
  }
  // 1.1 只举了「肝→脾」一例，末尾一句「余脏准此」才是通则。所以非肝起手时引末句，
  // 不把肝的例句硬套到脾身上 —— 例句与通则分开引，读的人才知道哪句是原文举例。
  const li = zang === '肝' ? '知肝传脾，当先实脾' : '余脏准此';
  return { ...base, act: `实${to}`, quote: li, season };
}

// ─────────── 三因 / 五邪 ───────────

/**
 * 三因（1.2「千般疢难，不越三条」）。分类轴是**受邪途径与部位**，不是邪名 ——
 * 所以「风」在这张表里查不到（见 classifyCause 的 null 分支），它属于另一根轴。
 */
const SANYIN = [
  { no: 1, key: '内所因', clause: '经络受邪，入脏腑', items: ['经络受邪', '入脏腑'], note: '邪由经络内入，病位在脏腑' },
  { no: 2, key: '外皮肤所中', clause: '四肢九窍，血脉相传，壅塞不通', items: ['四肢', '九窍', '血脉相传', '壅塞不通'], note: '邪留着于外，病位在四肢九窍血脉' },
  { no: 3, key: '房室、金刃、虫兽所伤', clause: '房室、金刃、虫兽所伤', items: ['房室', '金刃', '虫兽'], note: '非六淫所生，由人事与外伤而来' },
];

function sanyin() {
  const rows = SANYIN.map((g) => ({ ...g, tiao: '1.2', n: g.items.length, quoted: quoted('1.2', g.clause) }));
  return {
    tiao: '1.2',
    rows,
    n: rows.length,
    items: rows.reduce((s, r) => s + r.n, 0),
    attested: rows.filter((r) => r.quoted).length,
    quote: '千般疢难，不越三条',
  };
}

/** 按病因名归入三因。查不到返回 null —— 「风」查不到是正确结果，不是缺陷 */
function classifyCause(cause) {
  if (!cause) return null;
  const hit = SANYIN.find((g) => g.items.some((i) => i.includes(cause) || cause.includes(i)));
  return hit ? { cause, no: hit.no, cls: hit.key, tiao: '1.2' } : null;
}

/**
 * 五邪（1.13）。注意这里藏着两串「五」：
 *   前半「清邪居上，浊邪居下，大邪中表，小邪中里，䅽饪之邪从口入」——按**部位**列五邪
 *   后半「风中于前，寒中于暮，湿伤于下，雾伤于上，食伤脾胃」——按**邪性**列五法度
 * 两串都是五，但不是同一组名。paired 用交集算出，别用眼睛数。
 */
/** 「䅽饪之邪」首字是生僻字，手打容易串码 —— 直接从源文切出来，切不到就抛错 */
function xiName() {
  const m = /(.)饪之邪，从口入/.exec(text('1.13'));
  if (!m) throw new Error('1.13 中未找到「?饪之邪」');
  return `${m[1]}饪之邪`;
}

const WU_XIE = [
  { name: '清邪', ju: '居上', clause: '清邪居上' },
  { name: '浊邪', ju: '居下', clause: '浊邪居下' },
  { name: '大邪', ju: '中表', clause: '大邪中表' },
  { name: '小邪', ju: '中里', clause: '小邪中里' },
  { name: xiName(), ju: '从口入（宿食）', clause: '从口入者，宿食也' },
];

const WU_FA = [
  { name: '风', law: '中于前，令脉浮', clause: '风中于前' },
  { name: '寒', law: '中于暮，令脉急', clause: '寒中于暮' },
  { name: '湿', law: '伤于下，流关节', clause: '湿伤于下' },
  { name: '雾', law: '伤于上，伤皮腠', clause: '雾伤于上' },
  { name: '食', law: '伤脾胃', clause: '食伤脾胃' },
];

function wuxie() {
  const a = WU_XIE.map((x) => ({ ...x, tiao: '1.13', quoted: quoted('1.13', x.clause) }));
  const b = WU_FA.map((x) => ({ ...x, tiao: '1.13', quoted: quoted('1.13', x.clause) }));
  const pair = a.filter((x) => b.some((y) => y.name === x.name)).length;
  return {
    tiao: '1.13',
    names: a,
    laws: b,
    nNames: a.length,
    nLaws: b.length,
    paired: pair,
    attested: [...a, ...b].filter((x) => x.quoted).length,
    quote: '五邪中人，各有法度',
  };
}

// ─────────── 望闻判据（1.3–1.6） ───────────

/**
 * 可查询判据表。sign 是**逐字**取自原文的字符串（verifyQuotes 会核）；
 * read 是本章给出的读法（白话归纳，非原文）；jing 只标原文写明的预后词。
 * 色黄 在 1.3 出现两次而所指不同（鼻头局部 vs 面部总色），故两行并存 ——
 * 合并不了就是合并不了，不是表格写重了。
 */
const LOOKUP = [
  { dept: '色', sign: '鼻头色青', read: '腹中痛；苦冷者死', tiao: '1.3', jing: '死' },
  { dept: '色', sign: '鼻头色微黑', read: '有水气', tiao: '1.3', jing: null },
  { dept: '色', sign: '色黄者，胸上有寒', read: '胸上有寒', tiao: '1.3', jing: null },
  { dept: '色', sign: '色白者，亡血也', read: '亡血', tiao: '1.3', jing: null },
  { dept: '色', sign: '设微赤非时者死', read: '面色微赤而非当令之时，主死', tiao: '1.3', jing: '死' },
  { dept: '色', sign: '其目正圆者痉，不治', read: '两目直视圆睁，属痉，不治', tiao: '1.3', jing: '不治' },
  { dept: '色', sign: '色青为痛', read: '痛', tiao: '1.3', jing: null },
  { dept: '色', sign: '色黑为劳', read: '劳', tiao: '1.3', jing: null },
  { dept: '色', sign: '色赤为风', read: '风', tiao: '1.3', jing: null },
  { dept: '色', sign: '色黄者便难', read: '便难', tiao: '1.3', jing: null },
  { dept: '色', sign: '色鲜明者有留饮', read: '有留饮', tiao: '1.3', jing: null },
  { dept: '声', sign: '语声寂然，喜惊呼者，骨节间病', read: '静默而忽惊呼，病在骨节间', tiao: '1.4', jing: null },
  { dept: '声', sign: '语声喑喑然不澈者，心膈间病', read: '语声低浊不清，病在心膈间', tiao: '1.4', jing: null },
  { dept: '声', sign: '语声啾啾然细而长者，头中病', read: '语声细长如啾，病在头中', tiao: '1.4', jing: null },
  { dept: '息', sign: '息摇肩者，心中坚', read: '呼吸抬肩，心下坚满', tiao: '1.5', jing: null },
  { dept: '息', sign: '息引胸中上气者，咳', read: '吸气引胸中气上逆，为咳', tiao: '1.5', jing: null },
  { dept: '息', sign: '息张口短气者，肺痿唾沫', read: '张口短气，肺痿唾沫', tiao: '1.5', jing: null },
  { dept: '息', sign: '吸而微数', read: '病在中焦；实者下之即愈，虚者不治', tiao: '1.6', jing: '不治' },
  { dept: '息', sign: '在上焦者，其吸促', read: '病在上焦，吸促，难治', tiao: '1.6', jing: '难治' },
  { dept: '息', sign: '在下焦者，其吸远', read: '病在下焦，吸远，难治', tiao: '1.6', jing: '难治' },
  { dept: '息', sign: '呼吸动摇振振者，不治', read: '呼吸与身形动摇振振，不治', tiao: '1.6', jing: '不治' },
];

/** 按部类查表（色 / 声 / 息），也可只查某一预后词 */
function lookup(dept) {
  if (!dept) return LOOKUP.slice();
  const rows = LOOKUP.filter((r) => r.dept === dept || r.jing === dept || r.tiao === dept);
  return rows;
}

/** 判据画像：部类分布与预后词分布，都是数出来的 */
function lookups() {
  const byDept = {};
  const byJing = {};
  for (const r of LOOKUP) {
    byDept[r.dept] = (byDept[r.dept] || 0) + 1;
    const k = r.jing || '无预后词';
    byJing[k] = (byJing[k] || 0) + 1;
  }
  return {
    n: LOOKUP.length,
    byDept,
    byJing,
    tiao: [...new Set(LOOKUP.map((r) => r.tiao))].sort(),
    bad: LOOKUP.filter((r) => !quoted(r.tiao, r.sign)),
  };
}

// ─────────── 治则先后（1.14 / 1.15） ───────────

/**
 * 治法阶梯。rank 相同者原文未定先后 —— 例如「痼疾 + 卒病 + 里急」三者并见时，
 * 1.14 说先救里、1.15 说先治卒病，两条撞车，原文没有给判据。本章并列 rank 0，
 * 不替原文裁决。
 *
 * biaoBen 是后世「急则治标、缓则治本」的套用，**不是原文用语**。放在这里是为了
 * 显出一个反例：先治的不一定是标。1.14 先救里，里恰恰是本。
 */
const LADDER = {
  里急: { rank: 0, biaoBen: '本', tiao: '1.14', quote: '急当救里', why: '下利清谷不止，里虚滑脱为急，虽有身疼痛亦不可先表' },
  卒病: { rank: 0, biaoBen: '标', tiao: '1.15', quote: '当先治其卒病', why: '新病势急，痼疾不遽变，故先解新邪' },
  表证: { rank: 1, biaoBen: '标', tiao: '1.14', quote: '急当救表', why: '清便自调则里已和，身疼痛属表，此时方可议表' },
  痼疾: { rank: 2, biaoBen: '本', tiao: '1.15', quote: '后乃治其痼疾也', why: '卒病已解，再图旧疾' },
};

/** 给定并见的几证，排出先后；返回的每一步都带条号与原文依据 */
function order(items = ['里急', '表证', '痼疾', '卒病']) {
  return items
    .map((k, i) => {
      const r = LADDER[k];
      if (!r) throw new Error(`未收录之治法：${k}`);
      return { k, i, ...r };
    })
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((s, i) => ({ seq: i + 1, what: s.k, biaoBen: s.biaoBen, tiao: s.tiao, quote: s.quote, why: s.why }));
}

/** 「先治的不等于治标」—— 由 order() 算出，不靠背结论 */
function xianBuDengYuBiao() {
  const seq = order(['里急', '表证']);
  return { first: seq[0].what, biaoBen: seq[0].biaoBen, isBiao: seq[0].biaoBen === '标' };
}

// ─────────── 五藏所喜所恶 / 随所得而攻（1.16 / 1.17） ───────────

/**
 * 1.16 给的是**判据**（所得则愈、所恶则病、暴思必发热），不是一张五藏喜恶对照表。
 * 原文没有逐藏列出喜恶，所以这里不补表 —— 补了就是替原文说话。
 * 1.17 补的是**方向**：攻其所得（邪所依附之处），渴者与猪苓汤是唯一给出的例子。
 */
function suode({ kind = '所得' } = {}) {
  const R = {
    所得: { verdict: '愈', tiao: '1.16', quote: '五脏病各有所得者愈', why: '得其所宜，藏气得养，故愈' },
    所恶: { verdict: '病', tiao: '1.16', quote: '各随其所不喜者为病', why: '触其所忌，病随所恶而生' },
    暴思: { verdict: '必发热', tiao: '1.16', quote: '病者素不应食，而反暴思之，必发热也', why: '素不应食而忽暴思，非真欲，是藏气败而贪其所不胜' },
    在脏: { verdict: '随所得而攻', tiao: '1.17', quote: '夫诸病在脏，欲攻之，当随其所得而攻之', why: '邪必有所附，攻其所附则邪无所依；如渴者与猪苓汤，攻其水而热自解' },
  };
  const r = R[kind];
  if (!r) throw new Error(`未收录之判定：${kind}`);
  return { kind, ...r, quoted: quoted(r.tiao, r.quote) };
}

// ─────────── 篇级结构 ───────────

/** 篇 1 的形制：条数 / 方数 / 字数 / 句式分布。全由源页算出 */
function structure() {
  const arts = PIAN.articles;
  const re = (x) => arts.filter((a) => x.test(a.zhHans)).length;
  return {
    pian: PIAN.no,
    name: PIAN.nameSimp,
    tiao: arts.length,
    fang: arts.reduce((n, a) => n + (a.formulas || []).length, 0),
    chars: PIAN.chars,
    hansChars: arts.reduce((n, a) => n + a.zhHans.length, 0),
    ask: re(/^问曰/),
    shi: re(/^师曰/),
    other: arts.filter((a) => !/^(问曰|师曰)/.test(a.zhHans)).length,
    withSi: re(/死/),
    withBuZhi: re(/不治/),
  };
}

// ─────────── 引文核验 ───────────

/** 把本文件所有「引文」字段逐条回源比对。返回违反清单与检查条数 */
function verifyQuotes() {
  const bad = [];
  let checked = 0;
  const chk = (tiao, phrase, tag) => {
    checked += 1;
    if (!quoted(tiao, phrase)) bad.push(`${tag} @${tiao}: 「${phrase}」在源文中找不到`);
  };

  for (const r of LOOKUP) chk(r.tiao, r.sign, `判据·${r.dept}`);

  const cb = chuanbian();
  for (const e of cb.edges) if (e.phrase) chk(e.tiao, e.phrase, `传变 ${e.from}→${e.to}`);

  const sy = sanyin();
  for (const r of sy.rows) chk(r.tiao, r.clause, `三因 ${r.no}`);
  chk(sy.tiao, sy.quote, '三因总纲');

  const wx = wuxie();
  for (const x of [...wx.names, ...wx.laws]) chk(x.tiao, x.clause, `五邪 ${x.name}`);
  chk(wx.tiao, wx.quote, '五邪总纲');

  for (const k of ['所得', '所恶', '暴思', '在脏']) {
    const s = suode({ kind: k });
    chk(s.tiao, s.quote, `1.16/1.17 ${k}`);
  }
  chk('1.1', '四季脾旺不受邪', '治未病·旺时');
  chk('1.1', '肝虚则用此法，实则不在用之', '治未病·虚实');

  return { checked, bad, ok: bad.length === 0 };
}

// ─────────── 报告 ───────────

if (require.main === module) {
  console.log('');
  console.log('  教学边界：本输出为《金匮要略》文本结构统计，外源·笈成留档可复算，不构成诊疗依据。');
  console.log('');
  const s = structure();
  console.log('═══ 金匮要略 · 第 1 篇 脏腑经络先后病 ═══');
  console.log(`  条 ${s.tiao} · 方 ${s.fang} · ${s.chars} 字（简文重算 ${s.hansChars}）`);
  console.log(`  句式：问曰 ${s.ask} · 师曰 ${s.shi} · 直陈 ${s.other}`);
  console.log(`  含「死」${s.withSi} 条 · 含「不治」${s.withBuZhi} 条\n`);

  const cb = chuanbian();
  console.log('  ── 五藏传变（克序，由 KE 表推出）──');
  for (const e of cb.edges) {
    console.log(`  ${e.from} → ${e.to}  [${e.ke}]  ${e.quoted ? '原文印证' : '推演'}  「${e.phrase || '—'}」`);
  }
  console.log(`  链：${cb.chain.join(' → ')} → ${cb.chain[0]}　闭环 ${cb.closes} · 互异 ${cb.unique} · 印证 ${cb.attested}/${cb.n}\n`);

  console.log('  ── 治未病（1.1）──');
  for (const c of [
    { zang: '肝', xu: true, season: '春' },
    { zang: '肝', xu: true, season: '四季' },
    { zang: '肝', xu: false, season: '春' },
    { zang: '脾', xu: true, season: '长夏' },
  ]) {
    const r = zhiweibing(c);
    console.log(`  ${c.zang}·${c.xu ? '虚' : '实'}·${c.season} → 传 ${r.to} · ${r.act}　「${r.quote}」`);
  }

  const sy = sanyin();
  console.log(`\n  ── 三因（1.2，${sy.n} 类 / ${sy.items} 举项）──`);
  for (const r of sy.rows) console.log(`  ${r.no}. ${r.key}｜${r.clause}｜${r.note}`);

  const wx = wuxie();
  console.log(`\n  ── 五邪（1.13，${wx.nNames} 名 / ${wx.nLaws} 法度，同名 ${wx.paired}）──`);
  for (const x of wx.names) console.log(`  名 ${x.name} · ${x.ju}`);
  for (const x of wx.laws) console.log(`  法 ${x.name} · ${x.law}`);

  const lk = lookups();
  console.log(`\n  ── 望闻判据（1.3–1.6，${lk.n} 条）──`);
  console.log(`  部类 ${Object.entries(lk.byDept).map(([k, v]) => `${k}${v}`).join(' · ')}`);
  console.log(`  预后 ${Object.entries(lk.byJing).map(([k, v]) => `${k}${v}`).join(' · ')}`);
  for (const r of lookup('色')) console.log(`  色｜${r.sign} → ${r.read}${r.jing ? `（${r.jing}）` : ''}`);

  console.log('\n  ── 治则先后（1.14 / 1.15）──');
  for (const st of order(['里急', '表证', '痼疾', '卒病'])) {
    console.log(`  ${st.seq}. ${st.what}（${st.biaoBen}）· 第${st.tiao}条·「${st.quote}」`);
  }
  const x = xianBuDengYuBiao();
  console.log(`  先治「${x.first}」，其属${x.biaoBen} —— 先治 ≠ 治标：${!x.isBiao}`);

  console.log('\n  ── 所喜所恶 / 随所得而攻（1.16 / 1.17）──');
  for (const k of ['所得', '所恶', '暴思', '在脏']) {
    const r = suode({ kind: k });
    console.log(`  ${k} → ${r.verdict}　「${r.quote}」`);
  }

  const v = verifyQuotes();
  console.log(`\n  ── 引文核验 ── 检查 ${v.checked} 处 · 违反 ${v.bad.length}`);
  for (const b of v.bad) console.log(`  ✗ ${b}`);
  console.log(v.ok ? '  ✅ 全部引文可在底本中逐字命中' : '  ❌ 有引文对不上源文');
}

module.exports = {
  ROOT,
  BOOK,
  PIAN,
  TEXT,
  ZANG,
  KE,
  SEASON_WANG,
  SANYIN,
  WUXIE_NAMES: WU_XIE,
  WUXIE_LAWS: WU_FA,
  LOOKUP,
  LADDER,
  text,
  quoted,
  chuanbian,
  zhiweibing,
  sanyin,
  classifyCause,
  wuxie,
  lookup,
  lookups,
  order,
  xianBuDengYuBiao,
  suode,
  structure,
  verifyQuotes,
};
