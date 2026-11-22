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
  lineage,
  eyeBookOrder,
  citeModes,
  threeQuestions,
  attribution,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  LINEAGE_ROWS,
  EYE_BOOKS,
  SECTION_PROBES,
  TERMS,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，目录名与课程登记一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.match(SLUG, new RegExp(`^${String(CHAPTER).padStart(2, '0')}`));
});

test('小节结构：六节，末节为「代价与边界」，一至五依次编号', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.ok(titles[5].endsWith('代价与边界'), `末节是「${titles[5]}」`);
  for (let i = 0; i < 5; i += 1) assert.ok(titles[i].startsWith('一二三四五'[i] + '、'), `第 ${i + 1} 节编号不对`);
});

test('每节探针都落在本节，顺序未被改动', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('谱系表：五条，四列，行序为目耳鼻咽喉口齿', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 1, `表格数 ${blocks.length}`);
  assert.strictEqual(blocks[0].rows.length, LINEAGE_ROWS);
  assert.deepStrictEqual(blocks[0].head, ['谱系', '奠基（唐宋及以前）', '集成（明清）', '谱系性质']);
  assert.deepStrictEqual(blocks[0].rows.map((r) => r[0]), ['目', '耳', '鼻', '咽喉', '口齿']);
  for (const r of blocks[0].rows) assert.strictEqual(r.length, 4, `列数不齐：${r.join('|')}`);
});

test('谱系性质一列：耳鼻无独立专书，眼有手术与外治专篇', () => {
  const rows = lineage(readDoc()).rows;
  const by = Object.fromEntries(rows.map((r) => [r.lineage, r.nature]));
  assert.strictEqual(by['目'], '专书齐全，含手术与外治专篇');
  assert.strictEqual(by['耳'], '无独立专书，寄于方书与外科');
  assert.strictEqual(by['鼻'], '同上');
  assert.match(by['咽喉'], /专书成群/);
  assert.match(by['口齿'], /专科专书晚出/);
});

test('眼科五部书按层累次序出现：龙木论→银海精微→原机启微→审视瑶函→目经大成', () => {
  const books = eyeBookOrder(readDoc());
  assert.deepStrictEqual(books.map((b) => b.name), EYE_BOOKS);
  for (const b of books) assert.ok(b.at >= 0, `第二节没有《${b.name}》`);
  const ats = books.map((b) => b.at);
  assert.deepStrictEqual(ats, [...ats].sort((a, b) => a - b), '出现次序与层累次序不符');
});

test('三种引法齐备且写在第五节：引句、引篇、引书', () => {
  assert.deepStrictEqual(citeModes(readDoc()), ['引句', '引篇', '引书']);
  const sec = sectionAt(readDoc(), 4);
  assert.ok(sec.includes('三者不能互换'), '缺少「不能互相顶替」的收束句');
  assert.ok(sec.includes('用一句话去证一个体系，是越级'), '缺少越级的判据');
});

test('引文前的三问：时代、刻本、正文与注文，一问不少', () => {
  const t = threeQuestions(readDoc());
  assert.strictEqual(t.parts.length, 3, `读到 ${t.parts.length} 问`);
  assert.ok(t.parts[0].includes('什么时代'), t.parts[0]);
  assert.ok(t.parts[1].includes('刻本'), t.parts[1]);
  assert.ok(t.parts[2].includes('注文'), t.parts[2]);
});

test('托名书的处置在正文里写明：不能当年代证据用', () => {
  const a = attribution(readDoc());
  assert.ok(a.yinhai.includes('元人所作'), a.yinhai);
  assert.ok(a.longmu.includes('托名'), a.longmu);
  assert.ok(a.shennong.includes('辑佚'), a.shennong);
  assert.ok(sectionAt(readDoc(), 3).includes('不能当年代证据用'));
});

test('关键判据词都在正文出现过', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('quiz 结构：≥5 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, `选项数不对：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.question}`);
    assert.ok(!/三辨|四位面|单元规模|本章实测|本课第\s*\d+\s*章/.test(JSON.stringify(item)), `仍含旧口径：${item.question}`);
  }
  assert.strictEqual(new Set(qs.map((x) => x.correct)).size, 4, '正确项没有打散到四个下标');
});

test('quiz 的 check 题至少两道能在正文里对上四字原词', () => {
  assert.ok(analyze().quiz.grounded >= 2, `接地 ${analyze().quiz.grounded} 道`);
});

test('quiz 引文只到书名与篇名，不含页码；且至少两道 check 题含两个以上原文词组', () => {
  const body = grams(readDoc());
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.strictEqual(analyze().quiz.pageRefs, 0, 'quiz 里出现了页码');
  const rich = qs
    .filter((x) => x.stage === 'check')
    .filter((x) => new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g))).size >= 2);
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带两个以上原文词组`);
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成医学意见/);
  assert.match(out, /由本章正文现算/);
});

test('代码头部指向本章正文，且章节目录与 quiz 同源', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/01-e51/docs/zh.md'), '头部注释未指向本章');
  assert.ok(fs.existsSync(DOC) && fs.existsSync(QUIZ));
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.strictEqual(String(q.chapter), CHAPTER);
  assert.strictEqual(q.slug, SLUG);
});
