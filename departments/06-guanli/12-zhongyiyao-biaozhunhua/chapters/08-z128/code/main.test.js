'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  analyze,
  readDoc,
  hanzi,
  occurrences,
  cn2num,
  h2Titles,
  sectionAt,
  product,
  drift,
  CHAPTER,
  SLUG,
  QUIZ,
  INDICATORS,
  EVIDENCES,
  REVIEW_QUESTIONS,
  FAILURES,
  DESTINATIONS,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文在：规模够一章，且目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2000, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
  assert.strictEqual(cn2num('九十二'), 92);
});

test('小节结构：七节，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.ok(titles[6].includes('代价与边界'), titles[6]);
  assert.ok(titles.slice(0, 6).every((t) => /^[一二三四五六]、/.test(t)), '前六节未按一至六编号');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
  assert.strictEqual(SECTION_PROBES.length, h2Titles(readDoc()).length);
});

test('三个指标、四种证据、复审三问、三类失败、四个去处都在正文', () => {
  const text = readDoc();
  for (const t of INDICATORS) assert.ok(occurrences(text, t) >= 2, `缺指标：${t}`);
  for (const t of EVIDENCES) assert.ok(occurrences(text, t) >= 1, `缺证据：${t}`);
  for (const t of REVIEW_QUESTIONS) assert.ok(occurrences(text, t) >= 1, `缺复审问：${t}`);
  for (const t of FAILURES) assert.ok(occurrences(text, t) >= 1, `缺失败类：${t}`);
  for (const t of DESTINATIONS) assert.ok(occurrences(text, t) >= 1, `缺去处：${t}`);
  assert.ok(text.includes('有人在用吗'), '缺第四问');
});

test('演算一：0.90 × 0.70 × 0.50 ≈ 0.315', () => {
  const p = product(readDoc());
  assert.ok(p, '正文里找不到三个指标的口径');
  assert.strictEqual(p.cover, 0.9);
  assert.strictEqual(p.match, 0.7);
  assert.strictEqual(p.effect, 0.5);
  assert.ok(Math.abs(p.raw - 0.315) < 1e-9, `${p.raw}`);
  assert.strictEqual(p.rounded, '0.315');
  assert.ok(readDoc().includes('只有三份出头'), '缺「三份出头」的读法');
});

test('演算二：两年覆盖率都是九成，应使用的机构少四成', () => {
  const d = drift(readDoc());
  assert.ok(d, '正文里找不到两年覆盖率的例子');
  assert.strictEqual(d.base1, 100);
  assert.strictEqual(d.used1, 90);
  assert.strictEqual(d.base2, 60);
  assert.strictEqual(d.used2, 54);
  assert.ok(Math.abs(d.rate1 - 0.9) < 1e-9, `${d.rate1}`);
  assert.ok(Math.abs(d.rate2 - 0.9) < 1e-9, `${d.rate2}`);
  assert.ok(Math.abs(d.shrink - 0.4) < 1e-9, `${d.shrink}`);
  assert.ok(readDoc().includes('口径漂移'), '未给这种现象定名');
});

test('复审周期与「同一张检查表查三类问题」的提醒都在正文', () => {
  const r = analyze();
  assert.strictEqual(r.cycle, 5);
  assert.ok(readDoc().includes('复审周期一般不超过五年'), '缺复审周期');
  assert.ok(readDoc().includes('用同一张检查表去查三类问题'), '缺检查表的提醒');
});

test('quiz 结构：6 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
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

test('quiz 的 check 题至少两道能在正文找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.check >= 3, `check 题只有 ${r.quiz.check} 道`);
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
});

test('答案打散在多个下标，且不含脚手架概念', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  const q = JSON.parse(raw);
  assert.ok(new Set(q.questions.map((x) => x.correct)).size >= 3, '答案只落在少数位置');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `残留：${re}`);
    assert.ok(!re.test(fs.readFileSync(MAIN, 'utf8')), `代码残留：${re}`);
  }
});

test('命令行可运行，并打印现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成法律意见/);
  assert.ok(out.includes('0.315'), '输出未给出三个数的乘积');
  assert.ok(sectionAt(readDoc(), 5).body.includes('评价结果至少有四个去处'), '第六节内容不对位');
});
