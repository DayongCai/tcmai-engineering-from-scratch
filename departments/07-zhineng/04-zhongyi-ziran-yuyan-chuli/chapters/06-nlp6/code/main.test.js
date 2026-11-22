'use strict';

/**
 * 第 6 章 自检：范式表、归一命中、RRF 排序、出处四字段都从正文现算，quiz 逐题对账。
 * 运行：node --test departments/07-zhineng/04-zhongyi-ziran-yuyan-chuli/chapters/06-nlp6/code/main.test.js
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

test('三种检索范式齐备，且各自的失效方式都写在正文表里', () => {
  const p = main.paradigms(RAW());
  assert.strictEqual(p.length, 3);
  assert.ok(p.some((x) => x.name.includes('布尔')));
  assert.ok(p.some((x) => x.name.includes('BM25')));
  assert.ok(p.some((x) => x.name.includes('向量')));
  assert.ok(p.find((x) => x.name.includes('布尔')).bad.includes('同义词'));
  assert.ok(p.find((x) => x.name.includes('BM25')).bad.includes('idf'));
});

test('索引层归一只为命中：鞕 的文档能被「硬」的查询召回', () => {
  const map = main.normMap(RAW());
  assert.strictEqual(map['鞕'], '硬');
  const docs = [{ id: 'a', text: '大便鞕，三日未行。' }, { id: 'b', text: '大便溏。' }];
  const hit = main.booleanSearch(docs, '大便硬', map);
  assert.deepStrictEqual(hit.map((d) => d.id), ['a']);
  // 不归一就召回不到，这正是正文说的「鞕搜不到硬」
  assert.deepStrictEqual(main.booleanSearch(docs, '大便硬', {}), []);
});

test('布尔检索要求查询的每一项都命中', () => {
  const docs = [{ id: 'a', text: '太阳病，汗出恶风。' }, { id: 'b', text: '太阳病，无汗。' }];
  assert.deepStrictEqual(main.booleanSearch(docs, '太阳病 汗出', {}).map((d) => d.id), ['a']);
  assert.deepStrictEqual(main.booleanSearch(docs, '太阳病', {}).map((d) => d.id), ['a', 'b']);
});

test('RRF 只用排名：两路都靠前的文档胜出', () => {
  assert.deepStrictEqual(main.rrf([['A', 'B', 'C'], ['B', 'C', 'A']]), ['B', 'A', 'C']);
  // 一路第一、另一路缺席，输给两路都第二的文档
  assert.deepStrictEqual(main.rrf([['A'], ['B', 'A']]), ['A', 'B']);
});

test('出处四字段在正文里全部出现', () => {
  const f = main.outlinkFields(RAW());
  assert.deepStrictEqual(f, ['书名', '版本', '篇名', '条序']);
  assert.deepStrictEqual(main.OUTLINK, f);
});

test('同文异本按归一文本去重，条数下降但版本信息保留', () => {
  const s = main.stats();
  assert.strictEqual(s.rawCount, 4);
  assert.strictEqual(s.dedupedCount, 3);
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

test('脚本可运行，打印范式与出处字段', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('布尔检索'));
  assert.ok(out.includes('出处四字段'));
  assert.match(out, /不构成诊断/);
});
