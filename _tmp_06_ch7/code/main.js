'use strict';
/**
 * 与医生诊断的一致性：混淆矩阵 → 原始一致率 / kappa / PABAK
 *
 *   node code/main.js
 *
 * 口径：
 *   po   = 对角线之和 / 总数
 *   pe   = Σ(行占比 × 列占比)        —— 随机猜的期望一致率
 *   kappa= (po - pe) / (1 - pe)
 *   PABAK= 2·po - 1                  —— 对患病率不敏感的替代指标
 *
 * 三者必须一起报：只看 kappa 会在类别极不平衡时得出反直觉结论。
 */

const CATS = ['肝气郁结', '肝火上炎', '肝胆湿热'];

function stats(matrix) {
  const n = matrix.flat().reduce((a, b) => a + b, 0);
  if (!n) throw new Error('混淆矩阵为空');
  const k = matrix.length;
  for (const row of matrix) {
    if (row.length !== k) throw new Error('混淆矩阵必须是方阵');
  }

  const diag = matrix.reduce((s, row, i) => s + row[i], 0);
  const po = diag / n;

  const rowSum = matrix.map((r) => r.reduce((a, b) => a + b, 0) / n);
  const colSum = matrix[0].map((_, j) => matrix.reduce((s, r) => s + r[j], 0) / n);
  const pe = rowSum.reduce((s, r, i) => s + r * colSum[i], 0);

  return {
    n,
    po: +po.toFixed(3),
    pe: +pe.toFixed(3),
    kappa: pe === 1 ? null : +((po - pe) / (1 - pe)).toFixed(3),
    pabak: +(2 * po - 1).toFixed(3),
  };
}

const CASES = [
  {
    name: 'A：类别极不平衡，系统全判第一类',
    m: [
      [90, 0, 0],
      [10, 0, 0],
      [5, 0, 0],
    ],
  },
  {
    name: 'B：均衡且几乎全对',
    m: [
      [30, 1, 0],
      [1, 29, 1],
      [0, 1, 30],
    ],
  },
];

function main() {
  for (const c of CASES) {
    const s = stats(c.m);
    console.log(`\n${c.name}（n=${s.n}）`);
    console.log(`  po=${s.po}  pe=${s.pe}  kappa=${s.kappa ?? '—'}  PABAK=${s.pabak}`);
    console.log(
      s.kappa !== null && s.kappa < 0.2
        ? '  注意：一致率高但 kappa 低 —— 这是"碰巧对上"，不是"学会了"。'
        : '  注意：仍需结合混淆矩阵看错在哪一类。',
    );
  }
  console.log(`\n分类：${CATS.join(' / ')}`);
  console.log('本输出为教学样例，不构成系统有效性证据。');
}

if (require.main === module) main();
module.exports = { stats, CATS };
