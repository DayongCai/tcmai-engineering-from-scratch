#!/usr/bin/env node
/**
 * tests/test_textbook_supplement.js —— 「补章」的登记门
 *
 * 为什么需要：教材章数少于教学计划时，有两种情况完全相反 ——
 *   ① 真的缺内容（教学计划要的章，教材没有）；
 *   ② 切分口径不同（教学按法规条文流程细分，教材按学科章组织）。
 * 不登记的后果是这两种被混成一句「缺 N 章」，然后有人去补 8 章与既有章逐句重复的稿子。
 *
 * 这道门要求三门「教材章 < 教学计划章」的课各有一份 `standards/<x>/补章登记.json`，并核：
 *   1. 登记项与磁盘一致：章号、文件、章数；
 *   2. 补章是「本库撰写层」，不许冒充源正文层；八节齐 · ≥1,800 汉字 · 免责句在 N.5 与思考题之间；
 *   3. 每条依据的 path 必须真实存在；篇名级依据必须有《书名·篇名》形态；
 *   4. 不补章的课必须写明口径与逐条映射，且映射的 probe 关键词能在所指教材章里真的 grep 到；
 *   5. 教材看板不再把这三门报 `chapters-short`（登记与看板同源，改一处必须两处都变）。
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));

let pass = 0;
let fail = 0;
const reds = [];
const ok = (n) => { pass += 1; console.log(`  ✅ ${n}`); };
const no = (n, why) => { fail += 1; reds.push(`${n} — ${why}`); console.log(`  ❌ ${n} — ${why}`); };

const LEDGERS = [
  'standards/shanghan/补章登记.json',
  'standards/neike/补章登记.json',
  'standards/yaoshi-guanli/补章登记.json',
  'standards/kouqiang-xiufu/补章登记.json',
  'standards/kouqiang-zhengji/补章登记.json',
  'standards/huli-yanjiu-zhengxun/补章登记.json',
  'standards/zhongyao-xinyao/补章登记.json',
  'standards/zhongyao-du-li/补章登记.json',
  'standards/jiankang-pinggu/补章登记.json',
  'standards/shuxue/补章登记.json',
  'standards/01-zhongyi-jichu-lilun/补章登记.json',
  'standards/02-yi-gu-wen/补章登记.json',
  'standards/03-zhongguo-yixue-shi/补章登记.json',
];
const NEED = ['## 本章要回答的问题', '## N.1 概念与出处', '## N.2 为什么可以这样翻译',
  '## N.3 这个翻译丢掉了什么', '## N.4 与相邻学科的接口', '## N.5 争议与本项目立场',
  '## 思考题', '## 延伸阅读'];
const BANNED = [/第\s*\d+\s*页/, /原书第/, /\[citation needed\]/i];

// ── 0. 三份登记都在 ───────────────────────────────────────────────────
const missing = LEDGERS.filter((p) => !exists(p));
if (missing.length) {
  console.log(`# pass 0\n# fail 1\n  RED 缺补章登记：${missing.join('、')}`);
  process.exit(1);
}
ok(`补章登记：${LEDGERS.length} 份齐全`);

const ledgers = LEDGERS.map((p) => ({ path: p, json: JSON.parse(read(p)) }));

// ── 1. 补章本体 ───────────────────────────────────────────────────────
{
  const bad = [];
  let total = 0;
  for (const { path: lp, json } of ledgers) {
    for (const ch of json.chapters || []) {
      total += 1;
      const tag = `${json.subject} 补章 ${ch.no}`;
      if (!exists(ch.file)) { bad.push(`${tag} 文件不存在 ${ch.file}`); continue; }
      const base = path.basename(ch.file);
      const nameNo = Number((base.match(/^\d+-第(\d+)章/) || [])[1]);
      if (nameNo !== ch.no) bad.push(`${tag} 章号与文件名不符（${base}）`);
      const t = read(ch.file);
      const head = t.split('\n').slice(0, 8).join('\n');
      for (const k of ['**层次**', '本库撰写层', '**依据**']) if (!head.includes(k)) bad.push(`${tag} 章首块缺「${k}」`);
      if (/本文件是\*\*源教材正文层\*\*/.test(head)) bad.push(`${tag} 冒充源正文层（本章无底本表）`);
      for (const n of NEED) if (!t.includes(n)) bad.push(`${tag} 缺「${n}」`);
      const hanzi = (t.match(/[\u4e00-\u9fff]/g) || []).length;
      if (hanzi < 1800) bad.push(`${tag} ${hanzi} 汉字 < 1800`);
      const i5 = t.indexOf('## N.5');
      const iq = t.indexOf('## 思考题');
      // 章首块里也常写一句「免责」，所以不能只取第一处：要求**存在一处**落在 N.5 与思考题之间
      const disIdx = [...t.matchAll(/不构成诊断/g)].map((m) => m.index);
      if (!disIdx.length) bad.push(`${tag} 缺免责句（须含「不构成诊断」）`);
      else if (!(i5 >= 0 && iq > i5 && disIdx.some((i) => i > i5 && i < iq))) {
        bad.push(`${tag} 免责句不在「N.5 之后、思考题之前」`);
      }
      for (const b of BANNED) if (b.test(t)) bad.push(`${tag} 出现不可核出处 ${b}`);

      // 依据
      const bases = ch.bases || [];
      if (bases.length < 2) bad.push(`${tag} 依据少于 2 条（补章必须至少 2 处可核依据）`);
      for (const b of bases) {
        if (b.path && !exists(b.path)) bad.push(`${tag} 依据文件不存在 ${b.path}`);
        if (b.kind === '经典' && !/《[^》]+·[^》]+》/.test(b.ref || '')) bad.push(`${tag} 经典依据不是《书名·篇名》级：${b.ref}`);
        if (!b.path && !b.ref) bad.push(`${tag} 依据条目既无 path 也无 ref`);
      }
    }
  }
  if (bad.length) no('补章本体', `${bad.length} 处，如 ${bad[0]}`);
  else ok(`补章本体：${total} 章 · 撰写层声明 · 八节齐 · ≥1,800 汉字 · 免责位置 · 依据可核`);
}

