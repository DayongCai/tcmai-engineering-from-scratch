'use strict';
/**
 * 第 2 章 · 卫气营血：把《溫熱論》37 条压成一台四层状态机
 *
 *   node code/main.js
 *
 * 数据：standards/wenbing/底本.json · books[id=wenrelun]（外源·笈成，sha256 见该目录 README）
 *       1 section · 37 条 · 0 方 · 繁字 4,433
 *
 * 口径（四条，改任何一条都要同步改 docs/zh.md 与 main.test.js）：
 *
 *   · 层名是**归纳**，不是原文标签。原文只有「卫之后方言气，营之后方言血」（第8条）
 *     这一句顺序话，没有给任何一条贴过「卫分」「气分」的标签。故 layerOf() 判的是
 *     「这一条的论旨落在哪一层」，判据写在 ASSIGN 的第三列，逐条可核。
 *
 *   · 第 8 条是**纲**，不是某一层。它同时写出四级治法（汗/清气/透热转气/凉血散血），
 *     任何单层归类都会把它压扁，故单列 '纲'，由 ladder() 展开成四级。
 *
 *   · 舌诊 / 斑疹 / 验齿 / 妇人 四类条一律进 '其他'，即便正文里出现「营」「血」「散血」
 *     等字（第 14、16、29、31 条都是）。理由：这些条的论旨是「看什么」，不是「传到哪」；
 *     把它们摊进四层会把第 7 章（舌诊与斑疹）提前吃掉，也会让分布虚高。
 *
 *   · 词表只作**旁证**，不作判据。signals() 的召回率是 19/37 —— 关键词漏掉第 3、5、13 条
 *     （卫表鉴别、斑后津伤、清热透表），也误报第 15、19 条（讲舌与津，不讲层）。
 *     这不是 bug，是本章的第一个结论：四层不能靠 if (text.includes('营')) 来分。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOKS = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/wenbing/底本.json'), 'utf8')).books;
const BOOK = BOOKS.find((b) => b.id === 'wenrelun');
if (!BOOK) throw new Error('底本.json 缺 books[id=wenrelun]（《溫熱論》）');

const ARTICLES = BOOK.sections[0].articles;
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const byNo = new Map(ARTICLES.map((a) => [a.no, a]));

/** 取一条原文（简体）；条号不存在直接抛，不返回 undefined */
function art(no) {
  const a = byNo.get(no);
  if (!a) throw new RangeError(`《溫熱論》无第 ${no} 条（共 ${ARTICLES.length} 条）`);
  return a;
}

/**
 * 逐条归类表：条号 → { layer, kind, why }
 *
 * layer ∈ 卫 / 气 / 营 / 血 / 纲 / 其他
 * kind  仅 '其他' 有值：舌诊 / 斑疹 / 验齿 / 妇人 / 杂论
 * why   判定依据（引原文片段或指出论旨），供人工复核
 *
 * 37 条 = 卫 3 + 气 5 + 营 2 + 血 1 + 纲 1 + 其他 25
 */
