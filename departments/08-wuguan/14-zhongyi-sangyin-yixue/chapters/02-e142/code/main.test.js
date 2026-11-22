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
  layers,
  externalPaths,
  internalTypes,
  classifyExternal,
  mechanism,
  transmission,
  twoBells,
} = require('./main.js');

const doc = readDoc();

test('正文可读且规模合理', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(doc.length > 2000, '正文过短');
});

test('三层因各答一个不同的问题，缺一层辨证就缺一条腿', () => {
  const ls = layers(doc);
  assert.strictEqual(ls.length, 3);
  assert.deepStrictEqual(ls.map((l) => l.layer), ['外感', '内伤', '不内外因']);
  const qs = new Set(ls.map((l) => l.question));
  assert.strictEqual(qs.size, 3, '三层因的问题重复了');
});

test('外因四条路齐全，每条都带判据、治法方向与误治后果', () => {
  const ext = externalPaths(doc);
  assert.strictEqual(ext.length, 4);
  assert.deepStrictEqual(ext.map((e) => e.path), ['风热', '风寒', '燥', '疫毒']);
  for (const e of ext) {
    assert.ok(e.sign.length >= 6, `${e.path} 判据太短`);
    assert.ok(e.therapy.length >= 4, `${e.path} 缺治法方向`);
    assert.ok(e.mistreat.length >= 6, `${e.path} 缺误治后果`);
  }
});

test('红肿不著 + 恶寒无汗 判为风寒，不被「红」带向清热', () => {
  assert.strictEqual(classifyExternal({ soreThroat: true, rednessSlight: true, aversionCold: true, noSweat: true }), '风寒');
});

test('风热、燥、疫毒各按自己的判据落位', () => {
  assert.strictEqual(classifyExternal({ red: true, soreThroat: true }), '风热');
  assert.strictEqual(classifyExternal({ dryness: true }), '燥');
  assert.strictEqual(classifyExternal({ outbreak: true, red: true, soreThroat: true }), '疫毒');
  assert.strictEqual(classifyExternal({}), null);
});

test('疫毒的判据压过局部征象：群体同病比红肿更硬', () => {
  assert.strictEqual(classifyExternal({ outbreak: true, rednessSlight: true, aversionCold: true, noSweat: true }), '疫毒');
});

test('内因四条读完，热与虚、痰瘀与郁各有两条', () => {
  const inn = internalTypes(doc);
  assert.strictEqual(inn.length, 4);
  for (const k of ['肺胃蕴热', '肺肾阴虚', '痰凝血瘀', '气机郁滞']) assert.ok(inn.includes(k), `缺 ${k}`);
});

test('病机三字各有治法方向，且与新病／久病／日久成结对得上', () => {
  const mech = mechanism(doc);
  assert.deepStrictEqual(mech.map((m) => m.key), ['壅', '损', '结']);
  assert.deepStrictEqual(mech.map((m) => m.therapy), ['通之', '养之', '化之']);
  assert.match(mech[0].stage, /新病/);
  assert.match(mech[2].stage, /结/);
});

test('传变四步按表里虚实推进，末段是最难速效的虚中夹实', () => {
  const t = transmission(doc);
  assert.strictEqual(t.length, 4);
  assert.strictEqual(t[0], '表');
  assert.strictEqual(t[3], '虚中夹实');
});

test('两声总纲两句都在，且未被改写成证型名', () => {
  const b = twoBells(doc);
  assert.match(b.real, /窍闭而喑/);
  assert.match(b.weak, /内夺而喑/);
});

test('正文点明风寒最常被误判，且分界只有两点', () => {
  assert.match(doc, /最常被误判的是风寒/);
  assert.match(doc, /红肿不著，恶寒无汗/);
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
