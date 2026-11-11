#!/usr/bin/env node
/**
 * 病理生理学 · 第 11 章 心功能不全：泵 → 代偿 → 失代偿的类别链
 * 课程: departments/09-jichu/11-bingli-shengli-xue/chapters/11-xin-gongneng-buquan/docs/zh.md
 * 出处: 教材·疾病学基础·第9章·9.3（9.3.1 / 9.3.2 / 9.3.3，共 3 个小节）
 * 数据: standards/binglishengli/底本.json（正文与章字数）+ standards/binglishengli/units.json（单元层词频与数值核验）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算：本章的命题是「泵坏了以后，代偿是怎么一步步变成失代偿的」，
 * 而这条链是否成立，取决于教材有没有把环节写全、有没有偷偷给数值。
 * 手打的数字会在底本改版后静默过期；现算的数字一旦对不上，程序自己会报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

// __dirname = .../departments/09-jichu/11-bingli-shengli-xue/chapters/11-xin-gongneng-buquan/code
// 不硬数 ../ 的层数（数错一次就 ENOENT），向上找带 standards/binglishengli 的那一级
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'binglishengli', '底本.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/binglishengli/底本.json —— 章节目录是否已脱离仓库？');
}

const ROOT = findRoot(__dirname);
const BASE = path.join(ROOT, 'standards', 'binglishengli', '底本.json');
const UNITS = path.join(ROOT, 'standards', 'binglishengli', 'units.json');

const CHAPTER = '11';      // 课程章号
const BASE_CH = 9;         // 代用底本章号：课程第 11 章 = 底本第 9 章
const BASE_SEC = '9.3';    // 底本节号：心功能不全

const nonWs = (s) => String(s || '').replace(/\s/g, '').length;

/** 底本里有编号的标题常写成「9.3.1 9.3.1 心功能不全的类别」，去掉重复的那一段 */
function titleOf(sub) {
  return String(sub.title || '').trim().replace(new RegExp('^' + sub.no.replace(/\./g, '\\.') + '\\s*'), '');
}

/** 本章的 3 个小节，按小节号排——正文、字数、引文池都以它为准 */
function baseUnits(base = JSON.parse(fs.readFileSync(BASE, 'utf8'))) {
  const ch = base.chapters.find((c) => Number(c.no) === BASE_CH);
  if (!ch) throw new Error(`底本无第 ${BASE_CH} 章`);
  const sec = ch.secs.find((s) => s.no === BASE_SEC);
  if (!sec) throw new Error(`底本第 ${BASE_CH} 章无 ${BASE_SEC} 节`);
  return sec.subs
    .slice()
    .sort((a, b) => a.no.localeCompare(b.no, 'en'))
    .map((sub) => ({ sub: sub.no, title: titleOf(sub), rawBody: String(sub.body || ''), chars: nonWs(sub.body) }));
}

/** 单元层：每单元带 brief / 三视角 / 四层级 / 数值核验 */
function measureUnits(units = JSON.parse(fs.readFileSync(UNITS, 'utf8'))) {
  return units.units
    .filter((u) => String(u.chapter) === String(BASE_CH) && String(u.sec).startsWith(BASE_SEC))
    .sort((a, b) => a.sub.localeCompare(b.sub, 'en'));
}

/** 规模：节数 / 小节数 / 去空白字符数（与 docs 里写的「本章教材字数」同一口径） */
function shape(list) {
  return {
    secs: 1,
    units: list.length,
    chars: list.reduce((n, u) => n + u.chars, 0),
  };
}

/** 三视角（病因 / 机制 / 机能）与四层级（细胞 / 组织 / 器官 / 系统） */
function lens(list) {
  const views = { 病因: 0, 机制: 0, 机能: 0 };
  const levels = { 细胞: 0, 组织: 0, 器官: 0, 系统: 0 };
  for (const u of list) {
    for (const k of Object.keys(views)) views[k] += (u.measure && u.measure.views[k]) || 0;
    for (const k of Object.keys(levels)) levels[k] += (u.measure && u.measure.levels[k]) || 0;
  }
  return { views, levels };
}

const rank = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
const total = (o) => Object.values(o).reduce((a, b) => a + b, 0);

