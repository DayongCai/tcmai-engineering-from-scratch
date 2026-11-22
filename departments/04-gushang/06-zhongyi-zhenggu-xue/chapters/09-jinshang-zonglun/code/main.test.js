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
  CHAPTER,
  SLUG,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
  twoDuties,
  threeMistakes,
  threeConditions,
  chronic,
  diagnosis,
  DIAGNOSIS,
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

test('小节结构：六个二级标题，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  assert.ok(titles.slice(0, 5).every((t) => /^[一二三四五]、/.test(t)), '前五节未按一至五编号');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('本章没有表格，正文与断言一致', () => {
  const blocks = tableBlocks(readDoc());
  assert.deepStrictEqual(blocks.map((b) => b.rows.length), TABLE_ROWS);
  assert.strictEqual(blocks.length, 0);
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('筋的两项职守从正文现算：束骨与利机关各有定义', () => {
  const d = twoDuties();
  assert.strictEqual(d.length, 2, d.join('/'));
  assert.ok(d[0].startsWith('束骨'), d[0]);
  assert.ok(d[1].startsWith('利机关'), d[1]);
});

test('急性期三个错误从正文现算：热敷揉搓、忍痛活动、肿消了就好了', () => {
  const m = threeMistakes();
  assert.strictEqual(m.length, 3, m.join('/'));
  assert.ok(m[0].includes('热敷'), m[0]);
  assert.ok(m[1].includes('忍痛'), m[1]);
  assert.ok(m[2].includes('肿消'), m[2]);
});

test('筋出槽的三个条件从正文现算，第三条是排除结构损伤', () => {
  const c = threeConditions();
  assert.strictEqual(c.length, 3, c.join('/'));
  assert.ok(c[0].includes('触诊发现'), c[0]);
  assert.ok(c[1].includes('功能表现'), c[1]);
  assert.ok(c[2].includes('排除结构损伤'), c[2]);
});

test('慢性筋伤三种机制从正文现算：劳损、粘连、代偿', () => {
  const c = chronic();
  assert.deepStrictEqual(c, ['劳损', '粘连', '代偿']);
});

test('诊断三样从正文现算，且都在正文有方法说明', () => {
  const d = diagnosis();
  assert.strictEqual(d.length, 3, d.join('/'));
  for (const k of DIAGNOSIS) assert.ok(readDoc().includes(k), k);
  assert.ok(d.includes('稳定性试验'), d.join('/'));
});

test('本章明确不写固定方式、训练强度与疗程', () => {
  assert.ok(readDoc().includes('本章不写具体的固定方式'));
});

test('冷热的判据是同一条：还在不在肿，与天数无关', () => {
  const sec = sectionAt(readDoc(), 2);
  assert.ok(sec.includes('还在不在肿'));
  assert.ok(sec.includes('比任何固定天数都可靠'));
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
  assert.ok(idx.some((x) => x !== idx[0]), '所有正确答案同一位置');
});

test('quiz 与正文同源：check 题正确选项带两个以上原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const check = q.questions.filter((x) => x.stage === 'check');
  const rich = check.filter((x) => {
    const hit = new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g)));
    return hit.size >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊疗建议/);
  assert.match(out, /由本章正文现算/);
});
