#!/usr/bin/env node
/**
 * tests/test_literature_names.js —— 「文献通行证名」表的守门测试
 *
 * 这张表的唯一风险，与 aliases.json 相同：**凭记忆写一个文献里并不存在的写法**。
 * 所以测试不复述脚本的判断，而是自己重算一遍：
 *   1. 每条判定都能在它指向的正文里逐字对上；
 *   2. 判 `aligned` 的那个新名字，必须真的出现在引文里（不是「我觉得同义」）；
 *   3. 表不许落后于数据 —— external.json 里每条 component 的每个构件都要有判定；
 *   4. **对齐不是证据**：加了这张表，覆盖数一个都不能动。
 */

const fs = require('node:fs');
const path = require('node:path');
const { componentsOf, classify, covers } = require('../scripts/lib_evidence_scope.js');
const { allLabels } = require('../scripts/external_batch.js');

const ROOT = path.join(__dirname, '..');
const TABLE = path.join(ROOT, 'standards/semtensor/descriptions/literature-names.json');
const EXT = path.join(ROOT, 'standards/semtensor/descriptions/external.json');
const BUILT = path.join(ROOT, 'standards/semtensor/descriptions/dsu-descriptions.json');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, msg: e.message }); console.log(`  ✗ ${name}\n    ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
assert.ok = assert;
assert.strictEqual = (a, b, msg) => {
  if (a !== b) throw new Error(`${msg || '值不相等'}（实得 ${JSON.stringify(a)} ≠ 期望 ${JSON.stringify(b)}）`);
};

const table = JSON.parse(fs.readFileSync(TABLE, 'utf8'));
const ext = JSON.parse(fs.readFileSync(EXT, 'utf8'));
const allUrls = new Set();
for (const e of ext.entries) for (const s of e.sources) allUrls.add(s.url);
const norm = (s) => String(s).replace(/\s+/g, '');
const textOf = (s) => norm(`${s.title || ''} ${s.snippet || ''}`);

test('结构：entries/parts 齐全，verdict/relation 取自表自己的词表', () => {
  assert(Array.isArray(table.entries) && table.entries.length > 0, 'entries 为空');
  const V = new Set(Object.keys(table.$verdicts || {}));
  const R = new Set(Object.keys(table.$relations || {}));
  assert(V.size === 4, `$verdicts 应定义 4 类判定，实得 ${V.size}`);
  for (const e of table.entries) {
    assert(e.label, '缺 label');
    assert(Array.isArray(e.parts) && e.parts.length, `${e.label} 没有 parts`);
    for (const p of e.parts) {
      assert(V.has(p.verdict), `${e.label}/${p.part} 的 verdict 非法：${p.verdict}`);
      if (p.verdict === 'aligned') assert(R.has(p.relation), `${e.label}/${p.part} 的 relation 非法：${p.relation}`);
    }
  }
});

test('label 与 part 都必须是数据集里真实存在的（不许凭空加构件）', () => {
  const all = new Set(allLabels());
  for (const e of table.entries) {
    assert(all.has(e.label), `数据集里没有这个证名：${e.label}`);
    const parts = componentsOf(e.label);
    for (const p of e.parts) assert(parts.includes(p.part), `${e.label} 的构件里没有「${p.part}」`);
  }
});

test('**每条判定的引文都在所指正文里逐字出现**（不是转述、不是记忆）', () => {
  for (const e of table.entries) {
    for (const p of e.parts) {
      const ev = p.evidence || {};
      if (p.verdict === 'unmapped') { assert(!p.evidence, `${e.label}/${p.part} 判 unmapped 不该有 evidence`); continue; }
      const quotes = ev.quotes && ev.quotes.length ? ev.quotes : [ev.quote];
      assert(quotes.every(Boolean), `${e.label}/${p.part} 的引文为空`);
      if (ev.kind === 'source') {
        assert(allUrls.has(ev.url), `${e.label}/${p.part} 的 url 不在任何已取回来源里：${ev.url}`);
        const ok = ext.entries.some((x) => x.sources.some((s) => s.url === ev.url
          && quotes.every((q) => textOf(s).includes(norm(q)))));
        assert(ok, `${e.label}/${p.part} 的引文在该来源标题+摘要里找不到 —— 这条判定无法溯源`);
      } else if (ev.kind === 'repo-md' || ev.kind === 'icd11-tm1') {
        const f = path.join(ROOT, ev.path);
        assert(fs.existsSync(f), `${e.label}/${p.part} 的 cited 文件不存在：${ev.path}`);
        const txt = norm(fs.readFileSync(f, 'utf8'));
        for (const q of quotes) assert(txt.includes(norm(q)), `${e.label}/${p.part} 的引文在 ${ev.path} 里找不到`);
      } else {
        assert(false, `${e.label}/${p.part} 的 evidence.kind 非法：${ev.kind}`);
      }
    }
  }
});

test('判 aligned 的新名字必须出现在引文里（同义不是我的断言，是材料里的事实）', () => {
  const aligned = table.entries.flatMap((e) => e.parts.filter((p) => p.verdict === 'aligned'));
  assert(aligned.length >= 1, '一条 aligned 都没有？那这张表没有回答「换成什么」');
  for (const p of aligned) {
    const quotes = p.evidence.quotes && p.evidence.quotes.length ? p.evidence.quotes : [p.evidence.quote];
    assert(quotes.some((q) => norm(q).includes(norm(p.literatureName))),
      `「${p.part}」→「${p.literatureName}」：新名字不在引文里，这条换名没有出处`);
  }
});

test('判 unmapped 必须写清为什么（≥40 字），不许只写「没有」', () => {
  for (const e of table.entries) {
    for (const p of e.parts.filter((x) => x.verdict === 'unmapped')) {
      assert(typeof p.why === 'string' && p.why.length >= 40, `${e.label}/${p.part} 的 why 太短`);
    }
  }
});

test('表不许落后于数据：external.json 每条 component 的每个构件都要有判定', () => {
  const componentLabels = ext.entries.filter((e) => classify(e).scope === 'component').map((e) => e.label);
  assert(componentLabels.length >= 1, '没有构件级证名？判定链断了');
  const byLabel = new Map(table.entries.map((e) => [e.label, e]));
  for (const l of componentLabels) {
    const e = byLabel.get(l);
    assert(e, `构件级证名没有进表：${l}`);
    for (const p of componentsOf(l)) {
      assert(e.parts.some((x) => x.part === p), `${l} 的构件「${p}」没有判定`);
    }
  }
});

test('构建产物带上了这张表，且 stats 与重算一致', () => {
  assert(fs.existsSync(BUILT), '先跑 node scripts/build_dsu_descriptions.js');
  const built = JSON.parse(fs.readFileSync(BUILT, 'utf8'));
  const componentLabels = ext.entries.filter((e) => classify(e).scope === 'component').map((e) => e.label);
  for (const l of componentLabels) {
    const r = built.records.find((x) => x.label === l);
    assert(r, `构建产物里没有 ${l}`);
    assert(r.literatureNames, `${l} 在构建产物里缺 literatureNames —— 表没接进构建`);
  }
  const al = built.records.reduce((s, r) => s + ((r.literatureNames?.parts || []).filter((p) => p.verdict === 'aligned').length), 0);
  assert.strictEqual(built.stats.literatureAligned, al, `stats.literatureAligned=${built.stats.literatureAligned} 与逐条重算 ${al} 不一致`);
  const um = built.records.filter((r) => (r.literatureNames?.parts || []).some((p) => p.verdict === 'unmapped')).length;
  assert.strictEqual(built.stats.literatureUnmapped, um, 'stats.literatureUnmapped 与逐条重算不一致');
});

test('**对齐不是证据**：加表前后 externalScope 与覆盖数一个都不能变', () => {
  const built = JSON.parse(fs.readFileSync(BUILT, 'utf8'));
  for (const r of built.records) {
    const e = ext.entries.find((x) => x.label === r.label);
    if (!e) continue;
    assert.strictEqual(r.externalScope, classify(e).scope,
      `${r.label} 的 externalScope=${r.externalScope} 与 classify() 的 ${classify(e).scope} 不一致 —— 命名层的东西漏进证据层了`);
    assert.ok(!('literatureName' in r) || Array.isArray(r.literatureNames?.parts),
      `${r.label} 把文献名写进了记录顶层，容易与证据字段混淆`);
  }
  const whole = built.records.filter((r) => r.externalScope === 'single' || r.externalScope === 'whole').length;
  assert.strictEqual(built.stats.withExternalWhole, whole, '整串级统计与逐条重算不一致');
});

console.log(`\n${passed} 通过 · ${failures.length} 失败`);
if (failures.length) process.exit(1);
