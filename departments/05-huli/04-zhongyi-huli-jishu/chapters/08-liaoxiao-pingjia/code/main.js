'use strict';
/**
 * 护理技术疗效：配对差值的效应量与 MCID 判定
 *
 *   node code/main.js
 *
 * 口径：
 *   diff  = post - pre（量表分值越低越好时，负值表示改善）
 *   dz    = mean(diff) / sd(diff)    —— Cohen's d_z（配对）
 *   reached = mean(diff) <= -MCID    —— 病人可感知的改善，不是统计显著
 *
 * 三个数必须并排报：均值差、dz、是否达 MCID。只报 dz 是本章要防的错误。
 */

const avg = (a) => a.reduce((s, x) => s + x, 0) / a.length;
const stdev = (a) => {
  if (a.length < 2) return NaN;
  const m = avg(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
};

function effect(pre, post, mcid) {
  if (!Array.isArray(pre) || !Array.isArray(post) || pre.length !== post.length || !pre.length) {
    throw new Error('pre/post 必须是等长非空数组');
  }
  const diff = post.map((v, i) => v - pre[i]);
  const mean = avg(diff);
  const sd = stdev(diff);
  return {
    n: pre.length,
    mean: +mean.toFixed(2),
    dz: Number.isFinite(sd) && sd > 0 ? +(mean / sd).toFixed(2) : null,
    reached: mean <= -mcid,
    mcid,
  };
}

const GROUPS = [
  { name: 'A：艾灸三次（NRS）', pre: [6, 7, 5, 6, 7], post: [4, 3, 2, 4, 3], mcid: 2 },
  { name: 'B：穴位贴敷两次（NRS）', pre: [5, 6, 5, 6, 5], post: [5, 5, 4, 5, 5], mcid: 2 },
];

function main() {
  for (const g of GROUPS) {
    const r = effect(g.pre, g.post, g.mcid);
    console.log(`\n${g.name}（n=${r.n}）`);
    console.log(`  均值差 ${r.mean} · dz ${r.dz ?? '—'} · ${r.reached ? '达到' : '未达'} MCID(${r.mcid})`);
    if (!r.reached) console.log('  提示：统计上可能有变化，但病人未必感觉得到，报告里不能写成「有效」。');
  }
  console.log('\n提醒：单组前后对比只能说明「变化」，不能证明是干预起效。');
  console.log('本输出为教学样例，不构成诊疗建议。');
}

if (require.main === module) main();
module.exports = { effect, avg, stdev };
