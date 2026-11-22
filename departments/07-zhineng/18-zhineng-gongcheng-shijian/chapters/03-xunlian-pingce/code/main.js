#!/usr/bin/env node
/**
 * 智能工程实践 · 第 3 章 一次跑通不算流水线，能跑出同一个数才算
 * 课程: departments/07-zhineng/18-zhineng-gongcheng-shijian/chapters/03-xunlian-pingce/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读并复算四笔账：
 *   ① 0.91 与 0.86 的差，放进区间宽度与种子噪声里还成不成立；
 *   ② 17 次顺手看评测集，假阳性的累积概率；
 *   ③ 1,200 例与 300 例的区间宽度比，是否等于 1/√(样本比)；
 *   ④ 五段流水线、四把锁、八条泄漏检查与回滚判据的条数。
 * 12,000 例、0.91 与 0.86 均为正文演算设定，不对应实测模型。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');
const num = (s) => Number(String(s).replace(/,/g, ''));

function tableRows(text, headerCell, col = 0) {
  const lines = text.split('\n');
  const head = lines.findIndex((l) => {
    const cells = l.split('|').slice(1, -1).map((c) => c.trim());
    return l.trim().startsWith('|') && cells[col] === headerCell;
  });
  if (head < 0) throw new Error('正文里没找到表头：' + headerCell);
  const rows = [];
  for (let i = head + 1; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line.startsWith('|')) break;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.every((c) => c === '' || /^:?-{2,}:?$/.test(c))) continue;
    rows.push(cells);
  }
  return rows;
}

function numberedList(text, fromMarker, toMarker) {
  const from = text.indexOf(fromMarker);
  const to = text.indexOf(toMarker);
  if (from < 0 || to < 0) throw new Error('正文里没找到段落：' + fromMarker);
  return text
    .slice(from, to)
    .split('\n')
    .filter((l) => /^\d+\.\s+\S/.test(l.trim()))
    .map((l) => l.trim().replace(/^\d+\.\s+/, ''));
}

/** 立项问题段：样本量、两个 AUC、种子噪声、评测集被看次数、单次训练时长 */
function parseProblem(text) {
  const cases = text.match(/([\d,]+)\s*例里能用于测试的不过千余/);
  const auc = text.match(/A 报 AUC\s*([\d.]+)，B 报\s*([\d.]+)/);
  const noise = text.match(/种子带来的波动就有\s*([\d.]+)/);
  const peeks = text.match(/看了\s*(\d+)\s*次/);
  const hours = text.match(/一次训练\s*(\d+)\s*小时/);
  if (!cases || !auc || !noise || !peeks || !hours) throw new Error('正文里没找到立项问题段的数字');
  return {
    cases: num(cases[1]),
    aucA: Number(auc[1]),
    aucB: Number(auc[2]),
    seedNoise: Number(noise[1]),
    peeks: Number(peeks[1]),
    trainHours: Number(hours[1]),
  };
}

/** 评测协议里的区间与预算 */
function parseProtocol(text) {
  const large = text.match(/([\d,]+)\s*例测试集、阳性率\s*(\d+)%\s*时，AUC 的 95% 区间宽度大约在\s*([\d.]+)–([\d.]+)/);
  const small = text.match(/换成\s*(\d+)\s*例，宽度接近\s*([\d.]+)/);
  const boot = text.match(/bootstrap 重采样\s*([\d,]+)\s*次/);
  const subgroup = text.match(/样本量不足\s*(\d+)\s*的合并/);
  const seeds = text.match(/用(\S+)不同种子各跑一次/);
  if (!large || !small || !boot || !subgroup) throw new Error('正文里没找到评测协议的数字');
  return {
    largeN: num(large[1]),
    prevalence: Number(large[2]) / 100,
    widthLo: Number(large[3]),
    widthHi: Number(large[4]),
    smallN: Number(small[1]),
    smallWidth: Number(small[2]),
    bootstrap: num(boot[1]),
    subgroupMin: Number(subgroup[1]),
    seedCount: seeds ? seeds[1] : '',
  };
}

/** 晋级与回滚判据 */
function parseGates(text) {
  const tol = text.match(/点估计不降超过\s*([\d.]+)/);
  const roll = text.match(/上线后\s*(\d+)\s*小时内关键子群敏感度下降超过\s*(\d+)\s*个点、空返回率超过\s*([\d.]+)%、推翻率超过\s*(\d+)%/);
  if (!tol || !roll) throw new Error('正文里没找到晋级或回滚判据');
  return {
    tolerance: Number(tol[1]),
    rollbackHours: Number(roll[1]),
    subgroupDrop: Number(roll[2]),
    emptyRate: Number(roll[3]),
    overrideRate: Number(roll[4]),
  };
}

