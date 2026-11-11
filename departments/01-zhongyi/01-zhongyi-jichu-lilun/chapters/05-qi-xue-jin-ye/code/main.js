#!/usr/bin/env node
/**
 * 中医基础理论 · 第 5 章 气血津液 → 状态向量与守恒约束
 * 课程: departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/05-qi-xue-jin-ye/docs/zh.md
 * 出处: 教材·第4章 精气血津液神（4.1–4.6，standards/jichu/底本.json）
 * 依赖: 仅 Node.js 标准库
 *
 * 这章做三件事：
 *   1. 把「精、气、血、津液、神」五个概念的节/段规模量出来；
 *   2. 把 4.6 节讲的关系抽成**有方向的边**（气→血、血→气、气→津、津→气）；
 *   3. 用一张模拟状态表试写「守恒」——并诚实报出：教材没给守恒量，只给了方向。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = path.join(ROOT, 'standards', 'jichu', '底本.json');
const doc = JSON.parse(fs.readFileSync(BOOK, 'utf8'));

const CONCEPTS = [
  { key: 'jing', name: '精', sec: '4.1' },
  { key: 'qi', name: '气', sec: '4.2' },
  { key: 'xue', name: '血', sec: '4.3' },
  { key: 'jinye', name: '津液', sec: '4.4' },
  { key: 'shen', name: '神', sec: '4.5' },
];

function chapter(no) {
  return doc.chapters.find((c) => c.no === no);
}

function sec(no) {
  const c = chapter(no.split('.')[0]);
  return c.secs.find((s) => s.no === no);
}

function secParas(s) {
  const out = [...s.paras];
  for (const sub of s.subs) out.push(...sub.paras);
  return out;
}

// ── 1. 概念规模 ─────────────────────────────────────────────
function concepts() {
  return CONCEPTS.map((c) => {
    const s = sec(c.sec);
    const ps = secParas(s);
    return {
      key: c.key,
      name: c.name,
      sec: c.sec,
      title: s.title,
      subs: s.subs.length,
      paras: ps.length,
      chars: ps.reduce((n, p) => n + p.length, 0),
    };
  });
}

// ── 2. 关系抽边：只认教材写出来的「A能X B」句式 ───────────────
// 句式：「气能生血」「气能行血」「气能摄血」「血为气之母」「精血同源」…
// 不自己补教材没有的关系，宁可少边。
const RE_QI_TO_BLOOD = /气能(生血|行血|摄血)/g;
const RE_QI_TO_JIN = /气能(促进津液生成|推动津液输布|固摄津液排泄)/g;

function relations() {
  const a = secParas(sec('4.6')).join('');
  const edges = [];
  for (const m of a.matchAll(RE_QI_TO_BLOOD)) edges.push({ from: '气', to: '血', label: m[0], sec: '4.6.1' });
  for (const m of a.matchAll(RE_QI_TO_JIN)) edges.push({ from: '气', to: '津液', label: m[0], sec: '4.6.2' });
  // 反向：血/津液 → 气（教材原句「血是气的载体」「津液是气的重要来源之一」）
  if (/血是气的载体/.test(a)) edges.push({ from: '血', to: '气', label: '血为气之母', sec: '4.6.1' });
  if (/津液是气的重要来源之一/.test(a)) edges.push({ from: '津液', to: '气', label: '津液载气', sec: '4.6.2' });
  // 精血同源在 4.3 节
  if (/精血同源/.test(secParas(sec('4.3')).join(''))) edges.push({ from: '精', to: '血', label: '精血同源', sec: '4.3.1' });
  return edges;
}

function graph() {
  const e = relations();
  const nodes = [...new Set(e.flatMap((x) => [x.from, x.to]))];
  const adj = {};
  for (const n of nodes) adj[n] = [];
  for (const x of e) adj[x.from].push(x.to);
  return { edges: e, nodes, adj };
}

// ── 3. 守恒：教材给了方向，没给量 ─────────────────────────────
// 用最简单的代理量做一次 12 步推演：气推动生血、血载气、津液载气。
// 目的不是算准，而是暴露「没有守恒量」这件事：
//   任何系数都是我们编的，教材只保证「气不足 → 血不足」这个单调方向。
function simulate({ qi = 1, xue = 1, jinye = 1, steps = 12 } = {}) {
  const rows = [];
  let q = qi;
  let x = xue;
  let j = jinye;
  for (let t = 0; t <= steps; t += 1) {
    rows.push({ t, qi: +q.toFixed(4), xue: +x.toFixed(4), jinye: +j.toFixed(4), total: +(q + x + j).toFixed(4) });
    // 生血依赖气；血载气；津液载气；每步自然消耗
    const born = 0.12 * q;
    const carried = 0.05 * x + 0.03 * j;
    q = q - 0.10 + carried * 0.5;
    x = x - 0.08 + born;
    j = j - 0.06 + 0.02;
  }
  const first = rows[0].total;
  const last = rows[rows.length - 1].total;
  return { rows, drift: last - first };
}

// ── 4. 截断检测：教材原文在哪些段落断掉 ───────────────────────
// 4.6.1 首条以「…气虚」结尾，没有下文——这是工作簿单元格被截断的痕迹。
function truncated() {
  const out = [];
  for (const c of doc.chapters) {
    for (const s of c.secs) {
      for (const sub of s.subs) {
        for (const p of sub.paras) {
          if (!/[。！？；」』）]$/.test(p.trim())) {
            out.push({ ch: c.no, sec: sub.no, tail: p.slice(-28), len: p.length });
          }
        }
      }
    }
  }
  return out;
}

function main() {
  const cs = concepts();
  const g = graph();
  const sim = simulate();
  const tr = truncated();

  console.log('═══ 五个概念的规模（教材·第4章）═══');
  for (const c of cs) {
    console.log(`  ${c.name}（${c.sec} ${c.title}）：${c.subs} 小节 · ${c.paras} 段 · ${c.chars} 字`);
  }
  console.log(`  合计 ${cs.reduce((n, c) => n + c.paras, 0)} 段 · ${cs.reduce((n, c) => n + c.chars, 0)} 字`);
  console.log('');
  console.log('═══ 关系图（只收教材写出来的句子）═══');
  for (const e of g.edges) console.log(`  ${e.from} → ${e.to}  「${e.label}」（${e.sec}）`);
  console.log(`  节点 ${g.nodes.length} · 边 ${g.edges.length} · 双向边 ${g.edges.filter((e) => g.edges.some((f) => f.from === e.to && f.to === e.from)).length}`);
  console.log('');
  console.log('═══ 守恒试写（12 步，代理量）═══');
  console.log('  t   气     血     津液   合计');
  for (const r of sim.rows) console.log(`  ${String(r.t).padEnd(3)} ${r.qi.toFixed(3)}  ${r.xue.toFixed(3)}  ${r.jinye.toFixed(3)}  ${r.total.toFixed(3)}`);
  console.log(`  总量漂移 ${sim.drift.toFixed(3)} → 系数是本章自设的，教材没有守恒量。`);
  console.log('  教材能保证的只有方向：气不足则血不足（气能生血）、血不足则气衰（血为气之母）。');
  console.log('');
  console.log(`═══ 原文截断 ${tr.length} 处（工作簿单元格断句）═══`);
  for (const x of tr) console.log(`  第${x.ch}章 ${x.sec}（${x.len} 字）… ${x.tail}`);
  console.log('');
  console.log('教学边界：本章只演示概念关系的表示方式，不评估任何人的气血状态，不构成诊疗依据。');
}

if (require.main === module) main();

module.exports = { concepts, relations, graph, simulate, truncated, doc, CONCEPTS };
