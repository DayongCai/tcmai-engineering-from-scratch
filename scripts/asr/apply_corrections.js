#!/usr/bin/env node
/**
 * scripts/asr/apply_corrections.js —— 在**不改动原始识别文本**的前提下，生成校正层
 *
 * 分层约定（三层各自可核）：
 *   1. sources/asr/lec-NN.json        机器识别原件（永不改写）
 *   2. sources/transcripts/lec-NN.md  可读的原始识别稿（与 1 逐段一致）
 *   3. sources/transcripts/corrected/lec-NN.md  本脚本产出：只替换方名，段末标出原形
 *
 * 替换纪律：
 *   · 只用 corrections.json 里**已成规则**的错形（候选唯一、有拼音依据）；
 *     未判定的一律不碰（见 corrections-review.md）
 *   · 最长优先匹配，避免「大清浓汤」被「大清」之类的短规则切坏（本表暂无，但规则要防）
 *   · 每处替换都在段末留 `〔原「错形」→「正名」〕`，人可逐条回原文核对
 *
 * 用法:
 *   node scripts/asr/apply_corrections.js            # 生成 corrected/lec-NN.md + 索引
 *   node scripts/asr/apply_corrections.js --check    # 只比对，不写；不一致退出 1
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC = path.join(ROOT, 'standards', 'materials', 'chenruchun-lectures', 'sources');
const ASR = path.join(SRC, 'asr');
const OUT = path.join(SRC, 'transcripts', 'corrected');
const CORR = path.join(SRC, 'transcripts', 'corrections.json');
const CHECK = process.argv.includes('--check');
const DUP = new Map([[8, 6]]);

if (!fs.existsSync(CORR)) {
  console.error('✗ 没有 corrections.json —— 先跑 python scripts/asr/build_corrections.py');
  process.exit(1);
}
const CORR_DOC = JSON.parse(fs.readFileSync(CORR, 'utf8'));
const RULES = CORR_DOC.rules
  .slice()
  .sort((a, b) => b.wrong.length - a.wrong.length)
  .map((r) => ({ wrong: r.wrong, right: r.right, level: r.level }));
const PHRASES = (CORR_DOC.phrases || [])
  .slice()
  .sort((a, b) => b.wrong.length - a.wrong.length)
  .map((t) => ({ wrong: t.wrong, right: t.right, level: t.level || 'human' }));
const TERMS = (CORR_DOC.terms || [])
  .slice()
  .sort((a, b) => b.wrong.length - a.wrong.length)
  .map((t) => ({ wrong: t.wrong, right: t.right, level: t.level || 'human' }));
const POINTS = CORR_DOC.points || [];

const eps = JSON.parse(fs.readFileSync(path.join(SRC, 'episodes.json'), 'utf8')).episodes;
const pad = (n) => String(n).padStart(2, '0');
const mmss = (sec) => `${Math.floor(sec / 60)}:${pad(Math.round(sec % 60))}`;

/** 对一段文本做替换，返回 { text, hits:[{wrong,right,times}] }
 *  顺序：定点（讲次+时间点）→ 术语层 → 方名规则（各自最长优先） */
function correct(text, no, sec) {
  let out = text;
  const hits = [];
  const applies = [...PHRASES, ...RULES, ...TERMS];
  // 定点放最后：先把「礼中汤」这类完整方名替换掉，剩下的单字「礼」才按定点改。
  for (const p of POINTS) {
    if (p.lecture === no && Math.abs(p.sec - sec) <= 1.5) {
      applies.push({ wrong: p.wrong, right: p.right, level: 'human' });
    }
  }
  for (const r of applies) {
    if (!out.includes(r.wrong)) continue;
    let n = 0;
    while (out.includes(r.wrong)) {
      out = out.replace(r.wrong, r.right);
      n += 1;
      if (n > 50) break;
    }
    hits.push({ wrong: r.wrong, right: r.right, times: n, level: r.level });
  }
  return { text: out, hits };
}

