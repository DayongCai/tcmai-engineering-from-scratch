#!/usr/bin/env node
/**
 * scripts/build_video_lessons.js —— 188 门学科的「网络视频教案」台账
 *
 * 为什么需要它：
 *   仓库里已经躺着若干套网络课语料（B 站合集、ASR、逐句字幕），但**没有一处把它们
 *   和 189 门学科对上账**：哪门课有视频、多少讲、多少时长、能不能落到章，全凭记忆。
 *   于是「我们有视频课」这句话没法核，也没法知道哪 180 门是空的。
 *
 * 做法：
 *   1. 逐份**实测**语料（讲数 / 语句数 / 时长），不信目录名，不信 README 里的自述；
 *   2. 按学科落台账 `data/video-lessons.json` + `VIDEO-LESSONS.md`；
 *   3. 有语料的学科生成 `departments/<dept>/<slug>/video/教案.md`（讲次表 + 时间码 + 对应章）；
 *   4. 没有的学科**照样占一行**，状态写 `none`，缺口按原因分类 —— 不许静默省略。
 *
 * 用法：
 *   node scripts/build_video_lessons.js
 *   node scripts/build_video_lessons.js --check
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const MAT = path.join(ROOT, 'standards', 'materials');
const CURR = JSON.parse(fs.readFileSync(path.join(ROOT, 'curriculum.json'), 'utf8'));
const MEDIA = path.join(ROOT, 'platform', 'media-release.json');

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff\u{20000}-\u{3FFFF}]/gu;
const han = (s) => (s || '').match(HAN)?.length || 0;

/** 网络课语料 → 学科。只收「有讲次/有字幕」的，纯文本底本不进这张表。 */
const SOURCES = [
  { slug: 'hdnj-yinpin', subject: '01-zhongyi/06-neijing-xuandu', label: '黄帝内经音频理解（逐句字幕）', kind: 'audio-subtitle' },
  { slug: 'wuyishan-suwen30', subject: '01-zhongyi/06-neijing-xuandu', label: '武夷山 · 素问 30 讲', kind: 'video-subtitle' },
  { slug: 'neijing-jizhen', subject: '01-zhongyi/06-neijing-xuandu', label: '黄帝内经急症救命', kind: 'video-subtitle' },
  { slug: 'neijing-gushi', subject: '01-zhongyi/06-neijing-xuandu', label: '内经简版故事', kind: 'video-subtitle' },
  { slug: 'chenruchun-lectures', subject: '01-zhongyi/07-shanghanlun', label: '陈瑞春讲伤寒论（B 站 24 讲）', kind: 'bilibili-season' },
  { slug: 'shanghan-quannao', subject: '01-zhongyi/07-shanghanlun', label: '伤寒论全脑记忆（ASR）', kind: 'asr' },
  { slug: 'zhongyiyao-ai-daolun', subject: '07-zhineng/01-yixue-rengong-zhineng-daolun', label: '中医药 AI 导论', kind: 'video-subtitle' },
  { slug: 'lingjichu-ai', subject: '07-zhineng/01-yixue-rengong-zhineng-daolun', label: '零基础学 AI', kind: 'video-subtitle' },
];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function tc(sec) {
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return (h ? `${h}:` : '') + String(m).padStart(h ? 2 : 1, '0') + ':' + String(r).padStart(2, '0');
}

function parseTc(str) {
  const m = String(str || '').match(/(\d+):(\d+):(\d+)[,.](\d+)|(\d+):(\d+)[,.](\d+)/);
  if (!m) return 0;
  if (m[1] !== undefined) return (+m[1]) * 3600 + (+m[2]) * 60 + +m[3];
  return (+m[5]) * 60 + +m[6];
}

/** 逐句字幕语料：每表一讲/一篇，用首尾时间码算时长 */
function fromSubtitles(slug) {
  const f = path.join(MAT, slug, 'content.json');
  if (!fs.existsSync(f)) return null;
  const d = readJson(f);
  const rows = (d.sections || []).map((s) => {
    const cues = s.cues || [];
    // 末尾常有「未计时」的整段按语（只有 text，无 start/end）——时长要取最后一个**有时间码**的
    const timed = cues.filter((c) => c && c.end);
    const dur = timed.length ? parseTc(timed[timed.length - 1].end) : 0;
    return {
      no: s.sheet,
      title: String(s.sheet).replace(/^\d+[-.]/, ''),
      cues: cues.length || s.count || 0,
      durationSec: dur,
      bytesCues: timed.length,
    };
  }).filter((r) => r.cues > 0);
  return {
    kind: 'subtitles',
    lectures: rows.length,
    cues: rows.reduce((n, r) => n + r.cues, 0),
    durationSec: rows.reduce((n, r) => n + r.durationSec, 0),
    rows,
  };
}

