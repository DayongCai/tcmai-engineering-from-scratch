#!/usr/bin/env node
/**
 * tests/test_xlsx_writer.js — xlsx 写出器（scripts/lib_xlsx_write.js）的往返硬证据
 *
 * 写的和读的是两套代码（writeWorkbook / lib_xlsx.readWorkbook），最容易出的错是
 * 「文件能被我们的读取器读出来，但 Excel 打不开」或反过来。所以这里两头都钉：
 *   - 往返：写进去的字，读回来必须逐字相同（含 XML 特殊字符、换行、空值、数字）
 *   - 形状：sheet 名、行列数、表头样式、冻结窗格对应的 XML 都在
 *   - 边界：非法工作表名、超长文本、控制字符（Excel 会判文件损坏）
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert');

const { writeWorkbook, makeZip, crc32 } = require('../scripts/lib_xlsx_write');
const { readWorkbook, readZipEntries } = require('../scripts/lib_xlsx');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

const TMP = path.join(os.tmpdir(), `tcmai-xlsxwriter-${process.pid}`);
fs.mkdirSync(TMP, { recursive: true });
const OUT = path.join(TMP, 'roundtrip.xlsx');

console.log('═══ xlsx 写出器 ═══\n');

const ROWS = [
  ['列甲', '列乙', '列丙'],
  ['中文内容', 12345, ''],
  ['含 <XML> & "引号" \'单引号\'', 3.14, '一行\n两行'],
  ['长文本', -0.5, '《伤寒论》·桂枝汤·（一）桂枝汤治感冒'],
  ['', 0, '结尾'],
];

test('往返：写进去的字读回来逐字相同', () => {
  writeWorkbook(OUT, [{ name: '往返', rows: ROWS, wrap: [2] }]);
  const wb = readWorkbook(OUT);
  assert.strictEqual(wb.sheets.length, 1);
  const got = wb.sheets[0].rows;
  assert.strictEqual(got.length, ROWS.length, `行数 ${got.length} ≠ ${ROWS.length}`);
  ROWS.forEach((row, r) => {
    row.forEach((v, c) => {
      const back = got[r][c];
      if (v === '') assert.ok(back === '' || back === undefined, `(${r},${c}) 期望空，得到 ${JSON.stringify(back)}`);
      else assert.strictEqual(String(back), String(v), `(${r},${c}) 不一致：${JSON.stringify(back)}`);
    });
  });
});

test('数字写的是数值型（读回仍是 number，不是字符串）', () => {
  const wb = readWorkbook(OUT);
  assert.strictEqual(typeof wb.sheets[0].rows[1][1], 'number');
  assert.strictEqual(wb.sheets[0].rows[2][1], 3.14);
});

test('多表：sheet 名、顺序与 XML 关系表一致', () => {
  writeWorkbook(OUT, [
    { name: '00目录', rows: [['内序', '篇名'], [1, '01学习方法']] },
    { name: '01学习方法', rows: [['条号', '正文'], [1, '内容']] },
  ]);
  const wb = readWorkbook(OUT);
  assert.deepStrictEqual(wb.sheets.map((s) => s.name), ['00目录', '01学习方法']);
  const entries = readZipEntries(fs.readFileSync(OUT));
  ['[Content_Types].xml', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml']
    .forEach((n) => assert.ok(entries.has(n), `缺 zip 条目 ${n}`));
});

test('非法工作表名被清理（Excel 不允许 \\ / ? * [ ] :）', () => {
  writeWorkbook(OUT, [{ name: 'a/b[c]:d*?', rows: [['x', 1]] }]);
  const wb = readWorkbook(OUT);
  assert.ok(!/[\\/?*[\]:]/.test(wb.sheets[0].name), `名字仍有非法字符: ${wb.sheets[0].name}`);
  assert.strictEqual(wb.sheets[0].name.length <= 31, true);
});

test('控制字符被剔除（否则 Excel 报「文件已损坏」）', () => {
  const dirty = `前\u0000中\u001f后`;
  writeWorkbook(OUT, [{ name: '控制字符', rows: [['x', dirty]] }]);
  const wb = readWorkbook(OUT);
  assert.strictEqual(wb.sheets[0].rows[0][1], '前中后');
});

test('冻结首行确实写进了 sheetViews/pane', () => {
  writeWorkbook(OUT, [{ name: 'x', rows: [['h'], ['v']] }]);
  const entries = readZipEntries(fs.readFileSync(OUT));
  const xml = require('../scripts/lib_xlsx').readZipFile(fs.readFileSync(OUT), entries, 'xl/worksheets/sheet1.xml').toString('utf8');
  assert.ok(xml.includes('<pane ySplit="1"'), '缺冻结窗格');
  assert.ok(xml.includes('s="1"'), '表头未加粗（缺 style 1）');
});

test('crc32 与已知值一致（zip 校验用）', () => {
  assert.strictEqual(crc32(Buffer.from('hello', 'utf8')), 0x3610a686);
  assert.strictEqual(crc32(Buffer.from('', 'utf8')), 0);
});

test('空表也能写出可读回的文件', () => {
  writeWorkbook(OUT, [{ name: '空', rows: [] }]);
  const wb = readWorkbook(OUT);
  assert.strictEqual(wb.sheets.length, 1);
  assert.strictEqual(wb.sheets[0].rows.length, 0);
});

test('makeZip 输出可被自身的 zip 读取器解析', () => {
  const zip = makeZip([{ name: 'a.txt', data: Buffer.from('内容', 'utf8') }]);
  const entries = readZipEntries(zip);
  assert.ok(entries.has('a.txt'));
});

fs.rmSync(TMP, { recursive: true, force: true });

console.log(`\n${failures.length ? '✗' : '✓'} xlsx 写出器：${passed} 通过 · ${failures.length} 失败`);
if (failures.length) process.exit(1);
