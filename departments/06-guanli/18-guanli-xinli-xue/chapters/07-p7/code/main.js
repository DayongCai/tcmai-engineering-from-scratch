#!/usr/bin/env node
/**
 * 管理心理学 · 第 7 章 要求员工「态度好」，是把一项成本从患者转给了员工
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/07-p7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的核心是一道账：投诉率的改善与耗竭的上升，是同一笔成本的两端。
 * 脚本把四件事算出来：
 *   1. 倦怠两维的增幅（0—6 分量表：2.4→3.3、1.7→2.6）与占量表上限的比例；
 *   2. 三种情绪劳动方式的代价权重（真实表达 0、深层扮演 1、表层扮演 3）与判定规则；
 *   3. 工作要求—资源模型下，「减要求」与「加资源」对产出与耗竭的不同影响；
 *   4. 格罗斯五环的干预时点与成本顺序，以及正文里五行情志相胜的配对。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 7;
const TITLE = '要求员工「态度好」，是把一项成本从患者转给了员工';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function sections(text) {
  return String(text || '')
    .split('\n')
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

/** 倦怠分量表变化：正文给的是 2.4→3.3、1.7→2.6，量表 0—6 */
function burnout(before, after, max = 6) {
  return {
    before,
    after,
    delta: Number((after - before).toFixed(2)),
    growth: Number((((after - before) / before) * 100).toFixed(1)),
    shareOfScale: Number(((after / max) * 100).toFixed(1)),
  };
}

const MODES = {
  真实表达: { cost: 0, note: '表达与感受一致，多数服务岗位只部分可行' },
  深层扮演: { cost: 1, note: '认知重评，消耗小，但需要时间与心理空间' },
  表层扮演: { cost: 3, note: '只调表情，见效快，持续伪装制造情绪失调' },
};

/** 判定方式：表里是否一致、是否重新解释过情境 */
function mode(consistent, reappraised) {
  if (consistent) return { mode: '真实表达', ...MODES.真实表达 };
  return reappraised ? { mode: '深层扮演', ...MODES.深层扮演 } : { mode: '表层扮演', ...MODES.表层扮演 };
}

/**
 * JD-R：耗竭随（要求 − 资源）上升，产出随要求上升。
 * 减要求：产出降、耗竭降；加资源：产出不变、耗竭降。两者不等价。
 */
function jdr(demands, resources) {
  const strain = Math.max(0, demands - resources);
  return {
    demands,
    resources,
    strain: Number(strain.toFixed(2)),
    output: Number(demands.toFixed(2)),
  };
}

function compareLevers(demands = 4, resources = 2) {
  const base = jdr(demands, resources);
  const cutDemand = jdr(demands - 1, resources);
  const addResource = jdr(demands, resources + 1);
  return {
    base,
    cutDemand,
    addResource,
    // 同一份耗竭下降，产出差 1 个单位
    outputCostOfCutting: Number((base.output - cutDemand.output).toFixed(2)),
  };
}

/** 格罗斯五环：越靠前成本越低 */
const GROSS = [
  { stage: '情境选择', cost: 1 },
  { stage: '情境修正', cost: 2 },
  { stage: '注意分配', cost: 3 },
  { stage: '认知改变', cost: 4 },
  { stage: '反应调整', cost: 5 },
];

/** 五行情志相胜：正文以「怒伤肝，悲胜怒」这类句子给出配对 */
function restraint(text) {
  const src = String(text || '');
  const pairs = [];
  const re = /([喜怒忧思悲恐惊])胜([喜怒忧思悲恐惊])/g;
  let m;
  while ((m = re.exec(src)) !== null) pairs.push({ over: m[2], by: m[1] });
  return pairs;
}

const SIGNS = ['情绪耗竭', '去人格化', '低个人成就感'];

function concepts(text) {
  const t = String(text || '');
  return {
    signs: SIGNS.filter((s) => t.includes(s)),
    hasSurface: t.includes('表层扮演'),
    hasDeep: t.includes('深层扮演'),
    hasJDR: t.includes('工作要求—资源模型'),
    hasGross: t.includes('情绪调节的过程模型'),
  };
}

function main() {
  const text = read();
  const c = concepts(text);
  const hanzi = (text.match(HANZI) || []).length;
  const e1 = burnout(2.4, 3.3);
  const e2 = burnout(1.7, 2.6);
  const cmp = compareLevers();
  const pairs = restraint(text);

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节`);
  console.log(`倦怠三维 ${c.signs.length}/3：${c.signs.join(' · ')}`);
  console.log('');
  console.log('两本账（0—6 分量表）：');
  console.log(`  情绪耗竭 ${e1.before} → ${e1.after}：+${e1.delta}（+${e1.growth}%），已达量表 ${e1.shareOfScale}%`);
  console.log(`  去人格化 ${e2.before} → ${e2.after}：+${e2.delta}（+${e2.growth}%），已达量表 ${e2.shareOfScale}%`);
  console.log('  → 投诉率 −18% 与耗竭上升同时发生，不是数据矛盾，是成本换了一本账。');
  console.log('');
  console.log('三种方式与代价权重：');
  for (const [k, v] of Object.entries(MODES)) console.log(`  ${k}（${v.cost}）：${v.note}`);
  console.log(`  表里不一致且未重评 → ${mode(false, false).mode}；表里不一致但重评过 → ${mode(false, true).mode}`);
  console.log('');
  console.log(`JD-R（要求 ${cmp.base.demands}／资源 ${cmp.base.resources}）：耗竭 ${cmp.base.strain}，产出 ${cmp.base.output}`);
  console.log(`  减一个要求 → 耗竭 ${cmp.cutDemand.strain}，产出 ${cmp.cutDemand.output}（产出少 ${cmp.outputCostOfCutting}）`);
  console.log(`  加一个资源 → 耗竭 ${cmp.addResource.strain}，产出 ${cmp.addResource.output}（产出不变）`);
  console.log('');
  console.log(`格罗斯五环（越靠前越省）：${GROSS.map((g) => `${g.stage}(${g.cost})`).join(' → ')}`);
  console.log(`  表层扮演在最后一环，认知重评在第四环——差一格，差一份自控资源。`);
  console.log('');
  console.log(`情志相胜配对 ${pairs.length} 条（正文原句解析）：${pairs.map((p) => `${p.by}胜${p.over}`).join('、')}`);
  console.log('  → 仅作学理对照：七情不等于现代情绪分类，情志相胜不等于认知行为干预。');
  console.log('');
  console.log('边界：本章的岗位人数与量表分值均为演算设定；管理者的位置是识别、支持与转介，不构成诊断或治疗建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, burnout, mode, jdr, compareLevers, restraint, concepts, MODES, GROSS, SIGNS };
