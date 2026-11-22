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
  curveTypes,
  treatmentStairs,
  risserLevels,
  cobbTolerance,
  idiopathic,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  PARENT_CHECKS,
  IDIOPATHIC_AGES,
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

test('四类侧弯齐：先天性、神经肌肉性、特发性、退变性', () => {
  const t = curveTypes(readDoc());
  assert.deepStrictEqual(t, ['先天性侧弯', '神经肌肉性侧弯', '特发性侧弯', '退变性侧弯']);
});

test('四类的处理逻辑分开写：先天性神经肌肉性早期介入、特发性看生长、退变性看症状', () => {
  const t = readDoc();
  assert.ok(t.includes('先天性与神经肌肉性需要早期专科介入'), '缺第一句');
  assert.ok(t.includes('特发性要看生长潜能'), '缺第二句');
  assert.ok(t.includes('退变性要看症状与失衡'), '缺第三句');
});

test('特发性占青少年侧弯八成以上，三个年龄段写明', () => {
  const i = idiopathic(readDoc());
  assert.strictEqual(i.ages.length, 3, i.ages.join('/'));
  assert.deepStrictEqual(i.ages, IDIOPATHIC_AGES);
  assert.ok(i.share && i.share[1].includes('八成'), '占比未写');
  assert.ok(readDoc().includes('比例也决定了资源的投向'), '未把比例讲清');
});

test('Cobb 角有测量波动：小于五度的变化不作进展，且要求同一测量者与体位', () => {
  assert.strictEqual(cobbTolerance(readDoc()), 5);
  const t = readDoc();
  assert.ok(t.includes('同一测量者、同一体位、同一设备'), '缺三条前提');
  assert.ok(t.includes('全脊柱立位片'), '未写测量片子要求');
});

test('Risser 征 0 到 5 级，共 6 档，被称作「量的是时间」', () => {
  assert.strictEqual(risserLevels(readDoc()), 6);
  assert.ok(readDoc().includes('Risser 征量的是时间'), '未写时间维度');
});

test('前屈试验定位为「能发现、不能确诊」，家长三条观察齐', () => {
  const checks = analyze().facts.parentChecks;
  assert.deepStrictEqual(checks, PARENT_CHECKS);
  const t = readDoc();
  assert.ok(t.includes('阳性者需要拍片确认'), '未写阳性怎么办');
  assert.ok(t.includes('阴性者也不能完全排除'), '未写阴性不能排除');
});

test('治疗三个台阶：观察、支具、手术，且写明支具不能矫正回去', () => {
  const s = treatmentStairs(readDoc());
  assert.deepStrictEqual(s, ['观察', '支具', '手术']);
  const t = readDoc();
  assert.ok(t.includes('不能把弯曲「矫正回去」'), '未写支具的边界');
  assert.ok(t.includes('跳过观察直接支具，是过度治疗'), '未写过度治疗');
  assert.ok(t.includes('不是「变直」'), '未写手术目标');
});

test('退变性侧弯：角度不是主诉，矢状面参数更重要，且不给判定阈值', () => {
  const t = readDoc();
  assert.ok(t.includes('矢状面参数比冠状面角度更重要'), '未写矢状面优先');
  assert.ok(t.includes('本章不给判定阈值'), '未写不给阈值');
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

test('习题不考正文里没有的名目，也不写支具时长、角度阈值与融合范围', () => {
  const bad = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of bad) assert.ok(!re.test(raw), `出现脚手架字样 ${re}`);
  for (const re of [/佩戴\s*\d+\s*小时/, /超过\s*\d+\s*度就手术/]) assert.ok(!re.test(raw), `出现阈值 ${re}`);
});

test('命令行可运行，打印章号与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成诊疗建议/);
});
