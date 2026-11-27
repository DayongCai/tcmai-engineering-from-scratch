'use strict';

/**
 * 第 3 章 同一种情绪落在不同脏腑，观察项与第一动作都不该一样 —— 确定性单元测试
 * 运行: node --test chapters/03-wuzhi-zangfu/code/main.test.js
 *
 * 有两类断言：一类钉住正文实测算出来的值（规模、命中、表格行数、清单），
 * 正文或解析口径一变就会红；另一类是结构断言（章节骨架、quiz 形态），
 * 防止有人把题目退回成「看代码输出」那类空话。
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const M = require('./main.js');
const MAIN = path.join(__dirname, 'main.js');
const DOC = fs.readFileSync(path.join(__dirname, '..', 'docs', 'zh.md'), 'utf8');
const QUIZ = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在，目录名与章号一致', () => {
  assert.ok(hanzi(DOC) > 2500, `正文过短：${hanzi(DOC)}`);
  assert.strictEqual(path.basename(path.dirname(__dirname)), M.SLUG);
  assert.strictEqual(M.CHAPTER, '3');
  assert.strictEqual(M.TITLE, '同一种情绪落在不同脏腑，观察项与第一动作都不该一样');
});

test('小节结构：五个编号节加代价与边界', () => {
  const titles = [...DOC.replace(/\r\n/g, '\n').matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  assert.deepStrictEqual(
    titles.slice(0, 5).map((t) => t.slice(0, 2)),
    ['一、', '二、', '三、', '四、', '五、']
  );
});

test('正文规模：2927 汉字 · 实质段 21 段／2103 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2927);
  assert.strictEqual(r.paragraphs, 22);
  assert.strictEqual(r.segs, 21);
  assert.strictEqual(r.segHanzi, 2103);
});

test('实质段的计数规则：以换行分隔、35 汉字起算，标题与表格行不计', () => {
  const p34 = '乙'.repeat(M.MIN_SEG - 1);
  const p35 = '甲'.repeat(M.MIN_SEG);
  const text = ['# 一节', '| 表头 | 说明 |', '> 引文', '---', p34, p35].join('\n');
  assert.deepStrictEqual(M.substantive(text), [p35]);
  assert.strictEqual(M.paragraphs(text).length, 2);
});

test('占比的分子是命中段汉字，不是命中段数', () => {
  const short = '落点' + '丙'.repeat(36);
  const long = '丁'.repeat(120);
  const out = M.keywordHits(['落点'], [short, long]);
  assert.strictEqual(out[0].segs, 1);
  assert.strictEqual(out[0].segHanzi, hanzi(short));
  assert.ok(Math.abs(out[0].share - (hanzi(short) / (hanzi(short) + 120)) * 100) < 1e-9);
});

test('关键词命中：段数与占比全部现算', () => {
  const got = M.keywordHits(M.KEYWORDS).map((k) => ({ word: k.word, segs: k.segs, share: Number(k.share.toFixed(1)) }));
  assert.deepStrictEqual(got, [
    { word: '落点', segs: 11, share: 58.6 },
    { word: '形征', segs: 4, share: 22.3 },
    { word: '排除', segs: 2, share: 14.8 },
  ]);
});

test('表格：2 张，行数 [肝,怒,胁胀、太息、目干、筋惕、月经前后不定,易怒、决断困难、事后退缩,脾虚之腹胀（位在腹不在胁）,心,喜（含过喜与悲不自胜）,心悸、失眠多梦、舌尖偏红、动辄汗出,心神散、话多而接不上、惊惕易醒,甲亢类代谢亢进（须先排查）,脾,思,纳差、腹胀、便溏、肌肉消瘦、倦怠,思虑黏着、反复询问同一事、犹豫,药源性食欲下降,肺,忧、悲,气短、易感、鼻塞、皮肤干、声低,悲不自胜、兴趣减退、叹息频作,贫血之乏力（须先查血）,肾,恐,腰酸、耳鸣、二便失禁或频数、下肢凉,恐惧、退缩、健忘、遇事无主,老年正常衰退（看变化速度）,单脏,一组形征 + 一组神征，集中在一脏，其余四脏无明显异常,按该脏的落点做照护动作（见下表右列）,两周无移动,相传,原发脏的征象在前，继发脏的征象在后，且有明确时间顺序,先处理原发，继发随原发缓解即不必单独处置,继发反重于原发,并病,两脏以上同时起病，无先后，或旧病与新伤叠加,选对当下功能影响最大的一脏先动，其余记录观察,出现拒食、拒水、意识改变,转介,征象无法用情志解释，或出现幻觉、妄想、木僵,不按本表处理,立即按制度转介]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [5,4]
  );
});

test('五脏落点按正文顺序读出：肝 → 心 → 脾 → 肺 → 肾', () => {
  assert.deepStrictEqual(M.organs(), ["肝","心","脾","肺","肾"]);
});

test('三组判据与越界行按正文顺序读出', () => {
  assert.deepStrictEqual(M.groups(), ["单脏","相传","并病","转介"]);
});

test('失效模式清单按正文顺序读出：4 条', () => {
  assert.deepStrictEqual(M.failures(), ["把标签当判断","把器质性问题当情志落点","把五行当成推理链","以共情代诊疗"]);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ["辨落点要两条腿","先排除，再归因","相胜关系是地图，不是处方"]) assert.ok(DOC.includes(s), `缺：${s}`);
});

test('quiz 结构：≥5 题、pre/check/post 齐、4 选项不重复、correct 合法、explain ≥30 汉字', () => {
  const qs = QUIZ.questions;
  assert.ok(Array.isArray(qs) && qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  assert.ok(qs.filter((x) => x.stage === 'check').length >= 2, 'check 题不足 2 道');
  for (const item of qs) {
    assert.ok(Array.isArray(item.options) && item.options.length === 4, `选项数不对：${item.question}`);
    assert.strictEqual(new Set(item.options).size, 4, `选项重复：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, `correct 下标非法：${item.question}`);
    assert.ok(hanzi(item.explain) >= 30, `explain 过短（${hanzi(item.explain)} 字）：${item.question}`);
    assert.ok(hanzi(item.question) >= 8, `题干过短：${item.question}`);
  }
  assert.strictEqual(QUIZ.lesson, M.SLUG);
  assert.strictEqual(QUIZ.subject, '06-zhongyi-xinli-xue');
});

test('quiz 的 check 题在正文落地：至少两道带两个以上原文词组', () => {
  const r = M.quizSummary(QUIZ, DOC);
  assert.ok(r.check >= 2, `check 题只有 ${r.check} 道`);
  assert.ok(r.grounded >= 2, `接地 ${r.grounded} 道`);
  assert.ok(r.rich >= 2, `带两个以上原文词组的只有 ${r.rich} 道`);
});

test('正确答案打散：四个位置都用到，单一位置不超过一半', () => {
  const idx = QUIZ.questions.map((x) => x.correct);
  assert.strictEqual(new Set(idx).size, 4, `未用满四个位置：${idx.join(',')}`);
  const top = Math.max(...[0, 1, 2, 3].map((i) => idx.filter((x) => x === i).length));
  assert.ok(top <= Math.ceil(idx.length / 2), `某一位置占比过高：${idx.join(',')}`);
});

test('quiz 不写剂量、疗程、发生率、页码与脚手架字样', () => {
  const raw = JSON.stringify(QUIZ);
  const BANNED = ['剂' + '量', '疗' + '程', '发生' + '率', '页' + '码',
    '三' + '辨', '四位' + '面', '逐单元' + '读', '本章' + '实' + '测'];
  for (const w of BANNED) {
    assert.strictEqual(raw.includes(w), false, `quiz 出现不该写的词：${w}`);
  }
});

test('命令行可运行：打印章题、规模与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('第 3 章'), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes('实质段 21 段'), '输出未含实质段数');
});
