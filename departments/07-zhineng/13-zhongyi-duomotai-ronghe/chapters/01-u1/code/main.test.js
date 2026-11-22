'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, parseDoc, analyze, aucRows, rateHz } = require('./main.js');

const text = () => fs.readFileSync(DOC, 'utf8');
const doc = () => parseDoc(text());

test('正文可解析：章号、标题、结构齐', () => {
  const d = doc();
  assert.strictEqual(d.chapterNo, 1);
  assert.match(d.title, /四诊本来就是多模态/);
  assert.ok(d.sections.length >= 4, `节数过少：${d.sections.length}`);
  assert.ok(d.tables.length >= 3, `表过少：${d.tables.length}`);
  assert.ok(d.hanzi > 2000, `汉字过少：${d.hanzi}`);
});

test('采样率跨度由量纲表现算，不写死', () => {
  const a = analyze(doc());
  assert.ok(a.rates['闻'] && a.rates['问']);
  assert.strictEqual(a.rates['闻'].hz, 16000);
  assert.strictEqual(a.rates['问'].hz, 0.01);
  assert.ok(Math.abs(a.span - 16 * 1000 / 0.01) < 1);
  assert.ok(a.span >= 1e6, `跨度不足：${a.span}`);
});

test('区间取下限：200–500 Hz 读成 200', () => {
  assert.strictEqual(rateHz('200–500 Hz'), 200);
  assert.strictEqual(rateHz('16 kHz 起'), 16000);
  assert.strictEqual(rateHz('离散事件（0.01–0.1 Hz）'), 0.01);
});

test('增益列可由单模态与融合列复算', () => {
  const rows = aucRows(doc());
  assert.ok(rows.length >= 3, `增益表行数过少：${rows.length}`);
  for (const r of rows) {
    const independent = r.fusion - Math.max(...r.singles);
    assert.ok(Math.abs(independent - r.stated) < 0.0015, `${r.plan} 的增益对不上`);
    assert.ok(Math.abs(r.derived - independent) < 1e-12);
  }
});

test('边际收益递减：第二路大于第三路', () => {
  const a = analyze(doc());
  assert.strictEqual(a.marginal.length, 2);
  assert.ok(a.marginal[0] > a.marginal[1], `未递减：${a.marginal}`);
  assert.ok(a.gains[1] > a.gains[0], '互补应高于冗余');
});

test('改正文的采样率，跨度随之变化（证明确实现算）', () => {
  const mutated = text().replace('16 kHz 起', '8 kHz 起');
  assert.notStrictEqual(mutated, text(), '替换未命中，正文表述可能已改');
  const a = analyze(parseDoc(mutated));
  assert.ok(Math.abs(a.span - 8 * 1000 / 0.01) < 1);
});

test('脚本可运行且输出含教学样例与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /跨度（闻 ÷ 问）/);
  assert.match(out, /边际收益/);
  assert.match(out, /不构成临床判断依据/);
});
