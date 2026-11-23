'use strict';
/**
 * 第 5 章：正文规模、表格结构、判据词频与 quiz 结构全部现算后钉住。
 * 正文改一个字、表增删一行、quiz 跑题或答案扎堆，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { analyze, tables, paragraphs, sections, hanzi, DOC, QUIZ, CHAPTER, SLUG, TITLE } = require('./main.js');

const r = analyze();
const MAIN = path.join(__dirname, 'main.js');

test('章号、章名与正文首行一致', () => {
  assert.strictEqual(CHAPTER, 5);
  assert.strictEqual(SLUG, '05-anning-shengming');
  const head = fs.readFileSync(DOC, 'utf8').split(/\r?\n/)[0];
  assert.ok(head.startsWith(`# 第 ${CHAPTER} 章 · `), `正文首行是「${head}」，与章号对不上`);
  assert.ok(head.includes(TITLE), '章名与正文首行不一致');
});

test('正文规模与实测一致（段落、汉字、平均）', () => {
  assert.strictEqual(r.paras, 16, `段落数 ${r.paras}`);
  assert.strictEqual(r.docHanzi, 3061, `汉字数 ${r.docHanzi}`);
  assert.strictEqual(r.avgPara, 191, `平均每段 ${r.avgPara}`);
  assert.ok(r.paraHanzi.every((x) => x > 0), '有段落不含汉字');
});

test('六节齐全，节标题不含脚手架名目', () => {
  assert.strictEqual(r.sections.length, 6, `节数 ${r.sections.length}`);
  for (const s of r.sections) assert.ok(!/三辨|四位面|单元规模/.test(s), `节标题含脚手架：${s}`);
  assert.ok(r.sections[0].startsWith('一、'), `首节标题是「${r.sections[0]}」`);
});

test('表格结构逐张钉住（列数、行数、首列）', () => {
  const want = [];
  assert.strictEqual(r.tables.length, want.length, `表数 ${r.tables.length}`);
  want.forEach((w, i) => {
    assert.strictEqual(r.tables[i].cols, w.cols, `第 ${i + 1} 张表列数`);
    assert.strictEqual(r.tables[i].rows.length, w.rows, `第 ${i + 1} 张表行数`);
    assert.strictEqual(r.tables[i].header.join(' / '), w.head, `第 ${i + 1} 张表表头`);
    assert.deepStrictEqual(r.tables[i].rows.map((x) => x[0]), w.first, `第 ${i + 1} 张表首列`);
  });
});

test('每张表都是齐整的：列数与表头一致，没有空单元格', () => {
  for (const t of r.tables) {
    for (const row of t.rows) {
      assert.strictEqual(row.length, t.cols, `「${t.header.join('/')}」有行不是 ${t.cols} 列：${row.join('|')}`);
      for (const cell of row) assert.ok(cell.length > 0, `「${t.header.join('/')}」有空单元格`);
    }
  }
});

test('判据词频与正文一致', () => {
  const want = {"尊严":6,"舒适":10,"陪伴":7,"预立意愿":6,"丧亲":1,"家属":14};
  assert.strictEqual(r.terms.length, Object.keys(want).length);
  for (const t of r.terms) assert.strictEqual(t.n, want[t.term], `${t.term}: 现算 ${t.n} ≠ ${want[t.term]}`);
  assert.ok(r.terms.every((t) => t.n > 0), '有判据词在正文里根本没出现');
});

test('quiz 结构：题量、三段、四选项、解释长度、答案下标', () => {
  const q = r.quiz;
  assert.strictEqual(q.total, 6, `题数 ${q.total}`);
  assert.deepStrictEqual(q.stage, {"pre":1,"check":4,"post":1});
  assert.strictEqual(q.allFourOptions, true, '有题不是 4 个选项');
  assert.strictEqual(q.badCorrect, 0, 'correct 下标非法');
  assert.ok(q.minExplain >= 30, `最短解释 ${q.minExplain} 汉字`);
  assert.strictEqual(q.minExplain, 76, '最短解释长度变了（内容被换过）');
  assert.deepStrictEqual(q.answers, [1,0,2,1,2,3], '答案序列变了');
  assert.ok(q.distinctAnswers >= 3, `答案只落在 ${q.distinctAnswers} 个位置`);
  assert.strictEqual(q.distinctAnswers, 4, '答案分散度变了');
});

test('quiz 接地：check 题的正确选项能在正文找到原词', () => {
  assert.strictEqual(r.quiz.checkGrounded, 4, `接地 ${r.quiz.checkGrounded} 道`);
  assert.ok(r.quiz.checkGrounded >= 2, '接地不足 2 道');
  for (const it of r.quiz.items) {
    if (it.stage === 'check') assert.ok(it.grounded >= 2, `第 ${it.n} 题只接地 ${it.grounded} 词`);
  }
});

test('quiz 与正文同术语：无脚手架、无剂量数值、无结局数字、无条款号', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!raw.includes(bad), 'quiz 仍含脚手架名目：' + bad);
  assert.ok(!/本课第\s*\d+\s*章/.test(raw), 'quiz 出现「本课第 N 章」');
  for (const u of ['毫克', '毫升', '微克', 'μg']) assert.ok(!raw.includes(u), 'quiz 出现剂量单位：' + u);
  assert.ok(!/[0-9]+\s*(mg|ml|mL)/.test(raw), 'quiz 出现剂量数值');
  for (const w of ['成功率', '存活率', '治愈率', '病死率', '发生率', '疗程']) assert.ok(!raw.includes(w), 'quiz 出现结局或疗程字眼：' + w);
  assert.ok(!/第\s*[0-9一二三四五六七八九十百零〇]+\s*条/.test(raw), 'quiz 出现具体法律条款号');
  assert.ok(!/第[0-9]+页/.test(raw), 'quiz 出现页码');
  assert.ok(!raw.includes('见 code/main.js 输出'), 'quiz 让读者去看代码输出');
});

test('正文的本章判断点仍在（防止被改成泛泛而谈）', () => {
  const doc = fs.readFileSync(DOC, 'utf8');
  for (const s of ["把话听完","不做」的清单","是独立于症状控制的一项照护","最近一次的表达优先"]) assert.ok(doc.includes(s), '正文缺少判断点：' + s);
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const s of ["对方说完了"]) assert.ok(raw.includes(s), 'quiz 缺少与正文同源的术语：' + s);
});

test('段落切分口径稳定：表格行与清单不混入段落', () => {
  const doc = fs.readFileSync(DOC, 'utf8');
  for (const p of paragraphs(doc)) assert.ok(!p.includes('|'), `段落混入表格：${p.slice(0, 20)}`);
  assert.strictEqual(sections(doc).length, r.sections.length);
  assert.strictEqual(tables(doc).length, r.tables.length);
  assert.strictEqual(hanzi(doc), r.docHanzi);
  assert.ok(r.docHanzi > 2000, `正文只有 ${r.docHanzi} 汉字，疑似占位稿`);
});

test('脚本可运行且输出含现算口径与边界声明', () => {
  const res = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(res.status, 0, res.stderr);
  const out = String(res.stdout || '');
  assert.ok(out.length > 80, '输出过短');
  assert.match(out, /现算/);
  assert.match(out, /不构成诊疗、法律或处置依据/);
});
