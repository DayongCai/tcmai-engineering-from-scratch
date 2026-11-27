#!/usr/bin/env node
/**
 * tests/test_jingui_chapters.js —— 金匮 24 章的「引文不许编」测试
 *
 * audit_curriculum.js 的 L3 只看四件事（有《书·篇》式引文 / 有免责 / 有代价与边界 / 篇幅够），
 * **它不看引文是否真的存在**。十章的原文都来自外源底本，一旦有人凭印象补一句「仲景曰」，
 * L3 照样绿灯。本测试补的就是这一格：
 *
 *   1. 「」里的原文样引文（≥12 字，含 曰/者/主之/脉/证 等特征词）必须能在底本里找到；
 *      用「……」省略的按片段逐段核对，任一片找不到即失败。
 *   2. 每章必须引到《金匮要略·XX》级别，并带「代价与边界」与免责声明。
 *   3. quiz 恰好 6 题、stage 顺序固定、correct 在 0–3。
 *   4. 章内单测能跑通（node --test），防「文档写完、代码是坏的」。
 *   5. 不许把外源写成「底本第 N 条」——金匮在本仓库没有教材底本。
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments/01-zhongyi/08-jingui-yaolue');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/jingui/底本.json'), 'utf8'));

const norm = (s) => s.replace(/[\s，。；：、？！…「」『』（）()《》〈〉\-—·＝=*`/＋+→]/g, '');
// 底本池要含「校注」：有些引文引的是雙行夾注（如「一云腹中冷，苦痛者死」），
// 它在 notes[] 里而不在正文，漏掉会把正确引用判成编造。
const POOL = norm(BOOK.pian
  .flatMap((p) => p.articles.flatMap((a) => [a.zhHans, a.zhHant, ...(a.notes || [])]))
  .join(''));

const chapters = JSON.parse(fs.readFileSync(path.join(SUBJ, 'chapters.json'), 'utf8')).chapters;
// 产物文件名用**不带序号的 slug**（prompt-chengshu-zabing.md），目录名带序号（01-chengshu-zabing）。
// 两者不是同一个串 —— audit 认前者，目录是后者。
const baseName = (slug) => slug.replace(/^\d+-/, '');
const QUOTEISH = /(曰|主之|者，|也。)/;

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};

console.log('\n金匮要略 24 章\n');

test('24 章目录齐，每章 6 个文件齐（docs / code×2 / quiz / outputs×2）', () => {
  // 章数不写死：以 chapters.json 与磁盘目录互相校验（24 章 = 10 主题章 + 14 篇目精读）。
  assert.strictEqual(chapters.length, 24, '章节目标：10 主题章 + 14 篇目精读');
  const dirs = fs.readdirSync(path.join(SUBJ, 'chapters')).filter((d) => /^\d{2}-/.test(d));
  assert.strictEqual(dirs.length, chapters.length, 'chapters.json 与磁盘目录数不一致');
  for (const c of chapters) {
    const dir = path.join(SUBJ, 'chapters', c.slug);
    assert.ok(fs.existsSync(dir), `缺章节目录 ${c.slug}`);
    for (const f of ['docs/zh.md', 'code/main.js', 'code/main.test.js', 'quiz.json',
      `outputs/prompt-${baseName(c.slug)}.md`, `outputs/skill-${baseName(c.slug)}.md`]) {
      assert.ok(fs.existsSync(path.join(dir, f)), `${c.slug} 缺 ${f}`);
    }
  }
});

test('引文保真：每处「」原文样引文都能在底本里逐字找到', () => {
  const bad = [];
  let checked = 0;
  for (const c of chapters) {
    const md = fs.readFileSync(path.join(SUBJ, 'chapters', c.slug, 'docs/zh.md'), 'utf8');
    for (const m of md.matchAll(/「([^」]{10,140})」/g)) {
      const q = m[1];
      if (!QUOTEISH.test(q)) continue;           // 「刚痉无汗、柔痉有汗」这类概念短语不算引文
      const frags = q.split(/……|…/).map(norm).filter((p) => p.length >= 6);
      if (!frags.length) continue;
      checked += 1;
      const miss = frags.filter((p) => !POOL.includes(p));
      if (miss.length) bad.push(`${c.slug}: ${q.slice(0, 40)}… → 缺「${miss[0].slice(0, 20)}」`);
    }
  }
  assert.ok(checked >= 60, `引文样本太少（${checked}），是否有人把引文删成了概述？`);
  assert.deepStrictEqual(bad, [], `引文在底本里找不到（疑似凭记忆补写）：\n      ${bad.slice(0, 5).join('\n      ')}`);
});

test('每章都引到《金匮要略·XX》级，并带「代价与边界」与免责声明', () => {
  for (const c of chapters) {
    const md = fs.readFileSync(path.join(SUBJ, 'chapters', c.slug, 'docs/zh.md'), 'utf8');
    assert.ok(/《金匮要略·[^》]+》/.test(md), `${c.slug} 缺《金匮要略·篇名》级引文`);
    assert.ok(md.includes('代价与边界'), `${c.slug} 缺「代价与边界」段`);
    assert.ok(/(免责声明|不构成诊疗|不构成医疗)/.test(md), `${c.slug} 缺免责声明`);
    assert.ok(/外源·笈成/.test(md), `${c.slug} 未标注外源`);
  }
});

test('不许把外源写成「底本第 N 条」（金匮无教材底本）', () => {
  for (const c of chapters) {
    const md = fs.readFileSync(path.join(SUBJ, 'chapters', c.slug, 'docs/zh.md'), 'utf8');
    assert.ok(!/底本第\s*\d+\s*条/.test(md), `${c.slug} 把外源标成了底本`);
    assert.ok(!/宋本第\s*\d+\s*条/.test(md), `${c.slug} 把本库条号标成了宋本条号`);
  }
});

test('跨文件数字不得停留在 v1（docs/quiz/outputs 一起查，v1 历史句除外）', () => {
  // v2 换了口径，最容易漏的是 quiz 选项与 outputs 里的旧数（测试与 docs 都可能已改，
  // 但没人会去点开 prompt/skill 看一眼）。这里逐个文件扫，带「v1 / 历史 / 曾」的行豁免。
  const STALE = [
    [/(^|[^0-9])164\s*方/, '164 方（v2 是 174）'],
    [/(^|[^0-9])108\s*方/, '108 方（内伤类 v2 是 117）'],
    [/174\s*味药/, '174 味药（v2 是 172 味药；174 是方数）'],
    [/(^|[^0-9])685(\s|$|次|味)/, '685 味次（v2 是 734）'],
    [/(^|[^0-9])157\s*有方文/, '157 有方文（v2 是 165）'],
  ];
  const hits = [];
  for (const c of chapters) {
    const dir = path.join(SUBJ, 'chapters', c.slug);
    const files = ['docs/zh.md', 'quiz.json',
      `outputs/prompt-${baseName(c.slug)}.md`, `outputs/skill-${baseName(c.slug)}.md`];
    for (const f of files) {
      const full = path.join(dir, f);
      if (!fs.existsSync(full)) continue;
      const lines = fs.readFileSync(full, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (/v1|历史|曾|旧数|原值/.test(line)) return;
        for (const [re, why] of STALE) {
          if (re.test(line)) hits.push(`${c.slug}/${f}:${i + 1} ${why}`);
        }
      });
    }
  }
  assert.deepStrictEqual(hits, [], `残留旧数：\n      ${hits.slice(0, 8).join('\n      ')}`);
});

test('quiz 恰好 6 题，stage 顺序 pre/check×3/post×2，correct 在 0–3', () => {
  for (const c of chapters) {
    const q = JSON.parse(fs.readFileSync(path.join(SUBJ, 'chapters', c.slug, 'quiz.json'), 'utf8'));
    assert.strictEqual(q.questions.length, 6, `${c.slug} 题数 ${q.questions.length}`);
    assert.deepStrictEqual(q.questions.map((x) => x.stage), ['pre', 'check', 'check', 'check', 'post', 'post'], `${c.slug} stage 顺序`);
    for (const x of q.questions) {
      assert.strictEqual(x.options.length, 4, `${c.slug} 选项数`);
      assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3, `${c.slug} correct 越界`);
      assert.ok((x.explain || x.explanation || '').length > 8, `${c.slug} 缺解释`);
    }
  }
});

test('skill 的 frontmatter name = 章节 slug（否则注册会串名）', () => {
  for (const c of chapters) {
    const md = fs.readFileSync(path.join(SUBJ, 'chapters', c.slug, `outputs/skill-${baseName(c.slug)}.md`), 'utf8');
    assert.ok(new RegExp(`^---[\\s\\S]*?name:\\s*${baseName(c.slug)}[\\s\\S]*?---`).test(md), `${c.slug} frontmatter name 不符`);
  }
});

test('每章代码能跑通（node --test 全过）', () => {
  const bad = [];
  for (const c of chapters) {
    const dir = path.join(SUBJ, 'chapters', c.slug);
    try {
      const out = execFileSync(process.execPath, ['--test', 'code/main.test.js'], { cwd: dir, encoding: 'utf8', stdio: 'pipe' });
      if (!/# fail 0/.test(out) && !/# pass \d+/.test(out)) bad.push(`${c.slug}: 未识别测试输出`);
      if (/# fail [1-9]/.test(out)) bad.push(`${c.slug}: 有失败用例`);
    } catch (e) {
      bad.push(`${c.slug}: ${String(e.stdout || e.message).slice(0, 120)}`);
    }
  }
  assert.deepStrictEqual(bad, [], bad.join('; '));
});

test('chapters.json 的 24 章状态已从 📋 推进（不再是未开工）', () => {
  const pending = chapters.filter((c) => c.status === '📋');
  assert.strictEqual(pending.length, 0, `仍有 ${pending.length} 章标 📋`);
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) { for (const f of failures) console.error(`  · ${f[0]}: ${f[1]}`); process.exit(1); }
