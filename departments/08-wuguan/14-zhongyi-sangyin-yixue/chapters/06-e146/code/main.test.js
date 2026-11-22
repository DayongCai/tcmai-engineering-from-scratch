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
  criteria,
  layers,
  layerOfComplaint,
  jinShi,
  jinPo,
  redFlags,
  suddenLossRoute,
} = require('./main.js');

const doc = readDoc();

test('正文可读且规模合理', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(doc.length > 2000, '正文过短');
});

test('三组判据各答一个问题，分别定补泻、定散补、定查不查', () => {
  const c = criteria(doc);
  assert.strictEqual(c.length, 3);
  assert.deepStrictEqual(c.map((x) => x.sign), ['暴喑／久喑', '金实／金破', '功能性／器质性']);
  assert.match(c[0].decides, /祛邪还是扶正/);
  assert.match(c[1].decides, /散还是补/);
  assert.match(c[2].decides, /喉镜/);
});

test('声音三层为动力、振动、形，缺一层就有一种哑法', () => {
  const l = layers(doc);
  assert.deepStrictEqual(l.map((x) => x.layer), ['动力', '振动', '形']);
  assert.match(l[0].body, /肺气与呼吸/);
  assert.match(l[1].body, /声带/);
  assert.match(l[2].body, /构音/);
});

test('三句主诉各落回自己那一层', () => {
  assert.strictEqual(layerOfComplaint('说不了多久'), '动力');
  assert.strictEqual(layerOfComplaint('发不出声'), '振动');
  assert.strictEqual(layerOfComplaint('说话大舌头'), '形');
  assert.strictEqual(layerOfComplaint('咽痛三天'), null);
});

test('振動层的听感是音质改变，不是字说不清', () => {
  const l = layers(doc).find((x) => x.layer === '振动');
  assert.ok(/音质改变|气息声|断裂/.test(doc), '正文应写到振动层的听感');
  assert.ok(l.body.length >= 6);
});

test('金实三型按邪的性质分，各带治法与方', () => {
  const js = jinShi(doc);
  assert.strictEqual(js.length, 3);
  assert.deepStrictEqual(js.map((x) => x.type), ['风寒袭肺', '风热犯肺', '痰热壅肺']);
  for (const x of js) {
    assert.ok(x.therapy.length >= 6, `${x.type} 缺治法`);
    assert.match(x.therapy, /开音/, `${x.type} 的治法应落到开音`);
  }
});

test('金破三型按损在阴、在气、在络分', () => {
  const jp = jinPo(doc);
  assert.strictEqual(jp.length, 3);
  assert.deepStrictEqual(jp.map((x) => x.type), ['肺肾阴虚', '肺脾气虚', '气滞血瘀']);
});

test('六条红旗读到六条，末条是气道方向', () => {
  const f = redFlags(doc);
  assert.strictEqual(f.length, 6);
  assert.match(f[5], /吸气性喉鸣/);
  assert.match(f[1], /单侧/);
});

test('突然失音的两条路分得开：咳嗽有声指向功能性，单侧固定指向麻痹', () => {
  assert.match(suddenLossRoute({ coughVoice: true, glottisClosed: true }), /功能性失音/);
  assert.match(suddenLossRoute({ unilateralFix: true }), /声带麻痹/);
  assert.strictEqual(suddenLossRoute({}), null);
});

test('正文明写时间是诊断线不是治疗线', () => {
  assert.match(doc, /时间是诊断线，不是治疗线/);
  assert.match(doc, /久喑有实/);
  assert.match(doc, /暴喑有虚/);
});

test('脚本可运行，输出含现算声明与临床边界', () => {
  const r = spawnSync(process.execPath, [require.resolve('./main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200);
  assert.match(out, /现算|现读|读自/);
  assert.match(out, /不构成/);
  assert.match(out, new RegExp(SLUG));
  assert.match(out, new RegExp(`第 ${CHAPTER} 章`));
});
