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
  criteria,
  dimensions,
  forms,
  milestones,
  failures,
  rank,
  budget,
  taskSentence,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，目录名与章号一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, SLUG);
  assert.match(dir, new RegExp(`^0${CHAPTER}-`));
  assert.strictEqual(fs.existsSync(DOC), true);
});

test('小节结构：五个编号节加代价与边界，末节固定', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  assert.ok(titles.slice(0, 5).every((t) => /^[一二三四五]、/.test(t)), '前五节未按一至五编号');
  assert.match(titles[0], /三条判据/);
  assert.match(titles[1], /四步降维/);
});

test('五张表：判据、降维、产物、里程碑、失败模式，行数与正文一致', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 5, `表格数 ${blocks.length}`);
  assert.deepStrictEqual(
    blocks.map((b) => b.rows.length),
    [3, 4, 3, 4, 5]
  );
  assert.deepStrictEqual(blocks[1].head, ['步', '收掉什么', '收完的样子', '还宽着的样子']);
  assert.deepStrictEqual(blocks[0].head, ['判据', '在骨伤里问什么', '不合格的样子']);
});

test('三条判据按表格顺序读出，不写死', () => {
  assert.deepStrictEqual(criteria(), ['可复现', '可对照', '可接手']);
});

test('四步降维定序为问题、对象、任务、终点', () => {
  assert.deepStrictEqual(dimensions(), ['问题', '对象', '任务', '终点']);
});

test('三份产物与四个里程碑齐全，编号连续', () => {
  assert.deepStrictEqual(forms(), ['专科路径底座', '轴选择留痕报告', '康复量表可复现包']);
  assert.deepStrictEqual(milestones(), ['M1', 'M2', 'M3', 'M4']);
});

test('五种失败模式按正文顺序列出，题目漂移排第一', () => {
  assert.deepStrictEqual(failures(), ['题目漂移', '方法先行', '数据幻觉', '范围蔓延', '借来的题目']);
});

test('判据分量的次序能从正文加粗句定位：可对照最硬', () => {
  const text = readDoc();
  assert.ok(text.includes('**可对照最硬**'), '未写可对照最硬');
  assert.ok(text.includes('**可复现次之**'), '未写可复现次之');
  assert.ok(text.includes('**可接手最软'), '未写可接手最软');
  assert.deepStrictEqual(
    rank().map((x) => x.key),
    ['可对照', '可复现', '可接手']
  );
});

test('第三步的判据句来自正文：愿望不是任务', () => {
  assert.ok(taskSentence(), '正文未找到第三步的判据句');
  assert.match(taskSentence(), /不是任务/);
});

test('口径数字来自正文：211,000 元、18.6 个月', () => {
  const b = budget();
  assert.strictEqual(b.cost, 211000);
  assert.strictEqual(b.payback, 18.6);
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
    assert.strictEqual(new Set(item.options).size, 4, `选项重复：${item.question}`);
  }
  assert.strictEqual(q.slug, SLUG);
  assert.strictEqual(q.chapter, Number(CHAPTER));
  assert.strictEqual(q.title, TITLE);
});

test('quiz 的 check 题全部能在正文找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) assert.ok(h.grams.length > 0, `未接地：${h.question}`);
});

test('正确选项打散：四个位置都用到，且没有一边倒', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.strictEqual(new Set(idx).size, 4, `未用满四个位置：${idx.join(',')}`);
  const top = Math.max(...[0, 1, 2, 3].map((i) => idx.filter((x) => x === i).length));
  assert.ok(top <= Math.ceil(idx.length / 2), `某一位置占比过高：${idx.join(',')}`);
});

test('check 题考的是正文里的判断，不是名目', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const check = q.questions.filter((x) => x.stage === 'check');
  assert.ok(check.length >= 2, `check 题只有 ${check.length} 道`);
  const rich = check.filter((x) => {
    const hit = new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g)));
    return hit.size >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
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

test('代价与边界四件事都在：严判据会筛题、不虚构校历、形态可替换、数字是教学口径', () => {
  const text = readDoc();
  for (const k of [
    '严判据会筛掉一部分本来能做完的题目',
    '本章不给具体评分标准',
    '三份产物来自本系的交付结构',
    '不构成对任何项目的报价或承诺',
  ]) {
    assert.ok(text.includes(k), `缺：${k}`);
  }
});
