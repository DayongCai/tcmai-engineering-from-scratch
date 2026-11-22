'use strict';
/**
 * 第 1 章：正文规模、表格结构、判据词频与 quiz 结构全部现算后钉住。
 * 正文改一个字、表增删一行、quiz 跑题或答案扎堆，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const { analyze, tables, paragraphs, sections, hanzi, DOC, CHAPTER, SLUG, TITLE } = require('./main.js');

const r = analyze();
const tableBy = (kw) => {
  const t = r.tables.find((x) => x.header.join('').includes(kw));
  assert.ok(t, `正文里找不到表头含「${kw}」的表`);
  return t;
};

test('章号、章名与正文首行一致', () => {
  assert.strictEqual(CHAPTER, 1);
  assert.strictEqual(SLUG, '01-gaishu');
  const head = fs.readFileSync(DOC, 'utf8').split(/\r?\n/)[0];
  assert.ok(head.startsWith(`# 第 ${CHAPTER} 章 · `), `正文首行是「${head}」，与章号对不上`);
  assert.ok(TITLE.length >= 4, '章标题过短');
});

test('正文规模与实测一致（段落、汉字、平均）', () => {
  assert.strictEqual(r.paras, 20, `段落数 ${r.paras}`);
  assert.strictEqual(r.docHanzi, 3030, `汉字数 ${r.docHanzi}`);
  assert.strictEqual(r.avgPara, 152, `平均每段 ${r.avgPara}`);
  assert.ok(r.paraHanzi.every((x) => x > 0), '有段落不含汉字');
});

test('六节齐全，节标题不含脚手架名目', () => {
  assert.strictEqual(r.sections.length, 6, `节数 ${r.sections.length}`);
  for (const s of r.sections) assert.ok(!/三辨|四位面|单元规模/.test(s), `节标题含脚手架：${s}`);
  assert.ok(r.sections[0].startsWith('一、'), `首节标题是「${r.sections[0]}」`);
});

test('表格结构逐张钉住（列数、行数、首列）', () => {
  const want = [{"cols":4,"rows":4,"head":"级别 / 判据要点（教学口径） / 去向 / 复检间隔【教学设定】","first":["Ⅰ 濒危","Ⅱ 危重","Ⅲ 急症","Ⅳ 非急症"]},{"cols":3,"rows":5,"head":"时段 / 目标动作 / 完成标志","first":["0–1 分钟","1–3 分钟","3–10 分钟","10–30 分钟","30–60 分钟"]},{"cols":4,"rows":4,"head":"位置 / 站位 / 职责 / 不该做的事","first":["床头位","床右位","床左位","床尾位"]},{"cols":3,"rows":6,"head":"列 / 内容 / 缺了会怎样","first":["时刻","事件/动作","执行人","判据依据","患者反应","报告去向"]}];
  assert.strictEqual(r.tables.length, want.length, `表数 ${r.tables.length}`);
  want.forEach((w, i) => {
    assert.strictEqual(r.tables[i].cols, w.cols, `第 ${i + 1} 张表列数`);
    assert.strictEqual(r.tables[i].rows.length, w.rows, `第 ${i + 1} 张表行数`);
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
  const want = {"复检间隔":5,"过度分诊":2,"漏诊":2,"记录位":3,"完成标志":2,"教学设定":6};
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
  assert.strictEqual(q.minExplain, 78, '最短解释长度变了（内容被换过）');
  assert.deepStrictEqual(q.answers, [2,0,3,1,2,0], '答案序列变了');
  assert.ok(q.distinctAnswers >= 3, `答案只落在 ${q.distinctAnswers} 个位置`);
});

test('quiz 接地：check 题的正确选项能在正文找到原词', () => {
  assert.strictEqual(r.quiz.checkGrounded, 4, `接地 ${r.quiz.checkGrounded} 道`);
  assert.ok(r.quiz.checkGrounded >= 2, '接地不足 2 道');
  for (const it of r.quiz.items) {
    if (it.stage === 'check') assert.ok(it.grounded >= 4, `第 ${it.n} 题只接地 ${it.grounded} 词`);
  }
});

test('quiz 与正文同术语：无脚手架、无剂量数值、无结局数字', () => {
  const raw = fs.readFileSync(require('./main.js').QUIZ, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!raw.includes(bad), 'quiz 仍含脚手架名目：' + bad);
  for (const u of ['毫克', '毫升', '微克', 'μg']) assert.ok(!raw.includes(u), 'quiz 出现剂量单位：' + u);
  assert.ok(!/[0-9]+(mg|ml|mL)/.test(raw), 'quiz 出现剂量数值');
  for (const r of ['成功率', '存活率', '治愈率', '病死率']) assert.ok(!raw.includes(r), 'quiz 出现结局数字：' + r);
  assert.ok(!/第[0-9]+页/.test(raw), 'quiz 出现页码');
  assert.ok(!raw.includes('见 code/main.js 输出'), 'quiz 让读者去看代码输出');
});

test('四级分诊表：复检间隔随级别放宽，Ⅰ 级写连续', () => {
  const t = tableBy('复检间隔');
  assert.strictEqual(t.rows.length, 4, '分级表应为四级');
  const gaps = t.rows.map((x) => (x[3].match(/[0-9]+/) || [])[0]);
  assert.deepStrictEqual(gaps.slice(1), ['5', '15', '30'], '复检间隔：' + gaps.join('/'));
  assert.ok(t.rows[0][3].includes('连续'), 'Ⅰ 级应写连续复检');
});

test('段落切分口径稳定：表格行与清单不混入段落', () => {
  const doc = fs.readFileSync(DOC, 'utf8');
  for (const p of paragraphs(doc)) assert.ok(!p.includes('|'), `段落混入表格：${p.slice(0, 20)}`);
  assert.strictEqual(sections(doc).length, r.sections.length);
  assert.strictEqual(tables(doc).length, r.tables.length);
  assert.strictEqual(hanzi(doc), r.docHanzi);
  assert.strictEqual(r.docHanzi > 2000, true, `正文只有 ${r.docHanzi} 汉字，疑似占位稿`);
});
