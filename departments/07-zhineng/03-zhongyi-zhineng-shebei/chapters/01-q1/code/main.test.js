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
  sectionAt,
  elements,
  deviceClasses,
  forms,
  selectionQuestions,
  hardLimits,
  clinicPoints,
  holterScale,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
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

test('小节结构：七节，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.match(titles[6], /^七、代价与边界$/);
  assert.ok(titles.slice(0, 6).every((t) => /^[一二三四五六]、/.test(t)), '前六节未按一至六编号');
});

test('四元表恰好 P/E/M/K 四行，与「只有四类」的论断一致', () => {
  assert.deepStrictEqual(elements(readDoc()), ['P', 'E', 'M', 'K']);
  assert.strictEqual(tableBlocks(readDoc()).length, 1, '本章应只有一张表');
});

test('六类器械由正文现切，不写死', () => {
  const cls = deviceClasses(readDoc());
  assert.strictEqual(cls.length, 6, cls.join('/'));
  for (const k of ['诊断类', '治疗类', '监护类', '康复类', '中药装备', '可穿戴']) {
    assert.ok(cls.includes(k), `缺 ${k}`);
  }
});

test('三级形态取正文原句：台式、便携、可穿戴', () => {
  assert.deepStrictEqual(forms(readDoc()), ['台式', '便携', '可穿戴']);
});

test('选型四问恰为四问，顺序与原句一致', () => {
  const qs = selectionQuestions(readDoc());
  assert.strictEqual(qs.length, 4, qs.map((q) => q.ask).join('/'));
  assert.ok(qs[0].ask.includes('动线'), qs[0].ask);
  assert.ok(qs[1].ask.includes('中医概念'), qs[1].ask);
  assert.ok(qs[2].ask.includes('外部系统'), qs[2].ask);
  assert.ok(qs[3].ask.includes('合规'), qs[3].ask);
});

test('三条硬边界：传感、语义、责任各一条', () => {
  const limits = hardLimits(readDoc());
  const three = ['传感不能越过生理', '语义不能从参数自动生成', '责任不能转移'];
  for (const k of three) assert.ok(limits.includes(k), `缺「${k}」，实得 ${limits.join('/')}`);
});

test('门诊十秒的采样点数由条数×采样率×秒数现算，并与正文一致', () => {
  const c = clinicPoints(readDoc());
  assert.ok(c, '正文未写门诊十秒那笔账');
  assert.strictEqual(c.perLine, 200 * 10);
  assert.strictEqual(c.perLine, c.statedPerLine, '现算单条点数与正文不符');
  assert.strictEqual(c.points, 27 * 200 * 10);
  assert.strictEqual(c.points, 54000);
  assert.strictEqual(c.statedWan, 5.4);
  assert.ok(c.ok);
});

test('二十四小时的采样点与存储量由 86400 秒现算，并与正文一致', () => {
  const h = holterScale(readDoc());
  assert.ok(h, '正文未写二十四小时那笔账');
  assert.strictEqual(h.points, 250 * 86400);
  assert.strictEqual(h.points, 21600000);
  assert.strictEqual(h.wan, 2160);
  assert.strictEqual(Number(h.mb.toFixed(1)), 43.2);
  assert.ok(h.ok);
});

test('两笔账相差四百倍，连续性不是免费的', () => {
  const c = clinicPoints(readDoc());
  const h = holterScale(readDoc());
  assert.ok(h.points / c.points > 300 && h.points / c.points < 500, `倍数 ${h.points / c.points}`);
});

test('留证先于可比、可比先于可积累的次序在正文中可定位', () => {
  const t = sectionAt(readDoc(), 0);
  assert.ok(t.includes('留证'), '首节未写留证');
  assert.ok(t.includes('这个次序不能倒'), '首节未写次序不可倒');
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

test('quiz 与正文同源：check 题正确选项带两个以上原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions
    .filter((x) => x.stage === 'check')
    .filter((x) => new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g))).size >= 2);
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带两个以上原文词组`);
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成医学意见/);
  assert.match(out, /由本章正文现算/);
  assert.match(out, /对得上/, '两笔账未做对账');
});

test('关键判据词都出现在正文（词频 > 0）', () => {
  const text = readDoc();
  for (const k of ['留证', '换能终点', '有效监测时长占比', '预期用途', '责任不能转移']) {
    assert.ok(occurrences(text, k) > 0, `正文没有「${k}」`);
  }
});
