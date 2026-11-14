# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/derive_boundaries.py —— 从页眉扫描结果推出每一章的起止页

页眉规律（实测）：偶数页页眉是「第N章 某门（A证B候）」，奇数页是「中医证候学 + 印张号」。
所以 step 采样时不是每页都能读到章名，只能得到「某页属于第N章」的散点：
    · 相邻两点章号不同 → 边界落在两点之间，需要 step=1 精扫那一段；
    · 章号相同 → 继续往后。

用法：
  python derive_boundaries.py            # 列出各卷每个章号的散点与待精扫区间
  python derive_boundaries.py --write    # 写 scripts/zgh_ocr/章边界.json
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from _paths import DATA  # noqa: E402  数据目录（scratch，不进 git）
CN = "一二三四五六七八九十"


def cn2int(s):
    if s == "十":
        return 10
    if s.startswith("十"):
        return 10 + CN.index(s[1]) + 1
    if "十" in s:
        a, b = s.split("十")
        return CN.index(a) + 1 if b == "" else (CN.index(a) + 1) * 10 + CN.index(b) + 1
    return CN.index(s) + 1


def chap_of(text):
    m = re.search(r"第([%s]+)章" % CN, text or "")
    return cn2int(m.group(1)) if m else None


def load(vol):
    p = os.path.join(DATA, "headers-%s.json" % vol)
    if not os.path.exists(p):
        return {}
    return {int(k): v for k, v in json.load(open(p, encoding="utf-8")).get(vol, {}).items()}


def main():
    write = "--write" in sys.argv
    allv = {}
    for vol in ("shang", "zhong", "xia"):
        h = load(vol)
        if not h:
            continue
        pts = sorted((p, chap_of(v.get("head"))) for p, v in h.items())
        pts = [(p, c) for p, c in pts if c]
        # 散点里相邻不同章 → 边界区间
        segs, cur = [], None
        for p, c in pts:
            if cur is None or c != cur[0]:
                segs.append([c, p, p])
                cur = segs[-1]
            else:
                cur[2] = p
        gaps = []
        for i in range(len(segs) - 1):
            if segs[i][0] and segs[i + 1][0] and segs[i + 1][0] > segs[i][0]:
                gaps.append((segs[i][0], segs[i][0 + 1], segs[i][2], segs[i + 1][1]))
        print("== %s 共 %d 页有页眉章名，章号段：%s" % (
            vol, len(pts), " ".join("第%d章@%d–%d" % (c, a, b) for c, a, b in segs)))
        for prev_c, next_c, last, first in gaps:
            print("   精扫区间：第%d章末→第%d章首  p%d…p%d（%d 页）" % (prev_c, next_c, last, first, first - last + 1))
        allv[vol] = {"segments": [{"chap": c, "from": a, "to": b} for c, a, b in segs],
                     "refine": [{"prev": pc, "next": nc, "from": last, "to": first}
                                for pc, nc, last, first in gaps]}
    if write:
        p = os.path.join(HERE, "章边界-散点.json")
        json.dump(allv, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("→", p)


if __name__ == "__main__":
    main()
