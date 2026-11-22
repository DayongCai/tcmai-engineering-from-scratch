'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  readDoc,
  compartments,
  failureModes,
  locate,
  resolutionGain,
  cellsPerModel,
  collapseOrder,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');

test('正文可读，且是本章那一份', () => {
  const doc = readDoc();
  const hanzi = (doc.match(/[\u4e00-\u9fff]/g) || []).length;
  assert.ok(hanzi > 2000, `正文汉字过少: ${hanzi}`);
  assert.ok(doc.includes('细胞学说') && doc.includes('四个隔间'));
});

test('隔间表解析出 4 行，且每行判据非空', () => {
  const cs = compartments(readDoc());
  assert.strictEqual(cs.length, 4);
  for (const c of cs) {
    assert.ok(c.name.length >= 2, '隔间名缺失');
    assert.ok(c.test.length >= 4, `判据缺失: ${c.name}`);
    assert.ok(c.firstFailure.length >= 4, `先坏表现缺失: ${c.name}`);
  }
});

test('崩解次序与表内顺序一致：界 → 架 → 库 → 厂', () => {
  const order = collapseOrder(readDoc());
  assert.deepStrictEqual(order, ['细胞膜', '细胞骨架', '细胞核', '内膜系统与线粒体']);
});

test('反查能把症状落到正确隔间', () => {
  const doc = readDoc();
  assert.strictEqual(locate('梯度失守、水肿', doc).name, '细胞膜');
  assert.strictEqual(locate('变形、迁移不能', doc).name, '细胞骨架');
  assert.strictEqual(locate('分化丧失、增殖失控', doc).name, '细胞核');
  assert.strictEqual(locate('分泌停滞、缺氧性死亡', doc).name, '内膜系统与线粒体');
});

test('无关描述不被硬塞进某一隔间', () => {
  assert.throws(() => locate('今天门诊排了三十个号', readDoc()));
});

test('五种坏法全部来自正文，且各自指到章号', () => {
  const modes = failureModes(readDoc());
  assert.strictEqual(modes.length, 5);
  for (const m of modes) {
    assert.match(m.chapters, /\d/);
    assert.ok(m.essence.length >= 4);
  }
  assert.ok(modes.some((m) => m.mode === '边界失守'));
});

test('分辨率换算只用单位，不添实验数字', () => {
  const rg = resolutionGain(readDoc());
  assert.strictEqual(rg.um, 0.2);
  assert.strictEqual(rg.times, 200);
});

test('规模对照按 10^13 与「不到十种」现算', () => {
  const cm = cellsPerModel(readDoc());
  assert.strictEqual(cm.models, 10);
  assert.strictEqual(cm.perModel, 1e12);
});

test('脚本可跑，输出带口径与免责声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /崩解次序/);
  assert.match(out, /现抓现推/);
  assert.match(out, /不构成临床判断依据/);
});

test('代码不写死隔间名（改名后仍能跑）', () => {
  const body = fs.readFileSync(MAIN, 'utf8');
  assert.ok(!/const\s+NAMES\s*=/.test(body));
  assert.ok(body.includes('docs/zh.md'), '头部应指向本章正文');
});
