#!/usr/bin/env node
/**
 * tests/test_chenruchun_lectures.js — 《验证-伤寒论》交付物的硬证据（全 24 讲版）
 *
 * 这份交付物的价值全在「引用能不能查」上，所以测的也全是这一件事：
 *   1. 每条讲稿引用都必须指向读屏样本里真实存在的那一条（讲次 + 时间码 + 序号互相印证）
 *   2. 「24 讲都读了」要能核：除第 19 讲（密样本单列）与第 8 讲（与第 6 讲同源）外，
 *      每一讲都必须有读到的样本 —— 不许只在文档里说读了
 *   3. 每张表都必须带「病理生理学家 hermesagent」的独立理解块（没带就是没做要求的那部分）
 *   4. 与上一份《伤寒论临床应用.xlsx》的对读钉在具体版本上（sha256 + 快照），逐条可回查
 *   5. 底本交叉、33 方覆盖、逐讲统计的数字都能独立重算
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const MAT = path.join(ROOT, 'standards', 'materials', 'chenruchun-lectures');
const SRC = path.join(MAT, 'sources');
const PAGE = path.join(SRC, 'bilibili-video-page.html');
const SAMPLES19 = path.join(SRC, 'subtitle-samples.json');
const COURSES = path.join(SRC, 'subtitle-samples-courses.json');
const META_LEC = path.join(SRC, 'meta-lectures.json');
const EPISODES = path.join(SRC, 'episodes.json');
const FINGERPRINTS = path.join(SRC, 'fingerprints-lectures.json');
const PREV_SNAP = path.join(SRC, 'prev-clinical-application.json');
const MAP = path.join(MAT, 'source-map.json');
const MD19 = path.join(MAT, '讲稿抽读.md');
const MDCOURSE = path.join(MAT, '讲稿抽读-全课程.md');
const PERSONA = '病理生理学家 hermesagent';

let passed = 0;
const failures = [];
const warnings = [];
function test(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (e) { failures.push({ name, err: e }); console.log(`  ✗ ${name}\n      ${e.message}`); }
}

console.log('═══ 《验证-伤寒论》交付物（全 24 讲）═══\n');

const { readWorkbook } = require('../scripts/lib_xlsx');
const sourceMap = JSON.parse(fs.readFileSync(MAP, 'utf8'));
const s19 = JSON.parse(fs.readFileSync(SAMPLES19, 'utf8'));
const course = JSON.parse(fs.readFileSync(COURSES, 'utf8'));
// 补采样本（gap-frames 抓帧读出）：比 540 条样本更晚加入，必须和它们一起被核
const GAP = path.join(SRC, 'subtitle-samples-gap.json');
const gapDoc = fs.existsSync(GAP) ? JSON.parse(fs.readFileSync(GAP, 'utf8')) : { samples: [] };
const meta = JSON.parse(fs.readFileSync(META_LEC, 'utf8'));
const episodes = JSON.parse(fs.readFileSync(EPISODES, 'utf8')).episodes;
const fingerprints = JSON.parse(fs.readFileSync(FINGERPRINTS, 'utf8')).files;
const prevSnap = JSON.parse(fs.readFileSync(PREV_SNAP, 'utf8'));
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');

// 交付物按仓库口径重建到临时目录
const TMP = path.join(os.tmpdir(), `tcmai-lectures-${process.pid}`);
fs.mkdirSync(TMP, { recursive: true });
const OUT = path.join(TMP, '验证-伤寒论.xlsx');
const run = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'import_chenruchun_lectures.js'), '--out', OUT], { encoding: 'utf8' });
if (run.status !== 0) {
  console.error(`✗ 生成失败：\n${run.stderr || run.stdout}`);
  process.exit(1);
}
const wb = readWorkbook(OUT);
const sheet = (n) => wb.sheets.find((s) => s.name === n);
const cellStr = (v) => String(v === undefined || v === null ? '' : v).trim();

const EXPECTED = ['00目录', '01学法', '02学术思想', '03分析逻辑', '04本讲方证', '05讲稿抽读', '06全课程抽读', '07八法体系', '08底本交叉', '09全课程方证交叉', '10对读验证', '11病理生理对读', '12讲稿全文·19讲', '13讲稿全文·全课程', '14字幕对照校核', '16术语纠错表', '17溯源'];
/** 以「正文/对照」为内容的表：里面的时间码是数据，不做「每条都得是字幕」的约束（另有一套 ASR 断言） */
const EVIDENCE_SHEETS = ['12讲稿全文·19讲', '13讲稿全文·全课程', '14字幕对照校核'];

function bodyRows(name) {
  const rows = sheet(name).rows.slice(1);
  const cut = rows.findIndex((r) => cellStr(r[0]) === '※');
  return (cut < 0 ? rows : rows.slice(0, Math.max(0, cut - 1))).filter((r) => r.some((c) => cellStr(c) !== ''));
}
function personaRows(name) {
  return sheet(name).rows.filter((r) => /^H\d+$/.test(cellStr(r[0])));
}

// ── 1. 源、指纹、以及「24 讲都读了」 ──────────────────────────────────
console.log('[1] 源与指纹');

test('source-map 里的指纹都等于文件当前 sha256', () => {
  assert.strictEqual(sourceMap.source.page.sha256, sha(PAGE));
  assert.strictEqual(sourceMap.source.subtitles.lecture19.sha256, sha(SAMPLES19));
  assert.strictEqual(sourceMap.source.subtitles.courses.sha256, sha(COURSES));
  assert.strictEqual(sourceMap.source.videoFiles.committed, false, '约 3 GB 的视频不该入库');
  assert.ok(sourceMap.source.subtitles.apiNote.includes('空'), '必须写清字幕接口返回空这件事');
  assert.ok(sourceMap.source.subtitles.filter.includes('Otsu'), '有字判据必须写进溯源');
});

test('fingerprints-lectures.json 记的每个 sha256 都与文件一致', () => {
  for (const [f, rec] of Object.entries(fingerprints)) {
    if (f === 'grids') continue;
    const p = path.join(SRC, f);
    assert.ok(fs.existsSync(p), `缺文件 ${f}`);
    assert.strictEqual(rec.sha256, sha(p), `${f} 指纹不符`);
  }
  assert.ok(Object.keys(fingerprints.grids).length >= 24, `拼图只记了 ${Object.keys(fingerprints.grids).length} 张`);
});

