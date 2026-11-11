'use strict';
/**
 * 生理学·正常值数据层门（11 项）
 *   1. 结构：meta/sources/entries/pending/byDesign/mooc 齐；107 条条目、18 个来源、2 项 pending、1 项 byDesign
 *   2. id 唯一且前缀=来源号（S1-WBC 必须挂 S1）
 *   3. 每条目必填：item/value/unit/group/chapters/source/locator/quote；chapters ⊆ 1..11
 *   4. 来源留档：6 个 PDF 都在 sources/ 下，字节数与 sha256 逐个复算一致
 *   5. 来源字段：number/issuer/url/evidence/readHow/locator 齐；evidence ∈ {行业标准,学会指南,政府文件,教科书}
 *   6. pending 不许带数值（「不写数值」必须是事实，不是口号）
 *   7. MOOC 记录：status=unreachable 且 blocker/consequence 写明（不伪造成已获取）
 *   8. 生成块：11 章 docs 的 NV 块与 scripts/build_normal_values_section.js 现算完全一致
 *   9. 正文引用：docs 里每个 [[nv:ID]] 都存在于数据层，且该条目属于本章
 *   10. 正文零数值：docs 正文（剔除 NV 块）不出现「数字＋计量单位」
 *   11. CLI：node scripts/normal_values.js WBC 能查到 S1-WBC
 *   12. byDesign（教材刻意不给值）与 pending 互斥
 *   13. 正文引用段：11 章都有「界值在哪里」一节、与脚本现算一致；有值的章至少 3 个 [[nv:]]、无值的章必须指向 byDesign/pending
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DBF = path.join(ROOT, 'standards/shengli/normal-values/normal-values.json');
const SRC = path.join(ROOT, 'standards/shengli/normal-values/sources');
const CH = path.join(ROOT, 'departments/09-jichu/06-shengli-xue/chapters');
const db = JSON.parse(fs.readFileSync(DBF, 'utf8'));
const { blockFor, BEGIN, END } = require('../scripts/build_normal_values_section');

const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍)/;
const chapters = fs.readdirSync(CH).filter((d) => /^\d\d-/.test(d)).sort();
const read = (d) => fs.readFileSync(path.join(CH, d, 'docs/zh.md'), 'utf8').replace(/\r\n/g, '\n');

test('1. 结构：18 来源 / 107 条目 / 2 pending / 1 byDesign / MOOC 记录齐', () => {
  assert.ok(db.meta && db.meta.policy, 'meta.policy 必填');
  assert.strictEqual(Object.keys(db.sources).length, 18, '来源应为 18 个');
  assert.strictEqual(db.entries.length, 107, `条目应为 107，实为 ${db.entries.length}`);
  assert.strictEqual(db.pending.length, 2, `pending 应为 2，实为 ${db.pending.length}`);
  assert.strictEqual(db.byDesign.length, 1, `byDesign 应为 1，实为 ${db.byDesign.length}`);
  assert.ok(db.mooc, 'mooc 记录必填');
});

test('2. id 唯一且前缀等于来源号', () => {
  const seen = new Set();
  for (const e of db.entries) {
    assert.ok(!seen.has(e.id), `id 重复：${e.id}`);
    seen.add(e.id);
    assert.ok(e.id.startsWith(e.source + '-'), `${e.id} 前缀应为 ${e.source}-`);
  }
});

test('3. 每条目字段齐、chapters 落在 1..11', () => {
  for (const e of db.entries) {
    for (const k of ['id', 'item', 'value', 'unit', 'group', 'chapters', 'source', 'locator', 'quote']) {
      assert.ok(e[k] !== undefined && String(e[k]).trim() !== '', `${e.id} 缺 ${k}`);
    }
    assert.ok(Array.isArray(e.chapters) && e.chapters.length > 0, `${e.id} chapters 不能为空`);
    for (const c of e.chapters) assert.ok(c >= 1 && c <= 11 && Number.isInteger(c), `${e.id} 章号非法：${c}`);
  }
});

test('4. 来源留档：17 份文件有 sha256；10 号之后的口授来源只认署名与日期', () => {
  const files = fs.readdirSync(SRC).filter((f) => /\.(pdf|html)$/i.test(f)).sort();
  assert.strictEqual(files.length, 17, `sources/ 下应有 17 份留档，实为 ${files.length}`);
  for (const [id, s] of Object.entries(db.sources)) {
    if (s.provenance === 'oral') {
      assert.ok(s.attestedBy && s.attestedAt, `${id} 是口授来源，必须写清谁在何时口授`);
      assert.strictEqual(s.sha256, null, `${id} 口授来源不该有 sha256（那会假装有原文）`);
      continue;
    }
    const p = path.join(SRC, s.file);
    assert.ok(fs.existsSync(p), `${id} 的留档缺失：${s.file}`);
    const b = fs.readFileSync(p);
    assert.strictEqual(b.length, s.bytes, `${id} 字节数不符（${b.length} ≠ ${s.bytes}）`);
    const h = crypto.createHash('sha256').update(b).digest('hex');
    assert.strictEqual(h, s.sha256, `${id} sha256 不符`);
  }
});

test('5. 来源元信息齐、证据级别在白名单内', () => {
  const OK = new Set(['行业标准', '学会指南', '政府文件', '教科书']);
  for (const [id, s] of Object.entries(db.sources)) {
    for (const k of ['title', 'number', 'issuer', 'evidence', 'readHow', 'locator']) {
      assert.ok(s[k] && String(s[k]).trim(), `${id} 缺 ${k}`);
    }
    if (s.provenance === 'oral') {
      // 口授来源：字段集不同——必须有署名与日期，且 url/file/sha256 都为 null（不许假装有原文）
      for (const k of ['attestedBy', 'attestedAt']) {
        assert.ok(s[k] && String(s[k]).trim(), `${id} 是口授来源，缺 ${k}`);
      }
      for (const k of ['file', 'sha256', 'url']) {
        assert.strictEqual(s[k], null, `${id} 是口授来源，${k} 应为 null`);
      }
    } else {
      for (const k of ['url', 'file', 'sha256']) {
        assert.ok(s[k] && String(s[k]).trim(), `${id} 缺 ${k}`);
      }
      assert.match(s.url, /^https?:\/\//, `${id} url 非法`);
    }
    assert.ok(OK.has(s.evidence), `${id} 证据级别不在白名单：${s.evidence}`);
  }
});

test('6. pending 一律不带数值', () => {
  for (const p of db.pending) {
    assert.ok(!VALUE_RE.test(p.item + p.why + p.need), `pending「${p.item}」里出现了数值，pending 只许描述缺口`);
    assert.ok(p.chapters.length > 0 && p.why && p.need, `pending「${p.item}」缺 chapters/why/need`);
  }
});

test('7. MOOC 记为未取到，且写明原因与后果', () => {
  assert.strictEqual(db.mooc.status, 'unreachable');
  assert.match(db.mooc.url, /icourse163\.org/);
  assert.ok(db.mooc.blocker.length > 10, 'blocker 要写清为什么取不到');
  assert.ok(db.mooc.consequence.length > 10, 'consequence 要写清改用什么来源');
  assert.match(db.mooc.blocker, /登录|凭据/, 'blocker 要指出登录墙/凭据问题');
});

test('8. 11 章 NV 块与生成脚本现算一致', () => {
  for (const d of chapters) {
    const ch = parseInt(d.slice(0, 2), 10);
    const t = read(d);
    const m = t.match(new RegExp(`${BEGIN}[\\s\\S]*?${END}`));
    assert.ok(m, `${d} 缺 NV 块（跑 node scripts/build_normal_values_section.js）`);
    assert.strictEqual(m[0], blockFor(ch), `${d} 的 NV 块与数据层不一致`);
  }
});

test('9. 正文 [[nv:ID]] 引用都存在且属于本章', () => {
  const byId = new Map(db.entries.map((e) => [e.id, e]));
  const bad = [];
  for (const d of chapters) {
    const ch = parseInt(d.slice(0, 2), 10);
    const t = read(d).replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`), '');
    for (const m of t.matchAll(/\[\[nv:([A-Za-z0-9\-]+)\]\]/g)) {
      const e = byId.get(m[1]);
      if (!e) bad.push(`${d}: ${m[1]} 不在数据层`);
      else if (!e.chapters.includes(ch)) bad.push(`${d}: ${m[1]} 不属于本章（属于第${e.chapters.join('/')}章）`);
    }
  }
  assert.deepStrictEqual(bad, [], bad.join('\n'));
});

test('10. 正文（剔除 NV 块）不出现数字＋计量单位', () => {
  const bad = [];
  for (const d of chapters) {
    const t = read(d).replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`), '');
    const hits = t.match(new RegExp(VALUE_RE.source, 'g')) || [];
    if (hits.length) bad.push(`${d}: ${hits.slice(0, 4).join('、')}`);
  }
  assert.deepStrictEqual(bad, [], `值只许出现在 NV 块里：\n${bad.join('\n')}`);
});

test('11. CLI 能查到条目，查不到时指向 pending', () => {
  const out = execFileSync('node', [path.join(ROOT, 'scripts/normal_values.js'), 'WBC'], { encoding: 'utf8' });
  assert.match(out, /S1-WBC/);
  assert.match(out, /WS\/T 405—2012/);
  let throttled = null;
  try {
    execFileSync('node', [path.join(ROOT, 'scripts/normal_values.js'), '动脉血气'], { encoding: 'utf8', stdio: 'pipe' });
  } catch (e) {
    throttled = e;
  }
  assert.ok(throttled, '查「动脉血气」应退出非 0（该值 pending，不许凭空给）');
  assert.match(String(throttled.stdout || ''), /pending 里有：动脉血气/);
});

test('12. byDesign（教材刻意不给值）与 pending（本层没找到）必须分开，且都不带数值', () => {
  const pend = new Set(db.pending.map((p) => p.item));
  for (const b of db.byDesign) {
    assert.ok(!pend.has(b.item), `${b.item} 同时出现在 pending 与 byDesign`);
    assert.ok(b.reason && b.evidence && b.consequence, `${b.item} 缺 reason/evidence/consequence`);
    assert.ok(b.chapters.length > 0, `${b.item} 缺 chapters`);
    assert.ok(!VALUE_RE.test(b.item + b.reason + b.evidence + b.consequence), `${b.item} 的 byDesign 描述里出现了数值`);
  }
  for (const p of db.pending) {
    assert.ok(!VALUE_RE.test(p.item + p.why + p.need), `pending「${p.item}」里出现了数值`);
  }
  // 细胞电生理必须留在 byDesign：教材 valueLike = 0 是取舍，不是缺口
  assert.ok(db.byDesign.some((b) => b.item.startsWith('细胞电生理')), '细胞电生理应在 byDesign，而不是 pending');
});

test('13. 11 章正文都接上了引用段：有值的章 ≥3 个 [[nv:]]，无值的章指向 byDesign/pending', () => {
  const { blockFor, BEGIN, END } = require('../scripts/wire_normal_values_refs');
  const byId = new Map(db.entries.map((e) => [e.id, e]));
  const withEntries = new Set();
  for (const e of db.entries) for (const c of e.chapters) withEntries.add(c);
  // 不用正则：token 就夹在 "[[nv:" 与 "]]" 之间，split 比转义可靠
  const tokens = (txt) => txt.split('[[nv:').slice(1).map((x) => x.split(']]')[0]);

  for (const d of chapters) {
    const ch = parseInt(d.slice(0, 2), 10);
    const t = read(d);
    if (!t.includes(BEGIN) || !t.includes(END)) {
      throw new Error(`${d} 缺引用段（跑 node scripts/wire_normal_values_refs.js）`);
    }
    const seg = t.split(BEGIN)[1].split(END)[0];
    assert.strictEqual(BEGIN + seg + END, blockFor(d), `${d} 的引用段与脚本现算不一致`);

    const ids = tokens(seg);
    if (withEntries.has(ch)) {
      assert.ok(ids.length >= 3, `${d} 有挂载值，但正文引用只有 ${ids.length} 个（应 ≥3）`);
      for (const id of ids) {
        assert.ok(byId.has(id), `${d} 引用了不存在的条目 ${id}`);
        assert.ok(byId.get(id).chapters.includes(ch), `${d} 引用的 ${id} 不属于本章`);
      }
    } else {
      assert.strictEqual(ids.length, 0, `${d} 无挂载值，不该有 [[nv:]] 引用`);
      assert.ok(/byDesign|无挂载|没有挂载|不给值/.test(seg), `${d} 无值章必须说明为什么没有值（byDesign / pending）`);
    }
  }
  const total = chapters.reduce((a, d) => a + tokens(read(d)).length, 0);
  assert.ok(total >= 40, `正文引用合计 ${total} 个，少于 40——等于建好没用`);
});


