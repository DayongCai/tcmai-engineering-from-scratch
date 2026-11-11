#!/usr/bin/env node
/**
 * scripts/lib_fts5.js —— 真 · SQLite FTS5（规格组件 ④ 的第一次真实实现）
 *
 * ── 为什么现在才做 ────────────────────────────────────────────
 * `standards/semtensor/embeddings/README.md` 原来写着「本机没有 SQLite，所以 ④ 用
 * 进程内 BM25 做等价物」。那句话当时是真的，**现在是假的**：
 * Node 22 起自带 `node:sqlite`，且其捆绑的 SQLite 已编入 FTS5。实测：
 *
 *     node -e "new (require('node:sqlite').DatabaseSync)(':memory:').exec(
 *       'CREATE VIRTUAL TABLE t USING fts5(a)')"
 *
 * 于是「零第三方依赖」与「用真 FTS5」不再互斥 —— 依赖没加任何一个，
 * 用的是运行时自带的模块。**这条偏离被撤销，不是被封存。**
 *
 * ── 中文怎么办（这是本文件唯一的真问题）────────────────────────
 * FTS5 自带的分词器没有一个能直接用中文，实测（本机 node v22.22.0）：
 *
 *   tokenizer=unicode61   「心脾两虚」→ 0 命中（整个 CJK 串被当成**一个** token：
 *                          文档里的 token 是「心脾两虚证」，查询词对不上）
 *                         「失眠」→ 命中（正好是空格隔开的完整 token）
 *   tokenizer=trigram     「心脾两虚」→ 命中（子串匹配，≥3 字）
 *                         「失眠」→ 0 命中（trigram 要求查询 ≥3 字符）
 *
 * 两个都残。所以这里**不在 SQLite 侧分词，在写入侧分词**：
 *   · `terms` 表：写入前用 ② 的字符 bigram 分词（CJK 取 bigram、拉丁取整词），
 *     以空格连接后交给 unicode61 —— 于是「心脾两虚证」变成 心脾/脾两/两虚/虚证 四个 token，
 *     查询串走同一个分词器，命中是必然的。
 *   · `substr` 表：原文整段交给 trigram，负责**子串**检索（≥3 字符），
 *     补上「查一半的 ICD-11 标题」这类词袋做不到的检索。
 *
 * 两张表在同一个 db 文件里，检索时两路各自出分、由 RRF（⑤）融合。
 * **分词口径与向量通道的 ② 是同一个函数** —— 三通道共用一套词，不是三套。
 *
 * ── 打分口径 ──────────────────────────────────────────────
 * 分数来自 SQLite 的 `bm25()` 内建函数（不是我们算的近似），
 * 其返回值 SQLite 定义为**越小越相关**（负值）。本文件对外统一翻成正的
 * `score = -bm25`，调用方一律「越大越好」，不在这里留符号陷阱。
 *
 * 用法：
 *   const { Fts5Index } = require('./lib_fts5.js');
 *   const ix = new Fts5Index('/path/ix.db');
 *   ix.addMany([{ id: 'a', text: '…' }, …]);
 *   ix.finish();
 *   ix.search('失眠 健忘', { k: 5 })        // → [{ id, score, channel }]
 *   ix.stats()                              // → { sqlite, fts5:true, … }
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// ── node:sqlite 仍在实验标记下：只在**本模块**里把这条警告吞掉 ──
// 每次建库都刷一行 "SQLite is an experimental feature" 会淹没报告（一次构建建两个库、
// 测试再建两个）。只过滤这一条，其余 warning 照旧打。
let warned = false;
function silenceSqliteExperimentalWarning() {
  if (warned) return;
  warned = true;
  const keep = process.listeners('warning');
  process.removeAllListeners('warning');
  process.on('warning', (w) => {
    if (w && w.name === 'ExperimentalWarning' && /SQLite/i.test(w.message || '')) return;
    for (const fn of keep) { try { fn(w); } catch { /* 别人的 handler 自己负责 */ } }
    if (!keep.length) console.warn(`${w.name}: ${w.message}`);
  });
}