test('第 19 讲密样本自洽：序号连续、时间递增、都在片长内、拼图都在', () => {
  const arr = s19.samples;
  assert.strictEqual(arr.length, s19.coverage.sampled);
  const dur = sourceMap.perLecture.find((l) => l.no === 19).durMeasured;
  arr.forEach((s, i) => {
    assert.strictEqual(s.idx, i + 1, `第 ${i + 1} 条 idx 不连续`);
    if (i) assert.ok(s.sec > arr[i - 1].sec, `第 ${s.idx} 条时间未递增`);
    assert.ok(s.sec >= 0 && s.sec <= dur, `第 ${s.idx} 条超出片长`);
    assert.ok(fs.existsSync(path.join(SRC, 'grids', s.grid)), `缺拼图 ${s.grid}`);
  });
  assert.strictEqual(arr.filter((s) => s.line).length, s19.coverage.withText);
});

test('全课程样本自洽：每讲 20 条、时间递增、拼图都在、全部有字', () => {
  const arr = course.samples;
  assert.strictEqual(arr.length, course.coverage.samples);
  assert.strictEqual(arr.length, course.coverage.lecturesRead * 20, '不是每讲 20 条');
  const byLec = {};
  arr.forEach((s) => { byLec[s.lecture] = (byLec[s.lecture] || 0) + 1; });
  Object.entries(byLec).forEach(([lec, n]) => assert.strictEqual(n, 20, `第 ${lec} 讲只有 ${n} 条`));
  const perLec = {};
  arr.forEach((s) => {
    const dur = sourceMap.perLecture.find((l) => l.no === s.lecture).durMeasured;
    assert.ok(s.sec >= 0 && s.sec <= dur, `${s.idx} 超出第 ${s.lecture} 讲片长`);
    assert.ok(s.line && s.line.length > 0, `${s.idx} 是空行（本批应全部有字）`);
    assert.ok(fs.existsSync(path.join(SRC, 'grids', s.grid)), `缺拼图 ${s.grid}`);
    if (perLec[s.lecture]) assert.ok(s.sec > perLec[s.lecture], `${s.idx} 时间未递增`);
    perLec[s.lecture] = s.sec;
  });
});

test('「24 讲都读了」可核：除第 19 讲（密样本）与第 8 讲（同源）外，每讲都有样本', () => {
  const read = new Set(course.samples.map((s) => s.lecture));
  const dupes = course.duplicateLectures.map((d) => d.no);
  const missing = [];
  for (let n = 1; n <= 24; n += 1) {
    if (n === 19 || dupes.includes(n)) continue;
    if (!read.has(n)) missing.push(n);
  }
  assert.deepStrictEqual(missing, [], `以下讲没有读到的样本：${missing.join('、')}`);
  assert.strictEqual(read.size + 1 + dupes.length, 24, '读到的讲 + 第19讲 + 同源讲 ≠ 24');
});

test('逐讲实测与页面标注时长一致（≤5s），且实测合计等于 source-map', () => {
  let total = 0;
  episodes.forEach((e) => {
    const l = sourceMap.perLecture.find((x) => x.no === e.no);
    assert.ok(l, `source-map 缺第 ${e.no} 讲`);
    assert.ok(Math.abs(e.dur - l.durMeasured) <= 5, `第 ${e.no} 讲 页面 ${e.dur}s / 实测 ${l.durMeasured}s`);
    total += l.durMeasured;
  });
  assert.strictEqual(total, sourceMap.season.totalDurMeasured);
  assert.strictEqual(total, sourceMap.perLecture.reduce((a, l) => a + l.durMeasured, 0));
});

test('第 8 讲与第 6 讲同源这件事有可重算的证据（统计逐位相同）', () => {
  const d = course.duplicateLectures;
  assert.strictEqual(d.length, 1, `同源讲记录 ${d.length} 条`);
  assert.strictEqual(d[0].no, 8);
  assert.strictEqual(d[0].duplicateOf, 6);
  const a = meta.lectures.find((l) => l.no === 6);
  const b = meta.lectures.find((l) => l.no === 8);
  assert.strictEqual(a.frames, b.frames);
  assert.strictEqual(a.stableSegments, b.stableSegments);
  assert.strictEqual(a.textSegments, b.textSegments);
  assert.strictEqual(a.outlinedThreshold, b.outlinedThreshold);
  assert.strictEqual(b.samplesRead, 0, '同源讲不该计入读到的样本');
});

test('逐讲统计自洽：totals 等于逐讲相加，覆盖率都是满的', () => {
  const sum = (k) => meta.lectures.reduce((a, l) => a + l[k], 0);
  ['frames', 'stableSegments', 'textSegments', 'picks', 'samplesRead'].forEach((k) => {
    assert.strictEqual(sum(k), meta.totals[k], `${k} 合计不符`);
  });
  meta.lectures.forEach((l) => assert.ok(l.coverageRatio >= 0.99, `第 ${l.no} 讲覆盖率 ${l.coverageRatio}`));
});

// ── 2. 交付物形状 + 每表都带 hermesagent 总结 ────────────────────────
console.log('\n[2] 交付物形状');

test('16 个工作表，名字与顺序固定', () => {
  assert.deepStrictEqual(wb.sheets.map((s) => s.name), EXPECTED);
});

test('每张表都带「病理生理学家 hermesagent」的独立理解块（本次要求）', () => {
  EXPECTED.forEach((name) => {
    const text = sheet(name).rows.map((r) => r.join(' ')).join('\n');
    assert.ok(text.includes(`${PERSONA} 的独立理解总结`), `${name} 缺总结标题行`);
    const h = personaRows(name);
    assert.ok(h.length >= 3, `${name} 的独立理解只有 ${h.length} 条`);
    assert.ok(h.every((r) => r.some((c) => /测量事实|推论|比较|边界|估算|要求|提示|判断/.test(cellStr(c)))), `${name} 的独立理解没写证据等级`);
  });
});

