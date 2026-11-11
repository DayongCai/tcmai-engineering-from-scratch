#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""按源视频先后核查「八十宫殿」是否真有内容（不是画出来的空格子）。

核查四件事，逐宫给数：
  ① 内容存在：宫内有几条、几条被源视频演示过（有口播锚点/画面切图）
  ② 先后顺序：把口播锚点按 P 号+时刻排序，与条号/宫号是否同向（含逆序对计数）
  ③ 时间落点：每宫首条最早出现在哪一讲、第几秒
  ④ 算术关系：宫号 = ceil(条号/5) 是否严格成立（即能否不查表定位）

输出 standards/materials/shanghan-quannao/palace-presence.json
"""
import json
import math
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
OUT = os.path.join(MAT, "palace-presence.json")


def main():
    route = json.load(open(os.path.join(MAT, "palace-route.json"), encoding="utf-8"))
    zi = {int(k): v for k, v in route["assign"].items()}
    vz = {r["no"]: r for r in json.load(open(os.path.join(MAT, "video-zhuang.json"),
                                             encoding="utf-8"))["rows"]}
    imgs = json.load(open(os.path.join(MAT, "palace-images.json"), encoding="utf-8"))["images"]
    covered = {int(t) for p in imgs.values() for t in p}  # 有条级切图的条

    rows = []
    for p in route["palaces"]:
        tiao = p["tiao"]
        vid = [t for t in tiao if t in vz or t in covered]
        first = min((vz[t]["p"], vz[t]["sec"]) for t in tiao if t in vz) if any(
            t in vz for t in tiao) else None
        rows.append({"gong": p["gong"], "name": p["name"], "jing": p["jing"], "pian": p["pian"],
                     "tiao": tiao, "n": len(tiao), "videoTiao": vid,
                     "videoN": len(vid), "firstP": first[0] if first else None,
                     "firstSec": first[1] if first else None})

    # ① 存在性：每宫都有条、都有穴
    assert all(r["n"] >= 3 for r in rows)
    assert all(zi[t]["xue"] for r in rows for t in r["tiao"])

    # ② 先后：锚点按 (P, sec) 排序后与条号比较，统计逆序对
    seq = sorted(((v["p"], v["sec"], no) for no, v in vz.items()))
    inv, pairs = 0, 0
    for i in range(len(seq)):
        for j in range(i + 1, len(seq)):
            pairs += 1
            if seq[j][2] < seq[i][2]:
                inv += 1
    # 宫序单调：锚点序列对应宫号
    gseq = [zi[no]["gong"] for _, _, no in seq]
    ginv = sum(1 for i in range(len(gseq)) for j in range(i + 1, len(gseq)) if gseq[j] < gseq[i])

    # ③ 算术：宫号 = ceil(条/5)？
    fit = [no for no in range(1, 399) if math.ceil(no / 5) == zi[no]["gong"]]
    # ④ 宫大小分布
    from collections import Counter
    sizes = Counter(r["n"] for r in rows)

    doc = {"$generated": "python scripts/check_palace_presence.py",
           "checks": {
               "gongTotal": len(rows),
               "tiaoPerGong": dict(sorted(sizes.items())),
               "videoCoveredTiao": len(covered),
               "gongWithVideo": sum(1 for r in rows if r["videoN"]),
               "gongWithoutVideo": [r["gong"] for r in rows if not r["videoN"]],
               "anchorSeqLen": len(seq),
               "inversionsByTiao": inv, "pairs": pairs,
               "inversionsByGong": ginv,
               "ceilFit": len(fit), "ceilTotal": 398,
           },
           "note": "按 (P号, 秒) 排序即源视频播放顺序；inversions=与条号/宫号反向的锚点对数，0 表示完全同向",
           "palaces": rows}
    json.dump(doc, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    c = doc["checks"]
    print(json.dumps({k: c[k] for k in c if k != "gongWithoutVideo"}, ensure_ascii=False))
    print("无视频证据的宫:", c["gongWithoutVideo"][:12], "…共", len(c["gongWithoutVideo"]))
    print("前 6 宫:", [(r["gong"], r["name"], r["tiao"], r["videoN"]) for r in rows[:6]])


if __name__ == "__main__":
    main()
