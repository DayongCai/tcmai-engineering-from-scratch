#!/usr/bin/env node
/**
 * 中医诊断学 · 第 12 章 诊断推理的误差来源：四条来源，零个概率
 * 课程: departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/12-zhenduan-wucha/docs/zh.md
 * 出处: 教材·第13章（1,307 字）+ 教材·第14章·14.3（462 字）
 * 依赖: 仅 Node.js 标准库
 *
 * 本章把教材里散落在四处的「误差来源」归成四条，并逐一钉到节号：
 *   ① 四诊不全（13.1.1.2 / 13.3.2.2）—— 第1章数字：闻诊 855 字 = 3.8%
 *   ② 假象（2.1.1.2 假神；6.2.2 真寒假热/真热假寒；6.3.2 真实假虚/真虚假实）
 *   ③ 脉症从舍（5.1.4.1）
 *   ④ AI 误判与双轨复核（14.3.2）
 * 并且验证一个反向事实：全书没有任何误差率/一致性数值。
 * 不做诊断判读，不给概率。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards', 'zhenduan', '底本.json'), 'utf8'));

const chapter = (no) => BOOK.chapters.find((c) => c.no === no);

const SUPP = path.join(ROOT, 'standards', 'zhenduan', 'supplements', '补源.json');

/** 读补源层：教材缺什么、外源补在哪。返回该章对应的那一处缺口。 */
function supplements(id) {
  const d = JSON.parse(fs.readFileSync(SUPP, 'utf8'));
  const g = d.gaps.find((x) => x.id === id);
  if (!g) throw new Error('补源层里没有 ' + id);
  return g;
}
const charsOf = (c) => (c.paras || []).join('').length
  + c.secs.reduce((n, s) => n + (s.paras || []).join('').length
    + s.subs.reduce((m, x) => m + x.paras.join('').length, 0), 0);
const secChars = (c, no) => {
  const s = c.secs.find((x) => x.no === no);
  return (s.paras || []).join('').length + s.subs.reduce((n, x) => n + x.paras.join('').length, 0);
};
const sub = (ref) => {
  for (const c of BOOK.chapters) {
    for (const s of c.secs) {
      if (s.no === ref) return { chapter: c.no, node: s, paras: s.paras, level: 'sec' };
      for (const x of s.subs) {
        if (x.no === ref) return { chapter: c.no, node: x, paras: x.paras, level: 'sub' };
        for (const it of x.items || []) {
          // 四段编号（如 5.1.4.1）只有标题，段落挂在父小节上
          if (it.no === ref) return { chapter: c.no, node: it, paras: x.paras, level: 'item', parent: x.no };
        }
      }
    }
  }
  return null;
};

// ── 一、两处正文的规模 ────────────────────────────────────────────
function chapterShape() {
  const c13 = chapter('13');
  const c14 = chapter('14');
  const a = charsOf(c13);
  const b = secChars(c14, '14.3');
  return {
    c13: { no: '13', title: c13.title, secs: c13.secs.length, chars: a },
    c143: { no: '14.3', title: '多维评价与批判性思维', chars: b, secs: 2 },
    total: a + b,
    share: (a + b) / BOOK.counts.chars,
    shareOf14: b / charsOf(c14),
  };
}

// ── 二、① 四诊不全：四诊篇幅分配 ─────────────────────────────────
function fourDiagnosis() {
  const want = [['2', '望诊'], ['3', '闻诊'], ['4', '问诊'], ['5', '切诊']];
  const rows = want.map(([no, name]) => {
    const c = chapter(no);
    const ch = charsOf(c);
    return { no, name, chars: ch, share: ch / BOOK.counts.chars };
  });
  const total = rows.reduce((n, r) => n + r.chars, 0);
  const thin = rows.reduce((a, b) => (b.chars < a.chars ? b : a));
  return {
    rows,
    total,
    share: total / BOOK.counts.chars,
    shareOfFour: rows.map((r) => ({ name: r.name, share: r.chars / total })),
    thinnest: thin.name,
    thinnestChars: thin.chars,
    thinnestShare: thin.chars / BOOK.counts.chars,
    ratioToThickest: thin.chars / rows.reduce((a, b) => (b.chars > a.chars ? b : a)).chars,
  };
}

// ── 三、② 假象：五个名称，逐个定位 ────────────────────────────────
const FAKE_NAMES = ['假神', '真寒假热', '真热假寒', '真实假虚', '真虚假实'];

