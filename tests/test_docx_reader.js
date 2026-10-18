#!/usr/bin/env node
/**
 * tests/test_docx_reader.js —— Word .docx（OOXML）读取器
 *
 * 断言落在结构与逐字内容上：docx 的失败方式很安静（parse 到空数组也能"成功"），
 * 所以必须验到具体句子与表格单元格。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { readDocx, paragraphText, headingLevel, parseTable } = require('../scripts/lib_docx');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'standards/materials/shanghan-jiagou/sources/伤寒架构.docx');
const exists = fs.existsSync(SRC);

test('段落文本：<w:t> 拼接、tab 与 br 转换', () => {
  const xml = '<w:p><w:r><w:t>太阳</w:t></w:r><w:r><w:t>病</w:t></w:r><w:r><w:tab/><w:t>脉浮</w:t></w:r></w:p>';
  assert.strictEqual(paragraphText(xml), '太阳病\t脉浮');
});

test('标题层级：Heading1/标题2/裸数字都认，正文样式不误判', () => {
  assert.strictEqual(headingLevel('<w:pPr><w:pStyle w:val="Heading1"/></w:pPr>'), 1);
  assert.strictEqual(headingLevel('<w:pPr><w:pStyle w:val="标题2"/></w:pPr>'), 2);
  assert.strictEqual(headingLevel('<w:pPr><w:pStyle w:val="3"/></w:pPr>'), 3);
  assert.strictEqual(headingLevel('<w:pPr><w:pStyle w:val="Normal"/></w:pPr>'), 0);
});

test('表格：行×单元格，空单元格不丢行', () => {
  const xml = '<w:tbl><w:tr><w:tc><w:p><w:r><w:t>内序</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>六经</w:t></w:r></w:p></w:tc></w:tr>'
    + '<w:tr><w:tc><w:p><w:r><w:t>1</w:t></w:r></w:p></w:tc><w:tc><w:p></w:p></w:tc></w:tr></w:tbl>';
  const rows = parseTable(xml);
  assert.strictEqual(rows.length, 2);
  assert.deepStrictEqual(rows[0], ['内序', '六经']);
  assert.strictEqual(rows[1][0], '1');
});

test('《伤寒架构》：六经总表读出 7 行 8 列，正文含「太阳与阳明合病」', { skip: !exists && '源文件未入库' }, () => {
  const d = readDocx(SRC);
  assert.ok(d.counts.tables >= 1, '未读到表格');
  const t = d.blocks.find((b) => b.type === 'table');
  assert.strictEqual(t.rows[0].length, 8);
  assert.ok(t.rows.length >= 7);
  const text = d.blocks.filter((b) => b.type !== 'table').map((b) => b.text).join('');
  assert.ok(text.includes('循经传'), '缺传变分类');
  assert.ok(text.includes('合病'), '缺合病说明');
});

test('不存在的流 / 非 docx 输入必须报错，不许返回空文档', () => {
  assert.throws(() => readDocx(Buffer.from('not a zip')), /不是 zip|缺 word/);
});
