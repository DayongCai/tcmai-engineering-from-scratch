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
  tableBlocks,
  occurrences,
  grams,
  clauses,
  kidneyClauses,
  sourceSplit,
  nameLayers,
  criteria,
  meridianOrder,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  CLAUSE_ROWS,
  KIDNEY_CLAUSES,
  NAME_LAYERS,
  CRITERIA_MIN,
  EAR_MERIDIANS,
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

test('条文表：八条，三列，出处只出素问与灵枢', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 1);
  assert.strictEqual(blocks[0].rows.length, CLAUSE_ROWS);
  assert.deepStrictEqual(blocks[0].head, ['条文', '出处', '它说的是什么']);
  for (const r of blocks[0].rows) assert.strictEqual(r.length, 3, `列数不齐：${r.join('|')}`);
  const s = sourceSplit(readDoc());
  assert.strictEqual(s.total, CLAUSE_ROWS);
  assert.strictEqual(s.suwen + s.lingshu, CLAUSE_ROWS, '有出处既不是素问也不是灵枢');
  assert.deepStrictEqual([s.suwen, s.lingshu], [3, 5]);
});

test('八条里明说肾的只有两条，且是归属与功能条件', () => {
  const rows = kidneyClauses(readDoc());
  assert.strictEqual(rows.length, KIDNEY_CLAUSES);
  assert.ok(rows[0].meaning.includes('归属'), rows[0].meaning);
  assert.ok(rows[1].meaning.includes('功能条件'), rows[1].meaning);
  assert.ok(sectionAt(readDoc(), 0).includes('不是病因分类'));
});

test('病名分层四组：暴与渐、鸣与聋、胀闭脓、鸣与脑鸣', () => {
  assert.deepStrictEqual(nameLayers(readDoc()), NAME_LAYERS);
});

test('肾虚判据组五项，且正文写明凑够四项以上才站得住', () => {
  const c = criteria(readDoc());
  assert.strictEqual(c.length, 5, `读到 ${c.length} 项`);
  assert.ok(c[0].includes('渐降'), c[0]);
  assert.ok(c[4].includes('脉细弱或沉细'), c[4]);
  const sec = sectionAt(readDoc(), 4);
  assert.ok(sec.includes('凑得起四项以上'));
  assert.ok(sec.includes('只有「耳鸣」一项，不足以定为肾虚'));
});

test('入耳经脉三条，手太阳在前，足少阳在后', () => {
  const m = meridianOrder(readDoc());
  assert.deepStrictEqual(m.map((x) => x.name), EAR_MERIDIANS);
  for (const x of m) assert.ok(x.at >= 0, `第三节没有${x.name}`);
  assert.ok(sectionAt(readDoc(), 2).includes('耳者，宗脉之所聚也'));
});

test('暴聋与渐聋分开写：前者急症有处置时限，后者才是肾虚场景', () => {
  const sec = sectionAt(readDoc(), 3);
  assert.ok(sec.includes('暴聋'));
  assert.ok(sec.includes('渐聋'));
  assert.ok(sec.includes('须立即转耳鼻咽喉科评估'));
  assert.ok(sec.includes('把暴聋当渐聋补'));
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
  assert.match(out, /由本章正文现算/);
});

test('代码头部指向本章正文，章节目录与 quiz 同源', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/03-e53/docs/zh.md'));
  assert.ok(fs.existsSync(DOC) && fs.existsSync(QUIZ));
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.strictEqual(String(q.chapter), CHAPTER);
  assert.strictEqual(q.slug, SLUG);
});
