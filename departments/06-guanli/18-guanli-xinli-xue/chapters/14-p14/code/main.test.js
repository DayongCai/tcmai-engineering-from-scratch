'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, concepts, adoption, contract, retention, ocb, reporting, LAYERS, QUESTIONS, COMMIT } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '14-p14', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 14);
  assert.strictEqual(TITLE, '文化不是墙上的标语，是没人监督时默认的那套做法');
  assert.strictEqual(sections(TEXT).length, 8);
});

test('沙因三层、三个诊断问题、承诺三成分逐条命中', () => {
  const c = concepts(TEXT);
  assert.deepStrictEqual(c.layers, LAYERS);
  assert.deepStrictEqual(c.questions, QUESTIONS);
  assert.deepStrictEqual(c.commit, COMMIT);
  assert.strictEqual(c.hasOCB, true);
  assert.strictEqual(c.hasContract, true);
});

test('培训 100% 与暗访行为 36.67% 相差 63.33 个点', () => {
  const a = adoption({ trainedRate: 100, passRate: 98, observed: 30, didIt: 11 });
  assert.strictEqual(a.behavior, 36.67);
  assert.strictEqual(a.gap, 63.33);
  assert.match(a.verdict, /脱节/);
});

test('上报 36 件 vs 200 件 = 18%，判为通道贵', () => {
  const r = reporting(36, 200);
  assert.strictEqual(r.share, 18);
  assert.match(r.read, /通道贵/);
  assert.match(reporting(180, 200).read, /接近常态/);
});

test('心理契约违约不对称：一次违约需 4 次履约才补平', () => {
  const k = contract(1, 4);
  assert.strictEqual(k.recoverNeeded, 4);
  assert.ok(k.net > 0);
  assert.strictEqual(contract(1, 2).net, -0.16);
  assert.match(contract(1, 2).verdict, /分内之事/);
});

test('留任 95% 两种拆法：认同型 vs 走不了型', () => {
  assert.strictEqual(retention({ rate: 95, emotionalShare: 0.7 }).emotional, 66.5);
  assert.match(retention({ rate: 95, emotionalShare: 0.7 }).verdict, /自愿/);
  assert.match(retention({ rate: 95, emotionalShare: 0.25 }).verdict, /心不在/);
  assert.deepStrictEqual(retention({ rate: 95, emotionalShare: 0.7 }).checks, ['主动离职意愿的分布', '内部推荐率']);
});

test('OCB 判定只看「不做会不会被扣分」', () => {
  assert.strictEqual(ocb({ voluntary: true, penalizedIfAbsent: false }).kind, '组织公民行为');
  assert.strictEqual(ocb({ voluntary: false, penalizedIfAbsent: true }).kind, '没写进岗位说明的岗位职责');
  assert.strictEqual(ocb({ voluntary: true, penalizedIfAbsent: true }).kind, '没写进岗位说明的岗位职责');
});

test('脚本可运行，输出三层诊断与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /暗访行为 36\.67%/);
  assert.match(out, /补平一次违约需 4 次履约/);
  assert.match(out, /文化变革是慢变量/);
});
