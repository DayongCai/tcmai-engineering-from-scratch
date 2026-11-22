#!/usr/bin/env node
/**
 * 医学细胞生物学 · 第 6 章 神经元与信息传递：信号每小段都重发一次
 * 正文: departments/09-jichu/03-yixue-xibao-shengwu-xue/chapters/06-shenjingyuan-xinxi-chuandi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 静息电位的三条成因、突触的五个环节、三类受体，全从正文现抓。
 * 再加一条纯算术：无髓鞘纤维的速度与直径的平方根成正比，所以想把速度提高一倍，直径要加粗到四倍——
 * 这条换算解释了髓鞘为什么比加粗更划算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');

/** 取两个小节标题之间的正文 */
function section(doc, from, to) {
  const d = String(doc);
  const a = d.indexOf(from);
  const b = to ? d.indexOf(to, a + 1) : d.length;
  if (a < 0) throw new Error('正文里没有这一节: ' + from);
  if (b < 0) throw new Error('正文里没有这一节的结束标记: ' + to);
  return d.slice(a, b);
}

function tableRows(doc, keys) {
  const lines = doc.split(/\r?\n/);
  const head = lines.findIndex((l) => l.trim().startsWith('|') && keys.every((k) => l.includes(k)));
  if (head < 0) throw new Error('正文里找不到表头: ' + keys.join(' / '));
  const rows = [];
  for (let i = head + 2; i < lines.length; i += 1) {
    const l = lines[i].trim();
    if (!l.startsWith('|')) break;
    rows.push(l.split('|').slice(1, -1).map((c) => c.trim()));
  }
  if (!rows.length) throw new Error('表头之后没有数据行');
  return rows;
}

/** 静息电位的三条成因：正文第二节的有序列表 */
function restingReasons(doc) {
  const seg = section(doc, '## 二、静息电位', '## 三、');
  const out = [];
  for (const m of seg.matchAll(/\d\.\s*\*\*([^*]+?)[。]?\*\*/g)) out.push(m[1].trim());
  if (out.length !== 3) throw new Error('静息电位的成因不是三条: ' + out.length);
  return out;
}

/** 突触的五个环节：表内顺序即时间顺序 */
function synapseSteps(doc) {
  return tableRows(doc, ['环节', '事件', '被阻断时的后果']).map((r) => ({
    step: r[0],
    event: r[1],
    blocked: r[2],
  }));
}

/** 三类突触后受体：类型 / 时程 / 职责 */
function receptors(doc) {
  const seg = section(doc, '突触后受体分三类', '同一份递质可以作用于这三类受体');
  const out = [];
  for (const m of seg.matchAll(/- \*\*([^*]+)\*\*（[^）]*）：([^\n]+)/g)) {
    out.push({ type: m[1].trim(), detail: m[2].trim() });
  }
  if (out.length !== 3) throw new Error('受体不是三类: ' + out.length);
  return out;
}

/** 无髓鞘纤维：速度 ∝ √直径。速度要翻几倍，直径就要按平方加粗 */
function diameterFor(speedFactor) {
  if (!(speedFactor > 0)) throw new Error('倍数必须为正');
  return Number((speedFactor ** 2).toFixed(4));
}

/** 反过来：直径加粗几倍，速度只提高到它的平方根 */
function speedUp(diameterFactor) {
  if (!(diameterFactor > 0)) throw new Error('倍数必须为正');
  return Number(Math.sqrt(diameterFactor).toFixed(4));
}

/** 髓鞘的工程解：同样的绝缘，靠减少重建次数换速度 */
function myelinLogic(doc) {
  const d = String(doc);
  return {
    fewerRegenerations: d.includes('再生次数大大减少'),
    noWiderAxon: d.includes('直径不必加粗'),
    saltatory: d.includes('跳跃式传导') || d.includes('从一个结「跳」到下一个结'),
  };
}

function main() {
  const doc = readDoc();
  const reasons = restingReasons(doc);
  const steps = synapseSteps(doc);
  const rs = receptors(doc);
  const m = myelinLogic(doc);

  console.log('医学细胞生物学 · 第 6 章 神经元与信息传递');
  console.log('');
  console.log('静息电位的三条成因（正文第二节）：' + reasons.join(' / '));
  console.log('');
  console.log('突触的五个环节：');
  for (const [i, s] of steps.entries()) console.log(`  ${i + 1}. ${s.step} ｜ ${s.event}`);
  console.log('');
  console.log('三类受体的时程：');
  for (const r of rs) console.log(`  ${r.type}：${r.detail}`);
  console.log('');
  console.log(`速度换算：速度想提高 2 倍，无髓鞘纤维的直径要加粗到 ${diameterFor(2)} 倍；`);
  console.log(`反过来，直径加粗 4 倍，速度只提高 ${speedUp(4)} 倍——所以真正的加速方案是换绝缘。`);
  console.log(`髓鞘：减少重建次数 ${m.fewerRegenerations}、直径不必加粗 ${m.noWiderAxon}、跳跃式传导 ${m.saltatory}`);
  console.log('');
  console.log('※ 成因、环节与受体都从本章正文现抓；倍数换算只用平方根关系，不含任何测得的速度值。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, section, tableRows, restingReasons, synapseSteps, receptors, diameterFor, speedUp, myelinLogic };
