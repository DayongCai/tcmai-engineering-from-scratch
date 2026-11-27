'use strict';

/**
 * 第 6 章 给氧是最容易被「顺手打开」的一项技术 —— 确定性单元测试
 * 运行: node --test chapters/06-yangliao-qidao/code/main.test.js
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
  assert.strictEqual(M.CHAPTER, '6');
  assert.strictEqual(M.TITLE, '给氧是最容易被「顺手打开」的一项技术');
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

test('正文规模：2974 汉字 · 实质段 24 段／1821 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2974);
  assert.strictEqual(r.segs, 24);
  assert.strictEqual(r.segHanzi, 1821);
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
  assert.deepStrictEqual(got, [{ word: '观察', segs: 8, share: 31.9 }, { word: '核对', segs: 2, share: 8.6 }, { word: '装置', segs: 7, share: 33.9 }]);
});

test('表格：5 张，行数 [需不需要,具备资质的人员,提出观察依据：呼吸费力、口唇颜色、说话断续、活动耐受下降,用哪一种方式,具备资质的人员,确认装置与对象匹配、确认对象能耐受、确认管路不影响其他照护,用多久、何时停,具备资质的人员,观察效果与不适、按安排复查、报告变化,对象,身份、本次与前次的差别、有无既往不耐受,能说出前次方式与当时反应,依据,依据来自何处、是否仍然有效、方式是否写明,依据可查，方式不含糊,装置,是否完好、管路有无破损与打折、接口是否匹配,通气检查通过，接口对接无松动,湿化,湿化部分是否在位、状态是否合适,在位且状态可查，不凭印象,环境,有无明火与易燃物、通风情况、装置放置是否稳妥,明火与易燃物已移开，装置不悬空,退路,备用装置、断电或断气时的替代方案,替代方案已在场，不需离场取用,核对,60 秒,对象、依据、方式、装置四项一次核完,四项各自说出依据，不跳项,检查,60 秒,装置通气、管路完好、湿化在位、环境安全,通气有声有形，管路无打折,安置,2 分钟,体位、装置佩戴、松紧与贴合、管路走向,对象能耐受，管路不牵拉、不压身,交代,1 分钟,说明「这是做什么、可能的不适、不要自行调整、如何叫人」,对象能复述「不自己动」这一条,观察,按【教学设定】间隔,呼吸状态、口唇颜色、说话能力、装置位置、局部皮肤,每次观察与上次成对比较,记录,即时,方式、开始时刻、观察结果、交代内容,记录能独立复现本次操作,开始前核对,接触前完成,执行者,四项核对结果、依据来源,启动后首次观察,启动后按【教学设定】的短间隔内完成,执行者,时刻、呼吸、颜色、耐受,常规观察,按【教学设定】间隔，变更后加密,当班执行者,每次时刻与成对比较结果,装置与湿化检查,每班至少一次，交接时复核,当班执行者,检查时刻、状态、更换情况,异常报告,变化即报，先口头后书面,发现者,变化内容、基线、接收人,停止或变更,仅按依据执行，执行后复核,执行者,依据来源、变更时刻、复核人,方式与装置,方式类别、装置类别、佩戴部位,时刻,开始、每次观察、结束,观察结果,呼吸状态、口唇颜色、说话能力、活动耐受,装置状态,位置、松紧、管路走向、湿化状态,局部情况,佩戴部位皮肤、有无压迫与潮湿,交代,交代了哪三件事、对象能否复述,报告,报告对象、接收人、接收时刻]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [3, 6, 6, 6, 7]
  );
});

test('模型表首列与正文一致：需不需要 → 用哪一种方式 → 用多久、何时停', () => {
  assert.deepStrictEqual(M.model(), ['需不需要', '用哪一种方式', '用多久、何时停']);
});

test('步骤表与正文一致：核对 → 检查 → 安置 → 交代 → 观察 → 记录', () => {
  assert.deepStrictEqual(M.steps(), ['核对', '检查', '安置', '交代', '观察', '记录']);
});

test('记录列与正文一致：方式与装置 → 时刻 → 观察结果 → 装置状态 → 局部情况 → 交代 → 报告', () => {
  assert.deepStrictEqual(M.logCols(), ['方式与装置', '时刻', '观察结果', '装置状态', '局部情况', '交代', '报告']);
});

test('失效模式清单按正文顺序读出：6 条', () => {
  assert.deepStrictEqual(M.failures(), ['自行启动与自行调整', '管路接错与打折', '湿化缺位', '吸引操作超时', '固定移位', '观察无基线']);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ['给氧的质量不在「给上了」', '判据是「成对比较」']) assert.ok(DOC.includes(s), `缺：${s}`);
});

test('三个判断的归属都在具备资质的人员一侧，护理只承担观察与报告', () => {
  assert.strictEqual(M.judgementOwners().length, 3);
  const owners = M.column(0, 1, DOC);
  assert.ok(owners.every((o) => o === '具备资质的人员'), owners.join('/'));
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
  assert.ok(out.includes(`第 6 章`), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes(`实质段 24 段`), '输出未含实质段数');
});
