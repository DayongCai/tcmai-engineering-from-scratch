'use strict';
/**
 * 第10章 神经系统：类别与关系的规模、密度与「不给值」的分布
 *
 *   node code/main.js
 *
 * 口径：
 *   · 小节数、字数、三视角与四层级的命中，一律从 standards/shengli/units.json 现读现算；
 *   · 数值核验（valueLike）读 units.json 的 measure 字段，本章必须为 0；
 *   · 密度 = （三视角命中 + 四层级命中）÷ 字数 × 1000，只用来比较章内各节各小节，
 *     不是重要性排序，也不是功能强弱的度量；
 *   · 命中低不等于没有内容：词表之外的写法（如「神经节」「神经束」）不计入层级命中。
 */

const path = require('node:path');
const fs = require('node:fs');

/** units.json 的位置：从本文件向上找，避免依赖调用时的 cwd */
function locateUnits() {
  const cands = [
    path.resolve(__dirname, '../../../../../../standards/shengli/units.json'), // code/ 向上六级 = 仓库根
    path.resolve(__dirname, '../../../../../standards/shengli/units.json'),
    path.resolve(__dirname, '../../../../standards/shengli/units.json'),
    path.resolve(__dirname, '../../../standards/shengli/units.json'),
    path.resolve(process.cwd(), 'standards/shengli/units.json'),
    path.resolve(process.cwd(), '../../../../../../standards/shengli/units.json'),
  ];
  for (const p of cands) if (fs.existsSync(p)) return p;
  throw new Error('找不到 standards/shengli/units.json（请从仓库内运行）');
}

const UNITS_PATH = locateUnits();
const DATA = JSON.parse(fs.readFileSync(UNITS_PATH, 'utf8'));

const CHAPTER = '10';
const VIEWS = ['代谢', '机能', '形态'];
const LEVELS = ['细胞', '组织', '器官', '系统'];
/** 「不给值」类自我声明：本书用重复的边界句替代数值 */
const DECL_RE = /不写(?:任何)?数值|数值与单位|不给值/g;

const unitsOf = (ch = CHAPTER) => DATA.units.filter((u) => u.chapter === ch);
const sumBy = (list, pick) => list.reduce((n, u) => n + pick(u), 0);
const zero = (keys) => Object.fromEntries(keys.map((k) => [k, 0]));

function tally(list) {
  const views = zero(VIEWS);
  const levels = zero(LEVELS);
  for (const u of list) {
    for (const k of VIEWS) views[k] += u.measure.views[k] || 0;
    for (const k of LEVELS) levels[k] += u.measure.levels[k] || 0;
  }
  const hits = Object.values(views).reduce((a, b) => a + b, 0) + Object.values(levels).reduce((a, b) => a + b, 0);
  return { views, levels, hits };
}

/** 每千字命中数，保留一位小数（比较用，不是度量衡） */
const density = (hits, hanzi) => (hanzi ? Math.round((hits * 1000 * 10) / hanzi) / 10 : 0);

/** 一节一行：字数、命中、密度 */
function sectionStats(ch = CHAPTER) {
  const list = unitsOf(ch);
  const secs = [...new Set(list.map((u) => u.sec))];
  return secs.map((sec) => {
    const sub = list.filter((u) => u.sec === sec);
    const hanzi = sumBy(sub, (u) => u.hanzi);
    const t = tally(sub);
    return { sec, units: sub.length, hanzi, views: t.views, levels: t.levels, hits: t.hits, density: density(t.hits, hanzi) };
  });
}

/** 一小节一行：供找最密与最疏 */
function unitStats(ch = CHAPTER) {
  return unitsOf(ch).map((u) => {
    const t = tally([u]);
    return {
      locator: u.locator, sub: u.sub, title: u.title, hanzi: u.hanzi,
      views: t.views, levels: t.levels, hits: t.hits,
      density: density(t.hits, u.hanzi),
      decl: (u.body.match(DECL_RE) || []).length,
      valueLike: u.measure.valueLike,
    };
  });
}

const chapterStats = (ch = CHAPTER) => {
  const list = unitsOf(ch);
  const t = tally(list);
  const hanzi = sumBy(list, (u) => u.hanzi);
  return {
    units: list.length,
    secs: new Set(list.map((u) => u.sec)).size,
    hanzi,
    views: t.views,
    levels: t.levels,
    hits: t.hits,
    density: density(t.hits, hanzi),
    valueLike: sumBy(list, (u) => u.measure.valueLike),
    digits: sumBy(list, (u) => u.measure.digits),
    listItems: sumBy(list, (u) => u.measure.listItems),
    decl: sumBy(list, (u) => (u.body.match(DECL_RE) || []).length),
  };
};

