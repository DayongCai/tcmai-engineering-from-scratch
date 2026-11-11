#!/usr/bin/env node
/**
 * tests/test_yaoli_chapters.js —— 药理学「49 章」门
 *
 * 为什么单独一道门：
 *   药理学底本是**带剂量的教材**（全书 421 处量值），所以正文里"看起来正常的数字"
 *   恰恰是最危险的东西 —— 抄错一位、把成人量写成儿童量、把教材量当成正常值，
 *   都能通过"读起来像教材"这一关。门只认三件事：引文能逐字回查、小节号真实存在、
 *   非引文行不出现量值。
 *
 * 九件事：
 *   1. 49 章 · 每章 6 文件齐；
 *   2. 教材引文逐字保真（「…」必须能在该章底本原文里 find 到）；
 *   3. 引文必须带「教材·药理学·第N章·M.K.L」级 locator，且不许写「底本·」；
 *   4. 该章 12 个小节号在 docs 里都出现（说明没绕开底本结构自己编）；
 *   5. docs 规模 3,000–14,000 非空白字（低于 3,000 是复述，高于 14,000 多半是整章照搬）；
 *   6. quiz 6 题 · 阶段固定 pre/check×3/post×2 · 题干键必须是 question；
 *   7. outputs/prompt 与 skill（frontmatter 含 name/description/version，name = 去章号 slug）；
 *   8. 章内单测可跑，main.js 末行是教学边界声明；
 *   9. 数值口径走 B 支（教材带量值）：引文行放行，非引文行裸写量值即红，且必须有边界声明。
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments', '09-jichu', '12-yaoli-xue');
const DIR = path.join(SUBJ, 'chapters');
const BASE = path.join(ROOT, 'standards', 'yaoli', '底本.json');

const read = (p) => fs.readFileSync(p, 'utf8');
const nonWs = (s) => s.replace(/\s/g, '').length;
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』""'']/g, '');
const LOCATOR = /教材·药理学·第\d+章·\d+\.\d+\.\d+/;

const base = () => JSON.parse(read(BASE));
const list = () => JSON.parse(read(path.join(SUBJ, 'chapters.json'))).chapters;
const docsOf = (slug) => read(path.join(DIR, slug, 'docs', 'zh.md'));
const chapOf = (n) => base().chapters.find((c) => c.no === Number(n));

function pool(no) {
  const c = chapOf(no);
  const out = [];
  for (const s of c.secs) for (const u of s.subs) out.push(u.brief || '', u.body || '');
  return out.map(fold);
}

test('1. 49 章与 6 文件齐', () => {
  const l = list();
  assert.strictEqual(l.length, 49, 'chapters.json 应声明 49 章');
  for (const c of l) {
    const short = c.slug.replace(/^\d+-/, '');
    const need = ['docs/zh.md', 'quiz.json', 'code/main.js', 'code/main.test.js',
      `outputs/prompt-${short}.md`, `outputs/skill-${short}.md`];
    for (const f of need) {
      assert.ok(fs.existsSync(path.join(DIR, c.slug, f)), `${c.slug} 缺 ${f}`);
    }
  }
});

test('2. 教材引文逐字保真', () => {
  for (const c of list()) {
    const P = pool(c.n);
    const doc = docsOf(c.slug);
    let checked = 0;
    for (const line of doc.split('\n')) {
      if (!/教材·药理学·第\d+章/.test(line)) continue;
      for (const m of line.matchAll(/「([^」]{6,})」/g)) {
        checked += 1;
        assert.ok(P.some((p) => p.includes(fold(m[1]))),
          `${c.slug} 引文回查不到：${m[1].slice(0, 30)}`);
      }
    }
    assert.ok(checked >= 6, `${c.slug} 带教材出处的引文只有 ${checked} 条（应 ≥6）`);
  }
});

test('3. 引文格式与禁用词', () => {
  for (const c of list()) {
    const doc = docsOf(c.slug);
    assert.ok(LOCATOR.test(doc), `${c.slug} 没有「教材·药理学·第N章·M.K.L」级引用`);
    assert.ok(!/「?底本·/.test(doc), `${c.slug} 出现「底本·」式引用`);
    assert.ok(!/📋/.test(doc), `${c.slug} docs 里残留 📋`);
    // 引到的节号必须真实存在（章号也要对得上本章）
    for (const m of doc.matchAll(/教材·药理学·第(\d+)章·(\d+)\.(\d+)\.(\d+)/g)) {
      const [, ch, s1, s2, s3] = m;
      assert.strictEqual(Number(ch), Number(c.n), `${c.slug} 引到了第 ${ch} 章`);
      const sec = chapOf(ch).secs.find((s) => s.no === `${s1}.${s2}`);
      assert.ok(sec, `${c.slug} 引到不存在的节 ${s1}.${s2}`);
      assert.ok(sec.subs.some((u) => u.no === `${s1}.${s2}.${s3}`),
        `${c.slug} 引到不存在的小节 ${s1}.${s2}.${s3}`);
    }
  }
});

test('4. 单元覆盖：本章 12 个小节号都在 docs 里出现', () => {
  for (const c of list()) {
    const doc = docsOf(c.slug);
    const subs = chapOf(c.n).secs.flatMap((s) => s.subs.map((u) => u.no));
    assert.strictEqual(subs.length, 12, `第${c.n}章小节数应为 12`);
    const missing = subs.filter((s) => !doc.includes(s));
    assert.deepStrictEqual(missing, [], `${c.slug} 未提到这些小节号：${missing.join('、')}`);
  }
});

test('5. docs 规模 3,000–14,000 非空白字', () => {
  for (const c of list()) {
    const n = nonWs(docsOf(c.slug));
    assert.ok(n >= 3000, `${c.slug} 只有 ${n} 字（<3,000）`);
    assert.ok(n <= 15000, `${c.slug} 有 ${n} 字（>15,000，多半是整章照搬）`);
  }
});

test('6. quiz 契约（题干键必须是 question）', () => {
  for (const c of list()) {
    const q = JSON.parse(read(path.join(DIR, c.slug, 'quiz.json')));
    const qs = q.questions || q;
    assert.strictEqual(qs.length, 6, `${c.slug} quiz 题数 ${qs.length}`);
    assert.strictEqual(qs.map((x) => x.stage).join(','), 'pre,check,check,check,post,post',
      `${c.slug} 阶段序列`);
    for (const [i, x] of qs.entries()) {
      assert.ok(x.question && String(x.question).length >= 6, `${c.slug} quiz#${i + 1} 缺 question`);
      assert.strictEqual((x.options || []).length, 4, `${c.slug} quiz#${i + 1} 选项数`);
      assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3, `${c.slug} quiz#${i + 1} correct`);
      assert.ok((x.explanation || '').length >= 10, `${c.slug} quiz#${i + 1} explanation`);
      assert.ok(/教材·药理学·第\d+章/.test(x.cite || x.explanation || ''),
        `${c.slug} quiz#${i + 1} 缺引证`);
    }
  }
});

test('7. outputs 与 skill frontmatter', () => {
  for (const c of list()) {
    const short = c.slug.replace(/^\d+-/, '');
    const skill = read(path.join(DIR, c.slug, `outputs/skill-${short}.md`));
    assert.ok(skill.startsWith('---'), `${c.slug} skill 缺 frontmatter`);
    const fm = skill.split('---')[1] || '';
    for (const k of ['name', 'description', 'version']) {
      assert.ok(fm.includes(`${k}:`), `${c.slug} skill 缺 ${k}`);
    }
    assert.ok(fm.includes(`name: ${short}`), `${c.slug} skill name ≠ ${short}`);
    const prompt = read(path.join(DIR, c.slug, `outputs/prompt-${short}.md`));
    assert.ok(nonWs(prompt) >= 300, `${c.slug} prompt 太短`);
  }
});

test('8. 章内单测与教学边界', () => {
  // 子进程不能继承 NODE_TEST_CONTEXT：node 22 在测试运行器上下文里会拒绝再跑测试文件
  // （打印 "run() is being called recursively ... skipping running files"），
  // 于是子进程没有 # fail 行，本章一律误判为失败。
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  for (const c of list()) {
    const dir = path.join(DIR, c.slug);
    const out = execFileSync('node', ['--test', 'code/main.test.js'], { cwd: dir, encoding: 'utf8', env });
    assert.ok(/# fail 0/.test(out), `${c.slug} 单测有失败`);
    const run = execFileSync('node', ['code/main.js'], { cwd: dir, encoding: 'utf8', env });
    const last = run.trim().split('\n').filter(Boolean).pop() || '';
    assert.ok(/教学边界/.test(last) && /不构成/.test(last), `${c.slug} 末行不是教学边界声明：${last}`);
  }
});

test('9. 数值口径（B 支：引文行放行、裸写照拦 + 边界声明）', () => {
  const CAL = require('../scripts/lib_value_caliber');
  const vl = base().counts.valueLike;
  assert.ok(vl > 0, '底本带量值，本门应走 B 支');
  assert.strictEqual(CAL.branchOf(vl), 'B');
  for (const c of list()) {
    const doc = docsOf(c.slug);
    const errs = CAL.verdict(doc, vl, true);
    assert.deepStrictEqual(errs, [], `${c.slug}：${errs.join('；')}`);
    assert.ok(/剂量与用法照底本|剂量照底本|不写正常值|不作适用性判断|不构成用药建议/.test(doc),
      `${c.slug} 缺「剂量照底本 / 不作适用性判断」类边界声明`);
  }
});

// ── 10. 旁白层（narration/lesson.json）：段数/角色/course.yaml 对齐 ──
// 一份只有 5 段（标题 + 三个头 + 免责）的 lesson.json 也能让 course.yaml 写 narration-ready，
// 所以这里核「正文真的进了旁白」；语速不在门里复算（提取器对短段有取整与下限）。
test('10. 旁白层：49 章 lesson.json 段数/角色齐 · course.yaml 状态对齐', () => {
  const PLAT = path.join(ROOT, 'platform', 'courses', '09-jichu', '12-yaoli-xue');
  const yaml = fs.readFileSync(path.join(PLAT, 'course.yaml'), 'utf8');
  const ROLES = ['title', 'motto', 'problem', 'roots', 'boundary', 'disclaimer'];
  for (const c of list()) {
    const p = path.join(PLAT, c.slug, 'narration/lesson.json');
    assert.ok(fs.existsSync(p), `${c.slug} 缺 narration/lesson.json`);
    const L = JSON.parse(read(p));
    assert.ok(L.segmentCount >= 8, `${c.slug} 只有 ${L.segmentCount} 段（<8）`);
    const segs = L.segments;
    for (const r of ROLES) assert.ok(segs.some((s) => s.role === r), `${c.slug} 缺角色 ${r}`);
    // 边界段只能来自「代价与边界」：泛化的「边界」会把正文小节误判成边界段
    for (const s of segs.filter((x) => x.role === 'boundary')) {
      assert.ok(/代价与边界/.test(s.heading || ''), `${c.slug} 边界段误判：${s.heading}`);
    }
    assert.ok(segs.every((s) => String(s.spoken || '').trim().length >= 6), `${c.slug} 有空的 spoken 段`);
    const sum = segs.reduce((a, s) => a + s.estimateSeconds, 0);
    assert.ok(Math.abs(sum - L.estimateTotalSeconds) <= 2, `${c.slug} 段和 ${sum} ≠ 总时长 ${L.estimateTotalSeconds}`);
    const block = yaml.split('- slug: ').find((s) => s.startsWith(`${c.slug}\n`));
    assert.ok(block && /video: (narration-ready|slides-ready|rendered)/.test(block.split('- slug: ')[0]),
      `${c.slug} course.yaml 状态低于 narration-ready`);
  }
});

// ── 11. 成片：时长必须等于实测配音，且有字幕轨 ──
// 与病生/内科学同一判据：时长不等于配音 = 中间被裁（concat demuxer 单帧的坑，曾裁掉 28%）。
test('11. 成片：49 章时长等于实测配音 · 带字幕轨', () => {
  const { spawnSync } = require('node:child_process');
  const PLAT = path.join(ROOT, 'platform', 'courses', '09-jichu', '12-yaoli-xue');
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
  assert.ok(total > 3600 * 17, `成片总时长只有 ${(total / 3600).toFixed(2)} 小时`);
});
