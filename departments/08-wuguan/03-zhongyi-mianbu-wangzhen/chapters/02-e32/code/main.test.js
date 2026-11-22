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
  tenMethods,
  colourFigures,
  glossMetrics,
  CHAPTER,
  SLUG,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且目录名与章号一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, SLUG);
  assert.match(dir, new RegExp(`^${String(CHAPTER).padStart(2, '0')}`));
});

test('小节结构：六个二级标题，前五节按一至五编号，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  assert.ok(titles.slice(0, 5).every((t) => /^[一二三四五]、/.test(t)), '前五节未按一至五编号');
  assert.ok(titles[2].includes('Lab'), '第 3 节应是颜色空间那一节');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  assert.strictEqual(r.probes.length, SECTION_PROBES.length);
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('两张表：层/内容/取值范围/性质（2 行）与 法/原文/对应（5 行）', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 2);
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), TABLE_ROWS);
  assert.deepStrictEqual(blocks.map((b) => b.head.length), [4, 3]);
  assert.deepStrictEqual(blocks[0].head, ['层', '内容', '取值范围', '性质']);
  assert.deepStrictEqual(blocks[1].head, ['法', '原文', '图像上的近似对应']);
  for (const b of blocks) for (const row of b.rows) assert.strictEqual(row.length, b.head.length);
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('十法五对：2^5 = 32 种组合，5 × 32 = 160 个格子', () => {
  const ten = tenMethods(readDoc());
  assert.deepStrictEqual(ten.pairs, ['浮沉', '清浊', '微甚', '散抟', '泽夭']);
  assert.strictEqual(ten.count, 5);
  assert.strictEqual(ten.combos, 32);
  assert.strictEqual(ten.grid, 160);
  assert.strictEqual(ten.count * ten.combos, ten.grid);
  const t = readDoc();
  assert.ok(t.includes('32 种组合'), '正文的 32 种组合不在了');
  assert.ok(t.includes('5×32＝160'), '正文的格子数算式不在了');
  assert.ok(t.includes('没有一个格子带阈值'), '缺「无阈值」那句判断');
});

test('色域与色差：1677 万编码色，文中 ΔE 量级为 1–2 与 3–5', () => {
  const c = colourFigures(readDoc());
  assert.strictEqual(c.encodedColours, 1677);
  const flat = c.deltas.map((d) => d.join('-'));
  assert.ok(flat.includes('1-2'), `缺恰可察觉量级：${flat.join(',')}`);
  assert.ok(flat.includes('3-5'), `缺光源降级的量级：${flat.join(',')}`);
  assert.ok(readDoc().includes('足以吃掉一个判读等级'), '缺「吃掉一个判读等级」那句');
});

test('润泽拆成三个可测的量', () => {
  const g = glossMetrics(readDoc());
  assert.strictEqual(g.area, true, '缺高光面积占比');
  assert.strictEqual(g.entropy, true, '缺高光斑空间分布熵');
  assert.strictEqual(g.variance, true, '缺色度局部方差');
});

test('两条轴的立场写死在正文：类别不能与刻度相加', () => {
  const t = readDoc();
  assert.ok(t.includes('类别（nominal）'), '缺类别声明');
  assert.ok(t.includes('有序（ordinal）'), '缺有序声明');
  assert.ok(t.includes('润泽的权重应当高于色相'), '缺润泽权重');
  assert.ok(t.includes('不可能绕开的混淆项') || t.includes('无法绕开的混淆项'), '缺皮脂混淆声明');
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

test('答案位置打散：用到三个以上不同下标', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `只用到 ${new Set(idx).size} 个位置`);
});

test('quiz 的 check 题：道道能在正文里对上两个以上四字原词', () => {
  const r = analyze();
  assert.strictEqual(r.quiz.check, 3);
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) assert.ok(h.grams.length >= 2, `未接地：${h.question}`);
});

test('quiz 考的是正文的判断：类别/刻度、润泽权重、偏振', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const right = q.questions.filter((x) => x.stage === 'check').map((x) => String(x.options[x.correct]));
  assert.ok(right.some((s) => s.includes('32 种组合')), '缺「类别与刻度」那道');
  assert.ok(right.some((s) => s.includes('润泽的权重')), '缺「润泽为本」那道');
  assert.ok(right.some((s) => s.includes('交叉偏振') && s.includes('平行偏振')), '缺「偏振分层」那道');
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
  assert.match(out, /160 个格子/);
});
