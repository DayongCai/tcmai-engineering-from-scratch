'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  analyze,
  readDoc,
  readQuiz,
  h2Titles,
  occurrences,
  grams,
  TERMS,
  SECTION_PROBES,
  CHAPTER,
  SLUG,
  TITLE,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const NUM = ['一', '二', '三', '四', '五', '六', '七'];
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，目录名与课程登记一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2000, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(TITLE.length > 0);
  assert.ok(String(CHAPTER).length > 0);
});

test('小节结构：标题编号连续，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, SECTION_PROBES.length, `小节数 ${titles.length}`);
  titles.forEach((t, i) => assert.ok(t.startsWith(NUM[i] + '、'), `第 ${i + 1} 节编号不对：${t}`));
  assert.ok(titles[titles.length - 1].endsWith('代价与边界'), '末节不是代价与边界');
});

test('每节探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在第 ${p.section} 节`);
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('章节骨架按原顺序成立', () => {
  const r = analyze();
  for (const g of r.structure) assert.ok(g.ok, `骨架「${g.name}」缺 ${g.miss.join('、')}`);
});

test('quiz 结构：≥5 题、三段齐、4 选项、correct 合法、explain ≥30 汉字、正确项打散', () => {
  const qs = readQuiz().questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, `选项数不对：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.question}`);
  }
  assert.strictEqual(new Set(qs.map((x) => x.correct)).size, 4, '正确项位置没有打散到四个下标');
});

test('quiz 的 check 题至少两道能在正文中找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
});

test('quiz 与正文同源：至少两道 check 题的正确选项含两个以上不同原文词组', () => {
  const body = grams(readDoc());
  const qs = readQuiz().questions.filter((x) => x.stage === 'check');
  const rich = qs.filter((x) => {
    const hit = new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g)));
    return hit.size >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成医学意见/);
  assert.match(out, /由本章正文与 quiz 现算/);
});

test('本章判据在正文中可查', () => {
  const t = readDoc();
  for (const k of ['科学无效即伦理不当', '跟踪审查最容易空缺', '批准之后']) assert.ok(t.includes(k), '缺：' + k);
});
