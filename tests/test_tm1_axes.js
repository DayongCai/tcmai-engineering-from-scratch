#!/usr/bin/env node
/**
 * tests/test_tm1_axes.js — 四轴词表与探针组合器（scripts/build_tm1_axes.js）
 *
 * 这一层要守住的东西很具体：**词表里不许有一个凭空来的词**，**组合里不许有一个凭空来的顺序**。
 *   A. 词项：每条都必须在 472 条官方 TM1 题名里真出现过（次数与示例编码可回查）。
 *   B. 轴序：必须是从「≥2 个不同轴」的官方题名两两统计出来的，不能是手排。
 *   C. 中文构件（壅/痹/瘀/阻/亏/淫/犯）：每条都要有官方 zh/en 对作出处，核对失败即失败。
 *   D. 组合器：痰热壅肺证 这类要拼出官方体（locus 在前），并且**官方里没有的词**要如实列出来，
 *      不能假装它也是四轴词。
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const AX = require(path.join(ROOT, 'scripts', 'build_tm1_axes.js'));

let passed = 0, skipped = 0;
const failures = [];
function test(name, fn) {
  try { passed += 1; fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ TM1 四轴词表 + 探针组合器 ═══\n');
console.log(' A. 词项与出处\n');

const HAS_AXES = fs.existsSync(AX.OUT);
if (!HAS_AXES) {
  console.log('  ⊘ 产物不存在，先跑 npm run icd11:axes；以下真数据断言跳过');
  skipped += 1;
}

const ZH = path.join(ROOT, 'standards', 'icd11', 'zh-names.json');
const tm1 = HAS_AXES
  ? JSON.parse(fs.readFileSync(ZH, 'utf8')).names.filter((n) => n.module === 'TM1' && n.zh && n.en)
  : [];

function tokens(title) {
  return String(title).toLowerCase().replace(/\(tm[12]\)/g, ' ')
    .replace(/[-/]/g, ' ').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean);
}

if (HAS_AXES) {
  const A = AX.loadAxes();

  test('每个轴词都在官方题名里真出现过（次数 = 命中码数，可复算）', () => {
    let checked = 0;
    for (const axis of AX.AXES) {
      for (const e of A.lexicon[axis]) {
        const parts = e.en.split(' ');
        const codes = tm1.filter((n) => {
          const t = tokens(n.en);
          return parts.every((p) => t.includes(p));
        });
        assert.strictEqual(codes.length, e.n, `${axis}/${e.en}: 记 ${e.n} 条，实算 ${codes.length} 条`);
        assert.ok(e.n > 0, `${axis}/${e.en} 出现次数为 0 却留在词表里`);
        checked += 1;
      }
    }
    assert.ok(checked > 60, `轴词太少：${checked}`);
  });

  test('词表里没有一个词是凭空写的（都能在官方题名 token 集合里找到）', () => {
    const vocab = new Set();
    for (const n of tm1) for (const t of tokens(n.en)) vocab.add(t);
    for (const axis of AX.AXES) {
      for (const e of A.lexicon[axis]) {
        for (const p of e.en.split(' ')) {
          assert.ok(vocab.has(p), `${axis}/${e.en}: 「${p}」在 472 条官方题名里没出现`);
        }
      }
    }
  });

  console.log('\n B. 轴序是统计出来的\n');

  test('轴序来自 ≥2 轴的官方题名，且 locus 在 property 之前（有数据支撑）', () => {
    const order = A.grammar.order;
    assert.deepStrictEqual([...order].sort(), [...AX.AXES].sort(), '轴序必须是四个轴的排列');
    const prec = A.grammar.precedence || [];
    const lp = prec.find((p) => p.pair === 'locus>property');
    assert.ok(lp && lp.n > 0, '缺 locus>property 的先后统计');
    assert.ok(order.indexOf('locus') < order.indexOf('property'),
      `locus 应排在 property 之前，实际 ${order.join('>')}`);
  });

  test('题名解析率 > 60%（词表不是只认几个词的空壳）', () => {
    const c = A.meta.counts;
    assert.ok(c.parsed / c.tm1Titles > 0.6, `解析 ${c.parsed}/${c.tm1Titles}`);
  });

  console.log('\n C. 中文构件必须有出处\n');

  test('PAIR_CITED 每条都能在官方 zh/en 对里核对（中文名含 zh、英文名含 en）', () => {
    assert.deepStrictEqual(A.audit.extensionIssues, [], A.audit.extensionIssues.join('；'));
    assert.ok(A.zhExtensions.length >= 5, `构件太少：${A.zhExtensions.length}`);
    for (const x of A.zhExtensions) {
      assert.ok(x.codes && x.codes.length, `${x.zh}→${x.en} 没有出处编码`);
      for (const code of x.codes) {
        const n = tm1.find((y) => y.code === code);
        assert.ok(n, `${code} 不在快照里`);
        assert.ok(n.zh.includes(x.zh), `${code} 中文名「${n.zh}」不含「${x.zh}」`);
        assert.ok(tokens(n.en).includes(x.en), `${code} 英文名「${n.en}」不含「${x.en}」`);
      }
    }
  });

  test('官方 472 条里没有的构件**不许造**（内停/失养/浸淫/互结 都不在词表里）', () => {
    const zh = new Set(A.zhExtensions.map((x) => x.zh));
    for (const w of ['内停', '失养', '浸淫', '互结']) {
      assert.ok(!zh.has(w), `「${w}」在官方题名里没有出处，不该出现在 zhExtensions`);
    }
  });

  console.log('\n D. 组合器\n');

  test('痰热壅肺证 → 官方体（locus 在 cause 前），且能在官方题名里找到同构先例 SF89', () => {
    const p = AX.probeForZh('痰热壅肺证', A);
    assert.ok(p.en, '没有拼出探针');
    assert.strictEqual(p.en, 'lung phlegm heat obstructing pattern');
    assert.strictEqual(p.axisClean, true, `不干净：${JSON.stringify(p.axes)}`);
    assert.ok(p.attested.includes('SF89'), `同构先例里没有 SF89：${p.attested}`);
  }, true);

  test('风寒束表证 → cold exterior pattern（壳词 pattern/syndrome 不许漏进片段）', () => {
    const p = AX.probeForZh('风寒束表证', A);
    assert.strictEqual(p.en, 'cold exterior pattern');
    assert.ok(!/syndrome|pattern pattern/.test(p.en), `片段没洗干净：${p.en}`);
  });

  test('水湿内停证：内停没有出处，但水+湿两个轴词在，仍给探针并标干净度', () => {
    const p = AX.probeForZh('水湿内停证', A);
    assert.strictEqual(p.en, 'water dampness pattern');
    assert.ok(p.unmatchedZh.includes('内停'), '应当把没有出处的「内停」如实留下');
  });

  test('含官方词汇之外的词时必须如实标出（热毒 → toxin 不在 472 条题名里）', () => {
    const p = AX.probeForZh('热毒犯肺、痰瘀阻络证', A);
    assert.ok(p.uncovered.includes('toxin'), `应标出 toxin：${JSON.stringify(p.uncovered)}`);
    assert.strictEqual(p.axisClean, false);
    // 同时它确实把 lung / heat / phlegm / stasis / obstruction / invading 都归了轴
    const axed = p.axes.filter((x) => x.axis).map((x) => x.token);
    for (const t of ['lung', 'heat', 'phlegm', 'stasis', 'obstruction', 'invading']) {
      assert.ok(axed.includes(t), `「${t}」没归到轴：${axed.join(' ')}`);
    }
  });

  test('建表是确定性的：同一份源连跑两次，产物逐字节相同', () => {
    const before = fs.readFileSync(AX.OUT);
    AX.build();
    const after = fs.readFileSync(AX.OUT);
    assert.ok(before.equals(after), '两次建表结果不同（产物里混进了时间戳或随机序）');
  });
}

console.log(`\n  ${passed} 通过 · ${failures.length} 失败 · ${skipped} 跳过`);
if (failures.length) {
  console.log('\n失败明细:');
  failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
  process.exit(1);
}
console.log('\n✅ 四轴词表与组合器通过');