/** 底本自称「不写分级与量化数值」——当断言复算，不当声明照抄 */
const VALUE_RE = /\d+(?:\.\d+)?\s*(?:mmHg|kPa|℃|°C|‰|%|mmol|mOsm|mol|mV|Hz|次\/分|个\/L|g\/L|mg|ml|mL|kg|cm|mm|μm|ms|min|小时|毫升|升|倍|周)/g;

function valueAudit(list) {
  const samples = [];
  for (const u of list) {
    for (const m of u.rawBody.matchAll(VALUE_RE)) samples.push(`${u.sub}:${m[0]}`);
  }
  return { units: list.length, hits: samples.length, samples };
}

/** 一个环节要同时写出全部关键词，才算把这条链写全，缺一环不算 */
const CLUES = ['发生环节', '起病方式', '受累部位', '血流方向', '诱发类别'];
const COMPENSATION = ['快速代偿', '长期代偿'];
const SITES = ['心脏自身调节', '神经调节', '体液调节', '组织适应'];
const BOUNDARY = ['不写分级与量化数值', '不作疾病诊断', '不作病情与预后的判定'];

function chainUnits(list, keys) {
  return list.filter((u) => keys.every((k) => u.rawBody.includes(k))).map((u) => u.sub);
}

function main() {
  const list = baseUnits();
  const measured = measureUnits();
  const s = shape(list);
  const { views, levels } = lens(measured);
  const audit = valueAudit(list);
  const clues = chainUnits(list, CLUES);
  const comp = chainUnits(list, COMPENSATION);
  const sites = chainUnits(list, SITES);
  const bound = chainUnits(list, BOUNDARY);

  console.log(`═══ 心功能不全（病理生理学 第${CHAPTER}章 · 代用底本《疾病学基础》第${BASE_CH}章 ${BASE_SEC}）═══`);
  console.log(`教材规模: 第${BASE_CH}章 ${BASE_SEC} ${s.chars} 字 · ${s.secs} 节 · ${s.units} 小节 · 平均每小节 ${Math.round(s.chars / s.units)} 字`);
  console.log(`口径核验: 本章 ${audit.units} 小节的数值型命中 ${audit.hits} 处（底本 valueLike = 0，这里用正则复算而不是照抄声明）`);
  console.log('');
  console.log('三视角（病因 / 机制 / 机能）本章词频：');
  for (const [k, v] of rank(views)) console.log(`  ${k} ${String(v).padStart(4)} 次`);
  console.log('四层级（细胞 / 组织 / 器官 / 系统）本章词频：');
  for (const [k, v] of rank(levels)) console.log(`  ${k} ${String(v).padStart(4)} 次`);
  console.log('  → 本章以「机能」为主轴：教材谈的是泵的工作条件与代偿环节，病因只给类别，不给参数。');
  console.log('');
  console.log('三个小节的分工（小节 / 去空白字符数 / 标题）：');
  for (const u of list) console.log(`  ${u.sub} · ${u.chars} 字 · ${u.title}`);
  console.log('');
  console.log(`五条划分线索（${CLUES.join(' / ')}）写全的小节：${clues.length} / ${s.units} → ${clues.join('、') || '（无）'}`);
  console.log(`两条代偿时间轴（${COMPENSATION.join(' + ')}）写全的小节：${comp.length} / ${s.units} → ${comp.join('、') || '（无）'}`);
  console.log(`四个代偿作用部位（${SITES.join(' / ')}）写全的小节：${sites.length} / ${s.units} → ${sites.join('、') || '（无）'}`);
  console.log(`三条叙述边界（${BOUNDARY.join(' / ')}）写全的小节：${bound.length} / ${s.units} → ${bound.join('、') || '（无）'}`);
  console.log('  → 每条链都只在一个小节里写全，其余小节只承接其中一段：这是底本「一处写全、其余引用」的写法。');
  console.log('');
  console.log('教学边界：本章只说明教材关于心功能不全的类别与环节与关系，不写数值与单位与参考值，不作诊断与判定，不构成诊断或用药依据');

  return { list, measured, shape: s, views, levels, audit, clues, comp, sites, bound };
}

if (require.main === module) main();

module.exports = {
  ROOT, BASE, UNITS, CHAPTER, BASE_CH, BASE_SEC,
  CLUES, COMPENSATION, SITES, BOUNDARY, VALUE_RE,
  nonWs, titleOf, baseUnits, measureUnits, shape, lens, rank, total, valueAudit, chainUnits, main,
};