test('00目录 的行数/字数等于分表实测（不接受手写数字）', () => {
  // 计数口径 = 整张表的实际行数与字数（含 persona 块与「◆ 语音正文出处」块），不手写、不挑行
  const toc = bodyRows('00目录').map((r) => r.map(cellStr));
  let seen = 0;
  toc.forEach((row) => {
    const name = row[1];
    if (!EXPECTED.includes(name)) return;
    seen += 1;
    const body = sheet(name);
    const dataRows = body.rows.length - 1;
    const chars = body.rows.slice(1).reduce((a, r) => a + r.reduce((x, c) => x + cellStr(c).replace(/\s/g, '').length, 0), 0);
    assert.strictEqual(Number(row[4]), dataRows, `${name} 含总结行数 ${row[4]} ≠ 实测 ${dataRows}`);
    assert.ok(Number(row[3]) < Number(row[4]), `${name} 本体行数应小于含总结行数`);
    assert.strictEqual(Number(row[5]), chars, `${name} 字数 ${row[5]} ≠ 实测 ${chars}`);
  });
  assert.strictEqual(seen, EXPECTED.length, `00目录 索引了 ${seen} 张表`);
});

// ── 3. 引用必须指得到原话 ─────────────────────────────────────────────
console.log('\n[3] 引用的可核性');

/** 「《讲稿》第N讲 mm:ss（读屏 N-NN）」或「《讲稿》本讲 mm:ss（读屏 #NN）」 */
const CITE_RE = /《讲稿》(本讲|第\d+讲) (\d+:\d{2})（读屏 (#\d+|\d+-\d+)）/g;
const look19 = (id) => s19.samples[id - 1];
const lookCourse = (idx) => course.samples.find((s) => s.idx === idx);
/** 一条引用必须三处同时对上：讲次、时间码、样本序号；找不到就抛 */
function assertCite(one, name) {
  const m = /《讲稿》(本讲|第\d+讲) (\d+:\d{2})（读屏 (#\d+|\d+-\d+)）/.exec(one);
  assert.ok(m, `${name}: 引用格式不对：${one}`);
  const [, where, mm, raw] = m;
  if (where === '本讲') {
    const s = look19(Number(raw.replace('#', '')));
    assert.ok(s, `${name}: 读屏 ${raw} 不存在`);
    assert.strictEqual(s.mmss, mm, `${name}: ${raw} 的时间码是 ${s.mmss}，写成了 ${mm}`);
    assert.ok(s.line, `${name}: ${raw} 是无字幕样本，不能作为引用`);
    return s;
  }
  const s = lookCourse(raw);
  assert.ok(s, `${name}: 读屏 ${raw} 不存在`);
  assert.strictEqual(s.mmss, mm, `${name}: ${raw} 的时间码是 ${s.mmss}，写成了 ${mm}`);
  assert.strictEqual(`第${s.lecture}讲`, where, `${name}: ${raw} 实际属于第 ${s.lecture} 讲，写成了 ${where}`);
  assert.ok(s.line, `${name}: ${raw} 是空样本，不能作为引用`);
  return s;
}

test('所有讲稿引用都能在样本里逐字对上（讲次 + 时间码 + 序号三处一致）', () => {
  let total = 0;
  EXPECTED.filter((n) => !['05讲稿抽读', '06全课程抽读', ...EVIDENCE_SHEETS].includes(n)).forEach((name) => {
    sheet(name).rows.forEach((r) => {
      const text = String(r.join(' '));
      (text.match(CITE_RE) || []).forEach((one) => { assertCite(one, name); total += 1; });
    });
  });
  assert.ok(total >= 60, `全表只有 ${total} 处讲稿引用，疑漏引`);
});

test('凡写了「第N讲 mm:ss」而没带读屏序号的，也必须查得到', () => {
  EXPECTED.filter((n) => !['05讲稿抽读', '06全课程抽读', ...EVIDENCE_SHEETS].includes(n)).forEach((name) => {
    const all = sheet(name).rows;
    const at = all.findIndex((r) => cellStr(r[0]) === '◆');   // ◆ 块的时间码是段级定位，由 [10] 单独核
    (at < 0 ? all : all.slice(0, at)).forEach((r) => {
      const text = String(r.join(' '));
      (text.match(/第(\d+)讲 (\d+:\d{2})/g) || []).forEach((one) => {
        if (/（读屏/.test(text.slice(text.indexOf(one), text.indexOf(one) + 40))) return;
        const [, lec, mm] = /第(\d+)讲 (\d+:\d{2})/.exec(one);
        const ok = Number(lec) === 19
          ? s19.samples.some((s) => s.mmss === mm && s.line)
          : course.samples.some((s) => s.lecture === Number(lec) && s.mmss === mm && s.line);
        assert.ok(ok, `${name}: 第${lec}讲 ${mm} 不是有字的样本时间码`);
      });
    });
  });
});

test('05讲稿抽读 与第 19 讲样本一一对应（时间码与原文都不许改）', () => {
  const rows = bodyRows('05讲稿抽读');
  assert.strictEqual(rows.length, s19.samples.length);
  rows.forEach((r, i) => {
    const s = s19.samples[i];
    assert.strictEqual(Number(r[0]), s.idx, `第 ${i + 1} 行序号不符`);
    assert.strictEqual(cellStr(r[1]), s.mmss, `第 ${i + 1} 行时间码不符`);
    if (s.line) assert.strictEqual(cellStr(r[2]), s.line, `第 ${i + 1} 行原文被改过`);
    else assert.ok(cellStr(r[2]).includes('无字幕'), `第 ${i + 1} 行应标无字幕`);
    assert.strictEqual(cellStr(r[3]), s.grid);
  });
});

test('06全课程抽读 与全课程样本一一对应（440 条，讲次与原文都不许改）', () => {
  const rows = bodyRows('06全课程抽读');
  assert.strictEqual(rows.length, course.samples.length);
  rows.forEach((r, i) => {
    const s = course.samples[i];
    assert.strictEqual(Number(r[0]), i + 1, `第 ${i + 1} 行序号不符`);
    assert.strictEqual(cellStr(r[1]), `第${s.lecture}讲`, `第 ${i + 1} 行讲次不符`);
    assert.strictEqual(cellStr(r[2]), s.mmss, `第 ${i + 1} 行时间码不符`);
    assert.strictEqual(cellStr(r[3]), s.line, `第 ${i + 1} 行原文被改过`);
    assert.strictEqual(cellStr(r[4]), s.grid);
  });
});

test('读屏样本里那些「形近字存疑」的地方没有被偷偷改写成通顺版本', () => {
  const lines19 = s19.samples.map((s) => s.line).filter(Boolean);
  const linesCourse = course.samples.map((s) => s.line);
  assert.ok(lines19.includes('我们正常的人是甜睡了'), '「甜睡」是读屏所见，不该被改成「酣睡」');
  assert.ok(s19.caveats.some((c) => c.includes('甜睡')), 'caveats 里必须留痕');
  assert.ok(linesCourse.includes('甘草泻心汤铺头可以治疗西医讲的三联症'), '「铺头」是读屏所见，不该被改写');
  assert.ok(sha(COURSES).length === 64);
  assert.ok(sheet('17溯源').rows.map((r) => r.join(' ')).join(' ').includes('形近'), '溯源里必须留形近字风险');
});

// ── 4. 底本交叉与逐讲实测可独立重算 ──────────────────────────────────
console.log('\n[4] 底本交叉与逐讲实测');

test('08底本交叉 的命中数可用《伤寒论》底本独立重算（抽查四逆汤与白通汤）', () => {
  const base = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'shanghan', '底本.json'), 'utf8'));
  const texts = base.pian.flatMap((p) => (p.items || []).map((it) => it.text));
  const rows = sheet('08底本交叉').rows.slice(1).map((r) => ({ name: cellStr(r[1]), hits: Number(r[2]) }));
  const si = rows.find((r) => r.name === '四逆汤');
  assert.strictEqual(si.hits, texts.filter((t) => t.includes('四逆汤') && !/四逆加人参汤|通脉四逆汤|茯苓四逆汤/.test(t)).length);
  const bt = rows.find((r) => r.name === '白通汤');
  assert.strictEqual(bt.hits, texts.filter((t) => t.includes('白通汤')).length);
});

