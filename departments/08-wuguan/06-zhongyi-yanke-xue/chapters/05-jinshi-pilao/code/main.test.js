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
  threeThings,
  threeLayers,
  syndromes,
  behaviors,
  therapies,
  CHAPTER,
  SLUG,
  QUIZ,
  TERMS,
  SECTION_PROBES,
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

test('三件事从正文现算为三项：假性、真性、视疲劳，各节都给了处理方向', () => {
  const ts = threeThings(readDoc());
  assert.strictEqual(ts.length, 3, ts.join(' / '));
  assert.deepStrictEqual(ts, ['假性近视', '真性近视', '视疲劳']);
  const seg = sectionAt(readDoc(), 0);
  assert.ok(seg.includes('散瞳后屈光度消失或显著减少'), '假性的判据未写');
  assert.ok(seg.includes('眼轴增长'), '真性的机制未写');
});

test('「久视伤血」三层现算为三项，第三层是结构改变的那一层', () => {
  const ls = threeLayers(readDoc());
  assert.strictEqual(ls.length, 3, ls.join(' / '));
  assert.deepStrictEqual(ls, ['血不养目', '气机郁滞', '神光不发']);
  assert.ok(readDoc().includes('能动的只有前两层'), '未写可动范围');
});

test('四条辨证线：前三条不足、第四条不通，第四条标注视疲劳多见', () => {
  const ss = syndromes(readDoc());
  assert.strictEqual(ss.length, 4, `线数 ${ss.length}`);
  assert.deepStrictEqual(ss.map((s) => s.name), [
    '心阳不足',
    '肝肾两虚',
    '脾气虚弱',
    '气滞血瘀（视疲劳多见）',
  ]);
  assert.ok(readDoc().includes('前三条是「不足」，第四条是「不通」'), '分叉未写');
});

test('行为干预与外治手段都从粗体条目现算，条目数≥5 与≥4', () => {
  const bs = behaviors(readDoc());
  assert.ok(bs.length >= 5, `行为条目 ${bs.length}`);
  for (const k of ['户外时间', '用眼距离与姿势', '间歇', '光照', '睡眠与饮食']) {
    assert.ok(bs.join(' ').includes(k), `缺「${k}」`);
  }
  const ts = therapies(readDoc());
  assert.ok(ts.length >= 4, `外治条目 ${ts.length}`);
  assert.ok(ts.join(' ').includes('眼保健操'), '缺眼保健操');
});

test('「缓解不是治疗」的分界写在正文里：眼保健操对屈光度无效', () => {
  const seg = sectionAt(readDoc(), 4);
  assert.ok(seg.includes('对视力疲劳有效，对屈光度无效'), '分界未写');
  assert.ok(seg.includes('它是「缓解」，不是「治疗」'), '定性未写');
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
  assert.match(out, /不构成诊断、处方或视力矫正建议/);
  assert.match(out, /由本章正文现算/);
});

test('表格只有一张（辨证四条线），三列四行', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 1, `表格数 ${blocks.length}`);
  assert.strictEqual(blocks[0].head.length, 3);
  assert.strictEqual(blocks[0].rows.length, 4);
});