function analyze(doc) {
  const p = parseProblem(doc);
  const proto = parseProtocol(doc);
  const gates = parseGates(doc);
  const stages = tableRows(doc, '段');
  const locks = tableRows(doc, '锁');
  const manifest = tableRows(doc, '字段');
  const registry = tableRows(doc, '说明', 1);
  const leaks = numberedList(doc, '下面八条做成清单', '第 4 条最容易被放过');
  const promote = doc
    .match(/晋级判据五条，全部满足才允许进入灰度：([^。]+)。/)[1]
    .split('；')
    .map((s) => s.trim())
    .filter(Boolean);

  const gap = Number((p.aucA - p.aucB).toFixed(3));
  const gapInSigma = gap / p.seedNoise;
  const ciWidth = (proto.widthLo + proto.widthHi) / 2;
  const widthRatio = proto.smallWidth / proto.widthHi;
  const sampleRatio = proto.largeN / proto.smallN;
  const familywise = 1 - 0.95 ** p.peeks;

  return {
    ...p,
    ...proto,
    ...gates,
    gap,
    gapInSigma,
    ciWidth,
    ciCoversGap: gap >= proto.widthLo && gap <= proto.widthHi,
    widthRatio,
    sampleRatio,
    rootSampleRatio: Math.sqrt(sampleRatio),
    familywise,
    peekComputeHours: p.peeks * p.trainHours,
    testShare: 1000 / p.cases,
    stages,
    locks,
    manifest,
    registry,
    leaks,
    promote,
  };
}

function main() {
  const a = analyze(readDoc());

  console.log('═══ 一次跑通不算流水线，能跑出同一个数才算 ═══');
  console.log('');
  console.log('一、0.91 与 0.86 之间隔了什么');
  console.log(`  差值 ${a.gap}（${(a.gap * 100).toFixed(1)} 个点）；种子噪声 ${a.seedNoise} ⇒ 差值是噪声的 ${a.gapInSigma.toFixed(2)} 倍`);
  console.log(`  ${a.largeN} 例测试集的 95% 区间宽度 ${a.widthLo}–${a.widthHi}（中值 ${a.ciWidth.toFixed(3)}）`);
  console.log(`  → 差值${a.ciCoversGap ? '落在' : '超出'}一个区间宽度之内：先修锁，再谈谁更好。`);
  console.log('');

  console.log('二、17 次顺手看一眼的代价');
  const fw = (a.familywise * 100).toFixed(1);
  console.log(`  若每次都以 5% 显著性判定，${a.peeks} 次独立比较里至少一次假阳性的概率 = 1 − 0.95^${a.peeks} = ${fw}%`);
  console.log(`  每次重训 ${a.trainHours} 小时 ⇒ 看 ${a.peeks} 次背后是 ${a.peekComputeHours} 小时的算力，这还不含改代码与复核`);
  console.log(`  → 评测集是消耗品：每版只评测一次，调参回验证集。`);
  console.log('');

  console.log('三、区间宽度只服从样本量');
  console.log(`  ${a.largeN} 例 → 宽度 ${a.widthHi}；${a.smallN} 例 → 宽度 ${a.smallWidth}`);
  console.log(`  样本比 ${a.sampleRatio.toFixed(0)} 倍，宽度比 ${a.widthRatio.toFixed(2)}（1/√${a.sampleRatio.toFixed(0)} = ${(1 / a.rootSampleRatio).toFixed(2)}），bootstrap ${a.bootstrap.toLocaleString('en-US')} 次取 2.5% 与 97.5% 分位`);
  console.log(`  可测试样本约千余 / ${a.cases.toLocaleString('en-US')} 例 = ${(a.testShare * 100).toFixed(1)}%，所以区间宽是常态，不是报告写得不好。`);
  console.log(`  子群样本不足 ${a.subgroupMin} 的合并或标注「仅供参考」。`);
  console.log('');

  console.log('四、流水线的结构与判据（正文表格现数）');
  console.log(`  五段：${a.stages.map((s) => s[0].replace(/^[①②③④⑤]\s*/, '')).join(' → ')}`);
  console.log(`  四把锁：${a.locks.map((l) => l[0]).join('、')}；运行清单 ${a.manifest.length} 个字段，登记表 ${a.registry.length} 栏`);
  console.log(`  泄漏检查 ${a.leaks.length} 条，第一条是：${a.leaks[0].split('**').join('')}`);
  console.log(`  晋级判据 ${a.promote.length} 条，容忍点估计不降超过 ${a.tolerance}；回滚 ${a.rollbackHours} 小时 / 敏感度 −${a.subgroupDrop} 点 / 空返回 ${a.emptyRate}% / 推翻 ${a.overrideRate}%`);
  console.log('');
  console.log('※ 数字均从 docs/zh.md 现读现算；12,000 例与两个 AUC 为演算设定，不对应任何实测模型或数据集。');
  console.log('※ 输出仅用于教学演示，不构成性能承诺或算法推荐。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  tableRows,
  numberedList,
  parseProblem,
  parseProtocol,
  parseGates,
  analyze,
  main,
};
