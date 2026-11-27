'use strict';

/**
 * 第 8 章 翻身的意义不在翻，在翻完之后看了什么 —— 确定性单元测试
 * 运行: node --test chapters/08-tiwei-zhuanyun/code/main.test.js
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
  assert.strictEqual(M.CHAPTER, '8');
  assert.strictEqual(M.TITLE, '翻身的意义不在翻，在翻完之后看了什么');
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

test('正文规模：2917 汉字 · 实质段 24 段／1787 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2917);
  assert.strictEqual(r.segs, 24);
  assert.strictEqual(r.segHanzi, 1787);
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
  assert.deepStrictEqual(got, [{ word: '皮肤', segs: 11, share: 52.9 }, { word: '约束', segs: 7, share: 39.7 }, { word: '转运', segs: 4, share: 26 }]);
});

test('表格：5 张，行数 [压力,体重与支撑面之间,通过变换体位改变受力点，不试图消除压力,剪切,拖、拽、滑：皮肤与深层组织错位移动,抬举代替拖拽，减少错位,潮湿,汗、渗液、失禁、冲洗残留,保持干燥、及时更换、避免摩擦叠加,时间,同一受力点持续受压的时长,按时变换，并在变换时看皮肤,耐受,能否配合、有无疼痛、有无呼吸费力、有无头晕,能说出本次为何用这个体位与角度,管路,有几条、各在哪里、哪些不能压、哪些不能牵,逐条说出位置与固定方式,皮肤,现况：发红部位、有无破损、有无潮湿,上次记录的部位当场复核,人力与器具,需要几人、器具是否在位、床高是否合适,人力与器具在开始前到位,环境,空间是否够、地面是否湿滑、遮挡是否完成,通道畅通，遮挡先于移动,退路,移动中出现不适或滑落的处置,呼叫方式与接手人已定,告知,1 分钟,说明要做什么、需要对方怎么配合、何时可以叫停,对象能复述配合要点与叫停方式,就位,1 分钟,床高、器具、人力、管路预安置、遮挡,六项各自确认，管路无牵拉,移动,按人数与方式计,抬举代替拖拽，同步口令，动作一次完成,皮肤无摩擦音，管路无张力,复位,1 分钟,体位摆放、支撑物放置、管路复位、床档,支撑到位，管路回到无张力位置,观察,即时,皮肤（原发红处与新受力点）、呼吸、疼痛、意识,与上次记录成对比较,记录,即时,体位、时刻、皮肤、管路、对象反应,记录能复现本次动作,变换体位,按【教学设定】的频次执行，受压点与耐受变化时加密,当班执行者,时刻、体位、皮肤、管路,皮肤复核,每次变换时看，交班时全面看一次,当班执行者,部位、颜色、完整性、与上次比较,约束使用,仅在替代方式无效时，按依据执行并定时复核,执行者＋复核人,依据、部位、时间、复核,转运前评估,出发前完成，不途中补,转运执行者,五项评估结果,交接,到达即交接，双方复述,转出与接收双方,见下表,异常报告,发现即报,发现者,表现、时刻、接收人,时刻,变换与观察的时:分,体位,体位类别、倾斜程度（描述性）、支撑物位置,皮肤,部位、颜色、完整性、范围、与上次比较,管路,条数、位置、固定、有无牵拉,对象反应,疼痛、呼吸、意识、耐受、主诉,约束,是否使用、依据、部位、复核时刻、替代方式尝试,交接,转出方陈述、接收方复述、待观察项]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [4, 6, 6, 6, 7]
  );
});

test('模型表首列与正文一致：压力 → 剪切 → 潮湿 → 时间', () => {
  assert.deepStrictEqual(M.model(), ['压力', '剪切', '潮湿', '时间']);
});

test('步骤表与正文一致：告知 → 就位 → 移动 → 复位 → 观察 → 记录', () => {
  assert.deepStrictEqual(M.steps(), ['告知', '就位', '移动', '复位', '观察', '记录']);
});

test('记录列与正文一致：时刻 → 体位 → 皮肤 → 管路 → 对象反应 → 约束 → 交接', () => {
  assert.deepStrictEqual(M.logCols(), ['时刻', '体位', '皮肤', '管路', '对象反应', '约束', '交接']);
});

test('失效模式清单按正文顺序读出：6 条', () => {
  assert.deepStrictEqual(M.failures(), ['拖拽代替抬举', '管路牵拉', '约束滥用与失察', '转运交接断裂', '体位与目的不符', '观察滞后']);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ['翻身的成品是一次皮肤检查', '人力不足时不做，不等同于不搬']) assert.ok(DOC.includes(s), `缺：${s}`);
});

test('四要素里护理能改变的是后三个，压力靠变换受力点', () => {
  assert.deepStrictEqual(M.pressureFactors(), ['压力', '剪切', '潮湿', '时间']);
  assert.ok(DOC.includes('通过变换体位改变受力点，不试图消除压力'));
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
  assert.ok(out.includes(`第 8 章`), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes(`实质段 24 段`), '输出未含实质段数');
});
