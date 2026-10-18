'use strict';
/**
 * 藏象五元组解析：《素问·六节藏象论》五脏句 → {本,华,充,阴阳位,通于} + 不规则项
 *
 *   node code/main.js
 *
 * 两条规则（本章的教学点）：
 *   1. 校勘夹注先行清洗：「为阳中之太（《太素》作少）阴」里的括号是别人写的，
 *      不剥就会把「太阴」「少阴」两个版本混成一个字段。剥下来的内容存 glosses，不丢。
 *   2. 不规则要标注，不要硬套：脾句是「脾胃大肠小肠三焦膀胱者…」六者合称，
 *      且用「至阴之类」而非「阳中之X」——套进五元组的整齐表格等于替原文改字。
 */

const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.resolve(__dirname, '../../../../../..');
const MD = path.join(ROOT, 'standards/materials/neijing-quanwen/黄帝内经全文（素问81篇 · 灵枢81篇）.md');

/** 剥夹注：全角括号内含「《…》作」「别本作」「一作」等校勘语 */
function stripGloss(text) {
  const glosses = [];
  const clean = String(text).replace(/（([^）]*)）/g, (m, inner) => {
    if (/《[^》]+》|别本|一作|或作|当作/.test(inner)) {
      glosses.push(inner.trim());
      return '';
    }
    return m;
  });
  return { clean, glosses };
}

function loadText() {
  return fs.readFileSync(MD, 'utf8').replace(/\s+/g, '');
}

const SPEC = [
  { zang: '心', re: /心者，生之本[^。]*。/ },
  { zang: '肺', re: /肺者，气之本[^。]*。/ },
  { zang: '肾', re: /肾者，主蛰[^。]*。/ },
  { zang: '肝', re: /肝者，罢极之本[^。]*。/ },
  { zang: '脾胃大肠小肠三焦膀胱', re: /仓廪之本[^。]*通于土气。/ },
];

function field(clean, re) {
  const m = clean.match(re);
  return m ? m[1] : null;
}

/** 解析五脏：返回记录数组（含 irregular 与 glosses） */
function parseFive(text = loadText()) {
  const out = [];
  for (const s of SPEC) {
    const m = text.match(s.re);
    if (!m) { out.push({ zang: s.zang, error: '原文未匹配' }); continue; }
    const { clean, glosses } = stripGloss(m[0]);
    const position = field(clean, /((?:阳中之|阴中之|至阴)[^，。]*)/);
    out.push({
      zang: s.zang,
      ben: field(clean, /([^，。]*之本)/),
      hua: field(clean, /其华在([^，。]*)/),
      chong: field(clean, /其充在([^，。]*)/),
      position: position || null,
      qi: field(clean, /通于([^，。]*气)/),
      glosses,
      irregular: s.zang.length > 1 || !/(阳中之|阴中之)/.test(position || ''),
    });
  }
  return out;
}

function main() {
  const rows = parseFive();
  console.log('脏｜本｜华｜充｜阴阳位｜通于｜不规则');
  for (const r of rows) {
    if (r.error) { console.log(`  ${r.zang}｜${r.error}`); continue; }
    console.log(`  ${r.zang}｜${r.ben}｜${r.hua}｜${r.chong}｜${r.position}｜${r.qi}｜${r.irregular ? '是' : '否'}`);
    if (r.glosses.length) console.log(`     └ 剥出的夹注：${r.glosses.join(' / ')}`);
  }
  console.log(`\n不规则项 ${rows.filter((r) => r.irregular).length} 条 —— 原文不是一张整齐的表。`);
  console.log('本输出为教学样例，不构成诊断依据。');
}

if (require.main === module) main();
module.exports = { stripGloss, parseFive, loadText, MD };
