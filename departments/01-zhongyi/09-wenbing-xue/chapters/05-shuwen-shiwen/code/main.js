'use strict';
/**
 * 第 5 章 · 暑温与湿温：季节与湿热的耦合
 *
 *   node code/main.js
 *
 * 数据：standards/wenbing/底本.json → books[id='tiaobian'].sections（外源·笈成·溫病條辨）
 *       sha256 见 standards/wenbing/README.md，复算 `python scripts/build_wenbing_text.py --check`
 *
 * 口径（四条，改任一条都要同步改 docs/zh.md 与 main.test.js）：
 *   1. 取样范围 = 九個篇目：上焦·暑温 / 伏暑 / 濕温、寒濕；中焦·暑温、伏暑 / 濕温 / 寒濕；
 *      下焦·暑温、伏暑 / 濕温 / 寒濕。合计 132 条 135 方。其余篇目（風温、秋燥、瘧、痢以外）不进统计。
 *   2. 极（pole）按**篇目标签**分：「暑」= 暑温 / 伏暑 / 暑温、伏暑 三篇（32 条）；
 *      「湿」= 濕温、寒濕 / 濕温 / 寒濕 三篇（100 条）。
 *      上焦「濕温、寒濕」是合篇（7 条），其中第 四九 条是寒湿、第四八 条是中暍 —— 合篇整体计入「湿」，
 *      在 docs 里如实标注，不按条正文再切。
 *   3. 焦 = 卷：卷一·上焦篇 / 卷二·中焦篇 / 卷三·下焦篇。这是底本自己的层级，不是本章另立。
 *   4. 方 = 源页方块全计（135 = 110 有药味 + 25 互见 refOnly）；互见者只有方名与出处注，
 *      不计药味，但仍计入「方」——与 standards/wenbing/README.md 的 243 方口径一致。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/wenbing/底本.json'), 'utf8'));
const TIAOBIAN = BOOK.books.find((b) => b.id === 'tiaobian');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');

/** 九篇取样表：卷 / 篇名 / 焦 / 极 / 病类标签 */
const SECTIONS = [
  { juan: '卷一·上焦篇', pian: '暑温', jiao: '上焦', pole: '暑', kind: '暑温' },
  { juan: '卷一·上焦篇', pian: '伏暑', jiao: '上焦', pole: '暑', kind: '伏暑' },
  { juan: '卷一·上焦篇', pian: '濕温、寒濕', jiao: '上焦', pole: '湿', kind: '濕温+寒濕' },
  { juan: '卷二·中焦篇', pian: '暑温、伏暑', jiao: '中焦', pole: '暑', kind: '暑温+伏暑' },
  { juan: '卷二·中焦篇', pian: '濕温', jiao: '中焦', pole: '湿', kind: '濕温' },
  { juan: '卷二·中焦篇', pian: '寒濕', jiao: '中焦', pole: '湿', kind: '寒濕' },
  { juan: '卷三·下焦篇', pian: '暑温、伏暑', jiao: '下焦', pole: '暑', kind: '暑温+伏暑' },
  { juan: '卷三·下焦篇', pian: '濕温', jiao: '下焦', pole: '湿', kind: '濕温' },
  { juan: '卷三·下焦篇', pian: '寒濕', jiao: '下焦', pole: '湿', kind: '寒濕' },
];

const ALL = SECTIONS.map((s) => {
  const sec = TIAOBIAN.sections.find((x) => x.juan === s.juan && x.pian === s.pian);
  if (!sec) throw new Error(`底本缺篇：${s.juan} ${s.pian}`);
  return { ...s, articles: sec.articles, formulas: sec.formulas };
});

const articlesOf = (poles) => ALL.filter((s) => poles.includes(s.pole)).flatMap((s) => s.articles);
const formulasOf = (poles) => ALL.filter((s) => poles.includes(s.pole)).flatMap((s) => s.formulas);

/** 逐篇画像 */
function profile() {
  return ALL.map((s) => ({
    juan: s.juan,
    jiao: s.jiao,
    pian: s.pian,
    pole: s.pole,
    tiao: s.articles.length,
    fang: s.formulas.length,
    refOnly: s.formulas.filter((f) => f.refOnly).length,
    herbs: s.formulas.filter((f) => !f.refOnly && (f.ingredients || []).length).length,
    chars: s.articles.reduce((n, a) => n + (a.zhHans || '').length, 0),
  }));
}

