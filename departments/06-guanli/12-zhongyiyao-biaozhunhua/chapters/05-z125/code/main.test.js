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
  order,
  conversion,
  extractRange,
  chain,
  CHAPTER,
  SLUG,
  QUIZ,
  OBJECTS,
  UNCERTAINTIES,
  ROUTES,
  PROCESSING,
  BASELINE_CHAIN,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文在：规模够一章，且目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2000, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
  assert.strictEqual(cn2num('十三点八'), 13.8);
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

test('三件对象、三重不确定、三条路线、炮制三件都在正文', () => {
  const text = readDoc();
  for (const t of OBJECTS) assert.ok(occurrences(text, t) >= 1, `缺对象：${t}`);
  for (const t of UNCERTAINTIES) assert.ok(occurrences(text, t) >= 1, `缺不确定：${t}`);
  for (const t of ROUTES) assert.ok(occurrences(text, t) >= 1, `缺路线：${t}`);
  for (const t of PROCESSING) assert.ok(occurrences(text, t) >= 1, `缺炮制项：${t}`);
  assert.ok(text.includes('炮制品规格'), '缺炮制品规格');
});

test('确定顺序：煎服法 → 炮制 → 剂量，正文按此次序写', () => {
  const seq = order(readDoc());
  assert.deepStrictEqual(seq.map((x) => x.t), ['煎服法', '炮制', '剂量']);
  for (const x of seq) assert.ok(x.at >= 0, `${x.t} 不在「合理的顺序是」之后`);
  assert.ok(seq[0].at < seq[1].at && seq[1].at < seq[2].at, '顺序与正文不符');
  assert.ok(readDoc().includes('剂量与煎服法强耦合') || readDoc().includes('与煎服法强耦合'), '缺强耦合一句');
});

test('折算倍差：13.8 ÷ 3 ≈ 4.6，正文说「四倍多」', () => {
  const c = conversion(readDoc());
  assert.strictEqual(c.high, 13.8);
  assert.strictEqual(c.low, 3);
  assert.ok(Math.abs(c.ratio - 4.6) < 1e-9, `${c.ratio}`);
  assert.ok(c.ratio > 4, '倍差不是四倍多');
  assert.ok(readDoc().includes('相差四倍多'), '正文未写「相差四倍多」');
});

test('出膏率区间：18–26，宽度 8，来自十批', () => {
  const g = extractRange(readDoc());
  assert.strictEqual(g.low, 18);
  assert.strictEqual(g.high, 26);
  assert.strictEqual(g.width, 8);
  assert.strictEqual(g.batches, 10);
  assert.ok(readDoc().includes('判据要给区间，不给单值'), '缺区间判据');
});

test('基准样品链的五段按正文箭头顺序出现', () => {
  const text = readDoc();
  const nodes = chain(text);
  assert.deepStrictEqual(nodes.map((x) => x.t), BASELINE_CHAIN);
  for (const n of nodes) assert.ok(n.at >= 0, `缺链节：${n.t}`);
  for (let i = 1; i < nodes.length; i += 1) assert.ok(nodes[i].at > nodes[i - 1].at, `${nodes[i].t} 顺序不对`);
  assert.ok(text.includes('本方加减不属于本标准范围'), '缺加减边界');
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
  assert.ok(out.includes('4.6'), '输出未给出折算倍差');
});
