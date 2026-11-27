'use strict';

/**
 * 第 14 章 质量管理的证据在复核，不在报告数量 —— 确定性单元测试
 * 运行: node --test chapters/14-zhiliang-shequ/code/main.test.js
 *
 * 有两种断言：一种是正文实测算出来的值（规模、命中、表格行数），
 * 正文或解析口径一变就会红；另一种是结构断言（章节骨架、quiz 形态），
 * 防止有人把题目退回成「看 main.js 输出」那类空话。
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
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, M.SLUG);
  assert.strictEqual(M.CHAPTER, '14');
  assert.strictEqual(M.TITLE, '质量管理的证据在复核，不在报告数量');
});

test('小节结构：五个编号节加代价与边界', () => {
  const titles = [...DOC.replace(/\r\n/g, '\n').matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '六、代价与边界');
  assert.deepStrictEqual(
    titles.slice(0, 5).map((t) => t.slice(0, 2)),
    ['一、', '二、', '三、', '四、', '五、']
  );
});

test('正文规模：2951 汉字 · 实质段 24 段／1849 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2951);
  assert.strictEqual(r.segs, 24);
  assert.strictEqual(r.segHanzi, 1849);
});

test('实质段的计数规则：以换行分隔、35 汉字起算，标题与表格行不计', () => {
  const p34 = '乙'.repeat(M.MIN_SEG - 1);
  const p35 = '甲'.repeat(M.MIN_SEG);
  const text = ['# 一节', '| 表头 | 说明 |', '> 引文', p34, p35].join('\n');
  assert.deepStrictEqual(M.substantive(text), [p35]);
  assert.strictEqual(M.paragraphs(text).length, 2);
});

test('占比的分子是命中段汉字，不是命中段数', () => {
  const short = '核对' + '丙'.repeat(36);
  const long = '丁'.repeat(120);
  const out = M.keywordHits(['核对'], [short, long]);
  assert.strictEqual(out[0].segs, 1);
  assert.strictEqual(out[0].segHanzi, hanzi(short));
  assert.ok(Math.abs(out[0].share - (hanzi(short) / (hanzi(short) + 120)) * 100) < 1e-9);
});

test('关键词命中：段数与占比全部现算', () => {
  const got = M.keywordHits(M.KEYWORDS).map((k) => ({
    word: k.word,
    segs: k.segs,
    share: Number(k.share.toFixed(1)),
  }));
  assert.deepStrictEqual(got, [{ word: '居家', segs: 7, share: 32.2 }, { word: '复核', segs: 5, share: 27.1 }, { word: '归因', segs: 2, share: 8.1 }]);
});

test('表格：5 张，行数 [技术类,无菌区污染、管路接错、体位与约束伤害,步骤与判据：把判断做成可复述的动作,流程类,核对走形式、交接断裂、记录倒补,时点与留痕：把关键节点固定成时刻,环境类,人力不足、物品摆放不便、照明与空间受限,布局与排班：改条件而不是改人,环境,可调床、照明、通道、呼叫装置,床高固定、照明不足、通道狭窄、无呼叫,人力,当班同事可支援,常只有一个照护者，可能是家属,物品,集中供应、可即时补充,自行准备、可能缺件、可能重复使用,退路,呼叫、转运、就近处置,呼救靠电话，到达有时间差,知情,制度化的告知与同意,需向对象与照护者同时说明，含「什么情况必须就医」,定项,每轮开始前,明确本轮监测哪一项、为什么是这一项,有明确的问题指向，不是「全面监测」,取样,按【教学设定】,抽取记录或现场观察，含好与坏两类,样本含未发生问题的情形,复核,取样后即做,回看原始记录与现场一致性：记录说的与做的对不对得上,至少一处不一致被发现，或明确写「未发现」,归因,复核后,按技术、流程、环境三类归因,归因落在可改的条件上,改动,归因后定人定时,一条改动，明确责任人与完成时点,改动可验证，不写「加强」,回看,按【教学设定】,下一轮看这条改动是否生效,有效／无效／无法判断，三态之一,监测定项,每轮开始前,质量负责人,项目、依据、本轮关注点,取样与复核,按【教学设定】,质量负责人＋当班执行者,样本量、复核方式、不一致处,归因与改动,复核后当轮完成,质量负责人,类别、改动内容、责任人、完成时点,回看,下一轮,质量负责人,三态结论、依据,报告保护,报告即适用，不因报告受不利对待,机构,报告人、保护范围,数据合规,采集与使用时,数据使用人,用途、范围、脱敏方式、留存,项目与依据,监测什么、依据来自何处,样本与方式,样本量、抽取方式、是否含未发生问题的情形,不一致处,记录与现场不符的具体位置,归因,技术／流程／环境，附一句判断依据,改动,一条改动＋责任人＋完成时点,回看结论,有效／无效／无法判断,数据合规,脱敏方式、使用范围、留存安排]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [3, 5, 6, 6, 7]
  );
});

test('模型表首列与正文一致：技术类 → 流程类 → 环境类', () => {
  assert.deepStrictEqual(M.model(), ['技术类', '流程类', '环境类']);
});

test('步骤表与正文一致：定项 → 取样 → 复核 → 归因 → 改动 → 回看', () => {
  assert.deepStrictEqual(M.steps(), ['定项', '取样', '复核', '归因', '改动', '回看']);
});

test('记录列与正文一致：项目与依据 → 样本与方式 → 不一致处 → 归因 → 改动 → 回看结论 → 数据合规', () => {
  assert.deepStrictEqual(M.logCols(), ['项目与依据', '样本与方式', '不一致处', '归因', '改动', '回看结论', '数据合规']);
});

test('失效模式清单按正文顺序读出：6 条', () => {
  assert.deepStrictEqual(M.failures(), ['数量代替质量', '复核变签字', '居家无退路', '归因指向个人', '数据合规缺位', '改动无回看']);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ['质量管理的产出是「改了什么」', '最近的帮助在哪里、多久能到']) assert.ok(DOC.includes(s), `缺：${s}`);
});

test('居家差异五处，退路那一项是准入条件', () => {
  assert.strictEqual(M.homeGaps().length, 5);
  assert.ok(DOC.includes('退路作为准入条件'));
});

test('quiz 结构：≥5 题、pre/check/post 齐、4 选项不重复、correct 合法、explain ≥30 汉字', () => {
  const qs = QUIZ.questions;
  assert.ok(Array.isArray(qs) && qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.ok(Array.isArray(item.options) && item.options.length === 4, `选项数不对：${item.question}`);
    assert.strictEqual(new Set(item.options).size, 4, `选项重复：${item.question}`);
    assert.ok(
      Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4,
      `correct 下标非法：${item.question}`
    );
    assert.ok(hanzi(item.explain) >= 30, `explain 过短（${hanzi(item.explain)} 字）：${item.question}`);
    assert.ok(hanzi(item.question) >= 8, `题干过短：${item.question}`);
  }
  assert.strictEqual(QUIZ.lesson, M.SLUG);
  assert.strictEqual(QUIZ.subject, '02-jichu-huli-xue');
});

test('quiz 的 check 题全部在正文落地：至少两道带两个以上四字词组', () => {
  const r = M.quizSummary(QUIZ, DOC);
  assert.ok(r.check >= 2, `check 题只有 ${r.check} 道`);
  assert.ok(r.grounded >= 2, `接地 ${r.grounded} 道`);
  assert.ok(r.rich >= 2, `带两个以上原文词组的只有 ${r.rich} 道`);
  for (const h of r.hits) assert.ok(h.grams.length > 0, `未接地：${h.question}`);
});

test('正确答案打散：四个位置都用到，单一位置不超过一半', () => {
  const idx = QUIZ.questions.map((x) => x.correct);
  assert.strictEqual(new Set(idx).size, 4, `未用满四个位置：${idx.join(',')}`);
  const top = Math.max(...[0, 1, 2, 3].map((i) => idx.filter((x) => x === i).length));
  assert.ok(top <= Math.ceil(idx.length / 2), `某一位置占比过高：${idx.join(',')}`);
});

test('quiz 不写剂量、疗程、发生率与页码：这些值只在规范与机构制度里', () => {
  const raw = JSON.stringify(QUIZ);
  for (const w of ['剂量', '疗程', '发生率', '页码', '三辨', '四位面']) {
    assert.strictEqual(raw.includes(w), false, `quiz 出现不该写的词：${w}`);
  }
});

test('命令行可运行：打印章题、命中与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 14 章`), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes(`实质段 24 段`), '输出未含实质段数');
});
