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
  sectionAt,
  tableBlocks,
  occurrences,
  grams,
  boldItems,
  fourLayers,
  layerLanguages,
  conflictRules,
  threeQuestions,
  policyVerbCounts,
  CHAPTER,
  SLUG,
  DOC,
  QUIZ,
  EXPECTED_LAYERS,
  EXPECTED_QUESTIONS,
  POLICY_VERBS,
  SECTION_PROBES,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且目录名与常量一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2000, `正文过短：${hanzi(text)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), SLUG);
  assert.ok(SLUG.startsWith(String(CHAPTER).padStart(2, '0')), SLUG);
});

test('小节结构：六个二级标题，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.ok(titles[5].includes('代价与边界'), titles[5]);
  assert.ok(titles.slice(0, 5).every((t) => /^[一二三四五]、/.test(t)), '前五节未按一至五编号');
});

test('每节的探针词都落在本节，顺序未被改动', () => {
  for (const p of analyze().probes) assert.ok(p.ok, `探针「${p.probe}」不在对应小节`);
});

test('四层规范按正文表序读出，四层四种语言', () => {
  assert.deepStrictEqual(fourLayers(), EXPECTED_LAYERS);
  const langs = layerLanguages();
  assert.strictEqual(langs.length, 4, langs.join('/'));
  assert.ok(langs[0].includes('应当'), langs[0]);
  assert.ok(langs[3].includes('为准'), langs[3]);
});

test('效力与具体度成反比：正文用同一段把两侧都说到了', () => {
  const text = readDoc();
  assert.ok(text.includes('效力与具体度成反比'), '缺「成反比」一句');
  assert.ok(text.includes('层级越高'), '缺高层的抽象说明');
  assert.ok(text.includes('语言必然越密'), '缺下位的细密说明');
});

test('冲突规则四条，末条不靠口诀而回到授权与立法目的', () => {
  const rules = conflictRules();
  assert.strictEqual(rules.length, 4, rules.join(' / '));
  assert.ok(rules[0].includes('上位法优先'), rules[0]);
  assert.ok(rules[1].includes('特别规定优先'), rules[1]);
  assert.ok(rules[2].includes('新规定优先'), rules[2]);
  assert.ok(rules[3].includes('裁决'), rules[3]);
});

test('依据链的后果：下位不得增设义务、文件不得作处罚依据、标准分强制与推荐', () => {
  const body = sectionAt(readDoc(), 1).body;
  assert.ok(body.includes('下位规范不能给公民增设'), '缺增设义务一条');
  assert.ok(body.includes('规范性文件不能作为处罚依据'), '缺处罚依据一条');
  assert.ok(body.includes('把推荐性标准当强制标准来罚'), '缺标准一条');
});

test('判据三问是三条粗体，第三问不可省', () => {
  assert.deepStrictEqual(threeQuestions(), EXPECTED_QUESTIONS);
  const body = sectionAt(readDoc(), 4).body;
  assert.ok(body.includes('缺第三问，是半规范'), '未写缺第三问的后果');
  assert.ok(body.includes('宣示'), '未写宣示一类');
});

test('政策动词都在正文出现过，且被归到宣示而非义务', () => {
  const counts = policyVerbCounts();
  assert.deepStrictEqual(counts.map((x) => x.t), POLICY_VERBS);
  for (const x of counts) assert.ok(x.n > 0, `正文没有「${x.t}」`);
  assert.ok(sectionAt(readDoc(), 4).body.includes('不能被当成公民义务'), '未写宣示不能当义务');
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
  assert.ok(r.quiz.check >= 3, `check 题只有 ${r.quiz.check} 道`);
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
});

test('正确答案不集中在同一个下标（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  assert.ok(new Set(q.questions.map((x) => x.correct)).size >= 3, '答案只落在少数位置');
});

test('quiz 不含脚手架概念：不写三辨、四位面、单元规模与脚本输出指路', () => {
  const raw = fs.readFileSync(QUIZ, 'utf8');
  for (const re of [/三辨/, /四位面/, /单元规模/, /本章实测/, /本课第\s*\d+\s*章/, /见\s*code\/main\.js\s*输出/]) {
    assert.ok(!re.test(raw), `残留：${re}`);
  }
});

test('quiz 与正文同源：check 题正确选项至少两道带两个以上原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions.filter((x) => {
    if (x.stage !== 'check') return false;
    return [...grams(String(x.options[x.correct]))].filter((g) => body.has(g)).length >= 2;
  });
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带有两个以上原文词组`);
});

test('命令行可运行，并打印边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成法律意见/);
});

test('本章的边界写进了正文：不引条号、量化只到结构、不构法律意见', () => {
  const text = readDoc();
  for (const k of ['本章不引具体条文序号与法规全称', '结构性数字', '不构成法律意见']) {
    assert.ok(text.includes(k), k);
  }
  assert.strictEqual(tableBlocks(text).length, 2, '表格数变了');
  assert.ok(occurrences(text, '四级') + occurrences(text, '四层') > 0, '正文未写层级数');
  assert.ok(boldItems(sectionAt(text, 4).body).length >= 3, '三问粗体不足');
});
