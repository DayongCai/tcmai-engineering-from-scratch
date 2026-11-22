#!/usr/bin/env node
/**
 * 第 1 章 妇产科护理的分界 —— 正文口径与习题结构（确定性测试）
 * 运行: node --test code/main.test.js
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const { TITLE, KEYWORDS, readDoc, bodyLines, hanzi, hits, outline, freq, stats } = require('./main.js');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const countHanzi = (text) => (String(text || '').match(HANZI) || []).length;

const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));

test('正文存在且标题指向本章', () => {
  const text = readDoc();
  assert.ok(text.length > 3000, '正文过短：' + text.length);
  assert.ok(text.includes('第 1 章'), '正文标题缺章号');
  assert.strictEqual(TITLE, '第 1 章 妇产科护理的分界');
});

test('规模：3499 汉字 / 6 节 / 平均 583 字每节', () => {
  const s = stats();
  assert.strictEqual(s.hanzi, 3499);
  assert.strictEqual(s.sections.length, 6);
  assert.strictEqual(s.perSection, 583);
});

test('骨架：5 张表、28 段，且节标题可读', () => {
  const o = outline(readDoc());
  assert.strictEqual(o.tables, 5);
  assert.strictEqual(o.paragraphs, 28);
  assert.strictEqual(o.sections[0], "一、两个当事人：这条线决定了后面所有动作");
  assert.strictEqual(o.sections[o.sections.length - 1], "六、代价与边界");
});

test('词频与正文一致，且最重的是「记录」（15 次）', () => {
  const text = readDoc();
  for (const [word, n] of freq(text)) assert.strictEqual(n, hits(text, word), word + ' 计数不一致');
  const top = freq(text)[0];
  assert.strictEqual(top[0], '记录');
  assert.strictEqual(top[1], 15);
  const table = Object.fromEntries(freq(text));
  assert.strictEqual(table["产房"], 8);
});

test('词表每个词都在表内，不留悬空词', () => {
  const table = Object.fromEntries(freq(readDoc()));
  for (const word of KEYWORDS) assert.ok(word in table, word);
  assert.strictEqual(Object.keys(table).length, KEYWORDS.length);
});

test('汉字口径只数 CJK，不把标点与数字算进去', () => {
  const text = readDoc();
  assert.ok(hanzi(text) < text.length);
  assert.ok(hanzi(text) > text.length * 0.5, '汉字占比异常：' + hanzi(text) / text.length);
});

test('习题：≥5 题，pre/check/post 齐全，check ≥2', () => {
  const qs = quiz.questions || [];
  assert.ok(qs.length >= 5, '只有 ' + qs.length + ' 题');
  for (const stage of ['pre', 'check', 'post']) {
    assert.ok(qs.some((q) => q.stage === stage), '缺 ' + stage + ' 段');
  }
  assert.ok(qs.filter((q) => q.stage === 'check').length >= 2, 'check 题不足 2 道');
});

test('习题：每题 4 选项、correct 合法、explain ≥30 汉字', () => {
  for (const [i, q] of (quiz.questions || []).entries()) {
    assert.strictEqual(q.options.length, 4, '第 ' + (i + 1) + ' 题选项数不对');
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, '第 ' + (i + 1) + ' 题 correct 非法');
    assert.ok(countHanzi(q.explain) >= 30, '第 ' + (i + 1) + ' 题 explain 只有 ' + countHanzi(q.explain) + ' 汉字');
    assert.ok(q.question && q.question.length >= 6, '第 ' + (i + 1) + ' 题题干过短');
  }
});

test('习题：答案打散，不集中在同一个位置', () => {
  const idx = (quiz.questions || []).map((q) => q.correct);
  assert.ok(new Set(idx).size >= 3, '正确项只落在 ' + new Set(idx).size + ' 个位置');
  assert.ok(Math.max(...idx.map((v) => idx.filter((x) => x === v).length)) <= Math.ceil(idx.length / 2), '某一位占用过半');
});

test('习题：不含旧脚手架字样', () => {
  const raw = JSON.stringify(quiz);
  const banned = ['三辨', '四位面', '单元规模', '本章实测', '本课第'];
  for (const word of banned) assert.ok(!raw.includes(word), '习题仍含旧写法：' + word);
});

test('习题：至少两道 check 正确项能在正文找到原词', () => {
  const body = readDoc();
  let grounded = 0;
  for (const q of quiz.questions || []) {
    if (q.stage !== 'check') continue;
    const right = String(q.options[q.correct]);
    const grams = [];
    for (const seg of right.replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
      for (let i = 0; i + 4 <= seg.length; i += 1) grams.push(seg.slice(i, i + 4));
    }
    if (grams.some((g) => body.includes(g))) grounded += 1;
  }
  assert.ok(grounded >= 2, '只有 ' + grounded + ' 道 check 正确项接地');
});
