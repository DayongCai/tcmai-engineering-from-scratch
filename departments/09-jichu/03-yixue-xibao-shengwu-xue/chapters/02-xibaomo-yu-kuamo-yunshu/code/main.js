#!/usr/bin/env node
/**
 * 医学细胞生物学 · 第 2 章 膜与跨膜运输：从正文表格重建判据与泵的账
 * 正文: departments/09-jichu/03-yixue-xibao-shengwu-xue/chapters/02-xibaomo-yu-kuamo-yunshu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 通透性排序表与三类转运蛋白表都从正文现抓；泵的化学计量也从正文那句「3 Na⁺ : 2 K⁺ : 1 ATP」里读出来。
 * 判据函数不查常量表，而是拿两个问题（是否饱和、是否耗能）去表里比对——表改了，判据跟着改。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');

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

/** 通透性排序：表里的行序就是由快到慢 */
function permeability(doc) {
  return tableRows(doc, ['物质类别', '跨脂双层的方式', '通透性排序']).map((r) => ({
    kind: r[0],
    way: r[1],
    rank: r[2],
    direct: !r[1].includes('需'),
  }));
}

/** 三类转运蛋白 */
function carriers(doc) {
  return tableRows(doc, ['类型', '方向', '耗能', '饱和性']).map((r) => ({
    type: r[0],
    dir: r[1],
    energy: r[2],
    saturation: r[3],
    rate: r[4],
  }));
}

/** 两个问题定一类：顺/逆梯度 + 要不要耗能 + 会不会饱和 */
function identify(probe, doc) {
  const list = carriers(doc || readDoc());
  const wantDir = probe.dir === '逆' ? '逆梯度' : '顺梯度';
  const wantEnergy = probe.consumesEnergy ? '耗' : '不耗';
  // 「不明显（近似线性）」里也含「明显」，所以先排除「不明显」再判饱和
  const wantSat = (cell) => (cell.includes('明显') && !cell.includes('不明显')) === Boolean(probe.saturating);
  const hit = list.find((c) => c.dir.includes(wantDir) && c.energy.includes(wantEnergy) && wantSat(c.saturation));
  if (!hit) throw new Error('这三个答案在表里凑不成一类：' + JSON.stringify(probe));
  return hit;
}

/** 泵的化学计量：从「3 Na⁺ : 2 K⁺ : 1 ATP」读出，再算一次循环净移走几个正电荷 */
function pumpStoichiometry(doc) {
  const m = String(doc).match(/(\d+)\s*Na⁺\s*:\s*(\d+)\s*K⁺\s*:\s*(\d+)\s*ATP/);
  if (!m) throw new Error('正文里没有泵的化学计量');
  const na = Number(m[1]);
  const k = Number(m[2]);
  const atp = Number(m[3]);
  return { na, k, atp, netCharge: na - k };
}

/** 要泵出 n 个 Na⁺，需要几轮、几个 ATP、顺带泵进几个 K⁺、净移走多少正电荷 */
function pumpBudget(naOut, doc) {
  const s = pumpStoichiometry(doc || readDoc());
  const cycles = Math.ceil(naOut / s.na);
  return {
    ...s,
    naOut,
    cycles,
    atpSpent: cycles * s.atp,
    kIn: cycles * s.k,
    charge: cycles * s.netCharge,
  };
}

/** 上皮极性：葡萄糖从腔侧进来、从基底侧出去，方向由蛋白位置决定 */
function epithelialRoute(doc) {
  const d = String(doc);
  const apical = d.includes('顶端膜') && d.includes('同向转运');
  const basalPump = d.includes('基底侧') && d.includes('钠钾泵');
  if (!apical || !basalPump) throw new Error('正文里的上皮极性描述不完整');
  return { steps: ['顶端膜：Na⁺ 顺梯度把葡萄糖拖进来', '细胞内：葡萄糖浓度升高', '基底侧膜：葡萄糖顺浓度排出去'], pumpOnBasal: basalPump };
}

function main() {
  const doc = readDoc();
  const perm = permeability(doc);
  const cs = carriers(doc);
  const s = pumpStoichiometry(doc);
  const b = pumpBudget(1000, doc);

  console.log('医学细胞生物学 · 第 2 章 膜与跨膜运输');
  console.log('');
  console.log(`正文里读到 ${perm.length} 级通透性排序、${cs.length} 类转运蛋白。`);
  console.log('');
  console.log('通透性排序（由快到慢，照正文表）：');
  for (const p of perm) console.log(`  ${p.rank} ｜ ${p.kind} ｜ ${p.direct ? '可直接过' : '需蛋白'}`);
  console.log('');
  console.log('两个问题定一类：');
  for (const probe of [
    { dir: '顺', consumesEnergy: false, saturating: false, label: '顺梯度、不耗能、速率不饱和' },
    { dir: '顺', consumesEnergy: false, saturating: true, label: '顺梯度、不耗能、会饱和' },
    { dir: '逆', consumesEnergy: true, saturating: true, label: '逆梯度、耗能、会饱和' },
  ]) {
    const hit = identify(probe, doc);
    console.log(`  ${probe.label} → ${hit.type}（${hit.rate}）`);
  }
  console.log('');
  console.log(`泵：每轮 ${s.na} Na⁺ 出、${s.k} K⁺ 入、${s.atp} 个 ATP，净移走 ${s.netCharge} 个正电荷。`);
  console.log(`要泵出 ${b.naOut} 个 Na⁺：${b.cycles} 轮、${b.atpSpent} 个 ATP、顺带泵进 ${b.kIn} 个 K⁺、净移走 ${b.charge} 个正电荷。`);
  console.log('');
  console.log('上皮极性：' + epithelialRoute(doc).steps.join(' → '));
  console.log('');
  console.log('※ 排序、分类与化学计量都从本章正文现抓现算；换教材后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, tableRows, permeability, carriers, identify, pumpStoichiometry, pumpBudget, epithelialRoute };
