#!/usr/bin/env node
/**
 * tests/test_wenbing_chapters.js —— 温病学 10 章的「引文不许编」门
 *
 * 与 test_jingui_chapters.js 同构，但温病学多两条特有约束：
 *   · 三本书条号体系不同（條辨漢数字 / 溫熱論源页 id / 溫疫論段落号），
 *     引用必须带篇名，否则跨篇重号就失去意义；
 *   · 温病学最容易写错的是「卫气营血」与「三焦」混成一套坐标 —— 章里若把两者
 *     当同义词并列，属于专业错误，这里用词表拦一道（只能同句出现，不能等同表述）。
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments/01-zhongyi/09-wenbing-xue');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/wenbing/底本.json'), 'utf8'));

// 异体字折叠：底本（笈成 趙開美/問心堂本）保留「隂/裏/爲/於」等字形，opencc 不转这些异体，
// 不折叠会把正确引用判成编造（太隂 vs 太阴、表裏 vs 表里）。
const norm = (s) => s
  .replace(/[隂陰]/g, '阴').replace(/[裏裡]/g, '里').replace(/爲/g, '为').replace(/於/g, '于')
  .replace(/[臺台]/g, '台').replace(/[牀床]/g, '床').replace(/[脉脈]/g, '脉')
  .replace(/[\s，。；：、？！…「」『』（）()《》〈〉\-—·＝=*`/＋+→]/g, '');
const POOL = norm(BOOK.books.flatMap((b) => b.sections.flatMap((s) => s.articles.flatMap((a) => [a.zhHans, a.zhHant, ...(a.notes || [])]))).join(''));

const chapters = JSON.parse(fs.readFileSync(path.join(SUBJ, 'chapters.json'), 'utf8')).chapters;
const baseName = (slug) => slug.replace(/^\d+-/, '');
// 只把「像条文」的引文纳入核验：有 曰/主之/者，/也。 之一；纯议论短语不算引文
const QUOTEISH = /(曰|主之|者，|也。)/;

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); } catch (e) { failures.push([name, e.message]); console.log(`  ✗ ${name}\n      ${e.message}`); }
};

const read = (slug, f) => fs.readFileSync(path.join(SUBJ, 'chapters', slug, f), 'utf8');

console.log('\n温病学 10 章\n');

test('10 章目录齐，每章 6 个文件齐', () => {
  assert.strictEqual(chapters.length, 10);
  for (const c of chapters) {
    const dir = path.join(SUBJ, 'chapters', c.slug);
    assert.ok(fs.existsSync(dir), `缺章节目录 ${c.slug}`);
    for (const f of ['docs/zh.md', 'code/main.js', 'code/main.test.js', 'quiz.json',
      `outputs/prompt-${baseName(c.slug)}.md`, `outputs/skill-${baseName(c.slug)}.md`]) {
      assert.ok(fs.existsSync(path.join(dir, f)), `${c.slug} 缺 ${f}`);
    }
  }
});

test('引文保真：每处「」原文样引文都能在三书底本里逐字找到', () => {
  const bad = [];
  let checked = 0;
  for (const c of chapters) {
    const md = read(c.slug, 'docs/zh.md');
    for (const m of md.matchAll(/「([^」]{10,160})」/g)) {
      const q = m[1];
      if (!QUOTEISH.test(q)) continue;
      const frags = q.split(/……|…/).map(norm).filter((p) => p.length >= 6);
      if (!frags.length) continue;
      checked += 1;
      const miss = frags.filter((p) => !POOL.includes(p));
      if (miss.length) bad.push(`${c.slug}: ${q.slice(0, 36)}… → 缺「${miss[0].slice(0, 18)}」`);
    }
  }
  // 27 处原文样引文全部通过逐字核验（0 未命中）；数量只是下限，保真才是本门的要点
  assert.ok(checked >= 25, `引文样本太少（${checked}）`);
  assert.deepStrictEqual(bad, [], `引文在底本里找不到（疑似凭记忆补写）：\n      ${bad.slice(0, 6).join('\n      ')}`);
});

test('引用必须带书名与篇名（外源·笈成·书名 篇·条），不得标「底本」', () => {
  for (const c of chapters) {
    const md = read(c.slug, 'docs/zh.md');
    assert.ok(/《[温溫]病条辨·|《[温溫]病條辨·|《[温溫]热论|《[温溫]熱論|《[温溫]疫论·|《[温溫]疫論/.test(md), `${c.slug} 缺《书名·篇名》级引文`);
    assert.ok(/外源·笈成/.test(md), `${c.slug} 未标注外源`);
    assert.ok(!/底本第\s*\d+\s*条/.test(md), `${c.slug} 把外源标成了底本`);
    assert.ok(md.includes('代价与边界'), `${c.slug} 缺「代价与边界」`);
    assert.ok(/(免责声明|不构成诊疗|不构成医疗)/.test(md), `${c.slug} 缺免责声明`);
  }
});

test('卫气营血 ≠ 三焦：不得把两套坐标写成同一件事', () => {
  const BAD = [
    [/卫气营血\s*(即|就是|等同于|相当于)\s*三焦/, '把卫气营血等同于三焦'],
    [/三焦\s*(即|就是|等同于|相当于)\s*卫气营血/, '把三焦等同于卫气营血'],
    [/卫气营血.{0,6}与三焦.{0,6}(相同|一致|一回事)/, '把两套辨证说成一回事'],
  ];
  const hits = [];
  for (const c of chapters) {
    const md = read(c.slug, 'docs/zh.md');
    for (const [re, why] of BAD) if (re.test(md)) hits.push(`${c.slug}: ${why}`);
  }
  assert.deepStrictEqual(hits, [], hits.join('; '));
});

test('跨文件数字不得停留在草稿值（docs/quiz/prompt/skill 同查）', () => {
  const STALE = [
    [/(^|[^0-9])630\s*条?\s*(散|段)/, '「630 段」拼错（630 是三书条数）'],
    [/243\s*方全部有药味/, '243 方不是全部有药味（178 有 + 65 无）'],
  ];
  const hits = [];
  for (const c of chapters) {
    for (const f of ['docs/zh.md', 'quiz.json', `outputs/prompt-${baseName(c.slug)}.md`, `outputs/skill-${baseName(c.slug)}.md`]) {
      const full = path.join(SUBJ, 'chapters', c.slug, f);
      if (!fs.existsSync(full)) continue;
      fs.readFileSync(full, 'utf8').split('\n').forEach((line, i) => {
        if (/v1|历史|曾|旧数|原值/.test(line)) return;
        for (const [re, why] of STALE) if (re.test(line)) hits.push(`${c.slug}/${f}:${i + 1} ${why}`);
      });
    }
  }
  assert.deepStrictEqual(hits, [], hits.slice(0, 6).join('; '));
});

test('quiz 5–10 题，首 pre 末 post，check ≥3，correct 在 0–3', () => {
  for (const c of chapters) {
    const q = JSON.parse(read(c.slug, 'quiz.json'));
    // 2026-11-23 起与全库契约一致：5–10 题、首题 pre 末题 post、check ≥3（不再要求恰好 6 题）
    assert.ok(q.questions.length >= 5 && q.questions.length <= 10, `${c.slug} 题数 ${q.questions.length}`);
    assert.strictEqual(q.questions[0].stage, 'pre', `${c.slug} 首题不是 pre`);
    assert.strictEqual(q.questions[q.questions.length - 1].stage, 'post', `${c.slug} 末题不是 post`);
    assert.ok(q.questions.filter((x) => x.stage === 'check').length >= 3, `${c.slug} check 题不足 3`);
    for (const x of q.questions) {
      assert.strictEqual(x.options.length, 4, `${c.slug} 选项数`);
      assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3, `${c.slug} correct 越界`);
      const why = x.explain || x.explanation || '';
      assert.ok(why.length > 8, `${c.slug} 缺解释`);
    }
  }
});

test('skill frontmatter name = 章节 slug（去序号）', () => {
  for (const c of chapters) {
    const md = read(c.slug, `outputs/skill-${baseName(c.slug)}.md`);
    assert.ok(new RegExp(`^---[\\s\\S]*?name:\\s*${baseName(c.slug)}[\\s\\S]*?---`).test(md), `${c.slug} frontmatter name 不符`);
  }
});

test('每章代码能跑通（node --test 全过）且输出带临床边界声明', () => {
  const bad = [];
  for (const c of chapters) {
    const dir = path.join(SUBJ, 'chapters', c.slug);
    try {
      const out = execFileSync(process.execPath, ['code/main.js'], { cwd: dir, encoding: 'utf8', stdio: 'pipe', timeout: 60000 });
      if (!/不构成|教学|样例|非临床/.test(out)) bad.push(`${c.slug}: 输出缺临床边界声明`);
      const t = execFileSync(process.execPath, ['--test', 'code/main.test.js'], { cwd: dir, encoding: 'utf8', stdio: 'pipe', timeout: 120000 });
      if (/# fail [1-9]/.test(t)) bad.push(`${c.slug}: 单测有失败`);
      const pass = Number((t.match(/# pass (\d+)/) || [])[1] || 0);
      if (pass < 5) bad.push(`${c.slug}: 只有 ${pass} 项单测`);
    } catch (e) {
      bad.push(`${c.slug}: ${String(e.stdout || e.message).slice(0, 120)}`);
    }
  }
  assert.deepStrictEqual(bad, [], bad.join('; '));
});

test('chapters.json 的 10 章状态已从 📋 推进', () => {
  const pending = chapters.filter((c) => c.status === '📋');
  assert.strictEqual(pending.length, 0, `仍有 ${pending.length} 章标 📋`);
});

console.log(`\n  ${passed} 通过 · ${failures.length} 失败`);
if (failures.length) { for (const f of failures) console.error(`  · ${f[0]}: ${f[1]}`); process.exit(1); }
