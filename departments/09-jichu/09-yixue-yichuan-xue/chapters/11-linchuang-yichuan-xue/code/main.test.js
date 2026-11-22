'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { DOC, CHAPTER, TITLE, read, analyze, figures, screening, PREV, SENS, SPEC } = require('./main.js');

const TEXT = read();
const A = analyze(TEXT);
const FIG = figures(TEXT);
const MAIN = path.join(__dirname, 'main.js');

test('正文就在本章目录下，章号与标题取自正文', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '11-linchuang-yichuan-xue', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC), '正文文件不存在');
  assert.strictEqual(CHAPTER, 11);
  assert.strictEqual(TITLE, '遗传咨询的产出不是「一个风险数字」，是一份能在几个选项里做决定的框架');
  assert.ok(TEXT.startsWith('# 第 11 章'), '正文首行不是本章章题');
});

test('结构量与正文快照一致', () => {
  assert.strictEqual(A.hanzi, 2796);
  assert.strictEqual(A.sections.length, 7);
  assert.strictEqual(A.tables, 2);
});

test('每节都有字，逐节相加不超过全篇', () => {
  for (const s of A.sections) assert.ok(s.hanzi > 0, s.title + ' 一节为空');
  const sum = A.sections.reduce((n, s) => n + s.hanzi, 0);
  assert.ok(sum > 0 && sum <= A.hanzi, `${sum} vs ${A.hanzi}`);
});

test('每个算式的结果都能对上正文写下的同一个数', () => {
  assert.ok(FIG.length >= 3, '算式太少：' + FIG.length);
  for (const f of FIG) {
    assert.ok(f.ok, `${f.name}：算得 ${f.got}，正文写 ${f.token}`);
    assert.ok(TEXT.includes(f.token), `正文里找不到 ${f.token}（${f.name}）`);
  }
});

test('特异度提高后假阳性减少、阳性预测值上升，且 PPV 仍小于一半', () => {
  const a = screening(PREV, SENS, SPEC);
  const b = screening(PREV, SENS, 0.999);
  assert.ok(b.fp < a.fp, '特异度提高应减少假阳性');
  assert.ok(b.ppv > a.ppv, '特异度提高应抬高阳性预测值');
  assert.ok(b.ppv < 0.5, '本例的 PPV 仍应小于一半——阳性不等于患病');
});

test('患病率越低，同样性能的阳性预测值越低', () => {
  const low = screening(1 / 50000, SENS, SPEC);
  const base = screening(PREV, SENS, SPEC);
  assert.ok(low.ppv < base.ppv, '低患病率下 PPV 更低');
  assert.ok(low.falsePerTrue > base.falsePerTrue, '每个真阳性旁的假阳性更多');
});

test('四件事、四类咨询与告知边界在正文里都有对应', () => {
  for (const s of ['筛查不是诊断', '未经同意的信息交付', '目前未找到病因', '保留其成年后自主决定的权利']) {
    assert.ok(TEXT.includes(s), `正文里找不到「${s}」`);
  }
});


test('脚本可运行，输出含现算口径与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /均从本章 docs\/zh\.md 现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes('汉字 ' + A.hanzi + ' 字'), '输出里的汉字数与快照不一致');
});
