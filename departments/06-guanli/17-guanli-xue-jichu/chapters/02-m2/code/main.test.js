'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  DOC,
  CHAPTER,
  TITLE,
  read,
  cnYear,
  facts,
  gap,
  totalVisitMinutes,
  totalMinutesChangePct,
} = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '02-m2', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 2);
  assert.strictEqual(TITLE, '每一种"最优解"都是它那个年代的应急方案');
  assert.match(TEXT, /^# 第 2 章/);
});

test('汉字纪年可转成数字，越界写法报错', () => {
  assert.strictEqual(cnYear('一九一一'), 1911);
  assert.strictEqual(cnYear('一九六七'), 1967);
  assert.throws(() => cnYear('一九一一一'), /认不出的汉字纪年/);
  assert.throws(() => cnYear('19 11'), /认不出的汉字纪年/);
});

test('三次转向的纪年取自正文，不写在代码里', () => {
  assert.strictEqual(F.taylor, 1911);
  assert.strictEqual(F.fayol, 1916);
  assert.strictEqual(F.mayoFrom, 1924);
  assert.strictEqual(F.mayoTo, 1932);
  assert.strictEqual(F.contingency, 1961);
});

test('间隔由纪年现算', () => {
  assert.strictEqual(gap(F.taylor, F.fayol), 5);
  assert.strictEqual(gap(F.fayol, F.mayoFrom), 8);
  assert.strictEqual(gap(F.mayoFrom, F.mayoTo), 8);
  assert.strictEqual(gap(F.taylor, F.contingency), 50);
});

test('人次与单次时长都取自正文', () => {
  assert.strictEqual(F.visitGrowthPct, 18);
  assert.strictEqual(F.minutesBefore, 11);
  assert.strictEqual(F.minutesAfter, 7);
});

test('人次涨 18% 而总诊疗时间反而下降', () => {
  const change = totalMinutesChangePct(F.minutesBefore, F.minutesAfter, F.visitGrowthPct);
  assert.ok(change < 0, `总诊疗时间应为下降，实得 ${change}`);
  assert.ok(Math.abs(change + 24.9) < 0.1, String(change));
  assert.ok((F.minutesAfter / F.minutesBefore - 1) * 100 < -36, '单次时长降幅应超过三分之一');
});

test('总诊疗时间按 人次×时长 计算，可复算', () => {
  assert.strictEqual(totalVisitMinutes(100, 0, 11), 1100);
  assert.strictEqual(totalVisitMinutes(100, 100, 11), 2200);
  assert.ok(totalVisitMinutes(100, 18, 7) < totalVisitMinutes(100, 0, 11));
});

test('脚本可运行，输出三次转向与总时间结论', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /三次转向/);
  assert.match(out, /总诊疗时间/);
  assert.match(out, /现算/);
  assert.match(out, /不构成管理咨询意见或制度设计依据/);
});
