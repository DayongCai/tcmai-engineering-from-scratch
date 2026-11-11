#!/usr/bin/env node
/**
 * 第 10 章 免疫功能异常 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：节数、字数、观察词表的重心、两条锚点的落位、
 * 讲义数值是否为 0、docs 有没有偷偷写「数字＋计量单位」、docs 的「」引语是否逐字。
 * 不锁死正文措辞，讲义改写段落时测试不会变成噪声。
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
  FRAME,
  LEXICON,
  BOUNDARY,
  locatorOf,
  chapterSecs,
  shape,
  tally,
  rank,
  total,
  valueAudit,
  anchorCoverage,
  checkSecFormat,
} = require('./main');

/** 本章的硬数字：由 `node code/main.js` 现算后写死在这里，讲义改版时先跑再看 */
const EXPECT = {
  "secs": 10,
  "chars": 4928,
  "hanzi": 3515,
  "paras": 72,
  "secs_list": [
    "10.1",
    "10.2",
    "10.3",
    "10.4",
    "10.5",
    "10.6",
    "10.7",
    "10.8",
    "10.9",
    "10.10"
  ],
  "top": [
    "复合物",
    13
  ],
  "anchor": [
    "10.1"
  ],
  "frame": [
    "10.2"
  ],
  "title": "免疫功能异常"
};

const list = chapterSecs();
const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
const lines = doc.split(/\r?\n/);

test('本章字数与节数：10 节 / 4928 非空白字符 / 3515 汉字', () => {
  const s = shape(list);
  assert.strictEqual(CHAPTER, 10);
  assert.strictEqual(s.secs, EXPECT.secs);
  assert.strictEqual(s.chars, EXPECT.chars);
  assert.strictEqual(s.hanzi, EXPECT.hanzi);
  assert.strictEqual(s.paras, EXPECT.paras);
  assert.strictEqual(list.length, EXPECT.secs);
  assert.strictEqual(list[list.length - 1].sec, `${CHAPTER}.${EXPECT.secs}`);
  assert.strictEqual(list[0].sec, `${CHAPTER}.1`);
  assert.deepStrictEqual(list.map((x) => x.sec), EXPECT.secs_list);
});

test('节号全部合 10.M 格式，出处按节号现组', () => {
  const fmt = checkSecFormat(list);
  assert.strictEqual(fmt.ok, true, `非法节号：${fmt.bad.join('、')}`);
  for (const s of list) {
    assert.match(s.locator, new RegExp(`^补充·hermes-病理生理学讲义·第${CHAPTER}章·${CHAPTER}\\.\\d+$`));
    assert.strictEqual(s.locator, locatorOf(s.sec));
    assert.strictEqual(s.locator.split('章·')[1], s.sec);
  }
});

test(`观察词表 ${LEXICON.join(' / ')}：重心与讲义一致`, () => {
  const counts = tally(list);
  assert.ok(total(counts) > 0);
  assert.strictEqual(counts[EXPECT.top[0]], EXPECT.top[1]);
  assert.strictEqual(rank(counts)[0][0], EXPECT.top[0]);
  assert.deepStrictEqual(rank(counts).map((x) => x[0]).length, LEXICON.length);
});

test('数值核验：讲义本章的 valueLike 为 0，没有一处「数字＋计量单位」', () => {
  const audit = valueAudit(list);
  assert.strictEqual(audit.secs, EXPECT.secs);
  assert.strictEqual(audit.hits, 0);
  assert.deepStrictEqual(audit.offenders, []);
});

test('两条锚点各只在一处齐备', () => {
  assert.deepStrictEqual(anchorCoverage(list), EXPECT.anchor);
  assert.deepStrictEqual(anchorCoverage(list, FRAME), EXPECT.frame);
  assert.ok(ANCHOR.length >= 2 && FRAME.length >= 2);
  // 抽掉一个词，命中数只可能变多或不变——多词同时命中是最严的口径
  assert.ok(anchorCoverage(list, [ANCHOR[0]]).length >= anchorCoverage(list).length);
});

