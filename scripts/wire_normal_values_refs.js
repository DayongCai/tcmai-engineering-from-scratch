#!/usr/bin/env node
'use strict';
/**
 * 把 `[[nv:ID]]` 引用接进每章正文（幂等，插在「## 代价与边界」之前）
 *
 * 为什么单独一节、而不是散着往句子里塞：
 *   教材原文一个字不给值（valueLike = 0），章节正文因此是「类别与关系」的写法。
 *   硬把数值句子插进机制段，会把叙述从「压力差决定流向」拽回「记住这个数」，
 *   正是这门课最初要避免的事。所以做法是：**正文照旧不给值，另立一节说清
 *   「本章哪些界值有出处、在哪查」**，每个界值挂一个 [[nv:ID]] token。
 *   token 不带数字，值仍只在文末的 NV 块里——两笔账分开，但正文真的用起来了。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHDIR = path.join(ROOT, 'departments/09-jichu/06-shengli-xue/chapters');
const DB = JSON.parse(fs.readFileSync(path.join(ROOT, 'standards/shengli/normal-values/normal-values.json'), 'utf8'));

const BEGIN = '<!-- NVREFS:BEGIN 本节由 scripts/wire_normal_values_refs.js 生成，勿手改 -->';
const END = '<!-- NVREFS:END -->';

/** 每章的引用写法：标题 + 若干「说法 → token」。值不写，只写界面的意思。 */
const WIRING = {
  '03-xueye': {
    head: '本章的红细胞、白细胞、血浆蛋白各有一套按性别或分组给出的参考区间；讲「血液由什么组成」时不需要它们，一旦要判「这个数算不算低」就必须回到数据层。',
    items: [
      ['红细胞与血红蛋白按性别分两组', ['S1-RBC-M', 'S1-HB-F']],
      ['白细胞分类既有绝对值也有百分数，两套不能混用', ['S1-WBC', 'S1-NEUT-PCT']],
      ['血浆蛋白与白蛋白/球蛋白比值', ['S13-TP', 'S13-AG']],
      ['造血原料里的血清铁同样分性别', ['S2-IRON-M']],
      ['血浆电解质里最常被问到的钾', ['S9-K']],
    ],
  },
  '04-xueye-xunhuan': {
    head: '血压是这门课里最早被问「多少算高」的量；心率则有一处常被忽略的细节——教科书口径与中国共识的切点不是同一件事。',
    items: [
      ['血压的正常、正常高值与高血压诊断切点', ['S3-BP-NORMAL', 'S3-BP-HTN']],
      ['分级到三级高血压的上界', ['S3-BP-3']],
      ['「正常窦性心律」的传统定义', ['S14-HR-SINUS']],
      ['高血压患者的静息心率干预切点（共识给的不是教科书那个数）', ['S14-HR-CUTOFF']],
    ],
  },
  '05-huxi': {
    head: '呼吸章的判读界值集中在三件事上：气流有没有受限、舒张试验算不算阳性、一秒率还在但有功能减退的那一档。',
    items: [
      ['气流受限的界值（吸入舒张剂后的一秒率）', ['S7-RATIO-AIRFLOW']],
      ['一秒率跌破前的「预计值下限」', ['S7-RATIO-PRED']],
      ['舒张试验阳性的两个条件要同时满足', ['S8-BD-POSITIVE']],
      ['一秒率保留却已有功能减退的那一档', ['S8-PRISM']],
      ['FVC 与 FEV1 各自的预计值下限', ['S7-FVC-PRED', 'S7-FEV1-PRED']],
      ['静息呼吸频率的通行区间（教科书口径，非标准文本）', ['S18-RR']],
    ],
  },
  '06-xiaohua-xishou': {
    head: '消化章本身讲的是分泌、消化、吸收的关系；肝功指标是「肝脏在生化上看得出什么」的那一侧，且有两处特别容易被抄错的地方。',
    items: [
      ['转氨酶按性别分两组', ['S12-ALT-M', 'S12-ALT-F']],
      ['同一项目因试剂不同而两套区间（带撇那一套）', ['S12-ALT-M-P']],
      ['碱性磷酸酶要按性别与年龄分段看', ['S12-ALP-F-Y', 'S12-ALP-F-O']],
      ['γ-谷氨酰基转移酶的男女差异', ['S12-GGT-M', 'S12-GGT-F']],
    ],
  },
  '07-nengliang-tiwen': {
    head: '能量代谢靠间接测热算产热，一章里没有一处需要外部数值；但血糖、血脂、体温三件事一旦落到判读，就必须回到数据层。',
    items: [
      ['空腹血糖的正常上限与「空腹血糖受损」这一档', ['S4-FPG-NORMAL', 'S4-IFG']],
      ['糖负荷后两小时的正常上限', ['S4-2HPG-NORMAL']],
      ['糖负荷后两小时血糖的「糖耐量减低」一档', ['S4-IGT']],
      ['血脂的合适水平（总胆固醇与低密度脂蛋白各一条）', ['S5-TC-OK', 'S5-LDL-OK']],
      ['「发热」在公共卫生口径里的判定界值（界值，不是正常区间）', ['S15-FEVER-373']],
      ['体温的通行区间（核心/肛温口径；腋温更低，别混用）', ['S18-TEMP']],
    ],
  },
  '08-shenzang-paixie': {
    head: '肾脏章的核心是「滤过—重吸收—分泌」三件事的定量关系；真要判肾功能，靠的是肌酐、尿素、eGFR 与尿酸四条腿，而它们各自都有自己的分组。',
    items: [
      ['尿素与肌酐都要按性别 × 年龄四组看（上限随年龄上移）', ['S10-UREA-M-Y', 'S10-CREA-F-O']],
      ['eGFR 的六期划分从哪切', ['S17-GFR-G3A', 'S17-GFR-G5']],
      ['慢性肾脏病的判定腿（滤过率那条）', ['S17-CKD-DEF']],
      ['高尿酸血症的判定切点（不分男女口径）', ['S16-HUA-CUTOFF']],
      ['电解质里与肾脏调节最相关的三条', ['S9-K', 'S9-NA', 'S9-CL']],
      ['二十四小时尿量的通行区间（教科书口径，非标准文本）', ['S18-URINE']],
    ],
  },
  '09-neifenmi': {
    head: '内分泌章讲的是「激素—受体—反馈」的关系；判读一侧最常被问的是甲功五项与血糖，而甲功有一处必须写明的限制：区间随分析系统变。',
    items: [
      ['甲功五项（以罗氏分析系统那一列为准，不跨系统混用）', ['S11-TSH', 'S11-FT4']],
      ['T3 与 T4 的总量与游离量是两回事', ['S11-T3', 'S11-FT3']],
      ['糖化血红蛋白作为诊断切点', ['S4-HBA1C-DX']],
      ['钙磷镁三条（甲状旁腺调节的落点）', ['S2-CA', 'S2-IP']],
    ],
  },
  '01-xulun': {
    head: '绪论讲的是「研究对象、三个水平、研究方法」，本章没有挂载任何参考值——不是漏了，是绪论只交代框架，不吃数值。',
    items: [],
    empty: '本章的零值属 byDesign 之外的正常情况：没有任何需要判读的量。全部值见 `standards/shengli/normal-values/normal-values.json`。',
  },
  '02-xibao-jiben-gongneng': {
    head: '细胞章讲的是跨膜转运、信号转导、电活动、收缩四段链路，全部落在「关系」上。',
    items: [],
    empty: '本章的静息电位、阈电位、动作电位幅度属 **byDesign**——教材本身不给值（`valueLike = 0`），不是本层没找到。要毫伏数只能引外部来源，本层不替教材补它刻意不写的东西。',
  },
  '10-shenjing-xitong': {
    head: '神经章的四节讲的是神经元、突触、反射、中枢整合的关系，没有一处需要外部数值。',
    items: [],
    empty: '本章的电生理量（膜电位、阈电位、传导速度、突触延搁）属 **byDesign**——教材不给值，理由同第 2 章。',
  },
  '11-ganjue-qiguan': {
    head: '感觉器官章讲的是感受器换能与各感官的信息处理方式，是最容易滑进「视野多少度、听力多少分贝」的一章。',
    items: [],
    empty: '本章刻意不给值：教材在每一节都用「不写数值与单位与正常值」的边界句替代数字。要视野或听阈的绝对值，需另找眼科/耳鼻喉的专门标准，本层目前没有可核验来源，已记 pending。',
  },
};

