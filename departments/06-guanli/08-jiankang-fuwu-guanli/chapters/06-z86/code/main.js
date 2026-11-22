#!/usr/bin/env node
/**
 * 健康服务管理 · 第 6 章 支付方式决定行为，比任何动员都硬
 * 课程: departments/06-guanli/08-jiankang-fuwu-guanli/chapters/06-z86/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 输出全部从本章正文现算：汉字、节、加粗判断、引文；五种付费单元由正文段落首词数出来，
 * 按效果付费的三前提、健康管理的三个付费难题、三条路径分别计数并与中文数字对账；
 * 卷首那组数字（次均费用、平均住院日、再入院率）读回正文并复算变化幅度。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '支付方式决定行为，比任何动员都硬';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const hanzi = (t) => (String(t || '').match(HANZI) || []).length;

function sections(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], hanzi: 0 };
      out.push(cur);
      continue;
    }
    if (cur) cur.hanzi += hanzi(line);
  }
  return out;
}

function clauseAfter(body, label) {
  const i = body.indexOf(label + '：');
  if (i < 0) throw new Error('正文里没找到「' + label + '：」');
  const rest = body.slice(i + label.length + 1);
  const j = rest.indexOf('。');
  return (j < 0 ? rest : rest.slice(0, j)).trim();
}

const splitList = (s, re = /[、，]/) =>
  String(s).replace(/以及/g, '、').split(re).map((x) => x.trim()).filter(Boolean);

function numbersBy(body, re) {
  const m = body.match(re);
  if (!m) throw new Error('正文里没找到：' + re);
  return m.slice(1).map((x) => Number(String(x).replace(/,/g, '')));
}

function audit(body) {
  const unitsRaw = [...body.matchAll(/^按(项目|床日|病种|人头|效果)付费，/gm)].map((m) => '按' + m[1] + '付费');
  const units = unitsRaw.filter((u) => u !== '按效果付费');
  if (/^总额预付，/m.test(body)) units.push('总额预付');
  const variants = /打包付费与按效果付费/.test(body) ? 2 : 0;

  const effectPremises = splitList(clauseAfter(body, '它需要三个前提'));
  const mgmtProblems = (body.match(/第[一二三]是/g) || []).length;
  const paths = (body.match(/(?:^|[^第])[一二三]是/g) || []).length;

  const counts = {
    units: units.length,
    variants,
    effectPremises: effectPremises.length,
    mgmtProblems,
    paths,
  };
  const claims = [
    { label: '五种付费单元', want: 5, got: counts.units },
    { label: '两种变体', want: 2, got: counts.variants },
    { label: '按效果付费三前提', want: 3, got: counts.effectPremises },
    { label: '健康管理三个付费难题', want: 3, got: counts.mgmtProblems },
    { label: '三条可能路径', want: 3, got: counts.paths },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);

  const [avgCost] = numbersBy(body, /次均费用\s*([\d.]+)\s*万元/);
  const [costDrop] = numbersBy(body, /次均费用降了\s*(\d+)%/);
  const [losBefore] = numbersBy(body, /平均住院日\s*([\d.]+)\s*天/);
  const [losAfter] = numbersBy(body, /平均住院日降到\s*([\d.]+)\s*天/);
  const [readmitBefore, readmitAfter] = numbersBy(body, /再入院率从\s*([\d.]+)%\s*升到\s*([\d.]+)%/);
  const [outpatientUp] = numbersBy(body, /基层门诊量升了\s*(\d+)%/);
  const [labUp] = numbersBy(body, /检查检验费用却同步升了\s*(\d+)%/);

  const raw = {
    avgCost, costDrop, losBefore, losAfter,
    readmitBefore, readmitAfter, outpatientUp, labUp,
  };
  const derived = {
    avgCostAfter: avgCost * (1 - costDrop / 100),
    losDrop: losBefore - losAfter,
    losDropPct: ((losBefore - losAfter) / losBefore) * 100,
    readmitUp: readmitAfter - readmitBefore,
    readmitRelPct: ((readmitAfter - readmitBefore) / readmitBefore) * 100,
  };

  return { units, variants, effectPremises, mgmtProblems, paths, counts, claims, mismatched, raw, derived };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((x) => x[1]))];

  console.log(`健康服务管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 加粗判断 ${(body.match(/\*\*[^*\n]+\*\*/g) || []).length} 处 · 引书 ${cites.length} 部`);
  console.log('');
  console.log('结构清单（条数由正文数出，与句中的中文数字对账）：');
  console.log(`  五种付费单元 ${a.counts.units} 种：${a.units.join('／')}`);
  console.log(`  更精细的变体 ${a.counts.variants} 种：打包付费／按效果付费`);
  console.log(`  按效果付费三前提 ${a.counts.effectPremises} 条：${a.effectPremises.join('／')}`);
  console.log(`  健康管理三个付费难题 ${a.counts.mgmtProblems} 个（正文以「第一是…第三是」列出）`);
  console.log(`  可能路径 ${a.counts.paths} 条（正文以「一是…三是」列出）`);
  console.log(`  → 对账${a.mismatched.length ? '不一致，须改稿：' + a.mismatched.join('、') : '一致'}`);
  console.log('');
  console.log('卷首数字复算：');
  const { raw, derived } = a;
  console.log(`  次均费用 ${raw.avgCost} 万元 − ${raw.costDrop}% = ${derived.avgCostAfter.toFixed(3)} 万元`);
  console.log(`  平均住院日 ${raw.losBefore} → ${raw.losAfter} 天，降 ${derived.losDrop.toFixed(1)} 天（${derived.losDropPct.toFixed(1)}%）`);
  console.log(`  再入院率 ${raw.readmitBefore}% → ${raw.readmitAfter}%，升 ${derived.readmitUp.toFixed(1)} 个百分点（相对升幅 ${derived.readmitRelPct.toFixed(1)}%）`);
  console.log(`  基层门诊量 +${raw.outpatientUp}% ，检查检验费用 +${raw.labUp}%`);
  console.log('  → 控费做出来了，代价转到再入院与拆分：这就是「支付单元加质量补丁」要盯的地方。');
  console.log('');
  console.log('逐节字数：');
  for (const s of secs) {
    const share = hanzi(body) ? ((s.hanzi / hanzi(body)) * 100).toFixed(1) : '0.0';
    console.log(`  ${s.title.padEnd(26, '　')} ${String(s.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('→ 判据：任何控费都会在某些环节转化为服务不足或推诿，区别只在于是否被监测到；改革必须同时准备质量兜底与申诉通道。');
  console.log('※ 数字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成保险或政策意见，也不构成对具体支付方式的推荐。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, hanzi, sections, clauseAfter, splitList, audit };
