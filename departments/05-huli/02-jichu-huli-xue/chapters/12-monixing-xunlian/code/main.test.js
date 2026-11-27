'use strict';

/**
 * 第 12 章 演练的价值不在演得像，在复盘时敢说哪一步没做 —— 确定性单元测试
 * 运行: node --test chapters/12-monixing-xunlian/code/main.test.js
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
  assert.strictEqual(M.CHAPTER, '12');
  assert.strictEqual(M.TITLE, '演练的价值不在演得像，在复盘时敢说哪一步没做');
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

test('正文规模：2905 汉字 · 实质段 23 段／1720 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2905);
  assert.strictEqual(r.segs, 23);
  assert.strictEqual(r.segHanzi, 1720);
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
  assert.deepStrictEqual(got, [{ word: '复盘', segs: 10, share: 47 }, { word: '记录', segs: 2, share: 6.1 }, { word: '障碍', segs: 2, share: 7.3 }]);
});

test('表格：5 张，行数 [目标,本次要考的判断或动作，一条，不超过两条,演完不知道考了什么，复盘无从下手,障碍,人为设置的困难：信息不全、家属干扰、物品缺件、对象不配合,全程顺畅，学员只练了「顺手时的做法」,边界,学员可以做什么、不可以做什么、什么时候必须求助,学员越界或不敢动，两种情况都无法评价,判据,什么算做到、什么算没做到，可观察,复盘变成印象交流,目标与判据,本次考什么、怎么算过,学员在开始前知道判据,角色,谁演对象、谁演家属、谁观察、谁记录,每人知道自己演什么、不演什么,物品与装置,用物是否齐全、模拟设备状态、缺件是否为刻意设置,缺件有清单，不靠临场发现,安全,模拟操作不进入真实对象；锐器、用药、电源的替代方案,危险环节有明确替代，无真实接触,知情,参与者的知情与同意、拍摄与使用的范围,同意留痕，使用范围写明,复盘安排,何时复盘、谁主持、按什么顺序说,复盘的时段与主持人在开始前定,说明,3 分钟,交代情境、角色、边界、判据,学员能复述「我负责什么、不能做什么」,进场,1 分钟,就位、报角色、确认通讯,每人报出角色，通讯有回应,实施,8–15 分钟,按情境推进，观察者只记不提示,观察者记录的是行为与时刻，不是评价,插障,按设计,按预设时点插入障碍，不临场加码,障碍在开始前已定，插入时刻可查,收束,2 分钟,宣布结束、停止角色、回到本人,学员明确退出角色，情绪有回落时间,复盘,10–15 分钟,按「事实—判断—改进」三段进行,事实先于评价，改进落到一条,观察记录,实施中同步记，不事后追记,观察者,时刻、行为、口令、缺项,复盘记录,复盘当次完成,记录者,事实、判断、改进、责任人,改进跟踪,按【教学设定】在下次演练前回看,教学负责人,改进项、完成情况、复验方式,案例归档,脱敏后归档,教学负责人,情境、判据、暴露的问题、改进,安全事件,演练中发生的真实损伤即报,发现者,时刻、经过、处置、接收人,时刻,关键动作的时刻，用于算间隔,行为,做了什么、没做什么，只写可见动作,口令,说了什么、谁回应、有无复述,缺项,该做而未做的动作,越界,超出边界的动作与当时的说明,事实与判断,复盘时分列，不混写,改进项,一条可执行的改动＋责任人＋复验方式]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [4, 6, 6, 5, 7]
  );
});

test('模型表首列与正文一致：目标 → 障碍 → 边界 → 判据', () => {
  assert.deepStrictEqual(M.model(), ['目标', '障碍', '边界', '判据']);
});

test('步骤表与正文一致：说明 → 进场 → 实施 → 插障 → 收束 → 复盘', () => {
  assert.deepStrictEqual(M.steps(), ['说明', '进场', '实施', '插障', '收束', '复盘']);
});

test('记录列与正文一致：时刻 → 行为 → 口令 → 缺项 → 越界 → 事实与判断 → 改进项', () => {
  assert.deepStrictEqual(M.logCols(), ['时刻', '行为', '口令', '缺项', '越界', '事实与判断', '改进项']);
});

test('失效模式清单按正文顺序读出：6 条', () => {
  assert.deepStrictEqual(M.failures(), ['演成表演', '复盘变成表扬会', '安全失守', '案例未脱敏', '角色不清', '改进不闭环']);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ['情境的难度不来自病情复杂，来自信息不全', '先说事实，再说判断，最后说改进']) assert.ok(DOC.includes(s), `缺：${s}`);
});

test('四要素里第三个是边界，复盘固定三段', () => {
  assert.strictEqual(M.scenarioElements()[2], '边界');
  assert.ok(DOC.includes('事实—判断—改进'));
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
  assert.ok(out.includes(`第 12 章`), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes(`实质段 23 段`), '输出未含实质段数');
});
