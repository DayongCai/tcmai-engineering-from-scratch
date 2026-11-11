#!/usr/bin/env node
'use strict';
/**
 * 生理学·三轴索引（代谢/机能/形态 × 细胞/组织/器官/系统）
 *
 *   node scripts/shengli_axis.js                    总表：3×4 交叉矩阵 + 主标签分布
 *   node scripts/shengli_axis.js --view 代谢        该主视角的全部单元
 *   node scripts/shengli_axis.js --level 组织       该主层级的全部单元
 *   node scripts/shengli_axis.js --ch 7             单章的三轴剖面与主标签
 *   node scripts/shengli_axis.js 2.4.2              单单元的两轴坐标与词频
 *
 * 这层解决的是「教材怎么组织内容」而不是「某句话什么意思」：
 * 只有词频时读者还得自己比大小；给了主标签，才能回答「全书多少单元以机能为主」
 * 「组织层到底薄到什么程度」「哪一章不是机能主导」。
 */
const fs = require('fs');
const path = require('path');

const U = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'standards/shengli/units.json'), 'utf8'));
const T = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'standards/shengli/triaxis.json'), 'utf8'));
const args = process.argv.slice(2);

const VS = Object.keys(T.definitions.views);
const LS = Object.keys(T.definitions.levels);

function showUnit(u) {
  const v = u.tri.view, l = u.tri.level;
  return `${u.sub}\t${u.title}\n\t视角 ${v.primary}（${v.share}）· ${v.mix} · 原始 ${JSON.stringify(v.counts)}\n\t层级 ${l.primary}（${l.share}）· ${l.mix} · 原始 ${JSON.stringify(l.counts)}`;
}

function matrix() {
  const w = (s) => String(s).padEnd(7);
  console.log('主视角 × 主层级（单元数）');
  console.log('        ' + LS.map(w).join('') + '合计');
  for (const v of VS) console.log(v + '      ' + LS.map((l) => w(T.cross[`${v}|${l}`])).join('') + T.byPrimaryView[v].units);
  console.log('合计    ' + LS.map((l) => w(T.byPrimaryLevel[l].units)).join(''));
  console.log('\n主导分布：视角 ' + VS.map((v) => `${v} ${T.byPrimaryView[v].units}`).join(' · ')
    + ' ；层级 ' + LS.map((l) => `${l} ${T.byPrimaryLevel[l].units}`).join(' · '));
  console.log('\n章  主视角  主层级  单元数  视角分布（代谢/机能/形态）');
  for (const c of T.chapters) {
    console.log(String(c.no).padStart(2) + '  ' + String(c.primaryView).padEnd(6) + String(c.primaryLevel).padEnd(7)
      + String(c.units).padEnd(8) + Object.values(c.unitsByView).join('/'));
  }
}

if (!args.length) { matrix(); process.exit(0); }

if (args[0] === '--view' || args[0] === '--level') {
  const kind = args[0] === '--view' ? 'view' : 'level';
  const want = args[1];
  const rows = U.units.filter((u) => u.tri[kind].primary === want);
  if (!rows.length) { console.error(`没有主${kind === 'view' ? '视角' : '层级'}为「${want}」的单元`); process.exit(2); }
  console.log(`主${kind === 'view' ? '视角' : '层级'} = ${want}（${rows.length} 单元）\n`);
  for (const u of rows) console.log(`${u.sub}\t${u.title}\t(${u.tri.view.primary}/${u.tri.level.primary})`);
  process.exit(0);
}

if (args[0] === '--ch') {
  const ch = Number(args[1]);
  const c = T.chapters.find((x) => x.no === ch || String(x.no) === String(ch));
  if (!c) { console.error(`没有第 ${ch} 章`); process.exit(2); }
  console.log(`第${c.no}章 ${c.title} · ${c.units} 单元`);
  console.log(`视角 ${c.primaryView}｜${c.viewMix}｜原始 ${JSON.stringify(c.views)}`);
  console.log(`层级 ${c.primaryLevel}｜${c.levelMix}｜原始 ${JSON.stringify(c.levels)}`);
  console.log('\n单元：');
  for (const u of U.units.filter((x) => String(x.chapter) === String(ch))) console.log(`${u.sub}\t${u.tri.view.primary}/${u.tri.level.primary}\t${u.title}`);
  process.exit(0);
}

const u = U.units.find((x) => x.sub === args[0]);
if (!u) { console.error(`没有单元 ${args[0]}（形如 2.4.2）`); process.exit(2); }
console.log(showUnit(u));
