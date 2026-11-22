'use strict';
/**
 * 第 3 章 · 三焦辨证：病位的纵向坐标 —— 三卷条/方画像 · 脏腑归属 · 两轴映射
 *
 *   node code/main.js
 *
 * 数据：standards/wenbing/底本.json 中 id='tiaobian'（外源·笈成·溫病條辨，sha256 见 standards/wenbing/README.md）
 *
 * 口径（四条，改任何一条都要同步改 docs/zh.md 与 main.test.js）：
 *   1. 只统计 juan ∈ {卷一·上焦篇, 卷二·中焦篇, 卷三·下焦篇}。「凡例 14 条」「原病篇 19 条」
 *      是书前引经与体例，不是三焦正文；「卷五·解產難」只剩 2 方 0 条。三者一律单列，不并入三卷。
 *   2. 方取 section.formulas 全部 243。其中 178 有药味，65 标 refOnly（互见「方見前」、
 *      加减方「即於銀翹散內加…」、先写主治者）—— 0 药味的方不进药味统计。
 *   3. 方与条的连接键是 (篇, 漢数字条号)。条号在**卷内连续**：上焦篇 風温 一..二一、
 *      暑温 接二二，一路到秋燥 五八；中焦/下焦同样连续，下一卷才重回「一」。
 *      唯一例外是「補秋燥勝氣論」22 条里有 14 条条号同为「一」（源页此处编号失效），
 *      故连接只认该篇内**唯一**的条号，重号条的方不计入脏腑归属（记 dupTiao）。
 *      连不上的方记 fangOrphan：中焦·秋燥 4 方无所属条（该篇 0 条）。
 *   4. 脏腑归属按**条文正文**是否明写脏腑名或其六经别称计数（marks），是下限不是全量；
 *      「太隂」在手为肺、在足为脾，故上焦用「太隂」指肺、中焦用「足太隂」指脾，不可互换。
 */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/wenbing/底本.json'), 'utf8'));
const TIAOBIAN = BOOK.books.find((b) => b.id === 'tiaobian');
if (!TIAOBIAN) throw new Error('底本.json 缺 id=tiaobian（《温病条辨》）');

const JIAO = ['卷一·上焦篇', '卷二·中焦篇', '卷三·下焦篇'];
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const SHORT = { '卷一·上焦篇': '上焦', '卷二·中焦篇': '中焦', '卷三·下焦篇': '下焦' };
const OTHER = ['凡例', '原病篇', '卷五·解產難'];

const sectionsOf = (juan) => TIAOBIAN.sections.filter((s) => s.juan === juan);
const articlesOf = (juan) =>
  sectionsOf(juan).flatMap((s) => s.articles.map((a) => ({ juan, pian: s.pian, no: a.no, zh: a.zhHant, hans: a.zhHans })));
const formulasOf = (juan) => sectionsOf(juan).flatMap((s) => s.formulas);
const hasHerb = (f) => f.ingredients.length > 0;
const herbNames = (f) => f.ingredients.map((i) => i.herbSimp || i.herb);
const round2 = (x) => Number(x.toFixed(2));

/**
 * 三卷画像：条 / 方 / 病类。
 * 病类数按「卷内去重后的 pian 名」数，不是 section 段数 ——
 * 中焦·秋燥 有段无条，仍是 1 个病类，必须计进去，否则「中焦 5 病类」会变成 4。
 */