function loadSqlite() {
  silenceSqliteExperimentalWarning();
  let mod;
  try {
    mod = require('node:sqlite');
  } catch (e) {
    throw new Error(
      `node:sqlite 不可用（需要 Node ≥ 22.5）：${e.message}\n`
      + '  本层不做静默降级 —— 拿不到真 FTS5 就报错，而不是悄悄换成进程内 BM25。',
    );
  }
  if (typeof mod.DatabaseSync !== 'function') {
    throw new Error('node:sqlite 存在但没有 DatabaseSync —— 版本过旧，需要 Node ≥ 22.5');
  }
  return mod.DatabaseSync;
}

// ── 分词：与 build_embeddings.js 的 ② 同口径 ───────────────────
// 这里独立实现一份而**不复用** build_embeddings 的 tokenizeBigram，
// 是为了让本文件不依赖上层（上层 require 本文件）。两份由测试钉死等价。

const CJK = /[\u3400-\u9fff]+/g;
const LATIN = /[A-Za-z0-9][A-Za-z0-9.\-_/]*/g;

/** CJK 取字符 bigram（单字段保留自身），拉丁取小写整词 —— 规格 ② 原文口径 */
function segment(text) {
  const toks = [];
  const s = String(text == null ? '' : text);
  for (const seg of s.match(CJK) || []) {
    if (seg.length > 1) for (let i = 0; i < seg.length - 1; i++) toks.push(seg.slice(i, i + 2));
    else toks.push(seg);
  }
  for (const w of s.match(LATIN) || []) toks.push(w.toLowerCase());
  return toks;
}

/** FTS5 查询串转义：每个 token 单独加双引号，避免 AND/OR/NEAR/* 被当成语法 */
function quoteTerm(t) {
  return `"${String(t).replace(/"/g, '""')}"`;
}

/** 把 token 列表拼成 `"a" OR "b"` —— 词袋检索（精度交给 BM25） */
function orExpression(tokens) {
  return tokens.map(quoteTerm).join(' OR ');
}

// ───────────────────────── 索引 ─────────────────────────

class Fts5Index {
  /**
   * @param {string} dbPath  ':memory:' 或文件路径（文件已存在会被**覆盖** —— 这是构建产物）
   * @param {{ keep?: boolean }} [opts] keep=true 时不删除既有文件
   */
  constructor(dbPath, opts = {}) {
    const DatabaseSync = loadSqlite();
    this.path = dbPath;
    this.closed = false;
    if (dbPath === ':memory:') {
      this.db = new DatabaseSync(':memory:');
    } else {
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
      if (!opts.keep && fs.existsSync(dbPath)) fs.rmSync(dbPath);
      this.db = new DatabaseSync(dbPath);
    }
    // 产物不需要 WAL 的 -wal/-shm 伴生文件；MEMORY 更干净且更快
    this.db.exec('PRAGMA journal_mode = MEMORY');
    this.db.exec('PRAGMA synchronous = OFF');
    // 表名不能叫 `terms`：FTS5 自己在库里建的同名内部对象会撞名，
    // 报错是「vtable constructor failed: terms」（实测），且错得毫无提示性。
    this.db.exec(`CREATE VIRTUAL TABLE docs_terms USING fts5(
      doc_id UNINDEXED,
      terms,
      tokenize = 'unicode61 remove_diacritics 2'
    )`);
    this.db.exec(`CREATE VIRTUAL TABLE docs_substr USING fts5(
      doc_id UNINDEXED,
      body,
      tokenize = 'trigram'
    )`);
    this.insTerms = this.db.prepare('INSERT INTO docs_terms (doc_id, terms) VALUES (?, ?)');
    this.insSubstr = this.db.prepare('INSERT INTO docs_substr (doc_id, body) VALUES (?, ?)');
    this.count = 0;
  }

  /**
   * 写入一条。
   *   · `text` 同时喂给两张表（分词后进 docs_terms，原文进 docs_substr）
   *   · `body` 可选：只给 docs_substr 用。trigram 索引是原文的 3–5 倍大，
   *     长文档（如整段 prompt）只放短摘要进去，能把库压下来而不丢子串检索能力。
   */
  add(doc) {
    const id = String(doc.id);
    const text = String(doc.text == null ? '' : doc.text);
    const body = String(doc.body == null ? text : doc.body);
    this.insTerms.run(id, segment(text).join(' '));
    this.insSubstr.run(id, body);
    this.count += 1;
  }

