'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, PELVIS, COLUMNS, CALCANEUS, read, analyze } = require('./main.js');

const A = analyze(read());
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '06-guzhe-er', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 6);
  assert.strictEqual(TITLE, '下肢骨折先算血，再算骨');
  assert.ok(read().startsWith('# 第 ' + CHAPTER + ' 章'), '正文首行不是本章章题');
});

test('规模与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2852);
  assert.strictEqual(A.sections.length, 6);
  assert.strictEqual(A.citeCount, 2);
});

test('优先级成立：血流动力学排在第二条对线之前', () => {
  assert.ok(A.bloodFirst, JSON.stringify(A.priority));
  assert.ok(A.femurBlood, '正文没有给出股骨干大失血的提示');
  assert.ok(A.bloodLoss.失血 >= 3 && A.bloodLoss.休克 >= 2, JSON.stringify(A.bloodLoss));
});

test('髋部两骨折先讲囊内、再讲囊外，且口诀写着', () => {
  assert.ok(A.hipContrast, '对照段落不成立');
  assert.ok(A.kneeHip, '缺「膝痛查髋，髋痛查膝」');
});

test('骨盆四查、脊柱三柱、跟骨三查都齐全', () => {
  assert.deepStrictEqual(A.pelvis, PELVIS);
  assert.deepStrictEqual(A.columns, COLUMNS);
  assert.deepStrictEqual(A.calcaneus, CALCANEUS);
  assert.ok(A.asia, '缺 ASIA 分级');
});

test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /创伤救治流程/);
  assert.ok(out.includes('汉字 2852 字'));
  assert.ok(out.includes('先算血，再算骨：次序成立'));
  assert.ok(out.includes('跟骨三查'));
});
