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
  paragraphs,
  threeTables,
  defenseSlots,
  defenseTotal,
  mustAnswer,
  reviewFields,
  reviewMinutes,
  talkMinutes,
  abstractWords,
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

test('五个列表格：六段、三表、答辩分配、必答、评审栏', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 5, `表格数 ${blocks.length}`);
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), [6, 3, 5, 5, 7]);
});

test('六段结构按评审顺序排列', () => {
  assert.deepStrictEqual(paragraphs(), [
    '问题与意义',
    '相关工作',
    '数据与方法',
    '实验',
    '结果与分析',
    '讨论与局限',
  ]);
});

test('三张表就是主表、消融表、误差表', () => {
  assert.deepStrictEqual(threeTables(), ['主表', '消融表', '误差表']);
});

test('答辩时间连续不留缝，合计 20 分钟', () => {
  const slots = defenseSlots();
  assert.strictEqual(slots.length, 5, `时段数 ${slots.length}`);
  assert.strictEqual(slots[0].from, 0);
  for (let i = 1; i < slots.length; i += 1) assert.strictEqual(slots[i].from, slots[i - 1].to, '时段之间有空隙');
  assert.strictEqual(defenseTotal(), 20);
});

test('五个必答题各问一件事，基线那一问排第一', () => {
  const q = mustAnswer();
  assert.strictEqual(q.length, 5, q.join('/'));
  assert.ok(q[0].includes('基线'), q[0]);
  assert.ok(q[4].includes('谁来跑'), q[4]);
});

test('评审栏七栏，规范性在最后', () => {
  const f = reviewFields();
  assert.strictEqual(f.length, 7, f.join('/'));
  assert.strictEqual(f[6], '规范性');
});

test('口径数字来自正文：评阅 40–60 分钟、陈述 15–20 分钟、摘要约 300 字', () => {
  assert.deepStrictEqual(reviewMinutes(), { from: 40, to: 60 });
  assert.deepStrictEqual(talkMinutes(), { from: 15, to: 20 });
  assert.strictEqual(abstractWords(), 300);
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
  assert.ok(out.includes('合计 20 分钟'), '输出未打印答辩总时长');
  assert.match(out, /不构成学术评价意见/);
  assert.match(out, /由本章正文现算/);
});

test('代价与边界三条都在：表达自由、不给字数格式、答辩不替代内容', () => {
  const text = readDoc();
  for (const k of ['按表写会牺牲一部分表达自由', '本章不给字数、页数与格式要求', '答辩表现不能替代论文内容']) {
    assert.ok(text.includes(k), `缺：${k}`);
  }
});