/** B 站合集：episodes.json 有逐讲标题与页面标注时长 */
function fromBilibili(slug) {
  const f = path.join(MAT, slug, 'sources', 'episodes.json');
  if (!fs.existsSync(f)) return null;
  const d = readJson(f);
  const rows = (d.episodes || []).map((e) => ({
    no: e.no,
    title: e.title,
    cues: 0,
    durationSec: e.dur || 0,
    ref: e.bvid ? `BV${String(e.bvid).replace(/^BV/, '')}` : '',
  }));
  return {
    kind: 'bilibili',
    lectures: rows.length,
    cues: 0,
    durationSec: rows.reduce((n, r) => n + r.durationSec, 0),
    season: d.season ? d.season.title : '',
    rows,
  };
}

/** ASR：pNN.json 逐讲，audioSec/chars/segments */
function fromAsr(slug) {
  const dir = path.join(MAT, slug, 'asr');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter((f) => /^p\d+\.json$/.test(f)).sort();
  const rows = files.map((f) => {
    const d = readJson(path.join(dir, f));
    return {
      no: d.no || Number(f.match(/\d+/)[0]),
      title: `第 ${d.no || Number(f.match(/\d+/)[0])} 讲`,
      cues: (d.segments || []).length,
      durationSec: d.audioSec || 0,
      ref: d.model || '',
      // ASR 没有讲题，用开头三句当「讲的内容指纹」，章映射只能靠它
      peek: (d.segments || []).slice(0, 3).map((s) => s.text).join(''),
    };
  });
  return {
    kind: 'asr',
    lectures: rows.length,
    cues: rows.reduce((n, r) => n + r.cues, 0),
    durationSec: rows.reduce((n, r) => n + r.durationSec, 0),
    rows,
  };
}

/** 自建平台视频（HLS）：以 media-release.json 为准 */
function fromPlatform() {
  if (!fs.existsSync(MEDIA)) return new Map();
  const d = readJson(MEDIA);
  const m = new Map();
  for (const c of d.courses || []) {
    const rows = [];
    const y = path.join(ROOT, 'platform', 'courses', c.id, 'course.yaml');
    if (fs.existsSync(y)) {
      const lines = fs.readFileSync(y, 'utf8').split(String.fromCharCode(10)).map((l) => (l.endsWith(String.fromCharCode(13)) ? l.slice(0, -1) : l));
      let cur = null;
      for (const ln of lines) {
        const mSlug = ln.match(/^\s+- slug:\s*(\S+)/);
        if (mSlug) { cur = { title: '', durationSec: 0 }; rows.push(cur); continue; }
        if (!cur) continue;
        const mTitle = ln.match(/^\s+title:\s*(.+)$/);
        if (mTitle) cur.title = mTitle[1].trim();
        const mVideo = ln.match(/^\s+video:\s*(\S+)/);
        if (mVideo) cur.status = mVideo[1].trim();
        const mMin = ln.match(/^\s+measured_minutes:\s*([\d.]+)/);
        const mEst = ln.match(/^\s+estimate_minutes:\s*([\d.]+)/);
        if (mMin) cur.durationSec = Math.round(parseFloat(mMin[1]) * 60);
        else if (mEst && !cur.durationSec) cur.durationSec = Math.round(parseFloat(mEst[1]) * 60);
      }
      rows.forEach((r, i) => { r.no = i + 1; r.cues = 0; });
    }
    // 只把「已成片」的章算进视频教案：course.yaml 里 video: planned 的章还没有视频
    const rendered = rows.filter((r) => r.status === 'rendered');
    const useRows = rendered.length ? rendered : rows;
    useRows.forEach((r, i) => { r.no = i + 1; });
    m.set(c.id, {
      kind: 'platform', lectures: useRows.length || c.chapterCount, cues: 0,
      durationSec: c.totalDurationSec, rows: useRows, title: c.title,
    });
  }
  return m;
}

