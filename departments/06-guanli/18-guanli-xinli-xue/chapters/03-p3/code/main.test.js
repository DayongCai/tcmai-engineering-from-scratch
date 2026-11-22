'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, boldLeads, concepts, fit, loop, audit, PROFILES, SCENES, distance } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '03-p3', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 3);
  assert.strictEqual(TITLE, '每一种人性假设，都是一份事先写好的免责声明');
  assert.ok(TEXT.startsWith('# 第 3 章'));
  assert.strictEqual(sections(TEXT).length, 6);
});

test('四条判准与六种假设都在正文里逐条命中', () => {
  const c = concepts(TEXT);
  assert.deepStrictEqual(c.criteria, ['经验可检验', '逻辑自洽', '实践有效', '伦理可接受']);
  assert.deepStrictEqual(c.classic, ['经济人', '社会人', '自我实现人']);
  assert.deepStrictEqual(c.patches, ['复杂人', '文化人', '道德人']);
  assert.strictEqual(c.hasX, true);
  assert.strictEqual(c.hasY, true);
});

test('加粗判断句可解析，且包含「假设会把人变成它以为的样子」', () => {
  const leads = boldLeads(TEXT);
  assert.ok(leads.length >= 12, String(leads.length));
  assert.ok(TEXT.includes('假设会把人变成它以为的样子'));
  assert.ok(leads.some((x) => x.includes('实践有效')));
});

test('先诊断再开方：四类场景各自落在一个不同的假设上', () => {
  const f = fit();
  assert.strictEqual(f['流水线分装'].best, '经济人');
  assert.strictEqual(f['科研攻关'].best, '自我实现人');
  assert.strictEqual(f['师承带教'].best, '社会人');
  assert.strictEqual(f['急诊抢救'].best, '经济人');
  const best = new Set(Object.values(f).map((x) => x.best));
  assert.ok(best.size >= 3, '四类场景不该被一个假设通吃');
  for (const r of Object.values(f)) assert.ok(r.d >= 0 && r.d < 1.2);
});

test('距离是对称的，且场景与自身距离为 0', () => {
  assert.strictEqual(distance(SCENES['科研攻关'], PROFILES['自我实现人']), distance(PROFILES['自我实现人'], SCENES['科研攻关']));
  assert.strictEqual(distance(PROFILES['经济人'], PROFILES['经济人']), 0);
});

test('自证循环三轮：监控单调升、判断空间单调降、职责外动作单调降', () => {
  const tr = loop();
  assert.strictEqual(tr.length, 3);
  assert.deepStrictEqual(tr.map((x) => x.supervise), [0.5, 0.7, 0.9]);
  assert.deepStrictEqual(tr.map((x) => x.space), [0.75, 0.5, 0.25]);
  for (let i = 1; i < tr.length; i += 1) {
    assert.ok(tr[i].extra < tr[i - 1].extra, '职责外动作应逐轮减少');
  }
  assert.ok(tr[0].supervise < tr[2].supervise);
});

test('判准体检：计件预设 3/4，缺「实践有效」', () => {
  const a = audit({ 经验可检验: true, 逻辑自洽: true, 实践有效: false, 伦理可接受: true });
  assert.strictEqual(a.score, 3);
  assert.match(a.verdict, /实践有效/);
  assert.match(audit({ 经验可检验: true, 逻辑自洽: true, 实践有效: true, 伦理可接受: true }).verdict, /四条齐/);
});

test('脚本可运行，输出场景匹配与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /科研攻关 → 自我实现人/);
  assert.match(out, /第 3 轮：监控 0\.9/);
  assert.match(out, /不构成人事处理或绩效分配意见/);
});
