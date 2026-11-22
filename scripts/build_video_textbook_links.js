#!/usr/bin/env node
/**
 * scripts/build_video_textbook_links.js —— 网络视频 ↔ 教学章 ↔ 教材章 的三线挂接
 *
 * 为什么需要这一步：视频台账（data/video-lessons.json）只记「哪门课有几讲、
 * 每讲多长」，教材台账只记「哪门课有几章」；两边都齐全，但**学生看完一讲
 * 不知道该读哪一章**。这道脚本把三边对上，产出一份可查、可跳转、可校验的
 * 挂接表。
 *
 * 挂接规则（先讲清，再产出）：
 *   1. 讲数 = 教学章数 → 按序号 1:1 挂（status: order）
 *   2. 讲数 > 教学章数 → **不瞎分**（status: needs-segmentation），只记比例，
 *      留给字幕段落/人工分段；宁可留空，不许把 196 讲平摊到 10 章冒充挂接
 *   3. 教学章 → 教材章：优先用 standards/<x>/补章登记.json 的 noSupplement.mapping；
 *      教材章数 = 教学章数时按序号；教材章数 = 讲数时按讲序号
 *   4. 该课没有教材稿 → status: no-textbook（不假装挂上）
 *
 * 用法：
 *   node scripts/build_video_textbook_links.js            # 生成 data/video-textbook-links.json
 *   node scripts/build_video_textbook_links.js --check    # 与磁盘重算比对，不一致退 1
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const p = (...x) => path.join(ROOT, ...x);
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const OUT = p('data/video-textbook-links.json');

const VIDEO = readJson(p('data/video-lessons.json'));

/** 读某门的教学章（departments/<dept>/<slug>/chapters.json） */
function teachingChapters(dept, slug) {
  const f = p('departments', dept, slug, 'chapters.json');
  if (!fs.existsSync(f)) return [];
  const j = readJson(f);
  const arr = Array.isArray(j) ? j : (j.chapters || []);
  return arr.map((x, i) => ({ no: x.num ?? x.n ?? i + 1, title: x.title || '' }));
}

/** 读某门的教材章（textbooks/<dept>/<slug>/NN-第N章-*.md），章号取「第N章」 */
function textbookChapters(dept, slug) {
  const dir = p('textbooks', dept, slug);
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^\d+-第(\d+)章-(.+)\.md$/);
    if (m) out.push({ no: Number(m[1]), title: m[2], file: `textbooks/${dept}/${slug}/${f}` });
  }
  return out.sort((a, b) => a.no - b.no);
}

/** 读某门的「教学章 → 教材章」口径映射（有决案的课才有） */
function mappingOf(dept, slug) {
  const key = `${dept}/${slug}`;
  for (const name of fs.readdirSync(p('standards'))) {
    const f = p('standards', name, '补章登记.json');
    if (!fs.existsSync(f)) continue;
    let j;
    try { j = readJson(f); } catch { continue; }
    if (j.subject !== key || !j.noSupplement) continue;
    const mm = j.noSupplement.mapping || [];
    if (mm.length) return mm;
  }
  return null;
}

/** 单元层索引：内经 = 一篇一单元（title 即篇名，chapter 即教材章号）；伤寒 = 一条一单元 */
function unitIndex(dept, slug) {
  const bare = slug.replace(/^\d{2}-/, '');
  const ALIAS = {
    'shanghanlun': 'shanghan', 'shanghan-lun': 'shanghan',
    'jinguiyaolue': 'jingui', 'jingui-yaolue': 'jingui',
    'zhongyineikexue': 'neike', 'zhongyi-neike-xue': 'neike',
    'zhongyaoxue': 'zhongyao-xue', 'neijingxuandu': 'neijing-xuandu',
  };
  const cands = [slug, bare, bare.replace(/-(lun|xue)$/, ''), ALIAS[bare]].filter(Boolean);
  for (const d of cands) {
    const f = p('standards', d, 'units.json');
    if (!fs.existsSync(f)) continue;
    const U = readJson(f);
    return (U.units || []).map((u) => {
      const loc = String(u.locator || '');
      const m = loc.match(/（(素问|灵枢)第(\d+)篇）/);
      return {
        chapter: Number(u.chapter),
        title: String(u.title || u.sub || '').trim(),
        body: String(u.body || u.rawBody || ''),
        book: m ? m[1] : null,
        pian: m ? Number(m[2]) : null,
      };
    });
  }
  return [];
}

