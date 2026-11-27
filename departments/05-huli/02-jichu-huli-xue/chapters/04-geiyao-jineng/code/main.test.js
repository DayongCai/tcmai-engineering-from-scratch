'use strict';

/**
 * 第 4 章 核对能防给错人，防不了不该给 —— 确定性单元测试
 * 运行: node --test chapters/04-geiyao-jineng/code/main.test.js
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
  assert.strictEqual(M.CHAPTER, '4');
  assert.strictEqual(M.TITLE, '核对能防给错人，防不了不该给');
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

test('正文规模：2915 汉字 · 实质段 25 段／1823 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2915);
  assert.strictEqual(r.segs, 25);
  assert.strictEqual(r.segHanzi, 1823);
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
  assert.deepStrictEqual(got, [{ word: '核对', segs: 11, share: 52.6 }, { word: '评估', segs: 3, share: 15.2 }, { word: '途径', segs: 5, share: 21.4 }]);
});

test('表格：5 张，行数 [准备时,取药、配药、摆药,对象与项目是否对应、器具与途径是否对应、名称与标签是否一致,摆错床、贴错签、拿错同类外观,执行前,接触对象、开始给药之前,对象自述身份、途径、部位或侧别、本次与前次的差别,换了人、换了床、换了途径,执行后,给药完成、离开之前,对象即时反应、通路状态、标识与记录一致,外渗、局部反应、记录与实际不符,该不该给,依据来自何处、是否仍有效、本次与前次的差别,不给，回问开据者,给什么途径,依据中写明的途径、当前通路是否可用、有无替代,不自行改途径，回报,能不能配合,意识、吞咽、体位、能否保持不动、有无呕吐,改时机或改方式，须有依据,通路在不在,通路位置、是否通畅、局部有无异常、已用多久,不在此通路给药，先处理通路,上一次怎样,上次给了什么、何时、有无反应、有无遗漏,查清再给，不按印象补,口服,摆药—核对—协助体位—确认服下—观察,能看到吞咽动作，能说出「已服下」的依据,放在床头就走、口含未查、呕吐未观察,注射,核对—定位—消毒—穿刺—固定—观察,部位与依据一致，回抽或固定步骤不省,部位与记录不符、消毒与穿刺间隔过长,输注,核对—排气—连接—调定—巡视,连接前核对、开始时刻有记录、巡视有间隔,连接后才核对、巡视只签名不看局部,准备后至执行,准备完成即执行，间隔过长须重新核对【教学设定】,执行者,准备时刻、执行时刻,双人核对,按机构制度规定的项目执行，双人各自看过,执行者＋第二人，各自签名,两个签名、核对项目,输注巡视,按【教学设定】设定间隔，首末两次必看局部,当班执行者,巡视时刻、滴注状态、局部情况,异常报告,发现即报，先口头后书面,发现者,发现时刻、表现、已做动作、接收人,记录完成,给药后即时,执行者,见下表七列,时刻,给药开始与结束的时:分,对象与项目,对象识别方式、项目名称与依据来源,途径与部位,实际使用的途径与部位或侧别，与前次异同,核对,三时点各自完成情况、第二人签名,即时反应,主诉、局部表现、全身表现,报告,报告对象、接收人、接收时刻,遗留,未完成项、待观察项、交接内容]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [3, 5, 3, 5, 7]
  );
});

test('模型表首列与正文一致：准备时 → 执行前 → 执行后', () => {
  assert.deepStrictEqual(M.model(), ['准备时', '执行前', '执行后']);
});

test('步骤表与正文一致：口服 → 注射 → 输注', () => {
  assert.deepStrictEqual(M.steps(), ['口服', '注射', '输注']);
});

test('记录列与正文一致：时刻 → 对象与项目 → 途径与部位 → 核对 → 即时反应 → 报告 → 遗留', () => {
  assert.deepStrictEqual(M.logCols(), ['时刻', '对象与项目', '途径与部位', '核对', '即时反应', '报告', '遗留']);
});

test('失效模式清单按正文顺序读出：6 条', () => {
  assert.deepStrictEqual(M.failures(), ['查对走形式', '双人核对变单人签字', '途径自行更改', '外渗观察缺位', '口头交代替代记录', '自备或外带物品未经确认即使用']);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ['核对的成品不是「确认无误」', '途径不自行更改']) assert.ok(DOC.includes(s), `缺：${s}`);
});

test('五问的头尾是「该不该给」与「上一次怎样」', () => {
  const q = M.giveQuestions();
  assert.strictEqual(q[0], '该不该给');
  assert.strictEqual(q[q.length - 1], '上一次怎样');
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
  assert.ok(out.includes(`第 4 章`), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes(`实质段 25 段`), '输出未含实质段数');
});
