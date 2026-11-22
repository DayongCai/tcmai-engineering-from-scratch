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
  listAfter,
  vertebrae,
  curveNames,
  threeColumns,
  stabilitySystems,
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
  assert.strictEqual(r.probes.length, SECTION_PROBES.length);
  for (const p of r.probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('节段账：颈 7 胸 12 腰 5，合计 24 节可动，汉字与数字两种写法都在正文里', () => {
  const v = vertebrae(readDoc());
  assert.deepStrictEqual(v.nums, [7, 12, 5]);
  assert.strictEqual(v.movable, 24);
  assert.strictEqual(v.spelled, 3, '七个/十二个/五个的汉字写法不全');
  assert.strictEqual(v.digits, 3, '椎七节/椎十二节/椎五节的写法不全');
});

test('四个曲度按顺序写全，且说明它们互相抵消', () => {
  const text = readDoc();
  const curves = curveNames(text);
  assert.deepStrictEqual(curves, ['颈椎前凸', '胸椎后凸', '腰椎前凸', '骶骨后凸']);
  assert.ok(text.includes('互相抵消'), '未写明曲度互相抵消');
});

test('三柱：前中后三柱都列了组成，中柱被指为稳定性判据', () => {
  const cols = threeColumns(readDoc());
  assert.strictEqual(cols.length, 3, cols.map((c) => c.name).join('/'));
  assert.deepStrictEqual(cols.map((c) => c.name), ['前柱', '中柱', '后柱']);
  for (const c of cols) assert.ok(c.text.length > 8, `${c.name} 没写组成`);
  assert.ok(readDoc().includes('中柱是否完整'), '未把中柱完整性写成判据');
  assert.ok(readDoc().includes('两柱以上损伤多属不稳定'), '未写两柱以上属不稳定');
});

test('四套稳定系统：骨性、韧带张力带、肌肉、神经，缺一不可', () => {
  const s = stabilitySystems(readDoc());
  assert.strictEqual(s.length, 4, s.join('/'));
  for (const k of ['骨性结构', '椎间盘与韧带', '椎旁肌与腹肌', '神经系统']) assert.ok(s.includes(k), '缺 ' + k);
  assert.ok(readDoc().includes('坏一套，其余三套加班'), '未写四套系统互相补位');
});

test('退变写成一个过程而非一次事件：含水率下降在前，骨赘是代偿', () => {
  const t = readDoc();
  assert.ok(t.includes('含水率下降'), '未写退变起点');
  assert.ok(t.includes('它是代偿，不是敌人'), '未把骨赘定性为代偿');
  const traits = analyze().facts.degenerationTraits;
  assert.strictEqual(traits.length, 3, '退变三特征不全：' + traits.join('/'));
});

test('疼痛被拆成三部分，且中枢那一部分被指为最易忽略', () => {
  const parts = analyze().facts.painParts;
  assert.strictEqual(parts.length, 3, parts.join('/'));
  assert.ok(readDoc().includes('第三部分最容易被忽略'), '未点出中枢处理最易被忽略');
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

test('答案打散：正确项不总在同一位置，四个位置都被用到', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const pos = new Set(q.questions.map((x) => x.correct));
  assert.ok(pos.size >= 3, `正确项只落在 ${[...pos].join(',')}`);
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

test('习题不考正文里没有的名目（无脚手架指纹）', () => {
  const bad = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
  const raw = fs.readFileSync(QUIZ, 'utf8') + fs.readFileSync(DOC, 'utf8');
  for (const re of bad) assert.ok(!re.test(raw), `出现脚手架字样 ${re}`);
});

test('命令行可运行，打印章号与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成诊疗建议/);
});
