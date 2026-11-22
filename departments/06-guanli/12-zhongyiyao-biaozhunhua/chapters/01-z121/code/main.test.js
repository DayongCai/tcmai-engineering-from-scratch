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
  cnInt,
  h2Titles,
  sectionAt,
  tableBlocks,
  grams,
  entryItems,
  ambiguities,
  definitionRules,
  intakeCost,
  quizSummary,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  ENTRY_ITEMS,
  AMBIGUITY_TYPES,
  DEFINITION_TESTS,
  THREE_TABLES,
  SOURCES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文在：规模够一章，且目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2000, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
});

test('中文数字解析：十八万、十二、两千、十三点八都解得开', () => {
  assert.strictEqual(cn2num('十八万'), 180000);
  assert.strictEqual(cn2num('二百一十六万'), 2160000);
  assert.strictEqual(cn2num('十二'), 12);
  assert.strictEqual(cn2num('两千'), 2000);
  assert.strictEqual(cn2num('十三点八'), 13.8);
  assert.strictEqual(cnInt('八'), 8);
});

test('小节结构：七节，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.ok(titles[6].includes('代价与边界'), titles[6]);
  assert.ok(titles.slice(0, 6).every((t) => /^[一二三四五六]、/.test(t)), '前六节未按一至六编号');
});

test('条目七项一项不缺，且都在第一节里', () => {
  const items = entryItems(readDoc());
  assert.deepStrictEqual(items.map((x) => x.t), ENTRY_ITEMS);
  for (const x of items) assert.ok(x.ok, `缺条目要素：${x.t}`);
});

test('定义的三条规矩都写进去了：禁用词、属加种差、禁循环定义', () => {
  const r = definitionRules(readDoc());
  assert.ok(r.bannedWord, '未写禁用词最不能省');
  assert.ok(r.genus, '未写属加种差');
  assert.ok(r.noSelfRef, '未写禁止循环定义');
  assert.ok(readDoc().includes('饮片是中药材的一种加工品'), '替换检验的反例不见了');
});

test('四类歧义按正文表序读出，木通落基原字段、消渴落首选词', () => {
  const rows = ambiguities(readDoc());
  assert.strictEqual(rows.length, 4, `表行数 ${rows.length}`);
  for (const t of AMBIGUITY_TYPES) assert.ok(rows.some((r) => r.type.includes(t)), `缺类型：${t}`);
  assert.ok(rows[0].fix.includes('基原字段'), rows[0].fix);
  assert.ok(rows[1].fix.includes('首选词'), rows[1].fix);
  assert.ok(rows[3].fix.includes('最小可判定单位'), rows[3].fix);
});

test('三个定义检验与三张表都在正文出现', () => {
  const text = readDoc();
  for (const t of DEFINITION_TESTS) assert.ok(occurrences(text, t) >= 1, `缺检验：${t}`);
  for (const t of THREE_TABLES) assert.ok(occurrences(text, t) >= 1, `缺表：${t}`);
  for (const t of SOURCES) assert.ok(occurrences(text, t) >= 1, `缺来源：${t}`);
  assert.strictEqual(DEFINITION_TESTS.length, 3);
});

test('演算与正文自述一致：216 万条明细、4800 小时、2.4 人', () => {
  const c = intakeCost(readDoc());
  assert.strictEqual(c.rx, 180000);
  assert.strictEqual(c.per, 12);
  assert.strictEqual(c.sec, 8);
  assert.strictEqual(c.cap, 2000);
  assert.strictEqual(c.details, 2160000);
  assert.strictEqual(c.stated, 2160000, '正文自述的明细数与现算不符');
  assert.strictEqual(c.hours, 4800);
  assert.ok(Math.abs(c.people - 2.4) < 1e-9, `${c.people}`);
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
  assert.match(out, /不构成诊疗/);
  assert.ok(out.includes('4,800 小时'), '输出未给出工时演算');
});