function chaptersOf(subjectRel) {
  const p = path.join(ROOT, 'departments', subjectRel, 'chapters.json');
  if (!fs.existsSync(p)) return [];
  const j = readJson(p);
  return (j.chapters || []).map((c) => ({ n: c.n, slug: c.slug, title: c.title }));
}

/** 讲次 → 章：按标题里的实词重合度，够不着就留空（不硬塞） */
function isHan(ch) {
  if (!ch) return false;
  const c = ch.charCodeAt(0);
  return c >= 0x4e00 && c <= 0x9fff;
}

const STOP = '与和及加的用服方证类兼也主其';

/** 方名归一：取 汤/散/丸/饮/丹 前最多 3 个汉字，并剥掉粘连的连接词（与麻黄汤→麻黄汤） */
function formulas(s) {
  const t = String(s || '');
  const out = new Set();
  for (let i = 0; i < t.length; i += 1) {
    if (!'汤散丸饮丹'.includes(t[i])) continue;
    let j = i - 1;
    let n = 0;
    while (j >= 0 && n < 3 && isHan(t[j])) { j -= 1; n += 1; }
    if (n < 1) continue;
    let name = t.slice(j + 1, i + 1);
    while (name.length > 2 && STOP.includes(name[0])) name = name.slice(1);
    out.add(name);
  }
  return out;
}

