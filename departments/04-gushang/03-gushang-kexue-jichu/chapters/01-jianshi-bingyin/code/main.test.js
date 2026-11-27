'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, STEPS, TECHNIQUES, read, analyze } = require('./main.js');

const A = analyze(read());
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '01-jianshi-bingyin', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 1);
  assert.strictEqual(TITLE, '正骨先有程序，才有流派');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
});

test('规模与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 3225);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.citeCount, 20);
  assert.strictEqual(new Set(A.cites).size, 15);
});

test('蔺道人六步齐全，且在正文里严格按次序出现', () => {
  assert.deepStrictEqual(A.missing, [], '缺项: ' + A.missing.join('、'));
  assert.strictEqual(A.steps.length, STEPS.length);
  assert.ok(A.ordered, '六步在正文里的首次出现位置没有严格递增：' + JSON.stringify(A.steps));
  // 复位逻辑是前三步，固定与转动在后
  assert.deepStrictEqual(A.steps.slice(0, 3).map((s) => s.step), ['相度损处', '拔伸', '捺正']);
  assert.ok(A.steps[3].at > A.steps[2].at);
});

test('八法按原句列举为八项，前四归骨、后四归筋', () => {
  assert.ok(A.techniqueListed, '正文里没有「摸、接、端、提、按、摩、推、拿」的原句');
  assert.strictEqual(A.techniques.length, 8);
  const bone = A.techniques.slice(0, 4).map((t) => t.name).join('');
  const sinew = A.techniques.slice(4).map((t) => t.name).join('');
  assert.strictEqual(bone, '摸接端提');
  assert.strictEqual(sinew, '按摩推拿');
  assert.strictEqual(A.techniques.map((t) => t.name).join(''), TECHNIQUES.join(''));
});

test('病因与病机的分类在正文里都是齐的', () => {
  assert.strictEqual(A.external.length, 4, A.external.join('、'));
  assert.strictEqual(A.internal.length, 5, A.internal.join('、'));
  assert.strictEqual(A.lines.length, 4, A.lines.join('、'));
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成诊疗意见/);
  assert.ok(out.includes('汉字 3225 字'), '输出里的汉字数与快照不一致');
  assert.ok(out.includes('次序成立'), '输出没有给出程序链次序结论');
});
