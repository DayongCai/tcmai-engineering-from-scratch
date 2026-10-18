'use strict';
const assert = require('node:assert');
const test = require('node:test');
const { audit, count, ITEMS } = require('./main.js');

const rows = audit();
const by = (n) => rows.find((r) => r.name === n);

test('五经有提纲条，少阴 MIA', () => {
  assert.deepStrictEqual(rows.map((r) => r.status), ['ok', 'ok', 'ok', 'ok', 'MIA', 'ok']);
  assert.strictEqual(by('少阴').outline, null);
});

test('少阴三标志物全 0 命中（缺口可复核）', () => {
  const p = by('少阴').probes;
  assert.deepStrictEqual(p.map((x) => x.hits), [0, 0, 0]);
  assert.strictEqual(count('少阴之为病'), 0);
});

test('规模：太阳 566/4 篇、阳明 134/2、少阳 64/3、太阴 194/3、厥阴 30/1', () => {
  assert.deepStrictEqual([by('太阳').tiao, by('太阳').pian], [566, 4]);
  assert.deepStrictEqual([by('阳明').tiao, by('阳明').pian], [134, 2]);
  assert.deepStrictEqual([by('少阳').tiao, by('少阳').pian], [64, 3]);
  assert.deepStrictEqual([by('太阴').tiao, by('太阴').pian], [194, 3]);
  assert.deepStrictEqual([by('厥阴').tiao, by('厥阴').pian], [30, 1]);
});

test('提纲条逐字可取，含异文夹注与两版「若/必」', () => {
  assert.match(by('阳明').outline, /胃家实，一作寒是也/);
  assert.match(by('太阴').outline, /下之必胸下结硬/);
  assert.match(by('厥阴').outline, /食则吐蛔/);
});

test('提纲条不与域标签混淆：篇 24 记为厥阴纲，但其中含「少阴病」条文', () => {
  const p24 = ITEMS.filter((i) => i.pian === 24);
  assert.ok(p24.some((i) => i.text.includes('少阴病')), '篇24 应混入少阴条');
  assert.ok(p24.length >= 30);
});

test('少阴在库里连「篇名」都只以目录行出现（篇 12）', () => {
  const p12 = ITEMS.filter((i) => i.pian === 12).map((i) => i.text).join('');
  assert.ok(p12.includes('辨少阴病脉证并治'), '目录行应含少阴篇名');
  assert.strictEqual(ITEMS.filter((i) => i.pian === 12 && i.text.includes('少阴之为病')).length, 0);
});
