'use strict';

/**
 * 第 2 章 心理现象与心理过程基础 —— 确定性单元测试
 * 运行: node --test chapters/02-ch02/code/main.test.js
 *
 * 断言只落在可对账的东西上：本章正文的规模与节标题、核心词计数、quiz 的
 * 结构契约，以及 main.js 的输出末行。数值是写文件这一天的实测值，正文一改
 * 就会红——这正是要的，静默过期比报错更危险。
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const m = require('./main.js');

const DIR = path.join(__dirname, '..');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 14; i += 1) {
    if (fs.existsSync(path.join(dir, 'departments', '05-huli', '17-huli-xinli-xue', 'chapters.json'))) {
      return dir;
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到仓库根（departments/05-huli/17-huli-xinli-xue/chapters.json）');
}

const ROOT = findRoot(__dirname);

test('章节号、标题与 chapters.json 一致', () => {
  const list = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'departments', '05-huli', '17-huli-xinli-xue', 'chapters.json'), 'utf8'),
  ).chapters;
  const c = list.find((x) => x.n === m.CHAPTER);
  assert.ok(c, 'chapters.json 里没有这一章');
  assert.strictEqual(c.slug, m.SLUG);
  assert.ok(c.title === m.TITLE, `标题不一致：${c.title} vs ${m.TITLE}`);
  assert.ok(fs.existsSync(path.join(DIR, 'docs', 'zh.md')));
});

test('正文首行标题标注本章章号', () => {
  const s = m.parseDoc(m.readDoc());
  assert.match(s.title, new RegExp(`^第\\s*${m.CHAPTER}\\s*章`), `首行标题未标章号：${s.title}`);
});

test('正文规模：汉字与结构实测值', () => {
  const s = m.parseDoc(m.readDoc());
  assert.strictEqual(s.hanzi, 2912);
  assert.strictEqual(s.chars, 3642);
  assert.strictEqual(s.lines, 85);
  assert.strictEqual(s.sections.length, 6);
  assert.deepStrictEqual(s.sections.map((x) => x.hanzi), [382,395,230,392,439,403]);
  assert.strictEqual(s.tables, 2);
  assert.strictEqual(s.tableRows, 9);
  assert.strictEqual(s.quotes, 4);
  for (const k of ["hasMotto", "hasProblem", "hasRoots", "hasBoundary", "hasDisclaimer"]) {
    assert.ok(s[k], `缺结构：${k}`);
  }
});

test('节标题逐条对齐', () => {
  const s = m.parseDoc(m.readDoc());
  assert.deepStrictEqual(
    s.sections.map((x) => x.title),
[
  "一、感觉与知觉：进入大脑的第一道闸",
  "二、注意与记忆：信息为什么丢",
  "三、思维与语言：抽象的话落不了地",
  "四、情绪、意志与行为：依从的心理学",
  "五、分档、时限、记录、失效与考核",
  "代价与边界"
],
  );
});

test('核心词计数为正文现数（写文件当天实测）', () => {
  const s = m.parseDoc(m.readDoc());
  assert.deepStrictEqual(s.counts, {"复述":14,"三条":8,"框架":3,"归因":6});
  for (const t of m.TERMS) assert.ok(s.counts[t] > 0, `核心词 ${t} 在正文里没出现`);
});

test('quiz 契约：三段齐、≥5 题、4 选项、explain ≥30 汉字、答案打散、接地 check ≥2', () => {
  const q = m.auditQuiz();
  assert.deepStrictEqual(q.issues, [], q.issues.join('；'));
  assert.ok(q.n >= 5, `总题数 ${q.n} < 5`);
  assert.ok(q.byStage.pre >= 1 && q.byStage.check >= 2 && q.byStage.post >= 1);
  assert.ok(q.slots.length >= 3, `答案位只有 ${q.slots.join('/')}`);
  assert.ok(q.grounded >= 2, `接地 check 只有 ${q.grounded} 道`);
});

test('quiz 每题选项互不相同且题干不重复', () => {
  const qs = JSON.parse(fs.readFileSync(path.join(DIR, 'quiz.json'), 'utf8')).questions;
  const seen = new Set();
  for (const q of qs) {
    assert.strictEqual(new Set(q.options).size, 4, `选项重复：${q.question}`);
    assert.ok(!seen.has(q.question), `题干重复：${q.question}`);
    seen.add(q.question);
    assert.ok(!/TODO|待补|占位|示例题目/.test(JSON.stringify(q)), 'quiz 里残留脚手架字样');
  }
});

test('main.js 可运行，末行为教学边界句', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '').trimEnd().split(/\r?\n/);
  assert.match(out[out.length - 1], /^教学边界：/);
  assert.match(out[out.length - 1], /不构成诊断或治疗依据/);
  assert.match(out.join('\n'), /结构 0 处不合规/);
});
