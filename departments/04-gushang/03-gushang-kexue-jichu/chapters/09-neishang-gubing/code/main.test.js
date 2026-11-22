'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, KINDS, PATHO, ABDOMEN, TUMOR_SIGNS, DONT, read, analyze } = require('./main.js');

const A = analyze(read());
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '09-neishang-gubing', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 9);
  assert.strictEqual(TITLE, '内伤看不见伤口，骨病不总是外伤');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
});

test('规模与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2822);
  assert.strictEqual(A.sections.length, 7);
  assert.strictEqual(A.citeCount, 4);
});

test('内伤三类与病机三主线齐全，病机按加粗项递增', () => {
  assert.deepStrictEqual(A.kinds, KINDS);
  assert.deepStrictEqual(A.patho.map((p) => p.key), PATHO);
  assert.ok(A.pathoOrdered, JSON.stringify(A.patho));
});

test('大出血的例外写着：不按三期走，先固脱后化瘀', () => {
  assert.ok(A.bleedException, '缺「大出血的病人不按三期走」');
  assert.ok(A.bleedOrder, '缺「先固脱，后化瘀」');
});

test('腹部三规则、肿瘤五条预警、四个不做都齐全', () => {
  assert.deepStrictEqual(A.abdomen, ABDOMEN);
  assert.deepStrictEqual(A.tumorSigns, TUMOR_SIGNS);
  assert.deepStrictEqual(A.dont, DONT);
});

test('交叉处判据写着：先查病因再谈固定、影像滞后于临床、冷脓肿', () => {
  assert.ok(A.pathoFracture, '缺「先查病因，再谈固定」');
  assert.ok(A.imagingLag, '缺「影像滞后于临床」');
  assert.ok(A.coldAbscess, '缺「冷脓肿」');
  assert.strictEqual(A.bedridden.length, 5, A.bedridden.join('、'));
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /以所在机构规范为准/);
  assert.ok(out.includes('汉字 2822 字'));
  assert.ok(out.includes('四个「不做」'));
});
