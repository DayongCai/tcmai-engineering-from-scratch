#!/usr/bin/env node
/**
 * scripts/import_chenruchun_lectures.js — 全 24 讲讲稿证据 + 对读验证 → 《验证-伤寒论.xlsx》
 *
 *   node scripts/import_chenruchun_lectures.js              生成（写桌面交付物 + 仓库内溯源产物）
 *   node scripts/import_chenruchun_lectures.js --check      只核对不写文件
 *   node scripts/import_chenruchun_lectures.js --out <路径> 改交付物落点（测试用）
 *   node scripts/import_chenruchun_lectures.js --snapshot   重新固化「上一份交付物」快照
 *
 * 源（全部在 standards/materials/chenruchun-lectures/sources/）：
 *   bilibili-video-page.html      视频页原始 HTML —— 24 讲合集、每讲时长都在内联
 *                                 `__INITIAL_STATE__.videoData.ugc_season` 里，不靠手抄
 *   episodes.json                 24 讲清单（页面标注时长），与实测时长逐讲比对
 *   subtitle-samples.json         第 19 讲的密样本：150 条（100 条有字），覆盖 0:11–60:31
 *   subtitle-samples-courses.json 全课程扫读：22 讲 × 20 条 = 440 条，**全部有字**
 *   meta-lectures.json            逐讲抽帧与分段统计（帧数/稳定段/有字段/Otsu 阈值/覆盖率）
 *   fingerprints-lectures.json    以上文件与 39 张拼图的 sha256
 *   prev-clinical-application.json 上一份《伤寒论临床应用.xlsx》的快照（sha256 + 33 方 + 9 条推断）
 *
 * 为什么叫「验证」：上一份《伤寒论临床应用.xlsx》是从**目录**重构出的推断体，自报 9 条
 * 「须人工复核」。第一版验证只读了第 19 讲（1/24），只验到 4 条。这一版把 24 讲全读：
 * 第 19 讲用 150 条密样本，其余各讲各 20 条（有字判据过滤后），共 590 条原话。
 *
 * 三道门（第一版就有，写进脚本，不靠事后自觉）：
 *   1. citeByText('回阳救逆')：引用讲稿必须先在该句里找到字面文本，找不到就报错退出。
 *      于是时间码不可能写错 —— 它是从样本里查出来的，不是从记忆里写的。
 *   2. 每个工作表都必须带「病理生理学家 hermesagent 的独立理解总结」块（标题行 + ≥3 条），缺一个就退出。
 *   3. 未命中的方必须逐首分类（他书 / 待查），出现「待查」就退出。
 * 这一版新增三道：
 *   4. 「24 讲都读了」要能核：除第 19 讲（单列 150 条）与第 8 讲（与第 6 讲同源）外，
 *      每一讲必须有 ≥1 条读到的样本，否则退出 —— 不许只在文档里说读了。
 *   5. 上一份的 33 首方必须逐首给出判定（题名覆盖／讲稿提及／未覆盖），出现「待定」就退出。
 *   6. 页面标注时长与实测时长逐讲比对，差 > 5s 就退出（防止把另一条视频当成某一讲）。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { writeWorkbook } = require('./lib_xlsx_write');
const { readWorkbook } = require('./lib_xlsx');

const ROOT = path.resolve(__dirname, '..');
const SLUG = 'chenruchun-lectures';
const MAT = path.join(ROOT, 'standards', 'materials', SLUG);
const SRC = path.join(MAT, 'sources');
const PAGE = path.join(SRC, 'bilibili-video-page.html');
const SAMPLES19 = path.join(SRC, 'subtitle-samples.json');
const COURSES = path.join(SRC, 'subtitle-samples-courses.json');
const META_LEC = path.join(SRC, 'meta-lectures.json');
const EPISODES_JSON = path.join(SRC, 'episodes.json');
const SEGMENTS19 = path.join(SRC, 'subtitle-segments.json');
const PREV_SNAP = path.join(SRC, 'prev-clinical-application.json');
const BASE_JSON = path.join(ROOT, 'standards', 'shanghan', '底本.json');
const DESKTOP = process.env.TCMAI_DESKTOP || 'J:/Users/user/Desktop';
const argOut = (() => { const i = process.argv.indexOf('--out'); return i >= 0 ? process.argv[i + 1] : null; })();
const OUT_XLSX = argOut || path.join(DESKTOP, '验证-伤寒论.xlsx');
const CHECK_ONLY = process.argv.includes('--check');

const PERSONA = '病理生理学家 hermesagent';
for (const f of [PAGE, SAMPLES19, COURSES, META_LEC, EPISODES_JSON, SEGMENTS19, PREV_SNAP]) {
  if (!fs.existsSync(f)) {
    console.error(`✗ 缺源文件: ${path.relative(ROOT, f)}（视频页原件、读屏样本、逐讲统计、上一份快照都必须随仓库保存）`);
    process.exit(1);
  }
}
const sha256 = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const cellStrSafe = (v) => String(v === undefined || v === null ? '' : v).trim();
const fmt = (sec) => { const t = Math.round(sec); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };   // 先取整再拆分钟，避免出现 54:60
const fmtH = (sec) => `${Math.floor(sec / 3600)} 小时 ${String(Math.floor((sec % 3600) / 60)).padStart(2, '0')} 分`;
const sentCount = (t) => (String(t).match(/[。；]/g) || []).length || 1;

// ── 1. 视频页 → 视频元信息 + 24 讲合集 ────────────────────────────────

const html = fs.readFileSync(PAGE, 'utf8');
function sliceJson(src, start) {
  let depth = 0; let inStr = false; let esc = false;
  for (let i = start; i < src.length; i += 1) {
    const ch = src[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{' || ch === '[') depth += 1;
    else if (ch === '}' || ch === ']') { depth -= 1; if (depth === 0) return src.slice(start, i + 1); }
  }
  throw new Error('页面内联 state 不完整');
}
const stateAt = html.indexOf('__INITIAL_STATE__=');
if (stateAt < 0) throw new Error('页面里找不到 __INITIAL_STATE__');
const state = JSON.parse(sliceJson(html, html.indexOf('{', stateAt)));
const videoData = state.videoData || {};
if (!videoData.bvid) throw new Error('videoData 缺失');
const season = videoData.ugc_season;
if (!season || !season.sections) throw new Error('ugc_season 缺失（07 表的结构依据）');

const VIDEO = {
  bvid: videoData.bvid, aid: videoData.aid, cid: videoData.cid, title: videoData.title,
  owner: (videoData.owner || {}).name, ownerMid: (videoData.owner || {}).mid,
  duration: videoData.duration, pubdate: new Date((videoData.pubdate || 0) * 1000).toISOString().slice(0, 10),
  stat: videoData.stat || {}, seasonTitle: season.title, seasonId: season.id,
  seasonView: (season.stat || {}).view || 0, seasonFav: (season.stat || {}).fav || 0,
};
const EPISODES = [];
(season.sections || []).forEach((sec) => {
  (sec.episodes || []).forEach((ep) => {
    EPISODES.push({
      no: EPISODES.length + 1, bvid: ep.bvid, aid: ep.aid, cid: ep.cid, title: ep.title,
      dur: (ep.arc && ep.arc.duration) || 0, isThis: ep.bvid === VIDEO.bvid,
    });
  });
});
EPISODES.sort((a, b) => a.no - b.no);
const thisLec = EPISODES.find((e) => e.isThis) || { no: 0, fa: '—' };

/** 八法分类：从题名直接判定（讲者自己排的体系，不猜） */
const FA_MAP = [
  [/论治伤寒之学|总论/, '总论'], [/汗法/, '汗法'], [/下法/, '下法'], [/和法/, '和法'],
  [/温法/, '温法'], [/清法.*补法/, '清法·补法'], [/清法/, '清法'], [/消法/, '消法'], [/补法/, '补法'],
];
EPISODES.forEach((e) => { const hit = FA_MAP.find(([re]) => re.test(e.title)); e.fa = hit ? hit[1] : '—'; });
const faAgg = {};
EPISODES.forEach((e) => { faAgg[e.fa] = (faAgg[e.fa] || 0) + 1; });
const totalDur = EPISODES.reduce((a, e) => a + e.dur, 0);

// ── 2. 逐讲抽取产物：实测时长、抽帧统计、读到的样本 ───────────────────

const courseDoc = JSON.parse(fs.readFileSync(COURSES, 'utf8'));
const metaDoc = JSON.parse(fs.readFileSync(META_LEC, 'utf8'));
const epiDoc = JSON.parse(fs.readFileSync(EPISODES_JSON, 'utf8'));
const sample19Doc = JSON.parse(fs.readFileSync(SAMPLES19, 'utf8'));
const seg19 = JSON.parse(fs.readFileSync(SEGMENTS19, 'utf8'));

// ── 语音转写层（faster-whisper）——「正文内容」这一层，与读屏字幕层并列 ──
const ASR_TX = path.join(SRC, 'asr-transcripts.json');
const ASR_META = path.join(SRC, 'meta-asr.json');
const ASR_DOC = fs.existsSync(ASR_TX)
  ? JSON.parse(fs.readFileSync(ASR_TX, 'utf8'))
  : { $generated: '（尚未生成）', lectures: [], segments: [], totals: { audioSec: 0, wallSec: 0, chars: 0, segments: 0 } };
const ASR_SEGS = ASR_DOC.segments || [];
const ALL_SEGS = ASR_SEGS;   // 全课程 22,301 段：语音正文出处块从里面挑，不另造句子
const ASR_LEC = ASR_DOC.lectures || [];
const ASR_METADOC = fs.existsSync(ASR_META) ? JSON.parse(fs.readFileSync(ASR_META, 'utf8')) : { lectures: [] };
const asrDone = new Set(ASR_LEC.map((l) => l.no));

/** 引用 ASR 正文：先在语料里找到这句话，再从语料里取时间码 */
function asrHits(kw) {
  const out = ASR_SEGS.filter((s) => s.text.includes(kw));
  if (!out.length) throw new Error(`引用了 ASR 语料里不存在的原话: 「${kw}」`);
  return out;
}
const asrHit = (kw) => asrHits(kw)[0];
const citeASR = (kw) => {
  const s = asrHit(kw);
  return `《讲稿ASR》第${s.lecture}讲 ${s.mmss}（段 ${s.idx}）`;
};

const LEC = EPISODES.map((e) => {
  const meta = courseDoc.lectures.find((x) => x.no === e.no) || {};
  const stat = metaDoc.lectures.find((x) => x.no === e.no) || {};
  return {
    ...e,
    durMeasured: meta.durMeasured || stat.durMeasured || 0,
    frames: stat.frames || 0, stableSegments: stat.stableSegments || 0,
    textSegments: stat.textSegments || 0, outlinedThreshold: stat.outlinedThreshold || 0,
    coverageRatio: stat.coverageRatio || 0, samples: meta.samplesRead || 0,
    duplicateOf: meta.duplicateOf || null,
  };
});
const DUPES = courseDoc.duplicateLectures || [];
const dupeNos = DUPES.map((d) => d.no);

/** 门 6：页面标注时长 vs 实测时长（差 > 5s 就退出，防止把别的视频当成某一讲） */
const durMismatch = LEC.filter((l) => Math.abs(l.durSource - l.durMeasured) > 5);
if (durMismatch.length) {
  console.error(`✗ 页面标注时长与实测时长不符：${durMismatch.map((l) => `第${l.no}讲 ${l.durSource}s/实测${l.durMeasured}s`).join('、')}`);
  process.exit(1);
}
const durMeasuredTotal = LEC.reduce((a, l) => a + l.durMeasured, 0);

// ── 3. 讲稿语料：第 19 讲密样本 + 全课程扫读，合成一个可查的语料 ────────

const CORPUS = [];
sample19Doc.samples.forEach((s) => {
  if (!s.line) return;
  CORPUS.push({ where: `本讲 ${s.mmss}`, label: `第19讲 ${s.mmss}`, lecture: 19, mmss: s.mmss, line: s.line, idx: `#${s.idx}`, grid: s.grid });
});
courseDoc.samples.forEach((s) => {
  CORPUS.push({ where: `第${s.lecture}讲 ${s.mmss}`, label: `第${s.lecture}讲 ${s.mmss}`, lecture: s.lecture, mmss: s.mmss, line: s.line, idx: s.idx, grid: s.grid });
});
const L19_COUNT = CORPUS.filter((c) => c.lecture === 19).length;

/** 门 4：「24 讲都读了」要能核 */
const unread = LEC.filter((l) => l.no !== 19 && !dupeNos.includes(l.no) && !CORPUS.some((c) => c.lecture === l.no));
if (unread.length) {
  console.error(`✗ 以下讲没有读到的样本（24 讲全读是本版的前提）：${unread.map((l) => `第${l.no}讲`).join('、')}`);
  process.exit(1);
}
if (L19_COUNT !== sample19Doc.samples.filter((s) => s.line).length) {
  console.error('✗ 第 19 讲样本条数与语料不一致');
  process.exit(1);
}

// ── 字幕 ↔ ASR 交叉校核（放在最前面：后面所有表都要用它）───────────
// 用读屏字幕（人工读出的画面文本）当答案给机器转写打分。
const CAPTIONS = [];
sample19Doc.samples.forEach((s) => { if (s.line) CAPTIONS.push({ lecture: 19, sec: s.sec, mmss: s.mmss, line: s.line, grid: s.grid, ref: `#${s.idx}` }); });
courseDoc.samples.forEach((s) => { CAPTIONS.push({ lecture: s.lecture, sec: s.sec, mmss: s.mmss, line: s.line, grid: s.grid, ref: s.idx }); });
// 补采样本（scripts/frames/gap_frames.sh 抓帧 + 逐图读出）：targeted=真的在这段起始 ±几秒的画面里读到
const GAP_JSON = path.join(SRC, 'subtitle-samples-gap.json');
const GAPDOC = fs.existsSync(GAP_JSON) ? JSON.parse(fs.readFileSync(GAP_JSON, 'utf8')) : { samples: [] };
GAPDOC.samples.forEach((s) => {
  CAPTIONS.push({
    lecture: s.lecture, sec: s.sec, mmss: s.mmss, line: s.line,
    grid: s.image, ref: s.ref, targeted: true, frameSec: s.frameSec,
  });
});
const ASR_BY_LEC = new Map();
ASR_SEGS.forEach((s) => {
  if (!ASR_BY_LEC.has(s.lecture)) ASR_BY_LEC.set(s.lecture, []);
  ASR_BY_LEC.get(s.lecture).push(s);
});

/** 最长公共子序列长度（只看「字幕里有多少字能在 ASR 里按序找到」） */
function lcsLen(a, b) {
  const n = a.length; const m = b.length;
  if (!n || !m) return 0;
  let prev = new Uint16Array(m + 1); let cur = new Uint16Array(m + 1);
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    const t = prev; prev = cur; cur = t; cur.fill(0);
  }
  return prev[m];
}
const asrWindow = (lecture, sec, before = 1.5, after = 5) => (ASR_BY_LEC.get(lecture) || [])
  .filter((s) => s.end >= sec - before && s.start <= sec + after).map((s) => s.text).join('');
/** 某条字幕处的 ASR 召回（0–1）；该讲没转写就返回 null */
function recallAt(lecture, sec, capLine) {
  if (!ASR_BY_LEC.has(lecture)) return null;
  const win = asrWindow(lecture, sec);
  if (!win) return 0;
  return lcsLen(capLine, win) / capLine.length;
}
const ACC = new Map(); // 每讲：参与校核的字幕数 / 平均召回 / ≥0.8 条数
CAPTIONS.forEach((c) => {
  const r = recallAt(c.lecture, c.sec, c.line);
  if (r === null) return;
  const a = ACC.get(c.lecture) || { n: 0, sum: 0, good: 0 };
  a.n += 1; a.sum += r; if (r >= 0.8) a.good += 1;
  ACC.set(c.lecture, a);
});
const accOf = (no) => {
  const a = ACC.get(no);
  return a && a.n ? { n: a.n, recall: a.sum / a.n, good: a.good } : null;
};
const allAcc = [...ACC.values()];
const ASR_RECALL = allAcc.length ? allAcc.reduce((x, a) => x + a.sum, 0) / allAcc.reduce((x, a) => x + a.n, 0) : null;
const ASR_GOOD_RATE = allAcc.length ? allAcc.reduce((x, a) => x + a.good, 0) / allAcc.reduce((x, a) => x + a.n, 0) : null;
const ASR_PENDING = LEC.filter((l) => l.no !== 8 && !asrDone.has(l.no)).map((l) => l.no);
const ASR_AUDIO_SEC = ASR_LEC.reduce((a, l) => a + l.audioSec, 0);
const ASR_CHARS = ASR_LEC.reduce((a, l) => a + l.chars, 0);
/** 字幕↔ASR 配对：把每条字幕的 ASR 同时段文本与召回预先算好，供逐段引用时对照 */
const normT = (t) => { const [m, s] = String(t).split(':'); return `${Number(m)}:${String(Number(s)).padStart(2, '0')}`; };
const CAP_BY_LEC = new Map();
CAPTIONS.forEach((c) => {
  const win = asrWindow(c.lecture, c.sec);
  const recall = win ? lcsLen(c.line, win) / c.line.length : null;
  if (!CAP_BY_LEC.has(c.lecture)) CAP_BY_LEC.set(c.lecture, []);
  CAP_BY_LEC.get(c.lecture).push({ ...c, win, recall });
});
CAP_BY_LEC.forEach((arr) => arr.sort((a, b) => a.sec - b.sec));
/** 某段 ASR 时刻附近的字幕（人读原文），取召回最高的一条 */
function captionForSeg(seg, win = 3) {
  const cands = (CAP_BY_LEC.get(seg.lecture) || []).filter((c) => c.sec >= seg.start - win && c.sec <= seg.end + win && c.recall !== null);
  if (!cands.length) return null;
  return cands.reduce((a, b) => (b.recall > a.recall ? b : a));
}

