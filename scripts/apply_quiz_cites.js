#!/usr/bin/env node
'use strict';
/**
 * scripts/apply_quiz_cites.js <assign.json> —— 把「题 → 引证」落到 quiz.json
 *
 * assign.json 形状：
 *   { "05-yanzheng": [["前提","5.1.1"], ["依据","5.1.1"], ...] }   // 每章按题序
 *
 * 为什么要一个脚本而不是手改 21 个 JSON：引证必须**幂等**——重跑不会叠加括号；
 * 已有引证会被替换而不是追加。手改很容易变成「（依据教材·第5章·5.1.1）（依据…）」。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BOOKS = { bingli: '10-bingli-xue', shengli: '06-shengli-xue', zhenduan: '01-zhongyi/05-zhongyi-zhen-duan-xue', binglishengli: '09-jichu/11-bingli-shengli-xue' };
const book = process.argv[2];
const file = process.argv[3];
if (!BOOKS[book] || !file) { console.log('用法: node scripts/apply_quiz_cites.js <bingli|shengli|zhenduan|binglishengli> <assign.json>'); process.exit(1); }
const CH = path.join(ROOT, 'departments', BOOKS[book].includes('/') ? '' : '09-jichu', BOOKS[book], 'chapters');

const assign = JSON.parse(fs.readFileSync(file, 'utf8'));
let n = 0;
for (const [slug, rows] of Object.entries(assign)) {
  const p = path.join(CH, slug, 'quiz.json');
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (j.questions.length !== rows.length) throw new Error(`${slug} 题数 ${j.questions.length} ≠ 赋值数 ${rows.length}`);
  j.questions.forEach((q, i) => {
    const [kind, sub] = rows[i];
    // 章号取自小节号本身，不取课程章号：诊断学课程 12 章与教材 14 章不同位（第 5 章问诊对应教材第 4 章），
    // 写课程章号会造出「第5章·4.2.1」这种不存在的引用。病理学与生理学两书章号本相同，取法一致不影响。
    const ch = String(sub).split('.')[0];
    // 代用底本必须带著作名：病理生理学的教材是《疾病学基础》，写成「教材·第N章」会被读成病理学。
    const bookTag = book === 'binglishengli' ? '疾病学基础·' : '';
    const stripped = String(q.explanation).replace(/（(依据|口径见|前提|算见)?教材·(?:疾病学基础·)?第\d+章·\d+\.\d+\.\d+）/g, '').replace(/\s*$/, '');
    q.explanation = `${stripped}（${kind}教材·${bookTag}第${ch}章·${sub}）`;
    n += 1;
  });
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
}
console.log(`✓ 写入 ${Object.keys(assign).length} 章 / ${n} 题引证`);
