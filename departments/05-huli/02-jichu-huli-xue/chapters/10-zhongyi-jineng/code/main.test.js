'use strict';

/**
 * 第 10 章 中医护理技术的门槛不在手法，在什么情况下不做 —— 确定性单元测试
 * 运行: node --test chapters/10-zhongyi-jineng/code/main.test.js
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
  assert.strictEqual(M.CHAPTER, '10');
  assert.strictEqual(M.TITLE, '中医护理技术的门槛不在手法，在什么情况下不做');
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

test('正文规模：2966 汉字 · 实质段 24 段／1825 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2966);
  assert.strictEqual(r.segs, 24);
  assert.strictEqual(r.segHanzi, 1825);
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
  assert.deepStrictEqual(got, [{ word: '终止', segs: 5, share: 22.8 }, { word: '记录', segs: 4, share: 10.2 }, { word: '试做', segs: 3, share: 13.7 }]);
});

test('表格：5 张，行数 [灸法类,以温热作用于体表,温度与时长不可见，损伤滞后出现,罐法类,以负压作用于体表,负压与局部条件不匹配，出现水泡或破损,推拿类,以手法作用于体表与关节,力度不可见，对象难以准确表达,贴敷类,以药物或介质作用于局部皮肤,局部反应与皮肤条件相关,给药与情志配合,按依据完成给药配合、按安排实施情志护理,核对与告知环节被简化,依据,技术类别由谁确定、依据是否写明部位与次数,依据可查，不由护理自行选定,局部条件,皮肤完整性、有无破损、瘢痕、皮疹、感觉减退,部位当场看过，不凭交班描述,全身条件,有无发热、饥饿、疲劳、饮酒、情绪激动,这五项各问一句，不合并成「还好吧」,耐受与表达,能否清楚表达不适、能否保持体位,能说出「不舒服会怎么告诉你」,告知与同意,做什么、可能的感觉、可能的局部反应、可随时叫停,对象能复述「可以随时叫停」,环境,温度、遮挡、通风、有无易燃物（灸法）,遮挡先于暴露，易燃物已移除,定位,1 分钟,按依据确认部位，暴露范围最小化,部位与依据一致，暴露有遮挡,试做,首次必做,先小范围、短时间试做，观察反应,有明确的「观察多久、看什么」,实施,按类别计,按依据完成，全程不离人,全程在场，不中途离开,观察,持续,局部颜色、皮肤完整性、对象主诉、全身反应,每项都有一次记录，不合并,终止,出现即停,疼痛、灼热难忍、头晕心慌、皮肤异常,停手不需要请示,收尾,2 分钟,清洁、遮挡复原、交代注意事项、记录,交代含「出现什么要报告」,评估,操作前完成，五问逐项,执行者,五问结果、局部条件,试做观察,首次必做，观察时长按【教学设定】,执行者,试做部位、时长、反应,全程在场,实施期间不离人,执行者,是否有中断、中断原因,终止与报告,出现即停，停后即报,执行者,终止原因、局部表现、接收人,记录,操作结束当次完成,执行者,见下表,随访观察,按【教学设定】在之后的时间点复核局部,执行者或接班人,复核时刻、局部变化,时刻,开始、试做、结束、复核,依据,技术类别、部位、次数，与依据是否一致,局部,部位、颜色、完整性、范围、与试做时比较,对象感受,温热感、疼痛、头晕心慌、耐受,终止,是否终止、原因、停后处理,交代,交代了哪几件事、对象能否复述,报告,报告对象、接收人、接收时刻]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [5, 6, 6, 6, 7]
  );
});

test('模型表首列与正文一致：灸法类 → 罐法类 → 推拿类 → 贴敷类 → 给药与情志配合', () => {
  assert.deepStrictEqual(M.model(), ['灸法类', '罐法类', '推拿类', '贴敷类', '给药与情志配合']);
});

test('步骤表与正文一致：定位 → 试做 → 实施 → 观察 → 终止 → 收尾', () => {
  assert.deepStrictEqual(M.steps(), ['定位', '试做', '实施', '观察', '终止', '收尾']);
});

test('记录列与正文一致：时刻 → 依据 → 局部 → 对象感受 → 终止 → 交代 → 报告', () => {
  assert.deepStrictEqual(M.logCols(), ['时刻', '依据', '局部', '对象感受', '终止', '交代', '报告']);
});

test('失效模式清单按正文顺序读出：6 条', () => {
  assert.deepStrictEqual(M.failures(), ['跳过局部条件', '对象忍痛不说', '终止条件缺位', '越界确定技术类别', '疗效承诺', '复核缺失']);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ['中医护理技术的安全不靠手法精细，靠终止条件明确', '终止不需要请示']) assert.ok(DOC.includes(s), `缺：${s}`);
});

test('五类技术共用一套判据，共同的起点是类别不由护理选定', () => {
  assert.strictEqual(M.techniqueClasses().length, 5);
  assert.ok(DOC.includes('技术类别不由护理人员选定'));
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
  assert.ok(out.includes(`第 10 章`), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes(`实质段 24 段`), '输出未含实质段数');
});