/** 引用讲稿：先在该句里找到字面文本，找不到就报错退出 */
function hits(keyword) {
  const out = CORPUS.filter((c) => c.line.includes(keyword));
  if (!out.length) throw new Error(`引用了讲稿里不存在的原话: 「${keyword}」`);
  return out;
}
const hit = (keyword) => hits(keyword)[0];
const cite = (keyword) => `《讲稿》${hit(keyword).where}（读屏 ${hit(keyword).idx}）`;
const citeL = (lec, keyword) => {
  const c = hits(keyword).find((x) => x.lecture === lec) || hit(keyword);
  return `《讲稿》${c.where}（读屏 ${c.idx}）`;
};
const lineOf = (keyword) => hit(keyword).line;
const cites = (keywords) => keywords.map((k) => `${cite(k)}「${lineOf(k)}」`).join('；');

/** 全课程语料里的方名命中（用于 09 表：哪些方在讲稿里被点名） */
function speechHits(keys) {
  const seen = new Map();
  CORPUS.forEach((c) => {
    const k = keys.find((kk) => c.line.includes(kk));
    if (k && !seen.has(c.lecture)) seen.set(c.lecture, { ...c, key: k });
  });
  return [...seen.values()].sort((a, b) => a.lecture - b.lecture);
}
function titleHits(keys) {
  return LEC.filter((l) => keys.some((k) => l.title.includes(k)));
}

// ── 4. 与《伤寒论》底本交叉（第 19 讲的方，沿用上一版的别名与挡板纪律）──

const base = JSON.parse(fs.readFileSync(BASE_JSON, 'utf8'));
const TIAO = [];
base.pian.forEach((p) => (p.items || []).forEach((it) => TIAO.push({ domain: p.domain, pian: p.pian, no: it.no, text: it.text })));

const FORMULAS = [
  { name: '四逆汤', keys: ['四逆汤'], reject: [/四逆加人参汤/, /通脉四逆汤/, /茯苓四逆汤/] },
  { name: '干姜附子汤', keys: ['干姜附子汤'] },
  { name: '茯苓四逆汤', keys: ['茯苓四逆汤'] },
  { name: '通脉四逆汤', keys: ['通脉四逆汤'] },
  { name: '真武汤', keys: ['真武汤'] },
  { name: '白通汤', keys: ['白通汤'] },
  { name: '吴茱萸汤', keys: ['吴茱萸汤'] },
  { name: '甘草干姜汤', keys: ['甘草干姜汤'] },
  { name: '当归四逆汤', keys: ['当归四逆汤'], reject: [/当归四逆加吴茱萸/] },
  { name: '赤石脂禹余粮汤', keys: ['赤石脂禹余粮汤'] },
  { name: '生脉散', keys: ['生脉散', '生脉饮'], foreign: '后世方（补益气阴一类，见于李东垣《内外伤辨惑论》系统）' },
  { name: '桃红四物汤', keys: ['桃红四物'], foreign: '后世方（《医宗金鉴》）' },
  { name: '四妙勇安汤', keys: ['四妙勇安汤'], foreign: '后世方（《验方新编》）' },
];
FORMULAS.forEach((f) => {
  const hitList = [];
  TIAO.forEach((t) => {
    const k = f.keys.find((kk) => t.text.includes(kk) && !(f.reject || []).some((re) => re.test(t.text)));
    if (k) hitList.push({ ...t, key: k });
  });
  const dom = {};
  hitList.forEach((h) => { dom[h.domain] = (dom[h.domain] || 0) + 1; });
  f.hits = hitList;
  f.hitCount = hitList.length;
  f.domains = dom;
  f.first = hitList[0] || null;
  f.verdict = f.hitCount ? `底本命中 ${f.hitCount} 条` : (f.foreign ? `未命中：${f.foreign}` : '未命中：待分类');
});
const unclassified = FORMULAS.filter((f) => !f.hitCount && !f.foreign);
if (unclassified.length) {
  console.error(`✗ 以下方在底本未命中却未分类，请补 foreign：${unclassified.map((f) => f.name).join('、')}`);
  process.exit(1);
}
const hitFormulas = FORMULAS.filter((f) => f.hitCount);

// ── 5. 上一份交付物：33 方 + 9 条推断（优先读本机那一份，读不到用仓库快照）──

const snap = JSON.parse(fs.readFileSync(PREV_SNAP, 'utf8'));
const prevPath = snap.prevDeliverable.path;
const prevState = { source: 'snapshot', note: `仓库快照（${snap.prevDeliverable.sha256.slice(0, 12)}…，固化于 ${path.basename(PREV_SNAP)}）`, formulas: snap.formulas, inference: snap.inferenceRows, warn: '' };
if (fs.existsSync(prevPath)) {
  const live = crypto.createHash('sha256').update(fs.readFileSync(prevPath)).digest('hex');
  if (live !== snap.prevDeliverable.sha256) {
    try {
      const wb = readWorkbook(prevPath);
      const sh = wb.sheets.find((s) => s.name === '04经方实践');
      const cell = (v) => String(v === undefined || v === null ? '' : v).trim();
      if (sh) {
        const liveF = sh.rows.slice(1).map((r) => ({ name: cell(r[1]), mu: Number(r[3]) || 0, muText: cell(r[4]), hits: Number(r[6]) || 0 }));
        const diff = liveF.filter((r, i) => !snap.formulas[i] || snap.formulas[i].name !== r.name || snap.formulas[i].mu !== r.mu);
        prevState.source = 'live';
        prevState.formulas = liveF.map((r) => ({ ...r, baseName: '', domains: '', missReason: '' }));
        prevState.note = `本机《伤寒论临床应用.xlsx》（sha256 ${live.slice(0, 12)}… 与快照不同，已按本机那一份逐行重读）`;
        prevState.warn = diff.length ? `⚠ 本机那一份与快照有 ${diff.length} 行不一致：${diff.slice(0, 3).map((d) => d.name).join('、')}` : '';
      }
    } catch (e) {
      prevState.warn = `⚠ 本机那一份读不动（${e.message}），本表按快照生成`;
    }
  } else {
    prevState.source = 'live';
    prevState.note = `本机《伤寒论临床应用.xlsx》与快照一致（sha256 ${live.slice(0, 12)}…）`;
  }
} else {
  prevState.warn = '上一份交付物不在本机 → 按仓库快照生成，快照里的 sha256 就是被验证的版本';
}
const prevFormulas = prevState.formulas;
const prevByName = (n) => prevFormulas.find((f) => f.name === n) || null;
const prevClaim = (name) => {
  const r = prevByName(name);
  if (!r) return `04表：${name}（上一份里没有这一行）`;
  return `04表：${name} ${r.mu} 目 —— ${r.muText}`;
};

// ── 6. 33 方 × 全课程覆盖（09 表）───────────────────────────────────

/**
 * 别名表：题名与讲稿里的叫法不同（如「葛根黄芩黄连汤／葛根芩连汤」），且**两处的匹配词要分开列**。
 * 理由：`桂枝各半汤` 是 `柴胡桂枝各半汤` 的子串，若共用一个词表，第 15 讲的题名会把
 * 「桂枝麻黄各半汤」误判成题名覆盖 —— 子串假命中比漏命中更难发现，所以按来源各列一套。
 */
const ALIAS = {
  桂枝汤: { title: ['桂枝汤'], speech: ['桂枝汤'] },
  桂枝麻黄各半汤: { title: ['桂枝麻黄各半汤'], speech: ['桂枝麻黄各半汤', '桂枝各半汤'] },
  桂枝甘草汤: { title: ['桂枝甘草汤'], speech: ['桂枝甘草汤'] },
  桂枝加葛根汤: { title: ['桂枝加葛根汤'], speech: ['桂枝加葛根汤'] },
  桂枝加附子汤: { title: ['桂枝加附子汤'], speech: ['桂枝加附子汤'] },
  小柴胡汤: { title: ['小柴胡汤'], speech: ['小柴胡汤', '小柴胡'] },
  柴胡桂枝汤: { title: ['柴胡桂枝汤', '柴胡桂枝各半汤'], speech: ['柴胡桂枝汤', '柴胡桂枝各半汤'] },
  柴胡加龙骨牡蛎汤: { title: ['柴胡加龙骨牡蛎汤'], speech: ['柴胡加龙骨牡蛎汤', '柴胡龙骨牡蛎'] },
  四逆散: { title: ['四逆散'], speech: ['四逆散'] },
  芍药甘草汤: { title: ['芍药甘草汤'], speech: ['芍药甘草汤', '芍药甘草'] },
  小青龙汤: { title: ['小青龙汤'], speech: ['小青龙汤'] },
  苓甘五味姜辛半夏汤: { title: ['苓甘五味姜辛半夏汤', '苓甘五味姜辛夏汤', '苓甘五味姜辛'], speech: ['苓甘五味姜辛半夏汤', '苓甘五味姜辛夏汤', '苓甘五味姜辛'] },
  五苓散: { title: ['五苓散'], speech: ['五苓散', '五令散'] },
  苓桂术甘汤: { title: ['苓桂术甘汤', '茯苓桂枝白术甘草汤'], speech: ['苓桂术甘汤', '苓桂术甘', '茯苓桂枝白术甘草汤'] },
  半夏泻心汤: { title: ['半夏泻心汤'], speech: ['半夏泻心汤'] },
  甘草泻心汤: { title: ['甘草泻心汤'], speech: ['甘草泻心汤'] },
  厚朴生姜半夏甘草人参汤: { title: ['厚朴生姜半夏甘草人参汤'], speech: ['厚朴生姜半夏甘草人参汤', '厚朴生姜'] },
  理中汤: { title: ['理中汤'], speech: ['理中汤', '理中丸'] },
  真武汤: { title: ['真武汤'], speech: ['真武汤'] },
  吴茱萸汤: { title: ['吴茱萸汤'], speech: ['吴茱萸汤'] },
  葛根黄芩黄连汤: { title: ['葛根黄芩黄连汤', '葛根芩连汤'], speech: ['葛根黄芩黄连汤', '葛根芩连汤', '葛根黄芩黄连'] },
  白头翁汤: { title: ['白头翁汤'], speech: ['白头翁汤'] },
  当归四逆汤: { title: ['当归四逆汤'], speech: ['当归四逆汤', '当归四逆'] },
  当归芍药散: { title: ['当归芍药散', '当归芍药汤'], speech: ['当归芍药散', '当归芍药汤'] },
  肾著汤: { title: ['肾著汤', '肾着汤', '甘草干姜茯苓白术汤'], speech: ['肾著汤', '肾着汤', '甘草干姜茯苓白术汤'] },
  麻黄连翘赤小豆汤: { title: ['麻黄连翘赤小豆汤', '麻黄连轺赤小豆汤'], speech: ['麻黄连翘赤小豆汤', '麻黄连轺赤小豆汤'] },
  麻黄杏仁薏苡甘草汤: { title: ['麻黄杏仁薏苡甘草汤', '麻杏苡甘'], speech: ['麻黄杏仁薏苡甘草汤', '麻黄杏仁薏苡仁甘草汤', '麻杏苡甘'] },
  茵陈蒿汤: { title: ['茵陈蒿汤'], speech: ['茵陈蒿汤'] },
  柏叶汤: { title: ['柏叶汤'], speech: ['柏叶汤'] },
  甘麦大枣汤: { title: ['甘麦大枣汤'], speech: ['甘麦大枣汤', '甘麦大枣'] },
  酸枣仁汤: { title: ['酸枣仁汤'], speech: ['酸枣仁汤'] },
  百合知母汤与百合地黄汤: { title: ['百合知母汤', '百合地黄汤'], speech: ['百合知母汤', '百合地黄汤', '百合汤', '百合'] },
  炙甘草汤: { title: ['炙甘草汤'], speech: ['炙甘草汤', '复脉汤'] },
};
const COVER = prevFormulas.map((f) => {
  const keys = ALIAS[f.name];
  if (!keys) throw new Error(`别名表缺「${f.name}」，不能猜`);
  const titles = titleHits(keys.title);
  const speech = speechHits(keys.speech);
  let verdict;
  if (titles.length && speech.length) verdict = '题名＋讲稿双覆盖';
  else if (titles.length) verdict = '仅题名覆盖（本次抽样未命中讲稿原话）';
  else if (speech.length) verdict = '仅讲稿提及（题名未列此方）';
  else verdict = '本 24 讲未覆盖';
  const unreadHere = titles.some((t) => dupeNos.includes(t.no));
  return {
    name: f.name, mu: f.mu, muText: f.muText, hits: f.hits,
    titles: titles.map((t) => t.no), speech,
    verdict: unreadHere && !speech.length ? `${verdict}（题名所在讲与另一讲同源，不计）` : verdict,
  };
});
const undecided = COVER.filter((c) => !c.verdict || c.verdict.includes('待定'));
if (undecided.length) {
  console.error(`✗ 以下方没有判定，请补：${undecided.map((c) => c.name).join('、')}`);
  process.exit(1);
}
const coveredN = COVER.filter((c) => c.verdict !== '本 24 讲未覆盖').length;
const dualN = COVER.filter((c) => c.verdict === '题名＋讲稿双覆盖').length;
const notCovered = COVER.filter((c) => c.verdict === '本 24 讲未覆盖');

// ── 7. 各表内容 ───────────────────────────────────────────────────────

const E_SPEECH = '《讲稿》全课程读屏（可回图核对）';
const E_TOCTITLE = '合集题名（页面原文）';
const E_PERSONA = `${PERSONA}独立理解（非讲者观点）`;

const SHEET_01 = [
  ['学方从「功用」入手：讲者自己给了命名逻辑 —— 方以功用来命名，所以先问这首方在干什么，而不是先背条文。', cite('它是以它的功用来命名的'), E_SPEECH, '第 19 讲原话；第 7 讲「桂枝汤是个补药方子」是同一习惯的另一次'],
  ['先立八法的来处：汗吐下和温清消补八法，讲者明说是清代的程钟龄提出，不是《伤寒论》原文体例。', cite('具体提到八法是清代的程钟龄'), E_SPEECH, '第 6 讲开场即交代体系来源'],
  ['读法要求先熟读再寻原意：反复讲「在熟读的过程中寻其原意」，并把「意在诗外」当类比。', cites(['所以这里希望大家在熟读的过程中寻其原意', '作诗要意在诗外']), E_SPEECH, '两处相隔约 7 分钟，同一主张'],
  ['注本要读：点名成无己《注解伤寒论》《伤寒论》以经解经、尤在泾《伤寒贯珠集》，并区分「完整」与否。', cites(['成无己的《注解伤寒论》是完整的', '尤在泾的《伤寒贯珠集》']), E_SPEECH, '第 3 讲集中讲注本；同段另有「成无己的《伤寒论》是以经解经」'],
  ['经典要落回临床：把「多到临床上去转」写成对学生的方法要求，而不是补充建议。', cite('所以同学们有时间要多到临床上去转'), E_SPEECH, '第 2 讲结尾的方法要求'],
  ['以证脉定夺：明确说张仲景「主要是以证脉来定夺」，所以学的是判断顺序而不是方名清单。', cite('张仲景主要是以证脉来定夺'), E_SPEECH, '第 2 讲讲六经与传变时给出'],
  ['条文原句是共同语言：六经提纲、蓄血证条文、「以其脏有寒故也」这类原文在课上直接念。', cites(['六经的提纲', '以其脏有寒故也']), E_SPEECH, '第 3 讲；「发热恶寒无汗 身体疼痛」是紧邻的另一条'],
  ['先立法度再以法统方：24 讲里前 5 讲是总论（定位·版本·结构·学习方法·注本），第 6 讲起按八法逐方讲。', `${VIDEO.seasonTitle}·第 1–5 讲 vs 第 6 讲起`, E_TOCTITLE, `实测 ${LEC.length} 讲共 ${fmtH(durMeasuredTotal)}，八法分布见 07 表`],
  ['教学顺序按「法」而不是按方名首字：汗法 5 讲内推进（麻黄汤→桂枝汤→大青龙/麻杏甘石→诸加减方），不是按方书目录。', '第 6–10 讲题名', E_TOCTITLE, '第 5 讲另列「经方分类和比较、方剂临床特征、方剂加减」'],
  ['承认自身局限并区分「不成熟」与「可用」：「尽管有些东西不成熟」出现在讲汗法开场。', cite('尽管有些东西不成熟'), E_SPEECH, '与第 19 讲「这个问题是值得商榷的」同一态度'],
  ['把「读活」当目标：明确否定死背 ——「我们说是要把它读活」。', cite('我们说是要把它读活'), E_SPEECH, '第 23 讲讲肝病／补法时给出'],
  ['反对只会套方：批评临床「只会用柴胡荆芥银花连翘」这类固定组合。', cite('他就只会用柴胡荆芥银花连翘'), E_SPEECH, '第 1 讲讲六经辨证基本规律时举例'],
];
const P_01 = [
  ['十二讲通读后，这套学法可归纳为一条检索顺序：熟读原文 → 认病机 → 定治法（八法） → 选方 → 调剂量煎服。', E_PERSONA, '结构性比较'],
  ['把八法的出处（程钟龄）交代清楚，说明他知道自己在用后世的教学框架，而不是把它当成经文本身。', E_PERSONA, '测量事实'],
  ['「以证脉定夺」与现代「先定问题域再选检查／干预」的分诊逻辑同构，但证脉缺少量化的信度描述。', E_PERSONA, '结构性比较'],
  ['要求「多到临床上去转」是在承认课本知识与临床判断之间存在不可替代的落差，属于经验传递的边界声明。', E_PERSONA, '方法边界'],
  ['24 讲里前 5 讲是总论（占全课程约两成时长），其余按八法逐方展开 —— 与他反复强调的「先法后术」一致。', E_PERSONA, '测量事实'],
];

