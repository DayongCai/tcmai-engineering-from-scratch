'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, analyze,
  deadLayers, projectRows, emergencyElements, timelinessIndicators,
} = require('./main.js');

const BODY = read();
const A = analyze(BODY);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '04-w4', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 4);
  assert.strictEqual(TITLE, '公共卫生买的是项目，健康要的是结果');
  assert.match(BODY.split('\n')[0], /^# 第 4 章 · /);
  assert.ok(BODY.split('\n')[0].includes(TITLE));
});

test('正文统计可复算：汉字、节、表、引文', () => {
  assert.ok(A.hanzi > 2500 && A.hanzi < 5000, String(A.hanzi));
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tableCount, 2);
  assert.strictEqual(A.cites.length, 1);
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('死档四层：建时不为用、用时找不到、更新靠人催、用了不改决策', () => {
  const layers = deadLayers(BODY);
  assert.strictEqual(layers.length, 4);
  assert.deepStrictEqual(layers.map((l) => l.n), ['一', '二', '三', '四']);
  assert.deepStrictEqual(layers.map((l) => l.name), [
    '建的时候不是为用', '用的时候找不到', '更新靠人催', '用了也不改变决策',
  ]);
});

test('项目对照表 4 行，动作与结果分列', () => {
  assert.deepStrictEqual(projectRows(A.tables), ['高血压管理', '老年人健康管理', '健康教育', '预防接种']);
});

test('应急四要素为监测、储备、演练、授权', () => {
  const em = emergencyElements(A.tables);
  assert.strictEqual(em.rows, 4);
  assert.deepStrictEqual(em.names, ['监测', '储备', '演练', '授权']);
  assert.match(BODY, /第四项最不显眼，也最致命/);
});

test('处置闭环三个及时率', () => {
  assert.deepStrictEqual(timelinessIndicators(BODY), ['报告及时率', '流调及时率', '管理完成率']);
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道）', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => {
    const right = String(q.options[q.correct] || '');
    return [...shingles(right)].some((g) => body.has(g));
  });
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /不构成对具体防控措施的建议/);
  assert.match(r.stdout, /死档成因 4 层/);
});
