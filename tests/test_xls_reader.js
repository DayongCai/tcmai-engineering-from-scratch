#!/usr/bin/env node
/**
 * tests/test_xls_reader.js — 旧二进制 .xls（BIFF8 / OLE2）读取器
 *
 * 为什么要有这套：`scripts/lib_xls.js` 是本仓库唯一一段**自己实现二进制格式**的代码，
 * 而它读的是最要紧的那份原件（《黄帝内经》全本）。这种代码出错的方式很安静 ——
 * 少解析一个 CONTINUE，文本就从某一句开始截断，页面看起来仍然"有内容"。
 * 所以断言必须落在**逐字内容**上，而不是"读到了 162 张表"。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { readWorkbook, decodeRK, readCompound } = require('../scripts/lib_xls');

const ROOT = path.resolve(__dirname, '..');
const NEIJING = path.join(ROOT, 'standards/materials/neijing-quanwen/sources/黄帝内经全文.xls');
const exists = fs.existsSync(NEIJING);

test('复合文档签名识别：非 OLE2 输入必须明确报错，不许静默返回空', () => {
  assert.throws(() => readCompound(Buffer.from('not an ole2 file at all')), /不是 OLE2/);
});

test('RK 编码：整数型与百倍小数型都能还原', () => {
  // 0b...010 = 整数（高位右移 2），0b...011 = 整数且除以 100
  assert.strictEqual(decodeRK((42 << 2) | 0x02), 42);
  assert.strictEqual(decodeRK((1234 << 2) | 0x03), 12.34);
});

test('《黄帝内经》全本：162 篇 = 素问 81 + 灵枢 81', { skip: !exists && '源文件未入库' }, () => {
  const wb = readWorkbook(NEIJING);
  assert.strictEqual(wb.sheets.length, 162);
  const sw = wb.sheets.filter((s) => s.name.startsWith('SW')).length;
  const ls = wb.sheets.filter((s) => s.name.startsWith('LS')).length;
  assert.strictEqual(sw, 81, `素问篇数 ${sw}`);
  assert.strictEqual(ls, 81, `灵枢篇数 ${ls}（表名前缀是 LS 不是 LW）`);
});

test('首篇逐字校验：篇名与首句（截断会在这里露出来）', { skip: !exists && '源文件未入库' }, () => {
  const wb = readWorkbook(NEIJING);
  const s = wb.sheets[0];
  assert.strictEqual(String(s.rows[0][0]), '素问·上古天真论');
  const text = s.rows.map((r) => String(r[2] || '')).join('');
  assert.ok(text.includes('昔在黄帝，生而神灵，弱而能言'), '首篇原文首句未读到');
});

test('病机十九条：十九条「皆属于」一字不少', { skip: !exists && '源文件未入库' }, () => {
  const wb = readWorkbook(NEIJING);
  const sheet = wb.sheets.find((s) => String(s.rows[0] && s.rows[0][0]).includes('至真要大论'));
  assert.ok(sheet, '未找到《素问·至真要大论》');
  const text = sheet.rows.map((r) => String(r[2] || '')).join('');
  assert.strictEqual((text.match(/皆属于/g) || []).length, 19, '十九条条数不符');
  for (const k of ['诸风掉眩', '诸寒收引', '诸呕吐酸，暴注下迫']) {
    assert.ok(text.includes(k), `缺条文：${k}`);
  }
});

test('灵枢篇也能读：九针十二原含九针名目', { skip: !exists && '源文件未入库' }, () => {
  const wb = readWorkbook(NEIJING);
  const sheet = wb.sheets.find((s) => String(s.rows[0] && s.rows[0][0]).includes('九针十二原'));
  assert.ok(sheet, '未找到《灵枢·九针十二原》');
  const text = sheet.rows.map((r) => String(r[2] || '')).join('');
  for (const k of ['镵针', '员针', '鍉针', '锋针', '铍针', '员利针', '毫针', '长针', '大针']) {
    assert.ok(text.includes(k), `缺针名：${k}`);
  }
});
