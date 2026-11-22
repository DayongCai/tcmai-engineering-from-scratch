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
  claudicationTypes,
  slipTypes,
  conservativeSplit,
  referralCount,
  measurementFocus,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
  TERMS,
  SECTION_PROBES,
  MEASUREMENTS,
  ZONES,
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

test('两类跛行并列给出特征句，且点明「骑车」是分水岭', () => {
  const c = claudicationTypes(readDoc());
  assert.deepStrictEqual(c, ['神经源性跛行', '血管性跛行']);
  const t = readDoc();
  assert.ok(t.includes('骑车时同样会诱发'), '未写血管性的骑车诱发');
  assert.ok(t.includes('推着购物车走很远'), '未写神经源性的前倾缓解');
});

test('狭窄三区齐，且写明三区之分决定减压范围', () => {
  const z = measurementFocus(readDoc()).zones;
  assert.deepStrictEqual(z, ZONES);
  assert.ok(readDoc().includes('三区的区分，决定了减压的范围'), '未写三区与减压的关系');
});

test('影像四项测量齐：椎管前后径、硬膜囊横截面积、侧隐窝宽度、椎间孔高度', () => {
  const m = measurementFocus(readDoc()).measurements;
  assert.deepStrictEqual(m, MEASUREMENTS);
  assert.ok(readDoc().includes('同一患者的前后对比更有价值'), '未写前后对比优先');
});

test('两类滑脱按人群分开：退变性在五十岁以上女性，峡部裂性在青少年', () => {
  const s = slipTypes(readDoc());
  assert.deepStrictEqual(s, ['退变性滑脱', '峡部裂性滑脱']);
  const t = readDoc();
  assert.ok(t.includes('五十岁以上的女性'), '缺退变性人群');
  assert.ok(t.includes('青少年与年轻成人'), '缺峡部裂性人群');
  assert.ok(t.includes('疲劳性骨折'), '缺峡部裂机制');
});

test('随访重点分开：退变性看功能，峡部裂性看生长', () => {
  const f = measurementFocus(readDoc());
  assert.ok(f.functionalFollowUp, '缺功能随访句');
  assert.ok(f.growthFollowUp, '缺生长随访句');
});

test('保守分两栏：能做 5 条，不能做 3 条，卧床与后伸手法都在「不能做」里', () => {
  const c = conservativeSplit(readDoc());
  assert.strictEqual(c.can, 5, `能做 ${c.can} 条`);
  assert.strictEqual(c.cannot, 3, `不能做 ${c.cannot} 条`);
  const t = readDoc();
  assert.ok(t.includes('一是长期卧床'), '卧床未列在不能做');
  assert.ok(t.includes('反复的后伸类手法与牵引'), '后伸手法未列在不能做');
});

test('转介四类：保守失败、进行性缺失、马尾、滑脱进展或不稳', () => {
  assert.strictEqual(referralCount(readDoc()), 4);
  const t = readDoc();
  assert.ok(t.includes('走不了两百米'), '未给「严重」的具体标准');
  assert.ok(t.includes('合并不稳'), '未写不稳这一条');
});

test('跌倒风险被单列，且落到臀中肌与臀大肌', () => {
  const t = readDoc();
  assert.ok(t.includes('跌倒风险'), '缺跌倒风险');
  assert.ok(t.includes('臀中肌与臀大肌'), '未落到具体肌群');
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

test('习题不考正文里没有的名目，也不写支具型号、训练组数与减压范围', () => {
  const bad = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of bad) assert.ok(!re.test(raw), `出现脚手架字样 ${re}`);
  for (const re of [/\d+\s*组\s*\d+\s*次/, /减压范围\s*\d/]) assert.ok(!re.test(raw), `出现专科参数 ${re}`);
});

test('命令行可运行，打印章号与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成诊疗建议/);
});