const made = [];
const mismatch = [];
for (const ep of eps) {
  const srcNo = DUP.get(ep.no) || ep.no;
  const file = path.join(ASR, `lec-${pad(srcNo)}.json`);
  if (!fs.existsSync(file)) continue;
  const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
  const chars0 = doc.segments.reduce((a, s) => a + (s.text || '').length, 0);
  let replacements = 0;
  const touched = [];
  const lines = [];

  lines.push(`# 陈瑞春讲伤寒论 ${ep.no} · ${ep.title.replace(/^陈瑞春讲伤寒论\d+-/, '')}`);
  lines.push('');
  lines.push('> **术语校正层**：只把方名错形替换回规范名，不做任何改写、补句或润色。');
  lines.push('> 原始识别稿见 `../lec-' + pad(ep.no) + '.md`，机器原件见 `sources/asr/lec-' + pad(srcNo) + '.json`（均未改动）。');
  lines.push('> 判定依据：同音节数 + 拼音编辑距离 ≤1（近音）或 =2 且本讲有规范形佐证 + 候选唯一；未判定的写法不替换。');
  lines.push('');
  lines.push(`生成：\`node scripts/asr/apply_corrections.js\` · 规则表 \`../corrections.json\``);
  lines.push('');
  lines.push('---');
  lines.push('');

  for (const s of doc.segments) {
    const raw = String(s.text || '').trim();
    if (!raw) continue;
    const { text, hits } = correct(raw, ep.no, s.start);
    if (hits.length) {
      const n = hits.reduce((a, h) => a + h.times, 0);
      replacements += n;
      touched.push({ sec: s.start, hits });
    }
    const note = hits.length
      ? ` 〔原${hits.map((h) => `「${h.wrong}」→「${h.right}」`).join('、')}〕`
      : '';
    lines.push(`**[${mmss(s.start)}]** ${text}${note}`);
    lines.push('');
  }

  const body = `${lines.join('\n')}\n`;
  const name = `lec-${pad(ep.no)}.md`;
  const target = path.join(OUT, name);
  const old = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : null;
  if (old !== body) {
    if (CHECK) mismatch.push(name);
    else {
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(target, body, 'utf8');
    }
  }
  made.push({ no: ep.no, name, chars: chars0, replacements, touched: touched.length });
}

// 索引
made.sort((a, b) => a.no - b.no);
const uniq = made.filter((m) => m.no !== 8);
const idx = [];
idx.push('# 术语校正层 · 索引');
idx.push('');
idx.push(`规则表 ${CORR_DOC.rules.length} 条（high ${CORR_DOC.stats.high} / medium ${CORR_DOC.stats.medium} / low ${CORR_DOC.stats.low}）；`);
idx.push(`本层共替换 **${uniq.reduce((a, m) => a + m.replacements, 0)} 处**，涉及 ${uniq.filter((m) => m.replacements).length} 讲。`);
idx.push('原文本未被改写：`../lec-NN.md`（识别稿）与 `sources/asr/lec-NN.json`（原件）保持原样。');
idx.push('');
idx.push('| 讲次 | 原文字数 | 有替换的段 | 替换处 | 文本 |');
idx.push('|---|---|---|---|---|');
for (const m of made) {
  idx.push(`| ${m.no} | ${m.chars} | ${m.touched} | ${m.replacements} | [${m.name}](${m.name})${m.no === 8 ? '（复用第 6 讲）' : ''} |`);
}
idx.push('');
idx.push('逐条依据（错形/正名/拼音/次数/示例）见 `../corrections-review.md`。');
const indexBody = `${idx.join('\n')}\n`;
const indexFile = path.join(OUT, 'README.md');
const oldIndex = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : null;
if (oldIndex !== indexBody) {
  if (CHECK) mismatch.push('README.md');
  else {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(indexFile, indexBody, 'utf8');
  }
}

const tot = uniq.reduce((a, m) => a + m.replacements, 0);
console.log(`═══ 术语校正层 ═══`);
console.log(`  ${made.length} 份（${uniq.length} 份不同正文）· 替换 ${tot} 处 · 规则 ${RULES.length} 条`);
console.log(`  → ${path.relative(ROOT, OUT)}/lec-NN.md（索引 README.md）`);
if (CHECK) {
  if (mismatch.length) {
    console.error(`  ✗ ${mismatch.length} 份与规则表不一致：${mismatch.slice(0, 5).join('、')}`);
    process.exit(1);
  }
  console.log('  ✅ 全部与 corrections.json 一致（无漂移）');
}
