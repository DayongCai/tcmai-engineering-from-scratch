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
  sectionAt,
  grams,
  boldHeads,
  analogies,
  misalignments,
  boundaries,
  disclosureLedger,
  qiDisorders,
  CHAPTER,
  SLUG,
  QUIZ,
  ANALOGIES,
  MISALIGNMENTS,
  PREREQUISITES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文在：规模够一章，目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
});

test('小节结构：五节，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 5, `小节数 ${titles.length}`);
  assert.ok(titles[4].includes('代价与边界'), titles[4]);
  for (const t of titles.slice(0, 4)) assert.ok(/^[一二三四]、/.test(t), `未按序编号：${t}`);
});

test('三个比喻读自第 1 节，顺序是气、经络、上火', () => {
  assert.deepStrictEqual(analogies(readDoc()), ANALOGIES);
});

test('每个比喻都配了失效条件，欠账为 0', () => {
  const l = disclosureLedger(readDoc());
  assert.strictEqual(l.need, 3);
  assert.strictEqual(l.given, 3);
  assert.strictEqual(l.owed, 0);
});

test('气机失常的三种情况与「可推翻」判据都在正文', () => {
  assert.deepStrictEqual(qiDisorders(readDoc()), ['气逆', '气陷', '气脱']);
  assert.ok(/看它能不能被推翻/.test(readDoc()));
});

test('三类概念错位读自第 2 节，冒号后的说明也在', () => {
  const rows = misalignments(readDoc());
  assert.strictEqual(rows.length, 3);
  for (let i = 0; i < 3; i += 1) assert.strictEqual(rows[i].name, MISALIGNMENTS[i]);
  assert.ok(rows[0].note.includes('脏腑不是器官'), rows[0].note);
  assert.ok(rows[1].note.includes('证不是病因链'), rows[1].note);
  assert.ok(rows[2].note.includes('个案不是证据'), rows[2].note);
});

test('三项前置读自第 3 节', () => {
  assert.deepStrictEqual(boldHeads(sectionAt(readDoc(), 2).body), PREREQUISITES);
});

test('传播边界：正文写三条，另有一条指向传播者自身，合计四条', () => {
  const b = boundaries(readDoc());
  assert.strictEqual(b.numbered.length, 3);
  assert.ok(b.numbered[0].rule.includes('不承诺疗效'), b.numbered[0].rule);
  assert.ok(b.numbered[1].rule.includes('不替代当地医疗体系'), b.numbered[1].rule);
  assert.ok(b.numbered[2].rule.includes('文化认同'), b.numbered[2].rule);
  assert.ok(b.extra.includes('东方'), b.extra);
  assert.strictEqual(b.total, 4);
});

test('判据句在正文里，不是代码自造', () => {
  const text = readDoc();
  for (const t of ['紧接着给出它在什么情况下失效', '自我封闭', '边界会被信心吸收', '可被检验的陈述', '把技术内核让出去了']) {
    assert.ok(occurrences(text, t) >= 1, `正文里没有「${t}」`);
  }
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
  const spread = new Set(q.questions.map((x) => x.correct));
  assert.ok(spread.size >= 3, `答案只落在 ${spread.size} 个位置`);
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
  assert.match(out, /不构成医学意见、诊断或治疗建议/);
  assert.ok(out.includes('欠账 0'), '输出未给出失效条件的欠账');
});

test('接地窗口不跨标点：词组只在连续汉字段内匹配', () => {
  const g = grams('气逆、气陷、气脱');
  assert.strictEqual(g.size, 0, '两字词撑不起四字窗口');
  const h = grams('讲气机升降出入');
  assert.ok(h.has('气机升降'));
  assert.ok(h.has('升降出入'));
});
