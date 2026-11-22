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
  grams,
  stages,
  baselines,
  designs,
  repro,
  failures,
  comboGroups,
  comboGroupsFive,
  replacementDrops,
  experimentMonths,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，章节号与目录一致', () => {
  assert.ok(hanzi(readDoc()) > 2500, `正文过短：${hanzi(readDoc())}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.strictEqual(fs.existsSync(DOC), true);
});

test('小节结构：五节编号加代价与边界', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  assert.ok(titles.slice(0, 5).every((t) => /^[一二三四五]、/.test(t)), '前五节未按一至五编号');
});

test('五个列表格：四段、基线、设计、复现、失败模式', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 5, `表格数 ${blocks.length}`);
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), [4, 3, 3, 3, 6]);
});

test('管线四段按顺序：规范化、表示、判定、后处理', () => {
  assert.deepStrictEqual(stages(), ['规范化', '表示', '判定', '后处理']);
});

test('基线三档编号连续，B0 在最前', () => {
  assert.deepStrictEqual(baselines(), ['B0', 'B1', 'B2']);
});

test('三种消融设计齐，反向替换在内', () => {
  assert.deepStrictEqual(designs(), ['单模块去除', '累积添加', '反向替换']);
});

test('复现三件齐：种子、参数、一条命令', () => {
  assert.deepStrictEqual(repro(), ['固定种子', '参数外置', '一条命令']);
});

test('六种失败模式按正文顺序，表格不自洽在内', () => {
  const f = failures();
  assert.strictEqual(f.length, 6, f.join('/'));
  assert.ok(f.includes('表格不自洽'), f.join('/'));
  assert.ok(f.includes('泄漏式提升'), f.join('/'));
});

test('全组合组数由正文现算：三组件 8、五组件 32', () => {
  assert.strictEqual(comboGroups(), 8);
  assert.strictEqual(comboGroupsFive(), 32);
  assert.strictEqual(2 ** 3, comboGroups());
  assert.strictEqual(2 ** 5, comboGroupsFive());
});

test('反向替换的两个掉分从正文读出，弱实现掉得更少', () => {
  assert.deepStrictEqual(replacementDrops(), { strong: 8, weak: 2 });
});

test('口径数字来自正文：实现与实验两阶段约占 3 人月', () => {
  assert.strictEqual(experimentMonths(), 3);
});

test('quiz 结构：≥5 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = q.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const st = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(st.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, `选项数不对：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.question}`);
    assert.strictEqual(new Set(item.options).size, 4, `选项重复：${item.question}`);
  }
  assert.strictEqual(q.slug, SLUG);
  assert.strictEqual(q.chapter, Number(CHAPTER));
});

test('quiz 的 check 题全部能在正文找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) assert.ok(h.grams.length > 0, `未接地：${h.question}`);
});

test('正确选项覆盖四个位置（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.strictEqual(new Set(idx).size, 4, `正确答案只落在 ${new Set(idx).size} 个位置`);
});

test('check 题带两个以上原文词组，且不考名目', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const check = q.questions.filter((x) => x.stage === 'check');
  const rich = check.filter((x) => {
    const hit = new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g)));
    return hit.size >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
  for (const x of check) assert.ok(!/三辨|四位面|本课第|本章实测|单元规模/.test(x.question), `题干残留套话：${x.question}`);
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.ok(out.includes(TITLE), '输出未含章题');
  assert.match(out, /不构成医学意见/);
  assert.match(out, /由本章正文现算/);
});

test('代价与边界三条都在：全组合跑不完、消融不证明机制、不给指标', () => {
  const text = readDoc();
  for (const k of ['完整消融的成本随组件数指数上升', '不能证明「它按你设想的机制起作用」', '本章不给指标选择与显著性检验的做法']) {
    assert.ok(text.includes(k), `缺：${k}`);
  }
});
