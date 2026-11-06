'use strict';
/**
 * scripts/literature_names.js —— 「文献通行证名」表的门
 *
 * 这张表回答的是：ICD-11 合称的每个构件，**中文文献实际怎么写**。
 * 它存在的理由写在文件自己的 `$why` 里（队列 97/97 满、国家表 7 条合称 0 命中之后，
 * 命名层是唯一还能动的地方）。
 *
 * 风险只有一个，和 aliases.json 一样：**凭记忆写一个文献里并不存在的写法**。
 * 所以这道门钉死三件事：
 *   1. 每条判定都能在**已取回的正文**里逐字对上（url 必须是 external.json 里的来源，
 *      或 cited 的仓库文件）；
 *   2. `part` 必须真是那个 label 的构件（不在名字里的东西不许偷偷加进来）；
 *   3. 表不许落后于数据 —— external.json 里每一条 component 的每个构件都要有判定。
 *
 * 用法：node scripts/literature_names.js --check
 */
const fs = require('node:fs');
const path = require('node:path');
const { componentsOf, classify, covers } = require('./lib_evidence_scope.js');
const { allLabels } = require('./external_batch.js');

const ROOT = path.resolve(__dirname, '..');
const TABLE = path.join(ROOT, 'standards/semtensor/descriptions/literature-names.json');
const EXT = path.join(ROOT, 'standards/semtensor/descriptions/external.json');
const ALIGN = path.join(ROOT, 'standards/semtensor/descriptions/term-alignment.json');

const table = JSON.parse(fs.readFileSync(TABLE, 'utf8'));
const ext = JSON.parse(fs.readFileSync(EXT, 'utf8'));
const extByLabel = new Map(ext.entries.map((e) => [e.label, e]));
const allUrls = new Set();
for (const e of ext.entries) for (const s of e.sources) allUrls.add(s.url);

const VERDICTS = new Set(Object.keys(table.$verdicts || {}));
const RELATIONS = new Set(Object.keys(table.$relations || {}));
const fails = [];

function assert(cond, msg) {
  if (!cond) fails.push(msg);
}
const textOf = (s) => `${s.title || ''} ${s.snippet || ''}`.replace(/\s+/g, '');
const norm = (s) => String(s).replace(/\s+/g, '');

// ── 1. 结构 ──────────────────────────────────────────────────
assert(Array.isArray(table.entries) && table.entries.length > 0, 'entries 为空');
const seenLabels = new Set();
for (const e of table.entries) {
  assert(e.label && typeof e.label === 'string', '有 entry 缺 label');
  assert(!seenLabels.has(e.label), `label 重复：${e.label}`);
  seenLabels.add(e.label);
  assert(Array.isArray(e.parts) && e.parts.length > 0, `${e.label} 没有 parts`);
  const seenParts = new Set();
  for (const p of e.parts) {
    assert(p.part, `${e.label} 有 part 缺名字`);
    assert(!seenParts.has(p.part), `${e.label} 的 part 重复：${p.part}`);
    seenParts.add(p.part);
    assert(VERDICTS.has(p.verdict), `${e.label}/${p.part} 的 verdict 非法：${p.verdict}`);
    if (p.verdict === 'aligned') {
      assert(p.literatureName, `${e.label}/${p.part} 是 aligned 却没给 literatureName`);
      assert(RELATIONS.has(p.relation), `${e.label}/${p.part} 的 relation 非法：${p.relation}`);
    } else {
      assert(!p.literatureName, `${e.label}/${p.part} 是 ${p.verdict}，不该有 literatureName`);
    }
    if (p.verdict === 'unmapped') {
      assert(typeof p.why === 'string' && p.why.length >= 40, `${e.label}/${p.part} 判 unmapped 却没写清 why（≥40 字）`);
    }
    if (p.verdict === 'as-pattern' || p.verdict === 'as-mechanism') {
      assert(p.evidence && p.evidence.quote, `${e.label}/${p.part} 缺 evidence.quote`);
      assert(covers(norm(p.evidence.quote), p.part) || norm(p.evidence.quote).includes(norm(p.part)),
        `${e.label}/${p.part} 的 quote 里没有这个构件本身：${p.evidence.quote}`);
    }
  }
}

// ── 2. label / part 必须真在数据集里 ─────────────────────────
const labels = new Set(allLabels());
for (const e of table.entries) {
  assert(labels.has(e.label), `数据集里没有这个证名：${e.label}`);
  const parts = e.label ? componentsOf(e.label) : [];
  for (const p of e.parts || []) {
    assert(parts.includes(p.part), `${e.label} 的构件里没有「${p.part}」（实际构件：${parts.join('、')}）`);
  }
}

