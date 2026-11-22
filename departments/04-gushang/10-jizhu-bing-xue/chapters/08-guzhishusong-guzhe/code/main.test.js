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
  fractureSites,
  acuteThree,
  preventionFour,
  tcmEnds,
  hardRules,
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

test('脆性骨折的定义落在机制上：低能量外力，骨强不够承受日常载荷', () => {
  const t = readDoc();
  assert.ok(t.includes('脆性骨折指在没有明显外力或仅有低能量外力'), '缺定义');
  assert.ok(t.includes('与创伤性骨折的区别不在形态，在机制'), '未写与创伤性骨折的差别');
  for (const k of ['站立高度跌倒', '弯腰提物', '咳嗽']) assert.ok(t.includes(k), '缺外力举例 ' + k);
});

test('常见部位四处：椎体、髋部、桡骨远端、肱骨近端', () => {
  const s = fractureSites(readDoc());
  assert.strictEqual(s.length, 4, s.join('/'));
  for (const k of ['椎体', '髋部', '桡骨远端', '肱骨近端']) assert.ok(s.includes(k), '缺 ' + k);
});

test('新旧之分靠磁共振：水肿在，属急性；陈旧无水肿、可见脂肪化或真空裂隙', () => {
  const t = readDoc();
  assert.ok(t.includes('骨髓水肿'), '未写水肿');
  assert.ok(t.includes('陈旧骨折无水肿'), '未写陈旧无水肿');
  assert.ok(t.includes('核素显像可以作为替代'), '未写替代手段');
});

test('脆性骨折即骨质疏松：不必等骨密度，一次低能量骨折即可启动评估', () => {
  const r = hardRules(readDoc());
  assert.ok(r.fragilityIsDx, '缺「脆性骨折即骨质疏松」');
  assert.ok(readDoc().includes('不必等骨密度报告'), '未写不必等待');
});

test('急性期三件事：止痛、支具、早期活动，且顺序不可颠倒', () => {
  const a = acuteThree(readDoc());
  assert.deepStrictEqual(a, ['止痛', '支具', '早期活动']);
  assert.ok(hardRules(readDoc()).orderNotReversible, '未写顺序不可颠倒');
});

test('卧床被写成并发症的温床，三件事的链条是「先止痛，才能动」', () => {
  const t = readDoc();
  assert.ok(t.includes('先止痛，才能动'), '缺链条起点');
  assert.ok(t.includes('肺部感染、血栓、压疮'), '未列卧床并发症');
});

test('强化治疗是止痛手段不是治骨手段：三条争议都写到', () => {
  const t = readDoc();
  assert.ok(t.includes('它是「止痛手段」，不是「治骨手段」'), '缺定性');
  assert.ok(t.includes('骨水泥渗漏'), '未写渗漏');
  assert.ok(t.includes('不降低再骨折风险'), '未写不降低再骨折风险');
});

test('二级预防四块，且点名「依从性最容易被忽视」', () => {
  assert.strictEqual(preventionFour(readDoc()), 4);
  const t = readDoc();
  assert.ok(t.includes('这一条最容易被忽视'), '未点出依从性');
  assert.ok(t.includes('跌倒预防'), '缺跌倒预防');
});

test('一次骨折是下一次的预告：最强预测因子，风险集中在头一两年', () => {
  const r = hardRules(readDoc());
  assert.ok(r.strongestPredictor, '缺最强预测因子');
  assert.ok(r.window, '缺风险窗口');
});

test('中医辨证三端齐：肾虚、脾虚、血瘀，并落到低冲击训练', () => {
  const e = tcmEnds(readDoc());
  assert.deepStrictEqual(e, ['肾虚', '脾虚', '血瘀']);
  const t = readDoc();
  assert.ok(t.includes('补肾壮骨'), '缺补肾');
  assert.ok(t.includes('八段锦、太极拳'), '缺训练举例');
  assert.ok(t.includes('不给剂量'), '未写不给剂量');
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

test('习题不考正文里没有的名目，也不给药物剂量与骨水泥参数', () => {
  const bad = [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/];
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of bad) assert.ok(!re.test(raw), `出现脚手架字样 ${re}`);
  for (const re of [/\d+\s*(mg|毫升|ml)/i]) assert.ok(!re.test(raw), `出现剂量或参数 ${re}`);
});

test('命令行可运行，打印章号与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成诊疗建议/);
});
