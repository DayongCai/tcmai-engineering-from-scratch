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
  mottoClauses,
  conditions,
  autoCount,
  manualCount,
  chains,
  standardLayers,
  ethics,
  compliance,
  constitution,
  CHAPTER,
  SLUG,
  QUIZ,
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

test('小节结构：七节，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.match(titles[6], /^七、代价与边界$/);
});

test('题记给出六个否定条件，正好是六个分句', () => {
  const c = mottoClauses(readDoc());
  assert.strictEqual(c.length, 6, c.join('/'));
  assert.ok(c.join('').includes('未动'), c.join('/'));
  assert.ok(c.join('').includes('未乱'), c.join('/'));
});

test('八类约束，四类可自动记录、四类需人记', () => {
  const cond = conditions(readDoc());
  assert.strictEqual(cond.length, 8, cond.map((x) => x.name).join('/'));
  assert.strictEqual(autoCount(readDoc()), 4);
  assert.strictEqual(manualCount(readDoc()), 4);
  const byName = Object.fromEntries(cond.map((c) => [c.name, c.auto]));
  for (const k of ['光照', '噪声', '温度', '时相']) assert.strictEqual(byName[k], true, `${k} 应为可自动`);
  for (const k of ['静息', '体位', '饮食', '局部准备']) assert.strictEqual(byName[k], false, `${k} 应为需人记`);
});

test('可自动的那四类恰是环境类，需人记的四类恰是状态类', () => {
  const cond = conditions(readDoc());
  const env = cond.filter((c) => ['光照', '噪声', '温度', '时相'].includes(c.name));
  assert.ok(env.every((c) => c.auto), '环境类里有需人记的');
  const state = cond.filter((c) => ['静息', '体位', '饮食', '局部准备'].includes(c.name));
  assert.ok(state.every((c) => !c.auto), '状态类里有可自动的');
});

test('四条采集链齐：望、闻、问、切', () => {
  assert.deepStrictEqual(chains(readDoc()), ['望', '闻', '问', '切']);
});

test('标准化三层：数据层、过程层、疗效层', () => {
  assert.deepStrictEqual(standardLayers(readDoc()), ['数据层', '过程层', '疗效层']);
});

test('伦理四条与合规三件都齐', () => {
  const e = ethics(readDoc());
  assert.strictEqual(e.length, 4, e.join('/'));
  for (const k of ['知情与可退出', '最小必要与去标识', '算法不越界', '责任可追溯']) assert.ok(e.includes(k), k);
  const c = compliance(readDoc());
  assert.strictEqual(c.length, 3, c.join('/'));
  assert.ok(c[0].includes('分级'), c[0]);
});

test('体质辨识的规模与界值由正文现算：9 量表、60 条目、5 级、40/30–39', () => {
  const c = constitution(readDoc());
  assert.strictEqual(c.scales, 9);
  assert.strictEqual(c.items, 60);
  assert.strictEqual(c.levels, 5);
  assert.strictEqual(c.yes, 40);
  assert.strictEqual(c.tendencyLo, 30);
  assert.strictEqual(c.tendencyHi, 39);
  assert.strictEqual(c.bandWidth, 10);
  assert.strictEqual(c.gap, 10);
  assert.ok(c.ok);
});

test('单张表四列八行：类别、具体约束、不满足会怎样、能否自动记录', () => {
  const b = tableBlocks(readDoc());
  assert.strictEqual(b.length, 1);
  assert.strictEqual(b[0].head.length, 4);
  assert.strictEqual(b[0].rows.length, 8);
  assert.strictEqual(b[0].head[3], '能否自动记录');
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
  for (const h of r.quiz.hits) assert.ok(h.grams.length > 0, `未接地：${h.question}`);
});

test('正确选项不集中在同一个下标（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `正确答案只落在 ${new Set(idx).size} 个位置`);
});

test('quiz 与正文同源：check 题正确选项带两个以上原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions
    .filter((x) => x.stage === 'check')
    .filter((x) => new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g))).size >= 2);
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带两个以上原文词组`);
});

test('命令行可运行，并打印分布与界值对账', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成医学意见/);
  assert.match(out, /可自动记录 4 类 · 需人记 4 类/);
  assert.match(out, /与正文一致/);
});

test('本章的边界：八类是教学归并，条件冲突时按研究目的取舍', () => {
  const text = readDoc();
  assert.ok(text.includes('不是操作规范'), '未声明不是操作规范');
  assert.ok(text.includes('冲突时按研究目的取舍'), '未写条件冲突的取舍原则');
});
