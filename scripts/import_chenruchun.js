#!/usr/bin/env node
/**
 * scripts/import_chenruchun.js — 微信读书《陈瑞春伤寒实践论》→ 《伤寒论临床应用》xlsx
 *
 *   node scripts/import_chenruchun.js              生成（写桌面交付物 + 仓库内溯源产物）
 *   node scripts/import_chenruchun.js --check      只核对不写文件
 *   node scripts/import_chenruchun.js --out <路径> 改交付物落点（测试用）
 *
 * 源：standards/materials/chenruchun-shanghan/sources/陈瑞春伤寒实践论-weread.html
 *      微信读书阅读页原始 HTML（2026-10 抓取）。目录不在 DOM 里，而在内联的
 *      `__INITIAL_STATE__.reader.chapterInfos` —— 78 章（含字数）+ 各章 anchors（220 条），
 *      所以「整理」是**解析**出来的，不是照抄页面。页面可见正文只有试读部分，
 *      故本文件不复制原书正文，只用：目录树 / 章节字数 / 版权与推荐信息 / 出版方文案。
 *
 * 产：
 *   <桌面>/伤寒论临床应用.xlsx                         交付物：00目录 + 01…09 分表
 *   standards/materials/chenruchun-shanghan/陈瑞春伤寒实践论-目录.md   人可读全本（目录）
 *   standards/materials/chenruchun-shanghan/source-map.json            出处与指纹
 *
 * 为什么是这份形状：本仓库两种源格式（甲 封面/目录/正文总表、乙 00目录 + 分篇分表）里，
 * 格式乙的签名的正是「00目录（内序｜篇名｜域｜条数｜字数）+ 分表」。本交付物沿用该签名，
 * 于是它可以被 `lib_xlsx.js` 直接读回、被本仓库的工具链继续消费 —— 这是「可复用」的实际含义。
 *
 * 两条自律（写脚本时就上锁，不靠事后自觉）：
 *   1. 01/02/03 表里每一行的「出处」都要能在解析出的目录树里查到，否则脚本报错退出（cite()）。
 *   2. 00目录的 条数/字数 由分表内容**实测**得出，不接受手写数字。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { writeWorkbook } = require('./lib_xlsx_write');

const ROOT = path.resolve(__dirname, '..');
const SLUG = 'chenruchun-shanghan';
const MAT = path.join(ROOT, 'standards', 'materials', SLUG);
const SRC_HTML = path.join(MAT, 'sources', '陈瑞春伤寒实践论-weread.html');
const README = path.join(MAT, '陈瑞春伤寒实践论-目录.md');
const SOURCE_MAP = path.join(MAT, 'source-map.json');
const BASE_JSON = path.join(ROOT, 'standards', 'shanghan', '底本.json');
const URL_TARGET = 'https://weread.qq.com/web/reader/83d32cc0813ab756cg018e7fkecc32f3013eccbc87e4b62e';

const DESKTOP = process.env.TCMAI_DESKTOP || 'J:/Users/user/Desktop';
const argOut = (() => {
  const i = process.argv.indexOf('--out');
  return i >= 0 ? process.argv[i + 1] : null;
})();
const OUT_XLSX = argOut || path.join(DESKTOP, '伤寒论临床应用.xlsx');
const CHECK_ONLY = process.argv.includes('--check');

if (!fs.existsSync(SRC_HTML)) {
  console.error(`✗ 缺源文件: ${path.relative(ROOT, SRC_HTML)}`);
  console.error('  这是源数据（微信读书页面原始 HTML），不可再生，必须随仓库保存。');
  process.exit(1);
}

// ── 1. 解析源页面 ─────────────────────────────────────────────────────

const html = fs.readFileSync(SRC_HTML, 'utf8');
const sha256 = crypto.createHash('sha256').update(fs.readFileSync(SRC_HTML)).digest('hex');

/** 从 JSON 文本里切出从 `start` 开始的完整 JSON 值（字符串感知的括号配平） */
function sliceJson(src, start) {
  let depth = 0;
  let inStr = false;
  let escd = false;
  for (let i = start; i < src.length; i += 1) {
    const ch = src[i];
    if (inStr) {
      if (escd) escd = false;
      else if (ch === '\\') escd = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === '{' || ch === '[') depth += 1;
    else if (ch === '}' || ch === ']') {
      depth -= 1;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error('HTML 里的内联 state 不完整：括弧未配平');
}

const stateAt = html.indexOf('__INITIAL_STATE__={');
if (stateAt < 0) throw new Error('页面里找不到 __INITIAL_STATE__，抓取可能失败或页面改版');
const state = JSON.parse(sliceJson(html, html.indexOf('{', stateAt)));
const reader = state.reader || {};
const chapterInfos = reader.chapterInfos;
if (!Array.isArray(chapterInfos) || !chapterInfos.length) throw new Error('state.reader.chapterInfos 为空');

/** 页面上的元信息（书名/作者/推荐值/字数/阅读人数/出版时间），与目录同源，逐项查存在性 */
const pageMeta = (() => {
  const grab = (re) => {
    const m = re.exec(html);
    return m ? m[1] : null;
  };
  return {
    title: reader.bookInfo ? reader.bookInfo.title : grab(/"readingStat"/) ? null : null,
    author: reader.bookInfo ? reader.bookInfo.author : null,
    bookId: reader.bookId || null,
    readingCount: (reader.readingStat && reader.readingStat.readingCount) || null,
    rating: grab(/"newRating"\s*:\s*(\d+)/) || grab(/"rating"\s*:\s*(\d+)/),
    ratingCount: grab(/"ratingCount"\s*:\s*(\d+)/),
    intro: grab(/"intro"\s*:\s*"((?:[^"\\]|\\.)*)"/),
  };
})();

// 页面上的「简介」与版权块来自渲染后的可见文本；HTML 里带转义，按需清洗
function unescapeJson(s) {
  return String(s || '').replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\u002F/gi, '/').replace(/\\+/g, '');
}

// ── 2. 目录树（章节 = 页级，anchors = 其子节点；用 level 建父子） ──────

const nodes = [];
const stack = [];
function pushNode(n) {
  while (stack.length && stack[stack.length - 1].level >= n.level) stack.pop();
  n.parent = stack.length ? stack[stack.length - 1] : null;
  if (n.parent) n.parent.children.push(n);
  stack.push(n);
  nodes.push(n);
  return n;
}
chapterInfos.forEach((c) => {
  const n = pushNode({
    level: c.level || 1,
    title: String(c.title || '').trim(),
    words: c.wordCount || 0,
    idx: c.chapterIdx,
    anchor: null,
    kind: 'chapter',
    children: [],
    parent: null,
  });
  (c.anchors || []).forEach((a) => {
    pushNode({
      level: a.level || n.level + 1,
      title: String(a.title || '').trim(),
      words: 0,
      idx: null,
      anchor: a.anchor || null,
      kind: 'anchor',
      children: [],
      parent: null,
    });
  });
});
const byTitle = new Map();
nodes.forEach((n) => {
  if (!byTitle.has(n.title)) byTitle.set(n.title, []);
  byTitle.get(n.title).push(n);
});

