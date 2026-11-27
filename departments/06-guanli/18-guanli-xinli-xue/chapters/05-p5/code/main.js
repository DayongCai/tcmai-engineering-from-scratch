#!/usr/bin/env node
/**
 * 管理心理学 · 第 5 章 绩效评价评的从来不是绩效，是主管对绩效的记忆与解释
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/05-p5/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章把「评价不准」拆成三层可算的东西：
 *   1. 知觉偏差清单（首因／近因／晕轮／刻板／对比），从正文加粗句逐条核对；
 *   2. 归因：凯利三信息 → 内／外；韦纳三维 → 情绪与动作。正文那张归因表被解析出来，
 *      并算出「最常被忽略的一格」占比；
 *   3. 压缩损失：一年按 250 个工作日算，压进 5 维 × 5 档 = 25 格，每格代表 10 天工作。
 * 偏差不能消除，只能约束——四条对冲机制各有成本，这在本脚本里也是明写的。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 5;
const TITLE = '绩效评价评的从来不是绩效，是主管对绩效的记忆与解释';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function sections(text) {
  return String(text || '')
    .split('\n')
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

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

const BIASES = ['首因效应', '近因效应', '晕轮效应', '刻板印象', '对比效应'];
const COUNTERS = ['结构化', '多源', '盲评与去身份化', '问责与留痕'];

function concepts(text) {
  const t = String(text || '');
  return {
    biases: BIASES.filter((b) => t.includes(b)),
    counters: COUNTERS.filter((c) => t.includes(c)),
    hasHalo: t.includes('晕轮效应'),
    hasSelfServing: t.includes('自利偏差'),
    hasFairness: t.includes('基本归因错误'),
  };
}

/** 正文那张归因表：管理者归因 → 典型动作 → 后果 */
function attributionTable(text) {
  const t = tables(text).find((x) => x.header[0] === '管理者的归因') || { rows: [] };
  return t.rows.map((r) => ({ cause: r[0], action: r[1], consequence: r[2] }));
}

/**
 * 凯利协变，按正文的三个信息取名：
 *   一致性 othersSame —— 别人在同样情境下是否也这样；
 *   区别性 elsewhereSame —— 此人在其他情境下是否也这样；
 *   共同性 onlyHere —— 是否只在此时此地这样。
 * 只有「仅他如此、在别处也如此、不是只在此时此地」三条同时成立，才轮到内部归因。
 */
function kelly({ othersSame, elsewhereSame, onlyHere }) {
  const internal = !othersSame && elsewhereSame && !onlyHere;
  return {
    othersSame,
    elsewhereSame,
    onlyHere,
    locus: internal ? '内部归因' : '外部归因',
    // 三者中只要有一项指向情境，就不该直接落到人身上
    hesitancy: internal ? '可以直接谈人' : '先查情境，再谈人',
  };
}

/** 韦纳三维：内外／稳定／可控 → 情绪与动作 */
function weiner({ internal, stable, controllable }) {
  if (internal && !stable && controllable) return { kind: '不努力', emotion: '愤怒', action: '批评、加压、扣绩效' };
  if (internal && stable && !controllable) return { kind: '能力不足', emotion: '同情', action: '培训、调岗' };
  if (!internal && !controllable) return { kind: '条件不备', emotion: '谅解', action: '减责、补资源' };
  return { kind: '未定', emotion: '—', action: '先补信息再归因' };
}

/** 压缩损失：一年 250 个工作日，压进 dims × levels 个格子 */
function compression(dims = 5, levels = 5, workdays = 250) {
  const cells = dims * levels;
  return {
    dims,
    levels,
    cells,
    workdays,
    daysPerCell: Number((workdays / cells).toFixed(2)),
    share: Number(((1 / cells) * 100).toFixed(2)),
  };
}

/** 纠偏问句：换一个人来，结果会不会一样 */
function replaceTest(sameResult) {
  return {
    sameResult,
    locus: sameResult ? '情境' : '人',
    next: sameResult ? '改岗位设计、流程或计量方式' : '再谈能力、意愿与支持',
  };
}

function main() {
  const text = read();
  const c = concepts(text);
  const tbl = attributionTable(text);
  const hanzi = (text.match(HANZI) || []).length;

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节 · 表格 ${tables(text).length} 张`);
  console.log(`知觉偏差 ${c.biases.length}/5：${c.biases.join(' · ')}`);
  console.log(`对冲机制 ${c.counters.length}/4：${c.counters.join(' · ')}`);
  console.log('');
  console.log('归因表（解析正文）：');
  for (const r of tbl) console.log(`  ${r.cause} → ${r.action} → ${r.consequence}`);
  const external = tbl.filter((r) => r.cause.includes('外部')).length;
  console.log(`  → ${tbl.length} 行里只有 ${external} 行指向情境；这一行最常被跳过，因为承认它等于承认管理有责任。`);
  console.log('');
  const k = kelly({ othersSame: false, elsewhereSame: true, onlyHere: false });
  console.log(`凯利三信息（别人不这样／他在别处也这样／不是只在此时此地）→ ${k.locus}；${k.hesitancy}`);
  const w = weiner({ internal: true, stable: true, controllable: false });
  console.log(`韦纳三维（内部／稳定／不可控）→ ${w.kind}：${w.emotion} → ${w.action}`);
  console.log('');
  const z = compression();
  console.log(`压缩损失：${z.workdays} 个工作日 → ${z.dims} 维 × ${z.levels} 档 = ${z.cells} 格，每格代表 ${z.daysPerCell} 天、占全年 ${z.share}%。`);
  console.log('  → 格子越细，越是在评填表能力，不是在评工作。');
  console.log('');
  const t = replaceTest(true);
  console.log(`纠偏问句（换一个人结果一样）→ 原因在${t.locus}：${t.next}`);
  console.log('');
  console.log('边界：本章不提供考核方案；偏差只能被约束，不能被消除，声称「一套量表就客观」只是把偏差转移给了量表设计者。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, tables, concepts, attributionTable, kelly, weiner, compression, replaceTest, BIASES, COUNTERS };

// 教学边界：口径只在正文维护一份，这里直接摘正文里含「不构成」的那一行。
try {
  const _zh = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
  const _bound = (_zh.match(/[^\n]*不构成[^\n]*/) || [])[0];
  if (_bound) {
    console.log(`\n教学边界：${_bound.replace(/^[>\s*#-]+/, '').trim().slice(0, 120)}`);
  }
} catch { /* 读不到正文就不打，不编一句 */ }
