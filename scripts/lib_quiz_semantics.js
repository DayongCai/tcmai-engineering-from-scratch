#!/usr/bin/env node
'use strict';
/**
 * scripts/lib_quiz_semantics.js —— quiz 的「解析 ↔ 正确项」语义一致性判据
 *
 * 为什么需要它：
 *   门只查结构（6 题、阶段序列、4 选项、correct∈0..3、解析 ≥10 字），不查语义。
 *   于是「correct 指到错项、解析却在讲另一个选项」这种错，结构全绿却整题作废。
 *   这个模块给出一条可机械执行、又不靠人读 126 题的判据。
 *
 * 判据（三条，按可靠性从高到低）：
 *   ① 解析若点名单元号（N.M.K），该号必须在本章 12 个单元里——点错章的点名直接作废。
 *   ② 解析若点名单元号，该单元标题的内容词必须与该题正确项有交集（讲的是同一件事）。
 *   ③ 解析与「正确项」的字面贴近度不得低于任一错误项：正确项应当是解析最近的那个选项。
 *      —— 这条是最弱的一条（解析解释「为什么别人错」时贴近错误项是合理的），
 *         所以只作「警」不作「红」，且把差距量化输出，便于人决定要不要改题。
 *
 * 字面贴近度用 CJK bigram 交集的加权（长词权重高）：不引第三方依赖、与仓库 FTS5 的
 * 写入侧 bigram 同一套直觉，避免「同义词匹配不上」的假阴性——这里要的正是字面证据。
 */

const STOP = new Set(['下列', '哪一', '哪项', '以下', '关于', '正确', '错误', '说法', '的是', '不是',
  '本节', '本章', '教材', '属于', '不属', '可以', '应当', '一个', '这一', '这个', '什么', '如何',
  '主要', '根本', '关键', '首要', '以及', '或者', '因为', '所以', '因此', '但是', '而且']);

const UNIT_ID = /\b(\d{1,2})\.(\d)\.(\d)\b/g;
// 引证分两类，由作者自己标：
//   依据   = 这一节的正文就是答案的来源（可核：正文应覆盖正确项的内容词）
//   口径见 = 这一节规定的是本题的口径或边界（如「不作判定」），不要求正文覆盖答案
//   前提   = 前置题（pre）问「进本章之前需要具备什么」，答案本来就不在任何一节的正文里
//   算见   = 答案由本仓脚本对底本/规则现算得出（字数、占比、条数、算法阈值），教材正文不含这个结论；
//            标的是「统计或规则所落在的那一节」，供人回查对象，不代表该节写着这个数
const CITE = /（(依据|口径见|前提|算见)教材·(?:疾病学基础·)?第(\d{1,2})章·(\d+\.\d+\.\d+)）/g;