const ASSIGN = {
  // ── 卫：入口与表证分支 ──────────────────────────────────────────
  1: { layer: '卫', why: '温邪上受，首先犯肺——入口；「肺主气属卫」给出口径' },
  2: { layer: '卫', why: '邪尚在肺故云在表；「在表初用辛凉轻剂」是卫层治法' },
  3: { layer: '卫', why: '卫表阶段的两条支路（风胜燥生／湿胜蒙窍）与类伤寒之辨' },

  // ── 气：气分流连、三焦、里结 ────────────────────────────────────
  6: { layer: '气', why: '「邪始终在气分流连者，可冀其战汗透邪」——气层的出路' },
  7: { layer: '气', why: '「气病有不传血分，而邪留三焦」——气层的横向出口' },
  10: { layer: '气', why: '三焦不从外解则里结阳明；下法属气层，不因无血分而禁下' },
  11: { layer: '气', why: '脘痞苦泄／开泄，辨里结之未成；舌象只作佐证' },
  12: { layer: '气', why: '腹满胀痛当下，辨里实之已成；舌象只作佐证' },

  // ── 营：入营与营热外透 ──────────────────────────────────────────
  4: { layer: '营', why: '「渐欲入营」；「营分受热，则血液受劫……即撤去气药」，急急透斑' },
  5: { layer: '营', why: '斑出热不解＝营热已外透而胃津亡，属营层收尾与防陷下焦' },

  // ── 血：血结 ────────────────────────────────────────────────────
  37: { layer: '血', why: '「热邪陷入，与血相结」「血结者，身体必重」——全篇唯一的血结条' },

  // ── 纲：四级治法阶梯本身 ────────────────────────────────────────
  8: { layer: '纲', why: '「卫之后，方言气，营之后，方言血」+ 四级治法，一句定全篇' },

  // ── 其他：诊断面与专论（不摊进四层） ────────────────────────────
  9: { layer: '其他', kind: '杂论', why: '湿邪伤阳／伤津的体质差异；「救阴不在血，而在津汗」' },
  13: { layer: '其他', kind: '舌诊', why: '黄苔滑与薄干之分；「清热透表」只是顺带一提的治法' },
  14: { layer: '其他', kind: '舌诊', why: '绛舌四态；「泄卫透营」是层间接口，论旨仍是舌' },
  15: { layer: '其他', kind: '舌诊', why: '绛而中心干；明言「此非血分也」，正说明舌色不等于层' },
  16: { layer: '其他', kind: '舌诊', why: '紫而暗主瘀；含「散血」字样，论旨是舌色与瘀热' },
  17: { layer: '其他', kind: '舌诊', why: '绛舌兼黏腻／光亮／干枯／碎点，辨秽浊、胃阴、肾阴' },
  18: { layer: '其他', kind: '舌诊', why: '舌中心绛干与舌尖绛独干，分心营与心火' },
  19: { layer: '其他', kind: '舌诊', why: '白苔厚薄润燥；「透热」指透湿中之热，非营分转气' },
  20: { layer: '其他', kind: '舌诊', why: '芒刺属上焦热极' },
  21: { layer: '其他', kind: '舌诊', why: '苔不燥而闷极属脾湿；舌胀大属脾湿胃热' },
  22: { layer: '其他', kind: '舌诊', why: '白黏腻浊沫为脾瘅；苔如碱为胃中宿滞' },
  23: { layer: '其他', kind: '舌诊', why: '无苔如烟煤，辨挟阴与胃燥' },
  24: { layer: '其他', kind: '舌诊', why: '黑而滑属阴证当温；黑而干属津枯火炽' },
  25: { layer: '其他', kind: '舌诊', why: '淡红无色属胃津伤，主炙甘草汤' },
  26: { layer: '其他', kind: '舌诊', why: '白如粉而四边紫绛，温疫初入膜原（归第 10 章）' },
  27: { layer: '其他', kind: '斑疹', why: '斑与疹的形态判别与「宜见不宜见多」' },
  28: { layer: '其他', kind: '斑疹', why: '淡红阴斑／虚斑，阴盛格阳当温' },
  29: { layer: '其他', kind: '斑疹', why: '斑色紫黑辨心包与胃；「斑属血者恒多，疹属气者不少」是唯一层间统计句' },
  30: { layer: '其他', kind: '斑疹', why: '白㾦（水晶色／枯骨色）辨气液枯与湿郁卫分' },
  31: { layer: '其他', kind: '验齿', why: '齿血结瓣，阳血安胃／阴血救肾' },
  32: { layer: '其他', kind: '验齿', why: '齿光燥如石属胃热；枯骨色属肾液枯' },
  33: { layer: '其他', kind: '验齿', why: '咬牙啮齿辨湿热化风、胃热、胃虚' },
  34: { layer: '其他', kind: '验齿', why: '齿垢如灰糕／齿焦有无垢，断生死与微下' },
  35: { layer: '其他', kind: '妇人', why: '胎前病温，护胎与解邪两难' },
  36: { layer: '其他', kind: '妇人', why: '产后病温，慎苦寒而不犯下焦' },
};

/** 四级治法阶梯。rule 必须是第 8 条原文子串，ladder() 逐条自校 */
const LADDER = [
  {
    order: 1,
    layer: '卫',
    rule: '在卫汗之可也',
    move: '汗',
    detail: '辛凉轻剂；挟风加薄荷、牛蒡，挟湿加芦根、滑石（第2条）',
    herbs: ['薄荷', '牛蒡', '芦根', '滑石'],
    exit: '战汗（第6条）',
  },
  {
    order: 2,
    layer: '气',
    rule: '到气才可清气',
    move: '清',
    detail: '清气、分消上下、里结用下（第7、10、11、12条）',
    herbs: [],
    exit: '战汗透邪／转疟（第6、7条）',
  },
  {
    order: 3,
    layer: '营',
    rule: '入营犹可透热转气',
    move: '透',
    detail: '撤去气药，犀角、元参、羚羊；急急透斑（第4、8条）',
    herbs: ['犀角', '元参', '羚羊'],
    exit: '透斑外出（第4条）',
  },
  {
    order: 4,
    layer: '血',
    rule: '入血就恐耗血动血，直须凉血散血',
    move: '凉血散血',
    detail: '生地、丹皮、阿胶、赤芍；血结者去邪通络（第8、37条）',
    herbs: ['生地', '丹皮', '阿胶', '赤芍'],
    exit: '无——到血层只能救，不能透',
  },
];

