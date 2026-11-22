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
  legLengthKinds,
  layerPlan,
  betterThanTilt,
  CHAPTER,
  SLUG,
  QUIZ,
  TERMS,
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

test('小节结构：七个二级标题，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.strictEqual(titles[6], '代价与边界');
  assert.ok(titles.slice(0, 6).every((t) => /^[一二三四五六]、/.test(t)), '前六节未按一至六编号');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('本章无表格，全用段落与条目组织', () => {
  assert.deepStrictEqual(tableBlocks(readDoc()).length, 0);
});

test('三类腿长差由小节二现算：结构性、功能性、量出来的', () => {
  const k = legLengthKinds();
  assert.strictEqual(k.length, 3, k.join(' / '));
  assert.match(k[0], /结构性/);
  assert.match(k[1], /功能性/);
  assert.match(k[2], /量出来的/);
});

test('骨盆与下肢三层齐：松解、松动、整复', () => {
  const plan = layerPlan();
  assert.strictEqual(plan.length, 3, plan.join(' / '));
  assert.match(plan[0], /松解/);
  assert.match(plan[1], /松动/);
  assert.match(plan[2], /整复/);
});

test('比倾斜角度更有解释力的三样，由正文加粗现算', () => {
  const t = betterThanTilt();
  assert.strictEqual(t.length, 3, t.join(' / '));
  assert.ok(t.some((x) => x.includes('活动度')), t.join('/'));
  assert.ok(t.some((x) => x.includes('稳定性')), t.join('/'));
  assert.ok(t.some((x) => x.includes('负荷管理')), t.join('/'));
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('正文明确不宣称手法能改变骨盆的位置', () => {
  const text = readDoc();
  assert.ok(text.includes('不宣称手法能改变骨盆的位置'), '边界句被改动或删除');
  assert.ok(text.includes('触诊的信度有限'), '触诊局限句被改动或删除');
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
  assert.ok(new Set(qs.map((x) => x.correct)).size >= 3, '正确选项位置过于集中');
});

test('quiz 的 check 题至少两道能在正文中找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) assert.ok(h.grams.length > 0, `未接地：${h.question}`);
});

test('quiz 与正文同源：正确选项的四字原词不少于两个不同词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const check = q.questions.filter((x) => x.stage === 'check');
  const rich = check.filter((x) => {
    const hit = new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g)));
    return hit.size >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('命令行可运行，并打印三类与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
  assert.ok(out.includes('三类腿长差'), '输出未列出三类腿长差');
});
