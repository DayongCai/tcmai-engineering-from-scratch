'use strict';
/**
 * 危险穴位进针校验：安全深度上限 + 方向禁令
 *
 *   node code/main.js
 *
 * 口径：
 *   limit = d0 × k(BMI)       —— d0 是教材给中等体型的参考深度（寸）
 *   方向命中 forbid 列表      —— 直接 forbid，不参与深度比较（方向不是"更深"）
 *   判定：allow / warn(>80% limit) / forbid(超过 limit)
 *
 * 这是教学模型：系数按经验分段，未做影像学标定。
 */

const POINTS = {
  风池: { d0: 1.0, zone: '颅颈交界', forbid: ['内上方', '直刺深刺'], vital: '椎动脉 / 延髓' },
  肺俞: { d0: 0.8, zone: '胸壁', forbid: ['向内斜刺'], vital: '胸膜 / 肺' },
  人迎: { d0: 0.3, zone: '颈动脉三角', forbid: ['直刺深刺'], vital: '颈动脉 / 迷走神经' },
  肩井: { d0: 0.5, zone: '肩胛上', forbid: ['直刺深刺'], vital: '肺尖' },
};

function kOf(bmi) {
  if (bmi < 18.5) return 0.8;
  if (bmi < 24) return 1.0;
  if (bmi < 28) return 1.25;
  return 1.4;
}

function limitOf(point, bmi) {
  const p = POINTS[point];
  if (!p) throw new Error(`未收录穴位: ${point}`);
  return +(p.d0 * kOf(bmi)).toFixed(2);
}

function check(point, bmi, direction, planned) {
  const p = POINTS[point];
  if (!p) throw new Error(`未收录穴位: ${point}`);
  const limit = limitOf(point, bmi);

  if (p.forbid.some((f) => direction.includes(f))) {
    return {
      verdict: 'forbid',
      limit,
      reason: `方向「${direction}」属禁用方向，可能伤及${p.vital}；深度再浅也不能抵消方向风险`,
    };
  }
  if (planned > limit) {
    return { verdict: 'forbid', limit, reason: `计划 ${planned} 寸超过上限 ${limit} 寸（${p.zone}）` };
  }
  if (planned > limit * 0.8) {
    return { verdict: 'warn', limit, reason: `已用 ${(planned / limit * 100).toFixed(0)}% 上限，留出余量` };
  }
  return { verdict: 'allow', limit, reason: `在 ${limit} 寸上限内` };
}

function main() {
  const cases = [
    ['风池', 22, '向鼻尖', 1.0],
    ['风池', 22, '向内上方', 1.0],
    ['风池', 30, '向鼻尖', 1.3],
    ['肺俞', 22, '向内斜刺', 0.6],
    ['人迎', 25, '直刺', 0.2],
  ];
  for (const [pt, bmi, dir, d] of cases) {
    const r = check(pt, bmi, dir, d);
    console.log(`${pt} BMI=${bmi} 方向=${dir} 计划=${d}寸 → ${r.verdict.toUpperCase()}（上限 ${r.limit}）`);
    console.log(`   ${r.reason}`);
  }
  console.log('\n本输出为教学样例，不构成操作参数；实际进针须由执业医师判断。');
}

if (require.main === module) main();
module.exports = { POINTS, kOf, limitOf, check };