function totals() {
  const rows = profile();
  return {
    pian: rows.length,
    tiao: rows.reduce((n, r) => n + r.tiao, 0),
    fang: rows.reduce((n, r) => n + r.fang, 0),
    refOnly: rows.reduce((n, r) => n + r.refOnly, 0),
    withHerbs: rows.reduce((n, r) => n + (r.fang - r.refOnly), 0),
    chars: rows.reduce((n, r) => n + r.chars, 0),
    tiaoShu: rows.filter((r) => r.pole === '暑').reduce((n, r) => n + r.tiao, 0),
    tiaoShi: rows.filter((r) => r.pole === '湿').reduce((n, r) => n + r.tiao, 0),
    fangShu: rows.filter((r) => r.pole === '暑').reduce((n, r) => n + r.fang, 0),
    fangShi: rows.filter((r) => r.pole === '湿').reduce((n, r) => n + r.fang, 0),
  };
}

/* ───────────────────────── 一、暑 / 湿 症状词分布 ─────────────────────────
 * 词表是本章归纳：每类给一个「偏向」，不是诊断标准。
 * 计数以**条**为单位（一条里出现多次只计一次）——教学要问的是「这条条文提不提这个证」，
 * 不是「提了几遍」；按遍数计，方论长的那条会把整张表拉偏。
 */
const LEXICON = [
  { key: '身热', pole: '暑', re: /(身热|发热|壮热|恶热|潮热|寒热)/ },
  { key: '面赤', pole: '暑', re: /(面赤|面目俱赤)/ },
  { key: '口渴', pole: '暑', re: /(口渴|烦渴|渴甚|大渴|渴欲|消渴)/ },
  { key: '汗出', pole: '暑', re: /(汗出|大汗|汗多|有汗|自汗|汗不止)/ },
  { key: '脉洪数', pole: '暑', re: /(脉洪|洪大|脉滑数|脉数|脉虚大)/ },
  { key: '舌赤绛', pole: '暑', re: /(舌赤|舌绛|舌色绛|舌燥黄|舌上黄)/ },
  { key: '神昏谵语', pole: '暑', re: /(神昏|谵语|神识不清|神识昏迷|昏迷|昏乱|神迷)/ },
  { key: '痉厥抽搐', pole: '暑', re: /(痉|瘛疭|抽搐|暑痫|肝风内动)/ },
  { key: '喘咳', pole: '暑', re: /(喘|咳)/ },

  { key: '身重身痛', pole: '湿', re: /(身重|身痛|体重|骨骱烦疼)/ },
  { key: '胸闷脘痞', pole: '湿', re: /(胸闷|脘闷|胸痞|痞|中痞|脘连腹胀|脘中痞闷)/ },
  { key: '舌白滑', pole: '湿', re: /(舌白|苔白|白滑|舌淡|舌灰|灰滑|舌蹇)/ },
  { key: '不渴少饮', pole: '湿', re: /(不渴|渴不多饮|渴不欲饮|不欲饮|渴喜热饮)/ },
  { key: '脉濡缓', pole: '湿', re: /(脉濡|脉缓|脉弦细|脉象模糊|脉沉|脉迟|脉小弱)/ },
  { key: '便溏下利', pole: '湿', re: /(便溏|自利|下利|泄|大便不爽|洞泄|滞下|痢)/ },
  { key: '呕恶哕', pole: '湿', re: /(呕|哕|恶心|吐)/ },
  { key: '小便不利', pole: '湿', re: /(小便不利|小便短|溺短|小溲不利|小便不通|二便不通|溺赤)/ },
  { key: '黄疸', pole: '湿', re: /(黄疸|身黄|目黄|面黄|萎黄|疸)/ },
  { key: '阳微寒象', pole: '湿', re: /(形寒|肢厥|四肢逆冷|手足厥|畏寒|四肢乍冷|四肢不暖|阳微|阳虚)/ },
];

const rate = (n, total) => (total ? Number(((n / total) * 100).toFixed(1)) : 0);

