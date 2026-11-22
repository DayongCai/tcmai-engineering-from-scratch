'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { readDoc, junctions, forceTo, permeable, tally, cascade, designRule } = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文是本章那一份', () => {
  const doc = readDoc();
  assert.ok(doc.includes('紧密连接') && doc.includes('钙黏蛋白'));
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2000, `汉字过少: ${hanzi}`);
});

test('连接表解析出 4 类，各列都非空', () => {
  const js = junctions(readDoc());
  assert.strictEqual(js.length, 4);
  for (const j of js) {
    assert.ok(j.name.length >= 2, '连接名缺失');
    assert.ok(j.skeleton.length >= 1, `骨架列缺失: ${j.name}`);
    assert.ok(j.duty.length >= 4, `功能列缺失: ${j.name}`);
  }
});

test('力往哪传：肌动蛋白两处、中间丝一处、无骨架一处', () => {
  const doc = readDoc();
  assert.deepStrictEqual(forceTo('肌动蛋白', doc), ['紧密连接', '黏着连接']);
  assert.deepStrictEqual(forceTo('中间丝', doc), ['桥粒']);
  assert.throws(() => forceTo('胶原', doc));
  assert.deepStrictEqual(tally(doc), { actin: 2, intermediate: 1, none: 1 });
});

test('可通的连接只有间隙连接，且带尺寸与电荷选择性', () => {
  const js = junctions(readDoc());
  assert.deepStrictEqual(permeable(readDoc()), ['间隙连接']);
  const gj = js.find((j) => j.name === '间隙连接');
  assert.match(gj.permeability, /选择性/);
});

test('紧密连接承双责：闸门 + 栅栏', () => {
  const tj = junctions(readDoc()).find((j) => j.name === '紧密连接');
  assert.match(tj.duty, /封闭细胞间隙/);
  assert.match(tj.duty, /阻止膜蛋白混杂/);
});

test('外渗级联四步，顺序从表内读出', () => {
  const cs = cascade(readDoc());
  assert.strictEqual(cs.length, 4);
  assert.match(cs[0].step, /捕获与滚动/);
  assert.match(cs[0].molecule, /选择素/);
  assert.match(cs[1].step, /激活/);
  assert.match(cs[2].step, /牢固黏附/);
  assert.match(cs[2].molecule, /整合素/);
  assert.match(cs[3].step, /穿越/);
});

test('设计原则在正文里确实成立', () => {
  const r = designRule(readDoc());
  assert.strictEqual(r.slowFirst, true);
  assert.strictEqual(r.strongSecond, true);
});

test('脚本可跑，输出含分类与原则', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /接到中间丝/);
  assert.match(out, /先弱而快降速 true/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码头部指向本章正文', () => {
  assert.ok(fs.readFileSync(MAIN, 'utf8').includes('/03-xibao-lianjie-yu-nianfu/docs/zh.md'));
});
