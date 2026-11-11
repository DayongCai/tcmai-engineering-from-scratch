#!/usr/bin/env node
/**
 * 中医诊断学 · 第 3 章 舌诊：舌质舌苔 → 颜色与纹理特征
 * 课程: departments/01-zhongyi/05-zhongyi-zhen-duan-xue/chapters/03-shezhen-tese/docs/zh.md
 * 出处: 教材·第2章·2.3 舌诊（4 小节 10 段 1,249 字）
 * 依赖: 仅 Node.js 标准库
 *
 * 舌诊是望诊里唯一接近「可枚举特征表」的部分：5 舌色 + 6 舌形 + 5 舌态 + 6 苔质 + 4 苔色 = 26 个特征词。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const BOOK = path.join(ROOT, 'standards', 'zhenduan', '底本.json');
const doc = JSON.parse(fs.readFileSync(BOOK, 'utf8'));
const ch = doc.chapters.find((c) => c.no === '2');

const SHE = ['2.3.1', '2.3.2', '2.3.3', '2.3.4'];

function sub(no) {
  for (const s of ch.secs) for (const x of s.subs) if (x.no === no) return x;
  return null;
}

// 字数只算正文段（与第 2 章的 1,249 字同口径）；术语核对则连段标题一起看
function parasOf(no) {
  const x = sub(no);
  return x ? x.paras.join('') : '';
}

function textOfSub(no) {
  const x = sub(no);
  if (!x) return ''; // 段标题层（如 2.3.2.1）不是小节，交给 allShe() 兜底
  return [x.title, ...x.paras, ...(x.items || []).map((i) => i.title)].join('');
}

function allShe() {
  return SHE.map((n) => textOfSub(n)).join('\n');
}

// 五类特征词：直接照教材小节标题里的括注取，不凭记忆补
const FEATURES = {
  se: { name: '舌色', items: ['淡红', '淡白', '红', '绛', '紫'], from: '2.3.2' },
  xing: { name: '舌形', items: ['老', '嫩', '胖', '瘦', '点刺', '裂纹'], from: '2.3.2' },
  tai: { name: '舌态', items: ['痿软', '强硬', '歪斜', '吐弄', '短缩'], from: '2.3.2' },
  taizhi: { name: '苔质', items: ['薄', '厚', '润', '燥', '腐', '腻', '剥落'], from: '2.3.3' },
  taise: { name: '苔色', items: ['白', '黄', '灰', '黑'], from: '2.3.3' },
};

function features() {
  return Object.entries(FEATURES).map(([key, f]) => ({
    key,
    name: f.name,
    from: f.from,
    items: f.items.map((w) => ({ w, inText: textOfSub(f.from).includes(w) || allShe().includes(w) })),
  }));
}

function shape() {
  const rows = SHE.map((no) => {
    const x = sub(no);
    return {
      no,
      title: x.title,
      items: (x.items || []).length,
      paras: x.paras.length,
      chars: parasOf(no).length,
    };
  });
  const chars = rows.reduce((n, r) => n + r.chars, 0);
  return { rows, chars, share: chars / 2812, terms: features().reduce((n, f) => n + f.items.length, 0) };
}

function main() {
  const s = shape();
  const fs2 = features();

  console.log('═══ 舌诊四小节（教材·第2章·2.3）═══');
  for (const r of s.rows) {
    console.log(`  ${r.no} ${r.title}：${r.items} 段标题 · ${r.paras} 段 · ${r.chars} 字`);
  }
  console.log(`  合计 ${s.chars} 字 = 望诊 2,812 字的 ${(s.share * 100).toFixed(1)}%`);
  console.log('');
  console.log('═══ 特征词：' + s.terms + ' 个 ═══');
  for (const f of fs2) {
    const hit = f.items.filter((x) => x.inText).length;
    console.log(`  ${f.name}（${f.from}）：${f.items.map((x) => x.w + (x.inText ? '' : '✗')).join(' · ')} → ${hit}/${f.items.length}`);
  }
  console.log(`  合计 ${s.terms} 个特征词（${fs2.map((f) => f.items.length).join(' + ')}）`);
  console.log('');
  console.log(`  → ${s.terms} 个特征词意味着：舌象可以拆成 5/6/5/7/4 五组离散取值，是望诊里最容易变成结构化数据的部分。`);
  console.log('  → 但「苔质」教材写 7 个（薄厚润燥腐腻剥落），不是常见的 6 个：剥落被单列。');
  console.log('');
  console.log('教学边界：本章只清点教材舌诊的特征词与结构，不做舌象判读、不判断任何人的舌象；不构成诊断依据。');
}

if (require.main === module) main();

module.exports = { shape, features, FEATURES, textOfSub, parasOf, SHE, doc, ch };
