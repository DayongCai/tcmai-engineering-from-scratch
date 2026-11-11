#!/usr/bin/env node
/**
 * 中医诊断学 · 第 2 章 望诊：神色形态 → 图像特征
 * 课程: departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/02-wangzhen-shense/docs/zh.md
 * 出处: 教材·第2章 望诊（4 节 11 小节 24 段 2,812 字）
 * 依赖: 仅 Node.js 标准库
 *
 * 望诊是全书最厚的一章（2,812 字 / 12.7%）。本章把它拆成可数的维度：
 *   望神 5 态、五色 5 色、小儿指纹 4 观察项、排出物 2 类。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = path.join(ROOT, 'standards', 'zhenduan', '底本.json');
const doc = JSON.parse(fs.readFileSync(BOOK, 'utf8'));

const ch = doc.chapters.find((c) => c.no === '2');

function textOf(no) {
  for (const s of ch.secs) {
    if (s.no === no) return [s.title, ...s.paras].join('');
    for (const sub of s.subs) if (sub.no === no) return [sub.title, ...sub.paras].join('');
  }
  return '';
}

function allText() {
  const parts = [...ch.paras];
  for (const s of ch.secs) {
    parts.push(s.title, ...s.paras);
    for (const sub of s.subs) parts.push(sub.title, ...sub.paras);
  }
  return parts.join('\n');
}

function shape() {
  return {
    secs: ch.counts.secs,
    subs: ch.counts.subs,
    paras: ch.counts.paras,
    chars: ch.counts.chars,
    share: ch.counts.chars / doc.counts.chars,
    sections: ch.secs.map((s) => ({
      no: s.no,
      title: s.title,
      subs: s.subs.length,
      paras: s.paras.length + s.subs.reduce((n, x) => n + x.paras.length, 0),
      chars: (s.paras.join('') + s.subs.map((x) => x.paras.join('')).join('')).length,
    })),
  };
}

// 望神 5 态：教材把「得神/少神」「失神/假神/神乱」分成两条小节标题
const SHEN = ['得神', '少神', '失神', '假神', '神乱'];

function shenTypes() {
  const t = allText();
  return SHEN.map((w) => ({ word: w, inText: t.includes(w) }));
}

// 五色主病：小节标题即「五色主病（青赤黄白黑）」
const COLORS = ['青', '赤', '黄', '白', '黑'];

function fiveColors() {
  const t = allText();
  // 标题写法可能是全角或半角括号，只核「五色主病」与其后五色是否齐
  const titled = /五色主病/.test(t) && COLORS.every((c) => t.includes(c));
  return { titled, colors: COLORS.map((c) => ({ color: c, inText: t.includes(c) })) };
}

// 小儿指纹：三关（风/气/命）+ 四项观察（浮沉、色泽、淡滞、长短）
const FINGER_GATES = ['风关', '气关', '命关'];
const FINGER_OBS = ['浮沉', '色泽', '淡滞', '长短'];

function fingerprint() {
  const t = textOf('2.4.2.1') + textOf('2.4.2.2') + textOf('2.4.2');
  return {
    gates: FINGER_GATES.map((g) => ({ gate: g, inText: t.includes(g) })),
    obs: FINGER_OBS.map((o) => ({ item: o, inText: t.includes(o) })),
  };
}

// 排出物：痰涎·呕吐物 / 大便·小便（两条小节标题）
function excretions() {
  // 「望痰涎、呕吐物」「望大便、小便」是**段标题**（items），不是小节标题——扫错一层就会得到 0 条
  const items = ch.secs.flatMap((s) => s.subs.flatMap((x) => (x.items || []).map((i) => i.title)));
  return items.filter((t) => /痰涎|呕吐|大便|小便/.test(t));
}

function main() {
  const s = shape();
  const shen = shenTypes();
  const colors = fiveColors();
  const fp = fingerprint();
  const ex = excretions();

  console.log('═══ 望诊规模（教材·第2章）═══');
  console.log(`  ${s.secs} 节 · ${s.subs} 小节 · ${s.paras} 段 · ${s.chars} 字（全书 ${(s.share * 100).toFixed(1)}%）`);
  console.log('  各节：');
  for (const x of s.sections) console.log(`    ${x.no} ${x.title}：${x.subs} 小节 · ${x.paras} 段 · ${x.chars} 字`);
  console.log('');
  console.log('═══ 望神：5 态 ═══');
  console.log('  ' + shen.map((x) => `${x.word}${x.inText ? '✓' : '✗'}`).join(' · '));
  console.log(`  命中 ${shen.filter((x) => x.inText).length}/5`);
  console.log('');
  console.log('═══ 五色主病 ═══');
  console.log(`  小节标题写全五色：${colors.titled ? '是' : '否'}`);
  console.log('  ' + colors.colors.map((x) => `${x.color}${x.inText ? '✓' : '✗'}`).join(' · '));
  console.log('');
  console.log('═══ 小儿指纹：三关 + 四项观察 ═══');
  console.log('  关：' + fp.gates.map((x) => `${x.gate}${x.inText ? '✓' : '✗'}`).join(' · '));
  console.log('  观察：' + fp.obs.map((x) => `${x.item}${x.inText ? '✓' : '✗'}`).join(' · '));
  console.log('');
  console.log('═══ 望排出物：' + ex.length + ' 条小节 ═══');
  for (const t of ex) console.log('  · ' + t);
  console.log('');
  console.log('教学边界：本章只整理教材望诊的维度与术语，不做望诊判读，不构成诊断依据。');
}

if (require.main === module) main();

module.exports = { shape, shenTypes, fiveColors, fingerprint, excretions, allText, textOf, SHEN, COLORS, doc, ch };
