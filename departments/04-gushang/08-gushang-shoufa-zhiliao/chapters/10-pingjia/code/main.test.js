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
  threeEffect,
  sevenDomains,
  fourNodes,
  planCells,
  threeDirections,
  sixIneffective,
  stopConditions,
  CHAPTER,
  SLUG,
  QUIZ,
  EXPECTED_EFFECT,
  EXPECTED_NODES,
  EXPECTED_PLAN,
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

test('小节结构：七个二级标题，末节为代价与边界', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.ok(titles[6].endsWith('代价与边界'), titles[6]);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('有效的三个量是幅度、时点、归因', () => {
  assert.deepStrictEqual(threeEffect(), EXPECTED_EFFECT);
});

test('指标分七个域，互相不能替代', () => {
  const d = sevenDomains();
  assert.strictEqual(d.length, 7, d.map((x) => x.domain).join('/'));
  assert.ok(d[0].domain === '疼痛', d[0].domain);
  assert.ok(d[6].domain === '全局', d[6].domain);
});

test('复评节点四个，与正文顺序一致', () => {
  assert.deepStrictEqual(fourNodes(), EXPECTED_NODES);
});

test('方案五格，缺一格不可复述', () => {
  assert.deepStrictEqual(planCells(), EXPECTED_PLAN);
});

test('走向只有三种，没有「再看看」这个第四选项', () => {
  assert.deepStrictEqual(threeDirections(), ['继续', '改动', '停止']);
  assert.ok(readDoc().includes('没有第四个选项叫「再看看」'), '未写第四选项');
});

test('无效六种形态，进行性加重那一行要求停手而不是加量', () => {
  const f = sixIneffective();
  assert.strictEqual(f.length, 6, f.map((x) => x.form).join('/'));
  const worse = f.find((x) => x.form === '进行性加重');
  assert.ok(worse.change.includes('停手'), worse.change);
  assert.ok(worse.never.includes('痛才有效'), worse.never);
});

test('停手条件四条，与正文一致', () => {
  const s = stopConditions();
  assert.strictEqual(s.length, 4, s.join('/'));
  assert.ok(s.includes('出现红旗'), s.join('/'));
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of ['最小临床重要差异', '可归因性', '联合方案', '自然病程']) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
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
});

test('正确答案不集中在同一个下标（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `正确答案只落在 ${new Set(idx).size} 个位置`);
});

test('quiz 与正文同源：check 题正确选项至少两道带两个以上原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions.filter((x) => {
    if (x.stage !== 'check') return false;
    const hit = new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g)));
    return hit.size >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('quiz 不含脚手架概念：不写三辨、四位面、单元规模与脚本输出指路', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `残留：${re}`);
  }
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
});

test('边界写进正文：不给阈值与权重、不给疗程周数、有效不等于治愈', () => {
  const text = readDoc();
  for (const k of ['不给阈值与权重', '不给疗程周数', '不等于「治愈」', '不替代专业判断']) assert.ok(text.includes(k), k);
  assert.strictEqual(tableBlocks(text).length, 2, '表格数变了');
});
