'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, CHAPTER, TITLE, read, facts, perHalfDay, perStudentPerHalfDay, cumulative, slotCost } = require('./main.js');

const TEXT = read();
const F = facts(TEXT);

test('正文就在本章目录下，章号与标题对得上', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(DOC.endsWith(path.join('chapters', '03-z33', 'docs', 'zh.md')), DOC);
  assert.strictEqual(CHAPTER, 3);
  assert.ok(TEXT.startsWith('# 第 3 章'));
  assert.strictEqual(TITLE, '名医工作室的成本，记在导师的号源上');
});

test('产能设定全部取自正文', () => {
  assert.strictEqual(F.halfDayHours, 4);
  assert.strictEqual(F.minutesPerVisit, 12);
  assert.strictEqual(F.students, 3);
  assert.strictEqual(F.halfDaysPerWeek, 2);
  assert.strictEqual(F.weeksPerYear, 44);
  assert.strictEqual(F.years, 3);
  assert.strictEqual(F.diseaseShare, 8);
  assert.strictEqual(F.slotsPerWeek, 120);
  assert.strictEqual(F.weekShareClaim, 3);
});

test('半日 4 小时按 12 分钟计可看 20 人', () => {
  assert.strictEqual(perHalfDay(4, 12), 20);
  assert.strictEqual(perHalfDay(F.halfDayHours, F.minutesPerVisit), 20);
});

test('三名学生同诊，每人每半日 6 至 7 人，落在正文给出的区间里', () => {
  const per = perStudentPerHalfDay(20, 3);
  assert.ok(per >= 6 && per <= 7, String(per));
  assert.strictEqual(per.toFixed(2), '6.67');
});

test('三年累计主诊的上限高于正文所取的 1,150 人次，比例可复算', () => {
  const per = perStudentPerHalfDay(20, 3);
  const ceiling = cumulative(per, 2, 44, 3);
  assert.strictEqual(ceiling.toFixed(0), '1760');
  assert.ok(ceiling > F.cumulativeClaim, '上限应高于正文取数');
  const share = F.cumulativeClaim / ceiling;
  assert.ok(share > 0.6 && share < 0.7, String(share));
});

test('病种例数：1,150 的 8% 与正文「约 90 例」相符', () => {
  const cases = F.cumulativeClaim * (F.diseaseShare / 100);
  assert.strictEqual(cases, 92);
  assert.ok(Math.abs(cases - F.casesClaim) <= 5, `${cases} vs ${F.casesClaim}`);
  assert.ok(cases < 300, '不足以覆盖 300 例医案的规模');
});

test('号源成本：5,280 号／年，约为主治全年门诊量的三分之一', () => {
  const attending = 120 * 44 * 3;
  assert.strictEqual(attending, 15840);
  const cost = slotCost(120, 44, attending);
  assert.strictEqual(cost.yearly, 5280);
  assert.ok(Math.abs(cost.share - 1 / 3) < 1e-9, String(cost.share));
});

test('脚本可运行，输出天花板与号源成本，并给出边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /产能天花板/);
  assert.match(out, /号源成本/);
  assert.match(out, /挂出量是可行量的/);
  assert.match(out, /不构成人事、劳动、职称评审/);
});
