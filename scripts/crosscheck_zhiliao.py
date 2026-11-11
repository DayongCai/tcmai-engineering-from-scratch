#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/crosscheck_zhiliao.py —— 三书对病证：《推拿治疗学》×《推拿学》×《推拿手法学》

为什么要做（与上一轮「两书对手法」的区别）：
  两书对手法比的是「同一手法给的频率对不对」，那是**参数层**；
  三书对病证比的是「同一病证用的手法组合对不对」，那是**方案层**——方案层对不上，临床上是真问题。

三层分工：
  《推拿治疗学》给方案（病证 → 辨证分型 → 取穴与手法组合 → 疗程）；
  《推拿学》给适应证与手法组合（按病写，未到分型级）；
  《推拿手法学》给动作（按手法写，不含病证）。

做法：
  1. 病证清单：取治疗学第 3–9 章（临床各章）的节名，按「与」拆成单一病证；
  2. 手法名清单：以《推拿手法学》的 22 个手法为基线，加上治疗学常用的几个复合词（捏脊、摩腹、弹拨）；
  3. 每个病证分别从两书正文里取手法名集合，算交集/并集（Jaccard）；
  4. 两书用到的手法是否都被《手法学》收录，算覆盖率——**只出现在方案里、动作书里没有的手法，是教学缺口**。

产出：standards/zhiliao/三书对账.json
"""
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ZL = os.path.join(ROOT, "standards", "zhiliao", "units.json")
TN = os.path.join(ROOT, "standards", "tuina", "units.json")
SF = os.path.join(ROOT, "standards", "shoufa", "units.json")
DZ = os.path.join(ROOT, "standards", "zhiliao", "病证库.json")

# 异体与简称：㨰法/滚法 是同一手法的两种写法（手法学用「㨰」，推拿学用「滚」）；
# 推拿学按西医病名或全称写，治疗学按简称写，需别名才能对上
ALIAS = {"㨰法": "滚法", "肩关节周围炎": "肩周炎", "肱骨外上髁炎": "网球肘",
         "腰椎间盘突出": "腰椎间盘突出症", "急性腰扭伤": "急性腰扭伤"}

METHODS = ["一指禅推法", "滚法", "㨰法", "揉法", "摩法", "擦法", "推法", "搓法", "抹法", "抖法", "振法",
           "按法", "点法", "拿法", "捏法", "捻法", "踩跷法", "拍法", "击法", "弹法",
           "摇法", "扳法", "拔伸法", "捏脊", "摩腹", "弹拨", "点按"]


def load(p):
    return json.load(open(p, encoding="utf-8"))["units"]


def norm(t):
    """去换行＋统一异体字——教材排版会把「一指禅推法」折成「一指禅
推法」"""
    t = (t or "").replace(chr(10), "").replace(" ", "")
    for a, b in ALIAS.items():
        t = t.replace(a, b)
    return t


def methods_in(text):
    t = norm(text)
    return sorted({m for m in METHODS if m in t}, key=lambda x: -len(x))


def main():
    zl, tn, sf = load(ZL), load(TN), load(SF)
    dz = json.load(open(DZ, encoding="utf-8"))
    sf_text = "\n".join(u["prose"] for u in sf)
    sf_methods = methods_in(sf_text)

    # 1) 病证清单：第 3–9 章的节名，按「与」拆
    cand = []
    for d in dz["diseases"]:
        if 3 <= d["章"] <= 9:
            for part in re.split(r"[与、]", d["病证"]):
                part = part.strip()
                if part and len(part) >= 2:
                    cand.append({"病证": part, "章": d["章"], "章名": d["章名"], "节": d["病证"]})

    rows = []
    for c in cand:
        name = c["病证"]
        key = norm(name)
        zl_units = [u for u in zl if u["sec"] and key in norm(u["sec"])]
        tn_units = [u for u in tn if key in norm((u.get("title") or "") + (u.get("brief") or "") + (u.get("sec") or ""))]
        zm = methods_in("\n".join(u["prose"] for u in zl_units))
        tm = methods_in("\n".join(u["prose"] for u in tn_units))
        inter, union = set(zm) & set(tm), set(zm) | set(tm)
        jac = round(len(inter) / len(union), 2) if union else None
        covered = [m for m in (set(zm) | set(tm)) if m in sf_methods]
        rows.append({
            "病证": name, "章": c["章"], "章名": c["章名"], "同节": c["节"],
            "治疗学": {"单元": [u["sub"] for u in zl_units], "手法": zm},
            "推拿学": {"单元": [u["sub"] for u in tn_units], "手法": tm},
            "交集": sorted(inter), "仅治疗学": sorted(set(zm) - set(tm)), "仅推拿学": sorted(set(tm) - set(zm)),
            "Jaccard": jac,
            "手法学覆盖": {"有": covered, "缺": sorted((set(zm) | set(tm)) - set(covered))},
            "判定": ("两书都有" if zl_units and tn_units else
                   "仅治疗学" if zl_units else
                   "仅推拿学" if tn_units else "两书均无"),
        })

    both = [r for r in rows if r["判定"] == "两书都有"]
    jacs = [r["Jaccard"] for r in both if r["Jaccard"] is not None]
    detail = {
        "病证数（拆开计）": len(rows),
        "两书都有": len(both),
        "仅治疗学有": sum(1 for r in rows if r["判定"] == "仅治疗学"),
        "仅推拿学有": sum(1 for r in rows if r["判定"] == "仅推拿学"),
        "Jaccard均值": round(sum(jacs) / len(jacs), 3) if jacs else None,
        "完全一致（J=1.0）": sum(1 for j in jacs if j == 1.0),
        "零重叠（J=0）": sum(1 for j in jacs if j == 0),
        "手法学收录手法数": len(sf_methods),
        "方案里出现但不被手法学收录": sorted({m for r in rows for m in r["手法学覆盖"]["缺"]}),
    }

    json.dump({"口径": "病证按「与」拆分；手法名以《推拿手法学》22 手法为基线并含复合词；Jaccard=交集/并集",
               "counts": detail, "rows": rows},
              open(os.path.join(ROOT, "standards", "zhiliao", "三书对账.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    print(json.dumps(detail, ensure_ascii=False, indent=1))
    print(f"\n{'病证':<12}{'治疗学手法':<26}{'推拿学手法':<26}{'J':>5}")
    for r in rows:
        print(f"{r['病证']:<12}{'、'.join(r['治疗学']['手法'])[:24]:<26}{'、'.join(r['推拿学']['手法'])[:24]:<26}{str(r['Jaccard']):>5}")


if __name__ == "__main__":
    main()
