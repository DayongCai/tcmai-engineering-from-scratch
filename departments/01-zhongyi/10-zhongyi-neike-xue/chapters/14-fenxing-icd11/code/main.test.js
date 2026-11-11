'use strict';
/**
 * 第 14 章单测：锁住 docs/zh.md 里的每一个实数。
 * 这里的断言分两类：一类锁「统计口径」（不随数据变），一类锁「本版数据」（随 ICD-11 版本变）。
 * 后者改版时会红，红的时候先去核 sha256，再改数——不要直接改断言。
 */
const assert = require('node:assert');
const test = require('node:test');
const {
  ZN, ALIGN, NAMES, IS_RESIDUAL, key, nfkcDrift, tm1, diseaseNames, diseaseAlign, patternAlign,
  alignmentTable, specimens,
} = require('./main.js');

test('条目表规模：1,120 行 = TM1 472 + TM2 648；只有 472 条有中文名（TM2 整章无中文名）', () => {
  const t = tm1();
  assert.strictEqual(t.rows, 1120);
  assert.strictEqual(t.tm1, 472);
  assert.strictEqual(t.tm2, 648);
  assert.strictEqual(t.withZh, 472);
  assert.strictEqual(t.rows, t.tm1 + t.tm2);
  assert.strictEqual(NAMES.filter((n) => !n.zh).length, 648, 'TM2 在 WHO 中译本里没有中文名，源头缺');
});

test('TM1 按题名后缀分：病类目 216 + 证类目 254 + 其他 2 = 472', () => {
  const t = tm1();
  assert.strictEqual(t.disorder, 216);
  assert.strictEqual(t.pattern, 254);
  assert.strictEqual(t.other, 2);
  assert.strictEqual(t.disorder + t.pattern + t.other, t.withZh);
});

test('残类（码末 Y/Z）126 条，占 TM1 四分之一强 —— 同名命中很容易落进筐里', () => {
  const t = tm1();
  assert.strictEqual(t.residual, 126);
  assert.strictEqual(t.residualDisorder, 66);
  assert.strictEqual(t.residualPattern, 58);
  assert.ok(IS_RESIDUAL('SA7Y') && IS_RESIDUAL('SF0Z'));
  assert.ok(!IS_RESIDUAL('SA60'), '正常条目不算残类');
  assert.ok(126 / 472 > 0.25 && 126 / 472 < 0.28);
});

test('NFKC：7 条中文名带兼容汉字，不归一化就永远匹配不上', () => {
  const drift = nfkcDrift();
  assert.strictEqual(drift.length, 7);
  const sa9 = drift.find((x) => x.code === 'SA9Y');
  assert.ok(sa9, 'SA9Y 的「淋」是 U+F9F5');
  assert.strictEqual(sa9.norm, '其他特指的淋证');
  assert.notStrictEqual(sa9.raw, sa9.norm, '归一化前确实不同');
  assert.strictEqual(key('淋证'), key(sa9.norm.replace('其他特指的', '')), '归一化后能对上教材的写法');
  // 这条不打补丁的话，「淋证」会被判成「标准里没有这个概念」
  const lin = diseaseAlign().rows.find((r) => r.name === '淋证');
  assert.strictEqual(lin.kind, 'residual');
  assert.strictEqual(lin.code, 'SA9Y');
});

test('教材 63 个病名：32 逐字同名 / 7 只在残类上 / 24 无落点', () => {
  const d = diseaseAlign();
  assert.strictEqual(d.total, 63);
  assert.strictEqual(d.exact.length, 32);
  assert.strictEqual(d.residual.length, 7);
  assert.strictEqual(d.absent.length, 24);
  assert.strictEqual(d.exact.length + d.residual.length + d.absent.length, 63);
  const get = (n) => d.rows.find((r) => r.name === n);
  assert.strictEqual(get('感冒').code, 'SA60');
  assert.strictEqual(get('哮病').code, 'SA81', '哮喘在 TM1 叫「喘鸣」，不是 asthma');
  assert.strictEqual(get('不寐').code, 'SD84');
  assert.strictEqual(get('心悸').kind, 'residual');
  assert.strictEqual(get('心悸').code, 'SA1Y');
  assert.strictEqual(get('痹证').kind, 'absent', 'TM1 有行痹/痛痹/着痹，没有「痹证」');
});