// ── 3. 覆盖：component 条目的每个构件都要有判定 ──────────────
const componentLabels = ext.entries.filter((e) => classify(e).scope === 'component').map((e) => e.label);
const tableLabels = new Set(table.entries.map((e) => e.label));
for (const l of componentLabels) {
  assert(tableLabels.has(l), `构件级证名没有进表：${l}`);
}
for (const e of table.entries) {
  if (!componentLabels.includes(e.label)) continue;
  const parts = componentsOf(e.label);
  for (const p of parts) {
    assert(e.parts.some((x) => x.part === p), `${e.label} 的构件「${p}」没有判定 —— 表落后于数据了`);
  }
}

// ── 4. 核心门：quote 必须在它指向的正文里逐字出现 ────────────
for (const e of table.entries) {
  for (const p of e.parts || []) {
    if (p.verdict === 'unmapped') continue;
    const ev = p.evidence || {};
    const quotes = ev.quotes && ev.quotes.length ? ev.quotes : [ev.quote];
    assert(quotes.every(Boolean), `${e.label}/${p.part} 的 quotes 有空项`);
    if (ev.kind === 'source') {
      assert(allUrls.has(ev.url), `${e.label}/${p.part} 的 url 不在任何已取回来源里：${ev.url}`);
      const owners = ext.entries.filter((x) => x.sources.some((s) => s.url === ev.url));
      const hit = owners.some((x) => x.sources.some((s) => s.url === ev.url && quotes.every((q) => textOf(s).includes(norm(q)))));
      assert(hit, `${e.label}/${p.part} 的 quote 在该来源的标题+摘要里没有出现（无法溯源）`);
      if (p.verdict === 'aligned') {
        assert(quotes.some((q) => norm(q).includes(norm(p.literatureName))),
          `${e.label}/${p.part} 的 literatureName「${p.literatureName}」不在引文里`);
      }
    } else if (ev.kind === 'repo-md' || ev.kind === 'icd11-tm1') {
      const f = path.join(ROOT, ev.path);
      assert(fs.existsSync(f), `${e.label}/${p.part} 的 path 不存在：${ev.path}`);
      if (fs.existsSync(f)) {
        const txt = norm(fs.readFileSync(f, 'utf8'));
        for (const q of quotes) assert(txt.includes(norm(q)), `${e.label}/${p.part} 的 quote 在 ${ev.path} 里没有出现`);
        if (p.verdict === 'aligned') {
          assert(quotes.some((q) => norm(q).includes(norm(p.literatureName))),
            `${e.label}/${p.part} 的 literatureName「${p.literatureName}」不在引文里`);
        }
      }
    } else {
      assert(false, `${e.label}/${p.part} 的 evidence.kind 非法：${ev.kind}`);
    }
    if (ev.kind === 'source') {
      const owners = ext.entries.filter((x) => x.sources.some((s) => s.url === ev.url));
      assert(owners.length > 0, `${e.label}/${p.part} 的来源没有归属条目`);
    }
  }
}

// ── 5. crossRef：写了标准代码就必须在 term-alignment.json / TM1 表里出现过 ──
let alignText = '';
try { alignText = fs.readFileSync(ALIGN, 'utf8'); } catch { /* 没有就跳过 */ }
let tm1Text = '';
try { tm1Text = fs.readFileSync(path.join(ROOT, 'standards/zhenduan/tm1-landing.md'), 'utf8'); } catch { /* 没有就跳过 */ }
for (const e of table.entries) {
  for (const p of e.parts || []) {
    const cr = p.crossRef;
    if (!cr) continue;
    assert(cr.standardName || cr.standardCode, `${e.label}/${p.part} 的 crossRef 空`);
    if (cr.standardCode) {
      assert(alignText.includes(cr.standardCode) || tm1Text.includes(cr.standardCode),
        `${e.label}/${p.part} 的标准代码 ${cr.standardCode} 在 term-alignment.json 与 TM1 表里都找不到`);
    }
  }
}

// ── 报告 ────────────────────────────────────────────────────
const tally = {};
for (const e of table.entries) for (const p of e.parts) tally[p.verdict] = (tally[p.verdict] || 0) + 1;
const slots = table.entries.reduce((s, e) => s + e.parts.length, 0);

if (fails.length) {
  console.log(`✗ 文献通行证名表 ${fails.length} 处不合格：`);
  for (const f of fails) console.log(`  - ${f}`);
  process.exit(1);
}

console.log('═══ 文献通行证名表 ═══');
console.log(`  条目 ${table.entries.length} · 构件位 ${slots}（构件级证名 ${componentLabels.length} 条全覆盖）`);
for (const k of Object.keys(table.$verdicts)) console.log(`  ${k}: ${tally[k] || 0}`);
const aligned = [];
for (const e of table.entries) for (const p of e.parts) if (p.verdict === 'aligned') aligned.push(`${p.part}→${p.literatureName}(${p.relation})`);
console.log(`  换名（aligned）：${aligned.join(' · ') || '—'}`);
console.log('  ✓ 全部引文在所指正文里逐字命中');