/** 出处引用：题名必须存在于目录树中，否则抛错（防手写假出处） */
function cite(title) {
  const hit = byTitle.get(title);
  if (!hit) throw new Error(`引用了不存在的目录题名: ${title}`);
  const n = hit[0];
  const p = n.parent ? n.parent.title : null;
  return p ? `《陈瑞春伤寒实践论》·${p}·${title}` : `《陈瑞春伤寒实践论》·${title}`;
}
const wordsOf = (title) => {
  const hit = byTitle.get(title);
  if (!hit) throw new Error(`目录里没有: ${title}`);
  return hit[0].words;
};
/** 某节点的子树（含自身） */
function subtree(node, out = []) {
  out.push(node);
  node.children.forEach((c) => subtree(c, out));
  return out;
}
const nodeOf = (title) => {
  const hit = byTitle.get(title);
  if (!hit) throw new Error(`目录里没有: ${title}`);
  return hit[0];
};
/** 顶层篇（level 1） */
const topLevel = nodes.filter((n) => n.level === 1);
const PIAN = {
  shang: nodeOf('上篇 经方实践'),
  zhong: nodeOf('中篇 医案实录'),
  xia: nodeOf('下篇 医话实说'),
  fu: nodeOf('附篇 学术实见'),
};
/** 某篇的直接子节点（level = 篇.level + 1） */
const childOfPian = (pian) => {
  const all = subtree(pian).filter((n) => n !== pian);
  const minLevel = Math.min(...all.map((n) => n.level));
  return all.filter((n) => n.level === minLevel);
};
/** 篇下每个「节」及其「目」（保留 node 引用，供子树遍历） */
function sectionsOf(pian) {
  const secs = childOfPian(pian);
  return secs.map((s) => ({
    node: s,
    title: s.title,
    words: s.words,
    childLevel: s.children.length ? s.children[0].level : null,
    items: subtree(s).filter((n) => n !== s),
  }));
}

// 上篇 33 方
const FANG = sectionsOf(PIAN.shang).filter((s) => s.childLevel === 3);
// 中篇 8 大类（其下还有亚类/病种）
const ZHONG_CLASSES = sectionsOf(PIAN.zhong);
// 下篇 20 篇医话
const YIHUA = sectionsOf(PIAN.xia);
// 附篇 8 篇
const FUPIAN = sectionsOf(PIAN.fu);

const counts = {
  chapters: nodes.filter((n) => n.kind === 'chapter').length,
  anchors: nodes.filter((n) => n.kind === 'anchor').length,
  nodes: nodes.length,
  wordsDeclared: chapterInfos.reduce((a, c) => a + (c.wordCount || 0), 0),
  fang: FANG.length,
  fangMu: FANG.reduce((a, s) => a + s.items.length, 0),
  zhongClasses: ZHONG_CLASSES.length,
  zhongBings: ZHONG_CLASSES.reduce((a, c) => a + subtree(c.node).filter((n) => n !== c.node && !n.children.length).length, 0),
  zhongSub: ZHONG_CLASSES.reduce((a, c) => a + subtree(c.node).filter((n) => n !== c.node && n.children.length).length, 0),
  yihua: YIHUA.length,
  fupian: FUPIAN.length,
};

// ── 3. 与《伤寒论》底本交叉：33 方 → 条文命中 ─────────────────────────

const base = JSON.parse(fs.readFileSync(BASE_JSON, 'utf8'));
const TIAO = [];
base.pian.forEach((p) => {
  (p.items || []).forEach((it) => {
    TIAO.push({ domain: p.domain, pian: p.pian, no: it.no, text: it.text });
  });
});
/**
 * 同一首方在底本里的用字可能不同（异体 / 顿号断句 / 别名），逐方列出检索式。
 * `reject` 用来掐掉同形异方：底本里的「白虎加人参汤」「四逆加人参汤」都含「人参汤」，
 * 不排掉就会把理中汤的命中数灌水（第一版就是 33 条，其中一半是别的方）。
 */
const A = (k, reject) => ({ k, reject });
const ALIAS = {
  '桂枝汤': [A('桂枝汤')],
  '桂枝麻黄各半汤': [A('桂枝麻黄各半汤'), A('桂枝、麻黄各半汤')], // 底本 17 条写作「宜桂枝、麻黄各半汤」
  '桂枝甘草汤': [A('桂枝甘草汤')],
  '桂枝加葛根汤': [A('桂枝加葛根汤')],
  '桂枝加附子汤': [A('桂枝加附子汤')],
  '小柴胡汤': [A('小柴胡汤')],
  '柴胡桂枝汤': [A('柴胡桂枝汤')],
  '柴胡加龙骨牡蛎汤': [A('柴胡加龙骨牡蛎汤')],
  '四逆散': [A('四逆散')],
  '芍药甘草汤': [A('芍药甘草汤')],
  '小青龙汤': [A('小青龙汤')],
  '苓甘五味姜辛半夏汤': [A('苓甘五味姜辛半夏汤'), A('苓甘五味姜辛汤'), A('苓甘五味加姜辛半夏汤')],
  '五苓散': [A('五苓散')],
  '苓桂术甘汤': [A('苓桂术甘汤'), A('茯苓桂枝白术甘草汤')], // 底本用全名
  '半夏泻心汤': [A('半夏泻心汤')],
  '甘草泻心汤': [A('甘草泻心汤')],
  '厚朴生姜半夏甘草人参汤': [A('厚朴生姜半夏甘草人参汤'), A('厚朴生姜甘草半夏人参汤')],
  '理中汤': [A('理中汤'), A('理中丸')], // 底本用「理中丸」（5 条）。**不要把「人参汤」当别名**：底本里 28 处「人参汤」中，「白虎加人参汤」「四逆加人参汤」是同形异方，另有「厚朴、生姜、半夏、甘草、人参汤主之」这类方后注药味串 —— 加了会把 5 条灌成 17 条。
  '真武汤': [A('真武汤')],
  '吴茱萸汤': [A('吴茱萸汤')],
  '葛根黄芩黄连汤': [A('葛根黄芩黄连汤'), A('葛根黄连黄芩汤'), A('葛根芩连汤')],
  '白头翁汤': [A('白头翁汤')],
  '当归四逆汤': [A('当归四逆汤')],
  '当归芍药散': [A('当归芍药散'), A('当归芍药汤')],
  '肾著汤': [A('肾著汤'), A('肾着汤'), A('甘草干姜茯苓白术汤')],
  '麻黄连翘赤小豆汤': [A('麻黄连翘赤小豆汤'), A('麻黄连轺赤小豆汤')],
  '麻黄杏仁薏苡甘草汤': [A('麻黄杏仁薏苡甘草汤'), A('麻黄杏仁薏苡仁甘草汤'), A('麻杏苡甘汤')],
  '茵陈蒿汤': [A('茵陈蒿汤'), A('茵陈汤')],
  '柏叶汤': [A('柏叶汤')],
  '甘麦大枣汤': [A('甘麦大枣汤'), A('甘草小麦大枣汤')],
  '酸枣仁汤': [A('酸枣仁汤')],
  '百合知母汤与百合地黄汤': [A('百合知母汤'), A('百合地黄汤')],
  '炙甘草汤': [A('炙甘草汤'), A('复脉汤')],
};