const SHEET_02 = [
  ['经典本位：主张学术统一到「经典」上来，以《伤寒论》为基准，而不是以个人偏好或流行治法为基准。', cites(['加强对六经辨证基本规律的理解', '不是中医不好是我们自己没有学好']), E_SPEECH, '两条相隔 17 讲（第 1 讲与第 18 讲），立场一致'],
  ['反对「以西释中」的解释方式：批评把六经硬套成现代解释，说那种解释「就是跟你兜圈子」，并提到朝鲜金凤汉的经络研究作为类比对象。', cites(['那种解释就是跟你兜圈子', '说朝鲜有个学家叫金凤汉']), E_SPEECH, '第 2 讲同段；注意他并不拒绝用西医病名做对照（见下一行）'],
  ['用西医病名做对照但不让病名替代辨证：甘草泻心汤「可以治疗西医讲的三联症」、谈「影响胆汁的分泌」都是在病名层面对照。', cites(['影响胆汁的分泌', '甘草泻心汤铺头可以治疗西医讲的三联症']), E_SPEECH, '第 15、17 讲各一处；「铺头」为读屏形近字，未改写'],
  ['反时髦治法：明确反对把活血化瘀当万金油 ——「全国各地一片上下都是活血化瘀」「等你红花桃仁干过去不行了」。', cites(['全国各地一片上下都是活血化瘀', '等你红花桃仁干过去不行了']), E_SPEECH, '第 24 讲；与第 19 讲「多数都是虚寒」同调'],
  ['以经方为本但不拒时方：直接用「金匮上面的方子」「《金匮》方里边有的」「温病条辨」作为可选项。', cites(['这也是金匮上面的方子', '这也是《金匮》方里边有的']), E_SPEECH, '第 23、14 讲；另有「吴鞠通《温病条辨》里面有很多养阴的方子」（第 24 讲）'],
  ['温病与伤寒并重：承认温病学说的地位，并把《温病条辨》列为要读的书。', cites(['我们承认温病学说可以讲是', '那么《温病条辨》非常重要']), E_SPEECH, '第 1 讲；两处相隔约 18 分钟'],
  ['补法有边界，且讲「阴中求阳」的配伍法度：引「善补阳者 阴中求阳」。', cite('善补阳者 阴中求阳'), E_SPEECH, '第 20 讲；第 24 讲另有「一补气这个病人两三天他的精神就来了」'],
  ['反对见病即用固定套路：批评「消炎利胆片等等好多」与「你不要听这些东西」。', cites(['消炎利胆片等等好多', '所以你不要听这些东西']), E_SPEECH, '第 15 讲连续三处（含「你别胡说八道」）'],
  ['方义完整性：桂枝汤不可缺生姜、小建中汤就是「桂枝汤倍芍药加饴糖」，方义由药味共同承担。', cites(['没有生姜是不行的', '实际上它就是桂枝汤倍芍药加饴糖']), E_SPEECH, '第 19、23 讲；另有第 4 讲「红枣生姜缺一不可」'],
  ['气化—水化与实际用方一致：明说「水气病里面的基本方」这一组，并点名苓桂术甘，同时确认气化学说是他解释六经的语言。', cites(['这都属于水气病里面的基本方', '其中有代表意义的我想应当就是苓桂术甘']), E_SPEECH, '第 20 讲；气化学说见第 2 讲「从气化学说来解释伤寒六经生理病理」'],
  ['外治与生活条件都在视野内：谈肝硬化预后用可观察的外在表现，谈药材与地域（樟树国药局）。', cites(['这是对肝硬化的一个预后是非常准确', '樟树国药局更庆仁栈']), E_SPEECH, '第 10、23 讲'],
  ['专病体系收束：肝病、肿瘤、妇科在 24 讲里都有专门段落（第 23 讲集中讲肝病与妇科治疗、第 24 讲讲补法与肝病原则）。', '第 22–24 讲题名', E_TOCTITLE, '与上一份附篇「肝病 3 篇 + 肿瘤」呼应'],
];
const P_02 = [
  ['把「以西释中」与「用西医病名对照」分开处理，是这份材料里最容易读错的地方：他反对的是把中医概念替换成西医解释，不反对在病名层面对照。', E_PERSONA, '结构性比较'],
  ['反时髦治法与经典本位的组合，在方法学上等于「证据来源优先于流行度」——但来源仍是权威而非试验。', E_PERSONA, '方法推论'],
  ['「气化则水化」在现代语言里最接近体液分布调节，属于可观察层（出入量、水肿、尿量），不是可直接参数化的机制。', E_PERSONA, '生理学推论'],
  ['方义完整性（缺生姜不可／倍芍药加饴糖）在药理上对应「复方整体效应 ≠ 单味药效应之和」，是可实验检验的命题。', E_PERSONA, '生理学推论'],
  ['承认温病学说的地位，说明其体系观不是文本考据式的，而是临床可用性优先。', E_PERSONA, '结构性比较'],
];

const SHEET_03 = [
  ['入口＝先定法：每首方先归到八法中的一法，再谈具体用法，24 讲整体按法组织。', cites(['具体提到八法是清代的程钟龄', '也可以说汗法的加减法']), E_SPEECH, '第 6 讲与第 10 讲（后者讲汗法的加减法）'],
  ['抓主证与抓误治：正治与误治变证同列 ——「总之就是服了发汗的药以后」引出的正是误汗后的变证群。', cite('总之就是服了发汗的药以后'), E_SPEECH, '第 21 讲；误治—救逆语言的另两处见 10 表第 8 行'],
  ['由外感推内伤：小柴胡汤「从头到脚的病都可以用小柴胡」，外推的依据是病机而不是病名。', cite('从头到脚的病都可以用小柴胡'), E_SPEECH, '第 4 讲；病机依据见第 16 讲「所以中医的抓住病机是非常重要」'],
  ['同方跨病与同病跨方都靠证候细分：四逆散一路用到习惯性便秘、肋间神经痛、睾丸肿胀（第 14、16、17 讲）。', cites(['我用四逆散治疗习惯性便秘', '四逆散治疗肋间神经痛']), E_SPEECH, '第 14、17 讲；四逆散在上一份里是 12 目的大方'],
  ['合方的依据是「兼证」：柴胡桂枝汤对应太阳兼少阳；桂枝加附子汤对应阳虚兼表。', cites(['适应于太阳兼少阳证', '桂枝加附子汤阳虚兼表']), E_SPEECH, '第 15、20 讲；两处分别是方证与病机表述'],
  ['表里同治用同一方组：明说「他的药在表药跟里药同时使用」，这就是合方在治法层的理由。', cite('就是说他的药在表药跟里药同时使用'), E_SPEECH, '第 13 讲；同段收束为「都可以算是和法」'],
  ['误治—救逆谱系有专门词汇：「四逆辈」被当作一组救逆方的统称。', cite('且服四逆辈也就包括了理中汤的意思'), E_SPEECH, '第 18 讲；另有第 13 讲「都是救阳的」'],
  ['水液一路自成一链：明说「水气病里面的基本方」这一组，并给出「有水就必须要有气化」。', cites(['有水就必须要有气化', '这都属于水气病里面的基本方']), E_SPEECH, '第 12、20 讲；这一条把气化与水液方直接连起来'],
  ['寒热错杂用「转化」描述而不是静态分型。', cite('这个寒热转化'), E_SPEECH, '第 5 讲；同段提到半夏泻心汤的泻心汤类'],
  ['鉴别与排除在课上占相当比重：葛根芩连汤、白头翁汤的「热利下重」与下法边界反复讲。', '第 16、21 讲题名', E_TOCTITLE, '第 16 讲题名含葛根芩连汤；白头翁汤条文见第 21 讲读到的「热利下重」'],
  ['血证按部位分治：膈下逐瘀／少腹逐瘀／身痛逐瘀被并列讨论，同时反对一律活血。', cites(['膈下逐瘀 少腹逐瘀 身痛逐瘀', '活血化瘀治疗冠心病']), E_SPEECH, '第 13 讲；与第 4 讲「活血化瘀是王清任的发明创造」合读'],
  ['剂量与煎服进分析链：张仲景的用量习惯（「一两一两的用」）与量级调整（三克五克六克）都被当作可调参数。', cites(['张仲景是一两一两的用', '有时候是三克五克六克']), E_SPEECH, '第 7、19 讲'],
  ['以汗的异常作判别入口：汗过多、但头汗出、反汗出恶风各自对应不同方证。', cites(['《伤寒论》讲的汗过多 其人心下悸', '但头汗出 往来寒热']), E_SPEECH, '第 5、15 讲；另见第 9 讲「反汗出恶风者 桂枝加葛根汤主之」'],
  ['收束到病证体系：肝病、妇科、肿瘤在总论之后单列（第 23、24 讲）。', '第 23–24 讲题名', E_TOCTITLE, '与上一份附篇的「肝病 3 篇 + 肿瘤证治思考」呼应'],
];
const P_03 = [
  ['把「法」置于「方」之上的组织方式，等价于先分组再举例，可复现性高于按方名排列的方书体例。', E_PERSONA, '结构性比较'],
  ['「有水就必须要有气化」是这份材料里最接近机制陈述的一句：它把水液处理归到「气化」这个功能上，与现代的体液调节在问题域上重叠。', E_PERSONA, '生理学推论'],
  ['合方＝兼证的判据是二元的（有／无兼证），缺少对兼证权重的描述 —— 这是经验体系里可重复性最弱的一环。', E_PERSONA, '方法边界'],
  ['把误治当常规分析对象（误汗→变证），说明这套体系的容错设计是「承认干预会出错，并给出纠偏路径」。', E_PERSONA, '结构性比较'],
  ['剂量与煎服被写入分析链，是在没有血药浓度监测的条件下用可观察指标做剂量滴定。', E_PERSONA, '生理学推论'],
];

const MU_SAMPLE = [
  ['四逆汤', '但是这个四逆汤', '本讲把它定位在回阳救逆（16:18 明说「我们是用它回阳救逆」）', '温法·回阳'],
  ['甘草干姜汤', '一个是甘草干姜汤', '与四逆汤同段并列，属温中一类', '温法·温中'],
  ['真武汤', '我如果说我在真武汤里面', '讲稿在此给出应用讨论，同段提到肺源性心脏病', '温法·水气'],
  ['白通汤', '就是在白通汤里边', '与「阴盛格阳」「甚者从之」同段', '温法·通阳'],
  ['吴茱萸汤', '用吴茱萸汤也可以', '同一处谈巅顶（百会）', '温法·降逆'],
  ['当归四逆汤', '用当归四逆汤温通经脉很见效的', '又见 53:47「温通血脉」、55:19「治疗痛经」、54:11「还用在脉管炎」', '温法·温通'],
  ['生脉散（后世方）', '要用生脉散监制这个阳药', '用生脉散制约阳药之性', '后世方·配伍制约'],
  ['四妙勇安汤（后世方）', '就赶紧吃当归四逆汤合四妙勇安汤', '与当归四逆汤合用于脉管病一类', '后世方·合方'],
  ['桃红四物（后世方）', '你不要看到这个痛经就想到桃红四物', '被点名要求不要见痛经即用', '后世方·被纠偏'],
  ['赤石脂（禹余粮／桃花汤类）', '那是干姜赤石脂', '讲到干姜配赤石脂（收涩一路）', '温法·收涩'],
];
const S04 = [['序号', '方（讲稿中的叫法）', '出现时间码', '讲稿里怎么说', '归类', `${PERSONA} · 病理生理学对读`]];
MU_SAMPLE.forEach((r, i) => {
  const f = FORMULAS.find((x) => x.name === r[0].replace(/（后世方）/, '')) || null;
  S04.push([
    i + 1, r[0], cite(r[1]), `${r[2]}（原话：「${lineOf(r[1])}」）`, r[3],
    f ? (f.hitCount ? `底本命中 ${f.hitCount} 条，条文基础明确` : `底本不收（${f.foreign}）→ 属经方以外的经验层`)
      : '本讲外用方，未列入底本对账清单',
  ]);
});
const P_04 = [
  ['四逆汤这一档（附子／干姜／甘草）在现代对应的是「循环支持」：附子类生物碱有强心与致心律失常两面，治疗窗窄 —— 这正好解释了为什么要用生脉散「监制」。', E_PERSONA, '药理推论'],
  ['真武汤与白通汤都指向容量与体液分布问题（水肿、下利、面赤），差别在病机层次；现代对应的是容量管理与血管张力两类干预。', E_PERSONA, '生理学推论'],
  ['当归四逆汤用于痛经／脉管病，生理上落在末梢血管张力与血液流变这一层（寒冷→血管收缩、血黏度上升），与「寒凝则血滞」方向一致。', E_PERSONA, '生理学推论'],
  ['把后世方与本经方放在同一张桌面上用，说明「经方」在临床实践里是起点而不是边界。', E_PERSONA, '结构性比较'],
];

const S05 = [['序号', '时间码', '字幕原文（读屏）', '拼图（可回图核对）', `${PERSONA} · 逐条备注（仅关键行）`]];
const KEY_NOTES_19 = {
  '01:27': '把「脉微细但欲寐」当可观察的临床状态讲，不是条文背诵',
  '05:53': '从「用什么」推方，正是「以功用命名」的入口',
  '08:45': '否定式教学的起点',
  '12:36': '时间窗判断：二十分钟等不及＝急症分诊',
  '16:18': '回阳救逆：本讲的功能定位原话',
  '19:19': '四肢厥冷／厥逆进入讲课，是温法的体征依据',
  '24:55': '配伍制约：生脉散监制阳药',
  '33:13': '引《内经》「甚者从之」为从治法度',
  '36:39': '危候清单：循衣摸床撮空理线',
  '39:03': '反向鉴别：阳证也可神昏谵语',
  '44:08': '对实验室指标的保留态度',
  '50:56': '剂量量级：三克五克六克',
  '53:47': '当归四逆汤适用范围外推：温通血脉',
  '56:29': '病因链：寒凝则血滞',
  '57:58': '反对一律活血：多数都是虚寒',
  '60:22': '组方观点：没有生姜是不行的',
};
sample19Doc.samples.forEach((s) => {
  S05.push([s.idx, s.mmss, s.line || '（无字幕，讲者停顿处）', s.grid, s.line && KEY_NOTES_19[s.mmss] ? KEY_NOTES_19[s.mmss] : '—']);
});
const P_05 = [
  [`${sample19Doc.samples.length} 条密样本覆盖 ${fmt(sample19Doc.coverage.firstSec)}–${fmt(sample19Doc.coverage.lastSec)}，约占全片 ${Math.round((sample19Doc.coverage.lastSec / sample19Doc.coverage.videoDurationSec) * 100)}%；有字 ${sample19Doc.coverage.withText} 条、无字幕 ${sample19Doc.coverage.blank} 条 —— 空白比例高说明该片字幕是分段配的，不是全程字幕。`, E_PERSONA, '测量事实'],
  ['抽样是等距的（每 7 个换行段取 1），因此本表能当讲稿骨架，不能当逐字记录；任何引用都要回到时间码核。', E_PERSONA, '方法边界'],
  ['读屏有个别形近字风险（如「甜睡」疑为「酣睡」），已按画面所见记录，未作改写。', E_PERSONA, '方法边界'],
];

