'use strict';
/**
 * 多重比较校正：Bonferroni（控 FWER）与 Benjamini–Hochberg（控 FDR）
 *
 *   node code/main.js
 *
 * 口径：
 *   Bonferroni: 阈值 α/m，控制「至少一次假阳性」的概率
 *   BH        : 升序后找最大 k 使 p(k) ≤ (k/m)·α，前 k 个拒绝，控制假阳性占比
 *
 * 两者不可互换：确证性研究用 FWER，探索性筛选用 FDR。
 */

function bonferroni(pvalues, alpha = 0.05) {
  const thr = alpha / pvalues.length;
  const rejected = [];
  pvalues.forEach((p, i) => { if (p <= thr) rejected.push(i); });
  return { method: 'bonferroni', threshold: thr, rejected };
}

function bh(pvalues, alpha = 0.05) {
  const m = pvalues.length;
  const idx = pvalues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p);
  let k = 0;
  idx.forEach((x, rank) => {
    if (x.p <= ((rank + 1) / m) * alpha) k = rank + 1;
  });
  // 拒绝的是排序后的前 k 个，不是"所有 p ≤ k/m·α 的"——后者是常见实现错误
  return { method: 'bh', threshold: k ? (k / m) * alpha : 0, rejected: idx.slice(0, k).map((x) => x.i).sort((a, b) => a - b) };
}

/** 至少一次假阳性的概率：1-(1-α)^m */
function familyError(alpha, m) {
  return +(1 - (1 - alpha) ** m).toFixed(3);
}

const PVALUES = [0.001, 0.008, 0.021, 0.03, 0.041, 0.12, 0.25, 0.4, 0.62, 0.9];

function main() {
  console.log(`p 值（${PVALUES.length} 个）：${PVALUES.join(', ')}`);
  console.log(`\n若不做校正（α=0.05），至少一次假阳性的概率 = ${familyError(0.05, PVALUES.length)}`);

  for (const r of [bonferroni(PVALUES), bh(PVALUES)]) {
    console.log(`\n${r.method.toUpperCase()}：阈值 ${r.threshold.toFixed(4)}`);
    console.log(`  拒绝（显著）的下标：${r.rejected.join(', ') || '无'}`);
    console.log(`  对应 p 值：${r.rejected.map((i) => PVALUES[i]).join(', ') || '无'}`);
  }
  console.log('\n本输出为教学样例，不构成研究结论；真实研究须按预注册方案执行。');
}

if (require.main === module) main();
module.exports = { bonferroni, bh, familyError, PVALUES };
