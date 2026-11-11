'use strict';
/**
 * 表里双解与治痈疡：六首方的两个方向
 *
 *   node code/main.js
 *
 * 本章合并教材两章：第11章 表里双解剂（2 方）+ 第23章 治痈疡剂（4 方）。
 * 六首方是大柴胡汤、防风通圣散、仙方活命饮、五味消毒饮、透脓散、阳和汤。
 *
 * 计算口径：
 *   · 组成、君臣佐使、功用、主治、章位——全部由 standards/fangji/formulas.json 现算，不手打药名；
 *   · 教材字数（5,504 + 9,526 = 15,030）由 standards/fangji/底本.json 的 counts.hanzi 现算；
 *   · 「为何不进八法」的构造证据也由数据算：
 *       ① 六方在 formulas.json 里 fa 字段全空（0/6 被归入八法）；
 *       ② 六方所在的两章不在「八法公式所在的章」集合里（该集合由 bafa.items 现推）；
 *       ③ 每首方的功用都同时命中 2 个法向（本章 6/6），八法一方只归一法，压不成 1 个标签；
 *       ④ 12 个法向里有 1 个（托）根本不是八法之一——外科消/托/补三法，八法只盖住消与补；
 *       ⑤ 两章两轴：第11章同方之内并存相反方向（汗与下），第23章同一病名之下并存相反方向（清与温）。
 *
 * 边界：
 *   · 法向由「功用」文本的关键词判定，是文本标签，不是教材的治法归类；
 *   · 君臣佐使是抽取结果，教材成组标注（「共为君药」）时本层每角色只留 1 味；
 *   · 本章不判断任何一首方在临床上该不该用。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'fangji', 'formulas.json'), 'utf8'));
const BASE = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'fangji', '底本.json'), 'utf8'));

/** 本章六方（方名可写，药名一律从数据读） */
const NAMES = ['大柴胡汤', '防风通圣散', '仙方活命饮', '五味消毒饮', '透脓散', '阳和汤'];
/** 本章合并的两个教材章 */
const CHAPTERS = ['11', '23'];
const ROLES = ['君', '臣', '佐', '使'];

const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

function pick(list = DATA.formulas) {
  return NAMES.map((n) => {
    const f = list.find((x) => x.name === n);
    if (!f) throw new Error(`formulas.json 里找不到 ${n}`);
    return f;
  });
}

const FORMULAS = pick();

/** 方内去重药名 */
const herbNames = (f) => [...new Set(f.composition.herbs.map((h) => h.name))];

/** 药位数（一方一药位，逐味计） */
const slotCount = (list = FORMULAS) => list.reduce((n, f) => n + f.composition.herbs.length, 0);

/** 去重药味集合 */
const herbSet = (list = FORMULAS) => new Set(list.flatMap(herbNames));

/** 平均药位/方 */
const avgSlots = (list = FORMULAS) => slotCount(list) / list.length;

/** 两章的结构与字数（第11章 1节2小节12段；第23章 2节4小节24段） */
function chapterStats() {
  return CHAPTERS.map((no) => {
    const c = BASE.chapters.find((x) => x.no === no);
    if (!c) throw new Error(`底本.json 里找不到第${no}章`);
    const fs_ = FORMULAS.filter((f) => f.chapter === no);
    return {
      no,
      title: c.title,
      secs: c.counts.secs,
      subs: c.counts.subs,
      paras: c.counts.paras,
      hanzi: c.counts.hanzi,
      formulas: fs_.map((f) => f.name),
    };
  });
}

/** 本章教材字数合计（15,030 = 5,504 + 9,526） */
const hanziTotal = () => chapterStats().reduce((n, c) => n + c.hanzi, 0);

/**
 * 法向判定表：只看「功用」文本。八法之外的「托」单列，用来暴露八法盖不住的地方。
 * 顺序固定，输出可复现。
 */
const FA_DIRS = [
  { fa: '汗', re: /解表|疏风|发汗|散邪/ },
  { fa: '下', re: /泻热|通便|泻下|攻下|内泻|荡涤/ },
  { fa: '清', re: /清热|解毒|泻火|清解/ },
  { fa: '温', re: /温阳|散寒|温经|温通/ },
  { fa: '和', re: /和解/ },
  { fa: '补', re: /补气|养血|补血|益气|补益/ },
  { fa: '消', re: /消肿|散结|溃坚|消痞|消积|消散/ },
  { fa: '托', re: /托毒|透脓|溃脓|排脓/ },
];

