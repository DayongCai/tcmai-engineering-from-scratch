'use strict';

const assert = require('node:assert');
const test = require('node:test');
const {
  chapterShape, icdStatus, mappingQuality, bzuShape, coverage, BZU, BZU_CODE,
} = require('./main.js');

test('两章 3,446 字 = 全书 15.5%：第14章 2,139 字 + 第13章 1,307 字', () => {
  const s = chapterShape();
  assert.strictEqual(s.rows[0].chars, 2139);
  assert.strictEqual(s.rows[1].chars, 1307);
  assert.strictEqual(s.total, 3446);
  assert.ok(Math.abs(s.share - 3446 / 22215) < 1e-9);
  assert.ok(s.share > 0.15 && s.share < 0.16);
  assert.ok(s.share14 > 0.6, '第14章是主体');
});

test('ICD 命名 38 条 = 病行 20 + 证行 15 + 非数据行 3', () => {
  const i = icdStatus();
  assert.strictEqual(i.total, 38);
  assert.strictEqual(i.disease, 20);
  assert.strictEqual(i.zheng, 15);
  assert.strictEqual(i.nonData.length, 3);
  assert.strictEqual(i.disease + i.zheng + i.nonData.length, i.total);
});

test('状态分布：18 条挂 ICD-11（17 + 1 出血变体）·15 条 GB/T ·2 条待 WHO ·1 条「—」', () => {
  const i = icdStatus();
  const m = Object.fromEntries(i.distribution.map((d) => [d.status, d.count]));
  assert.strictEqual(m['ICD-11 第26章 TM1 已映射'], 17);
  assert.strictEqual(m['ICD-11 第26章 TM1 已映射 出血 8B21'], 1);
  assert.strictEqual(m['GB/T 16751.2-2021'], 15);
  assert.strictEqual(m['待 WHO 凭据核实(不臆造编码)'], 2);
  assert.strictEqual(m['—'], 1);
  assert.strictEqual(m['规范依据'], 1);
  assert.strictEqual(m['证候命名对齐 GB/T 16751.2-2021'], 1);
  assert.strictEqual(i.mapped, 18);
  assert.deepStrictEqual(i.pending.map((p) => p.name).sort(), ['胁痛', '痹证'].sort());
  assert.ok(i.pending.every((p) => p.icd === '—'), '待核实的行不许臆造编码');
});

test('已映射 18 条的映射质量：一致 7 / 修正细化 10 / 存疑 1，六成以上不是「填上就对」', () => {
  const q = mappingQuality();
  assert.strictEqual(q.total, 18);
  assert.strictEqual(q.clean, 7);
  assert.strictEqual(q.fixed, 10);
  assert.strictEqual(q.doubt, 1);
  assert.deepStrictEqual(q.doubtNames, ['水肿']);
  assert.ok(q.fixedNames.includes('眩晕') && q.fixedNames.includes('中风'));
  assert.ok(Math.abs(q.uncertainShare - 11 / 18) < 1e-9);
  assert.ok(q.uncertainShare > 0.6);
});

test('BZU 26 条：18 个病 / 16 个证，编码全匹配「BZ-B 病号 -Z 证号」，说明行留账', () => {
  const b = bzuShape();
  assert.strictEqual(b.rows, 26);
  assert.strictEqual(b.diseases, 18);
  assert.strictEqual(b.zhengs, 16);
  assert.strictEqual(b.uniqueCodes, 26);
  assert.strictEqual(b.allCoded, true);
  assert.strictEqual(b.dropped, 0);
  assert.deepStrictEqual(b.skipped, ['说明']);
  assert.strictEqual(new Set(b.perDisease.map((d) => d.name)).size, 18);
});

test('结构指标：平均 1.444 证/病，12 个病只有 1 个证，最多 3 个证', () => {
  const b = bzuShape();
  assert.ok(Math.abs(b.avgZhengPerDisease - 26 / 18) < 1e-9);
  assert.ok(Math.abs(b.avgDiseasePerZheng - 26 / 16) < 1e-9);
  assert.strictEqual(b.oneZheng.length, 12);
  assert.ok(b.oneZheng.includes('不寐') && b.oneZheng.includes('水肿'));
  assert.strictEqual(b.maxZheng, 3);
  assert.deepStrictEqual(b.maxZhengNames.sort(), ['胸痹', '胃脘痛'].sort());
  assert.strictEqual(b.perDisease.reduce((n, d) => n + d.n, 0), 26);
});

test('异病同证：痰湿阻肺证 / 肝阳上亢证 / 脾胃气虚证各覆盖 3 个病', () => {
  const b = bzuShape();
  const by = Object.fromEntries(b.shared.map((z) => [z.name, z]));
  assert.deepStrictEqual(by['痰湿阻肺证'].bing.sort(), ['咳嗽', '喘证', '哮病'].sort());
  assert.deepStrictEqual(by['肝阳上亢证'].bing.sort(), ['中风', '头痛', '眩晕'].sort());
  assert.strictEqual(by['肝阳上亢证'].n, 3);
  assert.strictEqual(by['脾胃气虚证'].n, 3);
});

test('覆盖缺口：20 个病名入表，18 个进单元；缺的胁痛/痹证恰是两条无 ICD-11 码的病', () => {
  const c = coverage();
  assert.strictEqual(c.inTable, 20);
  assert.strictEqual(c.inUnits, 18);
  assert.deepStrictEqual(c.missing.sort(), ['痹证', '胁痛'].sort());
  assert.strictEqual(c.missingArePending, true);
  assert.ok(Math.abs(c.share - 0.9) < 1e-9);
  const pending = BZU.icd.filter((r) => /待 WHO/.test(r.status)).map((r) => r.name);
  assert.deepStrictEqual(pending.sort(), c.missing.sort(), '缺口与待 WHO 行必须同一批');
});

test('复合键口径：bing 是「病名 + 码」，切空格才得病名；B 号与 ICD 表严格对齐（B14/B17 留空）', () => {
  const raw = new Set(BZU.units.map((u) => u.bing));
  assert.strictEqual(raw.size, 18);
  assert.ok([...raw].every((k) => /^.+ [A-Z0-9]{4}$/.test(k)), '每个 bing 都是「病名 CA00」式复合键');

  const icdB = new Map(BZU.icd.filter((r) => /^B\d+$/.test(r.code)).map((r) => [r.name, r.code.slice(1).padStart(2, '0')]));
  const bad = BZU.units.filter((u) => {
    const name = u.bing.split(/\s+/)[0];
    return u.bzu.match(/^BZ-B(\d+)-/)[1] !== icdB.get(name);
  });
  assert.deepStrictEqual(bad, [], 'BZU 的 B 号必须与 ICD 表的病序号一致');
  const usedB = new Set(BZU.units.map((u) => u.bzu.match(/^BZ-B(\d+)-/)[1]));
  assert.deepStrictEqual(['14', '17'].filter((n) => usedB.has(n)), [], 'B14/B17（胁痛/痹证）无单元行');

  const b = bzuShape();
  assert.strictEqual(b.zCodes, 15, '16 个证名只占 15 个证码');
  assert.strictEqual(b.sharedCode.length, 1);
  assert.strictEqual(b.sharedCode[0].z, 'Z05');
  assert.deepStrictEqual(b.sharedCode[0].names.sort(), ['脾胃气虚证', '脾胃气虚证(气虚血瘀)'].sort());
});
