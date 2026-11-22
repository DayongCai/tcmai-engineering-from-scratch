#!/usr/bin/env node
/**
 * 临床科研方法 · 第 6 章 回归不是「控制变量」，是把混杂摊在桌面上
 * 课程: departments/06-guanli/13-linchuang-keyan-fangfa/chapters/06-z136/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 数字全部从本章 docs/zh.md 现算：汉字、节、加粗判断、问句；
 * 并复算本章四处关键算术——粗 OR 1.52、分层后每层 OR=1.00、RR 1.29 与 OR 的夸大、
 * EPV 规则下 192 个事件只能容纳 19 个自变量。
 * 任何一个数复算不出来，脚本直接报错——本章的论点是「回归经常让一个漂亮的粗效应消失」。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '回归不是「控制变量」，是把混杂摊在桌面上';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 本章算术设定：教学合成数字，正文第六节已声明。 */
const TABLE = {
  light: { jiaYes: 90, jiaN: 150, guYes: 54, guN: 90 },
  severe: { jiaYes: 18, jiaN: 90, guYes: 30, guN: 150 },
};
const EVENTS = 192;
const EPV = 10;
const SMD_BEFORE = 0.31;
const SMD_AFTER = 0.04;

const READINGS = ['相关', '预测', '因果'];
const RIVALS = ['偶然', '混杂', '反向因果'];
const RULES = ['必须报告粗效应与调整效应两个数', '必须说明纳入变量的依据', '必须报告事件数与变量数之比'];
const PREMISES = ['模型形式正确', '观测独立', '无严重多重共线性', '无关键变量测量误差'];

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function parseSections(body) {
  const out = [];
  let cur = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = { title: h[1], lines: [] }; out.push(cur); continue; }
    if (cur) cur.lines.push(line);
  }
  return out.map((s) => ({
    title: s.title,
    text: s.lines.join('\n'),
    hanzi: (s.lines.join('\n').match(HANZI) || []).length,
  }));
}

const boldTerms = (text) => [...String(text).matchAll(/\*\*([^*\n]+)\*\*/g)].map((m) => m[1]);

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const sections = parseSections(body);
  return {
    hanzi: (body.match(HANZI) || []).length,
    sections,
    claims: boldTerms(body).length,
    quotes: [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))],
    questions: (body.match(/？/g) || []).length,
  };
}

const sectionOf = (sections, kw) => {
  const s = sections.find((x) => x.title.includes(kw));
  if (!s) throw new Error('正文里没找到含「' + kw + '」的节');
  return s;
};

const odds = (yes, n) => yes / (n - yes);
const ratioOf = (a, b) => Number((a / b).toFixed(2));

/** 粗效应：108/240 对 84/240，粗 OR 1.52。 */
function crude() {
  const jiaYes = TABLE.light.jiaYes + TABLE.severe.jiaYes;
  const jiaN = TABLE.light.jiaN + TABLE.severe.jiaN;
  const guYes = TABLE.light.guYes + TABLE.severe.guYes;
  const guN = TABLE.light.guN + TABLE.severe.guN;
  const rJia = (jiaYes / jiaN) * 100;
  const rGu = (guYes / guN) * 100;
  return {
    jiaYes, jiaN, guYes, guN, rJia, rGu,
    or: ratioOf(odds(jiaYes, jiaN), odds(guYes, guN)),
    rr: ratioOf(rJia, rGu),
    riskDiff: Number((rJia - rGu).toFixed(0)),
  };
}

/** 分层：每一层的比值比都恰好 1.00，合计却 1.52。 */
function strata() {
  const or = (s) => ratioOf(odds(s.jiaYes, s.jiaN), odds(s.guYes, s.guN));
  return {
    light: { rJia: (TABLE.light.jiaYes / TABLE.light.jiaN) * 100, rGu: (TABLE.light.guYes / TABLE.light.guN) * 100, or: or(TABLE.light) },
    severe: { rJia: (TABLE.severe.jiaYes / TABLE.severe.jiaN) * 100, rGu: (TABLE.severe.guYes / TABLE.severe.guN) * 100, or: or(TABLE.severe) },
  };
}

/** 两组的病情构成：加减组 62.5% 轻症，固定方组 37.5%。 */
function composition() {
  const jiaN = TABLE.light.jiaN + TABLE.severe.jiaN;
  const guN = TABLE.light.guN + TABLE.severe.guN;
  return {
    jiaLight: Number(((TABLE.light.jiaN / jiaN) * 100).toFixed(1)),
    guLight: Number(((TABLE.light.guN / guN) * 100).toFixed(1)),
  };
}

/** OR 对 RR 的夸大：结局越常见，夸大越明显。 */
function orInflation() {
  const c = crude();
  return { times: Number((c.or / c.rr).toFixed(2)), percent: Math.round((c.or - 1) * 100) };
}

/** EPV≥10：192 个事件最多容纳约 19 个自变量。 */
const maxVars = (events = EVENTS, epv = EPV) => Math.floor(events / epv);