  addMany(docs) {
    this.db.exec('BEGIN');
    try {
      for (const d of docs) this.add(d);
      this.db.exec('COMMIT');
    } catch (e) {
      this.db.exec('ROLLBACK');
      throw e;
    }
    return this;
  }

  /** 收尾：建索引、压库（写入结束必须调一次，否则查询会慢且库偏大） */
  finish() {
    this.db.exec("INSERT INTO docs_terms(docs_terms) VALUES('optimize')");
    this.db.exec("INSERT INTO docs_substr(docs_substr) VALUES('optimize')");
    this.db.exec('VACUUM');
    return this;
  }

  /**
   * 词袋检索（docs_terms 表，BM25）。
   * @param {string|string[]} query 文本或已分词 token 列表
   * @param {{ k?: number }} [opts]
   * @returns {{ id: string, score: number, channel: 'fts' }[]}  score = -bm25（越大越相关）
   */
  search(query, opts = {}) {
    const k = opts.k || 5;
    const tokens = Array.isArray(query) ? query.filter(Boolean) : segment(query);
    const uniq = [...new Set(tokens)];
    if (!uniq.length) return [];
    const sql = 'SELECT doc_id AS id, bm25(docs_terms) AS s FROM docs_terms WHERE docs_terms MATCH ? ORDER BY s ASC, rowid ASC LIMIT ?';
    return this.db.prepare(sql).all(orExpression(uniq), k)
      .map((r) => ({ id: String(r.id), score: -Number(r.s), channel: 'fts' }));
  }

  /**
   * 子串检索（docs_substr 表，trigram）。用于「只记得标题一半」的情况；
   * 查询短于 3 字符时 trigram 无法匹配 —— 返回空数组并**如实说明原因**。
   * @returns {{ id: string, score: number, channel: 'substr' }[]}
   */
  searchSubstring(text, opts = {}) {
    const k = opts.k || 5;
    const q = String(text == null ? '' : text).trim();
    if (q.length < 3) return [];
    const sql = 'SELECT doc_id AS id, bm25(docs_substr) AS s FROM docs_substr WHERE docs_substr MATCH ? ORDER BY s ASC, rowid ASC LIMIT ?';
    return this.db.prepare(sql).all(quoteTerm(q), k)
      .map((r) => ({ id: String(r.id), score: -Number(r.s), channel: 'substr' }));
  }

  /** 诊断信息：告诉调用方「这确实是 FTS5」，而不是我们又写了一个 BM25 */
  stats() {
    const q = (sql) => { try { return this.db.prepare(sql).all(); } catch { return []; } };
    const ver = q('SELECT sqlite_version() AS v')[0];
    const tables = q("SELECT name, sql FROM sqlite_master WHERE type='table' AND name IN ('docs_terms','docs_substr')");
    return {
      engine: 'sqlite',
      sqliteVersion: ver ? ver.v : null,
      fts5: tables.length === 2,
      virtualTables: tables.map((t) => ({ name: t.name, module: (/USING\s+(\w+)/i.exec(t.sql || '') || [])[1] || null })),
      docCount: this.count,
      tokenizers: { terms: 'unicode61（写入侧 bigram 分词）', substr: 'trigram（子串）' },
      fileBytes: this.path === ':memory:' ? null : safeSize(this.path),
    };
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    try { this.db.close(); } catch { /* 已关 */ }
  }
}

function safeSize(p) {
  try { return fs.statSync(p).size; } catch { return null; }
}

/** 只读打开既有索引（查询用；不重建表） */
function openReadOnly(dbPath) {
  const DatabaseSync = loadSqlite();
  const db = new DatabaseSync(dbPath);
  return db;
}

module.exports = {
  Fts5Index,
  segment,
  orExpression,
  quoteTerm,
  loadSqlite,
  openReadOnly,
};
