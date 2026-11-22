'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, fracture, costTable, drg, dip, syndromes, compute, verify } = require('./main.js');

const BODY = read();
const TABLES = parseTables(BODY);
const F = fracture(BODY);
const CT = costTable(TABLES, BODY);
const D = drg(BODY);
const P = dip(BODY);
const SYN = syndromes(BODY);
const C = compute(F, CT, D, P, SYN);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下且标题一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '06-e6', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 6);
  assert.match(BODY.split('\n')[0], new RegExp('^# 第 6 章 · ' + TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
});

test('骨折的收费、成本与打包标准读自正文', () => {
  assert.deepStrictEqual(F.manual, { fee: 800, cost: 3000 });
  assert.deepStrictEqual(F.surgery, { fee: 18000, cost: 15000 });
  assert.strictEqual(F.bundle, 12000);
});

test('按项目 −2,200／+3,000；打包 +9,000／−3,000，技术选择反转', () => {
  assert.strictEqual(C.project.manual, -2200);
  assert.strictEqual(C.project.surgery, 3000);
  assert.strictEqual(C.bundle.manual, 9000);
  assert.strictEqual(C.bundle.surgery, -3000);
  assert.ok(C.project.manual < 0 && C.bundle.manual > 0, '同一治法在两种支付下符号相反');
  assert.ok(C.project.surgery > 0 && C.bundle.surgery < 0);
});

test('成本核算表三行：单位固定成本、总成本、单例损益都可复算', () => {
  assert.strictEqual(CT.fixed, 400000);
  assert.strictEqual(CT.vc, 60);
  assert.strictEqual(CT.price, 100);
  const want = [[10000, 40, 100, 0], [8000, 50, 110, -10], [6000, 66.7, 126.7, -26.7]];
  for (const [vol, uf, ut, pf] of want) {
    const got = C.costs.find((r) => r.volume === vol);
    assert.ok(Math.abs(got.unitFixed - uf) < 0.06, `${vol} 单位固定`);
    assert.ok(Math.abs(got.unitTotal - ut) < 0.06, `${vol} 单位总成本`);
    assert.ok(Math.abs(got.profit - pf) < 0.06, `${vol} 单例损益`);
  }
});

test('按病种：基线结余 200 万，改收治结构后 800 万，不改诊疗动作', () => {
  assert.strictEqual(C.drg.baseAvg, 7800);
  assert.strictEqual(C.drg.baseSurplus, 200);
  assert.strictEqual(C.drg.baseTotal, 2e6);
  assert.strictEqual(C.drg.newAvg, 7200);
  assert.strictEqual(C.drg.newTotal, 8e6);
  assert.strictEqual(C.drg.newTotal / C.drg.baseTotal, 4);
});

test('按分值：80 元/点 → 做量 15% 后 69.57 元/点，降 13.0%', () => {
  assert.strictEqual(P.budget, 1e8);
  assert.strictEqual(P.points, 1.25e6);
  assert.strictEqual(C.dip.point, 80);
  assert.strictEqual(C.dip.pointAfter.toFixed(2), '69.57');
  assert.strictEqual(C.dip.drop.toFixed(1), '-13.0');
});

test('中医三证型：均值 163.3，重证型每例亏 46.7 元', () => {
  assert.deepStrictEqual(SYN.map((x) => x.cost), [120, 160, 210]);
  assert.strictEqual(C.synMean.toFixed(1), '163.3');
  const s = C.synOut.map((x) => x.surplus);
  assert.strictEqual(s[0].toFixed(1), '43.3');
  assert.strictEqual(s[1].toFixed(1), '3.3');
  assert.strictEqual(s[2].toFixed(1), '-46.7');
  assert.ok(s[2] < 0 && s[0] > 0);
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(F, CT, D, P, C, BODY));
});

test('quiz 的 check 题正确选项落在本章正文里（≥2 道）', () => {
  const quiz = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const body = shingles(BODY);
  const checks = quiz.questions.filter((q) => q.stage === 'check');
  const grounded = checks.filter((q) => {
    const right = String(q.options[q.correct] || '');
    return [...shingles(right)].some((s) => body.has(s));
  });
  assert.ok(checks.length >= 2);
  assert.ok(grounded.length >= 2, `只有 ${grounded.length} 道接地`);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /基线点值 80\.00 元\/点/);
  assert.match(r.stdout, /不构成任何定价、支付标准或临床技术选择的建议/);
});
