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
  neckClasses,
  typeBlocks,
  differentials,
  referralNodes,
  cordSigns,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  MOVEMENTS,
  REFLEXES,
  TYPE_NAMES,
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

test('颈痛分三类：机械性、神经性、红旗，第三类写明「不能按颈痛处理」', () => {
  const c = neckClasses(readDoc());
  assert.strictEqual(c.length, 3, c.map((x) => x.name).join('/'));
  assert.deepStrictEqual(c.map((x) => x.name), ['机械性颈痛', '神经性', '红旗']);
  assert.ok(readDoc().includes('不能按颈痛处理'), '第三类未定性');
});

test('分型的界线靠病史与查体，不靠疼痛的强度（正文有反例句）', () => {
  const t = readDoc();
  assert.ok(t.includes('不靠疼痛的强度'), '缺界线句');
  assert.ok(t.includes('落枕'), '缺落枕反例');
});

test('六型六个名字都在正文：颈型、神经根型、脊髓型、椎动脉型、交感型、食管型', () => {
  const present = TYPE_NAMES.filter((n) => readDoc().includes(n));
  assert.strictEqual(present.length, 6, present.join('/'));
  const blocks = typeBlocks(readDoc());
  assert.strictEqual(blocks.length, 5, `加粗分型块 ${blocks.length}`);
  assert.ok(blocks.includes('椎动脉型与交感型'), blocks.join('/'));
});

test('神经根型写得最重：最常见、自然病程良好，「九成不必手术」出自此处', () => {
  const t = readDoc();
  assert.ok(t.includes('最常见的一型'), '未写最常见');
  assert.ok(t.includes('九成不必手术'), '缺那句话');
  assert.ok(t.includes('多数在数周到数月内改善'), '未写自然病程');
});

test('脊髓型：三个动作两个反射齐，且写明手法是禁忌、Hoffmann 阴性不能排除', () => {
  const c = cordSigns(readDoc());
  assert.deepStrictEqual(c.movements, MOVEMENTS);
  assert.deepStrictEqual(c.reflexes, REFLEXES);
  assert.ok(c.hoffmannCaveat, '未写阴性不能排除');
  assert.ok(readDoc().includes('手法是禁忌'), '未写手法禁忌');
});

test('鉴别清单五条：胸廓出口、腕管、肩袖、运动神经元与多发性硬化、肿瘤与感染', () => {
  const d = differentials(readDoc());
  assert.strictEqual(d.length, 5, d.join('/'));
  for (const k of ['胸廓出口综合征', '腕管综合征', '肩袖病变与冻结肩', '脊髓肿瘤与感染']) {
    assert.ok(d.includes(k), '缺 ' + k);
  }
  assert.ok(readDoc().includes('心源性牵涉痛'), '缺颈部以外的心源性一条');
});

test('转介四节点齐全，末一个节点是「任何时候」', () => {
  const n = referralNodes(readDoc());
  assert.strictEqual(n.length, 4, n.map((x) => x.n).join('/'));
  assert.deepStrictEqual(n.map((x) => x.n), ['一', '二', '三', '四']);
  assert.ok(n[3].text.includes('任何时候'), n[3].text);
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

test('习题不考正文里没有的名目，也不给药物剂量与手法/手术参数', () => {
  const bad = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of bad) assert.ok(!re.test(raw), `出现脚手架字样 ${re}`);
  for (const re of [/\d+\s*mg/, /\d+\s*公斤/, /\d+\s*kg/]) assert.ok(!re.test(raw), `出现剂量 ${re}`);
});

test('命令行可运行，打印章号与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成诊疗建议/);
});
