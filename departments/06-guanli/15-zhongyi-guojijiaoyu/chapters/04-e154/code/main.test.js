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
  grams,
  misalignments,
  trackRule,
  examBlocks,
  chain,
  hourLedger,
  CHAPTER,
  SLUG,
  QUIZ,
  TRACKS,
  MISALIGNMENTS,
  CHAIN,
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

test('两条轨道都在正文出现，判据分工一句话写清', () => {
  const text = readDoc();
  for (const t of TRACKS) assert.ok(occurrences(text, t) >= 1, `正文里没有「${t}」`);
  const rule = trackRule(text);
  assert.strictEqual(rule.recognition, '总量与层级');
  assert.strictEqual(rule.licensure, '科目与小时');
});

test('四种错位读自第 2 节，顺序与正文一致', () => {
  const rows = misalignments(readDoc());
  assert.strictEqual(rows.length, 4);
  for (let i = 0; i < 4; i += 1) assert.strictEqual(rows[i].name, MISALIGNMENTS[i]);
});

test('执照考试四块读自一句话，四块都在', () => {
  const blocks = examBlocks(readDoc());
  assert.strictEqual(blocks.length, 4);
  assert.ok(blocks[0].includes('中医') && blocks[0].includes('针灸'), blocks[0]);
  assert.ok(blocks[1].includes('生物医学'), blocks[1]);
  assert.ok(blocks[2].includes('法规'), blocks[2]);
  assert.ok(blocks[3].includes('感染控制'), blocks[3]);
});

test('六环链条读自第 4 节，环数与顺序都对得上', () => {
  const rings = chain(readDoc());
  assert.deepStrictEqual(rings, CHAIN);
});

test('工时账：1,200 小时方剂课与 300／80 两种折算口径，差 3.75 倍', () => {
  const l = hourLedger(readDoc());
  assert.strictEqual(l.formula, 1200);
  assert.strictEqual(l.high, 300);
  assert.strictEqual(l.low, 80);
  assert.strictEqual(l.gap, 3.75);
});

test('判据句在正文里，不是代码自造', () => {
  const text = readDoc();
  for (const t of ['总量与层级', '科目与小时', '相当', '不是「等同」', '在任何语言里都高度地方化', '外交成果']) {
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
  assert.match(out, /不构成学历认证、执业注册或法律意见/);
  assert.ok(out.includes('差 3.75 倍'), '输出未给出折算差距');
});

test('接地窗口按标点断开：斜杠与标点不参与四字匹配', () => {
  const g = grams('中医/针灸的专业知识、生物医学基础');
  assert.ok(g.has('专业知识'));
  assert.strictEqual(g.has('医针灸的'), false);
});
