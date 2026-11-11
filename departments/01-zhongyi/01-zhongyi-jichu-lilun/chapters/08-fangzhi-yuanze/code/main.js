#!/usr/bin/env node
/**
 * 中医基础理论 · 第 8 章 防治原则 → 策略选择与代价函数
 * 课程: departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/08-fangzhi-yuanze/docs/zh.md
 * 出处: 教材·第10章 防治原则（5 节 27 段）
 * 依赖: 仅 Node.js 标准库
 *
 * 四个量：
 *   1. 预防三级（未病先防 / 既病防变 / 瘥后防复）——3，齐全；
 *   2. 治则四条（治病求本 / 调整阴阳 / 扶正祛邪 / 三因制宜）——4，齐全；
 *   3. 「八法」写了八个名字，但只详述了 2 法（汗、补）——缺 6 法的释义；
 *   4. 三因制宜给的是**禁忌方向**（夏慎辛温、冬慎寒凉），不是权重——所以代价函数只能自设。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = path.join(ROOT, 'standards', 'jichu', '底本.json');
const doc = JSON.parse(fs.readFileSync(BOOK, 'utf8'));

// 教材缺口的外源补录层（不改底本）：standards/jichu/supplements/补源.json
const SUPP = path.join(ROOT, 'standards', 'jichu', 'supplements', '补源.json');
const suppDoc = fs.existsSync(SUPP) ? JSON.parse(fs.readFileSync(SUPP, 'utf8')) : { gaps: [] };

// 取本章相关的缺口补录；底本与补源分开报，绝不合并成「底本有 N 条」
function supplements() {
  return suppDoc.gaps
    .filter((g) => g.chapter === '08-fangzhi-yuanze')
    .map((g) => ({
      id: g.id,
      name: g.name,
      declared: g.declared,
      supplied: g.found,
      source: g.items.length ? g.items[0].src : '',
      // 八法这类条目 hans 是法名、hans_excerpt 才是释义；释义优先
      items: g.items.map((x) => x.hans_excerpt || x.hans || x.hant),
    }));
}

function chapter(no) {
  return doc.chapters.find((c) => c.no === no);
}

const CH10 = chapter('10');
const SUBS = {};
for (const s of CH10.secs) for (const sub of s.subs) SUBS[sub.no] = sub;

function textOf(no) {
  return (SUBS[no] ? SUBS[no].paras : []).join('');
}

const T10 = CH10.secs.map((s) => `${s.title}${s.paras.join('')}${s.subs.map((x) => `${x.title}${x.paras.join('')}`).join('')}`).join('');

// ── 1. 三层结构 ─────────────────────────────────────────────
function levels() {
  const preventive = ['未病先防', '既病防变', '瘥后防复'].filter((w) => T10.includes(w));
  const principles = ['治病求本', '调整阴阳', '扶正祛邪', '三因制宜'].filter((w) => T10.includes(w));
  return {
    preventive,
    principles,
    // 治病求本下面分正治/反治——反治再用「热因热用/寒因寒用」举例
    zhengzhi: /正治是逆其证候性质而治/.test(textOf('10.2.1')),
    fanzhi: /反治是顺从疾病假象而治/.test(textOf('10.2.1')),
    fanzhiExamples: ['热因热用', '寒因寒用'].filter((w) => T10.includes(w)),
    missingFanzhi: ['塞因塞用', '通因通用'].filter((w) => !T10.includes(w)),
    secs: CH10.secs.map((s) => `${s.no} ${s.title}（${s.subs.length} 小节）`),
  };
}

// ── 2. 八法：八个名字，几法有释义？───────────────────────────
const EIGHT = ['汗', '吐', '下', '和', '温', '清', '补', '消'];
const TITLE_10_3_1 = (SUBS['10.3.1'] || { title: '' }).title;

function eightMethods() {
  const titleHas = EIGHT.join('') === '汗吐下和温清补消' && /汗、吐、下、和、温、清、补、消/.test(TITLE_10_3_1);
  const described = EIGHT.filter((ch) => new RegExp(`\\n?${ch}法(通过|针对|是)`).test(textOf('10.3.1')) || new RegExp(`${ch}法(通过|针对)`).test(textOf('10.3.1')));
  return {
    names: EIGHT,
    titleHas,
    described,
    missing: EIGHT.filter((x) => !described.includes(x)),
  };
}

function combos() {
  const t = textOf('10.3.2');
  const out = [];
  // 只认「八法两两组合 + 方名」这一种写法，避免把整句当 mode
  for (const m of t.matchAll(/([汗吐下和温清补消]{2})并用（([^）]{2,6})）/g)) out.push({ mode: m[1], formula: m[2] });
  for (const m of t.matchAll(/([汗吐下和温清补消攻兼施]{2})兼施（([^）]{2,6})）/g)) out.push({ mode: m[1], formula: m[2] });
  return out;
}

// ── 3. 三因制宜给的是方向，不是权重 ───────────────────────────
function constraints() {
  const t = textOf('10.2.4');
  const rules = [];
  if (/夏季炎热[^。]*慎用辛温/.test(t)) rules.push({ season: '夏', forbid: '辛温发散', reason: '腠理开泄' });
  if (/冬季寒冷[^。]*慎用寒凉/.test(t)) rules.push({ season: '冬', forbid: '寒凉伤阳', reason: '腠理致密' });
  return rules;
}

// ── 4. 代价函数：策略 × 三种代价。系数全为自设，教材无权重 ────
const STRATEGIES = [
  { name: '辛温发汗', gan: -0.6, jin: -0.5, zheng: -0.2 },
  { name: '苦寒直折', gan: -0.1, jin: -0.4, zheng: -0.3 },
  { name: '甘寒养阴', gan: -0.2, jin: +0.5, zheng: -0.1 },
  { name: '温阳益气', gan: +0.7, jin: -0.2, zheng: -0.1 },
];

function costTable(weights = { gan: 1, jin: 1, zheng: 1 }) {
  return STRATEGIES.map((s) => ({
    name: s.name,
    score: +(weights.gan * s.gan + weights.jin * s.jin + weights.zheng * s.zheng).toFixed(3),
    parts: s,
  })).sort((a, b) => b.score - a.score);
}

function main() {
  const lv = levels();
  const em = eightMethods();
  const cb = combos();
  const cs = constraints();
  const table = costTable();

  console.log('═══ 三层结构（教材·第10章，5 节 27 段）═══');
  console.log(`  预防 ${lv.preventive.length} 级：${lv.preventive.join(' · ')}`);
  console.log(`  治则 ${lv.principles.length} 条：${lv.principles.join(' · ')}`);
  console.log(`  治病求本下：正治 ${lv.zhengzhi ? '有' : '无'} · 反治 ${lv.fanzhi ? '有' : '无'}（举例 ${lv.fanzhiExamples.join(' / ')}）`);
  console.log(`  反治缺：${lv.missingFanzhi.join(' / ') || '无'}（教材只给两法）`);
  for (const s of lv.secs) console.log(`    ${s}`);
  console.log('');
  console.log(`═══ 八法：名字 ${em.names.length} 个，有释义 ${em.described.length} 法 ═══`);
  console.log(`  小节标题：${TITLE_10_3_1}`);
  console.log(`  有释义：${em.described.map((x) => x + '法').join(' · ') || '无'}`);
  console.log(`  无释义：${em.missing.map((x) => x + '法').join(' · ')}（连一句定义都没有）`);
  console.log('  → 「八法」在教材里是八个字，不是八段内容；缺的六法不能凭通行教材补。');
  console.log('');
  console.log(`═══ 八法组合 ${cb.length} 组 ═══`);
  for (const c of cb) console.log(`  ${c.mode}（${c.formula}）`);
  console.log('');
  console.log(`═══ 三因制宜：${cs.length} 条方向性约束（不是权重）═══`);
  for (const r of cs) console.log(`  ${r.season}季：慎用${r.forbid}（因${r.reason}）`);
  console.log('');
  console.log('═══ 代价函数试写（系数自设，教材无权重）═══');
  for (const r of table) {
    console.log(`  ${r.name}：${r.score}   [耗气 ${r.parts.gan} · 伤津 ${r.parts.jin} · 伤正 ${r.parts.zheng}]`);
  }
  console.log(`  最优：${table[0].name}（分数 ${table[0].score}）`);
  console.log('  → 换个权重排序就变；教材只给方向（夏慎辛温、冬慎寒凉），没有给任何系数。');
  console.log('');
  const sp = supplements();
  if (sp.length) {
    console.log('═══ 教材缺口的外源补录（不改底本）═══');
    for (const g of sp) console.log(`  ${g.name}：外源补 ${g.supplied}/${g.declared} 条 ← ${g.source}`);
    console.log('  → 底本 327 段 / 45,199 字不含这些条；分账见 standards/jichu/supplements/README.md');
    console.log('');
  }

  console.log('教学边界：本章只把教材的治则治法整理成可比较的形式，不推荐任何治法方药；不构成诊疗依据。');
}

if (require.main === module) main();

module.exports = { supplements, levels, eightMethods, combos, constraints, costTable, STRATEGIES, EIGHT, doc };
