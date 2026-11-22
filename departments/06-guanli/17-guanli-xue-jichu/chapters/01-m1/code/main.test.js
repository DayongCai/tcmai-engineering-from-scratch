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
  facts,
  liftPct,
  effectLift,
  waitLift,
  waitOverOutput,
  annualAddedWaitHours,
  serviceDelta,
} = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC), DOC);
  assert.ok(DOC.endsWith(path.join('chapters', '01-m1', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 1);
  assert.strictEqual(TITLE, '管理不是把事做完，是让同样的力气换出不同的结果');
  assert.match(TEXT, /^# 第 1 章/);
});

test('五个数都真的取自正文，不是写在代码里', () => {
  assert.strictEqual(F.visitsWan, 48.6);
  assert.strictEqual(F.visitGrowthPct, 31);
  assert.strictEqual(F.perDayLow, 52);
  assert.strictEqual(F.perDayHigh, 68);
  assert.strictEqual(F.waitLow, 28);
  assert.strictEqual(F.waitHigh, 46);
  assert.strictEqual(F.satHigh, 91.2);
  assert.strictEqual(F.satLow, 86.4);
  assert.strictEqual(F.complaintGrowthPct, 42);
});

test('效果侧与效率侧由同一组数算出，方向相反', () => {
  assert.ok(Math.abs(effectLift(F) - 30.769) < 0.01, String(effectLift(F)));
  assert.ok(Math.abs(waitLift(F) - 64.286) < 0.01, String(waitLift(F)));
  assert.ok(effectLift(F) > 0, '单位产出应为正增长');
  assert.ok(waitLift(F) > 0, '等待成本应为正增长');
});

test('等待增速快于产出增速，比值可复算', () => {
  const ratio = waitOverOutput(F);
  assert.ok(ratio > 2 && ratio < 2.1, String(ratio));
  assert.strictEqual(waitOverOutput(F), waitLift(F) / effectLift(F));
});

test('单次候诊增量摊到全年门诊量即全年新增等待人时', () => {
  const hours = annualAddedWaitHours(F);
  assert.strictEqual(hours, (F.visitsWan * 10000 * (F.waitHigh - F.waitLow)) / 60);
  assert.ok(Math.abs(hours - 145800) < 1, String(hours));
});

test('满意度与投诉是两条反向曲线', () => {
  const d = serviceDelta(F);
  assert.ok(Math.abs(d.satDelta + 4.8) < 1e-9, String(d.satDelta));
  assert.ok(d.satDelta < 0);
  assert.strictEqual(d.complaintLiftPct, 42);
});

test('liftPct 对零或负基期报错，不返回 Infinity', () => {
  assert.throws(() => liftPct(0, 10), /基期必须为正/);
  assert.throws(() => liftPct(-1, 10), /基期必须为正/);
  assert.strictEqual(liftPct(50, 100), 100);
});

test('脚本可运行，输出三本账与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /效果账/);
  assert.match(out, /效率账/);
  assert.match(out, /三本账/);
  assert.match(out, /现算/);
  assert.match(out, /不构成管理咨询意见或绩效分配依据/);
});
