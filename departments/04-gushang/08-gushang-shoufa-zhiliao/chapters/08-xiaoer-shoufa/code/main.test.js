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
  fourLayers,
  weakestBoundary,
  salterTypes,
  arrestForms,
  handFour,
  threeConstraints,
  CHAPTER,
  SLUG,
  QUIZ,
  EXPECTED_LAYERS,
  EXPECTED_HAND,
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

test('小节结构：七个二级标题，末节为代价与边界', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.ok(titles[6].endsWith('代价与边界'), titles[6]);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('生长板四层按正文顺序读出', () => {
  assert.deepStrictEqual(fourLayers(), EXPECTED_LAYERS);
});

test('最弱的界面是肥大层与钙化层的交界', () => {
  const w = weakestBoundary();
  assert.ok(w.includes('肥大层与钙化层的交界'), w);
  assert.ok(!w.includes('*'), w);
});

test('Salter-Harris 五型齐，型别不重复', () => {
  const s = salterTypes();
  assert.strictEqual(s.length, 5, s.join('/'));
  assert.deepStrictEqual(s, ['Ⅰ', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ']);
});

test('生长阻滞两种形态：局部早闭与全周早闭', () => {
  assert.deepStrictEqual(arrestForms().map((x) => x.form), ['局部早闭', '全周早闭']);
});

test('手法谱是四个字：轻、快、柔、短', () => {
  assert.deepStrictEqual(handFour(), EXPECTED_HAND);
});

test('生理约束三条：稚阴稚阳、脾常不足、肾常虚', () => {
  const c = threeConstraints();
  assert.strictEqual(c.length, 3, c.join('/'));
  assert.ok(c[0].includes('稚阴稚阳'), c[0]);
  assert.ok(c[1].includes('脾常不足'), c[1]);
  assert.ok(c[2].includes('肾常虚'), c[2]);
});

test('手法清单里扳法不用、踩跷绝对不用，正文写死', () => {
  const text = readDoc();
  for (const k of ['扳法不用', '踩跷绝对不用', '先按骨折排查', '随访到生长结束']) assert.ok(text.includes(k), k);
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
});

test('正确答案不集中在同一个下标（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `正确答案只落在 ${new Set(idx).size} 个位置`);
});

test('quiz 与正文同源：check 题正确选项至少两道带两个以上原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions.filter((x) => {
    if (x.stage !== 'check') return false;
    const hit = new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g)));
    return hit.size >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('quiz 不含脚手架概念：不写三辨、四位面、单元规模与脚本输出指路', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `残留：${re}`);
  }
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
});

test('边界写进正文：不写参数、不给骨龄判读标准、小儿好治是有条件的判断', () => {
  const text = readDoc();
  for (const k of ['本章不写参数', '不给骨龄判读标准', '是一个有条件的判断', '不替代专业判断']) assert.ok(text.includes(k), k);
  assert.strictEqual(tableBlocks(text).length, 1, '表格数变了');
});
