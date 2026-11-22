'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  DOC, CHAPTER, TITLE, N_IMAGE, read, grab,
  surfacePower, diopterPerMm, focalLengthMm, diffractionArcmin, blurCircleMm, blurArcmin, hofstetter,
  compute, verify
} = require('./main.js');

const TEXT = read();
const R = compute(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文在本章目录下，章号与章题与首行一致', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '01-e41', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 1);
  assert.ok(TEXT.startsWith('# 第 1 章'), '正文首行不是本章章题');
  assert.ok(TEXT.includes('屈光力来自折射率的跃变'), '章题与本文件常量不一致');
});

test('输入数确实是从正文抓出来的，不是写死的', () => {
  assert.strictEqual(R.rFront, 7.8);
  assert.strictEqual(R.nCornea, 1.376);
  assert.strictEqual(R.nAir, 1);
  assert.strictEqual(R.axisDoc, 24);
  assert.strictEqual(R.lambdaNm, 555);
  assert.strictEqual(R.pupilMm, 3);
  assert.throws(() => grab(TEXT, /正文里没有这一句([\d.]+)/, '故意缺失'), /找不到故意缺失/);
});

test('单球面屈光力：48 D 是算出来的，43 D 是减出来的', () => {
  assert.ok(Math.abs(surfacePower(1.0, 1.376, 7.8) - 48.205) < 1e-3);
  assert.strictEqual(Math.round(R.frontPower), R.frontDoc);
  assert.ok(R.netPower < R.frontPower, '净值必须小于前表面值');
  assert.ok(R.netPower >= 42 && R.netPower <= 43);
});

test('眼轴每毫米 2.3 D：求导值与正文一致', () => {
  assert.ok(Math.abs(diopterPerMm(N_IMAGE, 0.024) - 2.315) < 1e-3);
  assert.ok(Math.abs(R.perMm - R.perMmDoc) < 0.06);
  // 眼轴从 22.22 毫米拉到 24 毫米，焦点前移约 1.8 毫米，对应约 −2.3 D
  assert.ok(R.axisDoc - R.fMm > 1.7 && R.axisDoc - R.fMm < 1.9);
});

test('简化眼焦距与衍射斑：22.22 毫米、0.78 分', () => {
  assert.ok(Math.abs(focalLengthMm(N_IMAGE, 60) - 22.222) < 0.01);
  assert.ok(Math.abs(R.fMm - R.focalDoc) < 0.02);
  assert.ok(Math.abs(diffractionArcmin(555, 3) - 0.775) < 0.01);
  assert.ok(Math.abs(R.theta - 0.78) < 0.02);
  // 瞳孔放大到 8 毫米，衍射斑变小，但球差随孔径高次方增长
  assert.ok(diffractionArcmin(555, 8) < diffractionArcmin(555, 3));
});

test('离焦弥散：4 毫米瞳孔 1 D 约 10 分，且不等于视力 0.1', () => {
  assert.ok(Math.abs(blurCircleMm(4, 1, 60) - 0.0667) < 1e-4);
  assert.ok(Math.abs(R.b4Min - 10) < 0.6);
  // 角分是几何量，不能被当作视力读数：这里只断言量级，把「不等于 0.1」留给正文的边界声明
  assert.ok(blurArcmin(0.0667, 22.22) > 9 && blurArcmin(0.0667, 22.22) < 12);
});

test('Hofstetter 只给群体趋势：单调下降且有正的下限', () => {
  const a = hofstetter(20);
  const b = hofstetter(50);
  assert.ok(a.min > b.min && a.avg > b.avg, '幅度必须随年龄下降');
  assert.ok(Math.abs(hofstetter(40).min - 5) < 1e-9);
  assert.ok(Math.abs(hofstetter(40).avg - 6.5) < 1e-9);
  assert.strictEqual(hofstetter(60).min, 0);
});

test('verify 在本章正文上通过；篡改数值即被拦下', () => {
  assert.strictEqual(verify(R), true);
  const forged = Object.assign({}, R, { frontPower: 40 });
  assert.throws(() => verify(forged), /不自洽/);
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /左为公式现算/);
  assert.match(out, /均取自本章 docs\/zh\.md/);
  assert.match(out, /不作个体正常值或处方依据/);
  assert.ok(out.includes('+48'), '输出里没有角膜前表面屈光力');
  assert.ok(out.includes('22.22'), '输出里没有简化眼焦距');
});