test('未命中的方必须写清是哪一类（后世方），不许留空', () => {
  const rows = bodyRows('08底本交叉');
  assert.strictEqual(rows.length, sourceMap.baseLink.formulas.length);
  const miss = rows.filter((r) => Number(r[2]) === 0);
  assert.ok(miss.length >= 2, `未命中只有 ${miss.length} 首`);
  miss.forEach((r) => assert.ok(/后世方/.test(cellStr(r[3])), `${cellStr(r[1])} 未命中却没说原因`));
});

test('07八法体系 覆盖 24 讲，法类统计与 source-map 一致，时长取实测值', () => {
  const rows = bodyRows('07八法体系');
  assert.strictEqual(rows.length, 24, `只有 ${rows.length} 讲`);
  const agg = {};
  rows.forEach((r) => { const fa = cellStr(r[4]); agg[fa] = (agg[fa] || 0) + 1; });
  assert.deepStrictEqual(agg, sourceMap.season.faAgg);
  // 第 5 讲实测只有 1173s，若写成页面口径会露馅
  const l5 = sourceMap.perLecture.find((l) => l.no === 5);
  assert.strictEqual(l5.durMeasured, 1173);
  const row5 = rows.find((r) => cellStr(r[1]).startsWith('第 5 讲'));
  assert.strictEqual(cellStr(row5[3]), '19:33', `第 5 讲时长写成 ${cellStr(row5[3])}`);
});

// ── 5. 33 方覆盖（09表）──────────────────────────────────────────────
console.log('\n[5] 全课程方证交叉');

test('09表 覆盖上一份 33 首方，每首都有判定，没有「待定」', () => {
  const rows = bodyRows('09全课程方证交叉');
  assert.strictEqual(rows.length, prevSnap.formulas.length, `${rows.length} 行 ≠ 上一份 ${prevSnap.formulas.length} 首方`);
  prevSnap.formulas.forEach((f, i) => {
    assert.strictEqual(cellStr(rows[i][1]), f.name, `第 ${i + 1} 行方名不符`);
    assert.strictEqual(Number(rows[i][2]), f.mu, `${f.name} 目数不符`);
    const v = cellStr(rows[i][5]);
    assert.ok(v && !v.includes('待定'), `${f.name} 判定缺失：${v}`);
    assert.ok(/题名|讲稿|未覆盖/.test(v), `${f.name} 判定不成句：${v}`);
  });
});

test('09表 的判定可用别名表独立重算（抽查葛根黄芩黄连汤、当归四逆汤、五苓散）', () => {
  const rows = bodyRows('09全课程方证交叉');
  const of = (n) => rows.find((r) => cellStr(r[1]) === n);
  const titlesOf = (keys) => sourceMap.perLecture.filter((l) => keys.some((k) => l.title.includes(k))).map((l) => l.no);
  // 葛根黄芩黄连汤：第 16 讲题名写「葛根芩连汤」
  const g = of('葛根黄芩黄连汤');
  assert.deepStrictEqual(g ? cellStr(g[3]) : '', (titlesOf(['葛根黄芩黄连汤', '葛根芩连汤']) || []).map((n) => `第${n}讲`).join('、'));
  // 当归四逆汤：第 9、20 讲题名出现
  const d = of('当归四逆汤');
  assert.ok(cellStr(d[3]).includes('第20讲'), `当归四逆汤题名覆盖写成 ${cellStr(d[3])}`);
  assert.ok(cellStr(d[4]).includes('第24讲'), '当归四逆汤应有一条第 24 讲的讲稿证据');
  // 五苓散：第 22 讲题名「五苓散与桂枝汤」
  const w = of('五苓散');
  assert.ok(cellStr(w[3]).includes('第22讲'), `五苓散题名覆盖写成 ${cellStr(w[3])}`);
});

test('未覆盖的方逐首列在 source-map 里，且计数与表一致', () => {
  const rows = bodyRows('09全课程方证交叉');
  const notCovered = rows.filter((r) => cellStr(r[5]).startsWith('本 24 讲未覆盖')).map((r) => cellStr(r[1]));
  assert.deepStrictEqual(notCovered, sourceMap.crossCheck.notCovered);
  assert.strictEqual(rows.length - notCovered.length, sourceMap.crossCheck.covered);
  assert.ok(sourceMap.crossCheck.dual <= sourceMap.crossCheck.covered);
});

// ── 6. 对读验证（钉在上一份的具体版本上）─────────────────────────────
console.log('\n[6] 对读验证');

test('快照钉住了上一份交付物的 sha256，且与 source-map 一致', () => {
  assert.strictEqual(prevSnap.prevDeliverable.sha256.length, 64);
  assert.strictEqual(sourceMap.prevDeliverable.sha256, prevSnap.prevDeliverable.sha256);
  assert.ok(sourceMap.prevDeliverable.inferenceRows >= 9, '上一份自报待核的推断条目至少 9 条');
  if (!fs.existsSync(prevSnap.prevDeliverable.path)) {
    warnings.push('上一份交付物不在本机 → 本次按仓库快照生成，快照 sha256 即被验证版本');
  } else {
    assert.strictEqual(sha(prevSnap.prevDeliverable.path), prevSnap.prevDeliverable.sha256, '本机那一份与快照不同');
  }
});