const tightest = (ch = CHAPTER) => unitStats(ch).slice().sort((a, b) => b.density - a.density)[0];
const sparsest = (ch = CHAPTER) => unitStats(ch).slice().sort((a, b) => a.density - b.density)[0];
/** 组织层一次都没出现的小节数：本章 12/12 */
const organLevelGap = (ch = CHAPTER) => unitStats(ch).filter((u) => u.levels['组织'] === 0).length;

function selfCheck() {
  const s = chapterStats();
  const secs = sectionStats();
  const checks = [
    { name: '小节 12', ok: s.units === 12, got: s.units },
    { name: '节 4', ok: s.secs === 4, got: s.secs },
    { name: '教材字数 20576', ok: s.hanzi === 20576, got: s.hanzi },
    { name: '数值型 0（本书不给值）', ok: s.valueLike === 0, got: s.valueLike },
    { name: '数字全为列表序号', ok: s.digits === s.listItems, got: `${s.digits}/${s.listItems}` },
    { name: '组织层 0 的小节 12', ok: organLevelGap() === 12, got: organLevelGap() },
    { name: '四节字数合计等于全章', ok: secs.reduce((n, x) => n + x.hanzi, 0) === s.hanzi, got: secs.reduce((n, x) => n + x.hanzi, 0) },
  ];
  const bad = checks.filter((c) => !c.ok);
  if (bad.length) throw new Error('规模自检失败：' + bad.map((b) => `${b.name}（实得 ${b.got}）`).join('；'));
  return checks;
}

function main() {
  const s = chapterStats();
  const secs = sectionStats();
  const tight = tightest();
  const loose = sparsest();

  console.log('═══ 第10章 神经系统：关系、层级与不给值 ═══');
  console.log(`教材第10章 · ${s.secs} 节 · ${s.units} 小节 · ${s.hanzi.toLocaleString('en-US')} 字`);
  console.log(`三视角   ${VIEWS.map((k) => `${k} ${s.views[k]}`).join(' · ')}`);
  console.log(`四层级   ${LEVELS.map((k) => `${k} ${s.levels[k]}`).join(' · ')}`);
  console.log(`数值核验 valueLike ${s.valueLike} · 阿拉伯数字 ${s.digits}（列表序号 ${s.listItems}）`);

  console.log('\n逐节密度（三视角+四层级命中 ÷ 字数 × 1000）：');
  for (const x of secs) {
    console.log(`  ${x.sec}  ${x.hanzi.toLocaleString('en-US')} 字 · ${x.hits} 命中 · ${x.density.toFixed(1)}`);
  }

  console.log(`\n最密 ${tight.locator} ${tight.title.replace(/^\S+\s*/, '')} ${tight.hits} 命中 · ${tight.density.toFixed(1)}`);
  console.log(`      其中机能 ${tight.views['机能']}、形态 ${tight.views['形态']}、代谢 ${tight.views['代谢']}`);
  console.log(`最疏 ${loose.locator} ${loose.title.replace(/^\S+\s*/, '')} ${loose.hits} 命中 · ${loose.density.toFixed(1)}`);
  console.log(`组织层命中为 0 的小节 ${organLevelGap()}/${s.units}`);
  console.log(`「不给值」类声明 ${s.decl} 处 · 每千字 ${density(s.decl, s.hanzi).toFixed(1)}`);

  console.log('\n自检：');
  for (const c of selfCheck()) console.log(`  ${c.ok ? '✓' : '✗'} ${c.name}（${c.got}）`);

  console.log('\n口径：密度只说明这一节的写法落在「类别与关系」的词表上有多密，不说明重要性；');
  console.log('     「组织」命中 0 是词表口径，不等于书里没有神经节与神经束的内容。');
  console.log('教学边界：本章只做类别与关系的转写与核验，不给数值与正常值，不构成诊断或治疗依据');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, VIEWS, LEVELS, DECL_RE, UNITS_PATH, DATA,
  unitsOf, tally, density, sectionStats, unitStats, chapterStats,
  tightest, sparsest, organLevelGap, selfCheck,
};