function fakeSigns() {
  // 按文档顺序收集每一处出现：章 → 节/小节 → 段，另记段标题（items）
  const hits = new Map(FAKE_NAMES.map((n) => [n, []]));
  for (const c of BOOK.chapters) {
    for (const p of c.paras || []) for (const n of FAKE_NAMES) if (p.includes(n)) hits.get(n).push({ ref: '章首', chapter: c.no, kind: 'para' });
    for (const s of c.secs) {
      for (const p of s.paras || []) for (const n of FAKE_NAMES) if (p.includes(n)) hits.get(n).push({ ref: s.no, chapter: c.no, kind: 'para' });
      for (const x of s.subs) {
        for (const p of x.paras) for (const n of FAKE_NAMES) if (p.includes(n)) hits.get(n).push({ ref: x.no, chapter: c.no, kind: 'para' });
        for (const it of x.items || []) {
          for (const n of FAKE_NAMES) if (it.title.includes(n)) hits.get(n).push({ ref: it.no, chapter: c.no, kind: 'item' });
        }
      }
    }
  }
  return FAKE_NAMES.map((name) => {
    const all = hits.get(name);
    return {
      name,
      count: all.length,
      refs: all.map((h) => h.ref),
      chapters: [...new Set(all.map((h) => h.chapter))],
      definedAt: all.filter((h) => h.kind === 'item' && h.chapter !== '14').map((h) => h.ref),
      inAi: [...new Set(all.filter((h) => h.chapter === '14').map((h) => h.ref))],
    };
  });
}

// ── 四、③ 脉症从舍 ────────────────────────────────────────────────
function pulseTradeoff() {
  const s = sub('5.1.4.1');
  // 段落挂在父小节 5.1.4 上，按内容挑出讲「脉症从舍」的那一段
  const text = s.paras.find((p) => p.includes('脉症从舍')) || '';
  return {
    ref: '5.1.4.1',
    chapter: s.chapter,
    level: s.level,
    chars: text.length,
    hasShun: text.includes('脉症相应为顺'),
    hasNi: text.includes('脉症不相应为逆'),
    hasSheMai: text.includes('舍脉从症'),
    hasSheZheng: text.includes('舍症从脉'),
    // 教材给两条判据、各一个例子，没有给「谁优先」的规则
    rules: (text.match(/舍[脉症]从[症脉]/g) || []),
    text,
  };
}

// ── 五、④ AI 误判与双轨复核 ───────────────────────────────────────
function aiTraps() {
  const s = sub('14.3.2');
  const p1 = s.paras[0];
  const p2 = s.paras[1];
  return {
    ref: '14.3.2',
    chars: s.paras.join('').length,
    cases: [
      { name: '真寒假热', pattern: '按面赤、烦躁判热证', ignore: '舌淡脉微' },
      { name: '真实假虚', pattern: '按倦怠、脉细判虚证', ignore: '苔黄腹满' },
      { name: '血瘀兼证遗漏', pattern: '只判血瘀证', ignore: '气虚血瘀/气滞血瘀兼夹' },
    ].filter((c) => p1.includes(c.name.split('兼')[0])),
    hasDualTrack: /辅助决策\+人工复核/.test(p2),
    truncated: !/[。；]$/.test(p2),
    tail: p2.slice(-6),
    paraLens: [p1.length, p2.length],
  };
}

// ── 六、误差率扫描：教材给没给数 ──────────────────────────────────
const RATE_TERMS = ['准确率', '一致率', '符合率', '正确率', '敏感度', '特异度', '误诊率', '漏诊率', 'Kappa'];

function quantification() {
  const percent = [];
  const terms = [];
  for (const c of BOOK.chapters) {
    const scan = (text, ref) => {
      for (const m of text.matchAll(/\d+(?:\.\d+)?\s*%/g)) percent.push({ ref, token: m[0] });
      for (const t of RATE_TERMS) if (text.includes(t)) terms.push({ term: t, ref, chapter: c.no });
    };
    for (const p of c.paras || []) scan(p, '章首');
    for (const s of c.secs) {
      for (const p of s.paras || []) scan(p, s.no);
      for (const x of s.subs) {
        for (const p of x.paras) scan(p, x.no);
        for (const it of x.items || []) scan(it.title, it.no);
      }
    }
  }
  return {
    percentTokens: percent,
    numericRates: percent.length,
    terms,
    termNames: [...new Set(terms.map((t) => t.term))],
    hasErrorRate: percent.length > 0,
  };
}

// ── 七、四条来源的索引 ────────────────────────────────────────────
function sources() {
  return [
    { key: '四诊不全', refs: ['13.1.1.2', '13.3.2.2'], quantified: false },
    { key: '假象', refs: ['2.1.1.2', '6.2.2', '6.3.2'], quantified: false },
    { key: '脉症从舍', refs: ['5.1.4.1'], quantified: false },
    { key: 'AI 误判与双轨复核', refs: ['14.3.2'], quantified: false },
  ];
}

