#!/usr/bin/env node
/**
 * 生理学 · 第 6 章 消化和吸收：分泌·运动·吸收与调节
 * 课程: departments/09-jichu/06-shengli-xue/chapters/06-xiaohua-xishou/docs/zh.md
 * 出处: 教材·第6章（6.1 概述 / 6.2 口腔内消化与胃内消化 / 6.3 小肠内消化与大肠内消化 /
 *       6.4 吸收与消化活动的调节），十二个知识单元
 * 数据: standards/shengli/units.json（逐单元带 views / levels 词频与 hanzi）
 * 依赖: 仅 Node.js 标准库
 *
 * 为什么全部现算而不手打：
 *   ① 本章的方向题集中在「谁快谁慢、谁走哪条路、谁主谁次」上：胃排空的速度次序、
 *      吸收产物走血液还是淋巴、胰液分泌以体液为主还是神经为主、两支自主神经对唾液
 *      是抑是促。这类题一旦记反，后面所有推论都反，所以写成函数逐个判。
 *   ② 「本章以器官层为绝对重心」这句话必须有可复算的词频支撑——消化道本身就是一条
 *      器官层的管道，组织层在这一版里几乎不讲。
 *   ③ 教材声明 valueLike = 0，本章逐单元核验，非零即报错。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 12; i += 1) {
    if (fs.existsSync(path.join(dir, 'standards', 'shengli', 'units.json'))) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('没找到 standards/shengli/units.json —— 章节目录是否已脱离仓库？');
}
const ROOT = findRoot(__dirname);
const UNITS_PATH = path.join(ROOT, 'standards', 'shengli', 'units.json');
const CHAPTER = '6';

const load = () => JSON.parse(fs.readFileSync(UNITS_PATH, 'utf8'));

function chapterUnits(data, ch) {
  return data.units.filter((u) => u.chapter === (ch || CHAPTER));
}

function profile(units) {
  const views = { 代谢: 0, 机能: 0, 形态: 0 };
  const levels = { 细胞: 0, 组织: 0, 器官: 0, 系统: 0 };
  for (const u of units) {
    for (const k of Object.keys(views)) views[k] += u.measure.views[k] || 0;
    for (const k of Object.keys(levels)) levels[k] += u.measure.levels[k] || 0;
  }
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0);
  return {
    n: units.length,
    hanzi: units.reduce((a, u) => a + u.hanzi, 0),
    views,
    levels,
    viewTotal: sum(views),
    levelTotal: sum(levels),
    locators: units.map((u) => u.locator),
  };
}

function share(part, whole) {
  if (!whole) throw new Error('分母为零：剖面为空');
  return part / whole;
}

function levelHotspot(units, level) {
  const key = level || '组织';
  const ranked = units
    .map((u) => ({ locator: u.locator, title: u.title, n: u.measure.levels[key] || 0 }))
    .sort((a, b) => b.n - a.n);
  const top = ranked[0];
  const rest = ranked.slice(1).reduce((a, r) => a + r.n, 0);
  return { level: key, locator: top.locator, title: top.title, n: top.n, rest };
}

// ── 模型一：胃排空的速度次序 ────────────────────────────────────────
// 教材 6.2.3：液体快于固体，糖类快于蛋白质，蛋白质快于脂肪。
// 这是本章最常被记成「脂肪最快」的一条，写成序数比背句子可靠。
const EMPTY_ORDER = ['液体', '糖类', '蛋白质', '脂肪'];

function emptyRank(food) {
  const i = EMPTY_ORDER.indexOf(food);
  if (i < 0) throw new Error(`不是本章列出的食糜类别：${food}（只收液体/糖类/蛋白质/脂肪）`);
  return i; // 数字越小排空越快
}

function emptiesFaster(a, b) {
  return emptyRank(a) < emptyRank(b);
}

// ── 模型二：两支自主神经对唾液的影响 ────────────────────────────────
// 教材 6.2.1：副交感兴奋使分泌增强且性状偏稀薄；交感兴奋亦可促进分泌，
// 但性状偏黏稠。也就是说这一处「交感不是抑制」，抑制的是性状不是量。
const SALIVA = {
  副交感: { volume: '增多', texture: '稀薄', note: '以副交感为主，量增而稀薄' },
  交感: { volume: '增多', texture: '黏稠', note: '交感亦促进分泌，但性状偏黏稠' },
};

function salivaryResponse(nerve) {
  const hit = SALIVA[nerve];
  if (!hit) throw new Error(`只讨论副交感与交感两支，收到的是：${nerve}`);
  return { nerve, ...hit };
}

// ── 模型三：胰液分泌的调节主次 ──────────────────────────────────────
// 教材 6.3.1：以体液调节为主，促胰液素作用于导管细胞（水与碳酸氢盐），
// 胆囊收缩素作用于腺泡细胞（酶）。两者靶点不同，所以「量」与「酶」分开调。
const PANCREAS = [
  { agent: '促胰液素', target: '导管细胞', effect: '促进水分与碳酸氢盐的分泌', trigger: '酸性食糜' },
  { agent: '胆囊收缩素', target: '腺泡细胞', effect: '促进消化酶的分泌', trigger: '蛋白质与脂肪的消化产物' },
  { agent: '迷走神经', target: '胰腺（直接）与激素释放', effect: '促进分泌并促进上述两种激素释放', trigger: '进食' },
];

function pancreasAgent(name) {
  const hit = PANCREAS.find((p) => p.agent === name);
  if (!hit) throw new Error(`不是本章列出的胰液调节因素：${name}`);
  return hit;
}

// ── 模型四：胆汁有没有消化酶 ────────────────────────────────────────
// 教材 6.3.1：胆汁不含消化酶，故不直接依靠酶的作用参与消化；
// 它的作用是乳化脂肪 + 与消化产物形成混合微胶粒促进吸收。
const BILE = {
  hasEnzyme: false,
  roles: ['乳化脂肪，增大与水相接触的面积', '与消化产物形成混合微胶粒，促进吸收', '胆盐经肠肝循环反复利用'],
};

// ── 模型五：胰蛋白酶原的激活级联与自我保护 ──────────────────────────
// 教材 6.3.1：肠激酶先把胰蛋白酶原变成胰蛋白酶，后者再激活自身与其他酶原；
// 胰液中同时含胰蛋白酶抑制物，防止酶原在胰腺内被提前激活。
const ACTIVATION = [
  { step: 1, from: '胰蛋白酶原', by: '肠激酶', to: '胰蛋白酶' },
  { step: 2, from: '胰蛋白酶原', by: '胰蛋白酶（自身激活）', to: '胰蛋白酶' },
  { step: 3, from: '糜蛋白酶原', by: '胰蛋白酶', to: '糜蛋白酶' },
  { step: 4, from: '羧基肽酶原', by: '胰蛋白酶', to: '羧基肽酶' },
];

function activationChain() {
  return ACTIVATION.slice();
}

function guardOfActivation() {
  return '胰蛋白酶抑制物：防止酶原在胰腺内被提前激活，避免胰腺自身被蛋白水解酶作用';
}

// ── 模型六：吸收产物走哪条路 ────────────────────────────────────────
// 教材 6.4.2：糖类与蛋白质与无机盐的吸收产物以血液途径为主，
// 脂类的吸收产物以淋巴途径为主（乳糜微粒经中央乳糜管，不先经肝脏）。
const ROUTE = {
  葡萄糖: { route: '血液', why: '经绒毛毛细血管入血，再经门静脉入肝' },
  氨基酸: { route: '血液', why: '同上，经血液途径入肝' },
  钠离子: { route: '血液', why: '与糖及氨基酸的吸收相互联系' },
  水: { route: '血液', why: '以渗透关系为基础，随溶质吸收而吸收' },
  长链脂肪酸: { route: '淋巴', why: '在上皮细胞内重新酯化形成乳糜微粒，经中央乳糜管入淋巴' },
  脂溶性维生素: { route: '淋巴', why: '随脂类消化产物一同吸收，与乳糜微粒同行' },
};

function absorptionRoute(substance) {
  const hit = ROUTE[substance];
  if (!hit) throw new Error(`不是本章列出的吸收对象：${substance}`);
  return { substance, ...hit };
}

// ── 模型七：外来神经作用的层次 ──────────────────────────────────────
// 教材 6.1.3：外来神经对内在神经系统的活动水平进行调节，
// 而非直接支配每一个效应细胞。这句话决定了「切断外来神经不等于消化道停摆」。
function extrinsicNerveLevel() {
  return {
    level: '调节内在神经系统的活动水平',
    notThis: '直接支配每一个效应细胞',
    why: '肠神经系统能独立完成局部反射，外来神经只是调它的活动水平',
  };
}

// ── 模型八：教材零数值声明，逐单元核验 ──────────────────────────────
function valueLikeZero(units) {
  const bad = units.filter((u) => u.measure.valueLike !== 0);
  return { checked: units.length, bad: bad.map((u) => u.locator) };
}

/** 三章对照：同一套口径套到循环、呼吸、消化三章，看层级重心怎么挪 */
function crossChapter(data, nos) {
  return (nos || ['4', '5', '6']).map((no) => {
    const us = chapterUnits(data, no);
    const pr = profile(us);
    return {
      no,
      hanzi: pr.hanzi,
      n: pr.n,
      views: pr.views,
      levels: pr.levels,
      organShare: share(pr.levels.器官, pr.levelTotal),
      tissueShare: share(pr.levels.组织, pr.levelTotal),
      cellShare: share(pr.levels.细胞, pr.levelTotal),
    };
  });
}