// ── 2. 章数对账（教学计划 == 磁盘教材章） ─────────────────────────────
{
  const bad = [];
  for (const { json } of ledgers) {
    const [dept, slug] = json.subject.split('/');
    const dir = path.join(ROOT, 'textbooks', dept, slug);
    const n = fs.existsSync(dir)
      ? fs.readdirSync(dir).filter((f) => /^\d+-第\d+章.*\.md$/.test(f)).length
      : 0;
    // 有补章 → 应补齐到教学计划章数；开稿（无底本表、从 0 起写）→ 应与登记里已写的章数一致；
    // 不补章 → 应等于登记里写明的「补后章数」（即现状，差的是口径）
    const written = (json.chapters || []).length;
    const expect = json.mode === '开稿' ? written
      : written ? json.teachingChapters : (json.textbookChaptersAfter ?? json.textbookChaptersBefore);
    if (n !== expect) bad.push(`${json.subject} 教材章 ${n} ≠ 登记期望 ${expect}`);
  }
  if (bad.length) no('章数对账', bad.join('；'));
  else ok('章数对账：教材章与登记一致（伤寒 12 · 内科 14 · 药事 20/28 已决口径 · 口腔修复 10/10 · 正畸 10/10 · 护理研究 8/8 · 中药新药研发 8/8 · 中药毒理学 10/10 · 健康评估 8/8）');
}

// ── 3. 不补章的课：口径 + 逐条映射 ────────────────────────────────────
{
  const bad = [];
  let mapped = 0;
  for (const { json } of ledgers) {
    if ((json.chapters || []).length) continue;
    const ns = json.noSupplement;
    if (!ns) { bad.push(`${json.subject} 没有补章也没有 noSupplement 说明`); continue; }
    for (const k of ['reason', 'verdict', 'mapping', 'verifiedBy']) if (!ns[k]) bad.push(`${json.subject} noSupplement 缺 ${k}`);
    if (!Array.isArray(ns.mapping) || ns.mapping.length !== json.teachingChapters) {
      bad.push(`${json.subject} 映射条数 ${ns.mapping ? ns.mapping.length : 0} ≠ 教学计划 ${json.teachingChapters}`);
      continue;
    }
    const [dept, slug] = json.subject.split('/');
    for (const m of ns.mapping) {
      mapped += 1;
      // 一条教学章可对应多个教材章（如「手三阴」↔ 肺/心/心包 三章）
      const nos = m.textbookChapters || [m.textbookChapter];
      const dir2 = path.join(ROOT, 'textbooks', dept, slug);
      let hitAny = false;
      for (const no of nos) {
        const files = fs.readdirSync(dir2).filter((f) => new RegExp(`^0?\\d+-第${no}章-`).test(f));
        if (!files.length) { bad.push(`${json.subject} 映射第 ${m.plan} 章 → 教材第 ${no} 章：该章文件不存在`); continue; }
        const t = fs.readFileSync(path.join(dir2, files[0]), 'utf8');
        if (t.includes(m.probe)) hitAny = true;
      }
      if (nos.length && !hitAny) bad.push(`${json.subject} 映射第 ${m.plan} 章：probe「${m.probe}」在所指教材章（${nos.join('、')}）里都找不到`);
      // 有章位落点的，还要求附录在（内容缺口补到附录，而不是靠加章凑数）
      if (m.appendix) {
        if (!fs.existsSync(path.join(ROOT, m.appendix))) bad.push(`${json.subject} 映射第 ${m.plan} 章：附录不存在 ${m.appendix}`);
        else if (!fs.readFileSync(path.join(ROOT, m.appendix), 'utf8').includes(m.appendixProbe || m.probe)) {
          bad.push(`${json.subject} 映射第 ${m.plan} 章：附录里找不到 probe「${m.appendixProbe || m.probe}」`);
        }
      }
    }
  }
  if (bad.length) no('口径与映射', `${bad.length} 处，如 ${bad[0]}`);
  else ok(`口径与映射：不补章的门已写明理由 · ${mapped} 条映射的 probe 全部可在所指教材章内查到`);
}

