'use strict';
/**
 * 中医诊断学 12 章门
 *   1. 12 章目录齐、每章 6 文件齐
 *   2. 引文保真：docs 里「」内的教材引语必须在底本某段中逐字出现（折叠空白与半/全角标点）
 *   3. 引用落到「教材·第N章」级；不许「底本·」「原文·」
 *   4. 跨文件规模数字：prompt/skill 的「N 段/N 字/N%」必须与 docs 同值
 *   5. quiz 恰好 6 题（pre/check×3/post×2）
 *   6. skill frontmatter name = slug（去序号）
 *   7. 每章代码 node --test 全过，运行输出带教学边界
 *   8. chapters.json 12 章状态已推进
 */

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments', '01-zhongyi', '05-zhongyi-zhen-duan-xue');
const CHDIR = path.join(SUBJ, 'chapters');
const DOC = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'zhenduan', '底本.json'), 'utf8'));

const slugs = fs.existsSync(CHDIR)
  ? fs.readdirSync(CHDIR).filter((d) => fs.statSync(path.join(CHDIR, d)).isDirectory()).sort()
  : [];

const POOL_RAW = [];
for (const c of DOC.chapters) {
  for (const p of c.paras || []) POOL_RAW.push(p);
  for (const s of c.secs) {
    for (const p of s.paras) POOL_RAW.push(p);
    for (const sub of s.subs) {
      for (const p of sub.paras) POOL_RAW.push(p);
      for (const it of sub.items || []) POOL_RAW.push(it.title);
    }
  }
}

