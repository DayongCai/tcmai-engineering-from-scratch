'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  analyze,
  readDoc,
  h2Titles,
  tableBlocks,
  occurrences,
  grams,
  sectionAt,
  channels,
  samplingFloors,
  qcLayers,
  fusionLevels,
  compression,
  sdnnImpact,
  CHAPTER,
  SLUG,
  QUIZ,
  TIME_DOMAIN,
} = require('./main.js');

const MAIN = path.join(__dirname, 'main.js');
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;

test('正文在：规模够一章，且章节号与目录一致', () => {
  const text = readDoc();
  assert.ok(hanzi(text) > 2500, `正文过短：${hanzi(text)}`);
  const dir = path.basename(path.dirname(__dirname));
  assert.strictEqual(dir, SLUG);
  assert.match(dir, new RegExp(`^${String(CHAPTER).padStart(2, '0')}`));
});

test('小节结构：七节，末节为「代价与边界」', () => {
  const titles = h2Titles(readDoc());
  assert.strictEqual(titles.length, 7, `小节数 ${titles.length}`);
  assert.match(titles[6], /^七、代价与边界$/);
});

test('六条通道与采样下限由正文表格现读', () => {
  const ch = channels(readDoc());
  assert.strictEqual(ch.length, 6, ch.join('/'));
  for (const k of ['心电 ECG', '光电容积 PPG', '加速度 ACC', '皮温', '压力（脉象）', '图像']) {
    assert.ok(ch.includes(k), `缺通道 ${k}`);
  }
  const f = samplingFloors(readDoc());
  assert.strictEqual(f.length, 6);
  const byName = Object.fromEntries(f.map((x) => [x.channel, x.floor]));
  assert.strictEqual(byName['心电 ECG'], 250);
  assert.strictEqual(byName['光电容积 PPG'], 25);
  assert.strictEqual(byName['皮温'], 0.1);
  assert.strictEqual(byName['压力（脉象）'], 100);
});

test('质控三层是信号、设备、人，缺一层就断链', () => {
  const q = qcLayers(readDoc());
  assert.deepStrictEqual(q, ['信号层', '设备层', '人的一层']);
});

test('融合三层：数据级、特征级、决策级', () => {
  const f = fusionLevels(readDoc());
  assert.strictEqual(f.length, 3, f.join('/'));
  for (const k of ['数据级融合', '特征级融合', '决策级融合']) assert.ok(f.includes(k), k);
});

test('时域五项都在正文出现，且顺序可追', () => {
  const text = readDoc();
  for (const k of TIME_DOMAIN) assert.ok(occurrences(text, k) > 0, `正文没有 ${k}`);
  const sec = sectionAt(text, 3);
  let last = -1;
  for (const k of ['心率', 'SDNN', 'RMSSD', 'pNN50', 'CV']) {
    const at = sec.indexOf(k);
    assert.ok(at > last, `${k} 顺序不对`);
    last = at;
  }
});

test('两百倍压缩由采样点与心搏数现算，并与正文一致', () => {
  const c = compression(readDoc());
  assert.ok(c, '正文未写两百倍那笔账');
  assert.strictEqual(c.samples, 250 * 86400);
  assert.strictEqual(c.beats, 75 * 60 * 24);
  assert.strictEqual(c.beats, 108000);
  assert.strictEqual(c.ratio, 200);
  assert.strictEqual(c.rrWan, 10.8);
  assert.ok(c.ok);
});

test('一个长间歇抬高 SDNN 的算术可复算，与正文的 2,890 / 54 / 67 一致', () => {
  const s = sdnnImpact(readDoc());
  assert.ok(s, '正文未写 SDNN 敏感度那段算式');
  assert.strictEqual(s.variance, ((2500 - 800) ** 2) / 1000);
  assert.strictEqual(s.variance, 2890);
  assert.strictEqual(s.sd, 54);
  assert.strictEqual(s.combined, 67);
  assert.ok(s.ratio > 1.6 && s.ratio < 1.8, `抬高倍数 ${s.ratio}`);
  assert.ok(s.ok);
});

test('滤波两处陷阱写进了同一节：零相位与工频陷波', () => {
  const sec = sectionAt(readDoc(), 1);
  assert.ok(sec.includes('零相位'), '未写零相位');
  assert.ok(sec.includes('陷波'), '未写工频陷波');
  assert.ok(sec.includes('0.05 Hz'), '未写诊断用途的截止频率');
});

test('quiz 结构：≥5 题、三段齐、4 选项、correct 合法、explain ≥30 汉字', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const qs = q.questions;
  assert.ok(qs.length >= 5, `只有 ${qs.length} 题`);
  const stages = new Set(qs.map((x) => x.stage));
  for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
  for (const item of qs) {
    assert.strictEqual(item.options.length, 4, `选项数不对：${item.question}`);
    assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, 'correct 下标非法');
    assert.ok(hanzi(item.explain) >= 30, `explain 过短：${item.question}`);
  }
});

test('quiz 的 check 题至少两道能在正文中找到四字原词', () => {
  const r = analyze();
  assert.ok(r.quiz.grounded >= 2, `接地 ${r.quiz.grounded} 道`);
  for (const h of r.quiz.hits) assert.ok(h.grams.length > 0, `未接地：${h.question}`);
});

test('正确选项不集中在同一个下标（答案已打散）', () => {
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const idx = q.questions.map((x) => x.correct);
  assert.ok(new Set(idx).size >= 3, `正确答案只落在 ${new Set(idx).size} 个位置`);
});

test('quiz 与正文同源：check 题正确选项带两个以上原文词组', () => {
  const body = grams(readDoc());
  const q = JSON.parse(fs.readFileSync(QUIZ, 'utf8'));
  const rich = q.questions
    .filter((x) => x.stage === 'check')
    .filter((x) => new Set([...grams(String(x.options[x.correct]))].filter((g) => body.has(g))).size >= 2);
  assert.ok(rich.length >= 2, `只有 ${rich.length} 道 check 题带两个以上原文词组`);
});

test('命令行可运行，两笔账都做了对账', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.includes(`第 ${CHAPTER} 章`), '输出未含章号');
  assert.match(out, /不构成医学意见/);
  assert.match(out, /200 倍/);
  assert.strictEqual((out.match(/对得上/g) || []).length >= 2, true, '两笔账未都做对账');
});

test('本章的两条边界：不给阈值、不给滤波参数', () => {
  const t = sectionAt(readDoc(), 6);
  assert.ok(t.includes('不构成诊断标准') || t.includes('教学用的示例判据'), '未声明阈值是示例');
  assert.ok(t.includes('以现行标准') || t.includes('以现行'), '未声明参数以现行标准为准');
});

test('单一表格且列数为四：通道、采样率、下限依据、误用', () => {
  const b = tableBlocks(readDoc());
  assert.strictEqual(b.length, 1);
  assert.strictEqual(b[0].head.length, 4);
  assert.strictEqual(b[0].rows.length, 6);
});
