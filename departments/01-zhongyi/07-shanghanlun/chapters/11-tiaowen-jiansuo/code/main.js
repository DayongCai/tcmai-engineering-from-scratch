'use strict';
/**
 * 伤寒条文 BM25 检索 + 弃答阈值标定
 *
 *   node code/main.js
 *
 * 口径：
 *   · 分词 = 单字 + 相邻双字（中文无空格；双字能抓住「脉浮」「恶寒」这类固定搭配）
 *   · 归一：𤍠→热（底本异体），只作用于索引与查询，不回写原文
 *   · 基线 = 子串 AND（所有查询词都出现在同条）；它精确但只能处理「词原样出现」
 *   · 评测：5 条有答案 + 2 条无答案（乌梅丸、少阴提纲在底本里不存在）
 *     → 有答案看命中排名（MRR），无答案看是否弃答（弃答率）
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));

const norm = (s) => s.split('𤍠').join('热');
const DOCS = [];
for (const p of BOOK.pian) for (const it of p.items) {
  DOCS.push({ id: `${p.no}:${it.no}`, pian: p.no, no: it.no, text: it.text, norm: norm(it.text) });
}

/** 单字 + 双字 */
function tokenize(text) {
  const t = norm(text).replace(/\s+/g, '');
  const out = [];
  for (let i = 0; i < t.length; i += 1) {
    out.push(t[i]);
    if (i + 1 < t.length) out.push(t.slice(i, i + 2));
  }
  return out;
}

function buildIndex() {
  const df = new Map();
  const tf = [];
  let total = 0;
  for (const d of DOCS) {
    const toks = tokenize(d.norm);
    const m = new Map();
    for (const tk of toks) m.set(tk, (m.get(tk) || 0) + 1);
    tf.push(m);
    total += toks.length;
    for (const k of m.keys()) df.set(k, (df.get(k) || 0) + 1);
  }
  return { df, tf, avgdl: total / DOCS.length, N: DOCS.length };
}

const IDX = buildIndex();

function bm25(query, { k1 = 1.5, b = 0.75 } = {}) {
  const q = [...new Set(tokenize(query))];
  const scores = DOCS.map((d, i) => {
    const m = IDX.tf[i];
    const dl = [...m.values()].reduce((a, x) => a + x, 0);
    let s = 0;
    for (const tk of q) {
      const f = m.get(tk) || 0;
      if (!f) continue;
      const df = IDX.df.get(tk) || 0;
      const idf = Math.log(1 + (IDX.N - df + 0.5) / (df + 0.5));
      s += idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + b * (dl / IDX.avgdl))));
    }
    return { id: d.id, pian: d.pian, no: d.no, score: Number(s.toFixed(3)), text: d.text };
  });
  return scores.sort((a, b2) => b2.score - a.score);
}

/** 基线：子串 AND（所有查询词都在同条） */
function substringAnd(query) {
  const terms = query.split(/\s+/).filter(Boolean).map(norm);
  const hits = DOCS.filter((d) => terms.every((t) => d.norm.includes(t)));
  return hits.map((d) => ({ id: d.id, pian: d.pian, no: d.no, score: hits.length, text: d.text }));
}

const QUERIES = [
  { q: '太阳 脉浮 头项强痛 恶寒', gold: '4:1', note: '太阳提纲' },
  { q: '胃家实', gold: '9:2', note: '阳明提纲' },
  { q: '但见一证 不必悉具', gold: '5:222', note: '柴胡证一证即可' },
  { q: '心中疼热 气上撞心 消渴', gold: '24:1', note: '厥阴提纲' },
  { q: '下利 厥 恶寒 四逆汤', gold: null, note: '（无单一金标，用于观察排名）' },
  { q: '乌梅丸 吐蛔', gold: null, note: '底本无乌梅丸 → 应弃答' },
  { q: '少阴之为病 但欲寐', gold: null, note: '底本缺少阴篇 → 应弃答' },
];

function rankOf(list, gold) {
  const i = list.findIndex((x) => x.id === gold);
  return i < 0 ? null : i + 1;
}

function main() {
  console.log(`索引：${IDX.N} 条 · 平均长度 ${IDX.avgdl.toFixed(1)} token · 词表 ${IDX.df.size}\n`);
  let mrr = 0, n = 0;
  const rows = [];
  for (const item of QUERIES) {
    const b = bm25(item.q);
    const s = substringAnd(item.q);
    const rb = item.gold ? rankOf(b, item.gold) : null;
    const rs = item.gold ? rankOf(s, item.gold) : null;
    if (item.gold) { n += 1; if (rb) mrr += 1 / rb; }
    rows.push({ ...item, top: b[0], topScore: b[0].score, subCount: s.length, rb, rs });
    console.log(`Q：${item.q}`);
    console.log(`  BM25 第一：${b[0].id}（${b[0].score}）${item.gold ? (rb ? `｜金标第 ${rb} 位` : '｜金标未进前 100') : ''}`);
    console.log(`  子串AND：命中 ${s.length} 条${item.gold && rs ? `｜金标第 ${rs} 位` : ''}`);
    console.log(`  ${b[0].text.slice(0, 50)}…\n`);
  }
  console.log(`MRR@全序（有金标 ${n} 条）：${(mrr / n).toFixed(3)}`);

  // 弃答阈值：无答案两问的最高分 vs 有答案最低分
  const noAns = rows.filter((r) => !r.gold).map((r) => r.topScore);
  const hasAns = rows.filter((r) => r.gold && r.rb).map((r) => r.topScore);
  console.log(`\n阈值标定：无答案最高分 ${Math.max(...noAns)}；有答案最低分 ${Math.min(...hasAns)}`);
  const sep = Math.min(...hasAns) > Math.max(...noAns);
  console.log(sep
    ? `可分：阈值取 ${((Math.min(...hasAns) + Math.max(...noAns)) / 2).toFixed(2)} → 有答案全答、无答案全弃`
    : '不可分：两个分布重叠 —— BM25 单靠绝对分无法保证「查不到就说查不到」');
  // 通假演示：教材「默默不欲饮食」在底本写作「嘿嘿」
  const rawHit = DOCS.filter((d) => d.text.includes('默默不欲饮食')).length;
  const normHit = DOCS.filter((d) => d.text.split('嘿嘿').join('默默').includes('默默不欲饮食')).length;
  console.log(`\n通假演示：查询「默默不欲饮食」→ 原文未归一命中 ${rawHit} 条；嘿→默归一后 ${normHit} 条`);
  console.log('  底本「默默」0 条、「嘿嘿」3 条（5:209 / 5:214 / 18:126）：不归一，检索必然空手。');

  console.log('\n口径：本输出为检索评测，不构成文献结论。');
}

if (require.main === module) main();
module.exports = { tokenize, bm25, substringAnd, QUERIES, DOCS, IDX };
