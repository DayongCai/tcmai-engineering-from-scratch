#!/usr/bin/env node
/**
 * scripts/build_zhenduan_icd_corrections.js
 *   → standards/zhenduan/icd-corrections.md + icd-corrections.csv
 *
 * 从 icd-align.json（14 条病码的对账结果）生成「教材更正建议」交付件：
 * 一行一条，给：平台码 / 病名 / 原码 / 镜像题名 / 判定 / 建议动作 / 建议码 / 建议题名 / 复核要点。
 *
 * 为什么要单独出这份：
 *   对账只是「发现问题」，教材要改的是**具体格子**——原码写什么、该改成什么、改不了时该写什么注。
 *   所以按「动作」分组（保留 / 留码加注 / 换码 / 待定码 / 删码回查），每条都落到可执行的一步。
 *
 * 边界（写进产物，不许省）：
 *   镜像只有 2,394 条（非 MMS 全量），所以多数 conflict 只能指出「这码不对」，不能给正确码；
 *   建议码一律只来自镜像里确实存在、且题名对得上的实体。
 *
 * 用法：
 *   node scripts/build_zhenduan_icd_corrections.js
 *   node scripts/build_zhenduan_icd_corrections.js --check   # 与留档比对，数字一变即报错
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const ALIGN = path.join(ROOT, 'standards', 'zhenduan', 'icd-align.json');
const BZU = path.join(ROOT, 'standards', 'zhenduan', 'bzu.json');
const OUT_MD = path.join(ROOT, 'standards', 'zhenduan', 'icd-corrections.md');
const OUT_CSV = path.join(ROOT, 'standards', 'zhenduan', 'icd-corrections.csv');

/** 动作：把对账判定翻译成「教材那一格怎么改」 */
const ACTION = {
  ok: { code: '保留', how: '不改', note: '题名与病名指向同一实体，码可保留' },
  narrow: { code: '留码加注', how: '码不改，加一句口径注', note: '该实体是症状/体征或更宽的一类，非同名病；须注明层级差异' },
  conflict: { code: '待定码', how: '先删该码或标「待核」', note: '题名指向不同实体；镜像内无对应条目，不能凭猜给码' },
  missing: { code: '删码回查', how: '删码，回 WHO 原表重查', note: '该码在镜像里没有条目，属无效码或误抄' },
};

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

function build() {
  const align = JSON.parse(fs.readFileSync(ALIGN, 'utf8'));
  const bzu = JSON.parse(fs.readFileSync(BZU, 'utf8'));

  // bzu 里的原始单元格（哪个 sheet、哪一行），用于回填
  const rows = align.items.map((it, i) => {
    const src = bzu.icd.find((r) => String(r.code) === String(it.platformCode)) || {};
    const act = it.suggested ? { code: '换码', how: '把原码换成建议码', note: '镜像里确有对得上的实体' } : ACTION[it.verdict];
    return {
      no: i + 1,
      platformCode: it.platformCode,
      name: it.name,
      icd: it.icd,
      icdTitle: it.icdTitle,
      icdChapter: it.icdChapter,
      verdict: it.verdict,
      reason: it.reason,
      action: act.code,
      how: act.how,
      suggested: it.suggested || '',
      suggestedTitle: it.suggested ? (JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'icd11', 'definitions-en.json'), 'utf8')).entries[it.suggested] || {}).title || '' : '',
      // 该码在 bzu 里的原始写法（可能带码后注释，如「感冒 CA00」）
      rawCell: String(src.icd || ''),
      status: String(src.status || ''),
    };
  });

  const byAction = {};
  for (const r of rows) byAction[r.action] = (byAction[r.action] || 0) + 1;

  return {
    generated: '2026-10-28',
    source: {
      align: { file: 'standards/zhenduan/icd-align.json', sha256: sha(ALIGN) },
      bzu: { file: 'standards/zhenduan/bzu.json', sha256: sha(BZU) },
      mirror: { file: 'standards/icd11/definitions-en.json', entries: 2394 },
    },
    stat: {
      total: rows.length,
      byAction,
      fixable: rows.filter((r) => r.action === '换码').length,
      mustChange: rows.filter((r) => ['换码', '删码回查', '待定码'].includes(r.action)).length,
      keep: rows.filter((r) => r.action === '保留').length,
      keepWithNote: rows.filter((r) => r.action === '留码加注').length,
    },
    rows,
  };
}

