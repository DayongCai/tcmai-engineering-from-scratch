'use strict';
/**
 * scripts/report_partial_backlog.js —— 生成「外部证据不合格」的优先级清单
 *
 * 为什么要它：27 条不合格混在一起看没有行动顺序。这里按**可算的信号**排：
 *   1. 缺几个构件（1/1 < 1/2 < 2/2）—— 成本从低到高；
 *   2. 「缺的那个构件」在本库已有来源里被命中过几次 —— 命中过说明它是常用写法，
 *      取到的概率高；一次都没命中过的，往往是 ICD-11 合称在文献层没有对应写法
 *      （例如「瘀毒内蕴」「邪留正伤」），再搜几轮也是空手。
 *
 * 输出：standards/semtensor/descriptions/PARTIAL-BACKLOG.md（人读，入库）
 * 判定口径复用 scripts/lib_evidence_scope.js，不另写一套。
 */

const fs = require('node:fs');
const path = require('node:path');
const { classify, componentsOf, covers } = require('./lib_evidence_scope.js');

const ROOT = path.resolve(__dirname, '..');
const EXT = path.join(ROOT, 'standards/semtensor/descriptions/external.json');
const OUT = path.join(ROOT, 'standards/semtensor/descriptions/PARTIAL-BACKLOG.md');

const ext = JSON.parse(fs.readFileSync(EXT, 'utf8'));
const allText = ext.entries.flatMap((e) => e.sources.map((s) => `${s.title || ''} ${s.snippet || ''}`));

const rows = [];
for (const e of ext.entries) {
  const r = classify(e);
  if (r.scope !== 'partial') continue;
  const parts = componentsOf(e.label);
  // 每个缺口在**本库已有语料**里被命中过几次（排除这条自己的来源）
  const ownText = e.sources.map((s) => `${s.title || ''} ${s.snippet || ''}`);
  const others = allText.length - ownText.length;
  const hits = r.missing.map((m) => {
    const n = allText.filter((t) => covers(t, m)).length - ownText.filter((t) => covers(t, m)).length;
    return { part: m, hits: n };
  });
  rows.push({
    label: e.label,
    parts: parts.length,
    missing: r.missing,
    hits,
    hitTotal: hits.reduce((s, h) => s + h.hits, 0),
    src: e.sources.length,
    others,
  });
}

// 排序：先按层级（P1 → P2 → P3）分组，同层内按「缺口在本库被命中次数」降序。
// 注意不能只按 missing.length 排：P1（单构件缺名）与 P2（复合缺一个）都是"缺 1"，
// 只按缺数排会把两层交错，表格小标题就会重复出现（第一版就是这样）。
const tierRank = (r) => (r.parts === 1 ? 0 : r.missing.length === 1 ? 1 : 2);
rows.sort((a, b) => (tierRank(a) - tierRank(b)) || (b.hitTotal - a.hitTotal) || a.label.localeCompare(b.label));

const tier = (r) => {
  if (r.parts === 1) return 'P1 · 单构件缺名';
  if (r.missing.length === 1) return 'P2 · 复合缺一个构件';
  return 'P3 · 复合缺两个构件';
};

const md = [];
md.push('# 外部证据不合格清单（按优先级）');
md.push('');
md.push('> 由 `node scripts/report_partial_backlog.js` 从 `external.json` 生成，**不要手改**。');
md.push('> 判定口径见 `scripts/lib_evidence_scope.js` 与 `EVIDENCE-STANDARD.md`。');
md.push('');
md.push(`当前：**${rows.length} 条不合格**（另有 ${ext.entries.length} 条已入库，其中整串级/构件级见 \`descriptions.md\`）。`);
md.push('');
md.push('## 怎么读「库内命中」这一列');
md.push('');
md.push('`缺的构件` 后面括号里的数字 = **该构件在库里其它来源的 title+snippet 中被命中过几次**。');
md.push('这是可算的"好不好取"信号，不是猜测：');
md.push('');
md.push('- **>0**：这种写法在中医文献里是常用的，再检索有较大概率命中，值得先打；');
md.push('- **=0**：库里 94 条、数百处来源一次都没出现这种写法。多半是 ICD-11 合称在中文临床文献里没有对应写法');
md.push('  （如「瘀毒内蕴」「邪留正伤」「虚风内动」），继续硬搜容易空手 —— 这类留给平台层做术语对齐更划算。');
md.push('');
md.push('## 优先级');
md.push('');

let lastTier = '';
for (const r of rows) {
  const t = tier(r);
  if (t !== lastTier) {
    md.push(`### ${t}`);
    md.push('');
    md.push('| # | 证名 | 缺的构件（库内命中） | 现有来源 | 升级路径 |');
    md.push('|---|---|---|---|---|');
    lastTier = t;
  }
  const miss = r.missing.map((m) => {
    const h = r.hits.find((x) => x.part === m);
    return `${m}（${h ? h.hits : 0}）`;
  }).join('、');
  const upgradePaths = {
    'P1 · 单构件缺名': '一条来源写出证名 → 单构件级',
    'P2 · 复合缺一个构件': '取到缺口 → 构件级；同一来源写出两构件 → 整串级',
    'P3 · 复合缺两个构件': '两个缺口都取到 → 构件级；同一来源写出两构件 → 整串级',
  };
  md.push(`| ${rows.indexOf(r) + 1} | ${r.label} | ${miss} | ${r.src} | ${upgradePaths[t]} |`);
}
md.push('');
md.push('## 建议的推进顺序');
md.push('');
const p1 = rows.filter((r) => r.parts === 1);
const p2hit = rows.filter((r) => r.parts > 1 && r.missing.length === 1 && r.hitTotal > 0);
const p2miss = rows.filter((r) => r.parts > 1 && r.missing.length === 1 && r.hitTotal === 0);
const p3 = rows.filter((r) => r.missing.length === 2);
md.push(`1. **P1 ${p1.length} 条**（${p1.map((r) => r.label).join('、')}）：一次检索就能从"不合格"变"有证据"，成本最低。`);
md.push(`2. **P2 中库内命中 >0 的 ${p2hit.length} 条**：缺口是常用写法，先打这批。`);
md.push(`3. **P2 中库内命中 =0 的 ${p2miss.length} 条** + **P3 ${p3.length} 条**：需要"一条来源同时写出两个构件"，命中率低；`);
md.push('   与其继续硬搜，不如在平台术语层做对齐（ICD-11 合称 → 文献通行证名），把口径一次性统一。');
md.push('');
md.push('> 平台统一时可直接消费本表：`externalScope` 已在 `dsu-descriptions.json` 每条记录里，');
md.push('> `scope=partial` 的节点建议在 3D 语义张量里**不画证据边**，`component` 画细边，`whole`/`single` 画实边。');

fs.writeFileSync(OUT, `${md.join('\n')}\n`, 'utf8');
console.log(`不合格 ${rows.length} 条（P1 ${p1.length} · P2 ${p2hit.length + p2miss.length} · P3 ${p3.length}）`);
console.log(`→ ${OUT}`);
