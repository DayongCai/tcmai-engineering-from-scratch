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
  h3Titles,
  tableBlocks,
  grams,
  skeleton,
  skeletonChecks,
  figureRules,
  numberRules,
  selfChecks,
  defenseClasses,
  failures,
  statementRule,
  figureOrderRule,
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
  assert.match(titles[0], /六段骨架/);
  assert.match(titles[2], /自评/);
});

test('六张表：骨架、四律、数字一致、自评、答辩、失败模式，行数一致', () => {
  const blocks = tableBlocks(readDoc());
  assert.strictEqual(blocks.length, 6, `表格数 ${blocks.length}`);
  assert.deepStrictEqual(
    blocks.map((b) => b.rows.length),
    [6, 4, 5, 7, 3, 6]
  );
  assert.deepStrictEqual(blocks[0].head, ['段', '要回答什么', '一句话检验', '常见的空转写法']);
  assert.deepStrictEqual(blocks[4].head, ['类', '问法', '答不上来说明什么']);
});

test('两个子节：图表四律与数字一致性', () => {
  const subs = h3Titles(readDoc());
  assert.strictEqual(subs.length, 2, `子节数 ${subs.length}`);
  assert.match(subs[0], /图表四律/);
  assert.match(subs[1], /数字一致性/);
});

test('六段骨架定序为问题、数据、方法、结果、边界、入口', () => {
  assert.deepStrictEqual(skeleton(), ['问题', '数据', '方法', '结果', '边界', '入口']);
});

test('每一段都配了检验句，且检验句不重复', () => {
  const pairs = skeletonChecks();
  assert.strictEqual(pairs.length, 6);
  for (const p of pairs) assert.ok(p.check.length > 0, `${p.section} 没有检验句`);
  assert.strictEqual(new Set(pairs.map((p) => p.check)).size, 6, '检验句有重复');
  assert.match(pairs[0].check, /去掉方法名/, '第一段的检验句应是去掉方法名');
  assert.match(pairs[5].check, /命令/, '入口段应以一条命令为检验');
});

test('图表四律齐全，误差类型与轴单位都在其中', () => {
  assert.deepStrictEqual(figureRules(), ['一图一结论', '轴有单位', '误差有来源', '表图不重复']);
  assert.ok(figureOrderRule(), '正文未要求图的顺序跟论证顺序一致');
  assert.match(figureOrderRule(), /论证顺序/);
});

test('数字一致性的五个做法齐全，单一来源排第一', () => {
  assert.deepStrictEqual(numberRules(), ['单一来源', '引用而非重算', '版本标注', '生成即留痕', '终稿全量核对']);
});

test('自评七项齐全，欠账排在最后', () => {
  const keys = selfChecks();
  assert.strictEqual(keys.length, 7, `自评项数 ${keys.length}`);
  assert.strictEqual(keys[0], '产物可复算');
  assert.strictEqual(keys[6], '欠账');
});

test('答辩三类必答题：对照、泛化、代价', () => {
  assert.deepStrictEqual(defenseClasses(), ['对照', '泛化', '代价']);
});

test('六种失败模式按正文顺序列出，流水账排第一', () => {
  assert.deepStrictEqual(failures(), ['流水账', '数字漂移', '图表注水', '讨论复述结果', '边界当道歉', '入口缺失']);
});

test('陈述口径可算：五段、每段一分钟、合计五分钟', () => {
  const st = statementRule();
  assert.strictEqual(st.segments, 5);
  assert.strictEqual(st.minutesEach, 1);
  assert.strictEqual(st.total, 5);
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

test('代价与边界四件事都在：核对会拖慢、自评不等于评审标准、不给格式模板、项名来自本系口径', () => {
  const text = readDoc();
  for (const k of [
    '严格的结构与核对会拖慢写作',
    '自评七项不等于评审标准',
    '本章不给论文格式模板',
    '文中的检查表项名来自本系毕设口径',
  ]) {
    assert.ok(text.includes(k), `缺：${k}`);
  }
});
