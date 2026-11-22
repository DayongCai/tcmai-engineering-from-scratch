'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, read, analyze,
  outcomeRanking, dataSources, qualityDims, supervisionTools,
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
  assert.ok(DOC.endsWith(path.join('chapters', '07-w7', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
});

test('章号与标题取自本章正文', () => {
  assert.strictEqual(CHAPTER, 7);
  assert.strictEqual(TITLE, '指标测的是能被记录的东西，不是要紧的东西');
  assert.match(BODY.split('\n')[0], /^# 第 7 章 · /);
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

test('两种尺子：粗率 A 优、SMR B 优，排名反转且表算一致', () => {
  const r = outcomeRanking(A.tables);
  assert.strictEqual(r.rows.length, 2);
  assert.deepStrictEqual(r.rows.map((x) => Number(x.crude.toFixed(1))), [3.0, 4.0]);
  assert.deepStrictEqual(r.rows.map((x) => Number(x.smr.toFixed(2))), [1.2, 0.5]);
  assert.ok(r.ok, '表里的粗率或标准化死亡比与复算不一致');
  assert.strictEqual(r.bestByCrude.name, 'A');
  assert.strictEqual(r.bestBySmr.name, 'B');
  assert.ok(r.reversed);
});

test('数据四来源、质量四维、监督三工具都能从正文数出', () => {
  assert.deepStrictEqual(dataSources(BODY), ['系统直采', '病案首页', '专项上报', '抽样调查']);
  assert.deepStrictEqual(qualityDims(BODY), ['完整', '准确', '及时', '可比']);
  assert.deepStrictEqual(supervisionTools(BODY), ['许可', '检查', '公开']);
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
  assert.match(r.stdout, /不构成对任何机构服务质量的判断/);
  assert.match(r.stdout, /排名确实反转/);
});
