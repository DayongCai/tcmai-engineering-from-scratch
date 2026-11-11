#!/usr/bin/env node
/**
 * scripts/fetch_external_textbooks.js —— 抓取外源古籍（公有领域）并留档
 *
 * 为什么需要它：
 *   [textbooks] 的 100 门学科来自桌面 qhzy-*.xlsx（底本）。五官口腔系与骨伤系有 25 门学科
 *   在底本里**根本没有源件**，不是抽取失败。可用的替代源只有公有领域古籍 —— 它们能支撑
 *   其中一部分学科（中医筋伤、骨伤手法、面部望诊、五官经典、中医口腔、嗓音、美容皮肤），
 *   另一部分（口腔正畸/修复、颌面外科、眼科验光、解剖生理…）是现代学科，古籍支撑不了。
 *   所以外源补录只做**能核验**的那部分，且单独成库、不并入底本统计。
 *
 * 留档规则（每 source 一目录）：
 *   standards/materials/textbooks-batch/external/<id>/source.html      原始页面（只读留档）
 *   standards/materials/textbooks-batch/external/<id>/source.txt       结构化正文（繁體，'#' 标层级）
 *   standards/materials/textbooks-batch/external/<id>/source.simplified.txt  简体（opencc t2s，仅字形）
 *   standards/materials/textbooks-batch/external-registry.json         出处 · URL · 抓取时间 · 字节 · sha256 · 章数
 *
 * 用法：
 *   node scripts/fetch_external_textbooks.js --list
 *   node scripts/fetch_external_textbooks.js --all
 *   node scripts/fetch_external_textbooks.js --only zhenggu-xinfa
 *   node scripts/fetch_external_textbooks.js --check
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = 'standards/materials/textbooks-batch/external-sources.json';
const OUT_DIR = 'standards/materials/textbooks-batch/external';
const REGISTRY = 'standards/materials/textbooks-batch/external-registry.json';

const ARGV = process.argv.slice(2);
const has = (f) => ARGV.includes(f);
const val = (f) => {
  const i = ARGV.indexOf(f);
  return i >= 0 ? ARGV[i + 1] : null;
};

const MODE_LIST = has('--list');
const MODE_CHECK = has('--check');
const ONLY = val('--only');
const ALL = has('--all');

const TODAY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

const abs = (p) => path.join(ROOT, p);
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

const manifest = JSON.parse(fs.readFileSync(abs(MANIFEST), 'utf8'));
const PROVIDER = manifest.provider;

// ── HTML → 结构化文本 ────────────────────────────────────────────────
const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
const unescapeHtml = (s) => s.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] || m);
const stripTags = (s) => unescapeHtml(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

/**
 * 笈成（漢リポ）页面结构：<h1 data-sec="h1">卷一</h1> / <h2>類</h2> / <h3>篇</h3> /
 * <div data-sec="p">正文</div>，句读在 <span data-rev="今版"> 里（保留，属于读法）。
 */
function extractBook(html) {
  const body = html.slice(html.indexOf('<body'));
  const main = body.slice(body.indexOf('<main'), body.lastIndexOf('</main>') + 7);
  const lines = [];
  const meta = { author: '', dynasty: '', year: '', baseText: '' };

  const dl = main.match(/<dl class="元資料">([\s\S]*?)<\/dl>/);
  if (dl) {
    const pick = (label) => {
      const m = dl[1].match(new RegExp(`<dt>${label}</dt><dd>([\\s\\S]*?)</dd>`));
      return m ? stripTags(m[1]) : '';
    };
    meta.author = pick('作者');
    meta.dynasty = pick('朝代');
    meta.year = pick('年份');
    meta.baseText = pick('底本');
  }

  const re = /<(h[1-6]|div)\b([^>]*)>([\s\S]*?)<\/\1>/g;
  let m;
  while ((m = re.exec(main))) {
    const tag = m[1];
    const attrs = m[2] || '';
    const inner = m[3];
    const sec = (attrs.match(/data-sec="([^"]+)"/) || [])[1] || '';
    if (/^h[1-6]$/.test(tag) && /^h[1-6]$/.test(sec)) {
      const text = stripTags(inner);
      if (text) lines.push({ kind: 'h', level: Number(tag[1]), text });
      continue;
    }
    if (sec === 'p' || sec === 'note' || sec === 'quote' || sec === 'poem') {
      const text = stripTags(inner);
      if (text) lines.push({ kind: 'p', text, sec });
    }
  }
  return { meta, lines };
}

function toText(lines) {
  const out = [];
  for (const l of lines) {
    if (l.kind === 'h') out.push(`${'#'.repeat(l.level)} ${l.text}`);
    else out.push(l.text);
  }
  return out.join('\n\n') + '\n';
}

// ── 抓取（重试 + 节流：笈成对连续请求会 ECONNRESET）────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchWithRetry(url, tries = 4) {
  let last;
  for (let i = 1; i <= tries; i += 1) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'tcmai-textbooks-external/1.0' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { html: await res.text(), status: res.status, tries: i };
    } catch (e) {
      last = e;
      await sleep(1500 * i);
    }
  }
  throw last;
}

function t2s(text) {
  try {
    return execFileSync('python', [abs('scripts/convert_t2s.py')], {
      input: Buffer.from(text, 'utf8'),
      maxBuffer: 64 * 1024 * 1024,
    }).toString('utf8');
  } catch (e) {
    throw new Error(
      `繁→简转换失败（缺 opencc？见 scripts/convert_t2s.py 头部）：${e.message}`
    );
  }
}

const bookUrl = (s) => `${PROVIDER.url}book/${encodeURI(s.path)}/index.html`;

