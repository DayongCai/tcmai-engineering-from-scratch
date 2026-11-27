'use strict';

/**
 * 第 1 章 技能练到能被打断再接着做完，才算练成 —— 确定性单元测试
 * 运行: node --test chapters/01-gaishu-gufan/code/main.test.js
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
  assert.strictEqual(M.CHAPTER, '1');
  assert.strictEqual(M.TITLE, '技能练到能被打断再接着做完，才算练成');
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

test('正文规模：2919 汉字 · 实质段 26 段／1859 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2919);
  assert.strictEqual(r.segs, 26);
  assert.strictEqual(r.segHanzi, 1859);
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
  assert.deepStrictEqual(got, [{ word: '核对', segs: 2, share: 12 }, { word: '评估', segs: 3, share: 16.7 }, { word: '报告', segs: 2, share: 10.7 }]);
});

test('表格：4 张，行数 [准备层,对象核对、物品与环境准备、告知与同意,动手前能复述「给谁、做什么、凭什么、出问题找谁」,东西摆得很齐，问一句「给谁」答不上来,执行层,顺序、手法、无菌或清洁边界,步骤可被第二人复述，关键节点有停顿,动作流畅但说不出下一步为什么是这一步,观察报告层,观察什么、什么算异常、向谁报、报什么,异常能在一句话里说清「变了什么、变了多少、从什么时候起」,只说「不太好」，没有可比较的基线,给谁,姓名与关键信息由本人说出；两条独立来源互相印证,不开始，回到识别环节,做什么,目的、部位或侧别、本次与前次的差别,不开始，向具备资质的人员确认,凭什么,依据来自何处、由谁开出、是否仍然有效,不开始，按制度复核,出问题找谁,异常向谁报、报不上时的替代渠道、现场谁负责,不开始，先确认责任人,示教,8–12 分钟,教师完整做一遍，只讲三个节点：评估、关键步、记录,学员能说出三个节点各在哪一步,拆解,5 分钟,把操作切成「可单独判对错」的 4–6 段,每段有一句判据，不是「注意规范」这类空话,回示,6–8 分钟,学员做，教师不提示，只在关键步记录,关键步无遗漏，顺序错处被记下而不是被纠正,干扰,3 分钟,在关键步人为插入一次打断（提问、递物、呼叫）,学员能回到中断前那一步，并说出哪些要重来,纠错,5 分钟,只改一处，改完再跑一遍同一段,同一处错误在第二遍不复发,记录,2 分钟,学员自己填训练记录，教师核对,记录里能看出错在哪一段,操作前四问,接触前完成，不设压缩空间,执行者本人，不得由他人代答,核对方式、依据来源、异常报告对象,关键步再核对,进入关键步之前，逐项,执行者＋第二人复述（有条件时）,复述人、复述时间、不一致项,中断后复位,中断结束后立即，先复位再继续,执行者,中断时刻、中断原因、重来的步骤,异常报告,发现即报，先口头后书面,发现者,发现时刻、变化内容、基线值、接收人,训练记录,每次训练结束当次填写,学员填写，教师核签,段位、耗时、错误点、第二遍是否复发]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [3, 4, 6, 5]
  );
});

test('模型表首列与正文一致：准备层 → 执行层 → 观察报告层', () => {
  assert.deepStrictEqual(M.model(), ['准备层', '执行层', '观察报告层']);
});

test('步骤表与正文一致：示教 → 拆解 → 回示 → 干扰 → 纠错 → 记录', () => {
  assert.deepStrictEqual(M.steps(), ['示教', '拆解', '回示', '干扰', '纠错', '记录']);
});

test('失效模式清单按正文顺序读出：4 条', () => {
  assert.deepStrictEqual(M.failures(), ['评估被压成开场白', '查对走形式', '记录倒补', '只练顺境']);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ['训练的目标不是熟练度，是可复位性', '字段写在事情发生的当时，不写在事情结束之后']) assert.ok(DOC.includes(s), `缺：${s}`);
});

test('四问与训练六段对得上：干扰段是多数训练缺的那一段', () => {
  assert.deepStrictEqual(M.fourQuestions(), ['给谁', '做什么', '凭什么', '出问题找谁']);
  assert.ok(M.drill().includes('干扰'));
  assert.ok(DOC.includes('切不出一句可判对错的判据'));
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
  assert.ok(out.includes(`第 1 章`), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes(`实质段 26 段`), '输出未含实质段数');
});