test('10表 把上一份的推断条目逐条对上（9 条里至少 8 条有对应行）', () => {
  const text = sheet('10对读验证').rows.map((r) => r.join(' ')).join('\n');
  const keys = ['当归四逆汤', '真武汤', '小柴胡汤', '桂枝汤', '以西释中', '中医的路怎么走', '合方依据', '误治', '由外感推内伤', '寒热错杂', '妇科三线', '汗的异常', '气化', '剂量即变量', '方法边界'];
  const miss = keys.filter((k) => !text.includes(k));
  assert.deepStrictEqual(miss, [], `10表 缺以下条目的对读：${miss.join('、')}`);
  assert.strictEqual(bodyRows('10对读验证').length, sourceMap.crossCheck.verifyRows, '10表 行数与 source-map 不符');
});

test('10表 的判定只有四种状态，且「部分覆盖」必须说明为什么', () => {
  const rows = bodyRows('10对读验证');
  const allowed = /一致|升级|部分覆盖|未覆盖|否证/;
  rows.forEach((r) => {
    const v = cellStr(r[3]);
    assert.ok(allowed.test(v), `判定不成句：${v}`);
    if (v.startsWith('部分覆盖')) {
      assert.ok(cellStr(r[4]).length > 30, `「部分覆盖」必须写清覆盖到哪、差在哪：${cellStr(r[4])}`);
    }
  });
  const partial = rows.filter((r) => cellStr(r[3]).startsWith('部分覆盖')).length;
  assert.strictEqual(partial, 2, `部分覆盖应为 2 条（寒热错杂分界、妇科三线），实际 ${partial}`);
});

test('10表 里每条引用的时间码都指得到原话（含跨 24 讲）', () => {
  const rows = bodyRows('10对读验证');
  let n = 0;
  rows.forEach((r) => {
    (String(r[2]).match(CITE_RE) || []).forEach((one) => { assertCite(one, '10对读验证'); n += 1; });
  });
  assert.ok(n >= 25, `10表 只有 ${n} 处引用`);
});

// ── 7. 自报边界与可读全本 ─────────────────────────────────────────────
console.log('\n[7] 自报边界与可读全本');

test('17溯源 写清了取稿方式、视频不入库、同源讲、重建命令', () => {
  const kv = new Map(sheet('17溯源').rows.slice(1).map((r) => [cellStr(r[1]), cellStr(r[2])]));
  assert.ok(kv.get('取稿方式').includes('返回空列表'));
  assert.ok(kv.get('有字判据').includes('100%'), '有字判据的实测准确率必须写出来');
  assert.ok(kv.get('视频文件').includes('未入库'));
  assert.ok(kv.get('读屏风险').includes('形近'));
  assert.ok(kv.get('独立理解').includes('不是讲者观点'));
  assert.ok(/第 8 讲/.test(kv.get('第 8 讲同源')), '同源讲必须写在溯源里');
  assert.ok(kv.get('重建命令').includes('import_chenruchun_lectures.js'));
  assert.ok(kv.get('抽样密度').includes('20 条'), '抽样密度必须写出来');
});

test('两份可读全本（第19讲 150 条 / 全课程 440 条）与样本一致，且都带总结', () => {
  const md19 = fs.readFileSync(MD19, 'utf8');
  const rows19 = md19.split('\n').filter((l) => /^\| \d+ \| \d+:\d{2} \| /.test(l));
  assert.strictEqual(rows19.length, s19.samples.length, `讲稿抽读.md 里 ${rows19.length} 行 ≠ 样本 ${s19.samples.length}`);
  assert.ok(md19.includes('不是逐字稿'));
  assert.ok(md19.includes(PERSONA));

  const mdc = fs.readFileSync(MDCOURSE, 'utf8');
  const head = mdc.split('## ')[0];
  const rowsC = head.split('\n').filter((l) => /^\| \d+ \| 第\d+讲 \| /.test(l));
  assert.strictEqual(rowsC.length, course.samples.length, `全课程 md 里 ${rowsC.length} 行 ≠ 样本 ${course.samples.length}`);
  assert.ok(mdc.includes('不是逐字稿'));
  assert.ok(mdc.includes(PERSONA));
  assert.ok(mdc.includes('33 方'), 'md 里应带方证交叉表');
});

// ── 8. 语音转写层（正文）─────────────────────────────────────────────
console.log('\n[8] 语音转写层（正文）');

const ASR_TX = path.join(SRC, 'asr-transcripts.json');
const ASR_META = path.join(SRC, 'meta-asr.json');
const ASR_FP = path.join(SRC, 'fingerprints-asr.json');
const asrDoc = fs.existsSync(ASR_TX) ? JSON.parse(fs.readFileSync(ASR_TX, 'utf8')) : { lectures: [], segments: [], totals: {} };
const asrMeta = fs.existsSync(ASR_META) ? JSON.parse(fs.readFileSync(ASR_META, 'utf8')) : { lectures: [] };
const asrSegs = asrDoc.segments || [];
const asrLecs = asrDoc.lectures || [];

function lcsTest(a, b) {
  const n = a.length; const m = b.length;
  if (!n || !m) return 0;
  let prev = new Uint16Array(m + 1); let cur = new Uint16Array(m + 1);
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    const t = prev; prev = cur; cur = t; cur.fill(0);
  }
  return prev[m];
}
const asrWindowOf = (lecture, sec, before = 1.5, after = 5) => asrSegs
  .filter((s) => s.lecture === lecture && s.end >= sec - before && s.start <= sec + after).map((s) => s.text).join('');

