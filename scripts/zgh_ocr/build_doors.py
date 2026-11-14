import sys
# -*- coding: utf-8 -*-
"""scripts/zgh_ocr/build_doors.py —— 页眉扫描结果 → 每门的 PDF 页区间（门区间.json）

映射：第N章 → M(N-1)（第一章是绪论，不是门；第二章风门 = M01 … 第十三章虚门 = M12）。
章首 = 该章在页眉里第一次出现的页（精扫后是精确页）；章末 = 下一章章首 − 1。
"""
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from _paths import DATA  # noqa: E402  数据目录（scratch，不进 git）
CN = "一二三四五六七八九十"
MEN = {2: "M01", 3: "M02", 4: "M03", 5: "M04", 6: "M05", 7: "M06", 8: "M07",
       9: "M08", 10: "M09", 11: "M10", 12: "M11", 13: "M12"}
NAME = {"M01": "风证门", "M02": "寒证门", "M03": "暑证门", "M04": "湿证门", "M05": "燥证门",
        "M06": "火证（热证）门", "M07": "气证门", "M08": "瘀证门", "M09": "痰证门",
        "M10": "饮证门", "M11": "食证门", "M12": "虚证门"}
PDF = {"shang": "1-中医证候学上.pdf", "zhong": "2-中医证候学中.pdf", "xia": "3-中医证候学下.pdf"}


def cn2int(s):
    if s == "十":
        return 10
    if s.startswith("十"):
        return 10 + CN.index(s[1]) + 1
    if "十" in s:
        a, b = s.split("十")
        return (CN.index(a) + 1) * 10 + (CN.index(b) + 1 if b else 0)
    return CN.index(s) + 1


def chap_of(text):
    m = re.search(r"第\s*([%s]+)\s*章" % CN, text or "")
    return cn2int(m.group(1)) if m else None


def main():
    out = {}
    for vol in ("shang", "zhong", "xia"):
        p = os.path.join(DATA, "headers-%s.json" % vol)
        if not os.path.exists(p):
            continue
        h = {int(k): v for k, v in json.load(open(p, encoding="utf-8")).get(vol, {}).items()}
        first, last = {}, {}
        for pg, v in sorted(h.items()):
            c = chap_of(v.get("head"))
            if not c:
                continue
            first.setdefault(c, pg)
            first[c] = min(first[c], pg)
            last[c] = max(last.get(c, 0), pg)
        chaps = sorted(first)
        for i, c in enumerate(chaps):
            if c not in MEN:
                continue
            start = first[c]
            # 章末 = 本卷内下一个章的首 − 1；本卷最后一个章则用本卷最后一页
            nxt = [x for x in chaps if x > c]
            end = (first[nxt[0]] - 1) if nxt else max(h)
            out[MEN[c]] = {"men": MEN[c], "name": NAME[MEN[c]], "chap": c, "vol": vol,
                           "pdf": PDF[vol], "from": start, "to": end}
            print("%s 第%d章 %-12s %s PDF %d–%d（%d 页）"
                  % (MEN[c], c, NAME[MEN[c]], vol, start, end, end - start + 1))
    p = os.path.join(DATA, "门区间.json")
    json.dump(out, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("→", p, "共", len(out), "门")
    missing = [MEN[c] for c in MEN if MEN[c] not in out]
    if missing:
        print("⚠ 未定位：", missing)


if __name__ == "__main__":
    main()
