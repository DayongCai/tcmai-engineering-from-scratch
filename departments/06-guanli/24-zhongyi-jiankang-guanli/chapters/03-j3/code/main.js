#!/usr/bin/env node
/**
 * 中医健康管理 · 第 3 章 辨识能不能用，取决于两个人会不会得出同一个结论
 * 课程: departments/06-guanli/24-zhongyi-jiankang-guanli/chapters/03-j3/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的清单与数字都从正文读出、再算一遍：条件控制四件事、落字段三条规则、三层天花板、
 * 分层表两规则、隐私三条底线，以及正文里那组一致人数与 κ —— 人数除以样本量必须落回
 * 文中写的百分比，κ 的升幅也要对得上，否则脚本报不一致。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 3;
const TITLE = '辨识能不能用，取决于两个人会不会得出同一个结论';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function hanzi(text) {
  return (String(text || '').match(HANZI) || []).length;
}

function sections(body) {
  const out = [];
  let cur = { title: '', lines: [], hanzi: 0 };
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) {
      cur = { title: h[1], lines: [], hanzi: 0 };
      out.push(cur);
      continue;
    }
    cur.lines.push(line);
    cur.hanzi += hanzi(line);
  }
  return out;
}

function sectionText(body, prefix) {
  const s = sections(body).find((x) => x.title.startsWith(prefix));
  if (!s) throw new Error('正文里没有以「' + prefix + '」开头的一节');
  return s.lines.join('\n');
}

/** 表格行拆成单元格（去掉首尾空列）。 */
function cells(line) {
  return line.split('|').map((c) => c.trim()).filter(Boolean);
}
const isSep = (line) => /^\|[\s|:-]+\|?$/.test(line.trim());

/** 第一节：条件控制的四件事（首列是条件名）。 */
function collectConditions(body) {
  const rows = sectionText(body, '一、')
    .split('\n')
    .filter((l) => l.trim().startsWith('|') && !isSep(l))
    .map(cells);
  return rows.slice(1).map((c) => ({ name: c[0], fix: c[1], risk: c[2] }));
}

/** 第二节：落字段的三条经验规则（加粗小标题）。 */
function fieldRules(body) {
  return [...sectionText(body, '二、').matchAll(/^\*\*([^*\n]+?)。\*\*/gm)].map((m) => m[1].trim());
}

/** 第三节：三层天花板。 */
function ceilings(body) {
  return [...sectionText(body, '三、').matchAll(/^\*\*第([一二三])层天花板是([^*\n]+?)。\*\*/gm)].map((m) => ({
    n: m[1],
    what: m[2].trim(),
  }));
}

/** 第四节：分层表的 2×2 格与两条使用规则。 */
function stratGrid(body) {
  const t = sectionText(body, '四、');
  const lines = t.split('\n').filter((l) => l.trim().startsWith('|') && !isSep(l));
  const cols = cells(lines[0]);
  const rows = lines.slice(1).map((l) => {
    const c = cells(l);
    return { state: c[0].replace(/\*\*/g, ''), cells: c.slice(1) };
  });
  return { cols, rows };
}

function useRules(body) {
  return [...sectionText(body, '四、').matchAll(/^\*\*规则([一二])：([^*\n]+?)。\*\*/gm)].map((m) => ({
    n: m[1],
    rule: m[2].trim(),
  }));
}

/** 第五节：隐私三条底线。 */
function privacyLines(body) {
  const m = sectionText(body, '五、').match(/三条底线：([^。]+)。/);
  if (!m) throw new Error('正文里没有「三条底线：」这句');
  return m[1].split('；').map((s) => s.trim()).filter(Boolean);
}

/** 第五节的 κ 与一致人数：人数 ÷ 样本量必须落回文中百分比。 */
function kappaStudy(body) {
  const total = Number((body.match(/同一批\s*(\d+)\s*名服务对象/) || [])[1]);
  const b = body.match(/主类一致的\s*(\d+)\s*人（(\d+)%）/);
  const a = body.match(/升到\s*(\d+)\s*人（(\d+)%）/);
  if (!total || !b || !a) throw new Error('正文里没有完整的一致人数与样本量');
  const kappas = [...body.matchAll(/κ\s*约\s*([0-9.]+)/g)].map((m) => Number(m[1]));
  const round = (num) => Math.round((num / total) * 100);
  return {
    total,
    before: { n: Number(b[1]), pct: Number(b[2]), recomputed: round(Number(b[1])) },
    after: { n: Number(a[1]), pct: Number(a[2]), recomputed: round(Number(a[1])) },
    kappas,
    lift: Number((kappas[kappas.length - 1] - kappas[0]).toFixed(2)),
  };
}

