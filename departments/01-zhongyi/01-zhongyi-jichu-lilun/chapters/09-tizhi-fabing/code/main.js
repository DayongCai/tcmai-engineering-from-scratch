#!/usr/bin/env node
/**
 * 中医基础理论 · 第 9 章 体质与发病 → 先验分布与风险分层
 * 课程: departments/01-zhongyi/01-zhongyi-jichu-lilun/chapters/09-tizhi-fabing/docs/zh.md
 * 出处: 教材·第12章 体质学说（5 节 13 段）+ 教材·第8章 发病（4 节 20 段）
 * 依赖: 仅 Node.js 标准库
 *
 * 四个量：
 *   1. 体质有两套分类：经典《灵枢·阴阳二十五人》5 形 × 5 音 = 25；现代王琦九分法 9 质；
 *   2. 两套之间的映射是**多对多**（5 形 → 9 质，教材明说「非严格一一对应」）；
 *   3. 发病类型 7 种、影响发病的因素 3 类；
 *   4. 风险分层的先验必须标「教学设定」——教材没有给任何体质的人群患病率。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = path.join(ROOT, 'standards', 'jichu', '底本.json');
const doc = JSON.parse(fs.readFileSync(BOOK, 'utf8'));

function chapter(no) {
  return doc.chapters.find((c) => c.no === no);
}

function subsOf(no) {
  const out = {};
  for (const s of chapter(no).secs) for (const sub of s.subs) out[sub.no] = sub;
  return out;
}

const S12 = subsOf('12');
const S8 = subsOf('8');

const WUXING = ['木', '火', '土', '金', '水'];
const WUYIN = ['角', '徵', '宫', '商', '羽'];
const JIUZHI = ['平和质', '气虚质', '阳虚质', '阴虚质', '痰湿质', '湿热质', '血瘀质', '气郁质', '特禀质'];

// ── 1. 两套分类 ─────────────────────────────────────────────
function systems() {
  const t1 = S12['12.3.1'] ? S12['12.3.1'].paras.join('') : '';
  const t2 = S12['12.3.2'] ? S12['12.3.2'].paras.join('') : '';
  const t5 = S12['12.5.1'] ? S12['12.5.1'].paras.join('') : '';
  return {
    classic: {
      shapes: WUXING,
      notes: WUYIN,
      quarters: WUXING.length * WUYIN.length,
      stated25: /二十五人/.test(t1),
    },
    modern: {
      types: JIUZHI,
      n: JIUZHI.length,
      allMentioned: JIUZHI.every((x) => t2.includes(x)),
      scaleItems: 60,
      scaleCited: /60条目/.test(t5),
    },
  };
}

// ── 2. 双轨映射：多对多 ─────────────────────────────────────
function mapping() {
  const t = S12['12.3.2'] ? S12['12.3.2'].paras.join('') : '';
  const m = t.match(/对应关系[^:：]*[:：]\s*(.+?)。/);
  const text = m ? m[1] : '';
  // 教材原文用 ASCII 逗号分隔（", "），且每项以「倾向」收尾；两者都要处理
  const rows = [...text.matchAll(/([木火土金水])形人≈([^，。,]+)/g)].map((x) => ({
    shape: x[1],
    types: x[2].split('/').map((s) => s.trim().replace(/倾向$/, '')).filter(Boolean),
  }));
  const targets = new Set(rows.flatMap((r) => r.types));
  return {
    rows,
    pairs: rows.reduce((n, r) => n + r.types.length, 0),
    distinctTargets: [...targets],
    nDistinct: targets.size,
    declaredNonOneToOne: /非严格一一对应/.test(t) || /非一一对应/.test(t),
  };
}

// ── 3. 发病：7 种类型 + 3 类影响因素 ─────────────────────────
function onset() {
  const types = [];
  for (const no of ['8.3.1', '8.3.2', '8.3.3']) {
    for (const part of S8[no].title.split(/[与、]/)) {
      const w = part.trim();
      if (w) types.push({ no, name: w });
    }
  }
  const factors = ['体质因素', '情志因素', '生活因素'].filter((w) => Object.values(S8).some((s) => s.title === w));
  return { types, factors, paras: chapter('8').counts.paras, chars: chapter('8').counts.chars };
}

// ── 4. 风险分层：先验是教学设定 ─────────────────────────────
const PRIOR = { 平和质: 0.30, 气虚质: 0.13, 阳虚质: 0.13, 阴虚质: 0.09, 痰湿质: 0.11, 湿热质: 0.09, 血瘀质: 0.07, 气郁质: 0.06, 特禀质: 0.02 };

const SUSCEPT = {
  阳虚质: ['寒邪'],
  阴虚质: ['热邪'],
  痰湿质: ['眩晕', '中风', '消渴'],
};

function risk() {
  const sum = Object.values(PRIOR).reduce((a, b) => a + b, 0);
  const rows = JIUZHI.map((t) => {
    const targets = SUSCEPT[t] || [];
    const p = PRIOR[t] / sum;
    return { type: t, prior: +p.toFixed(3), targets, n: targets.length, score: +(p * targets.length).toFixed(4) };
  }).sort((a, b) => b.score - a.score);
  return { rows, top3: rows.slice(0, 3).map((r) => r.type), priorSum: +sum.toFixed(3) };
}

function main() {
  const sys = systems();
  const map = mapping();
  const on = onset();
  const rk = risk();

  console.log('═══ 体质两套分类（教材·第12章，5 节 13 段 1,443 字）═══');
  console.log(`  经典：${sys.classic.shapes.join('')} 5 形 × ${sys.classic.notes.join('')} 5 音 = ${sys.classic.quarters} 人（教材称「二十五人」：${sys.classic.stated25 ? '是' : '否'}）`);
  console.log(`  现代：${sys.modern.types.join(' · ')}（${sys.modern.n} 质，全部出现：${sys.modern.allMentioned ? '是' : '否'}）`);
  console.log(`  量表：王琦体质量表 ${sys.modern.scaleItems} 条目（教材原文引用：${sys.modern.scaleCited ? '是' : '否'}）`);
  console.log('');
  console.log('═══ 双轨映射：多对多 ═══');
  for (const r of map.rows) console.log(`  ${r.shape}形人 ≈ ${r.types.join(' / ')}`);
  console.log(`  ${map.rows.length} 形 → ${map.pairs} 条对应 → ${map.nDistinct} 个不同体质：${map.distinctTargets.join('、')}`);
  console.log(`  教材是否明说非一一对应：${map.declaredNonOneToOne ? '是' : '否'}`);
  console.log(`  → 10 条边覆盖 ${map.nDistinct}/9 质（平和质不在映射里）；每形对 2 质、每质至多来自 2 形，`);
  console.log('    所以「某质=某形」反推不成立，只能正推「某形人易见某质」。');
  console.log('');
  console.log(`═══ 发病（教材·第8章，${on.paras} 段 ${on.chars} 字）═══`);
  console.log(`  发病类型 ${on.types.length} 种：${on.types.map((x) => x.name).join(' · ')}`);
  console.log(`  影响因素 ${on.factors.length} 类：${on.factors.join(' · ')}`);
  console.log('');
  console.log('═══ 风险分层（先验为教学设定，非流行病学）═══');
  console.log('  体质    先验   易感目标                得分');
  for (const r of rk.rows) {
    console.log(`  ${r.type.padEnd(5)} ${r.prior.toFixed(3)}  ${(r.targets.join('/') || '（教材未列）').padEnd(22)} ${r.score.toFixed(4)}`);
  }
  console.log(`  先验合计 ${rk.priorSum}；得分 = 先验 × 教材列出的易感目标数`);
  console.log(`  前三：${rk.top3.join(' · ')}`);
  console.log('  → 这套排序只在「先验取本表数值」时成立；教材没有给任何患病率，所以它是教学演示，不是风险评估。');
  console.log('');
  console.log('教学边界：本章只演示体质分类与风险分层的表示方式，不判定任何人的体质，不给出调体方案；不构成诊疗依据。');
}

if (require.main === module) main();

module.exports = { systems, mapping, onset, risk, PRIOR, SUSCEPT, JIUZHI, WUXING, doc };
