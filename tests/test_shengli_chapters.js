'use strict';
/**
 * 生理学 11 章门（10 项）
 *   1. 11 章目录齐、每章 6 文件齐
 *   2. 教材引文逐字保真（只核标了教材出处的行）
 *   3. 引用格式：教材·第N章·N.M.K 级；不许「底本·」
 *   4. 规模数字：docs 必须出现本章教材字数（按 1:1 映射复算）
 *   5. quiz：6 题 pre/check×3/post×2；**题干键必须是 question**（第13章踩过 q 的坑）
 *   6. outputs：prompt/skill 都在；skill frontmatter 含 name/description/version
 *   7. 章内单测可跑，末行教学边界声明
 *   8. chapters.json 无 📋
 *   9. **本书专属：正文数值零容忍** —— 11 章 docs 正文不许出现「数字＋计量单位」，
 *      数据层生成块（NV:BEGIN…NV:END）例外，块内值的出处由 test_normal_values 核
 *  10. **本书专属：边界声明** —— 11 章都需要「本书不给值」一类句子，且 README 写清「不给值」不是遗漏
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments', '09-jichu', '06-shengli-xue');
const DIR = path.join(SUBJ, 'chapters');
const BASE = path.join(ROOT, 'standards', 'shengli', '底本.json');

const base = () => JSON.parse(fs.readFileSync(BASE, 'utf8'));
const chaptersJson = () => JSON.parse(fs.readFileSync(path.join(SUBJ, 'chapters.json'), 'utf8'));
const read = (p) => fs.readFileSync(p, 'utf8');
const nonWs = (s) => s.replace(/\s/g, '').length;
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』""'']/g, '');
const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍)/g;
const BOUNDARY_RE = /本书不给值|不写数值|不给正常值|数值不在本书|本书不含数值|不提供数值|不给单位/;
const stripNv = (t) => t.replace(/<!-- NV:BEGIN[\s\S]*?<!-- NV:END -->/g, '');

/** 课程 11 章 → 教材章（这门课是 1:1） */
const MAP = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [i + 1, [String(i + 1)]]));

function pool() {
  const out = [];
  for (const c of base().chapters) for (const s of c.secs) for (const u of s.subs) {
    out.push(u.brief || '', u.body || '');
  }
  return out.map(fold);
}

test('1. 11 章与 6 文件齐', () => {
  const list = chaptersJson().chapters;
  assert.strictEqual(list.length, 11);
  for (const c of list) {
    const d = path.join(DIR, c.slug);
    assert.ok(fs.existsSync(d), `缺章节目录 ${c.slug}`);
    for (const f of ['docs/zh.md', 'quiz.json', 'code/main.js', 'code/main.test.js',
      `outputs/prompt-${c.slug.replace(/^\d+-/, '')}.md`, `outputs/skill-${c.slug.replace(/^\d+-/, '')}.md`]) {
      assert.ok(fs.existsSync(path.join(d, f)), `${c.slug} 缺 ${f}`);
    }
  }
});

test('2. 教材引文逐字保真', () => {
  const P = pool();
  const bad = [];
  let checked = 0;
  for (const c of chaptersJson().chapters) {
    const doc = read(path.join(DIR, c.slug, 'docs', 'zh.md'));
    for (const line of doc.split('\n')) {
      if (!/教材·第\d+章/.test(line)) continue;
      for (const m of line.matchAll(/「([^」]{6,})」/g)) {
        checked += 1;
        if (!P.some((p) => p.includes(fold(m[1])))) bad.push(`${c.slug}: ${m[1].slice(0, 26)}…`);
      }
    }
  }
  assert.deepStrictEqual(bad, [], `教材引文在底本里找不到：\n${bad.join('\n')}`);
  assert.ok(checked >= 22, `教材引文太少（${checked} 条），11 章至少 22 条`);
});

