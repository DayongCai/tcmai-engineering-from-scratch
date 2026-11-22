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
  tearLayers,
  syndromes,
  boldLeads,
  forkGroups,
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

test('泪膜三层由外向内，每层都有成分、作用、失败方式与中医对应', () => {
  const ls = tearLayers(readDoc());
  assert.strictEqual(ls.length, 3, `层数 ${ls.length}`);
  assert.deepStrictEqual(ls.map((x) => x.layer), LAYERS);
  for (const l of ls) {
    assert.ok(l.part.length >= 3, `${l.layer} 缺成分`);
    assert.ok(l.fails.length >= 4, `${l.layer} 缺失败方式`);
    assert.ok(l.tcm.length >= 3, `${l.layer} 缺中医对应`);
  }
});

test('只有水液层那一行的成分是泪腺分泌，脂质层指向睑板腺', () => {
  const byName = Object.fromEntries(tearLayers(readDoc()).map((l) => [l.layer, l]));
  assert.ok(byName['脂质层'].part.includes('睑板腺'), byName['脂质层'].part);
  assert.ok(byName['水液层'].part.includes('泪腺'), byName['水液层'].part);
  assert.ok(byName['黏蛋白层'].part.includes('杯状细胞'), byName['黏蛋白层'].part);
});

test('四条辨证线，前两条属不足、后两条属不通', () => {
  const ss = syndromes(readDoc());
  assert.strictEqual(ss.length, 4, `线数 ${ss.length}`);
  assert.deepStrictEqual(ss.map((s) => s.name), ['肺阴不足', '肝肾阴虚', '脾胃湿热', '气滞血瘀']);
  const fork = forkGroups(readDoc());
  assert.strictEqual(fork.deficit, '津不足');
  assert.strictEqual(fork.blocked, '路不通');
});

test('外治与行为条目从正文粗体条目现算，热敷、清洁按摩、熏眼三项都在', () => {
  const items = boldLeads(sectionAt(readDoc(), 4));
  assert.ok(items.length >= 5, `条目数 ${items.length}`);
  const joined = items.join(' ');
  for (const k of ['热敷', '睑缘清洁与按摩', '熏眼', '用眼行为']) assert.ok(joined.includes(k), `缺「${k}」`);
});

test('外治不可替代的理由写在正文里：内服药到不了睑板腺的开口', () => {
  const seg = sectionAt(readDoc(), 2);
  assert.ok(seg.includes('内服药到不了睑板腺的开口'), '理由未写明');
  assert.ok(seg.includes('肉轮'), '未按五轮把睑板腺落到肉轮');
  assert.ok(seg.includes('脾'), '未落到脾');
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
  assert.match(out, /不构成诊断或用药建议/);
  assert.match(out, /由本章正文现算/);
});

test('两张表：泪膜表 5 列，辨证表 3 列', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 2);
  assert.deepStrictEqual(blocks.map((b) => b.head.length), [5, 3]);
});