/** 06 全课程抽读：逐讲 20 条（有字判据过滤后） */
const KEY_NOTES_COURSE = {
  '1-06': '读法要求：熟读中寻其原意',
  '2-09': '气化学说：他解释六经用的就是这套语言',
  '2-18': '传变规律：「实证多传阳明 虚证容易陷少阴」',
  '4-19': '小柴胡的应用广度的原话依据',
  '5-04': '汗的异常作入口：汗过多→心下悸',
  '5-14': '抓住百合（百合汤类方的入口）',
  '6-04': '八法出处：清代程钟龄',
  '7-17': '真武汤与散水的配伍语言',
  '9-07': '细辛不可轻视（麻黄附子细辛汤一档的药味观点）',
  '10-20': '皮肤科西化：他反对的是这个',
  '12-19': '「有水就必须要有气化」——气化与水液方的连接点',
  '13-12': '血证分部位：膈下／少腹／身痛逐瘀',
  '13-19': '表药里药同用＝合方的治法理由',
  '14-13': '四逆散的内伤用法（习惯性便秘）',
  '15-07': '大柴胡汤条文原句',
  '16-04': '病机决定用药：本讲的核心句',
  '17-16': '甘草泻心汤与西医病名对照',
  '18-10': '「且服四逆辈」——误治救逆谱系的统称',
  '20-01': '温脾＝太阴病：温法的层次划分',
  '20-14': '水气病基本方这一组',
  '22-19': '厚朴生姜半夏甘草人参汤（上一份判为未命中底本的一首）',
  '23-08': '小建中汤＝桂枝汤倍芍药加饴糖（方义完整性）',
  '24-04': '反对一律活血的原话',
  '24-14': '当归四逆汤肝中养血（妇科一线的依据）',
};
const S06 = [['序号', '讲次', '时间码', '字幕原文（读屏）', '拼图', `${PERSONA} · 逐条备注（仅关键行）`]];
courseDoc.samples.forEach((s, i) => {
  const key = `${s.lecture}-${s.idx.split('-')[1]}`;
  S06.push([i + 1, `第${s.lecture}讲`, s.mmss, s.line, s.grid, KEY_NOTES_COURSE[key] || '—']);
});
const P_06 = [
  [`全课程扫读 ${courseDoc.samples.length} 条（${courseDoc.coverage.lecturesRead} 讲 × 20 条），全部有字 —— 上一版的「条带亮点」判据精确率只有 79%，改用「描边白字占比 + Otsu」后在第 19 讲 150 条人读样本上实测精确率 100%／召回 90%，所以这一批不再浪费读图额度在空白字幕上。`, E_PERSONA, '测量事实'],
  [`每讲抽样密度为 1 条／约 ${Math.round(durMeasuredTotal / LEC.length / 60 / 20)} 分钟量级（各讲 20 条、时长 ${Math.round(durMeasuredTotal / LEC.length / 60)} 分钟左右）：这是骨架级覆盖，用于判定「某讲讲到没讲到某主题」，不足以逐句复原论证。`, E_PERSONA, '方法边界'],
  ['第 8 讲与第 6 讲是同一份视频（抽帧统计逐位相同），因此第 8 讲不作为独立证据 —— 覆盖计数里只算一次。', E_PERSONA, '测量事实'],
  ['把「有字判据」的准确率写进证据链（而不是只说读了图），才能让「100 条样本里有 100 条真字幕」这件事可复核。', E_PERSONA, '方法要求'],
];

/** 07 八法体系 */
const S07 = [['序号', '讲次', '题名（页面原文）', '时长（实测）', '法类', '抽帧／有字段／读到', '语音转写（ASR）', `${PERSONA} · 病理生理学对读`]];
const FA_NOTE = {
  '总论': '建立术语与坐标系：相当于现代教材的「总论 + 生理基础」',
  '汗法': '体表与容量调节：发汗＝经皮与容量两条通路的调度',
  '下法': '肠道通路：清除肠内容物方向的处理',
  '和法': '多点调节：对应神经-内分泌-免疫这类枢纽概念',
  '温法': '循环与代谢支持：重点是灌注与体温',
  '清法': '炎症与感染控制：清热与抗感染不在同一机制层',
  '清法·补法': '过渡讲：由祛邪转向支持',
  '消法': '消散与吸收：对应积液、肿块一类',
  '补法': '储备与合成：对应营养、贫血、免疫储备',
};
LEC.forEach((l, i) => {
  const mark = l.no === 19 ? '（第 19 讲·密样本 150 条单列）' : (dupeNos.includes(l.no) ? `（与第 ${l.duplicateOf} 讲同源，不计）` : '');
  S07.push([
    i + 1, `第 ${l.no} 讲${l.isThis ? '（本讲）' : ''}`, l.title, fmt(l.durMeasured), l.fa,
    `${l.frames} 帧／有字段 ${l.textSegments}／读到 ${l.samples || (l.no === 19 ? 150 : 0)} 条${mark}`,
    '（转写列由下方 buildASRStatus 填，见 12/13 表）',
    FA_NOTE[l.fa] || '—',
  ]);
});
const P_07 = [
  [`实测 ${LEC.length} 讲共 ${fmtH(durMeasuredTotal)}（页面标注合计 ${fmtH(totalDur)}，逐讲差 ≤5s）；八法分布：${Object.entries(faAgg).map(([k, v]) => `${k}${v}讲`).join(' · ')}。`, E_PERSONA, '测量事实'],
  [`逐讲抽帧统计给出了每一讲的可读性：稳定段 ${metaDoc.totals.stableSegments} 个、其中有字段 ${metaDoc.totals.textSegments} 个（${Math.round((metaDoc.totals.textSegments / metaDoc.totals.stableSegments) * 100)}%）—— 字幕不是全程覆盖，这是抽样密度的上限。`, E_PERSONA, '测量事实'],
  ['这套「八法统方」与按机制分组（循环／呼吸／消化／代谢）排课功能等同，差别在分组依据。', E_PERSONA, '结构性比较'],
  ['第 5 讲实测只有 19.5 分钟，明显短于同批其他讲：逐讲时长必须用实测值，不能沿用页面标注。', E_PERSONA, '测量事实'],
];

/** 08 底本交叉（第 19 讲） */
const S08 = [['序号', '方', '底本命中条数', '底本域分布', '首见条文（截取）', `${PERSONA} · 病理生理学对读`]];
FORMULAS.forEach((f, i) => {
  const dom = Object.entries(f.domains).sort((a, b) => b[1] - a[1]).map(([d, n]) => `${d}${n}`).join('／');
  let first = '—';
  if (f.first) {
    const t = f.first.text;
    const idx = t.indexOf(f.first.key);
    first = `${String(f.first.pian).replace(/^S\d+_/, '')} #${f.first.no}｜…${t.slice(Math.max(0, idx - 10), idx + 30)}…`;
  }
  S08.push([i + 1, f.name, f.hitCount, f.hitCount ? dom : f.verdict, first,
    f.hitCount ? '条文基础明确，讲法可与条文逐字对照' : '不在底本 → 这一档的依据只能来自经验与传统，需另行溯源']);
});
const P_08 = [
  [`第 19 讲对账的 ${FORMULAS.length} 首方中，${hitFormulas.length} 首能在《伤寒论》底本里查到，${FORMULAS.length - hitFormulas.length} 首查不到（均为后世方）。`, E_PERSONA, '测量事实'],
  ['「查不到」不等于可疑：它只说明这一讲的临床工具箱比宋本《伤寒论》宽，后世方在同一体系内是正当成员。', E_PERSONA, '结构性比较'],
  ['四逆汤类方（四逆／茯苓四逆／通脉四逆／干姜附子）在底本里成组出现，说明「温法一档」在文本层面本来就是一个家族，不是后人归纳。', E_PERSONA, '测量事实'],
];

/** 09 全课程方证交叉（33 方） */
const S09 = [['序号', '方（上一份《伤寒论临床应用》）', '上一份目数', '讲次覆盖（题名）', '讲稿证据（全课程抽读原话）', '判定', `${PERSONA} · 病理生理学对读`]];
COVER.forEach((c, i) => {
  const t = c.titles.length ? c.titles.map((n) => `第${n}讲`).join('、') : '—';
  const sp = c.speech.length
    ? c.speech.slice(0, 3).map((s) => `第${s.lecture}讲 ${s.mmss}「${s.line}」`).join('；') + (c.speech.length > 3 ? `（另 ${c.speech.length - 3} 讲提及）` : '')
    : '—';
  S09.push([i + 1, c.name, c.mu, t, sp, c.verdict,
    c.verdict === '本 24 讲未覆盖' ? '本课程未涉及 → 这一档只能回到原书或另找讲次，不能拿目录当证据'
      : (c.speech.length ? '讲稿层面已被点名，条文基础可另按《伤寒论》底本核' : '只有题名覆盖 → 属结构性证据，不足以支持用法细节')]);
});
const P_09 = [
  [`上一份 33 首方里，${coveredN} 首能在本课程里找到落点（${dualN} 首题名与讲稿双覆盖），${notCovered.length} 首本课程未涉及：${notCovered.map((c) => c.name).join('、') || '无'}。`, E_PERSONA, '测量事实'],
  ['题名覆盖与讲稿提及是两种强度的证据：题名只能证明「这一讲讲过这首方」，讲稿原话才能证明「他这么用」。', E_PERSONA, '方法边界'],
  ['未被覆盖的方集中在上一份的中篇病种与附篇（妇科、肿瘤、肝病专论），说明这本书的方证经验比 24 讲课程更宽 —— 课程是纲，书是目。', E_PERSONA, '结构性比较'],
  ['把交叉表做成「每首方都有判定」的闭合表，是为了防止只统计命中的那部分而让未覆盖的方悄悄消失。', E_PERSONA, '方法要求'],
];

/** 10 对读验证（上一份的推断项逐条 + 方级条目，用 24 讲证据） */
const S10 = [['序号', '《伤寒论临床应用.xlsx》里的说法／推断', '全课程（24 讲）提供的证据', '判定', `${PERSONA} · 独立判断`]];
const VERIFY = [
  ['04表：当归四逆汤 4 目（冻疮／痛经／无脉症／乌鼻症）',
    cites(['这包括了当归四逆汤肝中养血', '当归四逆加吴茱萸汤', '当归四逆汤治疗痛经', '还用在脉管炎']),
    '一致，且有新增用法',
    '讲稿把适用范围从妇科推到脉管病与合方（合四妙勇安汤、加吴茱萸汤），并在补法篇把它的位置说成「肝中养血」；上一份据目录只到 4 个病名。'],
  ['04表：真武汤 5 目（水肿／眩晕／心动过缓／高血压／风心病）',
    cites(['我如果说我在真武汤里面', '真武汤有附子配生姜水你散水', '所以不需要用真武']),
    '一致',
    '三处相隔 12 讲：讲方义（附子配生姜散水）、讲取舍（不需要用真武时不用）、讲课上应用；病种侧与上一份列的五目相容。'],
  ['04表：小柴胡汤 13 目（从外感发热到更年期综合征）',
    cites(['从头到脚的病都可以用小柴胡', '吴鞠通的很多方都是小柴胡汤变化']),
    '一致（讲稿给了外推的根据）',
    '上一份的 13 目是目录计数；讲稿给出外推语句与「后世方多从小柴胡变化」的系谱，说明外推不是逐个案例的偶然。'],
  ['04表：桂枝汤 10 目（横跨呼吸、痹证、消化、皮肤、汗证、鼻科）',
    cites(['因为桂枝汤是个补药方子', '实际上它就是桂枝汤倍芍药加饴糖', '红枣生姜缺一不可']),
    '一致（且补了方义层证据）',
    '讲稿把桂枝汤讲成「补药方子」，并给出与小建中汤的组方关系与「红枣生姜缺一不可」的方义要求。'],
  ['02表：反对以西释中／中药西用（青霉素是凉药吗、炎症与热证）',
    cites(['现在我们的皮肤科也西化了', '那种解释就是跟你兜圈子', '全国各地一片上下都是活血化瘀']),
    '推断升级为有讲稿支持（但需细分）',
    '他反对的是「以西释中」的解释方式与西化用法；同时并不拒绝用西医病名做对照（甘草泻心汤治三联症、影响胆汁分泌）。上一份只标了「推断」，本课程给了原话。'],
  ['02表：中医的路怎么走 ↔ 统一到经典',
    cites(['我说不是中医不好是我们自己没有学好', '加强对六经辨证基本规律的理解', '实际上《伤寒论》就学了一半']),
    '推断升级为有讲稿支持',
    '三处从不同角度说同一件事：问题在学得不够而不在中医不行；出路是把六经辨证的基本规律学到位。'],
  ['03表：合方依据＝六经合病／并病',
    cites(['适应于太阳兼少阳证', '桂枝加附子汤阳虚兼表', '就是说他的药在表药跟里药同时使用']),
    '推断升级为有讲稿支持',
    '上一份是从方名结构（柴胡桂枝汤、桂枝加附子汤）反推的；讲稿用「兼证」与「表里同用」两种表述把依据讲明。'],
  ['03表：误治—救逆谱系',
    cites(['总之就是服了发汗的药以后', '且服四逆辈也就包括了理中汤的意思', '都是救阳的']),
    '推断升级为有讲稿支持',
    '讲稿里「服了发汗的药以后」引出变证群、「四逆辈」作为一组救逆方的统称、总论里「都是救阳的东西多」——谱系语言成体系。'],
  ['03表：由外感推内伤（小柴胡汤一路用到内伤杂病）',
    cites(['从头到脚的病都可以用小柴胡', '所以中医的抓住病机是非常重要', '我们就要根据病机不同来用药']),
    '推断升级为有讲稿支持',
    '讲稿给出外推的判据是病机：「抓住病机」「根据病机不同来用药」；于是同一首方可以跨病种使用。'],
  ['03表：寒热错杂的分界（半夏泻心／甘草泻心／葛根芩连／白头翁）',
    cites(['这个寒热转化', '还有半夏泻心汤的泻心汤类', '你像吴又可的达原饮']),
    '部分覆盖',
    '「寒热转化」「泻心汤类」「达原饮」都在课上出现（第 5、17 讲），但上一份说的「分界在辛开苦降与清利先后」这一具体分界，在 24 讲的 590 条抽样里没有对应的原话 —— 照实记为部分覆盖。'],
  ['03表：妇科三线（当归四逆汤／当归芍药散／中篇妇科 12 病种）',
    cites(['这包括了当归四逆汤肝中养血', '西医讲跟内分泌有关', '十几岁的女孩没有结婚的也可以有']),
    '部分覆盖',
    '当归四逆汤一线在补法篇被点名（「肝中养血」），另有与内分泌相关的病案话头；但当归芍药散与中篇妇科 12 病种在 24 讲里没有被抽到 —— 这一条大部分仍要靠原书。'],
  ['03表：以汗的异常作判别入口（自汗／漏汗／无汗症并列）',
    cites(['《伤寒论》讲的汗过多 其人心下悸', '但头汗出 往来寒热', '反汗出恶风者 桂枝加葛根汤主之']),
    '推断升级为有讲稿支持',
    '三处都是把汗的多少／部位／时相当作选方判据（汗过多→心下悸；但头汗出→往来寒热；反汗出恶风→桂枝加葛根汤），机制上与上一份的判断一致。'],
  ['03表：气化—水化组方链（真武／五苓／苓桂术甘／肾著）',
    cites(['有水就必须要有气化', '这都属于水气病里面的基本方', '其中有代表意义的我想应当就是苓桂术甘']),
    '由部分覆盖升级为有讲稿支持',
    '第 12 讲给出「有水就必须要有气化」这句连接点，第 20 讲把真武／苓桂术甘／泽泻汤一类统称「水气病里面的基本方」并点名苓桂术甘；上一份的四首方里三首被点名。'],
  ['04表：33 方中 11 首未命中《伤寒论》底本（判为《金匮》方）',
    cites(['这也是金匮上面的方子', '这也是《金匮》方里边有的', '或者金匮里面的泽泻汤']),
    '一致（且范围更宽）',
    '讲稿明说在用《金匮》方（含泽泻汤这类上一份未列的），第 13 讲还用到防己黄芪汤、第 10 讲用人参败毒散 —— 工具箱比《金匮》更宽，上一份的「11 首」是下限而不是全貌。'],
  ['03表：剂量即变量（麻黄治咳用量宜轻）',
    cites(['张仲景是一两一两的用', '有时候是三克五克六克', '特别是年轻的人不要吃']),
    '一致',
    '剂量观在 24 讲里至少三处（传统用量习惯／量级调整／人群差异），说明它是全局主张而不是个别经验。'],
  ['03表：方法边界 —— 自报「未读原书正文，推断级须人工复核」',
    `本课程 ${CORPUS.length} 条读屏原话（第 19 讲 ${L19_COUNT} 条 + 其余 ${CORPUS.length - L19_COUNT} 条）· ${LEC.length} 讲`,
    '边界更新：9 条推断里 8 条已验（6 条升级、2 条部分覆盖），1 条为边界自述本身',
    '验证强度仍然有限：抽样是骨架级的（每讲 20 条），只能支持「他讲过什么」，不支持「他完整怎么讲的」。没有一条被讲稿否证，也没有一条因此可以免于原书核对。'],
];
VERIFY.forEach((r, i) => S10.push([i + 1, r[0], r[1], r[2], r[3]]));
const P_10 = [
  [`净结果：上一份 9 条推断里，除 1 条（自述边界）本身外，7 条升级为有讲稿支持、2 条部分覆盖，0 条被讲稿否证 —— 这个比例本身就是结论：目录能推出框架，讲稿能补机制语言，但补不了细节密度。`, E_PERSONA, '测量事实'],
  ['被否证率 0 是重要的负面结果：说明上一份的推断没有靠猜测硬凑，但也说明「未被否证」不等于「已证实」。', E_PERSONA, '方法边界'],
  ['两处「部分覆盖」都落在具体分界与专病清单上 —— 越具体的推断越难被骨架级抽样命中，这是抽样密度的结构性限制。', E_PERSONA, '方法边界'],
  ['讲稿每次都在场的地方是「病机—治法—用药」这条链，缺席最多的是量化（剂量以外的参数）与随访结局。', E_PERSONA, '结构性比较'],
  ['若要把验证强度提到逐条可引，需要按全部字幕段读屏（第 19 讲 955 段 → 24 讲约 2.3 万段），成本是现方案的约 40 倍。', E_PERSONA, '工作量估算'],
];

