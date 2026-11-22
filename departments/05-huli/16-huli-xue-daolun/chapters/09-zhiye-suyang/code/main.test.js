'use strict';
/**
 * 第 9 章的习题与正文对齐：正文实测值、quiz 结构、答案分布，全部现算后断言。
 * 正文改数、加减小节、改关键词、quiz 跑题，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { analyze, hanzi, QUIZ, CHAPTER, SLUG, TITLE } = require('./main.js');

const r = analyze();

test('正文可解析：标题、题记、问题、双根因都在', () => {
  assert.ok(r.head.title.includes('第 9 章'), `标题不对：${r.head.title}`);
  assert.ok(r.head.motto.length > 8, '题记缺失');
  assert.ok(r.head.problem.length > 40, 'PROBLEM 段缺失');
  assert.strictEqual(r.head.roots.length, 2, '双根因应为两条');
  for (const x of r.head.roots) assert.ok(x.length > 8, `根因过短：${x}`);
});

test('小节数与汉字数钉在实测值上', () => {
  assert.strictEqual(r.sections.length, 6, `小节数变成 ${r.sections.length}`);
  assert.strictEqual(r.docHanzi, 2832, `正文汉字变成 ${r.docHanzi}`);
  for (const s of r.sections) assert.ok(s.hanzi > 80, `小节「${s.heading}」只有 ${s.hanzi} 字，太薄`);
});

test('加粗标目够密：正文是可判定的条目，不是散文堆', () => {
  assert.strictEqual(r.leads, 19, `加粗标目变成 ${r.leads} 条`);
  assert.ok(r.leads >= r.sections.length, `标目 ${r.leads} 条少过小节数 ${r.sections.length}`);
  const dense = r.sections.filter((s) => s.leads.length >= 1).length;
  assert.ok(dense >= 2, `只有 ${dense} 个小节带标目，正文退化成散文`);
});

test('小节划分完整：各小节汉字之和与正文相当', () => {
  const sum = r.sectionHanzi.reduce((a, b) => a + b, 0);
  assert.ok(sum <= r.docHanzi, `小节合计 ${sum} 超过正文 ${r.docHanzi}`);
  assert.ok(sum >= r.docHanzi * 0.85, `小节合计 ${sum} 只占正文 ${r.docHanzi} 的八成，正文头或尾被漏解析`);
});

test('正文里的表格能逐行解析', () => {
  assert.strictEqual(r.tables.length, 0, `表格数变成 ${r.tables.length}`);
  assert.strictEqual(r.rows, 0, `表格数据行变成 ${r.rows}`);
  for (const t of r.tables) {
    assert.ok(t.header.length >= 2, '表头列数不足');
    for (const row of t.rows) assert.strictEqual(row.length, t.header.length, `列数不齐：${row.join('|')}`);
  }
});

test('本章关键词在正文里确有次数（不是随手引的）', () => {
  const want = {"关怀": 19, "态度": 14, "复盘": 6, "耗竭": 2, "行为": 9};
  for (const t of r.terms) {
    assert.strictEqual(t.n, want[t.term], `「${t.term}」现算 ${t.n} ≠ ${want[t.term]}`);
    assert.ok(t.n >= 2, `「${t.term}」只出现 ${t.n} 次，撑不起本章论证`);
  }
});

test('quiz 结构：题量、三段、四选项、解释长度、答案合法', () => {
  const q = r.quiz;
  assert.ok(q.total >= 5, `只有 ${q.total} 题`);
  for (const s of ['pre', 'check', 'post']) assert.ok(q.stage[s] >= 1, `缺 ${s} 段`);
  assert.strictEqual(q.allFourOptions, true, '有题不是 4 个选项');
  assert.strictEqual(q.badCorrect, 0, 'correct 下标非法');
  assert.ok(q.minExplain >= 30, `最短的解释只有 ${q.minExplain} 汉字`);
});

test('quiz 接地：check 题的正确选项能在正文找到原词，答案打散', () => {
  assert.ok(r.quiz.checkGrounded >= 2, `只有 ${r.quiz.checkGrounded} 道 check 题接地`);
  assert.ok(r.quiz.distinctAnswers >= 3, `正确答案只用了 ${r.quiz.distinctAnswers} 个位置`);
});

test('quiz 不出现正文之外的脚手架名目，也不写剂量与页码', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js 输出']) {
    assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
  }
  assert.ok(!/第\s*\d+\s*页/.test(raw), 'quiz 出现页码');
  assert.ok(!/\d+\s*(mg|ml|毫克|毫升)/.test(raw), 'quiz 出现剂量');
});

test('quiz 与正文同源：判断题问的是本章的动作与边界', () => {
  const doc = r.doc;
  for (const key of ["去人格化", "多余的动作", "表演性关怀", "复盘"]) {
    assert.ok(doc.includes(key), `正文里找不到「${key}」——quiz 可能问到正文没写的东西`);
  }
});

test('章号与标题与 chapters.json 一致', () => {
  const cat = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', 'chapters.json'), 'utf8'));
  const c = cat.chapters.find((x) => x.slug === SLUG);
  assert.ok(c, 'chapters.json 里没有本章');
  assert.strictEqual(c.n, CHAPTER);
  assert.strictEqual(c.title, TITLE);
  const quiz = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.strictEqual(quiz.chapter, CHAPTER);
  assert.strictEqual(quiz.title, TITLE);
});
