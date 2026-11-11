'use strict';
/**
 * 反方向对账门（7 项）：TM1 196 条实单元 → 教材有没有落点
 *   1. 254 − 58 = 196，四档之和 = 196
 *   2. 每行字段齐、bucket 只用四值
 *   3. exact 行的 probe 必须真在教材正文里（复算，不许手填）
 *   4. covered 行的「病位+病性」必须在**同一段**里共现（复算 locator 对应的段）
 *   5. fragment 行的片段长度 ≥2，且不是整名（防把 exact 混进 fragment）
 *   6. none 行名单固定 6 条（变了就说明数据层或词表变了，必须重新人工确认）
 *   7. md 与 json 同源：196 行逐条表、四档数字、三条边界
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DOC = path.join(ROOT, 'standards', 'zhenduan', 'tm1-landing.json');
const MD = path.join(ROOT, 'standards', 'zhenduan', 'tm1-landing.md');
const BASE = path.join(ROOT, 'standards', 'zhenduan', '底本.json');

const doc = () => JSON.parse(fs.readFileSync(DOC, 'utf8'));

/** 教材段落：与生成脚本同一取法，用于复算 */
function paraMap() {
  const d = JSON.parse(fs.readFileSync(BASE, 'utf8'));
  const m = new Map();
  const push = (loc, text) => m.set(loc, (m.get(loc) || '') + text);
  for (const c of d.chapters) {
    for (const p of c.paras || []) push(`教材·第${c.no}章`, p);
    for (const s of c.secs || []) {
      for (const p of s.paras || []) push(`教材·第${c.no}章·${s.no}`, p);
      for (const u of s.subs || []) for (const p of u.paras || []) push(`教材·第${c.no}章·${u.no}`, p);
    }
  }
  return m;
}

test('1. 254 − 58 = 196，四档自洽', () => {
  const d = doc();
  assert.strictEqual(d.stat.patterns, 254);
  assert.strictEqual(d.stat.residual, 58);
  assert.strictEqual(d.stat.real, 196);
  assert.strictEqual(d.stat.patterns - d.stat.residual, d.stat.real);
  const t = d.stat.tally;
  assert.strictEqual(t.exact + t.covered + t.fragment + t.none, 196);
  assert.strictEqual(d.rows.length, 196);
  assert.strictEqual(t.none, 6, '硬缺口应恰为 6 条');
});

test('2. 每行字段齐、bucket 合法', () => {
  for (const r of doc().rows) {
    assert.ok(/^S[A-Z][A-Z0-9]{2}$/.test(r.code), `码格式异常：${r.code}`);
    assert.ok(r.zh && r.en, `${r.code} 缺中/英文名`);
    assert.ok(['exact', 'covered', 'fragment', 'none'].includes(r.bucket), `${r.zh} bucket 非法`);
  }
  const codes = doc().rows.map((r) => r.code);
  assert.strictEqual(new Set(codes).size, 196, '同一 TM1 码重复出现');
});

test('3. exact 行的 probe 真在教材正文里', () => {
  const text = [...paraMap().values()].join('');
  for (const r of doc().rows.filter((x) => x.bucket === 'exact')) {
    assert.ok(r.probe && r.probe.length >= 2, `${r.zh} 缺 probe`);
    assert.ok(text.includes(r.probe), `${r.zh} 的 probe「${r.probe}」不在教材正文里`);
    assert.ok(r.loc && r.loc.startsWith('教材·第'), `${r.zh} 缺教材定位`);
  }
});

test('4. covered 行的病位+病性同段共现', () => {
  const M = paraMap();
  for (const r of doc().rows.filter((x) => x.bucket === 'covered')) {
    assert.ok(r.pos && r.nat, `${r.zh} 缺 pos/nat`);
    const seg = M.get(r.loc);
    assert.ok(seg, `${r.zh} 的 locator 找不到段落：${r.loc}`);
    assert.ok(seg.includes(r.pos) && seg.includes(r.nat), `${r.zh}：${r.pos}/${r.nat} 在 ${r.loc} 未共现`);
  }
});

test('5. fragment 行是「片段」而不是整名', () => {
  for (const r of doc().rows.filter((x) => x.bucket === 'fragment')) {
    assert.ok(r.lcs && r.lcs.length >= 2, `${r.zh} 片段长度不足`);
    assert.notStrictEqual(r.lcs, r.zh, `${r.zh}：片段等于全名，应归 exact`);
    assert.notStrictEqual(r.lcs, r.zh.replace(/证$/, ''), `${r.zh}：片段等于核心名，应归 exact`);
    assert.ok(r.loc, `${r.zh} 缺教材定位`);
  }
});

test('6. 硬缺口名单固定（变了必须重新确认）', () => {
  const none = doc().rows.filter((r) => r.bucket === 'none').map((r) => r.zh).sort();
  assert.deepStrictEqual(none, ['火热淫证', '水毒证', '水气凌心证', '精虚证', '血燥证', '风痰证'].sort());
});

test('7. md 同源 + 边界声明', () => {
  const t = fs.readFileSync(MD, 'utf8');
  // 「四、逐条结果」一节才是 196 行全表（「二、完全没有」那 6 条另列，不重复计）
  const sec4 = t.slice(t.indexOf('## 四、'));
  const rows = sec4.split('\n').filter((l) => /^\| S[A-Z][A-Z0-9]{2} \|/.test(l));
  assert.strictEqual(rows.length, 196, 'md 逐条表应为 196 行');
  for (const k of ['① 教材原样出现', '② 病位+病性同段共现', '③ 只有词面片段', '④ **教材完全没有']) {
    assert.ok(t.includes(k), `md 缺档位行：${k}`);
  }
  for (const k of ['不做语义归并', '不等于教材把它们当证候名讲', '不是中医文献全库']) {
    assert.ok(t.includes(k), `md 缺边界：${k}`);
  }
});