// ── 5. 与教材看板同源：不再报 chapters-short ──────────────────────────
{
  const bp = 'data/textbook-board.json';
  if (!exists(bp)) no('与看板同源', 'data/textbook-board.json 不存在（先跑 node scripts/build_textbook_board.js）');
  else {
    const board = JSON.parse(read(bp));
    const flagged = (board.exceptions || []).filter((e) => (e.flags || []).includes('chapters-short')).map((e) => e.slug);
    // 补了章的课必须从 chapters-short 里消失；登记为「口径差」的课允许继续留在例外里（它本来就少章）；
    // 登记为「开稿」的课只写成 1/10，留在例外里是**如实**，不要求消失
    const supplemented = ledgers
      .filter((l) => (l.json.chapters || []).length && l.json.mode !== '开稿')
      .map((l) => l.json.subject);
    const still = flagged.filter((s) => supplemented.includes(s));
    const openProg = flagged.filter((s) => ledgers.some((l) => l.json.subject === s && l.json.mode === '开稿'));
    if (still.length) no('与看板同源', `${still.length} 门已补章但仍被看板报「教材章 < 教学计划章」：${still.join('、')}——看板要同步重生成`);
    else ok(`与看板同源：已补章的课不再出现在 chapters-short 例外里（看板共 ${flagged.length} 条 = 开稿进度 ${openProg.length} + 其他 ${flagged.length - openProg.length}）`);
  }
}

