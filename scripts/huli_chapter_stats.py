#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""scripts/huli_chapter_stats.py —— 《中医护理学》逐章文本用词统计（复算入口）

用途：给 departments/05-huli/24-zhongyi-huli-xue 各章正文引用到的每个数字
提供一个可重跑的来源，避免正文里的计数随手打过就过期。

数据：standards/zhongyi-huli/units.json（教材单元层，1 章 = 1 单元）
口径：CJK 汉字计；一个词在一段里出现几次算几次（教材原文是叙述体，
      不是条文，按「条」计没有意义）；不做同义词合并，只报原文用词。

用法：
  python scripts/huli_chapter_stats.py            # 18 章总表
  python scripts/huli_chapter_stats.py 5          # 第 5 章细表
  python scripts/huli_chapter_stats.py 5 6 7      # 多章细表
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UNITS = ROOT / "standards" / "zhongyi-huli" / "units.json"
CJK = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff]")

# 六组词：前三组对应「辨—护—记」的链条，后三组是本课的操作型落点
GROUPS = {
    "链条": ["辨证", "施护", "护理"],
    "四诊": ["望", "闻", "问", "切", "舌", "脉", "神色", "寒热", "虚实", "表里"],
    "施护动作": ["饮食", "情志", "起居", "服药", "体位", "皮肤", "口腔", "环境", "休息", "活动"],
    "技术": ["灸", "拔罐", "刮痧", "推拿", "穴位", "熏洗", "敷", "外治", "熨", "中药"],
    "记录与安全": ["记录", "观察", "评估", "告知", "核对", "交接", "报告", "安全", "禁忌", "评价"],
    "场景与转介": ["住院", "门诊", "社区", "居家", "家属", "随访", "转诊", "宣教", "会诊"],
}

# 易撞词的单字，用后视排除（如「切」撞「一切」、「敷」撞「敷衍」）
EXCLUDE = {"切": r"(?<!一)切", "敷": r"(?<!冷)敷", "灸": r"灸", "问": r"问"}


def hanzi(s):
    return len(CJK.findall(s))


def count(text, term):
    pat = EXCLUDE.get(term, re.escape(term))
    return len(re.findall(pat, text))


def load():
    data = json.loads(UNITS.read_text(encoding="utf-8"))
    return {int(u["chapter"]): u for u in data["units"]}


def row(n, u):
    t = u["rawBody"]
    return {
        "n": n,
        "title": u["chapterTitle"],
        "hz": hanzi(t),
        "groups": {g: {w: count(t, w) for w in ws} for g, ws in GROUPS.items()},
    }


def brief_table(units):
    print(f"{'章':>3}  {'汉字':>7}  {'辨证':>4} {'施护':>4} {'记录':>4} {'观察':>4} "
          f"{'饮食':>4} {'情志':>4} {'禁忌':>4} {'转诊':>4}  {'施护/辨证':>9}")
    tot = 0
    for n in sorted(units):
        r = row(n, units[n])
        tot += r["hz"]
        g = r["groups"]
        bian, shi = g["链条"]["辨证"], g["链条"]["施护"]
        ratio = f"{shi / bian:.1f}" if bian else "—"
        print(f"{n:>3}  {r['hz']:>7,}  {bian:>4} {shi:>4} {g['记录与安全']['记录']:>4} "
              f"{g['记录与安全']['观察']:>4} {g['施护动作']['饮食']:>4} "
              f"{g['施护动作']['情志']:>4} {g['记录与安全']['禁忌']:>4} "
              f"{g['场景与转介']['转诊']:>4}  {ratio:>9}")
    print(f"\n合计 {tot:,} 汉字 / {len(units)} 章")


def detail(units, n):
    u = units[n]
    r = row(n, u)
    print(f"\n=== 第 {n} 章 {u['chapterTitle']}  {r['hz']:,} 汉字  [{u['locator']}]")
    for g, d in r["groups"].items():
        items = " · ".join(f"{w} {c}" for w, c in d.items() if c)
        print(f"  {g}: {items}")


def main():
    units = load()
    args = [int(a) for a in sys.argv[1:] if a.isdigit()]
    if not args:
        brief_table(units)
        return
    for n in args:
        if n not in units:
            print(f"第 {n} 章不存在"); continue
        detail(units, n)


if __name__ == "__main__":
    main()
