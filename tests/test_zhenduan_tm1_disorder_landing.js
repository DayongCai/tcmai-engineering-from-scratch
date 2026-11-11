'use strict';
/**
 * 病名侧反查门（7 项）
 *   1. 218 − 68 = 150；三档之和 = 150
 *   2. 每行字段齐、bucket 只用三值、码格式合法
 *   3. exact 行的 probe 就是病名本身，且在教材正文里逐字出现（不去尾字）
 *   4. fragment 行的片段 ≥2 字且不等于病名；none 行不得有 probe/loc
 *   5. 与证候侧配对：sibling 指向 tm1-landing.json 且其 196 条可复算
 *   6. md 同源：150 行逐条表 + 覆盖率 29.3% + 证候侧 55.1% 并列
 *   7. md 三条边界都在（体裁 / 不等于立条 / 不做语义归并）
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DOC = path.join(ROOT, 'standards', 'zhenduan', 'tm1-disorder-landing.json');
const MD = path.join(ROOT, 'standards', 'zhenduan', 'tm1-disorder-landing.md');
const SIB = path.join(ROOT, 'standards', 'zhenduan', 'tm1-landing.json');
const BASE = path.join(ROOT, 'standards', 'zhenduan', '底本.json');

const doc = () => JSON.parse(fs.readFileSync(DOC, 'utf8'));

function textAll() {
  const d = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  let t = '';
  for (const c of d.chapters) {
    t += (c.paras || []).join('');
    for (const s of c.secs || []) {
      t += (s.paras || []).join('');
      for (const u of s.subs || []) t += (u.paras || []).join('');
    }
  }
  return t;
}

test('1. 218 − 68 = 150，三档自洽', () => {
  const d = doc();
  assert.strictEqual(d.stat.disorders, 218);
  assert.strictEqual(d.stat.residual, 68);
  assert.strictEqual(d.stat.real, 150);
  assert.strictEqual(d.stat.disorders - d.stat.residual, d.stat.real);
  const t = d.stat.tally;
  assert.strictEqual(t.exact + t.fragment + t.none, 150);
  assert.strictEqual(d.rows.length, 150);
  assert.strictEqual(t.exact, 44);
  assert.strictEqual(t.none, 87);
});

test('2. 每行字段齐、bucket 合法', () => {
  for (const r of doc().rows) {
    assert.ok(/^S[A-Z][A-Z0-9]{2}(\.\d+)?$/.test(r.code), `码格式异常：${r.code}`);
    assert.ok(r.zh && r.en, `${r.code} 缺中/英文名`);
    assert.ok(['exact', 'fragment', 'none'].includes(r.bucket), `${r.zh} bucket 非法`);
    assert.strictEqual(typeof r.inBzu, 'boolean', `${r.zh} 缺 inBzu`);
  }
  assert.strictEqual(new Set(doc().rows.map((r) => r.code)).size, 150, 'TM1 码重复');
});

test('3. exact 行 probe 就是病名且逐字在正文里', () => {
  const text = textAll();
  for (const r of doc().rows.filter((x) => x.bucket === 'exact')) {
    assert.strictEqual(r.probe, r.zh, `${r.zh}：probe 不等于病名（不许去尾字顶替）`);
    assert.ok(text.includes(r.zh), `${r.zh} 不在教材正文里`);
    assert.ok(r.loc && r.loc.startsWith('教材·第'), `${r.zh} 缺教材定位`);
  }
});

test('4. fragment 是片段、none 是空', () => {
  for (const r of doc().rows.filter((x) => x.bucket === 'fragment')) {
    assert.ok(r.lcs && r.lcs.length >= 2, `${r.zh} 片段长度不足`);
    assert.notStrictEqual(r.lcs, r.zh, `${r.zh}：片段等于全名，应归 exact`);
    assert.ok(r.loc, `${r.zh} 缺教材定位`);
  }
  for (const r of doc().rows.filter((x) => x.bucket === 'none')) {
    assert.strictEqual(r.probe, '', `${r.zh}：none 档不该有 probe`);
    assert.strictEqual(r.loc, '', `${r.zh}：none 档不该有位置`);
  }
});

test('5. 与证候侧配对可复算', () => {
  const d = doc();
  assert.ok(d.sibling, '缺 sibling 配对');
  assert.strictEqual(d.sibling.file, 'standards/zhenduan/tm1-landing.json');
  const sib = JSON.parse(fs.readFileSync(SIB, 'utf8'));
  assert.strictEqual(d.sibling.sha256, require('node:crypto').createHash('sha256').update(fs.readFileSync(SIB)).digest('hex'),
    'sibling 指纹与 tm1-landing.json 不一致（改了证候侧要重跑本支）');
  assert.strictEqual(sib.stat.real, 196);
  assert.strictEqual(d.sibling.stat.real, 196);
});

test('6. md 同源 + 覆盖率并列', () => {
  const t = fs.readFileSync(MD, 'utf8');
  const sec6 = t.slice(t.indexOf('## 六、逐条结果'));
  const rows = sec6.split('\n').filter((l) => /^\| S[A-Z][A-Z0-9]{2}(\.\d+)? \|/.test(l));
  assert.strictEqual(rows.length, 150, 'md 逐条表应为 150 行');
  assert.ok(t.includes('29.3%'), 'md 缺病种覆盖率 29.3%');
  assert.ok(t.includes('55.1%'), 'md 缺证候侧覆盖率 55.1%');
  assert.ok(t.includes('证候覆盖率') && t.includes('病种覆盖率'), 'md 缺两侧对照句');
});

test('7. 三条边界都在', () => {
  const t = fs.readFileSync(MD, 'utf8');
  assert.ok(t.includes('以症、证为纲'), '缺体裁边界');
  assert.ok(t.includes('不等于教材把它当独立病种立条'), '缺「exact ≠ 立条」边界');
  assert.ok(t.includes('不做语义归并'), '缺「不做语义归并」边界');
  assert.ok(t.includes('不得据此声称'), '缺「不得据此声称教材缺 N 个病」');
});