function main() {
  const s = chapterShape();
  const d = fourDiagnosis();
  const f = fakeSigns();
  const p = pulseTradeoff();
  const a = aiTraps();
  const q = quantification();

  console.log('═══ 一、正文规模 ═══');
  console.log(`  教材·第${s.c13.no}章 ${s.c13.title}：${s.c13.secs} 节 · ${s.c13.chars} 字`);
  console.log(`  教材·第14章·14.3 ${s.c143.title}：${s.c143.secs} 小节 · ${s.c143.chars} 字（占第14章 ${(s.shareOf14 * 100).toFixed(1)}%）`);
  console.log(`  合计 ${s.total} 字 = 全书 ${(s.share * 100).toFixed(1)}%`);
  console.log('');

  console.log('═══ 二、① 四诊不全：四诊篇幅分配 ═══');
  for (const r of d.rows) console.log(`  ${r.name} ${String(r.chars).padStart(4)} 字 · 占全书 ${(r.share * 100).toFixed(1)}% · 占四诊 ${(r.chars / d.total * 100).toFixed(1)}%`);
  console.log(`  四诊合计 ${d.total} 字 = 全书 ${(d.share * 100).toFixed(1)}%`);
  console.log(`  最薄：${d.thinnest} ${d.thinnestChars} 字（全书 ${(d.thinnestShare * 100).toFixed(1)}%），是望诊的 ${(d.ratioToThickest * 100).toFixed(1)}%`);
  console.log('  → 最薄的一诊恰恰最依赖现场听、嗅，最难留痕、最难复核；篇幅薄 ≠ 不重要，但它确实是资料链最短的一环。');
  console.log('');

  console.log('═══ 三、② 假象：五个名称，逐个定位 ═══');
  for (const x of f) {
    console.log(`  ${x.name}：出现 ${x.count} 处（第${x.chapters.join('、')}章）`);
    console.log(`    全部：${x.refs.join(' / ')}`);
    console.log(`    定义处（段标题）：${x.definedAt.join(' / ') || '—'}；AI 章节引用：${x.inAi.join(' / ') || '无'}`);
  }
  console.log('');

  console.log('═══ 四、③ 脉症从舍（教材·第5章·5.1.4.1）═══');
  console.log(`  篇幅 ${p.chars} 字；顺逆判据 ${p.hasShun}/${p.hasNi}；两种从舍 ${p.hasSheMai}/${p.hasSheZheng}`);
  console.log(`  判据：${p.rules.join(' · ')}`);
  console.log('  → 只有「顺/逆」与「舍脉从症/舍症从脉」两个判据各一例，没有给优先级规则。');
  console.log('');

  console.log('═══ 五、④ AI 误判与双轨复核（教材·第14章·14.3.2）═══');
  console.log(`  篇幅 ${a.chars} 字（两段 ${a.paraLens.join(' + ')}）`);
  for (const c of a.cases) console.log(`  ${c.name}：AI ${c.pattern}，忽略 ${c.ignore}`);
  console.log(`  双轨机制：${a.hasDualTrack ? '有（辅助决策+人工复核）' : '未见'}`);
  console.log(`  第二段是否截断：${a.truncated ? '是，断在「' + a.tail + '」' : '否'}`);
  console.log('  → 14.3.2 只点了两个假象（真寒假热、真实假虚）+ 一个兼夹遗漏；真热假寒、真虚假实不在 AI 案例里。');
  console.log('');

  console.log('═══ 六、误差率扫描：教材给没给数 ═══');
  console.log(`  全书百分比数值：${q.numericRates} 处`);
  console.log(`  只出现名称、没有数值的指标：${q.termNames.join('、')}`);
  for (const t of q.terms) console.log(`    ${t.term} @ 教材·第${t.chapter}章·${t.ref}`);
  console.log('  → 没有任何误差率 / 一致性 / 符合率数值：本章只能列来源结构，不能给概率。');
  console.log('');

  console.log('  → 四条来源不是教材的一节，是从 13.1.1.2 / 6.2–6.3 / 5.1.4.1 / 14.3.2 拼出来的重构；拼的方向由教材原话决定，不是本章自创分类。');
  console.log('');
  const g = supplements('z4-wucha-lu');
  console.log(String.fromCharCode(10) + '── 教材缺口：误差率（拒补）──');
  console.log('  教材有名称无数值：' + g.evidence.namesOnly.join('、') + '；全书百分号出现 '
    + g.evidence.percentInTextbook + ' 次。');
  console.log('  拒补理由：' + g.reason);
  console.log('  替代口径：' + g.alternative);
  console.log('教学边界：本章只做误差来源的结构清点与节号定位，不给任何误差率、一致性或概率估计，不做诊断判读、不判断任何人的病情，不构成诊断依据。');
}

if (require.main === module) main();

module.exports = {
  chapterShape, fourDiagnosis, fakeSigns, pulseTradeoff, aiTraps, quantification, sources, sub,
  FAKE_NAMES, RATE_TERMS, BOOK, supplements };
