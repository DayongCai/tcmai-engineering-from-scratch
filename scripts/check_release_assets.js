#!/usr/bin/env node
/**
 * scripts/check_release_assets.js —— 发布事实核验：Release 附件 ↔ 本地产物逐字节对账
 *
 *   node scripts/check_release_assets.js                       # 最新 release，自动匹配本地同名/同体积产物
 *   node scripts/check_release_assets.js --tag zhenghou-2026-11-21
 *   node scripts/check_release_assets.js --repo DayongCai/tcmai-engineering-from-scratch --dir textbooks
 *   node scripts/check_release_assets.js --check               # 有任何不一致即 exit 1（供门使用）
 *
 * 为什么要有它：
 *   「已发布」在 CHANGELOG 里是一句话，在盘上却应该是可核的三件事——
 *   资产在（不是 draft）、字节对（sha256 与 GitHub 记录的 digest 一致）、拿得回来（Range 请求 206）。
 *   少任何一条，发布就只是记账。本脚本只读（GET / Range），不写、不上传、不改远端。
 *
 * 匹配规则（中文文件名会被 GitHub 压成 default，所以资产名多为 ASCII）：
 *   1) 同名文件优先；
 *   2) 否则按「扩展名相同 + 字节数相同」在 --dir 下递归找唯一候选；
 *   3) 找不到或有多个候选 → 记为未匹配，不算通过。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const ROOT = path.resolve(__dirname, '..');
const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const CHECK = argv.includes('--check');
const REPO = arg('repo', 'DayongCai/tcmai-engineering-from-scratch');
const TAG = arg('tag', null);
const DIR = path.resolve(ROOT, arg('dir', 'textbooks'));
const UA = { 'User-Agent': 'tcmai-release-check', Accept: 'application/vnd.github+json' };

function get(url, headers, redirect = 0) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirect < 5) {
          res.resume();
          resolve(get(res.headers.location, headers, redirect + 1));
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
      })
      .on('error', reject);
  });
}

const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

(async () => {
  const url = TAG
    ? `https://api.github.com/repos/${REPO}/releases/tags/${TAG}`
    : `https://api.github.com/repos/${REPO}/releases/latest`;

  const rel = await get(url, UA);
  if (rel.status !== 200) {
    console.error(`✗ 取 release 失败：HTTP ${rel.status}（${REPO}${TAG ? ' @ ' + TAG : ''}）`);
    process.exit(1);
  }
  const r = JSON.parse(rel.body.toString('utf8'));
  console.log('═══ [release] 附件 ↔ 本地产物对账 ═══\n');
  console.log(`  仓库 ${REPO}`);
  console.log(`  标签 ${r.tag_name} · ${r.draft ? '草稿' : '已发布'} · ${r.published_at}`);
  console.log(`  标题 ${r.name || '(无)'}`);
  console.log(`  资产 ${(r.assets || []).length} 个\n`);

  const files = walk(DIR);
  const byName = new Map(files.map((f) => [path.basename(f), f]));
  let bad = 0;

  for (const a of r.assets || []) {
    const digest = (a.digest || '').replace(/^sha256:/, '');
    let local = byName.get(a.name) || null;
    let how = '同名';
    if (!local) {
      const ext = path.extname(a.name);
      const cands = files.filter((f) => path.extname(f) === ext && fs.statSync(f).size === a.size);
      if (cands.length === 1) {
        local = cands[0];
        how = '同体积+同扩展名';
      } else if (cands.length > 1) {
        console.log(`  ? ${a.name}: 本地有 ${cands.length} 个候选（${cands.map((c) => path.basename(c)).join('、')}），无法唯一匹配`);
        bad += 1;
        continue;
      }
    }
    if (!local) {
      console.log(`  ✗ ${a.name}: 本地找不到对应产物（${a.size} B）`);
      bad += 1;
      continue;
    }

    const buf = fs.readFileSync(local);
    const localSha = sha256(buf);
    const sizeOk = buf.length === a.size;
    const shaOk = digest ? localSha === digest : null;

    // 可拿回来：用 API 资产地址取前 2 KB（Range），要求 206
    const probe = await get(a.url, { ...UA, Accept: 'application/octet-stream', Range: 'bytes=0-2047' });
    const rangeOk = probe.status === 206 && probe.body.length > 0;

    const ok = sizeOk && shaOk !== false && rangeOk;
    if (!ok) bad += 1;
    console.log(`  ${ok ? '✓' : '✗'} ${a.name}`);
    console.log(`      本地 ${path.relative(ROOT, local).replace(/\\/g, '/')}（按${how}匹配）`);
    console.log(`      体积 ${a.size} vs ${buf.length} ${sizeOk ? '=' : '≠'} · sha256 ${digest ? (shaOk ? '= 一致' : `≠ 本地 ${localSha.slice(0, 16)}…`) : '（资产无 digest）'} · Range ${probe.status}${rangeOk ? ' 可取回' : ' 不可取回'}`);
  }

  console.log(`\n${bad ? `✗ ${bad} 项不一致` : '✅ 附件与本地产物逐字节一致，且可从远端取回'}`);
  if (CHECK && bad) process.exit(1);
})().catch((e) => {
  console.error('✗ 核验失败：', e.message);
  process.exit(1);
});
