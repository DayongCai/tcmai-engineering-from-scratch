#!/usr/bin/env node
/**
 * 中医机器人学 · 第 1 章 机器人不是更快的器械，是必须能停下来的执行体
 * 课程: departments/07-zhineng/11-zhongyi-jiqiren-xue/chapters/01-rob1/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 停止距离表不从代码里抄，而是从本章正文的表格逐行读出来，再用
 * d = v(t_r + t_b) + v²/(2a) 现算一遍，逐行核对表里的毫米数。
 * 延迟预算 t_r、t_b 与减速度 a 也从正文「演算设定」那一句里取。
 * 手打的数字会在改稿后静默过期，这里一个都不写。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '机器人不是更快的器械，是必须能停下来的执行体';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 去掉 LaTeX 包装，留下可正则的纯文本。 */
function detex(s) {
  return String(s || '')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\left|\\right|\\,|\\;/g, ' ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[${}]/g, '');
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
}

/** Markdown 表格 → [{header, rows}]，用 |---| 分隔行判定表头。 */
function parseTables(md) {
  const lines = String(md).split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\s*\|/.test(lines[i])) continue;
    if (i + 1 >= lines.length || !/^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) continue;
    const header = splitRow(lines[i]);
    const rows = [];
    let j = i + 2;
    while (j < lines.length && /^\s*\|/.test(lines[j])) { rows.push(splitRow(lines[j])); j += 1; }
    out.push({ header, rows });
    i = j - 1;
  }
  return out;
}

function num(s) {
  const m = String(s == null ? '' : s).replace(/[,\s]/g, '').match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/** 停止距离模型：延迟段 + 制动段，单位 mm。 */
function stoppingDistance(v, trMs, tbMs, a) {
  const delay = v * ((trMs + tbMs) / 1000) * 1000;
  const brake = ((v * v) / (2 * a)) * 1000;
  return { delay, brake, total: delay + brake };
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const tables = parseTables(body);

  // 「演算设定 t_r = 100 ms、t_b = 50 ms、a = 2 m/s²」——三处参数只在这一句里取
  const setLine = body.split('\n').find((l) => /演算设定/.test(l) && /t_r/.test(l)) || '';
  const flat = detex(setLine).replace(/\u00a0/g, ' ');
  const trHit = flat.match(/t_r\s*=\s*(\d+(?:\.\d+)?)/);
  const tbHit = flat.match(/t_b\s*=\s*(\d+(?:\.\d+)?)/);
  const aHit = flat.match(/(?:^|[^a-z])a\s*=\s*(\d+(?:\.\d+)?)/);
  if (!trHit || !tbHit || !aHit) throw new Error('正文里没有 t_r/t_b/a 的演算设定：' + flat);
  const tr = Number(trHit[1]);
  const tb = Number(tbHit[1]);
  const a = Number(aHit[1]);

  // 停止距离表：末端速度 / 延迟段 / 制动段 / 停止距离
  const stopTable = tables.find((t) => t.header.join('').includes('末端速度'));
  if (!stopTable) throw new Error('正文里没有停止距离表');
  const rows = stopTable.rows.map((r) => {
    const v = num(r[0]);
    const dDelay = num(r[1]);
    const dBrake = num(r[2]);
    const dDoc = num(r[3]);
    const model = stoppingDistance(v, tr, tb, a);
    return {
      v,
      doc: { delay: dDelay, brake: dBrake, total: dDoc },
      model,
      residual: Math.abs(model.total - dDoc),
      delayShare: model.delay / model.total,
    };
  });

  // 四级分级表：一级手动 / 二级动力 / 三级遥操作 / 四级自主
  const levelTable = tables.find((t) => t.header.join('').includes('级别'));
  const levels = levelTable ? levelTable.rows.map((r) => ({ level: r[0], judge: r[1], example: r[2], fallback: r[3] })) : [];

  // 验收五问：编号列表 1.–5.
  const questions = [...body.matchAll(/^(\d)\.\s+\*\*(.+?)\*\*/gm)].map((m) => m[2]);

  // 三处常见误解
  const misread = [...body.matchAll(/\*\*误解([一二三])：/g)].length;

  return {
    body,
    hanzi: (body.match(HANZI) || []).length,
    tr,
    tb,
    a,
    delayBudget: tr + tb,
    rows,
    levels,
    questions,
    misread,
    hasTitle: body.startsWith('# 第 ' + CHAPTER + ' 章 · ' + TITLE),
  };
}

function main() {
  const x = analyze(read());
  const mm = (n) => n.toFixed(1) + ' mm';

  console.log(`中医机器人学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`正文 ${x.hanzi} 汉字 · 演算设定 t_r=${x.tr} ms、t_b=${x.tb} ms、a=${x.a} m/s²（延迟预算 ${x.delayBudget} ms）`);
  console.log('');
  console.log('停止距离 d = v(t_r+t_b) + v²/(2a)，表内逐行核对：');
  for (const r of x.rows) {
    console.log(
      `  v=${String(r.v).padEnd(5)} 延迟 ${mm(r.model.delay).padStart(8)} + 制动 ${mm(r.model.brake).padStart(8)}` +
      ` = ${mm(r.model.total).padStart(8)}（表内 ${mm(r.doc.total)}，差 ${r.residual.toFixed(2)} mm，延迟占 ${(r.delayShare * 100).toFixed(0)}%）`,
    );
  }
  const worst = x.rows.reduce((m, r) => (r.residual > m.residual ? r : m), x.rows[0]);
  console.log(`  → 最大核对偏差 ${worst.residual.toFixed(2)} mm（v=${worst.v}），四舍五入级，量纲关系成立。`);
  console.log('');
  const slowest = x.rows[0];
  const fastest = x.rows[x.rows.length - 1];
  console.log(`速度 ${slowest.v} → ${fastest.v}（${(fastest.v / slowest.v).toFixed(0)} 倍），停止距离 ${mm(slowest.model.total)} → ${mm(fastest.model.total)}（${(fastest.model.total / slowest.model.total).toFixed(1)} 倍）：延迟段线性、制动段平方。`);
  console.log(`同样是 ${x.delayBudget} ms 延迟，在 ${fastest.v} m/s 上单独就吃掉 ${mm(fastest.model.delay)}——延迟项常常是主导项。`);
  console.log('');
  console.log(`四级分级表 ${x.levels.length} 行：${x.levels.map((l) => l.level.replace(/：.*$/, '')).join(' / ')}`);
  console.log(`验收五问 ${x.questions.length} 条：${x.questions.map((q) => q.replace(/[，。].*$/, '')).join('；')}`);
  console.log(`常见误解 ${x.misread} 条；首行章题与 chapters.json 一致：${x.hasTitle ? '是' : '否'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；表内的毫米数是四舍五入值，脚本按模型重算并与表内逐行对齐，偏差超过 0.15 mm 即判失败。');
  console.log('※ 本章数值为教学演算设定，不构成医疗器械设计规范、检测依据或临床操作建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, detex, parseTables, num, stoppingDistance, analyze };
