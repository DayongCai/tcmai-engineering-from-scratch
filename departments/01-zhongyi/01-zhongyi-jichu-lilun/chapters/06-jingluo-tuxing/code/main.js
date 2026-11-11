#!/usr/bin/env node
/**
 * 中医基础理论 · 第 6 章 经络学说 → 图上的路径与可及性
 * 课程: departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/06-jingluo-tuxing/docs/zh.md
 * 出处: 教材·第5章 经络系统（5.2.3 流注次序为骨，5.3 奇经为附）
 * 依赖: 仅 Node.js 标准库
 *
 * 三个量：
 *   1. 十二经流注是一条**环**（12 节点、12 边），于是任意两经有「顺行距离」与「最短距离」两个值；
 *   2. 十二时辰与十二经是**一一对应**（寅→肺 起、丑→肝 止），中间十个由地支顺序推得；
 *   3. 奇经「八脉」在教材里只写出了四脉——这是缺口，不是本章漏抽。
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
    .filter((g) => g.chapter === '06-jingluo-tuxing')
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

function chapterText(no) {
  const c = chapter(no);
  const parts = [...(c.paras || [])];
  for (const s of c.secs) {
    parts.push(s.title, ...s.paras);
    for (const sub of s.subs) parts.push(sub.title, ...sub.paras);
  }
  return parts.join('\n');
}

const CH5 = chapterText('5');

// ── 1. 流注环：从 5.2.3 原文的「→」链解析，不手抄 ─────────────
function cycle() {
  const m = CH5.match(/依次相传：([^，。]+)/);
  if (!m) throw new Error('教材 5.2.3 找不到「依次相传：」链');
  const names = m[1].split('→').map((s) => s.trim()).filter(Boolean);
  return {
    names,
    n: names.length,
    start: '肺经',
    end: '肝经',
    edges: names.map((v, i) => [v, names[(i + 1) % names.length]]),
    verbatim: m[1],
  };
}

// ── 2. 全称与属性：手足 × 阴阳 × 脏腑，全部从名称解析 ─────────
const FULL_RE = /(手|足)(太阴|少阴|厥阴|太阳|阳明|少阳)([肺心包心大肠小肠胃脾膀胱肾三焦胆肝]+)经/g;

function fullNames() {
  const all = [...CH5.matchAll(FULL_RE)].map((m) => m[0]);
  return [...new Set(all)];
}

function attributes() {
  const rows = fullNames().map((name) => {
    const m = name.match(/(手|足)(太阴|少阴|厥阴|太阳|阳明|少阳)(.+)经/);
    const limb = m[1];
    const yy = m[2];
    const organ = m[3];
    return { name, limb, yy, organ, yin: /阴/.test(yy) ? '阴' : '阳' };
  });
  const tally = {};
  for (const r of rows) {
    const k = `${r.limb}三${r.yin}`;
    tally[k] = (tally[k] || 0) + 1;
  }
  return { rows, tally };
}

// ── 3. 时辰：教材只给起点（寅）与终点（丑），中间按地支顺序推得 ──
const ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const HOURS = {
  子: '23-1', 丑: '1-3', 寅: '3-5', 卯: '5-7', 辰: '7-9', 巳: '9-11',
  午: '11-13', 未: '13-15', 申: '15-17', 酉: '17-19', 戌: '19-21', 亥: '21-23',
};

function shichen() {
  const c = cycle();
  const startIdx = ZHI.indexOf('寅'); // 教材原文：始于寅时…手太阴肺经
  return c.names.map((name, i) => {
    const zhi = ZHI[(startIdx + i) % 12];
    return { i, zhi, hours: HOURS[zhi], meridian: name };
  });
}

// ── 4. 环上的两个距离 ───────────────────────────────────────
function distances(from = '肺经') {
  const c = cycle();
  const a = c.names.indexOf(from);
  if (a < 0) throw new Error(`无此经：${from}`);
  return c.names.map((to, b) => {
    const fwd = (b - a + c.n + c.n) % c.n;
    return { to, forward: fwd, shortest: Math.min(fwd, c.n - fwd) };
  });
}

function diameter() {
  const c = cycle();
  let max = 0;
  for (const a of c.names) for (const b of c.names) {
    const ia = c.names.indexOf(a);
    const ib = c.names.indexOf(b);
    const d = (ib - ia + c.n) % c.n;
    max = Math.max(max, Math.min(d, c.n - d));
  }
  return max;
}

// ── 5. 奇经：教材说「八脉」，实际只写出四脉 ────────────────────
const QIJING_NAMED = ['督脉', '任脉', '冲脉', '带脉'];

function qijing() {
  const found = QIJING_NAMED.filter((m) => CH5.includes(m));
  const missing = ['阴维脉', '阳维脉', '阴跷脉', '阳跷脉'].filter((m) => !CH5.includes(m));
  return { declared: 8, named: found, missing, gap: 8 - found.length };
}

function main() {
  const c = cycle();
  const at = attributes();
  const sc = shichen();
  const d = distances('肺经');
  const q = qijing();

  console.log('═══ 十二经流注：一条环 ═══');
  console.log(`  ${c.names.join(' → ')} → （复始）`);
  console.log(`  节点 ${c.n} · 边 ${c.edges.length} · 起点「${c.start}」终点「${c.end}」· 原文照录 ${c.verbatim.length} 字`);
  console.log('');
  console.log('═══ 属性解析（从全称里读，不查表）═══');
  console.log(`  出现的全称 ${at.rows.length} 个：${at.rows.map((r) => r.name).join(' ')}`);
  for (const [k, v] of Object.entries(at.tally)) console.log(`  ${k}：${v}`);
  console.log('');
  console.log('═══ 十二时辰（寅起、丑止，中间按地支顺序推得）═══');
  console.log('  ' + sc.map((x) => `${x.zhi}(${x.hours})${x.meridian}`).join('  '));
  console.log('');
  console.log('═══ 从「肺经」出发的距离 ═══');
  console.log('  顺行距离 / 最短距离：');
  console.log('  ' + d.map((x) => `${x.to} ${x.forward}/${x.shortest}`).join('  '));
  console.log(`  环的直径 = ${diameter()}（12 节点环：最远要跨 6 步）`);
  console.log('  → 「顺行」是气血流注方向（教材 5.2.3），「最短」是图上可及性；两个数不是一回事。');
  console.log('');
  console.log(`═══ 奇经八脉：声称 ${q.declared} 脉，写出 ${q.named.length} 脉 ═══`);
  console.log(`  写出：${q.named.join(' · ')}`);
  console.log(`  未写：${q.missing.join(' · ')}（缺 ${q.gap} 脉）`);
  console.log('  → 教材标题写「奇经八脉」，正文只详说督任冲带；剩下四脉连名字都没出现，不能替它补。');
  console.log('');
  const sp = supplements();
  if (sp.length) {
    console.log('═══ 教材缺口的外源补录（不改底本）═══');
    for (const g of sp) console.log(`  ${g.name}：外源补 ${g.supplied}/${g.declared} 条 ← ${g.source}`);
    console.log('  → 底本 327 段 / 45,199 字不含这些条；分账见 standards/jichu/supplements/README.md');
    console.log('');
  }

  console.log('教学边界：本章只对教材的经络结构做图论描述，不用于取穴、针刺或任何治疗决策；不构成诊疗依据。');
}

if (require.main === module) main();

module.exports = { supplements, cycle, fullNames, attributes, shichen, distances, diameter, qijing, chapterText, doc, ZHI };
