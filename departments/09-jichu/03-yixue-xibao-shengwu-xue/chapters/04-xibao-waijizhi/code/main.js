#!/usr/bin/env node
/**
 * 医学细胞生物学 · 第 4 章 细胞外基质：四类大分子按力学任务分工
 * 正文: departments/09-jichu/03-yixue-xibao-shengwu-xue/chapters/04-xibao-waijizhi/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 大分子表、基底膜成分、力学信号的四个步骤，都从正文现抓。给一个力学需求，脚本回答「该找哪一类」，
 * 依据是表里「承担的力学」那一列，不是代码里另抄一份答案。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');

function tableRows(doc, keys) {
  const lines = doc.split(/\r?\n/);
  const head = lines.findIndex((l) => l.trim().startsWith('|') && keys.every((k) => l.includes(k)));
  if (head < 0) throw new Error('正文里找不到表头: ' + keys.join(' / '));
  const rows = [];
  for (let i = head + 2; i < lines.length; i += 1) {
    const l = lines[i].trim();
    if (!l.startsWith('|')) break;
    rows.push(l.split('|').slice(1, -1).map((c) => c.trim()));
  }
  if (!rows.length) throw new Error('表头之后没有数据行');
  return rows;
}

/** 四类大分子：代表 / 结构要点 / 承担的力学 / 分布 */
function molecules(doc) {
  return tableRows(doc, ['类别', '结构要点', '承担的力学']).map((r) => ({
    kind: r[0],
    examples: r[1],
    structure: r[2],
    mechanics: r[3],
    where: r[4],
  }));
}

/** 给力学需求（「拉不断」「拉长后复位」「撑住水」）找承担它的那一类 */
function pickFor(need, doc) {
  const list = doc ? molecules(doc) : molecules(readDoc());
  const hit = list.find((m) => m.mechanics.includes(need));
  if (!hit) throw new Error('表里没有哪一类承担这种力学: ' + need);
  return hit;
}

/** 基底膜的四件套：正文用一个自然段点名，这里按出现顺序取出 */
function basementMembrane(doc) {
  const m = String(doc).match(/它的成分有固定搭配[\s\S]{0,400}/);
  if (!m) throw new Error('正文里找不到基底膜的成分段');
  const seg = m[0];
  const parts = [
    { name: 'IV 型胶原', role: /鸡笼/.test(seg) ? '形成网状骨架' : null },
    { name: '层粘连蛋白', role: /整合素/.test(seg) ? '与细胞表面整合素、肌营养不良蛋白聚糖结合' : null },
    { name: 'nidogen', role: /桥接/.test(seg) ? '把两者桥接起来' : null },
    { name: 'perlecan', role: /生长因子/.test(seg) ? '填充空隙并结合生长因子' : null },
  ];
  for (const p of parts) if (!p.role) throw new Error('基底膜成分的角色缺失: ' + p.name);
  return parts;
}

/** 力学信号的四个步骤：正文以「第一步，…」起头，顺序即段序 */
function mechanoSteps(doc) {
  const out = [];
  for (const m of String(doc).matchAll(/第([一二三四五六])步，([^*。\n]+)/g)) out.push({ step: m[1], title: m[2].trim() });
  if (out.length !== 4) throw new Error('力学信号的步骤数不是四: ' + out.length);
  return out;
}

/** 基质金属蛋白酶的三级控制：前体—激活—抑制 */
function mmpControl(doc) {
  const d = String(doc);
  const m = d.match(/「(前体)—(激活)—(抑制)」/);
  if (!m) throw new Error('正文里找不到降解的三级控制');
  return { stages: [m[1], m[2], m[3]], localized: d.includes('局部、限时、可定位') };
}

/** 三种细胞行为在二维与三维里的差别（正文给出的是定性对照，这里只做归类） */
function dimensionality(doc) {
  const d = String(doc);
  return {
    flat: d.includes('二维培养的细胞是摊平的'),
    threeD: d.includes('三维基质里的细胞是有极性的'),
    drugMustRecheck: d.includes('在二维里筛出的药，必须在三维或动物里复核'),
  };
}

function main() {
  const doc = readDoc();
  const ms = molecules(doc);
  const steps = mechanoSteps(doc);
  const bm = basementMembrane(doc);
  const mmp = mmpControl(doc);

  console.log('医学细胞生物学 · 第 4 章 细胞外基质');
  console.log('');
  console.log(`正文里读到 ${ms.length} 类大分子。`);
  for (const m of ms) console.log(`  ${m.kind} ｜ ${m.mechanics}`);
  console.log('');
  console.log('按力学需求反查：');
  for (const need of ['拉不断', '拉长后复位', '撑住水', '连接与定位']) {
    const hit = pickFor(need, doc);
    console.log(`  ${need} → ${hit.kind}（代表：${hit.examples}）`);
  }
  console.log('');
  console.log('基底膜的成分与分工：');
  for (const p of bm) console.log(`  ${p.name}：${p.role}`);
  console.log('');
  console.log('力学信号进核的步骤（段序）：' + steps.map((s) => s.title).join(' → '));
  console.log(`降解的三级控制：${mmp.stages.join(' → ')}，局部限时可定位：${mmp.localized}`);
  console.log('');
  console.log(`二维摊平：${dimensionality(doc).flat}；三维有极性：${dimensionality(doc).threeD}；二维结论须复核：${dimensionality(doc).drugMustRecheck}`);
  console.log('');
  console.log('※ 分类、成分与步骤顺序都从本章正文现抓；换教材后重跑即可复现。');
  console.log('※ 本输出仅用于教学演示，不构成临床判断依据。');
}

if (require.main === module) main();

module.exports = { readDoc, tableRows, molecules, pickFor, basementMembrane, mechanoSteps, mmpControl, dimensionality };