/** 11 病理生理对读（专题） */
const S11 = [['序号', '中医表述（讲稿／经文）', '现代病理生理对应（可检验的部分）', '差异与边界', '要补什么证据']];
const PHYS = [
  ['亡阳／四肢厥冷厥逆／脉微细', '有效循环血量不足与组织灌注衰竭的共同通路（低血容量、心源性、分布性休克的终末表现）', '「亡阳」是证候群，不能映射到单一休克分型；脉象是主观触诊量', '血压／心率／尿量／乳酸盐等灌注指标'],
  ['回阳救逆（四逆汤）', '升压、复温、恢复灌注：附子类生物碱的强心与外周作用，配干姜／甘草缓和与延长', '有效成分与毒性同属乌头碱类，治疗窗窄；无血药浓度监测时只能靠临床观察', '剂量-反应与毒性观察（含心电图）'],
  ['真武汤（心下悸·头眩·身瞤动·水肿）', '心输出量下降伴水钠潴留（心衰／肺心病一类）与体液分布异常', '「水气」不等于容量过载，可见于任何分布异常', '容量评估（体重、尿量、电解质、心功能）'],
  ['「有水就必须要有气化」／水气病基本方一组', '体液分布与容量调节（心-肾-血管张力轴）在临床上表现为水肿、尿量、体重变化', '「气化」是功能概括，不是可测量的量；一组方不等于同一机制', '出入量、体重、利钠肽、心功能评估'],
  ['白通汤／阴盛格阳', '休克后期外周血管扩张、核心-外周温度梯度倒置的表型之一', '假说层面；格阳的辨识依赖面赤这类主观征象', '体温梯度、血流动力学监测'],
  ['当归四逆汤／寒凝则血滞', '低温与应激致血管收缩、血液黏度上升、微循环淤滞（雷诺、冻疮、脉管病同层表现）', '「血滞」不是血栓的同义词；活血≠抗凝', '皮温、甲襞微循环、血流变学指标'],
  ['循衣摸床撮空理线／鼾声如雷肺绝', '谵妄／代谢性脑病 与 呼吸中枢抑制或上气道梗阻', '床边征象信度低、可重复性差，不能单独用于分诊', '标准化意识与呼吸评估（谵妄筛查、血气）'],
  ['生脉散「监制阳药」', '加用益气养阴药以缓冲温阳药的耗散与毒性，接近「血管活性药 + 容量／电解质支持」的组合思路', '这是配伍层面的类比，不是药理等效', '配伍前后血压／心率／不良反应对比'],
  ['补气生血（当归补血汤）／「一补气这个病人两三天他的精神就来了」', '贫血与乏力症状对支持治疗的反应：主观精力改善可能先于客观指标', '主观改善与客观造血指标不是同一终点；「气」不可直接测量', '血常规、网织红细胞、铁代谢，与主观量表同测'],
  ['三克五克六克（剂量量级）', '剂量滴定：窄治疗窗药物上，量级差异直接决定效应与毒性', '经验滴定缺个体差异建模（体重、肝肾功能）', '逐例剂量-效应记录'],
  ['阳证可以出现神昏谵语', '感染／代谢性脑病可在无「阴寒」表现时出现，与现代认识一致', '语言层不同（阳证 vs 脑病），指向的鉴别任务相同', '意识评估量表 + 病因（感染／代谢／药物）'],
];
PHYS.forEach((r, i) => S11.push([i + 1, r[0], r[1], r[2], r[3]]));
const P_11 = [
  ['总判断：本课程的临床语言可以逐条找到现代的对应问题域，但「对应」都停在问题域一层，没有一条能直接换算成参数阈值。', E_PERSONA, '测量事实'],
  [`本版新增的两条（水气病基本方一组、补气生血）来自全课程读到的原话，其可检验性低于第 19 讲的剂量条：一个是功能概括，一个是主观终点。`, E_PERSONA, '可检验性判断'],
  ['最接近可检验的两条是「剂量量级」与「缺生姜不可」：前者是剂量-效应，后者是复方整体效应，都能设计小规模对照。', E_PERSONA, '可检验性判断'],
  ['最需要小心的是「回阳救逆＝升压」这类简化：温阳药的药理是双向的（强心 + 致心律失常），当升压药用会放大毒性风险。', E_PERSONA, '风险提示'],
  ['若把这些对读写进教学内容，必须保留「差异与边界」一列；删掉它就是把类比说成结论。', E_PERSONA, '方法要求'],
];

/** 12 溯源 */
const S12 = [['条号', '项目', '内容']];
const push12 = (k, v) => S12.push([S12.length, k, v]);
push12('交付物', '验证-伤寒论.xlsx（本文件）—— 用陈瑞春讲伤寒论 24 讲的讲者原话，对《伤寒论临床应用.xlsx》的推断做逐条对读验证，并附病理生理学视角的独立理解');
push12('源视频（本讲）', `https://www.bilibili.com/video/${VIDEO.bvid}/`);
push12('视频', `${VIDEO.title} · UP ${VIDEO.owner}（mid ${VIDEO.ownerMid}）· 时长 ${fmt(VIDEO.duration)} · 发布 ${VIDEO.pubdate}`);
push12('合集合计', `${VIDEO.seasonTitle}（season ${VIDEO.seasonId}）· ${LEC.length} 讲 · 实测合计 ${fmtH(durMeasuredTotal)} · 播放 ${VIDEO.seasonView} · 收藏 ${VIDEO.seasonFav}`);
push12('读到的讲数', `${LEC.length} 讲中读到的：第 19 讲用 150 条密样本；其余 ${courseDoc.coverage.lecturesRead} 讲各 20 条；第 8 讲与第 6 讲同源（见下）`);
push12('第 8 讲同源', DUPES.length ? `第 ${DUPES[0].no} 讲与第 ${DUPES[0].duplicateOf} 讲是同一份视频：bvid/cid 不同，但抽帧分段统计逐位相同（${JSON.stringify(courseDoc.lectures.find((l) => l.no === DUPES[0].no).frames)} 帧 / ${courseDoc.lectures.find((l) => l.no === DUPES[0].no).stableSegments} 稳定段 / ${courseDoc.lectures.find((l) => l.no === DUPES[0].no).textSegments} 有字段），20 个抽样时间码完全一致 → 该讲不作为独立证据，覆盖计数只算一次` : '无');
push12('源目录', `standards/materials/${SLUG}/sources/（视频页原件 + 接口返回 + 逐讲统计 + 两份读屏样本 + 39 张拼图 + 上一份快照）`);
push12('视频页 sha256', sha256(PAGE));
push12('第19讲样本 sha256', sha256(SAMPLES19));
push12('全课程样本 sha256', sha256(COURSES));
push12('逐讲统计 sha256', sha256(META_LEC));
push12('上一份快照 sha256', sha256(PREV_SNAP));
push12('上一份交付物', `${prevState.note}；被验证版本 sha256 ${snap.prevDeliverable.sha256}；33 行方证 + ${snap.inferenceRows.length} 条自报待核推断` + (prevState.warn ? `｜${prevState.warn}` : ''));
push12('视频文件', '未入库：各讲 360p 直链合计约 3 GB，可由 bvid/cid 重新取链，故不计入仓库体积；第 19 讲那份留了 api-playurl.json');
push12('取稿方式', '不是平台字幕：字幕接口对未登录请求返回空列表（sources/api-player-v2.json 可查）。实际用的是画面硬字幕 —— 0.5s 取 1 帧、只取底部字幕窄条，按相邻帧 MAD>3.0 找换行段，再用「描边白字占比 + Otsu」筛出有字段，等距抽样后拼图逐图读屏');
push12('有字判据', courseDoc.filter);
push12('语音转写（正文层）', `faster-whisper ${(ASR_DOC.modelDir || '（未转写）')} · CTranslate2 int8 · CPU ${8} 线程 · 音频由 360p 视频的 DASH 音轨抽出（16kHz 单声道 PCM）· VAD（silero，静音≥500ms）切段 · beam_size=5 · condition_on_previous_text=False · initial_prompt 带《伤寒论》术语与方名表`);
push12('转写进度', ASR_LEC.length
  ? `已完成 ${ASR_LEC.length} 讲（第 ${ASR_LEC.map((l) => l.no).sort((a, b) => a - b).join('、')} 讲）`
    + (ASR_PENDING.length ? `；**未完成：第 ${ASR_PENDING.join('、')} 讲**（12/13 两表按已完成部分生成，缺的部分在 13 表总结块里显式列出）` : '；其余各讲（除同源的第 8 讲）全部完成')
  : '尚未开始：12/13 两表为空表，本表如实标注');
push12('转写总量', ASR_LEC.length
  ? `音频 ${(ASR_AUDIO_SEC / 3600).toFixed(2)} 小时 · 正文 ${ASR_CHARS} 字 · ${ASR_SEGS.length} 段 · 平均 ${ASR_DOC.totals.speed || '—'}× 实时（i7-7700 八线程）`
  : '—');
push12('转写准确度（实测）', ASR_RECALL === null
  ? '尚无可比对的字幕（转写开始后自动计算）'
  : `拿 ${CAPTIONS.length} 条人读字幕当答案，逐条与 ASR 同时段文本比对：平均字级召回 ${ASR_RECALL.toFixed(3)}、其中 ${(ASR_GOOD_RATE * 100).toFixed(0)}% 达 0.8 以上（见 14 表）。这是「机器转写能直接用多少」的量化，不是印象`);
push12('两层证据的分工', '字幕层（读屏，人读原文）= 可引用的原话，但只覆盖有字幕的时刻；ASR 层（语音转写）= 覆盖全时长的正文，但有字级错误。'
  + '因此：引用只用字幕层；ASR 层用于「哪些讲、哪些时刻讲了什么」的检索与上下文补齐，凡 ASR 引文都带〈ASR〉标记');
push12('每表正文出处块', '17 张表每张末尾固定一块「◆ 语音正文出处」：3–4 条「第N讲 mm:ss ＋ 正文 ＋ 校验行」。正文优先取**人读字幕原文**（与这段 ASR 语义对位率 ≥0.7 且字幕 ≥10 字才可用），没有可引字幕时才退回 ASR 原文并在句首标〈ASR〉。校验行同时给出读屏序号、对位率与同一时刻的 ASR 原文开头');
push12('语义对齐算法', '窗口（±6s）内每条字幕都与该段 ASR 做 LCS + 回溯对位：对位率 = 匹配字数 / 字幕字数，并记落点是否连续。窗口内多候选取对位率最高的一条 —— 这一步排除了「时间上挨着、内容无关」的错位字幕（如第5讲 12:56「一秒钟都没有」）与残句（如「所以我的观点就是」8 字）');
push12('抽样密度', `全课程 ${courseDoc.samples.length} 条（${courseDoc.coverage.lecturesRead} 讲 × 20 条，等距）＋ 第 19 讲 ${L19_COUNT} 条密样本 = ${CORPUS.length} 条原话；逐讲覆盖率为 ${LEC.map((l) => `${l.no}:${l.samples || (l.no === 19 ? 150 : 0)}`).filter((s) => !s.endsWith(':0')).join(' ')}`);
push12('换行检测（第19讲）', `${seg19.frames} 帧 @${seg19.fps}fps · 稳定段 ${seg19.stableSegments} · 阈值 MAD>${seg19.threshold} · 平均段长 ${seg19.medianSegLen}s`);
push12('全课程抽帧', `${metaDoc.totals.frames} 帧 · 稳定段 ${metaDoc.totals.stableSegments} · 有字段 ${metaDoc.totals.textSegments}（${Math.round((metaDoc.totals.textSegments / metaDoc.totals.stableSegments) * 100)}%）`);
push12('读屏风险', '逐图读出，可能有个别形近误字（如「铺头」疑为「开头」、「把根线条一年起来」疑为「串起来」）；未改写、未补句，逐条可在 sources/grids/*.jpg 回图核对');
push12('底本交叉', `《伤寒论》底本 ${base.pian.length} 篇 ${TIAO.length} 条 ${base.domains.length} 域；第 19 讲对账 ${FORMULAS.length} 首方，命中 ${hitFormulas.length} 首，未命中 ${FORMULAS.length - hitFormulas.length} 首（均为后世方）`);
push12('全课程方证交叉', `上一份 33 首方：${coveredN} 首在本课程找到落点（其中 ${dualN} 首题名＋讲稿双覆盖），${notCovered.length} 首未覆盖（${notCovered.map((c) => c.name).join('、') || '无'}）`);
push12('对读验证', `上一份 ${snap.inferenceRows.length} 条自报待核推断：7 条升级为有讲稿支持、2 条部分覆盖、0 条被否证；另有 4 条方级条目与 2 条别的条目一并复验（见 10 表）`);
push12('独立理解', `每张表底部都追加「${PERSONA} 的独立理解总结」；该部分不是讲者观点，是据讲稿与经文做的病理生理学重构，凡推断标「生理学推论／药理推论／方法学推论／结构性比较」，凡测量标「测量事实」`);
push12('本文件不含', '原书正文、逐字稿、未被抽到的字幕；也不含任何未经核对的引用');
push12('重建命令', 'node scripts/import_chenruchun_lectures.js');
push12('校验命令', 'node scripts/import_chenruchun_lectures.js --check；node tests/test_chenruchun_lectures.js');

const P_00 = [
  ['这张表的组织方式本身说明了取证顺序：先把原话摊开（05 表第 19 讲密样本 + 06 表全课程扫读），再做结构（01–04、07–09），最后对读（10）与对读之外的现代映射（11）。', E_PERSONA, '结构性比较'],
  [`证据链的可复核点有三层：拼图（图能看）→ 逐讲统计（抽样密度能算）→ 有字判据的准确率（100 条样本里有没有真字幕）—— 三层都写进本文件，不依赖「我说读过」。`, E_PERSONA, '方法要求'],
  ['把「读屏证据」单独成表（而不是把引文散在结论里）是这份交付物的关键判断：没有这一步，对读验证就退化成两个印象之间的比较。', E_PERSONA, '方法要求'],
  ['现代解释集中放在 11 表并强制带「差异与边界」列，其余各表只做一句对读 —— 这是为了防止把类比当结论。', E_PERSONA, '方法要求'],
];
const P_12 = [
  ['视频证据的强度高于目录推断、低于逐字稿：590 条等距样本能支持「他讲过什么、在哪些讲里讲」，不支持「他完整怎么讲的」。', E_PERSONA, '方法边界'],
  ['加了语音转写层之后，这份材料第一次有了「全时长正文」：读屏字幕是骨架（有多少字幕就有多少），ASR 是整块（覆盖 100% 时长），两者不是替代关系。', E_PERSONA, '结构性比较'],
  ['ASR 的字级错误率是必须写在交付物里的数字（本次实测见「转写准确度」行）：把带错误的机器文本当经文，比没有正文更危险。', E_PERSONA, '风险提示'],
  ['用已有的人读字幕去校正/评估新引入的机器层，是本次能给出召回数字的原因 —— 新工具必须拿旧证据当尺子，否则只是多了一个不可核的印象来源。', E_PERSONA, '方法要求'],
  ['读屏这条路可复用：平台字幕接口未登录返回空，硬字幕 + MAD 换行检测 + 有字判据 + 拼图读屏是目前本机唯一可行的取稿方式；24 讲批处理约 40 分钟（下载＋抽帧＋拼图）。', E_PERSONA, '方法推论'],
  ['源数据本身可能有缺陷（第 8 讲同源、个别讲时长明显偏短）：把这类发现写进溯源，比把它们平均掉更符合「测量先说清」的要求。', E_PERSONA, '风险提示'],
];


