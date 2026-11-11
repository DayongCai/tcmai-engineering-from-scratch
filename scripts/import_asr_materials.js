#!/usr/bin/env node
/**
 * scripts/import_asr_materials.js —— 讲课录像转写 → 材料库产物（md / content.json / source-map.json / registry）
 *
 *   node scripts/import_asr_materials.js            # 全部已转写的 slug
 *   node scripts/import_asr_materials.js gainian-lectures
 *
 * 输入：standards/materials/<slug>/sources/asr/<slug>.json（merge_chunks.js 产物）
 * 输出：<slug>/<title>.md、<slug>/content.json、<slug>/source-map.json、registry.json 条目
 *
 * 口径：
 *   · 分段按 300 秒（5 分钟）切块，块内按句拼接，**不补标点、不改字**（ASR 原文照录）。
 *   · md 里每块给绝对时间（hh:mm:ss–hh:mm:ss），便于回视频核对。
 *   · 转写质量以「原文可回听」为唯一标准；不做术语纠错，纠错另走 corrections 流程。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const MATERIALS = path.join(ROOT, 'standards', 'materials');
const REGISTRY = path.join(MATERIALS, 'registry.json');

/** slug → 标题（新增录像时在这里登记） */
const TITLES = {
  'gainian-lectures': '中医概念与辨证思维讲课录像',
  'qiqing-lectures': '七情治病讲课录像',
  'shanghan-lectures': '伤寒论讲课录像',
  'neijing-lectures': '黄帝内经讲课录像',
};

const SECTION_SEC = 300;

const hms = (s) => {
  const t = Math.round(s);
  return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map((n) => String(n).padStart(2, '0')).join(':');
};

function buildSections(segments) {
  const out = [];
  let cur = null;
  for (const seg of segments) {
    const idx = Math.floor(seg.start / SECTION_SEC);
    if (!cur || cur.index !== idx) {
      cur = { index: idx, start: idx * SECTION_SEC, end: (idx + 1) * SECTION_SEC, texts: [] };
      out.push(cur);
    }
    cur.texts.push(seg.text);
  }
  return out.map((s) => ({
    index: s.index,
    start: s.start,
    end: s.end,
    startLabel: hms(s.start),
    endLabel: hms(s.end),
    paragraphs: s.texts,
    chars: s.texts.join('').length,
  }));
}

function main() {
  const only = process.argv[2];
  const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  const targets = Object.keys(TITLES).filter((s) => !only || s === only);

  const done = [];
  for (const slug of targets) {
    const src = path.join(MATERIALS, slug, 'sources', 'asr', `${slug}.json`);
    if (!fs.existsSync(src)) {
      console.log(`[${slug}] 未转写，跳过`);
      continue;
    }
    const j = JSON.parse(fs.readFileSync(src, 'utf8'));
    const buf = fs.readFileSync(src);
    const title = TITLES[slug];
    const sections = buildSections(j.segments);
    const chars = sections.reduce((a, s) => a + s.chars, 0);

    // md
    const lines = [
      `# ${title}`,
      '',
      '> 由 `scripts/import_asr_materials.js` 从讲课录像转写生成，**请勿手改**；重跑转写后重新生成。',
      '',
      `> 源：\`sources/asr/${slug}.json\` · 音频 ${(j.audioSec / 3600).toFixed(2)} 小时 · ${j.segments.length} 句 · ${chars} 字`,
      '',
      `> 转写：${j.model} · 语言 ${j.language} · 分段 ${j.counts.chunks} 段 · 平均 ${j.speed}× 实时`,
      '',
      '> 口径：ASR 原文照录，未补标点、未改字；每块给绝对时间，可回视频核对。转写错误按「原文可回听」判断，不做静默纠错。',
      '',
    ];
    for (const s of sections) {
      lines.push(`## ${s.startLabel}–${s.endLabel}`, '', s.paragraphs.join(' '), '');
    }
    fs.writeFileSync(path.join(MATERIALS, slug, `${title}.md`), lines.join('\n'), 'utf8');

    // content.json
    fs.writeFileSync(path.join(MATERIALS, slug, 'content.json'), JSON.stringify({
      slug, title, shape: 'asr', language: j.language,
      counts: { sections: sections.length, segments: j.segments.length, chars },
      sections,
    }, null, 1), 'utf8');

    // source-map.json
    fs.writeFileSync(path.join(MATERIALS, slug, 'source-map.json'), JSON.stringify({
      $generated: 'node scripts/import_asr_materials.js',
      slug, title,
      source: { file: `sources/asr/${slug}.json`, origin: '桌面讲课录像（mp4）ASR', sha256: crypto.createHash('sha256').update(buf).digest('hex'), bytes: buf.length },
      shape: { body: 'asr', sectionSec: SECTION_SEC },
      counts: { sections: sections.length, segments: j.segments.length, chars },
      audioSec: j.audioSec, speed: j.speed, model: j.model,
    }, null, 1), 'utf8');

    // registry 条目（按 slug 覆盖）
    const idx = registry.materials.findIndex((m) => m.slug === slug);
    const entry = { slug, title, file: `${slug}.json`, shape: 'asr', sections: sections.length, units: j.segments.length, chars, empty: 0 };
    if (idx >= 0) registry.materials[idx] = entry;
    else registry.materials.push(entry);

    console.log(`[${slug}] ${title}：${sections.length} 块 · ${j.segments.length} 句 · ${chars} 字`);
    done.push(slug);
  }

  registry.totals = {
    materials: registry.materials.length,
    sections: registry.materials.reduce((a, m) => a + (m.sections || 0), 0),
    units: registry.materials.reduce((a, m) => a + (m.units || 0), 0),
    chars: registry.materials.reduce((a, m) => a + (m.chars || 0), 0),
  };
  fs.writeFileSync(REGISTRY, JSON.stringify(registry, null, 2) + '\n', 'utf8');
  console.log(`registry：${registry.totals.materials} 份 · ${registry.totals.sections} 节 · ${registry.totals.units} 单元 · ${registry.totals.chars} 字`);
  if (!done.length) process.exit(0);
}

if (require.main === module) main();
module.exports = { buildSections, TITLES, hms };
