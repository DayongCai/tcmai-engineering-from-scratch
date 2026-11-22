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
  sectionAt,
  fiveChars,
  threeAreas,
  twoDifferences,
  sharedCriterion,
  CHAPTER,
  SLUG,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  VOID_SIGNS,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且章节号与目录一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, SLUG);
  assert.match(dir, new RegExp(`^${String(CHAPTER).padStart(2, '0')}`));
});

test('小节结构：六个二级标题，一至六编号，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.ok(titles.every((t, i) => t.startsWith('一二三四五六'[i] + '、')), titles.join(' | '));
  assert.ok(titles[5].includes('代价与边界'), titles[5]);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('五个字从表格读出：红肿痛眵泪，一字不缺且不重复', () => {
  const chars = fiveChars(readDoc());
  assert.strictEqual(chars.length, 5, `字数 ${chars.length}`);
  assert.deepStrictEqual(chars.map((c) => c.char), ['红', '肿', '痛', '眵', '泪']);
  assert.strictEqual(new Set(chars.map((c) => c.points)).size, 5, '五个字的指向有重复');
});

test('三个区的归属句现算为三项，且各自落到脏', () => {
  const areas = threeAreas(readDoc());
  assert.strictEqual(areas.length, 3, areas.join(' / '));
  assert.ok(areas[0].includes('胞睑') && areas[0].includes('脾'), areas[0]);
  assert.ok(areas[1].includes('两眦') && areas[1].includes('心'), areas[1]);
  assert.ok(areas[2].includes('白睛') && areas[2].includes('肺'), areas[2]);
});

test('三区共享的判据是「起病急、症状显、以实证热证居多」', () => {
  const c = sharedCriterion(readDoc());
  assert.ok(c.includes('起病急'), c);
  assert.ok(c.includes('实证热证居多'), c);
  assert.ok(sectionAt(readDoc(), 0).includes('把「多数」当成了「全部」'), '正文未写判据的害处');
});

test('天行赤眼与暴风客热的两条区别现算为两条', () => {
  const d = twoDifferences(readDoc());
  assert.strictEqual(d.length, 2, d.join(' / '));
  assert.ok(d[0].includes('传染'), d[0]);
  assert.ok(d[1].includes('淋巴结'), d[1]);
});

test('天行赤眼的第一处置写在正文里：隔离与消毒，不是开方', () => {
  const text = readDoc();
  assert.ok(sectionAt(text, 3).includes('隔离与消毒'), '第四节未写隔离');
  assert.ok(/第一处置不是开方/.test(text), '正文未点明处置次序');
});

test('外障三种「看得见的虚」都在第五节', () => {
  const text = readDoc();
  for (const v of VOID_SIGNS) assert.ok(sectionAt(text, 4).includes(v), `第五节没有「${v}」`);
});

test('金疳与火疳的鉴别写成「深浅与压痛」，不是大小', () => {
  const seg = sectionAt(readDoc(), 2);
  assert.ok(seg.includes('二者的鉴别不在大小，在深浅与压痛'), '鉴别依据未写明');
  assert.ok(seg.includes('表层'), '缺金疳层次');
  assert.ok(seg.includes('深层'), '缺火疳层次');
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
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

test('quiz 的 check 题至少两道能在正文中找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) assert.ok(h.grams.length > 0, `未接地：${h.question}`);
});

test('正确选项不集中在同一个下标（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `正确答案只落在 ${new Set(idx).size} 个位置`);
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊断、处方或手术建议/);
  assert.match(out, /由本章正文现算/);
});

test('表格只有一张（五个字），行数与正文一致', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 1, `表格数 ${blocks.length}`);
  assert.strictEqual(blocks[0].rows.length, 5);
});
