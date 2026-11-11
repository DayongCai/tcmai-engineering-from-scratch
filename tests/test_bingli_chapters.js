/**
 * tests/test_bingli_chapters.js —— 病理学「21 章」门
 *
 * 核的是章级交付是否合格：
 *   1. 21 章、每章 6 文件齐（docs / quiz / code×2 / outputs×2）
 *   2. 教材引文逐字保真：带「教材·第N章·N.M.K」的行里，每个「…」都必须在底本里找得到
 *   3. 引用格式：必须有 locator；不许出现「底本·」式引用
 *   4. 规模数字：docs 里写明本章教材字数，且与底本逐章计数一致
 *   5. quiz 契约：6 题、阶段序列固定、题干键必须是 question
 *   6. outputs / skill frontmatter（含 version）
 *   7. 章内单测可跑，末行是教学边界声明
 *   8. chapters.json 无 📋
 *   9. 数值口径：按底本 valueLike 分两支（本书 A 支：非引文行零数值）
 *  10. 边界声明：docs 必须说明教材不给值
 *  11. 单元覆盖：本章 12 个小节号在 docs 里都出现
 */
'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const SUBJ = path.join(ROOT, 'departments', '09-jichu', '10-bingli-xue');
const DIR = path.join(SUBJ, 'chapters');
const BASE = path.join(ROOT, 'standards', 'bingli', '底本.json');
const UNITS = path.join(ROOT, 'standards', 'bingli', 'units.json');

const base = () => JSON.parse(fs.readFileSync(BASE, 'utf8'));
const unitsDoc = () => JSON.parse(fs.readFileSync(UNITS, 'utf8'));
const chaptersJson = () => JSON.parse(fs.readFileSync(path.join(SUBJ, 'chapters.json'), 'utf8'));
const read = (p) => fs.readFileSync(p, 'utf8');
const nonWs = (s) => s.replace(/\s/g, '').length;
const fold = (s) => s.replace(/\s/g, '').replace(/[，,。．；;：:、（）()「」『』""'']/g, '');
const LOCATOR = /教材·第\d+章·\d+\.\d+\.\d+/;
const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg\/ml|mg|ml|mL|kg|cm|mm|μm|um|ms|min|小时|秒钟|升|毫升|倍|周|天|年)/g;

const list = () => chaptersJson().chapters;
const docsOf = (slug) => read(path.join(DIR, slug, 'docs', 'zh.md'));

function pool() {
  const out = [];
  for (const c of base().chapters) for (const s of c.secs) for (const u of s.subs) {
    out.push(u.brief || '', u.body || '');
  }
  return out.map(fold);
}

test('1. 21 章与 6 文件齐', () => {
  const l = list();
  assert.strictEqual(l.length, 21, 'chapters.json 应声明 21 章');
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
  const P = pool();
  for (const c of list()) {
    const doc = docsOf(c.slug);
    let checked = 0;
    for (const line of doc.split('\n')) {
      if (!/教材·第\d+章/.test(line)) continue;
      for (const m of line.matchAll(/「([^」]{6,})」/g)) {
        checked += 1;
        assert.ok(P.some((p) => p.includes(fold(m[1]))), `${c.slug} 引文找不到：${m[1].slice(0, 30)}`);
      }
    }
    assert.ok(checked >= 2, `${c.slug} 带教材出处的引文只有 ${checked} 条`);
  }
});

test('3. 引用格式与禁用词', () => {
  for (const c of list()) {
    const doc = docsOf(c.slug);
    assert.ok(LOCATOR.test(doc), `${c.slug} 没有「教材·第N章·N.M.K」级引用`);
    assert.ok(!/「?底本·/.test(doc), `${c.slug} 出现「底本·」式引用`);
    assert.ok(!/📋/.test(doc), `${c.slug} docs 里残留 📋`);
  }
});

test('4. 规模数字与底本一致', () => {
  const byNo = new Map(base().chapters.map((c) => [c.no, c]));
  for (const c of list()) {
    const doc = docsOf(c.slug).replace(/,/g, '');
    const chars = byNo.get(String(c.n)).counts.hanzi;
    assert.ok(doc.includes(String(chars)), `${c.slug} 没有本章教材字数 ${chars}`);
  }
});

test('5. quiz 契约（题干键必须是 question）', () => {
  for (const c of list()) {
    const q = JSON.parse(read(path.join(DIR, c.slug, 'quiz.json')));
    const qs = q.questions || q;
    assert.strictEqual(qs.length, 6, `${c.slug} quiz 题数 ${qs.length}`);
    assert.strictEqual(qs.map((x) => x.stage).join(','), 'pre,check,check,check,post,post', `${c.slug} 阶段序列`);
    for (const [i, x] of qs.entries()) {
      assert.ok(x.question && String(x.question).length >= 6, `${c.slug} quiz#${i + 1} 缺 question`);
      assert.strictEqual((x.options || []).length, 4, `${c.slug} quiz#${i + 1} 选项数`);
      assert.ok(Number.isInteger(x.correct) && x.correct >= 0 && x.correct <= 3, `${c.slug} quiz#${i + 1} correct`);
      assert.ok((x.explanation || '').length >= 10, `${c.slug} quiz#${i + 1} explanation`);
    }
  }
});

