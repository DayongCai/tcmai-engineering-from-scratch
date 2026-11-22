'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, quadrant, worst, turnover, tierScore, impairment, concepts, SIGNALS, REFERRAL } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '15-p15', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 15);
  assert.strictEqual(TITLE, '压力不是活多，是要得多、能控的少');
  assert.strictEqual(sections(TEXT).length, 8);
});

test('识别信号、转介三步、ICD-11 编码都在正文里', () => {
  const c = concepts(TEXT);
  assert.deepStrictEqual(c.signals, SIGNALS);
  assert.deepStrictEqual(c.referral, REFERRAL);
  assert.strictEqual(c.hasKarasek, true);
  assert.strictEqual(c.hasBurnoutCode, true);
  assert.strictEqual(c.hasICD, true);
});

test('四象限判定：高要求+高控制=主动型，+低控制=高紧张', () => {
  assert.strictEqual(quadrant({ demand: 0.9, control: 0.8 }).quadrant, '主动型');
  assert.strictEqual(quadrant({ demand: 0.9, control: 0.2 }).quadrant, '高紧张');
  assert.strictEqual(quadrant({ demand: 0.2, control: 0.2 }).quadrant, '被动型');
  assert.strictEqual(quadrant({ demand: 0.2, control: 0.8 }).quadrant, '低紧张');
  assert.match(quadrant({ demand: 0.9, control: 0.2 }).note, /耗竭/);
});

test('第三维支持：高要求低控制低支持 = 最劣组合', () => {
  const w = worst({ demand: 0.9, control: 0.2, support: 0.2 });
  assert.strictEqual(w.worst, true);
  assert.match(w.label, /最劣/);
  assert.strictEqual(worst({ demand: 0.9, control: 0.2, support: 0.8 }).worst, false);
  assert.strictEqual(worst({ demand: 0.9, control: 0.9, support: 0.2 }).worst, false);
});

test('离职率极差 11 个点，最高是最低的 2.38 倍', () => {
  const t = turnover([
    { group: '高要求低控制', rate: 19 },
    { group: '高要求高控制', rate: 8 },
    { group: '全院平均', rate: 9 },
  ]);
  assert.strictEqual(t.spread, 11);
  assert.strictEqual(t.ratio, 2.38);
});

test('三级干预按乘积排序：二级最容易被选中，一级效果最好', () => {
  const t = tierScore();
  assert.strictEqual(t[0].tier, '二级（群体层）');
  assert.strictEqual(t[0].product, 4);
  const first = t.find((x) => x.tier.startsWith('一级'));
  assert.strictEqual(first.effect, 3);
  assert.strictEqual(first.feasibility, 1);
});

test('恢复：18 小时清醒达到 0.05 当量，低于 17 小时则未达', () => {
  assert.strictEqual(impairment(18).bac, 0.05);
  assert.strictEqual(impairment(18).overLimit, true);
  assert.strictEqual(impairment(16).overLimit, false);
  assert.ok(impairment(24).bac > 0.06);
  assert.match(impairment(18).note, /酒驾/);
});

test('脚本可运行，输出四象限与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /高紧张：最伤/);
  assert.match(out, /当量 0\.05/);
  assert.match(out, /倦怠不是疾病/);
});
