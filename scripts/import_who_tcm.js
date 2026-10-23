#!/usr/bin/env node
/**
 * 把 scripts/who_istt_extract.py match 产出的候选条目并入 who-tcm.json。
 *
 * 用法：
 *   node scripts/import_who_tcm.js <candidates.json>          # 并入
 *   node scripts/import_who_tcm.js --check                     # 只体检现有文件
 *
 * 只做**结构校验**，不做语义匹配（简繁转换与精确匹配在 python 一侧完成，
 * 因为 Node 侧没有汉字异体表）。任何一条不合格就整体拒绝写入 —— 不做"能进几条进几条"。
 *
 * 校验项：
 *   1. label 必须存在于 external.json（WHO 通道只给已入库的证名补代码，不新增证名）；
 *   2. whoCode 必须形如 x.y.z（三段），B02.05.04.04 这类医保/国标码在别处，不在本文件；
 *   3. whoEnglish 非空；classPathFromDict 至少两段（章·节），且**不含**跟代码同形的编号；
 *   4. label 不能重复；
 *   5. whoCnName 必须非空（原文中文名，供后来人回书复核）。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const P = (p) => path.join(ROOT, p);
const WHO = P('standards/semtensor/descriptions/who-tcm.json');
const EXT = P('standards/semtensor/descriptions/external.json');
const CODE = /^\d{1,2}\.\d{1,2}\.\d{1,3}$/;

function load() {
  return {
    who: JSON.parse(fs.readFileSync(WHO, 'utf8')),
    external: JSON.parse(fs.readFileSync(EXT, 'utf8')),
  };
}

function checkEntry(e, labels) {
  const errs = [];
  if (!e.label) errs.push('缺 label');
  else if (!labels.has(e.label)) errs.push(`label 不在 external.json：${e.label}`);
  if (!CODE.test(String(e.whoCode))) errs.push(`${e.label}: whoCode 不是 x.y.z（实为 ${e.whoCode}）`);
  if (!e.whoEnglish) errs.push(`${e.label}: 缺 whoEnglish`);
  if (!Array.isArray(e.classPathFromDict) || e.classPathFromDict.length < 2)
    errs.push(`${e.label}: classPathFromDict 至少两段（章·节）`);
  else if (e.classPathFromDict.some((s) => CODE.test(String(s).trim())))
    errs.push(`${e.label}: classPathFromDict 混入了代码样式的编号`);
  if (!e.whoCnName) errs.push(`${e.label}: 缺 whoCnName（原文中文名）`);
  if (!e.whoEdition) errs.push(`${e.label}: 缺 whoEdition`);
  return errs;
}

function main() {
  const arg = process.argv[2];
  const { who, external } = load();
  const labels = new Set(external.entries.map((e) => e.label));

  if (arg === '--check') {
    const seen = new Set();
    const errs = [];
    for (const e of who.entries) {
      errs.push(...checkEntry(e, labels));
      if (seen.has(e.label)) errs.push(`重复 label：${e.label}`);
      seen.add(e.label);
    }
    const codes = who.entries.map((e) => e.whoCode);
    // 同一代码挂在多个证名上是**合法的**（ICD-11 的「证名(部位)」与本证共用一条 WHO 术语），
    // 所以这里只报信息，不当错误。重复的 label 才算错（上面已查）。
    const dupCode = codes.filter((c, i) => codes.indexOf(c) !== i);
    console.log(`条目 ${who.entries.length} · 证名 ${seen.size} · 不同代码 ${new Set(codes).size}` +
      (dupCode.length ? ` · 共享代码 ${[...new Set(dupCode)].join(', ')}` : ''));
    if (errs.length) {
      console.log('✗ 体检不通过：');
      errs.forEach((x) => console.log('  -', x));
      process.exit(1);
    }
    console.log('✓ 体检通过');
    return;
  }

  if (!arg) {
    console.error('用法: node scripts/import_who_tcm.js <candidates.json> | --check');
    process.exit(2);
  }
  const cands = JSON.parse(fs.readFileSync(arg, 'utf8'));
  const haveLabels = new Set(who.entries.map((e) => e.label));
  const allErrs = [];
  const add = [];
  for (const c of cands) {
    if (haveLabels.has(c.label)) continue; // 已入库的证名不重复写
    const entry = {
      label: c.label,
      whoCode: c.whoCode,
      whoCnName: c.whoCnName,
      whoEnglish: c.whoEnglish,
      whoDefinitionEn: c.whoDefinitionEn || null, // 原文释义列对不齐时为 null，不拿邻条释义充数
      whoEdition: c.whoEdition,
      classPathFromDict: c.classPathFromDict,
      matchNote:
        c.matchType === 'exact'
          ? `原文中文名第 ${c.matchNameIndex + 1} 位与证名逐字一致`
          : `证名去括注后与原文中文名第 ${c.matchNameIndex + 1} 位逐字一致（括注不参与判定）`,
      source: c.source,
    };
    allErrs.push(...checkEntry(entry, labels));
    add.push(entry);
  }
  if (allErrs.length) {
    console.log('✗ 候选不通过，未写入：');
    allErrs.forEach((x) => console.log('  -', x));
    process.exit(1);
  }
  if (!add.length) {
    console.log('没有需要新增的条目');
    return;
  }
  // 已有条目保持原位（首条是 tests 的锚点），新增按代码排序追加
  const sorted = add.slice().sort((a, b) => {
    const pa = a.whoCode.split('.').map(Number);
    const pb = b.whoCode.split('.').map(Number);
    for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
    return a.label.localeCompare(b.label);
  });
  who.entries.push(...sorted);
  who.coverage.entries = who.entries.length;
  who.coverage.ofLabels = external.entries.length;
  who.coverage.distinctCodes = new Set(who.entries.map((e) => e.whoCode)).size;
  fs.writeFileSync(WHO, JSON.stringify(who, null, 2) + '\n', 'utf8');
  console.log(`✓ 写入 ${sorted.length} 条 · 现共 ${who.entries.length} 条 / 代码 ${who.coverage.distinctCodes} 个`);
  sorted.forEach((e) => console.log(`  ${e.whoCode}  ${e.label}  ← ${e.whoCnName}`));
}

main();
