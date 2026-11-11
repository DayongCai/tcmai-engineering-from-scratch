'use strict';
/**
 * 《中医诊断学》教材底本指纹门
 *   1. 母本 sha256 与 底本.json 记录一致
 *   2. 14 章 / 46 节 / 105 小节 / 196 段 / 22,215 字，且各章明细自洽
 *   3. 编号体系（第N章 / N.M / N.M.K / N.M.K.J）不乱，小节必须挂在所属节下
 *   4. 病证单元层 bzu.json：ICD 38 条 / BZU 27 条，且 sha256 与底本同源
 *   5. 引用格式：「教材·第N章·M.M」，不得写「底本·」「原文·」
 */

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const DIR = path.join(ROOT, 'standards', 'zhenduan');
const DOC = JSON.parse(fs.readFileSync(path.join(DIR, '底本.json'), 'utf8'));
const BZU = JSON.parse(fs.readFileSync(path.join(DIR, 'bzu.json'), 'utf8'));

function sha256(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

test('母本 sha256 与记录一致（教材换版必须重跑 build_zhenduan_text.py）', () => {
  assert.ok(fs.existsSync(DOC.source.path), `母本不存在：${DOC.source.path}`);
  assert.strictEqual(sha256(DOC.source.path), DOC.source.sha256);
  assert.strictEqual(BZU.source.sha256, DOC.source.sha256, '病证单元层必须与底本同源');
});

test('规模：14 章 / 46 节 / 105 小节 / 196 段 / 22,215 字', () => {
  const c = DOC.counts;
  assert.strictEqual(c.chapters, 14);
  assert.strictEqual(c.secs, 46);
  assert.strictEqual(c.subs, 105);
  assert.strictEqual(c.paras, 196);
  assert.strictEqual(c.chars, 22215);
});

test('各章明细之和等于总数（不重不漏）', () => {
  const sum = (k) => DOC.chapters.reduce((n, ch) => n + ch.counts[k], 0);
  for (const k of ['secs', 'subs', 'paras', 'chars']) assert.strictEqual(sum(k), DOC.counts[k], k);
});

test('章号 1..14 连续；节号 N.M 与章一致；小节父节存在', () => {
  assert.deepStrictEqual(DOC.chapters.map((c) => Number(c.no)), Array.from({ length: 14 }, (_, i) => i + 1));
  for (const c of DOC.chapters) {
    for (const s of c.secs) {
      assert.match(s.no, /^\d+\.\d+$/);
      assert.strictEqual(s.no.split('.')[0], c.no);
      for (const sub of s.subs) {
        assert.match(sub.no, /^\d+\.\d+\.\d+$/);
        assert.strictEqual(sub.no.split('.').slice(0, 2).join('.'), s.no, `${sub.no} 挂错节`);
      }
    }
  }
});

test('四诊与辨证两组字数（第2–5章 7,978 / 第6–12章 8,869）', () => {
  const by = Object.fromEntries(DOC.chapters.map((c) => [c.no, c.counts.chars]));
  const four = ['2', '3', '4', '5'].reduce((n, k) => n + by[k], 0);
  const bian = ['6', '7', '8', '9', '10', '11', '12'].reduce((n, k) => n + by[k], 0);
  assert.strictEqual(four, 7978);
  assert.strictEqual(bian, 8869);
});

test('病证单元层：ICD 命名 38 条 · BZU 26 条（含 1 行说明已过滤）', () => {
  assert.strictEqual(BZU.icd.length, 38);
  assert.strictEqual(BZU.units.length, 26);
  assert.deepStrictEqual(BZU.skipped, ['说明'], '非 BZU 行必须留账，不许静默丢弃');
  for (const x of BZU.icd) assert.ok(x.code && x.name, `ICD 行缺字段：${JSON.stringify(x).slice(0, 60)}`);
  for (const u of BZU.units) {
    assert.ok(u.bzu && u.bing && u.zheng, `BZU 行缺字段：${JSON.stringify(u).slice(0, 60)}`);
    assert.match(u.bzu, /^BZ-B\d+-Z\d+$/);
  }
});

test('BZU 覆盖 18 个病 / 16 个证（证候层可检索）', () => {
  const bing = new Set(BZU.units.map((u) => u.bing.split(' ')[0]));
  const zheng = new Set(BZU.units.map((u) => u.zheng));
  assert.strictEqual(bing.size, 18);
  assert.strictEqual(zheng.size, 16);
});

test('引用格式：产物里不得出现「底本·N.M」「原文·N.M」', () => {
  const dirs = fs.readdirSync(path.join(ROOT, 'departments', '01-zhongyi', '05-zhongyi-zhen-duan-xue', 'chapters'));
  for (const d of dirs) {
    const f = path.join(ROOT, 'departments', '01-zhongyi', '05-zhongyi-zhen-duan-xue', 'chapters', d, 'docs', 'zh.md');
    if (!fs.existsSync(f)) continue;
    const md = fs.readFileSync(f, 'utf8');
    assert.ok(!/底本·\d+\.\d/.test(md), `${d} 出现「底本·」式引用`);
    assert.ok(!/原文·\d+\.\d/.test(md), `${d} 出现「原文·」式引用`);
    assert.ok(/教材·第\d+章/.test(md) || /《中医诊断学·第\d+章/.test(md), `${d} 缺章级引用`);
  }
});
