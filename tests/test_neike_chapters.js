#!/usr/bin/env node
/**
 * tests/test_neike_chapters.js —— 中医内科学「14 章」门
 *
 * 为什么单独一道门：
 *   这一门的底本按**病证**组织（一章 8–9 个病证、40–55 个小节），正文极容易写成
 *   「病名清单 + 辨证分型 + 代表方」——读起来像教材、查起来全空。所以门只认可核的四件事：
 *   引文逐字回到原文、小节号逐个出现、非引文行不出现量值、quiz 引证指向真节号。
 *
 * locator 允许两级（两种都要能回查）：
 *   `教材·中医内科学·第4章·4.1.1`  → 小节级：引语必须在该小节正文里
 *   `教材·中医内科学·第4章·4.1`    → 节级：引语必须在该节的任一小节正文里
 * 两级都合法，但**回查范围按 locator 收紧**——不许用「整章里找得到」蒙过去。
 *
 * 九件事：
 *   1. 14 章 · 每章 6 文件齐；
 *   2. 教材引文逐字保真（按 locator 指定的节/小节范围回查）；
 *   3. locator 真且章号归属正确（底本 12 章不许引到别章；综合章跨 ≥5 章）；
 *   4. 底本 12 章：本章全部节号与小节号在 docs 里出现；综合章：跨章引文；
 *   5. docs 规模 8,000–20,000 非空白字；
 *   6. quiz 6 题 · pre/check×3/post×2 · 题干键 question · 每题带引证；
 *   7. outputs/prompt 与 skill（frontmatter name/description/version，name = 去章号 slug）；
 *   8. 章内单测可跑（不继承 NODE_TEST_CONTEXT），main.js 末行是教学边界声明；
 *   9. 数值口径 B 支（底本含 41 处剂量）：引文行放行、裸写照拦，且有边界声明。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SUB = path.join(ROOT, 'departments', '01-zhongyi', '10-zhongyi-neike-xue');
const DIR = path.join(SUB, 'chapters');
const BASE = path.join(ROOT, 'standards', 'neike', '底本.json');

const read = (p) => fs.readFileSync(p, 'utf8');
const nonWs = (s) => s.replace(/\s/g, '').length;
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』""'']/g, '');

// 章 + 编号链（4.1 或 4.1.1）；g 标志供 matchAll 用
const LOC = /教材·中医内科学·第(\d+)章·(\d+\.\d+(?:\.\d+)?)/g;

const base = () => JSON.parse(read(BASE));
const list = () => JSON.parse(read(path.join(SUB, 'chapters.json'))).chapters;
const docsOf = (slug) => read(path.join(DIR, slug, 'docs', 'zh.md'));
const chapOf = (n) => base().chapters.find((c) => c.no === Number(n));

/** 取 locator 指向的那一小节的正文（小节级）；节级则返回该节全部小节正文 */
function textsAt(chNo, chain) {
  const chap = chapOf(chNo);
  if (!chap) return null;
  const parts = chain.split('.');
  const secNo = parts.slice(0, 2).join('.');
  const sec = chap.secs.find((s) => s.no === secNo);
  if (!sec) return null;
  if (parts.length === 3) {
    const sub = sec.subs.find((u) => u.no === chain);
    return sub ? sub.items.map((it) => `${it.title}\n${it.body}`) : null;
  }
  return sec.subs.flatMap((u) => u.items.map((it) => `${it.title}\n${it.body}`));
}

/** 抽出「同一行里既有引语又有 locator」的引文 */
function quotesOf(doc) {
  const out = [];
  for (const line of doc.split('\n')) {
    const locs = [...line.matchAll(LOC)];
    if (!locs.length) continue;
    const last = locs[locs.length - 1];
    for (const q of line.matchAll(/「([^」]{6,})」/g)) {
      out.push({ text: q[1], ch: Number(last[1]), chain: last[2], line });
    }
  }
  return out;
}

