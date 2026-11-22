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
  fiveRings,
  noseSegments,
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

test('本章正文确实没有表格（登记为空），故不核对表行数', () => {
  assert.deepStrictEqual(TABLE_ROWS, []);
  assert.strictEqual(tableBlocks(readDoc()).length, 0);
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('滞留主链五环：按正文顺序取到入口窄到滞留，缺一环或错序即失败', () => {
  const rings = fiveRings(readDoc());
  assert.strictEqual(rings.length, 5, `取到 ${rings.length} 环：${rings.join('/')}`);
  assert.ok(rings[0].includes('入口窄'), rings[0]);
  assert.ok(rings[1].includes('出口挤'), rings[1]);
  assert.ok(rings[2].includes('黏膜一肿就闭'), rings[2]);
  assert.ok(rings[4].includes('滞留'), rings[4]);
});

test('「鼻塞」三段的含义与正文一致', () => {
  const s = noseSegments(readDoc());
  assert.strictEqual(s.outer, '鼻阀塌陷');
  assert.strictEqual(s.cavity, '鼻甲肿胀或中隔偏曲');
  assert.strictEqual(s.sinus, '窦口闭塞而鼻腔未必堵');
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

test('命令行可运行，并打印五环与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /滞留主链 5 环/);
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
});

test('本章的关键判断都在正文：通道而非窦腔、只有上颌窦在较高处、年龄—部位', () => {
  const t = readDoc();
  for (const k of ['通道而非窦腔', '出水口在瓶肩而非瓶底', '年龄—部位', '逆重力上送']) {
    assert.ok(t.includes(k), '缺：' + k);
  }
});
