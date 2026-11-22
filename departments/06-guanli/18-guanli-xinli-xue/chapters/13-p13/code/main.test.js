'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { DOC, CHAPTER, TITLE, read, sections, effect, favorability, pathGoal, timeBudget, lmx, concepts, TRANSFORM } = require('./main.js');

const TEXT = read();

test('正文文件就在本章目录下', () => {
  assert.ok(DOC.endsWith(path.join('chapters', '13-p13', 'docs', 'zh.md')), DOC);
  assert.ok(fs.existsSync(DOC));
  assert.strictEqual(CHAPTER, 13);
  assert.strictEqual(TITLE, '领导力不是一种人格，是一组被情境激活的关系');
  assert.strictEqual(sections(TEXT).length, 7);
});

test('变革型四成分与三个模型名都能在正文找到', () => {
  const c = concepts(TEXT);
  assert.deepStrictEqual(c.transform, TRANSFORM);
  assert.strictEqual(c.hasLPC, true);
  assert.strictEqual(c.hasLMX, true);
  assert.strictEqual(c.hasPathGoal, true);
});

test('r=0.3 只解释 9% 的变异，只能用于群体排序', () => {
  const e = effect(0.3);
  assert.strictEqual(e.explained, 9);
  assert.match(e.usableFor, /群体排序/);
  assert.match(effect(0.6).usableFor, /筛选/);
  assert.match(effect(0.1).usableFor, /不足以/);
});

test('费德勒：低 LPC 在两端有效，高 LPC 在中等有效', () => {
  const low = favorability({ relations: false, taskStructure: false, positionPower: false });
  assert.strictEqual(low.score, 0);
  assert.strictEqual(low.level, '极不利');
  assert.strictEqual(low.lowLPC, true);
  assert.strictEqual(low.highLPC, false);
  const mid = favorability({ relations: true, taskStructure: true, positionPower: false });
  assert.strictEqual(mid.level, '中等有利');
  assert.strictEqual(mid.highLPC, true);
  assert.strictEqual(mid.lowLPC, false);
  const high = favorability({ relations: true, taskStructure: true, positionPower: true });
  assert.strictEqual(high.level, '极有利');
  assert.strictEqual(high.lowLPC, true);
});

test('路径—目标：模糊给方向、枯燥给支持、能力强则减少干预', () => {
  assert.match(pathGoal({ taskAmbiguous: true, taskBoring: false, competence: 0.9 }).action, /指令型/);
  assert.match(pathGoal({ taskAmbiguous: false, taskBoring: true, competence: 0.9 }).action, /支持型/);
  assert.match(pathGoal({ taskAmbiguous: false, taskBoring: false, competence: 0.9 }).action, /授权型/);
  assert.match(pathGoal({ taskAmbiguous: false, taskBoring: false, competence: 0.4 }).action, /成就型/);
});

test('时间账：四类事占满 40 小时，科室建设默认被挤成 0', () => {
  const t = timeBudget();
  assert.strictEqual(t.build, 0);
  assert.match(t.verdict, /挤成 0/);
  const fixed = timeBudget(40, 4);
  assert.strictEqual(fixed.total, 44);
  assert.strictEqual(fixed.over, 4);
  assert.match(fixed.verdict, /固定时段/);
});

test('LMX 名单：圈外成员被点名，不靠满意度调查', () => {
  const l = lmx([
    { name: '甲', coreProjects: 3 },
    { name: '乙', coreProjects: 1 },
    { name: '丙', coreProjects: 0 },
  ]);
  assert.deepStrictEqual(l.outside, ['丙']);
  assert.strictEqual(l.share, 66.7);
  assert.match(l.flag, /丙/);
  assert.strictEqual(lmx([{ name: '甲', coreProjects: 1 }]).flag, '无长期圈外成员');
});

test('脚本可运行，输出效应量与边界声明', () => {
  const r = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'main.js')], {
    encoding: 'utf8',
    timeout: 60000,
  });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.match(out, /解释 9% 的变异/);
  assert.match(out, /科室建设 0/);
  assert.match(out, /不构成人事任免意见/);
});
