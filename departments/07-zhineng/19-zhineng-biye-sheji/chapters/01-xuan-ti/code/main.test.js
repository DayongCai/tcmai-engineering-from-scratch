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
  price,
  rank,
  personMonths,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，章节号与目录一致', () => {
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
  assert.match(titles[1], /四步降维/);
});

test('五个列表格：判据、降维、形态、里程碑、失败模式各一张', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 5, `表格数 ${blocks.length}`);
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), [3, 4, 3, 4, 5]);
  assert.deepStrictEqual(blocks[1].head, ['步', '要收掉什么', '收完的样子', '还宽着的样子']);
});

test('三条判据是正文现算的三条，顺序与表一致', () => {
  assert.deepStrictEqual(criteria(), ['可复现', '可对照', '可接手']);
});

test('四步降维定序为问题、对象、任务、终点', () => {
  assert.deepStrictEqual(dimensions(), ['问题', '对象', '任务', '终点']);
});

test('三种题目形态与四个里程碑齐全，编号连续', () => {
  assert.deepStrictEqual(forms(), ['编码翻译层', '邻域稳定性检验', '可审计失效包']);
  assert.deepStrictEqual(milestones(), ['M1', 'M2', 'M3', 'M4']);
});

test('五种失败模式按正文顺序列出，题目漂移排第一', () => {
  assert.deepStrictEqual(failures(), ['题目漂移', '方法先行', '数据幻觉', '范围蔓延', '借来的题目']);
});

test('判据分量的次序可从正文定位：可对照最硬', () => {
  const text = readDoc();
  assert.ok(text.includes('**可对照最硬**'), '未写可对照最硬');
  assert.deepStrictEqual(
    rank().map((x) => x.key),
    ['可对照', '可复现', '可接手']
  );
});

test('口径数字来自正文：200,000 元/院，8 人月', () => {
  assert.strictEqual(price(), 200000);
  assert.strictEqual(personMonths(), 8);
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
});

test('quiz 的 check 题全部能在正文找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) assert.ok(h.grams.length > 0, `未接地：${h.question}`);
});

test('正确选项不集中在同一个下标（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `正确答案只落在 ${new Set(idx).size} 个位置`);
  assert.strictEqual(new Set(idx).size, 4, `四个位置未全部用到：${idx.join(',')}`);
});

test('check 题考的是正文里的判断，不是名目', () => {
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

test('代价与边界四件事都在：严判据、不虚构校历、形态可替换、数字是教学口径', () => {
  const text = readDoc();
  for (const k of [
    '严判据会筛掉一部分本来能做完的题目',
    '本章不给具体评分标准',
    '三类题目形态来自本系的交付结构',
    '不构成对任何具体项目的报价或承诺',
  ]) {
    assert.ok(text.includes(k), `缺：${k}`);
  }
});
