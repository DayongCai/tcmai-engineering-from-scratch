'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { DOC, SYNTAXES, HARD, loadDoc, sections, tables, blocks, audit } = require('./main.js');

test('正文存在且是补实过的（不是占位稿）', () => {
  assert.ok(fs.existsSync(DOC), '正文文件缺失：' + DOC);
  const md = loadDoc();
  assert.ok((md.match(/[\u4e00-\u9fff]/g) || []).length > 2000, '汉字过少，疑似占位稿');
  assert.ok(!/TODO|待补|占位稿/.test(md), '正文含占位标记');
});

test('六个小节都在，末节是代价与边界', () => {
  const heads = sections(loadDoc()).map((s) => s.heading);
  assert.strictEqual(heads.length, 7, '应为一节章首 + 六个小节');
  assert.match(heads[1], /病、证、症/);
  assert.match(heads[heads.length - 1], /代价与边界/);
});

test('四种判据句法在正文里都有定义，不是只提名字', () => {
  const md = loadDoc();
  const a = audit(md);
  for (const k of SYNTAXES) {
    assert.ok(a.syntaxCounts[k] >= 2, `${k} 出现次数过少：${a.syntaxCounts[k]}`);
    assert.match(md, new RegExp(`${k}式`), `${k} 未写成「${k}式」`);
  }
  assert.strictEqual(a.syntaxTableRows, 4, '句法表应给出四条');
  assert.strictEqual(a.syntaxesWithFailure, 4, '句法表应逐条写明典型失效');
});

test('三条硬判据写在同一节里，且各带处置办法', () => {
  const md = loadDoc();
  const a = audit(md);
  for (const k of HARD) assert.ok(a.hardCounts[k] >= 2, `${k} 在该节内出现不足`);
  const t = tables(md).find((x) => x.header.join('').includes('检验方法'));
  assert.ok(t, '缺「检验方法」表');
  assert.strictEqual(t.rows.length, 3, '三条硬判据应各占一行');
  for (const row of t.rows) assert.ok(row[1] && row[2], '每行都要有检验方法与处置');
});

test('示例证记录把判据句法保住了：required / scored / excluded_by 分列', () => {
  const a = audit();
  assert.strictEqual(a.recordError, '', '示例 JSON 无法解析');
  assert.deepStrictEqual(a.criteriaKeys.sort(), ['excluded_by', 'required', 'scored']);
  assert.strictEqual(a.split, true, 'required 与 scored 不能共用同一个数组');
  assert.strictEqual(a.evidenceState, 'sufficient');
});

test('体检结论无缺口', () => {
  const a = audit();
  assert.deepStrictEqual(a.missing, [], '仍有缺口：' + a.missing.join('；'));
});

test('统计口径现算：次数等于正文重数', () => {
  const md = loadDoc();
  const a = audit(md);
  for (const k of SYNTAXES) {
    assert.strictEqual(a.syntaxCounts[k], (md.match(new RegExp(k, 'g')) || []).length);
  }
  assert.ok(blocks(md, 'json').length >= 1, '示例 JSON 代码块缺失');
});

test('脚本可运行，输出含体检结论与边界声明', () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, 'main.js')], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /判据句法/);
  assert.match(out, /缺口 0 处/);
  assert.match(out, /不构成诊断或治疗建议/);
  assert.doesNotMatch(out, /模型(准确|F1|AUC)/, '不应出现模型跑分');
});