// ── 6. 口径决案：已决口径必须字段齐、与补章登记对齐、与看板同源 ──────────
{
  const dp = 'standards/口径决案.json';
  if (!exists(dp)) no('口径决案', '缺 standards/口径决案.json（口径差必须留决案，不能只写在 README 里）');
  else {
    const dec = JSON.parse(read(dp)).decisions || [];
    const need = ['subject', 'title', 'decidedAt', 'teachingChapters', 'textbookChapters',
      'decision', 'rejectedOptions', 'evidence', 'reviewIf'];
    const bad = [];
    for (const d of dec) {
      for (const k of need) if (!d[k] || (Array.isArray(d[k]) && !d[k].length)) bad.push(`${d.subject || '?'} 缺 ${k}`);
      if (Array.isArray(d.rejectedOptions) && d.rejectedOptions.some((o) => !o.option || !o.why)) {
        bad.push(`${d.subject} rejectedOptions 有项缺 option/why（否决理由必须写）`);
      }
      const led = ledgers.find((l) => l.json.subject === d.subject);
      if (!led) bad.push(`${d.subject} 无对应补章登记`);
      else if (!led.json.noSupplement) bad.push(`${d.subject} 有口径决案但补章登记缺 noSupplement 说明`);
    }
    if (bad.length) no('口径决案', bad.slice(0, 3).join('；'));
    else ok(`口径决案：${dec.length} 份 · 字段齐（含 rejectedOptions / evidence / reviewIf）· 与补章登记对齐`);

    const bp2 = 'data/textbook-board.json';
    if (exists(bp2)) {
      const board = JSON.parse(read(bp2));
      const flagsOf = (slug) => {
        const e = (board.exceptions || []).find((x) => x.slug === slug);
        return e ? e.flags || [] : [];
      };
      const wrong = [];
      for (const d of dec) {
        const f = flagsOf(d.subject);
        // 只有「教材 < 教学」是看板异常（有稿没写完）；「教材 > 教学」是常态，看板不打旗，
        // 靠本文件的附录B 与 mappingStats 管住，不要求看板标记。
        if (d.textbookChapters < d.teachingChapters) {
          if (!f.includes('chapters-short-decided')) wrong.push(`${d.subject} 未标 chapters-short-decided（看板没重生成？）`);
          if (f.includes('chapters-short')) wrong.push(`${d.subject} 仍被报为异常`);
        }
        if (f.includes('decision-stale')) wrong.push(`${d.subject} 决案过期（章数与实测不符）`);
      }
      // 决案的「映射统计」必须能由 补章登记.json 现算出来：数字腐烂就在这里拦
      const statsBad = [];
      for (const d of dec) {
        const led = ledgers.find((l) => l.json.subject === d.subject);
        const mm = (led && led.json.noSupplement && led.json.noSupplement.mapping) || [];
        if (!d.mappingStats) { statsBad.push(`${d.subject} 缺 mappingStats（决案的映射数字必须可重算）`); continue; }
        const g = {};
        for (const m of mm) {
          for (const no of (m.textbookChapters || [m.textbookChapter])) {
            g[no] = g[no] || [];
            g[no].push(m.plan);
          }
        }
        const keys = Object.keys(g);
        const actual = {
          planCount: mm.length,
          textbookChaptersCovered: keys.length,
          multiToOneChapters: keys.filter((k) => g[k].length > 1).length,
          plansMergedIntoMulti: keys.reduce((a, k) => a + Math.max(0, g[k].length - 1), 0),
          // 反方向：一条教学章吸收多个教材章（教学按模块合并时就是这个形状）
          oneToManyPlans: mm.filter((m) => (m.textbookChapters || [m.textbookChapter]).length > 1).length,
          chaptersAbsorbed: mm.reduce((a, m) => a + Math.max(0, (m.textbookChapters || [m.textbookChapter]).length - 1), 0),
        };
        const [dept, slug] = d.subject.split('/');
        const tbDir = path.join(ROOT, 'textbooks', dept, slug);
        const tbCount = fs.existsSync(tbDir)
          ? fs.readdirSync(tbDir).filter((f) => /^\d+-第\d+章.*\.md$/.test(f)).length : 0;
        actual.textbookChaptersWithoutPlan = tbCount - keys.length;
        for (const [k, v] of Object.entries(actual)) {
          if (!(k in d.mappingStats)) continue;
          if (d.mappingStats[k] !== v) statsBad.push(`${d.subject} mappingStats.${k} 写 ${d.mappingStats[k]}，实测 ${v}`);
        }
      }
      if (statsBad.length) no('口径决案与看板', statsBad.slice(0, 3).join('；'));

      // 换算表必须在教材里可见（28 行与 mapping 一一对应）
      const apdxBad = [];
      for (const d of dec) {
        const [dept, slug] = d.subject.split('/');
        const f = path.join(ROOT, 'textbooks', dept, slug, '附录B-教学章与教材章对照.md');
        if (!fs.existsSync(f)) { apdxBad.push(`${d.subject} 缺 附录B-教学章与教材章对照.md（换算表只在 JSON 里，读者看不到）`); continue; }
        const t = fs.readFileSync(f, 'utf8');
        const led = ledgers.find((l) => l.json.subject === d.subject);
        const mm = (led && led.json.noSupplement && led.json.noSupplement.mapping) || [];
        // 只在「一、按教学章顺序查」这一段里找，否则第三节（无教学章位的教材章）会误当命中
        const sec = t.slice(t.indexOf('## 一、'), t.indexOf('## 二、'));
        // 不要用正则：`| 第 17 章 |` 里的裸 | 会被当成「或」，永远命中（实测踩过）
        const missing = mm.filter((m) => !sec.includes(`| 第 ${m.plan} 章 |`)).map((m) => m.plan);
        if (missing.length) apdxBad.push(`${d.subject} 附录B 缺教学第 ${missing.join('、')} 章的行`);
        if (/^\d+-第\d+章/m.test(t)) apdxBad.push(`${d.subject} 附录B 文件名或标题像章（会污染章数计数）`);
      }
      if (apdxBad.length) no('口径决案与教材换算表', apdxBad.slice(0, 3).join('；'));
      else ok(`口径决案与教材换算表：${dec.length} 门 · 附录B 行数与 mapping 一一对应 · 映射统计可重算`);

      const abn = (board.exceptions || []).filter((e) => (e.flags || []).includes('chapters-short'));
      if (wrong.length) no('口径决案与看板', wrong.slice(0, 3).join('；'));
      else {
        const openInAbn = abn.filter((e) => ledgers.some((l) => l.json.subject === e.slug && l.json.mode === '开稿'));
        ok(`口径决案与看板：${dec.length} 门落在已决口径 · 全库 chapters-short ${abn.length} 条（开稿进度 ${openInAbn.length} 条：${openInAbn.map((e) => e.detail || e.slug).join('；') || '无'}）`);
      }
    }
  }
}

console.log(`\n# pass ${pass}\n# fail ${fail}`);
if (reds.length) for (const r of reds) console.log(`  RED ${r}`);
process.exit(fail ? 1 : 0);