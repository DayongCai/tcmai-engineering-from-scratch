'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  analyze,
  readDoc,
  h2Titles,
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  layerTable,
  criteriaLaws,
  juan5Titles,
  stepOrder,
  evidenceTiers,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  LAYER_ROWS,
  CRITERIA_LAWS,
  JUAN5,
  STEP_WORDS,
  EVIDENCE,
  TERMS,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，目录名与课程登记一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
});

test('小节结构：七节，末节「代价与边界」，一至六依次编号', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7);
  assert.ok(titles[6].endsWith('代价与边界'), titles[6]);
  for (let i = 0; i < 6; i += 1) assert.ok(titles[i].startsWith('一二三四五六'[i] + '、'), `第 ${i + 1} 节编号不对`);
});

test('每节探针都落在本节', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('三层对接表：三行四列，层序为病名、证候、操作', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 1);
  assert.strictEqual(blocks[0].rows.length, LAYER_ROWS);
  assert.deepStrictEqual(blocks[0].head, ['层', '对的是什么', '能得出什么', '不能得出什么']);
  assert.deepStrictEqual(layerTable(readDoc()).rows.map((r) => r.layer), ['病名', '证候', '操作']);
});

test('三层各自「不能得出什么」：病名不给治法，证候不给剂量，操作不给疗效', () => {
  const rows = layerTable(readDoc()).rows;
  const by = Object.fromEntries(rows.map((r) => [r.layer, r]));
  assert.strictEqual(by['病名'].cannot, '治法');
  assert.strictEqual(by['证候'].cannot, '剂量、疗程');
  assert.strictEqual(by['操作'].cannot, '疗效结论');
  assert.ok(by['病名'].can.includes('检索入口'), by['病名'].can);
});

test('判据组三条核法：主症同位、兼症同组、时相同序', () => {
  assert.deepStrictEqual(criteriaLaws(readDoc()), CRITERIA_LAWS);
  assert.ok(sectionAt(readDoc(), 2).includes('时相最常被漏'));
});

test('《审视瑶函》卷五三篇：金针辨义、煮针法、用水法', () => {
  assert.deepStrictEqual(juan5Titles(readDoc()), JUAN5);
  assert.ok(sectionAt(readDoc(), 4).includes('器械处理、术前准备、体位与固定'));
});

test('斗底风四步：取痰→开风路针→吹药→汤药，次序不乱', () => {
  assert.deepStrictEqual(stepOrder(readDoc()).map((s) => s.word), STEP_WORDS);
});

test('证据层级三层：医案、专书、指南与规范，各证一段', () => {
  assert.deepStrictEqual(evidenceTiers(readDoc()), EVIDENCE);
  const sec = sectionAt(readDoc(), 5);
  assert.ok(sec.includes('证的是「可能」'));
  assert.ok(sec.includes('证的是体系与判据来源'));
  assert.ok(sec.includes('证的是「应当」'));
});

test('边界五条：不给剂量、不宣称疗效、红旗优先、版本责任、对接有止点', () => {
  const sec = sectionAt(readDoc(), 6);
  for (const k of ['不给剂量与疗程', '不宣称古籍疗效', '红旗优先于辨证', '版本责任在引用者', '对接有止点']) {
    assert.ok(sec.includes(k), `边界缺「${k}」`);
  }
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('quiz 结构：≥5 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, `选项数不对：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.question}`);
    assert.ok(!/三辨|四位面|单元规模|本章实测|本课第\s*\d+\s*章/.test(JSON.stringify(item)), `仍含旧口径：${item.question}`);
  }
  assert.strictEqual(new Set(qs.map((x) => x.correct)).size, 4, '正确项没有打散到四个下标');
});

test('quiz 的 check 题至少两道能在正文里对上四字原词', () => {
  assert.ok(analyze().quiz.grounded >= 2, `接地 ${analyze().quiz.grounded} 道`);
});

test('quiz 引文只到书名与篇名，不含页码；check 题至少两道带两个以上原文词组', () => {
  const body = grams(readDoc());
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.strictEqual(analyze().quiz.pageRefs, 0, 'quiz 里出现了页码');
  const rich = qs
    .filter((x) => x.stage === 'check')
    .filter((x) => new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g))).size >= 2);
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带两个以上原文词组`);
});

test('命令行可运行，并打印边界声明与零剂量声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`));
  assert.match(out, /不构成医学意见/);
  assert.match(out, /不含剂量/);
  assert.match(out, /由本章正文现算/);
});

test('代码头部指向本章正文，章节目录与 quiz 同源', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/06-e56/docs/zh.md'));
  assert.ok(fs.existsSync(DOC) && fs.existsSync(QUIZ));
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.strictEqual(String(q.chapter), CHAPTER);
  assert.strictEqual(q.slug, SLUG);
});
