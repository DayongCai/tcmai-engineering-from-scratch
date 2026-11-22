#!/usr/bin/env node
/**
 * 大模型与中医智能体 · 第 3 章 证候要能被检索，先得能被放进一个能算距离的空间
 * 课程: departments/07-zhineng/10-llm-yu-zhongyi-zhinengti/chapters/03-llm3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读并复算三件事：
 *   ① 三种「近」的对照表 —— 到底哪一种不能靠嵌入得到；
 *   ② 术语对齐四步的工作量 —— 按每簇分钟数折算成小时，与正文口径对账；
 *   ③ 验收与重嵌入阈值 —— 查询词数、Top-K、同义对、回归用例、触发条件。
 * 正文没写的数字不补。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const readDoc = () => fs.readFileSync(DOC, 'utf8');
const toInt = (s) => Number(String(s).replace(/[,\s]/g, ''));

/** 读一张 markdown 表的行：以 header 里出现的第一个列名为锚，读到空行为止 */
function readTable(text, firstHeader) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('|') && l.includes(firstHeader));
  if (start < 0) throw new Error(`正文里没找到表头含「${firstHeader}」的表`);
  const rows = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.startsWith('|')) break;
    const cells = line.split('|').map((c) => c.trim());
    cells.shift();
    cells.pop();
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) continue; // 分隔行
    if (cells.length) rows.push(cells);
  }
  return rows;
}

/** 三种「近」：字面近 / 语义近 / 临床等价 */
function parseCloseness(text) {
  const rows = readTable(text, '关系');
  return rows
    .filter((r) => r.length === 4)
    .map(([relation, criterion, example, byEmbedding]) => ({
      relation,
      criterion: criterion.replace(/\*\*/g, ''),
      example,
      byEmbedding: byEmbedding.replace(/\*\*/g, ''),
    }));
}

/** 对齐四步：抽取候选 → 自动预分类 → 专家裁定 → 落库与回归 */
function parseAlignmentSteps(text) {
  const rows = readTable(text, '步骤');
  return rows.filter((r) => r.length === 4).map(([step, how, output, effort]) => ({ step, how, output, effort }));
}

/** 「1,000 簇、每簇裁定 1.5 分钟计，约 25 小时」「每 100 簇约 2 小时」 */
function parseReviewCost(text) {
  const a = text.match(/([\d,]+)\s*簇、每簇裁定\s*([\d.]+)\s*分钟计，约\s*([\d.]+)\s*小时/);
  const b = text.match(/每\s*(\d+)\s*簇约\s*([\d.]+)\s*小时/);
  if (!a || !b) throw new Error('正文里没找到簇数与裁定工作量的两句');
  return {
    clusters: toInt(a[1]),
    minutesPerCluster: Number(a[2]),
    quotedHours: Number(a[3]),
    per100: Number(b[1]),
    hoursPer100: Number(b[2]),
  };
}

/** 验收三项的阈值：查询词 30–50、Top-10、不相关超过三成、100 对同义、50 条回归 */
function parseAcceptance(text) {
  const q = text.match(/给定\s*(\d+)–(\d+)\s*个查询词/);
  const k = text.match(/各取 Top-(\d+)/);
  const bad = text.match(/明显不相关的比例超过\s*三成/);
  const pairs = text.match(/(\d+)\s*对已确认的同义词/);
  const regress = text.match(/(\d+)\s*条覆盖主要证候族的查询/);
  if (!q || !k || !bad || !pairs || !regress) throw new Error('正文验收三项的阈值不全');
  return {
    queries: [Number(q[1]), Number(q[2])],
    topK: Number(k[1]),
    badShare: 0.3,
    synonymPairs: Number(pairs[1]),
    regressCases: Number(regress[1]),
  };
}

/** 重嵌入触发：语料增补超过 20%、任一指标下降超过 5 个百分点 */
function parseReembedTriggers(text) {
  const corpus = text.match(/语料增补超过一定比例（如\s*(\d+)%）/);
  const drop = text.match(/任一项下降超过\s*(\d+)\s*个百分点/);
  if (!corpus || !drop) throw new Error('正文重嵌入触发条件不全');
  return { corpusGrowth: Number(corpus[1]) / 100, metricDrop: Number(drop[1]) / 100 };
}

