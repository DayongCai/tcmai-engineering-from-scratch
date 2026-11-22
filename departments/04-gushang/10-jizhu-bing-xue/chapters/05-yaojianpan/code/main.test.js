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
  diagnosticTriad,
  nonDiscogenic,
  rootLocalization,
  naturalCourseCaveats,
  emergencyLines,
  referralRules,
  conservativeParts,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  CONSERVATIVE,
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

test('「突出症」三条件齐：影像相符、症状沿神经根、查体有体征，缺一只能叫突出', () => {
  const triad = diagnosticTriad(readDoc());
  assert.strictEqual(triad.length, 3, triad.join('/'));
  assert.ok(readDoc().includes('三者缺一'), '未写缺一不成立');
});

test('非间盘源性腰痛列出六类，盘源性与非特异性都在内', () => {
  const n = nonDiscogenic(readDoc());
  assert.strictEqual(n.length, 6, `列出 ${n.length} 类：${n.join('/')}`);
  const joined = n.join('');
  for (const k of ['退变性疼痛', '关节突关节', '骶髂关节', '非特异性腰痛']) assert.ok(joined.includes(k), '缺 ' + k);
});

test('L4／L5／S1 三条定位线各有感觉、运动、反射，S1 的反射是跟腱反射', () => {
  const roots = rootLocalization(readDoc());
  assert.deepStrictEqual(roots.map((r) => r.root), ['L4', 'L5', 'S1']);
  const s1 = roots.find((r) => r.root === 'S1');
  assert.ok(s1.reflex.includes('跟腱反射'), s1.reflex);
  assert.ok(s1.sensory.includes('小趾'), s1.sensory);
  const l4 = roots.find((r) => r.root === 'L4');
  assert.ok(l4.reflex.includes('膝反射'), l4.reflex);
  const l5 = roots.find((r) => r.root === 'L5');
  assert.ok(l5.motor.includes('拇长伸肌'), l5.motor);
  assert.ok(l5.reflex.includes('无特异'), l5.reflex);
});

test('两条急诊线：马尾与进行性肌力下降，且都靠功能判断', () => {
  const e = emergencyLines(readDoc());
  assert.deepStrictEqual(e, ['马尾综合征', '进行性肌力下降']);
  assert.ok(readDoc().includes('不靠疼痛程度判断'), '未写靠功能判断');
});

test('自然病程三个前提齐，第三个是「有些情形不允许等待」', () => {
  const c = naturalCourseCaveats(readDoc());
  assert.strictEqual(c.length, 3, c.map((x) => x.n).join('/'));
  assert.ok(c[2].text.includes('不允许等待'), c[2].text);
  assert.ok(readDoc().includes('时间窗是统计，不是承诺'), '未写时间窗性质');
});

test('转介六条齐全，前两条为急诊线，后四条为择期线', () => {
  const r = referralRules(readDoc());
  assert.strictEqual(r.length, 6, r.map((x) => x.n).join('/'));
  assert.deepStrictEqual(r.map((x) => x.n), ['一', '二', '三', '四', '五', '六']);
  assert.ok(r[0].text.includes('马尾'), r[0].text);
  assert.ok(r[1].text.includes('进行性肌力下降'), r[1].text);
  assert.ok(readDoc().includes('把择期当急诊，是过度手术'), '未写两类的差别');
});

test('保守治疗四组齐，教育排在第一位', () => {
  const c = conservativeParts(readDoc());
  assert.deepStrictEqual(c, CONSERVATIVE);
  assert.ok(readDoc().includes('避免长期卧床'), '未写在最前面的那句');
  assert.ok(readDoc().includes('牵引的疗效证据有限'), '未写牵引');
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

test('习题不考正文里没有的名目，也不给药物剂量与牵引参数', () => {
  const bad = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of bad) assert.ok(!re.test(raw), `出现脚手架字样 ${re}`);
  for (const re of [/\d+\s*(mg|毫克|公斤|kg)/]) assert.ok(!re.test(raw), `出现剂量 ${re}`);
});

test('命令行可运行，打印章号与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成诊疗建议/);
});
