'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, decay, compareChannels, directionality, spotCheck, concepts, LISTEN, FEEDBACK, MEETING, CHANNELS } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '11-p11', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 11);
  assert.strictEqual(TITLE, '话没有传丢，是一层层被筛掉了');
  assert.strictEqual(sections(TEXT).length, 8);
});

test('倾听三动作、反馈三要素、会议三改进、三条通道逐条命中', () => {
  const c = concepts(TEXT);
  assert.deepStrictEqual(c.listen, LISTEN);
  assert.deepStrictEqual(c.feedback, FEEDBACK);
  assert.deepStrictEqual(c.meeting, MEETING);
  assert.deepStrictEqual(c.channels, CHANNELS);
  assert.strictEqual(c.hasReadback, true);
});

test('0.7 四层剩 24.01%，0.8 四层剩 40.96%，两层剩 49%', () => {
  assert.strictEqual(decay(4, 0.7).pct, 24.01);
  assert.strictEqual(decay(4, 0.8).pct, 40.96);
  assert.strictEqual(decay(2, 0.7).pct, 49);
  assert.strictEqual(decay(0, 0.7).left, 1);
});

test('减层带来的提升大于提高单层保留率', () => {
  const c = compareChannels();
  assert.strictEqual(c.gainByTalking, 0.1695);
  assert.strictEqual(c.gainByCutting, 0.2499);
  assert.ok(c.gainByCutting > c.gainByTalking);
});

test('方向性：两层之后坏消息剩 0.64、好消息放大到 1.3225', () => {
  const d = directionality(2);
  assert.strictEqual(d.badNewsSeen, 0.64);
  assert.strictEqual(d.goodNewsSeen, 1.3225);
  assert.ok(d.gap > 0.6);
  assert.strictEqual(directionality(0).gap, 0);
});

test('抽查 9/42 = 21.43%，判为「问题在链不在人」', () => {
  const s = spotCheck(42, 9);
  assert.strictEqual(s.pct, 21.43);
  assert.match(s.verdict, /问题在链/);
  assert.match(spotCheck(42, 20).verdict, /落地尚可/);
});

test('正文的边界句可在原句核对', () => {
  for (const k of ['减层比加压有效', '一次「报忧得忧」就足够让一个科室学会沉默', '回述法', '沟通技巧不能弥补利益冲突']) {
    assert.ok(TEXT.includes(k), k);
  }
});

test('脚本可运行，输出衰减算术与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /每层 0\.7 × 四层 → 24\.01%/);
  assert.match(out, /21\.43%/);
  assert.match(out, /演示性算术/);
});
