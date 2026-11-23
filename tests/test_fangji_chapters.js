'use strict';
/**
 * 方剂学 12 章门（9 项）
 *   1. 12 章目录齐、每章 6 文件齐
 *   2. 教材引文逐字保真：docs 里标了教材出处的行（含「教材·第N章」），「」内文字必须在底本逐字出现
 *   3. 引用落到「教材·第N章·N.M.K」级；不许「底本·」「原文·」
 *   4. 规模数字：docs 里必须出现本章对应教材章的字数（按映射复算）；第 12 章改核 114/821/52
 *   5. quiz 恰好 6 题：pre / check×3 / post×2；4 选项；correct 0-3；explanation ≥10 字
 *   6. outputs：prompt-<slug>.md 与 skill-<slug>.md 都在；skill frontmatter 的 name = slug
 *   7. 章内单测可跑，且 main.js 运行时最后一行是教学边界声明
 *   8. chapters.json 12 章状态不得为 📋
 *   9. 覆盖留账：教材未被任何课程章覆盖的章号必须与 COVERED 的补集一致（第4/11/23/24章现未覆盖）
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments', '02-zhongyao', '03-fangjixue');
const DIR = path.join(SUBJ, 'chapters');
const BASE = path.join(ROOT, 'standards', 'fangji', '底本.json');

const base = () => JSON.parse(fs.readFileSync(BASE, 'utf8'));
const chaptersJson = () => JSON.parse(fs.readFileSync(path.join(SUBJ, 'chapters.json'), 'utf8'));
const read = (p) => fs.readFileSync(p, 'utf8');
const nonWs = (s) => s.replace(/\s/g, '').length;
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』""'']/g, '');

/** 课程 12 章 → 教材章号（与 README 的映射同源） */
const MAP = {
  1: ['2', '1'], 2: ['3'], 3: ['5'], 4: ['6', '7'], 5: ['8', '9'], 6: ['10', '12'],
  7: ['13', '14'], 8: ['15', '16'], 9: ['17', '18'], 10: ['19', '20'], 11: ['21', '22'],
  12: [],            // 第 12 章是计算章，不按教材字数核，改核 114 / 836 / 52
  13: ['4'], 14: ['11', '23'], 15: ['24'],
};

/** 教材 24 章里被课程覆盖的章号 */
const COVERED = new Set(Object.values(MAP).flat());

function pool() {
  const d = base();
  const out = [];
  for (const c of d.chapters) {
    out.push(...(c.paras || []));
    for (const s of c.secs || []) {
      out.push(...(s.paras || []));
      out.push(...(s.subs || []).flatMap((u) => u.paras || []));
    }
  }
  return out.map((p) => fold(p.text || ''));
}

test('1. 12 章与 6 文件齐', () => {
  const list = chaptersJson().chapters;
  assert.strictEqual(list.length, 15);
  for (const c of list) {
    const d = path.join(DIR, c.slug);
    assert.ok(fs.existsSync(d), `缺章节目录 ${c.slug}`);
    for (const f of ['docs/zh.md', 'quiz.json', 'code/main.js', 'code/main.test.js',
      `outputs/prompt-${c.slug.replace(/^\d+-/, '')}.md`, `outputs/skill-${c.slug.replace(/^\d+-/, '')}.md`]) {
      assert.ok(fs.existsSync(path.join(d, f)), `${c.slug} 缺 ${f}`);
    }
  }
});

test('2. 教材引文逐字保真（只核标了教材出处的行）', () => {
  const P = pool();
  const bad = [];
  let checked = 0;
  for (const c of chaptersJson().chapters) {
    const doc = read(path.join(DIR, c.slug, 'docs', 'zh.md'));
    for (const line of doc.split('\n')) {
      if (!/教材·第\d+章/.test(line)) continue;
      for (const m of line.matchAll(/「([^」]{6,})」/g)) {
        checked += 1;
        const q = fold(m[1]);
        if (!P.some((p) => p.includes(q))) bad.push(`${c.slug}: ${m[1].slice(0, 26)}…`);
      }
    }
  }
  assert.deepStrictEqual(bad, [], `教材引文在底本里找不到：\n${bad.join('\n')}`);
  assert.ok(checked >= 30, `教材引文太少（${checked} 条），15 章至少 30 条`);
});

test('3. 引用格式与禁用词', () => {
  for (const c of chaptersJson().chapters) {
    const t = read(path.join(DIR, c.slug, 'docs', 'zh.md'));
    assert.ok(/教材·第\d+章/.test(t), `${c.slug}/docs 没有「教材·第N章」级引用`);
    assert.ok(!/「?底本·[^」"]{2,}」?/.test(t), `${c.slug}/docs 出现「底本·」式引用`);
  }
});

test('4. 规模数字与底本一致', () => {
  const d = base();
  const byNo = new Map(d.chapters.map((c) => [c.no, c]));
  const bad = [];
  for (const c of chaptersJson().chapters) {
    const nos = MAP[c.n];
    const doc = read(path.join(DIR, c.slug, 'docs', 'zh.md')).replace(/,/g, '');
    if (!nos.length) {
      for (const k of ['114', '836', '52']) {
        if (!doc.includes(k)) bad.push(`${c.slug}：计算章 docs 里没有关键数字 ${k}`);
      }
      continue;
    }
    const chars = nos.reduce((n, no) => n + byNo.get(no).counts.hanzi, 0);
    if (!doc.includes(String(chars))) bad.push(`${c.slug}：docs 里没有本章教材字数 ${chars}`);
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
      assert.ok((x.explanation || '').length >= 10, `${c.slug} explanation 太短`);
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
  // Node 22 的 test runner 会把 NODE_TEST_CONTEXT 传给子进程；子进程若继承该变量，
  // `node --test` 会以「run() 被递归调用」为由直接跳过，stdout 为空——
  // 那样这条断言就成了空转。显式去掉该变量，子进程才会真的把章内单测跑一遍。
  const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'NODE_TEST_CONTEXT'));
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

test('9. 教材 24 章全覆盖（无留账）', () => {
  const all = base().chapters.map((c) => c.no);
  const uncovered = all.filter((no) => !COVERED.has(no));
  assert.deepStrictEqual(uncovered, [], `仍有教材章未进课程：${uncovered.join(',')}`);
  const doc = read(path.join(SUBJ, 'README.md'));
  assert.ok(doc.includes('24 章全覆盖'), 'README 必须声明 24 章全覆盖');
  // 第 15 章对第24章是结构级覆盖，这一条不许写成逐段覆盖
  assert.ok(/结构级覆盖/.test(doc), 'README 必须说清第15章是结构级覆盖，不能暗示逐段覆盖');
});
