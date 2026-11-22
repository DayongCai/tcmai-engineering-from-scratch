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
  modalities,
  traps,
  readOrder,
  evidenceSteps,
  redFlags,
  boundaries,
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

test('四种检查各答一个问题，顺序为 X 线／CT／磁共振／核素与骨密度', () => {
  const names = modalities(readDoc());
  assert.deepStrictEqual(names, ['X 线', 'CT', '磁共振', '核素显像与骨密度']);
});

test('第一节收束到一句：没有一项检查能单独回答痛是不是这个结构引起的', () => {
  assert.ok(
    readDoc().includes('没有一项检查能单独回答「这个人的痛是不是这个结构引起的」'),
    '缺少检查与症状的分离句'
  );
});

test('读片四步按「先整体，后局部」排列，第 1 步是序列与力线', () => {
  const steps = readOrder(readDoc());
  assert.strictEqual(steps.length, 4, steps.join('/'));
  assert.ok(steps[0].includes('序列与力线'), steps[0]);
  assert.ok(steps[3].includes('软组织与附件'), steps[3]);
  assert.ok(readDoc().includes('先整体，后局部'));
});

test('三个陷阱按一二三编号，第一个就是形态学词汇当诊断', () => {
  const t = traps(readDoc());
  assert.strictEqual(t.length, 3, t.map((x) => x.name).join('/'));
  assert.deepStrictEqual(t.map((x) => x.n), ['一', '二', '三']);
  assert.ok(t[0].name.includes('形态学词汇当诊断'), t[0].name);
  assert.ok(t[2].name.includes('退变'), t[2].name);
});

test('影像与症状对不上时有四步，最后一步允许「暂时没有答案」', () => {
  const steps = evidenceSteps(readDoc());
  assert.strictEqual(steps.length, 4, steps.join('/'));
  assert.ok(steps[3].includes('暂时没有答案'), steps[3]);
  assert.ok(readDoc().includes('非特异性脊柱痛'), '未落下这个诊断名');
});

test('红旗征清单条数：11 条，外伤与肿瘤史都在其中', () => {
  const flags = redFlags(readDoc());
  assert.strictEqual(flags.length, 11, `条数 ${flags.length}：${flags.join('/')}`);
  const joined = flags.join('');
  for (const k of ['高能量外伤', '发热', '夜间痛', '体重下降', '既往肿瘤史', '大小便功能障碍']) {
    assert.ok(joined.includes(k), '红旗征缺 ' + k);
  }
});

test('边界三句都在：阴性不能排除、阳性不能证明、无旧片要写明', () => {
  const b = boundaries(readDoc());
  for (const x of b) assert.ok(x.ok, `缺边界句 ${x.key}`);
  assert.ok(readDoc().includes('概率的上调'), '未写阳性的概率意义');
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

test('答案打散：正确项不总在同一位置，相邻同答案不超过两处', () => {
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

test('习题不考正文里没有的名目（无脚手架指纹），也不写扫描参数', () => {
  const bad = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of bad) assert.ok(!re.test(raw), `出现脚手架字样 ${re}`);
  for (const re of [/层厚\s*\d/, /kV/i, /mSv/]) assert.ok(!re.test(raw), `出现扫描参数 ${re}`);
});

test('命令行可运行，打印章号与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成诊疗建议/);
});