const norm = (s) => s
  .replace(/[，,、；;：:]/g, '')
  .replace(/[。．.]/g, '')
  .replace(/[“”"「」『』]/g, '')
  .replace(/[（）()]/g, '')
  .replace(/[＝=]/g, '')
  .replace(/\s+/g, '');

const POOL = POOL_RAW.map(norm);

function md(slug) {
  return fs.readFileSync(path.join(CHDIR, slug, 'docs', 'zh.md'), 'utf8');
}

test('12 章目录齐，每章 6 个文件齐', () => {
  assert.strictEqual(slugs.length, 12, `实际 ${slugs.length}：${slugs.join(' ')}`);
  for (const s of slugs) {
    const slug = s.replace(/^\d+-/, '');
    for (const f of ['docs/zh.md', 'quiz.json', 'code/main.js', 'code/main.test.js',
      `outputs/prompt-${slug}.md`, `outputs/skill-${slug}.md`]) {
      assert.ok(fs.existsSync(path.join(CHDIR, s, f)), `${s} 缺 ${f}`);
    }
  }
});

test('引文保真：标了教材出处的「」引语均可在底本逐字找到', () => {
  const misses = [];
  let checked = 0;
  for (const s of slugs) {
    for (const line of md(s).split(String.fromCharCode(10))) {
      if (!/教材·第\d+章|《中医诊断学·第\d+章/.test(line)) continue;
      for (const m of line.matchAll(/「([^」]{12,})」/g)) {
        checked += 1;
        const parts = m[1].split(/…+|⋯+/).map(norm).filter((x) => x.length >= 6);
        const bad = parts.filter((n) => !POOL.some((p) => p.includes(n)));
        if (bad.length) misses.push(`${s}: 「${m[1].slice(0, 26)}」 缺片：${bad.map((b) => b.slice(0, 10)).join('/')}`);
      }
    }
  }
  assert.ok(checked >= 8, `引文样本太少（${checked}）`);
  assert.deepStrictEqual(misses, [], `以下引文在底本中找不到：\n${misses.join('\n')}`);
});

test('每章 docs 至少一处「教材·第N章」；无「底本·」「原文·」式引用', () => {
  for (const s of slugs) {
    const t = md(s);
    assert.ok(/教材·第\d+章/.test(t) || /《中医诊断学·第\d+章/.test(t), `${s} 缺章级引用`);
    assert.ok(!/底本·\d+\.\d/.test(t), `${s} 出现「底本·」`);
    assert.ok(!/原文·\d+\.\d/.test(t), `${s} 出现「原文·」`);
  }
});

test('每章都要报自己的教材规模，且 docs 与两份产物一致', () => {
  // 课程 12 章 ↔ 教材章：01→1, 02/03→2, 04→3, 05→4, 06→5, 07→6, 08→8, 09→7, 10→10+11+12, 11→14(+13), 12→13(+14)
  const MAP = {
    '01-sizhen-zonglun': ['1'], '02-wangzhen-shense': ['2'], '03-shezhen-tese': ['2'],
    '04-wenzhen-shengyin': ['3'], '05-wenzhen-wenjuan': ['4'], '06-qiezhen-maixiang': ['5'],
    '07-bagang-bianzheng': ['6'], '08-zangfu-bianzheng': ['8'], '09-qixue-bianzheng': ['7'],
    '10-liujing-weifen': ['10', '11', '12'], '11-zhenghou-guifan': ['14'], '12-zhenduan-wucha': ['13'],
  };
  const chars = (nos) => nos.reduce((n, no) => n + DOC.chapters.find((c) => c.no === no).counts.chars, 0);
  // 第 3 章只讲教材 2.3 舌诊（1,249 字），不是整章第 2 章（2,812）——按小节另算
  const OVERRIDE = { '03-shezhen-tese': 1249 };
  const has = (t, v) => t.includes(String(v)) || t.includes(v.toLocaleString('en-US'));
  const bad = [];
  for (const s of slugs) {
    const v = OVERRIDE[s] !== undefined ? OVERRIDE[s] : chars(MAP[s]);
    const slug = s.replace(/^\d+-/, '');
    const files = [['docs', md(s)],
      ['prompt', fs.readFileSync(path.join(CHDIR, s, `outputs/prompt-${slug}.md`), 'utf8')],
      ['skill', fs.readFileSync(path.join(CHDIR, s, `outputs/skill-${slug}.md`), 'utf8')]];
    for (const [k, t] of files) if (!has(t, v)) bad.push(`${s}/${k}: 缺本章规模 ${v}`);
  }
  assert.deepStrictEqual(bad, [], `以下文件没有报出本章教材字数：${String.fromCharCode(10)}${bad.join(String.fromCharCode(10))}`);
});

test('quiz 恰好 6 题：pre/check×3/post×2，4 选项，correct 0–3', () => {
  for (const s of slugs) {
    const q = JSON.parse(fs.readFileSync(path.join(CHDIR, s, 'quiz.json'), 'utf8'));
    assert.strictEqual(q.questions.length, 6, `${s} 题数`);
    assert.deepStrictEqual(q.questions.map((x) => x.stage), ['pre', 'check', 'check', 'check', 'post', 'post'], `${s} 阶段`);
    for (const x of q.questions) {
      assert.strictEqual(x.options.length, 4, `${s} 选项数`);
      assert.ok(x.correct >= 0 && x.correct <= 3, `${s} correct 越界`);
      assert.ok(x.explanation && x.explanation.length >= 10, `${s} 缺解释`);
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
      assert.fail(`${s} 单测失败：${String(e.stdout || e.message).slice(0, 300)}`);
    }
    const out = execFileSync(process.execPath, ['code/main.js'], { cwd, encoding: 'utf8', timeout: 60000 });
    assert.match(out, /教学边界|不构成诊疗/, `${s} 运行输出缺教学边界`);
  }
});

test('chapters.json 的 12 章状态已从 📋 推进', () => {
  const j = JSON.parse(fs.readFileSync(path.join(SUBJ, 'chapters.json'), 'utf8'));
  assert.strictEqual(j.chapters.length, 12);
  assert.deepStrictEqual(j.chapters.filter((c) => c.status === '📋').map((c) => c.slug), []);
});

// 课程 12 章与底本 14 章的对应（第 2、3 章同出底本第 2 章；第 10 章合六经 + 卫气营血 + 三焦）。
// 底本第 9 章（经络辨证）在课程里没有对应章——这是一处已知缺口，门不替它补位。
const MAP = {
  1: [1], 2: [2], 3: [2], 4: [3], 5: [4], 6: [5],
  7: [6], 8: [8], 9: [7], 10: [10, 11, 12], 11: [13], 12: [14],
};

function unitsOfCourseChapter(n) {
  const out = [];
  for (const k of MAP[n] || []) {
    const ch = DOC.chapters.find((c) => Number(c.no) === k);
    for (const sec of ch.secs) {
      for (const sub of sec.subs) {
        out.push({ sub: sub.no, title: sub.title, rawBody: (sub.paras || []).join(String.fromCharCode(10)) });
      }
    }
  }
  return out;
}

test('quiz 语义一致性：解析点名的单元必须属于本章，引证不许挂错节', () => {
  const Q = require('../scripts/lib_quiz_semantics');
  const problems = [];
  const soft = [];
  let cited = 0;
  let total = 0;
  for (const dir of fs.readdirSync(CHDIR).filter((d) => /^\d\d-/.test(d)).sort()) {
    const n = parseInt(dir.slice(0, 2), 10);
    const units = unitsOfCourseChapter(n);
    const qs = JSON.parse(fs.readFileSync(path.join(CHDIR, dir, 'quiz.json'), 'utf8')).questions;
    total += qs.length;
    const r = Q.auditQuiz(qs, units);
    for (const e of r.errors) problems.push(`${dir} ${e}`);
    for (const w of r.warns) soft.push(`${dir} ${w}`);
    cited += qs.filter((q) => /（(依据|口径见|前提|算见)教材·第\d+章·\d+\.\d+\.\d+）/.test(String(q.explanation))).length;
  }

  // 探针：硬判据必须真的会响，绿灯才不是「门没在干活」
  const one = [
    { sub: '2.3.2', title: '望舌质', rawBody: '舌形包括老嫩、胖瘦、点刺、裂纹；舌态包括痿软、强硬、歪斜' },
    { sub: '2.3.4', title: '舌诊的临床意义', rawBody: '白苔主寒主湿，黄苔主热' },
  ];
  const mk = (o) => ({ question: '舌形与舌态的区别？', options: o.options, correct: o.correct, explanation: o.explanation, stage: 'check' });
  const badId = Q.auditQuiz([mk({ options: ['甲', '乙', '丙', '丁'], correct: 0, explanation: '见 9.9.9 的说明' })], one);
  assert.ok(badId.errors.some((e) => e.includes('9.9.9')), '点名本章不存在的单元号必须判红');
  const wrongSub = Q.auditQuiz([mk({ options: ['舌形讲形状，舌态讲运动', '舌形讲颜色', '舌态讲颜色', '两者相同'], correct: 0, explanation: '（依据教材·第2章·2.3.4）' })], one);
  assert.ok(wrongSub.errors.some((e) => e.includes('覆盖')), '标了依据但正文覆盖不到答案，必须判红');
  const dup = Q.auditQuiz([mk({ options: ['舌形讲形状', '舌形讲形状', '丙', '丁'], correct: 0, explanation: '舌形讲形状' })], one);
  assert.ok(dup.errors.some((e) => e.includes('完全相同')), '选项文本完全相同必须判红');
  const okOne = Q.auditQuiz([mk({ options: ['舌形讲形状，舌态讲运动', '舌形讲颜色', '舌态讲颜色', '两者相同'], correct: 0, explanation: '（依据教材·第2章·2.3.2）' })], one);
  assert.deepStrictEqual(okOne.errors, [], '引对节的题不许判红');

  const closer = soft.filter((w) => w.includes('更贴近')).length;
  const sameWords = soft.filter((w) => w.includes('用词几乎相同')).length;
  console.log(`  ⚠ 软警：${closer} 题解析更贴近某干扰项 · ${sameWords} 处同词不同序`);
  console.log(`  引证：${cited} / ${total} 题`);
  assert.strictEqual(cited, total, `仍有 ${total - cited} 题没有引证`);
  const NL = String.fromCharCode(10);
  assert.deepStrictEqual(problems, [], 'quiz 语义硬门未过：' + NL + problems.join(NL));
});

test('单元级正文（unit-notes）：覆盖全部底本小节、每段 ≥120 字、docs 与源一致', () => {
  const R = require('../scripts/render_zhenduan_unit_notes');
  const NOTES = path.join(ROOT, 'standards', 'zhenduan', 'unit-notes');
  const files = fs.readdirSync(NOTES).filter((f) => /^\d\d\.json$/.test(f)).sort();
  assert.strictEqual(files.length, 12, `应有 12 章 unit-notes，实有 ${files.length}`);

  // 期望集合：底本全部小节，减去课程没有对应章的底本第 9 章（经络辨证）。
  const truth = {};
  for (const [n, ks] of Object.entries(MAP)) {
    for (const k of ks) {
      const ch = DOC.chapters.find((c) => Number(c.no) === k);
      for (const sec of ch.secs) for (const sub of sec.subs) {
        if (Number(k) === 9) continue;
        truth[sub.no] = sub.title;
      }
    }
  }
  const seen = new Set();
  let chars = 0;
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(NOTES, f), 'utf8'));
    const slug = fs.readdirSync(CHDIR).find((d) => parseInt(d.slice(0, 2), 10) === j.chapter);
    for (const u of j.units) {
      assert.ok(truth[u.sub], `${slug} 的 ${u.sub} 不在底本对应章的小节里`);
      assert.ok(!seen.has(u.sub), `${u.sub} 在两章重复落位（同一小节只该有一段）`);
      seen.add(u.sub);
      assert.strictEqual(u.title, truth[u.sub], `${u.sub} 标题与底本不一致`);
      const n2 = u.note.replace(/\s/g, '').length;
      chars += n2;
      assert.ok(n2 >= 120, `${u.sub} 只有 ${n2} 字，短于 120 字不算正文`);
    }
    const doc = fs.readFileSync(path.join(CHDIR, slug, 'docs', 'zh.md'), 'utf8').split(String.fromCharCode(13)).join('');
    const { BEGIN, END } = R;
    assert.ok(doc.includes(BEGIN) && doc.includes(END), `${slug} 缺逐条落位块（跑 node scripts/render_zhenduan_unit_notes.js）`);
    const seg = doc.split(BEGIN)[1].split(END)[0];
    assert.strictEqual(BEGIN + seg + END, R.blockFor(j.chapter, j.units, j.sources), `${slug} 逐条落位与 unit-notes 现算不一致`);
    const heads = seg.split(String.fromCharCode(10)).filter((l) => /^#### \d+\.\d+\.\d+ /.test(l));
    assert.strictEqual(heads.length, j.units.length, `${slug} 标题数 ${heads.length} ≠ 段数 ${j.units.length}`);
  }
  const miss = Object.keys(truth).filter((k) => !seen.has(k));
  assert.deepStrictEqual(miss, [], `以下底本小节没有落位：${miss.join('、')}`);

  // 已知缺口：底本第 9 章（经络辨证，6 小节）在课程里没有对应章，这里显式记账而不是假装覆盖。
  const missedChapter = DOC.chapters.find((c) => Number(c.no) === 9);
  const g9 = missedChapter.secs.flatMap((x) => x.subs).length;
  console.log(`  覆盖：${seen.size} / ${Object.keys(truth).length} 小节 · ${chars} 字 · 底本第 9 章 ${g9} 小节未映射（课程无经络章）`);
});
