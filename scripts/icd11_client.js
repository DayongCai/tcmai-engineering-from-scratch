#!/usr/bin/env node
/**
 * scripts/icd11_client.js —— ICD-11 客户端（实现源材料 embedding-code 规格的组件 ⑦「双通道」）
 *
 * 规格原文（`中医知识树.xlsx#embedding-code` 第 14–15 行）：
 *
 *   # scripts/icd11_client.py
 *   ICD_API_HEADERS = {"Accept": "application/json", "Accept-Language": "zh", "API-Version": "v2"}
 *   # 通道1：内网 API 192.168.0.111:8080（中文搜索 → Foundation ID）
 *   # 通道2：本地 data/icd11_mms.db（31,838 实体；Foundation ID → MMS 标准编码）
 *   def code_by_id(foundation_id):
 *       return conn.execute("SELECT id, code, title FROM entities WHERE id=?",
 *                           (str(foundation_id),)).fetchone()
 *
 * ── 双通道的实际形态 ────────────────────────────────────────────────
 *
 * 通道1 · WHO 官方 API（https://id.who.int/，OAuth2 client_credentials）
 *   规格写的是「内网 API 192.168.0.111:8080」—— 那是源平台的私有部署，本机不可达。
 *   WHO 的**公开**等价物是 id.who.int：同一套语义（中文搜索 → Foundation ID → MMS 编码），
 *   但需要注册应用拿 client_id / client_secret。凭据只从环境变量读：
 *     ICD11_CLIENT_ID · ICD11_CLIENT_SECRET · ICD11_SCOPE(默认 icdapi_access)
 *   没有凭据就**明说没有**，不伪造、不降级成"猜一个编码"。
 *
 * 通道2 · 本地库（data/icd11/）
 *   规格的 31,838 实体是 ICD-11 **Foundation 组件**（含 ICF/ICHI 全域、无编码、多父）。
 *   本机拿不到那份；可取到的是 **MMS 线性化快照 13,960 行**（WHO 2025-01 版，经上游
 *   vectorization-ICD11 数据集转出，带 code/title/parent/definition）。
 *   **13,960 ≠ 31,838，这是缩水不是同一份库** —— 差异记在 meta.json 与 README。
 *   好处是 MMS 单父 + 有编码，正好能做规格要的 "Foundation ID → MMS 标准编码" 与父链还原章节。
 *
 * 通道2 的表形状与规格一致（id / code / title）；存储不是 SQLite（本仓库零第三方依赖，
 * 且本机无 sqlite 可执行文件），而是 NDJSON + 内存索引。等价的是**查询语义**，不是格式。
 *
 * 用法：
 *   node scripts/icd11_client.js --fetch            # 下载快照（校验 sha256）到 data/icd11/
 *   node scripts/icd11_client.js --build            # 由快照构建本地库（NDJSON + meta）
 *   node scripts/icd11_client.js --ensure           # fetch + build（缺什么补什么）
 *   node scripts/icd11_client.js --validate         # 校验本仓库 icd11_map 的编码
 *   node scripts/icd11_client.js --code CA00        # 按编码查
 *   node scripts/icd11_client.js --id 1937339080    # 按 Foundation ID 查（规格签名）
 *   node scripts/icd11_client.js --who-check        # 探测 WHO API 凭据是否可用
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DATADIR = path.join(ROOT, 'data', 'icd11');
const CSV = path.join(DATADIR, 'source.csv');
const NDJSON = path.join(DATADIR, 'entities.ndjson');
const META = path.join(DATADIR, 'meta.json');

// ── 快照来源（WHO 2025-01 MMS，经上游 ICD-11 向量化项目转出的清洗版）──
const SOURCE = {
  url: 'https://raw.githubusercontent.com/marcolomele/vectorization-ICD11/main/Data/2-processing/icd11-25_data_clean.csv',
  upstream: 'https://github.com/marcolomele/vectorization-ICD11',
  release: '2025-01',
  linearization: 'mms',
  sha256: 'c4ffa495ad21b832b80b567da35b664aad42729177fb9518b01a91accdebbdf8',
  bytes: 19461645,
  // 上游仓库 GPL-3.0；ICD-11 内容版权属 WHO（ICD-11 使用条款）。
  // 因此**快照本身不入库**：本脚本按 URL 取、按 sha256 校，落 data/（.gitignore）。
  licenseNote: 'ICD-11 内容版权归 WHO；上游仓库为 GPL-3.0。快照不入版本库，按 sha256 可重现。',
};

// ── 通道1 · WHO 官方 API ──────────────────────────────────────────────

// 规格写死的请求头，逐字保留。
const ICD_API_HEADERS = { Accept: 'application/json', 'Accept-Language': 'zh', 'API-Version': 'v2' };
const WHO = {
  base: 'https://id.who.int',
  tokenUrl: 'https://icdaccessmanagement.who.int/connect/token',
  defaultScope: 'icdapi_access',
};

function credentials() {
  const id = process.env.ICD11_CLIENT_ID || '';
  const secret = process.env.ICD11_CLIENT_SECRET || '';
  // 只报**键名**与有无，绝不打印值。
  return {
    id, secret,
    ok: !!(id && secret),
    scope: process.env.ICD11_SCOPE || WHO.defaultScope,
    present: {
      ICD11_CLIENT_ID: !!id,
      ICD11_CLIENT_SECRET: !!secret,
      ICD11_SCOPE: !!process.env.ICD11_SCOPE,
    },
  };
}

async function whoToken(creds = credentials()) {
  if (!creds.ok) {
    return { ok: false, reason: '未配置凭据：ICD11_CLIENT_ID / ICD11_CLIENT_SECRET 缺失', creds };
  }
  const body = new URLSearchParams({
    client_id: creds.id, client_secret: creds.secret,
    grant_type: 'client_credentials', scope: creds.scope,
  });
  const res = await fetch(WHO.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) return { ok: false, reason: `token 端点返回 HTTP ${res.status}`, creds };
  const json = await res.json();
  return { ok: true, token: json.access_token, expiresIn: json.expires_in };
}

/** 按 URI 取实体（WHO 文档：URI 即端点；http→https 需手工改写，避免一次重定向） */
async function whoFetch(uri, token, lang) {
  const url = uri.replace(/^http:/, 'https:');
  const res = await fetch(url, { headers: { ...ICD_API_HEADERS, 'Accept-Language': lang || 'zh', Authorization: `Bearer ${token}` } });
  if (!res.ok) return { ok: false, status: res.status, url };
  return { ok: true, data: await res.json(), url };
}

