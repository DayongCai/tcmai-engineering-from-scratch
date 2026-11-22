'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  analyze,
  readDoc,
  h2Titles,
  tableBlocks,
  occurrences,
  grams,
  citations,
  boldClaims,
  boundaryItems,
  sectionAt,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  TABLE_COUNT,
  TERMS,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且章号与目录一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, SLUG);
  assert.match(dir, new RegExp(`^${String(CHAPTER).padStart(2, '0')}`));
});

test('小节结构：六个二级标题，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  assert.ok(titles.slice(0, 5).every((t) => /^[一二三四五]、/.test(t)), '前五节未按一至五编号');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test(`表格张数与正文现算一致（本章为 ${TABLE_COUNT} 张）`, () => {
  assert.strictEqual(tableBlocks(readDoc()).length, TABLE_COUNT);
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test("承重断言 9 条、边界 6 条、引文 3 次 / 1 篇", () => {
  const text = readDoc();
  assert.strictEqual(boldClaims(text).length, 9);
  assert.strictEqual(boundaryItems(text), 6);
  const cit = citations(text);
  assert.strictEqual(cit.count, 3);
  assert.strictEqual(cit.books.length, 1);
});

test('quiz 结构：≥5 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = q.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, `选项数不对：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.question}`);
  }
});

test('答案位置没有堆在同一处', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const pos = q.questions.map((x) => x.correct);
  for (let i = 0; i < 4; i += 1) assert.ok(pos.includes(i), `下标 ${i} 从未出现过`);
  assert.ok(Math.max(...pos.map((p) => pos.filter((x) => x === p).length)) <= 3, '同一位置超过 3 次');
});

test('quiz 的 check 题至少两道能在正文中找到四字原词，且两道带两个以上词组', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  assert.ok(r.quiz.rich >= 2, `rich ${r.quiz.rich} 道`);
});

test('quiz 与 code 都不含脚手架指纹（三辨／四位面／单元规模／本章实测）', () => {
  const qraw = fs.readFileSync(QUIZ, 'utf8');
  const craw = fs.readFileSync(MAIN, 'utf8');
  for (const raw of [qraw, craw]) {
    for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
      assert.ok(!re.test(raw), '仍含脚手架指纹：' + re);
    }
  }
});

test('命令行可运行，并打印边界声明与现算说明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
  assert.match(out, /quiz \d+ 题/);
});

test('跌倒的四个层面', () => {
  const t = readDoc();
  for (const k of ["内在因素","药物","外在因素","情景因素"]) assert.ok(t.includes(k), '正文缺：' + k);
});

test('三项测试加一个问题', () => {
  const t = readDoc();
  for (const k of ["计时起立行走","五次坐立","单腿站立","过去一年跌倒过几次"]) assert.ok(t.includes(k), '正文缺：' + k);
});

test('运动处方的三个成分', () => {
  const t = readDoc();
  for (const k of ["负重","抗阻","平衡"]) assert.ok(t.includes(k), '正文缺：' + k);
});
