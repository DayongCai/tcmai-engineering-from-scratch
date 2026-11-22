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
  boldItems,
  orderedBold,
  threeTiers,
  tierDuties,
  fourTraces,
  threeJurisdictions,
  threeRedlines,
  fourRemedies,
  fiveTraces,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  EXPECTED_TIERS,
  EXPECTED_TRACES,
  EXPECTED_REDLINES,
  EXPECTED_REMEDIES,
  EXPECTED_FIVE,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2000, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
});

test('小节结构：六个二级标题，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.ok(titles[5].includes('代价与边界'), titles[5]);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('技术三档按表序读出，第三档的责任栏写的是「争议最大」', () => {
  assert.deepStrictEqual(threeTiers(), EXPECTED_TIERS);
  const d = tierDuties();
  assert.strictEqual(d.length, 3, d.length);
  assert.ok(d[0].decision.includes('独立判断'), d[0].decision);
  assert.ok(d[1].decision.includes('采纳或否决'), d[1].decision);
  assert.ok(d[2].liability.includes('争议最大'), d[2].liability);
});

test('实质复核看四个痕迹，四者全无就是名义复核', () => {
  assert.deepStrictEqual(fourTraces(), EXPECTED_TRACES);
  const body = sectionAt(readDoc(), 0).body;
  assert.ok(body.includes('四者全无，就是名义复核'), '未写四者全无');
  assert.ok(body.includes('技术可以辅助，不能替代'), '未写辅助不替代');
});

test('互联网三个管辖问题是跨地域、首诊、处方流转', () => {
  const j = threeJurisdictions();
  assert.strictEqual(j.length, 3, j.join('/'));
  assert.ok(j[0].includes('跨地域'), j[0]);
  assert.ok(j[1].includes('首诊'), j[1]);
  assert.ok(j[2].includes('处方'), j[2]);
  assert.ok(sectionAt(readDoc(), 1).body.includes('规则的原则清楚，边界模糊'), '未写原则清楚边界模糊');
});

test('健康数据三条红线是目的特定、最小必要、可追溯', () => {
  assert.deepStrictEqual(threeRedlines(), EXPECTED_REDLINES);
  const body = sectionAt(readDoc(), 2).body;
  assert.ok(body.includes('去标识化'), '未写去标识化');
  assert.ok(body.includes('要求不可复原'), '未写不可复原');
});

test('救济四条路按表序读出，各自解决的对象不同', () => {
  assert.deepStrictEqual(fourRemedies().map((x) => x.way), EXPECTED_REMEDIES);
  const r = fourRemedies();
  assert.ok(r[0].forWhat.includes('违规行为'), r[0].forWhat);
  assert.ok(r[1].forWhat.includes('赔偿'), r[1].forWhat);
  assert.ok(r[2].forWhat.includes('行政决定'), r[2].forWhat);
  assert.ok(sectionAt(readDoc(), 3).body.includes('方向性错误'), '未写方向性错误');
});

test('留痕五问按第五节有序列表读出，顺序即正文', () => {
  assert.deepStrictEqual(fiveTraces(), EXPECTED_FIVE);
  assert.deepStrictEqual(orderedBold(sectionAt(readDoc(), 4).body), EXPECTED_FIVE);
  const body = sectionAt(readDoc(), 4).body;
  assert.ok(body.includes('让责任可分配'), '未写责任可分配');
  assert.ok(body.includes('判断失误') && body.includes('未尽注意'), '未写两种认定的区别');
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
  assert.ok(r.quiz.check >= 3, `check 题只有 ${r.quiz.check} 道`);
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
});

test('正确答案不集中在同一个下标（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.ok(new Set(q.questions.map((x) => x.correct)).size >= 3, '答案只落在少数位置');
});

test('quiz 不含脚手架概念：不写三辨、四位面、单元规模与脚本输出指路', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `残留：${re}`);
  }
});

test('quiz 文本干净：无零宽字符与全角空格混入', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  assert.ok(!/[\u200b-\u200f\ufeff]/.test(raw), '有零宽字符');
  assert.ok(!/\u3000/.test(raw), '有全角空格');
});

test('quiz 与正文同源：check 题正确选项至少两道带两个以上原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions.filter((x) => {
    if (x.stage !== 'check') return false;
    return [...grams(String(x.options[x.correct]))].filter((g) => body.has(g)).length >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成法律意见/);
});

test('本章的边界写进了正文：不引条号、不评价产品、不构法律意见', () => {
  const text = readDoc();
  for (const k of ['本章不引具体条文序号与规范全称', '也不评价任何具体产品', '不构成法律意见']) {
    assert.ok(text.includes(k), k);
  }
  assert.strictEqual(tableBlocks(text).length, 2, '表格数变了');
  assert.ok(occurrences(text, '留痕') > 2, '留痕讨论过少');
  assert.ok(boldItems(sectionAt(text, 2).body).length >= 3, '红线条目不足');
});
