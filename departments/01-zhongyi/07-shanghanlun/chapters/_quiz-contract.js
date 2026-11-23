'use strict';
/**
 * 章节 quiz 结构契约（各章 code/main.test.js 共用）
 *
 * 判据与 scripts/check_chapter_exercises.js 同源，另加两条本章自定的：
 *   · 题量 ≥5，pre / check / post 三段齐，每题 4 个互不相同的选项
 *   · explain ≥30 汉字（`explain` 字段，空或占位即失败）
 *   · 至少 2 道 check 题的正确选项含 ≥4 汉字片段，且该片段在当章 docs/zh.md 里出现（接地）
 *   · 正确答案下标至少覆盖 3 个位置（打散，不许一边倒）
 */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');
const test = require('node:test');

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const hanzi = (s) => (String(s || '').match(HANZI) || []).length;

function shingles(text, n = 4) {
  const clean = String(text || '').replace(/[^\u4e00-\u9fff]/g, ' ');
  const out = new Set();
  for (const seg of clean.split(/\s+/)) {
    for (let i = 0; i + n <= seg.length; i += 1) out.add(seg.slice(i, i + n));
  }
  return out;
}

function quizContract(dir) {
  // 允许传章目录，也允许传 code/（测试文件所在目录）——两种写法都落到章根
  const chapterDir = path.basename(dir) === 'code' ? path.dirname(dir) : dir;
  const quizPath = path.join(chapterDir, 'quiz.json');
  const docPath = path.join(chapterDir, 'docs', 'zh.md');

  test('quiz：≥5 题、三段齐、每题 4 选项', () => {
    const q = JSON.parse(fs.readFileSync(quizPath, 'utf8'));
    const qs = q.questions || [];
    assert.ok(qs.length >= 5, `题数 ${qs.length}`);
    const stages = new Set(qs.map((x) => x.stage));
    for (const s of ['pre', 'check', 'post']) assert.ok(stages.has(s), `缺 ${s} 段`);
    for (const [i, item] of qs.entries()) {
      assert.strictEqual(item.options.length, 4, `第 ${i + 1} 题不是 4 选项`);
      assert.strictEqual(new Set(item.options).size, 4, `第 ${i + 1} 题选项重复`);
      assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct < 4, `第 ${i + 1} 题 correct 非法`);
    }
  });

  test('quiz：explain ≥30 汉字，答案下标打散（≥3 个位置）', () => {
    const qs = JSON.parse(fs.readFileSync(quizPath, 'utf8')).questions || [];
    for (const [i, item] of qs.entries()) {
      assert.ok(hanzi(item.explain) >= 30, `第 ${i + 1} 题 explain 只有 ${hanzi(item.explain)} 汉字`);
    }
    const idx = new Set(qs.map((x) => x.correct));
    assert.ok(idx.size >= 3, `正确答案只落在 ${idx.size} 个下标上`);
  });

  test('quiz：≥2 道 check 题的正确选项在正文里能找到原词（接地）', () => {
    const qs = JSON.parse(fs.readFileSync(quizPath, 'utf8')).questions || [];
    const body = shingles(fs.readFileSync(docPath, 'utf8'));
    const grounded = qs.filter((item) => {
      if (item.stage !== 'check') return false;
      const right = String(item.options[item.correct] || '');
      return [...shingles(right)].some((g) => body.has(g));
    });
    assert.ok(grounded.length >= 2, `接地 check 只有 ${grounded.length} 道`);
  });
}

module.exports = { quizContract, shingles, hanzi };
