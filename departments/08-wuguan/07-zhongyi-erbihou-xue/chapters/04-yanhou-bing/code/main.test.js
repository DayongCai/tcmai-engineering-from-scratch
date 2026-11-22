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
  triage,
  depressionSites,
  redLines,
  conclusions,
  boundaries,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
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

test('小节结构：六节，末节为「代价与边界」，且按一至五编号', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  for (let i = 0; i < 5; i += 1) assert.ok(titles[i].startsWith('一二三四五'[i] + '、'), `第 ${i + 1} 节编号不对`);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('正文没有表格：表格块数为 0（本章用编号而不是表）', () => {
  assert.strictEqual(tableBlocks(readDoc()).length, 0);
});

test('分诊四字按危险度倒序：痛、肿、阻、梗，各自病名可读', () => {
  assert.deepStrictEqual(triage(readDoc()), [
    { sign: '痛', diseases: ['喉痹'] },
    { sign: '肿', diseases: ['乳蛾', '喉痈'] },
    { sign: '阻', diseases: ['急喉风'] },
    { sign: '梗', diseases: ['梅核气'] },
  ]);
});

test('三凹征三个位置从正文定义句里拆出：胸骨上窝、锁骨上窝、肋间隙', () => {
  assert.deepStrictEqual(depressionSites(readDoc()), ['胸骨上窝', '锁骨上窝', '肋间隙']);
});

test('第五节自身编号三条红线（三种不能过夜的表现）', () => {
  assert.deepStrictEqual(redLines(readDoc()), ['一', '二', '三']);
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('判据收束成一句：咽痛可等一天，呼吸不能等一分钟', () => {
  const c = conclusions(readDoc());
  assert.strictEqual(c.length, 1, `读到 ${c.length} 条收束句`);
  for (const k of ['咽痛可以等一天', '呼吸不能等一分钟', '能张嘴', '能躺平']) assert.ok(c[0].includes(k), c[0]);
});

test('两处硬边界在正文里：梅核气排除吞咽困难、喉阻塞的转诊界线', () => {
  const b = boundaries(readDoc());
  assert.ok(b.globus.includes('逐渐加重'), b.globus);
  assert.ok(b.globus.includes('体重下降'), b.globus);
  assert.ok(b.airway.includes('气管切开或插管'), b.airway);
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
    assert.ok(!/三辨|四位面|单元规模|本章实测/.test(JSON.stringify(item)), `仍含旧脚手架：${item.question}`);
  }
  assert.strictEqual(new Set(qs.map((x) => x.correct)).size, 4, '正确项位置没有打散到四个下标');
});

test('quiz 的 check 题至少两道能在正文中找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
});

test('quiz 与正文同源：至少两道 check 题的正确选项含两个以上不同原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions
    .filter((x) => x.stage === 'check')
    .filter((x) => new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g))).size >= 2);
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成医学意见/);
  assert.match(out, /由本章正文现算/);
});

test('代码头部指向本章正文，且急喉风定性句在正文里可查', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/04-yanhou-bing/docs/zh.md'), '头部注释未指向本章');
  assert.ok(fs.existsSync(DOC) && fs.existsSync(QUIZ));
  assert.ok(sectionAt(readDoc(), 0).includes('闭塞即绝'));
});