function juanStats() {
  const rows = JIAO.map((juan) => {
    const secs = sectionsOf(juan);
    const arts = articlesOf(juan);
    const fangs = formulasOf(juan);
    const key = new Set(arts.map((a) => `${a.pian}|${a.no}`));
    const herbs = fangs.flatMap(herbNames);
    // 条号在同篇内重号者：源页编号失效之处（目前只有補秋燥勝氣論）
    const dupTiao = secs.reduce((n, s) => {
      const seen = new Map();
      for (const a of s.articles) seen.set(a.no, (seen.get(a.no) || 0) + 1);
      return n + s.articles.filter((a) => seen.get(a.no) > 1).length;
    }, 0);
    return {
      juan,
      jiao: SHORT[juan],
      pian: new Set(secs.map((s) => s.pian)).size,
      pianEmpty: secs.filter((s) => s.articles.length === 0).map((s) => s.pian),
      tiao: arts.length,
      fang: fangs.length,
      fangHerb: fangs.filter(hasHerb).length,
      fangRef: fangs.filter((f) => f.refOnly).length,
      fangOrphan: fangs.filter((f) => !key.has(`${f.pian}|${f.tiao}`)).length,
      dupTiao,
      perFang: arts.length ? round2(fangs.length / arts.length) : 0,
      herbs: herbs.length,
      distinctHerbs: new Set(herbs).size,
    };
  });
  const extra = OTHER.map((juan) => {
    const secs = TIAOBIAN.sections.filter((s) => s.juan === juan);
    return {
      juan,
      tiao: secs.reduce((n, s) => n + s.articles.length, 0),
      fang: secs.reduce((n, s) => n + s.formulas.length, 0),
    };
  });
  const all = formulasOf_all();
  const total = {
    sections: TIAOBIAN.sections.length,
    tiao: TIAOBIAN.sections.reduce((n, s) => n + s.articles.length, 0),
    fang: all.length,
    fangHerb: all.filter(hasHerb).length,
    fangRef: all.filter((f) => f.refOnly).length,
    herbs: all.flatMap(herbNames).length,
    distinctHerbs: new Set(all.flatMap(herbNames)).size,
  };
  return { rows, extra, total };
}

function formulasOf_all() {
  return TIAOBIAN.sections.flatMap((s) => s.formulas);
}

/**
 * 病位 → 脏腑 → 代表方。
 *
 * marks 只收**脏腑名与六经别称**，不收症状（咳嗽/痉厥之类），否则「肺」会把
 * 一切见咳的条文都吞进去，脏腑归属就失去分辨力。
 * rep 里的方名用「包含」而非全等匹配：源页方名带尾注（辛凉平剂银翘散方、
 * 大定风珠方），全等匹配会把真方判成假方。
 */
const ORGAN_ROWS = [
  {
    jiao: '上焦', wei: '肺（手太隂）', zang: '肺',
    marks: ['肺', '太隂'],
    rep: ['银翘散', '桑菊饮', '桑杏汤'],
    why: '「凡病温者，始於上焦，在手太隂」——温邪从口鼻入，肺主皮毛，故上焦之表在肺',
  },
  {
    jiao: '上焦', wei: '心包（手厥隂）', zang: '心包',
    marks: ['心包', '手厥隂', '心竅', '膻中'],
    rep: ['清宫汤', '安宫牛黄丸', '紫雪丹'],
    why: '肺卫不解则逆传心包；「舌為心竅，包絡代心用事」，故神昏舌蹇属手厥隂',
  },
  {
    jiao: '中焦', wei: '胃（陽明）', zang: '胃',
    marks: ['陽明', '胃'],
    rep: ['白虎汤', '大承气汤', '小承气汤'],
    why: '「傳至中焦，陽明温病也」——中焦之实以阳明腑证为主，法在白虎与承气',
  },
  {
    jiao: '中焦', wei: '脾（足太隂）', zang: '脾',
    marks: ['脾', '足太隂'],
    rep: ['半苓汤', '四苓加厚朴秦皮汤', '五苓散'],
    why: '「濕温之在中焦，太隂病居多」——湿胜则从足太隂脾化，法在温燥渗利',
  },
  {
    jiao: '下焦', wei: '腎（少隂）', zang: '腎',
    marks: ['腎', '少隂'],
    rep: ['加减复脉汤', '青蒿鳖甲汤', '三甲复脉汤'],
    why: '「温邪久羈中焦，陽明陽土，未有不克少隂癸水者」——下焦之虚以肾阴涸竭为主',
  },
  {
    jiao: '下焦', wei: '肝（厥隂）', zang: '肝',
    marks: ['肝', '厥隂'],
    rep: ['三甲复脉汤', '二甲复脉汤', '大定风珠'],
    why: '「水虛則木強，浸假而累及厥隂矣」——肾水虚则肝风动，痉厥瘛瘲属厥隂',
  },
];

