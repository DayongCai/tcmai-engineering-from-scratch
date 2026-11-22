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
  boldLeads,
  sixKinds,
  limiters,
  examRegions,
  complaints,
  CHAPTER,
  SLUG,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  FOUR_RULES,
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

test('小节结构：六个二级标题，一至六编号，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.ok(titles.every((t, i) => t.startsWith('一二三四五六'[i] + '、')), titles.join(' | '));
  assert.ok(titles[5].includes('代价与边界'), titles[5]);
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('「看不清」覆盖六类病，恰好六项', () => {
  const kinds = sixKinds();
  assert.strictEqual(kinds.length, 6, kinds.join(' / '));
  assert.ok(kinds[0].includes('屈光不正'), kinds[0]);
  assert.ok(kinds[kinds.length - 1].includes('功能性视力下降'), kinds[kinds.length - 1]);
});

test('三个限定词从正文粗体条目现算，不多不少', () => {
  const ls = limiters(readDoc());
  assert.strictEqual(ls.length, 3, ls.join(' / '));
  assert.deepStrictEqual(ls, ['速度', '眼别', '伴随']);
  for (const l of ls) assert.ok(sectionAt(readDoc(), 0).includes(l), l);
});

test('望诊表：五区五轮，顺序为胞睑、两眦、白睛、黑睛、瞳神', () => {
  const regions = examRegions(readDoc());
  assert.strictEqual(regions.length, 5, `区数 ${regions.length}`);
  assert.deepStrictEqual(regions.map((x) => x.region), ['胞睑', '两眦', '白睛', '黑睛', '瞳神']);
  const wheels = regions.map((x) => x.wheel).join('');
  for (const w of ['肉轮', '血轮', '气轮', '风轮', '水轮']) assert.ok(wheels.includes(w), w);
});

test('分诊表有六种主诉说法，第一列各不相同', () => {
  const cs = complaints(readDoc());
  assert.strictEqual(cs.length, 6, `行数 ${cs.length}`);
  assert.strictEqual(new Set(cs).size, 6);
  assert.strictEqual(tableBlocks(readDoc())[0].head.length, 3);
});

test('视力检查四条纪律在正文里都能找到原句', () => {
  const text = readDoc();
  for (const rule of FOUR_RULES) assert.ok(text.includes(rule), `正文没有「${rule}」`);
});

test('两个最易混的术语在正文里分开写过，不是同义词', () => {
  const text = readDoc();
  const seg = sectionAt(text, 2);
  assert.ok(seg.includes('抱轮红赤'), '望诊节未写抱轮红赤');
  assert.ok(seg.includes('白睛混赤'), '望诊节未写白睛混赤');
  assert.ok(/抱轮红赤[^。]*要分开写|「抱轮红赤」与「白睛混赤」要分开写/.test(text), '正文未强调两者要分开写');
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
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
});

test('check 题问的是正文的判断，不是记忆题', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const check = q.questions.filter((x) => x.stage === 'check');
  assert.strictEqual(check.length, 3);
  for (const c of check) assert.ok(hanzi(c.question) >= 8, c.question);
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成诊断或治疗建议/);
  assert.match(out, /由本章正文现算/);
});