function toMd(d) {
  const L = [];
  const s = d.stat;
  L.push('# 中医诊断学 · ICD-11 病码更正建议\n');
  L.push(`> 生成 ${d.generated} · 依据 \`${d.source.align.file}\`（\`${d.source.align.sha256.slice(0, 12)}\`）· 镜像 \`definitions-en.json\` ${d.source.mirror.entries} 条\n`);
  L.push('## 一、要改多少格\n');
  L.push('| 动作 | 条数 | 什么意思 |');
  L.push('|---|--:|---|');
  L.push(`| 保留 | ${s.keep} | 码没问题，一个字不改 |`);
  L.push(`| 留码加注 | ${s.keepWithNote} | 码能对上，但实体是症状/体征或更宽的一类，要加一句口径注 |`);
  L.push(`| **待定码** | ${s.byAction['待定码'] || 0} | 码指向别的病；镜像里没有对应条目，**不能凭猜给码**，先标「待核」 |`);
  L.push(`| **换码** | ${s.fixable} | 镜像里确有对得上的实体，直接换 |`);
  L.push(`| **删码回查** | ${s.byAction['删码回查'] || 0} | 该码在镜像无条目，属无效码或误抄 |`);
  L.push('');
  L.push(`**必须动的一共 ${s.mustChange} 格**（换码 ${s.fixable} + 待定码 ${s.byAction['待定码'] || 0} + 删码回查 ${s.byAction['删码回查'] || 0}），占 14 格的 ${(s.mustChange / s.total * 100).toFixed(1)}%。\n`);

  L.push('## 二、逐格建议（可直接对着改）\n');
  L.push('| # | 平台码 | 病名 | 原码 | 镜像题名 | 判定 | 动作 | 建议码 | 依据 |');
  L.push('|--:|---|---|---|---|---|---|---|---|');
  for (const r of d.rows) {
    L.push(`| ${r.no} | ${r.platformCode} | ${r.name} | ${r.icd} | ${r.icdTitle || '（无条目）'} | ${r.verdict} | **${r.action}** | ${r.suggested ? `\`${r.suggested}\` ${r.suggestedTitle}` : '—'} | ${r.reason} |`);
  }
  L.push('');

  L.push('## 三、按动作分的改法\n');
  const group = (act) => d.rows.filter((r) => r.action === act);
  L.push('### 3.1 换码（1 格，可直接改）\n');
  for (const r of group('换码')) {
    L.push(`- **${r.name}**：\`${r.icd}\` ${r.icdTitle} → \`${r.suggested}\` ${r.suggestedTitle}`);
    L.push(`  - 为什么：${r.reason}`);
  }
  L.push('');
  L.push('### 3.2 待定码（先标「待核」，不要猜）\n');
  L.push('这几条镜像里没有题名对得上的实体，只有「这个码指向别的东西」这一条确证。教材可先把码删掉或标「待核」，等拿到 MMS 全量表再定。\n');
  L.push('| 病名 | 原码 | 该码实际是什么 | 该码在 ICD-11 哪一章 |');
  L.push('|---|---|---|---|');
  for (const r of group('待定码')) L.push(`| ${r.name} | \`${r.icd}\` | ${r.icdTitle} | 第 ${r.icdChapter} 章 |`);
  L.push('');
  L.push('### 3.3 删码回查\n');
  L.push('| 病名 | 原码 | 处理 |');
  L.push('|---|---|---|');
  for (const r of group('删码回查')) L.push(`| ${r.name} | \`${r.icd}\` | 删码；回 WHO ICD-11 MMS 原表按病名重查（本仓库镜像无此条目） |`);
  L.push('');
  L.push('### 3.4 留码加注\n');
  L.push('码本身没错，错在「当成同名病用」。建议在该格后加注，注明层级：\n');
  L.push('| 病名 | 码 | 题名 | 该注什么 |');
  L.push('|---|---|---|---|');
  for (const r of group('留码加注')) L.push(`| ${r.name} | \`${r.icd}\` | ${r.icdTitle} | ${r.reason} |`);
  L.push('');
  L.push('### 3.5 保留\n');
  for (const r of group('保留')) L.push(`- ${r.name} → \`${r.icd}\` ${r.icdTitle}（不改）`);
  L.push('');

  L.push('## 四、复核方法（拿到这份建议的人自己验一遍）\n');
  L.push('```bash');
  L.push('# 1) 看某码在镜像里到底是什么');
  L.push(`node -e "const E=require('./standards/icd11/definitions-en.json').entries;console.log(E['MB51'])"`);
  L.push('# 2) 重跑对账，确认判定未过期');
  L.push('npm run zhenduan:icd');
  L.push('# 3) 重跑本交付件，确认建议未过期');
  L.push('node scripts/build_zhenduan_icd_corrections.js');
  L.push('# 4) 门：数字自洽 + 每条都有动作与依据');
  L.push('node tests/test_zhenduan_icd_corrections.js');
  L.push('```');
  L.push('');
  L.push('## 五、这份建议的边界（三条，缺一条就会误用）\n');
  L.push('1. **镜像不全**：`definitions-en.json` 只有 2,394 条（ICD-11 MMS 全量约 17,000），所以「待定码」只表示本镜像内查不到对应实体，**不等于 ICD-11 里没有**。');
  L.push('2. **只到题名层**：判定依据是英文题名，不是定义正文与索引词；`ok` 只表示名字对得上，不表示教材的病与 ICD-11 实体是同一诊断标准。');
  L.push('3. **不改教材**：本仓库只出建议，不动 `E:\\textbooks\\qhzy-中医诊断学.xlsx`；改与不改、怎么改由教材维护者决定。');
  L.push('');
  L.push('## 六、回填用 CSV\n');
  L.push('`standards/zhenduan/icd-corrections.csv`（UTF-8 带 BOM，Excel 直开不乱码），列为：');
  L.push('平台码 / 病名 / 原码 / 原码题名 / 判定 / 动作 / 建议码 / 建议题名 / 依据。可直接粘回工作簿的「icd」列旁边做对照。');
  return L.join('\n') + '\n';
}

