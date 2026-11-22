#!/usr/bin/env node
/**
 * 管理心理学 · 第 2 章 霍桑实验真正证明的，是「被观察」本身会改变结果
 * 课程: departments/06-guanli/18-guanli-xinli-xue/chapters/02-p2/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章的证据链是一串实验，不是一个结论。本脚本从正文里把三件事抽出来算：
 *   1. 三段实验的年份区间（照明／继电器／绕线），并检查它们是否重叠；
 *   2. 三条理论支流（行为主义／认知取向／人本主义）与自我效能四源；
 *   3. 「试点涨幅」的分解：把试点区相对对照区的增量拆成方案效应与被关注效应，
 *      再看试点结束后能留住多少 —— 这是本章唯一可以直接拿去做账的地方。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 2;
const TITLE = '霍桑实验真正证明的，是「被观察」本身会改变结果';
const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

function sections(text) {
  return String(text || '')
    .split('\n')
    .filter((l) => /^##\s+/.test(l))
    .map((l) => l.replace(/^##\s+/, '').trim());
}

/** 三段实验：**照明实验（1924—1927）** 这类写法，年份从括号里取 */
function phases(text) {
  const out = [];
  const re = /\*\*([^*\n]{2,10})（(\d{4})[—–-](\d{4})）\*\*/g;
  let m;
  while ((m = re.exec(String(text || ''))) !== null) {
    out.push({ name: m[1], from: Number(m[2]), to: Number(m[3]), years: Number(m[3]) - Number(m[2]) });
  }
  return out;
}

function span(ps) {
  const from = Math.min(...ps.map((p) => p.from));
  const to = Math.max(...ps.map((p) => p.to));
  return { from, to, years: to - from, phases: ps.length };
}

/** 任意两段是否在同一时间窗内并行（继电器 1927—1932 与绕线 1931—1932 并行 1 年） */
function overlaps(ps) {
  const out = [];
  for (let i = 0; i < ps.length; i += 1) {
    for (let j = i + 1; j < ps.length; j += 1) {
      const a = ps[i];
      const b = ps[j];
      const lo = Math.max(a.from, b.from);
      const hi = Math.min(a.to, b.to);
      if (hi - lo > 0) out.push({ pair: [a.name, b.name], years: hi - lo });
    }
  }
  return out;
}

const BRANCHES = ['行为主义', '认知取向', '人本主义'];
const EFFICACY = ['亲历的成功', '替代经验', '言语说服', '情绪与生理状态'];
const SCHOOLS = ['儒家', '道家', '法家', '兵家'];

function theory(text) {
  const t = String(text || '');
  return {
    branches: BRANCHES.filter((b) => t.includes(b)),
    efficacy: EFFICACY.filter((e) => t.includes(e)),
    schools: SCHOOLS.filter((s) => t.includes(s)),
  };
}

/**
 * 试点涨幅分解。试点区涨 12%、对照区涨 4%：
 *   方案效应 = 对照区涨幅（没被特别关注，只受方案影响的部分）；
 *   被关注效应 = 试点区涨幅 − 对照区涨幅。
 * 试点结束后的留存率 = 结束后涨幅 ÷ 方案效应；>1 说明还有别的因素在推。
 */
function decompose(pilotGain, controlGain) {
  const scheme = controlGain;
  const monitoring = pilotGain - controlGain;
  return {
    pilotGain,
    controlGain,
    scheme: Number(scheme.toFixed(4)),
    monitoring: Number(monitoring.toFixed(4)),
    monitoringShare: pilotGain ? Number((monitoring / pilotGain).toFixed(4)) : 0,
  };
}

function retention(afterGain, d) {
  const keep = d.scheme ? afterGain / d.scheme : 0;
  return {
    afterGain,
    keep: Number(keep.toFixed(4)),
    verdict: keep >= 1 ? '方案本身站得住' : keep >= 0.5 ? '留住一半：其余部分随关注退潮' : '大部分涨幅来自被关注，不能按试点数据推广',
  };
}

function main() {
  const text = read();
  const ps = phases(text);
  const sp = span(ps);
  const ov = overlaps(ps);
  const th = theory(text);
  const hanzi = (text.match(HANZI) || []).length;

  console.log(`管理心理学 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${hanzi} 字 · 节 ${sections(text).length} 节 · 实验段 ${ps.length} 段`);
  console.log('');
  console.log('三段实验（年份解析自正文）：');
  for (const p of ps) console.log(`  ${p.name}｜${p.from}—${p.to}｜${p.years} 年`);
  console.log(`  → 总跨度 ${sp.from}—${sp.to}，共 ${sp.years} 年；其中并行的段：${ov.length ? ov.map((o) => `${o.pair.join('／')}（${o.years} 年）`).join('、') : '无'}`);
  console.log('  注意：不是一次实验，而是一串，每段都在纠正上一段的假设。');
  console.log('');
  console.log(`理论支流 ${th.branches.length} 支：${th.branches.join(' · ')}`);
  console.log(`自我效能四源 ${th.efficacy.length} 条：${th.efficacy.join(' · ')}`);
  console.log(`中国本土资源 ${th.schools.length} 家：${th.schools.join(' · ')}`);
  console.log('');
  const d = decompose(12, 4);
  console.log('试点账（试点区 +12%、对照区 +4%）：');
  console.log(`  方案效应 ${d.scheme} 个点｜被关注效应 ${d.monitoring} 个点｜被关注占涨幅 ${(d.monitoringShare * 100).toFixed(1)}%`);
  const r = retention(2, d);
  console.log(`  试点结束后只剩 +${r.afterGain} 个点 → 留存 ${(r.keep * 100).toFixed(1)}%：${r.verdict}`);
  console.log('');
  console.log('边界：霍桑实验的年份与条件据公开文献转述，机构与场景为演算设定；本章不构成任何具体方案的推广建议。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, read, sections, phases, span, overlaps, theory, decompose, retention, BRANCHES, EFFICACY, SCHOOLS };
