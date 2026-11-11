#!/usr/bin/env node
/**
 * 方剂学 · 第 2 章 君臣佐使：组方的角色结构
 * 课程: departments/02-zhongyao/03-fangjixue/chapters/02-junchen-zuoshi/docs/zh.md
 * 出处: 教材·第3章·3.1（组方原则）与 3.2（组成变化）
 * 数据: standards/fangji/formulas.json（每方 roles + roleEvidence + 六段全文）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么这一章的数字必须现算：君臣佐使不是教材的统一标注，而是从三种写法
 * （「君药：熟地黄…」／「故为君药」／「臣以桂枝」）里抽出来的。抽取有边界，
 * 边界必须能被看见——所以程序既打印「有君药的方有多少」，也打印「教材明明
 * 写了『并为君药』、数据层却只剩一味」的方有多少。后者是这套数据真正欠的账。
 *
 * 抽不到的一律留空，不按「用量最大者」「排在第一位者」代填。代填出来的
 * 君药会让下游所有统计看起来更整齐，也更假。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/02-zhongyao/03-fangjixue/chapters/<slug>/code
// 不硬数 ../ 的层数（数错一次就 ENOENT），改为向上找到带 standards/fangji 的那一级
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 10; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'fangji', 'formulas.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/fangji/formulas.json —— 章节目录是否已脱离仓库？');
}
const ROOT = findRoot(__dirname);
const FANGJI = path.join(ROOT, 'standards', 'fangji');

const ROLES = [
  { key: '君', label: '君药', duty: '针对主病主证起主要治疗作用，定全方方向' },
  { key: '臣', label: '臣药', duty: '助君加强主病主证，或主重要兼证' },
  { key: '佐', label: '佐药', duty: '佐助、佐制、反佐' },
  { key: '使', label: '使药', duty: '引经报使、调和诸药' },
];

const load = () => JSON.parse(fs.readFileSync(path.join(FANGJI, 'formulas.json'), 'utf8'));
const loadBase = () => JSON.parse(fs.readFileSync(path.join(FANGJI, '底本.json'), 'utf8'));

/** 教材章汉字数：读底本 counts，不估读、不写死 */
function chapterHanzi(no) {
  const base = loadBase();
  const c = base.chapters.find((x) => x.no === String(no));
  if (!c) throw new Error(`底本里没有第 ${no} 章`);
  return c.counts.hanzi;
}

/** 某角色被抽到的方数（数组为空即视为「抽不到」，不计入） */
function roleCoverage(fj, key) {
  const hits = fj.formulas.filter((f) => (f.roles[key] || []).length > 0);
  return { n: hits.length, pct: hits.length / fj.formulas.length, names: hits.map((f) => f.name) };
}

/** 角色齐备度：数的是「有几种角色」，不是「有几味药」 */
function rolesPerFormula(fj) {
  return fj.formulas.map((f) => ({
    name: f.name,
    k: ROLES.filter((r) => (f.roles[r.key] || []).length > 0).length,
  }));
}

const atLeast3 = (fj) => rolesPerFormula(fj).filter((x) => x.k >= 3).length;
const allFour = (fj) => rolesPerFormula(fj).filter((x) => x.k === 4).length;

/** 抽不到君药的方：留空，不猜。返回方名清单（不是替代药名） */
function withoutJun(fj) {
  return fj.formulas.filter((f) => (f.roles['君'] || []).length === 0).map((f) => f.name);
}

/** 一药兼数职：同一味药在同一方里被抽到两个以上角色 */
function multiRole(fj) {
  const out = [];
  for (const f of fj.formulas) {
    const seen = new Map();
    for (const r of ROLES) {
      for (const h of f.roles[r.key] || []) {
        if (seen.has(h)) seen.set(h, `${seen.get(h)}/${r.key}`);
        else seen.set(h, r.key);
      }
    }
    const dup = [...seen.entries()].filter(([, v]) => v.includes('/'));
    if (dup.length) out.push({ name: f.name, herbs: dup });
  }
  return out;
}

