#!/usr/bin/env node
'use strict';
/**
 * scripts/lib_binglishengli_map.js —— 病理生理学课程章 ↔ 代用底本《疾病学基础》的映射
 *
 * 为什么需要这一层：本机没有《病理生理学》教材（E:\textbooks 里 100 份 qhzy-*.xlsx
 * 没有这一本），只有《疾病学基础》——它把 病理学 + 病理生理学 合成 18 章。
 * 其中与病理生理直接相关的段落是 1.1（健康与疾病）、1.2–1.4（病因与转归）、
 * 5（水电解质与酸碱）、6（缺氧与发热）、7（休克与应激）、9.3（心功能不全）、
 * 10.3（呼吸功能不全）、11.4（肾功能不全）。
 *
 * 所以本课程用的是**代用底本**：引文一律标「教材·疾病学基础·第N章·N.M.K」，
 * 不写成「病理生理学」——那个书名在本机不存在，写成它就是把出处编出来。
 *
 * 课程 14 章里有 3 章在代用底本中**没有对应内容**，一律留账不写：
 *   第 8 章 缺血-再灌注损伤、第 10 章 凝血与抗凝平衡紊乱、第 13 章 肝功能不全。
 * 缺稿是底本问题，不是写作偷工；写进去就只能编内容，那违反「底本不改、缺口留账」。
 */

// 课程章 → 底本位置（ch = 底本章号，secs = 该章内的节号）
const MAP = {
  1: [{ ch: 1, secs: ['1.1'] }],
  2: [{ ch: 1, secs: ['1.2', '1.3', '1.4'] }],
  3: [{ ch: 5, secs: ['5.1', '5.2'] }],
  4: [{ ch: 5, secs: ['5.3', '5.4'] }],
  5: [{ ch: 6, secs: ['6.1', '6.2'] }],
  6: [{ ch: 6, secs: ['6.3', '6.4'] }],
  7: [{ ch: 7, secs: ['7.3', '7.4'] }],
  8: [],
  9: [{ ch: 7, secs: ['7.1', '7.2'] }],
  10: [],
  11: [{ ch: 9, secs: ['9.3'] }],
  12: [{ ch: 10, secs: ['10.3'] }],
  13: [],
  14: [{ ch: 11, secs: ['11.4'] }],
};

const GAP_REASON = {
  8: '代用底本《疾病学基础》无「缺血-再灌注」内容（全书 0 处命中）',
  10: '代用底本无「凝血/弥散性血管内凝血」内容（全书 0 处命中）',
  13: '代用底本只有肝炎与肝硬化的形态类别，无「肝功能不全」的病理生理环节',
};

const BOOK_NAME = '疾病学基础';

/**
 * 小节的正文取哪一栏：
 *   底本.json 里正文存在 `body`（build_binglishengli_text.py 的写法：段=1 进 brief，其余并进 body），
 *   而病理学那份 units.json 用的是 `paras` 数组。早先这里只读 `paras`，
 *   于是本书 216 个小节的 rawBody 全是空串、章字数静默算成 0、引文池也是空的——
 *   这不是「底本没内容」，是取字段取错了。两栏都试，宁可多一道兜底也不要再出一次空串。
 */
function bodyOf(sub) {
  if (Array.isArray(sub.paras) && sub.paras.length) return sub.paras.join('\n');
  return String(sub.body || '');
}

/** 底本的小节标题常自带编号（「9.3.1 9.3.1 心功能不全的类别」），去掉重复的那一段 */
function titleOf(sub) {
  const t = String(sub.title || '').trim();
  return sub.no ? t.replace(new RegExp(`^${sub.no.replace(/\./g, '\\.')}\\s*`), '') : t;
}

function subsOf(base, courseCh) {
  const out = [];
  for (const loc of MAP[courseCh] || []) {
    const ch = base.chapters.find((c) => Number(c.no) === loc.ch);
    if (!ch) throw new Error(`底本无第 ${loc.ch} 章`);
    for (const sec of ch.secs) {
      if (!loc.secs.includes(sec.no)) continue;
      for (const sub of sec.subs) {
        // 正文取 body（paras 兜底）——只认 paras 会让 rawBody 恒为空，
        // 引文逐字门与 quiz「依据」覆盖门都会空转。
        out.push({ sub: sub.no, title: titleOf(sub), rawBody: bodyOf(sub), chapter: String(loc.ch) });
      }
    }
  }
  return out;
}

function writableChapters() {
  return Object.keys(MAP).map(Number).filter((n) => MAP[n].length > 0);
}

module.exports = { MAP, GAP_REASON, BOOK_NAME, subsOf, writableChapters };