test('1. 14 章与 6 文件齐', () => {
  const l = list();
  assert.strictEqual(l.length, 14, 'chapters.json 应声明 14 章');
  for (const c of l) {
    const short = c.slug.replace(/^\d+-/, '');
    const need = ['docs/zh.md', 'quiz.json', 'code/main.js', 'code/main.test.js',
      `outputs/prompt-${short}.md`, `outputs/skill-${short}.md`];
    for (const f of need) assert.ok(fs.existsSync(path.join(DIR, c.slug, f)), `${c.slug} 缺 ${f}`);
  }
});

test('2. 教材引文逐字保真（范围 = locator 指定的节/小节）', () => {
  for (const c of list()) {
    const qs = quotesOf(docsOf(c.slug));
    assert.ok(qs.length >= 10, `${c.slug} 带教材出处的引文只有 ${qs.length} 条（应 ≥10）`);
    for (const q of qs) {
      const texts = textsAt(q.ch, q.chain);
      assert.ok(texts, `${c.slug} locator 指向不存在的 ${q.chain}（第${q.ch}章）`);
      const P = texts.map(fold);
      assert.ok(P.some((p) => p.includes(fold(q.text))),
        `${c.slug} 引文在 ${q.chain} 里回查不到：${q.text.slice(0, 30)}`);
    }
  }
});

test('3. locator 真且章号归属正确', () => {
  for (const c of list()) {
    const doc = docsOf(c.slug);
    const synthesis = !c.source || c.source.synthesis;
    const locs = [...doc.matchAll(LOC)];
    assert.ok(locs.length >= 10, `${c.slug} locator 只有 ${locs.length} 条（应 ≥10）`);
    for (const m of locs) {
      const ch = Number(m[1]);
      const chain = m[2];
      assert.ok(chapOf(ch), `${c.slug} 引到不存在的第 ${ch} 章`);
      assert.ok(textsAt(ch, chain), `${c.slug} 引到不存在的编号 ${chain}（第${ch}章）`);
      if (!synthesis) assert.strictEqual(ch, Number(c.n), `${c.slug} 引到了第 ${ch} 章（本章应引第 ${c.n} 章）`);
    }
    if (synthesis) {
      const chs = new Set(locs.map((m) => Number(m[1])));
      assert.ok(chs.size >= 5, `${c.slug} 综合章只引了 ${chs.size} 个章（应 ≥5）`);
    }
    assert.ok(!/「?底本·/.test(doc), `${c.slug} 出现「底本·」式引用`);
  }
});

test('4. 小节/节覆盖（底本章逐个落位）', () => {
  for (const c of list()) {
    const synthesis = !c.source || c.source.synthesis;
    if (synthesis) continue;
    const doc = docsOf(c.slug);
    const chap = chapOf(c.n);
    const subs = chap.secs.flatMap((s) => s.subs.map((u) => u.no));
    const missing = subs.filter((s) => !doc.includes(s));
    assert.deepStrictEqual(missing, [], `${c.slug} 未提到小节号：${missing.slice(0, 10).join('、')}（共 ${missing.length}）`);
    const missSec = chap.secs.map((s) => s.no).filter((s) => !doc.includes(s));
    assert.deepStrictEqual(missSec, [], `${c.slug} 未提到节号：${missSec.join('、')}`);
  }
});

test('5. docs 规模 8,000–20,000 非空白字', () => {
  for (const c of list()) {
    const n = nonWs(docsOf(c.slug));
    assert.ok(n >= 8000, `${c.slug} 只有 ${n} 字（<8,000）`);
    assert.ok(n <= 20000, `${c.slug} 有 ${n} 字（>20,000）`);
  }
});

