'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const MAIN = path.join(__dirname, 'main.js');
const {
  readDoc,
  tableRows,
  parseProblem,
  parseFailureTable,
  parseNumbers,
  parseChecklist,
  parseContractRules,
  parseAcceptance,
  analyze,
} = require('./main.js');

const doc = readDoc();

test('立项问题段：5 个系统、37 个字段、3 周计划与 9 周实际', () => {
  const p = parseProblem(doc);
  assert.strictEqual(p.systems, 5);
  assert.strictEqual(p.fields, 37);
  assert.strictEqual(p.planWeeks, 3);
  assert.strictEqual(p.actualWeeks, 9);
  assert.deepStrictEqual([p.roundMin, p.roundMax], [3, 5]);
});

test('延期倍数与澄清轮数由两个周数现算', () => {
  const a = analyze(doc);
  assert.strictEqual(a.slipWeeks, 6);
  assert.strictEqual(a.slipMultiple, 3);
  assert.strictEqual(a.workdays, 30);
  assert.strictEqual(a.roundsMin, Math.ceil(30 / 5));
  assert.strictEqual(a.roundsMax, Math.round(30 / 3));
  assert.ok(a.roundsMin < a.roundsMax);
});

test('契约表 6 个字段 × 7 列，格子数现算', () => {
  const rows = tableRows(doc, '类型', 1);
  assert.strictEqual(rows.length, 6);
  assert.strictEqual(rows[0].length, 7);
  const a = analyze(doc);
  assert.strictEqual(a.contractCells, 42);
  assert.strictEqual(a.fieldDecisions, 37 * 7);
  assert.strictEqual(a.adrFields, 7);
});

test('ADR 上限与版本维护天数取自正文', () => {
  const n = parseNumbers(doc);
  assert.strictEqual(n.adrCap, 15);
  assert.strictEqual(n.adrWarn, 30);
  assert.strictEqual(n.reconcilePct, 0.1);
  assert.strictEqual(n.versionDays, 90);
  assert.strictEqual(n.versionDays - n.remindLate, 83);
});

test('失败参数表六个参数，退避与重试可复算', () => {
  const params = parseFailureTable(doc);
  assert.strictEqual(params.length, 6);
  const a = analyze(doc);
  assert.deepStrictEqual(a.backoff, [1, 2, 4]);
  assert.strictEqual(a.backoffTotal, 7);
  assert.strictEqual(a.attempts, 4);
  assert.match(a.params.find((x) => x.param === '熔断阈值').start, /50%/);
});

test('联调清单十条、契约必含五项、验收八项', () => {
  assert.strictEqual(parseChecklist(doc).length, 10);
  assert.strictEqual(parseContractRules(doc).length, 5);
  const acc = parseAcceptance(doc);
  assert.strictEqual(acc.length, 8);
  assert.ok(acc.some((x) => x.includes('重复提交')));
});

test('脚本可运行，输出含现算结论与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /5 个系统、37 个交换字段/);
  assert.match(out, /超期 6 周 = 30 个工作日/);
  assert.match(out, /259 个待定决策/);
  assert.match(out, /退避 1 \+ 2 \+ 4 = 7 秒/);
  assert.match(out, /不构成对任何系统性能的承诺/);
});
