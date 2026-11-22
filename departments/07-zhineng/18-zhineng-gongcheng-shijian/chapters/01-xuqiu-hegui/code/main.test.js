'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');

const MAIN = require('node:path').join(__dirname, 'main.js');
const {
  readDoc,
  tableRows,
  parseProblem,
  parseSla,
  parseExitConditions,
  analyze,
} = require('./main.js');

const doc = readDoc();

test('立项问题段：四个数都能从正文读出', () => {
  const p = parseProblem(doc);
  assert.strictEqual(p.reqTotal, 47);
  assert.strictEqual(p.sensitiveReqs, 12);
  assert.strictEqual(p.approvalDays, 11);
  assert.strictEqual(p.fieldsGranted, 3);
  assert.strictEqual(p.weekBefore, 14);
  assert.strictEqual(p.weekAfter, 26);
  assert.strictEqual(p.reworkPct, 40);
});

test('返工周数是两个周次之差，不是手打', () => {
  const a = analyze(doc);
  assert.strictEqual(a.slipWeeks, a.weekAfter - a.weekBefore);
  assert.strictEqual(a.slipWeeks, 12);
  assert.ok(Math.abs(a.slipShare - 12 / 14) < 1e-9);
  assert.ok(a.reworkMultiple > 5 && a.reworkMultiple < 6, `返工倍率异常：${a.reworkMultiple}`);
});

test('敏感需求占比由 12/47 现算', () => {
  const a = analyze(doc);
  assert.ok(Math.abs(a.sensitiveShare - 12 / 47) < 1e-9);
  assert.ok(a.sensitiveShare > 0.25 && a.sensitiveShare < 0.26);
});

test('时限表六个环节，伦理审查两档', () => {
  const sla = parseSla(doc);
  assert.strictEqual(sla.length, 6);
  const ethics = sla.find((s) => s.stage.includes('伦理'));
  assert.deepStrictEqual(ethics.days, [20, 10]);
  const a = analyze(doc);
  assert.strictEqual(a.noEthics, a.sla.filter((s) => !s.stage.includes('伦理')).reduce((x, s) => x + s.days[0], 0));
  assert.strictEqual(a.noEthics + a.ethicsMeeting, a.withEthics);
  assert.strictEqual(a.withEthics, 32);
  assert.ok(Math.abs(a.withEthicsWeeks - 6.4) < 1e-9);
});

test('表行数由表格现数：分级四类、申请表十四项、需求七字段', () => {
  const a = analyze(doc);
  assert.strictEqual(a.gradingRows, 4);
  assert.strictEqual(a.formRows, 14);
  assert.strictEqual(a.fieldCount, 7);
  assert.strictEqual(tableRows(doc, '字段').length, 7);
});

test('出口条件六条且每条非空', () => {
  const exits = parseExitConditions(doc);
  assert.strictEqual(exits.length, 6);
  for (const e of exits) assert.ok(e.length > 4, `出口条件过短：${e}`);
});

test('优先级四档与评审时长取自正文', () => {
  const a = analyze(doc);
  assert.deepStrictEqual(a.priority, [6, 3, 1]);
  assert.strictEqual(a.reviewMinutes, 90);
  assert.strictEqual(a.useMonths, 12);
});

test('脚本可运行，输出含现算数字与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /需求 47 条/);
  assert.match(out, /推迟 12 周/);
  assert.match(out, /不含伦理：12 个工作日/);
  assert.match(out, /含伦理会议审查：32 个工作日/);
  assert.match(out, /不构成法律意见或合规结论/);
});
