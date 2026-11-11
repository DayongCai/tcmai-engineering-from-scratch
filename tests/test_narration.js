#!/usr/bin/env node
/**
 * tests/test_narration.js — [tcmP] 讲稿质量测试
 *
 * 讲稿是**给耳朵**的，而文档是给眼睛的。两者之间的转换（剥离代码/表格/Markdown、
 * 公式转可读文本）是成片流水线里最容易出错的一步 —— 错了不会报错，只会让旁白
 * 念出 "const gw 等于 左括号 0 逗号 0 右括号" 这种东西，而且只有人听了才发现。
 *
 * 所以这里断言的是「产生的讲稿能不能念」：
 *   - 不含代码块、表格、Markdown 标记、LaTeX 源码、裸图形 id、emoji
 *   - 每段都有非空 spoken（空段会让成片出现静默）
 *   - 段数与帧数、段序与角色序一致
 *   - 每集末尾是 disclaimer，且正文含免责措辞
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const coursesDir = path.join(ROOT, 'platform', 'courses');

/** 收集全部已生成的讲稿 */
function narrations() {
  const out = [];
  if (!fs.existsSync(coursesDir)) return out;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (e.name !== 'lesson.json') continue;
      out.push({ file: path.relative(ROOT, p), json: JSON.parse(fs.readFileSync(p, 'utf8')) });
    }
  };
  walk(coursesDir);
  return out;
}

const all = narrations();

test('至少存在一份讲稿（否则本套件形同虚设）', () => {
  assert.ok(all.length > 0, 'platform/courses 下没有讲稿；先跑 extract_narration.js');
});

test('每段都有非空的 spoken；含代码/表格/Markdown 的段必须与 text 不同', () => {
  const problems = [];
  // 纯散文段（motto / disclaimer 等）没有可剥离的内容，spoken 与 text 相同是正确的；
  // 只有**确实含**可剥离内容的段，spoken 才必须变短、变干净。
  const STRIPPABLE = [/```/, /^\s*\|/m, /\*\*/, /\[[^\]]+\]\([^)]+\)/, /^\s*#{1,6}\s/m, /`/, /\$[^$\n]+\$/];
  for (const { file, json } of all) {
    assert.ok(json.textVsSpoken, `${file}: 未声明 text / spoken 的区别`);
    for (const s of json.segments) {
      if (!s.spoken || s.spoken.trim().length < 2) problems.push(`${file} 第 ${s.n} 段 spoken 为空`);
      if (typeof s.estimateSeconds !== 'number' || s.estimateSeconds < 1) {
        problems.push(`${file} 第 ${s.n} 段缺时长估算`);
      }
      const hasStrippable = STRIPPABLE.some((re) => re.test(s.text));
      if (hasStrippable && s.spoken === s.text) {
        problems.push(`${file} 第 ${s.n} 段（${s.role}）含可剥离内容却未剥离`);
      }
    }
  }
  assert.deepStrictEqual(problems, [], problems.join('\n'));
});

test('spoken 里不含代码块、表格与 Markdown 标记', () => {
  const problems = [];
  const PATTERNS = [
    [/```/, '代码围栏'],
    [/^\s*\|/m, '表格行'],
    [/\*\*/, '粗体标记'],
    [/\[[^\]]+\]\([^)]+\)/, 'Markdown 链接'],
    [/^\s*#{1,6}\s/m, '标题标记'],
    [/`/, '行内代码标记'],
  ];
  for (const { file, json } of all) {
    for (const s of json.segments) {
      for (const [re, label] of PATTERNS) {
        if (re.test(s.spoken)) problems.push(`${file} 第 ${s.n} 段（${s.role}）残留${label}`);
      }
    }
  }
  assert.deepStrictEqual(problems, [], problems.join('\n'));
});

test('spoken 里不含 LaTeX 源码（公式须转成可读文本）', () => {
  const problems = [];
  for (const { file, json } of all) {
    for (const s of json.segments) {
      if (/\\[a-zA-Z]{2,}/.test(s.spoken)) {
        problems.push(`${file} 第 ${s.n} 段（${s.role}）残留 LaTeX: ${(s.spoken.match(/\\[a-zA-Z]{2,}[^\s]*/) || [])[0]}`);
      }
      if (/\$/.test(s.spoken)) problems.push(`${file} 第 ${s.n} 段（${s.role}）残留公式定界符 $`);
    }
  }
  assert.deepStrictEqual(problems, [], problems.join('\n'));
});