function organMap() {
  return ORGAN_ROWS.map((r) => {
    const juan = JIAO.find((x) => SHORT[x] === r.jiao);
    const secs = sectionsOf(juan);
    const hit = articlesOf(juan).filter((a) => r.marks.some((m) => a.zh.includes(m)));
    const hitKey = new Set(hit.map((a) => `${a.pian}|${a.no}`));
    // 只认篇内唯一的条号：補秋燥勝氣論 有 14 条同为「一」，按条号连接会把它们混成一条
    const fang = secs.flatMap((s) => {
      const seen = new Map();
      for (const a of s.articles) seen.set(a.no, (seen.get(a.no) || 0) + 1);
      return s.formulas.filter((f) => seen.get(f.tiao) === 1 && hitKey.has(`${s.pian}|${f.tiao}`));
    });
    const names = formulasOf(juan).map((f) => f.nameSimp);
    const missing = r.rep.filter((n) => !names.some((x) => x.includes(n)));
    return {
      ...r,
      tiao: hit.length,
      fang: fang.length,
      fangHerb: fang.filter(hasHerb).length,
      // 代表方必须真在本卷方目里 —— 缺一个就是编的，测试会拦下
      repChecked: missing.length === 0,
      missing,
    };
  });
}

/**
 * 两条坐标轴的映射表。
 *
 * 卫气营血（叶天士）按「邪气深浅的层次」切，三焦（吴鞠通）按「病位的上下」切。
 * 二者能对上的是**趋势**（上焦≈卫气、下焦≈血分），对不上的是**落点**：
 * 营分与心包并非同一物（营是邪的层次，心包是受邪的脏），下焦肝肾阴虚在卫气营血里
 * 没有独立位置（只能并进「血分」），而《条辨》290 条里「衛」字一次也没出现。
 */
const AXIS_ROWS = [
  {
    weiqi: '衛分', sanjiao: '上焦·肺', level: '对上',
    why: '温邪初袭，病位在肺卫，治在辛凉透表', tiao: '上焦篇·第二、第四',
  },
  {
    weiqi: '氣分', sanjiao: '上焦·肺 → 中焦·陽明', level: '一对多',
    why: '气分横跨两焦：上焦在肺（辛凉/甘寒），中焦在胃（白虎/承气）。气分一个名字，两个病位',
    tiao: '上焦篇·第三；中焦篇·第一',
  },
  {
    weiqi: '營分', sanjiao: '上焦·心包', level: '部分重合',
    why: '「熱在營中」用清營湯，落点在手厥隂心包；但营是邪的层次、心包是脏，二者不等价',
    tiao: '上焦篇·第三十',
  },
  {
    weiqi: '血分', sanjiao: '上焦·心包 / 中焦·陽明 / 下焦·肝腎', level: '跨三段',
    why: '血分不锁位置：上焦有犀角地黃，中焦有清營湯，下焦有青蒿鱉甲。同一个「血分」散在三焦',
    tiao: '中焦篇·第二十；下焦篇·第十二',
  },
  {
    weiqi: '（无对应）', sanjiao: '下焦·肝腎陰虛', level: '对不上',
    why: '下焦是「虚」不是「深」：真阴耗损、肝风内动，卫气营血四层里没有这一格（只能塞进血分，但那说的是邪在血，不是说阴亏）',
    tiao: '下焦篇·第三、第十四',
  },
  {
    weiqi: '（无对应）', sanjiao: '中焦·足太隂濕温', level: '对不上',
    why: '湿温从中焦太隂化，病位在脾而不在「气分的某层」；用卫气营血读湿温会一路判成「气分」而丢掉脾胃这个落点',
    tiao: '中焦篇·第三七',
  },
];

/** 两套语汇在 290 条正文里各出现多少次（这就是「哪套是本书主轴」的硬证据） */
function axisTokens() {
  const arts = TIAOBIAN.sections.flatMap((s) => s.articles);
  const count = (k) => arts.filter((a) => a.zhHant.includes(k)).length;
  return {
    wei: count('衛'), // 0 —— 叶天士的四层，吴鞠通一个「卫」字都不用
    qiFen: count('氣分'),
    ying: count('營'),
    xueFen: count('血分'),
    sanjiao: count('三焦'),
    shang: count('上焦'),
    zhong: count('中焦'),
    xia: count('下焦'),
  };
}

