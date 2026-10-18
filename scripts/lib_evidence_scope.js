'use strict';
/**
 * scripts/lib_evidence_scope.js —— 外部证据的**分级判定**（可机检的唯一口径）
 *
 * 为什么需要它：96 个证名按 ICD-11 命名，其中 13 个是「A、B证(病名)」这种
 * 一个名称带两个构件的形态（如 `胸阳痹阻、痰瘀互结证`、`脾肾气虚、水湿内停证`）。
 * 这类名字在中文临床文献里**几乎不会逐字出现**——文献用的是教科书分型词。
 * 于是"算不算取到证据"就有了两套尺度，不同的人跑同一批会得到不同的覆盖数。
 * 这个文件把尺度写死成代码，任何人重跑得到同一个数。
 *
 * ── 口径（三条，缺一条就不可比）────────────────────────────────
 *
 * 1. **证据边界 = 存证文本**，即入库的 title + snippet。
 *    入库时 snippet 截到 600 字；超出这个边界的内容一律不算证据。
 *    理由：证据必须能被后来的人就地复核，页面上别处的文字不是"已取回的证据"。
 *
 * 2. **括注不参与判定**。`气滞血瘀证(颈部)` 的「颈部」是病名/部位限定，
 *    不是证名的构件；它决定"这条证据是否对题"，但不决定"构件是否齐"。
 *
 * 3. **构件全在 = 整串级；只有部分 = 构件级**。两级分开报数，**不合并**。
 *
 * ── 四种判定 ──────────────────────────────────────────────────
 *   single     单构件证名（名称里没有「、」）。整串级。
 *   whole      单条来源的 title+snippet 同时覆盖全部构件。整串级（强证据）。
 *   component  各构件分别被覆盖，但没有任何一条来源同时覆盖全部。构件级（弱证据）。
 *   partial    有构件完全没被覆盖。**不合格**：不入库、留队重查。
 *
 * 入库与统计都调用 classify()，不要在别处另写一套判断。
 */

/** 证名去掉括注后的构件（`、` 与 `/` 都是并列符）。ICD-11 标准名里的顿号是名称的一部分。 */
function componentsOf(label) {
  const base = String(label).replace(/[（(][^）)]*[）)]/g, '').trim();
  return base.split(/[、/]/).map((s) => s.trim()).filter(Boolean);
}

/**
 * 繁 → 简 归一（**只用于判定，不改展示文本**）。
 *
 * 为什么必须有：可达来源里有大量繁体页（香港中文大学、台湾卫福部、韩药资源研究中心），
 * 而 96 个证名是简体。不做归一，`肝陽上亢證` 就判不出「肝阳上亢证」，
 * 会把一条好证据记成不合格 —— 这类假阴性比假阳性更难发现。
 * 表只收**证名与症状词里会出现的字**，不做全文转写，也不用来改写入库文本。
 */
const SIMP = {
  證: '证', 濕: '湿', 熱: '热', 虛: '虚', 陰: '阴', 陽: '阳', 氣: '气', 鬱: '郁',
  經: '经', 絡: '络', 臟: '脏', 腎: '肾', 膽: '胆', 飲: '饮', 風: '风', 積: '积',
  滯: '滞', 虧: '亏', 損: '损', 傷: '伤', 兩: '两', 結: '结', 內: '内', 敗: '败',
  閉: '闭', 竅: '窍', 頭: '头', 暈: '晕', 頸: '颈', 項: '项', 脹: '胀', 滿: '满',
  嘔: '呕', 惡: '恶', 瀉: '泻', 濁: '浊', 帶: '带', 脈: '脉', 黃: '黄', 紅: '红',
  實: '实', 衛: '卫', 營: '营', 腫: '肿', 軟: '软', 無: '无', 減: '减', 數: '数',
  濇: '涩', 澀: '涩', 膚: '肤', 癢: '痒', 創: '创', 疡: '疡', 瘍: '疡', 癇: '痫',
  癲: '癫', 癭: '瘿', 癃: '癃', 腱: '腱', 淺: '浅', 遲: '迟', 緩: '缓', 緊: '紧',
};

function toSimplified(text) {
  return String(text).replace(/[\u4e00-\u9fff]/g, (ch) => SIMP[ch] || ch);
}

/** 单条来源的可复核文本（证据边界） */
function evidenceText(source) {
  return `${source.title || ''} ${source.snippet || ''}`;
}

/**
 * 文本是否覆盖某个构件。
 *
 * 「证」是类别后缀，不承载辨别信息：`脾胃湿热证` 的来源常写作「脾胃湿热」，
 * 若要求逐字带「证」，会把一整批正确来源判成不合格（实测：第一版口径把 57 条
 * 打成"不合格"，全是这个原因）。所以构件以「证」结尾时，允许退化到去掉「证」的词干。
 * 除后缀外**不做任何同义改写** —— 同义关系在 aliases.json 里，不在这条规则里偷偷做。
 */
function covers(text, part) {
  const t = toSimplified(text);
  const p = toSimplified(part);
  if (t.includes(p)) return true;
  const stem = p.replace(/证$/, '');
  return stem !== p && stem.length >= 2 && t.includes(stem);
}

/**
 * 判定一条已入库条目（{label, sources:[{title,snippet}]}）。
 * 返回 { scope, attestedBy, missing }：
 *   attestedBy → 同时覆盖全部构件的来源下标（single/component/partial 时为 null）
 *   missing    → 完全没被任何来源覆盖的构件（只对 partial 非空）
 */
function classify(entry) {
  const parts = componentsOf(entry.label);
  const sources = Array.isArray(entry.sources) ? entry.sources : [];
  if (!sources.length) return { scope: 'partial', attestedBy: null, missing: parts };

  // 先找"一条来源说全了"的情况
  for (let i = 0; i < sources.length; i += 1) {
    const t = evidenceText(sources[i]);
    if (parts.every((p) => covers(t, p))) {
      return { scope: parts.length === 1 ? 'single' : 'whole', attestedBy: i, missing: [] };
    }
  }

  const missing = parts.filter((p) => !sources.some((s) => covers(evidenceText(s), p)));
  if (missing.length) return { scope: 'partial', attestedBy: null, missing };
  return { scope: 'component', attestedBy: null, missing: [] };
}

/** 是否计入「整串覆盖」（口径 3：两级不合并，这里的 true 只代表整串级） */
function countsAsWhole(scope) {
  return scope === 'single' || scope === 'whole';
}

module.exports = { componentsOf, evidenceText, covers, toSimplified, classify, countsAsWhole };