test('docs 正文没有裸写的「数字＋计量单位」（引用行豁免）', () => {
  const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|U\/L|IU)/;
  const bad = [];
  for (const line of lines) {
    if (/补充·hermes-病理生理学讲义/.test(line)) continue;
    if (/^\s*>/.test(line)) continue;
    const m = line.match(VALUE_RE);
    if (m) bad.push(m[0]);
  }
  assert.deepStrictEqual(bad, [], `docs 出现裸数值：${bad.join('、')}`);
  assert.ok(!doc.includes('%'), 'docs 出现百分号（本书不给百分比数值）');
});

test('docs 完整：必备段 + 教学边界句 + 讲义全部节号', () => {
  for (const k of ['MOTTO', 'PROBLEM', '双根因定位', '运行与验证', '代价与边界', '免责']) {
    assert.ok(doc.includes(k), `docs 缺 ${k}`);
  }
  assert.ok(doc.includes(BOUNDARY), 'docs 缺教学边界句');
  assert.ok(/不写数值/.test(doc), 'docs 缺「不写数值」声明');
  assert.ok(/不作诊断/.test(doc), 'docs 缺「不作诊断」声明');
  for (const s of list) assert.ok(doc.includes(s.sec), `docs 没点明 ${s.sec}`);
  assert.ok(doc.replace(/\s/g, '').length >= 3000, 'docs 不足 4928 非空白字');
});

test('docs 里带引文的每一行，其「」引语必须逐字取自被引那一节', () => {
  const CITE = /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/g;
  const bySec = new Map(list.map((s) => [s.sec, s.text]));
  let checked = 0;
  for (const line of lines) {
    const cites = [...line.matchAll(CITE)];
    const quotes = [...line.matchAll(/「([^「」]{6,})」/g)].map((m) => m[1]);
    if (!quotes.length) continue;
    for (const q of quotes) {
      if (cites.length) {
        assert.ok(
          cites.some((c) => bySec.get(c[2]) && bySec.get(c[2]).includes(q)),
          `引语不在被引节里：「${q}」`
        );
      } else if (!/^\s*>/.test(line)) {
        assert.ok([...bySec.values()].some((t) => t.includes(q)), `无引文的「」用了讲义以外的文字：「${q}」`);
      }
      checked += 1;
    }
  }
  assert.ok(checked >= 8, `逐字引语只有 ${checked} 条`);
  const cites = [...doc.matchAll(CITE)];
  assert.ok(cites.length >= 3, '讲义引文少于 3 条');
  for (const c of cites) assert.strictEqual(Number(c[1]), CHAPTER, '引文串到别的章');
});

test('quiz 恰好 6 题 = 1 pre + 3 check + 2 post，每题 explanation 带引证', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const qs = quiz.questions;
  assert.strictEqual(qs.length, 6);
  const stages = qs.map((q) => q.stage);
  assert.strictEqual(stages.filter((s) => s === 'pre').length, 1);
  assert.strictEqual(stages.filter((s) => s === 'check').length, 3);
  assert.strictEqual(stages.filter((s) => s === 'post').length, 2);
  assert.strictEqual(stages[0], 'pre');
  for (const q of qs) {
    assert.ok(q.question, '题干键必须是 question');
    assert.strictEqual(q.options.length, 4);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4);
    assert.match(q.explanation, /(依据|口径见|前提|算见)/);
  }
  assert.strictEqual(quiz.lesson, path.basename(path.join(__dirname, '..')));
});

test('教学边界句是 main.js 的末行，且形态合规', () => {
  const src = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8').trimEnd().split(/\r?\n/);
  assert.ok(src.slice(-3).join('\n').includes('教学边界'));
  assert.match(BOUNDARY, /教学边界/);
  assert.match(BOUNDARY, /不构成/);
  assert.strictEqual(TITLE, EXPECT.title);
});
