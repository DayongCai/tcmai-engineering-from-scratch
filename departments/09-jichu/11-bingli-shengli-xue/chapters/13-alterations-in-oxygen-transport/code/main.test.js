#!/usr/bin/env node
/**
 * 第 13 章 氧运输异常 —— 确定性单元测试
 * 运行: node --test code/main.test.js
 *
 * 断言只落在可对账的结构上：讲义该章的节号集合、docs 的节覆盖与字数、
 * 引文是否引到本章、引语是否逐字、非引用行有没有裸数值、quiz 契约、
 * 以及 `node code/main.js` 的末行是否为教学边界句。
 * 不锁死正文措辞，讲义改写段落时测试不会变成噪声。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const CHAPTER = 13;
const TITLE = '氧运输异常';
const DIR = path.join(__dirname, '..');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 14; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'binglishengli', 'supplements', 'jiangyi.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到仓库根');
}

const ROOT = findRoot(__dirname);
const idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'binglishengli', 'supplements', 'jiangyi.json'), 'utf8'));

const BOOK = (() => {
  for (const u of idx.units) {
    for (const c of u.chapters) {
      if (Number(c.no) === CHAPTER) {
        const secs = new Map();
        for (const s of c.secs) secs.set(s.no, (s.paras || []).join('\n'));
        return { title: c.title, hanzi: c.hanzi, secs };
      }
    }
  }
  throw new Error(`讲义里没有第 ${CHAPTER} 章`);
})();

const doc = fs.readFileSync(path.join(DIR, 'docs', 'zh.md'), 'utf8');
const lines = doc.split(/\r?\n/);
const flat = [...BOOK.secs.values()].join('\n');
const CITE_RE = /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/g;
const isCite = (l) => /补充·hermes-病理生理学讲义·第\s*(\d+)\s*章·(\d+\.\d+)/.test(l);
const isQuoteLine = (l) => /^\s*>/.test(l);
const BARE_RE = /[0-9]+(\.[0-9]+)?\s*(mmHg|kPa|℃|mmol|μmol|mg|μg|ng|g\/L|mol|%|次\/分|mL|ml|L\/min|kg|cm|mm|U\/L|IU)/;
const nonWs = (s) => s.replace(/\s/g, '').length;

test('讲义该章：13 章 12 节，标题与 chapters.json 一致', () => {
  assert.strictEqual(chaptersJson().n, CHAPTER);
  assert.ok(TITLE.includes(chaptersJson().title) || chaptersJson().title.includes(TITLE));
  assert.strictEqual(BOOK.secs.size, 12);
  assert.strictEqual(BOOK.hanzi, 3820);
  assert.deepStrictEqual([...BOOK.secs.keys()], ['13.1', '13.2', '13.3', '13.4', '13.5', '13.6', '13.7', '13.8', '13.9', '13.10', '13.11', '13.12']);
});

function chaptersJson() {
  const p = path.join(ROOT, 'departments/09-jichu/11-bingli-shengli-xue/chapters.json');
  const list = JSON.parse(fs.readFileSync(p, 'utf8')).chapters;
  return list.find((c) => c.n === CHAPTER);
}

test('docs 规模：非空白字不少于三千，且必备结构齐全', () => {
  assert.ok(nonWs(doc) >= 3000, `只有 ${nonWs(doc)} 非空白字`);
  for (const k of ['MOTTO', 'PROBLEM', '双根因定位', '运行与验证']) assert.ok(doc.includes(k), `缺 ${k}`);
  assert.ok(lines.some((l) => /^##\s/.test(l) && /代价与边界|边界|免责/.test(l)), '缺末节');
});

test('节号覆盖：讲义该章的每一个节号都在 docs 出现', () => {
  const missing = [...BOOK.secs.keys()].filter((s) => !doc.includes(s));
  assert.deepStrictEqual(missing, []);
});

test('引文：不少于三条，全部指向本章，节号在讲义里存在', () => {
  const cites = [...doc.matchAll(CITE_RE)].map((m) => ({ ch: Number(m[1]), sec: m[2] }));
  assert.ok(cites.length >= 3, `只有 ${cites.length} 条`);
  assert.deepStrictEqual(cites.filter((x) => x.ch !== CHAPTER), []);
  assert.deepStrictEqual(cites.filter((x) => !BOOK.secs.has(x.sec)), []);
  assert.ok(!/教材·[^\n]*讲义/.test(doc), '把讲义标成了「教材」');
});

test('引语逐字：非引文行里「」内的每一句都能在讲义正文里找到', () => {
  const lost = [];
  for (const l of lines) {
    if (isCite(l) || isQuoteLine(l)) continue;
    for (const m of l.matchAll(/「([^「」]{6,})」/g)) if (!flat.includes(m[1])) lost.push(m[1]);
  }
  assert.deepStrictEqual(lost, [], `未命中：${lost.join(' / ')}`);
});

test('非引用行零裸数值：正文不出现「数字＋计量单位」', () => {
  const bad = lines.filter((l) => !isCite(l) && !isQuoteLine(l) && BARE_RE.test(l)).map((l) => l.trim().slice(0, 60));
  assert.deepStrictEqual(bad, []);
});

test('quiz：恰 6 题，pre 1 · check 3 · post 2，题干键 question，每题 explanation 带引证', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(DIR, 'quiz.json'), 'utf8'));
  const qs = quiz.questions;
  assert.strictEqual(qs.length, 6);
  assert.deepStrictEqual(
    qs.reduce((m, x) => ((m[x.stage] = (m[x.stage] || 0) + 1), m), {}),
    { pre: 1, check: 3, post: 2 },
  );
  for (const q of qs) {
    assert.ok(q.question, '题干键必须是 question');
    assert.ok((q.options || []).length >= 2);
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.options.length);
    assert.match(q.explanation, /(依据|口径见|前提|算见)/, q.question);
  }
});

test('六文件齐：docs / quiz / code / outputs 两个模板', () => {
  const slug = chaptersJson().slug;
  for (const f of ['docs/zh.md', 'quiz.json', 'code/main.js', 'code/main.test.js',
    `outputs/prompt-${slug}.md`, `outputs/skill-${slug}.md`]) {
    assert.ok(fs.existsSync(path.join(DIR, f)), `缺 ${f}`);
  }
});

test('运行 main.js：末行为教学边界句', () => {
  const out = execFileSync(process.execPath, [path.join(DIR, 'code', 'main.js')], { encoding: 'utf8' });
  const last = out.trimEnd().split(/\r?\n/).pop();
  assert.match(last, /^教学边界：/);
  assert.match(last, /不构成诊断[、/]用药依据/);
  assert.match(last, /不写数值与单位与正常值/);
});
