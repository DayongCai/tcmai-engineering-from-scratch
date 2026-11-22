'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  analyze,
  readDoc,
  h2Titles,
  occurrences,
  grams,
  mechanisms,
  stabilityExtras,
  bans,
  clearanceExceptions,
  imagingRoles,
  cordLines,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，目录名与章号一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, SLUG);
  assert.match(dir, new RegExp(`^${String(CHAPTER).padStart(2, '0')}`));
});

test('小节结构：六个二级标题，前五节按一至五编号，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  assert.ok(titles.slice(0, 5).every((t) => /^[一二三四五]、/.test(t)), '前五节未按一至五编号');
});

test('每节的探针词都落在本节，小节顺序未被改动', () => {
  const r = analyze();
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('机制四类按屈曲压缩、屈曲牵张、过伸、旋转与侧屈列出', () => {
  const m = mechanisms(readDoc());
  assert.deepStrictEqual(m, ['屈曲压缩', '屈曲牵张', '过伸', '旋转与侧屈']);
});

test('机制决定影像：过伸看磁共振，旋转加血管成像', () => {
  const t = readDoc();
  assert.ok(t.includes('怀疑过伸损伤的老年人，平片可能完全正常，需要磁共振'), '未写机制到影像的映射');
  assert.ok(t.includes('椎动脉夹层'), '未写旋转损伤要除外夹层');
});

test('稳定性的三个特殊之处齐：韧带复合体、骨的质量、储备空间', () => {
  const s = stabilityExtras(readDoc());
  assert.strictEqual(s.length, 3, s.map((x) => x.n).join('/'));
  const joined = s.map((x) => x.text).join('|');
  for (const k of ['后方韧带复合体', '骨质疏松', '储备空间']) assert.ok(joined.includes(k), '缺 ' + k);
});

test('现场四条禁令都是「不要…」，且第一条管固定，第四条管平片', () => {
  const b = bans(readDoc());
  assert.strictEqual(b.length, 4, b.join(' / '));
  assert.ok(b[0].includes('未固定前搬动头颈'), b[0]);
  assert.ok(b[1].includes('扶一把'), b[1]);
  assert.ok(b[3].includes('平片正常'), b[3]);
});

test('影像三件是分工不是替代：平片、CT、磁共振各答一句', () => {
  const roles = imagingRoles(readDoc());
  assert.strictEqual(roles.length, 3, roles.join(' / '));
  assert.ok(roles[0].includes('有没有明显移位'), roles[0]);
  assert.ok(roles[1].includes('骨断在哪里'), roles[1]);
  assert.ok(roles[2].includes('神经与血管'), roles[2]);
});

test('清关规则例外六类，老年与骨质疏松都在内', () => {
  const e = clearanceExceptions(readDoc());
  assert.strictEqual(e.length, 6, `例外 ${e.length}：${e.join('/')}`);
  for (const k of ['老年', '骨质疏松', '强直性脊柱炎', '糖皮质激素', '颈部手术史']) {
    assert.ok(e.join('').includes(k), '缺 ' + k);
  }
});

test('脊髓损伤四条主线齐，骶段功能决定完全性与预后', () => {
  const c = cordLines(readDoc());
  assert.deepStrictEqual(c, ['感觉', '运动', '反射', '括约肌']);
  assert.ok(readDoc().includes('骶段功能'), '未写骶段功能');
  assert.ok(readDoc().includes('完全性还是不完全性'), '未写完全性判断');
});

test('关键判据词都在正文出现过（词频 > 0）', () => {
  const text = readDoc();
  for (const t of TERMS) assert.ok(occurrences(text, t) > 0, `正文没有「${t}」`);
});

test('quiz 结构：≥5 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = q.questions;
  assert.strictEqual(q.chapter, Number(CHAPTER));
  assert.strictEqual(q.title, TITLE);
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, `选项数不对：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.question}`);
  }
});

test('答案打散：四个位置都被用到，相邻同答案不超过两处', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const pos = new Set(q.questions.map((x) => x.correct));
  assert.strictEqual(pos.size, 4, `正确项落在 ${[...pos].sort().join(',')}`);
  const consec = q.questions.slice(1).filter((x, i) => x.correct === q.questions[i].correct).length;
  assert.ok(consec <= 2, `相邻两题同答案 ${consec} 处，太多`);
});

test('quiz 的 check 题至少两道能在正文中找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) assert.ok(h.grams.length > 0, `未接地：${h.question}`);
});

test('quiz 与正文同源：至少两道 check 题带两个以上不同原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const check = q.questions.filter((x) => x.stage === 'check');
  const rich = check.filter((x) => {
    const hit = new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g)));
    return hit.size >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('习题不考正文里没有的名目，也不写牵引重量、手术入路', () => {
  const bad = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of bad) assert.ok(!re.test(raw), `出现脚手架字样 ${re}`);
  for (const re of [/\d+\s*(kg|公斤|磅)/, /入路/]) assert.ok(!re.test(raw), `出现专科操作参数 ${re}`);
});

test('命令行可运行，打印章号与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成诊疗建议/);
});
