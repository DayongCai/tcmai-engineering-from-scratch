'use strict';
/**
 * scripts/report_component_recheck.js —— 生成「构件级弱证据」的重查清单
 *
 * 为什么要它：external.json 里已有 97/97 条证据，队列按 label 去重，`--next` 再也
 * 不会派到它们。但其中 12 条只是**构件级**（各构件分别被覆盖，没有任何一条来源
 * 同时写出全部构件）。要提升到整串级，只能人工指定重查：先 `--requery "<证名>"`
 * 退回队列，再 `--next` 取批重搜。这份清单就是那个"人工指定"的输入。
 *
 * 每条给三件事（全部可算，不含猜测）：
 *   1. 哪个构件由哪几条现有来源命中（下标对应 `sources[]`）；
 *   2. 该构件的写法在**全库 97 条、数百处来源**里被命中过几次 —— 越常用越值得再搜；
 *   3. 最终会用到的检索串（复用 external_batch.js 的 queryFor，含括注并入的规则）。
 *
 * 输出：standards/semtensor/descriptions/COMPONENT-RECHECK.md（人读，入库）
 *       standards/semtensor/descriptions/component-recheck.json（机器读）
 * 判定口径复用 scripts/lib_evidence_scope.js，不另写一套。
 */

const fs = require('node:fs');
const path = require('node:path');
const { classify, componentsOf, covers, evidenceText } = require('./lib_evidence_scope.js');
const { queryFor } = require('./external_batch.js');

const ROOT = path.resolve(__dirname, '..');
const EXT = path.join(ROOT, 'standards/semtensor/descriptions/external.json');
const OUT_MD = path.join(ROOT, 'standards/semtensor/descriptions/COMPONENT-RECHECK.md');
const OUT_JSON = path.join(ROOT, 'standards/semtensor/descriptions/component-recheck.json');

const ext = JSON.parse(fs.readFileSync(EXT, 'utf8'));
const allText = ext.entries.flatMap((e) => e.sources.map((s) => evidenceText(s)));

const hostOf = (u) => {
  try { return new URL(u).host.replace(/^www\./, ''); } catch { return ''; }
};

const rows = [];
for (const e of ext.entries) {
  const r = classify(e);
  if (r.scope !== 'component') continue;

  const parts = componentsOf(e.label);
  const own = e.sources.map((s) => evidenceText(s));

  const per = parts.map((p) => {
    const ownIdx = [];
    e.sources.forEach((s, i) => {
      if (covers(evidenceText(s), p)) ownIdx.push(i);
    });
    return {
      part: p,
      covered: ownIdx.length > 0,
      ownIdx,
      ownHits: ownIdx.length,
    };
  });
  // 「本库其它命中」= 其它 96 条的来源里写出该构件的次数（排除本条，否则自己给自己加分）
  for (const p of per) {
    let n = 0;
    for (const e2 of ext.entries) {
      for (const s of e2.sources) {
        if (e2 === e) continue;
        if (covers(evidenceText(s), p.part)) n += 1;
      }
    }
    p.libHitsExclOwn = n;
  }

  // 单条来源最多覆盖几个构件（离"整串级"还差多少）
  let bestIdx = -1;
  let bestCover = 0;
  e.sources.forEach((s, i) => {
    const c = parts.filter((p) => covers(evidenceText(s), p)).length;
    if (c > bestCover) { bestCover = c; bestIdx = i; }
  });

  const hosts = [...new Set(e.sources.map((s) => hostOf(s.url)).filter(Boolean))];

  // 瓶颈构件 = 库内最罕见的那一个（同级取本条命中更少的）——
  // 整串级要求"同一来源写出全部构件"，卡住进度的就是它
  const bottleneck = [...per].sort(
    (a, b) => (a.libHitsExclOwn - b.libHitsExclOwn) || (a.ownHits - b.ownHits),
  )[0];

  rows.push({
    label: e.label,
    parts,
    partsCount: parts.length,
    src: e.sources.length,
    per,
    bottleneck,
    bestIdx,
    bestCover,
    hosts,
    query: queryFor(e.label),
  });
}

// 排序：先按「最稀有构件的库内命中」升序（越稀有越难，放后面），同分按证名
const minHit = (r) => Math.min(...r.per.map((p) => p.libHitsExclOwn));
rows.sort((a, b) => (minHit(b) - minHit(a)) || a.label.localeCompare(b.label));

