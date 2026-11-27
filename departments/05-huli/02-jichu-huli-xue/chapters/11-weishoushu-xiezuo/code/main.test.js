'use strict';

/**
 * 第 11 章 术前准备的每一件事，都是为术后那一次观察留基线 —— 确定性单元测试
 * 运行: node --test chapters/11-weishoushu-xiezuo/code/main.test.js
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
  assert.strictEqual(M.CHAPTER, '11');
  assert.strictEqual(M.TITLE, '术前准备的每一件事，都是为术后那一次观察留基线');
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

test('正文规模：2910 汉字 · 实质段 24 段／1792 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2910);
  assert.strictEqual(r.segs, 24);
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
  assert.deepStrictEqual(got, [{ word: '基线', segs: 7, share: 27.3 }, { word: '记录', segs: 5, share: 18.8 }, { word: '管路', segs: 3, share: 9.8 }]);
});

test('表格：5 张，行数 [身体准备,皮肤清洁、肠道准备、饰品与义齿处理、通路建立,部位与范围、皮肤现况、完成时刻,信息准备,核查、标识、同意与告知、既往情况确认,谁核的、核了什么、有无不一致,状态准备,生命体征与一般状况、疼痛、活动能力、情绪,术前这一次的基线，逐项写数值或描述,身份与项目,对象、部位或侧别、拟行项目,三者在同一句话里说得完整,依据与标识,依据可查、标识与部位一致、标识未被移动,标识位置与依据一致，标记清楚,身体准备,皮肤范围与现况、肠道准备完成情况、通路,每一项都能说出完成时刻,既往与用药,过敏史、长期使用的物品、既往手术与反应,能复述最近一次的相关反应,状态基线,生命体征、疼痛、活动、情绪、睡眠,五项都有可比较的记录,退路,术前出现变化的处置路径与联系人,知道找谁、怎么找,接收,5 分钟,与手术方交接：项目、经过、管路、用药、特殊情况,接收方复述三项以上,就位,3 分钟,体位、保暖、管路安置、床档、呼叫器在手,管路无牵拉，呼叫器可取到,首次观察,接收后立即,意识、呼吸、颜色、伤口与敷料、管路、疼痛,六项各自与术前基线成对比较,观察间隔,按【教学设定】,按间隔复看，重点看变化项,每次都有时刻与比较结果,报告,变化即报,变化的类别、幅度、时刻、已做动作,接收人明确,记录,当次完成,见下表,记录可复现本次观察,术前基线,术前当次完成，不引用旧记录,术前班执行者,五项基线、完成时刻,核查,按机构规定的时点执行，逐项,执行者＋第二人,核查项、双方签名、时刻,交接,术后接收时当面完成,手术方与接收方,见下表,观察,按【教学设定】间隔，变化时加密,当班执行者,时刻、六项、比较,报告,变化即报,发现者,变化内容、幅度、接收人,记录,当次完成，不跨班补写,执行者,全部字段,时刻,接收、首次观察、各次观察、报告,基线对照,术前五项基线的现值与差值,伤口与敷料,位置、渗液量级与性质、敷料完整性,管路,条数、位置、固定、通畅、引流性状,疼痛,部位、性质、程度（对象自述口径）、缓解因素,活动与饮食,体位耐受、首次活动、进食情况,报告与交代,报告对象、接收人、交代内容]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [3, 6, 6, 6, 7]
  );
});

test('模型表首列与正文一致：身体准备 → 信息准备 → 状态准备', () => {
  assert.deepStrictEqual(M.model(), ['身体准备', '信息准备', '状态准备']);
});

test('步骤表与正文一致：接收 → 就位 → 首次观察 → 观察间隔 → 报告 → 记录', () => {
  assert.deepStrictEqual(M.steps(), ['接收', '就位', '首次观察', '观察间隔', '报告', '记录']);
});

test('记录列与正文一致：时刻 → 基线对照 → 伤口与敷料 → 管路 → 疼痛 → 活动与饮食 → 报告与交代', () => {
  assert.deepStrictEqual(M.logCols(), ['时刻', '基线对照', '伤口与敷料', '管路', '疼痛', '活动与饮食', '报告与交代']);
});

test('失效模式清单按正文顺序读出：6 条', () => {
  assert.deepStrictEqual(M.failures(), ['核查走过场', '术前基线缺失', '禁食交代不到位', '管路信息丢失', '首次观察推迟', '疼痛被当成必然']);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ['术前准备的成品是一份基线，不是一串勾', '一般情况可']) assert.ok(DOC.includes(s), `缺：${s}`);
});

test('状态准备那一类的产出是基线，五项都要写成可比较的记录', () => {
  assert.strictEqual(M.prepClasses()[2], '状态准备');
  assert.ok(DOC.includes('五项都有可比较的记录'));
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
  assert.ok(out.includes(`第 11 章`), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes(`实质段 24 段`), '输出未含实质段数');
});
