'use strict';
/**
 * 阳明腑实三承气分层判定（条件全部取自原文词）
 *
 *   node code/main.js
 *
 * 口径：
 *   · 判定只覆盖三承气；阳明病其他分支（白虎、茵陈蒿、栀子豉）不在此列。
 *   · 「痞满燥实」是后世归纳，代码用的是原文词：腹满 / 大便硬 / 潮热 / 谵语 / 燥屎。
 *   · 异文（如「玉函云：与小承气汤」）单独以 variants 报，不覆盖主文，也不自动择一。
 *   · 不判虚实夹杂、不判可攻与否 —— 那是临床判断，不是文本规则。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const BOOK = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shanghan/底本.json'), 'utf8'));
const TEXTS = [];
for (const p of BOOK.pian) for (const it of p.items) TEXTS.push({ pian: p.no, text: it.text });

const K = {
  big: ['大便硬', '潮热', '腹满'],
  small: ['腹大满不通', '潮热'],
  mild: ['不恶寒但热'],
};

function grade(signs = {}) {
  const has = (k) => signs[k] === true;
  const hitOf = (keys) => keys.filter(has);
  const missingOf = (keys) => keys.filter((k) => !has(k));

  if (has('大便硬') && has('潮热') && has('腹满')) {
    return { tier: '大承气汤', hit: hitOf(K.big), missing: missingOf(K.big), notExcluded: ['若腹大满不通为主，原文另有小承气分支'] };
  }
  if (has('腹大满不通') && has('潮热') && !has('大便硬')) {
    return { tier: '小承气汤', hit: hitOf(K.small), missing: missingOf(K.small), notExcluded: ['若燥屎已成，需考虑大承气（原文另条）'] };
  }
  if (has('不恶寒但热') && !has('腹满') && !has('大便硬')) {
    return { tier: '调胃承气汤', hit: hitOf(K.mild), missing: missingOf(K.mild), notExcluded: ['异文《玉函》此处作小承气汤'] };
  }
  const missing = ['潮热', '腹满', '大便硬', '腹大满不通'].filter((k) => !has(k));
  return { tier: '不足以定档', hit: hitOf([...K.big, ...K.small, ...K.mild]), missing, notExcluded: ['可能属阳明其他分支（白虎/茵陈蒿/栀子豉）'] };
}

/** 频次与异文（只报数、只记录） */
function stats() {
  const c = (k) => TEXTS.filter((t) => t.text.includes(k)).length;
  return {
    条: BOOK.pian.filter((p) => p.domain === '阳明病').reduce((a, p) => a + p.actual.tiao, 0),
    篇: BOOK.pian.filter((p) => p.domain === '阳明病').length,
    大承气汤: c('大承气汤'), 小承气汤: c('小承气汤'), 调胃承气汤: c('调胃承气汤'),
    谵语: c('谵语'), 腹满: c('腹满'), 不大便: c('不大便'), 燥屎: c('燥屎'), 潮热: c('潮热'),
  };
}

/** 底本自带的「某书云」异文标注 */
function variants() {
  return TEXTS.filter((t) => /玉函云|一作/.test(t.text)).map((t) => ({
    pian: t.pian,
    text: t.text.slice(0, 80),
    note: (t.text.match(/玉函云[^。]*|一作[^。]*/) || [''])[0],
  }));
}

function main() {
  const s = stats();
  console.log(`阳明病域 ${s.条} 条 / ${s.篇} 篇`);
  console.log(`方名频次：大承气 ${s.大承气汤} · 小承气 ${s.小承气汤} · 调胃 ${s.调胃承气汤}（频次含禁忌条，不等于首选率）`);
  console.log(`症状词：谵语 ${s.谵语} · 腹满 ${s.腹满} · 不大便 ${s.不大便} · 燥屎 ${s.燥屎} · 潮热 ${s.潮热}\n`);
  const cases = [
    { 大便硬: true, 潮热: true, 腹满: true },
    { 腹大满不通: true, 潮热: true },
    { 不恶寒但热: true },
    {},
  ];
  for (const cs of cases) {
    const r = grade(cs);
    console.log(`${JSON.stringify(cs)}\n  → ${r.tier}｜命中 ${r.hit.join('/') || '无'}｜缺 ${r.missing.join('/') || '无'}`);
  }
  const v = variants();
  console.log(`\n底本异文标注 ${v.length} 处（例）：`);
  for (const x of v.slice(0, 3)) console.log(`  篇${x.pian} ${x.note} ← ${x.text}…`);
  console.log('\n本输出为条文规则演示，不构成攻下指征或处方建议。');
}

if (require.main === module) main();
module.exports = { grade, stats, variants, TEXTS };
