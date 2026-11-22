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
  contraindications,
  fiveQuestions,
  whatChanges,
  surgeryLines,
  courseMeanings,
  afterSurgery,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  COURSE_MEANINGS,
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

test('手法禁忌五条按一二三四五列出，五条名字齐全', () => {
  const c = contraindications(readDoc());
  assert.strictEqual(c.length, 5, c.map((x) => x.name).join('/'));
  assert.deepStrictEqual(c.map((x) => x.n), ['一', '二', '三', '四', '五']);
  const joined = c.map((x) => x.name).join('|');
  for (const k of ['脊髓型颈椎病', '马尾综合征', '骨质破坏', '急性外伤', '椎动脉']) {
    assert.ok(joined.includes(k), '缺 ' + k);
  }
});

test('脊髓型写成「禁忌，不是慎用」，椎动脉条写明与力度无关', () => {
  const t = readDoc();
  assert.ok(t.includes('手法是禁忌，不是「慎用」'), '缺禁忌定性');
  assert.ok(t.includes('与力度大小没有必然关系'), '未写与力度无关');
  assert.ok(t.includes('凝血功能障碍'), '缺抗凝这一条单独提出的说明');
});

test('操作前五问齐：外伤、发热夜间痛体重下降、神经功能、眩晕复视构音、片子对不对得上', () => {
  assert.strictEqual(fiveQuestions(readDoc()), 5);
  const t = readDoc();
  assert.ok(t.includes('把「先问」变成操作流程的第一步'), '未写把问变成流程');
});

test('能改变与不能改变两栏都很具体：结构五项不变，症状五项可变', () => {
  const c = whatChanges(readDoc());
  assert.strictEqual(c.cannot.length, 5, c.cannot.join('/'));
  assert.strictEqual(c.can.length, 5, c.can.join('/'));
  assert.ok(c.cannot.join('').includes('髓核'), '缺髓核');
  assert.ok(c.cannot.join('').includes('骨赘'), '缺骨赘');
  assert.ok(c.can.join('').includes('活动度'), '缺活动度');
  assert.ok(readDoc().includes('这些是结构事实'), '未写结构事实');
});

test('手法三条要求：应当轻、有随访节点、配合主动训练', () => {
  const f = analyze().facts;
  assert.ok(f.threeRules, '三条要求不全');
  const t = readDoc();
  assert.ok(t.includes('没有节点的疗程'), '未写无节点的后果');
  assert.ok(t.includes('越痛越有效'), '未打掉这句口号');
});

test('手术六条硬线齐，且写明疼痛本身不是指征', () => {
  assert.strictEqual(surgeryLines(readDoc()), 6);
  const t = readDoc();
  assert.ok(t.includes('疼痛本身不是手术指征'), '未写疼痛不是指征');
  assert.ok(t.includes('脊柱不稳定'), '缺不稳定一条');
});

test('「足疗程」有三种含义，分别对应神经根性、狭窄与脊髓型', () => {
  const m = courseMeanings(readDoc());
  assert.deepStrictEqual(m, COURSE_MEANINGS);
  assert.ok(readDoc().includes('观察期的容忍度最低'), '未写脊髓型容忍度最低');
});

test('术后三件事：邻近节段承压、疼痛未必全消、功能依赖康复', () => {
  const a = afterSurgery(readDoc());
  for (const x of a) assert.ok(x.ok, `缺 ${x.key}`);
  assert.ok(readDoc().includes('不是手术失败'), '未写邻近退变不是失败');
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

test('习题不考正文里没有的名目，也不给手法操作、牵引参数与术式', () => {
  const bad = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of bad) assert.ok(!re.test(raw), `出现脚手架字样 ${re}`);
  for (const re of [/\d+\s*(牛顿|N\b|公斤)/, /术式\s*[:：]/]) assert.ok(!re.test(raw), `出现操作参数 ${re}`);
});

test('命令行可运行，打印章号与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成诊疗建议/);
});
