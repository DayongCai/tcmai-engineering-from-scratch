'use strict';
/**
 * 第 8 章 · 消渴与淋病 —— 确定性测试
 *
 *   node --test code/main.test.js
 *
 * 测试的作用不是给代码壮胆，是把 docs/zh.md 里的每个数字钉在底本上：
 * 任何一条数字改动（条文、方数、禁例、归型）都会同时打红测试，
 * 于是「文档说的」和「数据算的」不可能悄悄分家。
 */

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const m = require('./main.js');

const DOC = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');

/** 与 audit_curriculum.js 同一口径：围栏代码块外的正文才算数 */
function proseOf(text) {
  const out = [];
  let inFence = false;
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (!inFence) out.push(line);
  }
  return out.join('\n');
}

test('篇 13 规模：13 条 · 有方文 6 方 · 方文药味 19 · 597 字', () => {
  const r = m.report();
  assert.strictEqual(r.pian.no, 13);
  assert.strictEqual(r.pian.tiao, 13);
  assert.strictEqual(r.formulas.withText.length, 6);
  assert.strictEqual(r.formulas.herbTokens, 19);
  assert.strictEqual(r.pian.chars, 597);
});

test('13.11 三方齐备：蒲灰散 2 味 · 滑石白鱼散 3 味 · 茯苓戎盐汤 3 味（v2 补齐）', () => {
  const t11 = m.formulas().withText.filter((f) => f.tiao === '13.11');
  assert.deepStrictEqual(
    t11.map((f) => [f.name, f.herbs.length]),
    [['蒲灰散方', 2], ['滑石白鱼散方', 3], ['茯苓戎盐汤方', 3]]
  );
  assert.deepStrictEqual(t11[1].herbs, ['滑石', '乱发', '白鱼']);
  assert.deepStrictEqual(t11[2].herbs, ['茯苓', '白术', '戎盐弹丸大']);
});

test('主题分布：消渴 5 · 渴 5 · 淋 2 · 小便不利 1（合计 13，无漏条）', () => {
  const r = m.report();
  assert.deepStrictEqual(r.theme, { 消渴: 5, 渴: 5, 淋: 2, 小便不利: 1 });
  const sum = Object.values(r.theme).reduce((a, b) => a + b, 0);
  assert.strictEqual(sum, r.pian.tiao, '每条必须落进且只落进一个主题');
});

test('作用分布：方证 8 · 提纲 2 · 病机 2 · 禁例 1', () => {
  const r = m.report();
  assert.deepStrictEqual(r.role, { 提纲: 2, 方证: 8, 病机: 2, 禁例: 1 });
});

test('13.1 归提纲而非禁例，但禁令仍被 bans() 单列（重叠不丢信息）', () => {
  const row = m.classifyTiao().find((x) => x.tiao === '13.1');
  assert.strictEqual(row.role, '提纲');
  assert.ok(m.bans().some((b) => b.tiao === '13.1' && b.kind === '误下'));
});

test('三消归型 2/2/1/5，且明写「原文无此名」—— 归不进的不许硬塞', () => {
  const sx = m.xiaokeType();
  assert.deepStrictEqual(sx.上消, ['13.6', '13.12']);
  assert.deepStrictEqual(sx.中消, ['13.2', '13.8']);
  assert.deepStrictEqual(sx.下消, ['13.3']);
  assert.deepStrictEqual(sx.未归, ['13.1', '13.4', '13.5', '13.10', '13.13']);
  assert.ok(sx.note.includes('原文无此名'));
  // 归型作用域只含消渴/渴两类，淋病与纯小便不利不得进入三消
  assert.strictEqual(sx.scope.length, 10);
  assert.ok(!sx.scope.includes('13.7') && !sx.scope.includes('13.11'));
});