/** 八法八名 */
const BAFA = ['汗', '吐', '下', '和', '温', '清', '消', '补'];

/** 一首方的功用命中哪些法向 */
const faDirs = (gongyong) => FA_DIRS.filter((d) => d.re.test(gongyong)).map((d) => d.fa);

/** 每首方的方向档案 */
function directionProfile(list = FORMULAS) {
  return list.map((f) => {
    const dirs = faDirs(f.gongyong);
    const outside = dirs.filter((d) => !BAFA.includes(d));
    return {
      name: f.name,
      chapter: f.chapter,
      gongyong: f.gongyong,
      dirs,
      n: dirs.length,
      outside,
    };
  });
}

/** 由 bafa.items 现推「八法公式所在的章」集合——不手写章号 */
function bafaChapters() {
  const set = new Set();
  for (const item of DATA.bafa.items) {
    for (const name of item.names || []) {
      const f = DATA.formulas.find((x) => x.name === name);
      if (f) set.add(f.chapter);
    }
  }
  return set;
}

/** 六方与八法的关系：fa 字段 + 所在章是否八法章 */
function outsideBafa() {
  const chs = bafaChapters();
  return FORMULAS.map((f) => ({
    name: f.name,
    fa: f.fa || '',
    chapter: f.chapter,
    inBafaChapter: chs.has(f.chapter),
    labelled: !!(f.fa && String(f.fa).trim()),
  }));
}

/** 八法规模：52 首归八法，62 首不属八法 */
function bafaScale() {
  const total = DATA.bafa.items.reduce((n, i) => n + i.formulas, 0);
  return {
    items: DATA.bafa.items.map((i) => ({ fa: i.fa, n: i.formulas })),
    total,
    outside: DATA.formulas.length - total,
    totalFormulas: DATA.formulas.length,
  };
}

/** 按章看方向集合：两章两轴的量化写法 */
function axisByChapter() {
  const prof = directionProfile();
  return CHAPTERS.map((no) => {
    const items = prof.filter((p) => p.chapter === no);
    const union = [...new Set(items.flatMap((p) => p.dirs))];
    return {
      no,
      formulas: items.map((p) => p.name),
      perFormula: items.map((p) => ({ name: p.name, dirs: p.dirs })),
      union: union.slice().sort(byName),
      multi: items.filter((p) => p.n >= 2).length,
    };
  });
}

/** 本章内部共享药：出现在 ≥2 首方里的药 */
function sharedHerbs(list = FORMULAS) {
  const cnt = new Map();
  for (const f of list) for (const h of herbNames(f)) cnt.set(h, (cnt.get(h) || 0) + 1);
  const all = [...cnt.entries()];
  const shared = all
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || byName(a[0], b[0]))
    .map(([name, n]) => ({ name, n }));
  return {
    nodes: cnt.size,
    shared,
    once: all.filter(([, n]) => n === 1).length,
  };
}

/**
 * 教材「成组标注」的角色位：roleEvidence 的引文里出现「共为 / 二味 / 二药 / 三味」，
 * 说明教材是一组药共任某角色；而数据层每角色只留 1 味。
 */
const GROUP_SIGNAL = /共为|二味|二药|三味/;

function groupedRoles(list = FORMULAS) {
  const rows = list.map((f) => ({
    name: f.name,
    roles: f.roleEvidence.filter((e) => GROUP_SIGNAL.test(e.quote)).map((e) => e.role),
  }));
  return { rows, positions: rows.reduce((n, r) => n + r.roles.length, 0) };
}

/** 角色深度：每方填了几个角色位 */
function roleDepth(list = FORMULAS) {
  const rows = list.map((f) => ({
    name: f.name,
    filled: ROLES.filter((r) => (f.roles[r] || []).length > 0),
  }));
  return {
    rows: rows.map((r) => ({ name: r.name, depth: r.filled.length, filled: r.filled })),
    four: rows.filter((r) => r.filled.length === 4).map((r) => r.name),
    min: Math.min(...rows.map((r) => r.filled.length)),
    minNames: rows.filter((r) => r.filled.length === Math.min(...rows.map((x) => x.filled.length))).map((r) => r.name),
  };
}

