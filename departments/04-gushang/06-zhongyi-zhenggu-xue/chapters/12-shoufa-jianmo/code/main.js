'use strict';
/**
 * 正骨手法的力学估算：所需牵引力、安全的力区间、以及力矩
 *
 *   node code/main.js
 *
 * 口径：
 *   need  = α(部位)·W·1.15（肌肉发达时）   —— kgf
 *   ratio = applied / need                  —— 合规区间 [1.0, 1.3]
 *   M     = applied · lever(m)              —— kgf·m，用于比较手位差异
 *
 * α 是区间估计，不是个体测量；阈值是教学保守带，不是临床标准。
 */

const ALPHA = {
  上肢: [0.06, 0.1],
  下肢: [0.12, 0.18],
};

const RATIO_MIN = 1.0;
const RATIO_MAX = 1.3;
const MUSCULAR_GAIN = 1.15;

function needForce(weightKg, part, muscular = false) {
  const a = ALPHA[part];
  if (!a) throw new Error(`未知部位: ${part}（只支持上肢/下肢）`);
  // 取区间上沿：宁可高估需求量，让"施加不足"暴露出来，而不是掩盖
  const base = a[1] * weightKg;
  return +(base * (muscular ? MUSCULAR_GAIN : 1)).toFixed(2);
}

function assess(applied, weightKg, part, leverCm, muscular = false) {
  const need = needForce(weightKg, part, muscular);
  const ratio = +(applied / need).toFixed(2);
  const moment = +((applied * leverCm) / 100).toFixed(2);
  let verdict;
  if (ratio < RATIO_MIN) verdict = 'under';
  else if (ratio > RATIO_MAX) verdict = 'over';
  else verdict = 'ok';
  return { need, ratio, moment, verdict };
}

const VERDICT_ZH = { under: '牵引不足', ok: '区间内', over: '力过量' };

function main() {
  const cases = [
    [6.9, 60, '上肢', 12],
    [8, 60, '上肢', 12],
    [12, 60, '上肢', 12],
    [14, 70, '下肢', 20, true],
  ];
  for (const [applied, w, part, lever, mus] of cases) {
    const r = assess(applied, w, part, lever, !!mus);
    console.log(
      `${w}kg ${part}${mus ? '（肌肉发达）' : ''}：需 ${r.need} kgf，施加 ${applied} kgf`,
    );
    console.log(`  ratio=${r.ratio} → ${VERDICT_ZH[r.verdict]}；力矩 ${r.moment} kgf·m（力臂 ${lever} cm）`);
  }
  console.log('\n本输出为教学样例，不构成临床操作参数。');
}

if (require.main === module) main();
module.exports = { ALPHA, needForce, assess, RATIO_MIN, RATIO_MAX };
