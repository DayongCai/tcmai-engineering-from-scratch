#!/usr/bin/env node
/**
 * tests/test_audit_l3.js — L3 内容层（端到端：造一个真章节，看门响不响）
 *
 * 为什么端到端而不是直接调函数：审计没有 module.exports，而**门只有在真跑一遍
 * 才有意义** —— 只测函数等于测了门锁、没测门框。
 *
 * 三个负例都指向同一类问题：`docs/zh.md` 不达标时的失败形态是**安静的**
 * （文件在、能打开、读起来像那么回事）。
 *   ① 缺「代价与边界」
 *   ② 这句只写在**围栏代码块**里 —— 代码块里的字不算文档级声明
 *   ③ 顶层 H1 不是 1 个
 *
 * 造完必须清干净：一个探针章节留在仓库里，会污染计数、站点与索引。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments', '01-zhongyi', '01-zhongyi-jichu-lilun');
const PROBE = path.join(SUBJ, 'chapters', '04-l3-probe');

let passed = 0;
const failures = [];
function test(name, fn) {
  try { passed += 1; fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

const audit = () => spawnSync(process.execPath, ['scripts/audit_curriculum.js'], { cwd: ROOT, encoding: 'utf8' });

console.log('═══ L3 内容层（端到端）═══\n');

test('当前仓库审计通过，且 L3 层出现在通过清单里', () => {
  const r = audit();
  assert.strictEqual(r.status, 0, `审计未通过:\n${r.stdout}`);
  assert.match(r.stdout, /L3 内容层/, '审计输出里没有 L3 层 —— 说明它没被挂上');
});

/** 造一个探针章节：从 01 章整拷（保证 L2 齐备），只改 docs */
function makeProbe(docBody) {
  fs.rmSync(PROBE, { recursive: true, force: true });
  fs.cpSync(path.join(SUBJ, 'chapters', '01-yin-yang-er-fenlei'), PROBE, { recursive: true });
  // 产出物文件名必须含基准名 l3-probe，否则 L2 先报错，测不到 L3
  const outDir = path.join(PROBE, 'outputs');
  for (const f of fs.readdirSync(outDir)) {
    const to = f.replace(/-(yin-yang-er-fenlei)\.md$/, '-l3-probe.md');
    if (to !== f) fs.renameSync(path.join(outDir, f), path.join(outDir, to));
  }
  const skill = fs.readdirSync(outDir).find((f) => f.startsWith('skill-'));
  if (skill) {
    const p = path.join(outDir, skill);
    fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/^name:.*$/m, 'name: l3-probe'), 'utf8');
  }
  fs.writeFileSync(path.join(PROBE, 'docs', 'zh.md'), docBody, 'utf8');
}

function cleanup() {
  fs.rmSync(PROBE, { recursive: true, force: true });
}

/** 一份能满足 L2 + 大部分 L3 的文档，便于只测某一项 */
const BASE_DOC = `# 探针章节

> **MOTTO:** 「阴阳者，天地之道也」——《素问·阴阳应象大论》

## PROBLEM

环境逼迫：知识积累到一定阶段才需要形式化。

## 本节翻译的代价与边界

丢掉了关系性。

> **边界声明**：教学样例，不构成诊疗建议。

${'正文'.repeat(900)}
`;

// ── 正常态：探针章节应当通过（证明 BASE_DOC 本身合格）──
test('探针章节用合格文档时，审计通过（否则后面的负例没有意义）', () => {
  try {
    makeProbe(BASE_DOC);
    const r = audit();
    assert.strictEqual(r.status, 0, `合格文档却未通过:\n${r.stdout}`);
  } finally { cleanup(); }
});

test('负例 ①：删掉「代价与边界」→ L3 指名报错', () => {
  try {
    makeProbe(BASE_DOC.replace(/## 本节翻译的代价与边界[\s\S]*?(?=> \*\*边界声明)/, ''));
    const r = audit();
    assert.notStrictEqual(r.status, 0, '少了「代价与边界」却通过了');
    assert.match(r.stdout, /L3.*代价与边界/, `错误信息未指名该项:\n${r.stdout}`);
  } finally { cleanup(); }
});

test('负例 ②：这句只写在围栏代码块里 → 仍判缺（代码块里的字不算文档级声明）', () => {
  try {
    // 把 prose 的「代价与边界」去掉，只在代码块里留一处
    const doc = BASE_DOC
      .replace(/## 本节翻译的代价与边界[\s\S]*?(?=> \*\*边界声明)/, '')
      + '\n```bash\n# 本节翻译的代价与边界（这是代码注释，不是文档段）\n```\n';
    makeProbe(doc);
    const r = audit();
    assert.notStrictEqual(r.status, 0, '只在代码块里出现却通过了 —— 围栏块没被跳过');
    assert.match(r.stdout, /L3.*代价与边界/, `错误信息未指名该项:\n${r.stdout}`);
  } finally { cleanup(); }
});

test('负例 ③：顶层 H1 不是 1 个 → 报错', () => {
  try {
    makeProbe(`${BASE_DOC}\n# 第二个 H1\n`);
    const r = audit();
    assert.notStrictEqual(r.status, 0, '出现两个 H1 却通过了');
    assert.match(r.stdout, /L3.*H1/, `错误信息未指名 H1:\n${r.stdout}`);
  } finally { cleanup(); }
});

test('负例 ④：缺经典引文（只有《书名》没有 · 篇名）→ 报错', () => {
  try {
    makeProbe(BASE_DOC.replace(/《素问·阴阳应象大论》/, '《素问》'));
    const r = audit();
    assert.notStrictEqual(r.status, 0, '引文没写到篇名级却通过了');
    assert.match(r.stdout, /L3.*经典引文/, `错误信息未指名引文:\n${r.stdout}`);
  } finally { cleanup(); }
});

test('探针清干净：目录已删除，且审计回到通过', () => {
  cleanup();
  assert.ok(!fs.existsSync(PROBE), `探针章节残留: ${PROBE}`);
  const r = audit();
  assert.strictEqual(r.status, 0, `清理后审计仍未通过（探针污染了仓库）:\n${r.stdout}`);
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ L3 内容层通过');