test('6. quiz 契约（6 题 · 题干键 question · 每题带引证）', () => {
  for (const c of list()) {
    const qs = JSON.parse(read(path.join(DIR, c.slug, 'quiz.json'))).questions;
    assert.strictEqual(qs.length, 6, `${c.slug} quiz 题数 ${qs.length}`);
    assert.strictEqual(qs.map((x) => x.stage).join(','), 'pre,check,check,check,post,post', `${c.slug} 阶段序列`);
    for (const [i, x] of qs.entries()) {
      assert.ok(x.question && String(x.question).length >= 6, `${c.slug} quiz#${i + 1} 缺 question`);
      assert.strictEqual((x.options || []).length, 4, `${c.slug} quiz#${i + 1} 选项数`);
      assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3, `${c.slug} quiz#${i + 1} correct`);
      assert.ok((x.explanation || '').length >= 10, `${c.slug} quiz#${i + 1} explanation`);
      assert.ok(/教材·中医内科学·第\d+章/.test(x.cite || x.explanation || ''), `${c.slug} quiz#${i + 1} 缺引证`);
    }
  }
});

test('7. outputs 与 skill frontmatter', () => {
  for (const c of list()) {
    const short = c.slug.replace(/^\d+-/, '');
    const skill = read(path.join(DIR, c.slug, `outputs/skill-${short}.md`));
    assert.ok(skill.startsWith('---'), `${c.slug} skill 缺 frontmatter`);
    const fm = skill.split('---')[1] || '';
    for (const k of ['name', 'description', 'version']) assert.ok(fm.includes(`${k}:`), `${c.slug} skill 缺 ${k}`);
    assert.ok(fm.includes(`name: ${short}`), `${c.slug} skill name ≠ ${short}`);
    assert.ok(nonWs(read(path.join(DIR, c.slug, `outputs/prompt-${short}.md`))) >= 300, `${c.slug} prompt 太短`);
  }
});

