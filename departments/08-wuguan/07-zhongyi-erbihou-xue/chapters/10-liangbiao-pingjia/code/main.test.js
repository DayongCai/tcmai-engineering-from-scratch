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
  arithmetic,
  layers,
  masks,
  minimalSet,
  rules,
  conclusions,
  boundaries,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且目录名与课程登记一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, SLUG);
  assert.match(dir, new RegExp(`^${String(CHAPTER).padStart(2, '0')}`));
});

test('小节结构：六节，末节为「代价与边界」，且按一至五编号', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  for (let i = 0; i < 5; i += 1) assert.ok(titles[i].startsWith('一二三四五'[i] + '、'), `第 ${i + 1} 节编号不对`);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('表格：一张三行四列，行列对齐', () => {
  const blocks = tableBlocks(readDoc());
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), TABLE_ROWS);
  for (const b of blocks) {
    const widths = b.rows.map((r) => r.length);
    assert.strictEqual(new Set(widths).size, 1, `表格列数不齐：${widths.join(',')}`);
    assert.strictEqual(widths[0], b.head.length, '数据行列数与表头不符');
  }
  assert.deepStrictEqual(blocks[0].head, ['层', '测什么', '常用工具（举例）', '谁填']);
});

test('三层：症状、功能、生活质量，填表人分别是病人、检查者、病人', () => {
  assert.deepStrictEqual(layers(readDoc()), [
    { layer: '症状', who: '病人' },
    { layer: '功能', who: '检查者' },
    { layer: '生活质量', who: '病人' },
  ]);
});

test('第四节的六道算术，按题设重算后与正文所写逐项相符', () => {
  const a = arithmetic(readDoc());
  assert.strictEqual(a.length, 6, `只有 ${a.length} 项`);
  for (const x of a) assert.ok(x.ok, `${x.label}：重算 ${x.computed} ≠ 正文 ${x.stated}`);
  const byLabel = Object.fromEntries(a.map((x) => [x.label, x]));
  assert.strictEqual(byLabel['鼻部四项满分'].computed, '12');
  assert.strictEqual(byLabel['1 分占满分百分比'].computed, '8.3');
  assert.strictEqual(byLabel['log2(取值数)'].computed, '3.46');
  assert.strictEqual(byLabel['耳鸣残疾量表量程'].computed, '100');
  assert.strictEqual(byLabel['鼻部生活质量量程'].computed, '110');
  assert.strictEqual(byLabel['嗓音五维组合数'].computed, '1024');
});

test('三种掩盖：反向变化、天花板与地板、回忆偏倚', () => {
  const m = masks(readDoc());
  assert.strictEqual(m.length, 3, `读到 ${m.length} 条`);
  assert.ok(m[0].includes('反向变化'), m[0]);
  assert.ok(m[1].includes('天花板'), m[1]);
  assert.ok(m[2].includes('回忆偏倚'), m[2]);
});

test('最小数据集五项、四条使用纪律', () => {
  assert.deepStrictEqual(minimalSet(readDoc()), ['1', '2', '3', '4', '5']);
  assert.deepStrictEqual(rules(readDoc()), ['第一', '第二', '第三', '第四']);
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('判据收束成一句：能测的测，分项报，没有对照就说变化', () => {
  const c = conclusions(readDoc());
  assert.strictEqual(c.length, 1, `读到 ${c.length} 条收束句`);
  for (const k of ['能测的测', '分项报', '不合并', '没有对照']) assert.ok(c[0].includes(k), c[0]);
});

test('两处硬边界在正文里：不给任何判定阈值、没有对照只谈变化', () => {
  const b = boundaries(readDoc());
  assert.ok(b.threshold.includes('最小临床重要差值'), b.threshold);
  assert.ok(b.control.includes('没有对照，只谈变化'), b.control);
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
    assert.ok(!/三辨|四位面|单元规模|本章实测/.test(JSON.stringify(item)), `仍含旧脚手架：${item.question}`);
    assert.ok(!/[\u200b-\u200f\ufeff]/.test(JSON.stringify(item)), `含零宽字符：${item.question}`);
  }
  assert.strictEqual(new Set(qs.map((x) => x.correct)).size, 4, '正确项位置没有打散到四个下标');
});

test('quiz 的 check 题至少两道能在正文中找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
});

test('quiz 与正文同源：至少两道 check 题的正确选项含两个以上不同原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions
    .filter((x) => x.stage === 'check')
    .filter((x) => new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g))).size >= 2);
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('命令行可运行，并打印边界声明与逐项算术结论', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成医学意见/);
  assert.match(out, /由本章正文现算/);
  assert.match(out, /✓ 嗓音五维组合数：1024/);
});

test('代码头部指向本章正文，且「好转不是可比较的词」在正文里可查', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/10-liangbiao-pingjia/docs/zh.md'), '头部注释未指向本章');
  assert.ok(fs.existsSync(DOC) && fs.existsSync(QUIZ));
  assert.ok(sectionAt(readDoc(), 0).includes('好转'));
});
