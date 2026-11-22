'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const {
  DOC,
  CHAPTER,
  SLUG,
  readDoc,
  readingOrder,
  bagang,
  organs,
  signsAsMaterial,
  recordRows,
  vetoes,
  organOfDryness,
  phaseOfSign,
} = require('./main.js');

const doc = readDoc();

test('正文可读且规模合理', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(doc.length > 2000, '正文过短');
});

test('三层读法次序为八纲→脏腑→气血津液，产物各不同', () => {
  const o = readingOrder(doc);
  assert.deepStrictEqual(o.map((x) => x.layer), ['八纲', '脏腑', '气血津液']);
  assert.deepStrictEqual(o.map((x) => x.product), ['方向', '位置', '物质']);
});

test('八纲三问齐全，每问都带两端与判据', () => {
  const b = bagang(doc);
  assert.strictEqual(b.length, 3);
  assert.deepStrictEqual(b.map((x) => x.ask), ['表里', '虚实', '寒热']);
  for (const x of b) {
    assert.ok(x.one.length >= 6 && x.other.length >= 6, `${x.ask} 两端不全`);
    assert.ok(x.sign.length >= 4, `${x.ask} 缺判据`);
  }
});

test('脏腑四条各带经络依据与治法方向', () => {
  const o = organs(doc);
  assert.strictEqual(o.length, 4);
  assert.deepStrictEqual(o.map((x) => x.organ), ['肺', '脾胃', '肾', '肝']);
  for (const x of o) {
    assert.ok(x.basis.length >= 4, `${x.organ} 缺依据`);
    assert.match(x.therapy, /／/, `${x.organ} 的方向应写出分岔`);
  }
});

test('咽干分脏：三个方向靠兼症分开，单凭咽干不写脏名', () => {
  assert.strictEqual(organOfDryness({ hoarse: true, dryCough: true }), '肺');
  assert.strictEqual(organOfDryness({ badBreath: true, constipation: true }), '胃');
  assert.strictEqual(organOfDryness({ soreWaist: true, worseAtNight: true }), '肾');
  assert.strictEqual(organOfDryness({}), null);
});

test('红与白不是两个形容词：红在气分，白在血分', () => {
  assert.match(phaseOfSign('红').phase, /气分/);
  assert.match(phaseOfSign('白').phase, /血分/);
  assert.strictEqual(phaseOfSign('白').note, '津液被熬成腐');
  const m = signsAsMaterial(doc);
  assert.strictEqual(m.length, 5);
  assert.deepStrictEqual(m.map((x) => x.sign), ['红', '肿', '白', '痰', '声']);
});

test('一页记录六行，缺一行就是没辨', () => {
  const r = recordRows(doc);
  assert.strictEqual(r.length, 6);
  assert.deepStrictEqual(r.map((x) => x.row), ['主诉与病程', '局部', '声音', '三层', '舌脉', '危险信号']);
  for (const x of r) assert.ok(x.bad.length >= 2, `${x.row} 没写不合格的写法`);
  assert.strictEqual(r[5].bad, '不填', '危险信号一行最危险的写法就是空着');
});

test('一票否决恰好四条，且不含解释性尾巴', () => {
  const v = vetoes(doc);
  assert.strictEqual(v.length, 4);
  assert.match(v[1], /吸气性呼吸困难/);
  for (const s of v) assert.ok(!s.includes('这四条'), `否决项混入了说明: ${s}`);
});

test('正文明写一次不超过两个证名', () => {
  assert.match(doc, /一次不超过两个证名/);
});

test('脚本可运行，输出含现算声明与临床边界', () => {
  const r = spawnSync(process.execPath, [require.resolve('./main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200);
  assert.match(out, /现算/);
  assert.match(out, /不构成/);
  assert.match(out, new RegExp(SLUG));
  assert.match(out, new RegExp(`第 ${CHAPTER} 章`));
});
