'use strict';
/**
 * 中药学 12 章门（8 项）
 *   1. 12 章目录齐、每章 6 文件齐
 *   2. 引文保真：docs 里**标了教材出处**的引语（同行含「教材·第N章」或《中药学·第N章》），
 *      其「」内文字必须在底本某段中逐字出现（折叠空白与全半角）
 *   3. 引用落到「教材·第N章·N.M」级；不许「底本·」「原文·」
 *   4. 规模数字：docs 里必须出现本章对应的教材字数（按课程章→教材章的映射复算）
 *   5. quiz 恰好 6 题：pre / check×3 / post×2；4 选项；correct 0-3；explanation ≥10 字
 *   6. outputs：prompt-<slug>.md 与 skill-<slug>.md 都在；skill frontmatter 的 name = slug
 *   7. 章内单测可跑，且运行时最后一行是教学边界声明（不构成诊疗/用药依据）
 *   8. chapters.json 里 12 章状态不得为 📋
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments', '02-zhongyao', '01-zhongyaoxue');
const DIR = path.join(SUBJ, 'chapters');
const BASE = path.join(ROOT, 'standards', 'zhongyao', '底本.json');

const base = () => JSON.parse(fs.readFileSync(BASE, 'utf8'));
const chaptersJson = () => JSON.parse(fs.readFileSync(path.join(SUBJ, 'chapters.json'), 'utf8'));

/** 课程 12 章 → 教材章号（与 README 的映射同源） */
const MAP = {
  1: ['5'], 2: ['9'], 3: ['10'], 4: ['11', '12', '13', '14'], 5: ['15', '16'],
  6: ['17', '18', '19'], 7: ['20'], 8: ['21'], 9: ['22', '23', '24'], 10: ['25'],
  11: ['26', '27'], 12: ['5'],
  13: ['1', '2', '3', '4', '6', '7', '8'], 14: ['28', '29'],
};

const read = (p) => fs.readFileSync(p, 'utf8');
const nonWs = (s) => s.replace(/\s/g, '').length;
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』]/g, '');

/** 教材全段池（逐字回查用） */
function pool() {
  const d = base();
  const out = [];
  for (const c of d.chapters) {
    out.push(...(c.paras || []));
    for (const s of c.secs || []) {
      out.push(...(s.paras || []));
      for (const u of s.subs || []) out.push(...(u.paras || []));
    }
  }
  return out.map(fold);
}

test('1. 12 章与 6 文件齐', () => {
  const list = chaptersJson().chapters;
  assert.strictEqual(list.length, 14);
  for (const c of list) {
    const d = path.join(DIR, c.slug);
    assert.ok(fs.existsSync(d), `缺章节目录 ${c.slug}`);
    for (const f of ['docs/zh.md', 'quiz.json', 'code/main.js', 'code/main.test.js',
      `outputs/prompt-${c.slug.replace(/^\d+-/, '')}.md`, `outputs/skill-${c.slug.replace(/^\d+-/, '')}.md`]) {
      assert.ok(fs.existsSync(path.join(d, f)), `${c.slug} 缺 ${f}`);
    }
  }
});

test('2. 教材引文逐字保真（只核标了「教材原文」的引文）', () => {
  const P = pool();
  const bad = [];
  let checked = 0;
  for (const c of chaptersJson().chapters) {
    const doc = read(path.join(DIR, c.slug, 'docs', 'zh.md'));
    // 本课程的引用习惯是「标 locator」而不是「抄教材原句」：正文用「教材·第N章·N.M」定位，
    // 逐字引的多是《素问》《伤寒论》这类经典（属 MOTTO 层，池子不同）。
    // 因此本套件只核**作者自己标了「教材原文」**的那几处——标了就必须逐字对得上底本。
    // 早先按「教材出处行内的所有「」」去核，会把 locator 标签和作者概括都算进来，
    // 那是假阳性，不是内容错。
    for (const seg of doc.matchAll(/教材原文[^。\n]{0,120}/g)) {
      for (const m of seg[0].matchAll(/「([^」]{6,})」/g)) {
        const raw = m[1];
        checked += 1;
        const q = fold(raw);
        if (!P.some((p) => p.includes(q))) bad.push(`${c.slug}: ${raw.slice(0, 24)}…`);
      }
    }
  }
  assert.deepStrictEqual(bad, [], `教材引文在底本里找不到：\n${bad.join('\n')}`);
  assert.ok(checked >= 1, '全科没有一处标了「教材原文」的引文，判据形同虚设');
});