/** 第四节：风险因素清单（实测来源那一串）。 */
function riskFactors(body) {
  const m = body.match(/年龄、血压、血糖、血脂、体重与腰围、吸烟饮酒、家族史、既往事件/);
  if (!m) throw new Error('正文里没有风险因素清单');
  return m[0].split('、').map((s) => s.trim());
}

function audit(body) {
  const conds = collectConditions(body);
  const rules = fieldRules(body);
  const caps = ceilings(body);
  const grid = stratGrid(body);
  const use = useRules(body);
  const privacy = privacyLines(body);
  const study = kappaStudy(body);
  const factors = riskFactors(body);

  const claims = [
    { label: '四件事', want: 4, got: conds.length },
    { label: '三条经验规则', want: 3, got: rules.length },
    { label: '三层天花板', want: 3, got: caps.length },
    { label: '两条使用规则', want: 2, got: use.length },
    { label: '三条底线', want: 3, got: privacy.length },
    { label: '分层四格', want: 4, got: grid.rows.length * grid.cols.length },
    { label: '风险因素八项', want: 8, got: factors.length },
  ];
  const mismatched = claims.filter((c) => c.want !== c.got).map((c) => c.label);
  const pctBad = [
    study.before.recomputed !== study.before.pct ? '第一次一致率' : '',
    study.after.recomputed !== study.after.pct ? '第二次一致率' : '',
  ].filter(Boolean);

  return { conds, rules, caps, grid, use, privacy, study, factors, claims, mismatched, pctBad };
}

function main() {
  const body = read();
  const a = audit(body);
  const secs = sections(body).filter((s) => s.title);
  const cites = [...new Set([...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]))];

  console.log(`中医健康管理 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下条数、人数与汉字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi(body)} 字 · 节 ${secs.length} 节 · 引书 ${cites.length} 部`);
  console.log('');
  console.log('条件控制四件事（不固定会怎样）：');
  for (const c of a.conds) console.log(`  ${c.name}：${c.risk}`);
  console.log('');
  console.log(`落字段 ${a.rules.length} 条规则：${a.rules.join('／')}`);
  console.log(`三层天花板：${a.caps.map((c) => `第${c.n}层 ${c.what}`).join('；')}`);
  console.log(`分层表 ${a.grid.rows.length}×${a.grid.cols.length}：状态〔${a.grid.rows.map((r) => r.state).join('／')}〕× 风险〔${a.grid.cols.join('／')}〕`);
  console.log(`使用规则：${a.use.map((u) => `规则${u.n} ${u.rule}`).join('；')}`);
  console.log(`隐私底线 ${a.privacy.length} 条：${a.privacy.join('；')}`);
  console.log('');
  const s = a.study;
  console.log(`一致性复算：样本 ${s.total} 人；${s.before.n}/${s.total} = ${s.before.recomputed}%（文中 ${s.before.pct}%）；` +
    `${s.after.n}/${s.total} = ${s.after.recomputed}%（文中 ${s.after.pct}%）`);
  console.log(`κ 由 ${s.kappas[0]} 升到 ${s.kappas[s.kappas.length - 1]}，升幅 ${s.lift}；` +
    `口径：κ 低于 0.4 较差、0.6 以上可接受，报数须同时给样本量与比对方式。`);
  console.log('');
  console.log(`条数对账：${a.mismatched.length ? '不一致，须改稿 —— ' + a.mismatched.join('、') : '一致'}`);
  console.log(`百分比复算：${a.pctBad.length ? '不一致，须改稿 —— ' + a.pctBad.join('、') : '一致'}`);
  console.log('');
  console.log('→ 判据：辨识的价值不在判得准，在换个人也这么判；一致性靠条件与词表，不靠经验。');
  console.log('※ 条数、人数与汉字均从本章 docs/zh.md 现算，正文一改即随之变化；本输出仅用于教学演示，不构成诊疗意见，也不构成筛查方案推荐。');
}

if (require.main === module) main();

module.exports = {
  DOC, CHAPTER, TITLE, read, hanzi, sections, sectionText,
  collectConditions, fieldRules, ceilings, stratGrid, useRules, privacyLines, kappaStudy, riskFactors, audit,
};