function readRegistry() {
  try {
    return JSON.parse(fs.readFileSync(abs(REGISTRY), 'utf8'));
  } catch {
    return { $generated: 'node scripts/fetch_external_textbooks.js --all', provider: PROVIDER, generatedAt: TODAY, sources: [] };
  }
}

// ── 主流程 ────────────────────────────────────────────────────────────
(async () => {
  const sources = ONLY ? manifest.sources.filter((s) => s.id === ONLY) : manifest.sources;

  if (MODE_LIST) {
    const reg = readRegistry();
    const byId = new Map(reg.sources.map((s) => [s.id, s]));
    console.log('外源清单（' + manifest.sources.length + ' 部）：');
    for (const s of manifest.sources) {
      const r = byId.get(s.id);
      const state = r ? `${r.chapters.n} 章 / ${r.chars} 字 · ${r.fetchedAt}` : '未抓取';
      const subs = s.subjects.map((x) => `${x.dept}/${x.slug}`).join(', ');
      console.log(`  ${s.id.padEnd(18)} ${s.title.padEnd(16)} ${state.padEnd(26)} → ${subs}`);
    }
    return;
  }

  if (MODE_CHECK) {
    const reg = readRegistry();
    let bad = 0;
    for (const s of manifest.sources) {
      const r = reg.sources.find((x) => x.id === s.id);
      if (!r) {
        console.error(`✗ ${s.id} 未登记（跑 --all）`);
        bad += 1;
        continue;
      }
      const p = abs(path.join(r.dir, 'source.html'));
      if (!fs.existsSync(p)) {
        console.error(`✗ ${s.id} 缺 ${r.dir}/source.html`);
        bad += 1;
        continue;
      }
      const got = sha256(fs.readFileSync(p));
      if (got !== r.sha256) {
        console.error(`✗ ${s.id} sha256 漂移：登记 ${r.sha256.slice(0, 16)}… 实测 ${got.slice(0, 16)}…`);
        bad += 1;
      }
    }
    if (bad) {
      console.error(`\n外源留档：${bad} 处与登记不一致。`);
      process.exit(1);
    }
    console.log(`✓ 外源留档 ${reg.sources.length} 部，sha256 全部与登记一致`);
    return;
  }

  if (!ALL && !ONLY) {
    console.error('用法：--all | --only <id> | --list | --check');
    process.exit(2);
  }

  const reg = readRegistry();
  reg.provider = PROVIDER;
  reg.generatedAt = TODAY;
  let ok = 0;

  for (const s of sources) {
    const url = bookUrl(s);
    process.stdout.write(`… ${s.id} ${s.title} `);
    let got;
    try {
      got = await fetchWithRetry(url);
    } catch (e) {
      console.log(`✗ 抓取失败：${e.message}`);
      const i = reg.sources.findIndex((x) => x.id === s.id);
      const entry = { id: s.id, title: s.title, url, status: 'fetch-failed', error: e.message, fetchedAt: TODAY };
      if (i >= 0) reg.sources[i] = entry;
      else reg.sources.push(entry);
      continue;
    }

    const { meta, lines } = extractBook(got.html);
    const text = toText(lines);
    // 每部书的层级不同（傷科大成/望診遵經 到 h2，口齒類要 只到 h1），章级由清单指定
    const lvl = s.chapterLevel || 3;
    const chapterCount = lines.filter((l) => l.kind === 'h' && l.level === lvl).length;
    const volumes = lines.filter((l) => l.kind === 'h' && l.level === 1).length;
    const paras = lines.filter((l) => l.kind === 'p').length;
    if (chapterCount < 3 || !paras) {
      console.log(`✗ 结构解析异常（h${lvl}=${chapterCount} p=${paras}），不入库`);
      continue;
    }

    const dir = path.join(OUT_DIR, s.id);
    fs.mkdirSync(abs(dir), { recursive: true });
    const htmlBuf = Buffer.from(got.html, 'utf8');
    fs.writeFileSync(abs(path.join(dir, 'source.html')), htmlBuf);
    fs.writeFileSync(abs(path.join(dir, 'source.txt')), text, 'utf8');

    const simplified = t2s(text);
    fs.writeFileSync(abs(path.join(dir, 'source.simplified.txt')), simplified, 'utf8');

    const entry = {
      id: s.id,
      title: s.title,
      provider: PROVIDER.id,
      url,
      httpStatus: got.status,
      dir: dir.split(path.sep).join('/'),
      author: meta.author,
      dynasty: meta.dynasty,
      year: meta.year,
      baseText: meta.baseText,
      bytes: htmlBuf.length,
      sha256: sha256(htmlBuf),
      chars: text.replace(/\s/g, '').length,
      simplifiedSha256: sha256(Buffer.from(simplified, 'utf8')),
      chapters: { n: chapterCount, level: lvl, volumes, paragraphs: paras },
      subjects: s.subjects,
      why: s.why,
      script: 'traditional→simplified (opencc t2s，仅字形)',
      fetchedAt: TODAY,
      status: 'fetched',
    };
    const i = reg.sources.findIndex((x) => x.id === s.id);
    if (i >= 0) reg.sources[i] = entry;
    else reg.sources.push(entry);
    console.log(`✓ ${chapterCount} 章(h${lvl}) / ${entry.chars} 字 / ${(htmlBuf.length / 1024).toFixed(0)} KB`);
    ok += 1;
    await sleep(1200);
  }

  fs.writeFileSync(abs(REGISTRY), JSON.stringify(reg, null, 2) + '\n');
  console.log(`\n✓ ${ok}/${sources.length} 部入库 → ${REGISTRY}`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
