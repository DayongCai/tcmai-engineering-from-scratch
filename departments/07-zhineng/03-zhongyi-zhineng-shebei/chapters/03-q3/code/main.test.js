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
  motto,
  tenNumerals,
  sixFasts,
  handsFree,
  tenCovered,
  fourStages,
  scoringRules,
  endpoints,
  workflow,
  CHAPTER,
  SLUG,
  QUIZ,
  TEN,
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

test('十项全部出自题记原句，且序号正好十个', () => {
  const text = readDoc();
  const m = motto(text);
  assert.ok(m.length > 30, `题记未取全：${m}`);
  for (const t of TEN) assert.ok(m.includes(t), `题记没有「${t}」`);
  assert.strictEqual(tenNumerals(text), 10);
});

test('六快由矩阵表现读：吃、喝、拉、撒、睡、警觉安全', () => {
  assert.deepStrictEqual(sixFasts(readDoc()), ['吃', '喝', '拉', '撒', '睡', '警觉安全']);
});

test('十问被六快接住的只有两项：饮食与二便', () => {
  const c = tenCovered(readDoc());
  assert.deepStrictEqual(c, ['便', '饮食']);
  const text = readDoc();
  assert.ok(text.includes('只有四分之一接住了十问') || text.includes('四分之三来自新增需求'), '正文未写重叠比例');
});

test('真正不用人动手的是三项，不是六项', () => {
  const f = handsFree(readDoc());
  assert.strictEqual(f.length, 3, f.join('/'));
  assert.ok(f.join('').includes('睡'), f.join('/'));
  assert.ok(f.join('').includes('警觉'), f.join('/'));
});

test('四阶是象、素、候、证，顺序不可调换', () => {
  assert.deepStrictEqual(fourStages(readDoc()), ['象', '素', '候', '证']);
});

test('评分三条规矩齐备，第一条是缺数据不猜', () => {
  const rules = scoringRules(readDoc());
  assert.strictEqual(rules.length, 3, rules.map((r) => r.rule).join('/'));
  assert.ok(rules[0].rule.includes('缺数据不猜'), rules[0].rule);
  assert.ok(rules[1].rule.includes('同输入必得同输出'), rules[1].rule);
  assert.ok(rules[2].rule.includes('边界声明'), rules[2].rule);
});

test('三类终点齐：临床、与金标准的一致性、可用性', () => {
  const e = endpoints(readDoc());
  for (const k of ['临床终点', '与金标准的一致性', '可用性终点']) assert.ok(e.includes(k), `缺 ${k}：${e.join('/')}`);
});

test('工作流六步，提示之后是医师复核与记录', () => {
  const w = workflow(readDoc());
  assert.strictEqual(w.length, 6, w.join('→'));
  assert.deepStrictEqual(w, ['采集', '质控', '特征', '提示', '医师复核', '记录']);
});

test('矩阵表六行四列：快、能自动测的、手段、测不到的', () => {
  const b = tableBlocks(readDoc());
  assert.strictEqual(b.length, 1);
  assert.strictEqual(b[0].head.length, 4);
  assert.strictEqual(b[0].rows.length, 6);
  assert.strictEqual(b[0].head[0], '快');
  assert.ok(b[0].head[3].includes('测不到的'), b[0].head[3]);
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

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成医学意见/);
  assert.match(out, /由本章正文现算/);
  assert.match(out, /重叠：/);
});

test('本章的边界：六快是教学归并，寒热汗渴并未降权', () => {
  const text = readDoc();
  assert.ok(text.includes('不是行业标准分类'), '未声明六快是教学归并');
  assert.ok(text.includes('是这一行的缺口'), '未说明测不到是这一行的缺口');
  const sec = readDoc().split(/\r?\n/).slice(-8).join('\n');
  assert.ok(sec.includes('免责'), '末段缺免责');
});
