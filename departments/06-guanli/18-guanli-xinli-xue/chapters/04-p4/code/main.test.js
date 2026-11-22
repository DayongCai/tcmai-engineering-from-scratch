'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, concepts, explained, conditionalHit, fitForm, placementOrder, SEQUENCE } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '04-p4', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 4);
  assert.strictEqual(TITLE, '选人不是挑最好的，是挑最不容易在这个岗位上失败的');
  assert.strictEqual(sections(TEXT).length, 6);
});

test('大五、三关口、三原则逐条命中正文', () => {
  const c = concepts(TEXT);
  assert.deepStrictEqual(c.bigFive, ['开放性', '尽责性', '外向性', '宜人性', '神经质']);
  assert.deepStrictEqual(c.gates, ['信度', '效度', '常模']);
  assert.deepStrictEqual(c.principles, ['参照原则', '区间原则', '综合原则']);
  assert.strictEqual(c.hasFit, true);
});

test('0.2 的相关只解释 4% 的变异', () => {
  assert.deepStrictEqual(explained(0.2), { r: 0.2, r2: 0.04, pct: 4 });
  assert.strictEqual(explained(0.3).pct, 9);
  assert.strictEqual(explained(0.1).pct, 1);
});

test('二元正态：r=0.2 时条件命中率约 56.4%，比掷硬币多 6 个百分点', () => {
  const h = conditionalHit(0.2);
  assert.strictEqual(h.hit, 0.5641);
  assert.strictEqual(h.joint, 0.282);
  assert.ok(h.hit > 0.5 && h.hit < 0.6);
  assert.strictEqual(conditionalHit(0).hit, 0.5);
});

test('人岗匹配三形态：负担过重／适配／能力过剩', () => {
  assert.strictEqual(fitForm(1, 0.7).form, '负担过重');
  assert.strictEqual(fitForm(1, 1.05).form, '适配');
  assert.strictEqual(fitForm(0.5, 1).form, '能力过剩');
  assert.strictEqual(fitForm(1, 0.7).gap, -0.3);
});

test('三个落点按可靠性排序：配置 ＞ 筛选 ＞ 评价', () => {
  assert.deepStrictEqual(placementOrder(), ['配置', '筛选', '评价']);
});

test('选人顺序与法律底线在正文里', () => {
  assert.deepStrictEqual(SEQUENCE, ['岗位分析', '能力与特质要求', '选工具']);
  for (const k of ['就业促进法', '能力过剩', '结构化面试', '常模不可混用']) {
    assert.ok(TEXT.includes(k), k);
  }
});

test('脚本可运行，输出条件命中率与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /占 56\.4%/);
  assert.match(out, /配置 ＞ 筛选 ＞ 评价/);
  assert.match(out, /不构成人事决策意见/);
});
