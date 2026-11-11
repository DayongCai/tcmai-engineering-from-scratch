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

test('院系规模只能是 15 / 16 / 17 / 18 / 20 / 22 / 25 / 27（设计基准 + 扩科 + 补轮转/毕设）', () => {
  for (const d of cur.departments) {
    // 必修：15 = 八院系设计基准；20 = 针灸系扩科；25 = 护理系扩科；16 = 中医/智能各补一门；
    // 2026-10 每院系补第 9 学期轮转/专业实践 + 第 10 学期毕设，于是各 +2（17/18/22/27）。
    // 选修（元组第 9 位 elective）不占基准：它按内容相关性挂进院系，加几门都不该让必修规模报警。
    const required = d.subjects.filter((s) => !s.elective).length;
    assert.ok([15, 16, 17, 18, 20, 22, 25, 27].includes(required),
      `${d.title} 必修学科数为 ${required}，应为 15/16/17/18/20/22/25/27 之一`);
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
      // 第 9–10 学期承载的是轮转 / 专业实践 / 毕业设计，不是常规讲授学科：
      // 允许有课，但类型只能是 Clinic/Build，且课程名必须落在「轮转/实践/毕业设计」语义上。
      assert.ok(p.subjects.length > 0, `第 ${p.semester} 学期应安排轮转/毕设学科`);
      for (const s of p.subjects) {
        assert.ok(['Clinic', 'Build'].includes(s.type), `第 ${p.semester} 学期 ${s.slug} 类型 ${s.type} 不是轮转/毕设类`);
        assert.match(s.title, /轮转|实践|实习|实训|毕业设计/, `${s.slug}「${s.title}」不是轮转/毕设类课程`);
      }
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
    // 上限 52 是实测值：09-jichu 的章节目标沿用源教材章题，药理 49 章是源书真实章数。
    // 「6..16」是 tcmP 单章 10 分钟视频的经验值，不适用于按书抽的章目 —— 不压平数据去凑区间。
    // 2026-10-30 上限 52 → 60：病理生理学按讲义（Banasik 8th ed. 15 单元 53 章）成章，
    // 53 是源体系的真实章数；为了守住 52 而砍一章，就是把数据压平去迁就区间。
    assert.ok(s.chapters >= 6 && s.chapters <= 60, `${s.slug} 章节数 ${s.chapters} 超出 6..60 的合理区间`);
  }
  assert.ok(cur.counts.hours > 5000 && cur.counts.hours < 12000, `总学时 ${cur.counts.hours} 不合理`);
  assert.ok(cur.counts.chapters > 900 && cur.counts.chapters < 2200, `总章节 ${cur.counts.chapters} 不合理`);
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
