#!/usr/bin/env node
/**
 * scripts/analyze_zhenduan_tm1_disorder_landing.js
 *   病名侧反查：ICD-11 TM1 的「病」（非 pattern 的 218 条），这本教材讲了多少种？
 *
 * 与 tm1-landing.js（证候侧 196 条）配对：
 *   证候侧问「教材的证候库有多全」，病名侧问「教材收了多少病种」。
 *
 * 口径（三档，写死可复核）：
 *   exact     病名在教材正文原样出现（含去掉尾字「病/证」的核心名）
 *   fragment  只有 ≥2 字词面片段（如「肝脾」），不构成收了该病
 *   none      连 2 字片段都没有
 *   残余类目（其他特指的/未特指的）先剔除。
 *
 * 必须写清的边界（否则这个数字会被误读成「教材缺 87 个病」）：
 *   《中医诊断学》以症、证为纲，不以病名为纲；病种收录少是**体裁**，不是缺陷。
 *
 * 输出：standards/zhenduan/tm1-disorder-landing.json / .md
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const BASE = path.join(ROOT, 'standards', 'zhenduan', '底本.json');
const BZU = path.join(ROOT, 'standards', 'zhenduan', 'bzu.json');
const ZH = path.join(ROOT, 'standards', 'icd11', 'zh-names.json');
const OUT_JSON = path.join(ROOT, 'standards', 'zhenduan', 'tm1-disorder-landing.json');
const OUT_MD = path.join(ROOT, 'standards', 'zhenduan', 'tm1-disorder-landing.md');
const SIBLING = path.join(ROOT, 'standards', 'zhenduan', 'tm1-landing.json');

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');

function lcs(a, b) {
  let best = '';
  for (let i = 0; i < a.length; i += 1) {
    for (let j = i + best.length + 1; j <= a.length; j += 1) {
      const s = a.slice(i, j);
      if (b.includes(s) && s.length > best.length) best = s;
    }
  }
  return best;
}

function textbookParas() {
  const doc = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  const out = [];
  for (const c of doc.chapters) {
    for (const p of c.paras || []) out.push({ loc: `教材·第${c.no}章`, text: p });
    for (const s of c.secs || []) {
      for (const p of s.paras || []) out.push({ loc: `教材·第${c.no}章·${s.no}`, text: p });
      for (const u of s.subs || []) {
        for (const p of u.paras || []) out.push({ loc: `教材·第${c.no}章·${u.no}`, text: p });
      }
    }
  }
  return out;
}

function build() {
  const paras = textbookParas();
  const text = paras.map((p) => p.text).join('');
  const doc = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  const bzu = JSON.parse(fs.readFileSync(BZU, 'utf8'));
  const bzuNames = new Set(
    bzu.units
      .filter((u) => /^BZ-B\d+-Z\d+$/.test(u.bzu || ''))
      .map((u) => String(u.bing || '').replace(/\s*\d?[A-Z]{1,2}\d[A-Z0-9]*(?:\.\d+)?\s*$/, '').trim()),
  );

  const all = JSON.parse(fs.readFileSync(ZH, 'utf8')).names.filter((n) => n.module === 'TM1' && !/pattern/i.test(n.en || ''));
  const residual = all.filter((n) => n.isResidual);
  const real = all.filter((n) => !n.isResidual);

  const rows = real.map((u) => {
    const name = String(u.zh || '').trim();
    // 病名**不做**去尾字：否则「肺热病」会被教材里的「肺热」顶替（那是病机，不是病）
    const core = name;
    const r = { code: u.code, zh: name, en: u.en, inBzu: bzuNames.has(name) };

    if (text.includes(name) || (core.length >= 2 && text.includes(core))) {
      const probe = text.includes(name) ? name : core;
      const hit = paras.find((p) => p.text.includes(probe));
      return { ...r, bucket: 'exact', probe, lcs: '', loc: hit ? hit.loc : '' };
    }
    const l = lcs(name, text);
    if (l.length >= 2) {
      const hit = paras.find((p) => p.text.includes(l));
      return { ...r, bucket: 'fragment', probe: l, lcs: l, loc: hit ? hit.loc : '' };
    }
    return { ...r, bucket: 'none', probe: '', lcs: '', loc: '' };
  });

  const tally = { exact: 0, fragment: 0, none: 0 };
  for (const r of rows) tally[r.bucket] += 1;

  // 与证候侧配对
  let sibling = null;
  if (fs.existsSync(SIBLING)) {
    const s = JSON.parse(fs.readFileSync(SIBLING, 'utf8'));
    sibling = { file: 'standards/zhenduan/tm1-landing.json', sha256: sha(SIBLING), stat: s.stat };
  }

  return {
    generated: '2026-10-28',
    inputs: {
      base: { file: 'standards/zhenduan/底本.json', sha256: sha(BASE), chapters: doc.chapters.length, chars: doc.counts.chars },
      zhNames: { file: 'standards/icd11/zh-names.json', sha256: sha(ZH) },
      bzu: { file: 'standards/zhenduan/bzu.json', sha256: sha(BZU) },
    },
    method: {
      question: 'ICD-11 TM1 的「病」，这本教材讲了多少种？',
      unitScope: `TM1 病 ${all.length} 条，剔除残余类目 ${residual.length} 条 → 实病 ${real.length} 条`,
      exact: '病名在教材正文原样出现（**不去尾字**：否则「肺热病」会被病机「肺热」顶替）',
      fragment: '只有 ≥2 字词面片段出现，不构成「收了该病」',
      none: '连 2 字片段都没有',
      limits: [
        '《中医诊断学》以症、证为纲，不以病名为纲——病种收录少是**体裁**，不是教材缺陷；不得据此声称「教材缺 N 个病」',
        'exact 只证明病名在教材里出现过（常作为举例或鉴别对象），不等于教材把它当独立病种立条',
        '词面法不做语义归并：教材写「喘」不算命中 TM1「喘证」',
      ],
    },
    stat: { disorders: all.length, residual: residual.length, real: real.length, tally, inBzu: rows.filter((r) => r.inBzu).length },
    sibling,
    rows,
  };
}

function toMd(d) {
  const s = d.stat;
  const t = s.tally;
  const pct = (n) => `${(n / s.real * 100).toFixed(1)}%`;
  const none = d.rows.filter((r) => r.bucket === 'none');
  const frag = d.rows.filter((r) => r.bucket === 'fragment');
  const L = [];
  L.push('# 病名侧反查：ICD-11 TM1 的病，这本教材讲了多少种');
  L.push('');
  L.push(`> 生成 ${d.generated} · 教材 \`${d.inputs.base.sha256.slice(0, 12)}\`（${d.inputs.base.chapters} 章 / ${d.inputs.base.chars.toLocaleString('en-US')} 字）· TM1 病 ${s.disorders} 条`);
  L.push('');
  L.push('## 一、结论数字');
  L.push('');
  L.push('| 项 | 值 |');
  L.push('|---|--:|');
  L.push(`| TM1 中的「病」（非 pattern） | ${s.disorders} |`);
  L.push(`| 剔除残余类目（其他特指的/未特指的） | ${s.residual} |`);
  L.push(`| **实病** | **${s.real}** |`);
  L.push(`| ① 教材原样出现（exact） | **${t.exact}**（${pct(t.exact)}） |`);
  L.push(`| ② 只有词面片段（fragment） | ${t.fragment}（${pct(t.fragment)}） |`);
  L.push(`| ③ **教材完全没有（none）** | **${t.none}**（${pct(t.none)}） |`);
  L.push(`| 其中被 BZU 病证单元表收录的病 | ${s.inBzu} |`);
  L.push('');
  if (d.sibling && d.sibling.stat && d.sibling.stat.tally) {
    const p = d.sibling.stat;
    L.push('## 二、与证候侧配对看');
    L.push('');
    L.push('| 维度 | 单位数 | 教材原样出现 | 中间档 | 完全没有 | 覆盖率 |');
    L.push('|---|--:|---|--:|---|--:|');
    L.push(`| 证候（pattern） | ${p.real} | ${p.tally.exact} | covered ${p.tally.covered} + fragment ${p.tally.fragment} | ${p.tally.none} | **${(p.tally.exact / p.real * 100).toFixed(1)}%** |`);
    L.push(`| 病（disorder） | ${s.real} | ${t.exact} | fragment ${t.fragment} | ${t.none} | **${pct(t.exact)}** |`);
    L.push('');
    L.push(`**证候覆盖率 ${(p.tally.exact / p.real * 100).toFixed(1)}%，病种覆盖率 ${pct(t.exact)}**——教材的证候库比病种库全一倍。`);
    L.push('这符合《中医诊断学》的体裁：以症、证为纲，病名只在辨证章节里作为举例或鉴别对象出现。');
    L.push('');
  }
  L.push('## 三、③ 教材完全没有的病（全部列出）');
  L.push('');
  L.push(`| TM1 码 | 病名 | 英文题名 | BZU 收录 |`);
  L.push('|---|---|---|---|');
  for (const r of none) L.push(`| ${r.code} | ${r.zh} | ${r.en} | ${r.inBzu ? '✓' : '—'} |`);
  L.push('');
  L.push(`这 ${t.none} 条是「ICD-11 立项、这本教材没提」的病。**但这不是缺陷**（见第五节）：`);
  L.push('它们是内、外、妇、儿、五官各科的具体病种，超出了一本诊断学教材的范围。');
  L.push('');
  L.push('## 四、② 只有词面片段的（构不成「收了该病」）');
  L.push('');
  L.push('| TM1 码 | 病名 | 教材片段 | 位置 |');
  L.push('|---|---|---|---|');
  for (const r of frag) L.push(`| ${r.code} | ${r.zh} | 「${r.probe}」 | ${r.loc || '—'} |`);
  L.push('');
  L.push('## 五、口径与边界');
  L.push('');
  L.push(`- ${d.method.unitScope}`);
  L.push(`- ${d.method.exact}`);
  L.push(`- ${d.method.fragment}`);
  L.push(`- ${d.method.none}`);
  for (const x of d.method.limits) L.push(`- ${x}`);
  L.push('');
  L.push('## 六、逐条结果');
  L.push('');
  L.push('| TM1 码 | 病名 | 档 | 命中内容 | 教材位置 | BZU |');
  L.push('|---|---|---|---|---|---|');
  const order = { exact: 0, fragment: 1, none: 2 };
  for (const r of [...d.rows].sort((a, b) => order[a.bucket] - order[b.bucket] || a.code.localeCompare(b.code))) {
    L.push(`| ${r.code} | ${r.zh} | ${r.bucket} | ${r.probe || '—'} | ${r.loc || '—'} | ${r.inBzu ? '✓' : '—'} |`);
  }
  return L.join('\n') + '\n';
}

function main() {
  const d = build();
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(OUT_JSON)) {
      console.log('[tm1-disorder] ✗ 缺 tm1-disorder-landing.json');
      return 1;
    }
    const prev = JSON.parse(fs.readFileSync(OUT_JSON, 'utf8'));
    const bad = [];
    if (prev.inputs.base.sha256 !== d.inputs.base.sha256) bad.push('底本.json 变了');
    for (const k of Object.keys(d.stat.tally)) {
      if ((prev.stat.tally[k] || 0) !== d.stat.tally[k]) bad.push(`${k} ${prev.stat.tally[k]} → ${d.stat.tally[k]}`);
    }
    if (bad.length) {
      console.log('[tm1-disorder] ✗ ' + bad.join('；'));
      return 1;
    }
    const t = d.stat.tally;
    console.log(`[tm1-disorder] ✓ 实病 ${d.stat.real}：exact ${t.exact} · fragment ${t.fragment} · none ${t.none}`);
    return 0;
  }
  fs.writeFileSync(OUT_JSON, JSON.stringify(d, null, 1) + '\n');
  fs.writeFileSync(OUT_MD, toMd(d));
  const t = d.stat.tally;
  console.log('═══ 病名侧反查（TM1 病 → 教材）═══');
  console.log(`  TM1 病 ${d.stat.disorders} − 残余 ${d.stat.residual} = 实病 ${d.stat.real}`);
  console.log(`  exact ${t.exact}（${(t.exact / d.stat.real * 100).toFixed(1)}%）· fragment ${t.fragment} · none ${t.none}`);
  console.log(`  BZU 收录 ${d.stat.inBzu} 个`);
  console.log('  → standards/zhenduan/tm1-disorder-landing.{json,md}');
  return 0;
}

if (require.main === module) process.exit(main());

module.exports = { build, toMd, lcs };
