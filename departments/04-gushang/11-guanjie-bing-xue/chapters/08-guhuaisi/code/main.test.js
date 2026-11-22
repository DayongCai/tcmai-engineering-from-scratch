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
  DOC,
  QUIZ,
  TABLE_ROWS,
  TERMS,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且目录名与登记一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 1600, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
});

test('小节结构：六个二级标题，末节为「代价与边界」，前五节按一至五编号', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  for (let i = 0; i < 5; i += 1) {
    assert.match(titles[i], /^[一二三四五]、/, `第 ${i + 1} 节未按汉字序号起头：${titles[i]}`);
  }
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  assert.strictEqual(SECTION_PROBES.length, 5);
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('本章没有表格：正文不以表格代替论证', () => {
  assert.deepStrictEqual(tableBlocks(readDoc()).length, TABLE_ROWS.length);
});

test('影像次序与塌陷分界都从正文现算得出', () => {
  const e = analyze().extra;
  assert.ok(e.order.magneticFirst, '第三节里磁共振没有排在平片之前');
  for (const s of e.split) assert.ok(s.ok, `缺「${s.phase}」这一段`);
});

test('正文四条判断可查：血供、平片正常、骨髓水肿、保髋一次性', () => {
  const t = readDoc();
  for (const k of [
    '骨坏死是血供的问题',
    '平片正常不等于没有病',
    '早期改变是骨髓水肿，只有磁共振能看见',
    '保髋的机会是一次性的',
  ]) {
    assert.ok(t.includes(k), '缺：' + k);
  }
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('quiz 结构：≥5 题、三段齐、4 选项、correct 合法、explain ≥30 汉字、正确项打散到四个下标', () => {
  const qs = JSON.parse(fs.readFileSync(QUIZ, 'utf8')).questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, `选项数不对：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.question}`);
  }
  for (const k of ['三辨', '四位面', '单元规模', '本章实测']) {
    assert.ok(!JSON.stringify(qs).includes(k), `quiz 仍含「${k}」`);
  }
  assert.strictEqual(new Set(qs.map((x) => x.correct)).size, 4, '正确项未打散到四个下标');
});

test('quiz 的 check 题至少两道能在正文找到四字原词，且至少两道带两个以上原词', () => {
  const r = analyze().quiz;
  assert.ok(r.grounded >= 2, `接地 ${r.grounded} 道`);
  assert.ok(r.rich >= 2, `带两个以上原词的 ${r.rich} 道`);
});

test('命令行可运行，并打印现算声明与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
});

test('正文与 quiz 同目录：文件都存在且非空', () => {
  for (const p of [DOC, QUIZ]) {
    assert.ok(fs.existsSync(p), '缺文件：' + p);
    assert.ok(fs.statSync(p).size > 2000, '文件过小：' + p);
  }
  assert.ok(sectionAt(readDoc(), 4).includes(SECTION_PROBES[4]), '第五节正文被改动');
});
