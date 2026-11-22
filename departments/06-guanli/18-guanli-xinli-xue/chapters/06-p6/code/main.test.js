'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, concepts, gap, leaverParadox, predictivity, response } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '06-p6', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 6);
  assert.strictEqual(TITLE, '满意度问卷测的是填表那一刻的情绪，不是员工会不会走');
  assert.strictEqual(sections(TEXT).length, 6);
});

test('满意度五维、承诺三类、工作特征五项、四种误用逐条命中', () => {
  const c = concepts(TEXT);
  assert.deepStrictEqual(c.dims, ['工作本身', '报酬', '晋升机会', '上级监督', '同事关系']);
  assert.deepStrictEqual(c.commitments, ['情感承诺', '持续承诺', '规范承诺']);
  assert.deepStrictEqual(c.jobChars, ['技能多样性', '任务完整性', '任务重要性', '自主性', '反馈']);
  assert.deepStrictEqual(c.misuses, ['把满意当绩效', '把分数当诊断', '用调查代替对话', '调查后不行动']);
});

test('满意 82% 与愿留 54% 相差 28 个点', () => {
  const g = gap(82, 54);
  assert.strictEqual(g.points, 28);
  assert.strictEqual(g.ratio, 1.5185);
});

test('离职 61 人中 43 人曾勾满意 = 70.49%，判定为「不能当留任预测」', () => {
  const l = leaverParadox(61, 43);
  assert.strictEqual(l.share, 70.49);
  assert.match(l.verdict, /不能当留任预测/);
  assert.match(leaverParadox(61, 10).verdict, /可作参考/);
});

test('态度预测行为四条件：缺两条降为「只可作参考」', () => {
  assert.strictEqual(predictivity({ specific: true, directExp: false, lowPressure: false, freedom: true }).tier, '只可作参考');
  assert.strictEqual(predictivity({ specific: true, directExp: true, lowPressure: true, freedom: true }).tier, '可作行为预测');
  assert.strictEqual(predictivity({ specific: true, directExp: false, lowPressure: false, freedom: false }).tier, '只测到当时的情绪');
  assert.strictEqual(predictivity({ specific: true, directExp: true, lowPressure: false, freedom: false }).met, 2);
});

test('回收率低于六成判为有偏，68.67% 判为达标', () => {
  assert.strictEqual(response(600, 300, 82).biased, true);
  assert.strictEqual(response(600, 300, 82).rate, 50);
  assert.strictEqual(response(600, 412, 82).rate, 68.67);
  assert.strictEqual(response(600, 412, 82).biased, false);
});

test('正文里的关键判断可在原句核对', () => {
  for (const k of ['满意度是结果指标，不是管理指标', '组织的调查能力是一次性资源', '拉皮埃尔', '沙因']) {
    assert.ok(TEXT.includes(k), k);
  }
});

test('脚本可运行，输出满意率缺口与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /差 28 个点/);
  assert.match(out, /70\.49%/);
  assert.match(out, /敏感个人信息/);
});
