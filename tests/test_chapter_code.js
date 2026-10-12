#!/usr/bin/env node
/**
 * tests/test_chapter_code.js — 每个已建章节的代码必须真的能跑
 *
 * 对每个已建章节:
 *   1. node code/main.*         —— 退出码必须为 0
 *   2. node --test code/*.test.js —— 测试必须全部通过
 *   3. outputs/ 里至少有 1 个产出物
 *   4. 正文「验证」段给出的命令必须真实存在（防止文档里写了一条跑不了的命令）
 *
 * 这是本项目"每个'跑通了'的声明都必须能被复核"这条规则的执行者。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const { loadCurriculum, subjectStatus } = require('../scripts/lib');

const cur = loadCurriculum();
const flat = cur.departments.flatMap((d) => d.subjects);

/** 收集全部已建章节目录 */
function builtChapters() {
  const out = [];
  for (const s of flat) {
    const st = subjectStatus(s);
    if (st.built === 0) continue;
    const dir = path.join(ROOT, s.path, 'chapters');
    for (const name of fs.readdirSync(dir)) {
      const cdir = path.join(dir, name);
      if (!fs.statSync(cdir).isDirectory()) continue;
      if (!fs.existsSync(path.join(cdir, 'docs', 'zh.md'))) continue;
      out.push({ subject: s, slug: name, dir: cdir, rel: `${s.path}/chapters/${name}` });
    }
  }
  return out;
}

const chapters = builtChapters();

test('至少存在一个已建章节（否则本套件形同虚设）', () => {
  assert.ok(chapters.length > 0, '没有扫描到任何已建章节');
});

for (const c of chapters) {
  const codeDir = path.join(c.dir, 'code');
  const MAIN = ['.js', '.mjs', '.cjs'].map((e) => path.join(codeDir, `main${e}`)).find((p) => fs.existsSync(p));

  test(`[${c.slug}] code/main.* 存在且可被 require`, () => {
    assert.ok(MAIN, `${c.rel}/code/main.js 不存在`);
  });

  test(`[${c.slug}] node code/main.js 退出码为 0 且有实质输出`, () => {
    assert.ok(MAIN);
    const r = spawnSync(process.execPath, [MAIN], { encoding: 'utf8', cwd: c.dir, timeout: 60000 });
    assert.strictEqual(r.status, 0, `退出码 ${r.status}\n${r.stderr}`);
    const out = String(r.stdout || '');
    assert.ok(out.length > 80, `输出过短（${out.length} 字符），教学章节必须有可读的结论输出`);
    // 本项目要求每章输出里出现边界声明
    assert.ok(/不构成|教学|样例|非临床/.test(out), `输出里缺少临床边界声明:\n${out.slice(-300)}`);
  });

  test(`[${c.slug}] 单元测试全部通过`, () => {
    const tests = fs.existsSync(codeDir)
      ? fs.readdirSync(codeDir).filter((f) => /\.test\.(js|mjs|cjs)$/.test(f))
      : [];
    assert.ok(tests.length > 0, `${c.rel}/code 下没有 *.test.js`);
    for (const t of tests) {
      const r = spawnSync(process.execPath, ['--test', path.join(codeDir, t)], {
        encoding: 'utf8', cwd: c.dir, timeout: 120000,
      });
      const out = `${r.stdout || ''}${r.stderr || ''}`;
      assert.strictEqual(r.status, 0, `${t} 测试未通过:\n${out.split('\n').slice(-25).join('\n')}`);
      // 断言测试确实跑了，而不是空文件
      const pass = Number((out.match(/# pass (\d+)/) || [])[1] || 0);
      assert.ok(pass >= 5, `${t} 只有 ${pass} 项测试通过，契约要求 ≥5`);
    }
  });

  test(`[${c.slug}] outputs/ 至少 1 个产出物`, () => {
    const dir = path.join(c.dir, 'outputs');
    assert.ok(fs.existsSync(dir), `${c.rel}/outputs 不存在`);
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
    assert.ok(files.length >= 1, `${c.rel}/outputs 里没有 .md 产出物`);
  });

  test(`[${c.slug}] 正文「验证」段引用的命令真实存在`, () => {
    const zh = fs.readFileSync(path.join(c.dir, 'docs', 'zh.md'), 'utf8');
    const cmds = [...zh.matchAll(/node\s+(?:--test\s+)?(code\/[^\s`#]+)/g)].map((m) => m[1]);
    assert.ok(cmds.length > 0, `${c.rel} 的验证段没有给出可执行命令`);
    for (const cmd of cmds) {
      const p = path.join(c.dir, cmd);
      assert.ok(fs.existsSync(p), `${c.rel} 文档引用了不存在的文件: ${cmd}`);
    }
  });

  test(`[${c.slug}] 代码里引用的章节文档路径正确（防止复制粘贴后忘改）`, () => {
    if (!MAIN) return;
    const body = fs.readFileSync(MAIN, 'utf8');
    const refs = [...body.matchAll(/(departments\/[\w\u4e00-\u9fa5/-]+?\/chapters\/[\w-]+)\/docs\/zh\.md/g)].map((m) => m[1]);
    for (const ref of refs) {
      assert.strictEqual(ref, c.rel, `${c.rel} 的代码头部注释指向了别的章节: ${ref}`);
    }
  });
}
