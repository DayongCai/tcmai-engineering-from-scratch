#!/usr/bin/env node
/**
 * tests/test_glossary_bridge.js — 桥梁表与双术语表的完整性
 *
 * 桥梁表是本项目的核心资产。它退化成一张类比表，整个"中医 × AI"的说法就空了。
 * 这里把它当数据校验，而不是当文章读。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const G = path.join(ROOT, 'glossary');

const bridge = fs.readFileSync(path.join(G, 'bridge-map.md'), 'utf8');
const tcm = fs.readFileSync(path.join(G, 'tcm-terms.md'), 'utf8');
const ai = fs.readFileSync(path.join(G, 'ai-terms.md'), 'utf8');

/** 解析桥梁表主表：| 中医 | AI | 桥梁 | 级别 | 丢失了什么 | */
function bridgeRows() {
  const rows = [];
  for (const line of bridge.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 5) continue;
    if (/^-+$/.test(cells[0].replace(/[\s:]/g, '')) || cells[0] === '中医概念') continue;
    rows.push({ tcm: cells[0], ai: cells[1], bridge: cells[2], level: cells[3], loss: cells[4] });
  }
  return rows;
}

/**
 * 解析「被明确排除的误用（D 级）」小节。
 * D 级故意不放进主表 —— 它没有 AI 侧对应物，只有「流行说法 + 为什么错」两列。
 * 把它塞进主表反而会让人误以为它是一组可用的桥梁。
 */
function dLevelRows() {
  const idx = bridge.indexOf('## 被明确排除的误用');
  if (idx < 0) return [];
  const section = bridge.slice(idx);
  const rows = [];
  for (const line of section.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    if (/^-+$/.test(cells[0].replace(/[\s:]/g, '')) || cells[0] === '流行说法') continue;
    rows.push({ claim: cells[0], why: cells[1] });
  }
  return rows;
}

const rows = bridgeRows();
const dRows = dLevelRows();

test('桥梁表解析出至少 25 组长医↔AI 对应', () => {
  assert.ok(rows.length >= 25, `只解析出 ${rows.length} 组，设计基线为 30 组`);
});

test('每一行的级别必须是 A/B/C/D 之一（裸字母，不被 Markdown 加粗吞掉）', () => {
  for (const r of rows) {
    const lv = r.level.replace(/[*`]/g, '').trim();
    assert.match(lv, /^[ABCD]$/, `行「${r.tcm}」的级别非法: "${r.level}"`);
  }
});

test('四个级别都有分布（A 同构 / B 约束可用 / C 类比 / D 误导）', () => {
  const dist = {};
  for (const r of rows) {
    const lv = r.level.replace(/[*`]/g, '').trim();
    dist[lv] = (dist[lv] || 0) + 1;
  }
  // D 级误用在独立小节里（无 AI 侧对应物），单列统计
  dist.D = dRows.length;
  for (const lv of ['A', 'B', 'C', 'D']) {
    assert.ok(dist[lv] > 0, `级别 ${lv} 没有任何一行（分布: ${JSON.stringify(dist)}），桥梁分级形同虚设`);
  }
});

