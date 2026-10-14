#!/usr/bin/env node
/**
 * tests/test_aliases.js —— 证候异名表的守门测试
 *
 * 这张表是本项目"不是证据无关、而是写法不同"这条主张的**落点**。
 * 它的风险只有一个：**我凭记忆写了不存在的同义词**。所以门必须钉死一件事 ——
 *
 *   > 每条别名，都必须在它 `source` 指向的那个来源里**字面出现**，
 *   > 而且那个来源必须**已经在本仓库的 external.json 里**（是真取回来的材料，
 *   > 不是我编的链接）。
 *
 * 这条门一立，"同义词"就不再是我的断言，而是**可在材料里复核的事实**。
 */

const fs = require('fs');
const path = require('path');
const B = require('../scripts/external_batch.js');

const ROOT = path.join(__dirname, '..');
const ALIASES = path.join(ROOT, 'standards/semtensor/descriptions/aliases.json');
const EXT = path.join(ROOT, 'standards/semtensor/descriptions/external.json');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, msg: e.message }); console.log(`  ✗ ${name}\n    ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const table = JSON.parse(fs.readFileSync(ALIASES, 'utf8'));
const ext = JSON.parse(fs.readFileSync(EXT, 'utf8'));
const extByLabel = new Map(ext.entries.map((e) => [e.label, e]));
const textOf = (s) => `${s.title || ''} ${s.snippet || ''}`;
const RELATIONS = new Set(Object.keys(table.relations));

// ── 结构 ────────────────────────────────────────────────────

test('结构：每条都有 label / name / relation / source / basis，relation 合法', () => {
  assert(Array.isArray(table.entries) && table.entries.length, 'entries 为空');
  for (const e of table.entries) {
    assert(e.label, '缺 label');
    assert(Array.isArray(e.aliases) && e.aliases.length, `${e.label} 没有 aliases`);
    for (const a of e.aliases) {
      for (const k of ['name', 'relation', 'source', 'basis']) {
        assert(a[k], `${e.label}/${a.name || '?'} 缺 ${k}`);
      }
      assert(RELATIONS.has(a.relation), `${e.label} 的 relation 非法：${a.relation}`);
      assert(/^https?:\/\//.test(a.source), `${e.label}/${a.name} 的 source 不是 URL`);
      assert(a.basis.length >= 20, `${e.label}/${a.name} 的 basis 太短，说不清依据`);
    }
  }
});

test('结构：同一个 label 内不许有重名别名', () => {
  for (const e of table.entries) {
    const names = e.aliases.map((a) => a.name);
    assert(new Set(names).size === names.length, `${e.label} 有重名别名：${names}`);
  }
});

test('label 必须是数据集里真实存在的证名', () => {
  const all = new Set(B.allLabels());
  for (const e of table.entries) assert(all.has(e.label), `数据集里没有这个证名：${e.label}`);
});

// ── 核心门：别名必须在来源里字面出现 ────────────────────────

test('**每条别名都在它 source 指向的来源里字面出现**（同义不是我的断言，是材料里的事实）', () => {
  for (const e of table.entries) {
    const entry = extByLabel.get(e.label);
    assert(entry, `${e.label} 还没有外部证据，别名无从溯源`);
    for (const a of e.aliases) {
      const src = entry.sources.find((s) => s.url === a.source);
      assert(src, `${e.label}/${a.name} 的 source 不在该证名的证据里：${a.source}`);
      assert(textOf(src).includes(a.name),
        `${e.label}/${a.name} 在该来源的标题+摘要里**没有出现** —— 这条别名无法溯源，不能进表`);
    }
  }
});

test('source 必须是**真实取回**的来源（不是凭空写的链接）', () => {
  const allUrls = new Set();
  for (const e of ext.entries) for (const s of e.sources) allUrls.add(s.url);
  for (const e of table.entries) {
    for (const a of e.aliases) {
      assert(allUrls.has(a.source), `${e.label}/${a.name} 的 url 不在任何已取回的来源里：${a.source}`);
    }
  }
});

// ── 与分级器的接口 ──────────────────────────────────────────

test('分级器认表：synonym 别名使该条升为「特指」，且标出来自异名', () => {
  const EQ = require('../scripts/evidence_quality.js');
  const r = EQ.assess(extByLabel.get('气虚不摄证'));
  assert(r.tier === 'specific', `应升为特指，实得 ${r.tier}`);
  assert(r.viaAlias && r.viaAlias.some((v) => v.relation === 'synonym'),
    `没标出来自异名：${JSON.stringify(r.viaAlias)}`);
});

test('分级器不把 composition 当同义：只算「部分证据」，不许升为特指', () => {
  const EQ = require('../scripts/evidence_quality.js');
  const r = EQ.assess(extByLabel.get('心肾阳虚、水饮凌心证'));
  assert(r.tier === 'partial', `应判部分证据，实得 ${r.tier}`);
  assert(r.viaAlias.some((v) => v.relation === 'composition'),
    `没记下 composition 关系：${JSON.stringify(r.viaAlias)}`);
});

test('分级器不把 broader 当同义：也只算旁证', () => {
  const EQ = require('../scripts/evidence_quality.js');
  const r = EQ.assess(extByLabel.get('下焦湿热瘀阻证'));
  assert(r.tier === 'partial', `应判部分证据（旁证），实得 ${r.tier}`);
  assert(r.viaAlias.some((v) => v.relation === 'broader'), '没记下 broader 关系');
});

test('未进表的写法仍只算「待确认异名」，不自动升格', () => {
  const EQ = require('../scripts/evidence_quality.js');
  // 造一条：正文出现某证名写法，但该写法不在表里
  const r = EQ.assess({
    label: '痰湿内阻证',
    sources: [{ title: '某资料', snippet: '痰湿内蕴证常见于肥胖之人，舌苔白腻。', url: 'https://example.org/a' }],
  });
  assert(r.tier === 'variant-unconfirmed', `应判待确认异名，实得 ${r.tier}`);
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  for (const f of failures) console.log(`  ✗ ${f.name}\n    ${f.msg}`);
  process.exit(1);
}
console.log('\n✅ 异名表通过');
