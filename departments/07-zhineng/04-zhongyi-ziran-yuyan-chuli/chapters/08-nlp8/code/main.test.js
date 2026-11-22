'use strict';

/**
 * 第 8 章 自检：规则块与四层仲裁从正文解析，裁决顺序按正文优先级，quiz 逐题对账。
 * 运行：node --test departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/08-nlp8/code/main.test.js
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

test('条文规则可从正文代码块解析：条件、结论、语气、出处齐备', () => {
  const r = main.parseRuleBlock(RAW());
  assert.ok(r.conditions.length >= 2, `条件只有 ${r.conditions.length} 条`);
  assert.strictEqual(r.then, '方 = 桂枝汤');
  assert.strictEqual(r.modality, 'modality = 主之');
  assert.strictEqual(r.source, '伤寒论·辨太阳病脉证并治上');
});

test('四层仲裁顺序与正文一致：硬约束→条文→模型→人', () => {
  assert.deepStrictEqual(main.arbitrationLayers(RAW()), ['值域与硬约束', '条文规则', '统计模型', '人']);
});

test('裁决优先级：硬约束违反即拒绝，条文优先于模型', () => {
  const illegal = main.arbitrate({ illegal: true, ruleHit: true, modelHit: true });
  assert.strictEqual(illegal.layer, '值域与硬约束');
  assert.strictEqual(illegal.output, null);
  const ruled = main.arbitrate({ ruleHit: true, modelHit: true });
  assert.strictEqual(ruled.layer, '条文规则');
  assert.strictEqual(ruled.output, 'rule');
});

test('只有模型命中时必须标「无条文支持」，不冒充条文结论', () => {
  const m = main.arbitrate({ modelHit: true });
  assert.strictEqual(m.layer, '统计模型');
  assert.strictEqual(m.label, '无条文支持');
  assert.notStrictEqual(m.layer, '条文规则');
});

test('都没有命中则退回人判，不自造结论', () => {
  const f = main.arbitrate({});
  assert.strictEqual(f.layer, '人');
  assert.strictEqual(f.output, null);
});

test('条件分级为硬条件／软条件两级，正文两词俱在', () => {
  const t = main.conditionTiers(RAW());
  assert.deepStrictEqual(t, { hard: true, soft: true });
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

test('脚本可运行，打印规则与仲裁层', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('方 = 桂枝汤'));
  assert.ok(out.includes('值域与硬约束 → 条文规则 → 统计模型 → 人'));
  assert.match(out, /不构成诊断/);
});