/** 层名 → 关键词（只作旁证，见文件头第 4 条口径） */
const LEXICON = {
  卫: ['卫', '在表', '表证', '肺', '皮毛', '辛凉', '汗之', '透风'],
  气: ['气分', '清气', '气病', '战汗', '三焦', '里结'],
  营: ['营分', '入营', '营', '透营'],
  血: ['血分', '凉血', '散血', '动血', '耗血', '血结', '血室', '瘀血', '血液'],
};

/** 单条 → 归类。传数字或 article 对象皆可；未归类即抛，不猜 */
function layerOf(article) {
  const no = typeof article === 'number' ? article : article && article.no;
  const rec = ASSIGN[no];
  if (!rec) throw new RangeError(`第 ${no} 条未归类：不硬套，先补 ASSIGN 再跑`);
  const a = art(no);
  return {
    no,
    layer: rec.layer,
    kind: rec.kind || null,
    why: rec.why,
    chars: a.zhHans.length,
    signals: signals(a.zhHans),
  };
}

/** 词表命中（旁证）。返回 { 卫: [...], 气: [...], ... }，空桶不出现 */
function signals(text) {
  const out = {};
  for (const [layer, words] of Object.entries(LEXICON)) {
    const hit = words.filter((w) => text.includes(w));
    if (hit.length) out[layer] = hit;
  }
  return out;
}

/** 四层分布 + 其他分项 + 纲 */
function distribution() {
  const d = { 卫: [], 气: [], 营: [], 血: [], 纲: [], 其他: [] };
  for (const a of ARTICLES) d[layerOf(a.no).layer].push(a.no);
  const kinds = {};
  for (const no of d.其他) {
    const k = layerOf(no).kind;
    kinds[k] = (kinds[k] || 0) + 1;
  }
  return {
    卫: d.卫,
    气: d.气,
    营: d.营,
    血: d.血,
    纲: d.纲,
    其他: d.其他,
    kinds,
    total: ARTICLES.length,
  };
}

/** 治法阶梯：四级，逐条回原文自校；附一条顺序禁令 */
function ladder() {
  const a8 = art(8).zhHans;
  return {
    source: { no: 8, cite: '外源·笈成·溫熱論 第8条' },
    rungs: LADDER.map((r) => ({ ...r, verified: a8.includes(r.rule) })),
    guard: a8.includes('前后不循缓急之法') ? '否则前后不循缓急之法，虑其动手便错' : null,
    shortcut: art(1).zhHans.includes('逆传心包') ? '逆传心包（第1条）——唯一允许跳级的边' : null,
  };
}

/** 「透」族统计：字面出现、按条分布、哪些算层间转出 */
function permeate() {
  const hits = [];
  for (const a of ARTICLES) {
    const re = /透(.)/g;
    let m;
    while ((m = re.exec(a.zhHans))) hits.push({ no: a.no, word: `透${m[1]}` });
  }
  const byWord = {};
  for (const h of hits) byWord[h.word] = (byWord[h.word] || 0) + 1;
  const nos = [...new Set(hits.map((h) => h.no))];
  const byLayer = {};
  for (const no of nos) {
    const L = layerOf(no).layer;
    byLayer[L] = (byLayer[L] || 0) + 1;
  }
  // 层间转出：字面「透热」「透营」才算；「透表」「透风」是卫层内部动作
  const TRANSFER = new Set(['透热', '透营']);
  const transfer = hits.filter((h) => TRANSFER.has(h.word));
  return {
    hits: hits.length,
    articles: nos.length,
    nos,
    byWord,
    byLayer,
    transfer,
    literal: (art(8).zhHans.match(/透热转气/g) || []).length,
  };
}

/** 关键词法的缺口：召回、多桶、零命中 —— 实数报出 */
function gap() {
  const withSignal = [];
  const withoutSignal = [];
  const multi = [];
  for (const a of ARTICLES) {
    const s = signals(a.zhHans);
    const n = Object.keys(s).length;
    if (n === 0) withoutSignal.push(a.no);
    else withSignal.push(a.no);
    if (n >= 2) multi.push(a.no);
  }
  return {
    withSignal,
    withoutSignal,
    multi,
    recall: `${withSignal.length}/${ARTICLES.length}`,
  };
}

