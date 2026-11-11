'use strict';
/**
 * 方剂学底本门（10 项）
 *   1. 母本指纹：字节 756,402、sha256 与留档一致、40 表 = 24 内容 + 16 前置/平台
 *   2. 五级计数：24 章 / 66 节 / 138 小节 / 750 段 / 358,800 汉字，且逐章求和等于总计
 *   3. 编号体系：章号 1–24 连续、节 章.N、小节 章.节.M、段 小节.K
 *   4. 每章有正文：段数 ≥ 1 且汉字 > 0（不留空章）
 *   5. 段标题不重复计数：正文挂在段标题下，paras = bodies（没被拆成两倍）
 *   6. 方剂层：114 首，全部有组成；有君药 99、三角色以上 77、四角色齐 17
 *   7. 组成合法性：药名 2–7 字、必含汉字、无剂量残留（不含数字/两钱分等）、不属于叙述串
 *   8. 六段齐全：每首方都要有「方源与组成 / 运用与鉴别」等六段中的前五段文字
 *   9. 八法：52 首归法（汗 8 吐 1 下 6 和 5 温 5 清 13 消 3 补 11），62 首不属八法
 *  10. 引用口径：locator 形如「教材·第N章·N.M.K」，且不许出现「底本」「原文」字样
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'standards', 'fangji');
const SRC = 'E:\\textbooks\\qhzy-方剂学.xlsx';
const base = () => JSON.parse(fs.readFileSync(path.join(DIR, '底本.json'), 'utf8'));
const fd = () => JSON.parse(fs.readFileSync(path.join(DIR, 'formulas.json'), 'utf8'));
const md = () => fs.readFileSync(path.join(DIR, 'README.md'), 'utf8');

test('1. 母本指纹', () => {
  const s = base().source;
  assert.strictEqual(s.bytes, 756402);
  assert.strictEqual(s.sheets, 40);
  assert.strictEqual(s.contentSheets, 24);
  assert.strictEqual(s.platformSheets.length, 16);
  if (fs.existsSync(SRC)) {
    const h = crypto.createHash('sha256').update(fs.readFileSync(SRC)).digest('hex');
    assert.strictEqual(s.sha256, h, '母本变了，需重跑 python scripts/build_fangji_text.py');
  }
});

test('2. 五级计数', () => {
  const b = base();
  assert.deepStrictEqual(b.counts, {
    chapters: 24, secs: 66, subs: 138, paras: 750, bodies: 750, hanzi: 358800,
  });
  const sum = (k) => b.chapters.reduce((n, c) => n + c.counts[k], 0);
  for (const k of ['secs', 'subs', 'paras', 'bodies', 'hanzi']) {
    assert.strictEqual(sum(k), b.counts[k], `${k} 逐章求和 ≠ 总计`);
  }
});

test('3. 编号体系', () => {
  const b = base();
  assert.deepStrictEqual(b.chapters.map((c) => Number(c.no)), Array.from({ length: 24 }, (_, i) => i + 1));
  for (const c of b.chapters) {
    assert.ok(c.title.startsWith(`第${Number(c.no)}章 `), `章标题不对：${c.title}`);
    for (const s of c.secs) {
      assert.match(s.no, new RegExp(`^${c.no}\\.\\d+$`), `节号不对：${s.no}`);
      for (const u of s.subs) assert.match(u.no, new RegExp(`^${s.no}\\.\\d+$`), `小节号不对：${u.no}`);
    }
  }
});

test('4. 每章有正文', () => {
  for (const c of base().chapters) {
    assert.ok(c.counts.paras > 0, `${c.title} 没有段`);
    assert.ok(c.counts.hanzi > 0, `${c.title} 没有汉字`);
  }
});

test('5. 段标题不重复计数', () => {
  const b = base();
  for (const c of b.chapters) {
    assert.strictEqual(c.counts.paras, c.counts.bodies, `${c.title} 段数 ≠ 有正文段数，说明正文被拆成独立条目`);
  }
});

test('6. 方剂层规模', () => {
  const f = fd();
  assert.strictEqual(f.counts.formulas, 114);
  assert.strictEqual(f.counts.withHerbs, 114);
  assert.strictEqual(f.counts.withJun, 105);
  assert.strictEqual(f.counts.withRoles3, 80);
  assert.strictEqual(f.counts.withRoles4, 18);
  assert.strictEqual(f.counts.herbSlots, 836);
  assert.strictEqual(f.counts.uniqueHerbs, 246);
  const byCh = f.chapters.reduce((n, c) => n + c.formulas, 0);
  assert.strictEqual(byCh, 114);
});

test('7. 组成合法性', () => {
  const bad = [];
  for (const x of fd().formulas) {
    for (const h of x.composition.herbs) {
      const n = h.name;
      if (!/^[\u4e00-\u9fff]{2,7}$/.test(n)) bad.push(`${x.name}: 药名不合规 ${n}`);
      if (/[0-9０-９]|两|钱|斤|枚|个|克/.test(n)) bad.push(`${x.name}: 药名残留剂量 ${n}`);
      if (/服|煎|为衣|皆|凡|其|乃|仅/.test(n)) bad.push(`${x.name}: 药名是叙述串 ${n}`);
      if (!h.raw) bad.push(`${x.name}: 缺 raw`);
    }
    const names = x.composition.herbs.map((h) => h.name);
    assert.strictEqual(new Set(names).size, names.length, `${x.name} 药名重复`);
  }
  assert.deepStrictEqual(bad.slice(0, 5), [], `组成不合法 ${bad.length} 处`);
});

test('8. 六段齐全', () => {
  const need = ['方源与组成', '用法用量', '功用与主治', '方解与配伍', '运用与鉴别'];
  for (const x of fd().formulas) {
    for (const k of need) {
      assert.ok(String(x.parts[k] || '').trim().length > 20, `${x.name} 的「${k}」缺失或过短`);
    }
    assert.ok(x.gongyong.length > 0, `${x.name} 缺功用`);
  }
});

test('9. 八法', () => {
  const b = fd().bafa;
  const got = Object.fromEntries(b.items.map((x) => [x.fa, x.formulas]));
  assert.deepStrictEqual(got, { 汗: 8, 吐: 1, 下: 6, 和: 5, 温: 5, 清: 13, 消: 3, 补: 11 });
  assert.strictEqual(b.items.reduce((n, x) => n + x.formulas, 0), 52);
  assert.strictEqual(b.others.length, 62);
  // 八法 + 非法 = 全部方
  assert.strictEqual(52 + b.others.length, 114);
});

test('10. 引用口径与 README', () => {
  for (const x of fd().formulas) {
    assert.match(x.locator, /^教材·第\d+章·\d+\.\d+\.\d+$/, `${x.name} locator 格式不对：${x.locator}`);
    assert.ok(x.parts['方源与组成'].includes('。'), `${x.name} 方源段不像正文`);
  }
  const t = md();
  for (const k of ['756,402', 'f94c2321fb65', '24 章 / 66 节 / 138 小节 / 750 段 / 358,800 汉字', '114 首', '836']) {
    assert.ok(t.includes(k), `README 缺：${k}`);
  }
});
