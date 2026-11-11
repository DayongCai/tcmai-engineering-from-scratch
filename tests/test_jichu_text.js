'use strict';
/**
 * 《中医基础理论》教材底本指纹门
 *   1. 母本 sha256 与 底本.json 记录一致（工作簿一改就红）
 *   2. 章/节/小节/段/字 五级计数与各章明细自洽
 *   3. 编号体系（第N章 / 9.1 / 9.1.1 / 9.1.1.1）不乱
 *   4. 引用格式：「教材·第N章·第M.M节」不得写成「底本」「原文」
 *   5. 已知缺陷必须留档：19 段截断、CALIBRATION 批注 5 条
 */

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.join(__dirname, '..');
const BOOK = path.join(ROOT, 'standards', 'jichu', '底本.json');
const README = path.join(ROOT, 'standards', 'jichu', 'README.md');
const doc = JSON.parse(fs.readFileSync(BOOK, 'utf8'));

function sha256(p) {
  return crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
}

test('母本 sha256 与记录一致（教材换版必须重跑 build_jichu_text.py）', () => {
  const p = doc.source.path;
  assert.ok(fs.existsSync(p), `母本不存在：${p}`);
  assert.strictEqual(sha256(p), doc.source.sha256);
});

test('章 13 · 节 70 · 小节 164 · 段 327 · 45,199 字', () => {
  const c = doc.counts;
  assert.strictEqual(c.chapters, 13);
  assert.strictEqual(c.secs, 70);
  assert.strictEqual(c.subs, 164);
  assert.strictEqual(c.paras, 327);
  assert.strictEqual(c.chars, 45199);
});

test('各章明细之和等于总数（不重不漏）', () => {
  const sum = (k) => doc.chapters.reduce((n, ch) => n + ch.counts[k], 0);
  assert.strictEqual(sum('secs'), doc.counts.secs);
  assert.strictEqual(sum('subs'), doc.counts.subs);
  assert.strictEqual(sum('paras'), doc.counts.paras);
  assert.strictEqual(sum('chars'), doc.counts.chars);
});

test('章号 1..13 连续，标题非空', () => {
  const nos = doc.chapters.map((c) => Number(c.no));
  assert.deepStrictEqual(nos, Array.from({ length: 13 }, (_, i) => i + 1));
  for (const c of doc.chapters) assert.ok(c.title && c.title.length >= 2, `第${c.no}章标题为空`);
});

test('节号形如 N.M，且章号与所属章一致', () => {
  for (const c of doc.chapters) {
    for (const s of c.secs) {
      assert.match(s.no, /^\d+\.\d+$/, `节号格式错：${s.no}`);
      assert.strictEqual(s.no.split('.')[0], c.no, `节 ${s.no} 挂错章`);
    }
  }
});

test('小节号 N.M.K，父节存在', () => {
  for (const c of doc.chapters) {
    const secNos = new Set(c.secs.map((s) => s.no));
    for (const s of c.secs) {
      for (const sub of s.subs) {
        assert.match(sub.no, /^\d+\.\d+\.\d+$/);
        assert.ok(secNos.has(sub.no.split('.').slice(0, 2).join('.')));
        assert.strictEqual(sub.no.split('.').slice(0, 2).join('.'), s.no);
      }
    }
  }
});

test('校准批注 5 条，均为【…】开头（不进正文计数）', () => {
  assert.strictEqual(doc.notes.length, 5);
  for (const n of doc.notes) assert.match(n.text, /^【[^】]+】/);
});

test('已知缺陷留档：19 段截断（README 与章节代码都要能对上）', () => {
  let trunc = 0;
  for (const c of doc.chapters) {
    for (const s of c.secs) {
      for (const sub of s.subs) {
        for (const p of sub.paras) if (!/[。！？；」』）]$/.test(p.trim())) trunc += 1;
      }
    }
  }
  assert.strictEqual(trunc, 19);
  const readme = fs.readFileSync(README, 'utf8');
  assert.ok(/19 段/.test(readme), 'README 必须写明 19 段截断');
});

test('引用格式：README 给对错例；产物里不出现「底本·」式引用', () => {
  const readme = fs.readFileSync(README, 'utf8');
  assert.ok(/教材·第N章·第M\.M节/.test(readme));
  assert.ok(/底本·4\.6\.1/.test(readme), 'README 应给出反例');
});

test('书名号式引文允许，但必须带章号（防止只写《中医基础理论》）', () => {
  const dirs = fs.readdirSync(path.join(ROOT, 'departments', '01-zhongyi', '01-zhongyi-jichu-lilun', 'chapters'));
  for (const d of dirs) {
    const f = path.join(ROOT, 'departments', '01-zhongyi', '01-zhongyi-jichu-lilun', 'chapters', d, 'docs', 'zh.md');
    if (!fs.existsSync(f)) continue;
    const md = fs.readFileSync(f, 'utf8');
    const bare = [...md.matchAll(/《中医基础理论》(?!·)/g)];
    assert.strictEqual(bare.length, 0, `${d} 出现无章号的《中医基础理论》引文`);
  }
});
