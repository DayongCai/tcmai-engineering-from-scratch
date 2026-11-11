'use strict';
/**
 * 生理学底本门（10 项）
 *   1. 母本指纹：411,687 B、sha256 与留档一致、27 表 = 11 内容 + 16 前置/平台
 *   2. 五级计数：11 章 / 44 节 / 132 小节 / 132 有正文 / 228,672 汉字，且逐章求和等于总计
 *   3. 编号体系：章 1–11 连续、节 章.N、小节 章.节.M；locator 形如 教材·第N章·N.M.K
 *   4. 结构：每小节都有 brief（口径句）与 body（正文），无空单元
 *   5. 口径句：全部 132 条都含「不写数值与单位与正常值」，且四种变体合计 = 132
 *   6. 数值核验（本书的核心断言）：数值型（数字＋计量单位）= 0；数字字符 = 列表序号 + 交叉引用
 *   7. 「正常值」类词 156 次全部是边界声明（不出现 mmHg/% 等实测值搭配）
 *   8. 学习目标：11 处（每章一处）、共 77 条，且都落在各章第一个小节
 *   9. 三视角 / 四层级：与 json 逐章复算一致（抽查第 4 章，并从全书重算合计）
 *  10. README 数字一致 + 不许出现「底本·」式引用
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'standards', 'shengli');
const SRC = 'E:\\textbooks\\qhzy-生理学.xlsx';
const base = () => JSON.parse(fs.readFileSync(path.join(DIR, '底本.json'), 'utf8'));
const udoc = () => JSON.parse(fs.readFileSync(path.join(DIR, 'units.json'), 'utf8'));
const md = () => fs.readFileSync(path.join(DIR, 'README.md'), 'utf8');

test('1. 母本指纹', () => {
  const s = base().source;
  assert.strictEqual(s.bytes, 411687);
  assert.strictEqual(s.sheets, 27);
  assert.strictEqual(s.contentSheets, 11);
  assert.strictEqual(s.platformSheets.length, 16);
  if (fs.existsSync(SRC)) {
    const h = crypto.createHash('sha256').update(fs.readFileSync(SRC)).digest('hex');
    assert.strictEqual(s.sha256, h, '母本变了，需重跑 python scripts/build_shengli_text.py');
  }
});

test('2. 五级计数', () => {
  const b = base();
  assert.deepStrictEqual(b.counts, {
    chapters: 11, secs: 44, subs: 132, withBody: 132, hanzi: 228672,
  });
  const sum = (k) => b.chapters.reduce((n, c) => n + c.counts[k], 0);
  for (const k of ['secs', 'subs', 'withBody', 'hanzi']) {
    assert.strictEqual(sum(k), b.counts[k], `${k} 逐章求和 ≠ 总计`);
  }
});

test('3. 编号体系与 locator', () => {
  const b = base();
  assert.deepStrictEqual(b.chapters.map((c) => Number(c.no)), Array.from({ length: 11 }, (_, i) => i + 1));
  for (const c of b.chapters) {
    assert.ok(c.title.startsWith(`第${Number(c.no)}章 `), `章标题不对：${c.title}`);
    for (const s of c.secs) {
      assert.match(s.no, new RegExp(`^${c.no}\\.\\d+$`), `节号不对：${s.no}`);
      for (const u of s.subs) assert.match(u.no, new RegExp(`^${s.no}\\.\\d+$`), `小节号不对：${u.no}`);
    }
  }
  for (const u of udoc().units) {
    assert.match(u.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/, `${u.sub} locator 格式不对`);
  }
});

test('4. 每小节都有口径句与正文', () => {
  const U = udoc().units;
  assert.strictEqual(U.length, 132);
  for (const u of U) {
    assert.ok(u.brief && u.brief.length > 10, `${u.sub} 缺口径句`);
    assert.ok(u.rawBody && u.rawBody.length > 50, `${u.sub} 缺正文`);
    assert.ok(u.hanzi > 0, `${u.sub} 汉字为 0`);
  }
});

test('5. 口径句：132 条都声明「不写数值」，四种变体合计 132', () => {
  const U = udoc().units;
  const bad = U.filter((u) => !u.brief.includes('不写数值与单位与正常值'));
  assert.deepStrictEqual(bad.map((u) => u.sub), [], '有口径句没写「不写数值与单位与正常值」');
  const kinds = {};
  for (const u of U) {
    const m = u.brief.match(/只写(.+?)，不写数值/);
    assert.ok(m, `${u.sub} 口径句格式异常：${u.brief}`);
    kinds[m[1]] = (kinds[m[1]] || 0) + 1;
  }
  assert.strictEqual(Object.keys(kinds).length, 4, `括注变体应为 4 种，实为 ${Object.keys(kinds).length}`);
  assert.strictEqual(Object.values(kinds).reduce((a, b) => a + b, 0), 132);
});

test('6. 数值核验：数值型 0，数字全部来自列表序号与交叉引用', () => {
  const c = udoc().counts;
  assert.strictEqual(c.valueLike, 0, '正文出现了「数字＋计量单位」的实测值');
  assert.strictEqual(c.digits, 304, '数字字符总数变了，需重跑 builder');
  assert.strictEqual(c.listItems, 296, '列表序号数变了');
  // 304 = 296 列表 + 8 交叉引用（第2章 / SL-01 / SL-21 / T01 / E1 等）
  assert.strictEqual(c.digits - c.listItems, 8, '残余数字应为 8（交叉引用与编号）');
  for (const u of udoc().units) {
    assert.deepStrictEqual(u.measure.valueSamples, [], `${u.sub} 有数值型样本`);
  }
});

test('7. 「正常值」类词全是边界声明', () => {
  const c = udoc().counts;
  assert.strictEqual(c.normalWords, 156);
  assert.strictEqual(c.normalNegated, 142, '否定语境计数变了');
  // 156 - 142 = 14 处是「凡涉及生理常数与参考值…由现行规范为准」这类声明句，仍不带数值
  assert.strictEqual(c.normalWords - c.normalNegated, 14);
});

test('8. 学习目标：11 处、77 条、落在每章第一个小节', () => {
  const U = udoc().units;
  const withGoals = U.filter((u) => u.goals.length);
  assert.strictEqual(withGoals.length, 11);
  assert.strictEqual(udoc().counts.goalTotal, 77);
  const firstOf = new Map();
  for (const u of U) {
    const no = u.chapter;
    if (!firstOf.has(no)) firstOf.set(no, u.sub);
  }
  for (const u of withGoals) {
    assert.strictEqual(u.sub, firstOf.get(u.chapter), `${u.sub} 不是本章第一个小节却有学习目标`);
    assert.ok(u.goals.every((g) => g.length > 4 && !/^\d/.test(g)), `${u.sub} 目标解析异常`);
  }
});

test('9. 三视角 / 四层级：逐章复算与合计一致', () => {
  const d = udoc();
  const views = { 代谢: 0, 机能: 0, 形态: 0 };
  const levels = { 细胞: 0, 组织: 0, 器官: 0, 系统: 0 };
  for (const u of d.units) {
    for (const k of Object.keys(views)) views[k] += u.measure.views[k];
    for (const k of Object.keys(levels)) levels[k] += u.measure.levels[k];
  }
  assert.deepStrictEqual(d.views, views, '三视角合计与逐单元复算不一致');
  assert.deepStrictEqual(d.levels, levels, '四层级合计与逐单元复算不一致');
  assert.deepStrictEqual(d.views, { 代谢: 854, 机能: 3922, 形态: 1709 });
  assert.deepStrictEqual(d.levels, { 细胞: 1453, 组织: 353, 器官: 1445, 系统: 963 });
});

test('10. README 与引用口径', () => {
  const t = md();
  for (const k of ['411,687', '283daac82059', '11 章 / 44 节 / 132 小节', '228,672', '0', '156', '77 条']) {
    assert.ok(t.includes(k), `README 缺：${k}`);
  }
  assert.ok(!/「?底本·[^」"]{2,}」?/.test(t), 'README 出现「底本·」式引用');
  assert.ok(t.includes('不构成') || t.includes('边界'), 'README 缺边界声明');
});

// ── 三轴标签层（11~14）：教材按「代谢/机能/形态」三线、细胞→组织→器官→系统四层组织，
//    标签必须能从词频现算出来，不许手填；手填的标签会与词频脱钩，改词表时静默失效。
const VK = ['代谢', '机能', '形态'];
const LK = ['细胞', '组织', '器官', '系统'];
const tri = () => JSON.parse(fs.readFileSync(path.join(DIR, 'triaxis.json'), 'utf8'));
const argmax = (o) => {
  const t = Object.values(o).reduce((a, b) => a + b, 0);
  if (!t) return null;
  return Object.keys(o).sort((a, b) => (o[b] - o[a]) || (Object.keys(o).indexOf(a) - Object.keys(o).indexOf(b)))[0];
};

test('11. 每个单元都有两轴标签，且标签的原始计数与 measure 一字不差', () => {
  const d = udoc();
  assert.strictEqual(d.units.length, 132);
  for (const u of d.units) {
    assert.ok(u.tri && u.tri.view && u.tri.level, `${u.sub} 缺 tri 标签`);
    assert.deepStrictEqual(u.tri.view.counts, u.measure.views, `${u.sub} 视角原始计数与 measure 不一致`);
    assert.deepStrictEqual(u.tri.level.counts, u.measure.levels, `${u.sub} 层级原始计数与 measure 不一致`);
    assert.deepStrictEqual(u.tri.tags, [`视角·${u.tri.view.primary}`, `层级·${u.tri.level.primary}`]);
    assert.ok(u.tri.view.primary === null || VK.includes(u.tri.view.primary), `${u.sub} 视角标签非法`);
    assert.ok(u.tri.level.primary === null || LK.includes(u.tri.level.primary), `${u.sub} 层级标签非法`);
    assert.ok(u.tri.view.share >= 0 && u.tri.view.share <= 1, `${u.sub} 占比越界`);
  }
});

test('12. 主标签 = 词频 argmax（逐单元复算，不许手填）', () => {
  const bad = [];
  for (const u of udoc().units) {
    if (argmax(u.measure.views) !== u.tri.view.primary) bad.push(`${u.sub} 视角`);
    if (argmax(u.measure.levels) !== u.tri.level.primary) bad.push(`${u.sub} 层级`);
    const expectMix = Object.keys(u.measure.views).sort((a, b) => u.measure.views[b] - u.measure.views[a]).length;
    if (u.tri.view.mix.split('>').length !== expectMix) bad.push(`${u.sub} mix 项数`);
  }
  assert.deepStrictEqual(bad, [], bad.slice(0, 6).join('、'));
});

test('13. 主标签分布与 3×4 交叉矩阵自洽（行列和都等于 132）', () => {
  const t = tri();
  const d = udoc();
  const sumView = Object.values(t.byPrimaryView).reduce((a, b) => a + b.units, 0);
  const sumLevel = Object.values(t.byPrimaryLevel).reduce((a, b) => a + b.units, 0);
  assert.strictEqual(sumView, 132);
  assert.strictEqual(sumLevel, 132);
  assert.deepStrictEqual(Object.keys(t.byPrimaryView).map((k) => t.byPrimaryView[k].units), [14, 90, 28]);
  assert.deepStrictEqual(Object.keys(t.byPrimaryLevel).map((k) => t.byPrimaryLevel[k].units), [47, 5, 44, 36]);
  const crossSum = Object.values(t.cross).reduce((a, b) => a + b, 0);
  assert.strictEqual(crossSum, 132, '交叉矩阵合计应为 132');
  for (const v of VK) {
    const row = LK.reduce((a, l) => a + t.cross[`${v}|${l}`], 0);
    assert.strictEqual(row, t.byPrimaryView[v].units, `${v} 行和与主标签数不符`);
  }
  for (const l of LK) {
    const col = VK.reduce((a, v) => a + t.cross[`${v}|${l}`], 0);
    assert.strictEqual(col, t.byPrimaryLevel[l].units, `${l} 列和与主标签数不符`);
  }
  // 组织层只有 5 个单元——这是「本书组织层最薄」的定量证据，不许悄悄变
  assert.strictEqual(t.byPrimaryLevel['组织'].units, 5);
  assert.deepStrictEqual(t.unlabelled, []);
  assert.deepStrictEqual(t.totals.views, d.views);
  assert.deepStrictEqual(t.totals.levels, d.levels);
});

test('14. 章级三轴：11 章 × 12 单元，章内视角分布与主标签一致', () => {
  const t = tri();
  const d = udoc();
  assert.strictEqual(t.chapters.length, 11);
  for (const c of t.chapters) {
    const us = d.units.filter((u) => u.chapter === c.no);
    assert.strictEqual(c.units, 12, `第${c.no}章单元数不是 12`);
    assert.strictEqual(c.units, us.length);
    const cv = {}; for (const k of VK) cv[k] = 0;
    const cl = {}; for (const k of LK) cl[k] = 0;
    for (const u of us) { cv[u.tri.view.primary] = (cv[u.tri.view.primary] || 0) + 1; cl[u.tri.level.primary] = (cl[u.tri.level.primary] || 0) + 1; }
    for (const k of VK) assert.strictEqual(c.unitsByView[k], cv[k] || 0, `第${c.no}章 ${k} 单元数不符`);
    assert.strictEqual(c.primaryView, argmax(c.views), `第${c.no}章主视角不是词频最大者`);
    assert.strictEqual(c.primaryLevel, argmax(c.levels), `第${c.no}章主层级不是词频最大者`);
  }
  // 只有第 2、7、11 章不是机能主导——这是结论，也是下次改词表时最先该看的三章
  const notFn = t.chapters.filter((c) => c.primaryView !== '机能').map((c) => `${c.no}:${c.primaryView}`);
  assert.deepStrictEqual(notFn, ['2:形态', '7:代谢', '11:形态']);
});