/** 组成规模：最短/最长、以及本章的「大方」 */
function compositionTable() {
  const rows = FORMULAS.map((f) => ({
    name: f.name,
    chapter: f.chapter,
    sub: f.sub,
    n: f.composition.herbs.length,
    herbs: f.composition.herbs.map((h) => h.name),
    roles: ROLES.map((r) => ({ r, herbs: f.roles[r] || [] })),
    gongyong: f.gongyong,
  }));
  const ns = rows.map((r) => r.n);
  return {
    rows,
    total: slotCount(),
    unique: herbSet().size,
    min: Math.min(...ns),
    max: Math.max(...ns),
  };
}

/** 规模自检：任一数字不符即抛错 */
function selfCheck() {
  const b = bafaScale();
  const ax = axisByChapter();
  const ct = compositionTable();
  const sh = sharedHerbs();
  const g = groupedRoles();
  const d = roleDepth();
  const ob = outsideBafa();
  const checks = [
    { name: '六方齐', ok: FORMULAS.length === 6, got: FORMULAS.length },
    { name: '药位 55', ok: ct.total === 55, got: ct.total },
    { name: '去重药味 42', ok: ct.unique === 42, got: ct.unique },
    { name: '最短 5 味', ok: ct.min === 5, got: ct.min },
    { name: '最长 17 味', ok: ct.max === 17, got: ct.max },
    { name: '教材字 15030', ok: hanziTotal() === 15030, got: hanziTotal() },
    { name: '第11章 2 方', ok: ax[0].formulas.length === 2, got: ax[0].formulas.length },
    { name: '第23章 4 方', ok: ax[1].formulas.length === 4, got: ax[1].formulas.length },
    { name: '每方 2 法向', ok: directionProfile().every((p) => p.n === 2), got: directionProfile().map((p) => p.n).join('/') },
    { name: '六方 fa 全空', ok: ob.every((x) => x.fa === ''), got: ob.filter((x) => x.fa !== '').length },
    { name: '六方所在章均非八法章', ok: ob.every((x) => !x.inBafaChapter), got: ob.filter((x) => x.inBafaChapter).length },
    { name: '八法 52', ok: b.total === 52, got: b.total },
    { name: '不属八法 62', ok: b.outside === 62, got: b.outside },
    { name: '共享药 11 味', ok: sh.shared.length === 11, got: sh.shared.length },
    { name: '成组角色位 11 处', ok: g.positions === 11, got: g.positions },
    { name: '四角色齐 1 首', ok: d.four.length === 1, got: d.four.length },
  ];
  const bad = checks.filter((c) => !c.ok);
  if (bad.length) throw new Error('规模自检失败：' + bad.map((x) => `${x.name}（实得 ${x.got}）`).join('；'));
  return checks;
}

