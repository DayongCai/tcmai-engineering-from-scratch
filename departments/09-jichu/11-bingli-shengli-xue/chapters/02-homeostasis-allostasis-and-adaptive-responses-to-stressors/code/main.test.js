#!/usr/bin/env node
/**
 * 第 2 章 稳态、异稳态与对应激源的适应性反应 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：节数与字数、节号格式、数值是否为 0、
 * 锚点落在哪几节、异稳态负荷四型是否齐备、docs 的引文是否逐字、
 * 节号是否覆盖、quiz 契约。不锁死正文措辞——讲义改写段落时，测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const {
  CHAPTER,
  TITLE,
  ANCHOR,
  LOAD_TYPES,
  AXES,
  BOUNDARY,
  VALUE_RE,
  chapterOf,
  shape,
  valueAudit,
  anchorCoverage,
  loadTypes,
  axesCoverage,
  bySection,
  checkSubFormat,
  citationAudit,
  main,
} = require('./main');

const book = chapterOf();
const list = book.secs;
const docPath = path.join(__dirname, '..', 'docs', 'zh.md');
const doc = fs.readFileSync(docPath, 'utf8');
const lines = doc.split(/\r?\n/);
const isCite = (l) => /补充·hermes-病理生理学讲义·第\s*\d+\s*章·\d+\.\d+/.test(l);
const isQuoteLine = (l) => /^\s*>/.test(l);

test('章号与讲义章号一致，12 节 91 段 3390 汉字 4828 非空白字符', () => {
  assert.strictEqual(CHAPTER, 2);
  assert.strictEqual(book.no, 2);
  assert.ok(book.title.includes(TITLE), `讲义标题不含「${TITLE}」：${book.title}`);
  const s = shape(list);
  assert.strictEqual(s.secs, 12);
  assert.strictEqual(s.paras, 91);
  assert.strictEqual(s.hanzi, 3390);
  assert.strictEqual(s.chars, 4828);
  assert.strictEqual(s.hanzi, book.hanzi, '逐节汉字之和应等于章级汉字数');
});

test('节号全部合 2.M 格式，且就是 2.1 至 2.12 连续十二节', () => {
  const fmt = checkSubFormat(list);
  assert.strictEqual(fmt.ok, true, `非法节号：${fmt.bad.join('、')}`);
  const want = Array.from({ length: 12 }, (_, i) => `2.${i + 1}`);
  assert.deepStrictEqual(list.map((s) => s.no), want);
});

test('数值核验：91 段的「数字＋计量单位」命中为 0（复算，不照抄讲义声明）', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.paras, 91);
  assert.strictEqual(audit.hits, 0, `命中：${audit.offenders.join(' / ')}`);
  assert.deepStrictEqual(audit.offenders, []);
  // 反向自检：把一句话塞进假段落，审计函数必须能抓到
  const probe = valueAudit([{ no: '2.x', title: 'probe', paras: ['血糖 7.8 mmol'], hanzi: 3390 }]);
  assert.strictEqual(probe.hits, 1);
});

test('锚点（设定点 / 偏差 / 效应器）三词并置的节只有 2.1 与 2.11——回路语言的首尾两处', () => {
  assert.deepStrictEqual(ANCHOR, ['设定点', '偏差', '效应器']);
  assert.deepStrictEqual(anchorCoverage(list), ['2.1', '2.11']);
  // 抽掉一个词，命中数只可能变多或不变
  assert.ok(anchorCoverage(list, ['设定点']).length >= 2);
});

test('异稳态负荷四型在 2.3 齐备（4 / 4），两轴在 2.5 与 2.6 并置', () => {
  const load = loadTypes(list);
  assert.strictEqual(load.sec, '2.3');
  assert.deepStrictEqual(load.missing, []);
  assert.strictEqual(load.found.length, LOAD_TYPES.length);
  assert.deepStrictEqual(AXES, ['SAM', 'HPA']);
  assert.ok(axesCoverage(list).includes('2.5'));
});

test('逐节段数与字数之和等于章级口径，没有空节', () => {
  const secs = bySection(list);
  assert.strictEqual(secs.size, 12);
  let paras = 0;
  let hanzi = 0;
  for (const [, g] of secs) {
    assert.ok(g.paras > 0 && g.hanzi > 0, `${g.title} 为空节`);
    paras += g.paras;
    hanzi += g.hanzi;
  }
  assert.strictEqual(paras, 91);
  assert.strictEqual(hanzi, 3390);
});

test('docs：非空白字 ≥ 3000，必备段齐（MOTTO / PROBLEM / 双根因定位 / 运行与验证 / 末节）', () => {
  const chars = doc.replace(/\s/g, '').length;
  assert.ok(chars >= 3000, `正文 ${chars} 非空白字`);
  for (const k of ['MOTTO', 'PROBLEM', '双根因定位', '环境逼迫', '知识积累', '运行与验证']) {
    assert.ok(doc.includes(k), `docs 缺 ${k}`);
  }
  assert.ok(lines.some((l) => /^##\s/.test(l) && /代价与边界|边界|免责/.test(l)), 'docs 缺末节');
});

test('docs：引文 ≥3 条、章号等于本章、节号在讲义里存在', () => {
  const audit = citationAudit(doc, 2);
  assert.ok(audit.total >= 3, `引文 ${audit.total} 条`);
  assert.deepStrictEqual(audit.wrongChapter, [], '有引文引到了别的章');
  const known = new Set(list.map((s) => s.no));
  for (const s of audit.secs) assert.ok(known.has(s), `引文节号不存在：${s}`);
});

test('docs：「」引语（非引用行、≥6 字）逐字见于讲义对应章正文', () => {
  const flat = list.map((s) => s.paras.join('\n')).join('\n');
  const quotes = [];
  for (const l of lines) {
    if (isCite(l) || isQuoteLine(l)) continue;
    for (const m of l.matchAll(/「([^「」]{6,})」/g)) quotes.push(m[1]);
  }
  const lost = quotes.filter((q) => !flat.includes(q));
  assert.deepStrictEqual(lost, [], `找不到的引语：${lost.join(' / ')}`);
});

test('docs：非引用行没有「数字＋计量单位」，也没有百分号', () => {
  const bad = lines.filter((l) => !isCite(l) && !isQuoteLine(l) && VALUE_RE.test(l));
  assert.deepStrictEqual(bad.map((l) => l.trim().slice(0, 40)), []);
  assert.ok(!doc.includes('%'), 'docs 出现百分号');
});

test('docs：讲义 12 个节号全部出现（节覆盖 12/12）', () => {
  const uncovered = list.filter((s) => !doc.includes(s.no)).map((s) => s.no);
  assert.deepStrictEqual(uncovered, []);
});

test('quiz：恰好 6 题，pre 1 / check 3 / post 2，题干键为 question，每题末尾带引证', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const qs = quiz.questions;
  assert.strictEqual(qs.length, 6);
  const count = (k) => qs.filter((q) => q.stage === k).length;
  assert.strictEqual(count('pre'), 1);
  assert.strictEqual(count('check'), 3);
  assert.strictEqual(count('post'), 2);
  for (const q of qs) {
    assert.ok(q.question && q.question.length > 6, '题干缺失或过短');
    assert.ok(Array.isArray(q.options) && q.options.length === 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
    assert.match(q.explanation, /补充·hermes-病理生理学讲义·第2章·2\.\d+）$/, '引证未落在句末');
  }
  assert.strictEqual(quiz.lesson, '02-homeostasis-allostasis-and-adaptive-responses-to-stressors');
});

test('main() 的末行输出是教学边界句，且字符串里含不构成诊断/用药依据', () => {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  try {
    main();
  } finally {
    console.log = orig;
  }
  assert.strictEqual(logs[logs.length - 1], BOUNDARY);
  assert.match(BOUNDARY, /^教学边界：/);
  assert.match(BOUNDARY, /不构成诊断\/用药依据$/);
  assert.ok(doc.includes(BOUNDARY), 'docs 未写教学边界句');
});