const md = [];
md.push('# 构件级证据重查清单（12 条）');
md.push('');
md.push('> 由 `node scripts/report_component_recheck.js` 从 `external.json` 生成，**不要手改**。');
md.push('> 判定口径见 `scripts/lib_evidence_scope.js` 与 `EVIDENCE-STANDARD.md`。');
md.push('');
md.push(`当前：**${rows.length} 条构件级**（全库 ${ext.entries.length} 条已入库；整串级 85 条、不合格 0 条）。`);
md.push('');
md.push('## 为什么这 12 条要单独重查');
md.push('');
md.push('队列按 `label` 去重 —— 一旦入库，`--next` 永不再派。这 12 条每个构件都有来源，');
md.push('但**没有任何一条来源同时写出全部构件**，所以只算构件级（弱证据）。');
md.push('提升路径只有一条：`--requery` 退回队列 → `--next` 重取 → 用表中的检索串再搜一遍，');
md.push('目标是找到"同一篇文献同段写出两个构件"的来源。');
md.push('');
md.push('## 怎么读表');
md.push('');
md.push('- **构件（本条命中 / 本库其它命中）**：前者=本条已有来源里有几条写出这个构件；');
md.push('  后者=**其它 96 条的来源**里出现该写法的次数 —— 是个可算的"这词在文献里常不常见"信号。');
md.push('  `0` 表示全库数百处来源一次都没写过，多半是 ICD-11 合称在中文文献没有对应写法，再搜容易空手。');
md.push('- **单条最强**：现有某一条来源最多覆盖几个构件（1/2 表示离整串级还差另一个构件）。');
md.push('- **检索串**：`queryFor()` 产出，括注已并入（部位/病种限定不能丢，丢了取回的就是通用证据）。');
md.push('');
md.push('## 清单');
md.push('');
md.push('| # | 证名 | 构件（本条/本库其它） | 瓶颈构件 | 单条最强 | 现有来源 | 重查检索串 |');
md.push('|---|---|---|---|---|---|---|');
rows.forEach((r, i) => {
  const parts = r.per.map((p) => `${p.part}（${p.ownHits}/${p.libHitsExclOwn}）`).join('、');
  const bn = `${r.bottleneck.part}（${r.bottleneck.libHitsExclOwn}）`;
  md.push(`| ${i + 1} | ${r.label} | ${parts} | ${bn} | ${r.bestCover}/${r.partsCount} | ${r.src} | \`${r.query}\` |`);
});
md.push('');
md.push('## 逐条明细（含来源下标与域名）');
md.push('');
rows.forEach((r, i) => {
  md.push(`### ${i + 1}. ${r.label}`);
  md.push('');
  r.per.forEach((p) => {
    const idx = p.ownIdx.length ? p.ownIdx.map((x) => `#${x}`).join(' ') : '—';
    md.push(`- **${p.part}** · 本条命中 ${p.ownHits} 条（${idx}）· 本库其它命中 ${p.libHitsExclOwn} 处`);
  });
  if (r.bestIdx >= 0) {
    md.push(`- 单条最强：来源 #${r.bestIdx}（覆盖 ${r.bestCover}/${r.partsCount}）`);
  }
  md.push(`- **重查重点**：${r.bottleneck.part}（本库其它命中 ${r.bottleneck.libHitsExclOwn} 处）—— 找到同时写出「${r.parts.join('＋')}」的同一篇文献即可升整串级`);
  md.push(`- 现有域名：${r.hosts.join(' · ') || '—'}`);
  md.push(`- 已用检索串：\`${r.query}\``);
  md.push(`- 重查命令：\`node scripts/external_batch.js --requery "${r.label}"\``);
  md.push('');
});

md.push('## 建议的推进顺序');
md.push('');
const easy = rows.filter((r) => minHit(r) > 0);
const hard = rows.filter((r) => minHit(r) === 0);
md.push(`1. **先打 ${easy.length} 条**（两个构件的写法在库内都出现过）：`);
if (easy.length) md.push(`   ${easy.map((r) => r.label).join('、')}`);
md.push(`2. **后打 ${hard.length} 条**（至少一个构件全库 0 命中，命中率低）：`);
if (hard.length) md.push(`   ${hard.map((r) => r.label).join('、')}`);
md.push('3. 每批不超过 6 条（`--next -n 6`），重查前先 `--requery`，避免一次性把 12 条都退回队列后取到不完整的一批。');
md.push('');
md.push('> 若重查后仍无"同一来源写全两构件"，不建议继续硬搜：这类合称在中文临床文献里没有通行写法，');
md.push('> 应在平台术语层做对齐（ICD-11 合称 → 文献通行证名），而不是把构件级证据反复重搜。');

fs.writeFileSync(OUT_MD, `${md.join('\n')}\n`, 'utf8');

const json = {
  $generated: 'scripts/report_component_recheck.js',
  $note: '构件级证据重查清单；重查流程 = --requery "<label>" → --next -n 6 → 检索 query → --import',
  generatedAt: new Date().toISOString(),
  total: ext.entries.length,
  componentCount: rows.length,
  entries: rows.map((r) => ({
    label: r.label,
    parts: r.per.map((p) => ({
      part: p.part,
      ownHits: p.ownHits,
      ownSourceIndexes: p.ownIdx,
      libHitsExclOwn: p.libHitsExclOwn,
    })),
    bestSourceIndex: r.bestIdx,
    bestCover: r.bestCover,
    sources: r.src,
    hosts: r.hosts,
    bottleneck: {
      part: r.bottleneck.part,
      libHitsExclOwn: r.bottleneck.libHitsExclOwn,
    },
    query: r.query,
    requeryCommand: `node scripts/external_batch.js --requery "${r.label}"`,
  })),
};
fs.writeFileSync(OUT_JSON, `${JSON.stringify(json, null, 2)}\n`, 'utf8');

console.log(`构件级 ${rows.length} 条 → ${OUT_MD}`);
console.log(`机器可读 → ${OUT_JSON}`);
console.log(`易 ${easy.length} · 难 ${hard.length}`);
rows.forEach((r, i) => console.log(`${i + 1}. ${r.label} · 单条最强 ${r.bestCover}/${r.partsCount} · minHit ${minHit(r)}`));
