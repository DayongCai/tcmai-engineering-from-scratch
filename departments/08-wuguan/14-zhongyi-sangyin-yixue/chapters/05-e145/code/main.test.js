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
  diseaseNames,
  nameBySite,
  acuteBi,
  chronicBi,
  pusLocation,
  discriminators,
  redFlagText,
} = require('./main.js');

const doc = readDoc();

test('正文可读且规模合理', () => {
  assert.ok(fs.existsSync(DOC));
  assert.ok(doc.length > 2000, '正文过短');
});

test('四个病名齐读，各带病位、局部体征与现代对应', () => {
  const n = diseaseNames(doc);
  assert.strictEqual(n.length, 4);
  assert.deepStrictEqual(n.map((x) => x.name), ['急喉痹', '慢喉痹', '急乳蛾', '慢乳蛾']);
  for (const x of n) {
    assert.ok(x.site.length >= 2, `${x.name} 缺病位`);
    assert.ok(x.sign.length >= 4, `${x.name} 缺体征`);
    assert.match(x.modern, /炎/, `${x.name} 的现代对应应写清`);
  }
});

test('病位决定病名：咽黏膜归喉痹，喉核归乳蛾', () => {
  assert.strictEqual(nameBySite('咽黏膜、咽壁'), '喉痹');
  assert.strictEqual(nameBySite('喉核'), '乳蛾');
  assert.strictEqual(nameBySite('喉核（腭扁桃体）'), '乳蛾');
  assert.strictEqual(nameBySite('气管'), null);
  for (const x of diseaseNames(doc)) {
    const expected = x.name.includes('乳蛾') ? '乳蛾' : '喉痹';
    const site = x.site.includes('同上') ? '咽壁' : x.site;
    assert.strictEqual(nameBySite(site), expected, `${x.name} 的病位应归 ${expected}`);
  }
});

test('急喉痹三型按红、痛、热的配比分开，各带治法与方', () => {
  const a = acuteBi(doc);
  assert.strictEqual(a.length, 3);
  assert.deepStrictEqual(a.map((x) => x.type), ['风热外袭', '风寒外袭', '肺胃热盛']);
  for (const x of a) {
    assert.ok(x.therapy.length >= 6, `${x.type} 缺治法`);
    assert.ok(x.formula.length >= 4, `${x.type} 缺代表方`);
  }
});

test('慢喉痹三型按干、痰、虚的偏向分开', () => {
  const c = chronicBi(doc);
  assert.strictEqual(c.length, 3);
  assert.deepStrictEqual(c.map((x) => x.type), ['阴虚肺燥', '痰凝血瘀', '脾胃虚弱']);
  assert.match(c[2].therapy, /健脾/);
});

test('脓在喉核内是乳蛾，在喉核外就越过本章上界', () => {
  assert.strictEqual(pusLocation('脓在喉核内'), '乳蛾');
  assert.match(pusLocation('脓在喉核外'), /喉关痈/);
  assert.strictEqual(pusLocation('脓在颈部'), null);
});

test('四条鉴别线按重要性排，伪膜排第一', () => {
  const d = discriminators(doc);
  assert.strictEqual(d.lines.length, 4);
  assert.strictEqual(d.lines[0], '伪膜');
  assert.deepStrictEqual(d.lines, ['伪膜', '化脓', '发热', '病程']);
});

test('三条红旗恰好三条，且只终止处置、不改辨证', () => {
  const d = discriminators(doc);
  assert.strictEqual(d.flags.length, 3);
  const f = redFlagText(doc);
  assert.strictEqual(f.length, 3);
  assert.match(f[0].title, /呼吸困难/);
  assert.match(f[1].title, /单侧肿胀/);
  assert.match(f[2].title, /张口困难/);
  assert.match(f[0].sign, /吸气性喉鸣/);
});

test('正文明写忌强行刮剥脓点，并引「切勿误用刀」', () => {
  assert.match(doc, /忌强行刮剥/);
  assert.match(doc, /切勿误用刀/);
});

test('脚本可运行，输出含现算声明与临床边界', () => {
  const r = spawnSync(process.execPath, [require.resolve('./main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200);
  assert.match(out, /现算/);
  assert.match(out, /不构成/);
  assert.match(out, new RegExp(SLUG));
});
