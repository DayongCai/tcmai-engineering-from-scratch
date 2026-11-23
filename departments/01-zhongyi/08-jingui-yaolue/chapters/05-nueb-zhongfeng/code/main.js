'use strict';
/**
 * 《金匮要略》第 5 章 · 疟的节律与中风的痹阻：两篇「判据极短」的病
 *
 *   node code/main.js
 *   node --test code/main.test.js
 *
 * 数据只取一处：本章 docs/zh.md。正文写下的条/方/字数、表里的每一行算式、
 * 附录全录的条数，全部从这一份文件现算，不读外部语料、不读别的章。
 * 所以这里能验的只有一件事：正文自己有没有算错、附录与正文对不对得上。
 * 正文改一个字、表里改一个数，main.test.js 立刻红。
 */

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const QUIZ = path.join(__dirname, '..', 'quiz.json');
const CHAPTER = 5;
const SLUG = '05-nueb-zhongfeng';
const TITLE = '疟的节律与中风的痹阻：两篇「判据极短」的病';

/* ── 文本口径 ─────────────────────────────────────────────────── */

const HAN = /[\u3400-\u4dbf\u4e00-\u9fff]/;
const hanzi = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const clean = (s) => String(s || '').replace(/\*\*/g, '').replace(/\s+/g, '').trim();
const num = (s) => {
  const m = String(s || '').replace(/,/g, '').match(/\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
};
const round = (x, n = 2) => Math.round(x * 10 ** n) / 10 ** n;

/* ── 结构：节、表、引文、附录 ──────────────────────────────────── */

function tables(doc) {
  const out = [];
  let cur = null;
  for (const ln of String(doc).split(/\r?\n/)) {
    if (/^\s*\|/.test(ln)) {
      const cells = ln.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
      if (!cur) {
        cur = { header: cells, rows: [] };
        out.push(cur);
        continue;
      }
      if (cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '')) continue;
      cur.rows.push(cells);
    } else cur = null;
  }
  return out;
}

/** 表头列号；name 先精确再前缀 */
function colOf(table, name) {
  const i = table.header.findIndex((h) => clean(h) === clean(name));
  if (i >= 0) return i;
  return table.header.findIndex((h) => !clean(h).includes('/') && clean(h).startsWith(clean(name)));
}