test('14字幕对照校核 覆盖全部人读字幕（第19讲 + 全课程 + 补采帧），时间码逐行一致', () => {
  const rows = bodyRows('14字幕对照校核');
  const capsExpected = [...s19.samples.filter((x) => x.line).map((x) => ({ lec: 19, mmss: x.mmss, line: x.line })),
    ...course.samples.map((x) => ({ lec: x.lecture, mmss: x.mmss, line: x.line })),
    ...gapDoc.samples.map((x) => ({ lec: x.lecture, mmss: x.mmss, line: x.line }))];
  assert.strictEqual(rows.length, capsExpected.length, `对照表 ${rows.length} 行 ≠ 字幕 ${capsExpected.length} 条`);
  rows.forEach((r, i) => {
    assert.strictEqual(cellStr(r[1]), `第${capsExpected[i].lec}讲`, `第 ${i + 1} 行讲次不符`);
    assert.strictEqual(cellStr(r[2]), capsExpected[i].mmss, `第 ${i + 1} 行时间码不符`);
    assert.strictEqual(cellStr(r[3]), capsExpected[i].line, `第 ${i + 1} 行字幕原文被改过`);
  });
});

test('14表 的召回数字可独立重算（抽查 6 条：有转写的期望 ≥0，未转写的必须是「—」）', () => {
  const rows = bodyRows('14字幕对照校核');
  let checked = 0;
  rows.forEach((r, i) => {
    if (i % 97 !== 0) return;
    checked += 1;
    const lec = Number(/第(\d+)讲/.exec(cellStr(r[1]))[1]);
    const turn = asrLecs.some((l) => l.no === lec);
    const shown = cellStr(r[5]);
    if (!turn) {
      assert.strictEqual(shown, '—', `第 ${i + 1} 行：该讲未转写，召回应写「—」，实际 ${shown}`);
      assert.ok(cellStr(r[4]).includes('未转写'), `第 ${i + 1} 行：未转写要显式写出来`);
      return;
    }
    // 重算：用同一套窗口与 LCS
    const line = cellStr(r[3]);
    const sec = (() => { const [m, s] = cellStr(r[2]).split(':'); return Number(m) * 60 + Number(s); })();
    const win = asrWindowOf(lec, sec);
    const mine = win ? lcsTest(line, win) / line.length : 0;
    assert.ok(Math.abs(mine - Number(shown)) < 0.02, `第 ${i + 1} 行召回 ${shown} ≠ 重算 ${mine.toFixed(2)}`);
  });
  assert.ok(checked >= 5, `只抽查到 ${checked} 条`);
});

test('12/13 两表的正文行数之和 = asr-transcripts.json 段数，且逐行原文不许改', () => {
  const r19 = bodyRows('12讲稿全文·19讲');
  const rc = bodyRows('13讲稿全文·全课程');
  assert.strictEqual(r19.length + rc.length, asrSegs.length, `正文行数 ${r19.length + rc.length} ≠ 语料段数 ${asrSegs.length}`);
  const seg19 = asrSegs.filter((s) => s.lecture === 19);
  const segOther = asrSegs.filter((s) => s.lecture !== 19).sort((a, b) => a.lecture - b.lecture || a.start - b.start);
  r19.forEach((r, i) => {
    assert.strictEqual(cellStr(r[1]), seg19[i].mmss, `12表 第 ${i + 1} 行时间码不符`);
    assert.strictEqual(cellStr(r[2]), seg19[i].text, `12表 第 ${i + 1} 行正文被改过`);
  });
  rc.forEach((r, i) => {
    assert.strictEqual(cellStr(r[1]), `第${segOther[i].lecture}讲`, `13表 第 ${i + 1} 行讲次不符`);
    assert.strictEqual(cellStr(r[2]), segOther[i].mmss, `13表 第 ${i + 1} 行时间码不符`);
    assert.strictEqual(cellStr(r[3]), segOther[i].text, `13表 第 ${i + 1} 行正文被改过`);
  });
});

test('13表 把「尚未转写的讲次」显式写出来（不许静默少几讲）', () => {
  const pending = sourceMap.perLecture.map((l) => l.no).filter((n) => n !== 8 && !asrLecs.some((l) => l.no === n));
  const text = sheet('13讲稿全文·全课程').rows.map((r) => r.join(' ')).join('\n');
  if (!pending.length) {
    assert.ok(/已全部转写完毕|全部完成/.test(text), '全部完成时也要写明');
    return;
  }
  pending.forEach((n) => assert.ok(text.includes(`第 ${n} 讲`) || text.includes(`第${n}讲`), `未完成讲次 第${n}讲 没有出现`));
  assert.ok(/尚未转写|未转写|未完成/.test(text), '缺的讲次要说清是「未转写」');
});

test('07八法体系 的 ASR 列与 meta-asr 一致：转过的写段数/字数，没转的写「未转写」', () => {
  const rows = bodyRows('07八法体系');
  rows.forEach((r) => {
    const no = Number(/第 (\d+) 讲/.exec(cellStr(r[1]))[1]);
    const cell = cellStr(r[6]);
    const done = asrLecs.find((l) => l.no === no);
    if (done) {
      assert.ok(cell.includes(`${done.segments} 段`), `第 ${no} 讲 ASR 列应含段数：${cell}`);
      assert.ok(cell.includes(`${done.chars} 字`), `第 ${no} 讲 ASR 列应含字数：${cell}`);
    } else if (no === 8) {
      assert.ok(cell.includes('同源'), `第 8 讲应写「不转写（与第 6 讲同源）」：${cell}`);
    } else {
      assert.strictEqual(cell, '未转写', `第 ${no} 讲未转写就写「未转写」：${cell}`);
    }
  });
});

test('17溯源 写了语音转写的方法、进度、总量与实测准确度', () => {
  const kv = new Map(sheet('17溯源').rows.slice(1).map((r) => [cellStr(r[1]), cellStr(r[2])]));
  assert.ok(kv.get('语音转写（正文层）'), '缺「语音转写（正文层）」行');
  assert.ok(kv.get('语音转写（正文层）').includes('faster-whisper'), '要写清用的是哪条链');
  assert.ok(kv.get('转写进度').length > 5, '缺「转写进度」行');
  assert.ok(kv.get('两层证据的分工').includes('ASR'), '要写清字幕层与 ASR 层的分工');
  if (asrLecs.length) {
    assert.ok(kv.get('转写总量').includes('小时'), '转写总量要写时长');
    assert.ok(/平均字级召回 \d\.\d{3}/.test(kv.get('转写准确度（实测）')), '准确度要用实测数字：' + kv.get('转写准确度（实测）'));
  }
});

