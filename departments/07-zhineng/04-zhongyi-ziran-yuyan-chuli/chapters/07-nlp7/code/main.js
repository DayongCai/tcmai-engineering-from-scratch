#!/usr/bin/env node
/**
 * 中医自然语言处理 · 第 7 章 抽到「麻黄」，不等于抽到「麻黄汤去麻黄」
 * 正文: departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/07-nlp7/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 口径：六类实体与语气强度表从正文表格读出；否定作用域、时态标记、剂量与炮制
 * 的切分都作用在正文给的例子上。剂量只拆原文，不做任何克数换算。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const CHAPTER = 7;
const SLUG = '07-nlp7';
const TITLE = '抽到「麻黄」，不等于抽到「麻黄汤去麻黄」';
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s).match(HANZI) || []).length;
const readDoc = () => fs.readFileSync(DOC, 'utf8');

function headings(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => /^##\s+/.test(line))
    .map((line) => line.replace(/^##\s+/, '').trim());
}

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

function tableBlocks(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (!/^\|[\s:|-]*---[\s:|-]*\|$/.test(lines[i].trim())) continue;
    const header = i > 0 ? splitRow(lines[i - 1]) : [];
    const rows = [];
    let j = i + 1;
    while (j < lines.length && /^\|/.test(lines[j].trim())) {
      rows.push(splitRow(lines[j]));
      j += 1;
    }
    out.push({ header, rows });
  }
  return out;
}

function findTable(text, key) {
  const tb = tableBlocks(text).find((t) => t.header.some((h) => h.includes(key)));
  if (!tb) throw new Error(`正文里没有表头含「${key}」的表`);
  return tb;
}

/** 六类实体及其麻烦来源 */
function entityTable(text) {
  return findTable(text, '类').rows.map((r) => ({ type: r[0], examples: r[1], trouble: r[2] }));
}

/** 语气表：语气、强度、例、能否作等价关系 */
function modalityTable(text) {
  return findTable(text, '语气').rows.map((r) => ({
    modality: r[0], strength: r[1], example: r[2], equivalent: r[3],
  }));
}

const STRENGTH = { 主之: 4, 宜: 3, 可与: 2, 属: 1, 反: 0 };
const strengthRank = (m) => (Object.prototype.hasOwnProperty.call(STRENGTH, m) ? STRENGTH[m] : null);

const NEGATORS = ['不', '无', '未', '勿', '非'];
const BOUNDARIES = ['反', '而', '但', '若', '，', '；', '。'];

/**
 * 否定作用域：从术语首字往前扫最多 4 个字符，遇转折连词或标点即停。
 * 这样「不恶寒，反恶热」里「恶热」不会被前面的「不」误伤。
 */
function negationScope(sentence, term) {
  const at = sentence.indexOf(term);
  if (at < 0) return null;
  for (let i = at - 1, steps = 0; i >= 0 && steps < 4; i -= 1, steps += 1) {
    const ch = sentence[i];
    if (BOUNDARIES.includes(ch)) return false;
    if (NEGATORS.includes(ch)) return true;
  }
  return false;
}

/** 术语表命中则整体为实体，不走否定规则（「无汗」在症名表里） */
function isTermWithNegator(term, termSet) {
  if (termSet.has(term)) return { entity: true, negated: false, reason: '术语表命中，整体标为实体' };
  return { entity: true, negated: NEGATORS.includes(term[0]), reason: '未命中术语表，按否定词处理' };
}

/** 时态 / 病程标记：不改变实体，但改变它在时间轴上的位置 */
const TEMPORAL = ['已罢', '未解', '渐退', '复作'];
function temporalMarker(sentence, term) {
  const at = sentence.indexOf(term);
  if (at < 0) return null;
  const tail = sentence.slice(at + term.length, at + term.length + 4);
  return TEMPORAL.find((t) => tail.includes(t)) || null;
}

const CN = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };

/** 剂量只拆原文：药名、数值、单位、炮制，不产克数 */
function parseDose(raw) {
  const m = raw.match(/^([\u4e00-\u9fff]+?)([一二三四五六七八九十])(两|钱|分|枚|升)(?:（([^）]+)）)?$/);
  if (!m) throw new Error(`剂量串无法按原文拆分：${raw}`);
  return { herb: m[1], amount: CN[m[2]], unit: m[3], proc: m[4] || null, raw };
}

function stats() {
  const text = readDoc();
  const mod = modalityTable(text);
  const termSet = new Set(['无汗', '恶寒', '恶热', '汗出']);
  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    hanzi: hanzi(text),
    sections: headings(text).length,
    entities: entityTable(text),
    modalities: mod,
    ranks: mod.map((m) => strengthRank(m.modality)),
    negation: {
      ehan: negationScope('不恶寒，反恶热', '恶寒'),
      ere: negationScope('不恶寒，反恶热', '恶热'),
      wu: isTermWithNegator('无汗', termSet),
      bu: isTermWithNegator('不恶寒', termSet),
    },
    temporal: temporalMarker('恶寒已罢，身凉脉静', '恶寒'),
    dose: parseDose('麻黄三两（去节）'),
    disclaimer: /免责声明/.test(text),
  };
}

function main() {
  const s = stats();
  console.log(`中医自然语言处理 · 第 ${s.chapter} 章 ${s.title}`);
  console.log(`正文：chapters/${s.slug}/docs/zh.md（现算，不手打）`);
  console.log('');
  console.log(`  汉字            ${s.hanzi.toLocaleString('en-US')}`);
  console.log(`  实体类别        ${s.entities.length}：${s.entities.map((e) => e.type).join('／')}`);
  console.log(`  语气档          ${s.modalities.length}：${s.modalities.map((m) => `${m.modality}(${m.strength})`).join(' ')}`);
  console.log('');
  console.log('否定作用域（「不恶寒，反恶热」）：');
  console.log(`  恶寒 被否定    ${s.negation.ehan ? '是' : '否'}`);
  console.log(`  恶热 被否定    ${s.negation.ere ? '是' : '否'}——「反」是右界，不越界否定`);
  console.log(`  无汗           ${s.negation.wu.reason}`);
  console.log(`  不恶寒         ${s.negation.bu.negated ? '按否定处理' : '按实体处理'}`);
  console.log('');
  console.log(`时态：「恶寒已罢」读到标记 ${s.temporal}——不改变实体，但改变时间位置`);
  console.log(`剂量：${s.dose.raw} → 药=${s.dose.herb} 数=${s.dose.amount} 单位=${s.dose.unit} 炮制=${s.dose.proc}`);
  console.log(`  是否产出克数：${'grams' in s.dose ? '是' : '否'}——本课只存原文，不换算`);
  console.log('');
  console.log('※ 表格、例句与剂量串都取自本目录 docs/zh.md；本章不给任何剂量换算值。');
  console.log('※ 本章只做信息抽取的讨论，不构成诊断、辨证或治疗建议。');
}

if (require.main === module) main();

module.exports = {
  CHAPTER, SLUG, TITLE, DOC, STRENGTH, readDoc, headings, tableBlocks, splitRow, findTable,
  entityTable, modalityTable, strengthRank, negationScope, isTermWithNegator,
  temporalMarker, parseDose, hanzi, stats, main,
};