test('「丢掉了什么」列不得为空、不得只写「无」以外的敷衍词', () => {
  for (const r of rows) {
    assert.ok(r.loss.length > 0, `行「${r.tcm}」缺「丢失了什么」说明`);
    // A 级允许写「—」（结构上无损），其余级别必须说明损失
    const lv = r.level.replace(/[*`]/g, '').trim();
    if (lv !== 'A') {
      assert.ok(/[\u4e00-\u9fa5]/.test(r.loss) && r.loss.length >= 2,
        `行「${r.tcm}」为 ${lv} 级，必须说明丢失内容，实得「${r.loss}」`);
    }
  }
});

test('桥梁列必须给出可回指的转化机制，不能是空话', () => {
  for (const r of rows) {
    assert.ok(r.bridge.length >= 6, `行「${r.tcm}」的桥梁说明过短: ${r.bridge}`);
    assert.ok(
      /→|对应|映射|拉近|推远|表示|编码|约束|有向边|边|图|向量|嵌入|层|关系|分类|检索|优化/.test(r.bridge),
      `行「${r.tcm}」的桥梁说明未给出转化机制: ${r.bridge}`
    );
  }
});

test('桥梁表必须包含至少 6 条 D 级误用，且都写了「为什么错」', () => {
  assert.ok(
    dRows.length >= 6,
    `D 级误用只有 ${dRows.length} 条，设计基线为 6 条`
  );
  for (const r of dRows) {
    assert.ok(r.why.length >= 12, `D 级行「${r.claim}」的「为什么错」过于简略: ${r.why}`);
    assert.ok(/互斥|可交换|丢失|丢掉|非一对一|静默|不安全|责任|隐性|反|错|不是|不能|不同/.test(r.why),
      `D 级行「${r.claim}」未说清错在哪: ${r.why}`);
  }
});

test('C 级与 D 级不得出现在任何 outputs/ 的临床输出路径上（人工复核锚点）', () => {
  // 自动可查的部分：C/D 级桥梁的中医侧关键词不得作为 outputs 里的「判定输出」
  const outputs = [];
  const roots = [path.join(ROOT, 'departments')];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.md') && p.includes(`${path.sep}outputs${path.sep}`)) outputs.push(p);
    }
  };
  roots.forEach(walk);
  assert.ok(outputs.length > 0, '找不到任何 outputs 文件');

  const cdKeywords = rows
    .filter((r) => 'CD'.includes(r.level.replace(/[*`]/g, '').trim()))
    .map((r) => r.tcm.replace(/[（(].*$/, '').trim())
    .filter((k) => k.length >= 2);

  const offenders = [];
  for (const f of outputs) {
    const body = fs.readFileSync(f, 'utf8');
    for (const k of cdKeywords) {
      // 只查“据此判定/输出”这类断言，不查“不得使用”这类排除说明
      const re = new RegExp(`(判定|输出结论|诊断|证属)[^。\\n]{0,20}${k}`);
      if (re.test(body) && !/不得|禁止|错误|排除|反例|陷阱/.test(body)) {
        offenders.push(`${path.relative(ROOT, f)} 疑似把 C/D 级桥梁用于输出: ${k}`);
      }
    }
  }
  assert.deepStrictEqual(offenders, [], offenders.join('\n'));
});

test('中医术语表：每条都有出处、定义、本项目用法、常见误用四段', () => {
  const entries = tcm.split(/\r?\n### /).slice(1);
  assert.ok(entries.length >= 10, `中医术语仅 ${entries.length} 条，设计基线 40 条（当前为分阶段建设）`);
  for (const e of entries) {
    const name = e.split('\n')[0].trim();
    for (const k of ['出处', '定义', '本项目用法', '常见误用']) {
      assert.ok(e.includes(`**${k}`), `术语「${name}」缺「${k}」段`);
    }
  }
});

test('AI 术语表：每条都有出处与定义，且出处写到可检索级别', () => {
  const entries = ai.split(/\r?\n### /).slice(1);
  assert.ok(entries.length >= 10, `AI 术语仅 ${entries.length} 条`);
  for (const e of entries) {
    const name = e.split('\n')[0].trim();
    assert.ok(e.includes('**出处:**'), `术语「${name}」缺出处`);
    assert.ok(e.includes('**定义:**'), `术语「${name}」缺定义`);
    const src = (e.match(/\*\*出处:\*\*\s*(.+)/) || [])[1] || '';
    assert.ok(
      /《|arXiv|§|ISO|IEC|W3C|GB|RFC|et al|\(\d{4}\)|Specification|Rule|Standard/.test(src),
      `术语「${name}」的出处不够具体: ${src.slice(0, 60)}`
    );
    assert.ok(!/详见|参见某教材/.test(src), `术语「${name}」的出处是敷衍表述: ${src}`);
  }
});
