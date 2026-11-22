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
  fiveLayers,
  threeTimes,
  fourThreads,
  fundusRows,
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

test('五层组织正好五层，顺序为瞳神、晶珠、神膏、视衣、目系', () => {
  const ls = fiveLayers(readDoc());
  assert.strictEqual(ls.length, 5, ls.map((x) => x.layer).join('/'));
  assert.deepStrictEqual(ls.map((x) => x.layer), LAYERS);
  for (const l of ls) assert.ok(l.note.length >= 4, `${l.layer} 缺说明`);
});

test('内障的五层与「外障是壳、内障是里」的划界一致：外障部位不出现在层次清单里', () => {
  const layers = fiveLayers(readDoc()).map((x) => x.layer).join('');
  for (const outer of ['黑睛', '白睛', '胞睑']) assert.ok(!layers.includes(outer), `层次清单混入${outer}`);
});

test('病历的三个时间现算为三项', () => {
  const t = threeTimes(readDoc());
  assert.strictEqual(t.length, 3, t.join(' / '));
  assert.ok(t[0].includes('多久'), t[0]);
  assert.ok(t[1].includes('多快'), t[1]);
});

test('眼底表七行，四条主线四行，中列与右列都不为空', () => {
  const f = fundusRows(readDoc());
  assert.strictEqual(f.length, 7, `眼底表 ${f.length} 行`);
  for (const x of f) assert.ok(x.read && x.in, x.see);
  const th = fourThreads(readDoc());
  assert.strictEqual(th.length, 4, `主线 ${th.length} 条`);
  assert.deepStrictEqual(th.map((x) => x.thread), ['精血亏虚', '气虚下陷', '火逆风动', '气滞血瘀']);
});

test('眼底所见被明确限定为候选病机，不是结论', () => {
  const seg = sectionAt(readDoc(), 2);
  assert.ok(seg.includes('候选病机'), '未写候选病机');
  assert.ok(seg.includes('结论病机'), '未写结论病机');
  assert.ok(seg.includes('可错的'), '未写对应关系可错');
});

test('急与缓的分水岭写在第五节，第一动作是转诊', () => {
  const seg = sectionAt(readDoc(), 4);
  assert.ok(seg.includes('急与缓'), '未写急缓之分');
  assert.ok(seg.includes('第一动作永远是转诊'), '未写第一动作');
  for (const fast of ['暴盲', '绿风内障', '视网膜脱离', '急性视神经炎']) {
    assert.ok(seg.includes(fast), `急的一条缺「${fast}」`);
  }
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
  assert.match(out, /不构成诊断或治疗建议/);
  assert.match(out, /由本章正文现算/);
});

test('两张表的结构：眼底表 3 列，主线表 4 列', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 2);
  assert.deepStrictEqual(blocks.map((b) => b.head.length), [3, 4]);
});
