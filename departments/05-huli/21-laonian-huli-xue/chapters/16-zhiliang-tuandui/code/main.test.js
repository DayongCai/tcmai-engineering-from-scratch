'use strict';

/**
 * 第 16 章 自检：正文指标实测值 + quiz 结构
 * 数字全部取自本章 docs/zh.md 的实测结果；正文改稿后须同步更新此处并重跑。
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { CHAPTER, SLUG, loadDoc, stats, termHits, run } = require('./main.js');

const QUIZ = path.join(__dirname, '..', 'quiz.json');
const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('章号与目录一致', () => {
  assert.strictEqual(CHAPTER, '16');
  assert.strictEqual(SLUG, '16-zhiliang-tuandui');
  assert.ok(fs.existsSync(DOC), '正文缺失');
});

test('正文实测规模被钉住', () => {
  const s = stats(loadDoc());
  assert.strictEqual(s.hanzi, 2817);
  assert.strictEqual(s.sections, 6);
  assert.strictEqual(s.paras, 43);
  assert.strictEqual(s.tableRows, 0);
});

test('判据都在正文里出现，且首见节可定位', () => {
  const hits = termHits(loadDoc());
  assert.strictEqual(hits.length, 8);
  for (const h of hits) {
    assert.ok(h.count > 0, `${h.term} 在正文中未出现`);
    assert.ok(h.firstSection, `${h.term} 缺少首见节`);
  }
  const byTerm = Object.fromEntries(hits.map((h) => [h.term, h.count]));
  assert.strictEqual(byTerm['结构'], 8);
  assert.strictEqual(byTerm['过程指标'], 1);
  assert.strictEqual(byTerm['体验'], 6);
});

test('run() 的覆盖计数与表格行数可复算', () => {
  const r = run();
  assert.strictEqual(r.covered, 8);
  assert.strictEqual(r.total, 8);
  assert.strictEqual(r.rows, 0);
  assert.strictEqual(r.sectionList.length, 6);
});

test('脚本可运行，输出含实测口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /本章 6 节 · 2,817 汉字/);
  assert.match(out, /判据落点（概念 → 出现次数 → 首见节）：8\/8/);
  assert.match(out, /不构成临床判断或分级护理依据/);
});

test('quiz 结构与题型齐备', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.strictEqual(q.chapter, 16);
  assert.ok(Array.isArray(q.questions));
  assert.strictEqual(q.questions.length, 7);
  const stages = new Set(q.questions.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of q.questions) {
    assert.strictEqual(item.options.length, 4, `选项数不是 4：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${hanzi(item.explain)}`);
  }
});

test('check 题至少两道能落回正文原词', () => {
  const doc = loadDoc().replace(/[^\u4e00-\u9fff]/g, ' ');
  const grams = new Set();
  for (const seg of doc.split(/\s+/)) {
    for (let i = 0; i + 4 <= seg.length; i += 1) grams.add(seg.slice(i, i + 4));
  }
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  let grounded = 0;
  for (const item of q.questions.filter((x) => x.stage === 'check')) {
    const right = String(item.options[item.correct]).replace(/[^\u4e00-\u9fff]/g, ' ');
    const hit = right.split(/\s+/).some((seg) => {
      for (let i = 0; i + 4 <= seg.length; i += 1) if (grams.has(seg.slice(i, i + 4))) return true;
      return false;
    });
    if (hit) grounded += 1;
  }
  assert.ok(grounded >= 2, `只有 ${grounded} 道 check 题接地`);
});

test('答案下标分散，无脚手架字样', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  const q = JSON.parse(raw);
  const idx = new Set(q.questions.map((x) => x.correct));
  assert.ok(idx.size >= 3, `正确答案集中在 ${[...idx].join('/')}`);
  for (const bad of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!bad.test(raw), `quiz 仍含脚手架字样：${bad}`);
    assert.ok(!bad.test(fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8')), `main.js 仍含脚手架字样：${bad}`);
  }
});