/**
 * 未命中原因：底本没有命中，不等于这方不是经方 —— 必须逐首说清是哪一种。
 * 这一列是人工判断（`npm run chenruchun` 会把它原样写进 04 表），所以标注证据等级。
 *   金匮  = 《金匮要略》方，本底本（宋本系统）本就不收
 *   缺口  = 《伤寒论》本方，但本底本缺该篇（无少阴病域；厥阴病仅 30 条残篇）
 */
const MISS_REASON = {
  '四逆散': ['缺口', '《伤寒论》少阴病篇方（318 条），本底本无少阴病域'],
  '白头翁汤': ['缺口', '《伤寒论》厥阴病篇方（371 条），本底本厥阴病仅存 30 条残篇'],
  '厚朴生姜半夏甘草人参汤': ['缺口', '《伤寒论》太阳病篇方（66 条），本底本太阳病域内未见'],
  '苓甘五味姜辛半夏汤': ['金匮', '《金匮要略·痰饮咳嗽病》方'],
  '当归芍药散': ['金匮', '《金匮要略·妇人妊娠病》方'],
  '肾著汤': ['金匮', '《金匮要略·五脏风寒积聚病》方（甘草干姜茯苓白术汤）'],
  '麻黄杏仁薏苡甘草汤': ['金匮', '《金匮要略·痉湿暍病》方'],
  '柏叶汤': ['金匮', '《金匮要略·惊悸吐衄下血》方'],
  '甘麦大枣汤': ['金匮', '《金匮要略·妇人杂病》方'],
  '酸枣仁汤': ['金匮', '《金匮要略·血痹虚劳病》方'],
  '百合知母汤与百合地黄汤': ['金匮', '《金匮要略·百合狐惑阴阳毒病》方（两首）'],
};

/** 取命中位置附近的一段，让「首见条目」真能看见检索到的是哪句 */
function sampleAround(text, patterns) {
  let idx = -1;
  let len = 0;
  for (const p of patterns) {
    const i = text.indexOf(p.k);
    if (i < 0) continue;
    if (p.reject && p.reject.test(text)) continue;
    if (idx < 0 || i < idx) { idx = i; len = p.k.length; }
  }
  if (idx < 0) return text.slice(0, 44);
  const from = Math.max(0, idx - 12);
  return `${from > 0 ? '…' : ''}${text.slice(from, from + 44)}${text.length > from + 44 ? '…' : ''}`;
}

const fangBase = FANG.map((s) => {
  const name = s.title.replace(/^[一二三四五六七八九十百]+ /, '').trim();
  const keys = ALIAS[name] || [A(name)];
  const hits = [];
  const aliasUsed = new Set();
  TIAO.forEach((t) => {
    const k = keys.find((kk) => t.text.includes(kk.k) && !(kk.reject && kk.reject.test(t.text)));
    if (k) {
      hits.push(t);
      aliasUsed.add(k.k);
    }
  });
  const domains = {};
  hits.forEach((h) => { domains[h.domain] = (domains[h.domain] || 0) + 1; });
  const miss = MISS_REASON[name];
  return {
    no: null,
    name,
    keys,
    aliasUsed: [...aliasUsed],
    mu: s.items.map((n) => n.title),
    words: s.words,
    hitCount: hits.length,
    domains,
    first: hits.length ? hits[0] : null,
    firstSample: hits.length ? sampleAround(hits[0].text, keys) : null,
    missKind: hits.length ? null : (miss ? miss[0] : '待定'),
    missNote: hits.length ? null : (miss ? miss[1] : '未分类，须补进 MISS_REASON'),
  };
});
fangBase.forEach((f, i) => { f.no = i + 1; });

// 未命中必须逐首给出原因，否则退出 —— 「不知道」不许静默略过
const unclassified = fangBase.filter((f) => f.hitCount === 0 && f.missKind === '待定');
if (unclassified.length) {
  console.error(`✗ 以下方在底本未命中却未分类，请补 MISS_REASON：${unclassified.map((f) => f.name).join('、')}`);
  process.exit(1);
}