/** 暑 / 湿 两组的症状词分布对比（每百条出现率） */
function shuVsShi() {
  const shu = articlesOf(['暑']);
  const shi = articlesOf(['湿']);
  const rows = LEXICON.map((t) => {
    const a = shu.filter((x) => t.re.test(x.zhHans || '')).length;
    const b = shi.filter((x) => t.re.test(x.zhHans || '')).length;
    return {
      key: t.key,
      pole: t.pole,
      shu: a,
      shi: b,
      shuRate: rate(a, shu.length),
      shiRate: rate(b, shi.length),
      delta: Number((rate(a, shu.length) - rate(b, shi.length)).toFixed(1)),
    };
  });
  return {
    n: { shu: shu.length, shi: shi.length },
    rows,
    /** 按「偏向该极」的落差排序：正 = 暑更常提，负 = 湿更常提 */
    aligned: rows.filter((r) => (r.pole === '暑' ? r.delta > 0 : r.delta < 0)).length,
  };
}

/* ───────────────────────── 二、湿温的三焦分布 ─────────────────────────
 * 焦 = 卷。湿温三篇（上 7 / 中 46 / 下 23）本身就把「湿」的纵向重心写在目录里。
 */
function triJiao() {
  const out = {};
  for (const j of ['上焦', '中焦', '下焦']) {
    const rows = ALL.filter((s) => s.jiao === j);
    out[j] = {
      tiao: rows.reduce((n, r) => n + r.articles.length, 0),
      fang: rows.reduce((n, r) => n + r.formulas.length, 0),
      by: Object.fromEntries(rows.map((r) => [r.pian, r.articles.length])),
      shiTiao: rows.filter((r) => r.pole === '湿').reduce((n, r) => n + r.articles.length, 0),
      shuTiao: rows.filter((r) => r.pole === '暑').reduce((n, r) => n + r.articles.length, 0),
    };
  }
  const shiTotal = Object.values(out).reduce((n, v) => n + v.shiTiao, 0);
  for (const v of Object.values(out)) v.shiShare = rate(v.shiTiao, shiTotal);
  return out;
}

/* ───────────────────────── 三、方按治法归类 ─────────────────────────
 * 归类是本章归纳（吴鞠通原文没有「此类」），规则顺序即优先级：
 * 先认方名（方名是作者给的标签），方名不足以判时才看所属条文的关键词。
 * 归不进的进「未归」并单独报数 —— 宁可留一个缺口，不硬塞。
 */
const RULES = [
  { cls: '疏表透邪', re: /(银翘|桑菊|败毒散|香薷|马勃)/ },
  { cls: '清气泄热', re: /(白虎|三石|石膏|清络)/ },
  { cls: '清营凉血', re: /(清营|犀角|生地|丹皮|赤芍)/ },
  { cls: '开窍', re: /(安宫牛黄|紫雪|至宝|清宫|牛黄丸)/ },
  { cls: '益气养阴', re: /(生脉|清暑益气|三才)/ },
  { cls: '芳化分消', re: /(三仁|正气散|三香|滑石|茯苓皮|薏苡|宣清导浊|藿香|桔皮竹茹)/ },
  { cls: '淡渗利湿', re: /(五苓|四苓|二金|茵陈|猪苓|半苓)/ },
  { cls: '苦寒通下', re: /(承气|陷胸|泻心|温脾|大黄)/ },
  { cls: '温阳散寒', re: /(附子|理中|四逆|真武|术附|苓姜术桂|椒附|鹿附|安肾|桂枝姜附|救中|九痛|立生丹|独胜散|半硫|小青龙|麻杏石甘|椒桂|乌药|黄土|来复|扶阳)/ },
  { cls: '通络蠲饮', re: /(宣痺|宣痹|防己|旋覆花|控涎|桔半桂苓|葶苈|苇茎|小半夏)/ },
  { cls: '酸甘养阴', re: /(连梅|椒梅|乌梅|地黄|阿胶|麦冬麻仁|理隂煎|理阴煎)/ },
  { cls: '治痢', re: /(白头翁|芩芍|桃花|断下渗湿|参苓白术|石脂|香连)/ },
  { cls: '和解治疟', re: /(柴胡|草果|露姜|青蒿鳖甲|鳖甲煎丸|常山)/ },
  { cls: '甘温补虚', re: /(补中益气|异功|双补|参茸|苁蓉|三神丸|参芍)/ },
  { cls: '涌吐', re: /(瓜蒂)/ },
  { cls: '消导和中', re: /(保和|平胃|枳术|连翘赤豆)/ },
];

