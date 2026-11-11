'use strict';
/**
 * 教材更正建议交付件门（8 项）
 *   1. 14 格、动作分布 保留1/留码加注5/待定码5/删码回查2/换码1
 *   2. 每格必填：病名 / 原码 / 判定 / 动作 / 依据（不许空白）
 *   3. 判定→动作映射必须合规（narrow 只能留码加注；missing 只能删码回查）
 *   4. 换码必须给建议码，且该码在镜像里有条目、题名与病名方向一致
 *   5. 待定码 / 删码回查 一律不许带建议码（镜像无对应就不得猜）
 *   6. md 与 csv 同源：行数一致、csv 9 列、带 BOM（Excel 不乱码）
 *   7. md 的「必须动 8 格 / 57.1%」与数据一致
 *   8. md 含三条边界 + 依据指纹 + 复核命令
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const MD = path.join(ROOT, 'standards', 'zhenduan', 'icd-corrections.md');
const CSV = path.join(ROOT, 'standards', 'zhenduan', 'icd-corrections.csv');
const ALIGN = path.join(ROOT, 'standards', 'zhenduan', 'icd-align.json');
const DEFS = path.join(ROOT, 'standards', 'icd11', 'definitions-en.json');

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const md = () => fs.readFileSync(MD, 'utf8');
const defs = () => JSON.parse(fs.readFileSync(DEFS, 'utf8')).entries;

/** 从 md 的逐格表解析出行（第 2 节） */
function rows() {
  return md()
    .split('\n')
    .filter((l) => /^\| \d+ \|/.test(l))
    .map((l) => l.split('|').map((x) => x.trim()))
    .map((c) => ({
      no: Number(c[1]), platformCode: c[2], name: c[3], icd: c[4], title: c[5],
      verdict: c[6], action: c[7].replace(/\*\*/g, ''), suggested: c[8],
    }));
}

test('1. 14 格与动作分布', () => {
  const r = rows();
  assert.strictEqual(r.length, 14, '逐格表行数应为 14');
  const t = {};
  for (const x of r) t[x.action] = (t[x.action] || 0) + 1;
  assert.deepStrictEqual(t, { 保留: 1, 留码加注: 5, 待定码: 5, 删码回查: 2, 换码: 1 });
});

test('2. 每格必填项不为空', () => {
  for (const r of rows()) {
    for (const k of ['name', 'icd', 'verdict', 'action']) {
      assert.ok(r[k] && r[k] !== '—', `第 ${r.no} 格缺 ${k}`);
    }
    const line = md().split('\n').find((l) => l.startsWith(`| ${r.no} |`));
    const cells = line.split('|');
    assert.ok(cells[cells.length - 2].trim().length >= 8, `第 ${r.no} 格依据太短`);
  }
});

test('3. 判定→动作映射合规', () => {
  for (const r of rows()) {
    if (r.verdict === 'narrow') assert.strictEqual(r.action, '留码加注', `${r.name}：narrow 只能留码加注`);
    if (r.verdict === 'missing') assert.strictEqual(r.action, '删码回查', `${r.name}：missing 只能删码回查`);
    if (r.verdict === 'ok') assert.strictEqual(r.action, '保留', `${r.name}：ok 只能保留`);
    if (r.verdict === 'conflict') assert.ok(['待定码', '换码'].includes(r.action), `${r.name}：conflict 只能是待定码/换码`);
  }
});

test('4. 换码必须真能换：码存在且题名方向一致', () => {
  const E = defs();
  const fx = rows().filter((r) => r.action === '换码');
  assert.strictEqual(fx.length, 1, '只允许一处可直接换码');
  const r = fx[0];
  assert.strictEqual(r.name, '眩晕');
  const m = r.suggested.match(/`([A-Z0-9.]+)`\s*(.*)/);
  assert.ok(m, '建议码格式应为 `码` 题名');
  assert.ok(E[m[1]], `${m[1]} 不在镜像里`);
  assert.strictEqual(E[m[1]].title, m[2], '建议题名与镜像不一致');
  assert.ok(/Dizziness/i.test(m[2]), '眩晕的对应题名应含 Dizziness');
});

test('5. 待定码 / 删码回查 不许给建议码', () => {
  for (const r of rows().filter((x) => ['待定码', '删码回查'].includes(x.action))) {
    assert.strictEqual(r.suggested, '—', `${r.name}：镜像无对应实体，不许猜码`);
  }
});

/** 带引号感知的 CSV 行解析（依据列里会出现逗号，如 "Haemorrhage, not elsewhere classified"） */
function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (q) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i += 1; } else if (c === '"') { q = false; } else { cur += c; }
    } else if (c === '"') {
      q = true;
    } else if (c === ',') {
      out.push(cur); cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

test('6. md 与 csv 同源（行数 / 列数 / BOM）', () => {
  const buf = fs.readFileSync(CSV);
  assert.strictEqual(buf[0], 0xef, 'csv 应带 UTF-8 BOM');
  const text = buf.toString('utf8').replace(/^\ufeff/, '');
  const lines = text.trim().split(/\r?\n/);
  assert.strictEqual(lines.length, 15, 'csv 应为表头 + 14 行');
  for (const l of lines) {
    assert.strictEqual(parseCsvLine(l).length, 9, `csv 列数应为 9：${l.slice(0, 40)}`);
  }
  const csvNames = lines.slice(1).map((l) => parseCsvLine(l)[1]);
  assert.deepStrictEqual(csvNames.sort(), rows().map((r) => r.name).sort(), 'csv 与 md 病名集合不一致');
});

test('7. 汇总数字与数据一致', () => {
  const t = md();
  assert.ok(t.includes('**必须动的一共 8 格**'), '缺「必须动 8 格」');
  assert.ok(t.includes('57.1%'), '缺 57.1%');
  assert.ok(t.includes(`（\`${sha(ALIGN).slice(0, 12)}\`）`), '依据指纹与 icd-align.json 不一致');
});

test('8. md 含三条边界与复核命令', () => {
  const t = md();
  assert.ok(t.includes('镜像不全'), '缺边界 1（镜像不全）');
  assert.ok(t.includes('只到题名层'), '缺边界 2（只到题名层）');
  assert.ok(t.includes('不改教材'), '缺边界 3（不改教材）');
  for (const cmd of ['npm run zhenduan:icd', 'node tests/test_zhenduan_icd_corrections.js']) {
    assert.ok(t.includes(cmd), `复核命令缺：${cmd}`);
  }
});