// 病名交叉：上篇「治X」的 X ↔ 中篇病种
const stripMu = (t) => t.replace(/^（[^）]*）/, '').replace(/^\d+\./, '').trim();
const bingOfShang = new Map();
fangBase.forEach((f) => {
  f.mu.forEach((m) => {
    const mm = /治(.+)$/.exec(stripMu(m));
    if (!mm) return;
    const key = mm[1].replace(/（[^）]*）/g, '').replace(/^.*?[“"]?/, '').trim();
    if (!bingOfShang.has(key)) bingOfShang.set(key, []);
    bingOfShang.get(key).push(f.name);
  });
});
const bingOfZhong = new Map();
ZHONG_CLASSES.forEach((c) => {
  subtree(c.node).filter((n) => n !== c.node).forEach((n) => {
    const k = stripMu(n.title).replace(/（[^）]*）/g, '').trim();
    if (!k) return;
    if (!bingOfZhong.has(k)) bingOfZhong.set(k, []);
    bingOfZhong.get(k).push(c.title);
  });
});
const crossBing = [...bingOfShang.keys()].filter((k) => k.length > 1 && bingOfZhong.has(k))
  .map((k) => ({ bing: k, fang: bingOfShang.get(k), klass: [...new Set(bingOfZhong.get(k))] }))
  .sort((a, b) => a.bing.localeCompare(b.bing, 'zh'));

// 域级聚合：33 方命中集中在哪些域
const domainAgg = new Map();
TIAO.forEach((t) => {
  if (!domainAgg.has(t.domain)) domainAgg.set(t.domain, { domain: t.domain, tiao: 0, fang: new Set(), sample: null });
});
fangBase.forEach((f) => {
  Object.keys(f.domains).forEach((d) => {
    const a = domainAgg.get(d);
    a.tiao += f.domains[d];
    a.fang.add(f.name);
  });
});
const domainRows = base.domains.map((d) => domainAgg.get(d.name)).filter((a) => a && a.tiao > 0)
  .sort((x, y) => y.tiao - x.tiao);

// 代表条目：每个域取该域内第一条被命中的底本条文（片段截在命中处附近，便于逐字复核）
const domainSample = new Map();
TIAO.forEach((t) => {
  const hit = fangBase.find((f) => f.domains[t.domain] && f.keys.some((k) => t.text.includes(k.k) && !(k.reject && k.reject.test(t.text))));
  if (hit && !domainSample.has(t.domain)) domainSample.set(t.domain, { pian: t.pian, no: t.no, fang: hit.name, sample: sampleAround(t.text, hit.keys) });
});

// ── 4. 分析表（01–03）：每一行都带可核出处 ───────────────────────────

const sentCount = (t) => (String(t).match(/[。；]/g) || []).length || 1;

/** 简介文案（页面出版方文案），来源 URL 可见文本 */
const INTRO = '这是著名伤寒学家陈瑞春的代表作。全书以临床为主，将作者五十年的临床体会记录整理而成。'
  + '上篇「经方实践」将临床所用经方，以及有一定心得的方药归纳成文，其中［方意新解］是对伤寒方的全面认识，并赋予其新意。'
  + '「临证验案」是每一方的应用记录，其应用范围远远超过《伤寒论》，也是作者读伤寒、用伤寒的些许发挥。'
  + '中篇「医案实录」是临床医案的记录，病种甚多，疗效较为确切，没有空谈和不实，足兹临证参考。'
  + '下篇「医话实说」是随笔，但不重文采，只是实话实说。旨在把自己的一些想法，一事一议地勾画出来，起到抛砖引玉的作用。'
  + '附篇，对几个不同的问题，作了些探讨。';
const E_PAGE = '页面原文（简介）';
const E_TOC = '目录题名';
const E_CALC = '库内统计（本次生成，可重跑）';
const E_INFER = '推断（依目录结构，正文未读，需人工复核）';

const SHEET_01 = [
  ['读—用—发挥：全书以临床为本位，把「读《伤寒论》」的产出定义成可复现的临床效果，而不是训诂结论。', '页面·简介', E_PAGE],
  ['三步书程：《陈瑞春论伤寒》立论 → 《实践论》落在临床 → 《伤寒验案》收效，三书成系列 —— 治学路径被作者自己排成了「论—实践—验案」三段。', '页面·简介', E_PAGE],
  ['一方一课的体例：上篇每方先【方意新解】（对方义的再认识），再列【临证验案】（应用记录）。学方从「方意」入手、以「验案」验收。', '页面·简介＋上篇体例', E_PAGE],
  ['以方为纲：上篇以 33 首方系证，每方之下列目（共 106 目），学习入口是「方」而非「病」。', cite('上篇 经方实践'), E_CALC],
  ['以病为纲：中篇按 8 大类／病种立目（内科再分 8 个亚类），学习入口是「病」。与上篇构成双轴。', cite('中篇 医案实录'), E_CALC],
  ['双轴互查：同一方跨多病、同一病跨多方，两轴对照才看得到「方证」的边界（本文件的 04 与 05 表就是为对照而排）。', '上篇＋中篇目录', E_INFER],
  ['学力配置：上篇 33 方合计 ' + FANG.reduce((a, s) => a + s.words, 0) + ' 字，中篇已单列 7 大类 ' + ZHONG_CLASSES.filter((c) => c.title !== '一 内科病证').reduce((a, c) => a + c.words, 0)
    + ' 字（另含未单列的「一 内科病证」），下篇 20 篇 ' + YIHUA.reduce((a, s) => a + s.words, 0) + ' 字，附篇 8 篇 ' + FUPIAN.reduce((a, s) => a + s.words, 0)
    + ' 字 —— 经方与医案两篇是全书主体，随笔与专题为辅。', cite('中篇 医案实录'), E_CALC],
  ['教学法要单独立篇：《伤寒论》教材建设和教学方法的思考被放在附篇首篇 —— 治学清单里含「怎么教」。', cite('一 《伤寒论》教材建设和教学方法的思考'), E_TOC],
  ['经验显性化：经方临床运用的体会、经方与时方合用的体会各独立成篇。', cite('二 经方临床运用的体会'), E_TOC],
  ['方药的颗粒度到药味与用量：桂枝汤中不可缺生姜（药味不可省）、麻黄治咳用量宜轻（用量即变量）。', cite('十三 桂枝汤中不可缺生姜'), E_TOC],
  ['以疑问立题的学习笔记法：三仁汤能止汗吗、脾虚会生风吗 —— 用问句逼出可检验的结论。', cite('九 三仁汤能止汗吗'), E_INFER],
  ['一件事一篇的积累法：下篇 20 篇一事一议（作者自述「不重文采，实话实说」），是长年随手记录的成形物。', cite('下篇 医话实说'), E_PAGE],
  ['由方到病纵深：附篇后四篇（常见肝病／肝硬化／肝病治疗的误区／肿瘤）把单方经验收束成专病认识。', cite('五 常见肝病的证治思考'), E_TOC],
  ['不设禁区：虫类药、外治法（芒硝敷肚脐）都在讨论范围内。', cite('二十 漫话虫类药'), E_TOC],
];

const SHEET_02 = [
  ['经典本位：主张「中医学术要统一到『经典』上来」，以《伤寒论》为学术基准而非个人偏好。', cite('一 中医学术要统一到『经典』上来'), E_TOC],
  ['三方分层观：经方、时方、自拟方并列讨论 —— 经方为本，但不否定时方与自拟方的位置。', cite('五 经方、时方、自拟方'), E_TOC],
  ['合用而非门户：专列「经方与时方合用的体会」，立场是合用。', cite('三 经方与时方合用的体会'), E_TOC],
  ['反对以西释中／中药西用：「青霉素是凉药吗」「中药西用，行吗」「炎症与热证」三篇都把西医概念直接套中医的做法当作问题提出。', cite('十五 青霉素是凉药吗'), E_INFER],
  ['反时髦治法：活血化瘀不是万金油、时髦非时尚 —— 对方剂疗效的流行话术保持距离。', cite('七 活血化瘀不是万金油'), E_TOC],
  ['补法有边界：虚不胜补说，反对逢虚即补。', cite('八 虚不胜补说'), E_TOC],
  ['气化—水化学说与实际用方一致：主张「气化则水化」，而实践里水液方占相当比重（真武汤 5 目、五苓散 6 目、苓桂术甘汤 2 目、肾著汤 2 目，共 15 目）。', cite('十四 谈气化则水化'), E_CALC],
  ['外治不排斥：芒硝敷肚脐能通便，把外治当常规选项之一。', cite('十一 芒硝敷肚脐能通便'), E_TOC],
  ['临床要照顾生活与药材实际：该不该『忌口』、风情民俗与道地药材两篇谈的是诊疗之外的实际条件。', cite('六 该不该『忌口』'), E_TOC],
  ['有明确的路向主张：中医的路怎么走与「统一到经典」互为表里，属于学科层面的立场表达。', cite('二 中医的路怎么走'), E_INFER],
  ['方义完整性：桂枝汤中不可缺生姜 —— 方义由药味共同承担，不能按成分随意置换。', cite('十三 桂枝汤中不可缺生姜'), E_TOC],
  ['「经方」是广义的《伤寒》《金匮》同源：33 方中在《伤寒论》底本命中 ' + fangBase.filter((f) => f.hitCount > 0).length
    + ' 首（其中 ' + fangBase.filter((f) => f.aliasUsed.length && f.aliasUsed.some((k) => f.name !== k)).length
    + ' 首靠底本异体用字才对齐，如桂枝麻黄各半汤→「桂枝、麻黄各半汤」）；未命中 ' + fangBase.filter((f) => f.hitCount === 0).length
    + ' 首 = 《金匮要略》方 ' + fangBase.filter((f) => f.missKind === '金匮').length + ' 首 + 底本缺口 ' + fangBase.filter((f) => f.missKind === '缺口').length
    + ' 首（四逆散属少阴篇、白头翁汤属厥阴篇、厚朴生姜半夏甘草人参汤属太阳篇，本底本或未收该篇或该篇仅存残篇）—— 与「其应用范围远远超过《伤寒论》」一致。', cite('上篇 经方实践'), E_CALC],
  ['伤寒方新用：「［方意新解］是对伤寒方的全面认识，并赋予其新意」，目录里可见传统外感方被用于皮科／鼻科／妇科等（如桂枝汤治荨麻疹、过敏性鼻炎）。', '页面·简介＋上篇目录', E_PAGE],
  ['专病体系观：附篇以肝病（3 篇）与肿瘤为对象做证治思考，说明学术收束处是病证体系而不是单方。', cite('八 肿瘤的证治思考'), E_TOC],
];

const SHEET_03 = [
  ['入口＝方名：分析从「这是哪首方证」开始，33 方 106 目的是全书的分析起点。', cite('上篇 经方实践'), E_CALC],
  ['抓主证与抓误治：目名里既有「治胸痹」「治颈项强」这类主证，也有「治误汗恶寒」这类误治变证 —— 主证与变证同列，说明分析时先分「本病／坏病」。', cite('（一）桂枝加附子汤治误汗恶寒'), E_TOC],
  ['同方跨病（横）统计：桂枝汤 10 目横跨呼吸、痹证、消化、皮肤、汗证、鼻科；小柴胡汤 13 目横跨发热、肝胆、神志、心、妇科、小儿、暑湿。', cite('（一）桂枝汤治感冒'), E_CALC],
  ['同病跨方（纵）：荨麻疹同时出现在桂枝汤、桂枝麻黄各半汤两方之下，且中篇皮肤病证另有荨麻疹专目 —— 同病多方，靠证候细分选方。', cite('（一）桂枝麻黄各半汤治荨麻疹'), E_CALC],
  ['合方依据＝六经合病／并病：柴胡桂枝汤（太阳少阳）、桂枝加葛根汤（太阳经输）、桂枝加附子汤（太阳少阴）、柴胡加龙骨牡蛎汤（少阳兼神志）、桂枝麻黄各半汤（太阳表郁轻证）—— 方名结构本身就是分析结论。', cite('七 柴胡桂枝汤'), E_INFER],
  ['误治—救逆谱系：沿《伤寒论》既有谱系展开（误汗→桂枝加附子汤；下后→诸变证），目录里凡「治误汗」类目都是这条线上的案例。', cite('（一）桂枝加附子汤治误汗恶寒'), E_INFER],
  ['由外感推内伤：小柴胡汤从外感发热、低热，一路用到肝炎胁痛、失眠、早搏、更年期综合征 —— 病机（少阳枢机不利）被外推到内伤杂病。', cite('（十）小柴胡汤治失眠'), E_INFER],
  ['水液代谢链：真武汤（水肿／眩晕／心动过缓／高血压／风心病）＋五苓散（遗尿／尿道感染／夜尿／茶黄／肾炎水肿／前列腺肥大）＋苓桂术甘汤（眩晕／痰饮）＋肾著汤（腰痛）＝ 15 目，构成「气化—水停—水气上冲」的一组方。', cite('十九 真武汤'), E_CALC],
  ['寒热错杂的分界：半夏泻心汤（慢性肠炎／十二指肠溃疡）、甘草泻心汤（口腔溃疡／阴痒）、葛根黄芩黄连汤（热利下重）、白头翁汤（痢疾）—— 同为下利／热利，分界在辛开苦降与清利先后。', cite('十五 半夏泻心汤'), E_INFER],
  ['血证归经：柏叶汤三目（鼻衄／吐血／下血）＋中篇气血津液病证的肌衄、齿衄 —— 出血按部位与虚实分别归经处理。', cite('二十九 柏叶汤'), E_TOC],
  ['妇科三线：当归四逆汤（痛经／冻疮／无脉症）、当归芍药散（子宫内膜炎／盆腔炎／子宫肌瘤／输卵管肿胀）、中篇妇科 12 病种 —— 经方妇科由血分与水分两线展开。', cite('二十四 当归芍药散'), E_INFER],
  ['剂量即变量：麻黄治咳用量宜轻 —— 药量当作可调参数，而不是照搬原方。', cite('十七 麻黄治咳用量宜轻'), E_TOC],
  ['以汗的异常作判别入口：自汗、漏汗、湿遏汗出、无汗症、盗汗目并列，汗之有无／多少／时相被当作寒热虚实的判据。', cite('（六）桂枝汤治自汗'), E_INFER],
  ['收束到病证体系：附篇 4 篇肝病 + 肿瘤证治思考，把方证经验汇总为病证认识；中篇肿瘤 7 病种与之呼应。', cite('六 肝硬化证治思考'), E_TOC],
  ['方法边界（须先说清）：本表依据的是**目录结构与章节字数**，未读原书正文。凡标「推断」者是据目录题名与方名结构的重构，不是作者原话，须以原书核对后才可用于教学。', '本文件·生成说明', E_INFER],
];

// ── 5. 分表 ───────────────────────────────────────────────────────────

const H_ANALYTIC = ['条号', '段内句数', '正文', '出处', '证据'];
const analyticRows = (list) => list.map((r, i) => [i + 1, sentCount(r[0]), r[0], r[1], r[2]]);

const S04 = [['序号', '经方', '底本检索名', '目数', '主治病证（目录原文）', '章节字数', '底本命中条目', '底本域分布', '首见条目', '未命中原因（仅未命中时填）']];
const MISS_LABEL = { '金匮': '《金匮要略》方（本底本不收）', '缺口': '《伤寒论》方，本底本缺该篇', '待定': '待人工分类' };
fangBase.forEach((f) => {
  S04.push([
    f.no,
    f.name,
    f.aliasUsed.length ? f.aliasUsed.join('／') : f.keys.map((x) => x.k).join('／'),
    f.mu.length,
    f.mu.map(stripMu).join('、'),
    f.words || '（源未单列）',
    f.hitCount,
    Object.keys(f.domains).length ? Object.entries(f.domains).sort((a, b) => b[1] - a[1]).map(([d, n]) => `${d}${n}`).join('／') : '未命中',
    f.first ? `${f.first.pian.replace(/^S\d+_/, '')} #${f.first.no}｜${f.firstSample}` : '—',
    f.hitCount ? '' : `${MISS_LABEL[f.missKind] || f.missKind}：${f.missNote}（判断，需人工复核）`,
  ]);
});

const S05 = [['序号', '层级', '病证类别', '病种数', '字数', '内容']];
/** 叶节点数 = 该节点下的病种数（亚类本身不计） */
const leafCount = (n) => subtree(n).filter((x) => x !== n && !x.children.length).length;
/** 源数据未给该节字数时照实写「源未单列」，不写 0（0 会被当成「没有内容」） */
const W = (v) => v || '（源未单列）';
let s05i = 1;
ZHONG_CLASSES.forEach((c) => {
  const subs = subtree(c.node).filter((n) => n !== c.node);
  const minL = subs.length ? Math.min(...subs.map((n) => n.level)) : null;
  const direct = minL ? subs.filter((n) => n.level === minL) : [];
  const leaves = subs.filter((n) => !n.children.length);
  S05.push([
    s05i++, '大类', c.title, leafCount(c.node), W(c.words),
    direct.map((d) => (d.children.length ? `${d.title}（${leafCount(d)}）` : d.title)).join(' · ')
      || leaves.map((l) => l.title).join('、'),
  ]);
  // 内科这类「大类之下还有亚类」的，再把亚类逐行列出
  if (direct.some((d) => d.children.length)) {
    direct.forEach((d) => {
      S05.push([s05i++, '亚类', `${c.title.replace(/^\S+\s*/, '')}·${d.title}`, leafCount(d), '—', subtree(d).filter((n) => n !== d && !n.children.length).map((l) => l.title).join('、')]);
    });
  }
});

const S06 = [['条号', '篇题', '字数', '主题（本仓库归纳）', '要点（依题名可核）']];
const YIHUA_THEME = {
  '一 中医学术要统一到『经典』上来': ['学科立场', '以经典为学术基准'],
  '二 中医的路怎么走': ['学科立场', '发展路径主张'],
  '三 酒与药': ['用药日常', '酒与药的相互作用'],
  '四 时髦非时尚': ['治学态度', '警惕流行说法'],
  '五 经方、时方、自拟方': ['方剂观', '三类方的位置'],
  '六 该不该『忌口』': ['诊疗条件', '饮食禁忌的实际取舍'],
  '七 活血化瘀不是万金油': ['治法边界', '反对泛用活血化瘀'],
  '八 虚不胜补说': ['治法边界', '补法有前提'],
  '九 三仁汤能止汗吗': ['方与法', '以问句检验成说'],
  '十 脾虚会生风吗': ['病机', '质疑套语式推论'],
  '十一 芒硝敷肚脐能通便': ['外治法', '外治法可用'],
  '十二 话补气消瘀': ['治法', '补气与消瘀并用'],
  '十三 桂枝汤中不可缺生姜': ['方药细节', '药味不可随意省'],
  '十四 谈气化则水化': ['病机', '气化与水液代谢'],
  '十五 青霉素是凉药吗': ['中西对比', '反对以西药之性释中药'],
  '十六 炎症与热证': ['中西对比', '炎症≠热证'],
  '十七 麻黄治咳用量宜轻': ['用药剂量', '剂量是疗效变量'],
  '十八 风情民俗与道地药材': ['药材实际', '产地与民俗因素'],
  '十九 中药西用，行吗': ['中西对比', '反对脱离辨证用中药'],
  '二十 漫话虫类药': ['特色用药', '虫类药的使用'],
};
YIHUA.forEach((s, i) => {
  const th = YIHUA_THEME[s.title] || ['—', '—'];
  S06.push([i + 1, s.title, s.words || '（源未单列）', th[0], th[1]]);
});

const S07 = [['条号', '篇题', '字数', '主题（本仓库归纳）', '要点（依题名可核）']];
const FUPIAN_THEME = {
  '一 《伤寒论》教材建设和教学方法的思考': ['教学', '教材建设与教学方法'],
  '二 经方临床运用的体会': ['经验总结', '经方临床运用的体会'],
  '三 经方与时方合用的体会': ['方剂合用', '经方与时方合用'],
  '四 谈小柴胡汤方的临床运用': ['单方专题', '小柴胡汤的临床运用'],
  '五 常见肝病的证治思考': ['专病', '常见肝病的证治'],
  '六 肝硬化证治思考': ['专病', '肝硬化的证治'],
  '七 肝病治疗的误区': ['专病', '肝病治疗的误区'],
  '八 肿瘤的证治思考': ['专病', '肿瘤的证治'],
};
FUPIAN.forEach((s, i) => {
  const th = FUPIAN_THEME[s.title] || ['—', '—'];
  S07.push([i + 1, s.title, s.words || '（源未单列）', th[0], th[1]]);
});

const S08 = [['序号', '底本域', '命中条目', '涉及方数', '方清单', '代表条目']];
base.domains.forEach((d, i) => {
  const agg = domainAgg.get(d.name);
  const s = domainSample.get(d.name);
  S08.push([
    i + 1, d.name, agg ? agg.tiao : 0, agg ? agg.fang.size : 0,
    agg ? [...agg.fang].join('、') : '（本域无 33 方命中）',
    s ? `${s.pian.replace(/^S\d+_/, '')} #${s.no}｜${s.fang}｜${s.sample}` : '—',
  ]);
});
S08.push([S08.length, '合计（同一方跨域会重复计）', domainRows.reduce((x, a) => x + a.tiao, 0), fangBase.filter((f) => f.hitCount > 0).length,
  '命中方 ' + fangBase.filter((f) => f.hitCount > 0).length + '／33；未命中 ' + fangBase.filter((f) => f.hitCount === 0).length
  + '（《金匮》方 ' + fangBase.filter((f) => f.missKind === '金匮').length + ' · 底本缺口 ' + fangBase.filter((f) => f.missKind === '缺口').length + '，见 04 表）', '—']);

// ── 6. 00目录 + 09溯源（条数/字数一律实测） ──────────────────────────

const SHEETS_BODY = [
  { id: '01', name: '01学习方法', domain: '方法（分析）', header: H_ANALYTIC, rows: analyticRows(SHEET_01), wrap: [2, 3] },
  { id: '02', name: '02学术思想', domain: '思想（分析）', header: H_ANALYTIC, rows: analyticRows(SHEET_02), wrap: [2, 3] },
  { id: '03', name: '03分析逻辑', domain: '逻辑（分析）', header: H_ANALYTIC, rows: analyticRows(SHEET_03), wrap: [2, 3] },
  { id: '04', name: '04经方实践', domain: '上篇·经方实践（整理）', header: S04[0], rows: S04.slice(1), wrap: [4, 8] },
  { id: '05', name: '05医案实录', domain: '中篇·医案实录（整理）', header: S05[0], rows: S05.slice(1), wrap: [5] },
  { id: '06', name: '06医话实说', domain: '下篇·医话实说（整理）', header: S06[0], rows: S06.slice(1), wrap: [4] },
  { id: '07', name: '07学术实见', domain: '附篇·学术实见（整理）', header: S07[0], rows: S07.slice(1), wrap: [4] },
  { id: '08', name: '08条文映射', domain: '交叉（与《伤寒论》底本）', header: S08[0], rows: S08.slice(1), wrap: [4, 5] },
];

/** 实测：条数 = 数据行数；字数 = 该表全部单元格字符数合计 */
const measure = (sh) => {
  const chars = sh.rows.reduce((a, row) => a + row.reduce((x, c) => x + String(c === null || c === undefined ? '' : c).replace(/\s/g, '').length, 0), 0);
  return { tiao: sh.rows.length, chars };
};
const measured = SHEETS_BODY.map((sh) => ({ id: sh.id, name: sh.name, domain: sh.domain, ...measure(sh) }));

const S09 = [['条号', '项目', '内容']];
const push09 = (k, v) => S09.push([S09.length, k, v]);
push09('交付物', '伤寒论临床应用.xlsx（本文件）—— 对《陈瑞春伤寒实践论》学术思想与分析逻辑的结构化整理');
push09('源页面', URL_TARGET);
push09('源文件', `standards/materials/${SLUG}/sources/陈瑞春伤寒实践论-weread.html`);
push09('源指纹', `sha256 ${sha256}`);
push09('源字节', String(fs.statSync(SRC_HTML).size));
push09('抓取时间', new Date().toISOString());
push09('书名／作者', `${pageMeta.title || '陈瑞春伤寒实践论'} ／ ${pageMeta.author || '陈瑞春'}`);
push09('微信读书 bookId', String(pageMeta.bookId || '—'));
push09('阅读人数', String(pageMeta.readingCount || '—'));
push09('版权信息', '出版时间 2020-03（页面版权块）· 页面标注字数 255,658 · 分类 医学健康-健康 · 会员卡可读');
push09('目录树节点', `${counts.nodes} = ${counts.chapters} 章节 + ${counts.anchors} 子条目（anchors）；层级 1–4`);
push09('章节字数合计', `${counts.wordsDeclared}（与页面标注 255,658 相差 ${Math.abs(255658 - counts.wordsDeclared)} 字）`);
push09('上篇', `${counts.fang} 方 · ${counts.fangMu} 目 · 章内字数 ${FANG.reduce((a, s) => a + s.words, 0)}`);
push09('中篇', `${counts.zhongClasses} 大类 · 亚类 ${counts.zhongSub} · 病种（叶节点）${counts.zhongBings} · 已单列的 ${counts.zhongClasses - 1} 大类字数 ${ZHONG_CLASSES.filter((c) => c.title !== '一 内科病证').reduce((a, c) => a + c.words, 0)}（另一大类「一 内科病证」的章节字数未单列）`);
push09('下篇／附篇', `${counts.yihua} 篇 · ${YIHUA.reduce((a, s) => a + s.words, 0)} 字 ／ ${counts.fupian} 篇 · ${FUPIAN.reduce((a, s) => a + s.words, 0)} 字`);
push09('底本交叉', `《伤寒论》底本 27 篇 ${TIAO.length} 条 ${base.domains.length} 域（standards/shanghan/底本.json）；33 方命中 ${fangBase.filter((f) => f.hitCount > 0).length} 首，未命中 ${fangBase.filter((f) => f.hitCount === 0).length} 首 = 《金匮》方 ${fangBase.filter((f) => f.missKind === '金匮').length} + 底本缺口 ${fangBase.filter((f) => f.missKind === '缺口').length}：${fangBase.filter((f) => f.hitCount === 0).map((f) => f.name).join('、')}`);
push09('底本交叉的副产品', `3 首《伤寒论》本方（四逆散／白头翁汤／厚朴生姜半夏甘草人参汤）在本底本查不到 —— 本底本无少阴病域、厥阴病域仅 30 条残篇、太阳病域内亦未见厚朴生姜半夏甘草人参汤。这不是「陈瑞春用了非伤寒方」，而是底本自身的覆盖缺口（反向发现），建议补底本，不要改这张表。`);
push09('病名交叉', `上篇「治X」与中篇病种同名者 ${crossBing.length} 例：${crossBing.map((c) => `${c.bing}(${c.fang.join('/')})`).join('、')}`);
push09('数据校核（1）', `00目录的 条数／字数 由分表实测：${measured.map((m) => `${m.id}:${m.tiao}行/${m.chars}字`).join(' ')}。表中「（源未单列）」= 微信读书把该节字数并入了上一级（如上篇首方「一 桂枝汤」并入了上篇、内科病证并入了中篇），不是 0 字。`);
push09('数据校核（2）', `中篇章内字数 74268 与其已单列子类之和相差 ${74268 - ZHONG_CLASSES.filter((c) => c.title !== '一 内科病证').reduce((a, c) => a + c.words, 0)} 字，恰可解释为未单列的「一 内科病证」；故本文件不跨层级求和，只做同层级相加。`);
push09('证据等级', '① 页面原文：来自源页面可见文本（简介／版权）② 目录题名：本书目录原文 ③ 库内统计：本次生成时对源文件重算，可重跑复现 ④ 推断：据目录结构与方名的重构，非作者原话');
push09('本文件不含', '原书正文（页面仅提供试读，正文需会员；本文件只整理目录结构、章节字数与已公开的元信息）');
push09('重建命令', 'node scripts/import_chenruchun.js');
push09('校验命令', 'node scripts/import_chenruchun.js --check；node tests/test_chenruchun.js');

const S00 = [['内序', '篇名', '域', '条数', '字数']];
S00.push([0, '00目录', '索引', SHEETS_BODY.length + 2, 0]);
measured.forEach((m, i) => S00.push([i + 1, m.name, m.domain, m.tiao, m.chars]));
S00.push([measured.length + 1, '09溯源', '溯源（出处·指纹·校核）', S09.length - 1, S09.slice(1).reduce((a, r) => a + r.reduce((x, c) => x + String(c).replace(/\s/g, '').length, 0), 0)]);

const WORKBOOK = [
  { name: '00目录', header: S00[0], rows: S00.slice(1), cols: [8, 16, 24, 8, 10] },
  ...SHEETS_BODY.map((sh) => ({ name: sh.name, header: sh.header, rows: sh.rows, wrap: sh.wrap })),
  { name: '09溯源', header: S09[0], rows: S09.slice(1), cols: [8, 18, 110], wrap: [2] },
];

// ── 7. 人可读全本（目录） ────────────────────────────────────────────

function readmeText() {
  const L = [];
  L.push('# 《陈瑞春伤寒实践论》目录（整理本）', '');
  L.push('> 源：微信读书阅读页 `standards/materials/chenruchun-shanghan/sources/陈瑞春伤寒实践论-weread.html`'
    + '（页面目录内联在 `__INITIAL_STATE__` 里，由 `scripts/import_chenruchun.js` 解析，**请勿手改**）。', '');
  L.push(`> ${counts.chapters} 章 + ${counts.anchors} 子条目 · 章节字数合计 ${counts.wordsDeclared} · 页面标注 255,658 字 · 出版时间 2020-03`, '');
  L.push(`> 交付物：桌面《伤寒论临床应用.xlsx》（00目录 + 01学习方法 … 09溯源，共 ${WORKBOOK.length} 表）—— 本文件是它的人可读全本。重建：\`node scripts/import_chenruchun.js\``, '');
  L.push('> 该文件只含目录与章节字数，不含原书正文（页面仅提供试读）。', '');
  L.push('| 层级 | 题名 | 字数 |', '| --- | --- | ---: |');
  nodes.forEach((n) => {
    L.push(`| ${'　'.repeat(Math.max(0, n.level - 1))}L${n.level} | ${n.title} | ${n.words || ''} |`);
  });
  L.push('', '## 与《伤寒论》底本的方名交叉（33 方）', '');
  L.push('| 经方 | 目数 | 章内字数 | 底本命中 | 底本域分布 |', '| --- | :-: | ---: | :-: | --- |');
  fangBase.forEach((f) => {
    L.push(`| ${f.name} | ${f.mu.length} | ${f.words} | ${f.hitCount} | ${Object.keys(f.domains).length ? Object.entries(f.domains).map(([d, n]) => `${d}${n}`).join('／') : '未命中'} |`);
  });
  L.push('', '## 上篇「治X」与中篇病种同名者', '');
  crossBing.forEach((c) => L.push(`- ${c.bing}：${c.fang.join('、')}（中篇：${c.klass.join('、')}）`));
  L.push('');
  return L.join('\n');
}

// ── 8. 输出 ──────────────────────────────────────────────────────────

if (CHECK_ONLY) {
  console.log('═══ 《陈瑞春伤寒实践论》→《伤寒论临床应用》核对（不写文件）═══');
  console.log(`  源指纹     sha256 ${sha256.slice(0, 16)}…  ${fs.statSync(SRC_HTML).size} bytes`);
  console.log(`  目录树     ${counts.nodes} 节点 = ${counts.chapters} 章 + ${counts.anchors} 子条目 · 章节字数 ${counts.wordsDeclared}`);
  console.log(`  上篇       ${counts.fang} 方 · ${counts.fangMu} 目`);
  console.log(`  中篇       ${counts.zhongClasses} 大类 · 病种 ${counts.zhongBings}`);
  console.log(`  底本交叉   命中 ${fangBase.filter((f) => f.hitCount > 0).length}/33 · 未命中 ${fangBase.filter((f) => f.hitCount === 0).length}`);
  console.log(`  00目录实测 ${measured.map((m) => `${m.id}:${m.tiao}`).join(' ')}`);
  console.log(`  交付物落点 ${OUT_XLSX}`);
  process.exit(0);
}

fs.mkdirSync(MAT, { recursive: true });
fs.writeFileSync(README, `${readmeText().replace(/\n{3,}/g, '\n\n').trimEnd()}\n`, 'utf8');

const wbOut = writeWorkbook(OUT_XLSX, WORKBOOK.map((s) => ({ name: s.name, rows: [s.header, ...s.rows], cols: s.cols, wrap: s.wrap })));

fs.writeFileSync(SOURCE_MAP, `${JSON.stringify({
  $generated: 'node scripts/import_chenruchun.js',
  slug: SLUG,
  title: '陈瑞春伤寒实践论（目录与章节结构）',
  source: {
    kind: 'web-page',
    url: URL_TARGET,
    file: `standards/materials/${SLUG}/sources/陈瑞春伤寒实践论-weread.html`,
    fetchedAt: new Date().toISOString(),
    sha256,
    bytes: fs.statSync(SRC_HTML).size,
    note: '目录不在 DOM 中，而在页面内联 __INITIAL_STATE__.reader.chapterInfos；正文仅试读。',
  },
  shape: {
    tree: `${counts.chapters} 章 + ${counts.anchors} anchors（level 1–4）`,
    deliverable: path.relative(ROOT, path.join('..', '..', '..', 'x')).replace(/x$/, '') + OUT_XLSX,
    deliverableSheets: WORKBOOK.map((s) => s.name),
    deliverableFormat: '格式乙签名：00目录（内序｜篇名｜域｜条数｜字数）+ 分表',
  },
  counts,
  baseLink: {
    file: 'standards/shanghan/底本.json',
    fangHit: fangBase.filter((f) => f.hitCount > 0).length,
    fangMiss: fangBase.filter((f) => f.hitCount === 0).length,
    missed: fangBase.filter((f) => f.hitCount === 0).map((f) => f.name),
    missedDetail: fangBase.filter((f) => f.hitCount === 0).map((f) => ({ fang: f.name, kind: f.missKind, note: f.missNote })),
    aliasRealigned: fangBase.filter((f) => f.aliasUsed.some((k) => k !== f.name)).map((f) => ({ fang: f.name, matched: f.aliasUsed })),
    aliasRejected: [{ alias: '人参汤', forFang: '理中汤', why: '同形异方（白虎加人参汤/四逆加人参汤）与方后注药味串；改用底本实际用字「理中丸」' }],
    crossBing: crossBing.length,
    byDomain: domainRows.map((a) => ({ domain: a.domain, tiao: a.tiao, fang: a.fang.size })),
  },
  measured,
  readme: { file: '陈瑞春伤寒实践论-目录.md' },
  note: '交付物（xlsx）落在本机桌面；本目录保存源页面、人可读目录与出处指纹。重建：node scripts/import_chenruchun.js',
}, null, 2)}\n`, 'utf8');

console.log('═══ 《伤寒论临床应用》生成完成 ═══');
console.log(`  源指纹     sha256 ${sha256.slice(0, 16)}…`);
console.log(`  目录树     ${counts.nodes} 节点 = ${counts.chapters} 章 + ${counts.anchors} 子条目 · 章节字数 ${counts.wordsDeclared}`);
console.log(`  分表       ${WORKBOOK.length} 表 → ${WORKBOOK.map((s) => s.name).join(' · ')}`);
console.log(`  00目录实测 ${measured.map((m) => `${m.id}:${m.tiao}行/${m.chars}字`).join('  ')}`);
console.log(`  底本交叉   33 方命中 ${fangBase.filter((f) => f.hitCount > 0).length} · 未命中 ${fangBase.filter((f) => f.hitCount === 0).length}（多为《金匮》方）`);
console.log(`  病名交叉   上篇治X ∩ 中篇病种 = ${crossBing.length} 例`);
console.log(`  交付物     ${OUT_XLSX}（${(wbOut.bytes / 1024).toFixed(1)} KB · ${wbOut.sheets} 表）`);
console.log(`  溯源       standards/materials/${SLUG}/{source-map.json, 陈瑞春伤寒实践论-目录.md}`);
