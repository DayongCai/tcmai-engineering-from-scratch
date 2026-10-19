'use strict';
/**
 * 少阴病（外源补录）：预后判定 + 方证分组 + 与底本交叉核对
 *
 *   node code/main.js
 *
 * 数据来源：
 *   · standards/shanghan/shaoyin/shaoyin.json —— 外源补录 45 条 / 15 方（来源见 PROVENANCE.md）
 *   · standards/shanghan/底本.json —— 底本 27 篇 1760 条（**缺少阴篇**）
 *
 * 口径：
 *   · 外源不并入底本；任何计数分两列报（外源 / 底本），不合并。
 *   · 底本侧只做「子串命中」，因为底本没有此篇：命中「甘草汤」的多是「甘草干姜汤」子串，
 *     所以底本侧数字只表示「这些字在底本里出现过」，不表示「底本有此方条文」。
 *   · 预后判定按原文可判读的词（手足温 / 手足逆冷 / 脉不至 / 息高 / 躁）分类，
 *     归不进去的一律「未判定」，不硬套。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const SY = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/shaoyin/shaoyin.json'), 'utf8'));
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));

const BOOK_TEXTS = [];
for (const p of BOOK.pian) for (const it of p.items) BOOK_TEXTS.push(it.text);

/** 预后判定：先看原文结论词（死/不治/难治），再看向愈判据，其余「未判定」 */
function prognosis(text) {
  const tail = text.replace(/。$/, '');
  const lastClause = tail.split(/[，。]/).slice(-2).join('，');
  if (/难治$/.test(tail)) return { cls: '难治', why: lastClause };
  if (/不治$/.test(tail)) return { cls: '不治', why: lastClause };
  if (/死$/.test(tail)) return { cls: '死', why: lastClause };
  if (/必自愈|自愈/.test(tail)) return { cls: '欲解', why: '脉暴微、手足反温，虽烦下利必自愈' };
  if (/可治/.test(tail)) return { cls: '可治', why: lastClause };
  if (/不死/.test(tail)) return { cls: '可治', why: '手足不逆冷、反发热' };
  if (/欲愈/.test(tail)) return { cls: '欲愈', why: lastClause };
  if (/欲解时/.test(tail)) return { cls: '欲解时', why: '从子至寅上' };
  return { cls: '未判定', why: '无预后判据词' };
}

/** 方证三型（按原文方名与治法归类；每型附条号） */
const GROUPS = {
  '表里同病（温经解表）': ['麻黄附子细辛汤', '麻黄附子甘草汤'],
  '里虚寒（回阳/温中/温涩）': ['四逆汤', '通脉四逆汤', '白通汤', '白通加猪胆汁', '附子汤', '真武汤', '桃花汤', '吴茱萸汤'],
  '热化（滋阴/清热/急下）': ['黄连阿胶汤', '猪苓汤', '大承气汤', '甘草汤', '桔梗汤', '苦酒汤', '半夏散及汤', '猪肤汤', '四逆散'],
};

/** 方名归一：源里有两处讹字（黄连阿肢 / 自通） */
const NAME_FIX = { 黄连阿肢汤: '黄连阿胶汤', 自通汤: '白通汤' };

function loadFormulas() {
  return SY.formulas.map((f) => {
    const name = f.name.replace(/方$/, '');
    return {
      raw: f.name,
      name: NAME_FIX[name] || name,
      tiao: f.tiao,
      composition: f.composition,
      additions: f.additions || [],
    };
  });
}

/** 交叉核对：外源每方在底本中的子串命中数 */
function crossCheck() {
  const rows = loadFormulas().map((f) => ({
    name: f.name,
    inBook: BOOK_TEXTS.filter((t) => t.includes(f.name)).length,
  }));
  return {
    rows,
    zero: rows.filter((r) => r.inBook === 0).map((r) => r.name),
    hit: rows.filter((r) => r.inBook > 0).length,
  };
}

function main() {
  const tiao = SY.tiao;
  console.log(`外源少阴篇：${tiao.length} 条 · ${SY.formulas.length} 方 · 方后加减 ${SY.counts.additions} 项`);
  console.log(`底本对照：底本 ${BOOK.pian.length} 篇 / ${BOOK.pian.reduce((a, p) => a + p.actual.tiao, 0)} 条（缺少阴篇）\n`);

  console.log('预后分层：');
  const buckets = {};
  for (const t of tiao) {
    const p = prognosis(t.text);
    (buckets[p.cls] = buckets[p.cls] || []).push({ no: t.no, why: p.why });
  }
  for (const [k, v] of Object.entries(buckets)) {
    console.log(`  ${k.padEnd(4, '　')} ${String(v.length).padStart(2)} 条  ${v.map((x) => x.no).join(',')}${k === '未判定' ? '' : `　依据：${v[0].why}`}`);
  }

  console.log('\n方证三型（外源）：');
  const fs2 = loadFormulas();
  for (const [g, names] of Object.entries(GROUPS)) {
    const hit = names.map((n) => fs2.find((f) => f.name === n)).filter(Boolean);
    if (!hit.length) continue;
    console.log(`  ${g}：${hit.map((f) => `${f.name}(条${f.tiao})`).join(' · ')}`);
  }

  const cc = crossCheck();
  console.log(`\n底本交叉核对（子串口径）：15 方中 ${cc.hit} 方在底本出现过，${cc.zero.length} 方 0 命中`);
  console.log(`  0 命中：${cc.zero.join('、')}`);
  console.log('  注意：底本命中是子串计数（如「甘草汤」命中含「甘草干姜汤」），不代表底本有此方条文。');

  const forbid = tiao.filter((t) => /不可发汗|不可下|不可吐/.test(t.text));
  console.log(`\n禁例：${forbid.length} 条（${forbid.map((t) => t.no).join('、')}）`);
  console.log('\n口径：外源与底本分列，不合并统计；引用外源须标「外源·搜狐2019 第 N 条」。');
  console.log('本输出为文本结构分析，不构成辨证处方建议。');
}

if (require.main === module) main();
module.exports = { prognosis, loadFormulas, crossCheck, GROUPS, SY, BOOK, BOOK_TEXTS };