test('已转写的讲：覆盖率 ≥99%（半截音频不许当整讲）', () => {
  asrLecs.forEach((l) => {
    assert.ok(l.coverageRatio === null || l.coverageRatio >= 0.99, `第 ${l.no} 讲覆盖率 ${l.coverageRatio}`);
    assert.ok(l.audioSec > 0 && l.segments > 0 && l.chars > 0, `第 ${l.no} 讲统计不完整`);
  });
  if (fs.existsSync(ASR_FP)) {
    const fp = JSON.parse(fs.readFileSync(ASR_FP, 'utf8')).files;
    for (const [f, rec] of Object.entries(fp)) {
      const p = f.startsWith('asr/') ? path.join(SRC, f) : path.join(SRC, f);
      assert.ok(fs.existsSync(p), `缺文件 ${f}`);
      assert.strictEqual(rec.sha256, sha(p), `${f} 指纹不符`);
    }
  }
});

// ── 9. 术语纠错表（字幕为据）─────────────────────────────────────────
console.log('\n[9] 术语纠错表');

const CAP_JSON = path.join(SRC, 'transcripts', 'corrections-by-captions.json');
const capDoc = fs.existsSync(CAP_JSON) ? JSON.parse(fs.readFileSync(CAP_JSON, 'utf8')) : null;
const capKeys = new Set();
s19.samples.forEach((x) => { if (x.line) capKeys.add(`19|${x.mmss}|${x.line}`); });
course.samples.forEach((x) => capKeys.add(`${x.lecture}|${x.mmss}|${x.line}`));
// 补采样本（gap-frames 抓帧读出）也属于字幕语料
gapDoc.samples.forEach((x) => capKeys.add(`${x.lecture}|${x.mmss}|${x.line}`));

test('16表 行数 = corrections-by-captions.json 的规则数，且证据等级只有三档', () => {
  assert.ok(capDoc, '缺 corrections-by-captions.json（先跑 node scripts/asr/anchor_terms_by_captions.js）');
  const rows = bodyRows('16术语纠错表');
  assert.strictEqual(rows.length, capDoc.rows.length, `16表 ${rows.length} 行 ≠ 规则 ${capDoc.rows.length} 条`);
  const levels = new Set(rows.map((r) => cellStr(r[4])));
  levels.forEach((l) => assert.ok(['字幕直证', '字幕旁证', '仅拼音'].includes(l), `证据等级出现意外值：${l}`));
  const count = (lv) => rows.filter((r) => cellStr(r[4]) === lv).length;
  assert.strictEqual(count('字幕直证'), capDoc.stats.direct);
  assert.strictEqual(count('字幕旁证'), capDoc.stats.indirect);
  assert.strictEqual(count('仅拼音'), capDoc.stats.pinyinOnly);
});

