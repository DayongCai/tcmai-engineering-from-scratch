#!/usr/bin/env node
/**
 * 中医基础理论 · 第 10 章 中医思维方法：形式化能做到与做不到的
 * 课程: departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/10-siwei-fangfa/docs/zh.md
 * 出处: 教材·第2章 哲学基础与思维方法（4 节 20 段）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章用两张图说话：
 *   1. 五行的**关系**完全可形式化：相生是一个 5-环，相克是另一个 5-环（五角星），两图同构；
 *   2. 五行的**内容**没有全表：教材只写七类（五方/五季/五气/五味/五脏/五体/五官），
 *      每类的五个值并未列全，只给举例（春季属木、面青喜酸脉弦）。
 * 所以：能建图、不能建表。这条界线就是「形式化能做到与做不到」的具体位置。
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
    .filter((g) => g.chapter === '10-siwei-fangfa')
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

const CH2 = chapter('2');
const SUBS = {};
for (const s of CH2.secs) for (const sub of s.subs) SUBS[sub.no] = sub;

function t(no) {
  return SUBS[no] ? SUBS[no].paras.join('') : '';
}

const XING = ['木', '火', '土', '金', '水'];

// ── 1. 五个特性：逐字核对「曰」与「爰」 ─────────────────────
// 注意教材用的是「土爰稼穑」，不是「土曰稼穑」——这一字之差是原文，不能统一改。
const TRAITS = [
  { xing: '木', verb: '曰', word: '曲直', sense: '生长、升发、条达' },
  { xing: '火', verb: '曰', word: '炎上', sense: '温热、升腾' },
  { xing: '土', verb: '爰', word: '稼穑', sense: '生化、承载、受纳' },
  { xing: '金', verb: '曰', word: '从革', sense: '沉降、肃杀、收敛' },
  { xing: '水', verb: '曰', word: '润下', sense: '寒凉、滋润、下行' },
];

function traits() {
  const src = t('2.3.1');
  return TRAITS.map((x) => ({
    ...x,
    verbatim: `${x.xing}${x.verb}${x.word}`,
    inText: src.includes(`${x.xing}${x.verb}${x.word}`),
  }));
}

// ── 2. 相生相克：两个 5-环 ─────────────────────────────────
function sheng() {
  const src = t('2.3.2');
  const m = src.match(/五行相生指([^，。；]+)/);
  const chain = m ? m[1].split(/[、，]/).map((s) => s.trim()).filter(Boolean) : [];
  return { chain, edges: chain.filter((s) => /^[木火土金水]生[木火土金水]$/.test(s.trim())).map((s) => s.trim().replace('生', '→')), n: chain.length };
}

function ke() {
  const src = t('2.3.2');
  const m = src.match(/相克指([^，。；]+)/);
  const chain = m ? m[1].split(/[、，]/).map((s) => s.trim()).filter(Boolean) : [];
  return { chain, edges: chain.filter((s) => /^[木火土金水]克[木火土金水]$/.test(s.trim())).map((s) => s.trim().replace('克', '→')), n: chain.length };
}

// 图结构：出度、入度、环长
function graphShape(edges) {
  const out = {};
  const inn = {};
  for (const x of XING) {
    out[x] = 0;
    inn[x] = 0;
  }
  for (const e of edges) {
    const [a, b] = e.split('→');
    if (out[a] === undefined || inn[b] === undefined) continue;
    out[a] += 1;
    inn[b] += 1;
  }
  return { out, inn, cycle: XING.length };
}

// 两图是否同构：这里两图都是 5-环，节点度序列相同即同构（5 环是唯一结构）
function isomorphic() {
  const a = graphShape(sheng().edges);
  const b = graphShape(ke().edges);
  const degA = XING.map((x) => `${a.out[x]}/${a.inn[x]}`).sort();
  const degB = XING.map((x) => `${b.out[x]}/${b.inn[x]}`).sort();
  return { sameDegreeSeq: JSON.stringify(degA) === JSON.stringify(degB), degA, degB };
}

// ── 3. 归类：七类名有，值不全 ───────────────────────────────
const CATS = ['五方', '五季', '五气', '五味', '五脏', '五体', '五官'];

function categories() {
  const src = t('2.3.3') + t('2.3.1');
  const named = CATS.filter((c) => src.includes(c));
  // 教材里出现的具体归类实例（举例，不是全表）
  const instances = [];
  if (/春季属木/.test(src)) instances.push({ cat: '五季', value: '春', xing: '木' });
  if (/风气主令/.test(src)) instances.push({ cat: '五气', value: '风', xing: '木' });
  if (/面见青色[^。]*喜食酸味[^。]*脉弦/.test(src)) instances.push({ cat: '五色/五味/脉', value: '青·酸·弦', xing: '木' });
  if (/肝合胆、主筋、开窍于目/.test(src)) instances.push({ cat: '五体/五官', value: '筋·目', xing: '木' });
  return { named, nNamed: named.length, instances, fullTable: instances.length >= 7 };
}

// ── 4. 思维方法的两个名字 + 两个谬误 ────────────────────────
function methods() {
  const src = t('2.3.1') + t('2.4.1') + t('2.4.2');
  const names = ['取象比类', '推演络绎'].filter((w) => src.includes(w));
  const errors = ['机械类比', '以偏概全'].filter((w) => src.includes(w));
  return { names, errors };
}

function main() {
  const tr = traits();
  const sh = sheng();
  const keG = ke();
  const iso = isomorphic();
  const cat = categories();
  const me = methods();

  console.log('═══ 五行五特性（教材·第2章·2.3.1）═══');
  for (const x of tr) console.log(`  ${x.verbatim}（${x.sense}）${x.inText ? '' : '  ← 原文未命中'}`);
  console.log(`  注意「土爰稼穑」用「爰」而非「曰」：5 条里 4 条「曰」、1 条「爰」。`);
  console.log('');
  console.log('═══ 相生：一个 5-环 ═══');
  console.log(`  ${sh.chain.join(' · ')}（${sh.n} 边）`);
  const gs = graphShape(sh.edges);
  console.log(`  每节点出度 ${Object.values(gs.out)[0]}、入度 ${Object.values(gs.inn)[0]}；环长 ${gs.cycle}`);
  console.log('');
  console.log('═══ 相克：另一个 5-环 ═══');
  console.log(`  ${keG.chain.join(' · ')}（${keG.n} 边）`);
  const gk = graphShape(keG.edges);
  console.log(`  每节点出度 ${Object.values(gk.out)[0]}、入度 ${Object.values(gk.inn)[0]}；环长 ${gk.cycle}`);
  console.log('');
  console.log('═══ 两图同构？（这是「能形式化」的部分）═══');
  console.log(`  度序列 生 ${iso.degA.join(' ')} / 克 ${iso.degB.join(' ')} → 同构：${iso.sameDegreeSeq ? '是' : '否'}`);
  console.log('  → 相生与相克在**结构**上是同一个 5-环；差异全在边的语义，不在图论形状。');
  console.log('  → 所以「五行生克可以画成图、可以算环、可以查传递闭包」，这部分完全可形式化。');
  console.log('');
  console.log('═══ 归类七类：名有、值不全（这是「不能形式化」的部分）═══');
  console.log(`  提到 ${cat.nNamed} 类：${cat.named.join(' ')}`);
  console.log(`  教材给出的具体归类实例只有 ${cat.instances.length} 条：`);
  for (const i of cat.instances) console.log(`    ${i.cat} → ${i.value} → ${i.xing}`);
  console.log(`  是否有完整 7×5 表：${cat.fullTable ? '有' : '没有'}`);
  console.log('  → 想建「五方/五季/五气/五味/五脏/五体/五官 × 五行」的 35 格表，教材只填了 4 格；');
  console.log('    其余 31 格必须另找出处（《素问·阴阳应象大论》有表），不能凭常识补。');
  console.log('');
  console.log(`═══ 思维方法 ${me.names.length} 个 · 谬误 ${me.errors.length} 类 ═══`);
  console.log(`  方法：${me.names.join(' · ')}`);
  console.log(`  谬误：${me.errors.join(' · ')}`);
  console.log('');
  const sp = supplements();
  if (sp.length) {
    console.log('═══ 教材缺口的外源补录（不改底本）═══');
    for (const g of sp) console.log(`  ${g.name}：外源补 ${g.supplied}/${g.declared} 条 ← ${g.source}`);
    console.log('  → 底本 327 段 / 45,199 字不含这些条；分账见 standards/jichu/supplements/README.md');
    console.log('');
  }

  console.log('教学边界：本章只分析教材思维方法的形式化边界，不提供任何辨证、治法或养生建议；不构成诊疗依据。');
}

if (require.main === module) main();

module.exports = { supplements, traits, sheng, ke, graphShape, isomorphic, categories, methods, TRAITS, XING, CATS, doc };
