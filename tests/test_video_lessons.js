#!/usr/bin/env node
/**
 * tests/test_video_lessons.js —— 188 门学科的网络视频台账不许自说自话
 *
 * 台账最容易变成「一张好看的假表」：讲数手填、时长凭印象、缺口悄悄漏掉几门。
 * 这里钉五件事：
 *   1. 学科数 = curriculum.json 的学科数（一门都不能少，缺的也要占一行）；
 *   2. 每门「有语料」的学科，其 sources 指向的目录必须真实存在；
 *   3. 讲数可从磁盘重算（B 站合集 episodes / ASR pNN / 字幕 sections 各抽查）；
 *   4. 合计 = 各学科之和（不悬空）；
 *   5. 有语料的学科必须有 `video/教案.md`，且讲次表行数 ≤ 讲数。
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DOC = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/video-lessons.json'), 'utf8'));
const CURR = JSON.parse(fs.readFileSync(path.join(ROOT, 'curriculum.json'), 'utf8'));

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

console.log('\n网络视频教案台账\n');

test('学科数 = curriculum（缺的学科也要占一行，写 none）', () => {
  const want = CURR.departments.reduce((n, d) => n + d.subjects.length, 0);
  assert.strictEqual(DOC.subjects.length, want, `台账 ${DOC.subjects.length} ≠ curriculum ${want}`);
  const none = DOC.subjects.filter((s) => s.status === 'none');
  assert.ok(none.length > 0, '不该出现「全部都有视频」——那多半是把缺口藏了');
  for (const s of none) assert.strictEqual(s.plan, null, `${s.slug} 没有语料却挂了教案`);
});

test('有语料的学科：源目录真实存在，教案文件真实存在', () => {
  for (const s of DOC.subjects.filter((x) => x.status !== 'none')) {
    assert.ok(s.sources.length > 0, `${s.slug} 状态 ${s.status} 但没有 sources`);
    for (const src of s.sources) {
      assert.ok(fs.existsSync(path.join(ROOT, src.path)), `${s.slug}/${src.slug} 目录不存在：${src.path}`);
    }
    assert.ok(s.plan && fs.existsSync(path.join(ROOT, s.plan)), `${s.slug} 缺教案 ${s.plan}`);
  }
});

test('讲数可从磁盘重算（三类语料各抽查一门）', () => {
  const bil = DOC.subjects.flatMap((s) => s.sources).find((x) => x.kind === 'bilibili-season');
  const eps = readJson(path.join(ROOT, bil.path, 'sources', 'episodes.json'));
  assert.strictEqual(bil.lectures, eps.episodes.length, `B 站讲数 ${bil.lectures} ≠ episodes ${eps.episodes.length}`);

  const asr = DOC.subjects.flatMap((s) => s.sources).find((x) => x.kind === 'asr');
  const n = fs.readdirSync(path.join(ROOT, asr.path, 'asr')).filter((f) => /^p\d+\.json$/.test(f)).length;
  assert.strictEqual(asr.lectures, n, `ASR 讲数 ${asr.lectures} ≠ pNN 文件 ${n}`);

  const sub = DOC.subjects.flatMap((s) => s.sources).find((x) => x.kind === 'audio-subtitle' || x.kind === 'video-subtitle');
  const content = readJson(path.join(ROOT, sub.path, 'content.json'));
  const secs = content.sections.filter((x) => (x.cues || []).length > 0).length;
  assert.strictEqual(sub.lectures, secs, `字幕讲数 ${sub.lectures} ≠ 有字表的 section ${secs}`);
});

test('合计 = 各学科之和（讲次/语句/时长都不悬空）', () => {
  const t = DOC.totals;
  const sum = (k) => DOC.subjects.reduce((n, s) => n + (s[k] || 0), 0);
  assert.strictEqual(t.lectures, sum('lectures'), '讲次合计');
  assert.strictEqual(t.cues, sum('cues'), '语句合计');
  assert.strictEqual(t.durationSec, sum('durationSec'), '时长合计');
  assert.strictEqual(t.withVideo + t.none, t.subjects, '有/无 相加 ≠ 学科总数');
});

test('教案里的讲次表行数 ≤ 台账讲数（不许表里多出没上账的讲）', () => {
  for (const s of DOC.subjects.filter((x) => x.status !== 'none')) {
    const md = fs.readFileSync(path.join(ROOT, s.plan), 'utf8');
    const rows = (md.match(/^\| \d+ \|/gm) || []).length;
    assert.ok(rows <= s.lectures, `${s.slug} 教案 ${rows} 行 > 台账 ${s.lectures} 讲`);
    assert.ok(/本文件由 `node scripts\/build_video_lessons\.js` 生成/.test(md), `${s.slug} 教案缺生成声明`);
  }
});

test('语料目录里没挂课的一份都不许丢（unattached 全部真实存在）', () => {
  assert.ok(Array.isArray(DOC.unattached));
  for (const u of DOC.unattached) {
    assert.ok(fs.existsSync(path.join(ROOT, 'standards/materials', u.slug)), `${u.slug} 不存在`);
  }
  const ledger = fs.readFileSync(path.join(ROOT, 'VIDEO-LESSONS.md'), 'utf8');
  for (const u of DOC.unattached) assert.ok(ledger.includes(u.slug), `台账里没列 ${u.slug}`);
});

if (failures.length) {
  console.log(`\n  ${passed} 通过 · ${failures.length} 失败\n`);
  process.exit(1);
}
console.log(`\n  ${passed} 通过 · 0 失败\n\n✅ 网络视频台账通过\n`);
