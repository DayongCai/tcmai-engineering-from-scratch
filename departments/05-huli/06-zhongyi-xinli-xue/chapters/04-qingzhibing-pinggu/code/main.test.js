'use strict';

/**
 * 第 4 章 评估的功夫在提问，不在结论 —— 确定性单元测试
 * 运行: node --test chapters/04-qingzhibing-pinggu/code/main.test.js
 *
 * 有两类断言：一类钉住正文实测算出来的值（规模、命中、表格行数、清单），
 * 正文或解析口径一变就会红；另一类是结构断言（章节骨架、quiz 形态），
 * 防止有人把题目退回成「看代码输出」那类空话。
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
  assert.strictEqual(path.basename(path.dirname(__dirname)), M.SLUG);
  assert.strictEqual(M.CHAPTER, '4');
  assert.strictEqual(M.TITLE, '评估的功夫在提问，不在结论');
});

test('小节结构：五个编号节加代价与边界', () => {
  const titles = [...DOC.replace(/\r\n/g, '\n').matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
  assert.strictEqual(titles.length, 6, `小节数 ${titles.length}`);
  assert.strictEqual(titles[5], '代价与边界');
  assert.deepStrictEqual(
    titles.slice(0, 5).map((t) => t.slice(0, 2)),
    ['一、', '二、', '三、', '四、', '五、']
  );
});

test('正文规模：2821 汉字 · 实质段 25 段／2033 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2821);
  assert.strictEqual(r.paragraphs, 27);
  assert.strictEqual(r.segs, 25);
  assert.strictEqual(r.segHanzi, 2033);
});

test('实质段的计数规则：以换行分隔、35 汉字起算，标题与表格行不计', () => {
  const p34 = '乙'.repeat(M.MIN_SEG - 1);
  const p35 = '甲'.repeat(M.MIN_SEG);
  const text = ['# 一节', '| 表头 | 说明 |', '> 引文', '---', p34, p35].join('\n');
  assert.deepStrictEqual(M.substantive(text), [p35]);
  assert.strictEqual(M.paragraphs(text).length, 2);
});

test('占比的分子是命中段汉字，不是命中段数', () => {
  const short = '问情' + '丙'.repeat(36);
  const long = '丁'.repeat(120);
  const out = M.keywordHits(['问情'], [short, long]);
  assert.strictEqual(out[0].segs, 1);
  assert.strictEqual(out[0].segHanzi, hanzi(short));
  assert.ok(Math.abs(out[0].share - (hanzi(short) / (hanzi(short) + 120)) * 100) < 1e-9);
});

test('关键词命中：段数与占比全部现算', () => {
  const got = M.keywordHits(M.KEYWORDS).map((k) => ({ word: k.word, segs: k.segs, share: Number(k.share.toFixed(1)) }));
  assert.deepStrictEqual(got, [
    { word: '问情', segs: 3, share: 12.6 },
    { word: '证据', segs: 4, share: 15.5 },
    { word: '复述', segs: 1, share: 4.6 },
  ]);
});

test('表格：2 张，行数 [望神,目光、面色光泽、表情的灵活度、姿态、动作的迟速、舌象,神气的存亡与盛衰；是「得神」还是「失神」,情绪的具体内容与原因,闻声,语声高低、断续、语速、叹息、嗳气、口气,气的盛衰与郁畅；气机上下的倾向,是否在隐瞒,问情,何事、何时起、频次、时长、身体反应、现在是否仍被牵动,事件、模式、形伤的程度,患者不愿说的部分,切诊,脉象（由具备资质者）、胸腹按之是否痞满、手足温凉,脏腑功能的倾向；气结与气下的佐证,单独作为判断依据,一致,望、闻、问、切指向同一方向，且与形伤相符,按该方向定落点，进入处置,72 小时,冲突,两条链指向相反（如自述「没事」而望闻俱见气消）,以客观链为准，追问一次冲突点，仍冲突则记录冲突,24 小时,不足,关键问点被回避，或患者无法作答（意识、认知、语言）,改用旁证：家属描述、既往记录、行为观察,当班内补,越界,幻觉、妄想、木僵、意识改变、拒食拒水、自伤念头或计划,不按本组处理，立即按制度转介,即时]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [4,4]
  );
});

test('四个入口按正文顺序读出：望神 → 闻声 → 问情 → 切诊', () => {
  assert.deepStrictEqual(M.entries(), ["望神","闻声","问情","切诊"]);
});

test('三组证据状态与越界行按正文顺序读出', () => {
  assert.deepStrictEqual(M.states(), ["一致","冲突","不足","越界"]);
});

test('失效模式清单按正文顺序读出：4 条', () => {
  assert.deepStrictEqual(M.failures(), ["把评估做成审讯","只采自述，不采旁证","以量表代替谈话","延误转诊"]);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ["问情是主干，其余三条是校正","量表之后必须有一次不带表格的谈话","护士最难学的技术是闭嘴"]) assert.ok(DOC.includes(s), `缺：${s}`);
});

test('quiz 结构：≥5 题、pre/check/post 齐、4 选项不重复、correct 合法、explain ≥30 汉字', () => {
  const qs = QUIZ.questions;
  assert.ok(Array.isArray(qs) && qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  assert.ok(qs.filter((x) => x.stage === 'check').length >= 2, 'check 题不足 2 道');
  for (const item of qs) {
    assert.ok(Array.isArray(item.options) && item.options.length === 4, `选项数不对：${item.question}`);
    assert.strictEqual(new Set(item.options).size, 4, `选项重复：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, `correct 下标非法：${item.question}`);
    assert.ok(hanzi(item.explain) >= 30, `explain 过短（${hanzi(item.explain)} 字）：${item.question}`);
    assert.ok(hanzi(item.question) >= 8, `题干过短：${item.question}`);
  }
  assert.strictEqual(QUIZ.lesson, M.SLUG);
  assert.strictEqual(QUIZ.subject, '06-zhongyi-xinli-xue');
});

test('quiz 的 check 题在正文落地：至少两道带两个以上原文词组', () => {
  const r = M.quizSummary(QUIZ, DOC);
  assert.ok(r.check >= 2, `check 题只有 ${r.check} 道`);
  assert.ok(r.grounded >= 2, `接地 ${r.grounded} 道`);
  assert.ok(r.rich >= 2, `带两个以上原文词组的只有 ${r.rich} 道`);
});

test('正确答案打散：四个位置都用到，单一位置不超过一半', () => {
  const idx = QUIZ.questions.map((x) => x.correct);
  assert.strictEqual(new Set(idx).size, 4, `未用满四个位置：${idx.join(',')}`);
  const top = Math.max(...[0, 1, 2, 3].map((i) => idx.filter((x) => x === i).length));
  assert.ok(top <= Math.ceil(idx.length / 2), `某一位置占比过高：${idx.join(',')}`);
});

test('quiz 不写剂量、疗程、发生率、页码与脚手架字样', () => {
  const raw = JSON.stringify(QUIZ);
  const BANNED = ['剂' + '量', '疗' + '程', '发生' + '率', '页' + '码',
    '三' + '辨', '四位' + '面', '逐单元' + '读', '本章' + '实' + '测'];
  for (const w of BANNED) {
    assert.strictEqual(raw.includes(w), false, `quiz 出现不该写的词：${w}`);
  }
});

test('命令行可运行：打印章题、规模与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes('第 4 章'), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes('实质段 25 段'), '输出未含实质段数');
});
