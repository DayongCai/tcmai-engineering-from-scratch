#!/usr/bin/env node
/**
 * scripts/parse_shaoyin.js —— 把外源补录的少阴篇原文解析成结构化 JSON
 *
 *   node scripts/parse_shaoyin.js            # 写 standards/shanghan/shaoyin/shaoyin.json
 *   node scripts/parse_shaoyin.js --dry      # 只打印统计，不落盘
 *
 * 口径：
 *   · 输入只有 standards/shanghan/shaoyin/source.md（外源，非底本），本脚本不联网。
 *   · 每条条文的边界 = 原文里的「一行一条」；方名行以「方」结尾，方文行在方名之后。
 *   · 解析不到的形态（如方名与条文混排）宁可报 warning，不猜。
 *   · 输出含 source sha256，便于比对源文件是否被改过。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'standards/shanghan/shaoyin/source.md');
const OUT = path.join(ROOT, 'standards/shanghan/shaoyin/shaoyin.json');

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

/** 方名行：以「方」或「方：」结尾，且不含逗号句读 */
const isFormulaLine = (l) => /方[：:]?$/.test(l) && !/[，。]/.test(l);
/** 组方行：含剂量单位，且不以「右」「以上」开头 */
const isComposition = (l) => (/[两枚升合茎个斤分]/.test(l) || /[（(][^）)]*[）)]/.test(l)) && !/^(右|以上)/.test(l) && !/[。]$/.test(l);
/** 煎法行 */
const isMethod = (l) => /^(右|以上)/.test(l);
/** 条文行：以「少阴」「病人」开头（本篇体例），且以句号收尾 */
const isTiao = (l) => /^(少阴|病人)/.test(l) && /。$/.test(l);
/** 方后加减行：在方名之后、不以病名开头（如「若咳者，加五味…」「面色赤者，加葱九茎」） */
const isAddition = (l) => /。$/.test(l) && !/^(少阴|病人)/.test(l) && !isMethod(l) && !isComposition(l);

function parse(text) {
  const body = text.split(/^---$/m).slice(1).join('---');
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    .filter((l) => !l.startsWith('_展开全文_'));

  const tiao = [];
  const formulas = [];
  const warnings = [];
  let pendingFormula = null;

  for (const line of lines) {
    if (isTiao(line)) {
      if (pendingFormula && !pendingFormula.composition) {
        warnings.push(`方「${pendingFormula.name}」未找到组方行`);
      }
      pendingFormula = null;
      tiao.push({ no: tiao.length + 1, text: line, formula: null });
      continue;
    }
    if (isFormulaLine(line)) {
      pendingFormula = { name: line.replace(/[：:]$/, ''), tiao: tiao.length, composition: null, method: null, additions: [] };
      formulas.push(pendingFormula);
      continue;
    }
    if (pendingFormula && !pendingFormula.composition && isComposition(line)) {
      pendingFormula.composition = line;
      if (tiao.length) tiao[tiao.length - 1].formula = pendingFormula.name;
      continue;
    }
    if (pendingFormula && isMethod(line)) {
      pendingFormula.method = line;
      continue;
    }
    if (pendingFormula && isAddition(line)) {
      pendingFormula.additions.push(line);
      continue;
    }
    if (/[：:]$/.test(line)) continue; // 小标题（如「后加减法：」）
    warnings.push(`未归类行：${line.slice(0, 30)}`);
  }

  return { tiao, formulas, warnings };
}

function main() {
  const buf = fs.readFileSync(SRC);
  const text = buf.toString('utf8');
  const { tiao, formulas, warnings } = parse(text);

  const out = {
    source: '外源·搜狐2019',
    url: 'https://www.sohu.com/a/351941130_120065545',
    fetchedAt: '2026-10-19',
    note: '底本缺少阴篇（见 GAPS.md），本文件为外源补录；引用须标「外源·搜狐2019」，不得标「底本」。',
    sourceSha256: sha256(buf),
    counts: {
      tiao: tiao.length,
      formulas: formulas.length,
      withFormula: tiao.filter((t) => t.formula).length,
      additions: formulas.reduce((a, f) => a + (f.additions ? f.additions.length : 0), 0),
      death: tiao.filter((t) => /者死|不治。$|难治。$/.test(t.text)).length,
      curable: tiao.filter((t) => /可治|不死|必自愈|欲愈|欲解/.test(t.text)).length,
    },
    tiao,
    formulas,
    warnings,
  };

  console.log(`条：${out.counts.tiao} · 方：${out.counts.formulas} · 带方条文：${out.counts.withFormula} · 方后加减：${out.counts.additions}`);
  console.log(`预后类：死/不治 ${out.counts.death} 条 · 可治/自愈/欲愈类 ${out.counts.curable} 条`);
  if (warnings.length) console.log(`警告 ${warnings.length} 条：\n  ` + warnings.join('\n  '));

  if (!process.argv.includes('--dry')) {
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log(`→ ${path.relative(ROOT, OUT)}`);
  }
}

if (require.main === module) main();
module.exports = { parse, isFormulaLine, isComposition, isMethod, isTiao };
