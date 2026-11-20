#!/usr/bin/env node
/**
 * tests/test_video_ledger.js —— 成片台账不许自说自话
 *
 * `scripts/build_video_ledger.js --check` 核的是「实物与声称对不对」；
 * 这一支门核的是**台账自身**在任何机器上都成立的四件事（不需要 mp4 在场）：
 *
 *   1. 课程集合 = platform/courses/<dept>/<subject>（有 course.yaml 的都必须进台账，一门都不许漏）；
 *   2. 每章的 status 必须由它自己的实测字段推得出来（rendered ⇒ mp4 ∧ 时长>0 ∧ 字幕 ∧ 帧>0 ∧ 配音>0 ∧ segments>0）；
 *   3. 章清单与 course.yaml 逐条对齐（yaml 加章而台账没重算 → 红）；
 *   4. totals 全是各课之和，课程级 rendered/partial/missing 与逐章一致。
 *
 * 为什么第 2 条要「按字段重推」而不是读 status 就算：
 *   status 是脚本写的，脚本写错时读自己的输出永远看不出来。重推一遍才叫门。
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const LEDGER = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'video-artifacts.json'), 'utf8'));
const COURSES = path.join(ROOT, 'platform', 'courses');

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};

/** 与 build_video_ledger.js 同口径的 course.yaml 读取（只取章清单） */
function yamlChapterSlugs(yamlPath) {
  const slugs = [];
  let inChapters = false;
  for (const line of fs.readFileSync(yamlPath, 'utf8').split(/\r?\n/)) {
    if (/^chapters:\s*$/.test(line)) { inChapters = true; continue; }
    if (!inChapters) continue;
    const m = /^\s*-\s+slug:\s*(\S+)\s*$/.exec(line);
    if (m) slugs.push(m[1]);
  }
  return slugs;
}

function courseYamls() {
  const out = [];
  if (!fs.existsSync(COURSES)) return out;
  for (const dept of fs.readdirSync(COURSES)) {
    const d = path.join(COURSES, dept);
    if (!fs.statSync(d).isDirectory()) continue;
    for (const subject of fs.readdirSync(d)) {
      const p = path.join(d, subject, 'course.yaml');
      if (fs.existsSync(p)) out.push({ id: `${dept}/${subject}`, path: p });
    }
  }
  return out;
}

console.log('\n成片台账\n');

test('课程集合 = platform/courses（一门都不许漏）', () => {
  const want = courseYamls().map((c) => c.id).sort();
  const got = LEDGER.courses.map((c) => c.id).sort();
  assert.deepStrictEqual(got, want, `台账 ${got.length} 门 ≠ 磁盘 ${want.length} 门`);
});

test('每章 status 可由实测字段重推（不看台账自述）', () => {
  for (const c of LEDGER.courses) {
    for (const i of c.items) {
      const full = i.mp4 && i.durationSec > 0 && i.subtitles && i.frames > 0 && i.audio > 0 && i.segments > 0;
      const some = i.mp4 || i.frames > 0 || i.audio > 0 || i.subtitles || i.segments > 0;
      const want = full ? 'rendered' : (some ? 'partial' : 'missing');
      assert.strictEqual(i.status, want, `${c.id}/${i.slug}: 台账写 ${i.status}，字段重推为 ${want}`);
    }
  }
});

test('章清单与 course.yaml 逐条对齐', () => {
  const byId = new Map(courseYamls().map((c) => [c.id, c.path]));
  for (const c of LEDGER.courses) {
    const want = yamlChapterSlugs(byId.get(c.id));
    const got = c.items.map((i) => i.slug);
    assert.deepStrictEqual(got, want, `${c.id}: 台账章清单与 course.yaml 不一致（yaml 改了没重算台账？）`);
  }
});

test('totals / 课级计数 = 逐章之和', () => {
  let chapters = 0; let rendered = 0; let partial = 0; let missing = 0; let dur = 0;
  for (const c of LEDGER.courses) {
    const r = c.items.filter((i) => i.status === 'rendered').length;
    const p = c.items.filter((i) => i.status === 'partial').length;
    const m = c.items.filter((i) => i.status === 'missing').length;
    assert.strictEqual(c.chapters, c.items.length, `${c.id}: chapters ${c.chapters} ≠ items ${c.items.length}`);
    assert.strictEqual(c.rendered, r, `${c.id}: rendered 计数不符`);
    assert.strictEqual(c.partial, p, `${c.id}: partial 计数不符`);
    assert.strictEqual(c.missing, m, `${c.id}: missing 计数不符`);
    chapters += c.items.length; rendered += r; partial += p; missing += m; dur += c.durationSec;
  }
  assert.strictEqual(LEDGER.totals.chapters, chapters, 'totals.chapters 不符');
  assert.strictEqual(LEDGER.totals.rendered, rendered, 'totals.rendered 不符');
  assert.strictEqual(LEDGER.totals.partial, partial, 'totals.partial 不符');
  assert.strictEqual(LEDGER.totals.missing, missing, 'totals.missing 不符');
  assert.ok(Math.abs(LEDGER.totals.durationSec - dur) < 1, `totals.durationSec ${LEDGER.totals.durationSec} ≠ 课上之和 ${dur}`);
});

if (failures.length) {
  console.error(`\n${failures.length} 项失败 / ${passed} 项通过`);
  process.exit(1);
}
console.log(`\n${passed} 项全部通过`);
