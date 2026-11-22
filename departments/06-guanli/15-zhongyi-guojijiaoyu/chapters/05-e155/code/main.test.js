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
  grams,
  boldHeads,
  costs,
  lists,
  cycleLedger,
  CHAPTER,
  SLUG,
  QUIZ,
  FORMS,
  COSTS,
  CLINIC_ISSUES,
  ACCREDITATION,
  EXIT_ITEMS,
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

test('四种形态、师资三项成本、临床基地三问，名字与数量都对得上', () => {
  const text = readDoc();
  assert.deepStrictEqual(boldHeads(sectionAt(text, 0).body), FORMS);
  assert.deepStrictEqual(costs(text).map((x) => x.name), COSTS);
  assert.deepStrictEqual(boldHeads(sectionAt(text, 2).body), CLINIC_ISSUES);
});

test('认证五要素与退出四件事，各自一句列全且顺序一致', () => {
  const l = lists(readDoc());
  assert.deepStrictEqual(l.accreditation, ACCREDITATION);
  assert.deepStrictEqual(l.exit, EXIT_ITEMS);
});

test('周期账：五年制按两年一轮换要三轮，真实周期十年', () => {
  const c = cycleLedger(readDoc());
  assert.strictEqual(c.years, 5);
  assert.strictEqual(c.rotation, 2);
  assert.strictEqual(c.rounds, 3);
  assert.strictEqual(c.rounds, c.statedRounds, '正文自述的轮数与现算不符');
  assert.strictEqual(c.realYears, 10);
  assert.strictEqual(c.plannedYears, 5);
  assert.strictEqual(c.percent, 80);
  assert.strictEqual(c.remainingPercent, 20);
});

test('中文数字解析：两、五、十、三都解得开', () => {
  assert.strictEqual(cn2num('两'), 2);
  assert.strictEqual(cn2num('五'), 5);
  assert.strictEqual(cn2num('十'), 10);
  assert.strictEqual(cn2num('三'), 3);
});

test('判据句在正文里，不是代码自造', () => {
  const text = readDoc();
  for (const t of ['课谁来上', '学生在哪儿见病人', '学分对照表', '解释权的转移', '提前两年通知变更', '以学生权益为优先']) {
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
  assert.match(out, /不构成法律、投资或教育认证意见/);
  assert.ok(out.includes('需要 3 轮'), '输出未给出派驻轮数');
});
