#!/usr/bin/env node
/**
 * scripts/import_shanghan_base.js — 《伤寒论底本》xlsx → 结构化底本 + 域表交叉核对
 *
 *   node scripts/import_shanghan_base.js            导入
 *   node scripts/import_shanghan_base.js --check    只核对不写文件
 *
 * 源：standards/shanghan/sources/伤寒论底本.xlsx（识典古籍刻本 v6，全文简体）
 * 形态：`00目录`（内序｜篇名｜域｜条数(段)｜字数）+ 每个分表 `条号｜段内句数｜简体正文`
 *
 * 产：
 *   standards/shanghan/底本.json          27 篇 · 逐条正文 · 按域聚合
 *   standards/shanghan/底本.md            人可读全本（按域/篇/条分层）
 *   standards/shanghan/cross-check.json   与既有 semtensor 伤寒域数据集逐域核对
 *
 * 为什么要做核对：本仓库此前的伤寒 9 域是从 `SHL_目录.json` 的 28 集**推**出来的。
 * 这份底本独立给出「域」这一列 —— 两个来源若一致，「9 域」就从推测变成有据；
 * 若不一致，必须把差异写出来，而不是让后来的读者以为只有一种说法。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { readWorkbook } = require('./lib_xlsx');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'standards', 'shanghan', 'sources', '伤寒论底本.xlsx');
const OUT = path.join(ROOT, 'standards', 'shanghan');
const CHECK_ONLY = process.argv.includes('--check');

if (!fs.existsSync(SRC)) {
  console.error(`✗ 缺源文件: ${path.relative(ROOT, SRC)}`);
  console.error('  这是源数据，必须先入库，否则本脚本不可复现。');
  process.exit(1);
}

const cell = (v) => String(v === undefined || v === null ? '' : v).trim();
const num = (v) => {
  const n = Number(cell(v).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const buf = fs.readFileSync(SRC);
const wb = readWorkbook(SRC);
const sha256 = crypto.createHash('sha256').update(buf).digest('hex');

// ── 目录表 ────────────────────────────────────────────────────────────

const toc = wb.sheets.find((s) => s.name.includes('目录'));
if (!toc) { console.error('✗ 找不到目录表'); process.exit(1); }

// 表头在第二行：内序 | 篇名 | 域 | 条数(段) | 字数
const header = toc.rows[1].map(cell);
const idxOf = (kw) => header.findIndex((h) => h.includes(kw));
const C = {
  no: idxOf('内序'), pian: idxOf('篇名'), domain: idxOf('域'),
  tiao: idxOf('条数'), chars: idxOf('字数'),
};
if (Object.values(C).some((i) => i < 0)) {
  console.error(`✗ 目录表头不符预期: ${JSON.stringify(header)}`);
  process.exit(1);
}

const pianList = [];
for (const row of toc.rows.slice(2)) {
  const no = num(row[C.no]);
  const pian = cell(row[C.pian]);
  if (!no || !pian) continue;
  pianList.push({ no, pian, domain: cell(row[C.domain]), tiao: num(row[C.tiao]), chars: num(row[C.chars]) });
}

// ── 分表：条号 | 段内句数 | 简体正文 ──────────────────────────────────

/** 分表名形如 `S02_辨痉湿暍脉证`；用内序对齐，不用名字猜 */
function sheetForNo(no) {
  const pref = `S${String(no).padStart(2, '0')}`;
  return wb.sheets.find((s) => s.name.startsWith(pref)) || null;
}

const missingSheets = [];
for (const p of pianList) {
  const sh = sheetForNo(p.no);
  if (!sh) { missingSheets.push(p.no); continue; }
  const rows = sh.rows;
  // 第 1 行是篇题横幅，第 2 行是表头
  const h = rows[1] ? rows[1].map(cell) : [];
  const ci = {
    no: h.findIndex((x) => x.includes('条号')),
    sent: h.findIndex((x) => x.includes('句数')),
    text: h.findIndex((x) => x.includes('正文')),
  };
  const items = [];
  for (const r of rows.slice(2)) {
    const t = cell(r[ci.text >= 0 ? ci.text : 2]);
    if (!t) continue;
    items.push({
      no: num(r[ci.no >= 0 ? ci.no : 0]) || items.length + 1,
      sentences: num(r[ci.sent >= 0 ? ci.sent : 1]) || 1,
      text: t,
    });
  }
  p.items = items;
  p.sheetName = sh.name;
  p.actualTiao = items.length;
  p.actualChars = items.reduce((a, it) => a + it.text.replace(/\s/g, '').length, 0);
}