/**
 * 抽取边界：教材写「麻黄、桂枝并为君药」的方，数据层只留下第一味。
 * 判据用方解原文里的「并为君药／共为君药」这类并列说法，再看 roles.君 的长度。
 * 这不是 bug 清单，是引用时必须声明的口径。
 */
function truncatedJun(fj) {
  const re = /并为君药|共为君药|俱为君药|二药.{0,6}为君/;
  return fj.formulas
    .filter((f) => re.test(f.parts['方解与配伍'] || '') && (f.roles['君'] || []).length === 1)
    .map((f) => ({ name: f.name, kept: f.roles['君'][0] }));
}

/** 两方逐角色对照：同一味药在不同层次，方的作用方向随之改变 */
function compareRoles(fj, a, b) {
  const get = (n) => fj.formulas.find((f) => f.name === n);
  const fa = get(a);
  const fb = get(b);
  return ROLES.map((r) => ({
    role: r.label,
    a: (fa.roles[r.key] || []).join('、') || '（空）',
    b: (fb.roles[r.key] || []).join('、') || '（空）',
  }));
}

function main() {
  const fj = load();
  const total = fj.formulas.length;
  const slots = fj.formulas.reduce((n, f) => n + (f.composition.herbs || []).length, 0);

  console.log('═══ 君臣佐使：组方的角色结构 (方剂学 第2章) ═══');
  console.log(`教材规模: 第3章 ${chapterHanzi(3)} 字 | 方剂层: ${total} 首 | 药位 ${slots} 个 | 平均每方 ${(slots / total).toFixed(2)} 味`);

  console.log('\n角色覆盖（分母恒为 114，抽不到的方留在分母里）');
  for (const r of ROLES) {
    const c = roleCoverage(fj, r.key);
    console.log(`  ${r.label} ${String(c.n).padStart(3)}/${total} (${((c.n / total) * 100).toFixed(1)}%) · ${r.duty}`);
  }

  const k3 = atLeast3(fj);
  const k4 = allFour(fj);
  const avgK = (rolesPerFormula(fj).reduce((n, x) => n + x.k, 0) / total).toFixed(2);
  console.log(`\n齐备度: 三角色以上 ${k3}/${total} | 四角色齐 ${k4}/${total} | 平均 ${avgK} 种角色/方`);

  const noJun = withoutJun(fj);
  console.log(`\n抽不到君药: ${noJun.length} 首 → 留空（不按用量最大者代填）`);
  console.log(`  ${noJun.join('、')}`);

  const multi = multiRole(fj);
  console.log(`\n一药兼数职: ${multi.length} 方（教材「一药可兼数职」在数据里是可数的）`);
  for (const m of multi) {
    console.log(`  ${m.name}: ${m.herbs.map(([h, v]) => `${h}(${v})`).join('、')}`);
  }

  const trunc = truncatedJun(fj);
  console.log(`\n抽取边界: ${trunc.length} 首方的方解写了并列君药，数据层只保留第一味`);
  for (const t of trunc.slice(0, 6)) console.log(`  ${t.name} → 君: ${t.kept}`);
  console.log('  （其余同例；引用君药时须注明「抽取首条」，不得当作教材的唯一君药）');

  console.log('\n同法两方的角色对照: 麻黄汤 vs 桂枝汤（教材·第3章·3.1.2）');
  const cmp = compareRoles(fj, '麻黄汤', '桂枝汤');
  console.log('  角色   麻黄汤        桂枝汤');
  for (const row of cmp) console.log(`  ${row.role}   ${row.a.padEnd(12)}  ${row.b}`);

  console.log('\n教学边界：本章角色均由教材方解抽取，抽不到即留空；角色结构用于析方与教学，不构成诊断/用药依据');

  return { total, slots, k3, k4, noJun, multi, trunc, cmp };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROLES,
  findRoot,
  load,
  loadBase,
  chapterHanzi,
  roleCoverage,
  rolesPerFormula,
  atLeast3,
  allFour,
  withoutJun,
  multiRole,
  truncatedJun,
  compareRoles,
  main,
};
