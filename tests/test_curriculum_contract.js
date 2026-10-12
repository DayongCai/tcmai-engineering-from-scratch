#!/usr/bin/env node
/**
 * tests/test_curriculum_contract.js — 课程结构与章节契约测试
 *
 * 作为 CI 门的一部分：直接复用 scripts/audit_curriculum.js 作为唯一判定源，
 * 再补充 curriculum.json 自身的不变量断言（审计脚本检查的是"能不能建"，这里检查"建得对不对"）。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const { loadCurriculum, semesterPlan, subjectStatus } = require('../scripts/lib');

const cur = loadCurriculum();
const flat = cur.departments.flatMap((d) => d.subjects);

test('审计脚本必须通过（唯一的契约判定源）', () => {
  const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'audit_curriculum.js')], {
    encoding: 'utf8',
    cwd: ROOT,
  });
  assert.strictEqual(r.status, 0, `audit 未通过:\n${r.stdout}\n${r.stderr}`);
});

test('计数不变量：声明值与实际展开值一致', () => {
  assert.strictEqual(cur.departments.length, cur.domain.scale.departments, '院系数不一致');
  assert.strictEqual(flat.length, cur.domain.scale.subjects, '学科数不一致');
  assert.strictEqual(cur.counts.stages, 5, '阶段数应为 5（生长壮老已）');
});

test('每院系 15 门学科（设计基准）', () => {
  for (const d of cur.departments) {
    assert.strictEqual(d.subjects.length, 15, `${d.title} 学科数为 ${d.subjects.length}，设计基准为 15`);
  }
});

test('学科目录名全局唯一且符合 NN-slug 规范', () => {
  const seen = new Set();
  for (const s of flat) {
    assert.ok(!seen.has(s.slug), `学科目录名重复: ${s.slug}`);
    seen.add(s.slug);
    assert.match(s.slug, /^\d{2}-[a-z0-9-]+$/, `${s.slug} 不符合 NN-english-slug 规范`);
  }
  assert.ok(seen.size > 0);
});

test('院系目录名符合 NN-slug 规范且序号连续', () => {
  cur.departments.forEach((d, i) => {
    assert.match(d.slug, /^\d{2}-[a-z0-9-]+$/, `${d.slug} 不规范`);
    assert.strictEqual(d.n, i + 1, `院系序号不连续: ${d.slug}`);
  });
});

test('类型取值只在白名单内，且四类都有分布', () => {
  const valid = new Set(['Core', 'Build', 'Reference', 'Clinic']);
  const dist = {};
  for (const s of flat) {
    assert.ok(valid.has(s.type), `${s.slug} 类型非法: ${s.type}`);
    dist[s.type] = (dist[s.type] || 0) + 1;
  }
  for (const t of valid) {
    assert.ok(dist[t] > 0, `类型 ${t} 没有任何学科，课程设计不均衡`);
  }
});

test('学期落在 1..10；第 1–8 学期排有常规学科，第 9–10 为临床轮转/毕设', () => {
  const plan = semesterPlan(cur);
  assert.strictEqual(plan.length, cur.domain.scale.semesters);
  for (const p of plan) {
    assert.ok(p.semester >= 1 && p.semester <= 10);
    if (p.semester <= 8) {
      assert.ok(p.subjects.length > 0, `第 ${p.semester} 学期没有安排任何学科`);
    } else {
      assert.strictEqual(p.subjects.length, 0, `第 ${p.semester} 学期应为临床轮转/毕设，不应排常规学科`);
    }
  }
});

test('每个学科的 bridge（中医→AI 桥梁）非空且有实质内容', () => {
  for (const s of flat) {
    assert.ok(s.bridge && s.bridge.length >= 4, `${s.slug} 缺 bridge 说明`);
    assert.ok(/→/.test(s.bridge), `${s.slug} 的 bridge 未使用 → 表示对应关系: ${s.bridge}`);
  }
});

test('学时与章节数为正整数，总量落在合理区间', () => {
  for (const s of flat) {
    assert.ok(Number.isInteger(s.hours) && s.hours > 0, `${s.slug} 学时非法`);
    assert.ok(Number.isInteger(s.chapters) && s.chapters > 0, `${s.slug} 章节数非法`);
    assert.ok(s.chapters >= 6 && s.chapters <= 16, `${s.slug} 章节数 ${s.chapters} 超出 6..16 的合理区间`);
  }
  assert.ok(cur.counts.hours > 5000 && cur.counts.hours < 12000, `总学时 ${cur.counts.hours} 不合理`);
  assert.ok(cur.counts.chapters > 900 && cur.counts.chapters < 1400, `总章节 ${cur.counts.chapters} 不合理`);
});

test('已落盘的学科都带 README.md / meta.json / chapters.json', () => {
  for (const s of flat) {
    const dir = path.join(ROOT, s.path);
    if (!fs.existsSync(dir)) continue;
    for (const f of ['README.md', 'meta.json', 'chapters.json']) {
      assert.ok(fs.existsSync(path.join(dir, f)), `${s.path} 缺 ${f}`);
    }
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'meta.json'), 'utf8'));
    assert.strictEqual(meta.slug, s.slug, `${s.path} meta.json slug 不匹配`);
    assert.strictEqual(meta.title, s.title, `${s.path} meta.json title 不匹配`);
    assert.ok(meta.platform && meta.textbook, `${s.path} meta.json 缺交付轨道字段`);
  }
});

test('已建章节的 quiz 恰好 1 pre + 3 check + 2 post', () => {
  let checked = 0;
  for (const s of flat) {
    const st = subjectStatus(s);
    if (st.built === 0) continue;
    const chaptersDir = path.join(ROOT, s.path, 'chapters');
    for (const name of fs.readdirSync(chaptersDir)) {
      const qp = path.join(chaptersDir, name, 'quiz.json');
      if (!fs.existsSync(qp)) continue;
      const q = JSON.parse(fs.readFileSync(qp, 'utf8'));
      const got = { pre: 0, check: 0, post: 0 };
      for (const item of q.questions) got[item.stage] = (got[item.stage] || 0) + 1;
      assert.deepStrictEqual(got, { pre: 1, check: 3, post: 2 }, `${s.path}/${name} quiz 题数分配错误: ${JSON.stringify(got)}`);
      assert.strictEqual(q.questions.length, 6);
      for (const item of q.questions) {
        assert.strictEqual(item.options.length, 4, `${name} 选项数必须为 4`);
        assert.ok(Number.isInteger(item.correct) && item.correct >= 0 && item.correct <= 3);
        assert.ok(item.question && item.question.length > 6, `${name} 存在空题干`);
      }
      checked += 1;
    }
  }
  assert.ok(checked >= 0);
});

test('已建章节的 docs/zh.md 含四个必备关键词', () => {
  for (const s of flat) {
    const st = subjectStatus(s);
    if (st.built === 0) continue;
    const chaptersDir = path.join(ROOT, s.path, 'chapters');
    for (const name of fs.readdirSync(chaptersDir)) {
      const zh = path.join(chaptersDir, name, 'docs', 'zh.md');
      if (!fs.existsSync(zh)) continue;
      const body = fs.readFileSync(zh, 'utf8');
      for (const k of ['MOTTO', 'PROBLEM', '环境逼迫', '知识积累']) {
        assert.ok(body.includes(k), `${s.path}/${name} 缺 ${k}`);
      }
      // 每章都必须给出「丢失了什么」或「边界声明」，这是本项目的内容标准
      assert.ok(
        /丢掉了什么|丢失|边界声明|不构成/.test(body),
        `${s.path}/${name} 未声明翻译代价或临床边界`
      );
    }
  }
});