/** 映射表的分类小计：几行对上、几行对不上 */
function crossAxis() {
  const rows = AXIS_ROWS.map((r) => ({ ...r }));
  const tally = rows.reduce((m, r) => {
    m[r.level] = (m[r.level] || 0) + 1;
    return m;
  }, {});
  return { rows, tally, tokens: axisTokens(), aligned: rows.filter((r) => r.level === '对上').length, gaps: rows.filter((r) => r.level === '对不上').length };
}

if (require.main === module) {
  const s = juanStats();
  console.log('');
  console.log('  教学边界：本输出为《温病条辨》三焦篇的文本结构统计，外源·笈成留档可复算，不构成诊疗依据。');
  console.log('');
  console.log('═══ 温病条辨 · 三焦三卷 ═══');
  console.log(`  全书 ${s.total.tiao} 条 · ${s.total.fang} 方（有药味 ${s.total.fangHerb} + 互见/加减 ${s.total.fangRef}）· 药味 ${s.total.herbs} 次 / 不同药名 ${s.total.distinctHerbs}`);
  console.log('');
  console.log('  卷 | 病类 | 条 | 方 | 有药味 | 互见 | 无所属条 | 方/条');
  for (const r of s.rows) {
    console.log(`  ${r.jiao} | ${r.pian} | ${r.tiao} | ${r.fang} | ${r.fangHerb} | ${r.fangRef} | ${r.fangOrphan} | ${r.perFang}`);
  }
  console.log('  另计 | ' + s.extra.map((e) => `${e.juan} ${e.tiao} 条/${e.fang} 方`).join(' · '));
  console.log('  条号重号 | ' + s.rows.map((r) => `${r.jiao} ${r.dupTiao}`).join(' · ') + '（源页编号失效处，不参与方-条连接）');
  const empty = s.rows.filter((r) => r.pianEmpty.length).map((r) => `${r.jiao}·${r.pianEmpty.join('、')} 0 条`);
  console.log(`  有段无条：${empty.join('；') || '无'}`);
  console.log('');
  console.log('  病位 | 脏腑 | 明写条数 | 方数 | 代表方');
  for (const o of organMap()) {
    console.log(`  ${o.jiao}·${o.wei} | ${o.zang} | ${o.tiao} | ${o.fang} | ${o.rep.join('、')}${o.repChecked ? '' : ' ✗缺' + o.missing.join(',')}`);
  }
  const c = crossAxis();
  console.log('');
  console.log('  两轴语汇在 290 条正文中的出现：衛 ' + c.tokens.wei + ' · 氣分 ' + c.tokens.qiFen + ' · 營 ' + c.tokens.ying + ' · 血分 ' + c.tokens.xueFen + ' · 三焦 ' + c.tokens.sanjiao);
  console.log('  卫气营血 × 三焦：对上 ' + c.aligned + ' 行 · 对不上 ' + c.gaps + ' 行');
  for (const r of c.rows) console.log(`  ${r.weiqi} → ${r.sanjiao} | ${r.level} | ${r.tiao}`);

  const a = docAudit();
  console.log('\n  正文与 quiz 对账（读 docs/zh.md）');
  for (const f of a.facts) console.log(`  ${f.got === f.want ? '✓' : '✗'} ${f.label} 现算 ${f.got} · 正文 ${f.want}`);
  console.log(`  quiz ${a.quiz.total} 题（pre ${a.quiz.stage.pre} / check ${a.quiz.stage.check} / post ${a.quiz.stage.post}）· check 接地 ${a.quiz.groundedChecks} 道 · 答案 ${a.quiz.answers.join('/')}`);
}

