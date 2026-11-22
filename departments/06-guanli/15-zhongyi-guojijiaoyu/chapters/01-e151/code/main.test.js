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
  h2Titles,
  grams,
  paths,
  shifts,
  criteria,
  hourBudget,
  herbalGate,
  quizSummary,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  PATHS,
  SHIFTS,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文在：规模够一章，目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 3000, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
});

test('小节结构：五节，末节为「代价与边界」，前四节按一至五编号', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 5, `小节数 ${titles.length}`);
  assert.ok(titles[4].includes('代价与边界'), titles[4]);
  for (const t of titles.slice(0, 4)) assert.ok(/^[一二三四]、/.test(t), `未按序编号：${t}`);
});

test('三条路径读自第 1 节，名字与遗产逐条对得上', () => {
  const rows = paths(readDoc());
  assert.strictEqual(rows.length, 3, `读到 ${rows.length} 条路径`);
  for (let i = 0; i < 3; i += 1) assert.ok(rows[i].name.includes(PATHS[i]), `${rows[i].name} 与 ${PATHS[i]} 不符`);
  assert.ok(rows[0].legacy.includes('术语的碎片化'), rows[0].legacy);
  assert.ok(rows[1].legacy.includes('技术切口'), rows[1].legacy);
  assert.ok(rows[2].legacy.includes('定义权'), rows[2].legacy);
});

test('三次位移读自第 3 节，末一次是学院到大学', () => {
  const rows = shifts(readDoc());
  assert.strictEqual(rows.length, 3, `读到 ${rows.length} 次位移`);
  for (let i = 0; i < 3; i += 1) assert.strictEqual(rows[i].name, SHIFTS[i]);
});

test('三条判据读自第 4 节：路径、接口、压缩', () => {
  const rows = criteria(readDoc());
  assert.strictEqual(rows.length, 3, `读到 ${rows.length} 条判据`);
  assert.ok(rows[0].ask.includes('路径'), rows[0].ask);
  assert.ok(rows[1].ask.includes('接口'), rows[1].ask);
  assert.ok(rows[2].ask.includes('压缩'), rows[2].ask);
});

test('学时账：900 压到 320，临床只剩 40 小时观察', () => {
  const b = hourBudget(readDoc());
  assert.strictEqual(b.total, 900);
  assert.strictEqual(b.packed, 320);
  assert.strictEqual(b.clinic, 40);
  assert.strictEqual(b.cut, 580);
  assert.ok(Math.abs(b.keepRatio - 320 / 900) < 1e-12, `${b.keepRatio}`);
  assert.ok(Math.abs(b.clinicShare - 0.125) < 1e-12, `${b.clinicShare}`);
  assert.ok(Math.abs(b.clinicMinutesPerHour - 7.5) < 1e-12, `${b.clinicMinutesPerHour}`);
  assert.ok(b.keepRatio < 0.4, '压缩后占比应在四成以下');
});

test('传统草药门槛：三十年使用史，其中本地十五年，正好一半', () => {
  const g = herbalGate(readDoc());
  assert.strictEqual(g.years, 30);
  assert.strictEqual(g.local, 15);
  assert.strictEqual(g.localShare, 0.5);
});

test('三处判据与路径的用词都在正文里，不是代码自造', () => {
  const text = readDoc();
  for (const t of ['接口', '术语的碎片化', '技术切口', '定义权的部分让渡', '学生实际动手的次数']) {
    assert.ok(occurrences(text, t) >= 1, `正文里没有「${t}」`);
  }
  assert.ok(occurrences(text, '接口') >= 5, `「接口」只出现 ${occurrences(text, '接口')} 次`);
});

test('quiz 结构：题量、三段、四选项、correct 合法、explain ≥30 汉字', () => {
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

test('quiz 接地：至少两道 check 题的正确选项能在正文找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.check >= 3, `check 题只有 ${r.quiz.check} 道`);
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
});

test('答案打散在多个位置，且 quiz 与代码都不含正文之外的名目', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  const q = JSON.parse(raw);
  assert.ok(new Set(q.questions.map((x) => x.correct)).size >= 3, '答案只落在少数位置');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `quiz 残留：${re}`);
    assert.ok(!re.test(fs.readFileSync(MAIN, 'utf8')), `代码残留：${re}`);
  }
});

test('命令行可运行，并打印现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成法律、合规或教育认证意见/);
  assert.ok(out.includes('900 → 320'), '输出未给出学时账');
});

test('接地函数本身可用：四字窗口从正文取，边界不错位', () => {
  const g = grams('中医走出去，走的不是文化，是接口');
  assert.ok(g.has('中医走出'));
  assert.ok(g.has('是接口的') === false);
  assert.ok(g.has('文化是一') === false);
});
