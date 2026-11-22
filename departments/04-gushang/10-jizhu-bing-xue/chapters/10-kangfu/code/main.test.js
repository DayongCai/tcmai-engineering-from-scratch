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
  goalLevels,
  exerciseTypes,
  educationCount,
  lifeChanges,
  followNodes,
  functionTasks,
  hardRules,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  FUNCTION_TASKS,
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

test('目标三层：症状层、功能层、参与层，参与层最贴近「治好」也最易被忽略', () => {
  const g = goalLevels(readDoc());
  assert.deepStrictEqual(g, ['症状层', '功能层', '参与层']);
  const t = readDoc();
  assert.ok(t.includes('最贴近「治好」的真实含义'), '未写参与层的地位');
  assert.ok(t.includes('三层之间的关系不是线性的'), '未写三层非线性');
});

test('运动四类按一二三四排列，配对各不相同', () => {
  const e = exerciseTypes(readDoc());
  assert.strictEqual(e.length, 4, e.map((x) => x.name).join('/'));
  assert.deepStrictEqual(e.map((x) => x.n), ['一', '二', '三', '四']);
  assert.ok(e[0].name.includes('方向偏好'), e[0].name);
  assert.ok(e[1].name.includes('核心稳定'), e[1].name);
  assert.ok(e[2].name.includes('髋'), e[2].name);
  assert.ok(e[3].name.includes('有氧'), e[3].name);
});

test('核心训练的常见错误被点名：做成仰卧起坐练的是屈曲耐力', () => {
  const t = readDoc();
  assert.ok(t.includes('把核心训练做成仰卧起坐'), '未点名错误');
  assert.ok(t.includes('低负荷、高质量、渐进难度'), '缺要点');
});

test('宣教三件事齐：影像的恐惧、疼痛的理解、治愈的预期', () => {
  assert.strictEqual(educationCount(readDoc()), 3);
  const t = readDoc();
  assert.ok(t.includes('对影像的恐惧'), '缺第一件');
  assert.ok(t.includes('疼痛是神经系统的输出'), '缺第二件');
  assert.ok(t.includes('多数脊柱病是「管理」，不是「根治」'), '缺第三件');
});

test('宣教不是一次谈话，且要用工具落地', () => {
  const t = readDoc();
  assert.ok(t.includes('宣教不是一次谈话'), '未写重复');
  assert.ok(t.includes('本周三个动作'), '缺落地工具');
});

test('生活改造五项齐：工位、搬运、睡眠、体重、心理与睡眠', () => {
  const l = lifeChanges(readDoc());
  assert.strictEqual(l.length, 5, l.join('/'));
  for (const k of ['工位', '搬运', '睡眠', '体重', '心理与睡眠']) assert.ok(l.includes(k), '缺 ' + k);
  assert.ok(readDoc().includes('久坐的伤害不在「坐」，在「不动」'), '缺久坐的判据');
});

test('随访四节点齐，且术后另有一套', () => {
  const n = followNodes(readDoc());
  assert.strictEqual(n.length, 4, n.map((x) => x.n).join('/'));
  assert.deepStrictEqual(n.map((x) => x.n), ['一', '二', '三', '四']);
  const t = readDoc();
  assert.ok(t.includes('术后患者另有一套节点'), '缺术后节点');
});

test('功能层用四个具体动作复述，不用量表堆叠', () => {
  const tasks = functionTasks(readDoc());
  assert.deepStrictEqual(tasks, FUNCTION_TASKS);
  assert.ok(readDoc().includes('一份患者记不住的量表'), '未写量表的选择标准');
});

test('两句硬话：管理而非根治、停止规则，且不替代诊断', () => {
  const r = hardRules(readDoc());
  assert.ok(r.manageNotCure, '缺管理与根治之分');
  assert.ok(r.stopRule, '缺停止规则');
  assert.ok(r.notInsteadOfDx, '缺不替代诊断');
  assert.ok(r.noDose, '缺不给剂量');
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

test('习题不考正文里没有的名目，也不给组数、次数与负荷', () => {
  const bad = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of bad) assert.ok(!re.test(raw), `出现脚手架字样 ${re}`);
  for (const re of [/\d+\s*组\s*\d+\s*次/, /\d+\s*RM/, /\d+\s*公斤的负荷/]) assert.ok(!re.test(raw), `出现剂量参数 ${re}`);
});

test('命令行可运行，打印章号与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成诊疗建议/);
});
