'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, tables, styles, conflictCost, orientation, interventionCost, issuePackage, mediation, concepts, PONDY, MEDIATION } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '12-p12', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 12);
  assert.strictEqual(TITLE, '冲突不需要消灭，需要定价');
  assert.strictEqual(sections(TEXT).length, 8);
});

test('托马斯—基尔曼五方式从正文表格解析，适用与代价齐', () => {
  const st = styles(TEXT);
  assert.deepStrictEqual(st.map((s) => s.mode), ['竞争', '协作', '妥协', '回避', '迁就']);
  assert.match(st[3].when, /议题不重要/);
  assert.match(st[3].cost, /拖成结构性问题/);
  assert.strictEqual(tables(TEXT).length, 1);
  assert.deepStrictEqual(concepts(TEXT).pondy, PONDY);
});

test('冲突成本：27 次 × 2.5 小时 = 67.5 小时，换 4 小时产能', () => {
  const c = conflictCost({ events: 27, hoursEach: 2.5, capacityGap: 4 });
  assert.strictEqual(c.hours, 67.5);
  assert.strictEqual(c.perGapHour, 16.88);
});

test('庞迪五段干预成本倍数成倍增长，潜在段最便宜', () => {
  assert.deepStrictEqual(PONDY.map((s) => interventionCost(s).multiplier), [1, 2, 4, 8, 16]);
  assert.match(interventionCost('潜在').note, /改一条规则/);
  assert.match(interventionCost('显现').note, /裁决/);
  assert.strictEqual(interventionCost('不存在'), null);
});

test('两维判定：高坚持低合作→竞争，低低→回避，高高→协作，低高→迁就', () => {
  assert.strictEqual(orientation(0.9, 0.2).mode, '竞争');
  assert.strictEqual(orientation(0.2, 0.2).mode, '回避');
  assert.strictEqual(orientation(0.9, 0.9).mode, '协作');
  assert.strictEqual(orientation(0.2, 0.9).mode, '迁就');
  assert.strictEqual(orientation(0.5, 0.5).mode, '妥协');
});

test('整合式谈判：只取差值正的项，合计空间可算', () => {
  const p = issuePackage([
    { item: '周几固定', ourCost: 1, theirValue: 5 },
    { item: '时长补在别日', ourCost: 2, theirValue: 4 },
    { item: '维护时段我方承担', ourCost: 4, theirValue: 1 },
  ]);
  assert.strictEqual(p.items[0].item, '周几固定');
  assert.strictEqual(p.items[0].spread, 4);
  assert.strictEqual(p.tradeable.length, 2);
  assert.strictEqual(p.totalGain, 6);
});

test('调解三条件缺一条就退化', () => {
  assert.strictEqual(mediation(MEDIATION).ok, true);
  const bad = mediation(['双方都有继续合作的预期', '程序被双方认可']);
  assert.deepStrictEqual(bad.missing, ['调解人不持有裁决权']);
  assert.match(bad.verdict, /退化成走流程/);
});

test('脚本可运行，输出定价与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /67\.5 管理小时/);
  assert.match(out, /成本倍数 16/);
  assert.match(out, /均为演算设定/);
});
