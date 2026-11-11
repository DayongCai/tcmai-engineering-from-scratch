'use strict';
/**
 * 病证覆盖分析门（8 项）
 *   1. 三档自洽：same+near+missing = 12；tally 合计也是 12
 *   2. 「仅 1 证」确实是 12 个病，且每个病只有 1 条 BZU 单元
 *   3. 同名档（same）必须 exact，且命中单元去「证」后与 BZU 证名完全相同
 *   4. 近名档（near）**不许**出现同名单元（否则就是判定出错）
 *   5. 近名档每一条都有 why（差在哪），不许空
 *   6. 第 26 章有释义实体实测 0 条（TM1 无定义），数字必须与 entities.ndjson 复算一致
 *   7. 病名侧：withDisorder + noDisorder = 12，且 noDisorder 名单与数据一致
 *   8. md 与 json 同源：12 行逐病表、含三档数字、含三条边界声明
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DOC = path.join(ROOT, 'standards', 'zhenduan', 'coverage.json');
const MD = path.join(ROOT, 'standards', 'zhenduan', 'coverage.md');
const BZU = path.join(ROOT, 'standards', 'zhenduan', 'bzu.json');
const ENT = path.join(ROOT, 'data', 'icd11', 'entities.ndjson');

const doc = () => JSON.parse(fs.readFileSync(DOC, 'utf8'));
const md = () => fs.readFileSync(MD, 'utf8');
const norm = (s) => String(s || '').replace(/[（(].*?[)）]/g, '').replace(/\s/g, '').replace(/证$/, '');

test('1. 三档自洽', () => {
  const d = doc();
  const t = d.stat.tier;
  assert.strictEqual(t.same + t.near + t.missing, 12, '三档之和应为 12');
  assert.strictEqual(d.stat.tally.exact + d.stat.tally.contain + d.stat.tally.keyword + d.stat.tally.none, 12);
  assert.strictEqual(d.rows.length, 12, '逐病行数应为 12');
  assert.strictEqual(t.same, 5);
  assert.strictEqual(t.near, 7);
  assert.strictEqual(t.missing, 0);
});

test('2. 「仅 1 证」的 12 个病', () => {
  const bzu = JSON.parse(fs.readFileSync(BZU, 'utf8'));
  const units = bzu.units.filter((u) => /^BZ-B\d+-Z\d+$/.test(u.bzu || ''));
  assert.strictEqual(units.length, 26, 'BZU 单元应为 26');
  for (const r of doc().rows) {
    assert.strictEqual(r.onlyOne, true, `${r.bing} 不是「仅 1 证」`);
    assert.strictEqual(r.unitCount, 1);
    assert.ok(r.zheng && r.zheng.endsWith('证'), `${r.bing} 的证名应以「证」结尾`);
  }
  const names = doc().rows.map((r) => r.bing).sort();
  assert.deepStrictEqual(names, ['不寐', '中风', '便秘', '呕吐', '哮喘'.replace('哮喘', '哮病'), '喘证', '头痛', '水肿', '淋证', '消渴', '泄泻', '腰痛'].sort());
});

test('3. 同名档必须真同名', () => {
  for (const r of doc().rows.filter((x) => x.patternMatch.tier === 'same')) {
    assert.strictEqual(r.patternMatch.how, 'exact', `${r.bing} 同名档却不是 exact`);
    const h = r.patternMatch.hits[0];
    assert.strictEqual(norm(h.zh), norm(r.zheng), `${r.bing}：${h.zh} ≠ ${r.zheng}`);
    assert.ok(h.code, '缺 TM1 码');
  }
});

test('4. 近名档不许有同名单元', () => {
  for (const r of doc().rows.filter((x) => x.patternMatch.tier === 'near')) {
    assert.notStrictEqual(r.patternMatch.how, 'exact', `${r.bing} 判近名却有 exact 命中`);
    for (const h of r.patternMatch.hits) {
      assert.notStrictEqual(norm(h.zh), norm(r.zheng), `${r.bing}：近名档里出现同名单元 ${h.zh}`);
    }
  }
});

test('5. 近名档必须说明差在哪', () => {
  for (const r of doc().rows.filter((x) => x.patternMatch.tier === 'near')) {
    assert.ok(r.patternMatch.why && r.patternMatch.why.length >= 15, `${r.bing}/${r.zheng} 缺 why`);
  }
});

test('6. 第 26 章 0 条有释义（复算）', () => {
  const ents = fs.readFileSync(ENT, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const ch26 = ents.filter((e) => String(e.chapterCode) === '26');
  const withDef = ch26.filter((e) => e.hasDefinition);
  const d = doc();
  assert.strictEqual(d.stat.ch26Entities, ch26.length, '第 26 章实体数不一致');
  assert.strictEqual(d.stat.ch26WithDef, withDef.length, '有释义实体数不一致');
  assert.strictEqual(withDef.length, 0, 'TM1 应变 0 条有释义；若变了说明数据层更新，需重跑');
  assert.ok(ch26.length > 900, '第 26 章实体数异常');
});

test('7. 病名侧三档自洽（同名 + 近名 + 无 = 12）', () => {
  const d = doc();
  assert.strictEqual(d.stat.withDisorder + d.stat.disorderNear.length + d.stat.noDisorder.length, 12);
  assert.deepStrictEqual(d.stat.withDisorder, 8);
  assert.deepStrictEqual(d.stat.disorderNear.slice().sort(), ['中风', '头痛', '淋证'].sort());
  assert.deepStrictEqual(d.stat.noDisorder.slice(), ['呕吐']);
  const expectNone = d.rows.filter((r) => r.disorderMatch === 'none').map((r) => r.bing).sort();
  assert.deepStrictEqual(d.stat.noDisorder.slice().sort(), expectNone, 'noDisorder 与逐病行不一致');
  for (const r of d.rows) assert.ok(['exact', 'contain', 'none'].includes(r.disorderMatch), `${r.bing} 缺 disorderMatch`);
});

test('8. md 同源 + 边界声明', () => {
  const t = md();
  // 逐病表 7 列（共 9 个分隔片段）；近名表只有 4 列（6 段）——靠列数区分，避免把两张表混算
  const rows = t.split('\n').filter((l) => /^\| (不寐|头痛|中风|呕吐|泄泻|便秘|淋证|水肿|腰痛|消渴|喘证|哮病) \|/.test(l) && l.split('|').length === 9);
  assert.strictEqual(rows.length, 12, 'md 逐病表应为 12 行');
  for (const s of ['① TM1 有**同名**证候单元', '② 只有**近名**单元', '③ TM1 完全无对应单元']) {
    assert.ok(t.includes(s), `md 缺档位行：${s}`);
  }
  assert.ok(t.includes('不做同义归并'), 'md 缺「不做同义归并」口径');
  assert.ok(t.includes('没有一条有释义'), 'md 缺「TM1 无释义」结论');
  assert.ok(t.includes('近名不能当同证用'), 'md 缺近名不可当同证的声明');
  assert.ok(t.includes('必须人工判定'), 'md 缺人工判定边界');
});
