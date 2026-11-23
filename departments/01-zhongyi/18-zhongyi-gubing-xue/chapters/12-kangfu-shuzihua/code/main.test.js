/**
 * 中医骨病学 · 第 12 章 判据现算的回归测试
 * 全部以本章 docs/zh.md 为唯一数据源：正文改了，快照就要跟着改，否则测试先红。
 * quiz.json 另按结构钉住：题量、三段、四选项、解释字数、答案打散、check 题接地。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, KEYWORDS, read, analyze } = require('./main.js');

const A = analyze(read());
const MAIN = path.join(__dirname, 'main.js');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const BODY = String(read()).replace(/[^\u4e00-\u9fff]/g, ' ');

/** 正文里所有 4 字连续片段，用来判断选项是不是从正文里长出来的 */
function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text).split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '12-kangfu-shuzihua', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 12);
  assert.strictEqual(TITLE, "「动静结合」要拆成负荷、时相、监测三个可执行变量");
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
});

test('汉字数与正文快照一致，且不是占位稿', () => {
  assert.strictEqual(A.hanzi, 2810);
  assert.ok(A.hanzi > 2000, '本章正文过短：' + A.hanzi);
});

test('节数、表格数与引文取自正文', () => {
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tables, 3);
  assert.strictEqual(A.citeCount, 1);
  assert.deepStrictEqual(A.cites, ["庄子·刻意"]);
});

test('判据词计数与正文快照一致', () => {
  const map = Object.fromEntries(A.keywords.map((k) => [k.word, k.hits]));
  assert.deepStrictEqual(map, {"负荷":20,"时相":10,"监测":10,"次日反应":3,"分期":5});
  assert.strictEqual(A.keywords.length, KEYWORDS.length);
  for (const k of A.keywords) assert.ok(k.hits > 0, k.word + ' 在正文里一次都没出现');
});

test('每节都有字，边界条数可复算', () => {
  for (const s of A.sections) assert.ok(s.hanzi > 0, s.title + ' 一节为空');
  const sum = A.sections.reduce((a, s) => a + s.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, sum + ' vs ' + A.hanzi);
  assert.strictEqual(A.bounds, 4);
  assert.strictEqual(A.sections.filter((s) => s.title === '代价与边界').length, 1);
});

test('加粗判断与引言行数取自正文', () => {
  assert.strictEqual(A.claims, 26);
  assert.strictEqual(A.quote, 2);
});

test('quiz 结构：题量、三段、四选项、解释够长、答案打散', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = q.questions;
  assert.ok(qs.length >= 5 && qs.length <= 10, '题数 ' + qs.length);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), '缺 ' + s + ' 段');
  assert.ok(qs.filter((x) => x.stage === 'check').length >= 3, 'check 题不足 3');
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, item.question);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, item.question);
    const hanzi = (item.explain.match(/[\u4e00-\u9fff]/g) || []).length;
    assert.ok(hanzi >= 30, item.question + ' 的解释只有 ' + hanzi + ' 汉字');
  }
  const used = new Set(qs.map((x) => x.correct));
  assert.ok(used.size >= 3, '正确答案只落在 ' + used.size + ' 个位置上');
});

test('quiz 接地：至少 2 道 check 题的正确选项能在正文里找到原词', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const body = grams(BODY);
  const grounded = q.questions
    .filter((x) => x.stage === 'check')
    .filter((x) => [...grams(x.options[x.correct])].some((g) => body.has(g)));
  assert.ok(grounded.length >= 2, '接地的 check 题只有 ' + grounded.length + ' 道');
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('均从本章 docs/zh.md 现算'), '缺少现算口径声明');
  assert.ok(out.includes('不构成诊疗建议'), '缺少边界声明');
  assert.ok(out.includes('汉字 2810 字'), '输出里的汉字数与快照不一致');
  assert.ok(out.includes('节 6 节'), '输出里的节数与快照不一致');
  assert.ok(out.includes('代价与边界 4 条'), '输出里的边界条数与快照不一致');
  assert.ok(out.includes('命中最多的词'), '输出里没有判据词汇总');
});
