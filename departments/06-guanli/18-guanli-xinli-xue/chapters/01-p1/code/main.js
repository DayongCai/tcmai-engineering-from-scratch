#!/usr/bin/env node
/**
 * 管理心理学 · 第 1 章 管理心理学测的不是人心，是判断的误差
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/01-p1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章要立的是三条界线：研究对象分三层（个体／群体／组织）、方法有四条底线
 * （相关不等于因果、信度是效度的必要条件、数据合规）、制度问题不能被心理化。
 * 本脚本把这些界线变成可复算的量：
 *   1. 五环表从正文表格解析，不手打；
 *   2. 三组评价（4.6／3.9／3.1）的均值与极差现算，并指出极差来自哪两组；
 *   3. 「你准备改什么」→层的映射按判据表执行；
 *   4. 三个反问作为「可证伪性」检查器，对给定说法逐条判定。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '管理心理学测的不是人心，是判断的误差';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 二级标题：（正文的「节」） */
function sections(text) {
  return String(text || '')
    .split('\n')
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

/** Markdown 表格 → [{header, rows}]，以 |---| 分隔行识别表头 */
function tables(text) {
  const lines = String(text || '').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i]) || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) continue;
    const cells = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
    const header = cells(lines[i]);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) {
      rows.push(cells(lines[j]));
      j += 1;
    }
    out.push({ header, rows });
    i = j - 1;
  }
  return out;
}

/** 五环：人性假设 → 个体 → 群体 → 领导 → 健康 */
function fiveRings(text) {
  const t = tables(text).find((x) => x.header[0] === '环节') || { rows: [] };
  return t.rows.map((r) => ({ ring: r[0], question: r[1], cost: r[2] }));
}

/** 三层：个体层管…、群体层管…、组织层管… */
function layers(text) {
  const m = String(text || '').match(/研究对象分三层。([^。]+。)/);
  const src = m ? m[1] : '';
  return ['个体层', '群体层', '组织层'].map((name) => {
    const at = src.indexOf(name + '管');
    const rest = at >= 0 ? src.slice(at + name.length + 1) : '';
    return { name, scope: rest.split('；')[0].replace(/。$/, '') };
  }).filter((x) => x.scope);
}

/**
 * 「你准备改变的东西」→ 三层。判据取自正文：「人的认知／人与人之间的规则／规则背后的计量方式」。
 * 输入是一个具体动作，输出它实际落在哪一层——改错层就是「给漏水的管子刷漆」。
 */
const FIX_LAYER = [
  { layer: '个体层', keys: ['培训', '认知', '心态', '技能', '沟通技巧', '说服'] },
  { layer: '群体层', keys: ['规范', '排班默契', '协作', '团队', '冲突', '交接'] },
  { layer: '组织层', keys: ['计量', '绩效口径', '岗位设计', '流程', '编制', '考核指标'] },
];

function classifyFix(action) {
  const text = String(action || '');
  const hit = FIX_LAYER.find((x) => x.keys.some((k) => text.includes(k)));
  return hit ? hit.layer : '无法定位：先问「换一批人结果会不会一样」';
}

/** 三组评价的均值、极差，以及极差落在哪两组 */
function ratingProfile(groups) {
  const pts = Object.values(groups);
  const mean = pts.reduce((a, b) => a + b, 0) / pts.length;
  const values = Object.keys(groups).map((k) => ({ key: k, v: groups[k] }));
  const hi = values.reduce((m, x) => (x.v > m.v ? x : m), values[0]);
  const lo = values.reduce((m, x) => (x.v < m.v ? x : m), values[0]);
  const spread = Number((hi.v - lo.v).toFixed(4));
  return {
    mean: Number(mean.toFixed(4)),
    spread,
    spreadRatio: Number((spread / mean).toFixed(4)),
    hi: hi.key,
    lo: lo.key,
    // 三份评价同源（同一人）却差出这个宽度，先怀疑视角，再怀疑能力
    verdict: spread >= 0.5 ? '视角差异大于误差：先定位评价者的位置' : '三组判断接近，可直接用于分档',
  };
}

/**
 * 三个反问：换一批人是否一样／有无对应物质条件／能否被证伪。
 * 全部通过才算一条可用的判断；对任何反例都能自圆其说的说法不是知识，是态度。
 */
function guard(saying) {
  const t = String(saying || '');
  const selfSealing = /心里还是|嘴上同意|本质上|骨子里|态度不端正/.test(t);
  return {
    saying: t,
    replaceable: /换一批|换个|调岗|轮岗|换三批/.test(t),
    hasMaterial: /权限|排班|窗口|设备|时间|流程|编制/.test(t),
    falsifiable: !selfSealing,
    // 自圆其说的句子对任何反例都能解释，因此不可证伪；不可证伪的说法只能算态度
    verdict: selfSealing ? '不是知识，是态度' : '可以拿证据检验',
  };
}

function main() {
  const text = read();
  const secs = sections(text);
  const rings = fiveRings(text);
  const ls = layers(text);
  const hanzi = (text.match(HANZI) || []).length;

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${secs.length} 节 · 表格 ${tables(text).length} 张`);
  console.log('');
  console.log('五环（解析正文表格，不是手打）：');
  for (const r of rings) console.log(`  ${r.ring}｜${r.question}｜答不上来：${r.cost}`);
  console.log('');
  console.log(`研究对象 ${ls.length} 层：`);
  for (const l of ls) console.log(`  ${l.name}管 ${l.scope}`);
  console.log('');
  const prof = ratingProfile({ 科主任: 4.6, 同事均值: 3.9, 实习生: 3.1 });
  console.log('同一位医师的三份评价：');
  console.log(`  均值 ${prof.mean}｜极差 ${prof.spread}（占均值 ${(prof.spreadRatio * 100).toFixed(1)}%）`);
  console.log(`  最高 ${prof.hi}、最低 ${prof.lo} → ${prof.verdict}`);
  console.log('');
  console.log('同一个数字换一种问法，动作就换一层：');
  for (const a of ['给全科做沟通培训', '重写排班默契与交接规范', '把台次从绩效口径里拆出来']) {
    console.log(`  ${a} → ${classifyFix(a)}`);
  }
  console.log('');
  const g = guard('他嘴上同意，心里还是抵触');
  console.log(`三个反问逐条过：「${g.saying}」`);
  console.log(`  换一批人是否一样：${g.replaceable ? '问过' : '没问'}；有无物质条件：${g.hasMaterial ? '查过' : '没查'}；能否被证伪：${g.falsifiable ? '能' : '不能'}`);
  console.log(`  → ${g.verdict}：三条缺一条，这句话就不是知识，而是态度。`);
  console.log('');
  console.log('边界：本章结论多为群体层面的概率陈述，不能用于对具体个人下判决；不构成心理诊断或人事处理意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, tables, fiveRings, layers, classifyFix, ratingProfile, guard, FIX_LAYER };
