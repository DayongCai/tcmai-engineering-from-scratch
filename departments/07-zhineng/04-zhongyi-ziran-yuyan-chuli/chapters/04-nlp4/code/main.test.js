'use strict';

/**
 * 第 4 章 自检：任务表、词袋否定失效、字符 bigram 的不敏感性均从正文现算，quiz 逐题对账。
 * 运行：node --test departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/04-nlp4/code/main.test.js
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

test('四类任务的标签来源与成本都能从正文表格读出', () => {
  const t = main.tasks(RAW());
  assert.strictEqual(t.length, 4);
  assert.ok(t.some((x) => x.task.includes('科属')));
  assert.ok(t.some((x) => x.task.includes('证型')));
  const syn = t.find((x) => x.task.includes('证型'));
  assert.ok(syn.cost.includes('高'), '证型标注成本应为高');
  assert.ok(syn.risk.includes('兼证'), '证型主要风险应提到兼证多标签');
});

test('词袋在否定上只差一个维度，方向却被抹平', () => {
  const d = main.bagDiff(main.bag(['恶寒']), main.bag(['不', '恶寒']));
  assert.deepStrictEqual(d.shared, ['恶寒']);
  assert.deepStrictEqual(d.onlyB, ['不']);
  assert.deepStrictEqual(d.onlyA, []);
});

test('字符 bigram 对分词结果不敏感：头项强痛 无论怎么切都是三个二元组', () => {
  const a = main.charBigrams('头项强痛');
  const b = main.charBigrams(['头项', '强痛'].join(''));
  assert.deepStrictEqual(a, ['头项', '项强', '强痛']);
  assert.deepStrictEqual(a, b);
  // 换成字级切分，bigram 仍然不变
  assert.deepStrictEqual(main.charBigrams(['头', '项', '强', '痛'].join('')), a);
});

test('多数类基线等于最长类占比，与「什么都没学」的准确率同义', () => {
  assert.strictEqual(main.majorityBaseline(['a', 'a', 'a', 'b']), 0.75);
  assert.strictEqual(main.majorityBaseline([]), 0);
  assert.strictEqual(main.majorityBaseline(['a', 'b']), 0.5);
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

test('脚本可运行，打印任务表与词袋失效', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('证型分类'));
  assert.ok(out.includes('词袋失效'));
  assert.match(out, /不构成诊断/);
});
