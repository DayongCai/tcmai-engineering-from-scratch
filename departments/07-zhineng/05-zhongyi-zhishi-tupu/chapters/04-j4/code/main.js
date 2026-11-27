#!/usr/bin/env node
/**
 * 中医知识图谱 · 第 4 章 一棵树值不值钱，取决于它能不能被重跑出来
 * 课程: departments/07-zhineng/05-zhongyi-zhishi-tupu/chapters/04-j4/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现算：管道的级数、六类边、四类源、五类自检断言、
 * 检索栈的通道数与融合参数、装配步骤、schema 的必填字段。
 * 这些量合起来回答一个问题：树是不是真的能被重跑出来。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '一棵树值不值钱，取决于它能不能被重跑出来';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim());
}

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

function fences(md) {
  return [...String(md).matchAll(/```[a-z]*\n([\s\S]*?)```/g)].map((m) => m[1]);
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const tables = parseTables(body);

  // 管道：源层 → 单元层 → 骨架层 → 叶层 → 关系/簇层 → 视图层 → 交付层
  const pipeFence = fences(body).find((f) => f.includes('单元层'));
  const pipeline = pipeFence
    ? pipeFence.split('→').map((s) => s.split('（')[0].trim()).filter(Boolean)
    : [];

  // 六类边
  const edgeTable = tables.find((t) => t.header.join('').includes('用途'));
  const edgeTypes = edgeTable
    ? edgeTable.rows.map((r) => (r[0].match(/`([a-z_]+)`/) || [])[1]).filter(Boolean)
    : [];

  // 四类源
  const srcTable = tables.find((t) => t.header.join('').includes('主要坑'));
  const sources = srcTable ? srcTable.rows.map((r) => r[0]) : [];

  // 五类自检断言
  const ASSERT_KEYS = ['结构完整性', '树导航', '图邻接', '检索', '接口路由'];
  const asserts = ASSERT_KEYS.filter((k) => body.includes(k));

  // 检索栈：四段，最后一段是 RRF，参数 k=60
  const rrf = body.match(/RRF，k\s*=\s*(\d+)/);
  const stackHit = body.match(/字符 n-gram 分词\s*→\s*TF-IDF\s*→[^\n]*?→\s*([^。\n]+)/);

  // 上下文装配的四步（围栏里的编号列表）
  const asmFence = fences(body).find((f) => /^\s*1\.\s/m.test(f) && f.includes('neighbors'));
  const asmSteps = asmFence
    ? asmFence.split('\n').map((l) => l.trim()).filter((l) => /^\d+\./.test(l)).length
    : 0;

  // schema 必填字段
  const fieldHit = body.match(/节点必须有\s*([^。\n]+)/);
  const nodeFields = fieldHit
    ? fieldHit[1].replace(/`/g, '').split('，')[0].split('/').map((s) => s.trim()).filter(Boolean)
    : [];

  return {
    body,
    hanzi: (body.match(HANZI) || []).length,
    pipeline,
    edgeTypes,
    sources,
    asserts,
    rrfK: rrf ? num(rrf[1]) : null,
    stackTail: stackHit ? stackHit[1].trim() : '',
    asmSteps,
    nodeFields,
    noHandEdit: /生成物不许手改/.test(body),
    warnNotBreak: /告警不中断/.test(body),
    viewWriteback: /视图回写上游一律视为 bug/.test(body),
    neighborsFullTodo: /neighbors_full\(\)`?\s*尚未实现/.test(body),
  };
}

function main() {
  const a = analyze(read());

  console.log(`中医知识图谱 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`正文 ${a.hanzi} 汉字 · 管道 ${a.pipeline.length} 级 · 边型 ${a.edgeTypes.length} 类 · 源 ${a.sources.length} 类`);
  console.log('');
  console.log('单向管道：');
  a.pipeline.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  console.log('');
  console.log(`六类边：${a.edgeTypes.join(' / ')}`);
  console.log(`四类源：${a.sources.join(' / ')}`);
  console.log(`五类自检断言（命中 ${a.asserts.length}）：${a.asserts.join(' / ')}`);
  console.log('');
  console.log(`检索栈末端：${a.stackTail || '—'}；RRF 参数 k = ${a.rrfK}`);
  console.log(`装配步骤 ${a.asmSteps} 步 · schema 必填字段 ${a.nodeFields.length} 项：${a.nodeFields.join(' / ')}`);
  console.log('');
  console.log(`生成物不许手改：${a.noHandEdit ? '已写明' : '未出现'} · 抽不到时告警不中断：${a.warnNotBreak ? '已写明' : '未出现'}`);
  console.log(`视图回写上游视为 bug：${a.viewWriteback ? '已写明' : '未出现'} · neighbors_full() 未实现：${a.neighborsFullTodo ? '正文已交代' : '未交代'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章为构建与检索工程讨论，不含临床判断。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, parseTables, fences, num };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/\*\*/g, '').replace(/^[>\s#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
