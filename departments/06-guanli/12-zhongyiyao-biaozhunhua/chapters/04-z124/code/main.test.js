'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  analyze,
  readDoc,
  hanzi,
  occurrences,
  cn2num,
  h2Titles,
  sectionAt,
  segments,
  dataElementAttrs,
  inspectionItems,
  dataVolume,
  CHAPTER,
  SLUG,
  QUIZ,
  CLAUSE_FIELDS,
  EXPECTED_SEGMENTS,
  DATA_ELEMENT_ATTRS,
  INSPECTION_ITEMS,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文在：规模够一章，且目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2000, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
  assert.strictEqual(cn2num('四百'), 400);
});

test('小节结构：七节，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.ok(titles[6].includes('代价与边界'), titles[6]);
  assert.ok(titles.slice(0, 6).every((t) => /^[一二三四五六]、/.test(t)), '前六节未按一至六编号');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
  assert.strictEqual(SECTION_PROBES.length, h2Titles(readDoc()).length);
});

test('一条条款四字段齐全，缺单位的后果写明', () => {
  const text = readDoc();
  for (const f of CLAUSE_FIELDS) assert.ok(occurrences(text, f) >= 1, `缺字段：${f}`);
  assert.ok(text.includes('四项缺任何一项，这条标准就不能被复现'), '缺四字段的判据句');
  assert.ok(text.includes('0.35 当 35%'), '缺单位混用的例子');
});

test('五段结构按正文表序读出，每段都有弱点', () => {
  const rows = segments(readDoc());
  assert.deepStrictEqual(rows.map((r) => r.name), EXPECTED_SEGMENTS);
  for (const r of rows) assert.ok(r.solves.length >= 2 && r.weakness.length >= 2, `${r.name} 缺说明`);
  assert.ok(rows[0].solves.includes('是不是这一味药'), rows[0].solves);
  assert.ok(rows[4].weakness.includes('未必是有效成分'), rows[4].weakness);
});

test('七类检验项逐项数得出来，与首段的「七类」相符', () => {
  const items = inspectionItems(readDoc());
  assert.strictEqual(items.length, 7);
  assert.deepStrictEqual(items.map((x) => x.t), INSPECTION_ITEMS);
  for (const x of items) assert.ok(x.ok, `首段未列：${x.t}`);
  assert.ok(readDoc().includes('七类检验项'), '首段未写「七类检验项」');
});

test('七个数据元属性按正文表序读出，缺项的后果各不相同', () => {
  const rows = dataElementAttrs(readDoc());
  assert.deepStrictEqual(rows.map((r) => r.attr), DATA_ELEMENT_ATTRS);
  assert.ok(rows[4].damage.includes('越界校验'), rows[4].damage);
  assert.ok(rows[6].damage.includes('方法变更无记录'), rows[6].damage);
});

test('演算：400×12=4800 个数据点/轮，×4 批次=19200/年', () => {
  const v = dataVolume(readDoc());
  assert.strictEqual(v.varieties, 400);
  assert.strictEqual(v.perVariety, 12);
  assert.strictEqual(v.rounds, 4);
  assert.strictEqual(v.perRound, 4800);
  assert.strictEqual(v.perYear, 19200);
  assert.ok(v.perYear < 20000 && v.perYear > 19000, '正文说的「接近两万个」对不上');
});

test('quiz 结构：6 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
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

test('quiz 的 check 题至少两道能在正文找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.check >= 3, `check 题只有 ${r.quiz.check} 道`);
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
});

test('答案打散在多个下标，且不含脚手架概念', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  const q = JSON.parse(raw);
  assert.ok(new Set(q.questions.map((x) => x.correct)).size >= 3, '答案只落在少数位置');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `残留：${re}`);
    assert.ok(!re.test(fs.readFileSync(MAIN, 'utf8')), `代码残留：${re}`);
  }
});

test('命令行可运行，并打印现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成药品质量判定/);
  assert.ok(out.includes('19,200'), '输出未给出年数据点规模');
});
