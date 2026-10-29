#!/usr/bin/env node
/**
 * tests/test_term_alignment.js —— 术语对齐表的守门测试
 *
 * 这张表的风险不是"写错字"，而是**被当成证据用**：一旦有人把"合称 → 首构件正名"
 * 读成"这个证名被文献证实"，弱证据就被洗成整串级。所以门分两段：
 *
 *   1. 名称层：对齐必须与 `lib_evidence_scope.componentsOf` 的切分一致（首构件=主构件），
 *      标准名必须能在国家证名表里逐串命中，标 nonstandard 的构件必须 0 命中。
 *   2. 证据层：**对齐前后 externalScope 不变**（仍是 component），构建产物里
 *      术语对齐条数 = 弱构件级条数，且整串级/构件级数字不受影响。
 */

const fs = require('fs');
const path = require('path');
const L = require('../scripts/lib_evidence_scope.js');

const ROOT = path.join(__dirname, '..');
const ALIGN = path.join(ROOT, 'standards/semtensor/descriptions/term-alignment.json');
const EXT = path.join(ROOT, 'standards/semtensor/descriptions/external.json');
const BUILT = path.join(ROOT, 'standards/semtensor/descriptions/dsu-descriptions.json');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, msg: e.message }); console.log(`  ✗ ${name}\n    ${e.message}`); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const table = JSON.parse(fs.readFileSync(ALIGN, 'utf8'));
const ext = JSON.parse(fs.readFileSync(EXT, 'utf8'));
const built = JSON.parse(fs.readFileSync(BUILT, 'utf8'));

const weak = ext.entries
  .filter((e) => e.scope === 'component' && !e.concurrent && e.relationChain !== 'cause-effect')
  .map((e) => e.label)
  .sort();
const labels = table.entries.map((e) => e.label);
const byLabel = new Map(table.entries.map((e) => [e.label, e]));
const extByLabel = new Map(ext.entries.map((e) => [e.label, e]));
const builtByLabel = new Map(built.records.map((r) => [r.label, r]));

function mirrorText() {
  const p = (table.$basis && table.$basis.extractedText) || '';
  if (!p || !fs.existsSync(p)) return null;
  return fs.readFileSync(p, 'utf8');
}
const text = mirrorText();
const hits = (s) => (text ? text.split(s).length - 1 : null);

// ── 1. 名称层 ─────────────────────────────────────────────

test('结构：7 条、label 唯一、字段齐全、口径写明', () => {
  assert(Array.isArray(table.entries), 'entries 不是数组');
  assert(table.entries.length === 7, `应为 7 条，实际 ${table.entries.length}`);
  assert(new Set(labels).size === labels.length, 'label 有重复');
  assert(Array.isArray(table.$rule) && table.$rule.length >= 3, '$rule 缺失');
  assert(table.$basis && table.$basis.sha256, '$basis 缺 sha256');
  for (const e of table.entries) {
    for (const k of ['label', 'primary', 'standardName', 'wholeStandardName', 'dropped', 'standardNameNote']) {
      assert(Object.prototype.hasOwnProperty.call(e, k), `${e.label} 缺字段 ${k}`);
    }
  }
});

test('对齐对象 = external.json 的弱构件级那 7 条（不多不少）', () => {
  assert(JSON.stringify([...labels].sort()) === JSON.stringify(weak),
    `对齐表与弱构件级不一致：\n  表里：${[...labels].sort().join(' · ')}\n  库里：${weak.join(' · ')}`);
  for (const l of labels) {
    const e = extByLabel.get(l);
    assert(e.scope === 'component', `${l} 在库里不是 component（${e.scope}）`);
    assert(!e.concurrent && e.relationChain !== 'cause-effect', `${l} 是并病/因果链，不该进对齐表`);
  }
});

test('口径=取主构件：primary 是 componentsOf 的首构件，dropped 依次是余下构件', () => {
  for (const e of table.entries) {
    const parts = L.componentsOf(e.label);
    assert(parts.length === 2, `${e.label} 应切出 2 个构件，实际 ${JSON.stringify(parts)}`);
    assert(e.primary === parts[0], `${e.label} 主构件应为「${parts[0]}」，写的是「${e.primary}」`);
    assert(JSON.stringify(e.dropped.map((d) => d.part)) === JSON.stringify(parts.slice(1)),
      `${e.label} dropped 顺序应等于 ${JSON.stringify(parts.slice(1))}`);
  }
});

