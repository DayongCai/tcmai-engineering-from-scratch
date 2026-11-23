#!/usr/bin/env node
/**
 * 第 17 章 居家护理的能力，是把机构标准翻译成家庭条件 —— 确定性测试
 * 运行: node --test chapters/17-ch17/code/main.test.js
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { CHAPTER, TITLE, read, stats, DOC } = require('./main.js');

const doc = read();
const st = stats(doc);
const QUIZ = path.join(__dirname, '..', 'quiz.json');

const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const SCAFFOLD = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
const hasScaffold = (s) => SCAFFOLD.some((re) => re.test(s));

/** 正文里 4 字以上的连续汉字片段 */
function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文可读，章号与标题一致', () => {
  assert.ok(fs.existsSync(DOC), '正文缺失');
  assert.strictEqual(CHAPTER, 17);
  assert.strictEqual(TITLE, '居家护理的能力，是把机构标准翻译成家庭条件');
});

test('规模与实测一致', () => {
  assert.strictEqual(st.hanzi, 3152);
  assert.ok(st.hanzi > 2500, `汉字过少：${st.hanzi}`);
  assert.strictEqual(st.sections, 6);
  assert.strictEqual(st.tables, 4);
  assert.strictEqual(st.scoreRows, 5);
});

test('本章结构项与实测一致', () => {
  assert.strictEqual(st.concepts['翻译三规则'], 3);
  assert.strictEqual(st.concepts['核对五项'], 5);
  assert.strictEqual(st.concepts['观察四维'], 4);
  assert.strictEqual(st.concepts['培训四步'], 4);
  assert.strictEqual(st.concepts['指导两栏'], 4);
  assert.strictEqual(st.concepts['评分五维'], 5);
});

test('脚本可直接运行并打印现算口径', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /汉字 \d+ 字 · 节 \d+ 节 · 表 \d+ 张 · 扣分档 \d+ 条/);
  assert.match(out, /不构成临床判断依据/);
});

test('quiz 结构：题量、三段、四选项、解释与打散', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.strictEqual(q.chapter, 17);
  assert.ok(Array.isArray(q.questions) && q.questions.length >= 5, '题量不足');
  const stages = new Set(q.questions.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), '缺 ' + s + ' 段');
  for (const item of q.questions) {
    assert.strictEqual(item.options.length, 4, '选项不是 4 个');
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${hanzi(item.explain)}`);
    assert.ok(!hasScaffold(item.question + item.options.join('') + item.explain), '含脚手架字样');
  }
  const idx = q.questions.map((x) => x.correct);
  const counts = [0, 1, 2, 3].map((i) => idx.filter((x) => x === i).length);
  assert.ok(new Set(idx).size >= 3, '答案过于集中');
  assert.ok(Math.max(...counts) <= 3, '同一位置答案超过 3 次');
});

test('quiz 接地：至少两道 check 题的正确选项能在正文找到原词', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const body = shingles(doc);
  const hits = q.questions.filter((x) => x.stage === 'check' && [...shingles(x.options[x.correct])].some((g) => body.has(g)));
  assert.ok(hits.length >= 2, `接地 check 题只有 ${hits.length} 道`);
});

test('quiz 不写剂量、疗程、发生率与页码', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  assert.ok(!/[0-9]\s*(mg|ml|g|mL|毫克|毫升|天|日|周|%|％)/.test(raw), '出现数值型剂量/疗程/发生率');
  assert.ok(!/第\s*\d+\s*页/.test(raw), '出现页码');
  assert.ok(!hasScaffold(raw), 'quiz 含脚手架字样');
});
