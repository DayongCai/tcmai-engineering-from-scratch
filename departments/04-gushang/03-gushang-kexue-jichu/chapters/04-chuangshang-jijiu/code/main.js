#!/usr/bin/env node
/**
 * 中医骨伤科学基础 · 第 4 章 急救的第一个动作不是接骨
 * 课程: departments/04-gushang/03-gushang-kexue-jichu/chapters/04-chuangshang-jijiu/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章讲的是次序。脚本不数名词，专门验证次序：ABCDE 是否按序、五个致命并发症是否齐全、
 * 「先固定后搬运」与「先评估神经血管后固定」两句判据是否真的写在正文里。
 *
 * 现算项：
 *   规模     汉字数 / 节数 / 引书
 *   ABCDE    气道 → 呼吸 → 循环 → 意识 → 暴露 在正文里的先后
 *   止血带   扎在伤口近端 / 记录时间 / 写在止血带上
 *   开放伤   覆盖 / 固定 / 送，三个「不」
 *   并发症   骨筋膜室 / 脂肪栓塞 / 挤压综合征 / 创伤性休克 / 感染
 *   搬运     先固定后搬运、先评估后固定
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 4;
const TITLE = '急救的第一个动作不是接骨';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;
const ABCDE = ['气道', '呼吸', '循环', '意识', '暴露与环境'];
const COMPLICATIONS = ['骨筋膜室综合征', '脂肪栓塞', '挤压综合征', '创伤性休克', '感染与气性坏疽'];
const TOURNIQUET = ['扎在伤口近端', '记录时间', '写在止血带上'];
const OPEN = ['覆盖', '固定', '送'];

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

const count = (body, w) => body.split(w).length - 1;

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const hanzi = (body.match(HANZI) || []).length;
  const sections = body.split('\n').filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const cites = [...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]);

  // ABCDE 在正文里是加粗的单项，按加粗标记定位，避免被摘要里的散见命中
  const abcde = ABCDE.map((k) => ({ key: k, at: body.indexOf('**' + k + '**（') }));
  const abcdeOrdered = abcde.every((c, i) => c.at >= 0 && (i === 0 || c.at > abcde[i - 1].at));
  const abcdeMissing = abcde.filter((c) => c.at < 0).map((c) => c.key);

  const tourniquet = TOURNIQUET.filter((w) => body.includes(w));
  const open = OPEN.filter((w) => body.includes(w));
  const notProbe = body.includes('探查深度');
  const notPushBack = body.includes('不要试图把外露的骨端按回去');
  const notPull = body.includes('不要拔出刺入的异物');

  const complications = COMPLICATIONS.filter((w) => body.includes(w));

  const fixBeforeCarry = body.includes('先固定，后搬运');
  const checkBeforeFix = body.includes('先评估神经血管，后固定');
  const firstIsNotBone = body.includes('急救的第一步永远不是碰病人');

  return { hanzi, sections, cites, citeCount: cites.length, abcde, abcdeOrdered, abcdeMissing, tourniquet, open, notProbe, notPushBack, notPull, complications, fixBeforeCarry, checkBeforeFix, firstIsNotBone };
}

function main() {
  const a = analyze(read());
  console.log(`中医骨伤科学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 引书 ${a.citeCount} 处`);
  console.log('');
  console.log('现场评估次序（加粗项的位置）：');
  for (const c of a.abcde) console.log(`  ${c.key.padEnd(4, '　')} 第 ${String(c.at + 1).padStart(5)} 字`);
  console.log(`  → ${a.abcdeMissing.length ? '缺项：' + a.abcdeMissing.join('、') : '五项齐全'}；次序${a.abcdeOrdered ? '成立' : '不成立'}`);
  console.log('');
  console.log(`止血带三件事：${a.tourniquet.join('、') || '—'}（${a.tourniquet.length}/3）`);
  console.log(`开放伤三件事：${a.open.join('、') || '—'}（${a.open.length}/3）`);
  console.log(`三个「不」：探查深度${a.notProbe ? '✓' : '✗'} · 骨端按回${a.notPushBack ? '✓' : '✗'} · 拔异物${a.notPull ? '✓' : '✗'}`);
  console.log('');
  console.log(`五个致命并发症：${a.complications.join('、') || '—'}（${a.complications.length}/5）`);
  console.log('');
  console.log(`先固定后搬运：${a.fixBeforeCarry ? '写着' : '未写'} · 先评估后固定：${a.checkBeforeFix ? '写着' : '未写'}`);
  console.log(`第一步不碰病人：${a.firstIsNotBone ? '写着' : '未写'}`);
  console.log('');
  console.log('※ 院前的目标是保命加不加重，不是治好；多做反而多错。');
  console.log('※ 本章不写具体时限、液体量与药物剂量；实际急救按所在地院前急救规范执行。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, ABCDE, COMPLICATIONS, TOURNIQUET, read, analyze };