/** 07 表的「语音转写」列：必须在这里填（accOf 在上一段才可用） */
S07.slice(1).forEach((row) => {
  const no = Number(/第 (\d+) 讲/.exec(String(row[1]))[1]);
  const asr = ASR_LEC.find((x) => x.no === no);
  const acc = accOf(no);
  row[6] = asr
    ? `${asr.segments} 段／${asr.chars} 字／${(asr.audioSec / 60).toFixed(1)} 分钟音频（${asr.speed}× 转写）${acc ? ` · 字幕校核 ${acc.n} 条均值 ${acc.recall.toFixed(2)}` : ''}`
    : (dupeNos.includes(no) ? '不转写（与第 6 讲同源）' : '未转写');
});


/** 12 讲稿全文（第 19 讲 · ASR 逐段） */
const S12A = [['序号', '时间码', '正文（ASR 转写，未逐字校对）', '字幕校核（同一时刻画面上的原文，人读）', '召回', `${PERSONA} · 逐条备注（仅关键行）`]];
(ASR_BY_LEC.get(19) || []).forEach((s, i) => {
  const c = captionForSeg(s);
  S12A.push([i + 1, s.mmss, s.text, c ? `${c.line}（读屏 ${c.ref}）` : '—（该时刻画面无字幕）',
    c ? c.recall.toFixed(2) : '—', KEY_NOTES_19[normT(s.mmss)] || '—']);
});
const P_12A = [
  [`本讲 ASR 段 ${(ASR_BY_LEC.get(19) || []).length} 段，正文 ${((ASR_BY_LEC.get(19) || []).reduce((a, s) => a + s.text.length, 0))} 字，覆盖全片 —— 这一张才是「正文」，读屏字幕那一张只是骨架。`, E_PERSONA, '测量事实'],
  [ASR_RECALL === null ? '（本讲尚未参与校核）' : `用画面字幕当答案测得平均召回 ${(accOf(19) ? accOf(19).recall : ASR_RECALL).toFixed(3)}（${accOf(19) ? accOf(19).n : 0} 条字幕参与）—— 这是机器转写的字级准确度上限，不是 100%。`, E_PERSONA, '测量事实'],
  ['因此本表的正文只能当「内容索引」用：要引用原话，优先用「字幕校核」列（人读原文），ASR 列用于定位与补齐上下文。', E_PERSONA, '方法边界'],
  ['读屏字幕是分段配的（有字幕的时刻才有人读原文），所以「—（该时刻画面无字幕）」不表示那句话不存在，只表示没有人工校核。', E_PERSONA, '方法边界'],
];

/** 13 讲稿全文（全课程 · ASR 逐段，第 19 讲见 12 表） */
const S13A = [['序号', '讲次', '时间码', '正文（ASR 转写，未逐字校对）', '字幕校核（人读原文）', '召回', `${PERSONA} · 逐条备注（仅关键行）`]];
let s13n = 0;
ASR_LEC.filter((l) => l.no !== 19).sort((a, b) => a.no - b.no).forEach((l) => {
  (ASR_BY_LEC.get(l.no) || []).forEach((s) => {
    s13n += 1;
    const c = captionForSeg(s);
    S13A.push([s13n, `第${l.no}讲`, s.mmss, s.text,
      c ? `${c.line}（读屏 ${c.ref}）` : '—', c ? c.recall.toFixed(2) : '—', '—']);
  });
});
const P_13A = [
  [`全课程 ASR 正文 ${ASR_CHARS} 字 / ${ASR_SEGS.length} 段，覆盖 ${ASR_LEC.length} 讲、音频 ${(ASR_AUDIO_SEC / 3600).toFixed(2)} 小时；第 8 讲与第 6 讲同源，不重复转写。`, E_PERSONA, '测量事实'],
  [ASR_PENDING.length ? `尚未转写的讲次：${ASR_PENDING.map((n) => `第 ${n} 讲`).join('、')} —— 本表按已完成部分生成，缺的部分在这里显式列出，不静默。` : '24 讲（除同源的第 8 讲）已全部转写完毕。', E_PERSONA, '测量事实'],
  ['ASR 文本有字级错误（口音 + 老录音），不是逐字稿：本表的价值在于「把 20 小时的讲授变成可检索的文本」，不在于可以原样引用。', E_PERSONA, '方法边界'],
  ['凡有字幕校核的行，引用请用校核列；没有校核列的行，引用前须回原片听音频确认。', E_PERSONA, '方法要求'],
];

/** 14 字幕对照校核（读屏字幕 ↔ ASR 同时段文本） */
const S14 = [['序号', '讲次', '时间码', '字幕原文（人读，画面所见）', 'ASR 同时段文本', '召回', '判定']];
CAPTIONS.forEach((c, i) => {
  const win = asrWindow(c.lecture, c.sec);
  const r = win ? lcsLen(c.line, win) / c.line.length : null;
  S14.push([i + 1, `第${c.lecture}讲`, c.mmss, c.line, win || '（该讲未转写）', r === null ? '—' : r.toFixed(2),
    r === null ? '未转写' : (r >= 0.8 ? 'ASR 与字幕基本一致' : (r >= 0.5 ? '部分一致（机器转写有字级错误）' : '差异大（口音/术语）'))]);
});
const P_14 = [
  [`${CAPTIONS.length} 条人读字幕逐条与 ASR 同时段文本对照：平均召回 ${ASR_RECALL === null ? '—' : ASR_RECALL.toFixed(3)}、其中 ${ASR_GOOD_RATE === null ? '—' : (ASR_GOOD_RATE * 100).toFixed(0)}% 达到 0.8 以上。`, E_PERSONA, '测量事实'],
  ['这张表是整份交付物的「准确度凭证」：ASR 正文能用多少、哪里不能直接用，取决于这里的召回而不是凭印象。', E_PERSONA, '方法要求'],
  ['差得最多的是术语与方言音（如「温法」被写成「文胜犯」、「少阴亡阳」被写成「少阴阳熙」）—— 这类词在引用时必须回到字幕列或原片。', E_PERSONA, '方法边界'],
  ['用字幕当答案有偏置：字幕只在有字幕的时刻存在，且是配好的短句，因此这里的召回是「在字幕覆盖处的下限估计」，不等于全文准确率。', E_PERSONA, '方法边界'],
];

/** 16 术语纠错表（以人读字幕为依据）—— 只做佐证分档，不产生新规则 */
const CAP_JSON = path.join(SRC, 'transcripts', 'corrections-by-captions.json');
const CAPDOC = fs.existsSync(CAP_JSON) ? JSON.parse(fs.readFileSync(CAP_JSON, 'utf8')) : null;
const CAP_ROWS = CAPDOC ? CAPDOC.rows : [];
const capKey = new Set(CAPTIONS.map((c) => `${c.lecture}|${c.mmss}|${c.line}`));
/** 按讲次+时间码（+读屏序号）回查人读字幕原文 */
const capLineOf = (lec, mmss, ref) => {
  const hit = CAPTIONS.find((c) => c.lecture === Number(lec) && c.mmss === mmss
    && (ref === undefined || String(c.ref) === String(ref)));
  return hit ? hit.line : null;
};
const S16 = [['序号', '类', '错形（ASR 原文）', '正名', '证据等级', 'ASR 出现', '出现讲次', '字幕依据（讲次 · 时间码 · 原文）', '原置信', '处理建议']];
const advice = (r) => {
  if (r.evidence === '字幕直证') return r.level === 'low' ? '已证（原置信 low，替换后抽看）' : '已证，可直接替换';
  if (r.evidence === '字幕旁证') return '词存在（别讲有原文），本讲无 → 替换保留';
  if (r.level === 'human') return '用户已人工判定，保留（无字幕依据）';
  return '须人工核（仅拼音，无字幕依据）';
};
CAP_ROWS.forEach((r, i) => {
  S16.push([
    i + 1, r.kind, r.wrong, r.right, r.evidence, r.asrCount,
    r.wrongLectures.length ? `第 ${r.wrongLectures.join('、')} 讲` : '—',
    r.cite ? `第${r.cite.lecture}讲 ${r.cite.mmss}（读屏 ${r.cite.ref}）「${r.cite.line}」` : '—（任何字幕都没有这个正名）',
    r.level, advice(r),
  ]);
});
const P_16 = [
  [`待核规则 ${CAP_ROWS.length} 条 → 字幕直证 ${CAPDOC ? CAPDOC.stats.direct : 0}（同讲原文可引）· 旁证 ${CAPDOC ? CAPDOC.stats.indirect : 0} · 仅拼音 ${CAPDOC ? CAPDOC.stats.pinyinOnly : 0}；直证覆盖 ${CAPDOC ? CAPDOC.stats.asrHitsCovered : 0}/${CAPDOC ? CAPDOC.stats.asrHitsTotal : 0} 处替换。`, E_PERSONA, '测量事实'],
  ['字幕只能给「佐证」，不能用来盲找错形：试过滑窗等长比对，727 条「采纳」全是巧合（是不是→你不要、个道理→个方子），汉语常用词两字之差的碰撞率极高 —— 没有对齐信息的配对等于随机。', E_PERSONA, '方法边界'],
  ['「仅拼音」那 24 条不是错的，只是这一层证不了：字幕是分段配的（540 条／19 小时），没字幕的地方就没有人读原文可用。要求它们「有依据」等于要求字幕全覆盖，做不到。', E_PERSONA, '方法边界'],
  ['直证比例本身就是可写进方法学的数字：19/64 有同讲原文、21/64 只有别讲旁证 —— 拼音纠错的置信度分布，比「全部已校正」这种说法诚实得多。', E_PERSONA, '结构性比较'],
  ['凡替换只进 corrected/ 层、段末留原形，原件与识别稿一字不动：这样「纠错」永远不会污染证据链。', E_PERSONA, '方法要求'],
];

/** 组装所有表 */
function assembleWorkbook(measure, built) {
  const S12_BLOCK = (() => {
    const rows = S12.slice();
    rows.push(['', '', '']);
    rows.push(['※', `${PERSONA} 的独立理解总结`, '【对方法本身的独立判断】 以下不是讲者观点']);
    P_12.forEach((p, i) => rows.push([`H${i + 1}`, p[0], `${p[1]}（${p[2]}）`]));
    return rows;
  })();

  const measured = built.map((s) => ({ id: s.id, name: s.name, domain: s.domain, body: s.rows.length, total: s.allRows.length, chars: measure(s.allRows) }));
  const chars12 = measure(S12_BLOCK.slice(1));
  // 溯源的 ◆ 语音正文块也计入本表行数与字数（否则 00目录 会少算）
  const S12_SPEECH = speechBlockRows('17', '溯源（出处·指纹·方法边界）', 1, 4);
  const traceRows = S12_BLOCK.concat(S12_SPEECH);

  const S00_HEAD = ['内序', '篇名', '域', '本体行数', '含总结行数', '字数（全表实测）'];
  const indexRows = [[0, '00目录', '索引', 0, 0, 0]];
  measured.forEach((m, i) => indexRows.push([i + 1, m.name, m.domain, m.body, m.total, m.chars]));
  indexRows.push([measured.length + 1, '17溯源', '溯源（出处·指纹·方法边界）', S12.length - 1, traceRows.length - 1, chars12 + measure(S12_SPEECH)]);

  const buildS00 = (ownChars) => {
    const rows = indexRows.map((r) => r.slice());
    rows[0][3] = rows.length;
    rows[0][5] = ownChars;
    rows.push(Array(S00_HEAD.length).fill(''));
    const title = Array(S00_HEAD.length).fill('');
    title[0] = '※';
    title[1] = `【${PERSONA} 的独立理解总结】 以下不是讲者观点`;
    rows.push(title);
    P_00.forEach((p, i) => rows.push([`H${i + 1}`, p[0], p[1], p[2], '', '']));
    rows.push(...speechBlockRows('00', '索引', 1, S00_HEAD.length));   // ◆ 语音正文出处（也计入本表行数）
    rows[0][4] = rows.length;                                          // 含总结行数 = 整张表实际行数
    return rows;
  };
  let ownChars = 0;
  for (let i = 0; i < 6; i += 1) {
    const next = measure(buildS00(ownChars));
    if (next === ownChars) break;
    ownChars = next;
  }
  if (measure(buildS00(ownChars)) !== ownChars) {
    console.error('✗ 00目录 的字数没有收敛（自指计数不稳定），请检查列宽与内容');
    process.exit(1);
  }
  const S00 = [S00_HEAD, ...buildS00(ownChars).slice(0)];

  const WORKBOOK = [
    { name: '00目录', rows: [S00[0], ...S00.slice(1)], cols: [8, 16, 34, 11, 13, 16], wrap: [1, 2] },
    ...built.map((s) => ({ name: s.name, rows: [s.head, ...s.allRows], wrap: s.wide })),
    { name: '17溯源', rows: traceRows, cols: [8, 18, 46, 60], wrap: [2, 3] },
  ];
  return { S12_BLOCK, measured, chars12, S00, WORKBOOK };
}

const SHEETS = [
  { id: '01', name: '01学法', domain: '方法（讲稿证据）', head: ['条号', '段内句数', '正文', '出处', '证据', `${PERSONA} · 独立理解`], rows: SHEET_01.map((r, i) => [i + 1, sentCount(r[0]), r[0], r[1], r[2], r[3]]), persona: P_01, wide: [3, 4, 5, 6], bodyCol: 2 },
  { id: '02', name: '02学术思想', domain: '思想（讲稿证据）', head: ['条号', '段内句数', '正文', '出处', '证据', `${PERSONA} · 独立理解`], rows: SHEET_02.map((r, i) => [i + 1, sentCount(r[0]), r[0], r[1], r[2], r[3]]), persona: P_02, wide: [3, 4, 5, 6], bodyCol: 2 },
  { id: '03', name: '03分析逻辑', domain: '逻辑（讲稿证据）', head: ['条号', '段内句数', '正文', '出处', '证据', `${PERSONA} · 独立理解`], rows: SHEET_03.map((r, i) => [i + 1, sentCount(r[0]), r[0], r[1], r[2], r[3]]), persona: P_03, wide: [3, 4, 5, 6], bodyCol: 2 },
  { id: '04', name: '04本讲方证', domain: '第 19 讲出现的方（整理）', head: S04[0], rows: S04.slice(1), persona: P_04, wide: [3, 4, 5, 6], bodyCol: 3 },
  { id: '05', name: '05讲稿抽读', domain: '原话证据（第 19 讲密样本 150 条）', head: S05[0], rows: S05.slice(1), persona: P_05, wide: [3, 5], bodyCol: 2 },
  { id: '06', name: '06全课程抽读', domain: '原话证据（22 讲 × 20 条）', head: S06[0], rows: S06.slice(1), persona: P_06, wide: [4, 6], bodyCol: 3 },
  { id: '07', name: '07八法体系', domain: '24 讲合集（逐讲实测）', head: S07[0], rows: S07.slice(1), persona: P_07, wide: [3, 6, 7], bodyCol: 2 },
  { id: '08', name: '08底本交叉', domain: '方 × 《伤寒论》底本（第 19 讲）', head: S08[0], rows: S08.slice(1), persona: P_08, wide: [4, 5, 6], bodyCol: 2 },
  { id: '09', name: '09全课程方证交叉', domain: '上一份 33 方 × 24 讲覆盖', head: S09[0], rows: S09.slice(1), persona: P_09, wide: [2, 4, 5, 6, 7], bodyCol: 2 },
  { id: '10', name: '10对读验证', domain: '与《伤寒论临床应用.xlsx》对读', head: S10[0], rows: S10.slice(1), persona: P_10, wide: [2, 3, 4, 5], bodyCol: 1 },
  { id: '11', name: '11病理生理对读', domain: `${PERSONA} 专题`, head: S11[0], rows: S11.slice(1), persona: P_11, wide: [2, 3, 4, 5], bodyCol: 1 },
  { id: '12', name: '12讲稿全文·19讲', domain: '正文（语音转写 ASR·第 19 讲）', head: S12A[0], rows: S12A.slice(1), persona: P_12A, wide: [3, 4, 6], bodyCol: 2 },
  { id: '13', name: '13讲稿全文·全课程', domain: '正文（语音转写 ASR·其余各讲）', head: S13A[0], rows: S13A.slice(1), persona: P_13A, wide: [4, 5, 7], bodyCol: 3 },
  { id: '14', name: '14字幕对照校核', domain: '字幕（人读）× ASR 逐条对照', head: S14[0], rows: S14.slice(1), persona: P_14, wide: [4, 5, 7], bodyCol: 3 },
  { id: '16', name: '16术语纠错表', domain: '术语校正 × 人读字幕佐证', head: S16[0], rows: S16.slice(1), persona: P_16, wide: [3, 4, 7, 8, 10], bodyCol: 3 },
];

/** 语音正文出处块：每张表末尾固定挂 3–4 条「ASR 原句 + 时间码 + 对应字幕行」，
 *  格式：第N讲 mm:ss ｜ 原句（≤40 字，必须与 12/13 表同一段逐字相同）｜ 字幕校核行
 *  选段规则：按该表主题的关键词在 22,301 段里挑分最高、且来自不同讲次的段；不随机、不跨主题借句子。 */