/** 方 → 治法类。先看方名，再看条文 */
function classifyFormula(f, articleText = '') {
  const name = f.nameSimp || f.name || '';
  for (const r of RULES) if (r.re.test(name)) return r.cls;
  for (const r of RULES) if (r.re.test(articleText)) return r.cls;
  return '未归';
}

function fangBySyndrome() {
  const out = {};
  for (const s of ALL) {
    const byTiao = new Map(s.articles.map((a) => [a.no, a.zhHans || '']));
    for (const f of s.formulas) {
      const cls = classifyFormula(f, byTiao.get(f.tiao) || '');
      out[cls] = out[cls] || { fang: 0, refOnly: 0, poles: { 暑: 0, 湿: 0 }, eg: [] };
      const o = out[cls];
      o.fang += 1;
      if (f.refOnly) o.refOnly += 1;
      o.poles[s.pole] += 1;
      if (o.eg.length < 3) o.eg.push(`${f.nameSimp || f.name}（${s.juan.replace('卷', '').slice(0, 3)}${s.pian}·${f.tiao}）`);
    }
  }
  return out;
}

/* ───────────────────────── 四、季节词 ─────────────────────────
 * 只数**原文出现**（不做节气推算）。「长夏」单列：它是湿温定义条里的原词，
 * 混进「夏」会把那条的权重吃平。
 */
const SEASONS = [
  { key: '长夏', re: /长夏/ },
  // 「夏」「冬」单字会撞药名：半**夏**、麦**冬**。用后视断言排掉，
  // 否则「小半夏加茯苓汤」「麦冬麻仁汤」会被算成季节证据（首版就是这么错的）。
  { key: '夏', re: /(?<!半)夏/, not: /长夏/ }, // 夏月 / 夏秋；只有「长夏」者不计入此列
  { key: '秋', re: /秋/ },
  { key: '冬', re: /(?<!麦)冬/ },
  { key: '春', re: /春/ },
  { key: '霜', re: /霜/ },
];

function seasonality() {
  const shu = articlesOf(['暑']);
  const shi = articlesOf(['湿']);
  const hit = (arr, s) => arr.filter((x) => {
    const t = x.zhHans || '';
    return s.re.test(t) && !(s.not && s.not.test(t));
  });
  const rows = SEASONS.map((s) => {
    const a = hit(shu, s);
    const b = hit(shi, s);
    return {
      key: s.key,
      shu: a.length,
      shi: b.length,
      shuRate: rate(a.length, shu.length),
      shiRate: rate(b.length, shi.length),
      shuEg: a.slice(0, 3).map((x) => x.no),
      shiEg: b.slice(0, 3).map((x) => x.no),
    };
  });
  const anySeasonOf = (arr) => {
    const nos = new Set();
    for (const s of SEASONS) for (const a of hit(arr, s)) nos.add(a.no);
    return nos.size;
  };
  const su = anySeasonOf(shu);
  const si = anySeasonOf(shi);
  return {
    n: { shu: shu.length, shi: shi.length },
    rows,
    anySeason: { shu: su, shi: si, shuRate: rate(su, shu.length), shiRate: rate(si, shi.length) },
  };
}

/** 引用串：外源·笈成·溫病條辨 上焦篇·第二二 */
function cite(juan, no) {
  const pian = juan.replace(/^卷./, '');
  return `外源·笈成·溫病條辨 ${pian}·第${no}`;
}

