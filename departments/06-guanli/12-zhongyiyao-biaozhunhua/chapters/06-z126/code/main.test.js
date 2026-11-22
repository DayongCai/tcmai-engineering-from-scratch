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
  modes,
  reviewLoad,
  CHAPTER,
  SLUG,
  QUIZ,
  MODES,
  DIFFICULTIES,
  CRITERIA,
  TECH_ITEMS,
  PRECONDITIONS,
  DEFINITION_RULES,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文在：规模够一章，且目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2000, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
  assert.strictEqual(cn2num('二百二十五'), 225);
});

test('小节结构：八节，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 8, `小节数 ${titles.length}`);
  assert.ok(titles[7].includes('代价与边界'), titles[7]);
  assert.ok(titles.slice(0, 7).every((t) => /^[一二三四五六七]、/.test(t)), '前七节未按一至七编号');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
  assert.strictEqual(SECTION_PROBES.length, h2Titles(readDoc()).length);
});

test('三种对接模式按正文段落顺序出现，义务各不同', () => {
  const m = modes(readDoc());
  assert.deepStrictEqual(m.map((x) => x.m), MODES);
  for (const x of m) assert.ok(x.ok, `缺模式：${x.m}`);
  assert.ok(m[0].at < m[1].at, '采纳与修改采纳的段落顺序反了');
  const text = readDoc();
  assert.ok(text.includes('原样采用国际文件'), '缺采纳的定义');
  assert.ok(text.includes('逐条说明调整理由与技术依据'), '缺修改采纳的要求');
});

test('四类难点、三条判据、四件技术对接、三个前提都在正文', () => {
  const text = readDoc();
  for (const t of DIFFICULTIES) assert.ok(occurrences(text, t) >= 1, `缺难点：${t}`);
  for (const t of CRITERIA) assert.ok(occurrences(text, t) >= 1, `缺判据：${t}`);
  for (const t of TECH_ITEMS) assert.ok(occurrences(text, t) >= 1, `缺技术项：${t}`);
  for (const t of PRECONDITIONS) assert.ok(occurrences(text, t) >= 1, `缺前提：${t}`);
  assert.ok(text.includes('只有方法比对没有室间比对'), '缺等效性双证的判据');
});

test('定义句三条纪律都写进了第四节', () => {
  const text = readDoc();
  for (const r of DEFINITION_RULES) assert.ok(text.includes(r), `缺纪律：${r}`);
  assert.ok(text.includes('君臣佐使'), '缺「不引用典故」的反例');
});

test('演算：9000 人次、225 个工作日、2700 条进第二轮', () => {
  const l = reviewLoad(readDoc());
  assert.strictEqual(l.terms, 3000);
  assert.strictEqual(l.experts, 3);
  assert.strictEqual(l.perDay, 40);
  assert.strictEqual(l.reviews, 9000);
  assert.strictEqual(l.days, 225);
  assert.strictEqual(l.stated, 225, '正文自述的工作日数与现算不符');
  assert.strictEqual(l.share, 0.3);
  assert.strictEqual(l.disputed, 2700);
  assert.strictEqual(l.statedDisputed, 2700, '正文自述的分歧条数与现算不符');
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
  assert.match(out, /不构成注册申报/);
  assert.ok(out.includes('9,000 人次评审'), '输出未给出评审人次');
});