// ── RFC4180 CSV 解析（definition 里有引号内逗号与换行，不能按逗号切）──

function parseCsv(text) {
  const rows = [];
  let field = [], cur = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { field.push(cur); cur = ''; }
    else if (c === '\n') { field.push(cur); rows.push(field); field = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur !== '' || field.length) { field.push(cur); rows.push(field); }
  return rows;
}

// ── 通道2 · 本地库 ────────────────────────────────────────────────────

function buildLocal(opts = {}) {
  const csvPath = opts.csvPath || CSV;
  const outDir = opts.outDir || DATADIR;
  const quiet = !!opts.quiet;
  const expectSha = opts.expectSha !== false;   // 测试用小 fixture 时可关（fixture 没有正式 sha）
  if (!fs.existsSync(csvPath)) throw new Error(`缺快照：${path.relative(ROOT, csvPath)}（先跑 --fetch）`);
  const buf = fs.readFileSync(csvPath);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  if (expectSha && sha !== SOURCE.sha256) {
    throw new Error(`快照 sha256 不符：期望 ${SOURCE.sha256.slice(0, 16)}…，实得 ${sha.slice(0, 16)}… —— 内容变过，不能当同一份库用`);
  }
  const rows = parseCsv(buf.toString('utf8'));
  const head = rows[0];
  const I = (k) => head.indexOf(k);
  const need = ['id', 'code', 'title', 'class_kind', 'parent'];
  for (const k of need) if (I(k) < 0) throw new Error(`快照缺列 ${k}`);

  const byId = new Map();
  const all = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[I('id')]) continue;
    const e = {
      id: r[I('id')],
      code: r[I('code')] || '',
      title: r[I('title')] || '',
      kind: r[I('class_kind')] || '',
      parent: r[I('parent')] || '',
    };
    all.push(e); byId.set(e.id, e);
  }

  // 父链还原章节（MMS 单父，可上溯到 class_kind=chapter）。带记忆化，一遍走完。
  const chapterMemo = new Map();
  const chapterOf = (e, depth = 0) => {
    if (!e || depth > 32) return null;
    if (e.kind === 'chapter') return e;
    if (chapterMemo.has(e.id)) return chapterMemo.get(e.id);
    const up = chapterOf(byId.get(e.parent), depth + 1);
    chapterMemo.set(e.id, up);
    return up;
  };
  for (const e of all) {
    const ch = chapterOf(e);
    e.chapterId = ch ? ch.id : '';
    e.chapterCode = ch ? ch.code : '';
    e.chapterTitle = ch ? ch.title : '';
  }

  const ndjsonPath = path.join(outDir, 'entities.ndjson');
  const metaPath = path.join(outDir, 'meta.json');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(ndjsonPath, all.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf8');
  const byKind = {};
  for (const e of all) byKind[e.kind] = (byKind[e.kind] || 0) + 1;
  const meta = {
    $generated: 'node scripts/icd11_client.js --build',
    source: SOURCE,
    entities: all.length,
    withCode: all.filter((e) => e.code).length,
    byKind,
    chapters: all.filter((e) => e.kind === 'chapter').length,
    // 与规格的差距必须显式：31,838 是 Foundation 组件的规模，本库是 MMS 线性化子集
    specEntities: 31838,
    specDelta: 31838 - all.length,
    specNote: '规格的 31,838 是 Foundation 组件（全域、无编码、多父）；本库是 MMS 线性化快照，二者不是同一份数据，不宣称等价。',
    storage: 'NDJSON + 内存索引（非 SQLite：零第三方依赖，且本机无 sqlite 可执行文件）。查询语义与规格一致，存储格式不同。',
  };
  fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  if (!quiet) {
    console.log(`  → ${path.relative(ROOT, ndjsonPath)}  (${all.length} 实体)`);
    console.log(`  → ${path.relative(ROOT, metaPath)}`);
    console.log(`     类型分布 ${JSON.stringify(byKind)}`);
    console.log(`     与规格规模差 ${meta.specDelta}（${all.length} vs 31,838）—— 不同源，见 meta.specNote`);
  }
  return meta;
}

