#!/usr/bin/env node
/**
 * scripts/check_splice_repairs.js —— 校验证名拼接/病名对应记录（splice-repairs.json）
 *
 * 为什么要有它：`splice-repairs.json` 是**判定与方案的单一登记处**，但它是手写的，
 * 容易和真实数据脱钩（uid 改了、label 改了一个字、构件数对不上）。这个脚本做机械校验，
 * 让"登记表说 DSU-00101 是拼接"这件事本身可复核；它**不改任何数据**。
 *
 * 校验项：
 *   1. uid 存在于 reference-units.json，且 label 逐字一致
 *   2. components 与 lib_evidence_scope.componentsOf(label) 完全一致（口径唯一判定处）
 *   3. kind / verdict / relation 取值合法；cause-effect 至少两个构件
 *   4. proposed.labels 不与现有证名撞名（自己的除外），条数与 components 相容
 *   5. 拼接条目必须给出 evidence（判定不能只有结论）
 *
 * 用法：node scripts/check_splice_repairs.js [--json]
 * 退出码：0 全部通过 · 1 有校验失败
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { componentsOf } = require('./lib_evidence_scope.js');

const FILE = path.join(ROOT, 'standards/semtensor/descriptions/splice-repairs.json');
const UNITS = path.join(ROOT, 'standards/semtensor/datasets/reference-units.json');

const KINDS = new Set(['splice', 'disease-mapping', 'name-form']);
const VERDICTS = new Set(['confirmed', 'pending']);
const RELATIONS = new Set(['cause-effect', 'concurrent', 'merge-of-patterns', 'none']);

const doc = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const raw = JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const units = (Array.isArray(raw) ? raw : raw.units).filter((u) => u.kind === 'dsu');
const byUid = new Map(units.map((u) => [u.uid, u]));
const labels = new Set(units.map((u) => u.label));

const errors = [];
const rows = [];

for (const e of doc.entries) {
  const fail = (msg) => errors.push(`${e.uid || '(无 uid)'}: ${msg}`);

  const u = byUid.get(e.uid);
  if (!u) { fail(`uid 不在 reference-units.json（现有 ${units.length} 条 dsu）`); continue; }
  if (u.label !== e.label) fail(`label 与数据不一致：数据「${u.label}」 ≠ 登记「${e.label}」`);
  if (!KINDS.has(e.kind)) fail(`kind 非法：${e.kind}`);
  if (!VERDICTS.has(e.verdict)) fail(`verdict 非法：${e.verdict}`);
  if (!RELATIONS.has(e.relation)) fail(`relation 非法：${e.relation}`);

  const actual = componentsOf(e.label);
  const declared = Array.isArray(e.components) ? e.components : [];
  if (e.split) {
    // 拆名条目：当前 label 只剩一个构件，不能拿它跟**原**构件表比。
    // 改为校验「原 label 的构件」与登记的 componentsOriginal 一致，且每个拆出的 label 都在数据里。
    const orig = componentsOf(e.labelOriginal || '');
    if (JSON.stringify(orig) !== JSON.stringify(e.componentsOriginal || [])) {
      fail(`componentsOriginal 与原证名不符：口径 ${JSON.stringify(orig)} ≠ 登记 ${JSON.stringify(e.componentsOriginal || [])}`);
    }
    for (let i = 0; i < (e.split.uids || []).length; i += 1) {
      const su = byUid.get(e.split.uids[i]);
      if (!su) fail(`拆名 uid 不存在：${e.split.uids[i]}`);
      else if (su.label !== e.split.labels[i]) fail(`拆名 label 与数据不符：${e.split.uids[i]} 数据「${su.label}」≠ 登记「${e.split.labels[i]}」`);
    }
  } else if (JSON.stringify(actual) !== JSON.stringify(declared)) {
    fail(`components 与口径不一致：口径 ${JSON.stringify(actual)} ≠ 登记 ${JSON.stringify(declared)}`);
  }
  if (e.relation === 'cause-effect' && actual.length < 2) fail('cause-effect 至少需要两个构件');
  if (e.kind === 'splice' && !e.evidence) fail('拼接判定必须附 evidence（不许只有结论）');

  const proposed = e.proposed || {};
  if (proposed.labels && proposed.labels.length) {
    const own = new Set(e.split ? e.split.labels : []);
    for (const l of proposed.labels) {
      // 拆名已落地时，拆出的名字本来就在数据里 —— 那是自己的产物，不算撞名
      if (l !== e.label && !own.has(l) && labels.has(l)) fail(`proposed 名称与现有证名撞名：${l}`);
    }
    // 不拆名（1 条）时，构件数不变；拆名时条数应与**原**构件数一致（拆名后当前 label 只剩一条）
    const partCount = e.split ? (e.componentsOriginal || []).length : actual.length;
    if (proposed.labels.length > 1 && proposed.labels.length !== partCount) {
      fail(`拆名条数 ${proposed.labels.length} 与构件数 ${partCount} 不一致`);
    }
  }
  if (typeof proposed.applied !== 'boolean') fail('proposed.applied 必须是布尔值（有没有写进数据层要说清）');

  rows.push({
    uid: e.uid,
    label: e.label,
    kind: e.kind,
    verdict: e.verdict,
    relation: e.relation,
    parts: actual.length,
    proposed: proposed.labels || [],
    applied: proposed.applied === true,
  });
}

const spliceN = rows.filter((r) => r.kind === 'splice').length;
const appliedN = rows.filter((r) => r.applied).length;

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ ok: errors.length === 0, rows, errors }, null, 2));
} else {
  console.log('═══ 拼接/病名对应登记校验 ═══\n');
  for (const r of rows) {
    console.log(`  ${r.verdict === 'confirmed' ? '✓' : '·'} ${r.uid}  ${r.label}`);
    console.log(`      kind=${r.kind} · relation=${r.relation} · 构件 ${r.parts} · 已写入数据层=${r.applied ? '是' : '否'}`);
    if (r.proposed.length) console.log(`      方案：${r.proposed.join(' / ')}`);
  }
  console.log('');
  console.log(`  登记 ${rows.length} 条（拼接 ${spliceN}）· 已写入数据层 ${appliedN} 条`);
  if (errors.length) {
    console.log('');
    for (const x of errors) console.log(`  ✗ ${x}`);
    console.log(`\n✗ ${errors.length} 项校验失败`);
  } else {
    console.log('\n✅ 登记与数据一致（label/构件/枚举/撞名/方案字段）');
  }
}

process.exit(errors.length ? 1 : 0);