test('3. 引用格式与禁用词', () => {
  for (const c of chaptersJson().chapters) {
    const t = read(path.join(DIR, c.slug, 'docs', 'zh.md'));
    assert.ok(/教材·第\d+章/.test(t), `${c.slug}/docs 没有「教材·第N章」级引用`);
    assert.ok(!/「?底本·[^」"]{2,}」?/.test(t), `${c.slug}/docs 出现「底本·」式引用`);
  }
});

test('4. 规模数字与底本一致', () => {
  const byNo = new Map(base().chapters.map((c) => [c.no, c]));
  const bad = [];
  for (const c of chaptersJson().chapters) {
    const chars = MAP[c.n].reduce((n, no) => n + byNo.get(no).counts.hanzi, 0);
    const doc = read(path.join(DIR, c.slug, 'docs', 'zh.md')).replace(/,/g, '');
    if (!doc.includes(String(chars))) bad.push(`${c.slug}：docs 里没有本章教材字数 ${chars}`);
  }
  assert.deepStrictEqual(bad, [], bad.join('\n'));
});

test('5. quiz 契约（题干键必须是 question）', () => {
  for (const c of chaptersJson().chapters) {
    const q = JSON.parse(read(path.join(DIR, c.slug, 'quiz.json')));
    const qs = q.questions || q;
    assert.strictEqual(qs.length, 6, `${c.slug} quiz 题数`);
    assert.deepStrictEqual(qs.map((x) => x.stage), ['pre', 'check', 'check', 'check', 'post', 'post'], `${c.slug} 阶段序列`);
    for (const [i, x] of qs.entries()) {
      assert.ok(x.question && String(x.question).length >= 6, `${c.slug} quiz#${i + 1} 题干键必须是 question`);
      assert.strictEqual((x.options || []).length, 4, `${c.slug} quiz#${i + 1} 选项数`);
      assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3, `${c.slug} quiz#${i + 1} correct`);
      assert.ok(((x.explain || x.explanation) || '').length >= 10, `${c.slug} quiz#${i + 1} explanation`);
    }
  }
});

test('6. outputs 与 skill frontmatter（含 version）', () => {
  for (const c of chaptersJson().chapters) {
    const slug = c.slug.replace(/^\d+-/, '');
    const skill = read(path.join(DIR, c.slug, `outputs/skill-${slug}.md`));
    assert.ok(skill.startsWith('---'), `${slug} skill 缺 frontmatter`);
    const fm = skill.split('---')[1] || '';
    for (const k of ['name', 'description', 'version']) assert.ok(fm.includes(`${k}:`), `${slug} skill 缺 ${k}`);
    assert.ok(fm.includes(`name: ${slug}`), `${slug} skill 的 name 不等于 slug`);
    assert.ok(nonWs(read(path.join(DIR, c.slug, `outputs/prompt-${slug}.md`))) >= 300, `${slug} prompt 太短`);
  }
});

test('7. 章内单测与教学边界', () => {
  // 本套件自身可能跑在 node --test 之下，子进程会继承 NODE_TEST_CONTEXT 而拒绝再跑测试文件
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  for (const c of chaptersJson().chapters) {
    const dir = path.join(DIR, c.slug);
    const out = execFileSync('node', ['--test', 'code/main.test.js'], { cwd: dir, encoding: 'utf8', env });
    assert.ok(/# fail 0/.test(out), `${c.slug} 单测有失败`);
    const run = execFileSync('node', ['code/main.js'], { cwd: dir, encoding: 'utf8', env });
    const last = run.trim().split('\n').filter(Boolean).pop();
    assert.ok(/教学边界/.test(last) && /不构成/.test(last), `${c.slug} 最后一行不是教学边界声明：${last}`);
  }
});

test('8. chapters.json 无 📋', () => {
  const todo = chaptersJson().chapters.filter((c) => c.status === '📋');
  assert.deepStrictEqual(todo.map((c) => c.slug), [], '仍有章节未开工');
});

test('9. 本书专属：11 章 docs 数值零容忍', () => {
  const bad = [];
  for (const c of chaptersJson().chapters) {
    const t = read(path.join(DIR, c.slug, 'docs', 'zh.md'));
    const hits = stripNv(t).match(VALUE_RE) || [];
    if (hits.length) bad.push(`${c.slug}: ${hits.slice(0, 5).join('、')}`);
  }
  assert.deepStrictEqual(bad, [], `本书底本 0 数值，章节不许编正常值/单位：\n${bad.join('\n')}`);
});

test('10. 本书专属：边界声明 + README 口径', () => {
  const missing = [];
  for (const c of chaptersJson().chapters) {
    const t = read(path.join(DIR, c.slug, 'docs', 'zh.md'));
    if (!BOUNDARY_RE.test(t)) missing.push(c.slug);
  }
  assert.deepStrictEqual(missing, [], '这些章没有「本书不给值」类边界声明');
  const doc = read(path.join(SUBJ, 'README.md'));
  assert.ok(/不给值|不写数值/.test(doc), 'README 必须写清这本书不给数值');
  assert.ok(/另立|另有|单独/.test(doc), 'README 必须说明「需要数值时另立数据层」');
});

test('11. 教材十二个小节逐条正文：12 段齐、每段够长、与 unit-notes 现算一致', () => {
  const U = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shengli/units.json'), 'utf8'));
  const UMAP = require('../scripts/build_unit_map_section');
  const notes = UMAP.loadNotes();
  assert.strictEqual(Object.keys(notes).length, 11, '应为 11 章 unit-notes');
  for (const ch of Object.keys(notes).map(Number).sort((a, b) => a - b)) {
    const units = notes[ch];
    assert.strictEqual(units.length, 12, `第${ch}章应为 12 段，实为 ${units.length}`);
    const truth = U.units.filter((u) => u.chapter === String(ch));
    assert.deepStrictEqual(units.map((u) => u.sub), truth.map((u) => u.sub), `第${ch}章小节号与 units.json 不一致`);
    for (let i = 0; i < units.length; i++) {
      assert.strictEqual(units[i].title, truth[i].title.replace(/^\d+\.\d+\.\d+\s*/, ''), `${units[i].sub} 标题与教材不一致`);
      const n = units[i].note.replace(/\s/g, '').length;
      assert.ok(n >= 120, `${units[i].sub} 只有 ${n} 字，短于 120 字不算正文`);
    }
    const slug = fs.readdirSync(DIR).find((d) => parseInt(d.slice(0, 2), 10) === ch);
    const doc = read(path.join(DIR, slug, 'docs/zh.md')).split(String.fromCharCode(13)).join('');
    const { BEGIN, END } = UMAP;
    assert.ok(doc.includes(BEGIN) && doc.includes(END), `${slug} 缺逐条正文块`);
    const seg = doc.split(BEGIN)[1].split(END)[0];
    assert.strictEqual(BEGIN + seg + END, UMAP.blockFor(ch, units), `${slug} 逐条正文与 unit-notes 现算不一致`);
    const heads = seg.split(String.fromCharCode(10)).filter((l) => /^#### \d+\.\d+\.\d+ /.test(l));
    assert.strictEqual(heads.length, 12, `${slug} 只有 ${heads.length} 个小节标题`);
  }
});

test('12. quiz 语义一致性（解析点名的单元须属于本章；选项不许完全重复）', () => {
  const Q = require('../scripts/lib_quiz_semantics');
  const U = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shengli/units.json'), 'utf8'));
  const problems = [];
  const soft = [];
  for (const c of chaptersJson().chapters) {
    const units = U.units.filter((u) => u.chapter === String(c.n))
      .map((u) => ({ sub: u.sub, title: u.title, rawBody: u.rawBody }));
    const qs = JSON.parse(read(path.join(DIR, c.slug, 'quiz.json'))).questions;
    const r = Q.auditQuiz(qs, units);
    for (const e of r.errors) problems.push(`${c.slug} ${e}`);
    for (const w of r.warns) soft.push(`${c.slug} ${w}`);
  }
  const closer = soft.filter((w) => w.includes('更贴近')).length;
  const sameWords = soft.filter((w) => w.includes('用词几乎相同')).length;
  const noCite = soft.filter((w) => w.includes('没有点名单元号')).length;
  console.log(`  ⚠ 软警：${closer} 题解析更贴近某干扰项 · ${sameWords} 处同词不同序 · ${noCite} 章解析未点名单元号`);
  const NL = String.fromCharCode(10);
  assert.deepStrictEqual(problems, [], 'quiz 语义硬门未过：' + NL + problems.join(NL));
});
