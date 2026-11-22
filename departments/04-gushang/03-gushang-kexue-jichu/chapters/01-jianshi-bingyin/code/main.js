#!/usr/bin/env node
/**
 * 中医骨伤科学基础 · 第 1 章 正骨先有程序，才有流派
 * 课程: departments/04-gushang/03-gushang-kexue-jichu/chapters/01-jianshi-bingyin/docs/zh.md
 * 依赖: 仅 Node.js 标准库
 *
 * 本章讲的是「程序先于流派」。脚本做的事只有一件：把正文里的程序链读出来，
 * 检查它是不是真的按次序写着，而不是只在标题里宣称。
 *
 * 现算项：
 *   规模      汉字数 / 节数 / 引书（《》）
 *   蔺道人链  六步各自的首次出现位置，是否严格递增
 *   八法      摸接端提按摩擦拿，前四法归骨、后四法归筋
 *   病因      外因四类 / 内因五条 是否齐全
 *   病机      气血线 / 筋骨线 / 脏腑线 / 经络线 四条
 * 正文改一个字，这里的数字就跟着变；手打的总会在改稿后静默过期。
 */

'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DOC = path.join(__dirname, '..', 'docs', 'zh.md');
const CHAPTER = 1;
const TITLE = '正骨先有程序，才有流派';

const HANZI = /[\u3400-\u4dbf\u4e00-\u9fff]/g;

/** 蔺道人《仙授理伤续断秘方》里一次骨折处理的六件事 */
const STEPS = ['相度损处', '拔伸', '捺正', '杉木皮夹板固定', '用药', '时时转动'];
/** 《医宗金鉴·正骨心法要旨》八法，前四法归骨，后四法归筋 */
const TECHNIQUES = ['摸', '接', '端', '提', '按', '摩', '推', '拿'];
/** 外因四类 */
const EXTERNAL = ['直接暴力', '间接暴力', '筋肉牵拉', '持续劳损'];
/** 内因五条 */
const INTERNAL = ['年龄', '体质与骨量', '解剖弱点', '病理因素', '姿势与职业'];
/** 病机四条线 */
const LINES = ['气血线', '筋骨线', '脏腑线', '经络线'];

function read() {
  if (!fs.existsSync(DOC)) throw new Error('找不到本章正文: ' + DOC);
  return fs.readFileSync(DOC, 'utf8').replace(/\r\n/g, '\n');
}

/** 正文里某词第一次出现的位置（-1 表示没有） */
function at(text, word) {
  return text.indexOf(word);
}

function analyze(text) {
  const body = String(text || '').replace(/\r\n/g, '\n');
  const hanzi = (body.match(HANZI) || []).length;
  const sections = body.split('\n').filter((l) => /^##\s+/.test(l)).map((l) => l.replace(/^##\s+/, '').trim());
  const cites = [...body.matchAll(/《([^》\n]+)》/g)].map((m) => m[1]);

  const steps = STEPS.map((s) => ({ step: s, at: at(body, s) }));
  const missing = steps.filter((s) => s.at < 0).map((s) => s.step);
  const ordered = steps.every((s, i) => i === 0 || (steps[i - 1].at >= 0 && s.at > steps[i - 1].at));

  // 八法在正文里是「摸、接、端、提、按、摩、推、拿」这样一口气列出的，
  // 单字按 indexOf 找会被「按下去」「推拿科」之类的散见命中污染，所以按列举句解析。
  const listing = body.match(/摸、接、端、提、按、摩、推、拿/);
  const techniques = listing
    ? listing[0].split('、').map((t) => ({ name: t, at: body.indexOf(listing[0]) }))
    : [];
  const techniqueListed = Boolean(listing) && techniques.map((t) => t.name).join('') === TECHNIQUES.join('');
  const external = EXTERNAL.filter((w) => body.includes(w));
  const internal = INTERNAL.filter((w) => body.includes(w));
  const lines = LINES.filter((w) => body.includes(w));

  return {
    hanzi,
    sections,
    cites,
    citeCount: cites.length,
    steps,
    missing,
    ordered,
    techniques,
    techniqueListed,
    external,
    internal,
    lines,
  };
}

function main() {
  const a = analyze(read());

  console.log(`中医骨伤科学基础 · 第 ${CHAPTER} 章 ${TITLE}`);
  console.log('（以下数字均从本章 docs/zh.md 现算）');
  console.log('');
  console.log(`汉字 ${a.hanzi} 字 · 节 ${a.sections.length} 节 · 引书 ${a.citeCount} 处（去重 ${new Set(a.cites).size} 部）`);
  console.log('');
  console.log('蔺道人处理链（首次出现位置，须严格递增）：');
  for (const s of a.steps) console.log(`  ${s.step.padEnd(8, '　')} 第 ${String(s.at + 1).padStart(5)} 字`);
  console.log(`  → ${a.missing.length ? '缺项：' + a.missing.join('、') : '六步齐全'}；次序${a.ordered ? '成立' : '不成立（正文未按程序链排列）'}`);
  console.log('');
  const bone = a.techniques.slice(0, 4).map((t) => t.name).join('');
  const sinew = a.techniques.slice(4).map((t) => t.name).join('');
  console.log(`八法：${a.techniques.map((t) => t.name).join('、')}`);
  console.log(`  治骨四法 ${bone} · 治筋四法 ${sinew} · 列举${a.techniqueListed ? '与正文一致' : '与正文不一致'}`);
  console.log('');
  console.log(`外因 ${a.external.length}/4：${a.external.join('、') || '—'}`);
  console.log(`内因 ${a.internal.length}/5：${a.internal.join('、') || '—'}`);
  console.log(`病机 ${a.lines.length}/4 条线：${a.lines.join('、') || '—'}`);
  console.log('');
  console.log('※ 判据是次序，不是名词数量：能背出六个词而说不出先后，等于没有程序。');
  console.log('※ 本章讨论学科源流，不构成诊疗意见；具体处理以接诊机构规范与执业医师判断为准。');
}

if (require.main === module) main();

module.exports = { DOC, CHAPTER, TITLE, STEPS, TECHNIQUES, EXTERNAL, INTERNAL, LINES, read, analyze };