test('合称本身不给正名：wholeStandardName 全为 null', () => {
  for (const e of table.entries) {
    assert(e.wholeStandardName === null, `${e.label} 的 wholeStandardName 应为 null`);
    assert(e.standardName !== e.label, `${e.label} 不能用合称自身充当正名`);
  }
});

test('构件状态与标准名自洽：nonstandard 无正名、standard 有正名', () => {
  for (const e of table.entries) {
    for (const d of e.dropped) {
      assert(['standard', 'nonstandard'].includes(d.status), `${e.label}「${d.part}」status 非法`);
      if (d.status === 'nonstandard') assert(!d.standardName, `${e.label}「${d.part}」标 nonstandard 却给了正名`);
      else assert(d.standardName && d.standardName.endsWith('证'), `${e.label}「${d.part}」标 standard 但正名不是证名`);
    }
    assert(e.standardName.endsWith('证'), `${e.label} 的 standardName 必须是证名`);
  }
});

test('代码是国标/医保形态，不许混写 WHO-TCM 的 x.y.z', () => {
  for (const e of table.entries) {
    const codes = [e.standardCode, ...e.dropped.map((d) => d.standardCode)].filter(Boolean);
    for (const c of codes) {
      assert(/^[A-Z]\d{2}(?:\.\d+)+$/.test(c), `${e.label} 代码「${c}」不是国标/医保形态`);
      assert(!/^\d+(?:\.\d+)+$/.test(c), `${e.label} 代码「${c}」是 WHO-TCM 形态，不许混写`);
    }
  }
});

test('国家表逐串复核：标准名命中 > 0，nonstandard 构件 0 命中', () => {
  if (!text) throw new Error('未找到国家表抽取文本（D:\\tcmai-standards\\…txt）—— 本机应存在，缺失说明镜像没落盘');
  for (const e of table.entries) {
    assert(hits(e.standardName) > 0, `${e.label} 的正名「${e.standardName}」在国家表里 0 命中`);
    for (const d of e.dropped) {
      const bare = d.part.replace(/证$/, '');
      if (d.status === 'nonstandard') assert(hits(bare) === 0, `${e.label}「${d.part}」标 nonstandard，但国家表命中 ${hits(bare)} 次`);
      else assert(hits(bare) > 0, `${e.label}「${d.part}」标 standard，但国家表 0 命中`);
    }
  }
});

// ── 2. 证据层（对齐不许洗证据） ─────────────────────────────

test('构建产物：这 7 条仍为 component，术语对齐不外溢到别的证名', () => {
  const aligned = built.records.filter((r) => r.termAlignment);
  assert(aligned.length === 7, `构建产物里术语对齐应有 7 条，实际 ${aligned.length}`);
  for (const r of aligned) assert(r.externalScope === 'component', `${r.label} 对齐后 externalScope 变成了 ${r.externalScope}`);
  for (const l of labels) assert(builtByLabel.get(l).termAlignment, `${l} 在构建产物里缺 termAlignment`);
});

test('构建统计：术语对齐条数 = 弱构件级条数，且证据四级数字不变', () => {
  const s = built.stats;
  assert(s.withTermAlignment === 7, `withTermAlignment 应为 7，实际 ${s.withTermAlignment}`);
  assert(s.withExternalComponent === 7, `构件级（弱）应为 7，实际 ${s.withExternalComponent}`);
  assert(s.withExternalWhole === 85, `整串级应为 85，实际 ${s.withExternalWhole}`);
  assert(s.withConcurrent === 2 && s.withChain === 3, `并病/因果链应为 2/3，实际 ${s.withConcurrent}/${s.withChain}`);
});

console.log('');
if (failures.length) {
  console.error(`✗ ${failures.length} 失败 · ${passed} 通过`);
  process.exit(1);
}
console.log(`✅ 术语对齐通过（${passed} 通过 · 0 失败）`);
