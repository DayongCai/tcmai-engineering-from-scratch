'use strict';
/**
 * 中医基础理论 10 章门
 *   1. 10 章目录齐、每章 6 文件齐
 *   2. 引文保真：docs 里「」内的教材引语必须是底本某段的连续子串（折叠空白与半/全角标点）
 *   3. 引用必须落到「教材·第N章·第M.M节」级（不许只写《中医基础理论》，不许标「底本」「原文」）
 *   4. 跨文件数字：prompt/skill 出现的「N 段 / N 字 / N%」必须能在 docs 里找到同值
 *   5. quiz 恰好 6 题（pre / check×3 / post×2，correct 0–3）
 *   6. skill frontmatter name = 章 slug（去序号）
 *   7. 每章代码 node --test 全过，且运行时打印教学边界
 *   8. chapters.json 10 章状态已推进（不是 📋）
 */

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments', '01-zhongyi', '01-zhongyi-jichu-lilun');
const CHDIR = path.join(SUBJ, 'chapters');
const doc = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'jichu', '底本.json'), 'utf8'));

const FILES = ['docs/zh.md', 'quiz.json', 'code/main.js', 'code/main.test.js'];
const slugs = fs.existsSync(CHDIR)
  ? fs.readdirSync(CHDIR).filter((d) => fs.statSync(path.join(CHDIR, d)).isDirectory()).sort()
  : [];

// 把底本所有正文段拉平成一个池子，用于逐字核验
const POOL_RAW = [];
for (const c of doc.chapters) {
  for (const p of c.paras || []) POOL_RAW.push(p);
  for (const s of c.secs) {
    for (const p of s.paras) POOL_RAW.push(p);
    for (const sub of s.subs) {
      for (const p of sub.paras) POOL_RAW.push(p);
      for (const it of sub.items || []) POOL_RAW.push(it.title);
    }
  }
}

