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
  sectionAt,
  occurrences,
  grams,
  boldLabels,
  eraStats,
  threeChecks,
  alignLevels,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  ERAS,
  ONE_NAME_MANY,
  MANY_NAMES_ONE,
  SHIFTS,
  CHECKS,
  ALIGN,
  TERMS,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，目录名与课程登记一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
});

test('小节结构：六节，末节「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6);
  assert.ok(titles[5].endsWith('代价与边界'), titles[5]);
});

test('每节探针都落在本节', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('三个断代按候→证→症排列，一个不少', () => {
  const r = analyze();
  assert.deepStrictEqual(r.eras, ERAS);
  assert.deepStrictEqual(boldLabels(sectionAt(readDoc(), 0)), ERAS);
});

test('三处统计数字都标通行统计，不作精确数用', () => {
  const s = eraStats(readDoc());
  assert.deepStrictEqual(s, { hou: true, seventyTwo: true, thirtySix: true });
  assert.ok(sectionAt(readDoc(), 5).includes('通行统计'));
});

test('一名多病四例：内障、喉痹、鼻渊、牙宣', () => {
  assert.deepStrictEqual(analyze().oneNameMany, ONE_NAME_MANY);
});

test('一病多名四组：雀目、聤耳脓耳耳疳耳底、喉风三十六症、白缠喉白喉', () => {
  assert.deepStrictEqual(analyze().manyNamesOne, MANY_NAMES_ONE);
  const sec = sectionAt(readDoc(), 2);
  assert.ok(sec.includes('判据没变'), '一病多名一组缺「判据没变」的判据');
  assert.ok(sec.includes('判据漂移'), '缺「判据漂移，名再统一也没用」的收束');
});

test('判据的三次转移按部位→形态→病机排列', () => {
  const r = analyze();
  assert.deepStrictEqual(r.shifts, SHIFTS);
  assert.ok(sectionAt(readDoc(), 3).includes('每一次都丢掉一条廉价的临床线索'));
});

test('第五节三查齐全，三种对齐精度由粗到细', () => {
  const checks = threeChecks(readDoc());
  assert.deepStrictEqual(checks.map((c) => c.label), CHECKS);
  assert.deepStrictEqual(alignLevels(readDoc()).map((a) => a.name), ALIGN);
  assert.ok(sectionAt(readDoc(), 4).includes('名对名，只用于检索，不能用于推理'));
});

test('牙宣为什么顺、鼻鼽为什么对不上，正文都给了判据', () => {
  const sec = sectionAt(readDoc(), 1);
  assert.ok(sec.includes('牙宣'));
  assert.ok(sec.includes('可见的形态与部位，而不是推测的病因'));
  const sec4 = sectionAt(readDoc(), 4);
  assert.ok(sec4.includes('无需查过敏原'));
  assert.ok(sec4.includes('对不上的时候说对不上'));
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('quiz 结构：≥5 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, `选项数不对：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.question}`);
    assert.ok(!/三辨|四位面|单元规模|本章实测|本课第\s*\d+\s*章/.test(JSON.stringify(item)), `仍含旧口径：${item.question}`);
  }
  assert.strictEqual(new Set(qs.map((x) => x.correct)).size, 4, '正确项没有打散到四个下标');
});

test('quiz 的 check 题至少两道能在正文里对上四字原词', () => {
  assert.ok(analyze().quiz.grounded >= 2, `接地 ${analyze().quiz.grounded} 道`);
});

test('quiz 引文只到书名与篇名，不含页码；check 题至少两道带两个以上原文词组', () => {
  const body = grams(readDoc());
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.strictEqual(analyze().quiz.pageRefs, 0, 'quiz 里出现了页码');
  const rich = qs
    .filter((x) => x.stage === 'check')
    .filter((x) => new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g))).size >= 2);
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带两个以上原文词组`);
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`));
  assert.match(out, /不构成医学意见/);
  assert.match(out, /不作诊断依据/);
  assert.match(out, /由本章正文现算/);
});

test('代码头部指向本章正文，章节目录与 quiz 同源', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/05-e55/docs/zh.md'));
  assert.ok(fs.existsSync(DOC) && fs.existsSync(QUIZ));
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.strictEqual(String(q.chapter), CHAPTER);
  assert.strictEqual(q.slug, SLUG);
});
