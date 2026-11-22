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
  coverage,
  zeroDefectSample,
  elements,
  CHAPTER,
  SLUG,
  QUIZ,
  ELEMENTS,
  LEVELS,
  EMBEDS,
  EVENT_PARTS,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文在：规模够一章，且目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2000, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
  assert.strictEqual(cn2num('五十九'), 59);
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

test('六要素一项不缺，且都在第一节', () => {
  const items = elements(readDoc());
  assert.deepStrictEqual(items.map((x) => x.t), ELEMENTS);
  for (const x of items) assert.ok(x.ok, `缺要素：${x.t}`);
  assert.ok(readDoc().includes('六要素'), '未写六要素');
});

test('三级台阶、三个嵌入点、不良事件四件事都在正文', () => {
  const text = readDoc();
  for (const t of LEVELS) assert.ok(occurrences(text, t) >= 1, `缺台阶：${t}`);
  for (const t of EMBEDS) assert.ok(occurrences(text, t) >= 1, `缺嵌入点：${t}`);
  for (const t of EVENT_PARTS) assert.ok(occurrences(text, `${t}：`) >= 1, `缺事件项：${t}`);
  assert.ok(text.includes('穴位、手法、禁忌必须已经编码'), '缺编码前提');
  assert.ok(text.includes('允许差异'), '缺软条款的显式标注');
});

test('覆盖率演算：24 ÷ 40 = 60%，报告却写 92%', () => {
  const c = coverage(readDoc());
  assert.strictEqual(c.clauses, 40);
  assert.strictEqual(c.checkable, 24);
  assert.strictEqual(c.claimed, 92);
  assert.ok(Math.abs(c.ratio - 0.6) < 1e-9, `${c.ratio}`);
  assert.ok(c.claimed / 100 > c.ratio, '报告的符合率反而低于覆盖率，逻辑不成立');
});

test('零缺陷抽样：ln0.05 ÷ ln0.95 向上取整为 59 例，与正文自述一致', () => {
  assert.strictEqual(zeroDefectSample(), 59);
  const r = analyze();
  assert.strictEqual(r.statedN, 59, '正文自述的样本量与现算不符');
  assert.ok(readDoc().includes('抽二十例就宣布'), '缺二十例不足的反例');
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
  assert.match(out, /不构成具体操作指导/);
  assert.ok(out.includes('60% 的条款可查'), '输出未给出覆盖率');
  assert.ok(sectionAt(readDoc(), 5).body.includes('不良事件记录的最大价值'), '第六节内容不对位');
});