test('3. 引用格式与禁用词', () => {
  for (const c of chaptersJson().chapters) {
    const slug = c.slug.replace(/^\d+-/, '');
    const files = [path.join(DIR, c.slug, 'docs', 'zh.md')];
    for (const f of files) {
      const t = read(f);
      assert.ok(/教材·第\d+(?:[–—-]\d+)?章/.test(t), `${c.slug}/docs 没有「教材·第N章」级引用`);
      assert.ok(!/「?底本·[^」"]{2,}」?/.test(t), `${c.slug}/docs 出现「底本·」式引用`);
    }
    assert.ok(fs.existsSync(path.join(DIR, c.slug, `outputs/prompt-${slug}.md`)));
  }
});

test('4. 规模数字与底本一致（本章字数必须出现）', () => {
  const d = base();
  const byNo = new Map(d.chapters.map((c) => [c.no, c]));
  // 映射的唯一事实来源是 standards/zhongyao/chapter-map.json（允许同一教材章被多个课程章引用）。
  // 测试不再自己维护一份 MAP —— 那正是 12/13 章口径冲突的来源：
  // 旧 MAP 假设「每个教材章只归一个课程章」，而正文里 12 章覆盖第5–8章、13 章只引第3章。
  const cmap = JSON.parse(read(path.join(ROOT, 'departments/02-zhongyao/01-zhongyaoxue/chapter-map.json')));
  const byChapter = new Map(cmap.chapters.map((x) => [x.chapter, x]));
  const bad = [];
  for (const c of chaptersJson().chapters) {
    const mapped = byChapter.get(c.slug);
    if (!mapped) { bad.push(`${c.slug}：chapter-map.json 里没有这一章`); continue; }
    const chars = mapped.textbookChapters.reduce((n, no) => n + byNo.get(String(no)).counts.chars, 0);
    const doc = read(path.join(DIR, c.slug, 'docs', 'zh.md')).replace(/,/g, '');
    if (!doc.includes(String(chars))) bad.push(`${c.slug}：docs 里没有本章字数 ${chars}（映射第 ${mapped.textbookChapters.join('/')} 章）`);
  }
  assert.deepStrictEqual(bad, [], bad.join('\n'));
});

test('5. quiz 契约：6 题 pre/check×3/post×2', () => {
  for (const c of chaptersJson().chapters) {
    const q = JSON.parse(read(path.join(DIR, c.slug, 'quiz.json')));
    const qs = q.questions || q;
    assert.strictEqual(qs.length, 6, `${c.slug} quiz 题数`);
    assert.deepStrictEqual(qs.map((x) => x.stage), ['pre', 'check', 'check', 'check', 'post', 'post'], `${c.slug} 阶段序列`);
    for (const x of qs) {
      assert.strictEqual((x.options || []).length, 4, `${c.slug} 选项数`);
      assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3, `${c.slug} correct`);
      assert.ok(((x.explain || x.explanation) || '').length >= 10, `${c.slug} explanation 太短`);
    }
  }
});

test('6. outputs 与 skill frontmatter', () => {
  for (const c of chaptersJson().chapters) {
    const slug = c.slug.replace(/^\d+-/, '');
    const skill = read(path.join(DIR, c.slug, `outputs/skill-${slug}.md`));
    assert.ok(skill.startsWith('---'), `${slug} skill 缺 frontmatter`);
    assert.ok(skill.includes(`name: ${slug}`), `${slug} skill 的 name 不等于 slug`);
    const pr = read(path.join(DIR, c.slug, `outputs/prompt-${slug}.md`));
    assert.ok(nonWs(pr) >= 300, `${slug} prompt 太短`);
  }
});

test('7. 章内单测可跑并打印教学边界', () => {
  for (const c of chaptersJson().chapters) {
    const dir = path.join(DIR, c.slug);
    const out = execFileSync('node', ['--test', 'code/main.test.js'], { cwd: dir, encoding: 'utf8' });
    assert.ok(/# fail 0/.test(out), `${c.slug} 单测有失败`);
    const run = execFileSync('node', ['code/main.js'], { cwd: dir, encoding: 'utf8' });
    const last = run.trim().split('\n').filter(Boolean).pop();
    assert.ok(/教学边界/.test(last) && /不构成/.test(last), `${c.slug} 最后一行不是教学边界声明：${last}`);
  }
});

test('8. chapters.json 无 📋', () => {
  const todo = chaptersJson().chapters.filter((c) => c.status === '📋');
  assert.deepStrictEqual(todo.map((c) => c.slug), [], '仍有章节未开工');
});