const SPEECH_SEL = {
  '00': { domain: '索引', kw: ['学习方法', '临床', '辨证', '伤寒论'] },
  '01': { domain: '学法', kw: ['读书', '学习', '背', '临床', '实践', '笔记', '反复', '总结'] },
  '02': { domain: '学术思想', kw: ['思想', '学术', '仲景', '观点', '我认为', '张仲景', '后人', '著作'] },
  '03': { domain: '分析逻辑', kw: ['辨证', '分析', '思路', '为什么', '关键', '区别', '本质'] },
  '04': { domain: '本讲方证', kw: ['方证', '汤证', '主治', '适应证', '证候'] },
  '05': { domain: '第19讲讲稿抽读', kw: [], captionOf: 19 },
  '06': { domain: '全课程抽读', kw: [], captionOf: 'all' },
  '07': { domain: '八法体系', kw: ['汗法', '吐法', '下法', '和法', '温法', '清法', '补法', '消法'] },
  '08': { domain: '底本交叉', kw: ['原文', '条文', '伤寒论', '经方', '书中', '张仲景'] },
  '09': { domain: '全课程方证交叉', kw: [], formulas: true },
  '10': { domain: '对读验证', kw: ['验证', '一致', '不同', '推断', '结论', '对照'] },
  '11': { domain: '病理生理对读', kw: ['病理', '生理', '机理', '机制', '导致', '因此'] },
  '12': { domain: '第19讲正文', kw: [], lecture: 19 },
  '13': { domain: '其余各讲正文', kw: [], notLecture: 19 },
  '14': { domain: '字幕对照', kw: [], captionOf: 'all' },
  '16': { domain: '术语纠错', kw: ['四逆散', '小柴胡汤', '理中汤', '桂枝汤', '泻心汤', '乌梅丸', '真武汤', '五苓散'] },
  '17': { domain: '溯源抽样', kw: [], spread: true },
};

const SPEECH_NEAR = new Map();
CAPTIONS.forEach((c) => {
  if (!SPEECH_NEAR.has(c.lecture)) SPEECH_NEAR.set(c.lecture, []);
  SPEECH_NEAR.get(c.lecture).push(c);
});

/** 该段时间最近的读屏字幕（±5s） */
function captionNear(lecture, sec) {
  const list = SPEECH_NEAR.get(lecture) || [];
  let best = null;
  list.forEach((c) => {
    const d = Math.abs(c.sec - sec);
    if (d <= 5 && (!best || d < best.d)) best = { ...c, d };
  });
  return best;
}

/** 语义对齐：把一条字幕与一段 ASR 逐字对位（LCS + 回溯）。
 *  返回 {ratio, span:[i0,i1], gaps, letters}：
 *    ratio   匹配上的字数 / 字幕字数（「这两句说的是同一句话」的强度）
 *    span    在 ASR 段内的落点（首末匹配位置）
 *    gaps    落点区间内未匹配的字数（越大越不连续 → 越可能是凑巧同字）
 *  只有 ratio 高且落点连续，才算「这条字幕就是这段的正文」。 */
function alignSemantic(cap, seg) {
  const a = String(cap); const b = String(seg);
  const n = a.length; const m = b.length;
  if (!n || !m || n > 200 || m > 400) return null;
  const dp = [];
  let prev = new Uint16Array(m + 1);
  for (let i = 1; i <= n; i += 1) {
    const cur = new Uint16Array(m + 1);
    for (let j = 1; j <= m; j += 1) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], cur[j - 1]);
    }
    dp.push(cur);
    prev = cur;
  }
  const matched = dp[n - 1][m];
  // 回溯出匹配位置（在 b 中的下标）
  const spots = [];
  let i = n; let j = m;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { spots.push(j - 1); i -= 1; j -= 1; }
    else if (dp[i - 1][j] === (i > 1 ? dp[i - 2][j] : 0)) i -= 1;
    else j -= 1;
  }
  if (!spots.length) return { ratio: 0, span: [0, -1], gaps: m, letters: 0 };
  const lo = Math.min(...spots); const hi = Math.max(...spots);
  return { ratio: matched / n, span: [lo, hi], gaps: (hi - lo + 1) - spots.length, letters: matched };
}

/** 窗口内多条字幕都试对齐，取匹配率最高的一条（错位字幕靠这一步被排除） */
function bestCaptionFor(seg, captions, win = 6) {
  let best = null;
  captions.forEach((c) => {
    if (Math.abs(c.sec - seg.start) > win) return;
    const al = alignSemantic(c.line, seg.text);
    if (!al || al.ratio <= 0) return;
    const score = al.ratio - (al.gaps / Math.max(1, seg.text.length)) * 0.2
      + (c.targeted && Math.abs(c.sec - seg.start) <= 4 ? 0.5 : 0);   // 补采帧是这一刻的真原话，优先级高于同窗旧样本
    if (!best || score > best.score) best = { cap: c, d: Math.abs(c.sec - seg.start), ...al, score };
  });
  return best;
}

/** 该条字幕与 ASR 的召回（已在 CAP_BY_LEC 里预算过） */
function recallOf(lecture, mmss) {
  const hit = (CAP_BY_LEC.get(lecture) || []).find((c) => c.mmss === mmss);
  return hit && typeof hit.recall === 'number' ? hit.recall : null;
}

/** 全局已用段：同一段正文只许进一张表，避免「九张表都在引同一句开场白」的凑数 */
const SPEECH_USED = new Set();
const segKeyOf = (s) => `${s.lecture}:${s.start}`;

/** 选段：主题词优先，其次「有字幕可校 + 召回高 + 句子完整」——乱码段自然排到后面 */
function pickSpeech(cfg, max = 4) {
  const FORMULAS = ['四逆汤', '真武汤', '桂枝汤', '小柴胡汤', '理中汤', '麻黄汤', '白虎汤', '承气汤', '五苓散', '乌梅丸'];
  let pool = ALL_SEGS.filter((s) => s.text.length >= 16 && s.text.length <= 120);
  if (cfg.lecture) pool = pool.filter((s) => s.lecture === cfg.lecture);
  if (cfg.notLecture) pool = pool.filter((s) => s.lecture !== cfg.notLecture);
  if (cfg.captionOf === 19) pool = pool.filter((s) => (SPEECH_NEAR.get(19) || []).some((c) => Math.abs(c.sec - s.start) <= 5));
  if (cfg.captionOf === 'all') pool = pool.filter((s) => (SPEECH_NEAR.get(s.lecture) || []).some((c) => Math.abs(c.sec - s.start) <= 5));
  const words = cfg.formulas ? FORMULAS : (cfg.kw || []);
  const scored = pool.map((s) => {
    const caps = SPEECH_NEAR.get(s.lecture) || [];
    const al = bestCaptionFor(s, caps, 10);   // ±10s：字幕与语音常有 5–9s 的显示滞后
    const ratio = al ? al.ratio : 0;
    // 能当正文：整句对位（ratio ≥0.7）且字幕不是残句（≥10 字）；
    // 残句（如「所以我的观点就是」）虽然对得上，但单独成句没信息量 → 只作旁证
    // 证据随时间差衰减：滞后 ≤4s 要 0.70，≤6s 要 0.75，更远要 0.85 —— 窗口放大到 ±10s 后必须配这条
    const need = !al ? 1 : (al.d <= 4 ? 0.7 : (al.d <= 6 ? 0.75 : 0.85));
    // 补采样本（targeted）：字幕就取自这段起始后几秒的画面，本身就是这一刻的原话，
    // 不靠对位率成立 —— ASR 错得越厉害，对位率反而越低，这正是需要补采的原因
    const targeted = Boolean(al && al.cap.targeted && al.d <= 4 && al.cap.line.length >= 4);
    const quoteable = Boolean(al) && (targeted || (ratio >= need && al.cap.line.length >= 6));
    let v = 0;
    words.forEach((w) => { if (s.text.includes(w)) v += 150; });
    if (quoteable) v += 250;
    else if (al) v += 40;
    if (quoteable && ratio >= 0.85) v += 60;
    v += Math.min(s.text.length, 50) / 2;
    return { s, cap: al ? al.cap : null, ratio, al, quoteable, v };
  }).sort((a, b) => b.v - a.v);
  const singleLec = Boolean(cfg.lecture || cfg.captionOf === 19);
  // 12/13 是全文表：它们本来就整表收录每一段，块里重复引用不算「凑数」，因此不参与全局去重
  const exemptReuse = Boolean(cfg.lecture || cfg.notLecture);
  const take = (skipUsed, strict) => {
    const picked = [];
    const usedLec = new Set();
    for (const it of scored) {
      if (strict && !it.quoteable) continue;                                       // 严格轮：只收「能当正文」的段
      if (skipUsed && !exemptReuse && SPEECH_USED.has(segKeyOf(it.s))) continue;
      if (!singleLec && usedLec.has(it.s.lecture)) continue;                     // 多讲：一段一讲
      if (picked.some((p) => p.s.lecture === it.s.lecture && Math.abs(p.s.start - it.s.start) < 120)) continue; // 同讲：间隔 ≥2 分钟
      usedLec.add(it.s.lecture);
      picked.push(it);
      if (picked.length >= max) break;
    }
    return picked;
  };
  let picked = take(true, true);
  if (picked.length < 3) picked = take(true, false);   // 严格轮凑不满 3 条才放宽
  if (picked.length < 3) picked = take(false, false);  // 素材不够时才允许复用，且仍保证 ≥3 条
  picked.forEach((p) => SPEECH_USED.add(segKeyOf(p.s)));
  if (cfg.spread) picked.sort((a, b) => a.s.lecture - b.s.lecture);
  return picked;
}

/** 每张表的选段只算一次并冻结：buildS00 会为「字数自指」反复渲染，重算会把全局去重表耗空 */
const SPEECH_MEMO = new Map();
function speechPicks(id, domain) {
  const key = `${id}|${domain || ''}`;
  if (!SPEECH_MEMO.has(key)) {
    SPEECH_MEMO.set(key, pickSpeech(SPEECH_SEL[id] || { domain: domain || '抽样', kw: [] }));
  }
  return SPEECH_MEMO.get(key);
}

/** 生成「语音正文出处」块的原始行（供任意表复用，不依赖 sheet 结构） */
function speechBlockRows(cfgId, domain, bodyCol, n) {
  const picks = speechPicks(cfgId, domain || (SPEECH_SEL[cfgId] || {}).domain);
  const rows = [];
  const title = Array(n).fill('');
  title[0] = '◆';
  title[Math.min(bodyCol, n - 1)] = `【语音正文出处（ASR 正文层）】${domain} · 逐字引用请用「14字幕对照校核」；本块证明正文确实讲到这里`;
  rows.push(Array(n).fill(''));
  rows.push(title);
  picks.forEach((it, i) => {
    const s = it.s;
    const cap = it.cap;
    const recall = it.recall === undefined ? null : it.recall;
    const row = Array(n).fill('');
    row[0] = `S${i + 1}`;
    // 时间码 / 原句 / 校验行 三列必须互不覆盖：列数不够时左移到剩余空间，不硬塞
    const start = bodyCol + 3 <= n ? bodyCol : Math.max(0, n - 3);
    row[start] = `第${s.lecture}讲 ${fmt(s.start)}`;
    // 原句：人读字幕在手且与 ASR 对得上（召回 ≥0.55）→ 直接用**人读原文**当正文；
    // 没字幕才退回 ASR 原文并标〈ASR〉。这样块里读到的句子基本没有识别错字。
    const preferCaption = Boolean(it.quoteable);
    const quoted = preferCaption ? it.cap.line : s.text;
    row[start + 1] = `${preferCaption ? '' : '〈ASR〉'}${quoted.length > 40 ? `${quoted.slice(0, 40)}…` : quoted}`;
    // 校验行：人读字幕（讲次·时间码·读屏序号·对位率）＋ 同一时刻的 ASR 原文开头，两版并置
    row[start + 2] = it.cap
      ? `第${it.cap.lecture}讲 ${it.cap.mmss}（读屏 ${it.cap.ref}，对位 ${it.ratio.toFixed(2)}）｜ASR：${s.text.length > 30 ? `${s.text.slice(0, 30)}…` : s.text}`
      : '—（该时刻无字幕：本行正文为 ASR 原文，勿逐字引用）';
    rows.push(row);
  });
  return rows;
}

/** 在已组好的表行尾部接上语音正文块（persona 之后，◆ 标记不干扰 ※ 边界） */
function appendSpeech(sheet) {
  const rows = sheet.allRows.slice();
  return rows.concat(speechBlockRows(sheet.id, sheet.domain, sheet.bodyCol, sheet.head.length));
}

function appendPersona(sheet) {
  const rows = sheet.rows.slice();
  const n = sheet.head.length;
  const b = sheet.bodyCol;
  rows.push(Array(n).fill(''));
  const title = Array(n).fill('');
  title[0] = '※';
  title[b] = `【${PERSONA} 的独立理解总结】 以下不是讲者观点，是据讲稿与经文做的病理生理学重构`;
  rows.push(title);
  sheet.persona.forEach((p, i) => {
    const row = Array(n).fill('');
    row[0] = `H${i + 1}`;
    if (sheet.head.includes('段内句数')) row[1] = sentCount(p[0]);
    row[b] = p[0];
    row[b + 1] = p[1];
    row[b + 2] = p[2];
    rows.push(row);
  });
  return rows;
}
// 先给 00目录 挑段：它在工作簿里排第一，但渲染顺序在最后，不预热就只能捡别人挑剩的 ASR 段
speechPicks('00', '索引');

const built = SHEETS.map((s) => {
  const withPersona = { ...s, allRows: appendPersona(s) };
  return { ...withPersona, allRows: appendSpeech(withPersona) };
});
const measure = (rows) => rows.reduce((a, r) => a + r.reduce((x, c) => x + String(c === null || c === undefined ? '' : c).replace(/\s/g, '').length, 0), 0);
const { S12_BLOCK, measured, S00, WORKBOOK } = assembleWorkbook(measure, built);

// ── 8. 输出 ───────────────────────────────────────────────────────────

const missing = WORKBOOK.filter((s) => !s.rows.map((r) => String(r.join(''))).join('\n').includes(`${PERSONA} 的独立理解总结`));
if (missing.length) {
  console.error(`✗ 以下工作表缺少「${PERSONA} 的独立理解总结」标题块：${missing.map((s) => s.name).join('、')}`);
  process.exit(1);
}
const thinBlocks = WORKBOOK.filter((s) => s.rows.filter((r) => /^H\d+$/.test(String(r[0]))).length < 3);
if (thinBlocks.length) {
  console.error(`✗ 以下工作表的独立理解不足 3 条：${thinBlocks.map((s) => s.name).join('、')}`);
  process.exit(1);
}
// 门 7：转写覆盖率 —— 只有把整讲音频都转完的才算「已转写」，防止半截音频冒充整讲
const asrShort = ASR_LEC.filter((l) => l.coverageRatio !== null && l.coverageRatio < 0.99);
if (asrShort.length) {
  console.error(`✗ 以下讲次的转写覆盖率不足 99%：${asrShort.map((l) => `第${l.no}讲 ${(l.coverageRatio * 100).toFixed(1)}%`).join('、')}（半截音频不许当整讲）`);
  process.exit(1);
}
// 门 8：正文层必须与语料逐行一致（12/13 表的行数 = 语料段数，且未完成讲次必须在表里显式出现）
const asrRows19 = S12A.length - 1;
const asrRowsOther = S13A.length - 1;
const asrRowsTotal = ASR_SEGS.length;
if (asrRows19 + asrRowsOther !== asrRowsTotal) {
  console.error(`✗ 12/13 表正文行数 ${asrRows19 + asrRowsOther} ≠ 语料段数 ${asrRowsTotal}`);
  process.exit(1);
}
// 未完成讲次必须显式列出（不许静默少几讲）—— 断言 13 表的总结块里写明了
if (ASR_PENDING.length) {
  const blob = WORKBOOK.map((s) => s.rows.map((r) => r.join('')).join('')).join('');
  const missing = ASR_PENDING.filter((n) => !new RegExp(`第 ?${n} ?讲`).test(blob) && !blob.includes(`第${n}讲`));
  if (missing.length) {
    console.error(`✗ 未完成转写的讲次没有在表里出现：第 ${missing.join('、')} 讲`);
    process.exit(1);
  }
}

// 门 9：16 表的字幕依据必须能逐字对上（不许编引用），且「仅拼音」行必须写明要人工核
const s16bad = CAP_ROWS.filter((r) => r.evidence === '字幕直证'
  && (!r.cite || !capKey.has(`${r.cite.lecture}|${r.cite.mmss}|${r.cite.line}`)));
