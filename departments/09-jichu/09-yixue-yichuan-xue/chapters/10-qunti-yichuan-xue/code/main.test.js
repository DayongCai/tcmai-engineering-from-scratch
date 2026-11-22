'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, figures, recessive, xLinked, generations } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const FIG = figures(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '10-qunti-yichuan-xue', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 10);
  assert.strictEqual(TITLE, '遗传平衡不是自然界的常态，是一把用来量「什么力在起作用」的尺子');
  assert.ok(TEXT.startsWith('# 第 10 章'), '正文首行不是本章章题');
});

test('结构量与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2603);
  assert.strictEqual(A.sections.length, 7);
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

test('平衡三式相加为 1，且携带者恒多于患者', () => {
  for (const q of [0.5, 0.1, 0.01, 0.001]) {
    const r = recessive(q);
    assert.ok(Math.abs((1 - q) * (1 - q) + 2 * (1 - q) * q + q * q - 1) < 1e-12, `p²+2pq+q²≠1 @ q=${q}`);
    assert.ok(r.carrier > r.affected, `q=${q} 时携带者应多于患者`);
  }
});

test('X 连锁三档的次序：男性患者 > 女性携带者 > 女性患者', () => {
  const x = xLinked(1 / 1000);
  assert.ok(x.femaleCarrier > x.male && x.male > x.femaleAffected, '次序应为 2q > q > q²');
  assert.ok(Math.abs(x.femaleCarrier - 2 * x.male) < 1e-12, '女性携带者应为男性患者的两倍');
});

test('选择清除的代数由 1/q 之差给出，且越接近目标越慢', () => {
  assert.strictEqual(generations(0.01, 0.005), 100);
  assert.ok(generations(0.01, 0.009) < generations(0.01, 0.005), '小幅下降反而更省代数');
});

test('平衡假定与五种力在正文里都有对应', () => {
  for (const s of ['病越罕见，携带者相对越多', '不改变 q，只改变基因型比例', '放松了选择', '来源人群与年代']) {
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