test('6. outputs 与 skill frontmatter', () => {
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

test('7. 章内单测与教学边界', () => {
  for (const c of list()) {
    const dir = path.join(DIR, c.slug);
    const out = execFileSync('node', ['--test', 'code/main.test.js'], { cwd: dir, encoding: 'utf8' });
    assert.ok(/# fail 0/.test(out), `${c.slug} 单测有失败`);
    const run = execFileSync('node', ['code/main.js'], { cwd: dir, encoding: 'utf8' });
    const last = run.trim().split('\n').filter(Boolean).pop() || '';
    assert.ok(/教学边界/.test(last) && /不构成/.test(last), `${c.slug} 末行不是教学边界声明：${last}`);
  }
});

test('8. chapters.json 无 📋', () => {
  const bad = list().filter((c) => c.status === '📋');
  assert.deepStrictEqual(bad.map((c) => c.slug), [], '这些章仍是 📋');
});

test('9. 数值口径（按底本 valueLike 分支）', () => {
  const CAL = require('../scripts/lib_value_caliber');
  const vl = base().counts.valueLike || 0;
  for (const c of list()) {
    const errs = CAL.verdict(docsOf(c.slug), vl, true);
    assert.deepStrictEqual(errs, [], `${c.slug}：${errs.join('；')}`);
  }
});

test('10. 边界声明：教材不给值', () => {
  const RE = /教材不给值|不写数值|不给正常值|数值不在本书|本书不含数值|不提供数值|不给单位/;
  for (const c of list()) {
    assert.ok(RE.test(docsOf(c.slug)), `${c.slug} 没有「教材不给值」类边界声明`);
  }
});

test('11. 单元覆盖：本章 12 个小节号都在 docs 里出现', () => {
  const U = unitsDoc();
  for (const c of list()) {
    const doc = docsOf(c.slug);
    const subs = U.units.filter((u) => u.chapter === String(c.n)).map((u) => u.sub);
    assert.strictEqual(subs.length, 12, `第${c.n}章单元数应为 12`);
    const missing = subs.filter((s) => !doc.includes(s));
    assert.deepStrictEqual(missing, [], `${c.slug} 未提到这些单元：${missing.join('、')}`);
  }
});

test('12. 数值口径两支的自测（同一段正文，A 支该红、B 支放行引文行）', () => {
  const CAL = require('../scripts/lib_value_caliber');
  const quoted = '「血钾浓度降低至 3.0 mmol/L 以下」——教材·第9章·9.2.1';
  const bare = '本章讨论血钾降到 3.0 mmol/L 时的表现。';

  // A 支（教材 0 数值）：只要有数值就红，哪怕挂在引文行上——那种「引文」回查不到原文
  assert.strictEqual(CAL.branchOf(0), 'A');
  const a1 = CAL.verdict(quoted, 0, true);
  assert.strictEqual(a1.length, 0, 'A 支在引文行上不拦，由引文逐字门兜底');
  const a2 = CAL.verdict(bare, 0, true);
  assert.strictEqual(a2.length, 1, 'A 支正文裸写数值必须红');

  // B 支（教材带数值）：引文行放行，裸写照红
  assert.strictEqual(CAL.branchOf(3), 'B');
  const b1 = CAL.verdict(quoted, 3, true);
  assert.strictEqual(b1.length, 0, 'B 支引文行带 locator 必须放行');
  const b2 = CAL.verdict(bare, 3, true);
  assert.strictEqual(b2.length, 1, 'B 支裸写数值必须红');

  // 两支都要拦「把教材值改写成正常值」：没有边界声明就报
  const reframed = '「血钾 3.5～5.3 mmol/L」——教材·第9章·9.2.1'
    + String.fromCharCode(10) + '这就是正常值。';
  assert.ok(CAL.verdict(reframed, 3, false).some((e) => /正常值|参考/.test(e)), '改写为正常值必须红');
  assert.strictEqual(CAL.verdict(reframed, 3, true).length, 0, '写了边界声明后放行');
});

test('13. quiz 语义一致性（解析点名的单元必须属于本章；选项不许完全重复）', () => {
  const Q = require('../scripts/lib_quiz_semantics');
  const U = unitsDoc();
  const problems = [];
  const soft = [];
  for (const c of list()) {
    const units = U.units.filter((u) => u.chapter === String(c.n)).map((u) => ({ sub: u.sub, title: u.title, rawBody: u.rawBody }));
    const qs = JSON.parse(read(path.join(DIR, c.slug, 'quiz.json'))).questions;
    const r = Q.auditQuiz(qs, units);
    for (const e of r.errors) problems.push(`${c.slug} ${e}`);
    for (const w of r.warns) soft.push(`${c.slug} ${w}`);
  }

  // 探针：硬判据必须真的会响。只核「现网 126 题没报错」是不够的——
  // 那可能只是判据根本没生效。这里用构造题把每条硬判据各触发一次。
  const one = [{ sub: '5.2.2', title: '5.2.2 渗出' }];
  const mk = (o) => ({ question: '渗出与变质是什么关系？', options: o.options, correct: o.correct, explanation: o.explanation, stage: 'check' });
  const badId = Q.auditQuiz([mk({ options: ['甲', '乙', '丙', '丁'], correct: 0, explanation: '见 5.9.9 的说明' })], one);
  assert.ok(badId.errors.some((e) => e.includes('5.9.9')), '解析点名本章不存在的单元号，必须判红');
  const dup = Q.auditQuiz([mk({ options: ['渗出为主', '渗出为主', '变质为主', '增生为主'], correct: 0, explanation: '渗出为主' })], one);
  assert.ok(dup.errors.some((e) => e.includes('完全相同')), '两个选项文本完全相同，必须判红');
  const ok1 = Q.auditQuiz([mk({ options: ['血流量先增加', '通透性升高', '纤维组织增生', '细胞水肿'], correct: 1, explanation: '见 5.2.2：渗出的关键是通透性升高' })], one);
  assert.deepStrictEqual(ok1.errors, [], '引对单元的题不应被判红');
  const reorder = Q.auditQuiz([mk({ options: ['渗出→变质→增生', '变质→渗出→增生', '增生→渗出→变质', '三者同时并存'], correct: 0, explanation: '顺序题' })], one);
  assert.deepStrictEqual(reorder.errors, [], '同词不同序是有意的顺序题，不许判重');

  const closer = soft.filter((w) => w.includes('更贴近')).length;
  const sameWords = soft.filter((w) => w.includes('用词几乎相同')).length;
  const noCite = soft.filter((w) => w.includes('没有点名单元号')).length;
  console.log(`  ⚠ 软警：${closer} 题解析更贴近某干扰项 · ${sameWords} 处同词不同序 · ${noCite} 章解析未点名单元号`);
  const NL = String.fromCharCode(10);
  assert.deepStrictEqual(problems, [], 'quiz 语义硬门未过：' + NL + problems.join(NL));
});

test('14. 单元级正文（unit-notes）：12 段齐、每段 ≥250 字、docs 与源一致', () => {
  const R = require('../scripts/render_bingli_unit_notes');
  const NOTES = path.join(ROOT, 'standards', 'bingli', 'unit-notes');
  const U = unitsDoc();
  const files = fs.readdirSync(NOTES).filter((f) => /^\d\d\.json$/.test(f)).sort();
  const chars = [];
  const have = new Set(files.map((f) => parseInt(f.slice(0, 2), 10)));
  const missing = list().map((c) => c.n).filter((n) => !have.has(n));
  assert.deepStrictEqual(missing, [], `以下章节缺 unit-notes：${missing.join(',')}（跑 node scripts/render_bingli_unit_notes.js 之前先补 standards/bingli/unit-notes/<章>.json）`);
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(NOTES, f), 'utf8'));
    const ch = j.chapter;
    const truth = U.units.filter((u) => u.chapter === String(ch));
    assert.strictEqual(j.units.length, 12, `第${ch}章应为 12 段，实为 ${j.units.length}`);
    assert.deepStrictEqual(j.units.map((u) => u.sub), truth.map((u) => u.sub), `第${ch}章小节号与 units.json 不一致`);
    for (let i = 0; i < j.units.length; i++) {
      assert.strictEqual(j.units[i].title, truth[i].title.replace(/^\d+(\.\d+){2}\s*/, ''), `${j.units[i].sub} 标题与教材不一致`);
      const n = j.units[i].note.replace(/\s/g, '').length;
      chars.push(n);
      assert.ok(n >= 250, `${j.units[i].sub} 只有 ${n} 字，短于 250 字（本层已扩写到 260–340）`);
    }
    const slug = list().find((c) => c.n === ch).slug;
    const doc = docsOf(slug).split(String.fromCharCode(13)).join('');
    const { BEGIN, END } = R;
    assert.ok(doc.includes(BEGIN) && doc.includes(END), `${slug} 缺逐条落位块（跑 node scripts/render_bingli_unit_notes.js）`);
    const seg = doc.split(BEGIN)[1].split(END)[0];
    assert.strictEqual(BEGIN + seg + END, R.blockFor(ch, j.units), `${slug} 逐条落位与 unit-notes 现算不一致`);
    const heads = seg.split(String.fromCharCode(10)).filter((l) => /^#### \d+\.\d+\.\d+ /.test(l));
    assert.strictEqual(heads.length, 12, `${slug} 只有 ${heads.length} 个小节标题`);
  }
  const avg = Math.round(chars.reduce((a, b) => a + b, 0) / Math.max(1, chars.length));
  console.log(`  单元级正文：${chars.length} 段 · 平均 ${avg} 字 · 最短 ${Math.min(...chars)}`);
});
