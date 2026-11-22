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
  sectionAt,
  metricLayers,
  fourIncomparable,
  threeVars,
  threeBefore,
  CHAPTER,
  SLUG,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  LAYERS,
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

test('小节结构：六个二级标题，一至六编号，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.ok(titles.every((t, i) => t.startsWith('一二三四五六'[i] + '、')), titles.join(' | '));
  assert.ok(titles[5].includes('代价与边界'), titles[5]);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('三层指标从表格现读：症状、功能、结构，各自写明谁报', () => {
  const ls = metricLayers(readDoc());
  assert.strictEqual(ls.length, 3, `层数 ${ls.length}`);
  assert.deepStrictEqual(ls.map((x) => x.layer), LAYERS);
  assert.ok(ls[0].who.includes('病人'), ls[0].who);
  assert.ok(ls[1].who.includes('检查'), ls[1].who);
  assert.ok(ls[2].who.includes('设备'), ls[2].who);
});

test('三层是互相校验，不是越往下越高级', () => {
  const seg = sectionAt(readDoc(), 1);
  assert.ok(seg.includes('互相校验'), '未写互相校验');
  assert.ok(seg.includes('不是「越往下越高级」'), '未否定层级说');
});

test('证候积分的四个不可比从正文现算，四条都在', () => {
  const r = fourIncomparable(readDoc());
  assert.strictEqual(r.length, 4, r.join(' / '));
  assert.ok(r[0].includes('条目不同'), r[0]);
  assert.ok(r[1].includes('权重不同'), r[1]);
  assert.ok(r[2].includes('评定者不同'), r[2]);
  assert.ok(r[3].includes('证候改善与病情改善'), r[3]);
});

test('随访节律的三个变量从正文现算', () => {
  const v = threeVars(readDoc());
  assert.strictEqual(v.length, 3, v.join(' / '));
  assert.deepStrictEqual(v, ['病的速度', '治疗的风险', '病人的可及性']);
});

test('治疗前要写下的三样从正文现算：目标、指标、时间', () => {
  const b = threeBefore(readDoc());
  assert.strictEqual(b.length, 3, JSON.stringify(b));
  assert.deepStrictEqual(b.map((x) => x.item), ['目标', '指标', '时间']);
});

test('评价起点写在正文最醒目的位置：在治疗开始，不在治疗结束', () => {
  assert.ok(sectionAt(readDoc(), 4).includes('疗效评价的起点不在治疗结束，在治疗开始'), '未写起点');
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
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

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议或疗效承诺/);
  assert.match(out, /由本章正文现算/);
});

test('表格只有一张（三层指标），四列三行', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 1, `表格数 ${blocks.length}`);
  assert.strictEqual(blocks[0].head.length, 4);
  assert.strictEqual(blocks[0].rows.length, 3);
});
