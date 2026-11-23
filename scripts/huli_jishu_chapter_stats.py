#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""scripts/huli_jishu_chapter_stats.py —— 《中医护理适宜技术》逐章用词统计（复算入口）

用途：给 departments/05-huli/04-zhongyi-huli-jishu 各章正文里引用的计数
提供一个可重跑的口径，避免正文数字随手打过就过期。

数据：standards/zhongyi-huli-jishu/units.json（教材单元层）+ chapter-map.json（合章映射）
口径：CJK 汉字计；一个词在原文出现几次算几次，不做同义词合并，只报原文用词。

用法：
  python scripts/huli_jishu_chapter_stats.py          # 14 章总表
  python scripts/huli_jishu_chapter_stats.py 5        # 第 5 章细表
  python scripts/huli_jishu_chapter_stats.py 5 6 7    # 多章细表
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UNITS = ROOT / "standards" / "zhongyi-huli-jishu" / "units.json"
MAP = ROOT / "standards" / "zhongyi-huli-jishu" / "chapter-map.json"
CJK = re.compile(r"[\u3400-\u4dbf\u4e00-\u9fff]")

TERMS = [
    "禁忌", "不适用", "观察", "记录", "报告", "告知", "同意", "评估",
    "核对", "中止", "皮肤", "不适", "疗效", "辨证", "施护", "规范",
]


def hanzi(s):
    return len(CJK.findall(s))


def load():
    units = {u["chapter"]: u for u in json.loads(UNITS.read_text(encoding="utf-8"))["units"]}
    cmap = json.loads(MAP.read_text(encoding="utf-8"))["chapters"]
    return units, cmap


def chapter_text(cmap, units, n):
    slug, c = next((k, v) for k, v in cmap.items() if v["n"] == n)
    parts = [units[str(k)]["rawBody"] for k in c["srcChapters"]]
    return slug, c, "\n".join(parts)


def main(argv):
    units, cmap = load()
    picks = [int(a) for a in argv if a.isdigit()]
    rows = []
    for n in sorted(v["n"] for v in cmap.values()):
        slug, c, text = chapter_text(cmap, units, n)
        rows.append((n, slug, c, text, hanzi(text), {t: text.count(t) for t in TERMS}))

    if picks:
        for n, slug, c, text, hz, cnt in rows:
            if n not in picks:
                continue
            print(f"\n第 {n} 章 {c['title']}（{slug}）")
            print(f"  底本单元: {', '.join(c['units'])}  ← 教材第 {'、'.join(map(str, c['srcChapters']))} 章")
            print(f"  汉字: {hz}")
            print("  " + "  ".join(f"{t}={v}" for t, v in cnt.items()))
        return

    print(f"{'章':>3} {'汉字':>7}  术语计数（" + "/".join(TERMS) + "）")
    for n, slug, c, text, hz, cnt in rows:
        print(f"{n:>3} {hz:>7}  " + "  ".join(f"{k}{v}" for k, v in cnt.items()))
    print(f"\n合计 {sum(r[4] for r in rows)} 汉字 / {len(rows)} 章")


if __name__ == "__main__":
    main(sys.argv[1:])
