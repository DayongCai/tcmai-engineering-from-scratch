'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, figures, carryAfterSons } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const FIG = figures(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '04-xipu-yu-chuandi-fangshi', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 4);
  assert.strictEqual(TITLE, '系谱不是「看图猜病」，是一台把家族史折成概率的机器');
  assert.ok(TEXT.startsWith('# 第 4 章'), '正文首行不是本章章题');
});

test('结构量与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2571);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.tables, 1);
});

test('每节都有字，逐节相加不超过全篇', () => {
  for (const s of A.sections) assert.ok(s.hanzi > 0, s.title + ' 一节为空');
  const sum = A.sections.reduce((n, s) => n + s.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('每个算式的结果都能对上正文写下的同一个数', () => {
  assert.ok(FIG.length >= 3, '算式太少：' + FIG.length);
  for (const f of FIG) {
    assert.ok(f.ok, `${f.name}：算得 ${f.got}，正文写 ${f.token}`);
    assert.ok(TEXT.includes(f.token), `正文里找不到 ${f.token}（${f.name}）`);
  }
});

test('健康儿子链单调下降且不归零，规律为 1/(2ⁿ+1)', () => {
  let prev = 1;
  for (let n = 1; n <= 6; n += 1) {
    const p = carryAfterSons(n);
    assert.ok(p < prev && p > 0, `n=${n} 时应下降且大于零，实得 ${p}`);
    assert.ok(Math.abs(p - 1 / (Math.pow(2, n) + 1)) < 1e-12, `n=${n} 应为 1/(2ⁿ+1)`);
    prev = p;
  }
});

test('近亲部分按 q 缩小、随机部分按 q² 缩小，倍数是变数', () => {
  const ratio = (qq, F) => (qq * qq * (1 - F) + qq * F) / (qq * qq);
  assert.ok(ratio(0.001, 1 / 16) > ratio(0.01, 1 / 16), '病越罕见，相对放大越明显');
  assert.ok(ratio(0.01, 1 / 16) > 5 && ratio(0.01, 1 / 16) < 9, '本例倍数应在七倍附近');
});

test('三条可排除的规则与两个措辞在正文里都有对应表述', () => {
  for (const s of ['X 只传给女儿', '永远不归零', '没有反证', '风险年龄']) {
    assert.ok(TEXT.includes(s), `正文里找不到「${s}」`);
  }
});


test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes('汉字 ' + A.hanzi + ' 字'), '输出里的汉字数与快照不一致');
});