function clean(s) {
  return String(s || '')
    .replace(/[「」『』“”"'’‘（）()《》〈〉【】\[\]{}]/g, ' ')
    .replace(/[，。、；：！？,.;:!?—–\-~·…]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** CJK / 拉丁词：中文按 2-gram，英文按整词 */
function grams(s) {
  const out = new Set();
  const t = clean(s);
  for (const seg of t.split(' ')) {
    if (!seg) continue;
    const cjk = seg.match(/[\u4e00-\u9fff]+/g) || [];
    for (const run of cjk) {
      if (run.length <= 2) { if (run.length === 2) out.add(run); continue; }
      for (let i = 0; i + 2 <= run.length; i++) out.add(run.slice(i, i + 2));
    }
    const lat = seg.match(/[A-Za-z][A-Za-z0-9\-]{2,}/g) || [];
    for (const w of lat) out.add(w.toLowerCase());
  }
  for (const s2 of STOP) out.delete(s2);
  return out;
}

/** 交集加权：共享 gram 数 + 长共享词（≥3 字）额外加权 */
function closeness(a, b) {
  const ga = grams(a); const gb = grams(b);
  let shared = 0;
  for (const g of ga) if (gb.has(g)) shared += 1;
  const ca = clean(a); const cb = clean(b);
  let longShared = 0;
  for (const w of new Set((cb.match(/[\u4e00-\u9fff]{3,6}/g) || [])))
    if (w.length >= 3 && ca.includes(w)) longShared += 1;
  return { shared, longShared, score: shared + 2 * longShared };
}

/**
 * 解析里点名的单元号。
 * 注意：必须在**未清洗**的原文上匹配——clean() 会把句点当标点抹掉，
 * 「5.9.9」被抹成「5 9 9」就再也认不出单元号了（探针一开始就是栽在这里）。
 */
function unitIdsIn(text) {
  const out = [];
  const t = String(text || '');
  for (const m of t.matchAll(UNIT_ID)) out.push(`${m[1]}.${m[2]}.${m[3]}`);
  return out;
}

/**
 * @param {{question:string, options:string[], correct:number, explanation:string}} q
 * @param {{sub:string, title:string}[]} chapterUnits
 * @returns {{badIds:string[], titleOverlap:number[], closest:number, gap:number, detail:object}}
 */
function citesIn(text) {
  const out = [];
  for (const m of String(text || '').matchAll(CITE)) out.push({ kind: m[1], chapter: Number(m[2]), sub: m[3] });
  return out;
}

/** 正确项的内容词有多大比例出现在该单元正文里——「依据」类引证的可核部分 */
function bodyCoverage(option, unit) {
  const g = grams(option);
  if (!g.size) return 0;
  const body = String((unit && unit.rawBody) || '');
  // 去标点后的正文：选项常是「青赤黄白黑」「风关/气关/命关」这类以顿号、斜线分隔的枚举，
  // 而教材原文写「青、赤、黄、白、黑」。只比原串会把这些真·依据判成 0 覆盖（假阴性）。
  const flat = body.replace(/[^一-鿿A-Za-z0-9]/g, '');
  let hit = 0;
  for (const x of g) if (body.includes(x) || flat.includes(x)) hit += 1;
  return hit / g.size;
}

function judge(q, chapterUnits) {
  const subs = new Set(chapterUnits.map((u) => u.sub));
  const badIds = unitIdsIn(q.explanation).filter((id) => !subs.has(id));

  // ② 解析点名的单元，其标题与该题正确项的交集
  const correctOpt = String((q.options || [])[q.correct] || '');
  const cited = unitIdsIn(q.explanation).filter((id) => subs.has(id));
  const titleOverlap = cited.map((id) => {
    const u = chapterUnits.find((x) => x.sub === id);
    const titleText = String(u.title || '').replace(/^\d+(\.\d+){2}\s*/, '');
    return closeness(titleText, correctOpt).score;
  });

  // ③ 正确项 vs 各错误项 谁离解析更近
  const scores = (q.options || []).map((o) => closeness(q.explanation, String(o)).score);
  const correctScore = scores[q.correct] ?? 0;
  const distractors = scores.filter((_, i) => i !== q.correct);
  const bestDistractor = distractors.length ? Math.max(...distractors) : 0;
  const closest = scores.indexOf(Math.max(...scores));
  const cites = citesIn(q.explanation).map((c) => {
    const u = chapterUnits.find((x) => x.sub === c.sub);
    return { ...c, exists: !!u, title: u ? String(u.title || '') : '', coverage: u ? bodyCoverage(correctOpt, u) : 0 };
  });
  return {
    cites,
    badIds,
    titleOverlap,
    correctScore,
    bestDistractor,
    closest,
    gap: correctScore - bestDistractor,
    detail: { scores, cited },
  };
}

/**
 * 一套题的体检：把「红」（可机械判定、必然错）与「警」（需要人看）分开。
 * 分开的理由：语义判据只有一部分能做到零假阳性。硬判据要真能拦错题，
 * 软判据要能把 126 题里该人看的那几道列出来——混成一条会让门要么太松要么总报红。
 */
function auditQuiz(qs, chapterUnits) {
  const errors = [];
  const warns = [];
  const citedAny = { count: 0, total: qs.length };
  qs.forEach((q, i) => {
    const tag = `quiz#${i + 1}`;
    const r = judge(q, chapterUnits);

    // 红①：解析点名的单元号必须在本书本章
    if (r.badIds.length) errors.push(`${tag} 解析点名了本章不存在的单元号：${r.badIds.join('、')}`);

    // 硬②：「依据」类引证，正文必须真的覆盖正确答案的内容词（低于 0.15 视为挂错节）
    for (const c of r.cites) {
      if (!c.exists) { errors.push(`${tag} 引证 ${c.sub} 不在本章单元表里`); continue; }
      if (c.kind === '依据' && c.coverage < 0.15) {
        errors.push(`${tag} 标了「依据 ${c.sub} ${c.title.replace(/^\d+(\.\d+){2}\s*/, '')}」，但该节正文只覆盖答案内容词的 ${(c.coverage * 100).toFixed(0)}%，疑似挂错节`);
      }
    }
    // 警②：老式引证（未标类型）仍按标题主题度提示
    // 为什么是警不是红：本章有一类「入门准备 / 口径」题，答案讲的是认识方式而不是某一节内容，
    // 与任何单元标题都不重合。把它判红会逼作者为凑判据硬挂一个不相干的单元号。
    if (r.detail.cited.length) {
      citedAny.count += 1;
      const zero = r.detail.cited.filter((id, k) => r.titleOverlap[k] === 0);
      if (zero.length) {
        const titles = zero.map((id) => {
          const u = chapterUnits.find((x) => x.sub === id);
          return `${id} ${String(u.title || '').replace(/^\d+(\.\d+){2}\s*/, '')}`;
        });
        warns.push(`${tag} 解析引的是「${titles.join('；')}」，与正确项「${String(q.options[q.correct]).slice(0, 24)}…」看不出同一主题，请人工确认`);
      }
    }

    // 红③：选项文本完全相同（抄选项漏改）——只认「规范化后完全一致」，
    // 不认字面相似：本例里「渗出物→坏死→肉芽→瘢痕」与倒序项共享全部词，
    // 但顺序本身就是考点，相似度高恰恰说明题目设计对，不能判重。
    const norm = (x) => String(x).replace(/[\s，。、；：！？,.;:!?—–\-~·…（）()「」《》]/g, '');
    for (let a = 0; a < q.options.length; a++) {
      for (let b = a + 1; b < q.options.length; b++) {
        if (norm(q.options[a]) === norm(q.options[b])) {
          errors.push(`${tag} 选项 ${a + 1} 与 ${b + 1} 文本完全相同，请改写干扰项`);
        } else if (closeness(String(q.options[a]), String(q.options[b])).shared >= 8) {
          // 同词不同序：可能是顺序题的正确设计，也可能是「改了一半」
          warns.push(`${tag} 选项 ${a + 1} 与 ${b + 1} 用词几乎相同（可能是有意的顺序题，请确认）`);
        }
      }
    }

    // 警④：正确项不是与解析最接近的选项
    if (r.closest !== q.correct) {
      warns.push(`${tag} 解析更贴近选项 ${r.closest + 1}（gap ${r.gap}），正确项是 ${q.correct + 1}`);
    }
  });
  if (citedAny.count === 0) {
    warns.push(`全卷 ${qs.length} 道解析都没有点名单元号：语义门① ② 处于空转，建议逐题补「教材·第N章·N.M.K」`);
  }
  return { errors, warns, cited: citedAny };
}

module.exports = { judge, auditQuiz, closeness, grams, unitIdsIn, clean };
