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
  techClasses,
  devices,
  coverage,
  forms,
  gates,
  protections,
  optoReasons,
  trainActions,
  CHAPTER,
  SLUG,
  QUIZ,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且章节号与目录一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, SLUG);
  assert.match(dir, new RegExp(`^${String(CHAPTER).padStart(2, '0')}`));
});

test('小节结构：七节，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.match(titles[6], /^七、代价与边界$/);
});

test('五类技术由正文现读，顺序不混层', () => {
  assert.deepStrictEqual(techClasses(readDoc()), [
    '智能装备',
    '扩展现实',
    '生成式人工智能',
    '机器人',
    '光遗传学',
  ]);
});

test('实训设备七件，四元全覆盖，另有一件补化学', () => {
  const d = devices(readDoc());
  assert.strictEqual(d.length, 7, d.map((x) => x.device).join('/'));
  const c = coverage(readDoc());
  assert.deepStrictEqual(c.elements, ['P', 'E', 'M', 'K']);
  assert.strictEqual(c.total, 4);
  assert.strictEqual(c.chem, 1);
});

test('表格三列七行：设备、覆盖、能演示什么', () => {
  const b = tableBlocks(readDoc());
  assert.strictEqual(b.length, 1);
  assert.strictEqual(b[0].head.length, 3);
  assert.strictEqual(b[0].rows.length, 7);
  assert.strictEqual(b[0].head[1], '覆盖');
});

test('三种集成形态：单机、工作站、院内系统集成', () => {
  const f = forms(readDoc());
  assert.deepStrictEqual(f, ['单机', '工作站', '院内系统集成']);
});

test('四道门的名称与顺序由正文现读', () => {
  const g = gates(readDoc());
  assert.strictEqual(g.length, 4, g.map((x) => x.name).join('/'));
  assert.ok(g[0].name.includes('属性与分类'), g[0].name);
  assert.ok(g[1].name.includes('技术要求'), g[1].name);
  assert.ok(g[2].name.includes('临床评价'), g[2].name);
  assert.ok(g[3].name.includes('质量体系'), g[3].name);
  assert.deepStrictEqual(g.map((x) => x.n), ['第一道', '第二道', '第三道', '第四道']);
});

test('治疗类设备三层保护缺一不可', () => {
  const p = protections(readDoc());
  assert.deepStrictEqual(p, ['硬件限位', '软件互锁', '人工急停']);
  assert.ok(readDoc().includes('只有软件保护不算保护'), '未写软件保护不算保护');
});

test('光遗传学不进临床的三条理由齐备', () => {
  const r = optoReasons(readDoc());
  assert.strictEqual(r.length, 3, r.join('/'));
  assert.ok(r[0].includes('基因导入'), r[0]);
  assert.ok(r[1].includes('层级'), r[1]);
  assert.ok(r[2].includes('推理捷径'), r[2]);
});

test('实训的三个动作可定位：采一次、破坏条件再采、比较差异', () => {
  const a = trainActions(readDoc());
  assert.strictEqual(a.length, 3, a.join(';'));
  assert.ok(a[0].includes('采一次'), a[0]);
  assert.ok(a[1].includes('破坏'), a[1]);
  assert.ok(a[2].includes('差异'), a[2]);
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
  }
});

test('quiz 的 check 题至少两道能在正文中找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) assert.ok(h.grams.length > 0, `未接地：${h.question}`);
});

test('正确选项不集中在同一个下标（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `正确答案只落在 ${new Set(idx).size} 个位置`);
});

test('quiz 与正文同源：check 题正确选项带两个以上原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions
    .filter((x) => x.stage === 'check')
    .filter((x) => new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g))).size >= 2);
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带两个以上原文词组`);
});

test('命令行可运行，并打印覆盖与分层', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成医学意见/);
  assert.match(out, /四元覆盖 4\/4/);
  assert.match(out, /由本章正文现算/);
});

test('本章的边界：设备清单是教学配置，四道门不替代法规培训', () => {
  const text = readDoc();
  assert.ok(text.includes('不是采购标准'), '未声明不是采购标准');
  assert.ok(text.includes('不替代法规培训'), '未声明不替代法规培训');
  assert.ok(text.includes('按最高的那一层要求做验证'), '未写跨层时按高层验证');
});
