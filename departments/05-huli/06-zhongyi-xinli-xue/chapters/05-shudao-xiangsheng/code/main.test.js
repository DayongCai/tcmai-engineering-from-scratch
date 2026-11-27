'use strict';

/**
 * 第 5 章 以情胜情是把情绪当药用，所以它比用药更危险 —— 确定性单元测试
 * 运行: node --test chapters/05-shudao-xiangsheng/code/main.test.js
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
  assert.strictEqual(M.CHAPTER, '5');
  assert.strictEqual(M.TITLE, '以情胜情是把情绪当药用，所以它比用药更危险');
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

test('正文规模：2810 汉字 · 实质段 19 段／1801 字', () => {
  const r = M.analyze();
  assert.strictEqual(r.hanzi, 2810);
  assert.strictEqual(r.paragraphs, 23);
  assert.strictEqual(r.segs, 19);
  assert.strictEqual(r.segHanzi, 1801);
});

test('实质段的计数规则：以换行分隔、35 汉字起算，标题与表格行不计', () => {
  const p34 = '乙'.repeat(M.MIN_SEG - 1);
  const p35 = '甲'.repeat(M.MIN_SEG);
  const text = ['# 一节', '| 表头 | 说明 |', '> 引文', '---', p34, p35].join('\n');
  assert.deepStrictEqual(M.substantive(text), [p35]);
  assert.strictEqual(M.paragraphs(text).length, 2);
});

test('占比的分子是命中段汉字，不是命中段数', () => {
  const short = '疏导' + '丙'.repeat(36);
  const long = '丁'.repeat(120);
  const out = M.keywordHits(['疏导'], [short, long]);
  assert.strictEqual(out[0].segs, 1);
  assert.strictEqual(out[0].segHanzi, hanzi(short));
  assert.ok(Math.abs(out[0].share - (hanzi(short) / (hanzi(short) + 120)) * 100) < 1e-9);
});

test('关键词命中：段数与占比全部现算', () => {
  const got = M.keywordHits(M.KEYWORDS).map((k) => ({ word: k.word, segs: k.segs, share: Number(k.share.toFixed(1)) }));
  assert.deepStrictEqual(got, [
    { word: '疏导', segs: 4, share: 21.4 },
    { word: '收束', segs: 4, share: 29.2 },
    { word: '余量', segs: 3, share: 18.4 },
  ]);
});

test('表格：3 张，行数 [接手,承认这件事确实难,「换谁都难受，这几个月你扛得不轻」,「别想那么多」,说出,请他讲具体的一件事，而不是讲感受,「最难受的是哪一天，那天发生了什么」,「你要乐观一点」,重排,把「全都完了」拆成几件具体的事,「眼下最要紧的三件事，我们一件一件看」,「一切都会好起来的」,落地,给一个今天就能做完的小动作,「今晚十点前把灯关了，我来看看你」,「你要调整心态」,悲胜怒,以怆恻苦楚之言感之,怒而气上、刚强不服、劝解不入,可能转为悲郁,恐胜喜,以恐惧死亡之言怖之,过喜而气缓、心神涣散、不知节制,强烈的应激反应,怒胜思,以污辱欺罔之言触之,思虑气结日久、诸法不动,损害信任关系,喜胜悲,以谑浪亵狎之言娱之,悲忧气消、闭门不出,显得轻慢、不被接受,思胜恐,以虑彼志此之言夺之,恐惧气下、遇事无主,转为过度思虑,可用,诊断明确、偏盛单一、心气不虚、无心血管与精神科病史、施术者在场,可考虑温和类手法（喜胜悲、思胜恐），并预设收束与中止,经培训并具备资质者，护理配合观察,慎用,年老体弱、有慢性躯体病、情绪脆弱易崩、治疗关系尚未建立,只用言语疏导与移情易性，不主动制造情绪刺激,护理层可做前半段，相胜部分报医师,禁用,心血管疾病、癫痫、精神病性症状、重度抑郁、孕产期、有自伤或伤人念头、正在经历重大丧失的急性期,不施术；按常规照护与转介处理,—]', () => {
  assert.deepStrictEqual(
    M.tableBlocks(DOC).map((b) => b.rows.length),
    [4,5,3]
  );
});

test('四步疏导按正文顺序读出：接手 → 说出 → 重排 → 落地', () => {
  assert.deepStrictEqual(M.fourSteps(), ["接手","说出","重排","落地"]);
});

test('五条相胜对应按正文顺序读出', () => {
  assert.deepStrictEqual(M.xiangsheng(), ["悲胜怒","恐胜喜","怒胜思","喜胜悲","思胜恐"]);
});

test('可用／慎用／禁用三组按正文顺序读出', () => {
  assert.deepStrictEqual(M.groups(), ["可用","慎用","禁用"]);
});

test('失效模式清单按正文顺序读出：4 条', () => {
  assert.deepStrictEqual(M.failures(), ["把心理问题当思想问题","情志相胜误用","以共情代诊疗","延误转诊"]);
});

test('本章的判据句原样在正文里', () => {
  for (const s of ["判组的关键不在病名","缺了收束，手法就从治疗变成了刺激","护理层不做强刺激类手法的施术者"]) assert.ok(DOC.includes(s), `缺：${s}`);
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
  assert.ok(out.includes('第 5 章'), '输出未含章号');
  assert.ok(out.includes(M.TITLE), '输出未含章题');
  assert.match(out, /由本章正文现算/);
  assert.match(out, /不构成医学意见/);
  assert.ok(out.includes('实质段 19 段'), '输出未含实质段数');
});
