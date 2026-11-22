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
  layers,
  confusionCells,
  outputForms,
  evidences,
  failures,
  overall,
  stratumScores,
  worstGap,
  errorsPerHundred,
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

test('五个列表格：维度、混淆、输出形态、证据、失败模式', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 5, `表格数 ${blocks.length}`);
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), [5, 4, 4, 3, 6]);
});

test('分层五维，标签类别与机构／来源排在最前（必做两项）', () => {
  const l = layers();
  assert.strictEqual(l.length, 5, l.join('/'));
  assert.strictEqual(l[0], '标签类别');
  assert.strictEqual(l[1], '机构／来源');
});

test('混淆矩阵四格齐全，假阴在第三格', () => {
  assert.deepStrictEqual(confusionCells(), ['真阳', '假阳', '假阴', '真阴']);
});

test('输出形态四种，从只有标签递进到含依据与弃权', () => {
  const f = outputForms();
  assert.strictEqual(f.length, 4, f.join('/'));
  assert.strictEqual(f[0], '只有标签');
  assert.ok(f[3].includes('弃权'), f[3]);
});

test('可解释证据三种，近邻病例在中间', () => {
  assert.deepStrictEqual(evidences(), ['特征归因', '近邻病例', '规则回指']);
});

test('六种失败模式按正文顺序，只报总体排第一', () => {
  const f = failures();
  assert.strictEqual(f.length, 6, f.join('/'));
  assert.strictEqual(f[0], '只报总体');
  assert.ok(f.includes('分数当概率'), f.join('/'));
});

test('总体与分层数字从正文读出，落差现算', () => {
  assert.strictEqual(overall(), 0.86);
  const rows = stratumScores();
  assert.deepStrictEqual(rows.map((r) => r.score), [0.42, 0.61, 0.55]);
  const w = worstGap();
  assert.strictEqual(w.worst, '某类证型');
  assert.strictEqual(w.gap, 0.44);
  assert.strictEqual(Number((0.86 - 0.42).toFixed(2)), w.gap);
});

test('口径数字来自正文：一百例里错 14 例', () => {
  assert.strictEqual(errorsPerHundred(), 14);
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

test('代价与边界三条都在：分层会切薄、不给阈值、解释不替代临床', () => {
  const text = readDoc();
  for (const k of ['分层会把样本切得很薄', '本章不给指标阈值', '可解释性不能替代临床判断']) {
    assert.ok(text.includes(k), `缺：${k}`);
  }
});
