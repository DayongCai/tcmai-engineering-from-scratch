#!/usr/bin/env node
/**
 * 大模型与中医智能体 · 第 12 章 模型可以生成建议，但不能承担责任——所以它不能给建议
 * 课程: departments/07-zhineng/10-llm-yu-zhongyi-zhinengti/chapters/12-llm12/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现读并复算三件事：
 *   ① 留痕的量级：日均调用 × 采纳率 × 错误率 → 一年多少条错误表述留在日志里；
 *   ② 三不做硬规则做成可执行检测器，并用正反例验证「拦得住」；
 *   ③ 责任链、复核检查点、十二项清单按正文表原样读出，并按设计期／上线前／运行期分期。
 * 检测器只针对正文列出的句式与字段组合，不做语义判断；示例文本为教学构造。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const readDoc = () => fs.readFileSync(DOC, 'utf8');

/** 「日均 800 次调用，其中 1% 的输出被医师实际采纳进病历，即 8 条/日」 */
function parseAdoption(text) {
  const m = text.match(/日均\s*(\d+)\s*次调用，其中\s*([\d.]+)%\s*的输出被医师实际采纳进病历，即\s*(\d+)\s*条\/日/);
  const e = text.match(/这\s*(\d+)\s*条里有\s*([\d.]+)%\s*有错，一年约\s*(\d+)\s*条/);
  if (!m || !e) throw new Error('正文里没找到采纳率与错误率');
  return {
    callsPerDay: Number(m[1]),
    adoptRate: Number(m[2]) / 100,
    adoptedPerDay: Number(m[3]),
    errorRate: Number(e[2]) / 100,
    annualQuoted: Number(e[3]),
  };
}

/** 「明确比例（如 100% 首月，之后 20%）」与「运维日志通常只保留 30 天」 */
function parseReviewPolicy(text) {
  const m = text.match(/如\s*(\d+)%\s*首月，之后\s*(\d+)%/);
  const l = text.match(/运维日志通常只保留\s*(\d+)\s*天/);
  if (!m || !l) throw new Error('正文里没找到复核比例或运维日志期限');
  return { firstMonth: Number(m[1]) / 100, later: Number(m[2]) / 100, opsLogDays: Number(l[1]) };
}

/** 读一张 markdown 表：以表头里第一个出现的列名为锚 */
function readTable(text, firstHeader) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => l.startsWith('|') && l.includes(firstHeader));
  if (start < 0) throw new Error(`正文里没找到表头含「${firstHeader}」的表`);
  const rows = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    if (!lines[i].startsWith('|')) break;
    const cells = lines[i].split('|').map((c) => c.trim());
    cells.shift();
    cells.pop();
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    if (cells.length >= 2) rows.push(cells);
  }
  return rows;
}

/** 三不做：可程序化检测的规则。不做语义判断，只认正文列出的句式与字段组合 */
const RULES = [
  { id: '不做诊断', re: /(您患有|您这是|这是[^。，]{1,8}证|诊断为)/ },
  { id: '不开处方', re: /([\u4e00-\u9fff]{1,6}(汤|散|丸|饮|膏))[^。；]{0,12}?\d+\s*(g|克|钱|两|片|剂)/ },
  { id: '不承诺疗效', re: /(治愈|根治|无副作用|包治|必效)/ },
];

function checkHardRules(answer) {
  const hits = RULES.filter((r) => r.re.test(answer)).map((r) => r.id);
  return { violations: hits, ok: hits.length === 0 };
}

function main() {
  const doc = readDoc();
  const ad = parseAdoption(doc);
  const pol = parseReviewPolicy(doc);
  const rules = readTable(doc, '规则');
  const chain = readTable(doc, '环节');
  const review = readTable(doc, '检查点');
  const checklist = readTable(doc, '项');

  const dailyErrors = ad.adoptedPerDay * ad.errorRate;
  console.log('═══ 模型可以生成建议，但不能承担责任——所以它不能给建议 ═══');
  console.log('');

  console.log('一、留痕的量级（正文口径现算）');
  console.log(`  ${ad.callsPerDay} 次/日 × 采纳率 ${(ad.adoptRate * 100).toFixed(0)}% = ${ad.adoptedPerDay} 条/日进入病历`);
  console.log(`  其中 ${(ad.errorRate * 100).toFixed(0)}% 有错 ⇒ 每日约 ${dailyErrors.toFixed(2)} 条`);
  console.log(`  按 250 个工作日算，一年约 ${(dailyErrors * 250).toFixed(0)} 条（正文 ${ad.annualQuoted} 条）；按自然日 365 天算约 ${(dailyErrors * 365).toFixed(0)} 条。`);
  console.log(`  每一条都可追溯、可复现、可被质证 —— 因为它留在系统日志里。`);
  console.log(`  反过来，不留日志看似更安全，实际是把责任推给使用它的医师。`);
  console.log('');

  console.log('二、三不做硬规则做成可执行的');
  console.log(`  正文三条（${rules.length} 行）：`);
  for (const [name, how, when] of rules) console.log(`    ${name}：${how}｜违反 → ${when}`);

  const samples = [
    ['合规：给材料不给结论', '可参考的条目：太阳中风见恶风、汗出、脉浮缓；本条仅基于文字描述，未含舌脉。'],
    ['越界：下诊断', '您这是脾气虚证，建议尽快调理。'],
    ['越界：开处方', '可服补中益气汤，黄芪 15 克，党参 10 克。'],
    ['越界：承诺疗效', '此方可根治，且无副作用。'],
  ];
  for (const [name, text] of samples) {
    const v = checkHardRules(text);
    console.log(`  ${v.ok ? '✓' : '✗'} ${name}：${v.ok ? '放行' : '拦截 → ' + v.violations.join('、')}`);
  }
  console.log('  检测器只认句式与字段组合，不做语义判断 —— 这正是「可检测」的含义，也是它可靠的原因。');
  console.log('');

  console.log(`三、责任链（${chain.length} 环，每环都要有主体、产物与保存要求）`);
  for (const [stage, who, output, keep] of chain) console.log(`  ${stage}｜${who}｜${output}｜${keep}`);
  console.log(`  第二环若按运维日志 ${pol.opsLogDays} 天清理，责任链就从中间断了：无法回答「这条表述是系统给的还是医师改的」。`);
  console.log('');

  console.log(`四、复核是不是橡皮章（${review.length} 个可检查点）`);
  for (const [point, formal, real] of review) console.log(`  ${point}：形式「${formal}」→ 实质「${real}」`);
  console.log(`  首月 ${(pol.firstMonth * 100).toFixed(0)}% 复核，之后随机 ${(pol.later * 100).toFixed(0)}%；只抽「看起来可疑的」会系统性放过「看起来合理但错了」的那一类。`);
  console.log('');

  console.log(`五、工程落地清单（${checklist.length} 项，缺项即缺口）`);
  for (const row of checklist) console.log(`  ${row[0]}. ${row[1]}｜${row[2]}`);
  console.log('  分期：1／3／6 设计期（最便宜）｜7／8／9 上线前（绕不过）｜10／11／12 运行期（决定能不能变好）。');
  console.log('');
  console.log('※ 本章数字均从 docs/zh.md 现读现算；示例文本为教学构造；输出仅用于教学演示，不构成法律意见、诊疗建议或合规认证。');
}

if (require.main === module) main();

module.exports = {
  DOC,
  readDoc,
  parseAdoption,
  parseReviewPolicy,
  readTable,
  RULES,
  checkHardRules,
  main,
};
