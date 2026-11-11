'use strict';
/**
 * 中医诊断学 BZU 病码 × ICD-11 术语层对账门（8 项）
 *   1. 三份输入指纹与留档一致（bzu / definitions-en / zh-names）
 *   2. 带码条目数与「逐条判定」条数一致，且没有 unjudged（判定表必须覆盖所有码）
 *   3. 统计自洽：ok+narrow+conflict+missing = total；misaligned = conflict+missing
 *   4. 错配率 = (conflict+missing)/total，精确到 1 位小数与 md 同值
 *   5. missing 的码确实不在 definitions-en；非 missing 的码必须在
 *   6. conflict 必须给出理由（≥10 字）且题名与病名不是同一实体（不许「conflict 却同名」）
 *   7. 有 suggested 的条目，建议码必须真在镜像里，且题名比原码更贴近病名（只认 Dizziness 这一例）
 *   8. 人读版 icd-align.md 存在，含错配率与「不得超过」类边界声明
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const DOC = path.join(ROOT, 'standards', 'zhenduan', 'icd-align.json');
const MD = path.join(ROOT, 'standards', 'zhenduan', 'icd-align.md');
const BZU = path.join(ROOT, 'standards', 'zhenduan', 'bzu.json');
const DEFS = path.join(ROOT, 'standards', 'icd11', 'definitions-en.json');
const ZH = path.join(ROOT, 'standards', 'icd11', 'zh-names.json');

const sha = (p) => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const doc = () => JSON.parse(fs.readFileSync(DOC, 'utf8'));
const defs = () => JSON.parse(fs.readFileSync(DEFS, 'utf8')).entries;

test('1. 输入指纹与留档一致', () => {
  const d = doc();
  assert.strictEqual(d.inputs.bzu.sha256, sha(BZU), 'bzu.json 变了，请重跑 node scripts/align_zhenduan_icd.js');
  assert.strictEqual(d.inputs.definitions.sha256, sha(DEFS), 'definitions-en.json 变了');
  assert.strictEqual(d.inputs.zhNames.sha256, sha(ZH), 'zh-names.json 变了');
  assert.ok(d.inputs.definitions.entries > 2000, 'definitions-en 条目数异常');
});

test('2. 判定表覆盖全部带码条目（无 unjudged）', () => {
  const d = doc();
  assert.strictEqual(d.stat.total, d.items.length, 'total 与 items 数不符');
  const unjudged = d.items.filter((i) => i.verdict === 'unjudged');
  assert.deepStrictEqual(unjudged.map((i) => `${i.name}/${i.icd}`), [], '有码没有人工判定');
  const codes = d.items.map((i) => i.icd);
  assert.strictEqual(new Set(codes).size, codes.length, '同一 ICD 码出现两次（应合并判定）');
});

test('3. 统计自洽', () => {
  const s = doc().stat;
  assert.strictEqual(s.ok + s.narrow + s.conflict + s.missing, s.total, '四档之和 ≠ total');
  assert.strictEqual(s.misaligned, s.conflict + s.missing, 'misaligned 口径错');
  assert.strictEqual(s.inDefinitions, s.total - s.missing, 'inDefinitions 应等于非 missing 条数');
});

test('4. 错配率与 md 同值', () => {
  const d = doc();
  const rate = ((d.stat.misaligned / d.stat.total) * 100).toFixed(1);
  assert.strictEqual(rate, '57.1', `错配率变了：${rate}%（8/14）`);
  assert.ok(fs.readFileSync(MD, 'utf8').includes(rate + '%'), 'md 里没有错配率');
});

test('5. missing 与存在性互斥', () => {
  const E = defs();
  for (const it of doc().items) {
    const exists = Boolean(E[it.icd]);
    if (it.verdict === 'missing') assert.strictEqual(exists, false, `${it.icd} 判定 missing 但镜像里有`);
    else assert.strictEqual(exists, true, `${it.icd} 判定 ${it.verdict} 但镜像里没有条目`);
    assert.strictEqual(it.icdTitle, exists ? E[it.icd].title : '', `${it.icd} 题名与镜像不一致`);
  }
});

test('6. conflict 必须有理由，且不许与题名同义', () => {
  const d = doc();
  for (const it of d.items.filter((x) => x.verdict === 'conflict')) {
    assert.ok(it.reason.length >= 10, `${it.name} 的 conflict 理由太短`);
    assert.ok(it.icdTitle, `${it.name} 判 conflict 却无题名`);
    // 反向检查：题名不得整体包含病名的拼音直译式词（防「同名却判冲突」）
    assert.ok(!it.icdTitle.includes(it.name), `${it.name}：题名里出现病名，不应判 conflict`);
  }
});

test('7. 建议码必须真在镜像里且更贴近', () => {
  const E = defs();
  const withSugg = doc().items.filter((i) => i.suggested);
  assert.strictEqual(withSugg.length, 1, '建议码只允许在镜象确有对应条目时出现');
  const it = withSugg[0];
  assert.strictEqual(it.name, '眩晕');
  assert.strictEqual(it.suggested, 'MB48');
  assert.ok(E.MB48, 'MB48 不在镜像里');
  assert.ok(/Dizziness/i.test(E.MB48.title), `MB48 题名不是 Dizziness：${E.MB48.title}`);
  assert.ok(!/Dizziness/i.test(it.icdTitle), '原码题名不该含 Dizziness');
});

test('8. md 有边界声明', () => {
  const md = fs.readFileSync(MD, 'utf8');
  assert.ok(md.includes('不得据此改教材'), 'md 缺「不得据此改教材」');
  assert.ok(md.includes('不是「临床等价」判断') || md.includes('不是「临床等价」'), 'md 缺等价性边界');
  assert.ok(md.includes('2,394'), 'md 缺镜像条目数（说明不能全给正确码）');
  assert.ok(md.split('\n').filter((l) => l.startsWith('| ')).length >= 16, 'md 逐条判定表行数不足');
});
