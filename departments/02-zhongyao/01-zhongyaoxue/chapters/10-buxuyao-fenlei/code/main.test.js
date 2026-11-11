'use strict';
/**
 * 第 10 章（补虚药）章内单测
 *   node --test code/main.test.js
 *
 * 分五类：
 *   1. 规模       —— 教材级计数（节 / 小节 / 段 / 字）与药物单元数
 *   2. 结构       —— 四节名册、每节药味、小节与段的对应关系
 *   3. 教材原文核对 —— drugs.json 的字段与 底本.json 的段是否逐字相同
 *   4. 本仓库口径  —— 四气不压平、归经可重复计数
 *   5. 教学边界    —— main.js 运行时最后一行必须是边界声明
 */
const assert = require('node:assert');
const test = require('node:test');
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const m = require('./main.js');

// ---------- 1. 规模 ----------

test('规模：4 节 / 39 小节 / 117 段 / 7608 字', () => {
  const s = m.scale();
  assert.strictEqual(s.secs, 4);
  assert.strictEqual(s.subs, 39);
  assert.strictEqual(s.paras, 117);
  assert.strictEqual(s.chars, 7608);
});

test('规模：药物单元 39 味，且与 117 段对得上（每味 3 段）', () => {
  const s = m.scale();
  assert.strictEqual(s.drugs, 39);
  assert.strictEqual(s.paras, s.drugs * 3);
  assert.ok(s.charsPerDrug > 150 && s.charsPerDrug < 240, `平均每味 ${s.charsPerDrug} 字`);
});

// ---------- 2. 结构 ----------

test('结构：四节为 补气 9 / 补阳 11 / 补血 6 / 补阴 13，合计 39', () => {
  const secs = m.sections();
  assert.deepStrictEqual(secs.map((s) => s.no), ['25.1', '25.2', '25.3', '25.4']);
  assert.deepStrictEqual(secs.map((s) => s.title), ['补气药', '补阳药', '补血药', '补阴药']);
  assert.deepStrictEqual(secs.map((s) => s.drugs.length), [9, 11, 6, 13]);
  assert.strictEqual(secs.reduce((n, s) => n + s.drugs.length, 0), 39);
});

test('结构：小节数等于药味数，段数等于小节数 × 3', () => {
  for (const s of m.sections()) {
    assert.strictEqual(s.subs, s.drugs.length, `${s.no} 小节数与药味数不等`);
    assert.strictEqual(s.paras, s.subs * 3, `${s.no} 段数不等于小节数 × 3`);
  }
});

test('结构：补阳药 11 味全部归肾经（本节唯一共同归经）', () => {
  const yang = m.drugs().filter((d) => d.sec === '25.2');
  assert.strictEqual(yang.length, 11);
  const all = yang.every((d) => d.nature.guijing.includes('肾'));
  assert.ok(all, `未归肾的：${yang.filter((d) => !d.nature.guijing.includes('肾')).map((d) => d.name).join('、')}`);
});

// ---------- 3. 教材原文核对 ----------

test('教材原文：25.1.1 人参三段与 drugs.json 三个字段逐字相同', () => {
  const c = m.chapter();
  const sub = c.secs.find((s) => s.no === '25.1').subs.find((u) => u.no === '25.1.1');
  const d = m.drugs().find((x) => x.name === '人参');
  assert.strictEqual(sub.title, '人参');
  assert.strictEqual(sub.paras.length, 3);
  assert.strictEqual(sub.paras[0], d.fields['来源与性味归经']);
  assert.strictEqual(sub.paras[1], d.fields['功效与主治']);
  assert.strictEqual(sub.paras[2], d.fields['用法用量与使用注意']);
});

test('教材原文：人参首段含「性微温，味甘、微苦，归脾、肺、心、肾经」', () => {
  const n = m.natureOf('人参');
  assert.ok(n.sentence.includes('性微温，味甘、微苦，归脾、肺、心、肾经'), n.sentence);
  assert.strictEqual(n.sec, '25.1');
  assert.deepStrictEqual(n.guijing, ['脾', '肺', '心', '肾']);
});

// ---------- 4. 本仓库口径 ----------

test('口径：四气保留六档（微温 6 / 凉 2 / 平 10 / 温 10 / 微寒 9 / 寒 2），不压平成四档', () => {
  const got = Object.fromEntries(m.byQi().map((x) => [x.qi, x.n]));
  assert.deepStrictEqual(got, { 寒: 2, 微寒: 9, 凉: 2, 平: 10, 温: 10, 微温: 6 });
  assert.ok(!('热' in got), '本章无热药，缺项不应补 0');
});

test('口径：四气只在「阴 / 阳」这一刀上与分类同向，气 / 血两节挡不住寒温', () => {
  const tab = Object.fromEntries(m.crossTab().map((r) => [r.sec, r.qi.map((x) => x.qi)]));
  // 补阳无寒凉，补阴无温热
  assert.ok(!tab['25.2'].some((q) => ['寒', '微寒', '凉'].includes(q)), '补阳药出现了寒凉档');
  assert.ok(!tab['25.4'].some((q) => ['温', '微温', '热'].includes(q)), '补阴药出现了温热档');
  // 补气、补血都同时跨温档与寒凉档 —— 所以四气无法单独分出这两节
  assert.ok(tab['25.1'].includes('温') && tab['25.1'].includes('凉'));
  assert.ok(tab['25.3'].includes('温') && tab['25.3'].includes('微寒'));
});

test('口径：归经可重复计数，分项之和大于药味数', () => {
  const sum = m.jingCount().reduce((n, [, v]) => n + v, 0);
  assert.ok(sum > 39, `归经合计 ${sum} 未超过药味数`);
  const top = m.jingCount().slice(0, 2).map(([j]) => j);
  assert.deepStrictEqual(top, ['肾', '肺']); // 补虚药整体以肾、肺为首
});

// ---------- 5. 教学边界 ----------

test('教学边界：main.js 最后一行含「教学边界」与「不构成用药依据」', () => {
  const out = execFileSync('node', ['code/main.js'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });
  const last = out.trim().split('\n').filter(Boolean).pop();
  assert.ok(/教学边界/.test(last), last);
  assert.ok(/不构成用药依据/.test(last), last);
  assert.ok(/课程统计|检索/.test(last), last);
});
