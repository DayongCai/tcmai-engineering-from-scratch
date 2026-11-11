#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""80 记忆宫殿（经络穴段）× 398 条 → 桩位分配表

两套坐标合起来用：
  ① 宫（G01-G80）：按篇把相邻条文压成段，每段 4-6 条，宫名取该宫**首条的穴**——
     即「一宫＝一段经络」，与视频「按经络穴位顺序把条文逐一对应到记忆桩」的操作一致；
  ② 桩位（东厢/南窗/西壁/北案/中庭）：宫内的走位顺序，图像就钉在这五个方位上。
  ③ 穴（video route）：条 → 穴位，来自 scripts/build_xue_route.py（361 穴 + 回宫二轮 37 条），
     已与视频口播的 8 处「本条对应的记忆桩是 X」逐一比对通过。

输出 standards/materials/shanghan-quannao/palace-route.json
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAT = os.path.join(ROOT, "standards", "materials", "shanghan-quannao")
OUT = os.path.join(MAT, "palace-route.json")

# 篇 → 宫数（由「每宫 4-6 条、共 80 宫」定；改动会使已有图像的方位词失配，勿轻改）
GONG_PER_PIAN = [
    ("辨太阳病脉证并治上", 6),
    ("辨太阳病脉证并治中", 19),
    ("辨太阳病脉证并治下", 10),
    ("辨阳明病脉证并治", 17),
    ("辨少阳病脉证并治", 2),
    ("辨太阴病脉证并治", 2),
    ("辨少阴病脉证并治", 9),
    ("辨厥阴病脉证并治", 11),
    ("辨霍乱病脉证并治", 2),
    ("辨阴阳易差后劳复病脉证并治", 2),
]
DIRS = ["东厢", "南窗", "西壁", "北案", "中庭"]


def main():
    tiao = json.load(open(os.path.join(ROOT, "standards", "shanghan", "tiao-398.json"),
                          encoding="utf-8"))["tiao"]
    route = {r["no"]: r for r in json.load(open(os.path.join(MAT, "xue-route.json"),
                                               encoding="utf-8"))["rows"]}
    by_pian = {}
    for t in tiao:
        by_pian.setdefault(t["pian"], []).append(t["no"])

    palaces, assign = [], {}
    for pian, k in GONG_PER_PIAN:
        nos = by_pian[pian]
        base, rem = divmod(len(nos), k)
        assert base >= 3, (pian, len(nos), k)
        i = 0
        for gi in range(k):
            size = base + (1 if gi < rem else 0)
            chunk = nos[i:i + size]
            i += size
            first = route[chunk[0]]
            g = len(palaces) + 1
            suffix = "穴" if first["xue"].endswith("宫") else "宫"
            palaces.append({"gong": g, "name": f"G{g:02d} {first['xue']}{suffix}",
                            "jing": first["jing"], "code": first["code"],
                            "pian": pian, "tiao": chunk,
                            "xue": [route[n]["xue"] for n in chunk],
                            "zhuang": [DIRS[j] if j < 5 else f"回廊{j}" for j in range(len(chunk))],
                            "round": [route[n]["round"] for n in chunk]})
            for j, n in enumerate(chunk):
                assign[n] = {"gong": g, "gongName":
                             f"G{g:02d} {first['xue']}{'穴' if first['xue'].endswith('宫') else '宫'}"
                             f"（{first['jing']}）",
                             "xue": route[n]["xue"], "jing": route[n]["jing"],
                             "code": route[n]["code"], "zhuang": DIRS[j] if j < 5 else f"回廊{j}",
                             "round": route[n]["round"]}
    assert len(palaces) == 80, len(palaces)
    assert sorted(assign) == list(range(1, 399))

    doc = {"$generated": "python scripts/build_palace_route.py",
           "principle": "视频 P01：以经络穴位图像系统为记忆宫殿与记忆桩，按任脉督脉十二正经穴位顺序"
                        "把条文逐一对应到记忆桩；本表把 398 条压成 80 宫（一宫＝一段经络），"
                        "宫内五桩位取东厢/南窗/西壁/北案/中庭",
           "xueRoute": "scripts/build_xue_route.py（361 穴 + 回宫二轮，8/8 与视频口播一致）",
           "counts": {"gong": 80, "tiao": len(assign), "xue": len({route[n]['xue'] for n in assign}),
                      "maxPerGong": max(len(p["tiao"]) for p in palaces),
                      "minPerGong": min(len(p["tiao"]) for p in palaces)},
           "palaces": palaces,
           "assign": {str(k): v for k, v in sorted(assign.items())}}
    json.dump(doc, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(json.dumps(doc["counts"], ensure_ascii=False))
    print(" ".join(f"{p['gong']:02d}{p['name'].split(' ')[1]}" for p in palaces[:12]), "…")


if __name__ == "__main__":
    main()