/** 讲题映射（外部课程目录 → 篇 → 章）：standards/<x>/讲题映射.json 的 lectures 段 */
function lectureMapOf(dept, slug) {
  const bare = slug.replace(/^\d{2}-/, '');
  for (const d of [slug, bare, bare.replace(/lun$/, ''), 'neijing-xuandu', 'shanghan']) {
    const f = p('standards', d, '讲题映射.json');
    if (!fs.existsSync(f)) continue;
    try {
      const j = readJson(f);
      if (j && j.lectures) return j.lectures;
    } catch { /* 坏文件按没有处理 */ }
  }
  return {};
}

const stripBook = (t) => String(t || '')
  .replace(/^[（(][^）)]*[)）]/, '')
  .replace(/^(素问|灵枢)\s*[·・.、]\s*/, '')
  .replace(/^遗篇\s*[·・.、]\s*/, '')
  .trim();
const coreOf = (t) => stripBook(t).replace(/(大论|篇|论)$/, '');

/** 通用标题（自身不含信息量）——这些讲不能靠关键词挂接，只能等分段 */
const GENERIC = [/^第\s*\d+\s*讲$/, /^wy\d+$/i, /^p\d+$/i, /^原文$/, /^第\s*\d+$/, /^\d+$/];

/** 从讲标题里取候选关键词（可能多个）：去前缀 → 拆词 → 抽方名 */
function keywordsOf(title) {
  let t = String(title || '').trim();
  if (!t) return [];
  if (GENERIC.some((re) => re.test(t))) return [];
  t = t.replace(/^\d+\s*[-–—、.．]\s*/, '');
  t = t.replace(/^[一-龥]{2,6}讲[一-龥]{2,8}\d+\s*[-–—]?\s*/, '');
  t = t.replace(/^第\s*\d+\s*讲\s*[-–—:：]?\s*/, '');
  const out = new Set();
  for (const tok of t.split(/[\s、，,;；:：()（）\[\]【】_＿\/／|·]+/)) {
    const clean = tok.replace(/\d+$/, '').trim();
    if (clean.length >= 3) out.add(clean);
  }
  for (const m of t.matchAll(/[一-龥]{2,5}(?:汤|丸|散|饮)/g)) out.add(m[0]);
  // 前缀回退：标题里的整词（如「机器学习原理」）常不在正文里，但前 3–4 字常在。
  // 只展开前缀、不展开任意子串，避免「原理」这类泛词乱挂。
  const expanded = new Set();
  for (const tok of out) {
    if (tok.length < 3 || tok.length > 12) continue;
    expanded.add(tok);
    for (let n = Math.min(6, tok.length - 1); n >= 3; n -= 1) expanded.add(tok.slice(0, n));
  }
  return [...expanded];
}

/** 教材章正文缓存：关键词 → 命中章（按出现次数取最高，平局取章号小者） */
function keywordIndex(tb) {
  const cache = new Map();
  for (const ch of tb) {
    const abs = p(ch.file);
    cache.set(ch.no, fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '');
  }
  const count = (text, kw) => {
    let n = 0;
    let i = text.indexOf(kw);
    while (i >= 0) { n += 1; i = text.indexOf(kw, i + kw.length); }
    return n;
  };
  return (kws) => {
    let best = null;
    for (const kw of kws) {
      for (const ch of tb) {
        const n = count(cache.get(ch.no) || '', kw);
        if (n > 0 && (!best || n > best.hits || (n === best.hits && ch.no < best.ch.no))) {
          best = { ch, hits: n, kw };
        }
      }
    }
    return best ? { ...best.ch, kw: best.kw } : null;
  };
}

