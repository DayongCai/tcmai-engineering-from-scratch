'use strict';

/**
 * 第 13 章 考核的成品是一份改进项，不是一个分数 —— 确定性单元测试
 * 运行: node --test chapters/13-kaohe-pingjia/code/main.test.js
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
  assert.strictEqual(M.CHAPTER, '13');
  assert.strictEqual(M.TITLE, '考核的成品是一份改进项，不是一个分数');
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

test('正文规模：2900 汉字 · 实质段 23 段／1792 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2900);
  assert.strictEqual(r.segs, 23);
  assert.strictEqual(r.segHanzi, 1792);
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
  assert.deepStrictEqual(got, [{ word: '考核', segs: 15, share: 72.8 }, { word: '记录', segs: 5, share: 26.7 }, { word: '判据', segs: 5, share: 18.6 }]);
});

test('表格：5 张，行数 [准备层,核对、评估、告知、物品与环境,是否完成、是否说出依据,动作对而前提错，考不出,执行层,顺序、手法、无菌或清洁边界,关键步有无遗漏、顺序是否可复述,只能看出熟练度,观察报告层,观察什么、异常如何报、记录是否可复现,能否说出变化与去向,出了错也不会被发现,依据与范围,本次考哪几项、依据来自何处、范围是否公告,学员在考前知道考什么、不考什么,标准,每项的判据写成可观察句，含缺项与扣分点的处理,判据里不出现「规范」「到位」这类词,站点与物品,站点布置一致、物品齐全、缺件是否为刻意设置,各站布置一致，缺件有清单,考官,考官人数、分工、是否交叉、是否同一标准,考前有一次标准对齐,对象与安全,模拟对象、替代物、危险环节的空做方案,无真实接触，无真实锐器与药物,记录与留痕,记录表、时刻、签名、异常处理,表格能记录「没做」而不只是「做了」,说明,3 分钟,交代项目、判据、时间、可求助的边界,学员能复述「考什么、怎么算过」,就位,1 分钟,报角色、确认物品、确认对象,三项确认说出声,实施,按项目计,学员独立完成，考官只记不提示,考官记录的是行为与时刻,安全判定,即时,出现底线行为立即终止并记录,终止有依据，当面说明,收束,2 分钟,复原、清点、学员离场,物品与对象复位，无遗留,反馈,10 分钟,按「事实—判据—改进」三段反馈,反馈含一条可执行的改进,现场记录,实施中同步,考官,时刻、行为、缺项、底线判定,结果汇总,当日完成,主考,各项判据的达成情况,反馈,当日或次日，不留到下一轮,考官,事实、对应判据、改进项,改进跟踪,按【教学设定】在复评前回看,教学负责人,改进项、完成情况,复评,针对未通过项，不整体重考,考官,复评项目、判据、结论,结果使用,仅用于教学改进与个人学习,教学负责人,使用范围、告知情况,项目与判据,本次考的项、对应判据编号,达成情况,达成／未达成／未考到（三态，不用分数替代）,底线判定,有无触发、触发在哪一步,事实摘记,一句可复现的行为描述,反馈要点,说给学员的那一句改进,复评安排,项目、时点、方式,留痕,考官签名、学员确认]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [3, 6, 6, 6, 7]
  );
});

test('模型表首列与正文一致：准备层 → 执行层 → 观察报告层', () => {
  assert.deepStrictEqual(M.model(), ['准备层', '执行层', '观察报告层']);
});

test('步骤表与正文一致：说明 → 就位 → 实施 → 安全判定 → 收束 → 反馈', () => {
  assert.deepStrictEqual(M.steps(), ['说明', '就位', '实施', '安全判定', '收束', '反馈']);
});

test('记录列与正文一致：项目与判据 → 达成情况 → 底线判定 → 事实摘记 → 反馈要点 → 复评安排 → 留痕', () => {
  assert.deepStrictEqual(M.logCols(), ['项目与判据', '达成情况', '底线判定', '事实摘记', '反馈要点', '复评安排', '留痕']);
});

test('失效模式清单按正文顺序读出：6 条', () => {
  assert.deepStrictEqual(M.failures(), ['评分漂移', '只考动作不考判断', '反馈变排名', '人情分', '底线判定被软化', '复评变重考']);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ['考核的成品是一份改进项，不是一个分数', '有些动作没有「部分正确」']) assert.ok(DOC.includes(s), `缺：${s}`);
});

test('三层的第三层是观察报告层，安全底线单列在表外', () => {
  assert.deepStrictEqual(M.layers(), ['准备层', '执行层', '观察报告层']);
  assert.ok(DOC.includes('本次考核即判不通过'));
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
  assert.ok(out.includes(`第 13 章`), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes(`实质段 23 段`), '输出未含实质段数');
});
