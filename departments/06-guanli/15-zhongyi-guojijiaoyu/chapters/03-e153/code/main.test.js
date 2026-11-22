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
  h2Titles,
  sectionAt,
  grams,
  boldHeads,
  layers,
  creditBudget,
  diagnosticsBudget,
  clinic,
  CHAPTER,
  SLUG,
  QUIZ,
  CONSTRAINTS,
  CORE,
  LAYERS,
  CLINIC_CONDITIONS,
  UNCONTROLLABLE,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文在：规模够一章，目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
});

test('小节结构：五节，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 5, `小节数 ${titles.length}`);
  assert.ok(titles[4].includes('代价与边界'), titles[4]);
  for (const t of titles.slice(0, 4)) assert.ok(/^[一二三四]、/.test(t), `未按序编号：${t}`);
});

test('三项硬约束与四块不可压缩核，名字与数量都对得上', () => {
  assert.deepStrictEqual(boldHeads(sectionAt(readDoc(), 0).body), CONSTRAINTS);
  assert.deepStrictEqual(boldHeads(sectionAt(readDoc(), 1).body), CORE);
});

test('教材三层读自第 3 节：直译、改编、本地编写', () => {
  const rows = layers(readDoc());
  assert.strictEqual(rows.length, 3);
  for (let i = 0; i < 3; i += 1) assert.strictEqual(rows[i].name, LAYERS[i]);
});

test('临床基地四条件与三重不可控都在正文里', () => {
  const c = clinic(readDoc());
  assert.strictEqual(c.conditions.length, CLINIC_CONDITIONS.length);
  for (const x of c.conditions) assert.ok(x.ok, `缺条件：${x.t}`);
  for (const x of c.uncontrollable) assert.ok(x.ok, `缺不可控项：${x.t}`);
});

test('学分账：180 学分 × 25–30 小时 = 4,500–5,400 小时，三分之一给专业课', () => {
  const c = creditBudget(readDoc());
  assert.strictEqual(c.credits, 180);
  assert.strictEqual(c.lowH, 25);
  assert.strictEqual(c.highH, 30);
  assert.strictEqual(c.totalLow, 4500);
  assert.strictEqual(c.totalHigh, 5400);
  assert.strictEqual(c.totalLow, c.statedLow);
  assert.strictEqual(c.totalHigh, c.statedHigh);
  assert.strictEqual(c.majorLow, 1500);
  assert.strictEqual(c.majorHigh, 1800);
});

test('诊断学账：90–120 学时压到 36，只剩三到四成', () => {
  const d = diagnosticsBudget(readDoc());
  assert.strictEqual(d.cnLow, 90);
  assert.strictEqual(d.cnHigh, 120);
  assert.strictEqual(d.abroad, 36);
  assert.ok(Math.abs(d.shareLow - 0.3) < 1e-12, `${d.shareLow}`);
  assert.ok(Math.abs(d.shareHigh - 0.4) < 1e-12, `${d.shareHigh}`);
});

test('判据句在正文里，不是代码自造', () => {
  const text = readDoc();
  for (const t of ['串联关系，不是并联', '学了也没用', '可以换情境，不可以换指征', '模拟病人不会复诊', '离开课堂就学不到', '背下了 28 种脉']) {
    assert.ok(occurrences(text, t) >= 1, `正文里没有「${t}」`);
  }
});

test('quiz 结构：题量、三段、四选项、correct 合法、explain ≥30 汉字', () => {
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

test('quiz 接地：至少两道 check 题的正确选项能在正文找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.check >= 3, `check 题只有 ${r.quiz.check} 道`);
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
});

test('答案打散在多个位置，且 quiz 与代码都不含正文之外的名目', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  const q = JSON.parse(raw);
  const spread = new Set(q.questions.map((x) => x.correct));
  assert.ok(spread.size >= 3, `答案只落在 ${spread.size} 个位置`);
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `quiz 残留：${re}`);
    assert.ok(!re.test(fs.readFileSync(MAIN, 'utf8')), `代码残留：${re}`);
  }
});

test('命令行可运行，并打印现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成教育认证、课程审批或临床训练标准意见/);
  assert.ok(out.includes('1,500–1,800 小时'), '输出未给出专业课空间');
});

test('接地窗口不跨标点：四字词组只在连续汉字段内匹配', () => {
  const g = grams('先砍的是需要场地、需要病人');
  assert.ok(g.has('需要场地'));
  assert.strictEqual(g.has('场地需要'), false);
});
