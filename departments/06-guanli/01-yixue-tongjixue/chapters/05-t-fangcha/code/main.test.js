'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { readDoc, anova, pairwise, compute, DOC_PATH } = require('./main.js');

test('正文可读，脚本头部指向本章正文', () => {
  assert.ok(fs.existsSync(DOC_PATH));
  const body = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
  assert.ok(body.includes('/chapters/05-t-fangcha/docs/zh.md'));
});

test('从正文抓出三组均值、标准差与每组 8 例', () => {
  const r = compute(readDoc());
  assert.deepStrictEqual(r.means, [8.28, 7.45, 6.88]);
  assert.deepStrictEqual(r.sds, [0.79, 0.71, 0.69]);
  assert.strictEqual(r.n, 8);
});

test('方差分析由汇总统计量复算，SSB/SSW 与正文表接近', () => {
  const r = compute(readDoc());
  assert.ok(Math.abs(r.ssb - 7.92) < 0.02, `SSB=${r.ssb}`);
  assert.ok(Math.abs(r.ssw - 11.19) < 0.05, `SSW=${r.ssw}`);
  assert.strictEqual(r.sst, r.ssb + r.ssw);
  assert.deepStrictEqual([r.dfb, r.dfw], [2, 21]);
});

test('F 与 p 与正文 7.43 / 0.0036 一致', () => {
  const r = anova([8.28, 7.45, 6.88], [0.79, 0.71, 0.69], 8);
  assert.ok(Math.abs(r.F - 7.43) < 0.03, `F=${r.F}`);
  assert.ok(Math.abs(r.p - 0.0036) < 0.0002, `p=${r.p}`);
});

test('合并组内标准差 0.73 与三组标准差吻合', () => {
  const r = compute(readDoc());
  assert.ok(Math.abs(r.sp - 0.73) < 0.005, `sp=${r.sp}`);
  for (const s of r.sds) assert.ok(Math.abs(s - r.sp) < 0.07);
});

test('三次两两比较的族错误率为 14.3%', () => {
  const r = compute(readDoc());
  assert.strictEqual(r.pairs.length, 3);
  assert.ok(Math.abs(r.familyError - 0.142625) < 1e-6);
  assert.strictEqual((r.familyError * 100).toFixed(1), '14.3');
});

test('甲−丙的 p 小于乙−丙，排序与正文一致', () => {
  const pairs = pairwise([8.28, 7.45, 6.88], [0.79, 0.71, 0.69], 8);
  const p13 = pairs.find((x) => x.pair === '1-3');
  const p23 = pairs.find((x) => x.pair === '2-3');
  assert.ok(p13.p < p23.p);
  assert.ok(p23.p > 0.1, `乙−丙 p=${p23.p}`);
});

test('脚本可运行，输出含 F、族错误率与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /F\(2,21\)=7\.41，p=0\.0037/);
  assert.match(out, /族错误率 1−0\.95³=14\.3%/);
  assert.match(out, /不构成疗效结论/);
});