const courses = [];
for (const s of VIDEO.subjects) {
  if (!s.status || s.status === 'none') continue;
  const rows = [];
  for (const src of s.sources || []) {
    for (const r of src.rows || []) {
      rows.push({ src: src.kind, no: r.no ?? null, title: r.title || '', durationSec: r.durationSec ?? null, cues: r.cues ?? 0 });
    }
  }
  rows.sort((a, b) => (a.no ?? 0) - (b.no ?? 0));

  const teach = teachingChapters(s.dept, s.slug);
  const tb = textbookChapters(s.dept, s.slug);
  const mm = mappingOf(s.dept, s.slug);
  const tbByNo = new Map(tb.map((x) => [x.no, x]));
  const lookup = keywordIndex(tb);
  const mmByPlan = new Map((mm || []).map((m) => [m.plan, m]));

  // 单元层：内经「一篇一单元」可直接把 162 讲硬挂到 31 章；伤寒「一条一单元」按方名落章
  const units = unitIndex(s.dept, s.slug);
  const lmap = lectureMapOf(s.dept, s.slug);
  const unitByCore = new Map();
  for (const u of units) {
    const k = coreOf(u.title);
    if (k && !unitByCore.has(k)) unitByCore.set(k, u);
    const k2 = k.replace(/藏/g, '脏');
    if (k2 && !unitByCore.has(k2)) unitByCore.set(k2, u);
  }
  const unitByPian = new Map();
  for (const u of units) if (u.book && u.pian) unitByPian.set(`${u.book}${u.pian}`, u);
  const unitChapterByKeyword = (kws) => {
    const tally = new Map();
    for (const kw of kws) {
      for (const u of units) {
        if (!u.body.includes(kw)) continue;
        tally.set(u.chapter, (tally.get(u.chapter) || 0) + 1);
      }
    }
    let best = null;
    for (const [ch, n] of tally) if (!best || n > best.n) best = { ch, n };
    return best ? best.ch : null;
  };

  let status;
  const out = rows.map((r, i) => {
    let t = null;
    if (rows.length === teach.length) {
      t = teach[i] || null;
    } else if (r.no != null && teach.some((x) => x.no === r.no) && teach.length === 1) {
      t = teach.find((x) => x.no === r.no) || null;
    }

    let books = [];
    if (t) {
      if (mmByPlan.has(t.no)) {
        const nos = mmByPlan.get(t.no).textbookChapters || [mmByPlan.get(t.no).textbookChapter];
        books = nos.map((n) => tbByNo.get(n)).filter(Boolean);
      } else if (tb.length === teach.length) {
        const hit = tb.find((x) => x.no === t.no);
        if (hit) books = [hit];
      }
    }
    if (!books.length && tb.length === rows.length) {
      const hit = tb.find((x) => x.no === r.no);
      if (hit) books = [hit];
    }
    // 单元层硬挂：①篇名/条名与单元标题同核 → 该单元所在教材章；②方名在该单元正文出现最多 → 该章
    let viaUnit = null;
    // ①外部课程目录里的讲题（wy01…）→ 篇 → 章；映射表里没有就跳过
    if (!books.length && tb.length) {
      const e = lmap[String(r.title || '').trim()];
      if (e && tbByNo.has(Number(e.chapter))) {
        books = [tbByNo.get(Number(e.chapter))];
        viaUnit = `lecture-map:${e.pian}`;
      }
    }
    if (!books.length && tb.length && units.length) {
      const t0 = String(r.title || '').trim();
      const mc = t0.match(/^SW\s*0*(\d+)$/i);
      const ml = t0.match(/^(?:LS|ls|Ls)\s*0*(\d+)$/);
      let u = null;
      if (mc) u = unitByPian.get(`素问${Number(mc[1])}`) || null;
      else if (ml) u = unitByPian.get(`灵枢${Number(ml[1])}`) || null;
      if (!u) u = unitByCore.get(coreOf(t0).replace(/藏/g, '脏')) || unitByCore.get(coreOf(t0)) || null;
      if (u && tbByNo.has(u.chapter)) {
        books = [tbByNo.get(u.chapter)];
        viaUnit = u.book && u.pian ? `unit-pian:${u.book}第${u.pian}篇` : `unit-title:${u.title}`;
      }
    }
    if (!books.length && tb.length && units.length) {
      const kws = keywordsOf(r.title);
      if (kws.length) {
        const ch = unitChapterByKeyword(kws);
        if (ch && tbByNo.has(ch)) {
          books = [tbByNo.get(ch)];
          viaUnit = `unit-body:${kws[0]}`;
        }
      }
    }
    // 兜底：按讲标题里的篇名/方名在教材章正文里找（可复核：命中的是章正文，不是猜的）
    // 讲标题是**渲染时定稿**的（视频台账里存的是旧章名），正文补实后章名会变；
    // 所以后半句再退一层：用当前教学章标题的关键词找，命中同样要落在章正文里。
    let viaKeyword = null;
    if (!books.length && tb.length) {
      for (const src of [r.title, t && t.title]) {
        if (!src) continue;
        const kws = keywordsOf(src);
        if (!kws.length) continue;
        const hit = lookup(kws);
        if (hit) { books = [hit]; viaKeyword = hit.kw; break; }
      }
    }
    return {
      lectureNo: r.no ?? i + 1,
      title: r.title,
      durationSec: r.durationSec,
      cues: r.cues,
      source: r.src,
      teaching: t ? { no: t.no, title: t.title } : null,
      textbook: books.map((b) => ({ no: b.no, title: b.title, file: b.file })),
      linkedBy: books.length ? (viaUnit ? 'unit' : viaKeyword ? 'keyword' : 'order') : null,
      keyword: viaKeyword || null,
      unitEvidence: viaUnit || null,
    };
  });

  // 治法总论讲（「汗法5·下法1」「补法」这类）本身没有方名，硬挂单章必错。
  // 处理：按同一治法的其余讲所落章取并集——同法诸讲覆盖的章，就是这一讲的范围（evidence: method）。
  const METHOD_RE = /(汗法|下法|和法|温法|清法|补法|吐法|消法)/;
  for (const r of out) {
    if (r.textbook.length) continue;
    const m = String(r.title || '').match(METHOD_RE);
    if (!m) continue;
    const chs = new Set();
    for (const o of out) {
      if (o === r || !o.textbook.length) continue;
      const om = String(o.title || '').match(METHOD_RE);
      if (!om) continue;
      // 「汗法5·下法1」跨两法时，两法都算
      const mine = new Set(String(r.title).match(new RegExp(METHOD_RE, 'g')) || []);
      const theirs = new Set(String(o.title).match(new RegExp(METHOD_RE, 'g')) || []);
      let shared = false;
      for (const x of mine) if (theirs.has(x)) shared = true;
      if (!shared) continue;
      for (const b of o.textbook) chs.add(b.no);
    }
    const picked = [...chs].sort((a, b) => a - b).slice(0, 3);
    if (!picked.length) continue;
    r.textbook = picked.map((n) => tbByNo.get(n)).filter(Boolean);
    r.linkedBy = 'method';
    r.unitEvidence = `method:${[...new Set(String(r.title).match(new RegExp(METHOD_RE, 'g')) || [])].join('+')}→章${picked.join(',')}`;
  }

  const linkedLectures = out.filter((x) => x.textbook.length).length;
  const unlinked = out.filter((x) => !x.textbook.length);
  const genericUnlinked = unlinked.filter((x) => !keywordsOf(x.title).length).length;
  if (!tb.length) status = 'no-textbook';
  else if (linkedLectures === out.length) status = 'linked';
  else if (genericUnlinked === unlinked.length) status = 'needs-segmentation'; // 剩下的都没有信息量标题
  else status = 'partial';

  courses.push({
    dept: s.dept,
    slug: s.slug,
    title: s.title,
    semester: s.semester ?? null,
    videoStatus: s.status,
    lectures: out.length,
    teachingChapters: teach.length,
    textbookChapters: tb.length,
    mappedBy: mm ? 'noSupplement.mapping' : (tb.length === teach.length ? 'teaching=textbook 序号' : null),
    status,
    linkedLectures,
    unlinkedLectures: out.length - linkedLectures,
    rows: out,
  });
}