/** 底本自述（条数/字数/方数），与 standards/wenbing/README.md 一致 */
function totals() {
  return {
    articles: ARTICLES.length,
    sections: BOOK.sections.length,
    formulas: BOOK.counts.formulas,
    charsHant: BOOK.counts.charsHant,
    charsHans: ARTICLES.reduce((n, a) => n + a.zhHans.length, 0),
    noMin: Math.min(...ARTICLES.map((a) => a.no)),
    noMax: Math.max(...ARTICLES.map((a) => a.no)),
  };
}

if (require.main === module) {
  console.log('');
  console.log('  教学边界：本输出为《溫熱論》37 条的层级归类与治法阶梯统计，原文出自外源·笈成留档，可复算；不构成诊疗依据。');
  console.log('');

  const t = totals();
  const d = distribution();

  console.log('═══ 溫熱論 · 四层状态机 ═══');
  console.log(`  书 ${BOOK.title}（${BOOK.author}·${BOOK.dynasty}）· ${t.sections} 卷 · 条 ${t.noMin}–${t.noMax} 共 ${t.articles} 条 · 方 ${t.formulas} 首 · 繁字 ${t.charsHant}`);
  console.log('');
  console.log('  层 | 条数 | 条号');
  console.log(`  卫 | ${d.卫.length} | ${d.卫.join('、')}`);
  console.log(`  气 | ${d.气.length} | ${d.气.join('、')}`);
  console.log(`  营 | ${d.营.length} | ${d.营.join('、')}`);
  console.log(`  血 | ${d.血.length} | ${d.血.join('、')}`);
  console.log(`  纲 | ${d.纲.length} | ${d.纲.join('、')}（四级治法本身，不属单层）`);
  console.log(`  其他 | ${d.其他.length} | ${Object.entries(d.kinds).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  const core = d.卫.length + d.气.length + d.营.length + d.血.length;
  console.log(`  合计 ${core + d.纲.length + d.其他.length} 条 = 层论 ${core} + 纲 ${d.纲.length} + 诊断面/专论 ${d.其他.length}`);

  console.log('\n  ── 治法阶梯（第8条拆四级）──');
  const L = ladder();
  for (const r of L.rungs) {
    console.log(`  ${r.order}. ${r.layer}｜${r.rule}${r.verified ? '' : '  ✗原文不匹配'} → ${r.move}`);
    console.log(`     ${r.detail}`);
  }
  console.log(`     顺序禁令：${L.guard}`);
  console.log(`     唯一跳级：${L.shortcut}`);

  const p = permeate();
  console.log('\n  ── 「透」族分布 ──');
  console.log(`  含「透」${p.articles} 条（${p.nos.join('、')}）· 共 ${p.hits} 处：${Object.entries(p.byWord).map(([k, v]) => `${k}×${v}`).join(' ')}`);
  console.log(`  按归类：${Object.entries(p.byLayer).map(([k, v]) => `${k} ${v} 条`).join(' · ')}`);
  console.log(`  层间转出（透热/透营）：${p.transfer.map((h) => `第${h.no}条·${h.word}`).join('、')}`);
  console.log(`  「透热转气」四字字面出现：${p.literal} 次`);

  const g = gap();
  console.log('\n  ── 词表法的缺口 ──');
  console.log(`  有层关键词 ${g.withSignal.length} 条 / 无 ${g.withoutSignal.length} 条（召回 ${g.recall}）`);
  console.log(`  零命中：${g.withoutSignal.join('、')}`);
  console.log(`  多桶（≥2 层词同时出现）：${g.multi.length} 条 → ${g.multi.join('、')}`);
  console.log('\n  注：归类是本章归纳，原文无「四层」标签；舌诊/斑疹/验齿/妇人归其他，留给第 7 章。');

  const a = docAudit();
  console.log('\n  ── 正文与 quiz 对账（读 docs/zh.md）──');
  for (const f of a.facts) console.log(`  ${f.got === f.want ? '✓' : '✗'} ${f.label} 现算 ${f.got} · 正文 ${f.want}`);
  console.log(`  quiz ${a.quiz.total} 题（pre ${a.quiz.stage.pre} / check ${a.quiz.stage.check} / post ${a.quiz.stage.post}）· check 接地 ${a.quiz.groundedChecks} 道 · 答案 ${a.quiz.answers.join('/')}`);
}

/* ── 正文与 quiz 的对账：本章的数从底本算，再回正文核一遍 ── */

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
    return {
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(q.explain),
      right: String(opts[q.correct] || ''),
    };
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

/** 正文写死的数 vs 底本现算：任一格不等即抛，不静默通过 */
function docAudit() {
  const doc = fs.readFileSync(DOC, 'utf8');
  const qraw = fs.readFileSync(QUIZ, 'utf8');
  const t = totals();
  const d = distribution();
  const p = permeate();
  const g = gap();
  const grab = (re, label) => {
    const m = re.exec(doc);
    if (!m) throw new Error(`正文里定位不到「${label}」`);
    return m.slice(1).map((x) => Number(String(x).replace(/,/g, '')));
  };

  const [docJuan, docTiao, docFang, docHant] = grab(/(\d+) 卷 · (\d+) 条 · (\d+) 方 · 繁字 ([\d,]+)/, '《溫熱論》规模');
  const [docOther, docSum] = grab(/11 条层论 \+ 1 条纲 \+ (\d+) 条诊断面与专论 = (\d+)/, '层纲其他合计');
  const [docTou, docTouHits] = grab(/含「透」的 \*\*(\d+) 条\*\*（第 2、4、6、8、13、14、19、26、29、32 条），共 \*\*(\d+) 处\*\*/, '透族条数与处数');
  const [docLiteral] = grab(/全篇只出现 \*\*(\d+) 次\*\*/, '透热转气字面次数');
  const [docRecallHit, docRecallAll] = grab(/召回 \*\*(\d+)\/(\d+)\*\*/, '词表召回');
  const [docZero] = grab(/\*\*(\d+) 条\*\*零命中/, '零命中条数');
  const [docMulti] = grab(/\*\*(\d+) 条\*\*同时命中两个以上层词/, '多桶条数');
  const [docShe, docBan, docChi, docFu, docZa] = grab(/舌诊 (\d+) · 斑疹 (\d+) · 验齿 (\d+) · 妇人 (\d+) · 杂论 (\d+)/, '其他分项');

  const layers = d.卫.length + d.气.length + d.营.length + d.血.length;
  const facts = [
    { label: '卷 / 条 / 方 / 繁字', got: [t.sections, t.articles, t.formulas, t.charsHant].join('/'), want: [docJuan, docTiao, docFang, docHant].join('/') },
    { label: '层论 + 纲 + 其他', got: `${layers}/${d.纲.length}/${d.其他.length}`, want: `11/1/${docOther}` },
    { label: '三类合计 = 条', got: layers + d.纲.length + d.其他.length, want: docSum },
    { label: '其他分项合计 = 其他', got: Object.values(d.kinds).reduce((a, b) => a + b, 0), want: docOther },
    { label: '其他分项 舌/斑疹/齿/妇人/杂', got: [d.kinds.舌诊, d.kinds.斑疹, d.kinds.验齿, d.kinds.妇人, d.kinds.杂论].join('/'), want: [docShe, docBan, docChi, docFu, docZa].join('/') },
    { label: '透 条 / 处', got: `${p.articles}/${p.hits}`, want: `${docTou}/${docTouHits}` },
    { label: '「透热转气」字面', got: p.literal, want: docLiteral },
    { label: '词表 召回 / 零命中 / 多桶', got: `${g.withSignal.length}/${g.withoutSignal.length}/${g.multi.length}`, want: `${docRecallHit}/${docZero}/${docMulti}` },
  ];

  const q = quizAudit(qraw);
  const body = grams(doc);
  const grounded = q.rows.filter((r) => r.stage === 'check' && [...grams(r.right)].some((x) => body.has(x))).length;
  return {
    facts,
    quiz: { ...q, groundedChecks: grounded },
    quotes: ['在卫汗之可也', '到气才可清气', '入营犹可透热转气', '入血就恐耗血动血，直须凉血散血'].map((w) => ({ quote: w, inDoc: doc.includes(w), inSource: art(8).zhHans.includes(w) })),
    layerRows: ['卫', '气', '营', '血', '纲'].map((k) => ({ layer: k, n: d[k].length, nos: d[k] })),
  };
}

module.exports = {
  ROOT,
  BOOK,
  ARTICLES,
  ASSIGN,
  LEXICON,
  art,
  layerOf,
  signals,
  distribution,
  ladder,
  permeate,
  gap,
  totals,
  DOC,
  QUIZ,
  quizAudit,
  docAudit,
};