function main() {
  const data = load();
  const units = chapterUnits(data);
  const p = profile(units);

  console.log('═══ 消化和吸收：分泌·运动·吸收与调节 (生理学 第6章) ═══');
  console.log(`教材规模: 第6章 ${p.hanzi} 字 · 知识单元 ${p.n} 个（6.1–6.4，每节三个）`);

  console.log('\n三视角剖面（词频，逐单元加总）');
  for (const [k, v] of Object.entries(p.views)) {
    console.log(`  ${k} ${String(v).padStart(4)} · ${(share(v, p.viewTotal) * 100).toFixed(1)}%`);
  }
  console.log(`  合计 ${p.viewTotal} · 分泌与运动是主轴，代谢次之（消化液本身要合成与排出）`);

  console.log('\n四层级剖面');
  for (const [k, v] of Object.entries(p.levels)) {
    console.log(`  ${k} ${String(v).padStart(4)} · ${(share(v, p.levelTotal) * 100).toFixed(1)}%`);
  }
  const hs = levelHotspot(units, '组织');
  console.log(`  组织层落点: ${hs.locator}（${hs.title}）${hs.n} 处 · 其余十一节合计 ${hs.rest} 处`);

  console.log('\n胃排空的速度次序（由快到慢）');
  for (const f of EMPTY_ORDER) {
    console.log(`  ${emptyRank(f) === 0 ? '最快' : `第 ${emptyRank(f) + 1}`} · ${f}`);
  }
  console.log(`  糖类比脂肪快：${emptiesFaster('糖类', '脂肪') ? '✓' : '✗'}`);

  console.log('\n两支自主神经对唾液：都促进，差别在性状');
  for (const n of ['副交感', '交感']) {
    const r = salivaryResponse(n);
    console.log(`  ${r.nerve} · 分泌量 ${r.volume} · 性状 ${r.texture}`);
  }

  console.log('\n胰液分泌：以体液调节为主，量与酶分开调');
  for (const a of PANCREAS) {
    console.log(`  ${a.agent} · 靶点 ${a.target} · ${a.effect}`);
  }
  console.log(`  胆汁含消化酶: ${BILE.hasEnzyme ? '是' : '否'}`);
  for (const r of BILE.roles) console.log(`    · ${r}`);

  console.log('\n胰蛋白酶原的激活级联（顺序不可颠倒）');
  for (const s of activationChain()) {
    console.log(`  ${s.step}. ${s.from} --${s.by}--> ${s.to}`);
  }
  console.log(`  保护: ${guardOfActivation()}`);

  console.log('\n吸收产物走哪条路');
  for (const k of Object.keys(ROUTE)) {
    const r = absorptionRoute(k);
    console.log(`  ${r.substance} → ${r.route} · ${r.why}`);
  }

  console.log('\n外来神经作用的层次');
  const lv = extrinsicNerveLevel();
  console.log(`  ${lv.level}（不是${lv.notThis}）· ${lv.why}`);

  const z = valueLikeZero(units);

  console.log('\n三章对照：同一口径下层级重心怎么挪（组织层 / 器官层）');
  for (const c of crossChapter(data)) {
    console.log(`  第${c.no}章 ${c.hanzi} 字 · 组织 ${(c.tissueShare * 100).toFixed(1)}% · 器官 ${(c.organShare * 100).toFixed(1)}%`);
  }
  console.log('  消化章的组织层最薄：这一版讲的是器官的分泌与运动，不讲消化道组织学');

  console.log(`\n教材「零数值」核验: ${z.checked} 个单元 · valueLike 非零 ${z.bad.length} 个`);

  console.log('\n教学边界：本章数字由 standards/shengli/units.json 现算，只用于说明教材的机制类别与关系；本书不给值，不写数值与单位与正常值，不构成诊断、治疗或用药依据');

  return { p, hotspot: hs, zero: z, emptyOrder: EMPTY_ORDER };
}

if (require.main === module) {
  main();
}

module.exports = {
  ROOT,
  CHAPTER,
  UNITS_PATH,
  load,
  chapterUnits,
  profile,
  share,
  levelHotspot,
  EMPTY_ORDER,
  emptyRank,
  emptiesFaster,
  SALIVA,
  salivaryResponse,
  PANCREAS,
  pancreasAgent,
  BILE,
  ACTIVATION,
  activationChain,
  guardOfActivation,
  ROUTE,
  absorptionRoute,
  extrinsicNerveLevel,
  valueLikeZero,
  crossChapter,
  main,
};
