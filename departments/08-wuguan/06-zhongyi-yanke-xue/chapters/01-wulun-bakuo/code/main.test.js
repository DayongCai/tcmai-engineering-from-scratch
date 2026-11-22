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
  wulunRows,
  locate,
  boldLeads,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  BAKUO_NAMES,
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

test('五轮表从正文读出五行五列，轮位不重复', () => {
  const rows = wulunRows(readDoc());
  assert.strictEqual(rows.length, 5, `表行数 ${rows.length}`);
  const table = tableBlocks(readDoc())[0];
  assert.strictEqual(table.head.length, 5);
  assert.strictEqual(new Set(rows.map((r) => r.lun)).size, 5);
  assert.strictEqual(new Set(rows.map((r) => r.area)).size, 5);
});

test('五轮与五脏、表里之腑的对应与正文一致', () => {
  const rows = wulunRows(readDoc());
  const pairs = rows.map((r) => `${r.lun}:${r.zang}:${r.fu}`);
  assert.deepStrictEqual(pairs, [
    '肉轮:脾:胃',
    '血轮:心:小肠',
    '气轮:肺:大肠',
    '风轮:肝:胆',
    '水轮:肾:膀胱',
  ]);
});

test('由体征定位：白睛→肺、瞳神→肾，一处不命中的返回空', () => {
  assert.deepStrictEqual(locate('白睛红赤').map((x) => x.zang), ['肺']);
  assert.deepStrictEqual(locate('瞳神散大').map((x) => x.zang), ['肾']);
  assert.deepStrictEqual(locate('视物模糊'), []);
});

test('跨区体征返回两个候选，不擅自取一个', () => {
  const r = locate('眦部白睛充血');
  assert.strictEqual(r.length, 2, r.map((x) => x.lun).join('/'));
  assert.deepStrictEqual(r.map((x) => x.lun).sort(), ['气轮', '血轮']);
});

test('「它在哪里失效」写了四种情形，不多不少', () => {
  const parts = boldLeads(sectionAt(readDoc(), 4));
  assert.strictEqual(parts.length, 4, parts.join(' / '));
  const joined = parts.join('');
  assert.ok(joined.includes('配属被当成因果'), joined);
  assert.ok(joined.includes('急症不认格子'), joined);
});

test('八廓没有被写成第二套纲领：正文只点名部分名目，且都带争议标记', () => {
  const text = readDoc();
  const seen = BAKUO_NAMES.filter((n) => occurrences(text, n) > 0);
  assert.ok(seen.length >= 2, '正文未提八廓名目');
  assert.ok(seen.length < BAKUO_NAMES.length, '八个名目全被点名，与「边界无唯一解」的论述不符');
  assert.ok(text.includes('有争议'), '正文未保留争议标记');
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
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
});
