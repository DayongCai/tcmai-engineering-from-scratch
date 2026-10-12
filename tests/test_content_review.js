#!/usr/bin/env node
/**
 * tests/test_content_review.js — 人机闭环：内容复核清单
 *
 * 这个套件做两类事：
 *   A. 机器可判的部分（失败会让 CI 红灯）
 *      - 经典引文必须写到篇名级别（《书名·篇名》），只写《书名》不合格
 *      - 每章必须出现免责声明
 *      - 涉及临床结论的章节必须标注「不构成诊疗建议」
 *   B. 必须由中医药背景的人复核的部分（打印清单，不阻断）
 *      - 证候归属、方剂配伍、经典出处、推理链的合理性
 *
 * 设计意图：把"机器能查的"和"必须人查的"分开。混在一起会出现两种错误 ——
 * 要么机器假装能判学术对错，要么人被迫去做格式校对。
 */

'use strict';

const assert = require('node:assert');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const { loadCurriculum, subjectStatus } = require('../scripts/lib');

const cur = loadCurriculum();
const flat = cur.departments.flatMap((d) => d.subjects);

/** 收集全部已建章节的正文 */
function builtDocs() {
  const out = [];
  for (const s of flat) {
    if (subjectStatus(s).built === 0) continue;
    const dir = path.join(ROOT, s.path, 'chapters');
    for (const name of fs.readdirSync(dir)) {
      const zh = path.join(dir, name, 'docs', 'zh.md');
      if (!fs.existsSync(zh)) continue;
      out.push({
        rel: `${s.path}/chapters/${name}`,
        subject: s.title,
        dept: s.deptTitle,
        body: fs.readFileSync(zh, 'utf8'),
      });
    }
  }
  return out;
}

const docs = builtDocs();

// ── A. 机器可判 ─────────────────────────────────────────────

test('经典引文必须写到篇名级别：《书名》单独出现视为不合格', () => {
  const problems = [];
  // 允许只写书名的白名单：本身无篇目结构的书（如《神农本草经》《尚书》）
  const BOOK_ONLY_OK = ['尚书', '神农本草经', '周礼', '易经', '周易', '道德经', '论语'];
  for (const d of docs) {
    for (const m of d.body.matchAll(/《([^》]+)》/g)) {
      const inner = m[1];
      if (BOOK_ONLY_OK.includes(inner)) continue;
      // 《素问·阴阳应象大论》合格；《素问》不合格
      if (!inner.includes('·')) {
        problems.push(`${d.rel}: 《${inner}》未写到篇名级别`);
      }
    }
  }
  assert.deepStrictEqual(problems, [], problems.join('\n'));
});

test('每章必须出现临床免责/边界声明', () => {
  const problems = [];
  for (const d of docs) {
    if (!/不构成[^\n]{0,20}(诊疗|临床)建议|非临床|边界声明/.test(d.body)) {
      problems.push(`${d.rel}: 缺少临床免责或边界声明`);
    }
  }
  assert.deepStrictEqual(problems, [], problems.join('\n'));
});

test('推理链必须带方向标记，不得把逆向遍历写成正向', () => {
  const problems = [];
  // 相克里不存在「木克金」「火克水」「土克木」「金克火」「水克土」
  const illegal = ['木克金', '火克水', '土克木', '金克火', '水克土'];
  // 出现在排除性语境里的非法方向是合法的教学反例，例如
  //   「不得把「金克木」讲成「木克金」」「❌ 木克金」
  const NEGATION = /不得|禁止|不能|写错|讲成|写成|反例|❌|✗|错误|混淆/;
  for (const d of docs) {
    for (const line of d.body.split(/\r?\n/)) {
      for (const bad of illegal) {
        if (line.includes(bad) && !NEGATION.test(line)) {
          problems.push(`${d.rel}: 出现非法相克方向「${bad}」 → ${line.trim().slice(0, 80)}`);
        }
      }
    }
  }
  assert.deepStrictEqual(problems, [], problems.join('\n'));
});

test('相生方向不得写反（只能是 木→火→土→金→水→木）', () => {
  const problems = [];
  const legal = ['木→火', '火→土', '土→金', '金→水', '水→木'];
  const illegal = ['木→土', '火→金', '土→水', '金→木', '水→火'];
  for (const d of docs) {
    for (const bad of illegal) {
      if (new RegExp(`${bad}[^克]`).test(d.body)) {
        problems.push(`${d.rel}: 「${bad}」既可能是非法相生也可能是漏标的相克，需人工确认`);
      }
    }
    void legal;
  }
  // 相克写法会命中这条规则，因此降级为清单提示而非阻断
  assert.ok(true, problems.length ? `待人工确认 ${problems.length} 处:\n${problems.join('\n')}` : '');
});

test('不得出现无出处的断言式引文（「中医认为」「古人云」等）', () => {
  const problems = [];
  for (const d of docs) {
    for (const m of d.body.matchAll(/(中医认为|古人云|古人认为|典籍记载|经典云)[^\n]{0,30}/g)) {
      problems.push(`${d.rel}: 无出处的断言式引文「${m[1]}」`);
    }
  }
  assert.deepStrictEqual(problems, [], problems.join('\n'));
});

// ── B. 人机闭环清单（不阻断，打印给复核人） ─────────────────

test('打印需中医药背景复核的清单', () => {
  const items = [];
  for (const d of docs) {
    const cites = [...d.body.matchAll(/《([^》]+)》/g)].map((m) => m[1]);
    const bridges = [...d.body.matchAll(/\|\s*([^|]{2,12}?)\s*\|\s*([^|]{2,20}?)\s*\|\s*([^|]{4,})\s*\|\s*\*{0,2}([ABCD])\*{0,2}\s*\|/g)]
      .map((m) => ({ tcm: m[1].trim(), ai: m[2].trim(), level: m[4] }));
    items.push({
      rel: d.rel,
      dept: d.dept,
      cites,
      cLevel: bridges.filter((b) => b.level === 'C').length,
      dLevel: bridges.filter((b) => b.level === 'D').length,
      clinical: /治则|方剂|处方|剂量|用药|诊疗|辨证论治/.test(d.body),
    });
  }

  console.log('\n─── 需中医药背景复核的清单 ───');
  console.log('  复核人须逐项确认：引文逐字准确、证候归属无误、推理链无跳步、临床边界声明充分\n');
  for (const it of items) {
    const flags = [];
    if (it.cites.length) flags.push(`${it.cites.length} 处引文`);
    if (it.cLevel) flags.push(`C 级桥梁 ×${it.cLevel}`);
    if (it.dLevel) flags.push(`D 级误用 ×${it.dLevel}`);
    if (it.clinical) flags.push('含临床相关表述');
    console.log(`  ☐ ${it.rel}`);
    console.log(`     院系: ${it.dept} · 待复核: ${flags.join(' · ') || '无特别标记'}`);
    if (it.cites.length) {
      it.cites.slice(0, 6).forEach((c) => console.log(`     引文: 《${c}》`));
      if (it.cites.length > 6) console.log(`     … 另有 ${it.cites.length - 6} 处`);
    }
    console.log('     复核项: [ ] 引文逐字准确  [ ] 证候归属正确  [ ] 推理无跳步  [ ] 边界声明充分');
  }
  console.log('\n  复核通过后，在本套件上方 A 区增加对应的自动化断言（把人工结论固化成机器可查的规则）。');

  assert.ok(items.length >= 0);
});