async function fetchSnapshot() {
  fs.mkdirSync(DATADIR, { recursive: true });
  console.log(`  ← ${SOURCE.url}`);
  const res = await fetch(SOURCE.url);
  if (!res.ok) throw new Error(`下载失败 HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  if (sha !== SOURCE.sha256) {
    throw new Error(`下载内容的 sha256 与记录不符（${sha.slice(0, 16)}… ≠ ${SOURCE.sha256.slice(0, 16)}…）—— 上游改过内容，需人工确认后再更新 SOURCE.sha256`);
  }
  fs.writeFileSync(CSV, buf);
  console.log(`  → ${path.relative(ROOT, CSV)}  (${buf.length} 字节, sha256 ${sha.slice(0, 16)}… 校验通过)`);
}

function loadLocal(ndjsonPath = NDJSON) {
  if (!fs.existsSync(ndjsonPath)) return null;
  const byId = new Map(), byCode = new Map();
  for (const line of fs.readFileSync(ndjsonPath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const e = JSON.parse(line);
    byId.set(e.id, e);
    if (e.code && !byCode.has(e.code)) byCode.set(e.code, e);
  }
  return {
    byId, byCode,
    size: byId.size,
    /** 规格里的签名，逐字对应：SELECT id, code, title FROM entities WHERE id=? */
    code_by_id(foundationId) {
      const e = byId.get(String(foundationId));
      return e ? { id: e.id, code: e.code, title: e.title } : null;
    },
    byCode: (c) => byCode.get(String(c).trim()) || null,
    /** 父链（章节 → 块 → 类目），本地库的核心增值 */
    lineage(e) {
      const out = []; let x = e, d = 0;
      while (x && d++ < 32) { out.push(`${x.kind}${x.code ? ` · ${x.code}` : ''} · ${x.title}`); x = byId.get(x.parent); }
      return out;
    },
    search(q, limit = 10) {
      const s = String(q).toLowerCase();
      const hits = [];
      for (const e of byId.values()) {
        if (!e.title) continue;
        const t = e.title.toLowerCase();
        if (t.includes(s)) hits.push({ e, score: t.startsWith(s) ? 2 : 1 });
        if (hits.length > 400) break;
      }
      return hits.sort((a, b) => b.score - a.score || a.e.title.localeCompare(b.e.title)).slice(0, limit).map((h) => h.e);
    },
  };
}

function ensureLocal() {
  if (!fs.existsSync(CSV)) {
    throw new Error(`本地库未建：缺 ${path.relative(ROOT, CSV)}。先跑 node scripts/icd11_client.js --fetch`);
  }
  if (!fs.existsSync(NDJSON)) buildLocal({ quiet: true });
  return loadLocal();
}

// ── 校验本仓库 icd11_map 的编码 ──────────────────────────────────────

/** 从知识树 xlsx「图谱接口」表取出 DSU → ICD-11 编码（唯一事实来源，不手抄） */
function projectIcdCodes() {
  const { readWorkbook } = require('./lib_xlsx.js');
  const wb = readWorkbook(path.join(ROOT, 'standards/knowledge-tree/sources/中医知识树.xlsx'));
  const sheet = wb.sheets.find((s) => s.name === '图谱接口');
  const out = [];
  for (const r of (sheet && sheet.rows) || []) {
    const c = r.map((x) => String(x == null ? '' : x).trim()).filter((x) => x !== '');
    if (!/^DSU-\d+$/.test(c[0])) continue;
    const rest = r.map((x) => String(x == null ? '' : x).trim()).filter((x) => x !== '');
    const icd = rest.slice(1).find((x) => /^[A-Z0-9][A-Z0-9.]*$/.test(x) && x.length <= 8) || '';
    if (icd) out.push({ uid: c[0], icd });
  }
  return out;
}

function validate(db) {
  const codes = projectIcdCodes();
  const rows = codes.map(({ uid, icd }) => {
    const e = db.byCode(icd);
    return {
      uid, icd,
      resolved: !!e,
      officialTitle: e ? e.title : null,
      chapterCode: e ? e.chapterCode : null,
      chapterTitle: e ? e.chapterTitle : null,
      lineage: e ? db.lineage(e) : null,
    };
  });
  // 规格里 /semantic-search 的实测输出还提到 MC81，一并验（它不是本项目 icd11_map 的一部分）
  const specProbe = ['MC81'].map((icd) => ({ uid: '(规格实测输出)', icd, resolved: !!db.byCode(icd), officialTitle: db.byCode(icd) ? db.byCode(icd).title : null }));
  return { from: 'standards/knowledge-tree/sources/中医知识树.xlsx#图谱接口', checked: rows.length, resolved: rows.filter((r) => r.resolved).length, rows, specProbe };
}

// ── CLI ──────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const has = (f) => argv.includes(f);
  const val = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : null);

  if (has('--fetch')) {
    console.log('═══ 取 ICD-11 快照 ═══');
    await fetchSnapshot();
    return;
  }
  if (has('--build')) {
    console.log('═══ 构建本地库 ═══');
    buildLocal();
    return;
  }
  if (has('--ensure')) {
    if (!fs.existsSync(CSV)) { console.log('═══ 取快照 ═══'); await fetchSnapshot(); }
    if (!fs.existsSync(NDJSON)) { console.log('═══ 构建本地库 ═══'); buildLocal(); }
    console.log('  本地库就绪');
    return;
  }
  if (has('--who-check')) {
    console.log('═══ WHO API 通道探测 ═══');
    const c = credentials();
    console.log('  凭据键名（只报有无，不打印值）:', JSON.stringify(c.present));
    const t = await whoToken(c);
    if (!t.ok) {
      console.log(`  ✗ ${t.reason}`);
      console.log('    注册应用： https://icd.who.int/icdapi  → 「View API access key」');
      console.log('    拿到后设 ICD11_CLIENT_ID / ICD11_CLIENT_SECRET 两个环境变量再跑。');
    } else {
      console.log(`  ✓ 取得 access token（有效期 ${t.expiresIn}s）`);
      const r = await whoFetch('https://id.who.int/icd/release/11/2025-01/mms/CA00', t.token, 'zh');
      console.log(r.ok ? `  ✓ MMS/CA00 → ${JSON.stringify(r.data.title)}` : `  ✗ 取实体失败 HTTP ${r.status}`);
    }
    return;
  }

  const db = ensureLocal();

  if (has('--validate')) {
    console.log('═══ 校验本仓库 icd11_map 的编码（对 WHO 快照）═══');
    const v = validate(db);
    console.log(`  来源 ${v.from}`);
    console.log(`  解析成功 ${v.resolved}/${v.checked}\n`);
    for (const r of v.rows) {
      console.log(`  ${r.icd.padEnd(8)} ${r.resolved ? '✅' : '❌'} ${(r.officialTitle || '未在库中').slice(0, 44)}`);
      if (r.resolved) console.log(`           章节 ${r.chapterCode} · ${(r.chapterTitle || '').slice(0, 40)}`);
    }
    console.log('');
    for (const r of v.specProbe) console.log(`  ${r.icd.padEnd(8)} ${r.resolved ? '✅' : '❌'} ${(r.officialTitle || '未在库中').slice(0, 44)}   ← ${r.uid}`);
    return;
  }
  if (has('--id')) {
    const r = db.code_by_id(val('--id'));
    console.log(r ? JSON.stringify(r, null, 2) : `  ${val('--id')} 不在本地库中`);
    return;
  }
  if (has('--code')) {
    const e = db.byCode(val('--code'));
    if (!e) { console.log(`  ${val('--code')} 不在本地库中`); return; }
    console.log(`  ${e.code} · ${e.title}`);
    console.log(db.lineage(e).map((l, i) => `  ${'  '.repeat(i)}${l}`).join('\n'));
    return;
  }
  if (has('--search')) {
    for (const e of db.search(val('--search'))) console.log(`  ${(e.code || '-').padEnd(9)} ${e.title}`);
    return;
  }

  console.log('ICD-11 客户端（双通道）。本地库 ' + db.size + ' 实体。');
  console.log('用法: --fetch | --build | --ensure | --validate | --code X | --id X | --search X | --who-check');
}

if (require.main === module) main().catch((e) => { console.error(`\n✗ ${e.message}`); process.exit(1); });

module.exports = {
  ICD_API_HEADERS, WHO, SOURCE, DATADIR,
  parseCsv, buildLocal, loadLocal, ensureLocal,
  credentials, whoToken, whoFetch, projectIcdCodes, validate,
};