if (require.main === module) {
  console.log('');
  console.log('  教学边界：本输出为《温病条辨》暑温/伏暑/湿温/寒湿九篇的文本统计，外源·笈成留档可复算，不构成诊疗依据。');
  const t = totals();
  console.log('');
  console.log('═══ 温病条辨 · 暑湿九篇 ═══');
  console.log(`  篇 ${t.pian} · 条 ${t.tiao}（暑 ${t.tiaoShu} / 湿 ${t.tiaoShi}）· 方 ${t.fang}（有药味 ${t.withHerbs} + 互见 ${t.refOnly}）· 原文 ${t.chars} 字`);
  console.log('');
  console.log('  卷/篇 | 极 | 条 | 方 | 互见 | 有药味');
  for (const r of profile()) console.log(`  ${r.juan} ${r.pian} | ${r.pole} | ${r.tiao} | ${r.fang} | ${r.refOnly} | ${r.fang - r.refOnly}`);

  const sv = shuVsShi();
  console.log(`\n  ── 症状词分布（每百条出现率）· 暑 ${sv.n.shu} 条 vs 湿 ${sv.n.shi} 条 ──`);
  console.log('  词 | 偏向 | 暑 | 湿 | 落差');
  for (const r of [...sv.rows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))) {
    console.log(`  ${r.key} | ${r.pole} | ${r.shuRate}% | ${r.shiRate}% | ${r.delta > 0 ? '+' : ''}${r.delta}`);
  }

  const tj = triJiao();
  console.log('\n  ── 三焦分布（焦 = 卷）──');
  for (const [j, v] of Object.entries(tj)) {
    console.log(`  ${j} | 条 ${v.tiao}（湿 ${v.shiTiao} / 暑 ${v.shuTiao}）| 方 ${v.fang} | 湿占湿类 ${v.shiShare}%`);
  }

  const fs2 = fangBySyndrome();
  console.log('\n  ── 方按治法归类 ──');
  for (const [k, v] of Object.entries(fs2).sort((a, b) => b[1].fang - a[1].fang)) {
    console.log(`  ${k} | ${v.fang} 方（互见 ${v.refOnly}）| 暑 ${v.poles.暑} / 湿 ${v.poles.湿} | ${v.eg.join('；')}`);
  }

  const se = seasonality();
  console.log(`\n  ── 季节词（每百条出现率）· 暑 ${se.n.shu} 条 vs 湿 ${se.n.shi} 条 ──`);
  for (const r of se.rows) console.log(`  ${r.key} | 暑 ${r.shu}（${r.shuRate}%）| 湿 ${r.shi}（${r.shiRate}%）`);

  const a = docAudit();
  console.log('\n  正文与 quiz 对账（读 docs/zh.md）');
  for (const f of a.facts) console.log(`  ${f.got === f.want ? '✓' : '✗'} ${f.label} 现算 ${f.got} · 正文 ${f.want}`);
  console.log(`  quiz ${a.quiz.total} 题（pre ${a.quiz.stage.pre} / check ${a.quiz.stage.check} / post ${a.quiz.stage.post}）· check 接地 ${a.quiz.groundedChecks} 道 · 答案 ${a.quiz.answers.join('/')}`);
  console.log('');
}

