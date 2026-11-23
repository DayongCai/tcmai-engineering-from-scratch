#!/usr/bin/env node
/**
 * 中医毕业设计与知识移交 · 第 28 章 正常值没有单位，等于没有参考区间
 * 课程: departments/01-zhongyi/22-zhongyi-biye-sheji/chapters/28-jichu-shengli-zhengchangzhi/docs/zh.md
 * 数据: 本章正文的规模与三件表 + standards/biye/案例库.json 同 slug 案例
 * 依赖: 仅 Node.js 标准库
 *
 * 132 单元、228,672 字从正文表读出；228,672 ÷ 132 = 1,732.4 字/单元现算。
 * 必填三件 → 全量条目字段数 = 132 × 3 = 396；三件完整率须由台账算出，正文未给数。
 */

'use strict';

const path = require('node:path');
const { readDoc, tableMap, budget, auditQuiz, banner, finish } = require(path.join(__dirname, '..', '..', '_chapter.js'));

const SLUG = '28-jichu-shengli-zhengchangzhi';
const NO = 28;
const TITLE = '正常值没有单位，等于没有参考区间';
const doc = readDoc(SLUG).text;
const rows = tableMap(doc);

const units = rows.get('单元');
const hanziTotal = rows.get('汉字');
const requirement = 3; // 正文：必填三件——数值／单位／区间
const mean = hanziTotal / units;
const requiredFields = units * requirement;
if (Math.abs(mean - 1732.4) > 0.05) throw new Error('每单元均值复算与正文 1,732.4 不一致');
if (requirement !== 3) throw new Error('必填三件应为 3');

banner(NO, TITLE);
console.log(`规模：${units} 单元 · ${hanziTotal.toLocaleString('en-US')} 汉字 · 数值 ${rows.get('数值')}`);
console.log(`复算：${hanziTotal.toLocaleString('en-US')} ÷ ${units} = ${mean.toFixed(1)} 字/单元（正文 1,732.4）`);
console.log(`必填三件 × ${units} 单元 = ${requiredFields} 个字段值；缺一即整条不可用，三件完整率须由台账算。`);
console.log(`区间写法统一：双侧「下限～上限」，单侧写「上限 < b」或「下限 > a」；写法不统一会把表述差异误判成内容差异。`);
console.log(`不一致三源：教材不统一／抽取误差／版本差异；单位换算要给系数与算式，如 1 mmol/L ＝ 18 mg/dL。`);
console.log(`判断：只反映教材口径，不代表任何实验室的实际区间；正常值表不得替代实验室报告。`);

const b = budget(SLUG);
finish(SLUG, b, auditQuiz(SLUG, doc));