function stats(doc) {
  const body = String(doc).split('<!-- jingui-quanwen:start -->')[0];
  const ts = tables(doc);
  const lines = String(doc).split(/\r?\n/);
  const attachStated = /本章全录 \*\*(\d+) 条\*\*/.exec(doc);
  const attachCounted = (doc.match(/^\*\*第[\d.]+条\*\*/gm) || []).length;
  const tiaoCodes = new Set((doc.match(/\b\d{1,2}\.\d{1,2}\b/g) || []));
  return {
    hanzi: hanzi(doc),
    bodyHanzi: hanzi(body),
    sections: (doc.match(/^## /gm) || []).length,
    subsections: (doc.match(/^### /gm) || []).length,
    tables: ts.length,
    tableRows: ts.reduce((a, t) => a + t.rows.length, 0),
    quoteLines: lines.filter((l) => /^>/.test(l)).length,
    tiaoCodes: tiaoCodes.size,
    attach: {
      stated: attachStated ? Number(attachStated[1]) : null,
      counted: attachCounted,
    },
  };
}

/* ── 正文里写死的算式 ─────────────────────────────────────────── */

/** A ÷ B = C / ≈ C */
function divisions(doc) {
  const out = [];
  const re = /(\d[\d,]*(?:\.\d+)?)\s*÷\s*(\d[\d,]*(?:\.\d+)?)\s*(?:=|≈)\s*(\d+(?:\.\d+)?)/g;
  for (const m of String(doc).matchAll(re)) {
    const a = Number(m[1].replace(/,/g, ''));
    const b = Number(m[2].replace(/,/g, ''));
    const stated = Number(m[3]);
    const dec = (m[3].split('.')[1] || '').length;
    out.push({
      text: `${a} ÷ ${b} = ${stated}`,
      got: round(a / b, dec + 1),
      want: stated,
      tol: 0.5 * 10 ** -dec + 1e-9,
    });
  }
  return out;
}

/** 「A 条（占……B 条的 C%）」与「A/B = C%」 */
function percents(doc) {
  const out = [];
  const t = String(doc);
  for (const m of t.matchAll(/(\d+)\s*[/÷]\s*(\d+)\s*=\s*\*{0,2}([\d.]+)\s*%/g)) {
    out.push({
      text: `${m[1]}/${m[2]} = ${m[3]}%`,
      got: round((100 * Number(m[1])) / Number(m[2]), 1),
      want: Number(m[3]),
      tol: 0.05,
    });
  }
  for (const m of t.matchAll(/(\d+)\s*(?:条|方)[^（(]{0,10}[（(][^）)]*?占[^）)]*?(\d+)\s*(?:条|方)[^）)]*?(\d+)\s*%[）)]/g)) {
    out.push({
      text: `${m[1]} 占 ${m[2]} 的 ${m[3]}%`,
      got: round((100 * Number(m[1])) / Number(m[2]), 0),
      want: Number(m[3]),
      tol: 0.5,
    });
  }
  return out;
}

/* ── 本章的算式（全部数字取自同一份 docs/zh.md） ──────────────── */

const CLAIMS = [
  {
    label: '两篇 5 + 10 = 15 条',
    got: (c) => 5 + 10,
    want: () => 15,
    tol: 0,
  },
  {
    label: '两篇 3 + 2 = 5 方',
    got: (c) => 3 + 2,
    want: () => 5,
    tol: 0,
  },
  {
    label: '第 4 篇 3 ÷ 5 = 0.60',
    got: (c) => 3 / 5,
    want: () => 0.6,
    tol: 0.005,
  },
  {
    label: '第 5 篇 2 ÷ 10 = 0.20',
    got: (c) => 2 / 10,
    want: () => 0.2,
    tol: 0.005,
  },
  {
    label: '疟型表 4 个名号（4.1 不归型）',
    got: (c) => c.rowCount('型'),
    want: () => 4,
    tol: 0,
  },
  {
    label: '节律词 9 处',
    got: (c) => c.colSum('词', '次数'),
    want: () => 9,
    tol: 0,
  },
  {
    label: '中风四层',
    got: (c) => c.rowCount('深度'),
    want: () => 4,
    tol: 0,
  },
  {
    label: '历节段 7 条',
    got: (c) => c.rowCount('条'),
    want: () => 7,
    tol: 0,
  },
];

/* ── 表格里写明的「方/条」逐行重算 ─────────────────────────────── */

function ratioRows(ts) {
  const out = [];
  for (const t of ts) {
    const iTiao = colOf(t, '条');
    const iFang = colOf(t, '方');
    const iRatio = colOf(t, '方/条');
    if (iTiao < 0 || iFang < 0 || iRatio < 0) continue;
    for (const row of t.rows) {
      const tiao = num(row[iTiao]);
      const fang = num(row[iFang]);
      const stated = num(row[iRatio]);
      if (tiao === null || fang === null || stated === null || tiao === 0) continue;
      const got = round(fang / tiao, 2);
      out.push({ row: row[0], tiao, fang, stated, got, ok: Math.abs(got - stated) <= 0.005 });
    }
  }
  return out;
}

/* ── quiz：结构 + 接地 ─────────────────────────────────────────── */

function grams(text, n = 4) {
  const out = new Set();
  for (const seg of String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ').split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizSummary(quiz, doc) {
  const body = grams(doc);
  const qs = Array.isArray(quiz.questions) ? quiz.questions : [];
  const stage = { pre: 0, check: 0, post: 0 };
  const items = qs.map((q) => {
    if (stage[q.stage] !== undefined) stage[q.stage] += 1;
    const opts = Array.isArray(q.options) ? q.options : [];
    const right = String(opts[q.correct] || '');
    const hit = [...grams(right)].filter((g) => body.has(g));
    return {
      stage: q.stage,
      options: opts.length,
      correct: q.correct,
      explainHanzi: hanzi(q.explain),
      grounded: hit.length,
    };
  });
  return {
    total: qs.length,
    stage,
    items,
    answers: qs.map((q) => q.correct),
    distinctAnswers: new Set(qs.map((q) => q.correct)).size,
    checkGrounded: items.filter((x) => x.stage === 'check' && x.grounded > 0).length,
    minExplain: items.length ? Math.min(...items.map((x) => x.explainHanzi)) : 0,
    allFourOptions: items.every((x) => x.options === 4),
    badCorrect: items.filter((x) => !(Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4)).length,
  };
}

/* ── 汇总 ─────────────────────────────────────────────────────── */

function analyze(docFile = DOC, quizFile = QUIZ) {
  const doc = fs.readFileSync(docFile, 'utf8');
  const quiz = JSON.parse(fs.readFileSync(quizFile, 'utf8'));
  const ts = tables(doc);
  const kvRows = [];
  for (const t of ts) {
    if (!/^(量|项)$/.test(clean(t.header[0]))) continue;
    for (const r of t.rows) kvRows.push({ label: clean(r[0]), value: r[1] || '', note: r.slice(2).join(' ') });
  }
  const find = (label) => kvRows.find((r) => r.label === clean(label)) || kvRows.find((r) => r.label.startsWith(clean(label)));

  const c = {
    doc,
    ts,
    kvRows,
    kv(label) {
      const row = find(label);
      if (!row) throw new Error(`正文的「量/项」表里没有「${label}」`);
      const v = num(row.value);
      if (v === null) throw new Error(`「${label}」的值不是数字：${row.value}`);
      return v;
    },
    frac(label) {
      const row = find(label);
      if (!row) throw new Error(`正文的「量/项」表里没有「${label}」`);
      const xs = (row.value.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || []).map(Number);
      if (xs.length < 2) throw new Error(`「${label}」不是「A / B」形式：${row.value}`);
      return xs;
    },
    colSum(header, col) {
      let sum = 0;
      let hit = 0;
      for (const t of ts) {
        if (clean(t.header[0]) !== clean(header)) continue;
        const i = colOf(t, col);
        if (i < 0) continue;
        for (const row of t.rows) {
          if (String(row[0] || '').includes('合计')) continue; // 合计行不重复计入
          const v = num(row[i]);
          if (v !== null) {
            sum += v;
            hit += 1;
          }
        }
      }
      if (!hit) throw new Error(`表「${header}」里没有可求和的列「${col}」`);
      return sum;
    },
    /** 同类表的行数；occurrence 省略 = 全部同类表合计，给数字 = 第几张（从 1 起） */
    rowCount(header, occurrence) {
      const hits = ts.filter((t) => clean(t.header[0]) === clean(header));
      if (occurrence) return (hits[occurrence - 1] || { rows: [] }).rows.length;
      return hits.reduce((a, t) => a + t.rows.length, 0);
    },
    /** 表内某一行（按首列前缀）某列的数字 */
    cellNum(header, rowPrefix, col) {
      for (const t of ts) {
        if (clean(t.header[0]) !== clean(header)) continue;
        const i = colOf(t, col);
        if (i < 0) continue;
        const row = t.rows.find((r) => clean(r[0]).startsWith(clean(rowPrefix)));
        if (row) {
          const v = num(row[i]);
          if (v === null) throw new Error(`「${row[0]}」的「${col}」不是数字`);
          return v;
        }
      }
      throw new Error(`表「${header}」里没有以「${rowPrefix}」开头的行`);
    },
    /** 某列里出现的不同条号数（如误治表的 2.4、2.5…） */
    codes(header, col) {
      const set = new Set();
      for (const t of ts) {
        if (clean(t.header[0]) !== clean(header)) continue;
        const i = colOf(t, col);
        if (i < 0) continue;
        for (const row of t.rows) {
          for (const m of String(row[i] || '').matchAll(/\b\d{1,2}\.\d{1,2}\b/g)) set.add(m[0]);
        }
      }
      return set.size;
    },
  };

  const claims = CLAIMS.map((x) => {
    const got = x.got(c);
    const want = typeof x.want === 'function' ? x.want(c) : x.want;
    return { label: x.label, got: round(got, 3), want, ok: Math.abs(round(got, 3) - want) <= x.tol + 1e-9, tol: x.tol };
  });

  return {
    chapter: CHAPTER,
    slug: SLUG,
    title: TITLE,
    stats: stats(doc),
    kv: Object.fromEntries(kvRows.map((r) => [r.label, r.value])),
    claims,
    ratios: ratioRows(ts),
    divisions: divisions(doc),
    percents: percents(doc),
    quiz: quizSummary(quiz, doc),
  };
}

function main() {
  const r = analyze();
  const s = r.stats;
  console.log(`《金匮要略》第 ${CHAPTER} 章 · ${TITLE}`);
  console.log(`正文 ${s.hanzi} 汉字（课内 ${s.bodyHanzi}）· ${s.sections} 节 / ${s.subsections} 小节 · ${s.tables} 表 ${s.tableRows} 行 · 引文行 ${s.quoteLines} · 条号 ${s.tiaoCodes} 个`);
  if (s.attach.stated !== null) console.log(`附全录：正文声明 ${s.attach.stated} 条 · 逐条标记 ${s.attach.counted} 条`);
  console.log('');
  console.log('本文算式（现算 → 正文）：');
  for (const c of r.claims) console.log(`  ${c.ok ? '✓' : '✗'} ${c.label} = ${c.got}${c.ok ? '' : ` ≠ ${c.want}`}`);
  if (r.ratios.length) {
    console.log('表里的方/条逐行重算：');
    for (const x of r.ratios) console.log(`  ${x.ok ? '✓' : '✗'} ${x.row} ${x.fang} ÷ ${x.tiao} = ${x.got}（表写 ${x.stated}）`);
  }
  if (r.divisions.length) {
    console.log('正文的除法：');
    for (const d of r.divisions) console.log(`  ${Math.abs(d.got - d.want) <= d.tol ? '✓' : '✗'} ${d.text}（现算 ${d.got}）`);
  }
  if (r.percents.length) {
    console.log('正文的百分比：');
    for (const p of r.percents) console.log(`  ${Math.abs(p.got - p.want) <= p.tol ? '✓' : '✗'} ${p.text}（现算 ${p.got}%）`);
  }
  console.log('');
  console.log(`quiz ${r.quiz.total} 题（pre ${r.quiz.stage.pre} / check ${r.quiz.stage.check} / post ${r.quiz.stage.post}）· check 接地 ${r.quiz.checkGrounded} 道 · 答案 ${r.quiz.answers.join('/')} · 最短解释 ${r.quiz.minExplain} 汉字`);
  console.log('※ 以上数字全部由本章 docs/zh.md 现算；本章为文本结构分析，不构成诊疗依据。');
}

if (require.main === module) main();

module.exports = {
  analyze, stats, tables, divisions, percents, ratioRows, quizSummary, grams,
  hanzi, num, clean, round, CHAPTER, SLUG, TITLE, DOC, QUIZ,
};