test('spoken 里不含 emoji（TTS 会念成「剪贴板」「锤子」或直接吞掉）', () => {
  const problems = [];
  const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;
  for (const { file, json } of all) {
    for (const s of json.segments) {
      if (EMOJI.test(s.spoken)) {
        problems.push(`${file} 第 ${s.n} 段残留 emoji: ${(s.spoken.match(EMOJI) || [])[0]}`);
      }
    }
  }
  assert.deepStrictEqual(problems, [], problems.join('\n'));
});

test('图形段的 spoken 不是图形 id（如 yin-yang-sigmoid）', () => {
  const problems = [];
  for (const { file, json } of all) {
    for (const s of json.segments) {
      if (s.role !== 'figure') continue;
      if (/^[a-z0-9-]+$/.test(s.spoken.trim())) {
        problems.push(`${file} 第 ${s.n} 段把图形 id 直接当旁白了: ${s.spoken}`);
      }
    }
  }
  assert.deepStrictEqual(problems, [], problems.join('\n'));
});

test('每集末尾是 disclaimer 段，且措辞含免责声明', () => {
  for (const { file, json } of all) {
    const last = json.segments[json.segments.length - 1];
    assert.strictEqual(last.role, 'disclaimer', `${file} 末段不是 disclaimer（实为 ${last.role}）`);
    assert.ok(/不构成[^\n]{0,20}(诊疗|临床)建议/.test(last.spoken), `${file} 免责措辞缺失: ${last.spoken}`);
  }
});

test('讲稿的段数与画面帧数一致（不一致会让配音与画面错位）', () => {
  const problems = [];
  for (const { file, json } of all) {
    const chapterDir = path.dirname(path.dirname(path.join(ROOT, file)));
    const framesDir = path.join(chapterDir, 'frames');
    if (!fs.existsSync(framesDir)) continue;                 // 未导帧的章节跳过
    const frames = fs.readdirSync(framesDir).filter((f) => /\.(png|jpg|jpeg)$/i.test(f));
    // 拆片之后「一段一帧」不再成立：帧跟着**片**走，片数由 slides/manifest.json 声明。
    // 有 manifest 就比片数，没有才比段数（老学科行为不变）。
    const manifestPath = path.join(chapterDir, 'slides', 'manifest.json');
    const expect = fs.existsSync(manifestPath)
      ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')).slideCount
      : json.segments.length;
    if (frames.length !== expect) {
      problems.push(`${file}: ${expect} ${fs.existsSync(manifestPath) ? '片' : '段'} vs ${frames.length} 帧`);
    }
  }
  assert.deepStrictEqual(problems, [], problems.join('\n'));
});

test('若已有配音文件，其数量不得超过段数（多余文件说明段序错位）', () => {
  const problems = [];
  for (const { file, json } of all) {
    const audioDir = path.join(path.dirname(path.join(ROOT, file)), 'audio');
    if (!fs.existsSync(audioDir)) continue;
    const audios = fs.readdirSync(audioDir).filter((f) => /\.(mp3|wav|m4a)$/i.test(f));
    if (audios.length > json.segments.length) {
      problems.push(`${file}: ${audios.length} 个配音文件 > ${json.segments.length} 段`);
    }
    // 命名必须补零到三位，否则 10.mp3 会排在 2.mp3 前面
    for (const a of audios) {
      if (!/^\d{3}\./.test(a)) problems.push(`${file}: 配音命名未补零 ${a}（排序会错）`);
    }
  }
  assert.deepStrictEqual(problems, [], problems.join('\n'));
});

test('时长估算只基于可朗读文本（代码块不计入念稿时长）', () => {
  const problems = [];
  for (const { file, json } of all) {
    const spokenChars = json.segments.reduce((a, s) => a + s.spoken.replace(/\s/g, '').length, 0);
    const sum = json.segments.reduce((a, s) => a + s.estimateSeconds, 0);
    // 估算速率常量是 4.6 字/秒，允许各段取整带来的少量偏差
    const expected = spokenChars / 4.6;
    if (Math.abs(sum - expected) > json.segments.length * 2) {
      problems.push(`${file}: 估算 ${sum}s 与可朗读字数 ${spokenChars} 不匹配（预期约 ${Math.round(expected)}s）`);
    }
  }
  assert.deepStrictEqual(problems, [], problems.join('\n'));
});