test('淋病判据 3 条 + 误治转归 1 条，且全篇无一方治淋', () => {
  const signs = m.linSigns();
  const base = signs.filter((s) => s.sign !== '误治转归');
  assert.deepStrictEqual(base.map((s) => s.text), ['小便如粟状', '小腹弦急', '痛引脐中']);
  assert.ok(base.every((s) => s.tiao === '13.7'));
  const turn = signs.filter((s) => s.sign === '误治转归');
  assert.strictEqual(turn.length, 1);
  assert.strictEqual(turn[0].tiao, '13.9');
  // 淋病两 13.7/13.9 均无方文
  for (const r of m.classifyTiao().filter((x) => x.theme === '淋')) {
    assert.deepStrictEqual(r.fangText, [], `${r.tiao} 不应带方文`);
  }
});

test('收支比：只有 13.3 可量化，1 斗入 / 1 斗出 = 1.00；其余 12 条 none', () => {
  const fb = m.fluidBalance();
  assert.strictEqual(fb.quantified, 1);
  assert.strictEqual(fb.total, 13);
  assert.strictEqual(fb.rows.length, 1);
  assert.deepStrictEqual(fb.rows[0], { tiao: '13.3', intake: 1, output: 1, ratio: 1 });
  assert.strictEqual(fb.rows[0].ratio, 1);
});

test('禁例 2 条：13.9 直禁（发汗→便血）与 13.1 误下（下之→不肯止）', () => {
  const b = m.bans();
  assert.strictEqual(b.length, 2);
  assert.deepStrictEqual(
    b.map((x) => [x.tiao, x.kind, x.action, x.after]),
    [['13.1', '误下', '下之', '不肯止'], ['13.9', '直禁', '发汗', '便血']]
  );
});

test('方口径：有方文 6 · 提名 9（10 处）· 提名而无方文 3', () => {
  const f = m.formulas();
  assert.deepStrictEqual(f.withText.map((x) => x.name), [
    '文蛤散方',
    '栝蒌瞿麦丸方',
    '蒲灰散方',
    '滑石白鱼散方',
    '茯苓戎盐汤方',
    '猪苓汤方',
  ]);
  assert.strictEqual(f.mentioned.length, 9);
  assert.strictEqual(f.mentionCount, 10, '五苓散在 13.4、13.5 各提名一次');
  assert.deepStrictEqual(f.refOnly.sort(), ['五苓散', '白虎加人参汤', '肾气丸'].sort());
  // 两个口径的分母不同：6 有方文 < 9 提名，差额正是 refOnly 三条
  assert.strictEqual(f.mentioned.length - f.withText.length, f.refOnly.length);
});

test('篇际分工数字：第 14 篇 32 条 9 方（水气另立一篇）', () => {
  const sp = m.pianSplit();
  assert.deepStrictEqual(sp.pian13.tiao, 13);
  assert.strictEqual(sp.pian13.fang, 6);
  assert.strictEqual(sp.pian14.tiao, 32);
  assert.strictEqual(sp.pian14.fang, 9);
  // 9 方逐名钉住：14.25 越婢加术汤 / 甘草麻黄汤、14.26 麻黄附子汤 / 杏子汤
  // 三条并列条被 v2 切开，是 7→9 的两个增量来源。
  const names = m.PIAN_SHUIQI.articles.flatMap((a) => (a.formulas || []).map((x) => x.nameSimp));
  assert.strictEqual(names.length, 9);
  for (const n of ['越婢加术汤方', '甘草麻黄汤方', '麻黄附子汤方', '杏子汤方']) {
    assert.ok(names.includes(n), `14 篇缺 ${n}`);
  }
});

test('docs/zh.md 逐字包含 13 条首句 —— 凭记忆写条文在这里就红', () => {
  for (const a of m.PIAN.articles) {
    assert.ok(DOC.includes(m.head(a)), `${a.tiao} 的条文首句未在 docs 中逐字出现`);
  }
  assert.ok(DOC.includes('原文无此名'), 'docs 必须明写三消原文无此名');
  assert.ok(DOC.includes('《金匮要略·消渴小便利淋病脉证并治第十三》'), 'docs 缺篇级引文');
});

test('docs/zh.md 正文（代码块外）去空白 ≥ 1500 字', () => {
  const n = proseOf(DOC).replace(/\s/g, '').length;
  assert.ok(n >= 1500, `实测 ${n} 字，未达 1500`);
});
