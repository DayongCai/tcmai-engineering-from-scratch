'use strict';

/**
 * 第 7 章 排泄观察的价值在记录，不在处置 —— 确定性单元测试
 * 运行: node --test chapters/07-paixie-daoniao/code/main.test.js
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
  assert.strictEqual(M.CHAPTER, '7');
  assert.strictEqual(M.TITLE, '排泄观察的价值在记录，不在处置');
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

test('正文规模：2890 汉字 · 实质段 24 段／1751 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2890);
  assert.strictEqual(r.segs, 24);
  assert.strictEqual(r.segHanzi, 1751);
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
  assert.deepStrictEqual(got, [{ word: '记录', segs: 12, share: 49 }, { word: '观察', segs: 6, share: 26.8 }, { word: '标本', segs: 4, share: 19.4 }]);
});

test('表格：5 张，行数 [量,量级描述（多、中、少）与容器刻度,少尿与无尿的区别，往往只差一个「少」字,色,深浅、有无血色、有无浑浊,颜色改变是最早的可观察信号之一,性状,成形、稀、水样、有无黏液或异物,性状决定是否需要报告，量不决定,频次,本次与上次的间隔、一日次数,频次突增往往比单次异常更值得报,伴随,疼痛、费力、坠胀、恶心、发热感,伴随表现决定要不要立即报告,通路,自主、协助、留置；留置的固定与通畅,通路状态决定后续所有判断的前提,自理能力,能否自行如厕、能否表达需求、移动能力,能说出本次为何用这种方式协助,现况,上次排泄的时刻与情况、有无腹胀或尿意、有无疼痛,能复述上次记录的关键维度,通路,有无留置、固定与通畅情况、引流袋位置,管路状态当场看过，不凭交班,标本,本次是否需留取、留取目的、容器是否备好,目的明确，容器在手,环境,遮挡、私密、温度、地面是否湿滑,遮挡先于暴露，地面干燥,退路,协助中对象不适或跌倒风险升高时的处置,呼叫方式与人力安排已定,告知,1 分钟,说明协助方式、需要对方配合什么、如何叫停,对象能复述「怎么叫停」,准备,2 分钟,遮挡、物品、手卫生、体位,遮挡完成后再进入暴露步骤,协助,按方式计,按方式完成协助，全程保持遮挡与呼叫可达,对象无跌倒、无牵拉、无暴露,观察,即时,六维观察，当场记下关键项,六维中至少五维有内容,处置,即时,清洁、复位、管路固定、标本留取,管路固定牢，标本标识完整,交代,1 分钟,下次协助时间、饮水与活动安排、异常如何报告,对象能说出「什么情况要叫人」,协助后记录,当次完成，不跨班补写,执行者,六维＋时刻,留置管路观察,每班至少一次，交接时复核,当班执行者,固定、通畅、引流性状、接口,标本送检,留取后按机构规定的时限送检,留取者,留取时刻、送检时刻、接收人,异常报告,发现即报,发现者,表现、基线、接收人,交接,每班交接，含未完成项,交班者,上次时刻、量级、异常、待办,时刻,本次与上次的时:分，间隔可算,方式,自主、协助、留置；协助的具体方式类别,六维,量级、色、性状、频次、伴随、通路,管路,固定、通畅、接口、引流袋位置与更换,标本,是否留取、目的、留取与送检时刻,对象反应,疼痛、费力、情绪、耐受,报告与交接,报告对象、交接要点、待观察项]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [6, 6, 6, 5, 7]
  );
});

test('模型表首列与正文一致：量 → 色 → 性状 → 频次 → 伴随 → 通路', () => {
  assert.deepStrictEqual(M.model(), ['量', '色', '性状', '频次', '伴随', '通路']);
});

test('步骤表与正文一致：告知 → 准备 → 协助 → 观察 → 处置 → 交代', () => {
  assert.deepStrictEqual(M.steps(), ['告知', '准备', '协助', '观察', '处置', '交代']);
});

test('记录列与正文一致：时刻 → 方式 → 六维 → 管路 → 标本 → 对象反应 → 报告与交接', () => {
  assert.deepStrictEqual(M.logCols(), ['时刻', '方式', '六维', '管路', '标本', '对象反应', '报告与交接']);
});

test('失效模式清单按正文顺序读出：6 条', () => {
  assert.deepStrictEqual(M.failures(), ['量级靠估', '只记结果不记过程', '标本混标与延误', '管路牵拉', '协助中跌倒', '便秘处置越界']);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ['排泄护理的成品是一份能复现的记录', '至少五维有内容']) assert.ok(DOC.includes(s), `缺：${s}`);
});

test('六维里第六维是通路，判据是至少五维有内容', () => {
  const d = M.dimensions();
  assert.strictEqual(d.length, 6);
  assert.strictEqual(d[5], '通路');
  assert.ok(DOC.includes('六维中至少五维有内容'));
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
  assert.ok(out.includes(`第 7 章`), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes(`实质段 24 段`), '输出未含实质段数');
});