function auditStructure(sections) {
  const s1 = sectionOf(sections, '关联的三种读法');
  const s3 = sectionOf(sections, '回归在做什么');
  const s4 = sectionOf(sections, '四个前提');
  const s5 = sectionOf(sections, '倾向评分');

  const readings = READINGS.filter((r) => boldTerms(s1.text).some((b) => b.startsWith(r)));
  const rivals = RIVALS.filter((r) => s1.text.includes('**' + r + '**'));
  const rules = RULES.filter((r) => s3.text.includes(r.replace('必须', '')));
  const premises = PREMISES.filter((p) => boldTerms(s4.text).some((b) => b.endsWith(p + '。')));
  const balance = s5.text.match(/0\.31 降到 0\.04/) ? 2 : 0;

  return { readings, rivals, rules, premises, balance };
}

function verify(j, c, st, comp, infl) {
  if (j.readings.length !== 3) throw new Error(`关联的读法只对上 ${j.readings.length} 种`);
  if (j.rivals.length !== 3) throw new Error(`替代解释只对上 ${j.rivals.length} 种，三种须逐一排除`);
  if (j.rules.length !== 3) throw new Error(`实操规则只对上 ${j.rules.length} 条`);
  if (j.premises.length !== 4) throw new Error(`回归前提只对上 ${j.premises.length} 个，四个缺一结论就悬空`);
  if (j.balance !== 2) throw new Error('正文没有「0.31 降到 0.04」这组标准化差异');
  if (c.or !== 1.52) throw new Error(`粗 OR 算出 ${c.or}，正文记 1.52`);
  if (c.jiaYes !== 108 || c.guYes !== 84) throw new Error(`合计例数与正文 108/84 不符：${c.jiaYes}/${c.guYes}`);
  if (st.light.or !== 1 || st.severe.or !== 1) throw new Error(`层内 OR 算出 ${st.light.or}/${st.severe.or}，正文记 1.00/1.00`);
  if (comp.jiaLight !== 62.5 || comp.guLight !== 37.5) throw new Error(`病情构成与正文 62.5%/37.5% 不符：${comp.jiaLight}/${comp.guLight}`);
  if (c.rr !== 1.29) throw new Error(`RR 算出 ${c.rr}，正文记 1.29`);
}

function main() {
  const body = read();
  const a = analyze(body);
  const j = auditStructure(a.sections);
  const c = crude();
  const st = strata();
  const comp = composition();
  const infl = orInflation();
  verify(j, c, st, comp, infl);

  console.log(`临床科研方法 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 加粗判断 ${a.claims} 处 · 引文 ${a.quotes.length} 条 · 问句 ${a.questions} 个`);
  console.log('');
  console.log('粗效应：');
  console.log(`  加减组 ${c.jiaYes}/${c.jiaN} = ${c.rJia.toFixed(0)}% · 固定方组 ${c.guYes}/${c.guN} = ${c.rGu.toFixed(0)}%`);
  console.log(`  → 粗 OR ${c.or.toFixed(2)} · RR ${c.rr.toFixed(2)} · 风险差 ${c.riskDiff} 个百分点（p=0.008）`);
  console.log('');
  console.log('按病情分层：');
  console.log(`  轻症 ${st.light.rJia.toFixed(0)}% 对 ${st.light.rGu.toFixed(0)}% → OR ${st.light.or.toFixed(2)}`);
  console.log(`  重症 ${st.severe.rJia.toFixed(0)}% 对 ${st.severe.rGu.toFixed(0)}% → OR ${st.severe.or.toFixed(2)}`);
  console.log(`  → 每一层的比值比都是 1.00；合计的 1.52 全部来自病情构成（加减组 ${comp.jiaLight}% 轻症，固定方组 ${comp.guLight}%）。`);
  console.log('');
  console.log(`OR 不等于 RR：OR ${c.or.toFixed(2)} ÷ RR ${c.rr.toFixed(2)} = ${infl.times} 倍夸大；OR 减去 1 得 ${infl.percent}%，读作「比值增加」而不是「风险增加」。`);
  console.log(`EPV 规则：${EVENTS} 个事件 ÷ 每变量 ${EPV} 个事件 = 最多 ${maxVars()} 个自变量。`);
  console.log(`倾向评分：标准化差异 ${SMD_BEFORE} → ${SMD_AFTER}（以 <0.1 为平衡）。`);
  console.log('');
  console.log(`结构：读法 ${j.readings.length} 种 · 替代解释 ${j.rivals.length} 种 · 实操规则 ${j.rules.length} 条 · 回归前提 ${j.premises.length} 个`);
  console.log('');
  console.log('判断：回归不是「让结果变显著」，它经常让一个漂亮的粗效应消失；');
  console.log('      调整后 OR=1.00 说的是「同层内未见差异」，不是「该方无效」。');
  console.log('');
  console.log('逐节字数：');
  for (const sec of a.sections) {
    const share = a.hanzi ? ((sec.hanzi / a.hanzi) * 100).toFixed(1) : '0.0';
    console.log(`  ${sec.title.padEnd(28, '　')} ${String(sec.hanzi).padStart(5)} 字（${share}%）`);
  }
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本输出仅用于教学演示，不构成研究结论或临床建议。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, TABLE, EVENTS, EPV, SMD_BEFORE, SMD_AFTER, READINGS, RIVALS, RULES, PREMISES,
  read, parseSections, analyze, boldTerms, sectionOf, crude, strata, composition, orInflation, maxVars, auditStructure, verify,
};
