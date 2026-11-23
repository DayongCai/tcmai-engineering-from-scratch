'use strict';
/**
 * 第 5 章：正文规模、表格结构、判据词频与 quiz 结构全部现算后钉住。
 * 正文改一个字、表增删一行、quiz 跑题或答案扎堆，这里都会红。
 */
const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const { analyze, tables, paragraphs, sections, hanzi, DOC, QUIZ, CHAPTER, SLUG, TITLE } = require('./main.js');

const r = analyze();
const doc = fs.readFileSync(DOC, 'utf8');

test('章号、章名与正文首行一致', () => {
  assert.strictEqual(CHAPTER, 5);
  assert.strictEqual(SLUG, '05-bingfazheng');
  const head = doc.split(/\r?\n/)[0];
  assert.strictEqual(head, `# 第 ${CHAPTER} 章 · ${TITLE}`, `正文首行是「${head}」，与章名对不上`);
  assert.ok(TITLE.length >= 4, '章标题过短');
});

test('正文规模与实测一致（段落、汉字、平均）', () => {
  assert.strictEqual(r.paras, 31, `段落数 ${r.paras}`);
  assert.strictEqual(r.docHanzi, 3152, `汉字数 ${r.docHanzi}`);
  assert.strictEqual(r.avgPara, 102, `平均每段 ${r.avgPara}`);
  assert.ok(r.paraHanzi.every((x) => x > 0), '有段落不含汉字');
});

test('节齐全，节标题不含脚手架名目', () => {
  assert.strictEqual(r.sections.length, 6, `节数 ${r.sections.length}`);
  for (const s of r.sections) assert.ok(!/三辨|四位面|单元规模/.test(s), `节标题含脚手架：${s}`);
  assert.ok(r.sections[0].startsWith('一、'), `首节标题是「${r.sections[0]}」`);
});

test('表格结构逐张钉住（列数、行数、首列）', () => {
  const want = [{"cols":4,"rows":5,"head":"漏项位置 / 表现 / 后果 / 拦住它的动作","first":["评估漏","措施漏","时机漏","停用漏","交接漏"]},{"cols":4,"rows":4,"head":"类别 / 每班必看 / 危险信号 / 动作与时限【教学设定】","first":["切口","呼吸","血栓","压力性损伤"]}];
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
      assert.strictEqual(row.length, t.cols, `「${t.header.join('/')}」有行不是 ${t.cols} 列`);
      for (const cell of row) assert.ok(cell.length > 0, `「${t.header.join('/')}」有空单元格`);
    }
  }
});

test('判据词频与正文一致', () => {
  const want = {"漏项":6,"翻身":9,"受压点":6,"不承诺":1,"三级":7,"咳":27};
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
  assert.strictEqual(q.minExplain, 58, '最短解释长度变了（内容被换过）');
  assert.deepStrictEqual(q.answers, [2,1,0,2,3,3], '答案序列变了');
  assert.ok(q.distinctAnswers >= 3, `答案只落在 ${q.distinctAnswers} 个位置`);
});

test('quiz 接地：check 题的正确选项能在正文找到原词', () => {
  assert.strictEqual(r.quiz.checkGrounded, 4, `接地 ${r.quiz.checkGrounded} 道`);
  assert.ok(r.quiz.checkGrounded >= 2, '接地不足 2 道');
  for (const it of r.quiz.items) {
    if (it.stage === 'check') assert.ok(it.grounded >= 1, `第 ${it.n} 题完全不接地`);
  }
});

test('quiz 与正文同术语：无脚手架、无剂量、无结局数字、无页码', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) assert.ok(!raw.includes(bad), 'quiz 仍含脚手架名目：' + bad);
  for (const u of ['毫克', '微克', 'μg', '疗程']) assert.ok(!raw.includes(u), 'quiz 出现剂量或疗程：' + u);
  assert.ok(!/[0-9]+\s*(mg|ml|mL)/.test(raw), 'quiz 出现剂量数值');
  for (const s of ['发生率', '成功率', '存活率', '治愈率', '病死率']) assert.ok(!raw.includes(s), 'quiz 出现结局数字：' + s);
  assert.ok(!/第\s*[0-9]+\s*页/.test(raw), 'quiz 出现页码');
  assert.ok(!raw.includes('见 code/main.js 输出'), 'quiz 让读者去看代码输出');
});

test('本章关键结构在正文里', () => {
  assert.ok(doc.includes('翻身记录与体位不符'), '正文缺翻身记录失效模式');
  assert.ok(doc.includes('立即让患者平卧屈膝'), '正文缺切口裂开处置顺序');
  assert.ok(doc.includes('咳出了什么'), '正文缺咳嗽效果判据');
});

test('段落切分口径稳定：表格行与清单不混入段落', () => {
  for (const p of paragraphs(doc)) assert.ok(!p.includes('|'), `段落混入表格：${p.slice(0, 20)}`);
  assert.strictEqual(sections(doc).length, r.sections.length);
  assert.strictEqual(tables(doc).length, r.tables.length);
  assert.strictEqual(hanzi(doc), r.docHanzi);
  assert.strictEqual(r.docHanzi > 2000, true, `正文只有 ${r.docHanzi} 汉字，疑似占位稿`);
});
