'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, parseTables, params, structure, compute, verify } = require('./main.js');

const BODY = read();
const P = params(BODY);
const S = structure(BODY, parseTables(BODY));
const C = compute(P, S);

function shingles(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^一-鿿]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

test('正文就在本章目录下，标题与章号一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '07-z117', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 7);
  assert.strictEqual(BODY.split('\n')[0], '# 第 7 章 · ' + TITLE);
});

test('合同与可测条款参数读自正文', () => {
  assert.strictEqual(P.contract, 1200);
  assert.strictEqual(P.maintenance, 210);
  assert.strictEqual(P.concurrency, 300);
  assert.strictEqual(P.respPct, 90);
  assert.strictEqual(P.respSeconds, 2);
  assert.strictEqual(P.batchHours, 4);
});

test('运维费占建设费 17.5%，超出 10%–15% 的经验区间', () => {
  assert.strictEqual(C.maintPctFixed, '17.5');
  assert.strictEqual(C.inTypicalRange, false);
  assert.ok(C.maintPct > 15);
});

test('验收抽样表四项、合计 430 份', () => {
  assert.strictEqual(S.sampleRows, 4);
  assert.strictEqual(C.sampleTotal, 430);
  assert.deepStrictEqual(S.sampleNames, ['患者主索引', '住院关键字段', '费用总额', '历史病历可读性']);
  assert.strictEqual(P.sampleRate, 99);
});

test('功能清单五字段、上线三方式、迁移四环节，清点与正文一致', () => {
  assert.strictEqual(S.fields, 5);
  assert.strictEqual(S.rollout, 3);
  assert.strictEqual(S.migration, 4);
  assert.strictEqual(P.parallelWeeksLow, 2);
  assert.strictEqual(P.parallelWeeksHigh, 4);
});

test('正文与复算对得上（verify 不抛错）', () => {
  assert.doesNotThrow(() => verify(C, S, P, BODY));
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

test('脚本可运行，输出含运维占比判定与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /均从本章 docs\/zh\.md 现算/);
  assert.match(r.stdout, /占建设费 17\.5%/);
  assert.match(r.stdout, /已超出，属于要单独论证的长期账/);
  assert.match(r.stdout, /不构成招标文件、合同条款或验收标准意见/);
});
