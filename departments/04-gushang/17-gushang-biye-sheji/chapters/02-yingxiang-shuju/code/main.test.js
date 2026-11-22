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
  tableBlocks,
  grams,
  dataClasses,
  protocol,
  agreementTiers,
  agreementActions,
  dataCard,
  failures,
  sourceScale,
  accuracyVsAgreement,
  CHAPTER,
  SLUG,
  TITLE,
  DOC,
  QUIZ,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，目录名与章号一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, SLUG);
  assert.match(dir, new RegExp(`^0${CHAPTER}-`));
  assert.strictEqual(fs.existsSync(DOC), true);
});

test('小节结构：五个编号节加代价与边界，末节固定', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  assert.ok(titles.slice(0, 5).every((t) => /^[一二三四五]、/.test(t)), '前五节未按一至五编号');
  assert.match(titles[1], /测量协议/);
  assert.match(titles[3], /数据卡/);
});

test('五张表：三类数据、协议、一致性、数据卡、失败模式，行数一致', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 5, `表格数 ${blocks.length}`);
  assert.deepStrictEqual(
    blocks.map((b) => b.rows.length),
    [3, 5, 4, 8, 6]
  );
  assert.deepStrictEqual(blocks[1].head, ['件', '要定什么', '缺了会怎样']);
  assert.deepStrictEqual(blocks[3].head, ['字段', '写什么', '不合格的写法']);
});

test('三类数据的失效方式各不相同，靠的兜底手段也不同', () => {
  assert.deepStrictEqual(dataClasses(), ['影像', '力学', '量表']);
  const blocks = tableBlocks(readDoc());
  const backstops = blocks[0].rows.map((r) => r[3]);
  assert.strictEqual(new Set(backstops).size, 3, `三类数据的兜底手段重复：${backstops.join(' / ')}`);
});

test('测量协议五件齐全，体位与摆位排在第一位', () => {
  assert.deepStrictEqual(protocol(), ['体位与摆位', '标定与尺度', '测量人与资质', '重复与取值', '分歧裁决']);
});

test('一致性四档由低到高，且每档都配了动作', () => {
  assert.deepStrictEqual(agreementTiers(), ['很低', '偏低', '中等偏上', '高']);
  const pairs = agreementActions();
  assert.strictEqual(pairs.length, 4);
  for (const p of pairs) assert.ok(p.action.length > 0, `档位 ${p.tier} 没有动作`);
  assert.match(pairs[0].action, /停采/, '「很低」应指向停采');
  assert.match(pairs[3].action, /扩大样本/, '「高」应指向扩大样本');
});

test('数据卡八字段齐全，已知缺陷与版本都在其中', () => {
  assert.deepStrictEqual(dataCard(), ['来源', '规模', '纳排', '授权', '测量', '切分', '已知缺陷', '版本']);
});

test('六种失败模式按正文顺序列出，手工中间件收尾', () => {
  assert.deepStrictEqual(failures(), ['体位不一致', '端点自选', '设备混用', '标签漂移', '数据卡空转', '手工中间件']);
});

test('取材规模取自正文：5 个影像单元、不到 1.2 万字', () => {
  const s = sourceScale();
  assert.strictEqual(s.units, 5);
  assert.strictEqual(s.wanzi, 1.2);
});

test('核心区分句在正文：准确对真值，一致对彼此', () => {
  const s = accuracyVsAgreement();
  assert.ok(s, '未找到一致与准确的区分句');
  assert.match(s, /准确指接近真值/);
  assert.match(s, /一致指不同人/);
});

test('quiz 结构：≥5 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = q.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, `选项数不对：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.question}`);
    assert.strictEqual(new Set(item.options).size, 4, `选项重复：${item.question}`);
  }
  assert.strictEqual(q.slug, SLUG);
  assert.strictEqual(q.chapter, Number(CHAPTER));
  assert.strictEqual(q.title, TITLE);
});

test('quiz 的 check 题全部能在正文找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) assert.ok(h.grams.length > 0, `未接地：${h.question}`);
});

test('正确选项打散：四个位置都用到，且没有一边倒', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.strictEqual(new Set(idx).size, 4, `未用满四个位置：${idx.join(',')}`);
  const top = Math.max(...[0, 1, 2, 3].map((i) => idx.filter((x) => x === i).length));
  assert.ok(top <= Math.ceil(idx.length / 2), `某一位置占比过高：${idx.join(',')}`);
});

test('check 题考的是正文里的判断，不是名目', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const check = q.questions.filter((x) => x.stage === 'check');
  assert.ok(check.length >= 2, `check 题只有 ${check.length} 道`);
  const rich = check.filter((x) => {
    const hit = new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g)));
    return hit.size >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.ok(out.includes(TITLE), '输出未含章题');
  assert.match(out, /不构成医学意见/);
  assert.match(out, /由本章正文现算/);
});

test('代价与边界四件事都在：双人测量要打折、一致性不等于正确、不给阈值、例数是设定', () => {
  const text = readDoc();
  for (const k of [
    '双人重复测量很贵，通常要打折',
    '一致性高不等于测量对',
    '本章不给任何诊断阈值',
    '文中的例数、比例与设备描述都是便于说明的设定',
  ]) {
    assert.ok(text.includes(k), `缺：${k}`);
  }
});
