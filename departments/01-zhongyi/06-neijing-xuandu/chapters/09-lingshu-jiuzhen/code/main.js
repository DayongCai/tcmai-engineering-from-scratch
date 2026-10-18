'use strict';
/**
 * 九针规格与选针：《灵枢·九针十二原》形制用途 + 《灵枢·官针》取法主治
 *
 *   node code/main.js
 *
 * 口径：
 *   · 长度单位「寸」按汉制折算为区间 [2.31, 2.35] cm —— 给区间不给点值，
 *     因为汉尺实测本身有分布，任何「某针 = 某毫米」都在藏不确定性
 *   · 用途只取两篇原文的措辞，不扩充适应证
 */

const CM_MIN = 2.31;
const CM_MAX = 2.35;

const SRC_A = '《灵枢·九针十二原》';
const SRC_B = '《灵枢·官针》';

const NEEDLES = [
  { n: 1, name: '镵针', cun: 1.6, shape: '头大末锐', use: ['泻阳气', '热在头身'], source: `${SRC_A}·${SRC_B}` },
  { n: 2, name: '员针', cun: 1.6, shape: '筩其身而卵其锋', use: ['揩摩分间', '泻分气'], source: `${SRC_A}·${SRC_B}` },
  { n: 3, name: '鍉针', cun: 3.5, shape: '锋如黍粟之锐', use: ['按脉取气', '令邪出'], source: `${SRC_A}·${SRC_B}` },
  { n: 4, name: '锋针', cun: 1.6, shape: '刃三隅', use: ['泻热出血', '痈脓'], source: `${SRC_A}·${SRC_B}` },
  { n: 5, name: '铍针', cun: 4.0, shape: '末如剑锋，广二分半', use: ['取大脓', '排脓'], source: `${SRC_A}·${SRC_B}` },
  { n: 6, name: '员利针', cun: 1.6, shape: '大如氂，且员且锐', use: ['取暴痹', '取深邪'], source: `${SRC_A}·${SRC_B}` },
  { n: 7, name: '毫针', cun: 3.6, shape: '尖如蚊虻喙', use: ['静以徐往', '养神定气'], source: `${SRC_A}·${SRC_B}` },
  { n: 8, name: '长针', cun: 7.0, shape: '长其身，锋其末', use: ['取深痹', '远痹'], source: `${SRC_A}·${SRC_B}` },
  { n: 9, name: '大针', cun: 4.0, shape: '尖如梃，其锋微员', use: ['泻水', '通关节'], source: `${SRC_A}·${SRC_B}` },
];

/** 寸 → 厘米区间（不给点值） */
function toCm(cun) {
  if (!(cun > 0)) throw new Error('长度必须为正数（寸）');
  return { min: +(cun * CM_MIN).toFixed(2), max: +(cun * CM_MAX).toFixed(2) };
}

/** 按用途关键词选针：返回全部命中，并标明依据；无命中返回空数组 */
function pick(keyword) {
  if (!keyword || !String(keyword).trim()) throw new Error('检索词不能为空');
  return NEEDLES.filter((x) => x.use.some((u) => u.includes(keyword)) || x.shape.includes(keyword))
    .map((x) => ({ name: x.name, cun: x.cun, use: x.use, source: x.source }));
}

function main() {
  console.log('九针（长度单位：寸 → 汉制折算法厘米区间）');
  for (const x of NEEDLES) {
    const c = toCm(x.cun);
    console.log(`  ${x.n}. ${x.name.padEnd(3, '　')} ${x.cun} 寸（${c.min}–${c.max} cm）｜${x.shape}｜${x.use.join('、')}`);
  }
  for (const k of ['脓', '深痹', '出血']) {
    const r = pick(k);
    console.log(`\n检索「${k}」→ ${r.length} 支：${r.map((x) => `${x.name}(${x.cun}寸)`).join('、') || '无命中'}`);
  }
  console.log('\n提醒：折算为区间，读原文用；临床针具按现行 mm 规格执行。');
  console.log('本输出为教学样例，不构成针具选择或操作建议。');
}

if (require.main === module) main();
module.exports = { NEEDLES, toCm, pick, CM_MIN, CM_MAX };