test('教材 287 个证型：21 个逐字命中；246 个是规范证名，41 个是病名式或阶段式', () => {
  const p = patternAlign();
  assert.strictEqual(p.rows, 312);
  assert.strictEqual(p.unique, 287);
  assert.strictEqual(p.hitCount, 21);
  assert.strictEqual(p.canonical, 246);
  assert.strictEqual(p.nonCanonicalCount, 41);
  assert.strictEqual(p.canonical + p.nonCanonicalCount, p.unique);
  assert.ok(p.hit.includes('痰热壅肺证'));
  assert.ok(p.hit.includes('肝阳上亢证'));
  assert.ok(p.hit.includes('热入营分证'), 'SH01 的英文题名少一个空格，分类器要容错');
  assert.ok(p.nonCanonical.includes('气虚感冒'), '「气虚感冒」是病名式，不是证名式');
  assert.ok(p.nonCanonical.includes('成痈期'), '「成痈期」是阶段，不是证名');
});

test('现有对齐表：7 条合称全部无正名；丢弃的 7 个构件里 3 个有国家证名、4 个全表 0 命中', () => {
  const a = alignmentTable();
  assert.strictEqual(a.total, 7);
  assert.strictEqual(a.wholeNull, 7, '合称本身在国家证名表里一条正名都没有');
  assert.strictEqual(a.dropped, 7);
  assert.strictEqual(a.droppedStandard, 3);
  assert.strictEqual(a.droppedNonstandard, 4);
  const row = a.rows.find((r) => r.label.includes('肝火上炎'));
  assert.strictEqual(row.standardName, '肝火上炎证');
  assert.strictEqual(row.code, 'B04.02.01.02.02.02');
  assert.ok(ALIGN.$rule.some((r) => r.includes('首构件')), '口径写在 $rule 里，不是口头的');
});

test('标本一 痹证：教材的病名层在 TM1 里不存在，而它的分型在 TM1 里是独立病类目', () => {
  const s = specimens();
  assert.strictEqual(s.bi.kind, 'absent');
  const byCode = Object.fromEntries(s.bCodes.map((c) => [c.code, c.zh]));
  assert.strictEqual(byCode.SC50, '痛痹');
  assert.strictEqual(byCode.SC51, '行痹');
  assert.strictEqual(byCode.SC52, '着痹');
  assert.strictEqual(byCode.SC5Y, '其他特指的痹病');
  assert.strictEqual(byCode.SC5Z, '未特指的痹病');
});

test('标本二 消渴：TM1 有 SD71，但它与第 5 章的糖尿病（5A11）是两个并列实体', () => {
  const s = specimens();
  assert.deepStrictEqual(s.xiaoke.map((x) => x.code), ['SD71']);
  assert.strictEqual(s.xiaoke[0].en, 'Wasting thirst disorder (TM1)');
  // 5A11 不在第 26 章条目表里 —— 本章不拿它来凑数
  assert.ok(!NAMES.some((n) => n.code === '5A11'), '5A11 属第 5 章（内分泌），不在第 26 章条目表');
});

test('病名取自第 4–11 章的节标题，共 63 个，与教材章结构一致', () => {
  const d = diseaseNames();
  assert.strictEqual(d.length, 63);
  assert.ok(d.every((x) => x.ch >= 4 && x.ch <= 11));
  assert.ok(d.some((x) => x.name === '感冒'));
  assert.ok(d.some((x) => x.name === '霍乱'));
  assert.strictEqual(new Set(d.map((x) => x.name)).size, 63, '教材 63 个病名不重名');
});
