#!/usr/bin/env node
/**
 * tests/test_icd11_client.js — ICD-11 客户端（规格组件 ⑦ 双通道）
 *
 * 分两层测，因为这两层的依赖完全不同：
 *   A. 纯逻辑 —— 用**小型 fixture CSV**（含引号内逗号/换行/转义引号）跑，任何机器上都能跑。
 *   B. 真数据 —— 校验本仓库的 icd11_map 编码。需要 data/icd11/ 里的 WHO 快照（19.5 MB，
 *      不入版本库）。缺快照时**显式跳过并打印怎么补**，不假装通过、也不用小 fixture 冒充真结论。
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert');

const ROOT = path.resolve(__dirname, '..');
const IC = require(path.join(ROOT, 'scripts', 'icd11_client.js'));

let passed = 0, skipped = 0;
const failures = [];
function test(name, fn) {
  try { passed += 1; fn(); console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}
function skip(name, why) { skipped += 1; console.log(`  ⊘ ${name}\n      ${why}`); }

console.log('═══ ICD-11 客户端 ═══\n');
console.log(' A. 纯逻辑（fixture）\n');

// ── CSV 解析：引号内逗号与换行是最容易悄悄出错的两种 ──
test('RFC4180 解析：引号内的逗号不当分隔符', () => {
  const rows = IC.parseCsv('a,b\n"x, y",z\n');
  assert.deepStrictEqual(rows[1], ['x, y', 'z']);
});

test('RFC4180 解析：引号内的换行不当行尾', () => {
  const rows = IC.parseCsv('a,b\n"line1\nline2",z\n');
  assert.strictEqual(rows.length, 2, `行数 ${rows.length}：引号内换行被当成了行尾`);
  assert.strictEqual(rows[1][0], 'line1\nline2');
});

test('RFC4180 解析：两个连续引号是一个字面引号', () => {
  const rows = IC.parseCsv('a\n"he said ""hi"""\n');
  assert.strictEqual(rows[1][0], 'he said "hi"');
});

// ── fixture 建库 + 父链 ──
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'icd11-test-'));
const FIX = path.join(TMP, 'fix.csv');
// 19 列，按位置构造而不是手写字符串 —— 手数位数错一次，测的就是错的父链（第一版就这么错的）。
const COLS = 19;
const q = (v) => {
  const s = String(v == null ? '' : v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (id, code, title, kind, defn, parent) => {
  const a = new Array(COLS).fill('');
  a[0] = id; a[1] = code; a[2] = title; a[4] = kind; a[5] = defn; a[6] = parent;
  return a.map(q).join(',');
};
const HEADER = 'id,code,title,browser_url,class_kind,definition,parent,inclusions,foundation_children,foundation_child_references,index_terms,related_entities,full_text,children,postcoordination_scales,index_term_references,exclusions,exclusion_references,fully_specified_name';
fs.writeFileSync(FIX, [
  HEADER,
  row(100, '', 'Diseases of the respiratory system', 'chapter', '含逗号, 与\n换行的定义', ''),
  row(200, '', 'Upper respiratory tract disorders', 'block', '', 100),
  row(300, 'CA00', 'Acute nasopharyngitis, unspecified', 'category', '', 200),
  row(400, 'BA00', 'Essential hypertension', 'category', '', 999),  // 父 id 不在库中
].join('\n') + '\n', 'utf8');

const outDir = path.join(TMP, 'db');
const meta = IC.buildLocal({ csvPath: FIX, outDir, quiet: true, expectSha: false });
const db = IC.loadLocal(path.join(outDir, 'entities.ndjson'));

test('建库：跳过没有 id 的空行，实体数正确', () => {
  assert.strictEqual(meta.entities, 4, `实体 ${meta.entities}`);
  assert.strictEqual(db.size, 4);
});

test('建库：引号内的逗号/换行没有把标题切坏', () => {
  const e = db.byCode('CA00');
  assert.strictEqual(e.title, 'Acute nasopharyngitis, unspecified', `标题被切坏了：${e.title}`);
});

test('父链还原章节（MMS 单父，可上溯到 chapter）', () => {
  const e = db.byCode('CA00');
  assert.strictEqual(e.chapterCode, '');
  assert.strictEqual(e.chapterTitle, 'Diseases of the respiratory system');
  const lin = db.lineage(e);
  assert.ok(/chapter/.test(lin[lin.length - 1]), `父链最后一环不是 chapter：${JSON.stringify(lin)}`);
});

test('父链断裂（父 id 不在库中）不抛异常，章节留空', () => {
  const e = db.byCode('BA00');
  assert.strictEqual(e.chapterId, '', '父 id 不存在时不该猜一个章节');
  assert.strictEqual(e.chapterTitle, '');
});

test('规格签名 code_by_id 返回的字段恰是 {id, code, title}', () => {
  const r = db.code_by_id('300');
  assert.deepStrictEqual(Object.keys(r).sort(), ['code', 'id', 'title']);
  assert.deepStrictEqual(r, { id: '300', code: 'CA00', title: 'Acute nasopharyngitis, unspecified' });
  assert.strictEqual(db.code_by_id('不存在'), null, '查不到必须返回 null，不能抛也不能编');
});

test('sha256 闸：快照内容变过就拒绝建库', () => {
  assert.throws(() => IC.buildLocal({ csvPath: FIX, outDir: path.join(TMP, 'db2'), quiet: true }),
    /sha256 不符/, '篡改过的快照竟然建库成功了');
});

test('meta 如实记录与规格的规模差，不宣称等价', () => {
  assert.strictEqual(meta.specEntities, 31838);
  assert.strictEqual(meta.specDelta, 31838 - meta.entities);
  assert.match(meta.specNote, /不宣称等价|不是同一份/);
  assert.ok(meta.specDelta > 0, '竟然有 31,838 实体？那必须重审这条测试的前提');
});

// ── 通道1：凭据处理 ──
test('请求头与规格原文逐字一致', () => {
  assert.deepStrictEqual(IC.ICD_API_HEADERS, { Accept: 'application/json', 'Accept-Language': 'zh', 'API-Version': 'v2' });
  assert.match(IC.WHO.tokenUrl, /^https:\/\/icdaccessmanagement\.who\.int\/connect\/token$/);
  assert.strictEqual(IC.WHO.base, 'https://id.who.int');
});

test('凭据探测只报键名有无，绝不回值', () => {
  const before = { id: process.env.ICD11_CLIENT_ID, secret: process.env.ICD11_CLIENT_SECRET };
  process.env.ICD11_CLIENT_ID = 'fake-id-should-never-be-printed';
  process.env.ICD11_CLIENT_SECRET = 'fake-secret-should-never-be-printed';
  try {
    const c = IC.credentials();
    const dumped = JSON.stringify(c.present);
    assert.ok(!dumped.includes('fake-id'), 'present 里带出了 id 值');
    assert.ok(!dumped.includes('fake-secret'), 'present 里带出了 secret 值');
    for (const v of Object.values(c.present)) assert.strictEqual(typeof v, 'boolean');
    assert.strictEqual(c.ok, true);
  } finally {
    if (before.id === undefined) delete process.env.ICD11_CLIENT_ID; else process.env.ICD11_CLIENT_ID = before.id;
    if (before.secret === undefined) delete process.env.ICD11_CLIENT_SECRET; else process.env.ICD11_CLIENT_SECRET = before.secret;
  }
});

// 无凭据路径是异步的（whoToken 是 async）。不能塞进同步 test()：
// 返回的 Promise 不会被打包器等待，断言失败会变成静默通过 —— 留到这里显式 await。
async function testNoCreds() {
  const saved = { id: process.env.ICD11_CLIENT_ID, secret: process.env.ICD11_CLIENT_SECRET };
  delete process.env.ICD11_CLIENT_ID; delete process.env.ICD11_CLIENT_SECRET;
  try {
    const r = await IC.whoToken();
    assert.strictEqual(r.ok, false, '没有凭据竟然返回 ok=true');
    assert.match(r.reason, /未配置凭据/);
    assert.strictEqual(r.token, undefined, '没有凭据却带回了 token');
  } finally {
    if (saved.id !== undefined) process.env.ICD11_CLIENT_ID = saved.id;
    if (saved.secret !== undefined) process.env.ICD11_CLIENT_SECRET = saved.secret;
  }
}

fs.rmSync(TMP, { recursive: true, force: true });

// ── B. 真数据（缺快照则显式跳过）──
console.log('\n B. 真数据（本仓库 icd11_map 编码 ↔ WHO 快照）\n');
const realDb = IC.loadLocal();
if (!realDb) {
  skip('校验本仓库 icd11_map 的编码', 'data/icd11/entities.ndjson 不存在。补法：npm run icd11:ensure（需联网取 19.5 MB 快照）');
} else {
  const v = IC.validate(realDb);
  test(`本地库规模与规格规模不是一回事（${realDb.size} vs 31,838）`, () => {
    assert.ok(realDb.size > 10000, `库只有 ${realDb.size} 实体`);
    assert.notStrictEqual(realDb.size, 31838, '规模竟然与规格相同？必须重审这条断言');
  });
  test(`仓库 icd11_map 的编码全部能解析（${v.resolved}/${v.checked}）`, () => {
    assert.strictEqual(v.checked, 7, `取到的编码数变了：${v.checked}`);
    assert.strictEqual(v.resolved, v.checked, `未解析：${v.rows.filter((r) => !r.resolved).map((r) => r.icd).join(',')}`);
  });
  test('解析出的官方标题与章节来自快照，不是本地编的', () => {
    const ca = v.rows.find((r) => r.icd === 'CA00');
    assert.strictEqual(ca.officialTitle, 'Acute nasopharyngitis');
    assert.strictEqual(ca.chapterCode, '12');
    assert.match(ca.chapterTitle, /respiratory/);
    assert.ok(ca.lineage.length >= 3, `CA00 的父链过短：${JSON.stringify(ca.lineage)}`);
  });
  test('规格实测输出里的 MC81 也能解析（端点行为的可验证前提）', () => {
    const p = v.specProbe.find((r) => r.icd === 'MC81');
    assert.ok(p.resolved, 'MC81 未解析');
    assert.match(p.officialTitle, /heart beat/);
  });
}

console.log('\n C. 通道1 凭据路径（异步，显式 await）\n');

// CommonJS 不支持顶层 await，尾部包一个 async IIFE。
(async () => {
  try {
    await testNoCreds();
    passed += 1;
    console.log('  ✓ 无凭据时 whoToken 明确说不可用，且不返回 token');
  } catch (e) {
    failures.push({ name: '无凭据时 whoToken 明确说不可用', err: e });
    console.log(`  ✗ 无凭据时 whoToken 明确说不可用\n      ${e.message}`);
  }

  console.log(`\n  ${passed} 通过 · ${failures.length} 失败 · ${skipped} 跳过`);
  if (failures.length) {
    console.log('\n失败明细:');
    failures.forEach((f) => console.log(`  ✗ ${f.name}\n    ${f.err.stack.split('\n').slice(0, 3).join('\n    ')}`));
    process.exit(1);
  }
  console.log('\n✅ ICD-11 客户端通过');
})();