// ── 按域聚合 ──────────────────────────────────────────────────────────

const domainMap = new Map();
for (const p of pianList) {
  if (!domainMap.has(p.domain)) {
    domainMap.set(p.domain, { name: p.domain, pianist: 0, declaredTiao: 0, actualTiao: 0, chars: 0, sheets: [] });
  }
  const d = domainMap.get(p.domain);
  d.pianist += 1;
  d.declaredTiao += p.tiao;
  d.actualTiao += p.actualTiao || 0;
  d.chars += p.chars;
  d.sheets.push(p.no);
}
const domains = [...domainMap.values()];

// ── 与既有 semtensor 伤寒域数据集逐域核对 ────────────────────────────

const refPath = path.join(ROOT, 'standards', 'semtensor', 'datasets', 'shanghan-domains.json');
let crossCheck = { available: false, note: '缺 standards/semtensor/datasets/shanghan-domains.json' };

if (fs.existsSync(refPath)) {
  const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  const refDomains = Array.isArray(ref.domains) ? ref.domains : [];
  const byName = new Map(refDomains.map((d) => [d.name, d]));

  const rows = domains.map((d) => {
    const r = byName.get(d.name);
    return {
      domain: d.name,
      basePianist: d.pianist,
      baseDeclaredTiao: d.declaredTiao,
      baseActualTiao: d.actualTiao,
      refTiao: r ? (r.tiao ?? null) : null,
      refEpisodes: r ? (r.episodes || []).length : null,
      tiaoAgree: r ? r.tiao === d.actualTiao : null,
      delta: r && typeof r.tiao === 'number' ? d.actualTiao - r.tiao : null,
    };
  });

  const onlyBase = domains.filter((d) => !byName.has(d.name)).map((d) => d.name);
  const onlyRef = refDomains.filter((r) => !domains.some((d) => d.name === r.name)).map((r) => r.name);
  const agree = rows.filter((r) => r.tiaoAgree === true).length;
  const differ = rows.filter((r) => r.tiaoAgree === false).length;

  crossCheck = {
    available: true,
    reference: 'standards/semtensor/datasets/shanghan-domains.json（由 SHL_目录.json 的 28 集推得）',
    base: 'standards/shanghan/底本.json（本底本 00目录 的「域」列，直接给定）',
    domainCountBase: domains.length,
    domainCountReference: refDomains.length,
    domainsAgreeOnName: domains.length - onlyBase.length,
    tiaoAgree: agree,
    tiaoDiffer: differ,
    onlyInBase: onlyBase,
    onlyInReference: onlyRef,
    rows,
    verdict: onlyBase.length === 0 && onlyRef.length === 0
      ? '域集合完全一致（两个独立来源）'
      : '域集合有差异，须人工裁定',
    note: '底本的「条」按分表内实际条目数计（actualTiao）；「声明条数」是目录列的原始值，'
        + '两者大多数相同，不一致处保留原始值以便复核。',
  };
}

// ── 输出 ──────────────────────────────────────────────────────────────

const totalTiao = pianList.reduce((a, p) => a + (p.actualTiao || 0), 0);
const totalChars = pianList.reduce((a, p) => a + (p.actualChars || 0), 0);

if (CHECK_ONLY) {
  console.log('═══ 《伤寒论底本》导入核对（不写文件）═══');
  console.log(`  源指纹     sha256 ${sha256.slice(0, 16)}…`);
  console.log(`  工作表     ${wb.sheets.length}`);
  console.log(`  篇         ${pianList.length} · 缺分表 ${missingSheets.length ? missingSheets.join(',') : '无'}`);
  console.log(`  条         ${totalTiao}（实测）· 目录声明 ${pianList.reduce((a, p) => a + p.tiao, 0)}`);
  console.log(`  字数       ${totalChars}（实测）· 目录声明 ${pianList.reduce((a, p) => a + p.chars, 0)}`);
  console.log(`  域         ${domains.length} → ${domains.map((d) => `${d.name}(${d.actualTiao})`).join(' · ')}`);
  if (crossCheck.available) {
    console.log(`  交叉核对   ${crossCheck.verdict}`);
    console.log(`             域名一致 ${crossCheck.domainsAgreeOnName}/${crossCheck.domainCountBase} · 条数一致 ${crossCheck.tiaoAgree} · 不一致 ${crossCheck.tiaoDiffer}`);
    crossCheck.rows.filter((r) => r.tiaoAgree === false).forEach((r) => {
      console.log(`               ${r.domain}: 底本 ${r.baseActualTiao} vs 旧推 ${r.refTiao}（差 ${r.delta > 0 ? '+' : ''}${r.delta}）`);
    });
  }
  process.exit(0);
}

