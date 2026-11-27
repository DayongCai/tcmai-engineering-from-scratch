'use strict';

/**
 * 第 3 章 一个测量值的意义，取决于你同时记下的条件 —— 确定性单元测试
 * 运行: node --test chapters/03-shengming-tizheng/code/main.test.js
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
  assert.strictEqual(M.CHAPTER, '3');
  assert.strictEqual(M.TITLE, '一个测量值的意义，取决于你同时记下的条件');
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

test('正文规模：2942 汉字 · 实质段 27 段／1853 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2942);
  assert.strictEqual(r.segs, 27);
  assert.strictEqual(r.segHanzi, 1853);
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
  assert.deepStrictEqual(got, [{ word: '观察', segs: 3, share: 12.6 }, { word: '记录', segs: 8, share: 25.1 }, { word: '基线', segs: 5, share: 18.4 }]);
});

test('表格：4 张，行数 [体温,测量部位、测量时长、刚进食或饮水、刚活动、环境温度、有无出汗,部位、时刻、与上次是否同部位,脉搏,体位、刚活动、情绪、是否刚用药、按压力度,节律是否规整、与上次相比快慢、按了几处,呼吸,是否被对象察觉（察觉后呼吸会变）、体位、有无疼痛,深浅与节律、有无费力表现、观察时长,血压,体位、肢体（左右、有无通路或患侧）、袖带与肢体是否匹配、是否刚活动或说话,哪一侧、什么体位、与上次是否同条件,对象,身份、本次测量与前次的间隔、当前是否刚活动或刚进食,能说出前次时刻与本次间隔,部位与肢体,有无通路、有无患侧、有无敷料或损伤、前次用的是哪一侧,能说出本次为何选这一侧,器具,是否完好、是否在有效状态、与对象是否匹配,器具状态有据可查，不凭印象,环境与体位,是否安静、体位是否与上次一致、是否已静息,体位有记录，静息时间有依据,上次结果,前次数值、当时条件、有无异常与处置,能复述前次异常及其后续,定位,30 秒,确认对象、部位、本次与前次的差别,说出「为什么是这一侧」,静息,按项目设定，不足不测,让对象安静下来，不在说话、活动、进食中测,静息时长有人记，不是估的,测量,按项目设定，不压缩,按该项目的顺序完成，中途不穿插其他任务,中途无中断；有中断则重来,读数,即时,读数当场报出并记录，不停留在记忆里,报数与记录数一致,复测,异常时按【教学设定】条件复测,同侧、同体位、同器具，间隔后复测,复测条件与首次可比，写明差异,交代,结束前,告知结果与下一步（是否需要报告、何时再看）,对象能复述「什么时候会再来」,时刻,时:分,测量时刻与报告时刻分别写,条件,部位或肢体、体位、静息情况、器具,与上次不同处必须点明,数值,本次读数,与单位一起写，不写「同上」,对比,前次读数与前次条件,无前次则写「首次，无基线」,伴随表现,面色、出汗、意识、呼吸费力、主诉,只写所见所闻，不写推断,处置与报告,已做的动作、报告对象、接收人,双向留痕，写清谁接的,复测,复测时刻、条件、结果,未复测须写「未复测」及原因]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [4, 5, 6, 7]
  );
});

test('模型表首列与正文一致：体温 → 脉搏 → 呼吸 → 血压', () => {
  assert.deepStrictEqual(M.model(), ['体温', '脉搏', '呼吸', '血压']);
});

test('步骤表与正文一致：定位 → 静息 → 测量 → 读数 → 复测 → 交代', () => {
  assert.deepStrictEqual(M.steps(), ['定位', '静息', '测量', '读数', '复测', '交代']);
});

test('记录列与正文一致：时刻 → 条件 → 数值 → 对比 → 伴随表现 → 处置与报告 → 复测', () => {
  assert.deepStrictEqual(M.logCols(), ['时刻', '条件', '数值', '对比', '伴随表现', '处置与报告', '复测']);
});

test('失效模式清单按正文顺序读出：5 条', () => {
  assert.deepStrictEqual(M.failures(), ['只记数值不记条件', '患侧或通路侧测量', '单次定论', '器具未处于有效状态', '观察被压缩成一次性']);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ['单次数值不是结论，与本人基线的差才是', '同侧、同体位、同器具']) assert.ok(DOC.includes(s), `缺：${s}`);
});

test('复测的判据是三个「同」，换条件即算新测量', () => {
  assert.ok(DOC.includes('同侧、同体位、同器具'));
  assert.ok(DOC.includes('不同则视为一次新测量'));
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
  assert.ok(out.includes(`第 3 章`), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes(`实质段 27 段`), '输出未含实质段数');
});
