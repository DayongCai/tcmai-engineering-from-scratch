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
  wulun,
  threeLayers,
  crossGroups,
  meridianOrder,
  redFlags,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  WULUN_ROWS,
  MERIDIANS,
  CROSS_GROUPS,
  RED_FLAGS,
  SECTION_PROBES,
  TERMS,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，目录名与课程登记一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
});

test('小节结构：六节，末节「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6);
  assert.ok(titles[5].endsWith('代价与边界'), titles[5]);
});

test('每节探针都落在本节', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('五轮表：五行四列，配属为脾心肝肺肾五轮', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 1);
  assert.strictEqual(blocks[0].rows.length, WULUN_ROWS);
  assert.deepStrictEqual(blocks[0].head.slice(0, 3), ['轮', '部位', '所属脏']);
  for (const r of blocks[0].rows) assert.strictEqual(r.length, 4);
  assert.deepStrictEqual(wulun(readDoc()).rows.map((r) => [r.lun, r.area, r.zang]), [
    ['肉轮', '胞睑', '脾'],
    ['血轮', '两眦', '心'],
    ['气轮', '白睛', '肺'],
    ['风轮', '黑睛', '肝'],
    ['水轮', '瞳神', '肾'],
  ]);
});

test('三层口径：生成论、归属论、辨证各一段，顺序不变', () => {
  const l = threeLayers(readDoc());
  assert.strictEqual(l.parts.length, 3, `读到 ${l.parts.length} 段`);
  assert.ok(l.parts[0].includes('骨之精为瞳子') && l.parts[0].includes('生成论'), l.parts[0]);
  assert.ok(l.parts[1].includes('水轮属肾') && l.parts[1].includes('归属论'), l.parts[1]);
  assert.ok(l.parts[2].includes('责之肝胆实火') && l.parts[2].includes('辨证'), l.parts[2]);
});

test('四组交叉：病性、病程、局部形态、全身，一组不少', () => {
  assert.deepStrictEqual(crossGroups(readDoc()), CROSS_GROUPS);
  assert.ok(sectionAt(readDoc(), 4).includes('四组齐了，才谈得上出方'));
});

test('入目经脉五条，按五脏五脉的顺序出现', () => {
  const m = meridianOrder(readDoc());
  assert.deepStrictEqual(m.map((x) => x.name), MERIDIANS);
  for (const x of m) assert.ok(x.at >= 0, `第四节没有${x.name}`);
});

test('跷脉一条环路：属目内眦，解决开合问题', () => {
  const sec = sectionAt(readDoc(), 3);
  assert.ok(sec.includes('跷脉'));
  assert.ok(sec.includes('属目内眦'));
  assert.ok(sec.includes('目不合'), '缺少「目不合」这一眼目开合判据');
});

test('八廓不取单值：诸说并存写在正文，且明说不可断病位', () => {
  assert.ok(sectionAt(readDoc(), 2).includes('谁也不服谁'));
  assert.ok(sectionAt(readDoc(), 2).includes('没有固定的解剖标志可依'));
  assert.ok(sectionAt(readDoc(), 5).includes('八廓不可强配'));
});

test('红旗五条一条不少，且处置是转诊而非继续辨轮', () => {
  const flags = redFlags(readDoc());
  assert.strictEqual(flags.length, 5);
  for (const f of flags) assert.ok(f.ok, `第六节缺「${f.flag}」`);
  assert.ok(sectionAt(readDoc(), 5).includes('不在轮位上打转'));
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

test('quiz 引文只到书名与篇名，不含页码；check 题至少两道带两个以上原文词组', () => {
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
  assert.ok(out.includes(`第 ${CHAPTER} 章`));
  assert.match(out, /不构成医学意见/);
  assert.match(out, /由本章正文现算/);
});

test('代码头部指向本章正文，章节目录与 quiz 同源', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(body.includes('/chapters/02-e52/docs/zh.md'));
  assert.ok(fs.existsSync(DOC) && fs.existsSync(QUIZ));
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.strictEqual(String(q.chapter), CHAPTER);
  assert.strictEqual(q.slug, SLUG);
});