/* ── 正文与 quiz 的对账：读 docs/zh.md，逐格与底本现算对读 ── */

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
  const doc = fs.readFileSync(DOC, 'utf8');
  const qraw = fs.readFileSync(QUIZ, 'utf8');
  const s = juanStats();
  const o = organMap();
  const c = crossAxis();
  const grab = (re, label) => {
    const m = re.exec(doc);
    if (!m) throw new Error(`正文里定位不到「${label}」`);
    return m.slice(1);
  };

  const juanRows = [...doc.matchAll(/^\| (上焦|中焦|下焦) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| (\d+) \| ([\d.]+) \|$/gm)].map((m) => ({
    jiao: m[1], pian: Number(m[2]), tiao: Number(m[3]), fang: Number(m[4]), fangHerb: Number(m[5]), fangRef: Number(m[6]), perFang: Number(m[7]),
  }));
  if (juanRows.length !== 3) throw new Error('正文「三卷」表不是 3 行');

  const organRows = [...doc.matchAll(/^\| (上焦|中焦|下焦) \| ([^|（]+)（[^|）]+） \| (\d+) \| (\d+) \|/gm)].map((m) => ({ jiao: m[1], zang: m[2].trim().replace(/肾/g, '腎'), tiao: Number(m[3]), fang: Number(m[4]) }));
  if (organRows.length !== 6) throw new Error('正文「六病位」表不是 6 行');

  const [docExtraTiao, docExtraFang] = grab(/合计 (\d+) 条、(\d+) 方/, '另计合计').map(Number);
  const [docDup] = grab(/上焦条号重号 (\d+) 次/, '上焦重号次数').map(Number);
  const [docWei, docQi, docYing, docXue, docSanjiao] = grab(/「卫」字出现 \*\*(\d+) 次\*\*，「气分」(\d+) 次、「营」(\d+) 次、「血分」(\d+) 次、「三焦」(\d+) 次/, '两轴词频').map(Number);

  const facts = [];
  for (const row of juanRows) {
    const got = s.rows.find((r) => r.jiao === row.jiao);
    facts.push({ label: `${row.jiao} 条/方/有药味/互见/方条比`, got: got ? [got.tiao, got.fang, got.fangHerb, got.fangRef, got.perFang].join('/') : '缺', want: [row.tiao, row.fang, row.fangHerb, row.fangRef, row.perFang].join('/') });
  }
  for (const row of organRows) {
    const got = o.find((x) => x.jiao === row.jiao && x.zang === row.zang);
    facts.push({ label: `${row.jiao}·${row.zang} 明写条/方`, got: got ? `${got.tiao}/${got.fang}` : '缺', want: `${row.tiao}/${row.fang}` });
  }
  facts.push({ label: '另计 条 / 方', got: `${s.extra.reduce((n, e) => n + e.tiao, 0)}/${s.extra.reduce((n, e) => n + e.fang, 0)}`, want: `${docExtraTiao}/${docExtraFang}` });
  facts.push({ label: '上焦重号', got: s.rows.find((r) => r.jiao === '上焦').dupTiao, want: docDup });
  facts.push({ label: '兩轴词频 卫/气分/营/血分/三焦', got: [c.tokens.wei, c.tokens.qiFen, c.tokens.ying, c.tokens.xueFen, c.tokens.sanjiao].join('/'), want: [docWei, docQi, docYing, docXue, docSanjiao].join('/') });
  const [docAligned, docGaps] = grab(/6 组映射里只有 (\d+) 组真正对得上，另有 (\d+) 组在卫气营血里/, '映射组数').map(Number);
  facts.push({ label: '映射 6 组：对上 / 对不上', got: `${c.rows.length}/${c.aligned}/${c.gaps}`, want: `6/${docAligned}/${docGaps}` });

  const q = quizAudit(qraw);
  const body = grams(doc);
  const grounded = q.rows.filter((r) => r.stage === 'check' && [...grams(r.right)].some((x) => body.has(x))).length;
  return {
    facts,
    quiz: { ...q, groundedChecks: grounded },
    /** 正文引文是否逐字落在底本里 */
    quotes: ['温病由口鼻而入，鼻气通于肺，口气通于胃', '温病最善伤精', '伤寒伤人身之阳，故喜辛温甘温苦热，以救其阳']
      .map((w) => ({
        quote: w,
        inDoc: doc.includes(w),
        inSource: TIAOBIAN.sections.some((sec) => sec.articles.some((a) => a.zhHans.includes(w) || (a.notes || []).some((n) => n.includes(w)))),
      })),
  };
}

module.exports = {
  BOOK, TIAOBIAN, JIAO, JIAO_SHORT: SHORT, ORGAN_ROWS, AXIS_ROWS,
  juanStats, organMap, crossAxis, axisTokens, sectionsOf, articlesOf, formulasOf, hasHerb,
  DOC, QUIZ, hanzi, grams, quizAudit, docAudit,
};
