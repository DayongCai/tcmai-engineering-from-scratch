'use strict';

/**
 * 第 7 章 自检：实体表、语气强度、否定作用域、时态与剂量拆分都从正文现算，quiz 逐题对账。
 * 运行：node --test departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/07-nlp7/code/main.test.js
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const main = require('./main.js');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const RAW = () => fs.readFileSync(DOC, 'utf8');
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

test('正文汉字数达到补实门槛', () => {
  assert.ok(main.stats().hanzi >= 2500, `只有 ${main.stats().hanzi}`);
});

test('六类实体的麻烦来源都写在正文表里', () => {
  const t = main.entityTable(RAW());
  assert.strictEqual(t.length, 6);
  assert.deepStrictEqual(t.map((x) => x.type), ['药', '方', '证', '症', '脉', '穴']);
  assert.ok(t.find((x) => x.type === '方').trouble.includes('方名含药名'), '方的麻烦应含方名含药名');
});

test('语气表五档，强度从主之到反单调递减', () => {
  const m = main.modalityTable(RAW());
  assert.deepStrictEqual(m.map((x) => x.modality), ['主之', '宜', '可与', '属', '反']);
  const ranks = m.map((x) => main.strengthRank(x.modality));
  assert.deepStrictEqual(ranks, [4, 3, 2, 1, 0]);
  for (let i = 1; i < ranks.length; i += 1) assert.ok(ranks[i] < ranks[i - 1], '强度必须严格递减');
  // 「属」与「反」都不能作等价关系
  assert.ok(m.find((x) => x.modality === '属').equivalent.startsWith('否'));
  assert.ok(m.find((x) => x.modality === '反').equivalent.startsWith('否'));
});

test('否定作用域：「反」是右界，不越界否定后面的症', () => {
  assert.strictEqual(main.negationScope('不恶寒，反恶热', '恶寒'), true);
  assert.strictEqual(main.negationScope('不恶寒，反恶热', '恶热'), false);
  // 没有转折词时，否定仍然生效
  assert.strictEqual(main.negationScope('不恶寒', '恶寒'), true);
  assert.strictEqual(main.negationScope('恶寒', '恶寒'), false);
});

test('「无汗」命中术语表即为实体，「不恶寒」才走否定规则', () => {
  const termSet = new Set(['无汗', '恶寒', '恶热']);
  const wu = main.isTermWithNegator('无汗', termSet);
  assert.strictEqual(wu.entity, true);
  assert.strictEqual(wu.negated, false);
  const bu = main.isTermWithNegator('不恶寒', termSet);
  assert.strictEqual(bu.negated, true);
  // 不在术语表里的「无X」才按否定处理
  assert.strictEqual(main.isTermWithNegator('无痰', termSet).negated, true);
});

test('时态标记不改变实体，但改变时间位置', () => {
  assert.strictEqual(main.temporalMarker('恶寒已罢，身凉脉静', '恶寒'), '已罢');
  assert.strictEqual(main.temporalMarker('恶寒未解', '恶寒'), '未解');
  assert.strictEqual(main.temporalMarker('恶寒', '恶寒'), null);
});

test('剂量只拆原文：药名、数值、单位、炮制，不产克数', () => {
  const d = main.parseDose('麻黄三两（去节）');
  assert.deepStrictEqual(d, { herb: '麻黄', amount: 3, unit: '两', proc: '去节', raw: '麻黄三两（去节）' });
  assert.ok(!('grams' in d), '不得产出换算克数');
  assert.throws(() => main.parseDose('麻黄若干'));
});

test('quiz：≥5 题，覆盖 pre／check／post，4 选项，explain ≥30 汉字', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(qs.length >= 5);
  const stages = new Set(qs.map((q) => q.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const q of qs) {
    assert.strictEqual(q.options.length, 4, `选项不是 4 个：${q.question}`);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < 4, `correct 越界：${q.question}`);
    assert.ok((String(q.explain).match(HANZI) || []).length >= 30, `explain 过短：${q.question}`);
  }
});

test('quiz：check 题至少 2 道的正确选项含正文原词', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions.filter((q) => q.stage === 'check');
  const body = new Set();
  for (const seg of RAW().replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) body.add(seg.slice(i, i + 4));
  }
  let grounded = 0;
  for (const q of qs) {
    const hit = String(q.options[q.correct])
      .replace(/[^\u4e00-\u9fff]/g, ' ')
      .split(/\s+/)
      .some((seg) => {
        for (let i = 0; i + 4 <= seg.length; i += 1) if (body.has(seg.slice(i, i + 4))) return true;
        return false;
      });
    if (hit) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道接地`);
});

test('脚本可运行，打印否定作用域与剂量拆分，且不含克数换算', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('恶热 被否定'));
  assert.ok(out.includes('炮制=去节'));
  assert.ok(out.includes('是否产出克数：否'));
  assert.match(out, /不构成诊断/);
});