fs.mkdirSync(OUT, { recursive: true });

const baseJson = {
  $generated: 'node scripts/import_shanghan_base.js',
  source: {
    file: 'standards/shanghan/sources/伤寒论底本.xlsx',
    edition: '识典古籍刻本 version 6（全文简体）',
    sha256,
    bytes: buf.length,
    sheets: wb.sheets.map((s) => s.name),
  },
  counts: {
    pian: pianList.length,
    tiao: totalTiao,
    chars: totalChars,
    domains: domains.length,
  },
  structure: '00目录（内序｜篇名｜域｜条数｜字数）+ 分表（条号｜段内句数｜简体正文）',
  domains,
  pian: pianList.map((p) => ({
    no: p.no, pian: p.pian, domain: p.domain, sheet: p.sheetName || null,
    declared: { tiao: p.tiao, chars: p.chars },
    actual: { tiao: p.actualTiao || 0, chars: p.actualChars || 0 },
    items: p.items || [],
  })),
};
fs.writeFileSync(path.join(OUT, '底本.json'), `${JSON.stringify(baseJson, null, 2)}\n`, 'utf8');

// 人可读全本
{
  const L = [];
  L.push('# 《伤寒论》底本', '');
  L.push(`> 识典古籍刻本 version 6（全文简体）· 由 \`scripts/import_shanghan_base.js\` 从 xlsx 解析生成，**请勿手改**。`, '');
  L.push(`> ${pianList.length} 篇 · ${totalTiao} 条 · ${totalChars} 字 · ${domains.length} 域`, '');
  L.push('| 域 | 篇数 | 条数 | 字数 |', '| --- | :-: | :-: | :-: |');
  for (const d of domains) L.push(`| ${d.name} | ${d.pianist} | ${d.actualTiao} | ${d.chars} |`);
  L.push('');
  let lastDomain = null;
  for (const p of pianList) {
    if (p.domain !== lastDomain) {
      L.push(`## 域：${p.domain}`, '');
      lastDomain = p.domain;
    }
    L.push(`### ${p.pian}`, '');
    for (const it of p.items || []) L.push(`${it.no}. ${it.text}`, '');
  }
  fs.writeFileSync(path.join(OUT, '底本.md'), `${L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`, 'utf8');
}

fs.writeFileSync(path.join(OUT, 'cross-check.json'), `${JSON.stringify({
  $generated: 'node scripts/import_shanghan_base.js',
  crossCheck,
}, null, 2)}\n`, 'utf8');

console.log('═══ 《伤寒论底本》导入完成 ═══');
console.log(`  源指纹   sha256 ${sha256.slice(0, 16)}…`);
console.log(`  篇/条     ${pianList.length} 篇 · ${totalTiao} 条 · ${totalChars} 字`);
console.log(`  域        ${domains.length} → ${domains.map((d) => `${d.name}(${d.actualTiao}条)`).join(' · ')}`);
console.log('  产物      standards/shanghan/{底本.json, 底本.md, cross-check.json}');
if (crossCheck.available) {
  console.log(`  交叉核对  ${crossCheck.verdict}`);
  console.log(`            域名一致 ${crossCheck.domainsAgreeOnName}/${crossCheck.domainCountBase} · 条数一致 ${crossCheck.tiaoAgree} · 不一致 ${crossCheck.tiaoDiffer}`);
  crossCheck.rows.filter((r) => r.tiaoAgree === false).forEach((r) => {
    console.log(`              · ${r.domain}: 底本 ${r.baseActualTiao} vs 旧推 ${r.refTiao}`);
  });
}
