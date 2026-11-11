#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/crosscheck_gongfa.py —— 第五层对账：《推拿功法学》×《推拿手法学》「功力供给 vs 手法需求」

为什么这一层最关键：前四层比的是「做什么」，这一层比的是「凭什么做得动」。
  《手法学》说「一指禅推法要沉肩垂肘、持久有力」——它描述需求；
  《功法学》说「易筋经、少林内功、指力腕力训练」——它提供供给。
两者若对不上，就会出现「学了手法做不出来」的经典困境。

做法（只数可数的）：
  力道四类：指力 / 腕力 / 臂力 / 腰腿力；
  在《手法学》正文里数「需求」（提到该力、以及需要该力的手法数量）；
  在《功法学》正文里数「供给」（专项训练与功法对该力的覆盖）；
  判定：供≥需（够）／供<需（缺口）／两书都少提（教学空白）。

产出：standards/gongfa/五层对账.json
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GF = os.path.join(ROOT, "standards", "gongfa", "units.json")
SF = os.path.join(ROOT, "standards", "shoufa", "units.json")

FORCES = {
    "指力": ["指力", "拇指", "指端", "指腹", "罗纹面", "指劲"],
    "腕力": ["腕力", "腕关节", "悬腕", "腕部", "腕"],
    "臂力": ["臂力", "前臂", "肘", "上臂", "臂"],
    "腰腿力": ["腰力", "腿力", "腰腿", "马步", "桩", "下肢", "腰"],
}
# 需要某类力的代表手法（用于「需求」侧计数）
METHOD_FORCE = {
    "一指禅推法": "指力", "点法": "指力", "按法": "指力", "掐法": "指力",
    "滚法": "腕力", "㨰法": "腕力", "揉法": "腕力", "摩法": "腕力", "擦法": "腕力",
    "拿法": "臂力", "捏法": "臂力", "拍法": "臂力", "击法": "臂力", "弹法": "臂力",
    "扳法": "腰腿力", "拔伸法": "腰腿力", "摇法": "腰腿力", "踩跷法": "腰腿力",
}


def load(p):
    return json.load(open(p, encoding="utf-8"))["units"]


def norm(t):
    return (t or "").replace("\n", "").replace(" ", "").replace("㨰法", "滚法")


def count(text, words):
    t = norm(text)
    return sum(t.count(w) for w in words)


def main():
    gf, sf = load(GF), load(SF)
    gt = "".join(u["prose"] for u in gf)
    st = "".join(u["prose"] for u in sf)

    # 两书体量差 2.7 倍，绝对数不可直比；改用「每万字提及密度」
    gh = max(1, sum(u["hanzi"] for u in gf)) / 10000.0
    sh = max(1, sum(u["hanzi"] for u in sf)) / 10000.0

    rows = []
    for force, words in FORCES.items():
        supply = count(gt, words)
        demand = count(st, words)
        methods = [m for m, f in METHOD_FORCE.items() if f == force]
        present = [m for m in methods if m in norm(st)]
        rows.append({
            "力道": force,
            "功法学提及（供给）": supply,
            "手法学提及（需求）": demand,
            "供/需": round(supply / demand, 2) if demand else None,
            "供给密度(每万字)": round(supply / gh, 1),
            "需求密度(每万字)": round(demand / sh, 1),
            "密度比": round((supply / gh) / (demand / sh), 2) if demand else None,
            "需要该力的代表手法": methods,
            "手法学里实际出现": present,
        })

    # 专项训练单元是否覆盖四类力
    train_units = [u for u in gf if "专项" in (u.get("title") or "") or "功力" in (u.get("title") or "")]
    detail = {
        "力道类别": len(FORCES),
        "功法学总汉字": sum(u["hanzi"] for u in gf),
        "手法学总汉字": sum(u["hanzi"] for u in sf),
        "专项训练单元": [u["sub"] for u in train_units],
        "密度比<1（功法学讲得比手法学稀）": [r["力道"] for r in rows if r["密度比"] is not None and r["密度比"] < 1],
        "密度比≥1（功法学讲得更密）": [r["力道"] for r in rows if r["密度比"] is not None and r["密度比"] >= 1],
    }
    json.dump({"口径": "四类力道分别在两书正文里计数：功法学=供给，手法学=需求；比值<1 记为缺口",
               "counts": detail, "rows": rows},
              open(os.path.join(ROOT, "standards", "gongfa", "五层对账.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    print(json.dumps(detail, ensure_ascii=False, indent=1))
    print(f"\n{'力道':<8}{'供给':>6}{'需求':>6}{'供/需':>7}")
    for r in rows:
        print(f"{r['力道']:<8}{r['功法学提及（供给）']:>6}{r['手法学提及（需求）']:>6}{str(r['供/需']):>7}")


if __name__ == "__main__":
    main()
