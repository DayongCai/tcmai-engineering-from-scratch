'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { GAN, ZHI, YUN, SITIAN, ZAIQUAN, sixtyCycle, computeYear, yearToGanzhi, stats } = require('./main.js');

test('六十甲子：60 个，阳干配阳支，无重名', () => {
  const c = sixtyCycle();
  assert.strictEqual(c.length, 60);
  assert.strictEqual(new Set(c.map((x) => x.ganzhi)).size, 60);
  const yang = new Set(['甲', '丙', '戊', '庚', '壬']);
  const yangZhi = new Set(['子', '寅', '辰', '午', '申', '戌']);
  for (const x of c) assert.strictEqual(yang.has(x.gan), yangZhi.has(x.zhi), x.ganzhi);
});

test('十干配五运与十二支配司天：逐条符合原文', () => {
  assert.deepStrictEqual(
    ['甲', '己', '乙', '庚', '丙', '辛', '丁', '壬', '戊', '癸'].map((g) => YUN[g]),
    ['土', '土', '金', '金', '水', '水', '木', '木', '火', '火'],
  );
  assert.strictEqual(SITIAN['子'], '少阴君火');
  assert.strictEqual(SITIAN['午'], '少阴君火');
  assert.strictEqual(SITIAN['丑'], '太阴湿土');
  assert.strictEqual(SITIAN['寅'], '少阳相火');
  assert.strictEqual(SITIAN['卯'], '阳明燥金');
  assert.strictEqual(SITIAN['辰'], '太阳寒水');
  assert.strictEqual(SITIAN['亥'], '厥阴风木');
});

test('在泉为司天对化，六气三对闭合', () => {
  for (const [k, v] of Object.entries(ZAIQUAN)) {
    assert.strictEqual(ZAIQUAN[v], k, `${k}↔${v} 应对称`);
  }
  assert.strictEqual(ZAIQUAN['少阴君火'], '阳明燥金');
  assert.strictEqual(ZAIQUAN['太阴湿土'], '太阳寒水');
  assert.strictEqual(ZAIQUAN['少阳相火'], '厥阴风木');
});

test('分布均匀：五运各 12，太过/不及各 30', () => {
  const s = stats();
  assert.deepStrictEqual(s.yun, { 土: 12, 金: 12, 水: 12, 木: 12, 火: 12 });
  assert.deepStrictEqual(s.taiGuo, { 太过: 30, 不及: 30 });
});

test('天符 12 年，列表与规则推演一致（火运 4 个，其余各 2）', () => {
  const s = stats();
  assert.strictEqual(s.tianfu, 12);
  assert.deepStrictEqual(
    [...s.tianfuList].sort(),
    ['丁亥', '丁巳', '丙戌', '丙辰', '乙酉', '乙卯', '己未', '己丑', '戊申', '戊寅', '戊午', '戊子'].sort(),
  );
});

test('锚点：1984 = 甲子；2024 = 甲辰（太阳寒水司天）', () => {
  assert.strictEqual(yearToGanzhi(1984).gan + yearToGanzhi(1984).zhi, '甲子');
  const y24 = yearToGanzhi(2024);
  const r24 = computeYear(y24.gan, y24.zhi);
  assert.strictEqual(r24.ganzhi, '甲辰');
  assert.strictEqual(r24.yun, '土');
  assert.strictEqual(r24.taiGuo, '太过');
  assert.strictEqual(r24.sitian, '太阳寒水');
  assert.strictEqual(r24.zaiquan, '太阴湿土');
});

test('2026 丙午：水运太过，少阴君火司天，阳明燥金在泉', () => {
  const r = computeYear('丙', '午');
  assert.deepStrictEqual([r.yun, r.taiGuo, r.sitian, r.zaiquan], ['水', '太过', '少阴君火', '阳明燥金']);
});

test('未知干支必须抛错，不许猜', () => {
  assert.throws(() => computeYear('子', '子'), /未知天干/);
  assert.throws(() => computeYear('甲', '甲'), /未知地支/);
});

test('配属表覆盖全部十干十二支（无遗漏）', () => {
  assert.strictEqual(Object.keys(YUN).length, 10);
  assert.strictEqual(Object.keys(SITIAN).length, 12);
  assert.deepStrictEqual(Object.keys(YUN).sort(), [...GAN].sort());
  assert.deepStrictEqual(Object.keys(SITIAN).sort(), [...ZHI].sort());
});
