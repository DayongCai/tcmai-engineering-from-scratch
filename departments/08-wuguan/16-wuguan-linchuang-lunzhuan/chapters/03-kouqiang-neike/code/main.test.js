'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const MAIN = path.join(__dirname, 'main.js');
const ROOT = path.join(__dirname, '..', '..', '..', '..', '..', '..');
const MAP = path.join(ROOT, 'standards', 'wuguan-linchuang-lunzhuan', 'chapter-map.json');
const {
  chapterKeys, chapterUnits, summarize, analyze, readDoc, hanzi, DOC,
  CHAPTER, SLUG, TITLE,
} = require('./main.js');

const hanziOf = (s) => (String(s || '').match(/[\u3400-\u4dbf\u4e00-\u9fff]/g) || []).length;
const plain = (s) => String(s || '').replace(/[^\u4e00-\u9fff]/g, ' ');

/** option 里出现在正文中的最长连续汉字片段长度 */
function groundLength(option, doc) {
  const body = plain(doc);
  let best = 0;
  for (const seg of plain(option).split(/\s+/).filter(Boolean)) {
    for (let i = 0; i < seg.length; i += 1) {
      for (let j = seg.length; j - i > best; j -= 1) {
        if (body.includes(seg.slice(i, j))) { best = j - i; break; }
      }
    }
  }
  return best;
}

test('章映射存在且非空', () => {
  const keys = chapterKeys();
  assert.ok(keys.length > 0, 'chapter-map 里本章没有单元');
});

test('单元都能在单元层找到，且带单元号与汉字数', () => {
  const units = chapterUnits();
  assert.strictEqual(units.length, chapterKeys().length);
  for (const u of units) {
    assert.ok(u.sub, '单元缺 sub');
    assert.ok(u.hanzi > 0, `单元 ${u.sub} 汉字数异常`);
  }
});

test('summarize 汉字数与逐单元相加一致', () => {
  const units = chapterUnits();
  const s = summarize(units);
  assert.strictEqual(s.hanzi, units.reduce((a, u) => a + u.hanzi, 0));
  assert.strictEqual(s.units, units.length);
  assert.ok(s.secs.length >= 1, '节号为空');
});

test('正文可读，规模过线', () => {
  const doc = readDoc();
  const r = analyze();
  assert.ok(hanzi(doc) >= 2500, `正文汉字过少：${hanzi(doc)}`);
  assert.ok(r.sections.length >= 4, `二级节过少：${r.sections.length}`);
  assert.ok(r.paragraphs >= 10, `段落过少：${r.paragraphs}`);
});

test('quiz 六题，pre1/check3/post2，每题四选项', () => {
  const q = analyze().quiz;
  assert.strictEqual(q.total, 6);
  assert.deepStrictEqual(q.stage, { pre: 1, check: 3, post: 2 });
  assert.ok(q.items.every((x) => x.options === 4), '有题不是四选项');
  assert.ok(q.items.every((x) => Number.isInteger(x.correct) && x.correct >= 0 && x.correct < 4), 'correct 下标非法');
});

test('check 题正确项逐字引正文（≥6 汉字连续）', () => {
  const doc = readDoc();
  const q = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  const checks = q.questions.filter((x) => x.stage === 'check');
  assert.strictEqual(checks.length, 3);
  for (const item of checks) {
    const g = groundLength(item.options[item.correct], doc);
    assert.ok(g >= 6, `正确项只在正文找到 ${g} 字连续片段：${item.options[item.correct]}`);
  }
});

test('每题解释 40–80 汉字', () => {
  const q = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'quiz.json'), 'utf8'));
  for (const item of q.questions) {
    const h = hanziOf(item.explain || item.explanation);
    assert.ok(h >= 40 && h <= 80, `解释 ${h} 汉字：${item.question}`);
  }
});

test('章号与标题同正文、章映射一致', () => {
  const cm = JSON.parse(fs.readFileSync(MAP, 'utf8')).chapters;
  assert.strictEqual(String(cm[SLUG].n), String(CHAPTER));
  const h1 = (readDoc().match(/^#\s*(.+)$/m) || [, ''])[1].trim();
  assert.strictEqual(TITLE, h1.replace(/^第\s*\d+\s*章\s*·\s*/, '').trim());
  assert.ok(fs.existsSync(DOC));
});

test('脚本可运行，输出含本章目录与边界声明', () => {
  const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', timeout: 60000 });
  assert.strictEqual(r.status, 0, r.stderr);
  const out = String(r.stdout || '');
  assert.ok(out.length > 200, '输出过短');
  assert.ok(out.includes('chapters/03-kouqiang-neike'), '输出未指向本章目录');
  assert.match(out, /不构成诊断或治疗依据/);
  assert.match(out, /quiz 6 题/);
});
