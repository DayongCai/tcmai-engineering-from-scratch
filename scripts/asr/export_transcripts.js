#!/usr/bin/env node
/**
 * scripts/asr/export_transcripts.js —— 把语音识别文本导出成**可读、可检索的纯文本**
 *
 * 为什么要有它:
 *   识别结果此前只存在两处：asr/lec-NN.json（段级 JSON）与《验证-伤寒论.xlsx》的 12/13 表。
 *   前者不适合人读，后者要开 Excel 才能搜。而「保存识别文本」的本意是——
 *   每一讲的正文能像讲稿一样直接打开、grep、贴进别的工具。
 *
 * 与读屏层的分工（写在每份文件头部，别混）：
 *   · 读屏（画面硬字幕）= 人读原文，可引用，但只覆盖有字幕的时刻
 *   · 语音识别（本文件的正文）= 覆盖全时长，有字级错误（口音/术语），未逐字校对
 *
 * 用法:
 *   node scripts/asr/export_transcripts.js            # 生成 sources/transcripts/lec-NN.md + 索引
 *   node scripts/asr/export_transcripts.js --check    # 只比对，不写；不一致退出码 1
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const MAT = path.join(ROOT, 'standards', 'materials', 'chenruchun-lectures');
const SRC = path.join(MAT, 'sources');
const ASR = path.join(SRC, 'asr');
const OUT = path.join(SRC, 'transcripts');
const CHECK = process.argv.includes('--check');
const DUP = new Map([[8, 6]]); // 合集第 8 条与第 6 条是同一份视频

const eps = JSON.parse(fs.readFileSync(path.join(SRC, 'episodes.json'), 'utf8')).episodes;
const files = fs.readdirSync(ASR).filter((f) => /^lec-\d+\.json$/.test(f)).sort();
const docs = new Map();
for (const f of files) {
  const no = Number(/lec-(\d+)\.json/.exec(f)[1]);
  docs.set(no, JSON.parse(fs.readFileSync(path.join(ASR, f), 'utf8')));
}

const pad = (n) => String(n).padStart(2, '0');
const mmss = (sec) => `${Math.floor(sec / 60)}:${pad(Math.round(sec % 60))}`;

const made = [];
const mismatch = [];
for (const ep of eps) {
  const srcNo = DUP.get(ep.no) || ep.no;
  const doc = docs.get(srcNo);
  if (!doc) continue;
  const cov = ep.dur ? doc.audioSec / ep.dur : 0;
  const chars = doc.segments.reduce((a, s) => a + s.text.length, 0);
  const lines = [];
  lines.push(`# 陈瑞春讲伤寒论 ${ep.no} · ${ep.title.replace(/^陈瑞春讲伤寒论\d+-/, '')}`);
  lines.push('');
  lines.push('> 本文件是**语音识别正文**（faster-whisper large-v3-turbo，16kHz 单声道，VAD + beam_size=5），');
  lines.push('> 覆盖全时长，**未逐字校对**：口音与中医术语存在字级错误（例「吴鞠通」→「吴九通」、「温病条辨」→「温病条变」）。');
  lines.push('> 引用请优先用画面硬字幕（`sources/subtitle-samples*.json`）；本文件用于检索「哪一刻讲了什么」，不是引文。');
  lines.push('');
  lines.push('| 项 | 值 |');
  lines.push('|---|---|');
  lines.push(`| 源 | [${ep.bvid}](https://www.bilibili.com/video/${ep.bvid}/) · cid ${ep.cid} |`);
  lines.push(`| 页面时长 | ${ep.dur}s（${Math.floor(ep.dur / 60)} 分 ${ep.dur % 60} 秒） |`);
  lines.push(`| 转写音频 | ${doc.audioSec.toFixed(1)}s · 覆盖率 **${(cov * 100).toFixed(2)}%** |`);
  lines.push(`| 模型 / 速度 | ${doc.model} · ${doc.speed ? `${doc.speed}×` : '—'}（墙钟 ${Math.round((doc.wallSec || 0) / 60)} 分钟） |`);
  lines.push(`| 规模 | ${doc.segments.length} 段 · ${chars} 字 |`);
  if (ep.no === 8) lines.push(`| 说明 | 合集第 8 条与第 6 条是同一份视频（抽帧统计逐位相同），正文复用第 ${srcNo} 讲 |`);
  lines.push('');
  lines.push(`生成：\`node scripts/asr/export_transcripts.js\` · 源 JSON：\`sources/asr/lec-${pad(srcNo)}.json\``);
  lines.push('');
  lines.push('---');
  lines.push('');
  for (const s of doc.segments) {
    const t = String(s.text || '').trim();
    if (!t) continue;
    lines.push(`**[${mmss(s.start)}]** ${t}`);
    lines.push('');
  }
  const body = `${lines.join('\n')}\n`;
  const name = `lec-${pad(ep.no)}.md`;
  const file = path.join(OUT, name);
  const old = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  if (old === body) {
    made.push({ no: ep.no, name, seg: doc.segments.length, chars, cov, bytes: Buffer.byteLength(body), same: true });
  } else if (CHECK) {
    mismatch.push(name);
    made.push({ no: ep.no, name, seg: doc.segments.length, chars, cov, bytes: Buffer.byteLength(body), same: false });
  } else {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(file, body, 'utf8');
    made.push({ no: ep.no, name, seg: doc.segments.length, chars, cov, bytes: Buffer.byteLength(body), same: false });
  }
}

// 索引：一份能一眼看完 24 讲状态的表（按讲次排序，不按 episodes.json 的原始顺序）
made.sort((a, b) => a.no - b.no);
const idx = [];
idx.push('# 陈瑞春讲伤寒论 · 语音识别正文索引');
idx.push('');
idx.push(`共 ${made.length} 份文本（合集 24 条，第 8 条与第 6 条同源复用）。每份都是\`sources/asr/lec-NN.json\`的可读导出，`);
idx.push('数字由脚本次次重算：段落数、字数、音频覆盖率。');
idx.push('');
idx.push('| 讲次 | 时长 | 覆盖率 | 段 | 字 | 文本 |');
idx.push('|---|---|---|---|---|---|');
for (const m of made) {
  const ep = eps.find((e) => e.no === m.no);
  idx.push(`| ${m.no} | ${Math.floor(ep.dur / 60)}:${pad(ep.dur % 60)} | ${(m.cov * 100).toFixed(2)}% | ${m.seg} | ${m.chars} | [${m.name}](${m.name})${m.no === 8 ? '（复用第 6 讲）' : ''} |`);
}
idx.push('');
const uniq = made.filter((m) => m.no !== 8); // 第 8 条复用第 6 条，不重复计数
idx.push(`合计 ${uniq.length} 份不同正文 · ${uniq.reduce((a, m) => a + m.chars, 0)} 字 · ${uniq.reduce((a, m) => a + m.seg, 0)} 段 · ${uniq.reduce((a, m) => a + (eps.find((e) => e.no === m.no).dur), 0)} 秒页面时长（第 8 条不计，避免同一份正文算两遍）。`);
idx.push('');
idx.push('术语校正层见 `corrected/README.md` —— 只替换方名错形，本目录的原文本不动。');
const indexBody = `${idx.join('\n')}\n`;
const indexFile = path.join(OUT, 'README.md');
const oldIndex = fs.existsSync(indexFile) ? fs.readFileSync(indexFile, 'utf8') : null;
if (oldIndex !== indexBody && !CHECK) {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(indexFile, indexBody, 'utf8');
}
if (CHECK && oldIndex !== indexBody) mismatch.push('README.md');

const tot = uniq.reduce((a, m) => a + m.chars, 0);
const totSeg = uniq.reduce((a, m) => a + m.seg, 0);
const minCov = Math.min(...made.map((m) => m.cov));
console.log(`═══ 语音识别正文导出 ═══`);
console.log(`  ${made.length} 份（${uniq.length} 份不同正文，第 8 条复用第 6 条）· ${totSeg} 段 · ${tot} 字 · 最低覆盖率 ${(minCov * 100).toFixed(2)}%`);
console.log(`  → ${path.relative(ROOT, OUT)}/lec-NN.md（索引 README.md）`);
if (CHECK) {
  if (mismatch.length) {
    console.error(`  ✗ ${mismatch.length} 份与当前 JSON 不一致：${mismatch.slice(0, 5).join('、')}${mismatch.length > 5 ? ' …' : ''}`);
    console.error('    跑一遍不带 --check 的命令重新生成');
    process.exit(1);
  }
  console.log('  ✅ 全部与 sources/asr/*.json 一致（无漂移）');
}
