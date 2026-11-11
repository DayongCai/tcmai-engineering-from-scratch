#!/usr/bin/env node
/**
 * 中医诊断学 · 第 11 章 证候规范化：ICD 命名 / BZU 单元层的结构清点
 * 课程: departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/11-zhenghou-guifan/docs/zh.md
 * 出处: 教材·第14章（2,139 字）+ 教材·第13章（1,307 字）；数据源 standards/zhenduan/bzu.json（只读）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章只做三件事，全部现算：
 *   1. ICD 命名 38 条的「状态分布」——18 条挂上 ICD-11，其余是 GB/T、待 WHO、表头/说明行；
 *   2. BZU 病证单元 26 条的「结构指标」——18 个病 / 16 个证 / 平均一病几个证；
 *   3. 覆盖缺口——20 个病入表，只有 18 个进了单元层，缺的恰是两条无 ICD-11 码的病。
 * 不做辨证判读，不给诊疗建议。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const DIR = path.join(ROOT, 'standards', 'zhenduan');
const BOOK = JSON.parse(fs.readFileSync(path.join(DIR, '底本.json'), 'utf8'));
const BZU = JSON.parse(fs.readFileSync(path.join(DIR, 'bzu.json'), 'utf8'));

// BZU 行编码：BZ-B01-Z01（病序号 B01 × 证序号 Z01）
const BZU_CODE = /^BZ-B\d+-Z\d+$/;
const MAPPED = 'ICD-11 第26章 TM1';

// ── 一、两章的字数 ────────────────────────────────────────────────
function chapterShape() {
  const ch = (no) => BOOK.chapters.find((c) => c.no === no);
  const chars = (c) => (c.paras || []).join('').length
    + c.secs.reduce((n, s) => n + (s.paras || []).join('').length
      + s.subs.reduce((m, x) => m + x.paras.join('').length, 0), 0);
  const c14 = ch('14');
  const c13 = ch('13');
  const a = chars(c14);
  const b = chars(c13);
  const total = a + b;
  return {
    rows: [
      { no: '14', title: c14.title, secs: c14.secs.length, chars: a },
      { no: '13', title: c13.title, secs: c13.secs.length, chars: b },
    ],
    total,
    share: total / BOOK.counts.chars,
    share14: a / total,
  };
}

// ── 二、ICD 命名 38 条的状态分布 ──────────────────────────────────
function icdStatus() {
  const rows = BZU.icd;
  const status = new Map();
  for (const r of rows) status.set(r.status, (status.get(r.status) || 0) + 1);

  const disease = rows.filter((r) => /^B\d+$/.test(r.code));
  const zheng = rows.filter((r) => /^Z\d+$/.test(r.code));
  const nonData = rows.filter((r) => !/^[BZ]\d+$/.test(r.code));
  const mapped = rows.filter((r) => r.status.startsWith(MAPPED));

  return {
    total: rows.length,
    distribution: [...status.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((x, y) => y.count - x.count || x.status.localeCompare(y.status)),
    disease: disease.length,
    zheng: zheng.length,
    nonData: nonData.map((r) => ({ code: r.code, name: r.name })),
    mapped: mapped.length,
    pending: rows.filter((r) => /待 WHO/.test(r.status)).map((r) => ({ name: r.name, icd: r.icd })),
  };
}

// ── 三、已映射 18 条的映射质量（dbCheck 前缀）────────────────────
function mappingQuality() {
  const mapped = BZU.icd.filter((r) => r.status.startsWith(MAPPED));
  const bucket = { '✅': [], '🔧': [], '⚠️': [] };
  for (const r of mapped) {
    const k = r.dbCheck.startsWith('✅') ? '✅'
      : r.dbCheck.startsWith('🔧') ? '🔧'
        : r.dbCheck.startsWith('⚠️') ? '⚠️' : '?';
    (bucket[k] = bucket[k] || []).push(r);
  }
  const clean = (bucket['✅'] || []).length;
  const fixed = (bucket['🔧'] || []).length;
  const doubt = (bucket['⚠️'] || []).length;
  return {
    total: mapped.length,
    clean,
    fixed,
    doubt,
    cleanNames: (bucket['✅'] || []).map((r) => r.name),
    fixedNames: (bucket['🔧'] || []).map((r) => r.name),
    doubtNames: (bucket['⚠️'] || []).map((r) => r.name),
    uncertainShare: (fixed + doubt) / mapped.length,
  };
}

// ── 四、BZU 病证单元：26 行 / 18 病 / 16 证 ───────────────────────
function bzuShape() {
  const raw = BZU.units;
  const rows = raw.filter((u) => BZU_CODE.test(u.bzu));
  const dropped = raw.filter((u) => !BZU_CODE.test(u.bzu));

  // bing 是「病名 + 空格 + ICD 码」复合键（如「感冒 CA00」），切第一段才是病名
  const bing = (u) => u.bing.split(/\s+/)[0];
  const perDisease = new Map();
  for (const u of rows) {
    if (!perDisease.has(bing(u))) perDisease.set(bing(u), []);
    perDisease.get(bing(u)).push(u.zheng);
  }
  const perZheng = new Map();
  for (const u of rows) {
    if (!perZheng.has(u.zheng)) perZheng.set(u.zheng, []);
    perZheng.get(u.zheng).push(bing(u));
  }

  const counts = [...perDisease.entries()].map(([name, z]) => ({ name, zheng: z, n: z.length }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'zh'));
  const zCounts = [...perZheng.entries()].map(([name, b]) => ({ name, bing: b, n: b.length }))
    .sort((a, b) => b.n - a.n || a.name.localeCompare(b.name, 'zh'));

  // 编码里的 Z 号：16 个证名只占 15 个证码（兼夹写法复用同一码）
  const byCode = new Map();
  for (const u of rows) {
    const z = u.bzu.match(/Z(\d+)$/)[1];
    if (!byCode.has(z)) byCode.set(z, new Set());
    byCode.get(z).add(u.zheng);
  }
  const sharedCode = [...byCode.entries()]
    .filter(([, names]) => names.size > 1)
    .map(([z, names]) => ({ z: 'Z' + z, names: [...names] }));

  return {
    rows: rows.length,
    rawRows: raw.length,
    dropped: dropped.length,
    skipped: BZU.skipped || [],
    diseases: perDisease.size,
    zhengs: perZheng.size,
    perDisease: counts,
    perZheng: zCounts,
    avgZhengPerDisease: rows.length / perDisease.size,
    avgDiseasePerZheng: rows.length / perZheng.size,
    oneZheng: counts.filter((d) => d.n === 1).map((d) => d.name),
    maxZheng: counts[0].n,
    maxZhengNames: counts.filter((d) => d.n === counts[0].n).map((d) => d.name),
    allCoded: rows.every((u) => BZU_CODE.test(u.bzu)),
    uniqueCodes: new Set(rows.map((u) => u.bzu)).size,
    zCodes: byCode.size,
    sharedCode,
    shared: zCounts.filter((z) => z.n > 1),
  };
}

// ── 五、覆盖缺口：入 ICD 表的病 vs 进单元层的病 ────────────────────
function coverage() {
  const b = bzuShape();
  const inTable = BZU.icd.filter((r) => /^B\d+$/.test(r.code)).map((r) => r.name);
  const inUnits = new Set(b.perDisease.map((d) => d.name));
  const missing = inTable.filter((n) => !inUnits.has(n));
  const pending = BZU.icd.filter((r) => /待 WHO/.test(r.status)).map((r) => r.name);
  return {
    inTable: inTable.length,
    inUnits: inUnits.size,
    missing,
    missingArePending: missing.every((n) => pending.includes(n)),
    share: inUnits.size / inTable.length,
  };
}

function main() {
  const s = chapterShape();
  const icd = icdStatus();
  const q = mappingQuality();
  const b = bzuShape();
  const cov = coverage();

  console.log('═══ 一、两章字数（教材·第14章 + 教材·第13章）═══');
  for (const r of s.rows) console.log(`  第${r.no}章 ${r.title}：${r.secs} 节 · ${r.chars} 字`);
  console.log(`  合计 ${s.total} 字 = 全书 ${(s.share * 100).toFixed(1)}%；第14章占 ${(s.share14 * 100).toFixed(1)}%`);
  console.log('');

  console.log(`═══ 二、ICD 命名 ${icd.total} 条的状态分布 ═══`);
  for (const d of icd.distribution) console.log(`  ${String(d.count).padStart(2)} 条  ${d.status}`);
  console.log(`  构成：病行 ${icd.disease} + 证行 ${icd.zheng} + 非数据行 ${icd.nonData.length} = ${icd.total}`);
  console.log(`  其中带 ICD-11 映射 ${icd.mapped} 条；待 WHO 凭据核实 ${icd.pending.length} 条（${icd.pending.map((p) => p.name).join('、')}）`);
  console.log('');

  console.log(`═══ 三、已映射 ${q.total} 条的映射质量 ═══`);
  console.log(`  ✅ 一致 ${q.clean} 条：${q.cleanNames.join('、')}`);
  console.log(`  🔧 修正/细化 ${q.fixed} 条：${q.fixedNames.join('、')}`);
  console.log(`  ⚠️ 存疑 ${q.doubt} 条：${q.doubtNames.join('、')}`);
  console.log(`  → 需修正或存疑 ${q.fixed + q.doubt} 条 = ${(q.uncertainShare * 100).toFixed(1)}%：映射表不是「填上就完」`);
  console.log('');

  console.log(`═══ 四、BZU 病证单元 ${b.rows} 条 ═══`);
  console.log(`  表内 ${b.rawRows} 行，按「BZ-B 病号 -Z 证号」编码格式校验后剩余 ${b.rows} 行（过滤掉 ${b.dropped} 行）；说明行已由 builder 过滤，skipped 留账：[${b.skipped.join('、')}]`);
  console.log(`  不同病 ${b.diseases} 个 · 不同证 ${b.zhengs} 个 · 证码 ${b.zCodes} 个 · 编码唯一 ${b.uniqueCodes} 条 · 全匹配格式 ${b.allCoded}`);
  console.log(`  平均一个病 ${b.avgZhengPerDisease.toFixed(3)} 个证；平均一个证覆盖 ${b.avgDiseasePerZheng.toFixed(3)} 个病`);
  console.log(`  最多证：${b.maxZhengNames.join('、')}（各 ${b.maxZheng} 个证）`);
  console.log(`  只有 1 个证的病 ${b.oneZheng.length} 个：${b.oneZheng.join('、')}`);
  console.log('  病 → 证数：');
  for (const d of b.perDisease) console.log(`    ${d.name} ${d.n}：${d.zheng.join(' / ')}`);
  console.log('  异病同证（一个证覆盖多个病）：');
  for (const z of b.shared) console.log(`    ${z.name} ${z.n} 病：${z.bing.join('、')}`);
  console.log('');

  console.log('═══ 五、覆盖缺口：入表不一定入单元 ═══');
  console.log(`  ICD 表内病名 ${cov.inTable} 个，单元层覆盖 ${cov.inUnits} 个（${(cov.share * 100).toFixed(1)}%）`);
  console.log(`  缺口：${cov.missing.join('、')}${cov.missingArePending ? '——恰好是两条「待 WHO 凭据核实」的病' : ''}`);
  console.log('');

  console.log('  → 规范化不是「把名字填进表」：38 条里只有 18 条真挂上 ICD-11，26 条单元只覆盖 18 个病、16 个证。');
  console.log('  → 单元层给的是「病×证×病机×症状×治法」一行串，没有权重、没有舌脉分列，不能直接当辨证规则表。');
  console.log('');
  console.log('教学边界：本章只做教材配套病证单元表的结构清点与覆盖率计算，不做辨证判读、不判断任何人的病情，不构成诊断依据。编码映射仅为术语对齐记录，不构成诊疗建议。');
}

if (require.main === module) main();

module.exports = {
  chapterShape, icdStatus, mappingQuality, bzuShape, coverage,
  BOOK, BZU, BZU_CODE, MAPPED,
};
