'use strict';
/**
 * 诊法条件检查 + 脉象四条判读（《素问·脉要精微论》）
 *
 *   node code/main.js
 *
 * 设计要点：
 *   1. 不满足条件时不拒绝测量 —— 门诊等不到平旦。做法是把偏差写进记录，
 *      让「这个脉象在什么条件下取得」成为记录的一部分。
 *   2. 原文四项条件（阴气未动/阳气未散/饮食未进/气血未乱）只覆盖活动、进食、时相、情绪；
 *      药物、体位、温度等「未列入原文但影响脉象」的项单列为 supplements，不混进去。
 *   3. 脉象判读只给原文方向，不给诊断结论。
 */

/** 原文四项条件（据《素问·脉要精微论》「诊法常以平旦…」） */
function checkCondition(env = {}) {
  const { rested = false, fasted = false, calm = false, hour = 12 } = env;
  const deviations = [];
  if (!rested) deviations.push('未静息（阳气未散这一条不成立）');
  if (!fasted) deviations.push('已进食（饮食未进这一条不成立）');
  if (!calm) deviations.push('情绪未平（气血未乱这一条不成立）');
  const dawn = hour >= 4 && hour <= 7;
  if (!dawn) deviations.push(`非平旦（${hour} 时；经脉盛衰这一条按原文不成立）`);

  return {
    ok: deviations.length === 0,
    deviations,
    // 门诊现实：偏差项必须记录，而不是把测量作废
    advice: deviations.length
      ? '记录上述偏差后再采集；同一次随访尽量保持相同条件，才可纵向比较'
      : '条件满足原文要求，可直接采集',
  };
}

/** 原文四条：长/短/数/大 —— 只给方向与边界，不给诊断 */
const PULSES = [
  { name: '长', text: '长则气治', read: '气机和调', boundary: '长而太过（如长而硬）不属此条' },
  { name: '短', text: '短则气病', read: '气机不利', boundary: '短亦可因痰食壅滞，本条不排除' },
  { name: '数', text: '数则烦心', read: '热扰心神之提示', boundary: '数亦见于虚、见于药（咖啡因等）' },
  { name: '大', text: '大则病进', read: '病势进展之提示', boundary: '大而无力属虚，不与「病进」等同' },
];

/** 未列入原文、但影响脉象的补充项（必须记录，不混入四条件） */
const SUPPLEMENTS = ['服药（尤其降压、咖啡因）', '体位（卧/坐/立）', '环境温度', '是否刚吸烟'];

function main() {
  const cases = [
    { name: 'A：理想平旦', env: { rested: true, fasted: true, calm: true, hour: 6 } },
    { name: 'B：门诊下午', env: { rested: false, fasted: true, calm: true, hour: 15 } },
  ];
  for (const c of cases) {
    const r = checkCondition(c.env);
    console.log(`\n${c.name} → ${r.ok ? '条件成立' : '条件不成立'}`);
    for (const d of r.deviations) console.log(`  · ${d}`);
    console.log(`  建议：${r.advice}`);
  }
  console.log('\n脉象四条（原文方向，非诊断）：');
  for (const p of PULSES) console.log(`  ${p.name}：${p.text} → ${p.read}｜边界：${p.boundary}`);
  console.log(`\n原文未列、但必须记录的项：${SUPPLEMENTS.join('、')}`);
  console.log('\n本输出为教学样例，不构成诊断依据。');
}

if (require.main === module) main();
module.exports = { checkCondition, PULSES, SUPPLEMENTS };
