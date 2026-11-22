#!/usr/bin/env node
/**
 * 中医知识图谱 · 第 6 章 「恶寒重、发热轻、无汗」有几种存法，只有一种能算
 * 课程: departments/07-zhineng/05-zhongyi-zhishi-tupu/chapters/06-j6/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 从正文现算：三层表示的列数、字段完整度里每一栏的命中率、
 * 为 0 的字段有几个、索引文档数与其中两类之和、双虚表的张数、
 * 以及那三个容易被误读的聚类指标值。完整率一律分子除以分母，不写死小数。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 6;
const TITLE = '「恶寒重、发热轻、无汗」有几种存法，只有一种能算';

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

/**
 * 解析「证候   97/97     病性  92 …」这种空格对齐的键值块。
 * 键可能是汉字、缩写（ICD / WHO），值可能是 97/97 的比值。
 */
function keyValues(block) {
  const tokens = String(block).split(/[\s　]+/).filter(Boolean);
  const out = {};
  for (let i = 0; i < tokens.length; i += 1) {
    const key = tokens[i];
    if (!/^[A-Za-z\u4e00-\u9fff][A-Za-z\u4e00-\u9fff_]*$/.test(key)) continue;
    let j = i + 1;
    // 允许键与值之间夹一个汉字后缀（如「WHO 术语 26」）
    while (j < tokens.length && !/^\d+(\/\d+)?$/.test(tokens[j]) && j - i <= 2) j += 1;
    if (j >= tokens.length || !/^\d+(\/\d+)?$/.test(tokens[j])) continue;
    const parts = tokens[j].split('/').map(Number);
    out[key] = { value: parts[0], total: parts.length > 1 ? parts[1] : null };
    i = j;
  }
  return out;
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const tables = parseTables(body);

  // 三层表示
  const layerTable = tables.find((t) => t.header.join('').includes('能做什么'));
  const layers = layerTable ? layerTable.rows.map((r) => r[0]) : [];

  // 字段完整度
  const fieldFence = fences(body).find((f) => f.includes('证候') && f.includes('主症'));
  const fields = fieldFence ? keyValues(fieldFence) : {};
  const base = fields['证候'] && fields['证候'].total ? fields['证候'].total : null;
  const zeroLine = fieldFence ? (fieldFence.match(/([a-z_]+(?:\s*\/\s*[a-z_]+)+)\s*=\s*0/) || [])[1] : null;
  const zeroFields = zeroLine ? zeroLine.split('/').map((s) => s.trim()).filter(Boolean) : [];

  const rate = (k) => (base && fields[k] ? fields[k].value / base : null);

  // 索引规模
  const idxFence = fences(body).find((f) => f.includes('文档数'));
  const docCountHit = body.match(/文档数\s+(\d+)\s*（(\d+)\s*个病证单元\s*\+\s*(\d+)\s*个其他概念）/);
  const vocabHit = body.match(/词表\s+([\d,]+)/);
  const ftsTables = idxFence ? [...new Set(idxFence.match(/docs_[a-z]+/g) || [])] : [];

  // 聚类指标
  const knnName = body.match(/knn 纯度（按证名后缀分族）\s+([\d.]+)/);
  const knnDisease = body.match(/knn 纯度（按疾病分族）\s+([\d.]+)/);
  const withContext = body.match(/只送证名描述时该值为\s*([\d.]+)/);

  // 三类存储
  const storeTable = tables.find((t) => t.header.join('').includes('擅长'));
  const stores = storeTable ? storeTable.rows.map((r) => r[0]) : [];

  // 枚举字段
  const enumTable = tables.find((t) => t.header[0] === '字段' && t.header.join('').includes('越界怎么办'));
  const enumFields = enumTable ? enumTable.rows.map((r) => r[0]) : [];

  return {
    body,
    hanzi: (body.match(HANZI) || []).length,
    layers,
    fields,
    base,
    zeroFields,
    rate,
    docCount: docCountHit ? num(docCountHit[1]) : null,
    dsuDocs: docCountHit ? num(docCountHit[2]) : null,
    otherDocs: docCountHit ? num(docCountHit[3]) : null,
    vocab: vocabHit ? num(vocabHit[1]) : null,
    ftsTables,
    knnName: knnName ? Number(knnName[1]) : null,
    knnDisease: knnDisease ? Number(knnDisease[1]) : null,
    knnWithContext: withContext ? Number(withContext[1]) : null,
    stores,
    enumFields,
    noBackfill: /空字段不占位、不倒推/.test(body),
    enumIsContract: /接口契约/.test(body),
    purityNotAccuracy: /不是准确率/.test(body),
  };
}

function main() {
  const a = analyze(read());
  const pct = (x) => (x == null ? '—' : (x * 100).toFixed(1) + '%');

  console.log(`中医知识图谱 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`正文 ${a.hanzi} 汉字 · 表示层 ${a.layers.length} 层（${a.layers.join(' / ')}）`);
  console.log('');
  console.log(`字段完整度（分母 = 证候条数 ${a.base}）：`);
  for (const k of ['证候', '病性', '病位', '动作', '病机', '主症', '病', 'ICD', 'WHO']) {
    if (!a.fields[k]) continue;
    const f = a.fields[k];
    console.log(`  ${k.padEnd(4, '　')} ${String(f.value).padStart(3)}${f.total ? '/' + f.total : ''}　${pct(a.rate(k))}`);
  }
  console.log(`  恒为 0 的字段 ${a.zeroFields.length} 个：${a.zeroFields.join(' / ')}`);
  console.log(`  → 以六经为轴的统计做不出来，原因是字段不存在，不是算法不行`);
  console.log('');
  console.log(`索引：文档 ${a.docCount} = 病证单元 ${a.dsuDocs} + 其他概念 ${a.otherDocs}；词表 ${a.vocab} 条；FTS5 虚表 ${a.ftsTables.length} 张（${a.ftsTables.join(' / ')}）`);
  console.log(`聚类纯度：按证名后缀 ${a.knnName} · 按疾病 ${a.knnDisease}；只送证名描述时 ${a.knnWithContext}，补语境后下降`);
  console.log('');
  console.log(`三类存储：${a.stores.join(' / ')}；枚举字段 ${a.enumFields.length} 组：${a.enumFields.join(' / ')}`);
  console.log(`空字段不占位不倒推：${a.noBackfill ? '已写明' : '未出现'} · 枚举即接口契约：${a.enumIsContract ? '已写明' : '未出现'}`);
  console.log(`纯度不可当准确率引用：${a.purityNotAccuracy ? '已写明' : '未出现'}`);
  console.log('');
  console.log('※ 数字由本章正文现算，正文一改即随之变化；本章为数据表示讨论，不构成医学意见。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, analyze, parseTables, fences, keyValues, num };