function blockFor(slug) {
  const w = WIRING[slug];
  if (!w) throw new Error(`未为 ${slug} 提供引用写法`);
  const L = [BEGIN, '', '### 本章的界值在哪里（不在本章正文里）', '', w.head, ''];
  if (w.items.length) {
    L.push('| 说法 | 数据层条目 |', '|---|---|');
    for (const [label, ids] of w.items) L.push(`| ${label} | ${ids.map((i) => '`[[nv:' + i + ']]`').join(' ')} |`);
    L.push('', '**为什么正文不直接写这些数**：教材原文一处数值都不给，正文的任务是把「关系」讲清；数值一旦进句子，读者会记数而忘关系。要数就顺着 token 去文末的表里查，每条都能回到标准号与表号。');
  } else {
    L.push(w.empty);
  }
  L.push('', END);
  return L.join('\n');
}

function main() {
  const check = process.argv.includes('--check');
  const dirs = fs.readdirSync(CHDIR).filter((d) => /^\d\d-/.test(d)).sort();
  let drift = 0;
  for (const d of dirs) {
    const f = path.join(CHDIR, d, 'docs/zh.md');
    if (!fs.existsSync(f)) { console.log(`skip ${d}（无 docs/zh.md）`); continue; }
    let txt = fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
    const block = blockFor(d);
    let next;
    if (txt.includes(BEGIN) && txt.includes(END)) {
      next = txt.replace(new RegExp(`${BEGIN}[\\s\\S]*?${END}`), () => block);
    } else {
      const anchor = '## 代价与边界';
      if (!txt.includes(anchor)) throw new Error(`${d} 找不到「## 代价与边界」锚点`);
      next = txt.replace(anchor, block + '\n\n' + anchor);
    }
    if (next !== txt) {
      drift++;
      if (check) console.log(`DRIFT ${d}`);
      else { fs.writeFileSync(f, next, 'utf8'); console.log(`wire ${d}（${WIRING[d].items.reduce((a, [, ids]) => a + ids.length, 0)} 个引用）`); }
    }
  }
  if (check) {
    console.log(drift ? `✗ ${drift} 章引用段与脚本不一致` : '✓ 11 章引用段与脚本一致');
    process.exit(drift ? 1 : 0);
  }
}

if (require.main === module) main();
module.exports = { blockFor, BEGIN, END, WIRING };