test('16表 每一条「字幕直证」的引用都能在原字幕里逐字查到（不许编依据）', () => {
  const rows = bodyRows('16术语纠错表').filter((r) => cellStr(r[4]) === '字幕直证');
  assert.ok(rows.length >= 10, `直证只有 ${rows.length} 条，疑判定失效`);
  rows.forEach((r) => {
    const cell = cellStr(r[7]);
    const m = /^第(\d+)讲 (\d+:\d{2})（读屏 (#\d+|\d+-\d+|g-\d+-\d+)）「(.+)」$/.exec(cell);
    assert.ok(m, `直证引用格式不对：${cell}`);
    const [, lec, mmss, , line] = m;
    assert.ok(capKeys.has(`${Number(lec)}|${Number(mmss.split(':')[0])}:${String(Number(mmss.split(':')[1])).padStart(2, '0')}|${line}`)
      || capKeys.has(`${Number(lec)}|${mmss}|${line}`), `直证引用查不到原字幕：${cell}`);
  });
});

test('16表 「仅拼音」行必须写明要人工核（不许当成已校正）', () => {
  const rows = bodyRows('16术语纠错表').filter((r) => cellStr(r[4]) === '仅拼音');
  assert.ok(rows.length > 0, '没有仅拼音行？那说明分档失效或数据变了');
  rows.forEach((r) => {
    assert.ok(/人工核|人工判定/.test(cellStr(r[9])), `${cellStr(r[2])}→${cellStr(r[3])} 的处理建议没说清：${cellStr(r[9])}`);
  });
});

test('纠错层不动原件：asr/lec-NN.json 的 sha256 与指纹一致', () => {
  const fp = JSON.parse(fs.readFileSync(path.join(SRC, 'fingerprints-asr.json'), 'utf8')).files;
  const lecFiles = Object.keys(fp).filter((f) => /^asr\/lec-\d+\.json$/.test(f));
  assert.ok(lecFiles.length >= 20, `指纹里只有 ${lecFiles.length} 个讲次原件`);
  lecFiles.forEach((f) => {
    const p = path.join(SRC, f);
    assert.strictEqual(sha(p), fp[f].sha256, `${f} 被改动过（原件必须保持不变）`);
  });
});

// ── 10. 每张表都要有「语音正文出处」块 ──────────────────────────────
console.log('\n[10] 语音正文出处块');

const stampOf = (sec) => { const t = Math.round(sec); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
const segIndex = new Map(asrSegs.map((s) => [`${s.lecture}|${stampOf(s.start)}`, s.text]));
const speechBlocks = () => wb.sheets.map((s) => {
  const at = s.rows.findIndex((r) => cellStr(r[0]) === '◆');
  return { name: s.name, at, rows: at < 0 ? [] : s.rows.slice(at + 1).filter((r) => /^S\d+$/.test(cellStr(r[0]))) };
});

// 字幕语料扁平表（第19讲密样本 + 全课程样本），供逐条回查
const allCaps = [
  ...s19.samples.filter((x) => x.line).map((x) => ({ lecture: 19, mmss: x.mmss, ref: `#${x.idx}`, line: x.line })),
  ...course.samples.map((x) => ({ lecture: x.lecture, mmss: x.mmss, ref: x.idx, line: x.line })),
  ...gapDoc.samples.map((x) => ({ lecture: x.lecture, mmss: x.mmss, ref: x.ref, line: x.line, sec: x.sec, targeted: true })),
];

/** 测试侧独立实现的对位率（LCS 长度 / 字幕长度），不复用生成器代码，避免「同一份 bug 自查通过」 */
function alignSemanticTest(a, b) {
  const n = a.length; const m = b.length;
  let prev = new Uint16Array(m + 1);
  for (let i = 1; i <= n; i += 1) {
    const cur = new Uint16Array(m + 1);
    for (let j = 1; j <= m; j += 1) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    prev = cur;
  }
  return { ratio: n ? prev[m] / n : 0, letters: prev[m] };
}

test('17 张表每张都有「语音正文出处」块，且 ≥3 条（正文不许只堆在 12/13 表）', () => {
  const blocks = speechBlocks();
  assert.strictEqual(blocks.length, EXPECTED.length);
  const bad = blocks.filter((b) => b.rows.length < 3);
  assert.deepStrictEqual(bad.map((b) => `${b.name}:${b.rows.length}`), [], '有表缺语音正文块或不足 3 条');
  const total = blocks.reduce((a, b) => a + b.rows.length, 0);
  assert.ok(total >= EXPECTED.length * 3, `合计只有 ${total} 条`);
});

test('正文块每条时间码都能在 12/13 表里查到，且正文只能是「人读字幕原文」或明标〈ASR〉的转写开头', () => {
  speechBlocks().forEach((b) => {
    b.rows.forEach((r) => {
      const i = r.findIndex((c) => /^第\d+讲 \d+:\d{2}$/.test(cellStr(c)));
      assert.ok(i >= 0, `${b.name} 有一行缺时间码`);
      const stamp = cellStr(r[i]);
      const key = stamp.replace(/^第(\d+)讲 /, '$1|');
      const seg = segIndex.get(key);
      assert.ok(seg, `${b.name} 的 ${stamp} 在转写语料里查不到`);
      const cell = cellStr(r[i + 1]);
      const quoted = cell.replace(/…$/, '');
      if (cell.startsWith('〈ASR〉')) {
        assert.ok(seg.startsWith(quoted.slice(5)), `${b.name} 的 ${stamp} 标了〈ASR〉却不是该段原文`);
      } else {
        // 人读字幕原文：按校验行里的读屏序号精确定位那条字幕（不能只按前缀找，前缀会撞上同讲的旧样本）
        const m = /^第(\d+)讲 (\d+:\d{2})（读屏 ([^，）]+)，对位 ([\d.]+)）｜ASR：(.+)$/.exec(cellStr(r[i + 2]));
        assert.ok(m, `${b.name} 的 ${stamp} 校验行格式不对`);
        const hit = allCaps.find((c) => c.lecture === Number(m[1]) && c.mmss === m[2] && String(c.ref) === String(m[3]));
        assert.ok(hit, `${b.name} 的 ${stamp} 正文在字幕语料里按序号查不到：${cellStr(r[i + 2]).slice(0, 24)}`);
        assert.ok(hit.line.startsWith(quoted), `${b.name} 的 ${stamp} 正文与该条字幕不符`);
        const al = alignSemanticTest(hit.line, seg);
        if (hit.targeted) {
          // 补采样本：帧就在这段起始 ±4s，靠「帧即原话」成立，不靠对位率
          const st = m[2].split(':').map(Number);
          assert.ok(Math.abs(hit.sec - (st[0] * 60 + st[1])) <= 4, `${b.name} 的 ${stamp} 补采帧离该段超过 4s`);
        } else {
          assert.ok(al.ratio >= 0.7, `${b.name} 的 ${stamp} 字幕与 ASR 对位率只有 ${al.ratio.toFixed(2)}`);
        }
      }
    });
  });
});

test('正文块的校验行：有字幕必带对位率、无字幕必明说（且人读原文占比 ≥50%）', () => {
  let withCap = 0;
  let total = 0;
  speechBlocks().forEach((b) => {
    b.rows.forEach((r) => {
      const i = r.findIndex((c) => /^第\d+讲 \d+:\d{2}$/.test(cellStr(c)));
      const cite = cellStr(r[i + 2]);
      const byCaption = !cellStr(r[i + 1]).startsWith('〈ASR〉');
      total += 1;
      if (byCaption) {
        const m = /^第(\d+)讲 (\d+:\d{2})（读屏 [^，）]+，对位 (\d\.\d{2})）｜ASR：(.+)$/.exec(cite);
        assert.ok(m, `${b.name} 的字幕行格式不对：${cite.slice(0, 28)}`);
        const ref = (cellStr(r[i + 2]).match(/读屏 ([^，）]+)/) || [])[1] || '';
        const isTargeted = /^g-/.test(ref);
        if (!isTargeted) assert.ok(Number(m[3]) >= 0.7, `${b.name} 的 ${cellStr(r[i])} 对位率 ${m[3]} 低于 0.7`);
        assert.ok(capKeys.has(`${m[1]}|${m[2]}|${(allCaps.find((c) => c.lecture === Number(m[1]) && c.mmss === m[2]) || {}).line || ''}`),
          `${b.name} 的字幕行查不到原字幕：${cite.slice(0, 28)}`);
        withCap += 1;
      } else {
        assert.ok(cite.startsWith('—') ? cite.includes('无字幕') : cite.includes('对位'),
          `${b.name} 的 ${cellStr(r[i])} 用 ASR 原文却没有交代原因：${cite.slice(0, 28)}`);
      }
    });
  });
  assert.ok(withCap / total >= 0.5, `人读原文只占 ${(withCap / total * 100).toFixed(0)}%（应 ≥50%）`);
});

test('补采样本：每条都能回到帧文件，sha256 一致（补采不是口头声称）', () => {
  assert.ok(gapDoc.samples.length >= 4, `补采样本只有 ${gapDoc.samples.length} 条`);
  gapDoc.samples.forEach((s) => {
    const p = path.join(SRC, s.image);
    assert.ok(fs.existsSync(p), `补采帧缺失：${s.image}`);
    assert.strictEqual(sha(p), s.sha256, `${s.image} 的 sha256 与记录不符`);
    assert.ok(s.line && s.line.length >= 4, `${s.ref} 的字幕太短`);
    assert.ok(Math.abs(s.frameSec - s.sec) <= 4, `${s.ref} 帧时刻与样本时刻差 ${Math.abs(s.frameSec - s.sec)}s`);
    assert.ok(capKeys.has(`${s.lecture}|${s.mmss}|${s.line}`), `${s.ref} 没进入字幕语料`);
  });
});

fs.rmSync(TMP, { recursive: true, force: true });

if (warnings.length) warnings.forEach((w) => console.log(`  ⚠ ${w}`));
console.log(`\n${failures.length ? '✗' : '✓'} 交付物：${passed} 通过 · ${failures.length} 失败`);
if (failures.length) process.exit(1);
