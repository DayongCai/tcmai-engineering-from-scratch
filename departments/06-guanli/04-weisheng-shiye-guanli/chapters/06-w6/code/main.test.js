'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, analyze, num,
  riskAdjustment, paymentMethods, purchaseStrategies,
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
  assert.ok(DOC.endsWith(path.join('chapters', '06-w6', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 6);
  assert.strictEqual(TITLE, '支付方式是一根杠杆，撬动的是医生的手');
  assert.match(BODY.split('\n')[0], /^# 第 6 章 · /);
  assert.ok(BODY.split('\n')[0].includes(TITLE));
});

test('正文统计可复算：汉字、节、表、引文', () => {
  assert.ok(A.hanzi > 2500 && A.hanzi < 5000, String(A.hanzi));
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tableCount, 3);
  assert.strictEqual(A.cites.length, 1);
  const sum = A.sections.reduce((s, x) => s + x.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('负号两种写法都能读成负数', () => {
  assert.strictEqual(num('−4,000'), -4000);
  assert.strictEqual(num('-4,000'), -4000);
});

test('风险调整算例：+2,000 与 −4,000，合并症需上浮 40%', () => {
  const r = riskAdjustment(A.tables);
  assert.strictEqual(r.cases.length, 2);
  assert.deepStrictEqual(r.cases.map((c) => c.surplus), [2000, -4000]);
  assert.ok(r.ok, '表里的盈亏与复算不一致');
  assert.strictEqual(r.worst.name, '合并两种慢病');
  assert.strictEqual(Math.round(r.uplift), 40);
});

test('支付方式 4 种、基金购买策略 3 种', () => {
  assert.deepStrictEqual(paymentMethods(A.tables), ['按项目', '总额预算', '按病种/病组', '按人头']);
  assert.deepStrictEqual(purchaseStrategies(A.tables), ['压价', '控量', '买值']);
  assert.match(BODY, /任何一种支付方式都会被「做透」/);
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
  assert.match(r.stdout, /不构成保险或投资建议/);
  assert.match(r.stdout, /上浮 40% 才不亏/);
});
