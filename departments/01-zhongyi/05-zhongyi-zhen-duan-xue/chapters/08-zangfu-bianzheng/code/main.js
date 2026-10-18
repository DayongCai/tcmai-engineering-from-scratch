'use strict';
/**
 * 脏腑辨证：加权规则表打分 + 证据缺口
 *
 *   node code/main.js
 *
 * 口径（与 docs/zh.md 一致）：
 *   score = Σ(命中证据权重) / Σ(全部证据权重)   —— 覆盖度，不是概率
 *   missing = 未命中的**主症**（required），这是"还差什么"
 *   rivals = 与最高分相差 < 0.15 的证候，必须一并列出
 *
 * 为什么权重写死在表里而不是学出来：教材对主症/次症的划分是这一课的**事实源**，
 * 改成拟合出来的系数，病例一变就再也对不上教材，学生无法复核。
 */

const RULES = [
  {
    id: '肝气郁结',
    evidence: [
      { f: '胸胁胀满', w: 3, required: true },
      { f: '善太息', w: 2, required: true },
      { f: '情志抑郁', w: 2, required: false },
      { f: '脉弦', w: 1, required: false },
    ],
  },
  {
    id: '肝火上炎',
    evidence: [
      { f: '目赤', w: 3, required: true },
      { f: '口苦', w: 2, required: true },
      { f: '急躁易怒', w: 2, required: false },
      { f: '脉弦数', w: 1, required: false },
    ],
  },
];

const RIVAL_GAP = 0.15;

function scoreOf(rule, symptoms) {
  const total = rule.evidence.reduce((a, e) => a + e.w, 0);
  const hit = rule.evidence.filter((e) => symptoms.includes(e.f));
  return {
    id: rule.id,
    score: +(hit.reduce((a, e) => a + e.w, 0) / total).toFixed(3),
    missing: rule.evidence.filter((e) => e.required && !symptoms.includes(e.f)).map((e) => e.f),
  };
}

function rank(symptoms, threshold = 0.6) {
  const all = RULES.map((r) => scoreOf(r, symptoms)).sort((a, b) => b.score - a.score);
  const top = all[0];
  return {
    // 过阈值才叫"可考虑的证候"；没过阈值的仍列出来，但标成 under-threshold
    candidates: all.map((c) => ({ ...c, passed: c.score >= threshold })),
    rivals: all.filter((c, i) => i > 0 && top.score - c.score < RIVAL_GAP).map((c) => c.id),
  };
}

const CASES = [
  { name: 'A：典型肝气郁结', symptoms: ['胸胁胀满', '善太息', '情志抑郁', '脉弦'] },
  { name: 'B：肝气郁结 + 目赤', symptoms: ['胸胁胀满', '善太息', '目赤', '口苦', '脉弦'] },
];

function main() {
  for (const c of CASES) {
    const r = rank(c.symptoms);
    console.log(`\n${c.name}`);
    for (const x of r.candidates) {
      console.log(`  ${x.id}  score=${x.score}  ${x.passed ? '✓过阈值' : '（未过阈值）'}`);
      if (x.missing.length) console.log(`    缺主症：${x.missing.join('、')}`);
    }
    if (r.rivals.length) console.log(`  ⚠ 竞争证候（分差 < ${RIVAL_GAP}）：${r.rivals.join('、')}`);
  }
  console.log('\n提醒：score 是覆盖度，不是概率；结论由医师负责。');
  console.log('本输出为教学样例，不构成诊疗建议。');
}

if (require.main === module) main();
module.exports = { RULES, scoreOf, rank, RIVAL_GAP };