test('8. 章内单测与教学边界', () => {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  for (const c of list()) {
    const dir = path.join(DIR, c.slug);
    const out = execFileSync('node', ['--test', 'code/main.test.js'], { cwd: dir, encoding: 'utf8', env });
    assert.ok(/# fail 0/.test(out), `${c.slug} 单测有失败`);
    const run = execFileSync('node', ['code/main.js'], { cwd: dir, encoding: 'utf8', env });
    const last = run.trim().split('\n').filter(Boolean).pop() || '';
    assert.ok(/教学边界/.test(last) && /不构成/.test(last), `${c.slug} 末行不是教学边界声明：${last.slice(0, 60)}`);
  }
});

test('9. 数值口径（B 支：引文行放行、裸写照拦 + 边界声明）', () => {
  const CAL = require('../scripts/lib_value_caliber');
  const vl = base().counts.valueLike;
  assert.strictEqual(CAL.branchOf(vl), 'B');
  for (const c of list()) {
    const doc = docsOf(c.slug);
    assert.deepStrictEqual(CAL.verdict(doc, vl, true), [], `${c.slug} 数值口径不通过`);
    assert.ok(/剂量与用法照底本|剂量照底本|不写剂量|不构成诊断/.test(doc), `${c.slug} 缺边界声明`);
  }
});

// ── 10. 旁白层（narration/lesson.json）：段数/角色/course.yaml 对齐 ──
// 一份只有 5 段（标题 + 三个头 + 免责）的 lesson.json 也能让 course.yaml 写 narration-ready，
// 所以这里核「正文真的进了旁白」：段数 ≥8、六个必备角色齐、估算时长与 docs 规模相称。
test('10. 旁白层：14 章 lesson.json 段数/角色齐 · course.yaml 状态对齐', () => {
  const PLAT = path.join(ROOT, 'platform', 'courses', '01-zhongyi', '10-zhongyi-neike-xue');
  const yaml = fs.readFileSync(path.join(PLAT, 'course.yaml'), 'utf8');
  const ROLES = ['title', 'motto', 'problem', 'roots', 'boundary', 'disclaimer'];
  for (const c of list()) {
    const p = path.join(PLAT, c.slug, 'narration/lesson.json');
    assert.ok(fs.existsSync(p), `${c.slug} 缺 narration/lesson.json`);
    const L = JSON.parse(read(p));
    assert.ok(L.segmentCount >= 8, `${c.slug} 只有 ${L.segmentCount} 段（<8）`);
    const roles = new Set(L.segments.map((s) => s.role));
    for (const r of ROLES) assert.ok(roles.has(r), `${c.slug} 缺角色 ${r}`);
    const docs = nonWs(docsOf(c.slug));
    // 不用 docs 总字数比：内科学的 docs 有一大块是「逐条落位」表与代码段，本来就不进旁白。
    // 真正该核的是「旁白确实覆盖了正文」+「时长与 spoken 字数自洽」。
    const spoken = L.segments.reduce((a, s) => a + String(s.spoken || '').length, 0);
    assert.ok(spoken >= 2500, `${c.slug} 旁白只有 ${spoken} 字（<2,500，多半只念了封面）`);
    for (const s of L.segments) {
      // 只核「每段真的可念」：有 spoken、时长为正。
      // 不在这里复算 4.6 字/秒——提取器对短段有取整与下限，复算等于把它内部规则抄一遍，
      // 门会随提取器的实现细节抖动（实测 4.59–4.78 字符/秒，短段 ±1s）。
      assert.ok(String(s.spoken || '').trim().length >= 6, `${c.slug} 第 ${s.n} 段 spoken 为空`);
      assert.ok(s.estimateSeconds > 0, `${c.slug} 第 ${s.n} 段估算时长为 0`);
    }
    const sum = L.segments.reduce((a, s) => a + s.estimateSeconds, 0);
    assert.ok(Math.abs(sum - L.estimateTotalSeconds) <= 2, `${c.slug} 段和 ${sum} ≠ 总时长 ${L.estimateTotalSeconds}`);
    assert.ok(docs > 0, `${c.slug} docs 为空`);
    const block = yaml.split('- slug: ').find((s) => s.startsWith(`${c.slug}\n`));
    assert.ok(block && /video: (narration-ready|slides-ready|rendered)/.test(block.split('- slug: ')[0]),
      `${c.slug} course.yaml 状态低于 narration-ready`);
  }
});

// ── 11. 成片：时长必须等于实测配音，且有字幕轨 ──
// 与病理生理学的成片项同一判据：时长不等于配音 = 中间被裁（concat demuxer 单帧的坑）。
test('11. 成片：14 章时长等于实测配音 · 带字幕轨', () => {
  const { spawnSync } = require('node:child_process');
  const PLAT = path.join(ROOT, 'platform', 'courses', '01-zhongyi', '10-zhongyi-neike-xue');
  let total = 0;
  for (const c of list()) {
    const mp4 = path.join(PLAT, c.slug, 'video', 'lesson.mp4');
    assert.ok(fs.existsSync(mp4), `${c.slug} 无 video/lesson.mp4`);
    const L = JSON.parse(read(path.join(PLAT, c.slug, 'narration/lesson.json')));
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type', '-of', 'json', mp4], { encoding: 'utf8' });
    assert.strictEqual(r.status, 0, `${c.slug} ffprobe 读不出成片`);
    const info = JSON.parse(r.stdout);
    const dur = Number(info.format && info.format.duration);
    assert.ok(Math.abs(dur - L.audioMeasuredSeconds) <= 2,
      `${c.slug} 成片 ${dur.toFixed(1)}s ≠ 配音 ${L.audioMeasuredSeconds.toFixed(1)}s`);
    assert.ok((info.streams || []).some((s) => s.codec_type === 'subtitle'), `${c.slug} 成片无字幕轨`);
    total += dur;
  }
  assert.ok(total > 3600 * 4, `成片总时长只有 ${(total / 3600).toFixed(2)} 小时`);
});
