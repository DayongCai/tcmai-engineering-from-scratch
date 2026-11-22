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
  swallowPhases,
  aspirationCauses,
  lodgementSites,
  CHAPTER,
  SLUG,
  QUIZ,
  TABLE_ROWS,
  TERMS,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且目录名与课程登记一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, SLUG);
  assert.match(dir, new RegExp(`^${String(CHAPTER).padStart(2, '0')}`));
});

test('小节结构：六个二级标题，自一至六编号，末节为代价与边界', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.ok(titles.every((t) => /^[一二三四五六]、/.test(t)), '六节未按一至六编号');
  assert.ok(titles[5].endsWith('代价与边界'));
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('表格：一张声带分层表，5 行 3 列，列数对齐', () => {
  const blocks = tableBlocks(readDoc());
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), TABLE_ROWS);
  const b = blocks[0];
  const widths = b.rows.map((r) => r.length);
  assert.strictEqual(new Set(widths).size, 1, `表格列数不齐：${widths.join(',')}`);
  assert.strictEqual(widths[0], b.head.length, '数据行列数与表头不符');
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('吞咽四期：口腔准备期、口腔期、咽期、食管期，顺序与正文一致', () => {
  assert.deepStrictEqual(swallowPhases(readDoc()), ['口腔准备期', '口腔期', '咽期', '食管期']);
});

test('误吸三类原因与四处卡点都按正文取到', () => {
  assert.deepStrictEqual(aspirationCauses(readDoc()), ['关门失败', '启动延迟', '清除失败']);
  assert.deepStrictEqual(lodgementSites(readDoc()), ['扁桃体窝', '会厌谷', '梨状窝', '声门']);
});

test('声带五层归两层：被覆层与体层两个词都在正文', () => {
  const t = readDoc();
  for (const k of ['被覆层', '体层', '浅固有层']) assert.ok(t.includes(k), '缺：' + k);
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
  assert.strictEqual(new Set(qs.map((x) => x.correct)).size, 4, '正确项位置没有打散到四个下标');
});

test('quiz 的 check 题至少两道能在正文中找到四字原词', () => {
  assert.ok(analyze().quiz.grounded >= 2, `接地 ${analyze().quiz.grounded} 道`);
});

test('quiz 与正文同源：至少两道 check 题的正确选项含两个以上不同原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions
    .filter((x) => x.stage === 'check')
    .filter((x) => new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g))).size >= 2);
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('命令行可运行，并打印四期与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /吞咽四期：口腔准备期/);
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
});

test('本章的关键判断都在正文：唯一开大声门肌、左侧行程更长、真异物怕吞咽', () => {
  const t = readDoc();
  for (const k of ['唯一的开大声门肌', '左侧行程明显长于右侧', '真的异物怕吞咽', '环甲膜穿刺']) {
    assert.ok(t.includes(k), '缺：' + k);
  }
});