function main() {
  const ct = compositionTable();
  const ax = axisByChapter();
  const b = bafaScale();
  const ob = outsideBafa();
  const sh = sharedHerbs();
  const g = groupedRoles();
  const d = roleDepth();
  const prof = directionProfile();
  const chs = bafaChapters();

  console.log('═══ 表里双解与治痈疡：六首方的两个方向 ═══');
  const stats = chapterStats();
  console.log(
    `教材 ${CHAPTERS.length} 章合成 1 章：${stats
      .map((c) => `第${c.no}章 ${c.secs}节/${c.subs}小节/${c.paras}段/${c.hanzi} 字/${c.formulas.length} 方`)
      .join(' ＋ ')}`
  );
  console.log(`合计 ${hanziTotal()} 字 · ${FORMULAS.length} 方 · ${ct.total} 个药位 · ${ct.unique} 味药 · 平均 ${avgSlots().toFixed(2)} 药位/方`);

  console.log('\n── 六方组成（药味数由 formulas.json 现算）──');
  for (const r of ct.rows) {
    const role = r.roles.filter((x) => x.herbs.length).map((x) => x.r + ':' + x.herbs.join('+')).join(' ');
    console.log(`  ${r.name}（第${r.chapter}章 ${r.sub}）${r.n} 味｜${r.gongyong}｜${role || '角色层空'}`);
  }
  console.log(`  最短 ${ct.min} 味 · 最长 ${ct.max} 味 · 本章内部共享药 ${sh.shared.length} 味（只出现 1 次的 ${sh.once} 味）`);
  console.log(`  共享药：${sh.shared.map((x) => x.name + '×' + x.n).join(' ')}`);

  console.log('\n── 方向档案：功用文本命中几个法向 ──');
  for (const p of prof) {
    const out = p.outside.length ? `（其中 ${p.outside.join('、')} 不在八法之内）` : '';
    console.log(`  ${p.name}：${p.dirs.join('＋')} ＝ ${p.n} 个法向${out}`);
  }
  console.log(`  6 方共 ${prof.reduce((n, p) => n + p.n, 0)} 个法向，其中 ${prof.reduce((n, p) => n + p.n - p.outside.length, 0)} 个落在八法之内`);

  console.log('\n── 两章两轴 ──');
  for (const a of ax) {
    console.log(`  第${a.no}章：${a.formulas.length} 方 · 方向并集 {${a.union.join('、')}} · 每方 ≥2 法向的 ${a.multi} 首`);
    for (const p of a.perFormula) console.log(`    ${p.name}：${p.dirs.join('＋')}`);
  }

  console.log('\n── 为何不进八法（构造证据）──');
  console.log(`  ① fa 字段：${ob.filter((x) => x.fa === '').length}/6 首为空（本章六方在方剂层没有被归入任何一法）`);
  console.log(`  ② 章：六方所在章 {${[...new Set(ob.map((x) => x.chapter))].join('、')}}，八法公式只出现在章 {${[...chs].sort(byName).join('、')}} 中，交集 ${ob.filter((x) => x.inBafaChapter).length} 个`);
  console.log(`  ③ 法向：6 方各 2 个法向，八法一方只归一法——12 个法向压不成 6 个标签`);
  console.log(`  ④ 八法之外的法向：${[...new Set(prof.flatMap((p) => p.outside))].join('、') || '无'}（外科消/托/补三法，八法只有消与补）`);
  console.log(`  ⑤ 两轴：第11章 表里轴（同一首方之内并存相反方向），第23章 阴阳轴（同一病名并存相反方向）`);
  console.log(`  规模：八法 ${b.total} 首（${b.items.map((i) => i.fa + i.n).join(' ')}）· 不属八法 ${b.outside} 首 / 共 ${b.totalFormulas} 首`);

  console.log('\n── 君臣佐使是抽取（教材成组标注，本层每角色留 1 味）──');
  for (const r of g.rows) {
    const f = FORMULAS.find((x) => x.name === r.name);
    const got = ROLES.filter((x) => (f.roles[x] || []).length).map((x) => x + ':' + f.roles[x].join('+'));
    console.log(`  ${r.name}：${got.join(' ') || '（空）'}｜教材成组标注 ${r.roles.length} 处${r.roles.length ? '（' + r.roles.join('、') + '）' : ''}`);
  }
  console.log(`  成组标注合计 ${g.positions} 处，分布在 ${g.rows.filter((r) => r.roles.length).length} 首方`);
  console.log(`  角色深度：${d.rows.map((r) => r.name + ' ' + r.depth).join(' · ')}`);
  console.log(`  四角色齐 ${d.four.length} 首（${d.four.join('、') || '无'}）· 最低 ${d.min} 个角色位（${d.minNames.join('、')}）`);

  console.log('\n自检：');
  for (const c of selfCheck()) console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}`);

  console.log('\n口径：法向是「功用」文本的标签，不是教材的治法归属；君臣佐使是抽取，不是教材标注。');
  console.log('教学边界：本章只做教材两章的结构对照与文本标签统计，不构成诊断/用药依据');
}

if (require.main === module) main();
module.exports = {
  DATA, BASE, NAMES, CHAPTERS, ROLES, FORMULAS, FA_DIRS, BAFA, GROUP_SIGNAL,
  pick, herbNames, slotCount, herbSet, avgSlots, chapterStats, hanziTotal,
  faDirs, directionProfile, bafaChapters, outsideBafa, bafaScale, axisByChapter,
  sharedHerbs, groupedRoles, roleDepth, compositionTable, selfCheck,
};
