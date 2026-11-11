#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""统计「全经穴库」的特定穴覆盖度（第 9 章用）。

用法: python scripts/report_shuxue_coverage.py [--json]
"""
import json
import os
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "standards", "shuxue")


def main():
    lib = json.load(open(os.path.join(D, "穴位库-全经穴.json"), encoding="utf-8"))
    reg = json.load(open(os.path.join(D, "补源登记.json"), encoding="utf-8"))
    pts = lib["points"]
    tags = Counter(p["特定穴"] for p in pts if p["特定穴"])
    by_mer = Counter(p["经"] for p in pts)
    src_mat = sum(1 for p in pts if p["来源"] == "教材")
    out = {
        "经穴总数": len(pts),
        "教材来源": src_mat,
        "外源补入": len(pts) - src_mat,
        "有特定穴标注": sum(tags.values()),
        "标注覆盖率": round(sum(tags.values()) / len(pts) * 100, 1),
        "类别数": len(tags),
        "各类": dict(tags.most_common()),
        "无标注": len(pts) - sum(tags.values()),
        "按经": dict(by_mer),
        "国标条数": reg["counts"]["国标条数"],
        "名称不一致": reg["counts"]["名称不一致"],
        "定位校勘": {k: v["n"] for k, v in reg["定位校勘"]["分档"].items()},
    }
    if "--json" in sys.argv:
        print(json.dumps(out, ensure_ascii=False, indent=1))
        return
    print(f"全经穴 {out['经穴总数']} 条（教材 {out['教材来源']} ＋ 外源补入 {out['外源补入']}）")
    print(f"特定穴标注 {out['有特定穴标注']} 条 / {out['类别数']} 类，覆盖率 {out['标注覆盖率']}%；无标注 {out['无标注']}")
    for k, v in out["各类"].items():
        print(f"  {k} {v}")
    print("按经：" + "、".join(f"{k} {v}" for k, v in out["按经"].items()))
    print("定位校勘：" + "、".join(f"{k} {v}" for k, v in out["定位校勘"].items()))


if __name__ == "__main__":
    main()
