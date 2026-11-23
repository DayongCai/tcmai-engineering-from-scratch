'use strict';
/**
 * 社区护理学 · 第 3 章 慢病管理的产出不是「随访次数」，是「他自己能处理的那几步」：习题与正文对齐
 *
 * 下面钉住的数字，全部由 main.js 从正文现算。正文改一个字、改一段结构、
 * 习题跑题，这里都会红。
 */
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { analyze, hanzi, readDoc, QUIZ } = require('./main.js');

const r = analyze();

test('正文规模与结构：钉住实测值', () => {
  assert.strictEqual(r.profile.hanzi, 2812);
  assert.strictEqual(r.profile.sections.length, 6);
  assert.strictEqual(r.profile.tables, 1);
  assert.strictEqual(r.profile.tableRows, 4);
  assert.ok(r.profile.paragraphs >= 20);
});

test('小节的顺序与命名与正文一致', () => {
  assert.deepStrictEqual(r.profile.sections, ["一、把「管理」重新定义：谁能做决定，就管到谁","二、分层、随访内容与转介条件","三、自我管理支持：教三步，不教一套","四、记录字段","五、三种失效与考核项","代价与边界"]);
});

test('失效条数 = 3，边界自称数 = 实写分句数，表格每行列数齐', () => {
  assert.strictEqual(r.failures, 3, '失效条数应为三条');
  assert.strictEqual(r.boundaries.declared, 4, '正文应自称边界四条');
  assert.strictEqual(r.boundaries.clauses, r.boundaries.declared, '边界分句数与自称条数不符');
  assert.strictEqual(r.tables.length, 1, '判据表张数变了');
  for (const t of r.tables) {
    assert.strictEqual(t.ragged, 0, `表 ${t.index} 有 ${t.ragged} 行列数与表头不齐`);
    assert.ok(t.cols >= 3, `表 ${t.index} 只有 ${t.cols} 列`);
  }
});

test('关键词次数：钉住实测值', () => {
  const want = {"随访":26,"自我管理":7};
  for (const t of r.terms) assert.strictEqual(t.n, want[t.term], `「${t.term}」次数变了`);
});

test('汉字口径一致：正文汉字 = 逐字统计', () => {
  const doc = readDoc();
  assert.strictEqual(hanzi(doc), r.profile.hanzi);
  assert.ok(r.profile.hanzi > 2500, '正文过短');
});

test('quiz 结构：题量、三段、四选项、解释长度、答案合法', () => {
  const q = r.quiz;
  assert.ok(q.total >= 5, `只有 ${q.total} 题`);
  for (const s of ['pre', 'check', 'post']) assert.ok(q.stage[s] >= 1, `缺 ${s} 段`);
  assert.strictEqual(q.allFourOptions, true, '有题不是 4 个选项');
  assert.strictEqual(q.badCorrect, 0, 'correct 下标非法');
  assert.ok(q.minExplain >= 30, `最短的解释只有 ${q.minExplain} 汉字`);
});

test('quiz 接地：至少两道 check 题的正确项含正文原词，且答案打散', () => {
  assert.ok(r.quiz.checkGrounded >= 2, `只有 ${r.quiz.checkGrounded} 道 check 题接地`);
  assert.ok(r.quiz.distinctAnswers >= 3, `正确答案只用到了 ${r.quiz.distinctAnswers} 个位置`);
});

test('quiz 与正文同源：不含脚手架名目，解释不是「去看脚本」', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测', '见 code/main.js']) {
    assert.ok(!raw.includes(bad), `quiz 仍含「${bad}」`);
  }
  const body = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  for (const bad of ['三辨', '四位面', '单元规模', '本章实测']) {
    assert.ok(!body.includes(bad), `main.js 仍含「${bad}」`);
  }
});

test('脚本可运行，输出含现算声明与教学边界', () => {
  const out = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(out.status, 0, out.stderr);
  const s = String(out.stdout || '');
  assert.ok(s.length > 120, '输出过短');
  assert.match(s, /现算/);
  assert.match(s, /不构成诊断/);
});