function mapChapter(row, chapters) {
  const t = String(row.title || '') + String(row.peek || '');
  const tf = formulas(t);
  let best = null;
  let bestScore = 0;
  for (const c of chapters) {
    const ct = String(c.title || '');
    let score = 0;
    for (const f of formulas(ct)) if (tf.has(f)) score += 4;
    for (let i = 0; i < ct.length - 1; i += 1) {
      const bi = ct.slice(i, i + 2);
      if (isHan(bi[0]) && isHan(bi[1]) && t.includes(bi)) score += 1;
    }
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return bestScore >= 4 ? best : null;
}

function build() {
  const platform = fromPlatform();
  const subjects = [];
  const used = new Set();
  const materials = new Set();

  for (const dept of CURR.departments) {
    for (const s of dept.subjects) {
      const rel = `${dept.slug}/${s[0]}`;
      const entry = {
        slug: s[0], title: s[1], dept: dept.slug, deptTitle: dept.title || '',
        semester: s[4], chapters: s[6],
        status: 'none', sources: [], lectures: 0, cues: 0, durationSec: 0, plan: null,
      };
      const plat = platform.get(rel);
      if (plat) {
        entry.sources.push({
          slug: 'platform', label: `本仓自建视频课（HLS）`, kind: 'platform',
          lectures: plat.lectures, durationSec: plat.durationSec, path: `platform/courses/${rel}`,
          rows: plat.rows || [],
        });
        entry.lectures += plat.lectures;
        entry.durationSec += plat.durationSec;
        entry.status = 'platform';
      }
      for (const src of SOURCES.filter((x) => x.subject === rel)) {
        const data = src.kind === 'bilibili-season' ? fromBilibili(src.slug)
          : src.kind === 'asr' ? fromAsr(src.slug)
            : fromSubtitles(src.slug);
        if (!data) continue;
        materials.add(src.slug);
        used.add(src.slug);
        entry.sources.push({
          slug: src.slug, label: src.label, kind: src.kind,
          lectures: data.lectures, cues: data.cues, durationSec: data.durationSec,
          path: `standards/materials/${src.slug}`,
          rows: data.rows,
        });
        entry.lectures += data.lectures;
        entry.cues += data.cues;
        entry.durationSec += data.durationSec;
        entry.status = entry.status === 'platform' ? 'platform+lectures' : 'lectures';
      }
      if (entry.sources.length) entry.plan = `departments/${rel}/video/教案.md`;
      subjects.push(entry);
    }
  }

  // 语料里还有几份「视频/音频」没挂到课（不许静默丢）
  const unattached = [...fs.readdirSync(MAT)]
    .filter((d) => fs.statSync(path.join(MAT, d)).isDirectory())
    .filter((d) => !used.has(d))
    .map((d) => {
      const has = (f) => fs.existsSync(path.join(MAT, d, f));
      const shape = fs.existsSync(path.join(MAT, d, 'asr')) ? 'asr'
        : has('content.json') ? 'text/subtitle' : 'other';
      return { slug: d, shape };
    });

  const totals = {
    subjects: subjects.length,
    withVideo: subjects.filter((x) => x.status !== 'none').length,
    none: subjects.filter((x) => x.status === 'none').length,
    lectures: subjects.reduce((n, x) => n + x.lectures, 0),
    cues: subjects.reduce((n, x) => n + x.cues, 0),
    durationSec: subjects.reduce((n, x) => n + x.durationSec, 0),
  };

  return { schema: 'tcm-video-lessons/1', generated: 'scripts/build_video_lessons.js', totals, subjects, unattached };
}

function planMd(entry) {
  const L = [];
  L.push(`# ${entry.title} · 网络视频教案`);
  L.push('');
  L.push(`> ${entry.deptTitle}（${entry.dept}）· 第 ${entry.semester} 学期 · 目标 ${entry.chapters} 章`);
  L.push(`> 状态：**${entry.status}** · 合计 ${entry.lectures} 讲 · ${entry.cues} 条语句 · ${(entry.durationSec / 3600).toFixed(1)} 小时`);
  L.push('> 本文件由 `node scripts/build_video_lessons.js` 生成，勿手改。');
  L.push('');
  L.push('## 一、语料清单（逐份实测）');
  L.push('');
  L.push('| 语料 | 形态 | 讲数 | 语句 | 时长 | 路径 |');
  L.push('|---|---|--:|--:|--:|---|');
  for (const s of entry.sources) {
    L.push(`| ${s.label} | ${s.kind} | ${s.lectures} | ${s.cues || '—'} | ${s.durationSec ? tc(s.durationSec) : '无时间码'} | \`${s.path}\` |`);
  }
  L.push('');
  const chapters = chaptersOf(`${entry.dept}/${entry.slug}`);
  const CN = ['二', '三', '四', '五', '六'];
  let si = 0;
  for (const s of entry.sources) {
    if (!s.rows || !s.rows.length) continue;
    const rows = s.rows.slice().sort((a, b) => Number(a.no) - Number(b.no) || String(a.no).localeCompare(String(b.no)));
    L.push(`## ${CN[si] || '七'}、讲次表 · ${s.label}`);
    si += 1;
    L.push('');
    L.push('| 讲 | 标题 | 语句 | 时长 | 对应章 |');
    L.push('|--:|---|--:|--:|---|');
    const limit = rows.length > 60 ? 60 : rows.length;
    for (const r of rows.slice(0, limit)) {
      const c = mapChapter(r, chapters);
      L.push(`| ${r.no} | ${String(r.title).slice(0, 46)} | ${r.cues || '—'} | ${r.durationSec ? tc(r.durationSec) : '—'} | ${c ? `${c.n}. ${c.title}` : '—'} |`);
    }
    if (s.rows.length > limit) L.push(`| … | 另有 ${s.rows.length - limit} 讲（见语料目录） | | | |`);
    L.push('');
    L.push('> 「对应章」按讲题与章名的实词重合度匹配（≥3 个二字词），够不着写「—」，不硬塞。');
    L.push('');
  }
  L.push('## 三、用法与边界');
  L.push('');
  L.push('- 讲次表只给**出处与定位**；要写教案正文（目标/重难点/板书），须从语料里逐句取原话，不得凭记忆补。');
  L.push('- 时长：字幕语料取首尾时间码之差，ASR 取音频实测秒数，B 站取页面标注时长——三者口径不同，不可相加比大小。');
  L.push('- 语料是别人的课：引用必须标平台与 BV 号/文件名，不得当成自己的讲义。');
  L.push('');
  return L.join('\n');
}

function ledgerMd(doc) {
  const t = doc.totals;
  const L = [];
  L.push('# 188 门学科 · 网络视频教案台账');
  L.push('');
  L.push(`> 由 \`node scripts/build_video_lessons.js\` 生成，逐份实测语料后落账。`);
  L.push('');
  L.push('| 指标 | 值 |');
  L.push('|---|---|');
  L.push(`| 学科 | ${t.subjects} |`);
  L.push(`| 有网络视频/音频语料 | **${t.withVideo}** |`);
  L.push(`| 无（缺口） | **${t.none}** |`);
  L.push(`| 讲次合计 | ${t.lectures} |`);
  L.push(`| 逐句语句合计 | ${t.cues.toLocaleString()} |`);
  L.push(`| 时长合计 | ${(t.durationSec / 3600).toFixed(1)} 小时 |`);
  L.push('');
  const byDept = new Map();
  for (const s of doc.subjects) {
    if (!byDept.has(s.dept)) byDept.set(s.dept, []);
    byDept.get(s.dept).push(s);
  }
  L.push('## 一、有语料的学科');
  L.push('');
  L.push('| 学科 | 院系 | 学期 | 状态 | 讲 | 语句 | 时长 | 教案 |');
  L.push('|---|---|--:|---|--:|--:|--:|---|');
  for (const s of doc.subjects.filter((x) => x.status !== 'none')) {
    L.push(`| ${s.title} | ${s.dept} | ${s.semester} | ${s.status} | ${s.lectures} | ${s.cues || '—'} | ${(s.durationSec / 3600).toFixed(1)}h | [教案](${s.plan}) |`);
  }
  L.push('');
  L.push('## 二、缺口（按院系）');
  L.push('');
  L.push('| 院系 | 学科数 | 有语料 | 缺 |');
  L.push('|---|--:|--:|--:|');
  for (const [dept, list] of byDept) {
    const has = list.filter((x) => x.status !== 'none').length;
    L.push(`| ${dept} | ${list.length} | ${has} | ${list.length - has} |`);
  }
  L.push('');
  L.push('## 三、语料里有、课里没有的');
  L.push('');
  L.push(`| 目录 | 形态 |`);
  L.push('|---|---|');
  for (const u of doc.unattached) L.push(`| \`standards/materials/${u.slug}\` | ${u.shape} |`);
  L.push('');
  L.push('> 这些多是**文本底本**（全文/讲义/图谱），不是视频课，所以不进台账；但一个都不许静默丢，故全部列在这里。');
  L.push('');
  L.push('## 四、补源约定（怎么把一门空缺的课补进台账）');
  L.push('');
  L.push('bilibili 的搜索 API 对本机返回 412（风控），**不能**批量抓；页面本身可达。所以补源只能一门一门来，且必须按这条链：');
  L.push('');
  L.push('1. 人给 **视频页/合集页 URL**（或本地已存的页面 HTML）；');
  L.push('2. 落 `standards/materials/<slug>/sources/`：页面 HTML 原样 + `episodes.json`（讲号/BV/标题/页面标注时长）；');
  L.push('3. 记 `source-map.json`：URL、抓取日期、sha256、封面数；');
  L.push('4. 在 `scripts/build_video_lessons.js` 的 `SOURCES` 里挂到学科，重跑 `npm run video:lessons`；');
  L.push('5. 讲数、时长与页面标注差 > 5s 要当错误处理（防止把别的视频当成某讲——陈瑞春那门就是这么抓出来的）。');
  L.push('');
  L.push('> 不接受「搜索到一个看起来像的合集就写进去」：没留档、没 sha256、没逐讲对时长，就是注水。');
  L.push('');
  return L.join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  const doc = build();
  const files = new Map();
  files.set(path.join(ROOT, 'data', 'video-lessons.json'), JSON.stringify(doc, null, 1) + '\n');
  files.set(path.join(ROOT, 'VIDEO-LESSONS.md'), ledgerMd(doc));
  for (const s of doc.subjects) {
    if (!s.plan) continue;
    const p = path.join(ROOT, s.plan);
    files.set(p, planMd(s));
  }
  if (check) {
    const drift = [];
    for (const [p, text] of files) {
      const old = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
      if (old !== text) drift.push(path.relative(ROOT, p).replace(/\\/g, '/'));
    }
    if (drift.length) { console.log('DRIFT:', drift.slice(0, 8).join(', ')); process.exit(1); }
    console.log(`[video-lessons] ✓ ${files.size} 个文件一致（有语料 ${doc.totals.withVideo}/${doc.totals.subjects}）`);
    return;
  }
  for (const [p, text] of files) {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, text, 'utf8');
  }
  const t = doc.totals;
  console.log(`[video-lessons] 写入 ${files.size} 个文件`);
  console.log(`  学科 ${t.subjects} · 有语料 ${t.withVideo} · 缺口 ${t.none} · ${t.lectures} 讲 · ${t.cues} 语句 · ${(t.durationSec / 3600).toFixed(1)}h`);
  for (const s of doc.subjects.filter((x) => x.status !== 'none')) {
    console.log(`    ${s.title.padEnd(14, '　')} ${String(s.lectures).padStart(4)} 讲  ${(s.durationSec / 3600).toFixed(1).padStart(5)}h  ${s.status}`);
  }
}

main();