// 教材正文用半角逗号 + 空格，引文常抄成全角；折叠后再比对
const norm = (s) => s
  .replace(/[，,、；;：:]/g, '')
  .replace(/[。．.]/g, '')
  .replace(/[“”"「」『』]/g, '')
  .replace(/[（）()]/g, '')
  .replace(/[＝=]/g, '')
  .replace(/\s+/g, '')
  .replace(/[～~]/g, '');

const POOL = POOL_RAW.map(norm);

function md(slug) {
  return fs.readFileSync(path.join(CHDIR, slug, 'docs', 'zh.md'), 'utf8');
}

test('10 章目录齐，每章 6 个文件齐', () => {
  assert.strictEqual(slugs.length, 10);
  for (const s of slugs) {
    for (const f of [...FILES, `outputs/prompt-${s.replace(/^\d+-/, '')}.md`, `outputs/skill-${s.replace(/^\d+-/, '')}.md`]) {
      assert.ok(fs.existsSync(path.join(CHDIR, s, f)), `${s} 缺 ${f}`);
    }
  }
});

test('引文保真：docs 中「」内的教材引语均可在底本逐字找到', () => {
  // 只核**教材引文**：同一行必须带「教材·第N章」或「《中医基础理论·第N章」。
  // 引《素问》等古籍的句子不在本池里（属经典层）；纯议论短语（读者会说的话）也不是引文。
  // 这两类跳过，是口径选择，不是放宽：本门只保证「标了教材出处的引语一字不差」。
  const misses = [];
  let checked = 0;
  for (const s of slugs) {
    for (const line of md(s).split(String.fromCharCode(10))) {
      if (!/教材·第\d+章|《中医基础理论·第\d+章/.test(line)) continue;
      for (const m of line.matchAll(/「([^」]{12,})」/g)) {
        const q = m[1];
        checked += 1;
        // 省略引：按「……」切开，每一片都必须逐字存在（与金匮 11 处省略引同一口径）
        const parts = q.split(/…+|⋯+/).map((x) => norm(x)).filter((x) => x.length >= 6);
        const bad = parts.filter((n) => !POOL.some((p) => p.includes(n)));
        if (bad.length) misses.push(`${s}: 「${q.slice(0, 30)}」 缺片：${bad.map((b) => b.slice(0, 12)).join(' / ')}`);
      }
    }
  }
  assert.ok(checked >= 6, `引文样本太少（${checked}）`);
  assert.deepStrictEqual(misses, [], `以下引文在底本中找不到：\n${misses.join('\n')}`);
});

test('引用落到章·节级：每章 docs 至少一处「教材·第N章」', () => {
  for (const s of slugs) {
    const text = md(s);
    assert.ok(/教材·第\d+章/.test(text) || /《中医基础理论·第\d+章/.test(text), `${s} 缺章级引用`);
  }
});

test('不许把教材标成「底本」或「原文」当引用', () => {
  for (const s of slugs) {
    const text = md(s);
    assert.ok(!/底本·\d+\.\d/.test(text), `${s} 出现「底本·」式引用`);
    assert.ok(!/原文·\d+\.\d/.test(text), `${s} 出现「原文·」式引用`);
  }
});

test('跨文件数字：prompt/skill 里的规模数字必须能在 docs 找到同值', () => {
  // 只核**规模数字**（带 段/字/章/节/小节/条/处/%/格 之一）。模型参数（0.70、6.84）不算规模，
  // 允许只出现在 skill 里。去千分位、去尾部 .0、去前导零，避免 45,199字 / 45199 / 第01章 造成假红。
  const norm2 = (x) => x.replace(/,/g, '').replace(/\.0+$/, '').replace(/^0+(?=\d)/, '');
  const grab = (t) => new Set([...t.matchAll(/(\d[\d,]*(?:\.\d+)?)\s*个?\s*(段|字|章|节|小节|条|处|%|格)/g)]
    .map((m) => `${norm2(m[1])}${m[2]}`));
  const bad = [];
  for (const s of slugs) {
    const d = grab(md(s));
    const slug = s.replace(/^\d+-/, '');
    for (const f of [`outputs/prompt-${slug}.md`, `outputs/skill-${slug}.md`]) {
      const t = fs.readFileSync(path.join(CHDIR, s, f), 'utf8');
      for (const n of grab(t)) if (!d.has(n)) bad.push(`${s}/${f}: ${n}`);
    }
  }
  assert.deepStrictEqual(bad, [], `产物里的规模数字与 docs 不一致：\n${bad.join('\n')}`);
});

test('quiz 恰好 6 题：pre 1 / check 3 / post 2，correct 在 0–3，每题 4 选项', () => {
  for (const s of slugs) {
    const q = JSON.parse(fs.readFileSync(path.join(CHDIR, s, 'quiz.json'), 'utf8'));
    assert.strictEqual(q.questions.length, 6, `${s} 题数`);
    const st = q.questions.map((x) => x.stage);
    assert.deepStrictEqual(st, ['pre', 'check', 'check', 'check', 'post', 'post'], `${s} 阶段分布`);
    for (const x of q.questions) {
      assert.strictEqual(x.options.length, 4, `${s} 选项数`);
      assert.ok(x.correct >= 0 && x.correct <= 3, `${s} correct 越界`);
      assert.ok((x.explain || x.explanation || '').length >= 10, `${s} 缺解释`);
    }
  }
});

test('skill frontmatter name = slug（去序号）', () => {
  for (const s of slugs) {
    const slug = s.replace(/^\d+-/, '');
    const t = fs.readFileSync(path.join(CHDIR, s, `outputs/skill-${slug}.md`), 'utf8');
    assert.match(t, new RegExp(`^---\\n[\\s\\S]*?name: ${slug}\\n`), `${s} frontmatter name 不符`);
  }
});

test('每章代码 node --test 全过，且运行输出带教学边界', () => {
  for (const s of slugs) {
    const cwd = path.join(CHDIR, s);
    try {
      execFileSync(process.execPath, ['--test', 'code/main.test.js'], { cwd, stdio: 'pipe', timeout: 60000 });
    } catch (e) {
      assert.fail(`${s} 单测失败：${String(e.stdout || e.message).slice(0, 400)}`);
    }
    const out = execFileSync(process.execPath, ['code/main.js'], { cwd, encoding: 'utf8', timeout: 60000 });
    assert.match(out, /教学边界|不构成诊疗/, `${s} 运行输出缺教学边界`);
  }
});

test('chapters.json 的 10 章状态已从 📋 推进', () => {
  const j = JSON.parse(fs.readFileSync(path.join(SUBJ, 'chapters.json'), 'utf8'));
  assert.strictEqual(j.chapters.length, 10);
  const pending = j.chapters.filter((c) => c.status === '📋');
  assert.deepStrictEqual(pending.map((c) => c.slug), []);
});
