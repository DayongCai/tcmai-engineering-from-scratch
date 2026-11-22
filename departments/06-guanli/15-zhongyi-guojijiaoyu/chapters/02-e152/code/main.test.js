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
  layers,
  mismatches,
  consensusCost,
  standardsFacts,
  CHAPTER,
  SLUG,
  QUIZ,
  LAYERS,
  MISMATCHES,
  TREATMENTS,
  CONSTRAINTS,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文在：规模够一章，目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2000, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
});

test('小节结构：五节，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 5, `小节数 ${titles.length}`);
  assert.ok(titles[4].includes('代价与边界'), titles[4]);
  for (const t of titles.slice(0, 4)) assert.ok(/^[一二三四]、/.test(t), `未按序编号：${t}`);
});

test('三层标准读自第 1 节，管辖范围各是一句话', () => {
  const rows = layers(readDoc());
  assert.strictEqual(rows.length, 3);
  for (let i = 0; i < 3; i += 1) assert.strictEqual(rows[i].name, LAYERS[i]);
  assert.strictEqual(rows[0].scope, '叫什么');
  assert.strictEqual(rows[1].scope, '算不算病');
  assert.strictEqual(rows[2].scope, '合不合格');
});

test('三种失配读自第 2 节，三是过度归化', () => {
  const rows = mismatches(readDoc());
  assert.strictEqual(rows.length, 3);
  for (let i = 0; i < 3; i += 1) assert.strictEqual(rows[i].name, MISMATCHES[i]);
});

test('三种不可译处理与四道工程约束，各自的数量与名字都对得上', () => {
  const t = boldHeads(sectionAt(readDoc(), 2).body);
  const c = boldHeads(sectionAt(readDoc(), 3).body);
  assert.deepStrictEqual(t, TREATMENTS);
  assert.deepStrictEqual(c, CONSTRAINTS);
});

test('工时账：300 术语 × 2–3 版本 × 30 分钟 = 300–450 小时', () => {
  const c = consensusCost(readDoc());
  assert.strictEqual(c.terms, 300);
  assert.strictEqual(c.lowV, 2);
  assert.strictEqual(c.highV, 3);
  assert.strictEqual(c.minutes, 30);
  assert.strictEqual(c.hoursLow, 300, `下界 ${c.hoursLow}`);
  assert.strictEqual(c.hoursHigh, 450, `上界 ${c.hoursHigh}`);
  assert.strictEqual(c.hoursLow, c.statedLow, '正文自述下界与现算不符');
  assert.strictEqual(c.hoursHigh, c.statedHigh, '正文自述上界与现算不符');
});

test('中文数字解析：两、三、三十、十五都解得开', () => {
  assert.strictEqual(cn2num('两'), 2);
  assert.strictEqual(cn2num('三'), 3);
  assert.strictEqual(cn2num('三十'), 30);
  assert.strictEqual(cn2num('十五'), 15);
});

test('标准落地的年份与归属都在正文里', () => {
  const s = standardsFacts(readDoc());
  assert.strictEqual(s.whoTerms, 2007);
  assert.strictEqual(s.isoCommittee, 2009);
  assert.strictEqual(s.icd11, true, '未提第十一次修订本');
  assert.strictEqual(s.secretariatInChina, true, '未提秘书处由中国承担');
});

test('失配与处理的判据句在正文里，不是代码自造', () => {
  const text = readDoc();
  for (const t of ['可读性与概念的保真度成反比', '毫不费力', '辨证的余地就消失了', '回到定义就能发现', '旧编码废弃']) {
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
  assert.ok(new Set(q.questions.map((x) => x.correct)).size >= 3, '答案只落在少数位置');
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
  assert.match(out, /不构成标准化、翻译或合规意见/);
  assert.ok(out.includes('300–450 小时'), '输出未给出工时区间');
});
