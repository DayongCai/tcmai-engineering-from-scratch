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
  outcomeLayers,
  concepts,
  adverseElements,
  designs,
  designLimits,
  failures,
  zeroEvent,
  mcidRule,
  sourceScale,
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
  assert.match(titles[0], /终点分三层/);
  assert.match(titles[2], /并发症/);
});

test('五张表：终点层、易混概念、并发症、对照设计、失败模式，行数一致', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 5, `表格数 ${blocks.length}`);
  assert.deepStrictEqual(
    blocks.map((b) => b.rows.length),
    [3, 3, 6, 4, 6]
  );
  assert.deepStrictEqual(blocks[1].head, ['概念', '回答什么', '用错了会怎样']);
  assert.deepStrictEqual(blocks[3].head, ['设计', '能支持什么', '撑不住什么']);
});

test('终点三层按变化快慢排开：结构、功能、体验', () => {
  assert.deepStrictEqual(outcomeLayers(), ['结构', '功能', '体验']);
});

test('三个易混概念齐全，统计学差异与临床重要差异都在其中', () => {
  assert.deepStrictEqual(concepts(), ['统计学差异', '最小临床重要差异', '应答者比例']);
  assert.ok(mcidRule(), '正文未写最小临床重要差异不能拍脑袋定');
  assert.match(mcidRule(), /不是可以拍脑袋/);
});

test('并发症六环节齐全，定义排第一、分母排最后', () => {
  assert.deepStrictEqual(adverseElements(), ['定义', '采集窗口', '采集方式', '归因分级', '严重度', '分母']);
});

test('四种对照设计各配一条撑不住的东西', () => {
  assert.deepStrictEqual(designs(), ['前后对照', '与同期未干预组比较', '历史对照', '随机分组']);
  const pairs = designLimits();
  assert.strictEqual(pairs.length, 4);
  for (const p of pairs) assert.ok(p.limit.length > 0, `${p.design} 没有写撑不住什么`);
  assert.match(pairs[0].limit, /为什么变/, '前后对照应撑不住「为什么变」');
  assert.match(pairs[3].limit, /基线不平衡/, '随机分组应提示基线不平衡');
});

test('六种失败模式按正文顺序列出，终点漂移排第一', () => {
  assert.deepStrictEqual(failures(), ['终点漂移', 'p 值当疗效', '只报均值', '并发症低报', '混杂未处理', '结论越界']);
});

test('零事件口径可复算：上限 3/n、95% 置信水平、两个示例对得上', () => {
  const z = zeroEvent();
  assert.strictEqual(z.formula, '3/n');
  assert.strictEqual(z.ci, 95);
  assert.strictEqual(z.examples.length, 2, `示例数 ${z.examples.length}`);
  const byN = Object.fromEntries(z.examples.map((e) => [e.n, e]));
  assert.strictEqual(byN[20].computed, 0.15);
  assert.strictEqual(byN[60].computed, 0.05);
  assert.match(byN[20].stated, /一成五/);
  assert.strictEqual(byN[60].stated, '5%');
});

test('取材规模取自正文：3 个评定与康复单元、5 万余字', () => {
  const s = sourceScale();
  assert.strictEqual(s.units, 3);
  assert.strictEqual(s.wanzi, 5);
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

test('代价与边界四件事都在：严口径拉低优良率、归因不给界线、不给界值、比率是设定', () => {
  const text = readDoc();
  for (const k of [
    '严格的终点与并发症口径会拉低「优良率」',
    '并发症的归因需要临床判断',
    '本章不给任何量表的界值',
    '文中的例数、比率与「90%」等数字均为便于说明的设定',
  ]) {
    assert.ok(text.includes(k), `缺：${k}`);
  }
});
