'use strict';

/**
 * 第 8 章 要证明一个干预有效，先得说清它跟什么比 —— 确定性单元测试
 * 运行: node --test chapters/08-duizhao-sheji/code/main.test.js
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
  assert.strictEqual(M.CHAPTER, '8');
  assert.strictEqual(M.TITLE, '要证明一个干预有效，先得说清它跟什么比');
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

test('正文规模：2929 汉字 · 实质段 20 段／1784 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2929);
  assert.strictEqual(r.paragraphs, 31);
  assert.strictEqual(r.segs, 20);
  assert.strictEqual(r.segHanzi, 1784);
});

test('实质段的计数规则：以换行分隔、35 汉字起算，标题与表格行不计', () => {
  const p34 = '乙'.repeat(M.MIN_SEG - 1);
  const p35 = '甲'.repeat(M.MIN_SEG);
  const text = ['# 一节', '| 表头 | 说明 |', '> 引文', '---', p34, p35].join('\n');
  assert.deepStrictEqual(M.substantive(text), [p35]);
  assert.strictEqual(M.paragraphs(text).length, 2);
});

test('占比的分子是命中段汉字，不是命中段数', () => {
  const short = '对照' + '丙'.repeat(36);
  const long = '丁'.repeat(120);
  const out = M.keywordHits(['对照'], [short, long]);
  assert.strictEqual(out[0].segs, 1);
  assert.strictEqual(out[0].segHanzi, hanzi(short));
  assert.ok(Math.abs(out[0].share - (hanzi(short) / (hanzi(short) + 120)) * 100) < 1e-9);
});

test('关键词命中：段数与占比全部现算', () => {
  const got = M.keywordHits(M.KEYWORDS).map((k) => ({ word: k.word, segs: k.segs, share: Number(k.share.toFixed(1)) }));
  assert.deepStrictEqual(got, [
    { word: '对照', segs: 9, share: 53.3 },
    { word: '偏倚', segs: 1, share: 4.6 },
    { word: '设盲', segs: 1, share: 9.8 },
  ]);
});

test('表格：3 张，行数 [跟谁比,对照组接受的是什么：什么都不做、常规照护、安慰操作，还是另一种有效疗法,不知道「好」是相对于什么好，等于没说,比什么,结局指标是什么：症状分数、睡眠时长、功能恢复、再入院、患者自评,指标选错，结论会指向一个没人关心的地方,怎么分,谁被分到哪一组，分配是否随机、是否隐藏、是否分层,分组不随机，组间差异可能与干预无关,谁来评,评价者知不知道分组；指标是自评还是他评、主观还是客观,知道分组的评价者会不自觉地往期望方向打分,单组前后对照,同一组人，干预前后各测一次,这段时间里变了吗,变化是不是干预造成的,非随机同期对照,干预组与常规照护组同时存在，但不随机,排除了时间趋势与季节影响,组间原本的差异（选择偏倚）,随机对照,随机分配，两组除干预外条件尽量相同,因果关系,真实世界的效果（人群被严格筛选）,交叉设计,每人先后接受两种干预，自己做自己的对照,个体层面的差异被消除,前一阶段的后效（携带效应）与顺序效应,质性或混合方法,访谈、观察、过程记录与量化结合,为什么有效、为什么没做下去,效果的大小,可采信,有同期对照、分配随机且隐藏、评价者设盲、结局预先设定、失访有交代,「在该人群与该条件下，此干预优于对照」,需谨慎,有对照但未随机；或随机但未设盲；或结局指标事后更换；或失访较多未说明,「有提示性证据，但不足以排除其他解释」,不足以支持结论,单组前后对照；或只报告完成者；或只报告阳性结局；或无对照的病例系列,「观察到改善，原因待查」]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [4,5,3]
  );
});

test('四个问题按正文顺序读出：跟谁比 → 比什么 → 怎么分 → 谁来评', () => {
  assert.deepStrictEqual(M.fourQuestions(), ["跟谁比","比什么","怎么分","谁来评"]);
});

test('五种设计按正文顺序读出', () => {
  assert.deepStrictEqual(M.designs(), ["单组前后对照","非随机同期对照","随机对照","交叉设计","质性或混合方法"]);
});

test('三档可信度按正文顺序读出', () => {
  assert.deepStrictEqual(M.grades(), ["可采信","需谨慎","不足以支持结论"]);
});

test('失效模式清单按正文顺序读出：4 条', () => {
  assert.deepStrictEqual(M.failures(), ["把前后对照当因果","把统计学显著当临床上重要","只报阳性结局","把别人的结论直接搬到自己科室"]);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ["「有效」永远是一个比较级","对照的作用，就是让「无」也能被看见","按最初分到的组分析"]) assert.ok(DOC.includes(s), `缺：${s}`);
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
  assert.ok(out.includes('第 8 章'), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes('实质段 20 段'), '输出未含实质段数');
});