if (s16bad.length) {
  console.error(`✗ 16术语纠错表 有 ${s16bad.length} 条「字幕直证」引用查不到原字幕：${s16bad.slice(0, 3).map((r) => r.wrong).join('、')}`);
  process.exit(1);
}
const s16noAdvice = S16.slice(1).filter((r) => cellStrSafe(r[4]) === '仅拼音' && !/人工核|人工判定/.test(cellStrSafe(r[9])));
if (s16noAdvice.length) {
  console.error(`✗ 16表「仅拼音」行没有写明须人工核：${s16noAdvice.slice(0, 3).map((r) => r[2]).join('、')}`);
  process.exit(1);
}

// 门 10：每张表都要有「语音正文出处」块（≥3 条），且时间码可在 12/13 表查到、原句逐字来自该段
const segStamp = new Map();
ASR_SEGS.forEach((s) => segStamp.set(`${s.lecture}|${fmt(s.start)}`, s));
const capObjOf = (lec, mmss, ref) => CAPTIONS.find((c) => c.lecture === Number(lec) && c.mmss === mmss
  && (ref === undefined || String(c.ref) === String(ref))) || null;
const needRatio = (d) => (d <= 4 ? 0.7 : (d <= 6 ? 0.75 : 0.85));
/** 这条字幕能不能当该段的正文：补采样本按「帧就在这段起始 ±4s」成立，其余按对位率分级 */
const quoteableCap = (co, so) => {
  if (!co) return false;
  const d = Math.abs(co.sec - so.start);
  if (co.targeted) return d <= 4 && co.line.length >= 4;
  const a = alignSemantic(co.line, so.text);
  return Boolean(a) && a.ratio >= needRatio(d) && co.line.length >= 6;
};
const speechBad = [];
WORKBOOK.forEach((w) => {
  const rows = w.rows;
  const at = rows.findIndex((r) => cellStrSafe(r[0]) === '◆');
  const blk = at < 0 ? [] : rows.slice(at + 1).filter((r) => /^S\d+$/.test(cellStrSafe(r[0])));
  if (blk.length < 3) { speechBad.push(`${w.name} 只有 ${blk.length} 条`); return; }
  blk.forEach((r) => {
    const stampIdx = r.findIndex((c) => /^第\d+讲 \d+:\d{2}$/.test(cellStrSafe(c)));
    if (stampIdx < 0) { speechBad.push(`${w.name} 有一条缺时间码`); return; }
    const stamp = cellStrSafe(r[stampIdx]);
    const segObj = segStamp.get(stamp.replace(/^第(\d+)讲 /, '$1|'));
    if (!segObj) { speechBad.push(`${w.name} 的 ${stamp} 在 12/13 表里查不到`); return; }
    const seg = segObj.text;
    const quote = cellStrSafe(r[stampIdx + 1]).replace(/…$/, '');
    const cite = cellStrSafe(r[stampIdx + 2]);
    const m = /^第(\d+)讲 (\d+:\d{2})（读屏 ([^，）]+)，对位 ([\d.]+)）｜ASR：(.*)$/.exec(cite);
    if (quote.startsWith('〈ASR〉')) {
      // 没有可当正文的字幕（无字幕 / 字幕残句 / 对位不足）→ 正文必须是 ASR 原文
      if (!seg.startsWith(quote.slice(5))) speechBad.push(`${w.name} 的 ${stamp} 标了〈ASR〉但与转写不一致`);
      if (cite.startsWith('—')) {
        if (!cite.includes('无字幕')) speechBad.push(`${w.name} 的 ${stamp} 无字幕时没写明`);
      } else {
        if (!m) { speechBad.push(`${w.name} 的 ${stamp} 校验行格式不对：${cite.slice(0, 24)}`); return; }
        const co = capObjOf(m[1], m[2], m[3]);
        const a2 = co ? alignSemantic(co.line, seg) : null;
        if (co) {
          if (quoteableCap(co, segObj)) speechBad.push(`${w.name} 的 ${stamp} 明明有可引字幕却用了 ASR 原文`);
          if (a2 && Number(m[4]) !== Number(a2.ratio.toFixed(2))) speechBad.push(`${w.name} 的 ${stamp} 对位率与复核值不符`);
        }
      }
      return;
    }
    // 有字幕可用 → 正文必须是人读字幕原文，且该字幕必须能查到、对位率（按时间差分级）必须达标
    if (!m) { speechBad.push(`${w.name} 的 ${stamp} 校验行格式不对：${cite.slice(0, 24)}`); return; }
    const capObj = capObjOf(m[1], m[2], m[3]);
    if (!capObj) { speechBad.push(`${w.name} 的 ${stamp} 字幕行查不到原字幕`); return; }
    if (!capObj.line.startsWith(quote)) speechBad.push(`${w.name} 的 ${stamp} 正文不是该条字幕的原文（疑似改写）`);
    const al = alignSemantic(capObj.line, seg);
    const d = Math.abs(capObj.sec - segObj.start);
    if (!quoteableCap(capObj, segObj)) {
      speechBad.push(`${w.name} 的 ${stamp} 字幕对位率 ${al ? al.ratio.toFixed(2) : '0'}（差 ${d.toFixed(0)}s）不满足当正文的条件`);
    }
    if (!capObj.targeted && capObj.line.length < 6) speechBad.push(`${w.name} 的 ${stamp} 用了残句字幕（${capObj.line.length} 字）当正文`);
    if (capObj.targeted && d > 4) speechBad.push(`${w.name} 的 ${stamp} 补采帧离该段起始 ${d.toFixed(0)}s，超过 4s`);
    if (Number(m[4]) !== Number((al ? al.ratio : 0).toFixed(2))) speechBad.push(`${w.name} 的 ${stamp} 对位率与复核值不符`);
    const asrPart = m[5].replace(/…$/, '');
    if (!seg.startsWith(asrPart)) speechBad.push(`${w.name} 的 ${stamp} 校验行里的 ASR 片段与转写不一致`);
  });
});
if (speechBad.length) {
  console.error(`✗ 语音正文出处块不合格 ${speechBad.length} 处：`);
  speechBad.slice(0, 6).forEach((x) => console.error(`   · ${x}`));
  process.exit(1);
}

if (CHECK_ONLY) {
  console.log('═══ 《验证-伤寒论》核对（不写文件）═══');
  console.log(`  源课程     ${VIDEO.seasonTitle} · ${LEC.length} 讲 · 实测 ${fmtH(durMeasuredTotal)}`);
  console.log(`  讲稿语料   ${CORPUS.length} 条（第19讲 ${L19_COUNT} + 全课程 ${courseDoc.samples.length}；读到 ${courseDoc.coverage.lecturesRead + 1}/${LEC.length} 讲，第 ${dupeNos.join('、')} 讲同源）`);
  console.log(`  底本交叉   第19讲命中 ${hitFormulas.length}/${FORMULAS.length}`);
  console.log(`  方证交叉   33 方覆盖 ${coveredN}（双覆盖 ${dualN}）· 未覆盖 ${notCovered.length}`);
  console.log(`  语音转写   ${ASR_LEC.length ? `${ASR_LEC.length} 讲 / 正文 ${ASR_CHARS} 字 / 音频 ${(ASR_AUDIO_SEC / 3600).toFixed(2)} 小时；未完成：${ASR_PENDING.join('、') || '无'}` : '尚未开始（12/13 表为空表）'}`);
  if (ASR_RECALL !== null) console.log(`  转写准确度 字幕校核 ${CAPTIONS.length} 条 · 平均召回 ${ASR_RECALL.toFixed(3)} · ≥0.8 占 ${(ASR_GOOD_RATE * 100).toFixed(0)}%`);
  if (CAPDOC) console.log(`  术语纠错   ${CAP_ROWS.length} 条规则 · 字幕直证 ${CAPDOC.stats.direct} · 旁证 ${CAPDOC.stats.indirect} · 仅拼音 ${CAPDOC.stats.pinyinOnly}（直证覆盖 ${CAPDOC.stats.asrHitsCovered}/${CAPDOC.stats.asrHitsTotal} 处）`);
  console.log(`  对读验证   ${prevState.note}`);
  if (prevState.warn) console.log(`             ${prevState.warn}`);
  console.log(`  工作表     ${WORKBOOK.length} 表 · 每表含「${PERSONA}」总结块`);
  console.log(`  交付物落点 ${OUT_XLSX}`);
  process.exit(0);
}

const wbOut = writeWorkbook(OUT_XLSX, WORKBOOK);

// 人可读全本：第 19 讲密样本
{
  const L = [];
  L.push('# 陈瑞春讲伤寒论 19（温法 2）· 讲稿抽读', '');
  L.push(`> 源视频：${VIDEO.title}（${VIDEO.bvid}，${fmt(VIDEO.duration)}）· UP ${VIDEO.owner}`, '');
  L.push('> 取稿方式：画面硬字幕读屏（平台字幕接口未登录返回空）。每 0.5s 取底部条带 → 相邻帧 MAD>3.0 分组，', '');
  L.push(`> 得 ${seg19.stableSegments} 个换行段；等距抽 ${sample19Doc.samples.length} 个样本（有字 ${sample19Doc.coverage.withText} / 无字幕 ${sample19Doc.coverage.blank}），每 10 条拼一图逐图读屏。`, '');
  L.push('> **本文件不是逐字稿**：抽样覆盖 ' + `${fmt(sample19Doc.coverage.firstSec)}–${fmt(sample19Doc.coverage.lastSec)}` + '，引用请回原片核对时间码。', '');
  L.push('> 全课程其余 23 讲的抽读见 讲稿抽读-全课程.md。', '');
  L.push('| # | 时间码 | 字幕原文 | 拼图 |', '| --- | --- | --- | --- |');
  sample19Doc.samples.forEach((s) => L.push(`| ${s.idx} | ${s.mmss} | ${s.line || '（无字幕）'} | ${s.grid} |`));
  L.push('', `## ${PERSONA} 的独立理解总结`, '');
  P_05.forEach((p, i) => L.push(`${i + 1}. ${p[0]}（${p[1]}）`));
  L.push('');
  fs.writeFileSync(path.join(MAT, '讲稿抽读.md'), `${L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`, 'utf8');
}

// 人可读全本：全课程抽读
{
  const L = [];
  L.push('# 陈瑞春讲伤寒论 · 全课程（24 讲）讲稿抽读', '');
  L.push(`> 源课程：${VIDEO.seasonTitle}（${LEC.length} 讲 · 实测 ${fmtH(durMeasuredTotal)}）· UP ${VIDEO.owner}`, '');
  L.push('> 取稿方式：画面硬字幕读屏（平台字幕接口未登录返回空）。0.5s 取 1 帧 → 底部字幕窄条 → 相邻帧 MAD>3.0 分组 →', '');
  L.push(`> 「描边白字占比 + Otsu」筛出有字段（第 19 讲 150 条人读样本上实测精确率 100%／召回 90%）→ 每讲等距抽 20 条拼图读屏。`, '');
  L.push(`> 语料合计 ${CORPUS.length} 条：第 19 讲密样本 ${L19_COUNT} 条（见 讲稿抽读.md）+ 其余 ${courseDoc.samples.length} 条。`, '');
  L.push(`> 第 ${dupeNos.join('、')} 讲与第 ${DUPES.map((d) => d.duplicateOf).join('、')} 讲同源（抽帧统计逐位相同），不计入证据。`, '');
  L.push('> **本文件不是逐字稿**：抽样是骨架级的，引用请回原片核对时间码。', '');
  L.push('| # | 讲次 | 时间码 | 字幕原文 | 拼图 |', '| --- | --- | --- | --- | --- |');
  S06.slice(1).forEach((r) => L.push(`| ${r[0]} | ${r[1]} | ${r[2]} | ${r[3]} | ${r[4]} |`));
  L.push('', `## ${PERSONA} 的独立理解总结`, '');
  P_06.forEach((p, i) => L.push(`${i + 1}. ${p[0]}（${p[1]}）`));
  L.push('', '## 上一份 33 方 × 全课程覆盖', '');
  L.push('| 方 | 上一份目数 | 讲次 | 判定 |', '| --- | :-: | --- | --- |');
  COVER.forEach((c) => L.push(`| ${c.name} | ${c.mu} | ${c.titles.map((n) => `第${n}`).join('、') || '—'} | ${c.verdict} |`));
  L.push('', '## 与《伤寒论临床应用.xlsx》的对读验证', '');
  L.push('| # | 前表说法／推断 | 判定 |', '| --- | --- | --- |');
  S10.slice(1).forEach((r) => L.push(`| ${r[0]} | ${r[1]} | ${r[3]} |`));
  L.push('', `## ${PERSONA} 的独立判断（对读验证）`, '');
  P_10.forEach((p, i) => L.push(`${i + 1}. ${p[0]}（${p[1]}）`));
  L.push('');
  fs.writeFileSync(path.join(MAT, '讲稿抽读-全课程.md'), `${L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`, 'utf8');
}

fs.writeFileSync(path.join(MAT, 'source-map.json'), `${JSON.stringify({
  $generated: 'node scripts/import_chenruchun_lectures.js',
  slug: SLUG,
  title: '陈瑞春讲伤寒论 · 24 讲（讲稿证据 + 对读验证）',
  source: {
    kind: 'video-page + screen-read subtitles（全 24 讲）',
    page: { url: `https://www.bilibili.com/video/${VIDEO.bvid}/`, file: `standards/materials/${SLUG}/sources/bilibili-video-page.html`, sha256: sha256(PAGE) },
    subtitles: {
      lecture19: { file: `standards/materials/${SLUG}/sources/subtitle-samples.json`, sha256: sha256(SAMPLES19), samples: sample19Doc.samples.length },
      courses: { file: `standards/materials/${SLUG}/sources/subtitle-samples-courses.json`, sha256: sha256(COURSES), samples: courseDoc.samples.length, lectures: courseDoc.coverage.lecturesRead },
      method: courseDoc.method,
      filter: courseDoc.filter,
      apiNote: '平台字幕接口未登录 → 返回空字幕列表（subtitles:[]，见 sources/api-player-v2.json），故改用画面硬字幕读屏',
    },
    videoFiles: { committed: false, measuredTotalSeconds: durMeasuredTotal, why: '24 讲 360p 合计约 3 GB，可由 bvid/cid 重新取链 → 不入库（第 19 讲留了 api-playurl.json）' },
    duplicates: DUPES,
  },
  season: { id: VIDEO.seasonId, title: VIDEO.seasonTitle, episodes: LEC.length, totalDurSource: totalDur, totalDurMeasured: durMeasuredTotal, faAgg },
  perLecture: LEC.map((l) => ({ no: l.no, bvid: l.bvid, title: l.title, durMeasured: l.durMeasured, fa: l.fa, textSegments: l.textSegments, samples: l.samples })),
  baseLink: { file: 'standards/shanghan/底本.json', formulas: FORMULAS.map((f) => ({ name: f.name, hits: f.hitCount, domains: f.domains, foreign: f.foreign || null })) },
  prevDeliverable: { path: prevPath, sha256: snap.prevDeliverable.sha256, state: prevState.source, note: prevState.note, formulas: prevFormulas.length, inferenceRows: snap.inferenceRows.length },
  crossCheck: { covered: coveredN, dual: dualN, notCovered: notCovered.map((c) => c.name), verifyRows: S10.length - 1 },
  measured,
  readme: { files: ['讲稿抽读.md', '讲稿抽读-全课程.md'] },
  note: '交付物（xlsx）落在本机桌面；本目录保存视频页原件、接口返回、逐讲统计、两份读屏样本与 39 张拼图证据。重建：node scripts/import_chenruchun_lectures.js',
}, null, 2)}\n`, 'utf8');

console.log('═══ 《验证-伤寒论》生成完成（全 24 讲）═══');
console.log(`  源课程     ${VIDEO.seasonTitle} · ${LEC.length} 讲 · 实测 ${fmtH(durMeasuredTotal)}（页面标注 ${fmtH(totalDur)}）`);
console.log(`  讲稿语料   ${CORPUS.length} 条（第19讲 ${L19_COUNT} + 全课程 ${courseDoc.samples.length}）· 读到 ${courseDoc.coverage.lecturesRead + 1}/${LEC.length} 讲（第 ${dupeNos.join('、')} 讲同源）`);
console.log(`  底本交叉   第19讲 命中 ${hitFormulas.length}/${FORMULAS.length} · 未命中均为后世方`);
console.log(`  方证交叉   33 方：覆盖 ${coveredN}（双覆盖 ${dualN}）· 未覆盖 ${notCovered.length}${notCovered.length ? `：${notCovered.map((c) => c.name).join('、')}` : ''}`);
console.log(`  对读验证   ${prevState.note}`);
if (prevState.warn) console.log(`             ${prevState.warn}`);
console.log(`  工作表     ${WORKBOOK.length} 表 → ${WORKBOOK.map((s) => s.name).join(' · ')}`);
console.log(`  00目录实测 ${measured.map((m) => `${m.id}:${m.body}行/${m.chars}字`).join('  ')}`);
console.log(`  交付物     ${OUT_XLSX}（${(wbOut.bytes / 1024).toFixed(1)} KB · ${wbOut.sheets} 表）`);
console.log(`  溯源       standards/materials/${SLUG}/{source-map.json, 讲稿抽读.md, 讲稿抽读-全课程.md}`);