function toCsv(d) {
  const head = ['平台码', '病名', '原码', '原码题名', '判定', '动作', '建议码', '建议题名', '依据'];
  const esc = (v) => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const lines = [head.join(',')];
  for (const r of d.rows) {
    lines.push([r.platformCode, r.name, r.icd, r.icdTitle, r.verdict, r.action, r.suggested, r.suggestedTitle, r.reason].map(esc).join(','));
  }
  return '\ufeff' + lines.join('\r\n') + '\r\n';
}

function main() {
  const d = build();
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUT_MD)) {
      console.log('[icd-corrections] ✗ 缺 icd-corrections.md');
      return 1;
    }
    const prev = fs.readFileSync(OUT_MD, 'utf8');
    const bad = [];
    if (!prev.includes(`\`${d.source.align.sha256.slice(0, 12)}\``)) bad.push('依据指纹变了（icd-align.json 已更新）');
    for (const [k, v] of Object.entries(d.stat.byAction)) {
      if (!prev.includes(`| **${k}** | ${v} |`) && !prev.includes(`| ${k} | ${v} |`)) bad.push(`动作「${k}」条数 ${v} 未出现在 md`);
    }
    if (bad.length) {
      console.log('[icd-corrections] ✗ ' + bad.join('；'));
      return 1;
    }
    console.log(`[icd-corrections] ✓ ${d.stat.total} 格 · 必改 ${d.stat.mustChange} · 换码 ${d.stat.fixable}`);
    return 0;
  }
  fs.writeFileSync(OUT_MD, toMd(d));
  fs.writeFileSync(OUT_CSV, toCsv(d), 'utf8');
  const s = d.stat;
  console.log('═══ 教材更正建议 ═══');
  console.log(`  ${s.total} 格：` + Object.entries(s.byAction).map(([k, v]) => `${k} ${v}`).join(' · '));
  console.log(`  必须动 ${s.mustChange} 格（${(s.mustChange / s.total * 100).toFixed(1)}%）：换码 ${s.fixable} · 待定 ${s.byAction['待定码'] || 0} · 删码 ${s.byAction['删码回查'] || 0}`);
  console.log('  → standards/zhenduan/icd-corrections.{md,csv}');
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { build, toMd, toCsv, ACTION };