const doc = {
  schema: 'video-textbook-links/v1',
  // 不写「今天」：否则 --check 每天必报 DRIFT。来源固定为视频台账的生成器
  derivedFrom: 'data/video-lessons.json' + (VIDEO.generated ? `（${VIDEO.generated}）` : ''),
  note: '讲 → 教学章 → 教材章 三线挂接。needs-segmentation 表示讲数多于教学章数，未强行分配（不许平摊冒充挂接）；no-textbook 表示该课没有教材稿。',
  totals: {
    courses: courses.length,
    lectures: courses.reduce((a, c) => a + c.lectures, 0),
    linkedCourses: courses.filter((c) => c.status === 'linked').length,
    linkedLectures: courses.reduce((a, c) => a + c.linkedLectures, 0),
    needsSegmentation: courses.filter((c) => c.status === 'needs-segmentation').map((c) => c.slug),
    noTextbook: courses.filter((c) => c.status === 'no-textbook').map((c) => c.slug),
  },
  courses,
};

const check = process.argv.includes('--check');
if (check) {
  if (!fs.existsSync(OUT)) {
    console.error('✗ data/video-textbook-links.json 不存在（先跑 node scripts/build_video_textbook_links.js）');
    process.exit(1);
  }
  const old = readJson(OUT);
  const strip = (x) => JSON.stringify(x);
  if (strip(old) !== strip(doc)) {
    console.error('✗ 漂移：data/video-textbook-links.json 与重算结果不一致（视频/章数变了？重跑本脚本）');
    process.exit(1);
  }
  console.log(`✓ 视频↔教材挂接一致：${doc.totals.courses} 门课 / ${doc.totals.lectures} 讲 / 已挂 ${doc.totals.linkedLectures} 讲`);
  process.exit(0);
}

fs.writeFileSync(OUT, JSON.stringify(doc, null, 1) + '\n', 'utf8');
console.log(`✓ ${path.relative(ROOT, OUT)}`);
for (const c of courses) {
  console.log(`  ${c.title.padEnd(16, ' ')} 讲 ${String(c.lectures).padStart(3)} · 教学 ${String(c.teachingChapters).padStart(2)} · 教材 ${String(c.textbookChapters).padStart(2)} · 已挂 ${String(c.linkedLectures).padStart(3)} · ${c.status}`);
}
console.log(`  合计 ${doc.totals.courses} 门 / ${doc.totals.lectures} 讲 / 已挂 ${doc.totals.linkedLectures} 讲`);