/* ── 正文与 quiz 的对账：九篇表 / 症状词 / 三焦 / 季节，逐格复算 ── */

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
  const sv = shuVsShi();
  const tj = triJiao();
  const se = seasonality();
  const grab = (re, label) => {
    const m = re.exec(doc);
    if (!m) throw new Error(`正文里定位不到「${label}」`);
    return m.slice(1).map((v) => Number(String(v).replace(/,/g, '')));
  };

  const [docPian, docTiao, docFang, docWith, docRef, docChars] = grab(/篇 (\d+) · 条 (\d+)（暑 \d+ \/ 湿 \d+）· 方 (\d+)（有药味 (\d+) \+ 互见 (\d+)）· 原文 ([\d,]+) 字/, '九篇合计');
  const bianRows = [...doc.matchAll(/^\| (上焦|中焦|下焦) \| ([^|]+?) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \|$/gm)]
    .map((m) => ({ jiao: m[1], pian: m[2].trim(), tiao: +m[3], fang: +m[4], refOnly: +m[5], herbs: +m[6] }));
  if (bianRows.length !== 9) throw new Error(`正文九篇表是 ${bianRows.length} 行，应为 9`);
  const triRows = [...doc.matchAll(/^\| (上焦|中焦|下焦) \| (\d+) \| (\d+) \/ (\d+) \| (\d+) \| (\d+)% \|$/gm)]
    .map((m) => ({ jiao: m[1], tiao: +m[2], shi: +m[3], shu: +m[4], fang: +m[5], share: +m[6] }));
  if (triRows.length !== 3) throw new Error('正文三焦表不是 3 行');
  const [docKe, docShi] = grab(/口渴 \| 暑 \| ([\d.]+)% \| ([\d.]+)% \|/, '口渴率');
  const [docLi, docShiLi] = grab(/便溏下利 \| 湿 \| ([\d.]+)% \| ([\d.]+)% \|/, '下利率');
  const [docSide] = grab(/19 类词里 (\d+) 类落在预期的一侧/, '预期一侧词数');
  const [docSeasonShu, docSeasonShi] = grab(/任一词 \| (\d+) 条（[\d.]+%）\s*\| (\d+) 条（[\d.]+%）/, '季节词条数');

  const sideOk = sv.rows.filter((r) => (r.pole === '暑' ? r.delta > 0 : r.delta < 0)).length;
  const facts = [
    { label: '篇/条/方/有药味/互见/字', got: [t.pian, t.tiao, t.fang, t.withHerbs, t.refOnly, t.chars].join('/'), want: [docPian, docTiao, docFang, docWith, docRef, docChars].join('/') },
    { label: '暑 32 / 湿 100', got: `${t.tiaoShu}/${t.tiaoShi}`, want: '32/100' },
    { label: '口渴 暑/湿 率', got: `${sv.rows.find((r) => r.key === '口渴').shuRate}/${sv.rows.find((r) => r.key === '口渴').shiRate}`, want: `${docKe}/${docShi}` },
    { label: '下利 暑/湿 率', got: `${sv.rows.find((r) => r.key === '便溏下利').shuRate}/${sv.rows.find((r) => r.key === '便溏下利').shiRate}`, want: `${docLi}/${docShiLi}` },
    { label: '预期一侧 词数/总词数', got: `${sideOk}/${sv.rows.length}`, want: `${docSide}/${sv.rows.length}` },
    { label: '季节词 暑/湿 条数（任一词）', got: `${new Set(se.rows.flatMap((r) => r.shuEg)).size}/${new Set(se.rows.flatMap((r) => r.shiEg)).size}`, want: `${docSeasonShu}/${docSeasonShi}` },
  ];
  for (const r of bianRows) {
    const g = profile().find((p) => p.jiao === r.jiao && p.pian === r.pian);
    facts.push({ label: `${r.jiao}·${r.pian} 条/方/互见/有药味`, got: g ? [g.tiao, g.fang, g.refOnly, g.herbs].join('/') : '缺', want: [r.tiao, r.fang, r.refOnly, r.herbs].join('/') });
  }
  for (const r of triRows) {
    const g = tj[r.jiao];
    facts.push({ label: `${r.jiao} 条/湿/暑/方/湿占比`, got: [g.tiao, g.shiTiao, g.shuTiao, g.fang, g.shiShare].join('/'), want: [r.tiao, r.shi, r.shu, r.fang, r.share].join('/') });
  }

  const q = quizAudit(qraw);
  const body = grams(doc);
  const grounded = q.rows.filter((r) => r.stage === 'check' && [...grams(r.right)].some((v) => body.has(v))).length;
  const sourceText = ALL.map((s) => s.articles.map((a) => `${a.zhHans}\n${(a.notes || []).join('\n')}`).join('\n')).join('\n');
  return {
    facts,
    quiz: { ...q, groundedChecks: grounded },
    quotes: ['暑兼湿热', '润之则病深不解', '长夏深秋冬日同法', '湿之为物也', '伤脾胃之阳者十常八、九'].map((w) => ({ quote: w, inDoc: doc.includes(w), inSource: sourceText.includes(w) })),
  };
}

module.exports = {
  BOOK, TIAOBIAN, SECTIONS, ALL, LEXICON, SEASONS, RULES,
  profile, totals, shuVsShi, triJiao, fangBySyndrome, classifyFormula, seasonality, cite,
  articlesOf, formulasOf, DOC, QUIZ, hanzi, grams, quizAudit, docAudit,
};
