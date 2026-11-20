#!/usr/bin/env node
/**
 * textbooks/cover.js —— 五卷封面图（EPUB --epub-cover-image 用）
 *
 *   const { renderCover } = require('./cover');
 *   const r = renderCover(volume, outPng);   // → { ok, path?, reason? }
 *
 * 为什么封面由脚本生成而不是手放一张 PNG：
 *   五卷的封面必须同源（同一套字体、同一套版式、同一份卷次与字数），
 *   手放的图一旦某卷加章，封面上的「N 章 / M 字」就会静默过期。
 *   这里每次出书都按实测数字重画，封面与书内数字不可能对不上。
 *
 * 为什么走无头浏览器截图而不是 canvas / SVG 直出：
 *   与 textbooks/build_book.js 的单文件书 HTML 同一原则 —— 用系统已有的
 *   Edge/Chrome 渲染，字体就是读者看到的字体，零新增依赖（见 platform/pipeline/find_tools.js）。
 *   服务端画字要引入 canvas/cairo，中文字体还得另配，反而更脆。
 *
 * 缺浏览器时**不生成占位封面**：返回 ok:false 并给出原因，由调用方决定
 * 「无封面出 EPUB（pandoc 允许）」还是「直接失败」。绝不写一张灰图充数。
 */

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const tools = require(path.join(ROOT, 'platform', 'pipeline', 'find_tools.js'));

const W = 800;
const H = 1200;

const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 五卷封面 HTML。stats 为实测章数/字数，不传则只排卷次与主题。 */
function coverHtml(volume, stats = {}) {
  const sems = volume.semesters.join('、');
  const statLine = stats.chapters
    ? `${stats.subjects ? `${stats.subjects} 门学科 · ` : ''}${stats.chapters} 章 · ${Number(stats.words || 0).toLocaleString('en-US')} 字`
    : '';
  return `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><style>
  @page { margin: 0 }
  * { box-sizing: border-box }
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden }
  body {
    background: #0d0a07;
    color: #f2e6d2;
    font-family: "Noto Serif SC", "Source Han Serif CN", "Songti SC", "SimSun", serif;
    display: flex; flex-direction: column;
    padding: 76px 68px 64px;
  }
  .top {
    display: flex; align-items: center; gap: 18px;
    font-size: 17px; letter-spacing: .42em; color: #c8a06a;
    text-transform: none;
  }
  .rule { flex: 1; height: 1px; background: linear-gradient(to right, #8a5a2b, #2a2218) }
  .glyph { font-size: 92px; margin: 78px 0 6px; line-height: 1; }
  .vol {
    font-size: 26px; letter-spacing: .3em; color: #c8a06a; margin-bottom: 26px;
  }
  h1 {
    font-size: 62px; line-height: 1.24; margin: 0 0 26px; font-weight: 600;
    letter-spacing: .04em;
  }
  .sub {
    font-size: 23px; line-height: 1.7; color: #d9c9ad; margin: 0 0 34px;
    border-left: 3px solid #8a5a2b; padding-left: 18px;
  }
  .spacer { flex: 1 }
  .stat { font-size: 19px; color: #bfae92; letter-spacing: .06em; line-height: 1.9 }
  .meta { font-size: 16px; color: #8d7d66; margin-top: 14px; line-height: 1.8 }
  .foot {
    margin-top: 44px; padding-top: 26px; border-top: 1px solid #2a2218;
    font-size: 16px; color: #a1907a; line-height: 1.75;
  }
</style></head>
<body>
  <div class="top"><span>中医药 · 从零工程</span><span class="rule"></span><span>教材</span></div>
  <div class="glyph">${esc(volume.glyph || '☯')}</div>
  <div class="vol">第 ${esc(volume.n)} 卷</div>
  <h1>${esc(volume.title)}</h1>
  <div class="sub">${esc(volume.subtitle)}</div>
  <div class="spacer"></div>
  <div class="stat">${esc(statLine)}</div>
  <div class="meta">覆盖第 ${esc(sems)} 学期 · ${esc((volume.audience || '').split('+')[0].trim())}</div>
  <div class="foot">本教材仅用于教育与科研，不构成临床诊疗建议。任何基于本教材内容的临床决策，必须由具备合法执业资格的医师复核。</div>
</body></html>`;
}

/**
 * 渲染封面到 outPng。返回 { ok, path, reason }。
 * @param {object} volume volumes.json 里的一卷
 * @param {string} outPng 目标 PNG 绝对路径
 * @param {object} stats  { chapters, words, subjects } 实测数字（由 build_book 传入）
 */
function renderCover(volume, outPng, stats = {}) {
  const browser = tools.findBrowser();
  if (!browser) {
    return { ok: false, reason: '未找到 Edge / Chrome（封面需要无头浏览器截图）' };
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tcm-cover-'));
  const htmlPath = path.join(tmpDir, 'cover.html');
  const profileDir = path.join(tmpDir, 'profile');
  fs.writeFileSync(htmlPath, coverHtml(volume, stats), 'utf8');
  fs.mkdirSync(profileDir, { recursive: true });
  fs.mkdirSync(path.dirname(outPng), { recursive: true });

  const url = `file:///${htmlPath.replace(/\\/g, '/')}`;
  const r = spawnSync(browser, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--force-device-scale-factor=2',
    `--user-data-dir=${profileDir}`,
    `--window-size=${W},${H}`,
    '--virtual-time-budget=1200',
    `--screenshot=${outPng}`,
    url,
  ], { encoding: 'utf8', timeout: 60000 });

  const created = fs.existsSync(outPng) && fs.statSync(outPng).size > 8000;
  try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* 临时目录清不掉不影响产物 */ }
  if (!created) {
    const err = String(r.stderr || '').trim().split('\n').slice(-2).join(' | ');
    return { ok: false, reason: `截图失败 (exit ${r.status})${err ? `: ${err}` : ''}` };
  }
  return { ok: true, path: outPng };
}

module.exports = { renderCover, coverHtml, W, H };