function main() {
  const doc = readDoc();
  const closeness = parseCloseness(doc);
  const steps = parseAlignmentSteps(doc);
  const cost = parseReviewCost(doc);
  const acc = parseAcceptance(doc);
  const trig = parseReembedTriggers(doc);

  const embeddable = closeness.filter((r) => !/不能/.test(r.byEmbedding));
  const notEmbeddable = closeness.filter((r) => /不能/.test(r.byEmbedding));

  console.log('═══ 证候要能被检索，先得能被放进一个能算距离的空间 ═══');
  console.log('');

  console.log(`一、三种「近」，别混为一谈（正文表 ${closeness.length} 行）`);
  for (const r of closeness) {
    const mark = /不能/.test(r.byEmbedding) ? '✗' : '·';
    console.log(`  ${mark} ${r.relation}：判据「${r.criterion}」，例 ${r.example} → ${r.byEmbedding}`);
  }
  console.log(`  嵌入能覆盖 ${embeddable.length} 类，术语表负责 ${notEmbeddable.length} 类：${notEmbeddable.map((r) => r.relation).join('、')}`);
  console.log('  分工：嵌入只做召回，术语表做判定 —— 召回错只多列候选，判定错就是知识错误。');
  console.log('');

  console.log(`二、对齐四步（${steps.length} 步，每步都有可交付物）`);
  steps.forEach((s, i) => console.log(`  ${i + 1}. ${s.step} → ${s.output}（${s.effort}）`));
  const hours = (cost.clusters * cost.minutesPerCluster) / 60;
  const hoursBy100 = (cost.clusters / cost.per100) * cost.hoursPer100;
  console.log(`  专家裁定按 ${cost.clusters.toLocaleString('en-US')} 簇 × ${cost.minutesPerCluster} 分钟 = ${hours.toFixed(0)} 小时`);
  console.log(`  同一段正文另一口径：每 ${cost.per100} 簇 ${cost.hoursPer100} 小时 ⇒ ${hoursBy100.toFixed(0)} 小时`);
  console.log(`  两口径差 ${Math.abs(hours - hoursBy100).toFixed(0)} 小时；正文取 ${cost.quotedHours} 小时（约一人一周），复算一致：${hours === cost.quotedHours ? '是' : '否'}`);
  console.log('');

  console.log('三、验收三项（都不需要标注，都能写进验收报告）');
  console.log(`  其一 Top-${acc.topK} 落点：${acc.queries[0]}–${acc.queries[1]} 个查询词，明显不相关超过 ${(acc.badShare * 100).toFixed(0)}% 即不可用于临床检索`);
  console.log(`  其二 同义词对命中率：${acc.synonymPairs} 对已确认同义，看 A 的 Top-${acc.topK} 里有没有 B`);
  console.log('  其三 簇纯度：看簇是否与概念层级一致，暴露「层级被压平」');
  console.log(`  回归用例只需 ${acc.regressCases} 条 —— 术语表一改就跑，防止「改一个别名召回三十条不相干」。`);
  console.log('');

  console.log('四、重嵌入的触发条件（不是「定期重训」）');
  console.log(`  · 语料增补超过 ${(trig.corpusGrowth * 100).toFixed(0)}%`);
  console.log(`  · 三项验收指标任一项下降超过 ${(trig.metricDrop * 100).toFixed(0)} 个百分点`);
  console.log('  · 术语表发生结构性变更（新增或合并实体）');
  console.log('  嵌入必须带版本号，检索结果要能追到哪一版向量、哪一版术语表。');
  console.log('');
  console.log('※ 本章数字均从 docs/zh.md 现读现算；正文为演算设定，不对应任何实测模型或词表；输出仅用于教学演示，不构成诊疗或术语规范解释。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  readTable,
  parseCloseness,
  parseAlignmentSteps,
  parseReviewCost,
  parseAcceptance,
  parseReembedTriggers,
  main,
};
