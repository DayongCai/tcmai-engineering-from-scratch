'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, gap, funnel, usageModes, sourceMix, concepts, CONFIDENTIALITY, ETHICS, CRISIS } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '16-p16', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 16);
  assert.strictEqual(TITLE, '心理服务的瓶颈不在咨询室，在门口');
  assert.strictEqual(sections(TEXT).length, 8);
});

test('四条伦理硬线与危机五步都能在正文找到', () => {
  const c = concepts(TEXT);
  assert.deepStrictEqual(c.ethics, ETHICS);
  assert.deepStrictEqual(c.crisis, CRISIS);
  assert.strictEqual(c.hasEAP, true);
  assert.strictEqual(c.hasLaw, true);
  assert.strictEqual(c.hasPIPL, true);
});

test('困扰 21% 与使用 1.8% 差 19.2 个点，到达 8.6%', () => {
  const g = gap(21, 1.8);
  assert.strictEqual(g.points, 19.2);
  assert.strictEqual(g.reach, 8.6);
  assert.match(g.verdict, /查入口/);
});

test('漏斗：每级转化率可算，瓶颈在首访这一环', () => {
  const f = funnel([
    { stage: '覆盖人群', n: 1000 },
    { stage: '有意愿', n: 210 },
    { stage: '完成预约', n: 63 },
    { stage: '实际首访', n: 18 },
  ]);
  assert.deepStrictEqual(f.steps.map((x) => x.conversion), [100, 21, 30, 28.6]);
  assert.strictEqual(f.overall, 1.8);
  assert.strictEqual(f.bottleneck.stage, '实际首访');
});

test('口径不可比：按人数 1.8% vs 按人次 5.4%，差 3 倍', () => {
  const u = usageModes({ covered: 1000, users: 18, visits: 54 });
  assert.strictEqual(u.byPerson, 1.8);
  assert.strictEqual(u.byVisit, 5.4);
  assert.strictEqual(u.ratio, 3);
});

test('保密强度：不记录身份最强，机构持名单最弱', () => {
  assert.deepStrictEqual(CONFIDENTIALITY.map((x) => x.strength), [3, 2, 1]);
  assert.match(CONFIDENTIALITY[2].cost, /结构性原因/);
});

test('来源结构：自荐低于三成即判为只在被安排路径上运转', () => {
  assert.match(sourceMix({ self: 3, manager: 12, peer: 3 }).verdict, /被安排/);
  assert.strictEqual(sourceMix({ self: 3, manager: 12, peer: 3 }).selfShare, 16.7);
  assert.match(sourceMix({ self: 8, manager: 8, peer: 4 }).verdict, /自愿通道/);
});

test('脚本可运行，输出漏斗与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /差 19\.2 个点/);
  assert.match(out, /瓶颈在门口/);
  assert.match(out, /权限止于/);
});
